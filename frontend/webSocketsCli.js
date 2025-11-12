/*
   Imports
 */
import {
  renderHTML,
  moveScrollToAnchor,
  moveScrollToTop
} from "./mixins/miscellaneous.js";

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
export function connect(url = null) {
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
export function sendData(data, webSocket = window.myWebSocket) {
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
export function startEvents(webSocket = window.myWebSocket) {
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

/**
 * Disconnect and cleanup WebSocket connection
 * @return {void}
 */
export function disconnect() {
  console.log("Disconnecting WebSocket...");

  resetReconnectState();
  isWebSocketReady = false;

  if (window.myWebSocket) {
    window.myWebSocket.close(1000, "Manual disconnect");
    window.myWebSocket = null;
  }

  hideNoConnectionModal();

  // Clear any pending messages
  if (messageQueue.length > 0) {
    console.log(`Clearing ${messageQueue.length} queued messages due to disconnect`);
    messageQueue = [];
  }
}

/**
 * Get current WebSocket connection status
 * @return {string} Connection status
 */
export function getConnectionStatus() {
  if (!window.myWebSocket) {
    return "disconnected";
  }

  switch (window.myWebSocket.readyState) {
    case WebSocket.CONNECTING:
      return "connecting";
    case WebSocket.OPEN:
      return isWebSocketReady ? "connected" : "connecting";
    case WebSocket.CLOSING:
      return "closing";
    case WebSocket.CLOSED:
      return "disconnected";
    default:
      return "unknown";
  }
}

/**
 * Get number of queued messages (for debugging)
 * @return {number} Number of messages in queue
 */
export function getQueueLength() {
  return messageQueue.length;
}

/**
 * Clear message queue (for debugging/testing)
 * @return {void}
 */
export function clearQueue() {
  const queueLength = messageQueue.length;
  messageQueue = [];
  console.log(`Cleared ${queueLength} messages from queue`);
}
