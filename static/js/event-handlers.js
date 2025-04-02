// js/event-handlers.js
import * as state from './state.js';
import * as config from './config.js';
import * as dom from './dom-references.js';
import * as actions from './actions.js';
import { redrawCanvas } from './drawing.js';
// Assuming geometry.js exports projectPointOntoLineSegment if it's not part of actions
import { getMousePos, snapToGrid, distance, projectPointOntoLineSegment } from './geometry.js';

// setupEventListeners and other handlers remain the same...


// ... handleMouseDown, handleMouseMove, handleMouseUp remain the same ...


function handleMouseOut(event) {
     // If currently building a route and mouse leaves, cancel the route build
    if (state.currentMode === 'route' && state.isDrawing && state.routeBuildPoints.length > 0) {
        state.resetRouteBuild();
        state.resetInteractionState(); // Clear drawing flags etc.
        dom.updateStatus("Route drawing cancelled (mouse left canvas).");
        redrawCanvas();
        return;
    }

    // If actively drawing/moving/resizing when mouse leaves, treat it as a mouseup to finalize/cancel
    if (state.isDrawing && state.isEditMode && state.currentMode !== 'route') {
         console.log("Mouse left canvas during drawing action, finalizing/cancelling.");
         handleMouseUp(event); // Pass the original mouseout event
    } else if (state.isEditMode) { // <-- Add this check
        // Only reset temporary mouse position state if not drawing AND in edit mode
        // It's only relevant for potential hover effects or previews in edit mode.
        state.setCurrentMousePos(undefined, undefined);
        // Optionally redraw if needed to clear any hover effects not handled elsewhere
        // redrawCanvas();
    }
    // If not in edit mode, do nothing on mouse out when not drawing.
}

// Ensure projectPointOntoLineSegment is available (placeholder/import)
// function projectPointOntoLineSegment(px, py, ax, ay, bx, by) { ... }

// --- The rest of the file ---
export function setupEventListeners() {
    dom.modeRadios.forEach(radio => radio.addEventListener('change', handleModeChange));
    dom.controls.querySelectorAll('button[data-mode]').forEach(button => {
        button.addEventListener('click', handleToolButtonClick);
    });
    dom.canvas.addEventListener('mousedown', handleMouseDown);
    dom.canvas.addEventListener('mousemove', handleMouseMove);
    dom.canvas.addEventListener('mouseup', handleMouseUp);
    dom.canvas.addEventListener('mouseout', handleMouseOut);
    // Add dynamic import for save if not already present
    if (dom.saveBtn) {
        dom.saveBtn.addEventListener('click', () => import('./api.js').then(api => api.saveElements()).catch(err => console.error("Error saving:", err)));
    } else {
        console.warn("Save button not found in DOM references.");
    }
}

// --- Specific Event Handlers ---

function handleModeChange(event) {
    state.setIsEditMode(event.target.value === 'edit');
    state.resetRouteBuild(); // Cancel route build on mode change
    state.setSelectedElement(null);
    state.resetInteractionState(); // Resets isDrawing, startX/Y, currentMouseX/Y etc.
    dom.updateToolVisibility();
    dom.updateStatus(state.isEditMode ? "Mode: Edit. Tool: Select." : "Mode: View. Click element for info.");
    if (state.isEditMode) { state.setCurrentMode('select'); dom.setActiveButton(dom.selectBtn); }
    else { state.setCurrentMode(null); dom.setActiveButton(null); }
    dom.updateCursor();
    redrawCanvas();
}

function handleToolButtonClick(event) {
    if (!state.isEditMode) return;
    const button = event.currentTarget;
    const newMode = button.getAttribute('data-mode');

    // Reset builds if switching tools
    if (state.routeBuildPoints.length > 0 && newMode !== 'route') {
        state.resetRouteBuild(); dom.updateStatus("Route drawing cancelled.");
    }

    dom.setActiveButton(button);
    state.setCurrentMode(newMode);
    state.setSelectedElement(null);
    state.resetInteractionState(); // Resets isDrawing, startX/Y, currentMouseX/Y etc.
    dom.updateStatus(`Mode: Edit. Tool: ${state.currentMode}.`);
    dom.updateCursor();
    redrawCanvas();
}

function handleMouseDown(event) {
    const pos = getMousePos(event, dom.canvas);
    // Update mouse pos state immediately IF in edit mode, as it's used for drawing/interaction feedback
    if (state.isEditMode) {
        state.setCurrentMousePos(pos.x, pos.y);
    }


    if (!state.isEditMode) {
        const targetElement = actions.findElementAt(pos.x, pos.y);
        actions.loadInformation(targetElement?.id); // Show info panel in view mode
        return;
    }

    // --- DELETE MODE ---
    if (state.currentMode === 'delete') {
        const targetElement = actions.findElementAt(pos.x, pos.y);
        if (targetElement) {
            actions.deleteElement(targetElement);
            redrawCanvas(); // Redraw after deletion
        }
        return; // Exit early for delete mode
    }

    // --- ROUTE MODE (Multi-Point Click) ---
    if (state.currentMode === 'route') {
        const snappedPos = snapToGrid(pos.x, pos.y, config.GRID_SIZE_PIXELS); // Snap route points
        if (state.routeBuildPoints.length === 0) { // Start new route
            state.addRouteBuildPoint(snappedPos);
            state.setIsDrawing(true); // Indicate route building is active for preview line
            state.setStartPoint(snappedPos.x, snappedPos.y);
            dom.updateStatus("Route: Placed start. Click for next point (or near door to finish).");
        } else { // Add intermediate point or finish near a door
            if (actions.isPointNearDoor(snappedPos.x, snappedPos.y, config.doorEndSnapTolerance)) {
                state.addRouteBuildPoint(snappedPos); // Add the final point near the door
                actions.createRoute(state.routeBuildPoints); // Create the route element
                state.resetRouteBuild(); // Clear points
                state.setIsDrawing(false); // Stop drawing the preview line
                dom.updateStatus("Route created.");
            } else {
                state.addRouteBuildPoint(snappedPos); // Add intermediate point
                dom.updateStatus(`Route: Placed point ${state.routeBuildPoints.length}. Click next (or near door to finish).`);
            }
        }
        redrawCanvas(); // Redraw to show new point and updated preview line
        return; // Exit early for route mode clicks
    }

    // --- SELECT/DRAW/MOVE/RESIZE MODES ---
    // Clear previous interaction state (isMoving, draggingHandle etc.)
    // We keep currentMousePos as it was just set if in edit mode
    const currentX = state.currentMouseX; // Preserve current mouse pos across reset
    const currentY = state.currentMouseY;
    state.resetInteractionState();
    state.setCurrentMousePos(currentX, currentY); // Restore mouse pos after reset


    if (state.currentMode === 'select') {
        if (state.selectedElement) { // If an element is already selected, check for handle interaction
            const handle = actions.findHandleAt(pos.x, pos.y, state.selectedElement);
            if (handle) {
                state.setDraggingHandle(handle);
                state.setIsDrawing(true); // Use isDrawing to signify active drag/resize
                state.setStartPoint(pos.x, pos.y); // Store initial click point for reference during drag
                dom.updateStatus(`Resizing element ${state.selectedElement.id}...`);
                dom.updateCursor(); // Update cursor for resize handle
                // redrawCanvas(); // Redraw will happen on mouse move
                return;
            }
        }
        // If no handle clicked, check for clicking a new element
        const targetElement = actions.findElementAt(pos.x, pos.y);
        if (targetElement) {
            state.setSelectedElement(targetElement);
            state.setIsDrawing(true); // Use isDrawing to signify active drag/move
            state.setIsMoving(true);
            state.setStartPoint(pos.x, pos.y); // Store initial click point

            // Calculate offset relative to element's reference point(s)
            if (targetElement.points) { // Polygon
                state.setMoveOffset(pos.x - targetElement.points[0].x, pos.y - targetElement.points[0].y);
            } else if (targetElement.wallId) { // Wall Child (door/window) - Use distanceAlongWall for move logic
                 state.setMoveOffset(pos.x, pos.y); // Store click pos, calculation happens in moveElement
            } else if (targetElement.x !== undefined && targetElement.y !== undefined) { // Rectangle (Gear)
                 state.setMoveOffset(pos.x - targetElement.x, pos.y - targetElement.y);
            } else if (targetElement.x1 !== undefined) { // Wall
                 state.setMoveOffset(pos.x - targetElement.x1, pos.y - targetElement.y1);
            }

            dom.updateStatus(`Selected element ${targetElement.id}. Drag to move or use handles to resize.`);
            dom.updateCursor(); // Update cursor for move
            redrawCanvas(); // Redraw to show selection and handles
            return;
        }
        // Clicked on empty space in select mode
        state.setSelectedElement(null);
        dom.updateStatus("Mode: Edit. Tool: Select.");
        redrawCanvas(); // Redraw to clear selection

    } else if (state.currentMode === 'window' || state.currentMode === 'door') {
        // --- Start Drawing Door/Window on Wall ---
        const wallInfo = actions.findWallNearPoint(pos.x, pos.y, config.wallPlacementTolerance);
        if (wallInfo) {
            // Project click onto the wall line segment
            const projection = projectPointOntoLineSegment(pos.x, pos.y, wallInfo.wall.x1, wallInfo.wall.y1, wallInfo.wall.x2, wallInfo.wall.y2);
            if (projection.onSegment) {
                const startDist = distance(wallInfo.wall.x1, wallInfo.wall.y1, projection.x, projection.y);
                state.setIsDrawing(true); // Start drawing
                state.setDrawingOnWallTarget({ wall: wallInfo.wall, startDist: startDist });
                state.setStartPoint(projection.x, projection.y); // Store projected start
                state.setCurrentWallDrawPos({ wall: wallInfo.wall, startDist: startDist, endDist: startDist, length: 0 }); // Initialize preview state
                dom.updateStatus(`Drawing ${state.currentMode} on wall ${wallInfo.wall.id}. Drag along wall.`);
                redrawCanvas(); // Show initial preview (zero length)
            } else {
                dom.updateStatus(`Start point must be directly on the wall segment.`);
            }
        } else {
            dom.updateStatus(`Click near a wall to start drawing a ${state.currentMode}.`);
        }

    } else { // --- Start Drawing Wall, Machine, Closet, Gear ---
        state.setIsDrawing(true);
        let startX = pos.x;
        let startY = pos.y;
        if (state.currentMode === 'wall') { // Snap wall start point
            const snapped = snapToGrid(pos.x, pos.y, config.GRID_SIZE_PIXELS);
            startX = snapped.x;
            startY = snapped.y;
        }
        state.setStartPoint(startX, startY); // Store the (potentially snapped) start point
        // currentMousePos is already set at the beginning of handleMouseDown
        dom.updateStatus(`Drawing ${state.currentMode}... Drag to set endpoint.`);
        redrawCanvas(); // Initial redraw necessary to show the first frame of the preview
    }
}

function handleMouseMove(event) {
    if (!state.isEditMode) return; // Ignore if not in edit mode
    const pos = getMousePos(event, dom.canvas);
    state.setCurrentMousePos(pos.x, pos.y); // *** Update current mouse position state ***

    // --- Route building preview ---
    if (state.currentMode === 'route' && state.isDrawing && state.routeBuildPoints.length > 0) {
        redrawCanvas();
        return; // Don't handle other drawing types if building route
    }

    // Only proceed if a drawing/dragging action is active
    if (!state.isDrawing) {
        // Optionally update cursor based on hover over elements/handles here
        return;
    }


    // --- Handle specific drawing/dragging types ---
    console.log(state.currentMode)
    if (state.isMoving && state.selectedElement) {
        actions.moveElement(state.selectedElement, pos.x, pos.y, state.moveOffsetX, state.moveOffsetY);
        redrawCanvas(); // Redraw to show moved element
    } else if (state.draggingHandle && state.selectedElement) {
        actions.resizeElement(pos.x, pos.y, state.selectedElement, state.draggingHandle);
        redrawCanvas(); // Redraw to show resized element
    } else if (state.drawingOnWallTarget) {
        // --- Dragging new Door/Window Along Wall ---
        const wall = state.drawingOnWallTarget.wall;
        const projection = projectPointOntoLineSegment(pos.x, pos.y, wall.x1, wall.y1, wall.x2, wall.y2);
        let currentDist = distance(wall.x1, wall.y1, projection.x, projection.y);
        const wallLen = distance(wall.x1, wall.y1, wall.x2, wall.y2);
        currentDist = Math.max(0, Math.min(wallLen, currentDist)); // Clamp distance

        state.setCurrentWallDrawPos({
            wall: wall,
            startDist: state.drawingOnWallTarget.startDist,
            endDist: currentDist,
            length: Math.abs(currentDist - state.drawingOnWallTarget.startDist)
        });
        console.log(state.currentWallDrawPos.length)
        dom.updateStatus(`Drawing ${state.currentMode}. Length: ${(state.currentWallDrawPos.length / config.PIXELS_PER_METER).toFixed(1)}m`);
        redrawCanvas(); // Redraw to show the temporary door/window preview
    } else if (state.isDrawing && state.currentMode && !['select', 'route', 'delete', 'window', 'door'].includes(state.currentMode)) {
        // --- Standard Drawing Preview (Wall, Machine, Closet, Gear) ---
        redrawCanvas();
        const currentWidth = Math.abs(pos.x - state.startX);
        const currentHeight = Math.abs(pos.y - state.startY);
        if (state.currentMode === 'wall') {
           const len = distance(state.startX, state.startY, state.currentMouseX, state.currentMouseY); // Use state.currentMouseXY which is just pos.x/y here
           dom.updateStatus(`Drawing ${state.currentMode}... Length: ${(len / config.PIXELS_PER_METER).toFixed(1)}m`);
        } else {
           dom.updateStatus(`Drawing ${state.currentMode}... W: ${(currentWidth / config.PIXELS_PER_METER).toFixed(1)}m, H: ${(currentHeight / config.PIXELS_PER_METER).toFixed(1)}m`);
        }
    } else console.log(`Unknown mode ${state.currentMode}`)
}


function handleMouseUp(event) {
    if (!state.isEditMode) return; // Ignore if not in edit mode

    // Don't finalize anything here for route or delete mode
    if (state.currentMode === 'route' || state.currentMode === 'delete') {
        // For route mode, we might want to reset isDrawing if it was true,
        // but the main logic finishes on the click in handleMouseDown
        if (state.currentMode === 'route') {
           // state.setIsDrawing(false); // Already done in handleMouseDown when route is finished
        }
        return;
    }


    const pos = getMousePos(event, dom.canvas);
    state.setCurrentMousePos(pos.x, pos.y); // Update final position

    // --- Finalize Actions Based on Interaction State ---
    if (state.isMoving && state.selectedElement) {
        dom.updateStatus(`Moved element ${state.selectedElement.id}.`);
    } else if (state.draggingHandle && state.selectedElement) {
        dom.updateStatus(`Resized element ${state.selectedElement.id}.`);
    } else if (state.drawingOnWallTarget && state.currentWallDrawPos) {
        // --- Finalize Door/Window Placement ---
        const wall = state.drawingOnWallTarget.wall;
        const startDist = state.drawingOnWallTarget.startDist;
        const endDist = state.currentWallDrawPos.endDist;
        const finalStartDist = Math.min(startDist, endDist);
        const finalEndDist = Math.max(startDist, endDist);
        const newLength = finalEndDist - finalStartDist;

        // Use minimum length from config, ensure config is imported and value exists
        const minLenPixels = config.minDoorWindowLength || 5;

        if (newLength >= minLenPixels) {
            if (!actions.checkWallChildOverlap(wall, null, finalStartDist, newLength)) {
                const drawnForward = endDist >= startDist;
                actions.createWallChild(state.currentMode, wall, finalStartDist, newLength, drawnForward);
                dom.updateStatus(`Created ${state.currentMode}.`);
            } else {
                dom.updateStatus(`Cannot place ${state.currentMode}: Overlaps with existing element.`);
            }
        } else {
             // Provide length in meters for user feedback
            const minLenMeters = (minLenPixels / (config.PIXELS_PER_METER || 50)).toFixed(1);
            dom.updateStatus(`Cannot place ${state.currentMode}: Minimum length is ${minLenMeters}m.`);
        }
    } else if (state.isDrawing && state.currentMode && !['select', 'route', 'delete', 'window', 'door'].includes(state.currentMode)) {
        // --- Finalize standard drawing (Wall, Machine, Closet, Gear) ---
        let endX = state.currentMouseX; // Use final mouse position from state
        let endY = state.currentMouseY;
        const startX = state.startX;
        const startY = state.startY;

        const minSizePixels = config.minElementSize || 3; // Use config value

        if (distance(startX, startY, endX, endY) < minSizePixels) {
            dom.updateStatus(`Drawing cancelled (too small).`);
        } else {
            if (state.currentMode === 'wall') {
                 const snappedEnd = snapToGrid(endX, endY, config.GRID_SIZE_PIXELS);
                 endX = snappedEnd.x;
                 endY = snappedEnd.y;
                 if (startX !== endX || startY !== endY) {
                     actions.createWall(startX, startY, endX, endY);
                     dom.updateStatus(`Created Wall.`);
                 } else {
                     dom.updateStatus(`Drawing cancelled (start/end points identical after snap).`);
                 }
            } else if (state.currentMode === 'machine' || state.currentMode === 'closet') {
                actions.createPolygonElementFromRect(state.currentMode, startX, startY, endX, endY);
                 dom.updateStatus(`Created ${state.currentMode}.`);
            } else if (state.currentMode === 'gear') {
                actions.createRectElement(state.currentMode, startX, startY, endX, endY);
                 dom.updateStatus(`Created ${state.currentMode}.`);
            }
        }
    }

    // --- Cleanup ---
    state.resetInteractionState(); // Reset flags: isDrawing, isMoving, etc. AND mouse positions
    dom.updateCursor(); // Reset cursor to default for the current tool
    redrawCanvas(); // Final redraw
}