#!/usr/bin/env python3
"""
Dependency sync script for PDF Autofill Server.

This script reads dependencies from pyproject.toml and generates
updated pip install commands for build scripts, ensuring consistency
between Poetry-managed dependencies and build scripts.

Usage:
    python scripts/sync_deps.py           # Print pip install commands
    python scripts/sync_deps.py --update  # Update build scripts automatically
"""

import re
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence, cast

tomllib: Any
try:
    import tomllib as _tomllib
    tomllib = _tomllib
except ImportError:
    # Python < 3.11 fallback
    try:
        import tomli as _tomllib # type: ignore
        tomllib = _tomllib
    except ImportError:
        print("ERROR: tomllib (Python 3.11+) or tomli package required")
        print("Run: pip install tomli")
        sys.exit(1)


PROJECT_ROOT = Path(__file__).parent.parent
PYPROJECT_PATH = PROJECT_ROOT / "pyproject.toml"
BUILD_BAT_PATH = PROJECT_ROOT / "scripts" / "build.bat"
BUILD_SH_PATH = PROJECT_ROOT / "scripts" / "build.sh"


def parse_pyproject() -> dict[str, Any]:
    """Parse pyproject.toml and extract dependencies."""
    with open(PYPROJECT_PATH, "rb") as f:
        return cast(dict[str, Any], tomllib.load(f))


def normalize_package_name(name: str) -> str:
    """Normalize package name (lowercase, underscores to hyphens)."""
    return name.lower().replace("_", "-")


def extract_core_deps(pyproject: Mapping[str, Any]) -> list[str]:
    """Extract core (required) dependencies from pyproject.toml."""
    deps = pyproject.get("tool", {}).get("poetry", {}).get("dependencies", {})
    
    core_packages: list[str] = []
    for name, spec in deps.items():
        if name == "python":
            continue
            
        # Skip optional dependencies
        if isinstance(spec, dict) and cast(Mapping[str, Any], spec).get("optional", False):
            continue
        
        # Get version if it's a simple string, or from dict
        if isinstance(spec, str):
            version = spec
        elif isinstance(spec, dict):
            spec_dict = cast(Mapping[str, Any], spec)
            version = cast(str, spec_dict.get("version", "*"))
            # Handle extras like uvicorn[standard]
            if "extras" in spec_dict:
                extras = ",".join(cast(Sequence[str], spec_dict["extras"]))
                name = f"{name}[{extras}]"
        else:
            version = "*"
        
        # Clean version specifier for pip (^x.y.z -> >=x.y.z)
        if version.startswith("^"):
            version = ">=" + version[1:]
        
        core_packages.append(normalize_package_name(name))
    
    return core_packages


def extract_optional_deps(pyproject: Mapping[str, Any]) -> dict[str, list[str]]:
    """Extract optional dependency groups from pyproject.toml."""
    _deps = pyproject.get("tool", {}).get("poetry", {}).get("dependencies", {})
    extras = pyproject.get("tool", {}).get("poetry", {}).get("extras", {})
    
    optional_groups: dict[str, list[str]] = {}
    
    # Map extras to their packages
    for group_name, packages in extras.items():
        package_list = cast(Sequence[str], packages)
        optional_groups[group_name] = [normalize_package_name(p) for p in package_list]
    
    return optional_groups


def generate_pip_install_command(packages: list[str], for_bat: bool = False) -> str:
    """Generate pip install command for a list of packages."""
    if for_bat:
        return f"pip install {' '.join(packages)}"
    else:
        return f"pip install {' '.join(packages)}"


def update_build_bat(core_deps: list[str], optional_deps: dict[str, list[str]]) -> bool:
    """Update build.bat with synced dependencies."""
    if not BUILD_BAT_PATH.exists():
        print(f"WARNING: {BUILD_BAT_PATH} not found")
        return False
    
    content = BUILD_BAT_PATH.read_text()
    
    # Pattern to find pip install line for project dependencies
    pattern = r'(pip install.+(?:fastapi|uvicorn).+)'
    
    # Generate new install command
    new_install = f"pip install {' '.join(core_deps)}"
    
    # Replace the old install command
    if re.search(pattern, content, re.IGNORECASE):
        content = re.sub(pattern, new_install, content, flags=re.IGNORECASE)
        BUILD_BAT_PATH.write_text(content)
        print(f"✅ Updated {BUILD_BAT_PATH}")
        return True
    else:
        print(f"⚠️  Could not find pip install pattern in {BUILD_BAT_PATH}")
        print(f"   Add this line manually: {new_install}")
        return False


def update_build_sh(core_deps: list[str], optional_deps: dict[str, list[str]]) -> bool:
    """Update build.sh with synced dependencies."""
    if not BUILD_SH_PATH.exists():
        print(f"WARNING: {BUILD_SH_PATH} not found")
        return False
    
    content = BUILD_SH_PATH.read_text()
    
    # Check if there's a pip install for project deps
    if "pip install" in content and ("fastapi" in content or "uvicorn" in content):
        pattern = r'(pip install.+(?:fastapi|uvicorn).+)'
        new_install = f"pip install {' '.join(core_deps)}"
        content = re.sub(pattern, new_install, content, flags=re.IGNORECASE)
        BUILD_SH_PATH.write_text(content)
        print(f"✅ Updated {BUILD_SH_PATH}")
        return True
    else:
        # build.sh might not have direct pip installs
        print(f"ℹ️  {BUILD_SH_PATH} uses Poetry/build_exe.py for dependency management")
        return True


def update_build_exe_py(core_deps: list[str], optional_deps: dict[str, list[str]]) -> bool:
    """Update build_exe.py hidden imports if needed."""
    build_exe_path = PROJECT_ROOT / "scripts" / "build_exe.py"
    if not build_exe_path.exists():
        return True
    
    content = build_exe_path.read_text()
    
    # Check for any new packages that might need hidden imports
    # This is informational only - manual review recommended
    new_packages: set[str] = set()
    for pkg in core_deps + [p for pkgs in optional_deps.values() for p in pkgs]:
        base_pkg = pkg.split("[")[0]  # Remove extras
        if base_pkg not in content:
            new_packages.add(base_pkg)
    
    if new_packages:
        print(f"\n  Consider adding hidden imports for new packages:")
        for pkg in sorted(new_packages):
            print(f"   - {pkg}")
    
    return True


def main():
    """Main entry point."""
    update_mode = "--update" in sys.argv
    
    print("=" * 50)
    print(" PDF Autofill - Dependency Sync Tool")
    print("=" * 50)
    print()
    
    # Parse pyproject.toml
    pyproject = parse_pyproject()
    
    # Extract dependencies
    core_deps = extract_core_deps(pyproject)
    optional_deps = extract_optional_deps(pyproject)
    
    print("📦 Core dependencies:")
    for dep in core_deps:
        print(f"   - {dep}")
    
    print()
    print("📦 Optional dependency groups:")
    for group, packages in optional_deps.items():
        print(f"   [{group}]: {', '.join(packages)}")
    
    print()
    print("=" * 50)
    print()
    
    # Generate pip install commands
    print("📋 Generated pip install commands:")
    print()
    print("Core packages:")
    print(f"   pip install {' '.join(core_deps)}")
    print()
    
    for group, packages in optional_deps.items():
        print(f"Optional [{group}]:")
        print(f"   pip install {' '.join(packages)}")
        print()
    
    if update_mode:
        print("=" * 50)
        print(" Updating build scripts...")
        print("=" * 50)
        print()
        
        update_build_bat(core_deps, optional_deps)
        update_build_sh(core_deps, optional_deps)
        update_build_exe_py(core_deps, optional_deps)
        
        print()
        print("✅ Sync complete!")
    else:
        print()
        print("Run with --update to update build scripts automatically:")
        print("   python scripts/sync_deps.py --update")


if __name__ == "__main__":
    main()
