import logging
from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

# Group every LiveView consumer joins on connect
BROADCAST_GROUP = "broadcast"


def send(consumer: Any, data: dict[str, Any], broadcast: bool = False) -> None:
    """
    Send a message to the consumer or broadcast it to all connected clients.

    Args:
        consumer: The WebSocket consumer instance to send the message to. It can
            be None when broadcasting (e.g. from a background task).
        data: A dictionary containing the message data to be sent.
        broadcast: If True, sends the message to all connected clients;
            otherwise, sends it to the specified consumer.
    """
    if not broadcast:
        if consumer is None:
            raise ValueError("Consumer cannot be None when not broadcasting.")
        consumer.send_json(data)
        return

    # Use the consumer method if available
    if consumer is not None and hasattr(consumer, "broadcast_to_all"):
        consumer.broadcast_to_all(data)
        return

    # Fallback: send directly through the channel layer
    group = getattr(consumer, "broadcast_group", BROADCAST_GROUP)
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            raise RuntimeError("No channel layer configured (CHANNEL_LAYERS).")
        async_to_sync(channel_layer.group_send)(
            group, {"type": "broadcast_message", "message": data}
        )
    except Exception:
        logger.exception("Error sending broadcast message")
        if consumer is None:
            raise
        # As fallback, send only to current consumer
        consumer.send_json(data)
