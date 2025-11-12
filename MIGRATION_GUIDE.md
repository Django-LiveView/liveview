# Migration Guide

This guide explains how to migrate an existing project using the old local `liveview` module to the new `django-liveview` package.

## Overview of Changes

The local `liveview/` Django app has been packaged as `django-liveview`, a distributable Python package that can be installed via pip.

**Key changes:**
- Module name: `liveview` → `django_liveview`
- Installable via pip
- JavaScript assets bundled in the package
- Simplified routing configuration

---

## Step-by-Step Migration

### 1. Install the Package

Add to your `requirements.txt`:

```txt
# Local development
-e /path/to/django-liveview

# Or from git
# -e git+https://github.com/tanrax/django-liveview.git#egg=django-liveview

# Or from PyPI (when published)
# django-liveview==0.1.0
```

Then install:

```bash
pip install -r requirements.txt
```

### 2. Update INSTALLED_APPS

**Before:**
```python
# settings.py
INSTALLED_APPS = [
    "daphne",
    "channels",
    "liveview",  # Old local app
    # ...
]
```

**After:**
```python
# settings.py
INSTALLED_APPS = [
    "daphne",
    "channels",
    "django_liveview",  # New package
    # ...
]
```

### 3. Update ASGI Routing

**Before:**
```python
# asgi.py
from django.urls import path
from liveview.consumers import LiveViewConsumer

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        AllowedHostsOriginValidator(
            URLRouter([
                path("ws/liveview/<str:room_name>/", LiveViewConsumer.as_asgi()),
            ])
        )
    ),
})
```

**After:**
```python
# asgi.py
from django_liveview.routing import get_liveview_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        AllowedHostsOriginValidator(
            URLRouter(
                get_liveview_urlpatterns()  # Simplified!
            )
        )
    ),
})
```

### 4. Update Imports in Components

Update all `liveview_components/*.py` files:

**Before:**
```python
from liveview.decorators import liveview_handler
from liveview.connections import send
```

**After:**
```python
from django_liveview.decorators import liveview_handler
from django_liveview.connections import send
```

**Quick fix with sed:**
```bash
find . -name "*.py" -type f -exec sed -i 's/from liveview\./from django_liveview./g' {} \;
```

### 5. Update Templates

**Before:**
```html
{% load django_vite %}
<script type="module" src="{% vite_asset_url 'js/liveview/main.js' %}" defer></script>
```

**After:**
```html
{% load static %}
<script src="{% static 'django_liveview/liveview.min.js' %}" defer></script>
```

### 6. Remove Old Code

Once everything works:

1. **Remove** the local `liveview/` directory
2. **Remove** `assets/js/liveview/` directory (JavaScript source)
3. **Keep** `app/*/liveview_components/` directories (your components)

---

## Verification Checklist

After migration, verify:

- [ ] Server starts without errors
- [ ] Browser console shows: `Connected to WebSockets server`
- [ ] Server console shows: `✓ Imported: app.module.liveview_components.component`
- [ ] LiveView handlers work correctly
- [ ] WebSocket reconnection works
- [ ] Intersection observers function
- [ ] Auto-focus works
- [ ] Broadcasting works (if used)

---

## Troubleshooting

### Import Errors

**Error:** `ModuleNotFoundError: No module named 'liveview'`

**Solution:** You missed updating some imports. Search for remaining old imports:

```bash
grep -r "from liveview\." app/
```

### JavaScript Not Loading

**Error:** `Failed to load resource: the server responded with a status of 404`

**Solution:**
1. Verify `django_liveview` is in `INSTALLED_APPS`
2. Run `python manage.py collectstatic` if in production
3. Check browser DevTools → Network tab for the actual request

### WebSocket Connection Failed

**Error:** `WebSocket connection to 'ws://...' failed`

**Solution:**
1. Verify routing configuration in `asgi.py`
2. Check Redis is running: `redis-cli ping`
3. Restart the server

### Components Not Found

**Error:** `Unknown function: my_handler`

**Solution:**
1. Check component file is imported correctly (server console)
2. Verify decorator name matches: `@liveview_handler("my_handler")`
3. Restart server to reload components

---

## Rollback Plan

If you need to rollback:

1. Restore `INSTALLED_APPS`: `"django_liveview"` → `"liveview"`
2. Restore imports: `from django_liveview.` → `from liveview.`
3. Restore `asgi.py` routing
4. Restore template JavaScript includes
5. Uninstall package: `pip uninstall django-liveview`

---

## Benefits of Migration

✅ **Distributable** - Share across multiple projects
✅ **Versioned** - Track releases and updates
✅ **Isolated** - Package dependencies are explicit
✅ **Maintainable** - Easier to update and test
✅ **Professional** - PyPI distribution ready
✅ **Documented** - Comprehensive docs and examples

---

## Need Help?

- Check [README.md](README.md) for full documentation
- See [QUICKSTART.md](docs/QUICKSTART.md) for setup guide
- Report issues: https://github.com/tanrax/django-liveview/issues
