"""
Modular decorator system for handling LiveView handlers.
"""

import logging
from typing import Dict, Callable
from functools import wraps
from liveview.connections import send

logger = logging.getLogger(__name__)


class LiveviewHandlerRegistry:
    """Registry for managing LiveView handlers."""

    def __init__(self):
        self._handlers: Dict[str, Callable] = {}
        self._middleware: list = []

    def register(self, function_name: str):
        """Decorator to register LiveView handlers."""

        def decorator(func: Callable):
            @wraps(func)
            def wrapper(consumer, content, *args, **kwargs):
                # Apply middleware before handler
                for middleware in self._middleware:
                    result = middleware(consumer, content, function_name)
                    if result is False:  # Middleware can cancel execution
                        return

                try:
                    return func(consumer, content, *args, **kwargs)
                except Exception as e:
                    logger.error(f"Error in handler '{function_name}': {e}")
                    send(
                        consumer,
                        {
                            "error": f"Handler error: {str(e)}",
                            "function": function_name,
                        },
                    )
                    raise

            self._handlers[function_name] = wrapper
            logger.debug(f"Registered LiveView handler: {function_name}")
            return wrapper

        return decorator

    def get_handler(self, function_name: str) -> Callable:
        """Get a handler by name."""
        return self._handlers.get(function_name)

    def get_all_handlers(self) -> Dict[str, Callable]:
        """Return all registered handlers."""
        return self._handlers.copy()

    def list_functions(self) -> list:
        """List all registered functions."""
        return list(self._handlers.keys())

    def add_middleware(self, middleware_func: Callable):
        """Add middleware that runs before each handler."""
        self._middleware.append(middleware_func)

    def unregister(self, function_name: str):
        """Unregister a handler."""
        return self._handlers.pop(function_name, None)

    def clear(self):
        """Clear all registered handlers."""
        self._handlers.clear()


# Global registry instance
liveview_registry = LiveviewHandlerRegistry()


# Main decorator
def liveview_handler(function_name: str):
    """
    Decorator to register LiveView handlers.

    Usage:
        @liveview_handler("my_function")
        def my_function(consumer, content):
            # Your logic here
            pass
    """
    return liveview_registry.register(function_name)
