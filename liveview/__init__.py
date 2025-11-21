"""
Django LiveView - Real-time server-rendered interfaces for Django.

A framework for building interactive, real-time web applications with Django
using WebSockets, inspired by Phoenix LiveView and Laravel Livewire.
"""

__version__ = "2.1.1"
__author__ = "Andros Fenollosa"
__license__ = "MIT"

from liveview.decorators import liveview_handler, liveview_registry
from liveview.connections import send

__all__ = [
    "liveview_handler",
    "liveview_registry",
    "send",
]
