// Render the floor plan
function render(canvas, options = {}) {
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render the floor plan
    renderToContext(ctx, canvas.width, canvas.height, options);
}

// Render the floor plan to a specific context
function renderToContext(ctx, width, height, options = {}) {
    // Draw grid, but not when exporting
    if (!options.exporting) {
        drawGrid(ctx, width, height);
    }
    
    // Draw elements
    drawElements(ctx, options);
    
    // Draw selection
    if (currentState.selectedElement) {
        drawSelectionBox(ctx, currentState.selectedElement);
    }
    
    // Draw preview while drawing
    if (currentState.isDrawing && currentState.startPoint && options.previewEnd) {
        drawPreview(ctx, currentState.startPoint, options.previewEnd);
        
        // Show dimensions while drawing
        if (options.previewEnd) {
            drawDimensions(ctx, currentState.startPoint, options.previewEnd);
        }
    }
}

// Draw grid
function drawGrid(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    
    const gridSpacing = currentState.gridSize * currentState.scale;
    
    // Draw vertical grid lines
    for (let x = currentState.panOffset.x % gridSpacing; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = currentState.panOffset.y % gridSpacing; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Draw elements
function drawElements(ctx, options = {}) {
    // Draw all elements
    for (const element of currentState.elements) {
        drawElement(ctx, element);
    }
}

// Draw a single element
function drawElement(ctx, element) {
    ctx.save();
    
    // Convert meter coordinates to canvas coordinates
    const start = {
        x: element.start.x * currentState.scale + currentState.panOffset.x,
        y: element.start.y * currentState.scale + currentState.panOffset.y
    };
    
    const end = {
        x: element.end.x * currentState.scale + currentState.panOffset.x,
        y: element.end.y * currentState.scale + currentState.panOffset.y
    };
    
    // Set styles based on element type
    switch (element.element_type) {
        case 'wall':
            ctx.strokeStyle = '#333';
            ctx.lineWidth = element.width * currentState.scale;
            ctx.lineCap = 'round';
            
            // Draw wall
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            break;
            
        case 'door-standard':
            ctx.strokeStyle = '#666';
            ctx.lineWidth = element.width * currentState.scale;
            
            // Draw door line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            // Draw door swing
            drawDoorSwing(ctx, start, end, 'standard');
            break;
            
        case 'door-emergency':
            ctx.strokeStyle = '#d9534f';
            ctx.lineWidth = element.width * currentState.scale;
            
            // Draw door line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            // Draw door swing
            drawDoorSwing(ctx, start, end, 'emergency');
            break;
            
        case 'window':
            ctx.strokeStyle = '#5bc0de';
            ctx.lineWidth = element.width * currentState.scale;
            
            // Draw window line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            // Draw window markers
            drawWindowMarkers(ctx, start, end);
            break;
            
        case 'emergency-route':
            ctx.strokeStyle = '#28a745'; // Green for emergency routes
            ctx.lineWidth = (element.width || 1) * currentState.scale; // Default to 1m width
            ctx.lineCap = 'round';
            
            // Draw emergency route line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            // Draw arrow heads to indicate direction
            drawRouteArrows(ctx, start, end);
            break;
            
        case 'machine':
            ctx.fillStyle = '#f0ad4e';
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            
            // Draw machine as a rectangle
            const width = Math.abs(end.x - start.x);
            const height = Math.abs(end.y - start.y);
            const x = Math.min(start.x, end.x);
            const y = Math.min(start.y, end.y);
            
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
            
            // Add machine symbol
            drawMachineSymbol(ctx, {
                x: x + width / 2,
                y: y + height / 2
            }, width * 0.7);
            break;
            
        case 'closet':
            ctx.fillStyle = 'rgba(217, 83, 79, 0.6)';
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            
            // Draw closet as a rectangle
            const closetWidth = Math.abs(end.x - start.x);
            const closetHeight = Math.abs(end.y - start.y);
            const closetX = Math.min(start.x, end.x);
            const closetY = Math.min(start.y, end.y);
            
            ctx.fillRect(closetX, closetY, closetWidth, closetHeight);
            ctx.strokeRect(closetX, closetY, closetWidth, closetHeight);
            
            // Add warning symbol
            drawWarningSymbol(ctx, {
                x: closetX + closetWidth / 2,
                y: closetY + closetHeight / 2
            }, Math.min(closetWidth, closetHeight) * 0.6);
            break;
    }
    
    ctx.restore();
}

// Draw a door swing
function drawDoorSwing(ctx, start, end, type) {
    const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + 
        Math.pow(end.y - start.y, 2)
    );
    
    // Calculate perpendicular direction
    const dirX = (end.x - start.x) / length;
    const dirY = (end.y - start.y) / length;
    const perpX = -dirY;
    const perpY = dirX;
    
    // Calculate arc center point (at the middle of the door)
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    
    // Draw door swing arc
    ctx.save();
    ctx.strokeStyle = type === 'emergency' ? '#d9534f' : '#666';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    const arcRadius = length / 2;
    const startAngle = Math.atan2(-perpY, -perpX);
    const endAngle = Math.atan2(perpY, perpX);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, arcRadius, startAngle, endAngle);
    ctx.stroke();
    ctx.restore();
    
    // For emergency doors, add an "EXIT" text
    if (type === 'emergency') {
        ctx.save();
        ctx.font = '10px Arial';
        ctx.fillStyle = '#d9534f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Position the text slightly away from the door
        const textX = centerX + perpX * 15;
        const textY = centerY + perpY * 15;
        
        ctx.fillText('EXIT', textX, textY);
        ctx.restore();
    }
}

// Draw window markers
function drawWindowMarkers(ctx, start, end) {
    const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + 
        Math.pow(end.y - start.y, 2)
    );
    
    // Calculate direction
    const dirX = (end.x - start.x) / length;
    const dirY = (end.y - start.y) / length;
    
    // Number of markers
    const markerCount = Math.max(2, Math.floor(length / 15));
    const markerSpacing = length / markerCount;
    
    ctx.save();
    ctx.strokeStyle = '#5bc0de';
    ctx.lineWidth = 1;
    
    // Draw window markers
    for (let i = 1; i < markerCount; i++) {
        const markerX = start.x + dirX * markerSpacing * i;
        const markerY = start.y + dirY * markerSpacing * i;
        
        ctx.beginPath();
        ctx.moveTo(markerX - dirY * 5, markerY + dirX * 5);
        ctx.lineTo(markerX + dirY * 5, markerY - dirX * 5);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Draw machine symbol
function drawMachineSymbol(ctx, center, size) {
    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // Draw a gear-like symbol
    ctx.beginPath();
    ctx.arc(center.x, center.y, size * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw gear teeth
    const teethCount = 8;
    for (let i = 0; i < teethCount; i++) {
        const angle = (i * Math.PI * 2) / teethCount;
        const innerX = center.x + Math.cos(angle) * size * 0.3;
        const innerY = center.y + Math.sin(angle) * size * 0.3;
        const outerX = center.x + Math.cos(angle) * size * 0.5;
        const outerY = center.y + Math.sin(angle) * size * 0.5;
        
        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Draw warning symbol
function drawWarningSymbol(ctx, center, size) {
    ctx.save();
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#333';
    ctx.lineWidth = 2;
    
    // Draw a warning triangle
    const halfSize = size / 2;
    
    ctx.beginPath();
    ctx.moveTo(center.x, center.y - halfSize);
    ctx.lineTo(center.x + halfSize, center.y + halfSize);
    ctx.lineTo(center.x - halfSize, center.y + halfSize);
    ctx.closePath();
    ctx.stroke();
    
    // Draw exclamation mark
    ctx.font = `bold ${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', center.x, center.y + size * 0.1);
    
    ctx.restore();
}

// Draw arrow heads on emergency routes
function drawRouteArrows(ctx, start, end) {
    // Calculate direction
    const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + 
        Math.pow(end.y - start.y, 2)
    );
    
    if (length < 10) return; // Skip if too short
    
    const dirX = (end.x - start.x) / length;
    const dirY = (end.y - start.y) / length;
    
    // Number of arrows based on length
    const arrowCount = Math.max(1, Math.floor(length / 50));
    
    ctx.save();
    ctx.fillStyle = '#28a745';
    
    for (let i = 1; i <= arrowCount; i++) {
        // Position arrow along the route
        const pos = i / (arrowCount + 1);
        const arrowX = start.x + dirX * length * pos;
        const arrowY = start.y + dirY * length * pos;
        
        // Draw arrow
        ctx.beginPath();
        ctx.moveTo(arrowX + dirX * 10, arrowY + dirY * 10);
        ctx.lineTo(arrowX + dirX * 10 - dirX * 15 + dirY * 5, arrowY + dirY * 10 - dirY * 15 - dirX * 5);
        ctx.lineTo(arrowX + dirX * 10 - dirX * 15 - dirY * 5, arrowY + dirY * 10 - dirY * 15 + dirX * 5);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

// Draw selection box around the selected element
function drawSelectionBox(ctx, element) {
    ctx.save();
    
    // Convert meter coordinates to canvas coordinates
    const start = {
        x: element.start.x * currentState.scale + currentState.panOffset.x,
        y: element.start.y * currentState.scale + currentState.panOffset.y
    };
    
    const end = {
        x: element.end.x * currentState.scale + currentState.panOffset.x,
        y: element.end.y * currentState.scale + currentState.panOffset.y
    };
    
    // Draw selection based on element type
    if (['wall', 'door-standard', 'door-emergency', 'window', 'emergency-route'].includes(element.element_type)) {
        // Line type elements - draw selection points at start and end
        ctx.fillStyle = '#007bff';
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        
        // Draw line highlight
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        
        // Draw control points
        const pointRadius = 5;
        
        // Draw start point (with different color to indicate draggable)
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(start.x, start.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw end point (with different color to indicate draggable)
        ctx.fillStyle = '#28a745';
        ctx.beginPath();
        ctx.arc(end.x, end.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Show dimensions for the element
        const lengthMeters = Math.sqrt(
            Math.pow(element.end.x - element.start.x, 2) + 
            Math.pow(element.end.y - element.start.y, 2)
        );
        
        // Position for length display - middle of the line, slightly offset
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        // Calculate perpendicular direction for offset
        const dirX = (end.x - start.x) / (Math.max(1, Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))));
        const dirY = (end.y - start.y) / (Math.max(1, Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))));
        const perpX = -dirY;
        const perpY = dirX;
        
        // Offset the text from the line
        const textX = midX + perpX * 15;
        const textY = midY + perpY * 15;
        
        // Draw dimension text
        ctx.font = '12px Arial';
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lengthText = `${lengthMeters.toFixed(2)} m`;
        ctx.strokeText(lengthText, textX, textY);
        ctx.fillText(lengthText, textX, textY);
    } else {
        // Rectangle type elements (machines, closets)
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        
        // Draw selection rectangle
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
        
        // Draw control points at corners with different colors
        ctx.setLineDash([]);
        const pointRadius = 6;
        
        // Top-left
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Top-right
        ctx.fillStyle = '#28a745';
        ctx.beginPath();
        ctx.arc(x + width, y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bottom-left
        ctx.fillStyle = '#007bff';
        ctx.beginPath();
        ctx.arc(x, y + height, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bottom-right
        ctx.fillStyle = '#dc3545';
        ctx.beginPath();
        ctx.arc(x + width, y + height, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Show dimensions of the element
        const widthMeters = Math.abs(element.end.x - element.start.x);
        const heightMeters = Math.abs(element.end.y - element.start.y);
        
        // Draw dimension texts
        ctx.font = '12px Arial';
        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Width dimension on top
        const widthText = `${widthMeters.toFixed(2)} m`;
        ctx.strokeText(widthText, x + width / 2, y - 10);
        ctx.fillText(widthText, x + width / 2, y - 10);
        
        // Height dimension on the side
        const heightText = `${heightMeters.toFixed(2)} m`;
        ctx.strokeText(heightText, x - 10, y + height / 2);
        ctx.fillText(heightText, x - 10, y + height / 2);
    }
    
    ctx.restore();
}

// Draw preview while drawing
function drawPreview(ctx, start, end) {
    ctx.save();
    
    // Convert meter coordinates to canvas coordinates
    const startPoint = {
        x: start.x * currentState.scale + currentState.panOffset.x,
        y: start.y * currentState.scale + currentState.panOffset.y
    };
    
    const endPoint = {
        x: end.x * currentState.scale + currentState.panOffset.x,
        y: end.y * currentState.scale + currentState.panOffset.y
    };
    
    // Set styles based on the current tool
    let fillStyle = 'transparent';
    let strokeStyle = '#007bff';
    let lineWidth = 2;
    
    switch (currentState.currentTool) {
        case 'wall':
            strokeStyle = '#333';
            lineWidth = 3;
            break;
        case 'door-standard':
            strokeStyle = '#666';
            lineWidth = 2;
            break;
        case 'door-emergency':
            strokeStyle = '#d9534f';
            lineWidth = 2;
            break;
        case 'window':
            strokeStyle = '#5bc0de';
            lineWidth = 2;
            break;
        case 'emergency-route':
            strokeStyle = '#28a745'; // Green color for emergency routes
            lineWidth = 3;
            break;
        case 'machine':
            fillStyle = 'rgba(240, 173, 78, 0.3)';
            strokeStyle = '#f0ad4e';
            lineWidth = 1;
            break;
        case 'closet':
            fillStyle = 'rgba(217, 83, 79, 0.3)';
            strokeStyle = '#d9534f';
            lineWidth = 1;
            break;
    }
    
    // Draw preview based on the current tool
    if (['wall', 'door-standard', 'door-emergency', 'window', 'emergency-route'].includes(currentState.currentTool)) {
        // Line type preview
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
    } else {
        // Rectangle type preview
        const width = Math.abs(endPoint.x - startPoint.x);
        const height = Math.abs(endPoint.y - startPoint.y);
        const x = Math.min(startPoint.x, endPoint.x);
        const y = Math.min(startPoint.y, endPoint.y);
        
        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([5, 5]);
        
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
    }
    
    ctx.restore();
}

// Draw dimensions of the element being drawn
function drawDimensions(ctx, start, end) {
    ctx.save();
    
    // Convert meter coordinates to canvas coordinates
    const startPoint = {
        x: start.x * currentState.scale + currentState.panOffset.x,
        y: start.y * currentState.scale + currentState.panOffset.y
    };
    
    const endPoint = {
        x: end.x * currentState.scale + currentState.panOffset.x,
        y: end.y * currentState.scale + currentState.panOffset.y
    };
    
    // Calculate width and height in meters
    const widthMeters = Math.abs(end.x - start.x);
    const heightMeters = Math.abs(end.y - start.y);
    const lengthMeters = Math.sqrt(
        Math.pow(end.x - start.x, 2) + 
        Math.pow(end.y - start.y, 2)
    );
    
    // Set text style
    ctx.font = '12px Arial';
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // For line-type elements (walls, doors, windows, emergency routes)
    if (['wall', 'door-standard', 'door-emergency', 'window', 'emergency-route'].includes(currentState.currentTool)) {
        // Position for length display - middle of the line, slightly offset
        const midX = (startPoint.x + endPoint.x) / 2;
        const midY = (startPoint.y + endPoint.y) / 2;
        
        // Calculate perpendicular direction for offset
        const dirX = (endPoint.x - startPoint.x) / (Math.max(1, Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2))));
        const dirY = (endPoint.y - startPoint.y) / (Math.max(1, Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2))));
        const perpX = -dirY;
        const perpY = dirX;
        
        // Offset the text from the line
        const textX = midX + perpX * 15;
        const textY = midY + perpY * 15;
        
        // Text with stroke for better visibility
        const lengthText = `${lengthMeters.toFixed(2)} m`;
        ctx.strokeText(lengthText, textX, textY);
        ctx.fillText(lengthText, textX, textY);
    } 
    // For rectangle-type elements (machines, closets)
    else if (['machine', 'closet'].includes(currentState.currentTool)) {
        const width = Math.abs(endPoint.x - startPoint.x);
        const height = Math.abs(endPoint.y - startPoint.y);
        const x = Math.min(startPoint.x, endPoint.x);
        const y = Math.min(startPoint.y, endPoint.y);
        
        // Width dimension on top
        const widthText = `${widthMeters.toFixed(2)} m`;
        ctx.strokeText(widthText, x + width / 2, y - 10);
        ctx.fillText(widthText, x + width / 2, y - 10);
        
        // Height dimension on the side
        const heightText = `${heightMeters.toFixed(2)} m`;
        ctx.strokeText(heightText, x - 10, y + height / 2);
        ctx.fillText(heightText, x - 10, y + height / 2);
    }
    
    ctx.restore();
} 