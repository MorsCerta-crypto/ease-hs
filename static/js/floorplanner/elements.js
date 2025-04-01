// Get mouse position in canvas coordinates (in meters)
function getCanvasMousePosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - currentState.panOffset.x) / currentState.scale;
    const y = (event.clientY - rect.top - currentState.panOffset.y) / currentState.scale;
    
    // Snap to grid if not in select mode
    if (currentState.currentTool !== 'select') {
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
            exitPoint: 'end' // Default exit point is at the end
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
    
    // Save changes
    // saveChanges();
    
    // Reset drawing state
    currentState.startPoint = null;
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
    if (['wall', 'door-standard', 'door-emergency', 'window', 'emergency-route'].includes(element.element_type)) {
        // Resize from either end
        if (handle === 'start') {
            element.start.x = pos.x;
            element.start.y = pos.y;
        } else if (handle === 'end') {
            element.end.x = pos.x;
            element.end.y = pos.y;
        }
    } 
    // For rectangle-type elements (machines, closets)
    else if (['machine', 'closet'].includes(element.element_type)) {
        // Get current dimensions
        const minX = Math.min(element.start.x, element.end.x);
        const maxX = Math.max(element.start.x, element.end.x);
        const minY = Math.min(element.start.y, element.end.y);
        const maxY = Math.max(element.start.y, element.end.y);
        
        // Resize based on which corner is being dragged
        switch (handle) {
            case 'top-left':
                element.start.x = pos.x;
                element.start.y = pos.y;
                element.end.x = maxX;
                element.end.y = maxY;
                break;
            case 'top-right':
                element.start.x = minX;
                element.start.y = pos.y;
                element.end.x = pos.x;
                element.end.y = maxY;
                break;
            case 'bottom-left':
                element.start.x = pos.x;
                element.start.y = minY;
                element.end.x = maxX;
                element.end.y = pos.y;
                break;
            case 'bottom-right':
                element.start.x = minX;
                element.start.y = minY;
                element.end.x = pos.x;
                element.end.y = pos.y;
                break;
        }
    }
    
    // Update the properties panel
    updatePropertiesPanel();
    
    // Save changes
    // saveChanges();
} 