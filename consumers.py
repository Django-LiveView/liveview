import os
import sys
import threading
from django.conf import settings
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Client
from asgiref.sync import async_to_sync, sync_to_async
from channels.layers import get_channel_layer
from django.template.loader import render_to_string


# Load all actions from settings.LIVEVIEW_APPS
for current_app in settings.LIVEVIEW_APPS:
    for entry in os.scandir(os.path.join(settings.BASE_DIR, current_app.replace(".", "/"), "actions")):
        if entry.is_file():
            name = entry.name.split(".")[0]
            exec(f"from {current_app}.actions import {name} as {name}")


class LiveViewConsumer(AsyncJsonWebsocketConsumer):

    channel_name_broadcast = "broadcast"

    @database_sync_to_async
    def create_client(self, channel_name):
        Client.objects.create(channel_name=channel_name)

    @database_sync_to_async
    def delete_client(self, channel_name):
        Client.objects.filter(channel_name=channel_name).delete()

    async def connect(self):
        """Event when client connects"""
        # Accept the connection
        await self.accept()
        # Add to group broadcast
        await self.channel_layer.group_add(
            self.channel_name_broadcast, self.channel_name
        )
        # Save the client
        await self.create_client(self.channel_name)

    async def disconnect(self, close_code):
        """Event when client disconnects"""
        # Remove from group broadcast
        await self.channel_layer.group_discard(
            self.channel_name_broadcast, self.channel_name
        )
        # Delete the client
        await self.delete_client(self.channel_name)

    async def receive_json(self, data_received):
        """
        Event when data is received
        All information will arrive in 2 variables:
        "action", with the action to be taken
        "data" with the information
        """
        # Get the data
        data = data_received if "data" in data_received else None
        # Depending on the action we will do one task or another.
        # Example: If the action is "home->search", we will call the function "actions.home.search" with the data
        if data and "action" in data:
            action_data = data["action"].split("->")
            if len(action_data) == 2:
                action = action_data[0].lower()
                function = action_data[1].lower()
                try:
                    await eval(f"{action}.{function}(self, data)")
                except Exception as e:
                    print(f"Bad action: {data['action']}")
                    # Print the error
                    exc_type, exc_obj, exc_tb = sys.exc_info()
                    print(exc_type)

    async def send_html(self, data, broadcast=False):
        """Event: Send html to client

        Example minimum data:
        {
            "action": "home->search",
            "selector": "#search-results",
            "html": "<h1>Example</h1>"
        }

        Example with optional data:
        {
            "action": "home->search",
            "selector": "#search-results",
            "html": "<h1>Example</h1>",
            "append": true, # Optional, default: false. If true, the html will be added, not replaced
            "url": "/search/results", # Optional, default: None. If set, the url will be changed
            "title": "Search results", # Optional, default: None. If set, the title will be changed
            "scroll": true # Optional, default: false. If true, the page will be scrolled to the selector
            "scrollTop": false # Optional, default: false. If true, the page will be scrolled to the top
        }
        """
        if "selector" in data and "html" in data:
            # Required data
            my_data = {
                "action": data["action"],
                "selector": data["selector"],
                "html": data["html"],
            }
            # Optional data
            if "append" in data:
                my_data.update({"append": data["append"]})
            else:
                my_data.update({"append": False})
            if "url" in data:
                my_data.update({"url": data["url"]})
            if "title" in data:
                my_data.update({"title": data["title"]})
            if "scroll" in data:
                my_data.update({"scroll": data["scroll"]})
            if "scrollTop" in data:
                my_data.update({"scrollTop": data["scrollTop"]})
            # Send the data
            if broadcast:
                if hasattr(self, "channel_layer"):
                    await self.channel_layer.group_send(
                        self.channel_name_broadcast,
                        {"type": "send_data_to_frontend", "data": my_data},
                    )
            else:
                await self.send_data_to_frontend(my_data)

    async def send_data_to_frontend(self, data):
        """Send data to the frontend"""
        # Corrects the data if it comes from an external call or a group_send
        send_data = data["data"] if "type" in data else data
        await self.send_json(send_data)
