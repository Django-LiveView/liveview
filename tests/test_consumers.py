"""Tests for LiveViewConsumer and its helpers."""

import pytest
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator

from liveview import liveview_handler, send
from liveview.connections import BROADCAST_GROUP
from liveview.consumers import camel_to_snake, convert_keys_to_snake_case


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("userName", "user_name"),
        ("HTTPResponse", "http_response"),
        ("getHTTPResponseCode", "get_http_response_code"),
        ("value2Html", "value2_html"),
        ("already_snake", "already_snake"),
        ("lower", "lower"),
        ("", ""),
    ],
)
def test_camel_to_snake(name, expected):
    # Given / When
    result = camel_to_snake(name)

    # Then
    assert result == expected


def test_convert_keys_to_snake_case_converts_nested_structures():
    # Given
    content = {
        "function": "save",
        "data": {"userName": "Ada", "tagList": [{"tagName": "django"}]},
        "formData": None,
    }

    # When
    result = convert_keys_to_snake_case(content)

    # Then
    assert result == {
        "function": "save",
        "data": {"user_name": "Ada", "tag_list": [{"tag_name": "django"}]},
        "form_data": None,
    }


@pytest.mark.parametrize("value", ["text", 42, None, ["camelCase"]])
def test_convert_keys_to_snake_case_leaves_values_untouched(value):
    # Given / When
    result = convert_keys_to_snake_case(value)

    # Then
    assert result == value


async def test_consumer_rejects_paths_without_room(application):
    # Given
    communicator = WebsocketCommunicator(application, "/ws/liveview/")

    # When / Then
    with pytest.raises(ValueError, match="No route found"):
        await communicator.connect()


async def test_consumer_calls_handler_with_snake_case_content(communicator):
    # Given
    received = []

    @liveview_handler("save_profile")
    def save_profile(consumer, content):
        received.append(content)
        send(consumer, {"target": "#profile", "html": "<p>Saved</p>"})

    # When
    await communicator.send_json_to(
        {"function": "save_profile", "data": {"userName": "Ada"}, "lang": "en"}
    )
    response = await communicator.receive_json_from()

    # Then
    assert response == {"target": "#profile", "html": "<p>Saved</p>"}
    assert received == [
        {"function": "save_profile", "data": {"user_name": "Ada"}, "lang": "en"}
    ]


async def test_consumer_runs_auto_discovered_handler(communicator):
    # Given
    message = {"function": "say_hello", "data": {"userName": "Ada"}}

    # When
    await communicator.send_json_to(message)
    response = await communicator.receive_json_from()

    # Then
    assert response == {"target": "#greeting", "html": "<p>Hello, Ada!</p>"}


async def test_consumer_reports_unknown_function(communicator):
    # Given
    message = {"function": "does_not_exist"}

    # When
    await communicator.send_json_to(message)
    response = await communicator.receive_json_from()

    # Then
    assert response["error"] == "Unknown function: does_not_exist"
    assert "say_hello" in response["available_functions"]


async def test_broadcast_reaches_every_connected_client(make_communicator):
    # Given
    @liveview_handler("announce")
    def announce(consumer, content):
        send(consumer, {"target": "#news", "html": "News!"}, broadcast=True)

    sender = make_communicator(room="room-a")
    listener = make_communicator(room="room-b")
    await sender.connect()
    await listener.connect()

    # When
    await sender.send_json_to({"function": "announce"})

    # Then
    expected = {"target": "#news", "html": "News!"}
    assert await sender.receive_json_from() == expected
    assert await listener.receive_json_from() == expected
    await sender.disconnect()
    await listener.disconnect()


async def test_send_to_group_only_reaches_that_room(make_communicator):
    # Given
    @liveview_handler("notify_room")
    def notify_room(consumer, content):
        consumer.send_to_group(consumer.room_group_name, {"html": "Room only"})

    member = make_communicator(room="room-a")
    outsider = make_communicator(room="room-b")
    await member.connect()
    await outsider.connect()

    # When
    await member.send_json_to({"function": "notify_room"})

    # Then
    assert await member.receive_json_from() == {"html": "Room only"}
    assert await outsider.receive_nothing()
    await member.disconnect()
    await outsider.disconnect()


async def test_disconnect_leaves_room_and_broadcast_groups(make_communicator):
    # Given
    stayer = make_communicator(room="room-a")
    leaver = make_communicator(room="room-b")
    await stayer.connect()
    await leaver.connect()

    # When
    await leaver.disconnect()

    # Then
    groups = get_channel_layer().groups
    assert len(groups[BROADCAST_GROUP]) == 1
    assert "room_room-b" not in groups
    assert len(groups["room_room-a"]) == 1
    await stayer.disconnect()
