"""Tests for the auto-discovery of liveview_components."""

import sys

import pytest
from django.apps import apps

from liveview import liveview_registry


@pytest.fixture
def liveview_config():
    return apps.get_app_config("liveview")


def test_components_are_discovered_on_startup():
    # Given / When
    handler = liveview_registry.get_handler("say_hello")

    # Then
    assert handler is not None
    assert "tests.testapp.liveview_components.greetings" in sys.modules


def test_private_component_modules_are_skipped():
    # Given / When
    module_names = list(sys.modules)

    # Then
    assert "tests.testapp.liveview_components.__init__" not in module_names


@pytest.mark.parametrize(
    "command", ["migrate", "makemigrations", "collectstatic", "compilemessages"]
)
def test_management_commands_skip_discovery(liveview_config, monkeypatch, command):
    # Given
    monkeypatch.setattr(sys, "argv", ["manage.py", command])

    # When
    should_import = liveview_config._should_import_components()

    # Then
    assert should_import is False


@pytest.mark.parametrize(
    ("run_main", "expected"), [(None, True), ("true", True), ("false", False)]
)
def test_discovery_depends_on_reloader_process(
    liveview_config, monkeypatch, run_main, expected
):
    # Given
    monkeypatch.setattr(sys, "argv", ["manage.py", "runserver"])
    if run_main is None:
        monkeypatch.delenv("RUN_MAIN", raising=False)
    else:
        monkeypatch.setenv("RUN_MAIN", run_main)

    # When
    should_import = liveview_config._should_import_components()

    # Then
    assert should_import is expected


def test_broken_component_is_logged_and_does_not_stop_discovery(
    liveview_config, tmp_path, monkeypatch, caplog
):
    # Given
    package = tmp_path / "brokenapp"
    (package / "liveview_components").mkdir(parents=True)
    (package / "__init__.py").write_text("")
    (package / "liveview_components" / "__init__.py").write_text("")
    (package / "liveview_components" / "broken.py").write_text("raise ImportError('x')")
    monkeypatch.syspath_prepend(str(tmp_path))

    class BrokenAppConfig:
        path = str(package)
        module = __import__("brokenapp")

    monkeypatch.setattr(apps, "get_app_configs", lambda: [BrokenAppConfig()])

    # When
    liveview_config.import_liveview_components()

    # Then
    assert "Error importing brokenapp.liveview_components.broken" in caplog.text
