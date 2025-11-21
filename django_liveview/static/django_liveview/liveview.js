(function () {
    'use strict';

    /*
    Stimulus 3.2.1
    Copyright © 2023 Basecamp, LLC
     */
    class EventListener {
        constructor(eventTarget, eventName, eventOptions) {
            this.eventTarget = eventTarget;
            this.eventName = eventName;
            this.eventOptions = eventOptions;
            this.unorderedBindings = new Set();
        }
        connect() {
            this.eventTarget.addEventListener(this.eventName, this, this.eventOptions);
        }
        disconnect() {
            this.eventTarget.removeEventListener(this.eventName, this, this.eventOptions);
        }
        bindingConnected(binding) {
            this.unorderedBindings.add(binding);
        }
        bindingDisconnected(binding) {
            this.unorderedBindings.delete(binding);
        }
        handleEvent(event) {
            const extendedEvent = extendEvent(event);
            for (const binding of this.bindings) {
                if (extendedEvent.immediatePropagationStopped) {
                    break;
                }
                else {
                    binding.handleEvent(extendedEvent);
                }
            }
        }
        hasBindings() {
            return this.unorderedBindings.size > 0;
        }
        get bindings() {
            return Array.from(this.unorderedBindings).sort((left, right) => {
                const leftIndex = left.index, rightIndex = right.index;
                return leftIndex < rightIndex ? -1 : leftIndex > rightIndex ? 1 : 0;
            });
        }
    }
    function extendEvent(event) {
        if ("immediatePropagationStopped" in event) {
            return event;
        }
        else {
            const { stopImmediatePropagation } = event;
            return Object.assign(event, {
                immediatePropagationStopped: false,
                stopImmediatePropagation() {
                    this.immediatePropagationStopped = true;
                    stopImmediatePropagation.call(this);
                },
            });
        }
    }

    class Dispatcher {
        constructor(application) {
            this.application = application;
            this.eventListenerMaps = new Map();
            this.started = false;
        }
        start() {
            if (!this.started) {
                this.started = true;
                this.eventListeners.forEach((eventListener) => eventListener.connect());
            }
        }
        stop() {
            if (this.started) {
                this.started = false;
                this.eventListeners.forEach((eventListener) => eventListener.disconnect());
            }
        }
        get eventListeners() {
            return Array.from(this.eventListenerMaps.values()).reduce((listeners, map) => listeners.concat(Array.from(map.values())), []);
        }
        bindingConnected(binding) {
            this.fetchEventListenerForBinding(binding).bindingConnected(binding);
        }
        bindingDisconnected(binding, clearEventListeners = false) {
            this.fetchEventListenerForBinding(binding).bindingDisconnected(binding);
            if (clearEventListeners)
                this.clearEventListenersForBinding(binding);
        }
        handleError(error, message, detail = {}) {
            this.application.handleError(error, `Error ${message}`, detail);
        }
        clearEventListenersForBinding(binding) {
            const eventListener = this.fetchEventListenerForBinding(binding);
            if (!eventListener.hasBindings()) {
                eventListener.disconnect();
                this.removeMappedEventListenerFor(binding);
            }
        }
        removeMappedEventListenerFor(binding) {
            const { eventTarget, eventName, eventOptions } = binding;
            const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
            const cacheKey = this.cacheKey(eventName, eventOptions);
            eventListenerMap.delete(cacheKey);
            if (eventListenerMap.size == 0)
                this.eventListenerMaps.delete(eventTarget);
        }
        fetchEventListenerForBinding(binding) {
            const { eventTarget, eventName, eventOptions } = binding;
            return this.fetchEventListener(eventTarget, eventName, eventOptions);
        }
        fetchEventListener(eventTarget, eventName, eventOptions) {
            const eventListenerMap = this.fetchEventListenerMapForEventTarget(eventTarget);
            const cacheKey = this.cacheKey(eventName, eventOptions);
            let eventListener = eventListenerMap.get(cacheKey);
            if (!eventListener) {
                eventListener = this.createEventListener(eventTarget, eventName, eventOptions);
                eventListenerMap.set(cacheKey, eventListener);
            }
            return eventListener;
        }
        createEventListener(eventTarget, eventName, eventOptions) {
            const eventListener = new EventListener(eventTarget, eventName, eventOptions);
            if (this.started) {
                eventListener.connect();
            }
            return eventListener;
        }
        fetchEventListenerMapForEventTarget(eventTarget) {
            let eventListenerMap = this.eventListenerMaps.get(eventTarget);
            if (!eventListenerMap) {
                eventListenerMap = new Map();
                this.eventListenerMaps.set(eventTarget, eventListenerMap);
            }
            return eventListenerMap;
        }
        cacheKey(eventName, eventOptions) {
            const parts = [eventName];
            Object.keys(eventOptions)
                .sort()
                .forEach((key) => {
                parts.push(`${eventOptions[key] ? "" : "!"}${key}`);
            });
            return parts.join(":");
        }
    }

    const defaultActionDescriptorFilters = {
        stop({ event, value }) {
            if (value)
                event.stopPropagation();
            return true;
        },
        prevent({ event, value }) {
            if (value)
                event.preventDefault();
            return true;
        },
        self({ event, value, element }) {
            if (value) {
                return element === event.target;
            }
            else {
                return true;
            }
        },
    };
    const descriptorPattern = /^(?:(?:([^.]+?)\+)?(.+?)(?:\.(.+?))?(?:@(window|document))?->)?(.+?)(?:#([^:]+?))(?::(.+))?$/;
    function parseActionDescriptorString(descriptorString) {
        const source = descriptorString.trim();
        const matches = source.match(descriptorPattern) || [];
        let eventName = matches[2];
        let keyFilter = matches[3];
        if (keyFilter && !["keydown", "keyup", "keypress"].includes(eventName)) {
            eventName += `.${keyFilter}`;
            keyFilter = "";
        }
        return {
            eventTarget: parseEventTarget(matches[4]),
            eventName,
            eventOptions: matches[7] ? parseEventOptions(matches[7]) : {},
            identifier: matches[5],
            methodName: matches[6],
            keyFilter: matches[1] || keyFilter,
        };
    }
    function parseEventTarget(eventTargetName) {
        if (eventTargetName == "window") {
            return window;
        }
        else if (eventTargetName == "document") {
            return document;
        }
    }
    function parseEventOptions(eventOptions) {
        return eventOptions
            .split(":")
            .reduce((options, token) => Object.assign(options, { [token.replace(/^!/, "")]: !/^!/.test(token) }), {});
    }
    function stringifyEventTarget(eventTarget) {
        if (eventTarget == window) {
            return "window";
        }
        else if (eventTarget == document) {
            return "document";
        }
    }

    function camelize(value) {
        return value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase());
    }
    function namespaceCamelize(value) {
        return camelize(value.replace(/--/g, "-").replace(/__/g, "_"));
    }
    function capitalize(value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }
    function dasherize(value) {
        return value.replace(/([A-Z])/g, (_, char) => `-${char.toLowerCase()}`);
    }
    function tokenize(value) {
        return value.match(/[^\s]+/g) || [];
    }

    function isSomething(object) {
        return object !== null && object !== undefined;
    }
    function hasProperty(object, property) {
        return Object.prototype.hasOwnProperty.call(object, property);
    }

    const allModifiers = ["meta", "ctrl", "alt", "shift"];
    class Action {
        constructor(element, index, descriptor, schema) {
            this.element = element;
            this.index = index;
            this.eventTarget = descriptor.eventTarget || element;
            this.eventName = descriptor.eventName || getDefaultEventNameForElement(element) || error("missing event name");
            this.eventOptions = descriptor.eventOptions || {};
            this.identifier = descriptor.identifier || error("missing identifier");
            this.methodName = descriptor.methodName || error("missing method name");
            this.keyFilter = descriptor.keyFilter || "";
            this.schema = schema;
        }
        static forToken(token, schema) {
            return new this(token.element, token.index, parseActionDescriptorString(token.content), schema);
        }
        toString() {
            const eventFilter = this.keyFilter ? `.${this.keyFilter}` : "";
            const eventTarget = this.eventTargetName ? `@${this.eventTargetName}` : "";
            return `${this.eventName}${eventFilter}${eventTarget}->${this.identifier}#${this.methodName}`;
        }
        shouldIgnoreKeyboardEvent(event) {
            if (!this.keyFilter) {
                return false;
            }
            const filters = this.keyFilter.split("+");
            if (this.keyFilterDissatisfied(event, filters)) {
                return true;
            }
            const standardFilter = filters.filter((key) => !allModifiers.includes(key))[0];
            if (!standardFilter) {
                return false;
            }
            if (!hasProperty(this.keyMappings, standardFilter)) {
                error(`contains unknown key filter: ${this.keyFilter}`);
            }
            return this.keyMappings[standardFilter].toLowerCase() !== event.key.toLowerCase();
        }
        shouldIgnoreMouseEvent(event) {
            if (!this.keyFilter) {
                return false;
            }
            const filters = [this.keyFilter];
            if (this.keyFilterDissatisfied(event, filters)) {
                return true;
            }
            return false;
        }
        get params() {
            const params = {};
            const pattern = new RegExp(`^data-${this.identifier}-(.+)-param$`, "i");
            for (const { name, value } of Array.from(this.element.attributes)) {
                const match = name.match(pattern);
                const key = match && match[1];
                if (key) {
                    params[camelize(key)] = typecast(value);
                }
            }
            return params;
        }
        get eventTargetName() {
            return stringifyEventTarget(this.eventTarget);
        }
        get keyMappings() {
            return this.schema.keyMappings;
        }
        keyFilterDissatisfied(event, filters) {
            const [meta, ctrl, alt, shift] = allModifiers.map((modifier) => filters.includes(modifier));
            return event.metaKey !== meta || event.ctrlKey !== ctrl || event.altKey !== alt || event.shiftKey !== shift;
        }
    }
    const defaultEventNames = {
        a: () => "click",
        button: () => "click",
        form: () => "submit",
        details: () => "toggle",
        input: (e) => (e.getAttribute("type") == "submit" ? "click" : "input"),
        select: () => "change",
        textarea: () => "input",
    };
    function getDefaultEventNameForElement(element) {
        const tagName = element.tagName.toLowerCase();
        if (tagName in defaultEventNames) {
            return defaultEventNames[tagName](element);
        }
    }
    function error(message) {
        throw new Error(message);
    }
    function typecast(value) {
        try {
            return JSON.parse(value);
        }
        catch (o_O) {
            return value;
        }
    }

    class Binding {
        constructor(context, action) {
            this.context = context;
            this.action = action;
        }
        get index() {
            return this.action.index;
        }
        get eventTarget() {
            return this.action.eventTarget;
        }
        get eventOptions() {
            return this.action.eventOptions;
        }
        get identifier() {
            return this.context.identifier;
        }
        handleEvent(event) {
            const actionEvent = this.prepareActionEvent(event);
            if (this.willBeInvokedByEvent(event) && this.applyEventModifiers(actionEvent)) {
                this.invokeWithEvent(actionEvent);
            }
        }
        get eventName() {
            return this.action.eventName;
        }
        get method() {
            const method = this.controller[this.methodName];
            if (typeof method == "function") {
                return method;
            }
            throw new Error(`Action "${this.action}" references undefined method "${this.methodName}"`);
        }
        applyEventModifiers(event) {
            const { element } = this.action;
            const { actionDescriptorFilters } = this.context.application;
            const { controller } = this.context;
            let passes = true;
            for (const [name, value] of Object.entries(this.eventOptions)) {
                if (name in actionDescriptorFilters) {
                    const filter = actionDescriptorFilters[name];
                    passes = passes && filter({ name, value, event, element, controller });
                }
                else {
                    continue;
                }
            }
            return passes;
        }
        prepareActionEvent(event) {
            return Object.assign(event, { params: this.action.params });
        }
        invokeWithEvent(event) {
            const { target, currentTarget } = event;
            try {
                this.method.call(this.controller, event);
                this.context.logDebugActivity(this.methodName, { event, target, currentTarget, action: this.methodName });
            }
            catch (error) {
                const { identifier, controller, element, index } = this;
                const detail = { identifier, controller, element, index, event };
                this.context.handleError(error, `invoking action "${this.action}"`, detail);
            }
        }
        willBeInvokedByEvent(event) {
            const eventTarget = event.target;
            if (event instanceof KeyboardEvent && this.action.shouldIgnoreKeyboardEvent(event)) {
                return false;
            }
            if (event instanceof MouseEvent && this.action.shouldIgnoreMouseEvent(event)) {
                return false;
            }
            if (this.element === eventTarget) {
                return true;
            }
            else if (eventTarget instanceof Element && this.element.contains(eventTarget)) {
                return this.scope.containsElement(eventTarget);
            }
            else {
                return this.scope.containsElement(this.action.element);
            }
        }
        get controller() {
            return this.context.controller;
        }
        get methodName() {
            return this.action.methodName;
        }
        get element() {
            return this.scope.element;
        }
        get scope() {
            return this.context.scope;
        }
    }

    class ElementObserver {
        constructor(element, delegate) {
            this.mutationObserverInit = { attributes: true, childList: true, subtree: true };
            this.element = element;
            this.started = false;
            this.delegate = delegate;
            this.elements = new Set();
            this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
        }
        start() {
            if (!this.started) {
                this.started = true;
                this.mutationObserver.observe(this.element, this.mutationObserverInit);
                this.refresh();
            }
        }
        pause(callback) {
            if (this.started) {
                this.mutationObserver.disconnect();
                this.started = false;
            }
            callback();
            if (!this.started) {
                this.mutationObserver.observe(this.element, this.mutationObserverInit);
                this.started = true;
            }
        }
        stop() {
            if (this.started) {
                this.mutationObserver.takeRecords();
                this.mutationObserver.disconnect();
                this.started = false;
            }
        }
        refresh() {
            if (this.started) {
                const matches = new Set(this.matchElementsInTree());
                for (const element of Array.from(this.elements)) {
                    if (!matches.has(element)) {
                        this.removeElement(element);
                    }
                }
                for (const element of Array.from(matches)) {
                    this.addElement(element);
                }
            }
        }
        processMutations(mutations) {
            if (this.started) {
                for (const mutation of mutations) {
                    this.processMutation(mutation);
                }
            }
        }
        processMutation(mutation) {
            if (mutation.type == "attributes") {
                this.processAttributeChange(mutation.target, mutation.attributeName);
            }
            else if (mutation.type == "childList") {
                this.processRemovedNodes(mutation.removedNodes);
                this.processAddedNodes(mutation.addedNodes);
            }
        }
        processAttributeChange(element, attributeName) {
            if (this.elements.has(element)) {
                if (this.delegate.elementAttributeChanged && this.matchElement(element)) {
                    this.delegate.elementAttributeChanged(element, attributeName);
                }
                else {
                    this.removeElement(element);
                }
            }
            else if (this.matchElement(element)) {
                this.addElement(element);
            }
        }
        processRemovedNodes(nodes) {
            for (const node of Array.from(nodes)) {
                const element = this.elementFromNode(node);
                if (element) {
                    this.processTree(element, this.removeElement);
                }
            }
        }
        processAddedNodes(nodes) {
            for (const node of Array.from(nodes)) {
                const element = this.elementFromNode(node);
                if (element && this.elementIsActive(element)) {
                    this.processTree(element, this.addElement);
                }
            }
        }
        matchElement(element) {
            return this.delegate.matchElement(element);
        }
        matchElementsInTree(tree = this.element) {
            return this.delegate.matchElementsInTree(tree);
        }
        processTree(tree, processor) {
            for (const element of this.matchElementsInTree(tree)) {
                processor.call(this, element);
            }
        }
        elementFromNode(node) {
            if (node.nodeType == Node.ELEMENT_NODE) {
                return node;
            }
        }
        elementIsActive(element) {
            if (element.isConnected != this.element.isConnected) {
                return false;
            }
            else {
                return this.element.contains(element);
            }
        }
        addElement(element) {
            if (!this.elements.has(element)) {
                if (this.elementIsActive(element)) {
                    this.elements.add(element);
                    if (this.delegate.elementMatched) {
                        this.delegate.elementMatched(element);
                    }
                }
            }
        }
        removeElement(element) {
            if (this.elements.has(element)) {
                this.elements.delete(element);
                if (this.delegate.elementUnmatched) {
                    this.delegate.elementUnmatched(element);
                }
            }
        }
    }

    class AttributeObserver {
        constructor(element, attributeName, delegate) {
            this.attributeName = attributeName;
            this.delegate = delegate;
            this.elementObserver = new ElementObserver(element, this);
        }
        get element() {
            return this.elementObserver.element;
        }
        get selector() {
            return `[${this.attributeName}]`;
        }
        start() {
            this.elementObserver.start();
        }
        pause(callback) {
            this.elementObserver.pause(callback);
        }
        stop() {
            this.elementObserver.stop();
        }
        refresh() {
            this.elementObserver.refresh();
        }
        get started() {
            return this.elementObserver.started;
        }
        matchElement(element) {
            return element.hasAttribute(this.attributeName);
        }
        matchElementsInTree(tree) {
            const match = this.matchElement(tree) ? [tree] : [];
            const matches = Array.from(tree.querySelectorAll(this.selector));
            return match.concat(matches);
        }
        elementMatched(element) {
            if (this.delegate.elementMatchedAttribute) {
                this.delegate.elementMatchedAttribute(element, this.attributeName);
            }
        }
        elementUnmatched(element) {
            if (this.delegate.elementUnmatchedAttribute) {
                this.delegate.elementUnmatchedAttribute(element, this.attributeName);
            }
        }
        elementAttributeChanged(element, attributeName) {
            if (this.delegate.elementAttributeValueChanged && this.attributeName == attributeName) {
                this.delegate.elementAttributeValueChanged(element, attributeName);
            }
        }
    }

    function add(map, key, value) {
        fetch(map, key).add(value);
    }
    function del(map, key, value) {
        fetch(map, key).delete(value);
        prune(map, key);
    }
    function fetch(map, key) {
        let values = map.get(key);
        if (!values) {
            values = new Set();
            map.set(key, values);
        }
        return values;
    }
    function prune(map, key) {
        const values = map.get(key);
        if (values != null && values.size == 0) {
            map.delete(key);
        }
    }

    class Multimap {
        constructor() {
            this.valuesByKey = new Map();
        }
        get keys() {
            return Array.from(this.valuesByKey.keys());
        }
        get values() {
            const sets = Array.from(this.valuesByKey.values());
            return sets.reduce((values, set) => values.concat(Array.from(set)), []);
        }
        get size() {
            const sets = Array.from(this.valuesByKey.values());
            return sets.reduce((size, set) => size + set.size, 0);
        }
        add(key, value) {
            add(this.valuesByKey, key, value);
        }
        delete(key, value) {
            del(this.valuesByKey, key, value);
        }
        has(key, value) {
            const values = this.valuesByKey.get(key);
            return values != null && values.has(value);
        }
        hasKey(key) {
            return this.valuesByKey.has(key);
        }
        hasValue(value) {
            const sets = Array.from(this.valuesByKey.values());
            return sets.some((set) => set.has(value));
        }
        getValuesForKey(key) {
            const values = this.valuesByKey.get(key);
            return values ? Array.from(values) : [];
        }
        getKeysForValue(value) {
            return Array.from(this.valuesByKey)
                .filter(([_key, values]) => values.has(value))
                .map(([key, _values]) => key);
        }
    }

    class SelectorObserver {
        constructor(element, selector, delegate, details) {
            this._selector = selector;
            this.details = details;
            this.elementObserver = new ElementObserver(element, this);
            this.delegate = delegate;
            this.matchesByElement = new Multimap();
        }
        get started() {
            return this.elementObserver.started;
        }
        get selector() {
            return this._selector;
        }
        set selector(selector) {
            this._selector = selector;
            this.refresh();
        }
        start() {
            this.elementObserver.start();
        }
        pause(callback) {
            this.elementObserver.pause(callback);
        }
        stop() {
            this.elementObserver.stop();
        }
        refresh() {
            this.elementObserver.refresh();
        }
        get element() {
            return this.elementObserver.element;
        }
        matchElement(element) {
            const { selector } = this;
            if (selector) {
                const matches = element.matches(selector);
                if (this.delegate.selectorMatchElement) {
                    return matches && this.delegate.selectorMatchElement(element, this.details);
                }
                return matches;
            }
            else {
                return false;
            }
        }
        matchElementsInTree(tree) {
            const { selector } = this;
            if (selector) {
                const match = this.matchElement(tree) ? [tree] : [];
                const matches = Array.from(tree.querySelectorAll(selector)).filter((match) => this.matchElement(match));
                return match.concat(matches);
            }
            else {
                return [];
            }
        }
        elementMatched(element) {
            const { selector } = this;
            if (selector) {
                this.selectorMatched(element, selector);
            }
        }
        elementUnmatched(element) {
            const selectors = this.matchesByElement.getKeysForValue(element);
            for (const selector of selectors) {
                this.selectorUnmatched(element, selector);
            }
        }
        elementAttributeChanged(element, _attributeName) {
            const { selector } = this;
            if (selector) {
                const matches = this.matchElement(element);
                const matchedBefore = this.matchesByElement.has(selector, element);
                if (matches && !matchedBefore) {
                    this.selectorMatched(element, selector);
                }
                else if (!matches && matchedBefore) {
                    this.selectorUnmatched(element, selector);
                }
            }
        }
        selectorMatched(element, selector) {
            this.delegate.selectorMatched(element, selector, this.details);
            this.matchesByElement.add(selector, element);
        }
        selectorUnmatched(element, selector) {
            this.delegate.selectorUnmatched(element, selector, this.details);
            this.matchesByElement.delete(selector, element);
        }
    }

    class StringMapObserver {
        constructor(element, delegate) {
            this.element = element;
            this.delegate = delegate;
            this.started = false;
            this.stringMap = new Map();
            this.mutationObserver = new MutationObserver((mutations) => this.processMutations(mutations));
        }
        start() {
            if (!this.started) {
                this.started = true;
                this.mutationObserver.observe(this.element, { attributes: true, attributeOldValue: true });
                this.refresh();
            }
        }
        stop() {
            if (this.started) {
                this.mutationObserver.takeRecords();
                this.mutationObserver.disconnect();
                this.started = false;
            }
        }
        refresh() {
            if (this.started) {
                for (const attributeName of this.knownAttributeNames) {
                    this.refreshAttribute(attributeName, null);
                }
            }
        }
        processMutations(mutations) {
            if (this.started) {
                for (const mutation of mutations) {
                    this.processMutation(mutation);
                }
            }
        }
        processMutation(mutation) {
            const attributeName = mutation.attributeName;
            if (attributeName) {
                this.refreshAttribute(attributeName, mutation.oldValue);
            }
        }
        refreshAttribute(attributeName, oldValue) {
            const key = this.delegate.getStringMapKeyForAttribute(attributeName);
            if (key != null) {
                if (!this.stringMap.has(attributeName)) {
                    this.stringMapKeyAdded(key, attributeName);
                }
                const value = this.element.getAttribute(attributeName);
                if (this.stringMap.get(attributeName) != value) {
                    this.stringMapValueChanged(value, key, oldValue);
                }
                if (value == null) {
                    const oldValue = this.stringMap.get(attributeName);
                    this.stringMap.delete(attributeName);
                    if (oldValue)
                        this.stringMapKeyRemoved(key, attributeName, oldValue);
                }
                else {
                    this.stringMap.set(attributeName, value);
                }
            }
        }
        stringMapKeyAdded(key, attributeName) {
            if (this.delegate.stringMapKeyAdded) {
                this.delegate.stringMapKeyAdded(key, attributeName);
            }
        }
        stringMapValueChanged(value, key, oldValue) {
            if (this.delegate.stringMapValueChanged) {
                this.delegate.stringMapValueChanged(value, key, oldValue);
            }
        }
        stringMapKeyRemoved(key, attributeName, oldValue) {
            if (this.delegate.stringMapKeyRemoved) {
                this.delegate.stringMapKeyRemoved(key, attributeName, oldValue);
            }
        }
        get knownAttributeNames() {
            return Array.from(new Set(this.currentAttributeNames.concat(this.recordedAttributeNames)));
        }
        get currentAttributeNames() {
            return Array.from(this.element.attributes).map((attribute) => attribute.name);
        }
        get recordedAttributeNames() {
            return Array.from(this.stringMap.keys());
        }
    }

    class TokenListObserver {
        constructor(element, attributeName, delegate) {
            this.attributeObserver = new AttributeObserver(element, attributeName, this);
            this.delegate = delegate;
            this.tokensByElement = new Multimap();
        }
        get started() {
            return this.attributeObserver.started;
        }
        start() {
            this.attributeObserver.start();
        }
        pause(callback) {
            this.attributeObserver.pause(callback);
        }
        stop() {
            this.attributeObserver.stop();
        }
        refresh() {
            this.attributeObserver.refresh();
        }
        get element() {
            return this.attributeObserver.element;
        }
        get attributeName() {
            return this.attributeObserver.attributeName;
        }
        elementMatchedAttribute(element) {
            this.tokensMatched(this.readTokensForElement(element));
        }
        elementAttributeValueChanged(element) {
            const [unmatchedTokens, matchedTokens] = this.refreshTokensForElement(element);
            this.tokensUnmatched(unmatchedTokens);
            this.tokensMatched(matchedTokens);
        }
        elementUnmatchedAttribute(element) {
            this.tokensUnmatched(this.tokensByElement.getValuesForKey(element));
        }
        tokensMatched(tokens) {
            tokens.forEach((token) => this.tokenMatched(token));
        }
        tokensUnmatched(tokens) {
            tokens.forEach((token) => this.tokenUnmatched(token));
        }
        tokenMatched(token) {
            this.delegate.tokenMatched(token);
            this.tokensByElement.add(token.element, token);
        }
        tokenUnmatched(token) {
            this.delegate.tokenUnmatched(token);
            this.tokensByElement.delete(token.element, token);
        }
        refreshTokensForElement(element) {
            const previousTokens = this.tokensByElement.getValuesForKey(element);
            const currentTokens = this.readTokensForElement(element);
            const firstDifferingIndex = zip(previousTokens, currentTokens).findIndex(([previousToken, currentToken]) => !tokensAreEqual(previousToken, currentToken));
            if (firstDifferingIndex == -1) {
                return [[], []];
            }
            else {
                return [previousTokens.slice(firstDifferingIndex), currentTokens.slice(firstDifferingIndex)];
            }
        }
        readTokensForElement(element) {
            const attributeName = this.attributeName;
            const tokenString = element.getAttribute(attributeName) || "";
            return parseTokenString(tokenString, element, attributeName);
        }
    }
    function parseTokenString(tokenString, element, attributeName) {
        return tokenString
            .trim()
            .split(/\s+/)
            .filter((content) => content.length)
            .map((content, index) => ({ element, attributeName, content, index }));
    }
    function zip(left, right) {
        const length = Math.max(left.length, right.length);
        return Array.from({ length }, (_, index) => [left[index], right[index]]);
    }
    function tokensAreEqual(left, right) {
        return left && right && left.index == right.index && left.content == right.content;
    }

    class ValueListObserver {
        constructor(element, attributeName, delegate) {
            this.tokenListObserver = new TokenListObserver(element, attributeName, this);
            this.delegate = delegate;
            this.parseResultsByToken = new WeakMap();
            this.valuesByTokenByElement = new WeakMap();
        }
        get started() {
            return this.tokenListObserver.started;
        }
        start() {
            this.tokenListObserver.start();
        }
        stop() {
            this.tokenListObserver.stop();
        }
        refresh() {
            this.tokenListObserver.refresh();
        }
        get element() {
            return this.tokenListObserver.element;
        }
        get attributeName() {
            return this.tokenListObserver.attributeName;
        }
        tokenMatched(token) {
            const { element } = token;
            const { value } = this.fetchParseResultForToken(token);
            if (value) {
                this.fetchValuesByTokenForElement(element).set(token, value);
                this.delegate.elementMatchedValue(element, value);
            }
        }
        tokenUnmatched(token) {
            const { element } = token;
            const { value } = this.fetchParseResultForToken(token);
            if (value) {
                this.fetchValuesByTokenForElement(element).delete(token);
                this.delegate.elementUnmatchedValue(element, value);
            }
        }
        fetchParseResultForToken(token) {
            let parseResult = this.parseResultsByToken.get(token);
            if (!parseResult) {
                parseResult = this.parseToken(token);
                this.parseResultsByToken.set(token, parseResult);
            }
            return parseResult;
        }
        fetchValuesByTokenForElement(element) {
            let valuesByToken = this.valuesByTokenByElement.get(element);
            if (!valuesByToken) {
                valuesByToken = new Map();
                this.valuesByTokenByElement.set(element, valuesByToken);
            }
            return valuesByToken;
        }
        parseToken(token) {
            try {
                const value = this.delegate.parseValueForToken(token);
                return { value };
            }
            catch (error) {
                return { error };
            }
        }
    }

    class BindingObserver {
        constructor(context, delegate) {
            this.context = context;
            this.delegate = delegate;
            this.bindingsByAction = new Map();
        }
        start() {
            if (!this.valueListObserver) {
                this.valueListObserver = new ValueListObserver(this.element, this.actionAttribute, this);
                this.valueListObserver.start();
            }
        }
        stop() {
            if (this.valueListObserver) {
                this.valueListObserver.stop();
                delete this.valueListObserver;
                this.disconnectAllActions();
            }
        }
        get element() {
            return this.context.element;
        }
        get identifier() {
            return this.context.identifier;
        }
        get actionAttribute() {
            return this.schema.actionAttribute;
        }
        get schema() {
            return this.context.schema;
        }
        get bindings() {
            return Array.from(this.bindingsByAction.values());
        }
        connectAction(action) {
            const binding = new Binding(this.context, action);
            this.bindingsByAction.set(action, binding);
            this.delegate.bindingConnected(binding);
        }
        disconnectAction(action) {
            const binding = this.bindingsByAction.get(action);
            if (binding) {
                this.bindingsByAction.delete(action);
                this.delegate.bindingDisconnected(binding);
            }
        }
        disconnectAllActions() {
            this.bindings.forEach((binding) => this.delegate.bindingDisconnected(binding, true));
            this.bindingsByAction.clear();
        }
        parseValueForToken(token) {
            const action = Action.forToken(token, this.schema);
            if (action.identifier == this.identifier) {
                return action;
            }
        }
        elementMatchedValue(element, action) {
            this.connectAction(action);
        }
        elementUnmatchedValue(element, action) {
            this.disconnectAction(action);
        }
    }

    class ValueObserver {
        constructor(context, receiver) {
            this.context = context;
            this.receiver = receiver;
            this.stringMapObserver = new StringMapObserver(this.element, this);
            this.valueDescriptorMap = this.controller.valueDescriptorMap;
        }
        start() {
            this.stringMapObserver.start();
            this.invokeChangedCallbacksForDefaultValues();
        }
        stop() {
            this.stringMapObserver.stop();
        }
        get element() {
            return this.context.element;
        }
        get controller() {
            return this.context.controller;
        }
        getStringMapKeyForAttribute(attributeName) {
            if (attributeName in this.valueDescriptorMap) {
                return this.valueDescriptorMap[attributeName].name;
            }
        }
        stringMapKeyAdded(key, attributeName) {
            const descriptor = this.valueDescriptorMap[attributeName];
            if (!this.hasValue(key)) {
                this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), descriptor.writer(descriptor.defaultValue));
            }
        }
        stringMapValueChanged(value, name, oldValue) {
            const descriptor = this.valueDescriptorNameMap[name];
            if (value === null)
                return;
            if (oldValue === null) {
                oldValue = descriptor.writer(descriptor.defaultValue);
            }
            this.invokeChangedCallback(name, value, oldValue);
        }
        stringMapKeyRemoved(key, attributeName, oldValue) {
            const descriptor = this.valueDescriptorNameMap[key];
            if (this.hasValue(key)) {
                this.invokeChangedCallback(key, descriptor.writer(this.receiver[key]), oldValue);
            }
            else {
                this.invokeChangedCallback(key, descriptor.writer(descriptor.defaultValue), oldValue);
            }
        }
        invokeChangedCallbacksForDefaultValues() {
            for (const { key, name, defaultValue, writer } of this.valueDescriptors) {
                if (defaultValue != undefined && !this.controller.data.has(key)) {
                    this.invokeChangedCallback(name, writer(defaultValue), undefined);
                }
            }
        }
        invokeChangedCallback(name, rawValue, rawOldValue) {
            const changedMethodName = `${name}Changed`;
            const changedMethod = this.receiver[changedMethodName];
            if (typeof changedMethod == "function") {
                const descriptor = this.valueDescriptorNameMap[name];
                try {
                    const value = descriptor.reader(rawValue);
                    let oldValue = rawOldValue;
                    if (rawOldValue) {
                        oldValue = descriptor.reader(rawOldValue);
                    }
                    changedMethod.call(this.receiver, value, oldValue);
                }
                catch (error) {
                    if (error instanceof TypeError) {
                        error.message = `Stimulus Value "${this.context.identifier}.${descriptor.name}" - ${error.message}`;
                    }
                    throw error;
                }
            }
        }
        get valueDescriptors() {
            const { valueDescriptorMap } = this;
            return Object.keys(valueDescriptorMap).map((key) => valueDescriptorMap[key]);
        }
        get valueDescriptorNameMap() {
            const descriptors = {};
            Object.keys(this.valueDescriptorMap).forEach((key) => {
                const descriptor = this.valueDescriptorMap[key];
                descriptors[descriptor.name] = descriptor;
            });
            return descriptors;
        }
        hasValue(attributeName) {
            const descriptor = this.valueDescriptorNameMap[attributeName];
            const hasMethodName = `has${capitalize(descriptor.name)}`;
            return this.receiver[hasMethodName];
        }
    }

    class TargetObserver {
        constructor(context, delegate) {
            this.context = context;
            this.delegate = delegate;
            this.targetsByName = new Multimap();
        }
        start() {
            if (!this.tokenListObserver) {
                this.tokenListObserver = new TokenListObserver(this.element, this.attributeName, this);
                this.tokenListObserver.start();
            }
        }
        stop() {
            if (this.tokenListObserver) {
                this.disconnectAllTargets();
                this.tokenListObserver.stop();
                delete this.tokenListObserver;
            }
        }
        tokenMatched({ element, content: name }) {
            if (this.scope.containsElement(element)) {
                this.connectTarget(element, name);
            }
        }
        tokenUnmatched({ element, content: name }) {
            this.disconnectTarget(element, name);
        }
        connectTarget(element, name) {
            var _a;
            if (!this.targetsByName.has(name, element)) {
                this.targetsByName.add(name, element);
                (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetConnected(element, name));
            }
        }
        disconnectTarget(element, name) {
            var _a;
            if (this.targetsByName.has(name, element)) {
                this.targetsByName.delete(name, element);
                (_a = this.tokenListObserver) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.targetDisconnected(element, name));
            }
        }
        disconnectAllTargets() {
            for (const name of this.targetsByName.keys) {
                for (const element of this.targetsByName.getValuesForKey(name)) {
                    this.disconnectTarget(element, name);
                }
            }
        }
        get attributeName() {
            return `data-${this.context.identifier}-target`;
        }
        get element() {
            return this.context.element;
        }
        get scope() {
            return this.context.scope;
        }
    }

    function readInheritableStaticArrayValues(constructor, propertyName) {
        const ancestors = getAncestorsForConstructor(constructor);
        return Array.from(ancestors.reduce((values, constructor) => {
            getOwnStaticArrayValues(constructor, propertyName).forEach((name) => values.add(name));
            return values;
        }, new Set()));
    }
    function readInheritableStaticObjectPairs(constructor, propertyName) {
        const ancestors = getAncestorsForConstructor(constructor);
        return ancestors.reduce((pairs, constructor) => {
            pairs.push(...getOwnStaticObjectPairs(constructor, propertyName));
            return pairs;
        }, []);
    }
    function getAncestorsForConstructor(constructor) {
        const ancestors = [];
        while (constructor) {
            ancestors.push(constructor);
            constructor = Object.getPrototypeOf(constructor);
        }
        return ancestors.reverse();
    }
    function getOwnStaticArrayValues(constructor, propertyName) {
        const definition = constructor[propertyName];
        return Array.isArray(definition) ? definition : [];
    }
    function getOwnStaticObjectPairs(constructor, propertyName) {
        const definition = constructor[propertyName];
        return definition ? Object.keys(definition).map((key) => [key, definition[key]]) : [];
    }

    class OutletObserver {
        constructor(context, delegate) {
            this.started = false;
            this.context = context;
            this.delegate = delegate;
            this.outletsByName = new Multimap();
            this.outletElementsByName = new Multimap();
            this.selectorObserverMap = new Map();
            this.attributeObserverMap = new Map();
        }
        start() {
            if (!this.started) {
                this.outletDefinitions.forEach((outletName) => {
                    this.setupSelectorObserverForOutlet(outletName);
                    this.setupAttributeObserverForOutlet(outletName);
                });
                this.started = true;
                this.dependentContexts.forEach((context) => context.refresh());
            }
        }
        refresh() {
            this.selectorObserverMap.forEach((observer) => observer.refresh());
            this.attributeObserverMap.forEach((observer) => observer.refresh());
        }
        stop() {
            if (this.started) {
                this.started = false;
                this.disconnectAllOutlets();
                this.stopSelectorObservers();
                this.stopAttributeObservers();
            }
        }
        stopSelectorObservers() {
            if (this.selectorObserverMap.size > 0) {
                this.selectorObserverMap.forEach((observer) => observer.stop());
                this.selectorObserverMap.clear();
            }
        }
        stopAttributeObservers() {
            if (this.attributeObserverMap.size > 0) {
                this.attributeObserverMap.forEach((observer) => observer.stop());
                this.attributeObserverMap.clear();
            }
        }
        selectorMatched(element, _selector, { outletName }) {
            const outlet = this.getOutlet(element, outletName);
            if (outlet) {
                this.connectOutlet(outlet, element, outletName);
            }
        }
        selectorUnmatched(element, _selector, { outletName }) {
            const outlet = this.getOutletFromMap(element, outletName);
            if (outlet) {
                this.disconnectOutlet(outlet, element, outletName);
            }
        }
        selectorMatchElement(element, { outletName }) {
            const selector = this.selector(outletName);
            const hasOutlet = this.hasOutlet(element, outletName);
            const hasOutletController = element.matches(`[${this.schema.controllerAttribute}~=${outletName}]`);
            if (selector) {
                return hasOutlet && hasOutletController && element.matches(selector);
            }
            else {
                return false;
            }
        }
        elementMatchedAttribute(_element, attributeName) {
            const outletName = this.getOutletNameFromOutletAttributeName(attributeName);
            if (outletName) {
                this.updateSelectorObserverForOutlet(outletName);
            }
        }
        elementAttributeValueChanged(_element, attributeName) {
            const outletName = this.getOutletNameFromOutletAttributeName(attributeName);
            if (outletName) {
                this.updateSelectorObserverForOutlet(outletName);
            }
        }
        elementUnmatchedAttribute(_element, attributeName) {
            const outletName = this.getOutletNameFromOutletAttributeName(attributeName);
            if (outletName) {
                this.updateSelectorObserverForOutlet(outletName);
            }
        }
        connectOutlet(outlet, element, outletName) {
            var _a;
            if (!this.outletElementsByName.has(outletName, element)) {
                this.outletsByName.add(outletName, outlet);
                this.outletElementsByName.add(outletName, element);
                (_a = this.selectorObserverMap.get(outletName)) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.outletConnected(outlet, element, outletName));
            }
        }
        disconnectOutlet(outlet, element, outletName) {
            var _a;
            if (this.outletElementsByName.has(outletName, element)) {
                this.outletsByName.delete(outletName, outlet);
                this.outletElementsByName.delete(outletName, element);
                (_a = this.selectorObserverMap
                    .get(outletName)) === null || _a === void 0 ? void 0 : _a.pause(() => this.delegate.outletDisconnected(outlet, element, outletName));
            }
        }
        disconnectAllOutlets() {
            for (const outletName of this.outletElementsByName.keys) {
                for (const element of this.outletElementsByName.getValuesForKey(outletName)) {
                    for (const outlet of this.outletsByName.getValuesForKey(outletName)) {
                        this.disconnectOutlet(outlet, element, outletName);
                    }
                }
            }
        }
        updateSelectorObserverForOutlet(outletName) {
            const observer = this.selectorObserverMap.get(outletName);
            if (observer) {
                observer.selector = this.selector(outletName);
            }
        }
        setupSelectorObserverForOutlet(outletName) {
            const selector = this.selector(outletName);
            const selectorObserver = new SelectorObserver(document.body, selector, this, { outletName });
            this.selectorObserverMap.set(outletName, selectorObserver);
            selectorObserver.start();
        }
        setupAttributeObserverForOutlet(outletName) {
            const attributeName = this.attributeNameForOutletName(outletName);
            const attributeObserver = new AttributeObserver(this.scope.element, attributeName, this);
            this.attributeObserverMap.set(outletName, attributeObserver);
            attributeObserver.start();
        }
        selector(outletName) {
            return this.scope.outlets.getSelectorForOutletName(outletName);
        }
        attributeNameForOutletName(outletName) {
            return this.scope.schema.outletAttributeForScope(this.identifier, outletName);
        }
        getOutletNameFromOutletAttributeName(attributeName) {
            return this.outletDefinitions.find((outletName) => this.attributeNameForOutletName(outletName) === attributeName);
        }
        get outletDependencies() {
            const dependencies = new Multimap();
            this.router.modules.forEach((module) => {
                const constructor = module.definition.controllerConstructor;
                const outlets = readInheritableStaticArrayValues(constructor, "outlets");
                outlets.forEach((outlet) => dependencies.add(outlet, module.identifier));
            });
            return dependencies;
        }
        get outletDefinitions() {
            return this.outletDependencies.getKeysForValue(this.identifier);
        }
        get dependentControllerIdentifiers() {
            return this.outletDependencies.getValuesForKey(this.identifier);
        }
        get dependentContexts() {
            const identifiers = this.dependentControllerIdentifiers;
            return this.router.contexts.filter((context) => identifiers.includes(context.identifier));
        }
        hasOutlet(element, outletName) {
            return !!this.getOutlet(element, outletName) || !!this.getOutletFromMap(element, outletName);
        }
        getOutlet(element, outletName) {
            return this.application.getControllerForElementAndIdentifier(element, outletName);
        }
        getOutletFromMap(element, outletName) {
            return this.outletsByName.getValuesForKey(outletName).find((outlet) => outlet.element === element);
        }
        get scope() {
            return this.context.scope;
        }
        get schema() {
            return this.context.schema;
        }
        get identifier() {
            return this.context.identifier;
        }
        get application() {
            return this.context.application;
        }
        get router() {
            return this.application.router;
        }
    }

    class Context {
        constructor(module, scope) {
            this.logDebugActivity = (functionName, detail = {}) => {
                const { identifier, controller, element } = this;
                detail = Object.assign({ identifier, controller, element }, detail);
                this.application.logDebugActivity(this.identifier, functionName, detail);
            };
            this.module = module;
            this.scope = scope;
            this.controller = new module.controllerConstructor(this);
            this.bindingObserver = new BindingObserver(this, this.dispatcher);
            this.valueObserver = new ValueObserver(this, this.controller);
            this.targetObserver = new TargetObserver(this, this);
            this.outletObserver = new OutletObserver(this, this);
            try {
                this.controller.initialize();
                this.logDebugActivity("initialize");
            }
            catch (error) {
                this.handleError(error, "initializing controller");
            }
        }
        connect() {
            this.bindingObserver.start();
            this.valueObserver.start();
            this.targetObserver.start();
            this.outletObserver.start();
            try {
                this.controller.connect();
                this.logDebugActivity("connect");
            }
            catch (error) {
                this.handleError(error, "connecting controller");
            }
        }
        refresh() {
            this.outletObserver.refresh();
        }
        disconnect() {
            try {
                this.controller.disconnect();
                this.logDebugActivity("disconnect");
            }
            catch (error) {
                this.handleError(error, "disconnecting controller");
            }
            this.outletObserver.stop();
            this.targetObserver.stop();
            this.valueObserver.stop();
            this.bindingObserver.stop();
        }
        get application() {
            return this.module.application;
        }
        get identifier() {
            return this.module.identifier;
        }
        get schema() {
            return this.application.schema;
        }
        get dispatcher() {
            return this.application.dispatcher;
        }
        get element() {
            return this.scope.element;
        }
        get parentElement() {
            return this.element.parentElement;
        }
        handleError(error, message, detail = {}) {
            const { identifier, controller, element } = this;
            detail = Object.assign({ identifier, controller, element }, detail);
            this.application.handleError(error, `Error ${message}`, detail);
        }
        targetConnected(element, name) {
            this.invokeControllerMethod(`${name}TargetConnected`, element);
        }
        targetDisconnected(element, name) {
            this.invokeControllerMethod(`${name}TargetDisconnected`, element);
        }
        outletConnected(outlet, element, name) {
            this.invokeControllerMethod(`${namespaceCamelize(name)}OutletConnected`, outlet, element);
        }
        outletDisconnected(outlet, element, name) {
            this.invokeControllerMethod(`${namespaceCamelize(name)}OutletDisconnected`, outlet, element);
        }
        invokeControllerMethod(methodName, ...args) {
            const controller = this.controller;
            if (typeof controller[methodName] == "function") {
                controller[methodName](...args);
            }
        }
    }

    function bless(constructor) {
        return shadow(constructor, getBlessedProperties(constructor));
    }
    function shadow(constructor, properties) {
        const shadowConstructor = extend(constructor);
        const shadowProperties = getShadowProperties(constructor.prototype, properties);
        Object.defineProperties(shadowConstructor.prototype, shadowProperties);
        return shadowConstructor;
    }
    function getBlessedProperties(constructor) {
        const blessings = readInheritableStaticArrayValues(constructor, "blessings");
        return blessings.reduce((blessedProperties, blessing) => {
            const properties = blessing(constructor);
            for (const key in properties) {
                const descriptor = blessedProperties[key] || {};
                blessedProperties[key] = Object.assign(descriptor, properties[key]);
            }
            return blessedProperties;
        }, {});
    }
    function getShadowProperties(prototype, properties) {
        return getOwnKeys(properties).reduce((shadowProperties, key) => {
            const descriptor = getShadowedDescriptor(prototype, properties, key);
            if (descriptor) {
                Object.assign(shadowProperties, { [key]: descriptor });
            }
            return shadowProperties;
        }, {});
    }
    function getShadowedDescriptor(prototype, properties, key) {
        const shadowingDescriptor = Object.getOwnPropertyDescriptor(prototype, key);
        const shadowedByValue = shadowingDescriptor && "value" in shadowingDescriptor;
        if (!shadowedByValue) {
            const descriptor = Object.getOwnPropertyDescriptor(properties, key).value;
            if (shadowingDescriptor) {
                descriptor.get = shadowingDescriptor.get || descriptor.get;
                descriptor.set = shadowingDescriptor.set || descriptor.set;
            }
            return descriptor;
        }
    }
    const getOwnKeys = (() => {
        if (typeof Object.getOwnPropertySymbols == "function") {
            return (object) => [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertySymbols(object)];
        }
        else {
            return Object.getOwnPropertyNames;
        }
    })();
    const extend = (() => {
        function extendWithReflect(constructor) {
            function extended() {
                return Reflect.construct(constructor, arguments, new.target);
            }
            extended.prototype = Object.create(constructor.prototype, {
                constructor: { value: extended },
            });
            Reflect.setPrototypeOf(extended, constructor);
            return extended;
        }
        function testReflectExtension() {
            const a = function () {
                this.a.call(this);
            };
            const b = extendWithReflect(a);
            b.prototype.a = function () { };
            return new b();
        }
        try {
            testReflectExtension();
            return extendWithReflect;
        }
        catch (error) {
            return (constructor) => class extended extends constructor {
            };
        }
    })();

    function blessDefinition(definition) {
        return {
            identifier: definition.identifier,
            controllerConstructor: bless(definition.controllerConstructor),
        };
    }

    class Module {
        constructor(application, definition) {
            this.application = application;
            this.definition = blessDefinition(definition);
            this.contextsByScope = new WeakMap();
            this.connectedContexts = new Set();
        }
        get identifier() {
            return this.definition.identifier;
        }
        get controllerConstructor() {
            return this.definition.controllerConstructor;
        }
        get contexts() {
            return Array.from(this.connectedContexts);
        }
        connectContextForScope(scope) {
            const context = this.fetchContextForScope(scope);
            this.connectedContexts.add(context);
            context.connect();
        }
        disconnectContextForScope(scope) {
            const context = this.contextsByScope.get(scope);
            if (context) {
                this.connectedContexts.delete(context);
                context.disconnect();
            }
        }
        fetchContextForScope(scope) {
            let context = this.contextsByScope.get(scope);
            if (!context) {
                context = new Context(this, scope);
                this.contextsByScope.set(scope, context);
            }
            return context;
        }
    }

    class ClassMap {
        constructor(scope) {
            this.scope = scope;
        }
        has(name) {
            return this.data.has(this.getDataKey(name));
        }
        get(name) {
            return this.getAll(name)[0];
        }
        getAll(name) {
            const tokenString = this.data.get(this.getDataKey(name)) || "";
            return tokenize(tokenString);
        }
        getAttributeName(name) {
            return this.data.getAttributeNameForKey(this.getDataKey(name));
        }
        getDataKey(name) {
            return `${name}-class`;
        }
        get data() {
            return this.scope.data;
        }
    }

    class DataMap {
        constructor(scope) {
            this.scope = scope;
        }
        get element() {
            return this.scope.element;
        }
        get identifier() {
            return this.scope.identifier;
        }
        get(key) {
            const name = this.getAttributeNameForKey(key);
            return this.element.getAttribute(name);
        }
        set(key, value) {
            const name = this.getAttributeNameForKey(key);
            this.element.setAttribute(name, value);
            return this.get(key);
        }
        has(key) {
            const name = this.getAttributeNameForKey(key);
            return this.element.hasAttribute(name);
        }
        delete(key) {
            if (this.has(key)) {
                const name = this.getAttributeNameForKey(key);
                this.element.removeAttribute(name);
                return true;
            }
            else {
                return false;
            }
        }
        getAttributeNameForKey(key) {
            return `data-${this.identifier}-${dasherize(key)}`;
        }
    }

    class Guide {
        constructor(logger) {
            this.warnedKeysByObject = new WeakMap();
            this.logger = logger;
        }
        warn(object, key, message) {
            let warnedKeys = this.warnedKeysByObject.get(object);
            if (!warnedKeys) {
                warnedKeys = new Set();
                this.warnedKeysByObject.set(object, warnedKeys);
            }
            if (!warnedKeys.has(key)) {
                warnedKeys.add(key);
                this.logger.warn(message, object);
            }
        }
    }

    function attributeValueContainsToken(attributeName, token) {
        return `[${attributeName}~="${token}"]`;
    }

    class TargetSet {
        constructor(scope) {
            this.scope = scope;
        }
        get element() {
            return this.scope.element;
        }
        get identifier() {
            return this.scope.identifier;
        }
        get schema() {
            return this.scope.schema;
        }
        has(targetName) {
            return this.find(targetName) != null;
        }
        find(...targetNames) {
            return targetNames.reduce((target, targetName) => target || this.findTarget(targetName) || this.findLegacyTarget(targetName), undefined);
        }
        findAll(...targetNames) {
            return targetNames.reduce((targets, targetName) => [
                ...targets,
                ...this.findAllTargets(targetName),
                ...this.findAllLegacyTargets(targetName),
            ], []);
        }
        findTarget(targetName) {
            const selector = this.getSelectorForTargetName(targetName);
            return this.scope.findElement(selector);
        }
        findAllTargets(targetName) {
            const selector = this.getSelectorForTargetName(targetName);
            return this.scope.findAllElements(selector);
        }
        getSelectorForTargetName(targetName) {
            const attributeName = this.schema.targetAttributeForScope(this.identifier);
            return attributeValueContainsToken(attributeName, targetName);
        }
        findLegacyTarget(targetName) {
            const selector = this.getLegacySelectorForTargetName(targetName);
            return this.deprecate(this.scope.findElement(selector), targetName);
        }
        findAllLegacyTargets(targetName) {
            const selector = this.getLegacySelectorForTargetName(targetName);
            return this.scope.findAllElements(selector).map((element) => this.deprecate(element, targetName));
        }
        getLegacySelectorForTargetName(targetName) {
            const targetDescriptor = `${this.identifier}.${targetName}`;
            return attributeValueContainsToken(this.schema.targetAttribute, targetDescriptor);
        }
        deprecate(element, targetName) {
            if (element) {
                const { identifier } = this;
                const attributeName = this.schema.targetAttribute;
                const revisedAttributeName = this.schema.targetAttributeForScope(identifier);
                this.guide.warn(element, `target:${targetName}`, `Please replace ${attributeName}="${identifier}.${targetName}" with ${revisedAttributeName}="${targetName}". ` +
                    `The ${attributeName} attribute is deprecated and will be removed in a future version of Stimulus.`);
            }
            return element;
        }
        get guide() {
            return this.scope.guide;
        }
    }

    class OutletSet {
        constructor(scope, controllerElement) {
            this.scope = scope;
            this.controllerElement = controllerElement;
        }
        get element() {
            return this.scope.element;
        }
        get identifier() {
            return this.scope.identifier;
        }
        get schema() {
            return this.scope.schema;
        }
        has(outletName) {
            return this.find(outletName) != null;
        }
        find(...outletNames) {
            return outletNames.reduce((outlet, outletName) => outlet || this.findOutlet(outletName), undefined);
        }
        findAll(...outletNames) {
            return outletNames.reduce((outlets, outletName) => [...outlets, ...this.findAllOutlets(outletName)], []);
        }
        getSelectorForOutletName(outletName) {
            const attributeName = this.schema.outletAttributeForScope(this.identifier, outletName);
            return this.controllerElement.getAttribute(attributeName);
        }
        findOutlet(outletName) {
            const selector = this.getSelectorForOutletName(outletName);
            if (selector)
                return this.findElement(selector, outletName);
        }
        findAllOutlets(outletName) {
            const selector = this.getSelectorForOutletName(outletName);
            return selector ? this.findAllElements(selector, outletName) : [];
        }
        findElement(selector, outletName) {
            const elements = this.scope.queryElements(selector);
            return elements.filter((element) => this.matchesElement(element, selector, outletName))[0];
        }
        findAllElements(selector, outletName) {
            const elements = this.scope.queryElements(selector);
            return elements.filter((element) => this.matchesElement(element, selector, outletName));
        }
        matchesElement(element, selector, outletName) {
            const controllerAttribute = element.getAttribute(this.scope.schema.controllerAttribute) || "";
            return element.matches(selector) && controllerAttribute.split(" ").includes(outletName);
        }
    }

    class Scope {
        constructor(schema, element, identifier, logger) {
            this.targets = new TargetSet(this);
            this.classes = new ClassMap(this);
            this.data = new DataMap(this);
            this.containsElement = (element) => {
                return element.closest(this.controllerSelector) === this.element;
            };
            this.schema = schema;
            this.element = element;
            this.identifier = identifier;
            this.guide = new Guide(logger);
            this.outlets = new OutletSet(this.documentScope, element);
        }
        findElement(selector) {
            return this.element.matches(selector) ? this.element : this.queryElements(selector).find(this.containsElement);
        }
        findAllElements(selector) {
            return [
                ...(this.element.matches(selector) ? [this.element] : []),
                ...this.queryElements(selector).filter(this.containsElement),
            ];
        }
        queryElements(selector) {
            return Array.from(this.element.querySelectorAll(selector));
        }
        get controllerSelector() {
            return attributeValueContainsToken(this.schema.controllerAttribute, this.identifier);
        }
        get isDocumentScope() {
            return this.element === document.documentElement;
        }
        get documentScope() {
            return this.isDocumentScope
                ? this
                : new Scope(this.schema, document.documentElement, this.identifier, this.guide.logger);
        }
    }

    class ScopeObserver {
        constructor(element, schema, delegate) {
            this.element = element;
            this.schema = schema;
            this.delegate = delegate;
            this.valueListObserver = new ValueListObserver(this.element, this.controllerAttribute, this);
            this.scopesByIdentifierByElement = new WeakMap();
            this.scopeReferenceCounts = new WeakMap();
        }
        start() {
            this.valueListObserver.start();
        }
        stop() {
            this.valueListObserver.stop();
        }
        get controllerAttribute() {
            return this.schema.controllerAttribute;
        }
        parseValueForToken(token) {
            const { element, content: identifier } = token;
            return this.parseValueForElementAndIdentifier(element, identifier);
        }
        parseValueForElementAndIdentifier(element, identifier) {
            const scopesByIdentifier = this.fetchScopesByIdentifierForElement(element);
            let scope = scopesByIdentifier.get(identifier);
            if (!scope) {
                scope = this.delegate.createScopeForElementAndIdentifier(element, identifier);
                scopesByIdentifier.set(identifier, scope);
            }
            return scope;
        }
        elementMatchedValue(element, value) {
            const referenceCount = (this.scopeReferenceCounts.get(value) || 0) + 1;
            this.scopeReferenceCounts.set(value, referenceCount);
            if (referenceCount == 1) {
                this.delegate.scopeConnected(value);
            }
        }
        elementUnmatchedValue(element, value) {
            const referenceCount = this.scopeReferenceCounts.get(value);
            if (referenceCount) {
                this.scopeReferenceCounts.set(value, referenceCount - 1);
                if (referenceCount == 1) {
                    this.delegate.scopeDisconnected(value);
                }
            }
        }
        fetchScopesByIdentifierForElement(element) {
            let scopesByIdentifier = this.scopesByIdentifierByElement.get(element);
            if (!scopesByIdentifier) {
                scopesByIdentifier = new Map();
                this.scopesByIdentifierByElement.set(element, scopesByIdentifier);
            }
            return scopesByIdentifier;
        }
    }

    class Router {
        constructor(application) {
            this.application = application;
            this.scopeObserver = new ScopeObserver(this.element, this.schema, this);
            this.scopesByIdentifier = new Multimap();
            this.modulesByIdentifier = new Map();
        }
        get element() {
            return this.application.element;
        }
        get schema() {
            return this.application.schema;
        }
        get logger() {
            return this.application.logger;
        }
        get controllerAttribute() {
            return this.schema.controllerAttribute;
        }
        get modules() {
            return Array.from(this.modulesByIdentifier.values());
        }
        get contexts() {
            return this.modules.reduce((contexts, module) => contexts.concat(module.contexts), []);
        }
        start() {
            this.scopeObserver.start();
        }
        stop() {
            this.scopeObserver.stop();
        }
        loadDefinition(definition) {
            this.unloadIdentifier(definition.identifier);
            const module = new Module(this.application, definition);
            this.connectModule(module);
            const afterLoad = definition.controllerConstructor.afterLoad;
            if (afterLoad) {
                afterLoad.call(definition.controllerConstructor, definition.identifier, this.application);
            }
        }
        unloadIdentifier(identifier) {
            const module = this.modulesByIdentifier.get(identifier);
            if (module) {
                this.disconnectModule(module);
            }
        }
        getContextForElementAndIdentifier(element, identifier) {
            const module = this.modulesByIdentifier.get(identifier);
            if (module) {
                return module.contexts.find((context) => context.element == element);
            }
        }
        proposeToConnectScopeForElementAndIdentifier(element, identifier) {
            const scope = this.scopeObserver.parseValueForElementAndIdentifier(element, identifier);
            if (scope) {
                this.scopeObserver.elementMatchedValue(scope.element, scope);
            }
            else {
                console.error(`Couldn't find or create scope for identifier: "${identifier}" and element:`, element);
            }
        }
        handleError(error, message, detail) {
            this.application.handleError(error, message, detail);
        }
        createScopeForElementAndIdentifier(element, identifier) {
            return new Scope(this.schema, element, identifier, this.logger);
        }
        scopeConnected(scope) {
            this.scopesByIdentifier.add(scope.identifier, scope);
            const module = this.modulesByIdentifier.get(scope.identifier);
            if (module) {
                module.connectContextForScope(scope);
            }
        }
        scopeDisconnected(scope) {
            this.scopesByIdentifier.delete(scope.identifier, scope);
            const module = this.modulesByIdentifier.get(scope.identifier);
            if (module) {
                module.disconnectContextForScope(scope);
            }
        }
        connectModule(module) {
            this.modulesByIdentifier.set(module.identifier, module);
            const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
            scopes.forEach((scope) => module.connectContextForScope(scope));
        }
        disconnectModule(module) {
            this.modulesByIdentifier.delete(module.identifier);
            const scopes = this.scopesByIdentifier.getValuesForKey(module.identifier);
            scopes.forEach((scope) => module.disconnectContextForScope(scope));
        }
    }

    const defaultSchema = {
        controllerAttribute: "data-controller",
        actionAttribute: "data-action",
        targetAttribute: "data-target",
        targetAttributeForScope: (identifier) => `data-${identifier}-target`,
        outletAttributeForScope: (identifier, outlet) => `data-${identifier}-${outlet}-outlet`,
        keyMappings: Object.assign(Object.assign({ enter: "Enter", tab: "Tab", esc: "Escape", space: " ", up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", home: "Home", end: "End", page_up: "PageUp", page_down: "PageDown" }, objectFromEntries("abcdefghijklmnopqrstuvwxyz".split("").map((c) => [c, c]))), objectFromEntries("0123456789".split("").map((n) => [n, n]))),
    };
    function objectFromEntries(array) {
        return array.reduce((memo, [k, v]) => (Object.assign(Object.assign({}, memo), { [k]: v })), {});
    }

    class Application {
        constructor(element = document.documentElement, schema = defaultSchema) {
            this.logger = console;
            this.debug = false;
            this.logDebugActivity = (identifier, functionName, detail = {}) => {
                if (this.debug) {
                    this.logFormattedMessage(identifier, functionName, detail);
                }
            };
            this.element = element;
            this.schema = schema;
            this.dispatcher = new Dispatcher(this);
            this.router = new Router(this);
            this.actionDescriptorFilters = Object.assign({}, defaultActionDescriptorFilters);
        }
        static start(element, schema) {
            const application = new this(element, schema);
            application.start();
            return application;
        }
        async start() {
            await domReady();
            this.logDebugActivity("application", "starting");
            this.dispatcher.start();
            this.router.start();
            this.logDebugActivity("application", "start");
        }
        stop() {
            this.logDebugActivity("application", "stopping");
            this.dispatcher.stop();
            this.router.stop();
            this.logDebugActivity("application", "stop");
        }
        register(identifier, controllerConstructor) {
            this.load({ identifier, controllerConstructor });
        }
        registerActionOption(name, filter) {
            this.actionDescriptorFilters[name] = filter;
        }
        load(head, ...rest) {
            const definitions = Array.isArray(head) ? head : [head, ...rest];
            definitions.forEach((definition) => {
                if (definition.controllerConstructor.shouldLoad) {
                    this.router.loadDefinition(definition);
                }
            });
        }
        unload(head, ...rest) {
            const identifiers = Array.isArray(head) ? head : [head, ...rest];
            identifiers.forEach((identifier) => this.router.unloadIdentifier(identifier));
        }
        get controllers() {
            return this.router.contexts.map((context) => context.controller);
        }
        getControllerForElementAndIdentifier(element, identifier) {
            const context = this.router.getContextForElementAndIdentifier(element, identifier);
            return context ? context.controller : null;
        }
        handleError(error, message, detail) {
            var _a;
            this.logger.error(`%s\n\n%o\n\n%o`, message, error, detail);
            (_a = window.onerror) === null || _a === void 0 ? void 0 : _a.call(window, message, "", 0, 0, error);
        }
        logFormattedMessage(identifier, functionName, detail = {}) {
            detail = Object.assign({ application: this }, detail);
            this.logger.groupCollapsed(`${identifier} #${functionName}`);
            this.logger.log("details:", Object.assign({}, detail));
            this.logger.groupEnd();
        }
    }
    function domReady() {
        return new Promise((resolve) => {
            if (document.readyState == "loading") {
                document.addEventListener("DOMContentLoaded", () => resolve());
            }
            else {
                resolve();
            }
        });
    }

    function ClassPropertiesBlessing(constructor) {
        const classes = readInheritableStaticArrayValues(constructor, "classes");
        return classes.reduce((properties, classDefinition) => {
            return Object.assign(properties, propertiesForClassDefinition(classDefinition));
        }, {});
    }
    function propertiesForClassDefinition(key) {
        return {
            [`${key}Class`]: {
                get() {
                    const { classes } = this;
                    if (classes.has(key)) {
                        return classes.get(key);
                    }
                    else {
                        const attribute = classes.getAttributeName(key);
                        throw new Error(`Missing attribute "${attribute}"`);
                    }
                },
            },
            [`${key}Classes`]: {
                get() {
                    return this.classes.getAll(key);
                },
            },
            [`has${capitalize(key)}Class`]: {
                get() {
                    return this.classes.has(key);
                },
            },
        };
    }

    function OutletPropertiesBlessing(constructor) {
        const outlets = readInheritableStaticArrayValues(constructor, "outlets");
        return outlets.reduce((properties, outletDefinition) => {
            return Object.assign(properties, propertiesForOutletDefinition(outletDefinition));
        }, {});
    }
    function getOutletController(controller, element, identifier) {
        return controller.application.getControllerForElementAndIdentifier(element, identifier);
    }
    function getControllerAndEnsureConnectedScope(controller, element, outletName) {
        let outletController = getOutletController(controller, element, outletName);
        if (outletController)
            return outletController;
        controller.application.router.proposeToConnectScopeForElementAndIdentifier(element, outletName);
        outletController = getOutletController(controller, element, outletName);
        if (outletController)
            return outletController;
    }
    function propertiesForOutletDefinition(name) {
        const camelizedName = namespaceCamelize(name);
        return {
            [`${camelizedName}Outlet`]: {
                get() {
                    const outletElement = this.outlets.find(name);
                    const selector = this.outlets.getSelectorForOutletName(name);
                    if (outletElement) {
                        const outletController = getControllerAndEnsureConnectedScope(this, outletElement, name);
                        if (outletController)
                            return outletController;
                        throw new Error(`The provided outlet element is missing an outlet controller "${name}" instance for host controller "${this.identifier}"`);
                    }
                    throw new Error(`Missing outlet element "${name}" for host controller "${this.identifier}". Stimulus couldn't find a matching outlet element using selector "${selector}".`);
                },
            },
            [`${camelizedName}Outlets`]: {
                get() {
                    const outlets = this.outlets.findAll(name);
                    if (outlets.length > 0) {
                        return outlets
                            .map((outletElement) => {
                            const outletController = getControllerAndEnsureConnectedScope(this, outletElement, name);
                            if (outletController)
                                return outletController;
                            console.warn(`The provided outlet element is missing an outlet controller "${name}" instance for host controller "${this.identifier}"`, outletElement);
                        })
                            .filter((controller) => controller);
                    }
                    return [];
                },
            },
            [`${camelizedName}OutletElement`]: {
                get() {
                    const outletElement = this.outlets.find(name);
                    const selector = this.outlets.getSelectorForOutletName(name);
                    if (outletElement) {
                        return outletElement;
                    }
                    else {
                        throw new Error(`Missing outlet element "${name}" for host controller "${this.identifier}". Stimulus couldn't find a matching outlet element using selector "${selector}".`);
                    }
                },
            },
            [`${camelizedName}OutletElements`]: {
                get() {
                    return this.outlets.findAll(name);
                },
            },
            [`has${capitalize(camelizedName)}Outlet`]: {
                get() {
                    return this.outlets.has(name);
                },
            },
        };
    }

    function TargetPropertiesBlessing(constructor) {
        const targets = readInheritableStaticArrayValues(constructor, "targets");
        return targets.reduce((properties, targetDefinition) => {
            return Object.assign(properties, propertiesForTargetDefinition(targetDefinition));
        }, {});
    }
    function propertiesForTargetDefinition(name) {
        return {
            [`${name}Target`]: {
                get() {
                    const target = this.targets.find(name);
                    if (target) {
                        return target;
                    }
                    else {
                        throw new Error(`Missing target element "${name}" for "${this.identifier}" controller`);
                    }
                },
            },
            [`${name}Targets`]: {
                get() {
                    return this.targets.findAll(name);
                },
            },
            [`has${capitalize(name)}Target`]: {
                get() {
                    return this.targets.has(name);
                },
            },
        };
    }

    function ValuePropertiesBlessing(constructor) {
        const valueDefinitionPairs = readInheritableStaticObjectPairs(constructor, "values");
        const propertyDescriptorMap = {
            valueDescriptorMap: {
                get() {
                    return valueDefinitionPairs.reduce((result, valueDefinitionPair) => {
                        const valueDescriptor = parseValueDefinitionPair(valueDefinitionPair, this.identifier);
                        const attributeName = this.data.getAttributeNameForKey(valueDescriptor.key);
                        return Object.assign(result, { [attributeName]: valueDescriptor });
                    }, {});
                },
            },
        };
        return valueDefinitionPairs.reduce((properties, valueDefinitionPair) => {
            return Object.assign(properties, propertiesForValueDefinitionPair(valueDefinitionPair));
        }, propertyDescriptorMap);
    }
    function propertiesForValueDefinitionPair(valueDefinitionPair, controller) {
        const definition = parseValueDefinitionPair(valueDefinitionPair, controller);
        const { key, name, reader: read, writer: write } = definition;
        return {
            [name]: {
                get() {
                    const value = this.data.get(key);
                    if (value !== null) {
                        return read(value);
                    }
                    else {
                        return definition.defaultValue;
                    }
                },
                set(value) {
                    if (value === undefined) {
                        this.data.delete(key);
                    }
                    else {
                        this.data.set(key, write(value));
                    }
                },
            },
            [`has${capitalize(name)}`]: {
                get() {
                    return this.data.has(key) || definition.hasCustomDefaultValue;
                },
            },
        };
    }
    function parseValueDefinitionPair([token, typeDefinition], controller) {
        return valueDescriptorForTokenAndTypeDefinition({
            controller,
            token,
            typeDefinition,
        });
    }
    function parseValueTypeConstant(constant) {
        switch (constant) {
            case Array:
                return "array";
            case Boolean:
                return "boolean";
            case Number:
                return "number";
            case Object:
                return "object";
            case String:
                return "string";
        }
    }
    function parseValueTypeDefault(defaultValue) {
        switch (typeof defaultValue) {
            case "boolean":
                return "boolean";
            case "number":
                return "number";
            case "string":
                return "string";
        }
        if (Array.isArray(defaultValue))
            return "array";
        if (Object.prototype.toString.call(defaultValue) === "[object Object]")
            return "object";
    }
    function parseValueTypeObject(payload) {
        const { controller, token, typeObject } = payload;
        const hasType = isSomething(typeObject.type);
        const hasDefault = isSomething(typeObject.default);
        const fullObject = hasType && hasDefault;
        const onlyType = hasType && !hasDefault;
        const onlyDefault = !hasType && hasDefault;
        const typeFromObject = parseValueTypeConstant(typeObject.type);
        const typeFromDefaultValue = parseValueTypeDefault(payload.typeObject.default);
        if (onlyType)
            return typeFromObject;
        if (onlyDefault)
            return typeFromDefaultValue;
        if (typeFromObject !== typeFromDefaultValue) {
            const propertyPath = controller ? `${controller}.${token}` : token;
            throw new Error(`The specified default value for the Stimulus Value "${propertyPath}" must match the defined type "${typeFromObject}". The provided default value of "${typeObject.default}" is of type "${typeFromDefaultValue}".`);
        }
        if (fullObject)
            return typeFromObject;
    }
    function parseValueTypeDefinition(payload) {
        const { controller, token, typeDefinition } = payload;
        const typeObject = { controller, token, typeObject: typeDefinition };
        const typeFromObject = parseValueTypeObject(typeObject);
        const typeFromDefaultValue = parseValueTypeDefault(typeDefinition);
        const typeFromConstant = parseValueTypeConstant(typeDefinition);
        const type = typeFromObject || typeFromDefaultValue || typeFromConstant;
        if (type)
            return type;
        const propertyPath = controller ? `${controller}.${typeDefinition}` : token;
        throw new Error(`Unknown value type "${propertyPath}" for "${token}" value`);
    }
    function defaultValueForDefinition(typeDefinition) {
        const constant = parseValueTypeConstant(typeDefinition);
        if (constant)
            return defaultValuesByType[constant];
        const hasDefault = hasProperty(typeDefinition, "default");
        const hasType = hasProperty(typeDefinition, "type");
        const typeObject = typeDefinition;
        if (hasDefault)
            return typeObject.default;
        if (hasType) {
            const { type } = typeObject;
            const constantFromType = parseValueTypeConstant(type);
            if (constantFromType)
                return defaultValuesByType[constantFromType];
        }
        return typeDefinition;
    }
    function valueDescriptorForTokenAndTypeDefinition(payload) {
        const { token, typeDefinition } = payload;
        const key = `${dasherize(token)}-value`;
        const type = parseValueTypeDefinition(payload);
        return {
            type,
            key,
            name: camelize(key),
            get defaultValue() {
                return defaultValueForDefinition(typeDefinition);
            },
            get hasCustomDefaultValue() {
                return parseValueTypeDefault(typeDefinition) !== undefined;
            },
            reader: readers[type],
            writer: writers[type] || writers.default,
        };
    }
    const defaultValuesByType = {
        get array() {
            return [];
        },
        boolean: false,
        number: 0,
        get object() {
            return {};
        },
        string: "",
    };
    const readers = {
        array(value) {
            const array = JSON.parse(value);
            if (!Array.isArray(array)) {
                throw new TypeError(`expected value of type "array" but instead got value "${value}" of type "${parseValueTypeDefault(array)}"`);
            }
            return array;
        },
        boolean(value) {
            return !(value == "0" || String(value).toLowerCase() == "false");
        },
        number(value) {
            return Number(value.replace(/_/g, ""));
        },
        object(value) {
            const object = JSON.parse(value);
            if (object === null || typeof object != "object" || Array.isArray(object)) {
                throw new TypeError(`expected value of type "object" but instead got value "${value}" of type "${parseValueTypeDefault(object)}"`);
            }
            return object;
        },
        string(value) {
            return value;
        },
    };
    const writers = {
        default: writeString,
        array: writeJSON,
        object: writeJSON,
    };
    function writeJSON(value) {
        return JSON.stringify(value);
    }
    function writeString(value) {
        return `${value}`;
    }

    class Controller {
        constructor(context) {
            this.context = context;
        }
        static get shouldLoad() {
            return true;
        }
        static afterLoad(_identifier, _application) {
            return;
        }
        get application() {
            return this.context.application;
        }
        get scope() {
            return this.context.scope;
        }
        get element() {
            return this.scope.element;
        }
        get identifier() {
            return this.scope.identifier;
        }
        get targets() {
            return this.scope.targets;
        }
        get outlets() {
            return this.scope.outlets;
        }
        get classes() {
            return this.scope.classes;
        }
        get data() {
            return this.scope.data;
        }
        initialize() {
        }
        connect() {
        }
        disconnect() {
        }
        dispatch(eventName, { target = this.element, detail = {}, prefix = this.identifier, bubbles = true, cancelable = true, } = {}) {
            const type = prefix ? `${prefix}:${eventName}` : eventName;
            const event = new CustomEvent(type, { detail, bubbles, cancelable });
            target.dispatchEvent(event);
            return event;
        }
    }
    Controller.blessings = [
        ClassPropertiesBlessing,
        TargetPropertiesBlessing,
        ValuePropertiesBlessing,
        OutletPropertiesBlessing,
    ];
    Controller.targets = [];
    Controller.outlets = [];
    Controller.values = {};

    /**
     * Gets the current language attribute from the HTML document
     * @returns {string|null} The language code from the html lang attribute
     */

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
    const renderHTML = (data) => {
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
              setTimeout(() => { scrollToTop(); }, 50);
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
    };

    /**
     * Smoothly scrolls to a specific element on the page
     * @param {Object} data - Configuration object
     * @param {string} data.scroll - CSS selector of the element to scroll to
     */
    function moveScrollToAnchor(data) {
      if (data.scroll) {
        setTimeout(() => {
          document.querySelector(data.scroll).scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    }

    /**
     * Smoothly scrolls to the top of the page
     * @param {Object} data - Configuration object
     * @param {boolean} data.scrollTop - If true, executes the scroll to top
     */
    function moveScrollToTop(data) {
      if (data.scrollTop) {
        setTimeout(() => {
          document.querySelector("body").scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    }

    /*
       Imports
     */

    /*
       Variables
     */
    const connectionModal = document.querySelector("#no-connection");
    const nameStyleHideNoConnection = "no-connection--hide";
    const nameStyleShowNoConnection = "no-connection--show";

    // Global configuration - can be modified from other files
    window.webSocketConfig = window.webSocketConfig || {
      host: location.host,
      protocol: 'https:' == document.location.protocol ? 'wss' : 'ws'
    };

    // Reconnection configuration
    const RECONNECT_INTERVAL = 3000; // 3 seconds
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_BACKOFF_MULTIPLIER = 1.5;

    let reconnectAttempts = 0;
    let reconnectTimeout = null;
    let isReconnecting = false;
    let isConnecting = false; // Prevent multiple simultaneous connections

    // Message queue for handling messages before connection is ready
    let messageQueue = [];
    let isWebSocketReady = false;

    /*
       FUNCTIONS
     */

    /**
     * Save the current room to localStorage if not already set
     * @return {void}
     */
    function saveRoomToLocalStorage() {
        const existingRoom = localStorage.getItem('room');
        if (existingRoom !== null) {
            return;
        }
        const htmlElement = document.querySelector('html');
        const roomValue = htmlElement.dataset.room;
        localStorage.setItem('room', roomValue);
    }

    /**
     * Show no connection modal when the connection is lost
     * @return {void}
     */
    function showNoConnectionModal() {
      if (connectionModal) {
        connectionModal.classList.remove(nameStyleHideNoConnection);
        connectionModal.classList.add(nameStyleShowNoConnection);
      }
    }

    /**
     * Hide no connection modal when the connection is restored
     * @return {void}
     */
    function hideNoConnectionModal() {
      if (connectionModal) {
        connectionModal.classList.remove(nameStyleShowNoConnection);
        connectionModal.classList.add(nameStyleHideNoConnection);
      }
    }

    /**
     * Calculate reconnection delay with exponential backoff
     * @param {number} attempt - Current attempt number
     * @return {number} Delay in milliseconds
     */
    function getReconnectDelay(attempt) {
      return Math.min(RECONNECT_INTERVAL * Math.pow(RECONNECT_BACKOFF_MULTIPLIER, attempt), 30000);
    }

    /**
     * Reset reconnection state
     * @return {void}
     */
    function resetReconnectState() {
      reconnectAttempts = 0;
      isReconnecting = false;
      isConnecting = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    }

    /**
     * Process queued messages when connection is ready
     * @return {void}
     */
    function processQueuedMessages() {
      if (messageQueue.length > 0) {
        console.log(`Processing ${messageQueue.length} queued messages...`);
        const messages = [...messageQueue];
        messageQueue = []; // Clear queue

        messages.forEach(data => {
          sendDataDirectly(data);
        });
      }
    }

    /**
     * Send data directly without queuing
     * @param {Object} data - Data object to send
     * @param {WebSocket} webSocket - WebSocket instance to use
     * @return {void}
     */
    function sendDataDirectly(data, webSocket = window.myWebSocket) {
      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        // Add language
        data.lang = document.querySelector("html").getAttribute("lang");
        // Add room
        data.room = localStorage.getItem("room");
        // Send
        webSocket.send(JSON.stringify(data));
        console.debug("Data sent to WebSocket server:", data);
      } else {
        console.warn("WebSocket is not connected. Message not sent:", data);
      }
    }

    /**
     * Connect to WebSockets server (SocialNetworkConsumer)
     * @param {string} url - WebSockets server url
     * @return {WebSocket}
     */
    function connect(url = null) {
      // Prevent multiple simultaneous connections
      if (isConnecting) {
        console.log("Connection already in progress, skipping duplicate connection attempt...");
        return window.myWebSocket;
      }

      // Check if there's already an active connection
      if (window.myWebSocket && window.myWebSocket.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected, skipping duplicate connection attempt...");
        return window.myWebSocket;
      }

      isConnecting = true;
      console.log("Connecting to WebSockets server...");

      // Ensure room is saved to localStorage before connecting
      saveRoomToLocalStorage();

      // Build URL after ensuring room is saved
      if (!url) {
        const room = localStorage.getItem('room');
        url = `${window.webSocketConfig.protocol}://${window.webSocketConfig.host}/ws/liveview/${room}/`;
      }

      // Clean up existing connection if any
      if (window.myWebSocket) {
        console.log("Closing existing WebSocket connection...");
        window.myWebSocket.close();
        window.myWebSocket = null;
      }

      try {
        window.myWebSocket = new WebSocket(url);

        // Reset connecting flag when connection opens successfully
        window.myWebSocket.addEventListener('open', () => {
          isConnecting = false;
          console.log("WebSocket connection established successfully");
        });

        // Reset connecting flag when connection fails
        window.myWebSocket.addEventListener('error', () => {
          isConnecting = false;
          console.error("WebSocket connection failed");
        });

        // Reset connecting flag when connection closes
        window.myWebSocket.addEventListener('close', () => {
          isConnecting = false;
          console.log("WebSocket connection closed");
        });

        startEvents(window.myWebSocket);
        return window.myWebSocket;
      } catch (error) {
        isConnecting = false;
        console.error("Error creating WebSocket connection:", error);
        throw error;
      }
    }

    /**
     * Send data to WebSockets server with message queue support
     * @param {Object} data - Data object to send
     * @param {WebSocket} webSocket - WebSocket instance to use
     * @return {void}
     */
    function sendData(data, webSocket = window.myWebSocket) {
        if (isWebSocketReady && webSocket && webSocket.readyState === WebSocket.OPEN) {
            sendDataDirectly(data, webSocket);
        } else {
            console.debug("WebSocket not ready. Queuing message:", data.function || 'unknown function');
            messageQueue.push(data);

            // Optionally attempt to reconnect if connection is lost
            if (!isConnecting && (!webSocket || webSocket.readyState === WebSocket.CLOSED)) {
                console.log("Attempting to reconnect due to queued message...");
                attemptReconnect();
            }
        }
    }

    /**
     * Attempt to reconnect to WebSockets server with exponential backoff
     * @return {void}
     */
    function attemptReconnect() {
      if (isReconnecting || isConnecting || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error("Maximum reconnection attempts reached. Please refresh the page.");
        }
        return;
      }

      isReconnecting = true;
      reconnectAttempts++;

      const delay = getReconnectDelay(reconnectAttempts - 1);
      console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);

      reconnectTimeout = setTimeout(() => {
        try {
          connect();
        } catch (error) {
          console.error("Reconnection failed:", error);
          isReconnecting = false;
          // Try again if we haven't reached max attempts
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            attemptReconnect();
          }
        }
      }, delay);
    }

    /*
        EVENTS
    */

    /**
     * Set up WebSocket event listeners
     * @param {WebSocket} webSocket - WebSocket instance
     * @return {void}
     */
    function startEvents(webSocket = window.myWebSocket) {
      if (!webSocket) {
        console.error("WebSocket instance is required");
        return;
      }

      // Prevent adding duplicate event listeners
      if (webSocket._eventsConfigured) {
        console.log("Events already configured for this WebSocket instance");
        return;
      }

      // Event when a new message is received by WebSockets
      webSocket.addEventListener("message", (event) => {
        try {
          // Parse the data received
          const data = JSON.parse(event.data);

          // Renders the HTML received from the Consumer (only if target is defined)
          if (data.target) {
            renderHTML(data);
          }
          moveScrollToAnchor(data);
          moveScrollToTop(data);
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      });

      webSocket.addEventListener("open", () => {
        resetReconnectState();
        hideNoConnectionModal();
        isWebSocketReady = true;
        console.log("Connected to WebSockets server");

        // Process any queued messages
        processQueuedMessages();
      });

      function handleConnectionLoss() {
        isWebSocketReady = false;
        showNoConnectionModal();
        console.log("Connection lost with WebSockets server");
        attemptReconnect();
      }

      // Connection loss events
      webSocket.addEventListener("error", (event) => {
        console.error("WebSocket error:", event);
        handleConnectionLoss();
      });

      webSocket.addEventListener("close", (event) => {
        isWebSocketReady = false;
        console.log("WebSocket closed:", event.code, event.reason);
        // Only attempt reconnect if it wasn't a normal closure
        if (event.code !== 1000) {
          handleConnectionLoss();
        }
      });

      // Mark this WebSocket instance as having events configured
      webSocket._eventsConfigured = true;

      // Network connectivity events (only add once)
      if (!window._networkEventsConfigured) {
        window.addEventListener('offline', () => {
          isWebSocketReady = false;
          showNoConnectionModal();
          console.log("Network went offline");
        });

        window.addEventListener('online', () => {
          console.log("Network came back online");
          if (window.myWebSocket && window.myWebSocket.readyState !== WebSocket.OPEN) {
            attemptReconnect();
          } else {
            hideNoConnectionModal();
          }
        });

        window._networkEventsConfigured = true;
      }
    }

    class pageController extends Controller {

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

    /*
       INITIALIZATION
     */

    // WebSocket connection
    connect();
    startEvents();

    // Stimulus
    window.Stimulus = Application.start();

    // Register all controllers
    Stimulus.register("page", pageController);

})();
//# sourceMappingURL=liveview.js.map
