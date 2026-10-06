# Frontend Reference

Everything the browser side of Django LiveView understands: the HTML attributes that call handlers, what a handler receives, and every key `send()` accepts.

## Calling a Handler

Any element inside `<body data-controller="page">` can call a handler:

```html
<button
    data-liveview-function="add_to_cart"
    data-product-id="42"
    data-action="click->page#run">
    Add to cart
</button>
```

- `data-action="click->page#run"`: a [Stimulus action](https://stimulus.hotwired.dev/reference/actions). Use any event: `input->page#run`, `submit->page#run`, `change->page#run`...
- `data-liveview-function`: name of the handler registered with `@liveview_handler`.
- Every other `data-*` attribute is sent to the server.

`run` calls `preventDefault()`, so links and forms do not navigate or submit by themselves.

## What the Handler Receives

```python
@liveview_handler("add_to_cart")
def add_to_cart(consumer, content):
    product_id = content["data"]["product_id"]
    ...
```

| Key | Content |
|---|---|
| `function` | Name of the handler |
| `data` | The `data-*` attributes of the element (except the `data-liveview-*` ones and `data-action`) |
| `form` | Values of the form fields (see below) |
| `lang` | `lang` attribute of `<html>` |
| `room` | Room of the WebSocket connection |

All keys are converted from camelCase to snake_case, so `data-product-id` arrives as `content["data"]["product_id"]`. Values are strings.

`form` is filled like this:

- If the element is a `<form>`, or is inside one: every `input`, `select` and `textarea` of the form, by `name`.
- If the element is a field outside a form: its own value.
- Checkboxes send `True` or `False`; radio buttons only send the checked one.

`consumer.scope` gives access to the connection, for example `consumer.scope["user"]` when the ASGI router uses `AuthMiddlewareStack`.

## Sending HTML to the Browser

```python
from liveview import send

send(
    consumer,
    {
        "target": "#cart",
        "html": render_to_string("cart.html", {"cart": cart}),
    },
)
```

| Key | Type | Effect |
|---|---|---|
| `target` | CSS selector | Element to update. Required to render anything. |
| `html` | string | Replaces the content (`innerHTML`) of `target`. |
| `append` | bool | Adds `html` at the end of `target` instead of replacing its content. |
| `remove` | bool | Removes the `target` element. |
| `url` | string | New URL. Creates a browser history entry (see [Browser History](BROWSER_HISTORY.md)). |
| `title` | string | New `document.title`. |
| `scroll` | CSS selector | Smooth scroll to that element. |
| `scrollTop` | bool | Smooth scroll to the top of the page. |

When the message has `html` and `url` but no `scroll`, the page scrolls to the top, like a normal navigation.

Keys are sent as written: use `"scrollTop"`, not `"scroll_top"`.

### Broadcasting

```python
# To every connected client, from a handler
send(consumer, data, broadcast=True)

# From outside a handler (a view, a background task...)
send(None, data, broadcast=True)
```

Broadcasting needs a channel layer (`CHANNEL_LAYERS`).

## Inline Scripts

`<script>` tags inside the HTML sent by a handler are executed after the HTML is inserted:

- `el` and `this` are the `target` element, so the script does not need global selectors.
- A script can store a cleanup function in `el.__cleanup`. It is called before the content of `el` is replaced, before `el` is removed and before a history restore, to stop timers, observers or third-party widgets.

```html
<canvas id="chart"></canvas>
<script>
    const chart = new Chart(el.querySelector("#chart"), config);
    el.__cleanup = () => chart.destroy();
</script>
```

On a full page load the browser runs the same scripts natively, where `el` does not exist. Use `typeof el !== "undefined"` when a script needs to tell both cases apart.

Scripts also run again when the browser history restores their region. Write them so that running twice on their own HTML is safe, or mark them with `data-liveview-replay="false"`. See [Browser History](BROWSER_HISTORY.md#inline-scripts).

Only classic scripts are executed (no `type`, or `type="text/javascript"`). `src` scripts are not loaded.

## Attributes

### `data-liveview-debounce`

Wait until the events stop for that many milliseconds before calling the handler. Useful for search inputs:

```html
<input
    type="search"
    name="query"
    data-liveview-function="search"
    data-liveview-debounce="300"
    data-action="input->page#run">
```

### `data-liveview-focus="true"`

Focus the element when the page loads or when it is added to the page by a handler. Only the first focusable element found gets the focus.

### `data-liveview-init`

Call a handler when the page loads, once per element. Useful to load content that depends on the connection (a live counter, personalized data):

```html
<section id="visitors" data-liveview-init="load_visitors"></section>
```

It only applies to elements present when the page loads, not to elements added later by a handler.

### `data-liveview-intersect-appear` and `data-liveview-intersect-disappear`

Call a handler when the element enters or leaves the viewport. The base of infinite scroll:

```html
<div
    data-liveview-intersect-appear="next_page"
    data-liveview-intersect-threshold="300"
    data-page="2">
</div>
```

`data-liveview-intersect-threshold` (pixels) fires the event that many pixels before the element is visible. Elements added by a handler are observed automatically.

### `data-liveview-keyboard-map`

Map keys to handlers while the focus is on the element or inside it:

```html
<div
    class="modal"
    data-liveview-keyboard-map='{"esc": "close_modal", "ctrl+s": "save"}'>
</div>
```

- Key names: letters and digits as typed, `esc`, `enter`, `space`, `tab`, `up`, `down`, `left`, `right`, `home`, `end`, `page_up`, `page_down`.
- Modifiers, in this order: `ctrl`, `alt`, `meta`, `shift` (`shift` is not added to letters and digits).
- The element gets `tabindex="-1"` if it cannot receive the focus.

### `data-liveview-permanent`

The browser history never snapshots nor restores the element. For live widgets: see [Browser History](BROWSER_HISTORY.md#live-widgets-data-liveview-permanent).

### `data-liveview-replay="false"`

On a `<script>`: run it when the HTML arrives, but not again when the browser history restores its region.

## Connection

- The WebSocket URL is `ws(s)://<host>/ws/liveview/<room>/`. To change the host or protocol, define `window.webSocketConfig = {host: "...", protocol: "wss"}` before loading `liveview.min.js`.
- Messages sent while the connection is not ready are queued and sent when it opens.
- If the connection is lost, the client reconnects up to 5 times with exponential backoff.
- An element with `id="no-connection"` gets the class `no-connection--show` while the connection is lost and `no-connection--hide` when it is back.
- The connection is available as `window.myWebSocket`.
