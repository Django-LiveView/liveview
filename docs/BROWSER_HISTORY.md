# Browser History

When a handler sends a `url` key, Django LiveView records the state of the page before applying the update. The browser back and forward buttons then restore each page as it was left, without asking the server.

No configuration is required.

```python
@liveview_handler("navigate_to_profile")
def navigate_to_profile(consumer, content):
    user = User.objects.get(id=content["data"]["user_id"])
    send(
        consumer,
        {
            "target": "#main-content",
            "html": render_to_string("profile_page.html", {"user": user}),
            "url": f"/profile/{user.username}/",
            "title": f"{user.name} - Profile",
        },
    )
```

The URL must also work on a full page load (a Django view rendering the same page): it is what the browser loads after a reload, when a link is shared, or when a history entry has no snapshot.

## How It Works

Before any region is updated (`html`, `append` or `remove`), its current state is recorded. Each `send()` with a `url` creates a history entry:

1. Every region ever updated is saved in the entry being left (snapshot), including the values typed in form fields.
2. A new history entry is pushed with an internal index, so the module knows which entry the browser moves to, even on multi-step jumps.
3. The new HTML is applied.

When the user presses Back or Forward:

1. The state of the entry being left is saved, so coming back to it restores it as it was left.
2. Every recorded region is restored, after calling the `el.__cleanup()` of its current content.
3. The page title, the `<html lang>` attribute and the scroll position are restored.
4. The inline scripts of the restored regions run again.
5. The `liveview:history-restored` event is dispatched on `document`.

Updates without `url` (a counter, an appended list) do not create entries, but their state is part of the entry: going back to a page shows the counter with the value it had when you left it.

## Inline Scripts

Restoring a region runs its inline `<script>` tags again, the same way they ran when the HTML arrived: once each, with `el` and `this` bound to the region. Scripts of a region nested in another restored region run only once, bound to the innermost one.

That is what keeps a page working after Back or Forward without extra code:

- State outside the region set by its scripts (a class on `<body>`, the active link of a menu) matches the restored page.
- Event listeners added by its scripts are attached again to the restored elements.

The restored HTML is the HTML as it was left, after the scripts modified it. Scripts must therefore be safe to run again on their own output. Most are: highlighting code (Prism), rendering diagrams (Mermaid skips the ones already rendered), toggling classes, binding listeners to the elements of the region. Two things to watch:

- A script that adds elements to the region adds them again. Check before adding, or keep the elements in the template.
- A listener added to `document` or `window` is added again on every render and every restore. Remove it in `el.__cleanup`, or use a flag.

For a script that must only run when the content arrives, never on Back or Forward, add `data-liveview-replay="false"`:

```html
<script data-liveview-replay="false">
    showConfetti();
</script>
```

## Live Widgets: `data-liveview-permanent`

Every region a handler updates is part of the history, even when it has nothing to do with navigation. A live widget (a visitor counter, a chat, a notifications area) would be rolled back to the value it had in that entry. Mark it as permanent:

```html
<section id="notifications" data-liveview-permanent></section>
<section id="visitors" data-liveview-permanent data-liveview-init="load_visitors"></section>
```

The history never snapshots nor restores a permanent element, or anything inside it, so it always shows its live state. Its scripts are not run again either.

If a permanent element with an `id` lives inside a restored region (for example, a player present on every page), the live node is kept in place of its old copy.

## Form Fields

Text inputs, checkboxes, radio buttons, selects and textareas are restored with the values the user left: a search box keeps its query, a half-written comment keeps its text. Password and file fields are never stored.

## Storage

Snapshots are stored in `sessionStorage`:

- They survive a page reload.
- Each tab has its own history.
- They are deleted when the tab is closed.

Up to 50 entries keep a snapshot; older ones are pruned. If the storage quota is exceeded, the oldest snapshots are dropped and, if that is not enough, the module keeps working in memory only (snapshots are lost on reload, back and forward still work in the tab).

## The `liveview:history-restored` Event

```javascript
document.addEventListener("liveview:history-restored", (event) => {
    const { url, index } = event.detail;
    initMyComponent();
});
```

Use it for setup that does not belong to the inline scripts of a region, for example a component of the layout that depends on the current URL.

## Edge Cases

- **Multi-step jumps**: `history.go(-3)` or a long press on Back restores the right entry.
- **Zigzag navigation**: Back, Forward and Back again restore each entry as it was left.
- **Branching**: navigating after going back discards the forward entries, like native browser history.
- **Missing snapshots**: when an entry has no snapshot (pruned, or older than a cleared `sessionStorage`), the page is reloaded from the server.
- **Removed elements**: with `remove`, the parent is recorded instead, so the element comes back when going back.
- **Reload**: after a reload, the current page comes from the server and the other entries keep their snapshots.
- **Infinite scroll**: elements with `data-liveview-intersect-*` are observed again after a restore. If the restored sentinel is in the viewport, it loads the next page.
- **`data-liveview-init`**: it is not called again on restore.
