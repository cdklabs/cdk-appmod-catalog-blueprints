"""
AST Validator Module - Validates Python code for security before execution.

This module uses AST (Abstract Syntax Tree) parsing to validate generated Python
scripts before they are executed in the sandbox. It checks for:
- Unauthorized imports (only whitelisted modules allowed)
- Dangerous function calls (open, eval, exec, compile, __import__)
- Forbidden attribute access (os.*, subprocess.*, socket.*, etc.)

The validation is designed to work with AI-generated DataGenerator scripts and
provides actionable error messages that BatchAgent can use to fix violations.
"""
import ast
from typing import Dict, List, Any


# Whitelist of allowed imports for DataGenerator scripts
# These are safe, data-focused libraries that don't provide system access
ALLOWED_IMPORTS = {
    'pandas',
    'numpy',
    'faker',
    'random',
    'datetime',
    'json',
    'math',
    'string',
    'collections',
}

# Functions that are never allowed (dangerous for code execution)
FORBIDDEN_FUNCTIONS = {
    'open',
    'exec',
    'eval',
    'compile',
    '__import__',
    'input',
    'breakpoint',
}

# Module prefixes that indicate forbidden attribute access
FORBIDDEN_MODULE_PREFIXES = {
    'os',
    'subprocess',
    'socket',
    'urllib',
    'requests',
    'http',
    'ftplib',
    'smtplib',
    'telnetlib',
    'shutil',
    'pathlib',
    'tempfile',
    'glob',
    'sys',
    'importlib',
    'builtins',
    'ctypes',
    'multiprocessing',
    'threading',
    'signal',
    'pickle',
}


def validate_script(code: str) -> Dict[str, Any]:
    """
    Validate a Python script for security before execution.

    Uses AST parsing to check for unauthorized imports, dangerous function calls,
    and forbidden attribute access. Returns a structured result with validation
    status and actionable error messages.

    Args:
        code: Python source code to validate

    Returns:
        Dictionary containing:
        - valid: Boolean indicating if the script passed all checks
        - errors: List of specific violation messages (actionable for fixes)
        - warnings: List of non-blocking issues

    Example:
        >>> result = validate_script("import os; os.system('ls')")
        >>> result['valid']
        False
        >>> result['errors']
        ["Unauthorized import: 'os'. Use only: pandas, numpy, faker, ..."]
    """
    errors: List[str] = []
    warnings: List[str] = []

    # Step 1: Parse the code into an AST
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {
            'valid': False,
            'errors': [f'Syntax error at line {e.lineno}: {e.msg}'],
            'warnings': []
        }

    # Step 2: Walk the AST tree and check for violations
    for node in ast.walk(tree):
        # Check import statements: import module
        if isinstance(node, ast.Import):
            for alias in node.names:
                module_name = alias.name.split('.')[0]
                if module_name not in ALLOWED_IMPORTS:
                    allowed_list = ', '.join(sorted(ALLOWED_IMPORTS))
                    errors.append(
                        f"Unauthorized import: '{alias.name}'. "
                        f"Use only: {allowed_list}"
                    )

        # Check from-import statements: from module import name
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                module_name = node.module.split('.')[0]
                if module_name not in ALLOWED_IMPORTS:
                    allowed_list = ', '.join(sorted(ALLOWED_IMPORTS))
                    errors.append(
                        f"Unauthorized import: 'from {node.module}'. "
                        f"Use only: {allowed_list}"
                    )

        # Check function calls
        elif isinstance(node, ast.Call):
            func_name = _get_call_name(node)
            if func_name:
                # Check for forbidden functions
                if func_name in FORBIDDEN_FUNCTIONS:
                    reason = _get_forbidden_reason(func_name)
                    errors.append(
                        f"Forbidden function call: '{func_name}()'. {reason}"
                    )

        # Check attribute access for forbidden modules
        elif isinstance(node, ast.Attribute):
            attr_chain = _get_attribute_chain(node)
            if attr_chain:
                root_module = attr_chain.split('.')[0]
                if root_module in FORBIDDEN_MODULE_PREFIXES:
                    reason = _get_module_reason(root_module)
                    errors.append(
                        f"Forbidden module access: '{attr_chain}'. {reason}"
                    )

    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }


def _get_call_name(node: ast.Call) -> str:
    """
    Extract the function name from a Call node.

    Handles both simple calls (foo()) and attribute calls (obj.foo()).

    Args:
        node: AST Call node

    Returns:
        Function name as string, or empty string if cannot determine
    """
    if isinstance(node.func, ast.Name):
        return node.func.id
    elif isinstance(node.func, ast.Attribute):
        return node.func.attr
    return ''


def _get_attribute_chain(node: ast.Attribute) -> str:
    """
    Build the full attribute chain from an Attribute node.

    For example, os.path.join becomes "os.path.join".

    Args:
        node: AST Attribute node

    Returns:
        Dotted attribute chain as string
    """
    parts = []
    current = node

    while isinstance(current, ast.Attribute):
        parts.append(current.attr)
        current = current.value

    if isinstance(current, ast.Name):
        parts.append(current.id)
        return '.'.join(reversed(parts))

    return ''


def _get_forbidden_reason(func_name: str) -> str:
    """
    Get a human-readable reason why a function is forbidden.

    Args:
        func_name: Name of the forbidden function

    Returns:
        Explanation string suitable for error messages
    """
    reasons = {
        'open': 'File I/O is not allowed',
        'exec': 'Dynamic code execution is not allowed',
        'eval': 'Dynamic code execution is not allowed',
        'compile': 'Dynamic code compilation is not allowed',
        '__import__': 'Dynamic imports are not allowed',
        'input': 'Interactive input is not allowed in batch execution',
        'breakpoint': 'Debugging is not allowed in production execution',
    }
    return reasons.get(func_name, 'This function is not allowed for security reasons')


def _get_module_reason(module_name: str) -> str:
    """
    Get a human-readable reason why a module is forbidden.

    Args:
        module_name: Name of the forbidden module

    Returns:
        Explanation string suitable for error messages
    """
    reasons = {
        'os': 'System access is not allowed',
        'subprocess': 'Process execution is not allowed',
        'socket': 'Network access is not allowed',
        'urllib': 'Network access is not allowed',
        'requests': 'Network access is not allowed',
        'http': 'Network access is not allowed',
        'ftplib': 'Network access is not allowed',
        'smtplib': 'Email sending is not allowed',
        'telnetlib': 'Network access is not allowed',
        'shutil': 'File operations are not allowed',
        'pathlib': 'File system access is not allowed',
        'tempfile': 'File system access is not allowed',
        'glob': 'File system access is not allowed',
        'sys': 'System access is not allowed',
        'importlib': 'Dynamic imports are not allowed',
        'builtins': 'Access to builtins is not allowed',
        'ctypes': 'Low-level access is not allowed',
        'multiprocessing': 'Process management is not allowed',
        'threading': 'Thread management is not allowed',
        'signal': 'Signal handling is not allowed',
        'pickle': 'Serialization with pickle is not allowed for security reasons',
    }
    return reasons.get(module_name, 'Access to this module is not allowed')
