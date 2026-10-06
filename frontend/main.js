import { Application } from '@hotwired/stimulus'
import { connect, startEvents } from './webSocketsCli.js';
import { initHistory } from './mixins/history.js';
import pageController from "./controllers/page_controller.js";

/*
   INITIALIZATION
 */

// Navigation history (back/forward support)
initHistory();

// WebSocket connection
connect();
startEvents();

// Stimulus
window.Stimulus = Application.start();

// Register all controllers
Stimulus.register("page", pageController);
