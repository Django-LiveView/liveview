from django.template.loader import render_to_string

from demo.views import PAGES
from liveview import liveview_handler
from liveview.connections import send


@liveview_handler("change_page")
def change_page(consumer, content):
    """SPA navigation: replace #main, update URL and title."""
    page = content["data"]["page"]
    html = render_to_string(f"demo/pages/{page}.html")
    send(
        consumer,
        {
            "target": "#main",
            "html": html,
            "url": PAGES[page]["url"],
            "title": PAGES[page]["title"],
        },
    )


@liveview_handler("increment")
def increment(consumer, content):
    """Counter update without URL change (intra-page state)."""
    value = int(content["data"]["value"]) + 1
    html = render_to_string("demo/counter.html", {"value": value})
    send(consumer, {"target": "#counter", "html": html})


@liveview_handler("remove_item")
def remove_item(consumer, content):
    """Remove a DOM element (data.remove)."""
    item_id = content["data"]["id"]
    send(consumer, {"target": f"#item-{item_id}", "remove": True})


@liveview_handler("add_post")
def add_post(consumer, content):
    """Append content to a list (data.append) and refresh the button."""
    next_number = int(content["data"]["next"])
    send(
        consumer,
        {
            "target": "#post-list",
            "html": f'<li class="post">Post {next_number}</li>',
            "append": True,
        },
    )
    button_html = render_to_string(
        "demo/add_post_button.html", {"next": next_number + 1}
    )
    send(consumer, {"target": "#add-post-area", "html": button_html})


@liveview_handler("tick")
def tick(consumer, content):
    """Live widget outside the navigated region (data-liveview-permanent)."""
    value = int(content["data"]["value"]) + 1
    html = render_to_string("demo/ticker.html", {"value": value})
    send(consumer, {"target": "#ticker", "html": html})
