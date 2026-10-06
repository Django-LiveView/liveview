"""Tests for the typing support (PEP 561) of the public API."""

import re
from importlib.resources import files

import pytest

mypy_api = pytest.importorskip("mypy.api")

USER_CODE = """
from typing import Any

from django.urls import URLPattern

from liveview import liveview_handler, send
from liveview.routing import get_liveview_path, get_liveview_urlpatterns


@liveview_handler("say_hello")
def say_hello(consumer: Any, content: dict[str, Any]) -> None:
    send(consumer, {"html": "Hello"})


patterns: list[URLPattern] = get_liveview_urlpatterns()
single: URLPattern = get_liveview_path()
reveal_type(say_hello)
"""


def test_package_ships_py_typed_marker():
    # Given / When
    marker = files("liveview") / "py.typed"

    # Then
    assert marker.is_file()


def test_public_api_passes_strict_mypy(tmp_path):
    # Given
    user_module = tmp_path / "user_app.py"
    user_module.write_text(USER_CODE)

    # When
    stdout, stderr, exit_code = mypy_api.run(
        ["--strict", "--no-incremental", "--follow-imports=silent", str(user_module)]
    )

    # Then
    assert exit_code == 0, stdout + stderr
    # The decorator keeps the signature (older mypy prints "builtins." prefixes)
    assert re.search(
        r'Revealed type is "def \(consumer: Any, content: '
        r'(builtins\.)?dict\[(builtins\.)?str, Any\]\)"',
        stdout,
    ), stdout
