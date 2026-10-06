"""Browser tests for the back/forward navigation history."""

import re

from playwright.sync_api import Page, expect

TITLES = {
    "home": "Home | LiveView Test",
    "about": "About | LiveView Test",
    "contact": "Contact | LiveView Test",
    "products": "Products | LiveView Test",
    "blog": "Blog | LiveView Test",
}

URLS = {
    "home": "/",
    "about": "/about/",
    "contact": "/contact/",
    "products": "/products/",
    "blog": "/blog/",
}


def navigate(page: Page, name):
    """Navigate through LiveView (WebSocket), not with a full page load."""
    page.click(f"#nav-{name}")
    expect(page).to_have_title(TITLES[name])


def expect_page(page: Page, name):
    expect(page).to_have_title(TITLES[name])
    expect(page).to_have_url(re.compile(f"{re.escape(URLS[name])}$"))
    expect(page.locator("#page-title")).to_have_text(name.capitalize())


def test_navigation_updates_url_title_and_content(open_page):
    # Given
    page = open_page("/")

    # When
    navigate(page, "about")

    # Then
    expect_page(page, "about")


def test_navigation_does_not_reload_the_page(open_page):
    # Given
    page = open_page("/")
    page.evaluate("window.loadMarker = true")

    # When
    navigate(page, "about")
    page.go_back()

    # Then
    expect_page(page, "home")
    assert page.evaluate("window.loadMarker") is True


def test_back_and_forward_restore_pages(open_page):
    # Given
    page = open_page("/")
    navigate(page, "about")

    # When / Then
    page.go_back()
    expect_page(page, "home")
    page.go_forward()
    expect_page(page, "about")


def test_multi_step_jump(open_page):
    # Given
    page = open_page("/")
    for name in ["about", "contact", "products"]:
        navigate(page, name)

    # When
    page.evaluate("history.go(-3)")

    # Then
    expect_page(page, "home")


def test_zigzag_navigation(open_page):
    # Given
    page = open_page("/")
    navigate(page, "about")
    navigate(page, "contact")

    # When / Then
    page.go_back()
    expect_page(page, "about")
    page.go_forward()
    expect_page(page, "contact")
    page.go_back()
    expect_page(page, "about")
    page.go_back()
    expect_page(page, "home")


def test_branching_discards_forward_entries(open_page):
    # Given
    page = open_page("/")
    navigate(page, "about")
    navigate(page, "contact")
    page.go_back()
    expect_page(page, "about")

    # When
    navigate(page, "products")

    # Then
    page.go_forward()
    expect_page(page, "products")
    page.go_back()
    expect_page(page, "about")
    page.go_back()
    expect_page(page, "home")


def test_counter_is_restored_as_left(open_page):
    # Given
    page = open_page("/")
    for value in ["1", "2", "3"]:
        page.click("#counter-button")
        expect(page.locator("#counter-value")).to_have_text(value)
    navigate(page, "about")

    # When
    page.go_back()

    # Then
    expect_page(page, "home")
    expect(page.locator("#counter-value")).to_have_text("3")


def test_restored_elements_are_interactive(open_page):
    # Given
    page = open_page("/")
    page.click("#counter-button")
    expect(page.locator("#counter-value")).to_have_text("1")
    navigate(page, "about")
    page.go_back()
    expect(page.locator("#counter-value")).to_have_text("1")

    # When
    page.click("#counter-button")

    # Then
    expect(page.locator("#counter-value")).to_have_text("2")


def test_removed_item_stays_removed(open_page):
    # Given
    page = open_page("/products/")
    page.click("#remove-2")
    expect(page.locator("#item-2")).to_have_count(0)
    navigate(page, "about")

    # When
    page.go_back()

    # Then
    expect_page(page, "products")
    expect(page.locator("#product-list li")).to_have_count(2)
    expect(page.locator("#item-2")).to_have_count(0)


def test_appended_posts_are_restored(open_page):
    # Given
    page = open_page("/blog/")
    page.click("#add-post")
    expect(page.locator(".post")).to_have_count(2)
    page.click("#add-post")
    expect(page.locator(".post")).to_have_count(3)
    navigate(page, "contact")

    # When
    page.go_back()
    page.click("#add-post")

    # Then
    expect(page.locator(".post")).to_have_count(4)
    expect(page.locator(".post").last).to_have_text("Post 4")


def test_going_back_to_initial_page_restores_original_content(open_page):
    # Given
    page = open_page("/products/")
    navigate(page, "home")
    page.click("#counter-button")
    expect(page.locator("#counter-value")).to_have_text("1")

    # When
    page.go_back()

    # Then
    expect_page(page, "products")
    expect(page.locator("#product-list li")).to_have_count(3)


def test_restore_dispatches_history_restored_event(open_page):
    # Given
    page = open_page("/")
    page.evaluate(
        """() => {
            window.restoredEvents = [];
            document.addEventListener("liveview:history-restored", (event) => {
                window.restoredEvents.push(event.detail);
            });
        }"""
    )
    navigate(page, "about")

    # When
    page.go_back()
    expect_page(page, "home")

    # Then
    events = page.evaluate("window.restoredEvents")
    assert len(events) == 1
    assert events[0]["index"] == 0
    assert events[0]["url"].endswith("/")


def test_back_after_reload_restores_previous_page(open_page, reload_page):
    # Given
    page = open_page("/")
    page.click("#counter-button")
    expect(page.locator("#counter-value")).to_have_text("1")
    navigate(page, "about")
    reload_page()

    # When
    page.go_back()

    # Then
    expect_page(page, "home")
    expect(page.locator("#counter-value")).to_have_text("1")


def test_lost_journal_falls_back_to_full_reload(open_page, reload_page):
    # Given
    page = open_page("/")
    navigate(page, "about")
    page.evaluate("sessionStorage.clear()")
    reload_page()

    # When
    page.go_back()

    # Then
    expect_page(page, "home")
    expect(page.locator("#counter-value")).to_have_text("0")
