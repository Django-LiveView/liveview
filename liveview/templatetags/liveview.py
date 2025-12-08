"""
Django LiveView template tags.

Usage:
    {% load liveview %}
    <html data-room="{% liveview_room_uuid %}">
"""

from django import template
from uuid import uuid4

register = template.Library()


@register.simple_tag
def liveview_room_uuid():
    """
    Generate a random UUID for data-room attribute.

    Returns a hexadecimal UUID (without hyphens) suitable for use as a
    WebSocket room identifier. This ensures each page load gets a unique
    room ID, preventing room enumeration attacks.

    Example:
        {% load liveview %}
        <html lang="en" data-room="{% liveview_room_uuid %}">

    Returns:
        str: A random hexadecimal UUID (e.g., "a1b2c3d4e5f6...")
    """
    return uuid4().hex
