"""Tests for the LiveView handler registry and decorator."""

import pytest

from liveview import liveview_handler, liveview_registry


def test_register_stores_handler_by_name(registry, consumer):
    # Given
    @registry.register("greet")
    def greet(consumer, content):
        return f"hello {content['name']}"

    # When
    handler = registry.get_handler("greet")

    # Then
    assert handler is not None
    assert handler(consumer, {"name": "Ada"}) == "hello Ada"


def test_register_preserves_function_metadata(registry):
    # Given
    def greet(consumer, content):
        """Greets the user."""

    # When
    decorated = registry.register("greet")(greet)

    # Then
    assert decorated.__name__ == "greet"
    assert decorated.__doc__ == "Greets the user."


def test_register_forwards_extra_arguments(registry, consumer):
    # Given
    @registry.register("echo")
    def echo(consumer, content, *args, **kwargs):
        return args, kwargs

    # When
    result = echo(consumer, {}, 1, 2, flag=True)

    # Then
    assert result == ((1, 2), {"flag": True})


def test_get_handler_returns_none_for_unknown_function(registry):
    # Given
    function_name = "does_not_exist"

    # When
    handler = registry.get_handler(function_name)

    # Then
    assert handler is None


def test_list_functions_returns_registered_names(registry):
    # Given
    registry.register("first")(lambda consumer, content: None)
    registry.register("second")(lambda consumer, content: None)

    # When
    names = registry.list_functions()

    # Then
    assert names == ["first", "second"]


def test_get_all_handlers_returns_a_copy(registry):
    # Given
    registry.register("first")(lambda consumer, content: None)

    # When
    handlers = registry.get_all_handlers()
    handlers.clear()

    # Then
    assert registry.list_functions() == ["first"]


def test_unregister_removes_and_returns_handler(registry):
    # Given
    registry.register("first")(lambda consumer, content: None)

    # When
    removed = registry.unregister("first")

    # Then
    assert removed is not None
    assert registry.get_handler("first") is None


def test_unregister_unknown_function_returns_none(registry):
    # Given
    function_name = "does_not_exist"

    # When
    removed = registry.unregister(function_name)

    # Then
    assert removed is None


def test_clear_removes_all_handlers(registry):
    # Given
    registry.register("first")(lambda consumer, content: None)
    registry.register("second")(lambda consumer, content: None)

    # When
    registry.clear()

    # Then
    assert registry.list_functions() == []


def test_middleware_receives_consumer_content_and_function_name(registry, consumer):
    # Given
    calls = []
    registry.add_middleware(lambda *args: calls.append(args))
    handler = registry.register("greet")(lambda consumer, content: "done")
    content = {"function": "greet"}

    # When
    result = handler(consumer, content)

    # Then
    assert result == "done"
    assert calls == [(consumer, content, "greet")]


def test_middleware_returning_false_cancels_handler(registry, consumer):
    # Given
    executed = []
    registry.add_middleware(lambda consumer, content, function_name: False)
    handler = registry.register("greet")(
        lambda consumer, content: executed.append(True)
    )

    # When
    result = handler(consumer, {})

    # Then
    assert result is None
    assert executed == []


@pytest.mark.parametrize("middleware_result", [None, True, 0, ""])
def test_middleware_only_cancels_on_false(registry, consumer, middleware_result):
    # Given
    registry.add_middleware(lambda consumer, content, function_name: middleware_result)
    handler = registry.register("greet")(lambda consumer, content: "done")

    # When
    result = handler(consumer, {})

    # Then
    assert result == "done"


def test_handler_error_is_sent_to_client_and_reraised(registry, consumer):
    # Given
    @registry.register("broken")
    def broken(consumer, content):
        raise RuntimeError("boom")

    # When
    with pytest.raises(RuntimeError, match="boom"):
        broken(consumer, {})

    # Then
    assert consumer.sent == [{"error": "Handler error: boom", "function": "broken"}]


def test_liveview_handler_registers_in_global_registry():
    # Given
    @liveview_handler("global_test_handler")
    def global_test_handler(consumer, content):
        pass

    # When
    handler = liveview_registry.get_handler("global_test_handler")

    # Then
    assert handler is global_test_handler
