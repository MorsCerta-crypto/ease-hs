// js/actions.js
import * as state from './state.js';
import * as config from './config.js';
import * as dom from './dom-references.js';
import { distance, getPointAlongLine, isPointInPolygon, isPointOnLineSegment, projectPointOntoLineSegment, snapToGrid } from './geometry.js';

// --- Element Creation --- (Called from event handlers)

export function createWall(startX, startY, endX, endY) {
    const newElement = {
        id: state.nextElementId, type: 'wall', color: config.elementColors.wall,
        x1: startX, y1: startY, x2: endX, y2: endY, thickness: config.WALL_THICKNESS
    };
    state.addElement(newElement); state.setNextElementId(state.nextElementId + 1);
    dom.updateStatus(`Added Wall (ID: ${newElement.id}).`);
}

export function createRectElement(type, startX, startY, endX, endY) { // For Gear
     const x = Math.min(startX, endX); const y = Math.min(startY, endY);
     const w = Math.abs(endX - startX); const h = Math.abs(endY - startY);
     const newElement = {
         id: state.nextElementId, type: type, color: config.elementColors[type] || config.elementColors.default,
         x: x, y: y, width: w, height: h
     };
     state.addElement(newElement); state.setNextElementId(state.nextElementId + 1);
     dom.updateStatus(`Added ${type} (ID: ${newElement.id}).`);
}

export function createPolygonElementFromRect(type, startX, startY, endX, endY) { // For Machine, Closet
     const x = Math.min(startX, endX); const y = Math.min(startY, endY);
     const w = Math.abs(endX - startX); const h = Math.abs(endY - startY);
     const newElement = {
         id: state.nextElementId, type: type, color: config.elementColors[type] || config.elementColors.default,
         points: [ {x: x, y: y}, {x: x+w, y: y}, {x: x+w, y: y+h}, {x: x, y: y+h} ]
     };
     state.addElement(newElement); state.setNextElementId(state.nextElementId + 1);
     dom.updateStatus(`Added ${type} (ID: ${newElement.id}).`);
}

export function createWallChild(type, wall, startDist, length, drawnForward) {
     const newElement = {
         id: state.nextElementId, type: type, color: config.elementColors[type] || config.elementColors.default,
         wallId: wall.id, distanceAlongWall: startDist, length: length,
         swingDirection: drawnForward ? 1 : -1
     };
     state.addElement(newElement); state.setNextElementId(state.nextElementId + 1);
     dom.updateStatus(`Added ${type} (ID: ${newElement.id}) on wall ${wall.id}.`);
}

export function createRoute(points) {
     const newElement = {
         id: state.nextElementId, type: 'route', color: config.elementColors.route,
         points: [...points] // Copy points
     };
     state.addElement(newElement); state.setNextElementId(state.nextElementId + 1);
     dom.updateStatus(`Added E-Route (ID: ${newElement.id}).`);
}

// --- Element Deletion ---

export function deleteElement(element) {
    if (!element) return;
    const targetId = element.id;
    let deleted = false;

    // Remove children if deleting a wall
    if (element.type === 'wall') {
        state.removeElementsByWallId(targetId);
    }
    // Remove the element itself
    deleted = state.removeElementById(targetId);

    if (deleted) {
        dom.updateStatus(`Deleted element ${targetId}.`);
        if (state.selectedElement && state.selectedElement.id === targetId) {
            state.setSelectedElement(null); // Deselect if deleted
        }
    }
}


// --- Element Finding ---

export function findElementAt(x, y) {
    // Check elements in reverse draw order (topmost first)
    // 1. Gear (Rect)
    for (let i = state.elements.length - 1; i >= 0; i--) { const el = state.elements[i]; if (el.x !== undefined && !el.points) { if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) return el; } }
    // 2. Machine, Closet (Polygon)
    for (let i = state.elements.length - 1; i >= 0; i--) { const el = state.elements[i]; if (el.points && el.type !== 'route') { if (isPointInPolygon(x, y, el.points)) return el; } }
    // 3. Routes
    for (let i = state.elements.length - 1; i >= 0; i--) { const el = state.elements[i]; if (el.type === 'route' && el.points) { for (let j = 0; j < el.points.length - 1; j++) { if (isPointOnLineSegment(x, y, el.points[j].x, el.points[j].y, el.points[j+1].x, el.points[j+1].y, config.snapTolerance)) return el; } } }
    // 4. Walls and their children (Doors/Windows)
     for (let i = state.elements.length - 1; i >= 0; i--) { const el = state.elements[i]; if (el.type === 'wall') { const wallInfo = findWallNearPoint(x, y, (el.thickness || config.WALL_THICKNESS) / 2 + 2); if (wallInfo && wallInfo.wall.id === el.id) { const children = state.elements.filter(c => c.wallId === el.id); const projection = projectPointOntoLineSegment(x, y, el.x1, el.y1, el.x2, el.y2); if (projection.onSegment) { const distOnWall = distance(el.x1, el.y1, projection.x, projection.y); for (const child of children) { if (distOnWall >= child.distanceAlongWall && distOnWall <= child.distanceAlongWall + child.length) return child; } } return el; } } }
    return null;
}

export function findWallNearPoint(x, y, tolerance) {
    let closestWall = null; let minDistance = tolerance;
    for (const el of state.elements) {
        if (el.type === 'wall') {
            const len = distance(el.x1, el.y1, el.x2, el.y2); if (len === 0) continue;
            const distToLine = Math.abs((el.y2 - el.y1) * x - (el.x2 - el.x1) * y + el.x2 * el.y1 - el.y2 * el.x1) / len;
            const projection = projectPointOntoLineSegment(x, y, el.x1, el.y1, el.x2, el.y2);
            if (distToLine < minDistance && projection.onSegment) { minDistance = distToLine; closestWall = el; }
        }
    } return closestWall ? { wall: closestWall, distance: minDistance } : null;
}

export function isPointNearDoor(px, py, tolerance) {
    const doors = state.elements.filter(el => el.type === 'door');
    for (const door of doors) {
        const wall = state.elements.find(w => w.id === door.wallId); if (!wall) continue;
        const p1_gap = getPointAlongLine({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2}, door.distanceAlongWall);
        const p2_gap = getPointAlongLine({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2}, door.distanceAlongWall + door.length);
        if (isPointOnLineSegment(px, py, p1_gap.x, p1_gap.y, p2_gap.x, p2_gap.y, tolerance)) { return true; }
    } return false;
}

// --- Handle Finding & Manipulation ---

export function getResizeHandles(element) {
    if (!element) return null;
    const handles = []; const hs = config.handleSize / 2;
    if (element.points && element.type !== 'route') { // Polygon (Machine, Closet)
         element.points.forEach((p, index) => handles.push({ id: `corner${index}`, index: index, x: p.x, y: p.y }));
    } else if (element.wallId) { // Door/Window
        const wall = state.elements.find(w => w.id === element.wallId);
        if (wall) {
            const p1_gap = getPointAlongLine({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2}, element.distanceAlongWall);
            const p2_gap = getPointAlongLine({x: wall.x1, y: wall.y1}, {x: wall.x2, y: wall.y2}, element.distanceAlongWall + element.length);
             handles.push({ id: 'gapStart', x: p1_gap.x, y: p1_gap.y }); handles.push({ id: 'gapEnd', x: p2_gap.x, y: p2_gap.y });
        }
    } else if (element.x !== undefined) { // Rectangle (Gear)
         const x = element.x, y = element.y, w = element.width, h = element.height;
         handles.push({ id: 'tl', x: x, y: y }); handles.push({ id: 'tr', x: x + w, y: y }); handles.push({ id: 'bl', x: x, y: y + h }); handles.push({ id: 'br', x: x + w, y: y + h });
         handles.push({ id: 'tm', x: x + w/2, y: y }); handles.push({ id: 'bm', x: x + w/2, y: y + h }); handles.push({ id: 'ml', x: x, y: y + h/2 }); handles.push({ id: 'mr', x: x + w, y: y + h/2 });
    } else if (element.type === 'wall') { // Wall endpoints
         handles.push({ id: 'p1', x: element.x1, y: element.y1 }); handles.push({ id: 'p2', x: element.x2, y: element.y2 });
    }
    return handles.length > 0 ? handles : null;
}

export function findHandleAt(x, y, element) {
    if (!element) return null;
    const handles = getResizeHandles(element); if (!handles) return null;
    const tolerance = config.handleSize / 2 + 2;
    for (const h of handles) { if (Math.abs(x - h.x) < tolerance && Math.abs(y - h.y) < tolerance) return h; }
    return null;
}

// --- Resize & Move Actions --- (Called from event handlers)

export function resizeElement(mouseX, mouseY, element, handle) {
    const minDimension = 5;
    if (handle.id.startsWith('corner')) { // Polygon corner (Machine, Closet)
        element.points[handle.index].x = mouseX;
        element.points[handle.index].y = mouseY;
    } else if (handle.id.startsWith('gap')) { // Door/Window gap resize
         const wall = state.elements.find(w => w.id === element.wallId); if (!wall) return;
         const projection = projectPointOntoLineSegment(mouseX, mouseY, wall.x1, wall.y1, wall.x2, wall.y2);
         let targetDist = distance(wall.x1, wall.y1, projection.x, projection.y);
         const wallLen = distance(wall.x1, wall.y1, wall.x2, wall.y2);
         targetDist = Math.max(0, Math.min(wallLen, targetDist));

         let newStartDist = element.distanceAlongWall;
         let newEndDist = element.distanceAlongWall + element.length;

         if (handle.id === 'gapStart') newStartDist = targetDist; else newEndDist = targetDist;

         let finalStart = Math.min(newStartDist, newEndDist); let finalEnd = Math.max(newStartDist, newEndDist);
         let newLength = finalEnd - finalStart;

         if (newLength < config.minDoorWindowLength) { // Adjust to maintain min length
             if (handle.id === 'gapStart') finalStart = finalEnd - config.minDoorWindowLength;
             else finalEnd = finalStart + config.minDoorWindowLength;
             newLength = config.minDoorWindowLength;
         }
         // Clamp ends to wall boundaries again
         finalStart = Math.max(0, finalStart); finalEnd = Math.min(wallLen, finalEnd);
         newLength = finalEnd - finalStart;

         if (!checkWallChildOverlap(wall, element.id, finalStart, newLength)) {
             element.distanceAlongWall = finalStart; element.length = newLength;
         } else { dom.updateStatus(`Cannot resize ${element.type}: Overlap detected.`); }

    } else if (element.x !== undefined) { // Rectangle (Gear) resize
        let x = element.x, y = element.y, w = element.width, h = element.height;
         switch (handle.id) { /* ... cases for tl, tr, bl, br, etc. ... */ }
         if (w !== element.width) element.x = x; if (h !== element.height) element.y = y; element.width = w; element.height = h;
    } else if (element.type === 'wall') { // Wall endpoint resize
         const snapFunc = (coord) => snapToGrid(coord, config.GRID_SIZE_PIXELS);
         if (handle.id === 'p1') { element.x1 = snapFunc(mouseX); element.y1 = snapFunc(mouseY); }
         else if (handle.id === 'p2') { element.x2 = snapFunc(mouseX); element.y2 = snapFunc(mouseY); }
         updateChildPositions(element); // Recalculate child positions (though dynamic)
    }
}

export function moveElement(element, currentX, currentY, offsetX, offsetY) {
    let dx, dy;
    if (element.wallId) { // Moving Door/Window (Slide along wall)
        const wall = state.elements.find(w => w.id === element.wallId); if (!wall) return;
        const projection = projectPointOntoLineSegment(currentX, currentY, wall.x1, wall.y1, wall.x2, wall.y2);
        let targetDist = distance(wall.x1, wall.y1, projection.x, projection.y);
        const wallLen = distance(wall.x1, wall.y1, wall.x2, wall.y2);
        targetDist = Math.max(0, Math.min(wallLen - element.length, targetDist)); // Clamp

        if (!checkWallChildOverlap(wall, element.id, targetDist, element.length)) {
            element.distanceAlongWall = targetDist;
            dom.updateStatus(`Sliding ${element.type} ${element.id}...`);
        } else { dom.updateStatus(`Cannot slide ${element.type}: Overlap detected.`); }
    } else { // Move other elements
        let newX = currentX - offsetX; let newY = currentY - offsetY;
        if (element.points) { // Polygon (Machine, Closet) or Route
            dx = newX - element.points[0].x; dy = newY - element.points[0].y;
            element.points.forEach(p => { p.x += dx; p.y += dy; });
        } else if (element.x !== undefined) { // Rectangle (Gear)
            element.x = newX; element.y = newY;
        } else { // Line (Wall)
            dx = newX - element.x1; dy = newY - element.y1;
            element.x1 = newX; element.y1 = newY; element.x2 += dx; element.y2 += dy;
            updateChildPositions(element);
        }
         dom.updateStatus(`Moving element ${element.id}...`);
    }
}

// --- Utility ---

export function updateChildPositions(wall) {
    // No explicit update needed as child positions are calculated dynamically
    // during redraw based on wall coords and stored distance/length.
}

export function checkWallChildOverlap(wall, selfId, proposedStart, proposedLength) {
    const children = state.elements.filter(el => el.wallId === wall.id && el.id !== selfId);
    const proposedEnd = proposedStart + proposedLength;
    for (const child of children) {
        const childEnd = child.distanceAlongWall + child.length;
        if (!(proposedEnd <= child.distanceAlongWall + 0.1 || proposedStart >= childEnd - 0.1)) { // Add tolerance
            return true; // Overlap found
        }
    } return false;
}

// Placeholder for loading info in view mode
export function loadInformation(elementId) {
    const element = state.elements.find(el => el.id === elementId);
    const elementType = element ? element.type : 'Unknown';
    let details = `Type: ${elementType}`;
    if(element && element.wallId) { details += ` on Wall ${element.wallId}`; }
    console.log(`Load info requested for element ID: ${elementId} (${details})`);
    alert(`Information for Element ${elementId}\n${details}\n(Implement detail view here)`);
}