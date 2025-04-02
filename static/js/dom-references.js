// js/dom-references.js
import * as state from './state.js'; // Import state statically

// Instead of querying at module load:

const canvas = getCanvas();
const ctx = canvas?.getContext('2d');
const controls = document.getElementById('controls');
const saveBtn = document.getElementById('saveBtn');
const scaleInfo = document.getElementById('scaleInfo');
const gridInfo = document.getElementById('gridInfo');
const statusInfo = document.getElementById('statusInfo');
const modeRadios = document.querySelectorAll('input[name="mode"]');
const selectBtn = document.getElementById('selectBtn');
const deleteBtn = document.getElementById('deleteBtn');
// Add other button references if needed directly

// Create getter functions:
export function getCanvas() {
    return document.getElementById('floorPlanCanvas');
}

// Update checkDOMReady:
export function checkDOMReady() {
    
    if (!canvas || !ctx || !controls || !saveBtn || !scaleInfo || !gridInfo || !statusInfo || modeRadios.length === 0 || !selectBtn || !deleteBtn) {
        console.error("Initialization failed: Missing required HTML elements.");
        return false;
    }
    return true;
}

// Helper to update status bar
export function updateStatus(message) {
    if (statusInfo) {
        statusInfo.textContent = message;
    }
    // console.log("Status:", message); // Optional debug logging
}

// Helper to update cursor style
export function updateCursor() {
    if (!canvas) return;

    if (!state.isEditMode) canvas.style.cursor = 'pointer';
    else if (state.currentMode === 'select') canvas.style.cursor = 'default';
    else if (state.currentMode === 'delete') canvas.style.cursor = 'crosshair'; // Consider 'not-allowed' or custom
    else if (state.currentMode === 'route') canvas.style.cursor = 'pointer';
    else if (state.currentMode === 'window' || state.currentMode === 'door') canvas.style.cursor = 'copy';
    else canvas.style.cursor = 'crosshair';
}

// Helper to set active button visual state
export function setActiveButton(activeButton) {
     if (!controls) return;
     controls.querySelectorAll('button[data-mode]').forEach(button => {
        button.classList.remove('active');
    });
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Helper to update tool visibility based on mode
export function updateToolVisibility() {
    if (!controls) return;
    controls.querySelectorAll('button[data-mode]').forEach(btn => btn.disabled = !state.isEditMode);
    if (selectBtn) selectBtn.disabled = !state.isEditMode;
    // Ensure select is active if switching TO edit mode
    if (state.isEditMode && state.currentMode === 'select' && selectBtn) {
        setActiveButton(selectBtn);
    }
}