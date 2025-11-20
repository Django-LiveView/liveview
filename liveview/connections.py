from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def send(consumer, data: dict, broadcast: bool = False):
    """
    Send a message to the consumer or broadcast it to all connected clients.

    Args:
        consumer: The WebSocket consumer instance to send the message to.
        data: A dictionary containing the message data to be sent.
        broadcast: If True, sends the message to all connected clients; otherwise, sends it to the specified consumer.
    """
    if consumer is None:
        raise ValueError("Consumer cannot be None when not broadcasting.")

    if broadcast:
        # Use the consumer method if available
        if hasattr(consumer, "broadcast_to_all"):
            consumer.broadcast_to_all(data)
        else:
            # Fallback to original method but with better error handling
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    consumer.broadcast_group,  # Use the consumer's group
                    {"type": "broadcast_message", "message": data},
                )
            except Exception as e:
                import logging

                logger = logging.getLogger(__name__)
                logger.error(f"Error sending broadcast message: {e}")
                # As fallback, send only to current consumer
                consumer.send_json(data)
    else:
        consumer.send_json(data)
