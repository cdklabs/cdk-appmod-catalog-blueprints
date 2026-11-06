# Debug: appmod-ueq — mcp server tests fail to import ReadResourceContents

## Repro
python3.13 venv, `pip install -e "mcp-appmod-catalog-blueprints[dev]"` resolves mcp 2.3.0;
`pytest tests/test_server.py` -> ImportError: cannot import name 'ReadResourceContents'
from 'mcp.server.lowlevel.server'.

## Current Focus
(resolved) mcp 2.0 is a breaking major release that removed the 1.x lowlevel
`ReadResourceContents` API; pyproject declares bare `mcp`, so fresh installs get 2.x.
Confirmed: same tests pass on mcp 1.30.0 (latest 1.x) and 1.26.0 (77 passed each).

## Eliminated
- Code bug in server.py: no; it is correct against every 1.x tested (1.26.0, 1.30.0).

## Resolution
Pin `mcp>=1.26,<2` in pyproject.toml (floor = oldest version verified). Regression test
tests/test_packaging.py asserts the declared mcp requirement excludes 2.x and admits the
installed version. Porting to the 2.x API is a separate follow-up.
