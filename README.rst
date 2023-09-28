=====
Django LiveView
=====

Framework for creating a complete HTML over the Wire site or LiveView
########

.. image:: https://github.com/Django-LiveView/starter-template/raw/main/brand_assets/github%20social%20preview.jpg
  :width: 100%
  :alt: Alternative text

Among its superpowers you can find
**********************

- Create SPAs without using APIs.
- Uses Django's template system to render the frontend (Without JavaScript).
- The logic is not split between the backend and the frontend, it all stays in Python.
- You can still use all of Django's native tools, such as its ORM, forms, plugins, etc.
- Everything is asynchronous by default.
- Don't learn anything new. If you know Python, you know how to use Django LiveView.
- All in real time.

System components communicate through realtime events, where events represent important actions. Every components can produce and consume actions, allowing asynchronous and decoupled communication.

LiveView is a Django application for creating a dynamic website using HTML over WebSockets.

Example template: https://github.com/Django-LiveView/starter-template

Quick start
-----------

1. Add "liveview", "daphne" and "channels" to your INSTALLED_APPS setting like this::

    INSTALLED_APPS = [
        "daphne",
        "channels",
        "django_liveview",
        ...,
    ]

2. Include, in settings.py, the Apps that will use LiveView::

     LIVEVIEW_APPS = ["website"]

3. Run ``python manage.py migrate`` to create the LiveView models.

4. Start the development server and visit http://127.0.0.1:8000/
