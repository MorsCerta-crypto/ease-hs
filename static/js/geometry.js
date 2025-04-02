// js/geometry.js

// Basic distance
export function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Snap to grid
export function snapToGrid(coord, gridSize) {
    return Math.round(coord / gridSize) * gridSize;
}

// Check if point is close to line segment
export function isPointOnLineSegment(px, py, x1, y1, x2, y2, tolerance) {
    const len = distance(x1, y1, x2, y2);
    if (len === 0) return distance(px, py, x1, y1) < tolerance;
    const distToLine = Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) / len;
    if (distToLine > tolerance) return false;
    const dotproduct = (px - x1) * (x2 - x1) + (py - y1) * (y2 - y1);
    if (dotproduct < 0) return false;
    const squaredlength = len * len;
    if (dotproduct > squaredlength) return false;
    return true;
}

// Project point onto line segment
export function projectPointOntoLineSegment(px, py, x1, y1, x2, y2) {
    const l2 = distance(x1, y1, x2, y2) ** 2;
    if (l2 === 0) return { x: x1, y: y1, onSegment: true };
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return { x: projX, y: projY, onSegment: t >= 0 && t <= 1 };
}

// Get point at a distance along a line
export function getPointAlongLine(p1, p2, distanceAlong) {
    const len = distance(p1.x, p1.y, p2.x, p2.y);
    if (len === 0) return { x: p1.x, y: p1.y };
    const ratio = distanceAlong / len;
    const x = p1.x + ratio * (p2.x - p1.x);
    const y = p1.y + ratio * (p2.y - p1.y);
    return { x, y };
}

// Point-in-polygon test (Ray Casting)
export function isPointInPolygon(px, py, polygonPoints) {
    let isInside = false;
    const numPoints = polygonPoints.length;
    for (let i = 0, j = numPoints - 1; i < numPoints; j = i++) {
        const xi = polygonPoints[i].x, yi = polygonPoints[i].y;
        const xj = polygonPoints[j].x, yj = polygonPoints[j].y;
        const intersect = ((yi > py) !== (yj > py))
            && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
}

// Get mouse position relative to canvas
export function getMousePos(event, canvas) {
    if (!event || !event.clientX || !canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}