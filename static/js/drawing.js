// js/drawing.js
import * as config from './config.js';
import * as state from './state.js'; // Assumes state includes isDrawing, currentMouseX, currentMouseY
import * as dom from './dom-references.js';
import { distance, getPointAlongLine } from './geometry.js';
import { getResizeHandles } from './actions.js'; // Need this to draw handles

const { ctx } = dom; // Get context reference

// --- Main Redraw Function ---
export function redrawCanvas() {
    if (!dom.canvas || !ctx) return;
    ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
    ctx.fillStyle = "#FFF"; ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);
    drawGrid();

    // Draw elements (order matters for overlap)
    state.elements.filter(el => el.type === 'wall').forEach(el => drawElement(el, el === state.selectedElement));
    state.elements.filter(el => ['window', 'door'].includes(el.type)).forEach(el => {
        const parentWall = state.elements.find(w => w.id === el.wallId);
        drawElement(el, el === state.selectedElement, parentWall);
    });
    state.elements.filter(el => !['wall', 'window', 'door'].includes(el.type)).forEach(el => drawElement(el, el === state.selectedElement));

    // --- START: Added Temporary Drawing Preview ---
    // Draw temporary shape preview while drawing (wall, rect, poly)
    if (state.isDrawing && ['wall', 'gear', 'machine', 'closet'].includes(state.currentMode) && state.currentMouseX !== undefined && state.currentMouseY !== undefined) {
        drawTemporaryShapePreview(state.startX, state.startY, state.currentMouseX, state.currentMouseY, state.currentMode);
    }
    // --- END: Added Temporary Drawing Preview ---


    // Draw temporary route build lines
    if (state.currentMode === 'route' && state.routeBuildPoints.length > 0 && state.currentMouseX !== undefined && state.currentMouseY !== undefined) {
        // Pass the current mouse position for the final segment preview
        drawTemporaryRoute(state.routeBuildPoints, {x: state.currentMouseX, y: state.currentMouseY});
    }
    // Draw temporary door/window placement preview
    if (state.currentWallDrawPos) {
        drawTemporaryWallElement(state.currentWallDrawPos);
    }

    // Draw handles if element selected in edit mode
    if (state.selectedElement && state.isEditMode) {
        drawResizeHandles(state.selectedElement);
    }
}

// --- Individual Element Drawing Functions ---

function drawElement(element, isSelected, parentWall = null) {
    const baseLineWidth = (element.type === 'wall') ? (element.thickness || config.WALL_THICKNESS) : (element.type === 'route' ? 3 : 2);
    ctx.lineWidth = isSelected && state.isEditMode ? baseLineWidth + 1 : baseLineWidth;
    ctx.strokeStyle = isSelected && state.isEditMode ? config.selectionColor : element.color;
    ctx.fillStyle = element.color;
    const wasDashed = ctx.getLineDash().length > 0;
    if (isSelected && state.isEditMode) { ctx.setLineDash([6, 4]); }
    else if (element.type === 'route') { ctx.setLineDash([5, 5]); }
    else { ctx.setLineDash([]); }

    // Delegate to specific drawing functions
    if (element.type === 'wall') { drawWallWithGaps(element, isSelected); drawDimension(element.x1, element.y1, element.x2, element.y2); }
    else if (['door', 'window'].includes(element.type)) { if (parentWall) drawWallChildElement(element, parentWall, isSelected); else console.warn(`Parent wall ${element.wallId} not found for element ${element.id}`); }
    else if (element.type === 'route') { drawRouteElement(element); }
    else if (element.points) { drawPolygonElement(element); } // Machine, Closet
    else { drawRectElement(element); } // Gear

    if ((isSelected && state.isEditMode) || element.type === 'route') { ctx.setLineDash(wasDashed ? [5, 5] : []); }
    ctx.lineWidth = 1;
}

function drawGrid() {
    if (!dom.canvas || !ctx) return;
    ctx.beginPath(); ctx.strokeStyle = config.gridColor; ctx.lineWidth = 0.5;
    for (let x = 0; x <= dom.canvas.width; x += config.GRID_SIZE_PIXELS) { ctx.moveTo(x, 0); ctx.lineTo(x, dom.canvas.height); }
    for (let y = 0; y <= dom.canvas.height; y += config.GRID_SIZE_PIXELS) { ctx.moveTo(0, y); ctx.lineTo(dom.canvas.width, y); }
    ctx.stroke(); ctx.lineWidth = 1;
}

function drawWallWithGaps(wall, isSelected) {
    const children = state.elements.filter(el => ['door', 'window'].includes(el.type) && el.wallId === wall.id)
                           .sort((a, b) => a.distanceAlongWall - b.distanceAlongWall);
    ctx.lineWidth = wall.thickness || config.WALL_THICKNESS;
    ctx.strokeStyle = isSelected && state.isEditMode ? config.selectionColor : wall.color;
    ctx.lineCap = 'butt'; ctx.beginPath();
    let currentDist = 0; const wallLen = distance(wall.x1, wall.y1, wall.x2, wall.y2); const wallP1 = { x: wall.x1, y: wall.y1 };
    for (const child of children) {
        if (child.distanceAlongWall > currentDist) {
            const segStart = getPointAlongLine(wallP1, {x: wall.x2, y: wall.y2}, currentDist);
            const segEnd = getPointAlongLine(wallP1, {x: wall.x2, y: wall.y2}, child.distanceAlongWall);
            ctx.moveTo(segStart.x, segStart.y); ctx.lineTo(segEnd.x, segEnd.y);
        }
        currentDist = child.distanceAlongWall + child.length;
    }
    if (currentDist < wallLen) {
         const segStart = getPointAlongLine(wallP1, {x: wall.x2, y: wall.y2}, currentDist);
         ctx.moveTo(segStart.x, segStart.y); ctx.lineTo(wall.x2, wall.y2);
    }
    ctx.stroke(); ctx.lineCap = 'round';
}

function drawWallChildElement(element, wall, isSelected) {
    const wallLen = distance(wall.x1, wall.y1, wall.x2, wall.y2); if (wallLen === 0) return;
    const startDist = Math.max(0, Math.min(wallLen, element.distanceAlongWall));
    const endDist = Math.max(0, Math.min(wallLen, element.distanceAlongWall + element.length));
    const actualLength = endDist - startDist; if (actualLength <= 0) return;
    const p1 = getPointAlongLine({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2}, startDist);
    const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
    const thickness = wall.thickness || config.WALL_THICKNESS;

    ctx.save(); ctx.translate(p1.x, p1.y); ctx.rotate(angle);
    ctx.lineWidth = 2; ctx.strokeStyle = isSelected && state.isEditMode ? config.selectionColor : element.color; ctx.fillStyle = element.color;

    if (element.type === 'window') {
        ctx.beginPath();
        // Draw the two parallel lines representing the window pane within the wall thickness
        ctx.moveTo(0, -thickness / 2 + 1); ctx.lineTo(actualLength, -thickness / 2 + 1);
        ctx.moveTo(0, thickness / 2 - 1); ctx.lineTo(actualLength, thickness / 2 - 1);
        // Maybe add a center line too?
        // ctx.moveTo(0, 0); ctx.lineTo(actualLength, 0);
        ctx.stroke();
    } else if (element.type === 'door') {
         const doorSwingRadius = actualLength;
         // Hinge point is at the start point (p1, locally 0,0 after translate/rotate)
         const hingeX = 0;
         const hingeY = 0;
         // Door panel line
         ctx.beginPath();
         ctx.moveTo(hingeX, -thickness / 2 + 1); // Inner wall side
         ctx.lineTo(hingeX, thickness / 2 - 1);  // Outer wall side
         ctx.stroke(); // Draw door frame/stop

         // Swing arc and door panel representation
         const startAngle = 0; // Along the wall direction
         // Use swingDirection: 1 for positive angle (typically counter-clockwise in canvas coords), -1 for negative
         const endAngle = (Math.PI / 2) * element.swingDirection;
         const sweepClockwise = element.swingDirection < 0; // Arc direction depends on swing
         ctx.beginPath();
         ctx.arc(hingeX, hingeY, doorSwingRadius, startAngle, endAngle, sweepClockwise);
         // Line representing the open door panel
         const doorEndX = hingeX + doorSwingRadius * Math.cos(endAngle);
         const doorEndY = hingeY + doorSwingRadius * Math.sin(endAngle);
         ctx.moveTo(hingeX, hingeY); // From hinge center
         ctx.lineTo(doorEndX, doorEndY);
         ctx.stroke();
    }

     // Draw dimension
     const midX_local = actualLength / 2; const midY_local = 0; const dimOffsetY = -15; const dimText = (actualLength / config.PIXELS_PER_METER).toFixed(1) + 'm';
     ctx.fillStyle = config.dimensionColor; ctx.font = `${config.dimensionFontSize}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
     ctx.fillText(dimText, midX_local, midY_local + dimOffsetY);
    ctx.restore();
}

function drawTemporaryWallElement(posInfo) {
    if (!posInfo || !posInfo.wall) return;
    const wall = posInfo.wall; const wallLen = distance(wall.x1, wall.y1, wall.x2, wall.y2); if (wallLen === 0) return;
    const startDist = Math.max(0, Math.min(wallLen, posInfo.startDist));
    const endDist = Math.max(0, Math.min(wallLen, posInfo.endDist));
    const actualLength = Math.abs(endDist - startDist); if (actualLength <= 0) return;
    // Ensure p1 is always the point closer to the wall start
    const p1 = getPointAlongLine({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2}, Math.min(startDist, endDist));
    const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
    const thickness = wall.thickness || config.WALL_THICKNESS;
    // Determine swing direction based on whether the end point is further along the wall than the start
    const swingDirection = endDist >= startDist ? 1 : -1;

    ctx.save(); ctx.translate(p1.x, p1.y); ctx.rotate(angle);
    ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.strokeStyle = config.elementColors[state.currentMode] || config.elementColors.default; ctx.fillStyle = config.elementColors[state.currentMode] || config.elementColors.default;
    ctx.setLineDash([4, 4]); // Make preview dashed

     if (state.currentMode === 'window') {
        ctx.beginPath();
        ctx.moveTo(0, -thickness / 2 + 1); ctx.lineTo(actualLength, -thickness / 2 + 1);
        ctx.moveTo(0, thickness / 2 - 1); ctx.lineTo(actualLength, thickness / 2 - 1);
        ctx.stroke();
     }
     else if (state.currentMode === 'door') {
         const doorSwingRadius = actualLength;
         const hingeX = 0; const hingeY = 0;
         ctx.beginPath(); ctx.moveTo(hingeX, -thickness / 2 + 1); ctx.lineTo(hingeX, thickness / 2 - 1); ctx.stroke(); // Frame/Stop preview
         const startAngle = 0; const endAngle = (Math.PI / 2) * swingDirection; const sweepClockwise = swingDirection < 0;
         ctx.beginPath(); ctx.arc(hingeX, hingeY, doorSwingRadius, startAngle, endAngle, sweepClockwise);
         const doorEndX = hingeX + doorSwingRadius * Math.cos(endAngle); const doorEndY = hingeY + doorSwingRadius * Math.sin(endAngle);
         ctx.moveTo(hingeX, hingeY); ctx.lineTo(doorEndX, doorEndY); ctx.stroke();
     }
    ctx.restore(); ctx.globalAlpha = 1.0; ctx.setLineDash([]); // Restore defaults
}

function drawRouteElement(element) {
    if (!element.points || element.points.length < 2) return;
    ctx.beginPath(); ctx.moveTo(element.points[0].x, element.points[0].y);
    for (let i = 1; i < element.points.length; i++) {
        ctx.lineTo(element.points[i].x, element.points[i].y);
        // Draw arrowhead at the end of each segment (except the very start)
        drawArrowhead(element.points[i-1], element.points[i]);
    }
    ctx.stroke();
}

function drawPolygonElement(element) {
    if (!element.points || element.points.length < 3) return;
    ctx.beginPath(); ctx.moveTo(element.points[0].x, element.points[0].y);
    for (let i = 1; i < element.points.length; i++) { ctx.lineTo(element.points[i].x, element.points[i].y); }
    ctx.closePath(); ctx.stroke();
    // Optionally add fill for polygons
    // ctx.globalAlpha = 0.1; // Slight fill
    // ctx.fill();
    // ctx.globalAlpha = 1.0;
}

function drawRectElement(element) {
     ctx.strokeRect(element.x, element.y, element.width, element.height);
     drawElementSymbol(element);
     // Draw dimensions only if space allows
     if (element.width > config.dimensionThreshold) drawDimension(element.x, element.y, element.x + element.width, element.y);
     if (element.height > config.dimensionThreshold) drawDimension(element.x + element.width, element.y, element.x + element.width, element.y + element.height);
}

// --- START: New Temporary Shape Preview Function ---
/**
 * Draws a temporary preview of a shape (line, rectangle) while the user is drawing it.
 * @param {number} startX - The starting X coordinate.
 * @param {number} startY - The starting Y coordinate.
 * @param {number} currentX - The current mouse X coordinate.
 * @param {number} currentY - The current mouse Y coordinate.
 * @param {string} type - The type of element being drawn ('wall', 'gear', etc.).
 */
function drawTemporaryShapePreview(startX, startY, currentX, currentY, type) {
    ctx.save(); // Isolate temporary drawing settings
    ctx.globalAlpha = 0.7; // Make it semi-transparent
    ctx.setLineDash([4, 4]); // Use dashed lines for preview
    ctx.strokeStyle = config.elementColors[type] || config.elementColors.default; // Use the element's intended color

    if (type === 'wall') {
        ctx.lineWidth = config.WALL_THICKNESS;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
    } else if (['gear', 'machine', 'closet'].includes(type)) { // Treat machine/closet like rectangles for preview
        ctx.lineWidth = 2;
        const width = currentX - startX;
        const height = currentY - startY;
        ctx.strokeRect(startX, startY, width, height);
    }
    // Add more types here if needed (e.g., circle preview)

    ctx.restore(); // Restore original drawing settings (alpha, line dash, lineWidth)
}
// --- END: New Temporary Shape Preview Function ---


function drawTemporaryRoute(points, currentMousePos) {
    if (!points || points.length === 0) return;
    ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = config.elementColors.route; ctx.lineWidth = 3; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) { ctx.lineTo(points[i].x, points[i].y); }
    // Draw line to current mouse position if provided
    if (currentMousePos) {
        ctx.lineTo(currentMousePos.x, currentMousePos.y);
    }
    ctx.stroke();
    // Draw small circles at each established point
    ctx.fillStyle = config.elementColors.route; ctx.setLineDash([]); // Solid for points
    points.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
}

function drawElementSymbol(element) { // Only for Gear now, potentially others later
     if (element.type === 'gear' && element.width > 5 && element.height > 5) {
         const centerX = element.x + element.width / 2;
         const centerY = element.y + element.height / 2;
         const radius = Math.min(element.width, element.height) / 3; // Adjusted radius slightly
         ctx.fillStyle = element.color; // Use element's color
         ctx.beginPath();
         // Simple circle symbol for gear
         ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
         // Could add more detail like crosshairs if needed
         // ctx.moveTo(centerX - radius / 2, centerY); ctx.lineTo(centerX + radius / 2, centerY);
         // ctx.moveTo(centerX, centerY - radius / 2); ctx.lineTo(centerX, centerY + radius / 2);
         ctx.fill(); // Use fill instead of stroke for solid symbol
     }
     // Add symbols for 'machine', 'closet' etc. if desired
}

function drawDimension(x1, y1, x2, y2) {
    const distPixels = distance(x1, y1, x2, y2);
    if (distPixels < (config.dimensionThreshold || 10)) return; // Don't draw tiny dimensions

    const distMeters = (distPixels / config.PIXELS_PER_METER).toFixed(1);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Offset perpendicular to the line
    const offsetDist = config.dimensionOffset || 15;
    const offsetX = Math.sin(angle) * -offsetDist; // Use sin for perpendicular X offset
    const offsetY = Math.cos(angle) * offsetDist;  // Use cos for perpendicular Y offset

    ctx.save();
    ctx.translate(midX + offsetX, midY + offsetY); // Move to position
    // Optional: Rotate text to align with the line, adjust as needed
    // ctx.rotate(angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle);
    ctx.fillStyle = config.dimensionColor;
    ctx.font = `${config.dimensionFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'; // Center text vertically too
    ctx.fillText(`${distMeters}m`, 0, 0);
    ctx.restore();

    // Optional: Draw small tick marks or extension lines
    // ... (code for ticks would go here if desired)
}


function drawArrowhead(p1, p2) {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const arrowLen = config.routeArrowSize || 8; // Use config or default
    const arrowWidth = config.routeArrowWidth || 4; // Use config or default for width

    ctx.save();
    ctx.beginPath();
    ctx.translate(p2.x, p2.y); // Move to the endpoint
    ctx.rotate(angle); // Rotate context to align with the line segment

    // Draw the arrowhead shape pointing backwards from the endpoint
    ctx.moveTo(0, 0); // Tip of the arrow at the endpoint
    ctx.lineTo(-arrowLen, -arrowWidth / 2);
    ctx.lineTo(-arrowLen, arrowWidth / 2);
    ctx.closePath(); // Close the path to form a triangle

    ctx.fillStyle = config.elementColors.route; // Use route color
    ctx.fill(); // Fill the arrowhead shape
    ctx.restore();
}

function drawResizeHandles(element) {
    const handles = getResizeHandles(element); // Call the function from actions.js
    if (!handles) return;
    ctx.lineWidth = 1; ctx.setLineDash([]);
    handles.forEach(handle => {
        let fillColor = config.handleColor; // Default handle color
        // Optional: Different colors for different handle types (example)
        if (handle.type === 'corner') fillColor = config.handleCornerColor || '#FFFF00'; // Yellow for corners
        else if (handle.type === 'edge') fillColor = config.handleEdgeColor || '#00FFFF';   // Cyan for edges
        else if (handle.type === 'midpoint') fillColor = config.handleMidpointColor || '#FF00FF'; // Magenta for midpoints (e.g., wall split)

        ctx.fillStyle = fillColor;
        ctx.strokeStyle = config.handleStrokeColor;
        ctx.fillRect(handle.x - config.handleSize / 2, handle.y - config.handleSize / 2, config.handleSize, config.handleSize);
        ctx.strokeRect(handle.x - config.handleSize / 2, handle.y - config.handleSize / 2, config.handleSize, config.handleSize);
    });
}