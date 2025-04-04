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

// Get snapped preview for doors and windows during drawing
function getSnappedPreviewPoints(startPoint, endPoint) {
    // Only apply for doors and windows
    if (!['door-standard', 'door-emergency', 'window'].includes(currentState.currentTool)) {
        return { start: startPoint, end: endPoint };
    }
    
    // Try to find a wall at the starting position
    let wall = findWallAtPosition(startPoint);
    
    // If no wall at start position, check for closest wall to snap to
    if (!wall) {
        const result = findClosestWall(startPoint, endPoint);
        if (result.wall) {
            return {
                start: result.projectionStart,
                end: result.projectionEnd,
                wall: result.wall
            };
        }
    }
    
    return { start: startPoint, end: endPoint };
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
    
    // Special handling for doors and windows
    if (['door-standard', 'door-emergency', 'window'].includes(currentState.currentTool)) {
        // Try to find a wall at the starting position
        let wall = findWallAtPosition(currentState.startPoint);
        
        // If no wall at the start point, find the closest wall
        if (!wall) {
            const result = findClosestWall(currentState.startPoint, endPoint);
            if (result.wall) {
                wall = result.wall;
                // Snap the door/window to the closest wall
                newElement.start = { ...result.projectionStart };
                newElement.end = { ...result.projectionEnd };
            }
        }
    }
    
    // Set default width based on element type
    if (currentState.currentTool === 'emergency-route') {
        newElement.width = 1.0; // Default 1 meter width for emergency routes
        newElement.properties = {
            routeName: 'Emergency Exit Route',
            exitPoint: 'end', // Default exit point is at the end
            points: [{ ...newElement.start }, { ...newElement.end }] // Initialize with start and end points
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

// Find the closest wall to a line segment
function findClosestWall(startPoint, endPoint) {
    const maxDistance = 1.0; // Maximum distance to snap (1 meter)
    let closestWall = null;
    let minDistance = maxDistance;
    let projectionStart = startPoint;
    let projectionEnd = endPoint;
    
    // Calculate the direction vector of the door/window
    const doorVector = {
        x: endPoint.x - startPoint.x,
        y: endPoint.y - startPoint.y
    };
    const doorLength = Math.sqrt(doorVector.x * doorVector.x + doorVector.y * doorVector.y);
    
    // Normalize the door vector
    const doorDirection = {
        x: doorVector.x / doorLength,
        y: doorVector.y / doorLength
    };
    
    for (const element of currentState.elements) {
        if (element.element_type === 'wall') {
            // Calculate the center point of the door/window
            const centerPoint = {
                x: (startPoint.x + endPoint.x) / 2,
                y: (startPoint.y + endPoint.y) / 2
            };
            
            // Calculate distance from center to wall
            const distToWall = distanceToLineSegment(
                centerPoint,
                element.start,
                element.end
            );
            
            if (distToWall < minDistance) {
                // Calculate the wall vector
                const wallVector = {
                    x: element.end.x - element.start.x,
                    y: element.end.y - element.start.y
                };
                const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
                
                // Normalize the wall vector
                const wallDirection = {
                    x: wallVector.x / wallLength,
                    y: wallVector.y / wallLength
                };
                
                // Calculate the projection point of the center on the wall
                const t = ((centerPoint.x - element.start.x) * wallVector.x + 
                          (centerPoint.y - element.start.y) * wallVector.y) / 
                          (wallVector.x * wallVector.x + wallVector.y * wallVector.y);
                
                // Ensure t is within [0, 1] for the wall segment
                const clampedT = Math.max(0, Math.min(1, t));
                
                // Calculate the projection point on the wall
                const projectionPoint = {
                    x: element.start.x + clampedT * wallVector.x,
                    y: element.start.y + clampedT * wallVector.y
                };
                
                // Calculate the perpendicular vector to the wall (normalized)
                const perpWallDirection = {
                    x: -wallDirection.y,
                    y: wallDirection.x
                };
                
                // Calculate the door/window length
                const doorWindowLength = Math.sqrt(
                    Math.pow(endPoint.x - startPoint.x, 2) + 
                    Math.pow(endPoint.y - startPoint.y, 2)
                );
                
                // Calculate the new start and end points along the wall
                const newStart = {
                    x: projectionPoint.x - (wallDirection.x * doorWindowLength / 2),
                    y: projectionPoint.y - (wallDirection.y * doorWindowLength / 2)
                };
                
                const newEnd = {
                    x: projectionPoint.x + (wallDirection.x * doorWindowLength / 2),
                    y: projectionPoint.y + (wallDirection.y * doorWindowLength / 2)
                };
                
                minDistance = distToWall;
                closestWall = element;
                projectionStart = newStart;
                projectionEnd = newEnd;
            }
        }
    }
    
    return {
        wall: closestWall,
        projectionStart: projectionStart,
        projectionEnd: projectionEnd
    };
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
    
    
}

// Delete the selected element
window.deleteSelectedElement = function() {
    if (!currentState.selectedElement) return;
    
    const index = currentState.elements.findIndex(e => e.id === currentState.selectedElement.id);
    if (index !== -1) {
        currentState.elements.splice(index, 1);
        currentState.selectedElement = null;
        
        
        // Render the updated state
        const canvas = document.getElementById('floorplan-canvas');
        if (canvas) render(canvas);
    }
}
