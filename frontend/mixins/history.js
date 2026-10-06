/*
   LiveView navigation history.

   The server drives navigation by sending HTML fragments together with a new
   URL. Before any DOM region is overwritten or removed, its previous state is
   recorded here, so pressing the browser back/forward buttons can replay the
   exact inverse (or direct) process and restore the page as it was.

   Storage: sessionStorage. Browser history is per-tab, and so is
   sessionStorage; it is synchronous (snapshots must be taken right before the
   DOM is mutated and restored synchronously on popstate) and it is cleared
   automatically when the tab closes, while still surviving page reloads.
   If the quota is exceeded, the module degrades gracefully to memory-only.

   Data model:
     state = {
       index: number,            // current position in the history stack
       entries: [                // one entry per URL change (ordered)
         {
           url: string,
           title: string,        // document title when the entry was left
           lang: string,         // <html lang> when the entry was left
           scrollX: number,
           scrollY: number,
           regions: {            // snapshot of every touched region (innerHTML)
             "<selector>": "<html>"
           }
         }
       ],
       touched: [string],        // cumulative list of region selectors ever mutated
       baselines: {              // state of a region BEFORE its first ever mutation,
         "<selector>": {         // used to restore entries older than that mutation
           index: number,        // entry index when the first mutation happened
           html: string
         }
       }
     }

   Each history.pushState carries { liveviewIndex } so popstate knows the
   target entry even when the user jumps several steps at once.
 */

const STORAGE_KEY = "liveview-history";
const MAX_SNAPSHOT_ENTRIES = 50;

// Marker attributes added by the Stimulus page controller. They must be
// stripped from snapshots so restored elements are re-initialized.
const INTERNAL_ATTRIBUTES = [
  "data-intersection-observed",
  "data-intersection-threshold-used",
  "data-keyboard-map-initialized"
];

let state = null;
let memoryOnly = false;

/*
   Persistence
 */

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("LiveView history: could not read sessionStorage:", error);
    return null;
  }
}

function saveState() {
  if (memoryOnly || !state) {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Quota exceeded: drop the oldest snapshots (keeping the slots so
    // indexes stay valid) and retry once before going memory-only.
    pruneOldSnapshots(Math.floor(MAX_SNAPSHOT_ENTRIES / 2));
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (retryError) {
      console.warn("LiveView history: storage quota exceeded, using memory only:", retryError);
      memoryOnly = true;
    }
  }
}

function pruneOldSnapshots(keep) {
  if (!state) {
    return;
  }
  const cutoff = state.entries.length - keep;
  state.entries.forEach((entry, index) => {
    // Never prune the current entry
    if (index < cutoff && index !== state.index && entry) {
      entry.regions = null;
    }
  });
}

/*
   Helpers
 */

function newEntry(url) {
  return {
    url: url,
    title: document.title,
    lang: document.documentElement.getAttribute("lang"),
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    regions: {}
  };
}

/**
 * Build an empty state whose current entry sits at the given index
 * @param {number} index - Position of the current entry in the history stack
 * @return {Object} New state
 */
function freshState(index = 0) {
  // Older entries are unknown (null): restoring them falls back to a reload
  const entries = new Array(index).fill(null);
  entries.push(newEntry(location.href));
  return {
    index: index,
    entries: entries,
    touched: [],
    baselines: {}
  };
}

/**
 * Get the innerHTML of an element with internal marker attributes removed
 * @param {Element} element - Element to snapshot
 * @return {string} Sanitized innerHTML
 */
function getRegionHTML(element) {
  const clone = element.cloneNode(true);
  INTERNAL_ATTRIBUTES.forEach(attribute => {
    clone.querySelectorAll(`[${attribute}]`).forEach(node => {
      node.removeAttribute(attribute);
    });
  });
  return clone.innerHTML;
}

/**
 * Build a stable CSS selector for an element (id based when possible)
 * @param {Element} element - Element to build the selector for
 * @return {string|null} CSS selector or null
 */
function getStableSelector(element) {
  if (!element || element === document.documentElement) {
    return "body";
  }
  if (element === document.body) {
    return "body";
  }
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }
  // Walk up until an ancestor with id (or body) and build an nth-child path
  const parts = [];
  let current = element;
  while (current && current !== document.body) {
    if (current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      return parts.join(" > ");
    }
    const parent = current.parentElement;
    if (!parent) {
      return null;
    }
    const position = Array.prototype.indexOf.call(parent.children, current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${position})`);
    current = parent;
  }
  parts.unshift("body");
  return parts.join(" > ");
}

/**
 * Snapshot every touched region plus metadata into the current entry.
 * Called right before leaving an entry (navigation or popstate), so the
 * snapshot reflects the page exactly as the user left it.
 * @return {void}
 */
function snapshotCurrentEntry() {
  if (!state) {
    return;
  }
  const entry = state.entries[state.index];
  if (!entry) {
    return;
  }
  // entry.url is NOT updated here: on popstate the browser has already
  // swapped location.href to the target entry, so it would be wrong.
  entry.title = document.title;
  entry.lang = document.documentElement.getAttribute("lang");
  entry.scrollX = window.scrollX;
  entry.scrollY = window.scrollY;
  entry.regions = {};
  state.touched.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      entry.regions[selector] = getRegionHTML(element);
    }
  });
}

/**
 * Restore the regions of a history entry into the live DOM.
 * Ancestor regions are applied before descendant ones, re-querying each
 * selector so replaced nodes are resolved again.
 * @param {Object} regions - Map of selector to innerHTML
 * @return {void}
 */
function restoreRegions(regions) {
  const items = Object.entries(regions)
    .map(([selector, html]) => ({ selector, html, element: document.querySelector(selector) }))
    .filter(item => item.element);

  // Ancestors first, so inner snapshots are applied to the fresh nodes
  items.sort((a, b) => {
    if (a.element.contains(b.element)) return -1;
    if (b.element.contains(a.element)) return 1;
    return 0;
  });

  items.forEach(item => {
    const element = document.querySelector(item.selector);
    if (element) {
      element.innerHTML = item.html;
    }
  });
}

/**
 * Restore a history entry: regions, title, lang and scroll position.
 * @param {Object} entry - History entry to restore
 * @param {number} index - Index of the entry in the stack
 * @return {void}
 */
function restoreEntry(entry, index) {
  // Build the effective region map. Regions touched for the first time
  // AFTER this entry was left fall back to their recorded baseline.
  const regions = Object.assign({}, entry.regions);
  state.touched.forEach(selector => {
    if (regions[selector] === undefined) {
      const baseline = state.baselines[selector];
      if (baseline && index < baseline.index) {
        regions[selector] = baseline.html;
      }
    }
  });

  restoreRegions(regions);

  if (entry.title != null) {
    document.title = entry.title;
  }
  if (entry.lang != null) {
    document.documentElement.setAttribute("lang", entry.lang);
  }
  setTimeout(() => {
    window.scrollTo(entry.scrollX || 0, entry.scrollY || 0);
  }, 50);

  document.dispatchEvent(new CustomEvent("liveview:history-restored", {
    detail: { url: entry.url, index: index }
  }));
}

/*
   Events
 */

function onPopState(event) {
  const targetIndex = event.state ? event.state.liveviewIndex : null;
  if (typeof targetIndex !== "number" || !state) {
    return;
  }
  if (targetIndex === state.index) {
    return;
  }
  const entry = state.entries[targetIndex];
  if (!entry || !entry.regions) {
    // Unknown or pruned entry: fall back to a full page load so the
    // server renders the URL the browser already moved to.
    console.warn("LiveView history: no snapshot for entry", targetIndex, "- reloading");
    location.reload();
    return;
  }
  // Capture the state of the entry we are leaving, so coming back to it
  // (in either direction) restores it exactly as it was left.
  snapshotCurrentEntry();
  state.index = targetIndex;
  restoreEntry(entry, targetIndex);
  saveState();
  console.debug("LiveView history: restored entry", targetIndex, entry.url);
}

/*
   Public API
 */

/**
 * Initialize the navigation history. Must be called once on page load.
 * @return {void}
 */
export function initHistory() {
  // Own the scroll position on back/forward (we restore it ourselves)
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const stored = loadState();
  const currentIndex = history.state ? history.state.liveviewIndex : null;

  if (stored && typeof currentIndex === "number" && stored.entries[currentIndex]) {
    // Resuming after a reload: the server re-rendered this page, so the
    // current entry's snapshot is stale. Refresh its metadata and keep the
    // rest of the stack for best-effort back/forward restores.
    state = stored;
    state.index = currentIndex;
    const entry = state.entries[currentIndex];
    entry.url = location.href;
    entry.title = document.title;
    entry.lang = document.documentElement.getAttribute("lang");
    entry.regions = {};
  } else {
    // If the browser entry already has an index, the stored journal was lost
    // (memory-only mode or cleared storage) but older entries still carry
    // their indexes: keep ours so going back to them is not mistaken for
    // the current entry.
    const index = typeof currentIndex === "number" ? currentIndex : 0;
    state = freshState(index);
    const historyState = Object.assign({}, history.state, { liveviewIndex: index });
    history.replaceState(historyState, "", location.href);
  }

  saveState();
  window.addEventListener("popstate", onPopState);
  console.debug("LiveView history: initialized at entry", state.index);
}

/**
 * Record a region BEFORE it is overwritten. The first time a region is ever
 * touched, its previous state is kept as a baseline so older history entries
 * can restore it.
 * @param {string} selector - CSS selector of the region (data.target)
 * @return {void}
 */
export function trackRegion(selector) {
  if (!state || !selector) {
    return;
  }
  if (state.touched.includes(selector)) {
    return;
  }
  const element = document.querySelector(selector);
  if (!element) {
    return;
  }
  state.touched.push(selector);
  state.baselines[selector] = {
    index: state.index,
    html: getRegionHTML(element)
  };
  saveState();
}

/**
 * Record a removal BEFORE the element is removed. The parent container is
 * tracked instead, so its snapshot captures the element's presence/absence.
 * @param {Element} element - Element about to be removed
 * @return {void}
 */
export function trackRemoval(element) {
  if (!state || !element || !element.parentElement) {
    return;
  }
  const selector = getStableSelector(element.parentElement);
  if (selector) {
    trackRegion(selector);
  }
}

/**
 * Register a navigation: snapshot the entry being left, drop any forward
 * entries (the user branched) and push the new URL with its index.
 * Must be called BEFORE the new content is applied to the DOM.
 * @param {string} url - New URL sent by the server
 * @return {void}
 */
export function pushNavigation(url) {
  if (!state) {
    history.pushState({}, "", url);
    return;
  }
  snapshotCurrentEntry();
  // Branching: navigating after going back discards the forward entries,
  // exactly like native browser history does.
  state.entries = state.entries.slice(0, state.index + 1);
  state.entries.push(newEntry(url));
  state.index += 1;
  if (state.entries.length > MAX_SNAPSHOT_ENTRIES) {
    pruneOldSnapshots(MAX_SNAPSHOT_ENTRIES);
  }
  history.pushState({ liveviewIndex: state.index }, "", url);
  state.entries[state.index].url = location.href;
  saveState();
}
