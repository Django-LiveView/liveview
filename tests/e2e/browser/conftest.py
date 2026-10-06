"""Fixtures for the browser tests of the demo project."""

import os

import pytest
from playwright.sync_api import Page

WEBSOCKET_READY = "window.myWebSocket && window.myWebSocket.readyState === 1"


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("BASE_URL", "http://localhost:8400")


@pytest.fixture
def open_page(page: Page):
    """Open a demo page and wait until the WebSocket is connected."""

    def factory(path="/"):
        page.goto(path)
        page.wait_for_function(WEBSOCKET_READY)
        return page

    return factory


@pytest.fixture
def reload_page(page: Page):
    """Reload the current page and wait until the WebSocket is connected."""

    def reload():
        page.reload()
        page.wait_for_function(WEBSOCKET_READY)

    return reload
