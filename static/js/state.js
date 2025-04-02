// js/state.js

// Export state variables directly. Modules importing them can modify them.
export let currentMode = 'select';
export let elements = [];
export let nextElementId = 1;
export let isDrawing = false; // General flag: drawing new shape, moving, resizing
export let startX = 0;
export let startY = 0;
// --- START: Added current mouse position state ---
export let currentMouseX = undefined; // Store the latest mouse X
export let currentMouseY = undefined; // Store the latest mouse Y
// --- END: Added current mouse position state ---
export let isEditMode = true;
export let selectedElement = null;
export let draggingHandle = null; // Handle object: { id: 'p1'/'br'/'corner0'/'gapEnd', type: 'corner'/'edge'/'midpoint', index: 0 }
export let isMoving = false;
export let moveOffsetX = 0;
export let moveOffsetY = 0;
export let drawingOnWallTarget = null; // { wall, startDist }
export let currentWallDrawPos = null; // { wall, startDist, endDist, length }
export let routeBuildPoints = []; // For multi-segment routes

// Functions to modify state (optional, but can enforce structure)
export function setCurrentMode(mode) { currentMode = mode; }
export function setElements(newElements) { elements = newElements; }
export function addElement(element) { elements.push(element); }
export function removeElementById(id) {
    const initialLength = elements.length;
    elements = elements.filter(el => el.id !== id);
    // Also remove children if a wall is deleted
    if (elements.find(el => el.id === id && el.type === 'wall')) {
        elements = elements.filter(el => el.wallId !== id);
    }
    return elements.length < initialLength; // Return true if something was removed
}
export function removeElementsByWallId(wallId) {
     elements = elements.filter(el => el.wallId !== wallId);
}
export function setNextElementId(id) { nextElementId = id; }
export function setIsDrawing(drawing) { isDrawing = drawing; }
export function setStartPoint(x, y) { startX = x; startY = y; }
// --- START: Added current mouse position setter ---
export function setCurrentMousePos(x, y) {
    currentMouseX = x;
    currentMouseY = y;
}
// --- END: Added current mouse position setter ---
export function setIsEditMode(edit) { isEditMode = edit; }
export function setSelectedElement(element) { selectedElement = element; }
export function setDraggingHandle(handle) { draggingHandle = handle; }
export function setIsMoving(moving) { isMoving = moving; }
export function setMoveOffset(x, y) { moveOffsetX = x; moveOffsetY = y; }
export function setDrawingOnWallTarget(target) { drawingOnWallTarget = target; }
export function setCurrentWallDrawPos(pos) { currentWallDrawPos = pos; }
export function setRouteBuildPoints(points) { routeBuildPoints = points; }
export function addRouteBuildPoint(point) { routeBuildPoints.push(point); }
export function resetRouteBuild() { routeBuildPoints = []; }

// Resets temporary state related to user interactions (drawing, moving, resizing)
export function resetInteractionState() {
    isDrawing = false;
    isMoving = false;
    draggingHandle = null;
    drawingOnWallTarget = null;
    currentWallDrawPos = null;
    startX = 0; // Reset start points as well
    startY = 0;
    // --- START: Reset current mouse position ---
    currentMouseX = undefined;
    currentMouseY = undefined;
    // --- END: Reset current mouse position ---
    // Note: Keep routeBuildPoints until explicitly reset or completed/cancelled elsewhere
    // Note: Keep selectedElement until explicitly changed or deselected
}