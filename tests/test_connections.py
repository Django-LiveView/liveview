"""Tests for liveview.connections.send."""

import pytest
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from liveview import send
from liveview.connections import BROADCAST_GROUP

MESSAGE = {"target": "#main", "html": "<p>Hi</p>"}


class BroadcastingConsumer:
    """Consumer double exposing broadcast_to_all, like LiveViewConsumer."""

    def __init__(self):
        self.broadcasts = []

    def broadcast_to_all(self, data):
        self.broadcasts.append(data)


def join_group(group):
    """Subscribe a new channel to a group and return a receiver for it."""
    channel_layer = get_channel_layer()
    channel_name = async_to_sync(channel_layer.new_channel)()
    async_to_sync(channel_layer.group_add)(group, channel_name)
    return lambda: async_to_sync(channel_layer.receive)(channel_name)


def test_send_delivers_message_to_consumer(consumer):
    # Given
    data = MESSAGE

    # When
    send(consumer, data)

    # Then
    assert consumer.sent == [MESSAGE]


def test_send_without_consumer_raises_value_error():
    # Given
    consumer = None

    # When / Then
    with pytest.raises(ValueError, match="Consumer cannot be None"):
        send(consumer, MESSAGE)


def test_broadcast_uses_consumer_broadcast_to_all():
    # Given
    consumer = BroadcastingConsumer()

    # When
    send(consumer, MESSAGE, broadcast=True)

    # Then
    assert consumer.broadcasts == [MESSAGE]


def test_broadcast_without_consumer_reaches_broadcast_group():
    # Given
    receive = join_group(BROADCAST_GROUP)

    # When
    send(None, MESSAGE, broadcast=True)

    # Then
    assert receive() == {"type": "broadcast_message", "message": MESSAGE}


def test_broadcast_fallback_uses_consumer_broadcast_group(consumer):
    # Given
    consumer.broadcast_group = "custom-group"
    receive = join_group("custom-group")

    # When
    send(consumer, MESSAGE, broadcast=True)

    # Then
    assert receive() == {"type": "broadcast_message", "message": MESSAGE}
    assert consumer.sent == []


def test_broadcast_without_channel_layer_falls_back_to_consumer(consumer, settings):
    # Given
    settings.CHANNEL_LAYERS = {}

    # When
    send(consumer, MESSAGE, broadcast=True)

    # Then
    assert consumer.sent == [MESSAGE]


def test_broadcast_without_channel_layer_or_consumer_raises(settings):
    # Given
    settings.CHANNEL_LAYERS = {}

    # When / Then
    with pytest.raises(RuntimeError, match="No channel layer configured"):
        send(None, MESSAGE, broadcast=True)
