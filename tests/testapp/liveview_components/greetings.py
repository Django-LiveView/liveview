"""Handlers auto-discovered by LiveViewConfig.ready()."""

from liveview import liveview_handler, send


@liveview_handler("say_hello")
def say_hello(consumer, content):
    name = content["data"]["user_name"]
    send(consumer, {"target": "#greeting", "html": f"<p>Hello, {name}!</p>"})
