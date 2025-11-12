from channels.generic.websocket import JsonWebsocketConsumer
from django_liveview.decorators import liveview_registry
import logging
from asgiref.sync import async_to_sync
from django_liveview.connections import send
import re

logger = logging.getLogger(__name__)


def camel_to_snake(name):
    """Convert camelCase to snake_case"""
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


def convert_keys_to_snake_case(obj):
    """Recursively convert all keys in a dictionary from camelCase to snake_case"""
    if isinstance(obj, dict):
        return {
            camel_to_snake(key): convert_keys_to_snake_case(value)
            for key, value in obj.items()
        }
    elif isinstance(obj, list):
        return [convert_keys_to_snake_case(item) for item in obj]
    else:
        return obj


class LiveViewConsumer(JsonWebsocketConsumer):
    """
    Consumer for handling live view updates via WebSocket.
    """

    broadcast_group = "broadcast"

    def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = "room_%s" % self.room_name
        self.channel_layer.group_add(self.room_group_name, self.channel_name)
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name, self.channel_name
        )
        async_to_sync(self.channel_layer.group_add)(
            self.broadcast_group, self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        """
        Handle disconnection from the WebSocket.
        Clean up group memberships.
        """
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name, self.channel_name
        )
        async_to_sync(self.channel_layer.group_discard)(
            self.broadcast_group, self.channel_name
        )

    def receive_json(self, content):
        """
        Handle incoming JSON messages from the WebSocket.
        """
        # Convert all keys from camelCase to snake_case
        content = convert_keys_to_snake_case(content)

        function_name = content.get("function")
        handler = liveview_registry.get_handler(function_name)

        if handler:
            handler(self, content)
        else:
            send(
                self,
                {
                    "error": f"Unknown function: {function_name}",
                    "available_functions": liveview_registry.list_functions(),
                },
            )
            logger.warning(f"Unknown LiveView function called: {function_name}")

    def broadcast_message(self, event):
        """
        Handle broadcast messages sent to the group
        """
        message = event["message"]
        self.send_json(message)

    def send_to_group(self, group_name, message):
        """
        Helper method to send messages to a specific group
        """
        async_to_sync(self.channel_layer.group_send)(
            group_name, {"type": "broadcast_message", "message": message}
        )

    def broadcast_to_all(self, message):
        """
        Helper method to broadcast to all clients
        """
        self.send_to_group(self.broadcast_group, message)
