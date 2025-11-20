# Django LiveView

![Django LiveView](https://github.com/Django-LiveView/starter-template/raw/main/brand_assets/github%20social%20preview.jpg)

**Build real-time, reactive interfaces with Django using WebSockets — write Python, not JavaScript.**

Django LiveView is a framework for creating interactive, real-time web applications entirely in Python, inspired by [Phoenix LiveView](https://hexdocs.pm/phoenix_live_view/) and [Laravel Livewire](https://laravel-livewire.com/).

Create rich, dynamic user experiences with server-rendered HTML without writing a single line of JavaScript. Perfect for Django developers who want real-time features without the complexity of a separate frontend framework.

## 💪 Superpowers

- **Create SPAs without using APIs** — No REST or GraphQL needed
- **Uses Django's template system** to render the frontend (without JavaScript frameworks)
- **Logic stays in Python** — No split between backend and frontend
- **Use all of Django's tools** — ORM, forms, authentication, admin, etc.
- **Everything is asynchronous by default** — Built on Django Channels
- **Zero learning curve** — If you know Python and Django, you're ready
- **Real-time by design** — All interactions happen over WebSockets

System components communicate through real-time events, where events represent important actions. Every component can produce and consume actions, allowing asynchronous and decoupled communication.

**LiveView is HTML over WebSockets** — a new way to build dynamic websites with Django.

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
- 🎬 **Intersection Observer** for infinite scroll
- 🎯 **Auto-focus** for dynamic elements
- ⚡ **Threading support** for background tasks
- 🔒 **Middleware system** for authentication/authorization

---

## 📋 Requirements

- Python 3.10+
- Django 4.2+
- Redis (for Channels layer)
- Channels 4.0+

---

## 🚀 Quick Start

### Step 1: Installation

```bash
pip install django-liveview
```

### Step 2: Configure Django

Add to your `settings.py`:

```python
# settings.py
INSTALLED_APPS = [
    "daphne",  # Must be first for ASGI support
    "channels",
    "liveview",
    # ... your other apps
]

# ASGI configuration
ASGI_APPLICATION = "your_project.asgi.application"

# Configure Channels with Redis
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}
```

### Step 3: Setup ASGI routing

Create or update `asgi.py`:

```python
# asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from liveview.routing import get_liveview_urlpatterns

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

### Step 4: Add JavaScript to your base template

```html
<!-- templates/base.html -->
{% load static %}
<!DOCTYPE html>
<html lang="en" data-room="{% if request.user.is_authenticated %}{{ request.user.id }}{% else %}anonymous{% endif %}">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}My Site{% endblock %}</title>
</head>
<body data-controller="page">
    {% block content %}{% endblock %}

    <!-- Django LiveView JavaScript -->
    <script src="{% static 'liveview/liveview.min.js' %}" defer></script>
</body>
</html>
```

**Important attributes:**
- `data-room` on `<html>` — unique identifier for WebSocket room (user-specific or shared)
- `data-controller="page"` on `<body>` — activates the Stimulus controller

### Step 5: Create your first LiveView component

Create `app/liveview_components/hello.py`:

```python
# app/liveview_components/hello.py
from liveview import liveview_handler, send
from django.template.loader import render_to_string

@liveview_handler("say_hello")
def say_hello(consumer, content):
    """Handle 'say_hello' function from client"""
    name = content.get("form", {}).get("name", "World")

    html = render_to_string("hello_message.html", {
        "message": f"Hello, {name}!"
    })

    send(consumer, {
        "target": "#greeting",
        "html": html
    })
```

Create the template `templates/hello_message.html`:

```html
<h1>{{ message }}</h1>
```

### Step 6: Use it in your page

```html
<!-- templates/hello_page.html -->
{% extends "base.html" %}

{% block content %}
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
{% endblock %}
```

### Step 7: Run your project

```bash
# Make sure Redis is running
redis-server

# Run Django with Daphne (ASGI server)
python manage.py runserver
```

That's it! Click the button and see real-time updates. 🎉

---

## 📖 Complete Feature Guide

### 1. Handler Registration

Use the `@liveview_handler` decorator to register functions that can be called from the client:

```python
from liveview import liveview_handler, send

@liveview_handler("my_function")
def my_function(consumer, content):
    """
    Args:
        consumer: WebSocket consumer instance
        content: dict with:
            - function: str - the function name
            - data: dict - custom data from data-data-* attributes
            - form: dict - form input values
            - lang: str - current language
            - room: str - room identifier
    """
    pass
```

#### Auto-discovery

Django LiveView automatically discovers handlers in `liveview_components/` directories within your installed apps:

```
my_app/
├── liveview_components/
│   ├── __init__.py
│   ├── users.py
│   ├── posts.py
│   └── comments.py
```

Handlers are loaded on startup with this output:
```
✓ Imported: my_app.liveview_components.users
✓ Imported: my_app.liveview_components.posts
✓ Imported: my_app.liveview_components.comments
```

---

### 2. Sending Responses with `send()`

The `send()` function sends data back to the client with many options:

#### Basic Update (Replace HTML)

```python
@liveview_handler("update_content")
def update_content(consumer, content):
    send(consumer, {
        "target": "#my-element",
        "html": "<p>New content</p>"
    })
```

```html
<div id="my-element">
    <p>Old content</p>
</div>
```

#### Append HTML

```python
@liveview_handler("add_item")
def add_item(consumer, content):
    send(consumer, {
        "target": "#items-list",
        "html": "<li>New item</li>",
        "append": True  # Adds to the end
    })
```

#### Remove Element

```python
@liveview_handler("delete_item")
def delete_item(consumer, content):
    item_id = content["data"]["id"]
    # Delete from database...

    send(consumer, {
        "target": f"#item-{item_id}",
        "remove": True
    })
```

#### Update URL and Title

```python
@liveview_handler("navigate")
def navigate(consumer, content):
    send(consumer, {
        "target": "#content",
        "html": render_to_string("new_page.html"),
        "url": "/new-page/",
        "title": "New Page Title"
    })
```

#### Scroll Management

```python
@liveview_handler("show_section")
def show_section(consumer, content):
    send(consumer, {
        "target": "#content",
        "html": render_to_string("section.html"),
        "scroll": "#section-2"  # Smooth scroll to element
    })

@liveview_handler("back_to_top")
def back_to_top(consumer, content):
    send(consumer, {
        "target": "#content",
        "html": render_to_string("content.html"),
        "scrollTop": True  # Scroll to top of page
    })
```

---

### 3. Form Handling

Django LiveView automatically extracts form data and makes it available in the `content["form"]` dictionary:

#### Python Handler

```python
@liveview_handler("submit_contact")
def submit_contact(consumer, content):
    from .forms import ContactForm

    form = ContactForm(content["form"])

    if form.is_valid():
        # Save to database
        contact = form.save()

        # Show success message
        html = render_to_string("contact_success.html", {
            "message": "Thank you! We'll be in touch."
        })
    else:
        # Show form with errors
        html = render_to_string("contact_form.html", {
            "form": form
        })

    send(consumer, {
        "target": "#contact-container",
        "html": html
    })
```

#### HTML Template

```html
<div id="contact-container">
    <form>
        <input type="text" name="name" placeholder="Name" required>
        <input type="email" name="email" placeholder="Email" required>
        <textarea name="message" placeholder="Message" required></textarea>

        <button
            data-liveview-function="submit_contact"
            data-action="click->page#run"
            type="button">
            Submit
        </button>
    </form>
</div>
```

#### Real-time Validation

```python
@liveview_handler("validate_field")
def validate_field(consumer, content):
    field_name = content["data"]["field"]
    field_value = content["form"].get(field_name, "")

    # Validate
    error = None
    if field_name == "email" and "@" not in field_value:
        error = "Invalid email address"
    elif field_name == "name" and len(field_value) < 3:
        error = "Name must be at least 3 characters"

    # Show error or success
    html = f'<span class="{"error" if error else "success"}">{error or "✓"}</span>'

    send(consumer, {
        "target": f"#error-{field_name}",
        "html": html
    })
```

```html
<input
    type="text"
    name="email"
    data-liveview-function="validate_field"
    data-data-field="email"
    data-action="blur->page#run">
<span id="error-email"></span>
```

---

### 4. Custom Data Attributes

Pass arbitrary data to handlers using `data-data-*` attributes:

#### HTML

```html
<button
    data-liveview-function="open_modal"
    data-data-modal-id="123"
    data-data-user-id="456"
    data-data-modal-type="confirmation"
    data-action="click->page#run">
    Open Modal
</button>
```

#### Python Handler

```python
@liveview_handler("open_modal")
def open_modal(consumer, content):
    data = content.get("data", {})

    # Attributes are converted from kebab-case to camelCase
    modal_id = data.get("modalId")      # from modal-id
    user_id = data.get("userId")        # from user-id
    modal_type = data.get("modalType")  # from modal-type

    # Fetch modal data
    modal_content = get_modal_content(modal_id, user_id, modal_type)

    html = render_to_string("modal.html", {
        "content": modal_content
    })

    send(consumer, {
        "target": "#modal-container",
        "html": html
    })
```

---

### 5. Broadcasting to Multiple Users

Send updates to all connected clients:

#### Simple Broadcast

```python
@liveview_handler("notify_all")
def notify_all(consumer, content):
    message = content["form"]["message"]

    html = render_to_string("notification.html", {
        "message": message
    })

    send(consumer, {
        "target": "#notifications",
        "html": html,
        "append": True
    }, broadcast=True)  # Sends to ALL connected users
```

#### Background Thread Broadcast with Auto-removal

```python
from threading import Thread
from time import sleep
from uuid import uuid4

@liveview_handler("send_notification")
def send_notification(consumer, content):
    notification_id = str(uuid4().hex)
    message = "New update available!"

    def broadcast_notification():
        # Send notification
        html = render_to_string("notification.html", {
            "id": notification_id,
            "message": message
        })

        send(consumer, {
            "target": "#notifications",
            "html": html,
            "append": True
        }, broadcast=True)

        # Remove after 5 seconds
        sleep(5)
        send(consumer, {
            "target": f"#notification-{notification_id}",
            "remove": True
        }, broadcast=True)

    Thread(target=broadcast_notification).start()
```

```html
<div id="notifications">
    <!-- Notifications appear here -->
</div>
```

---

### 6. Intersection Observer (Infinite Scroll)

Trigger functions when elements enter or exit the viewport:

#### Python Handler

```python
ITEMS_PER_PAGE = 10

@liveview_handler("load_more")
def load_more(consumer, content):
    page = int(content["data"].get("page", 1))

    # Fetch items
    start = (page - 1) * ITEMS_PER_PAGE
    end = start + ITEMS_PER_PAGE
    items = Item.objects.all()[start:end]
    is_last_page = end >= Item.objects.count()

    # Append items to list
    send(consumer, {
        "target": "#items-list",
        "html": render_to_string("items_partial.html", {
            "items": items
        }),
        "append": True
    })

    # Update or remove intersection observer trigger
    if is_last_page:
        html = ""
    else:
        html = render_to_string("load_trigger.html", {
            "next_page": page + 1
        })

    send(consumer, {
        "target": "#load-more-trigger",
        "html": html
    })
```

#### HTML Templates

```html
<!-- items_list.html -->
<div id="items-list">
    {% for item in items %}
        <div class="item">{{ item.title }}</div>
    {% endfor %}
</div>

<div id="load-more-trigger">
    {% include "load_trigger.html" %}
</div>
```

```html
<!-- load_trigger.html -->
<div
    data-liveview-intersect-appear="load_more"
    data-data-page="{{ next_page }}"
    data-liveview-intersect-threshold="200">
    <p>Loading more...</p>
</div>
```

**Attributes:**
- `data-liveview-intersect-appear="function_name"` — Call when element appears
- `data-liveview-intersect-disappear="function_name"` — Call when element disappears
- `data-liveview-intersect-threshold="200"` — Trigger 200px before entering viewport (default: 0)

---

### 7. Real-time Search

```python
@liveview_handler("search_articles")
def search_articles(consumer, content):
    query = content["form"].get("search", "").strip()

    if query:
        articles = Article.objects.filter(title__icontains=query)
    else:
        articles = Article.objects.all()[:10]

    html = render_to_string("search_results.html", {
        "articles": articles,
        "query": query
    })

    send(consumer, {
        "target": "#search-results",
        "html": html
    })
```

```html
<input
    type="search"
    name="search"
    data-liveview-function="search_articles"
    data-action="input->page#run"
    placeholder="Search articles...">

<div id="search-results">
    <!-- Results appear here -->
</div>
```

---

### 8. Auto-focus

Automatically focus elements after rendering:

```python
@liveview_handler("open_edit_form")
def open_edit_form(consumer, content):
    item_id = content["data"]["id"]
    item = Item.objects.get(id=item_id)

    html = render_to_string("edit_form.html", {
        "item": item
    })

    send(consumer, {
        "target": "#form-container",
        "html": html
    })
```

```html
<!-- edit_form.html -->
<form>
    <input
        type="text"
        name="title"
        value="{{ item.title }}"
        data-liveview-focus="true">  <!-- Auto-focuses -->
    <button data-liveview-function="save_item" data-action="click->page#run">
        Save
    </button>
</form>
```

---

### 9. Init Functions

Execute functions when elements are first rendered:

```python
@liveview_handler("init_counter")
def init_counter(consumer, content):
    counter_id = content["data"]["counterId"]
    initial_value = content["data"]["initialValue"]

    html = render_to_string("counter_value.html", {
        "counter_id": counter_id,
        "value": initial_value
    })

    send(consumer, {
        "target": f"#counter-{counter_id}-value",
        "html": html
    })
```

```html
<div
    data-liveview-init="init_counter"
    data-data-counter-id="1"
    data-data-initial-value="0">
    <span id="counter-1-value"></span>
</div>
```

---

### 10. Multi-language Support (i18n)

Django LiveView automatically passes the current language to handlers:

```python
from django.utils import translation

@liveview_handler("show_content")
def show_content(consumer, content):
    # Get language from WebSocket message
    lang = content.get("lang", "en")

    # Activate language for this context
    translation.activate(lang)

    try:
        html = render_to_string("content.html", {
            "title": _("Welcome"),
            "message": _("This content is in your language")
        })

        send(consumer, {
            "target": "#content",
            "html": html
        })
    finally:
        # Always deactivate to avoid side effects
        translation.deactivate()
```

The language is automatically detected from the user's session/cookie and sent with each WebSocket message.

---

### 11. Middleware System

Add middleware to run before handlers for authentication, logging, or rate limiting:

```python
# In your app's apps.py or liveview component file
from liveview import liveview_registry, send

def auth_middleware(consumer, content, function_name):
    """Check if user is authenticated before running handler"""
    user = consumer.scope.get("user")

    if not user or not user.is_authenticated:
        send(consumer, {
            "target": "#error",
            "html": "<p>You must be logged in</p>"
        })
        return False  # Cancel handler execution

    return True  # Continue to handler

def logging_middleware(consumer, content, function_name):
    """Log all handler calls"""
    import logging
    logger = logging.getLogger(__name__)

    user = consumer.scope.get("user")
    logger.info(f"Handler '{function_name}' called by {user}")

    return True  # Continue to handler

# Register middleware
liveview_registry.add_middleware(auth_middleware)
liveview_registry.add_middleware(logging_middleware)
```

Middleware runs in the order it was added and can cancel handler execution by returning `False`.

---

### 12. Advanced: Modal Dialog with Overlay

```python
@liveview_handler("open_dialog")
def open_dialog(consumer, content):
    dialog_type = content["data"]["type"]

    html = render_to_string("dialog.html", {
        "type": dialog_type,
        "title": "Confirm Action",
        "message": "Are you sure you want to proceed?"
    })

    send(consumer, {
        "target": "#dialog-container",
        "html": html
    })

@liveview_handler("close_dialog")
def close_dialog(consumer, content):
    send(consumer, {
        "target": "#dialog-container",
        "html": ""
    })

@liveview_handler("confirm_action")
def confirm_action(consumer, content):
    # Perform the action
    action_id = content["data"]["actionId"]
    # ... perform action ...

    # Close dialog
    send(consumer, {
        "target": "#dialog-container",
        "html": ""
    })

    # Show success
    send(consumer, {
        "target": "#message",
        "html": "<p>Action completed successfully!</p>"
    })
```

```html
<!-- Base template -->
<div id="dialog-container"></div>

<!-- Button to trigger -->
<button
    data-liveview-function="open_dialog"
    data-data-type="confirmation"
    data-action="click->page#run">
    Open Dialog
</button>

<!-- templates/dialog.html -->
<div class="overlay" data-action="click->page#run" data-liveview-function="close_dialog">
    <div class="dialog" data-action="click->page#stop">
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
        <button
            data-liveview-function="confirm_action"
            data-data-action-id="123"
            data-action="click->page#run">
            Confirm
        </button>
        <button
            data-liveview-function="close_dialog"
            data-action="click->page#run">
            Cancel
        </button>
    </div>
</div>
```

---

### 13. Advanced: Background Email Sending

```python
from threading import Thread
from django.core.mail import send_mail
from django.conf import settings

@liveview_handler("send_contact_message")
def send_contact_message(consumer, content):
    from .forms import ContactForm

    form = ContactForm(content["form"])

    if form.is_valid():
        # Clear form immediately
        send(consumer, {
            "target": "#contact-form",
            "html": ""
        })

        # Send email in background thread
        def send_email_async():
            send_mail(
                subject=f"Contact from {form.cleaned_data['name']}",
                message=form.cleaned_data['message'],
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.CONTACT_EMAIL],
                fail_silently=False
            )

        Thread(target=send_email_async).start()

        # Show success notification
        def show_notification():
            from uuid import uuid4
            notif_id = str(uuid4().hex)

            send(consumer, {
                "target": "#notifications",
                "html": render_to_string("notification.html", {
                    "id": notif_id,
                    "message": "Message sent successfully!"
                }),
                "append": True
            })

            # Remove after 3 seconds
            from time import sleep
            sleep(3)
            send(consumer, {
                "target": f"#notification-{notif_id}",
                "remove": True
            })

        Thread(target=show_notification).start()
    else:
        # Show form with errors
        html = render_to_string("contact_form.html", {
            "form": form
        })
        send(consumer, {
            "target": "#contact-form",
            "html": html
        })
```

---

## 🎯 Stimulus Actions Reference

The Stimulus controller provides these actions:

- `data-action="click->page#run"` — Execute LiveView function on click
- `data-action="input->page#run"` — Execute on input change (real-time)
- `data-action="submit->page#run"` — Execute on form submit
- `data-action="change->page#run"` — Execute on change event
- `data-action="blur->page#run"` — Execute when element loses focus
- `data-action="page#stop"` — Stop event propagation

---

## 🔧 Configuration

### Custom WebSocket Path

```python
# routing.py (custom)
from liveview.routing import get_liveview_path

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
<script src="{% static 'liveview/liveview.min.js' %}" defer></script>
```

### Reconnection Settings

Modify these values in `frontend/webSocketsCli.js` before building:

```javascript
const RECONNECT_INTERVAL = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BACKOFF_MULTIPLIER = 1.5;
```

---

## 🧪 Testing

```python
# tests/test_handlers.py
from django.test import TestCase
from liveview import liveview_registry

class TestLiveViewHandlers(TestCase):
    def test_handler_registered(self):
        """Test that handler is properly registered"""
        handler = liveview_registry.get_handler("my_function")
        self.assertIsNotNone(handler)

    def test_handler_list(self):
        """Test listing all handlers"""
        functions = liveview_registry.list_functions()
        self.assertIn("my_function", functions)

    def test_handler_execution(self):
        """Test handler logic"""
        # Create mock consumer and content
        from unittest.mock import Mock
        consumer = Mock()
        content = {
            "function": "my_function",
            "form": {"name": "Test"},
            "data": {},
        }

        # Get and execute handler
        handler = liveview_registry.get_handler("my_function")
        handler(consumer, content)

        # Assert consumer.send_json was called
        consumer.send_json.assert_called()
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

## 📝 Complete Example: Blog Comments System

### Python Handler

```python
# blog/liveview_components/comments.py
from liveview import liveview_handler, send
from django.template.loader import render_to_string
from django.utils import translation
from django.conf import settings
from .models import Article

@liveview_handler("show_comments")
def show_comments(consumer, content):
    article_id = content["data"].get("articleId")
    lang = content.get("lang", settings.LANGUAGE_CODE)

    translation.activate(lang)

    try:
        article = Article.objects.get(id=article_id)
        html = render_to_string("blog/comments.html", {
            "article": article,
            "comments": article.comments.all()
        })

        send(consumer, {
            "target": "#comments",
            "html": html
        })
    except Article.DoesNotExist:
        send(consumer, {
            "target": "#comments",
            "html": "<p>Article not found</p>"
        })
    finally:
        translation.deactivate()
```

### HTML Template

```html
<!-- blog/article.html -->
{% extends "base.html" %}

{% block content %}
<article>
    <h1>{{ article.title }}</h1>
    <div>{{ article.content }}</div>

    <button
        data-liveview-function="show_comments"
        data-data-article-id="{{ article.id }}"
        data-action="click->page#run">
        Show Comments
    </button>

    <div id="comments">
        <!-- Comments load here -->
    </div>
</article>
{% endblock %}
```

---

## 🎓 Best Practices

### 1. Keep Handlers Focused

Each handler should do one thing:

```python
# ✅ Good - focused handler
@liveview_handler("update_title")
def update_title(consumer, content):
    # Only updates title
    pass

# ❌ Bad - doing too much
@liveview_handler("do_everything")
def do_everything(consumer, content):
    # Updates title, saves to DB, sends email, generates PDF...
    pass
```

### 2. Use Template Partials

```python
# ✅ Good - reusable partial
html = render_to_string("partials/item.html", {"item": item})

# ❌ Bad - HTML in Python
html = f"<div>{item.title}</div>"
```

### 3. Handle Errors Gracefully

```python
@liveview_handler("delete_item")
def delete_item(consumer, content):
    try:
        item_id = content["data"]["id"]
        item = Item.objects.get(id=item_id)
        item.delete()

        send(consumer, {
            "target": f"#item-{item_id}",
            "remove": True
        })
    except Item.DoesNotExist:
        send(consumer, {
            "target": "#error",
            "html": "<p>Item not found</p>"
        })
    except Exception as e:
        logger.error(f"Error deleting item: {e}")
        send(consumer, {
            "target": "#error",
            "html": "<p>An error occurred</p>"
        })
```

### 4. Use Background Threads for Slow Operations

```python
from threading import Thread

@liveview_handler("process_data")
def process_data(consumer, content):
    # Show loading state immediately
    send(consumer, {
        "target": "#status",
        "html": "<p>Processing...</p>"
    })

    # Process in background
    def process():
        result = slow_operation()

        send(consumer, {
            "target": "#status",
            "html": f"<p>Done: {result}</p>"
        })

    Thread(target=process).start()
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

Created by [Andros Fenollosa](https://github.com/tanrax)

Inspired by:
- [Phoenix LiveView](https://hexdocs.pm/phoenix_live_view/) (Elixir)
- [Laravel Livewire](https://laravel-livewire.com/) (PHP)

---

## 📬 Support

- **Documentation**: [GitHub README](https://github.com/tanrax/django-liveview#readme)
- **Issues**: [GitHub Issues](https://github.com/tanrax/django-liveview/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tanrax/django-liveview/discussions)
- **Mastodon**: [@andros@activity.andros.dev](https://activity.andros.dev/@andros)

---

**Made with ❤️ and Python**
