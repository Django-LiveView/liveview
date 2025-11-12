# Quick Start Guide

This guide will help you set up Django LiveView in a new or existing Django project in less than 10 minutes.

## Prerequisites

- Python 3.10 or higher
- Django 4.2 or higher
- Redis server running (for WebSocket support)

## Step 1: Installation

```bash
pip install django-liveview channels channels-redis daphne redis
```

## Step 2: Configure Django Settings

### Add apps to INSTALLED_APPS

```python
# settings.py
INSTALLED_APPS = [
    "daphne",  # IMPORTANT: Must be FIRST for ASGI support
    "channels",
    "django_liveview",

    # Your Django apps
    "django.contrib.admin",
    "django.contrib.auth",
    # ... rest of your apps
]
```

### Configure ASGI and Channels

```python
# settings.py

# Set ASGI as the application interface
ASGI_APPLICATION = "your_project.asgi.application"

# Configure Redis as the channel layer
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
            # Or use environment variable:
            # "hosts": [os.environ.get("REDIS_URL", "redis://127.0.0.1:6379")],
        },
    },
}
```

## Step 3: Configure ASGI Routing

Create or update your `asgi.py` file:

```python
# your_project/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from django_liveview.routing import get_liveview_urlpatterns

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "your_project.settings")

# Initialize Django ASGI application early
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                get_liveview_urlpatterns()
            )
        )
    ),
})
```

## Step 4: Update Your Base Template

Add the required HTML attributes and JavaScript:

```html
<!-- templates/base.html -->
{% load static %}
<!DOCTYPE html>
<html lang="en"
      data-room="{% if request.user.is_authenticated %}user_{{ request.user.id }}{% else %}anonymous_{{ request.session.session_key }}{% endif %}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}My Site{% endblock %}</title>
    {% block extra_head %}{% endblock %}
</head>
<body data-controller="page">
    {% block content %}{% endblock %}

    <!-- Django LiveView JavaScript (load at the end) -->
    <script src="{% static 'django_liveview/liveview.min.js' %}" defer></script>
    {% block extra_scripts %}{% endblock %}
</body>
</html>
```

**Important attributes:**
- `data-room` on `<html>`: Unique identifier for WebSocket room
- `data-controller="page"` on `<body>`: Activates Stimulus controller

## Step 5: Create Your First LiveView Component

### 5.1 Create the components directory

In any Django app, create a `liveview_components` directory:

```bash
mkdir your_app/liveview_components
touch your_app/liveview_components/__init__.py
```

### 5.2 Create a component

```python
# your_app/liveview_components/counter.py
from django_liveview import liveview_handler, send
from django.template.loader import render_to_string

@liveview_handler("increment_counter")
def increment_counter(consumer, content):
    """Increment counter and update the UI"""
    # Get current value from form data
    current_value = int(content.get("data", {}).get("value", 0))

    # Increment
    new_value = current_value + 1

    # Render template with new value
    html = render_to_string("counter_display.html", {
        "value": new_value
    })

    # Send update to client
    send(consumer, {
        "target": "#counter-display",
        "html": html
    })

@liveview_handler("decrement_counter")
def decrement_counter(consumer, content):
    """Decrement counter and update the UI"""
    current_value = int(content.get("data", {}).get("value", 0))
    new_value = current_value - 1

    html = render_to_string("counter_display.html", {
        "value": new_value
    })

    send(consumer, {
        "target": "#counter-display",
        "html": html
    })
```

### 5.3 Create the templates

```html
<!-- templates/counter_display.html -->
<div id="counter-display">
    <h2>Count: {{ value }}</h2>
    <button
        data-liveview-function="decrement_counter"
        data-data-value="{{ value }}"
        data-action="click->page#run">
        -
    </button>
    <button
        data-liveview-function="increment_counter"
        data-data-value="{{ value }}"
        data-action="click->page#run">
        +
    </button>
</div>
```

```html
<!-- templates/counter_page.html -->
{% extends "base.html" %}

{% block content %}
<div class="container">
    <h1>Counter Example</h1>
    {% include "counter_display.html" with value=0 %}
</div>
{% endblock %}
```

### 5.4 Create a view

```python
# your_app/views.py
from django.shortcuts import render

def counter_view(request):
    return render(request, "counter_page.html")
```

### 5.5 Add URL

```python
# your_app/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("counter/", views.counter_view, name="counter"),
]
```

## Step 6: Run Your Application

### Start Redis (if not already running)

```bash
redis-server
```

### Run Django with Daphne

```bash
# Development
python manage.py runserver

# Or explicitly use daphne
daphne -b 0.0.0.0 -p 8000 your_project.asgi:application
```

### Test it!

Visit http://localhost:8000/counter/ and click the +/- buttons. The counter should update in real-time without page reload!

## Step 7: Check Everything Works

### Verify WebSocket Connection

Open browser DevTools (F12) → Console. You should see:

```
Connecting to WebSockets server...
Connected to WebSockets server
```

### Verify Component Import

Check server console output. You should see:

```
✓ Imported: your_app.liveview_components.counter
```

## Troubleshooting

### WebSocket Connection Failed

**Problem:** `WebSocket connection to 'ws://localhost:8000/ws/liveview/...' failed`

**Solutions:**
1. Make sure Redis is running: `redis-cli ping` should return `PONG`
2. Check `CHANNEL_LAYERS` configuration in settings.py
3. Verify `daphne` is first in `INSTALLED_APPS`
4. Make sure you're using `runserver` or `daphne` (not gunicorn/uwsgi)

### Components Not Imported

**Problem:** `Unknown function: my_function`

**Solutions:**
1. Check `liveview_components/__init__.py` exists
2. Verify the component file doesn't start with underscore
3. Restart the server
4. Check server console for import errors

### Room Not Defined

**Problem:** WebSocket URL contains `/ws/liveview/None/`

**Solution:** Ensure `data-room` attribute is set on `<html>` tag in your base template

## Next Steps

- Read the [full documentation](../README.md)
- Learn about [advanced features](ADVANCED.md)
- Check out [examples](../examples/)
- Explore [best practices](BEST_PRACTICES.md)

## Need Help?

- GitHub Issues: https://github.com/tanrax/django-liveview/issues
- Documentation: https://github.com/tanrax/django-liveview
