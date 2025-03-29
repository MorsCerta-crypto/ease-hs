/**
 * Safety Floor Planner
 * A floor planner for drawing safety-related elements in a facility
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the editor when the floorplan canvas is loaded
    document.body.addEventListener('htmx:afterSwap', (event) => {
        if (event.detail.target.id === 'main-content' && 
            document.getElementById('floorplan-canvas')) {
            initFloorPlanEditor();
        }
    });
});

// Floor plan state
let currentState = {
    floorplanId: null,
    elements: [],
    selectedElement: null,
    currentTool: 'select',
    isDrawing: false,
    startPoint: null,
    scale: 1,
    panOffset: { x: 0, y: 0 },
    gridSize: 0.5, // Grid size in meters
};

// Floor plan editor initialization
function initFloorPlanEditor() {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    
    // Get the floorplan data attributes
    currentState.floorplanId = canvas.dataset.floorplan;
    const width = parseFloat(canvas.dataset.width);
    const height = parseFloat(canvas.dataset.height);
    
    // Set up 2D context
    const ctx = canvas.getContext('2d');
    
    // Calculate the scale to fit the canvas
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;
    currentState.scale = Math.min(scaleX, scaleY) * 0.9;
    
    // Center the floorplan
    currentState.panOffset.x = (canvas.width - width * currentState.scale) / 2;
    currentState.panOffset.y = (canvas.height - height * currentState.scale) / 2;
    
    // Load existing elements if any
    loadFloorPlanElements();
    
    // Add event listeners for the canvas
    setupCanvasEvents(canvas);
    
    // Activate the select tool by default
    setActiveTool('select');
    
    // Set up tool buttons
    setupToolButtons();
    
    // Set up export button
    setupExportButton(canvas);
    
    // First render
    render(canvas);
}

// Load floor plan elements from the server
function loadFloorPlanElements() {
    if (!currentState.floorplanId) return;
    
    fetch(`/data/${currentState.floorplanId}.json`)
        .then(response => response.json())
        .then(data => {
            currentState.elements = data.elements || [];
            // Render the canvas after loading elements
            const canvas = document.getElementById('floorplan-canvas');
            if (canvas) render(canvas);
        })
        .catch(error => {
            console.error('Error loading floor plan elements:', error);
        });
}

// Set up canvas event listeners
function setupCanvasEvents(canvas) {
    // Mouse down event - start drawing or select element
    canvas.addEventListener('mousedown', (e) => {
        const pos = getCanvasMousePosition(e, canvas);
        
        if (currentState.currentTool === 'select') {
            // Try to select an element
            const element = findElementAtPosition(pos);
            selectElement(element);
        } else {
            // Start drawing a new element
            currentState.isDrawing = true;
            currentState.startPoint = pos;
        }
        
        render(canvas);
    });
    
    // Mouse move event - update drawing or dragging
    canvas.addEventListener('mousemove', (e) => {
        const pos = getCanvasMousePosition(e, canvas);
        
        if (currentState.isDrawing && currentState.startPoint) {
            // If drawing, update the preview
            render(canvas, { previewEnd: pos });
        } else if (currentState.selectedElement && e.buttons === 1 && currentState.currentTool === 'select') {
            // If dragging a selected element
            dragSelectedElement(pos);
            render(canvas);
        }
    });
    
    // Mouse up event - finish drawing or dragging
    canvas.addEventListener('mouseup', (e) => {
        if (currentState.isDrawing && currentState.startPoint) {
            const pos = getCanvasMousePosition(e, canvas);
            finishDrawing(pos);
        }
        
        currentState.isDrawing = false;
        render(canvas);
    });
    
    // Mouse leave event - cancel drawing
    canvas.addEventListener('mouseleave', () => {
        currentState.isDrawing = false;
        render(canvas);
    });
}

// Set up tool buttons
function setupToolButtons() {
    const toolButtons = document.querySelectorAll('.tool-btn');
    
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tool = button.dataset.tool;
            setActiveTool(tool);
        });
    });
}

// Set up export button
function setupExportButton(canvas) {
    const exportButton = document.getElementById('export-png');
    if (!exportButton) return;
    
    exportButton.addEventListener('click', () => {
        // Create a temporary canvas for exporting with proper size
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set the export size
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        // Fill background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the floor plan
        renderToContext(tempCtx, tempCanvas.width, tempCanvas.height);
        
        // Create download link
        const link = document.createElement('a');
        link.download = `floorplan-${currentState.floorplanId}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    });
}

// Set the active tool
function setActiveTool(tool) {
    // Update current tool state
    currentState.currentTool = tool;
    
    // Update UI
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(button => {
        if (button.dataset.tool === tool) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Clear selection when changing tools (except for select)
    if (tool !== 'select') {
        selectElement(null);
    }
    
    // Set appropriate cursor
    const canvas = document.getElementById('floorplan-canvas');
    if (canvas) {
        if (tool === 'select') {
            canvas.style.cursor = 'default';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    }
}

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
        
        // For line-type elements (walls, doors, windows)
        if (['wall', 'door-standard', 'door-emergency', 'window'].includes(element.element_type)) {
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

// Select an element
function selectElement(element) {
    currentState.selectedElement = element;
    updatePropertiesPanel();
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

// Update the properties panel with the selected element's data
function updatePropertiesPanel() {
    const propertiesPanel = document.getElementById('element-properties');
    if (!propertiesPanel) return;
    
    if (!currentState.selectedElement) {
        propertiesPanel.innerHTML = '<p>No element selected</p>';
        return;
    }
    
    const element = currentState.selectedElement;
    
    let propertiesForm = `
        <form class="element-props-form">
            <input type="hidden" id="element-id" value="${element.id}">
            
            <label>Type</label>
            <select id="element-type" onchange="updateElementProperty('element_type', this.value)">
                <option value="wall" ${element.element_type === 'wall' ? 'selected' : ''}>Wall</option>
                <option value="door-standard" ${element.element_type === 'door-standard' ? 'selected' : ''}>Door (Standard)</option>
                <option value="door-emergency" ${element.element_type === 'door-emergency' ? 'selected' : ''}>Door (Emergency)</option>
                <option value="window" ${element.element_type === 'window' ? 'selected' : ''}>Window</option>
                <option value="machine" ${element.element_type === 'machine' ? 'selected' : ''}>Machine</option>
                <option value="closet" ${element.element_type === 'closet' ? 'selected' : ''}>Safety Closet</option>
            </select>
            
            <label>Width (m)</label>
            <input type="number" id="element-width" value="${element.width}" step="0.05" min="0.1" max="2" 
                   onchange="updateElementProperty('width', parseFloat(this.value))">
    `;
    
    // Add specific properties based on element type
    if (element.element_type === 'machine') {
        propertiesForm += `
            <label>Name</label>
            <input type="text" id="machine-name" value="${element.properties.name || ''}" 
                   onchange="updateElementProperty('properties.name', this.value)">
            
            <label>Description</label>
            <textarea id="machine-description" rows="3" 
                      onchange="updateElementProperty('properties.description', this.value)">${element.properties.description || ''}</textarea>
            
            <label>Hazard Level (1-5)</label>
            <input type="number" id="machine-hazard" value="${element.properties.hazardLevel || 1}" min="1" max="5" 
                   onchange="updateElementProperty('properties.hazardLevel', parseInt(this.value))">
        `;
    } else if (element.element_type === 'closet') {
        propertiesForm += `
            <label>Content Type</label>
            <select id="closet-type" onchange="updateElementProperty('properties.contentType', this.value)">
                <option value="chemical" ${(element.properties.contentType || '') === 'chemical' ? 'selected' : ''}>Chemical</option>
                <option value="flammable" ${(element.properties.contentType || '') === 'flammable' ? 'selected' : ''}>Flammable</option>
                <option value="biological" ${(element.properties.contentType || '') === 'biological' ? 'selected' : ''}>Biological</option>
                <option value="radioactive" ${(element.properties.contentType || '') === 'radioactive' ? 'selected' : ''}>Radioactive</option>
                <option value="other" ${(element.properties.contentType || '') === 'other' ? 'selected' : ''}>Other</option>
            </select>
            
            <label>Description</label>
            <textarea id="closet-description" rows="3" 
                      onchange="updateElementProperty('properties.description', this.value)">${element.properties.description || ''}</textarea>
        `;
    }
    
    propertiesForm += `
            <div style="margin-top: 15px;">
                <button type="button" class="uk-button uk-button-danger" onclick="deleteSelectedElement()">Delete Element</button>
            </div>
        </form>
    `;
    
    propertiesPanel.innerHTML = propertiesForm;
}

// Update a property of the selected element
window.updateElementProperty = function(propertyPath, value) {
    if (!currentState.selectedElement) return;
    
    const element = currentState.selectedElement;
    const parts = propertyPath.split('.');
    
    if (parts.length === 1) {
        element[parts[0]] = value;
    } else {
        // For nested properties like 'properties.name'
        let obj = element;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!obj[parts[i]]) {
                obj[parts[i]] = {};
            }
            obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
    }
    
    // Render the updated state
    const canvas = document.getElementById('floorplan-canvas');
    if (canvas) render(canvas);
    
    // Save changes
    saveChanges();
};

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
        
        // Save changes
        saveChanges();
    }
};

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
    
    // Add default properties based on element type
    if (currentState.currentTool === 'machine') {
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
    saveChanges();
    
    // Reset drawing state
    currentState.startPoint = null;
}

// Generate a unique ID for new elements
function generateId() {
    return 'element_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// Save changes to the server
function saveChanges() {
    if (!currentState.floorplanId) return;
    
    // Get the form data
    const formData = new FormData();
    formData.append('elements', JSON.stringify(currentState.elements));
    
    // Send the data
    fetch(`/save_floorplan?floorplan_id=${currentState.floorplanId}`, {
        method: 'POST',
        body: formData,
        headers: {
            'HX-Request': 'true'
        }
    })
        .then(response => response.text())
        .then(html => {
            const saveStatus = document.getElementById('save-status');
            if (saveStatus) {
                saveStatus.innerHTML = html;
                
                // Clear the status after a few seconds
                setTimeout(() => {
                    saveStatus.innerHTML = '';
                }, 3000);
            }
        })
        .catch(error => {
            console.error('Error saving floor plan:', error);
            const saveStatus = document.getElementById('save-status');
            if (saveStatus) {
                saveStatus.innerHTML = '<div class="error-message">Error saving floor plan</div>';
            }
        });
}

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
    // Draw grid
    drawGrid(ctx, width, height);
    
    // Draw elements
    drawElements(ctx, options);
    
    // Draw selection
    if (currentState.selectedElement) {
        drawSelectionBox(ctx, currentState.selectedElement);
    }
    
    // Draw preview while drawing
    if (currentState.isDrawing && currentState.startPoint && options.previewEnd) {
        drawPreview(ctx, currentState.startPoint, options.previewEnd);
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
    if (['wall', 'door-standard', 'door-emergency', 'window'].includes(element.element_type)) {
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
        
        ctx.beginPath();
        ctx.arc(start.x, start.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(end.x, end.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
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
        
        // Draw control points at corners
        ctx.fillStyle = '#007bff';
        ctx.setLineDash([]);
        const pointRadius = 4;
        
        // Top-left
        ctx.beginPath();
        ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Top-right
        ctx.beginPath();
        ctx.arc(x + width, y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bottom-left
        ctx.beginPath();
        ctx.arc(x, y + height, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bottom-right
        ctx.beginPath();
        ctx.arc(x + width, y + height, pointRadius, 0, Math.PI * 2);
        ctx.fill();
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
    if (['wall', 'door-standard', 'door-emergency', 'window'].includes(currentState.currentTool)) {
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