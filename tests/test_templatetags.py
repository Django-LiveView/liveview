"""Tests for Django LiveView template tags."""

import re

from django.template import Context, Template

ROOM_UUID_TEMPLATE = "{% load liveview %}{% liveview_room_uuid %}"


def render(template_string):
    return Template(template_string).render(Context({}))


def test_liveview_room_uuid_generates_valid_hex_uuid():
    # Given
    template_string = ROOM_UUID_TEMPLATE

    # When
    rendered = render(template_string)

    # Then
    assert re.fullmatch(r"[0-9a-f]{32}", rendered)


def test_liveview_room_uuid_generates_unique_values():
    # Given
    renders = 100

    # When
    uuids = {render(ROOM_UUID_TEMPLATE) for _ in range(renders)}

    # Then
    assert len(uuids) == renders


def test_liveview_room_uuid_in_html_attribute():
    # Given
    template_string = '{% load liveview %}<html data-room="{% liveview_room_uuid %}">'

    # When
    rendered = render(template_string)

    # Then
    assert re.fullmatch(r'<html data-room="[0-9a-f]{32}">', rendered)
