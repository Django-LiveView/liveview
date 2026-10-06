"""Tests for the LiveView WebSocket routing helpers."""

from django.urls import URLPattern

from liveview.consumers import LiveViewConsumer
from liveview.routing import get_liveview_path, get_liveview_urlpatterns


def test_get_liveview_path_uses_default_route():
    # Given / When
    pattern = get_liveview_path()

    # Then
    assert isinstance(pattern, URLPattern)
    assert str(pattern.pattern) == "ws/liveview/<str:room_name>/"


def test_get_liveview_path_accepts_custom_route():
    # Given
    route = "custom/<str:room_name>/socket/"

    # When
    pattern = get_liveview_path(route)

    # Then
    assert str(pattern.pattern) == route


def test_get_liveview_path_resolves_room_name_to_consumer():
    # Given
    pattern = get_liveview_path()

    # When
    match = pattern.resolve("ws/liveview/abc123/")

    # Then
    assert match.kwargs == {"room_name": "abc123"}
    assert match.func.consumer_class is LiveViewConsumer


def test_get_liveview_urlpatterns_returns_single_default_pattern():
    # Given / When
    patterns = get_liveview_urlpatterns()

    # Then
    assert len(patterns) == 1
    assert str(patterns[0].pattern) == "ws/liveview/<str:room_name>/"
