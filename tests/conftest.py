"""Shared fixtures for the Django LiveView test suite."""

import pytest
from channels.layers import channel_layers
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator

from liveview import liveview_registry
from liveview.decorators import LiveviewHandlerRegistry
from liveview.routing import get_liveview_urlpatterns


class FakeConsumer:
    """Consumer double that records every message sent with send_json."""

    def __init__(self):
        self.sent = []

    def send_json(self, data):
        self.sent.append(data)


@pytest.fixture
def consumer():
    return FakeConsumer()


@pytest.fixture
def registry():
    """An empty, isolated handler registry."""
    return LiveviewHandlerRegistry()


@pytest.fixture(autouse=True)
def isolated_global_registry():
    """Restore the global registry after each test, keeping discovered handlers."""
    handlers = dict(liveview_registry._handlers)
    middleware = list(liveview_registry._middleware)
    yield liveview_registry
    liveview_registry._handlers.clear()
    liveview_registry._handlers.update(handlers)
    liveview_registry._middleware[:] = middleware


@pytest.fixture(autouse=True)
def fresh_channel_layer():
    """Start every test with an empty in-memory channel layer."""
    channel_layers.backends.clear()
    yield
    channel_layers.backends.clear()


@pytest.fixture
def application():
    return URLRouter(get_liveview_urlpatterns())


@pytest.fixture
def make_communicator(application):
    """Factory of WebSocket communicators pointing to a room."""

    def factory(room="test-room"):
        return WebsocketCommunicator(application, f"/ws/liveview/{room}/")

    return factory


@pytest.fixture
async def communicator(make_communicator):
    """A connected WebSocket communicator, disconnected on teardown."""
    communicator = make_communicator()
    connected, _ = await communicator.connect()
    assert connected
    yield communicator
    await communicator.disconnect()
