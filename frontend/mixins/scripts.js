// Inline scripts that LiveView executes (same rule as the browser: classic
// scripts only, not JSON, templates or modules)
export const SCRIPT_SELECTOR = 'script:not([type]), script[type="text/javascript"]';

/**
 * Execute scripts with the given element as local context.
 * 'el' and 'this' inside the script refer to the element.
 * @param {Element} element - Element bound to 'el' and 'this'
 * @param {Array<string>} sources - Source code of each script, in order
 * @return {void}
 */
export function runScripts(element, sources) {
  for (const source of sources) {
    try {
      const fn = new Function('el', source);
      fn.call(element, element);
    } catch (e) {
      console.error('LiveView script error:', e);
    }
  }
}
