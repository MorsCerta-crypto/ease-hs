// js/main.js
import * as config from './config.js';
import * as state from './state.js'; // Import state to potentially initialize
import * as dom from './dom-references.js';
import { setupEventListeners } from './event-handlers.js';
import { redrawCanvas } from './drawing.js';
import { loadElements } from './api.js';

function init() {
    if (!dom.checkDOMReady()) {
        return; // Stop initialization if essential elements are missing
    }

    // Set initial display values from config
    if (dom.scaleInfo) dom.scaleInfo.textContent = config.PIXELS_PER_METER;
    if (dom.gridInfo) dom.gridInfo.textContent = config.GRID_SIZE_PIXELS;
    if (dom.floorplanId) dom.floorplanId.textContent = config.FLOORPLAN_ID;

    loadElements(config.FLOORPLAN_ID);
    // Setup main event listeners
    setupEventListeners();

    // Set initial state and UI
    dom.setActiveButton(dom.selectBtn); // Default tool
    dom.updateToolVisibility();
    dom.updateCursor();
    dom.updateStatus("Mode: Edit. Tool: Select.");

    // Initial draw
    redrawCanvas();

    console.log("Floor Plan Engine Initialized.");
    // Optionally load saved data here:
    // import('./api.js').then(api => api.loadElements());
}

init()
