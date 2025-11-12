# Django LiveView

**Real-time server-rendered interfaces for Django using WebSockets.**

Django LiveView is a framework for building interactive, real-time web applications with Django using WebSockets, inspired by [Phoenix LiveView](https://hexdocs.pm/phoenix_live_view/) and [Laravel Livewire](https://laravel-livewire.com/).

Build rich, reactive user experiences with server-rendered HTML — **no need for a heavy JavaScript framework**.

---

## ✨ Features

- 🔄 **Real-time updates** via WebSockets
- 🎯 **Server-side rendering** — write Python, not JavaScript
- 🚀 **Auto-discovery** of LiveView components
- 🔌 **Simple decorator-based API**
- 📡 **Broadcast support** for multi-user updates
- 🎨 **Stimulus controller** included for advanced interactions
- 🔁 **Automatic reconnection** with exponential backoff
- 📦 **Batteries included** — JavaScript assets bundled
- 🧪 **Type hints** and modern Python
- 🌐 **Multi-language support** built-in

---

## 📋 Requirements

- Python 3.10+
- Django 4.2+
- Redis (for Channels layer)

---

## 🚀 Installation

### 1. Install the package

```bash
pip install django-liveview
```

### 2. Add to INSTALLED_APPS

```python
# settings.py
INSTALLED_APPS = [
    "daphne",  # Must be first for ASGI support
    "channels",
    "django_liveview",
    # ... your other apps
]
```

### 3. Configure Channels

```python
# settings.py
ASGI_APPLICATION = "your_project.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}
```

### 4. Set up ASGI routing

```python
# asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from django_liveview.routing import get_liveview_urlpatterns

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "your_project.settings")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                get_liveview_urlpatterns()
            )
        )
    ),
})
```

### 5. Include JavaScript assets

Add this to your base template:

```html
<!-- base.html -->
{% load static %}
<!DOCTYPE html>
<html lang="en" data-room="{% if request.user.is_authenticated %}{{ request.user.id }}{% else %}anonymous{% endif %}">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}My Site{% endblock %}</title>
</head>
<body data-controller="page">
    {% block content %}{% endblock %}

    <!-- LiveView JavaScript -->
    <script src="{% static 'django_liveview/liveview.min.js' %}" defer></script>
</body>
</html>
```

**Important attributes:**
- `data-room` on `<html>` — unique room identifier for WebSocket connections
- `data-controller="page"` on `<body>` — activates Stimulus controller

---

## 📖 Quick Start

### Create a LiveView Component

Create a file `liveview_components/hello.py` in any Django app:

```python
# app/liveview_components/hello.py
from django_liveview import liveview_handler, send
from django.template.loader import render_to_string

@liveview_handler("say_hello")
def say_hello(consumer, content):
    """Handle 'say_hello' function from client"""
    name = content.get("form", {}).get("name", "World")

    html = render_to_string("hello.html", {
        "message": f"Hello, {name}!"
    })

    send(consumer, {
        "target": "#greeting",
        "html": html
    })
```

### Create the template

```html
<!-- templates/hello.html -->
<div id="greeting">
    <h1>{{ message }}</h1>
</div>
```

### Call from HTML

```html
<!-- In your page template -->
<div>
    <input type="text" name="name" placeholder="Enter your name">
    <button
        data-liveview-function="say_hello"
        data-action="click->page#run">
        Say Hello
    </button>

    <div id="greeting">
        <h1>Hello, World!</h1>
    </div>
</div>
```

**That's it!** When you click the button, it calls the `say_hello` handler on the server, which renders the template and updates `#greeting` in real-time.

---

## 🎯 Core Concepts

### 1. Handler Registration

Use the `@liveview_handler` decorator to register functions:

```python
from django_liveview import liveview_handler, send

@liveview_handler("my_function")
def my_function(consumer, content):
    # consumer: WebSocket consumer instance
    # content: dict with 'function', 'data', 'form', 'lang', 'room'
    pass
```

### 2. Sending Responses

The `send()` function sends data back to the client:

```python
send(consumer, {
    "target": "#element-id",      # Required: CSS selector
    "html": "<div>Content</div>",  # HTML to render
    "append": False,                # True to append, False to replace
    "remove": False,                # True to remove the element
    "url": "/new-url/",            # Update browser URL
    "title": "New Title",           # Update page title
    "scroll": "#section",           # Scroll to element
    "scrollTop": True               # Scroll to top
})
```

### 3. Broadcasting

Send updates to all connected clients:

```python
send(consumer, {
    "target": "#notification",
    "html": "<div>New notification!</div>"
}, broadcast=True)
```

### 4. Form Data

Access form inputs automatically:

```python
@liveview_handler("submit_form")
def submit_form(consumer, content):
    form_data = content.get("form", {})
    name = form_data.get("name")
    email = form_data.get("email")
    # Process form...
```

### 5. Custom Data Attributes

Pass arbitrary data with `data-data-*` attributes:

```html
<button
    data-liveview-function="open_modal"
    data-data-modal-id="123"
    data-data-user-id="456"
    data-action="click->page#run">
    Open Modal
</button>
```

Access in Python:

```python
@liveview_handler("open_modal")
def open_modal(consumer, content):
    data = content.get("data", {})
    modal_id = data.get("modalId")  # Converted from modal-id
    user_id = data.get("userId")
```

---

## 🎨 Advanced Features

### Intersection Observer

Trigger functions when elements enter/exit the viewport:

```html
<!-- Load more when element appears -->
<div
    data-liveview-intersect-appear="load_more"
    data-liveview-intersect-threshold="100">
    <!-- Content -->
</div>
```

```python
@liveview_handler("load_more")
def load_more(consumer, content):
    # Load more items...
    pass
```

### Auto-focus

Automatically focus elements after render:

```html
<input type="text" data-liveview-focus="true">
```

### Init Functions

Execute functions on element initialization:

```html
<div data-liveview-init="initialize_component">
    <!-- Component content -->
</div>
```

### Middleware

Add custom processing before handlers:

```python
# In your app's ready() method or liveview component file
from django_liveview import liveview_registry

def my_middleware(consumer, content, function_name):
    # Check authentication, log, modify content, etc.
    if not consumer.scope["user"].is_authenticated:
        send(consumer, {"error": "Not authenticated"})
        return False  # Cancel handler execution
    return True  # Continue to handler

liveview_registry.add_middleware(my_middleware)
```

---

## 📚 Examples

### Infinite Scroll

```python
@liveview_handler("next_page")
def next_page(consumer, content):
    page = int(content["data"].get("page", 1))
    articles = Article.objects.all()[(page-1)*10:page*10]

    html = render_to_string("articles_list.html", {
        "articles": articles,
        "page": page + 1
    })

    send(consumer, {
        "target": "#articles",
        "html": html,
        "append": True  # Append, don't replace
    })
```

```html
<div id="articles">
    {% for article in articles %}
        <article>{{ article.title }}</article>
    {% endfor %}
</div>

<div
    data-liveview-intersect-appear="next_page"
    data-data-page="{{ page }}"
    data-liveview-intersect-threshold="200">
    Loading more...
</div>
```

### Real-time Search

```python
@liveview_handler("search")
def search(consumer, content):
    query = content["form"].get("q", "")
    results = Article.objects.filter(title__icontains=query)

    html = render_to_string("search_results.html", {
        "results": results
    })

    send(consumer, {
        "target": "#results",
        "html": html
    })
```

```html
<input
    type="text"
    name="q"
    data-liveview-function="search"
    data-action="input->page#run"
    placeholder="Search...">

<div id="results">
    <!-- Results appear here -->
</div>
```

### Form Validation

```python
@liveview_handler("validate_form")
def validate_form(consumer, content):
    form = MyForm(content["form"])

    if form.is_valid():
        form.save()
        html = render_to_string("success.html")
    else:
        html = render_to_string("form.html", {
            "form": form  # Contains errors
        })

    send(consumer, {
        "target": "#form-container",
        "html": html
    })
```

---

## 🧪 Testing

```python
# tests/test_handlers.py
from django.test import TestCase
from django_liveview import liveview_registry

class TestLiveViewHandlers(TestCase):
    def test_handler_registered(self):
        handler = liveview_registry.get_handler("my_function")
        self.assertIsNotNone(handler)

    def test_handler_execution(self):
        # Test your handler logic
        pass
```

---

## 🔧 Configuration

### Custom WebSocket URL

```python
# routing.py
from django_liveview.routing import get_liveview_path

websocket_urlpatterns = [
    get_liveview_path("custom/liveview/<str:room_name>/"),
]
```

Update JavaScript config in your template:

```html
<script>
    window.webSocketConfig = {
        host: '{{ request.get_host }}',
        protocol: '{% if request.is_secure %}wss{% else %}ws{% endif %}',
        path: '/custom/liveview/'  // Custom path
    };
</script>
<script src="{% static 'django_liveview/liveview.min.js' %}" defer></script>
```

### Reconnection Settings

Modify in `frontend/webSocketsCli.js` before building:

```javascript
const RECONNECT_INTERVAL = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BACKOFF_MULTIPLIER = 1.5;
```

---

## 🏗️ Development

### Building JavaScript Assets

```bash
cd frontend
npm install
npm run build       # Development build
npm run build:min   # Production build with minification
```

### Running Tests

```bash
pip install -e ".[dev]"
pytest
```

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🙏 Credits

Created by [Andros Fenollosa](https://github.com/tanrax)

Inspired by:
- [Phoenix LiveView](https://hexdocs.pm/phoenix_live_view/) (Elixir)
- [Laravel Livewire](https://laravel-livewire.com/) (PHP)

---

## 📬 Support

- GitHub Issues: [https://github.com/tanrax/django-liveview/issues](https://github.com/tanrax/django-liveview/issues)
- Mastodon: [@programadorwebvalencia@mastodont.cat](https://mastodont.cat/@programadorwebvalencia)

---

**Made with ❤️ and Python**
