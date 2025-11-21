import { Controller } from '@hotwired/stimulus'
import { sendData } from "../webSocketsCli.js";
import { getLang } from "../mixins/miscellaneous.js";

export default class extends Controller {

	connect() {
		// Initialize observers map to store different threshold observers
		this.intersectionObservers = new Map();
		// Initialize map to store debounce timers
		this.debounceTimers = new Map();

		// Find all elements with intersection attributes within the controller
		this.setupIntersectionObservers();
		// Setup mutation observer to detect dynamically added elements
		this.setupMutationObserver();
		// Setup focus for existing elements
		this.setupFocusForExistingElements();
		// Setup init functions for existing elements
		this.setupInitForExistingElements();
	}

	setupIntersectionObservers() {
		// Find elements with intersection attributes
		const intersectionElements = this.element.querySelectorAll(
			'[data-liveview-intersect-appear], [data-liveview-intersect-disappear]'
		);

		if (intersectionElements.length > 0) {
			// Group elements by their threshold values
			const elementsByThreshold = new Map();

			intersectionElements.forEach(element => {
				// Skip if already being observed
				if (element.hasAttribute('data-intersection-observed')) {
					return;
				}

				// Get threshold value (default to 0 if not specified)
				const threshold = element.dataset.liveviewIntersectThreshold || '0';

				if (!elementsByThreshold.has(threshold)) {
					elementsByThreshold.set(threshold, []);
				}
				elementsByThreshold.get(threshold).push(element);
			});

			// Create observers for each threshold group
			elementsByThreshold.forEach((elements, threshold) => {
				this.createObserverForThreshold(threshold, elements);
			});
		}
	}

	createObserverForThreshold(threshold, elements) {
		const thresholdValue = parseInt(threshold) || 0;

		// Create rootMargin string - negative values extend the root's bounding box
		// For "100px before entering viewport", we use negative margin
		const rootMargin = thresholdValue > 0 ? `${thresholdValue}px` : '0px';

		// Check if we already have an observer for this threshold
		if (!this.intersectionObservers.has(threshold)) {
			const observer = new IntersectionObserver(
				(entries) => this.handleIntersections(entries),
				{
					rootMargin: rootMargin,
					threshold: 0
				}
			);
			this.intersectionObservers.set(threshold, observer);
		}

		const observer = this.intersectionObservers.get(threshold);

		// Observe each element with this threshold
		elements.forEach(element => {
			observer.observe(element);
			element.setAttribute('data-intersection-observed', 'true');
			// Store the threshold value for reference
			element.setAttribute('data-intersection-threshold-used', threshold);
		});
	}

	setupFocusForExistingElements() {
		// Find elements that should have focus on load
		const focusElements = this.element.querySelectorAll('[data-liveview-focus="true"]');

		if (focusElements.length > 0) {
			// Focus the first element found (in case there are multiple)
			// Use setTimeout to ensure the element is fully rendered
			setTimeout(() => {
				const elementToFocus = focusElements[0];
				if (this.canReceiveFocus(elementToFocus)) {
					elementToFocus.focus();
					console.debug("Auto-focused element on load:", elementToFocus);
				}
			}, 0);
		}
	}

	setupInitForExistingElements() {
		// Find elements that should execute init functions on load
		const initElements = this.element.querySelectorAll('[data-liveview-init]');

		if (initElements.length > 0) {
			// Execute init function for each element found
			// Use setTimeout to ensure the element is fully rendered
			setTimeout(() => {
				initElements.forEach(element => {
					const initFunction = element.dataset.liveviewInit;
					if (initFunction) {
						console.debug("Executing init function for element:", element, "Function:", initFunction);
						this.executeInitFunction(element, initFunction);
					}
				});
			}, 0);
		}
	}

	executeInitFunction(element, functionName) {
		// Create synthetic event to reuse existing logic
		const syntheticEvent = {
			currentTarget: element,
			preventDefault: () => {} // Mock to avoid errors
		};

		// Temporarily set liveviewFunction for execution
		const originalFunction = element.dataset.liveviewFunction;
		element.dataset.liveviewFunction = functionName;

		// Add information about trigger type
		const originalTriggerType = element.dataset.initTrigger;
		element.dataset.initTrigger = 'init';

		// Execute using existing logic with specific element
		this.executeFunction(syntheticEvent, element);

		// Restore original values
		if (originalFunction) {
			element.dataset.liveviewFunction = originalFunction;
		} else {
			delete element.dataset.liveviewFunction;
		}

		if (originalTriggerType) {
			element.dataset.initTrigger = originalTriggerType;
		} else {
			delete element.dataset.initTrigger;
		}
	}

	setupMutationObserver() {
		// Create mutation observer to detect dynamically added elements
		this.mutationObserver = new MutationObserver((mutations) => {
			let hasNewIntersectionElements = false;
			let newFocusElements = [];

			mutations.forEach((mutation) => {
				if (mutation.type === 'childList') {
					// Check added nodes for intersection attributes
					mutation.addedNodes.forEach((node) => {
						if (node.nodeType === Node.ELEMENT_NODE) {
							// Check if the node itself has intersection attributes
							if (node.hasAttribute('data-liveview-intersect-appear') ||
								node.hasAttribute('data-liveview-intersect-disappear')) {
								hasNewIntersectionElements = true;
							}

							// Check if any descendants have intersection attributes
							const descendants = node.querySelectorAll ?
								node.querySelectorAll('[data-liveview-intersect-appear], [data-liveview-intersect-disappear]') :
								[];
							if (descendants.length > 0) {
								hasNewIntersectionElements = true;
							}

							// Check for focus attributes on the node itself
							if (node.hasAttribute && node.hasAttribute('data-liveview-focus') &&
								node.dataset.liveviewFocus === "true") {
								newFocusElements.push(node);
							}

							// Check for focus attributes in descendants
							const focusDescendants = node.querySelectorAll ?
								node.querySelectorAll('[data-liveview-focus="true"]') :
								[];
							newFocusElements.push(...focusDescendants);
						}
					});
				}
			});

			// If new intersection elements were found, set up observers for them
			if (hasNewIntersectionElements) {
				this.setupIntersectionObservers();
			}

			// Handle focus for new elements
			if (newFocusElements.length > 0) {
				this.handleNewFocusElements(newFocusElements);
			}
		});

		// Start observing mutations
		this.mutationObserver.observe(this.element, {
			childList: true,
			subtree: true
		});
	}

	handleNewFocusElements(elements) {
		// Focus the first focusable element found
		// Use setTimeout to ensure the element is fully rendered and positioned
		setTimeout(() => {
			for (const element of elements) {
				if (this.canReceiveFocus(element)) {
					element.focus();
					console.debug("Auto-focused new element:", element);
					break; // Only focus the first one
				}
			}
		}, 0);
	}

	canReceiveFocus(element) {
		// Check if element can receive focus
		const focusableElements = [
			'input', 'select', 'textarea', 'button', 'a'
		];

		const tagName = element.tagName.toLowerCase();

		// Check if it's a focusable element type
		if (focusableElements.includes(tagName)) {
			// Check if it's not disabled and visible
			return !element.disabled &&
				   !element.hidden &&
				   element.offsetWidth > 0 &&
				   element.offsetHeight > 0 &&
				   window.getComputedStyle(element).visibility !== 'hidden';
		}

		// Check if it has tabindex
		if (element.hasAttribute('tabindex')) {
			const tabindex = parseInt(element.getAttribute('tabindex'));
			return tabindex >= 0 &&
				   !element.hidden &&
				   element.offsetWidth > 0 &&
				   element.offsetHeight > 0 &&
				   window.getComputedStyle(element).visibility !== 'hidden';
		}

		return false;
	}

	handleIntersections(entries) {
		entries.forEach(entry => {
			const element = entry.target;
			const threshold = element.dataset.liveviewIntersectThreshold || '0';

			if (entry.isIntersecting) {
				// Element appeared
				const appearFunction = element.dataset.liveviewIntersectAppear;
				if (appearFunction) {
					console.debug(`Element appeared in viewport (threshold: ${threshold}px):`, element);
					this.executeLiveviewFunction(element, appearFunction, 'appear');
				}
			} else {
				// Element disappeared
				const disappearFunction = element.dataset.liveviewIntersectDisappear;
				if (disappearFunction) {
					console.debug(`Element disappeared from viewport (threshold: ${threshold}px):`, element);
					this.executeLiveviewFunction(element, disappearFunction, 'disappear');
				}
			}
		});
	}

	disconnect() {
		// Clean up all observers when controller disconnects
		this.intersectionObservers.forEach(observer => {
			observer.disconnect();
		});
		this.intersectionObservers.clear();

		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
		}

		// Clean up all debounce timers
		this.debounceTimers.forEach(timer => {
			clearTimeout(timer);
		});
		this.debounceTimers.clear();
	}

	// Helper method to execute intersection functions
	executeLiveviewFunction(element, functionName, triggerType) {
		// Create synthetic event to reuse existing logic
		const syntheticEvent = {
			currentTarget: element,
			preventDefault: () => {} // Mock to avoid errors
		};

		// Temporarily set liveviewFunction for execution
		const originalFunction = element.dataset.liveviewFunction;
		element.dataset.liveviewFunction = functionName;

		// Add information about trigger type
		const originalTriggerType = element.dataset.intersectionTrigger;
		element.dataset.intersectionTrigger = triggerType;

		// Execute using existing logic with specific element
		this.executeFunction(syntheticEvent, element);

		// Restore original values
		if (originalFunction) {
			element.dataset.liveviewFunction = originalFunction;
		} else {
			delete element.dataset.liveviewFunction;
		}

		if (originalTriggerType) {
			element.dataset.intersectionTrigger = originalTriggerType;
		} else {
			delete element.dataset.intersectionTrigger;
		}
	}

	allData(targetElement = null) {
		let data = {};
		const omitKeys = [
			"action",
			"controller",
			"liveviewAction",
			"liveviewFunction",
			"liveviewIntersectAppear",
			"liveviewIntersectDisappear",
			"liveviewIntersectThreshold",
			"intersectionTrigger",
			"liveviewFocus",
			"liveviewInit",
			"initTrigger",
			"liveviewDebounce"
		];

		// Use the provided targetElement, or fallback to event.currentTarget or this.element
		const target = targetElement || event?.currentTarget || this.element;

		for (const [key, value] of Object.entries(target.dataset)) {
			if (!omitKeys.includes(key)) {
				data[key] = value;
			}
		}
		return data;
	}

	allValues(targetElement = null) {
		let data = {};
		const inputsNames = [
			"input",
			"select",
			"textarea"
		];

		// Helper function to get correct value based on input type
		const getInputValue = (input) => {
			if (input.type === "checkbox") {
				return input.checked;
			} else if (input.type === "radio") {
				return input.checked ? input.value : undefined;
			} else {
				return input.value;
			}
		};

		// Use the provided targetElement, or fallback to event.currentTarget or this.element
		const target = targetElement || event?.currentTarget || this.element;

		// Check if current element is a form
		if (target.tagName.toLowerCase() === "form") {
			const inputs = target.querySelectorAll(inputsNames.join(","));
			inputs.forEach((input) => {
				const value = getInputValue(input);
				if (value !== undefined) {
					data[input.name] = value;
				}
			});
			return data;
		}

		// Check if current element has a parent form
		const parentForm = target.closest("form");
		if (parentForm) {
			const inputs = parentForm.querySelectorAll(inputsNames.join(","));
			inputs.forEach((input) => {
				const value = getInputValue(input);
				if (value !== undefined) {
					data[input.name] = value;
				}
			});
			return data;
		}

		// If no form, check if current element is an input
		if (inputsNames.includes(target.tagName.toLowerCase())) {
			const value = getInputValue(target);
			if (value !== undefined) {
				data[target.name] = value;
			}
			return data;
		}

		return data;
	}

	// Refactored method to reuse execution logic
	executeFunction(event, targetElement = null) {
		const target = targetElement || event?.currentTarget || this.element;
		const liveviewFunction = target.dataset.liveviewFunction;

		// Check if data is defined
		if (liveviewFunction === undefined) {
			console.error("data-liveview-function is not defined");
			return;
		}

		// Send data to server
		const myData = {
			function: liveviewFunction,
			data: this.allData(target),
			form: this.allValues(target)
		};

		console.debug(myData);
		sendData(myData);
	}

	run(event) {
		event.preventDefault();

		const target = event.currentTarget;
		const debounceTime = parseInt(target.dataset.liveviewDebounce);

		// If NO debounce, execute immediately (current behavior)
		if (!debounceTime || debounceTime === 0 || isNaN(debounceTime)) {
			this.executeFunction(event);
			return;
		}

		// If debounce is set, apply debounce logic
		// Clear previous timer if exists
		if (this.debounceTimers.has(target)) {
			clearTimeout(this.debounceTimers.get(target));
		}

		// Create new timer
		const timer = setTimeout(() => {
			this.executeFunction(event);
			this.debounceTimers.delete(target);
		}, debounceTime);

		// Store timer reference
		this.debounceTimers.set(target, timer);
	}
}
