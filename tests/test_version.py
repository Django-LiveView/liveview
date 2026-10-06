"""The version must be the same in every place it is declared."""

import re
from pathlib import Path

import liveview

ROOT = Path(__file__).resolve().parent.parent


def read_version(path, pattern):
    match = re.search(pattern, (ROOT / path).read_text(), re.MULTILINE)
    assert match, f"version not found in {path}"
    return match.group(1)


def test_version_is_consistent_across_files():
    # Given
    pyproject_version = read_version("pyproject.toml", r'^version = "([^"]+)"')
    setup_version = read_version("setup.py", r'^__version__ = "([^"]+)"')

    # When
    package_version = liveview.__version__

    # Then
    assert package_version == pyproject_version == setup_version
