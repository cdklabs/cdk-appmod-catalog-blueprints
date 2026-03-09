"""DependencyResolver: DAG construction and topological sort for construct composition.

Analyzes construct props to detect inter-construct dependencies, builds a
directed acyclic graph, and produces a topological ordering for correct
instantiation. Also identifies shared dependencies and builds wiring maps
for the code generator.
"""

from __future__ import annotations

from collections import defaultdict, deque

from mcp_server_constructs.errors import CircularDependencyError, UnknownConstructError
from mcp_server_constructs.models import WiringEntry
from mcp_server_constructs.registry import ConstructRegistry


def _to_variable_name(construct_name: str) -> str:
    """Convert a PascalCase construct name to a camelCase variable name.

    Example: ``BedrockDocumentProcessing`` → ``bedrockDocumentProcessing``
    """
    if not construct_name:
        return construct_name
    return construct_name[0].lower() + construct_name[1:]


class DependencyResolver:
    """Resolves construct dependencies from JSII props type analysis.

    Uses the registry to inspect each construct's props and detect
    references to other library constructs (``PropInfo.is_construct_ref``).
    Builds a DAG and performs topological sort (Kahn's algorithm) to
    determine safe instantiation order.
    """

    def __init__(self, registry: ConstructRegistry) -> None:
        self._registry = registry

    def get_dependencies(self, construct_name: str) -> list[str]:
        """Get direct dependencies of a construct.

        Inspects the construct's props via the registry and returns the
        names of other library constructs referenced by those props.

        Args:
            construct_name: Class name of the construct.

        Returns:
            Sorted list of construct names this construct depends on.

        Raises:
            UnknownConstructError: If the construct is not in the registry.
        """
        info = self._registry.get_construct(construct_name)
        deps: set[str] = set()
        for prop in info.props:
            if prop.is_construct_ref and prop.construct_ref_name:
                deps.add(prop.construct_ref_name)
        return sorted(deps)

    def resolve_order(self, construct_names: list[str]) -> list[str]:
        """Return constructs in dependency order (dependencies first).

        Performs topological sort using Kahn's algorithm on the dependency
        DAG built from the requested constructs and their transitive
        dependencies within the library.

        Only constructs that are in ``construct_names`` or are transitive
        dependencies of those constructs appear in the output.

        Args:
            construct_names: List of construct class names to compose.

        Returns:
            List of construct names in safe instantiation order.

        Raises:
            CircularDependencyError: If a cycle is detected in the DAG.
            UnknownConstructError: If any construct is not in the registry.
        """
        # Validate all requested constructs exist
        for name in construct_names:
            self._registry.get_construct(name)

        # Collect the full set of constructs (requested + transitive deps)
        all_nodes: set[str] = set()
        adjacency: dict[str, set[str]] = defaultdict(set)  # node → set of deps
        queue = deque(construct_names)

        while queue:
            node = queue.popleft()
            if node in all_nodes:
                continue
            all_nodes.add(node)
            try:
                deps = self.get_dependencies(node)
            except UnknownConstructError:
                # Dependency references a construct not in registry — skip edge
                continue
            for dep in deps:
                adjacency[node].add(dep)
                if dep not in all_nodes:
                    queue.append(dep)

        # Kahn's algorithm: topological sort
        in_degree: dict[str, int] = {n: 0 for n in all_nodes}
        for node, deps in adjacency.items():
            for dep in deps:
                if dep in in_degree:
                    in_degree[dep] = in_degree.get(dep, 0)  # ensure key exists
                    # dep is depended upon — but in_degree counts incoming edges
                    # from the perspective of "must come after". We want deps first,
                    # so edges go dependent → dependency. In Kahn's we process
                    # nodes with in_degree 0 first. We need reverse edges:
                    # dependency ← dependent means dependency has in_degree from dependent.
                    pass

        # Rebuild in_degree correctly: edge means "node depends on dep",
        # so dep must come before node. Reverse: dep → node in topo graph.
        in_degree = {n: 0 for n in all_nodes}
        reverse_adj: dict[str, list[str]] = defaultdict(list)  # dep → [dependents]
        for node, deps in adjacency.items():
            for dep in deps:
                if dep in all_nodes:
                    in_degree[node] = in_degree.get(node, 0) + 1
                    reverse_adj[dep].append(node)

        # Start with nodes that have no dependencies
        ready = deque(sorted(n for n in all_nodes if in_degree[n] == 0))
        result: list[str] = []

        while ready:
            node = ready.popleft()
            result.append(node)
            for dependent in sorted(reverse_adj.get(node, [])):
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    ready.append(dependent)

        if len(result) != len(all_nodes):
            # Cycle detected — find the cycle for the error message
            remaining = all_nodes - set(result)
            cycle = self._find_cycle(remaining, adjacency)
            raise CircularDependencyError(cycle)

        return result

    def _find_cycle(
        self,
        nodes: set[str],
        adjacency: dict[str, set[str]],
    ) -> list[str]:
        """Find a cycle among the remaining nodes for error reporting."""
        visited: set[str] = set()
        path: list[str] = []
        path_set: set[str] = set()

        def dfs(node: str) -> list[str] | None:
            if node in path_set:
                idx = path.index(node)
                return path[idx:] + [node]
            if node in visited:
                return None
            visited.add(node)
            path.append(node)
            path_set.add(node)
            for dep in adjacency.get(node, set()):
                if dep in nodes:
                    result = dfs(dep)
                    if result is not None:
                        return result
            path.pop()
            path_set.discard(node)
            return None

        for node in sorted(nodes):
            result = dfs(node)
            if result is not None:
                return result

        # Fallback: just list the remaining nodes
        return sorted(nodes)

    def get_shared_dependencies(self, construct_names: list[str]) -> list[str]:
        """Identify constructs that appear as dependencies of multiple requested constructs.

        Args:
            construct_names: List of construct class names.

        Returns:
            Sorted list of construct names that are depended on by more than
            one of the requested constructs.
        """
        dep_count: dict[str, int] = defaultdict(int)
        for name in construct_names:
            try:
                deps = self.get_dependencies(name)
            except UnknownConstructError:
                continue
            for dep in deps:
                dep_count[dep] += 1

        return sorted(dep for dep, count in dep_count.items() if count > 1)

    def build_wiring(self, ordered: list[str]) -> dict[str, dict[str, str]]:
        """Build a wiring map for the code generator.

        For each construct in the ordered list, inspects its props to find
        references to other constructs that appear earlier in the list.
        Produces a mapping of ``{construct: {prop_name: variable_name}}``.

        Args:
            ordered: Constructs in dependency order (from ``resolve_order``).

        Returns:
            Dict mapping each construct name to a dict of
            ``{prop_name: dependency_variable_name}``.
        """
        available: set[str] = set()
        wiring: dict[str, dict[str, str]] = {}

        for name in ordered:
            info = self._registry.get_construct(name)
            prop_wiring: dict[str, str] = {}
            for prop in info.props:
                if (
                    prop.is_construct_ref
                    and prop.construct_ref_name
                    and prop.construct_ref_name in available
                ):
                    prop_wiring[prop.name] = _to_variable_name(prop.construct_ref_name)
            if prop_wiring:
                wiring[name] = prop_wiring
            available.add(name)

        return wiring

    def get_wiring_entries(self, ordered: list[str]) -> list[WiringEntry]:
        """Build a list of WiringEntry objects for the ordered constructs.

        Convenience wrapper around ``build_wiring`` that returns structured
        ``WiringEntry`` instances instead of a nested dict.

        Args:
            ordered: Constructs in dependency order.

        Returns:
            List of WiringEntry objects describing cross-construct wiring.
        """
        wiring_map = self.build_wiring(ordered)
        entries: list[WiringEntry] = []
        for target_construct, props in wiring_map.items():
            for prop_name, var_name in props.items():
                # Find the source construct name from the variable name
                source_construct = var_name[0].upper() + var_name[1:]
                entries.append(
                    WiringEntry(
                        source_construct=source_construct,
                        source_variable=var_name,
                        target_construct=target_construct,
                        target_prop=prop_name,
                    )
                )
        return entries
