// Get mouse position in canvas coordinates (in meters)
function getCanvasMousePosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - currentState.panOffset.x) / currentState.scale;
    const y = (event.clientY - rect.top - currentState.panOffset.y) / currentState.scale;
    
    // Only snap to grid for walls
    if (currentState.currentTool === 'wall') {
        return {
            x: Math.round(x / currentState.gridSize) * currentState.gridSize,
            y: Math.round(y / currentState.gridSize) * currentState.gridSize
        };
    }
    
    return { x, y };
}

// Find element at a specific position
function findElementAtPosition(pos) {
    // Implement hit testing for different element types
    // This is a simplified version that checks proximity to lines and points
    
    const hitDistance = 0.25; // Hit distance in meters
    
    for (let i = currentState.elements.length - 1; i >= 0; i--) {
        const element = currentState.elements[i];
        
        // For line-type elements (walls, doors, windows, emergency routes)
        if (['wall', 'door-standard', 'door-emergency', 'window', 'emergency-route'].includes(element.element_type)) {
            const distToLine = distanceToLine(
                pos,
                element.start,
                element.end
            );
            
            if (distToLine < hitDistance) {
                return element;
            }
        }
        // For point-type elements (machines, closets)
        else if (['machine', 'closet'].includes(element.element_type)) {
            const center = {
                x: (element.start.x + element.end.x) / 2,
                y: (element.start.y + element.end.y) / 2
            };
            
            const width = Math.abs(element.end.x - element.start.x);
            const height = Math.abs(element.end.y - element.start.y);
            
            // Check if point is inside the element
            if (pos.x >= center.x - width/2 && pos.x <= center.x + width/2 &&
                pos.y >= center.y - height/2 && pos.y <= center.y + height/2) {
                return element;
            }
        }
    }
    
    return null;
}

// Calculate distance from point to line segment
function distanceToLine(p, v, w) {
    const lengthSquared = squaredDistance(v, w);
    
    if (lengthSquared === 0) {
        return squaredDistance(p, v);
    }
    
    // Calculate projection of point onto line
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    
    const projection = {
        x: v.x + t * (w.x - v.x),
        y: v.y + t * (w.y - v.y)
    };
    
    return Math.sqrt(squaredDistance(p, projection));
}

// Calculate squared distance between two points
function squaredDistance(p1, p2) {
    return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
}

// Drag the selected element
function dragSelectedElement(pos) {
    if (!currentState.selectedElement) return;
    
    const element = currentState.selectedElement;
    
    // Calculate the movement delta
    const deltaX = pos.x - (element.start.x + element.end.x) / 2;
    const deltaY = pos.y - (element.start.y + element.end.y) / 2;
    
    // Update the element position
    element.start.x += deltaX;
    element.start.y += deltaY;
    element.end.x += deltaX;
    element.end.y += deltaY;
    
    // Update the properties panel
    updatePropertiesPanel();
}

// Finish drawing a new element
function finishDrawing(endPoint) {
    if (!currentState.startPoint) return;
    
    // Don't create elements that are too small
    const distance = Math.sqrt(
        Math.pow(endPoint.x - currentState.startPoint.x, 2) + 
        Math.pow(endPoint.y - currentState.startPoint.y, 2)
    );
    
    if (distance < 0.2) {
        currentState.startPoint = null;
        return;
    }
    
    // Check if door or window is being placed on a wall
    if (['door-standard', 'door-emergency', 'window'].includes(currentState.currentTool)) {
        const wall = findWallAtPosition(currentState.startPoint);
        if (!wall) {
            alert('Türen und Fenster können nur auf Wänden platziert werden.');
            currentState.startPoint = null;
            return;
        }
    }
    
    // Create the new element
    const newElement = {
        id: generateId(),
        element_type: currentState.currentTool,
        start: { ...currentState.startPoint },
        end: { ...endPoint },
        width: 0.2,
        properties: {}
    };
    
    // Set default width based on element type
    if (currentState.currentTool === 'emergency-route') {
        newElement.width = 1.0; // Default 1 meter width for emergency routes
        newElement.properties = {
            routeName: 'Emergency Exit Route',
            exitPoint: 'end', // Default exit point is at the end
            points: [{ ...currentState.startPoint }, { ...endPoint }] // Initialize with start and end points
        };
    } 
    // Add default properties based on element type
    else if (currentState.currentTool === 'machine') {
        newElement.properties = {
            name: "Machine",
            description: "Equipment description",
            hazardLevel: 1
        };
    } else if (currentState.currentTool === 'closet') {
        newElement.properties = {
            contentType: "chemical",
            description: "Hazardous materials storage"
        };
    }
    
    // Add the element to the state
    currentState.elements.push(newElement);
    
    // Select the new element
    selectElement(newElement);
    
    // Reset drawing state
    currentState.startPoint = null;
}

// Find a wall at the given position
function findWallAtPosition(pos) {
    const hitDistance = 0.2; // 20cm hit distance for wall detection
    
    for (const element of currentState.elements) {
        if (element.element_type === 'wall') {
            // Calculate distance from point to line segment
            const distance = distanceToLineSegment(
                pos,
                element.start,
                element.end
            );
            
            if (distance < hitDistance) {
                return element;
            }
        }
    }
    
    return null;
}

// Calculate distance from point to line segment
function distanceToLineSegment(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    // Calculate the projection of point onto the line
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
    
    // If t < 0, closest point is lineStart
    if (t < 0) {
        return Math.sqrt(
            Math.pow(point.x - lineStart.x, 2) + 
            Math.pow(point.y - lineStart.y, 2)
        );
    }
    
    // If t > 1, closest point is lineEnd
    if (t > 1) {
        return Math.sqrt(
            Math.pow(point.x - lineEnd.x, 2) + 
            Math.pow(point.y - lineEnd.y, 2)
        );
    }
    
    // Closest point is on the line segment
    const projectionX = lineStart.x + t * dx;
    const projectionY = lineStart.y + t * dy;
    
    return Math.sqrt(
        Math.pow(point.x - projectionX, 2) + 
        Math.pow(point.y - projectionY, 2)
    );
}

// Check if mouse is over a resize handle
function getResizeHandleAtPosition(pos) {
    if (!currentState.selectedElement) return null;
    
    const element = currentState.selectedElement;
    const hitDistance = 0.3; // Hit distance in meters for resize handles
    
    // Convert element points to meter coordinates
    const start = element.start;
    const end = element.end;
    
    // For line-type elements (walls, doors, windows, emergency routes)
    if (['wall', 'door-standard', 'door-emergency', 'window', 'emergency-route'].includes(element.element_type)) {
        // Check if mouse is over start point
        if (Math.sqrt(squaredDistance(pos, start)) < hitDistance) {
            return 'start';
        }
        // Check if mouse is over end point
        if (Math.sqrt(squaredDistance(pos, end)) < hitDistance) {
            return 'end';
        }
    } 
    // For rectangle-type elements (machines, closets)
    else if (['machine', 'closet'].includes(element.element_type)) {
        // Calculate rectangle coordinates
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        
        // Check if mouse is over one of the corner handles
        if (Math.sqrt(squaredDistance(pos, { x: minX, y: minY })) < hitDistance) {
            return 'top-left';
        }
        if (Math.sqrt(squaredDistance(pos, { x: maxX, y: minY })) < hitDistance) {
            return 'top-right';
        }
        if (Math.sqrt(squaredDistance(pos, { x: minX, y: maxY })) < hitDistance) {
            return 'bottom-left';
        }
        if (Math.sqrt(squaredDistance(pos, { x: maxX, y: maxY })) < hitDistance) {
            return 'bottom-right';
        }
    }
    
    return null;
}

// Resize the selected element
function resizeSelectedElement(pos) {
    if (!currentState.selectedElement || !currentState.resizeHandle) return;
    
    const element = currentState.selectedElement;
    const handle = currentState.resizeHandle;
    
    // For line-type elements (walls, doors, windows, emergency routes)
    if (['wall', 'door-standard', 'door-emergency', 'window'].includes(element.element_type)) {
        // Resize from either end
        if (handle === 'start') {
            element.start.x = pos.x;
            element.start.y = pos.y;
        } else if (handle === 'end') {
            element.end.x = pos.x;
            element.end.y = pos.y;
        }
    } 
    // For emergency routes with multiple points
    else if (element.element_type === 'emergency-route') {
        if (handle === 'start') {
            element.properties.points[0] = { ...pos };
            element.start = { ...pos };
        } else if (handle === 'end') {
            element.properties.points[element.properties.points.length - 1] = { ...pos };
            element.end = { ...pos };
        }
    }
    // For rectangle-type elements (machines, closets)
    else if (['machine', 'closet'].includes(element.element_type)) {
        // Update the appropriate corner based on the handle
        switch (handle) {
            case 'top-left':
                element.start.x = pos.x;
                element.start.y = pos.y;
                break;
            case 'top-right':
                element.end.x = pos.x;
                element.start.y = pos.y;
                break;
            case 'bottom-left':
                element.start.x = pos.x;
                element.end.y = pos.y;
                break;
            case 'bottom-right':
                element.end.x = pos.x;
                element.end.y = pos.y;
                break;
        }
    }
    
    // Update the properties panel
    updatePropertiesPanel();
    
}

// Delete the selected element
window.deleteSelectedElement = function() {
    if (!currentState.selectedElement) return;
    
    const index = currentState.elements.findIndex(e => e.id === currentState.selectedElement.id);
    if (index !== -1) {
        currentState.elements.splice(index, 1);
        currentState.selectedElement = null;
        
        // Update properties panel
        updatePropertiesPanel();
        
        // Render the updated state
        const canvas = document.getElementById('floorplan-canvas');
        if (canvas) render(canvas);
        
};

// Add point to emergency route
function addPointToEmergencyRoute(pos) {
    if (!currentState.selectedElement || currentState.selectedElement.element_type !== 'emergency-route') return;
    
    const element = currentState.selectedElement;
    element.properties.points.push({ ...pos });
    element.end = { ...pos };
    
    // Update the properties panel
    updatePropertiesPanel();
    
}

// Remove point from emergency route
function removePointFromEmergencyRoute(index) {
    if (!currentState.selectedElement || currentState.selectedElement.element_type !== 'emergency-route') return;
    
    const element = currentState.selectedElement;
    if (index === 0) {
        element.properties.points.shift();
        element.start = { ...element.properties.points[0] };
    } else if (index === element.properties.points.length - 1) {
        element.properties.points.pop();
        element.end = { ...element.properties.points[element.properties.points.length - 1] };
    } else {
        element.properties.points.splice(index, 1);
    }
    
    // Update the properties panel
    updatePropertiesPanel();
} 