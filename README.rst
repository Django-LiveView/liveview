=====
Django LiveView
=====

LiveView is a Django application for creating a dynamic website using HTML over WebSockets.

Detailed documentation is in https://django-liveview.andros.dev

Quick start
-----------

1. Add "liveview", "daphne" and "channels" to your INSTALLED_APPS setting like this::

    INSTALLED_APPS = [
        "daphne",
        "channels",
        "liveview",
        ...,
    ]

2. Include, in settings.py, the Apps that will use LiveView::

     settings.LIVEVIEW_APPS = ["website"]

3. Run ``python manage.py migrate`` to create the LiveView models.

4. Start the development server and visit http://127.0.0.1:8000/
