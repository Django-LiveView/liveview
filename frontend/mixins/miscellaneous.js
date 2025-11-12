/**
 * Gets the current language attribute from the HTML document
 * @returns {string|null} The language code from the html lang attribute
 */
export function getLang() {
  return document.querySelector('html').getAttribute("lang");
}

/**
 * Converts a File object to a Base64 Data URL
 * @param {File} file - The file to encode
 * @returns {Promise<string|null>} Promise that resolves to Base64 Data URL or null if no file
 */
export async function encodeFileAsBase64URL(file) {
    if (file) {
	return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('loadend', () => {
		resolve(reader.result);
            });
            reader.readAsDataURL(file);
	});
    }
    return null;
}

/**
 * Scrolls the window to the top of the page
 * @private
 */
function scrollToTop () {
    window.scrollTo({
        top: 0
    });
}

/**
 * Renders HTML content dynamically into a target element
 * Handles script extraction and execution, URL updates, and scroll management
 * @param {Object} data - Configuration object
 * @param {string} data.target - CSS selector for the target element
 * @param {string} [data.html] - HTML content to render
 * @param {boolean} [data.remove] - If true, removes the target element
 * @param {boolean} [data.append] - If true, appends content; if false, replaces content
 * @param {string} [data.scroll] - CSS selector for element to scroll to
 * @param {string} [data.url] - URL to update in browser history
 * @param {string} [data.title] - New page title to set
 */
export const renderHTML = (data) => {
  const targetHTML = document.querySelector(data.target);
  if (targetHTML) {
    // Remove the content of the target
    if (data.remove) {
        targetHTML.remove();
    } else {
        const reScript = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
        const htmlText = data.html.replace(reScript, '');
        if (data.append) {
            // Add the content to the target
            targetHTML.insertAdjacentHTML("beforeend", htmlText);
        } else {
            // Replace the content of the target
            targetHTML.innerHTML = htmlText;
        }
        // Add JS to the target
        for (const match of data.html.matchAll(reScript)) {
            const script = document.createElement('script');
            script.textContent = match[1];
            targetHTML.insertAdjacentElement("beforeend", script);
        }
        // If it is a new page or is backward, the scroll returns to the beginning
        if ( data.html && !data.scroll && data.url) {
          setTimeout(() => { scrollToTop() }, 50);
        }
    }
  } else {
    console.error(`Target ${data.target} not found`);
    return;
  }
    // Update URL
    if (data.url) history.pushState({}, "", data.url);
    // Update title
    if (data.title) document.title = data.title;
}

/**
 * Smoothly scrolls to a specific element on the page
 * @param {Object} data - Configuration object
 * @param {string} data.scroll - CSS selector of the element to scroll to
 */
export function moveScrollToAnchor(data) {
  if (data.scroll) {
    setTimeout(() => {
      document.querySelector(data.scroll).scrollIntoView({ behavior: "smooth" });
    }, 50)
  }
}

/**
 * Smoothly scrolls to the top of the page
 * @param {Object} data - Configuration object
 * @param {boolean} data.scrollTop - If true, executes the scroll to top
 */
export function moveScrollToTop(data) {
  if (data.scrollTop) {
    setTimeout(() => {
      document.querySelector("body").scrollIntoView({ behavior: "smooth" });
    }, 50)
  }
}
