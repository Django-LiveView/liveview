"""
Helper functions for routing LiveView WebSocket connections.
"""
from typing import cast, Any
from collections.abc import Callable

from django.urls import path, URLPattern
from liveview.consumers import LiveViewConsumer


def get_liveview_path(route: str = "ws/liveview/<str:room_name>/") -> URLPattern:
    """
    Returns a URL pattern for LiveView WebSocket connections.

    Args:
        route: The URL route pattern. Default is 'ws/liveview/<str:room_name>/'

    Returns:
        A Django URL pattern for WebSocket routing.

    Example:
        # In your routing.py
        from liveview.routing import get_liveview_path

        websocket_urlpatterns = [
            get_liveview_path(),
        ]
    """
    asgi_app = cast(Callable[..., Any], LiveViewConsumer.as_asgi())
    return path(route, asgi_app)


def get_liveview_urlpatterns() -> list[URLPattern]:
    """
    Returns a list containing the default LiveView URL pattern.

    Returns:
        A list with the default LiveView WebSocket URL pattern.

    Example:
        # In your routing.py
        from liveview.routing import get_liveview_urlpatterns

        websocket_urlpatterns = get_liveview_urlpatterns()
    """
    return [get_liveview_path()]
