from threading import Thread
from asgiref.sync import async_to_sync
import time
from django.template.loader import render_to_string
from .context_processors import get_global_context
from asgiref.sync import sync_to_async
from django.utils.translation import activate as translation_activate
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from uuid import uuid4
import base64
from django.core.files import File
from tempfile import NamedTemporaryFile


async def get_html(template, context={}):
    """Get html from template."""
    return await sync_to_async(render_to_string)(template, context)


def set_language(language="en"):
    """Set the language."""
    if language:
        translation_activate(language)


def enable_lang(func):
    """Decorator: Enable language"""

    def wrapper(*args, **kwargs):
        lang = args[1]["data"].get("lang", settings.LANGUAGE_CODE)
        set_language(lang)
        kwargs["lang"] = lang
        return func(*args, **kwargs)

    return wrapper


async def toggle_loading(consumer, show=False):
    """Toogle the footer form."""
    # html = await get_html(template, get_global_context(consumer=consumer))
    data = {
        "action": ("Show" if show else "Hide") + " loading",
        "selector": "#loading",
        "html": render_to_string(
            "components/_loading.html", get_global_context(consumer=consumer)
        )
        if show
        else "",
    }
    await consumer.send_html(data)


def loading(func):
    """Decorator: Show loading."""

    async def wrapper(*args, **kwargs):
        await toggle_loading(args[0], True)
        result = await func(*args, **kwargs)
        await toggle_loading(args[0], False)
        return result

    return wrapper


async def update_active_nav(consumer, page):
    """Update the active nav item in the navbar."""
    context = get_global_context(consumer=consumer)
    context["active_nav"] = page
    data = {
        "action": "Update active nav",
        "selector": "#content-header",
        "html": render_to_string("components/_header.html", context),
    }
    await consumer.send_html(data)


def send_email(
    subject="", to=[], template_txt="", template_html="", data={}, attachments=[]
):
    """Send email"""
    msg = EmailMultiAlternatives(
        subject,
        render_to_string(template_txt, data | {"settings": settings}),
        settings.DEFAULT_FROM_EMAIL,
        to,
    )
    msg.attach_alternative(
        render_to_string(template_html, data | {"settings": settings}), "text/html"
    )
    for attachment in attachments:
        msg.attach_file(attachment)
    return msg.send()


async def send_notification(consumer: object, message: str, level: str = "info"):
    """Send notification."""
    # Variables
    uuid = str(uuid4())
    timeout = 3000  # ms

    async def make_notification(consumer=None, uuid="", level="", message=""):
        # Show message
        context = get_global_context(consumer=consumer)
        context.update({"id": uuid, "message": message, "level": level})
        html = await get_html("components/_notification.html", context)
        data = {
            "action": "new_notification",
            "selector": "#notifications",
            "html": html,
            "append": True,
        }
        await consumer.send_html(data)

    # Remove message async
    def remove_notification(consumer=None, uuid="", timeout=0):
        time.sleep(timeout / 1000)
        data = {
            "action": "delete_notification",
            "selector": f"#notifications > #notifications__item-{uuid}",
            "html": "",
        }
        async_to_sync(consumer.send_html)(data)

    # Tasks
    await make_notification(consumer, uuid, level, message)
    # Run in background the remove notification, sleep 3 seconds
    Thread(target=remove_notification, args=(consumer, uuid, timeout)).start()


def get_image_from_base64(base64_string: str, mime_type: str, is_file: bool = True):
    """Get image from base64 string.
    Args:
    base64_string (str): Base64 string.
    mime_type (str): Mime type. Example: image/jpeg.
    is_file (bool): Return a file or bytes.

    Returns:
    File or bytes: Image.
    str: Filename.
    """
    if mime_type in (
        "image/jpeg",
        "image/png",
        "image/webp",
    ):
        # Variables
        uuid = str(uuid4())
        extension = mime_type.split("/")[-1]
        # Str base64 to bytes
        base64_img_bytes = base64_string.encode("utf-8")
        decoded_image_data = base64.decodebytes(base64_img_bytes)
        my_filename = f"{uuid}.{extension}"
        if is_file:
            # Bytes to file
            img_temp = NamedTemporaryFile(delete=True)
            img_temp.write(decoded_image_data)
            img_temp.flush()
            return File(img_temp), my_filename
        else:
            return decoded_image_data, my_filename
    return None, None
