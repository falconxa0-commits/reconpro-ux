# ADR-002: Centralized Module Registry

## Status

Accepted

## Context

ReconPro v10 has 27 scanning modules organized into three categories:

- **Remote modules** (23): Target an external URL/domain for reconnaissance
- **Local modules** (3): Audit the local machine (`host`, `dev`, `doctor`)
- **Powers** (14): Meta-capabilities that orchestrate or extend scans (chat, nexus, blitz, agent, etc.)

Before the registry pattern, modules were imported directly in `scanner.py`, creating tight coupling and circular dependency risks. As the module count grew from 5 (v1) to 27 (v10), the import structure became unwieldy.

### Problems Solved

1. **Circular imports**: `scanner.py` imported all modules directly. Modules imported `http.py` and `utils.py`. Any cross-module import would create a cycle.
2. **Single source of truth**: Module names, IDs, and default sets were scattered across `scanner.py`, the CLI (`__main__.py`), and the engine.
3. **Discovery**: No way to list available modules, query module metadata, or filter by category.
4. **Testing**: Module-level imports in `scanner.py` meant all modules loaded on every import, slowing test startup.

### Alternatives Considered

- **Entry points / `pkg_resources`**: Python's plugin discovery mechanism. Rejected — requires packaging metadata and is overly complex for a single-package tool.
- **Dynamic module loading via `importlib`**: Load modules by filename from a directory. Rejected — loses type safety and makes IDE navigation harder.
- **Class-based modules with inheritance**: Each module is a class inheriting from `BaseModule`. Rejected — adds boilerplate without practical benefit for synchronous runner functions.
- **YAML/JSON manifest**: Module metadata in a separate config file. Rejected — creates drift between code and config.

## Decision

Implement a centralized module registry in `registry.py` with these properties:

1. **Lazy loading**: Module runner functions are not imported until `_get_runners()` is first called. This prevents unnecessary module loading during import.

2. **Single file of truth**: `registry.py` defines:
   - `MODULE_REGISTRY` — all remote modules with name, runner function, and display color
   - `LOCAL_MODULES` — all local audit modules
   - `ALL_MODULES` — combined list
   - `DEFAULT_MODULES` — modules run by default in remote scans
   - `DEFAULT_LOCAL_MODULES` — modules run by default in local audits

3. **Lookup functions**: `get_module_runner(module_id)`, `is_local_module(module_id)`, `is_remote_module(module_id)` provide typed access.

4. **No circular deps**: Both `scanner.py` and `engine.py` import from `registry.py`. Modules never import from `scanner.py`.

```python
# registry.py structure (simplified)
_MOD_RUNNERS = {}  # cached lazy imports

def _get_runners() -> Dict[str, Callable]:
    if _MOD_RUNNERS:
        return _MOD_RUNNERS
    from .modules import (run_recon, run_auth, ...)
    _MOD_RUNNERS.update({"run_recon": run_recon, ...})
    return _MOD_RUNNERS

def build_module_registry() -> Dict[str, Dict[str, Any]]:
    r = _get_runners()
    return {"recon": {"name": "RECON", "runner": r["run_recon"], ...}, ...}

MODULE_REGISTRY = build_module_registry()  # built at import time
```

5. **Registry populated at import time**: `MODULE_REGISTRY` and `LOCAL_MODULES` are module-level variables built when `registry.py` is first imported. The runner functions inside are lazy-loaded on first access.

## Consequences

### Positive

- **Eliminates circular imports**: `scanner.py` imports only from `registry.py`. No module imports from `scanner.py`.
- **Single source of truth**: Any code needing module metadata imports from `registry.py`. Adding a new module requires editing only one file (plus the module file and `modules/__init__.py`).
- **Fast startup for non-scan operations**: Commands like `reconpro --help` or `reconpro list-modules` trigger lazy loading but don't need all runners.
- **Testable**: Mock `get_module_runner()` to test scan orchestration without loading real modules.
- **Typed**: Each module entry has a known shape: `Dict[str, Any]` with `name`, `runner`, `color` keys.

### Negative

- **Still requires manual registration**: Adding a new module requires editing `registry.py` (to add the lazy import and registry entry) and `modules/__init__.py` (to export the runner). This is a two-file change that can be forgotten.
- **No dynamic discovery**: Modules must be registered at code-write time. There is no runtime plugin loading from a directory (the `plugin` power exists but is separate from the core registry).
- **Runner function signature is implicit**: The contract between `scanner.py` and module runners is documented but not enforced by types. `runner(target, base_url, timeout=8, verify_tls=True)` is a convention, not an interface.
- **Lazy loading is not truly lazy**: `_get_runners()` imports ALL module runners at once. A single module import failure breaks the entire registry.

### Neutral

- **The `modules/__init__.py` barrel export**: All `run_*` functions are exported from `modules/__init__.py`. This file grows with each new module. An alternative would be to use `importlib` to load modules by name, but this loses IDE support.

## Validation

1. No circular import errors when running `python -c "from reconpro import scan"`.
2. `reconpro --list-modules` (or equivalent) can iterate `MODULE_REGISTRY` and `LOCAL_MODULES`.
3. Adding a new module requires changes to exactly 3 files: the module file, `modules/__init__.py`, and `registry.py`.

## Related Decisions

- ADR-001: Pure Python Architecture (registry uses only stdlib types)
- ADR-004: Universal Finding Dataclass (all modules produce `Finding` objects)
- ADR-005: Zero-Config Operation (registry provides default module sets)