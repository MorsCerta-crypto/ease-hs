// Set up canvas event listeners
function setupCanvasEvents(canvas) {
    // Mouse down event - start drawing or select element
    canvas.addEventListener('mousedown', (e) => {
        const pos = getCanvasMousePosition(e, canvas);
        
        if (currentState.currentTool === 'select') {
            // Check if clicking on a resize handle
            if (currentState.selectedElement) {
                const handle = getResizeHandleAtPosition(pos);
                if (handle) {
                    currentState.isResizing = true;
                    currentState.resizeHandle = handle;
                    return;
                }
            }
            
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
    
    // Mouse move event - update drawing, dragging or resizing
    canvas.addEventListener('mousemove', (e) => {
        const pos = getCanvasMousePosition(e, canvas);
        
        if (currentState.isResizing && currentState.selectedElement && e.buttons === 1) {
            // Handle resizing
            resizeSelectedElement(pos);
            render(canvas);
        } else if (currentState.isDrawing && currentState.startPoint) {
            // If drawing, update the preview
            render(canvas, { previewEnd: pos });
        } else if (currentState.selectedElement && e.buttons === 1 && currentState.currentTool === 'select') {
            // If dragging a selected element
            dragSelectedElement(pos);
            render(canvas);
        } else if (currentState.selectedElement) {
            // Update cursor based on resize handles
            const handle = getResizeHandleAtPosition(pos);
            if (handle) {
                // Set the appropriate cursor based on which handle
                if (handle === 'top-left' || handle === 'bottom-right') {
                    canvas.style.cursor = 'nwse-resize';
                } else if (handle === 'top-right' || handle === 'bottom-left') {
                    canvas.style.cursor = 'nesw-resize';
                } else if (handle === 'start' || handle === 'end') {
                    canvas.style.cursor = 'move';
                }
            } else {
                // Reset cursor
                canvas.style.cursor = currentState.currentTool === 'select' ? 'default' : 'crosshair';
            }
        }
    });
    
    // Mouse up event - finish drawing, dragging or resizing
    canvas.addEventListener('mouseup', (e) => {
        if (currentState.isResizing) {
            const pos = getCanvasMousePosition(e, canvas);
            resizeSelectedElement(pos);
            currentState.isResizing = false;
            currentState.resizeHandle = null;
        } else if (currentState.isDrawing && currentState.startPoint) {
            const pos = getCanvasMousePosition(e, canvas);
            finishDrawing(pos);
        }
        
        currentState.isDrawing = false;
        render(canvas);
    });
    
    // Mouse leave event - cancel drawing or resizing
    canvas.addEventListener('mouseleave', () => {
        currentState.isDrawing = false;
        currentState.isResizing = false;
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
        renderToContext(tempCtx, tempCanvas.width, tempCanvas.height, { exporting: true });
        
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

// Select an element
function selectElement(element) {
    currentState.selectedElement = element;
    updatePropertiesPanel();
}

// Update the properties panel with the selected element's data
function updatePropertiesPanel() {
    const propertiesPanel = document.getElementById('element-properties');
    if (!propertiesPanel) return;
    
    if (!currentState.selectedElement) {
        propertiesPanel.innerHTML = '<p>Kein Element ausgewählt</p>';
        return;
    }
    
    const element = currentState.selectedElement;
    
    let propertiesForm = `
        <form class="element-props-form">
            <input type="hidden" id="element-id" value="${element.id}">
            
            <label>Typ</label>
            <select id="element-type" onchange="updateElementProperty('element_type', this.value)">
                <option value="wall" ${element.element_type === 'wall' ? 'selected' : ''}>Wand</option>
                <option value="door-standard" ${element.element_type === 'door-standard' ? 'selected' : ''}>Tür (Standard)</option>
                <option value="door-emergency" ${element.element_type === 'door-emergency' ? 'selected' : ''}>Tür (Notausgang)</option>
                <option value="window" ${element.element_type === 'window' ? 'selected' : ''}>Fenster</option>
                <option value="emergency-route" ${element.element_type === 'emergency-route' ? 'selected' : ''}>Fluchtweg</option>
                <option value="machine" ${element.element_type === 'machine' ? 'selected' : ''}>Maschine</option>
                <option value="closet" ${element.element_type === 'closet' ? 'selected' : ''}>Sicherheitsschrank</option>
            </select>
            
            <label>Breite (m)</label>
            <input type="number" id="element-width" value="${element.width}" step="0.05" min="0.1" max="2" 
                   onchange="updateElementProperty('width', parseFloat(this.value))">
    `;
    
    // Add specific properties based on element type
    if (element.element_type === 'machine') {
        propertiesForm += `
            <label>Name</label>
            <input type="text" id="machine-name" value="${element.properties.name || ''}" 
                   onchange="updateElementProperty('properties.name', this.value)">
            
            <label>Beschreibung</label>
            <textarea id="machine-description" rows="3" 
                      onchange="updateElementProperty('properties.description', this.value)">${element.properties.description || ''}</textarea>
            
            <label>Gefährdungsstufe (1-5)</label>
            <input type="number" id="machine-hazard" value="${element.properties.hazardLevel || 1}" min="1" max="5" 
                   onchange="updateElementProperty('properties.hazardLevel', parseInt(this.value))">
        `;
    } else if (element.element_type === 'closet') {
        propertiesForm += `
            <label>Inhaltstyp</label>
            <select id="closet-type" onchange="updateElementProperty('properties.contentType', this.value)">
                <option value="chemical" ${(element.properties.contentType || '') === 'chemical' ? 'selected' : ''}>Chemikalien</option>
                <option value="flammable" ${(element.properties.contentType || '') === 'flammable' ? 'selected' : ''}>Entzündlich</option>
                <option value="biological" ${(element.properties.contentType || '') === 'biological' ? 'selected' : ''}>Biologisch</option>
                <option value="radioactive" ${(element.properties.contentType || '') === 'radioactive' ? 'selected' : ''}>Radioaktiv</option>
                <option value="other" ${(element.properties.contentType || '') === 'other' ? 'selected' : ''}>Sonstiges</option>
            </select>
            
            <label>Beschreibung</label>
            <textarea id="closet-description" rows="3" 
                      onchange="updateElementProperty('properties.description', this.value)">${element.properties.description || ''}</textarea>
        `;
    } else if (element.element_type === 'emergency-route') {
        propertiesForm += `
            <label>Routenname</label>
            <input type="text" id="route-name" value="${element.properties?.routeName || 'Notausgang'}" 
                   onchange="updateElementProperty('properties.routeName', this.value)">
            
            <label>Ausgangspunkt</label>
            <select id="route-exit-point" onchange="updateElementProperty('properties.exitPoint', this.value)">
                <option value="start" ${(element.properties?.exitPoint || '') === 'start' ? 'selected' : ''}>Startpunkt</option>
                <option value="end" ${(element.properties?.exitPoint || '') === 'end' ? 'selected' : ''}>Endpunkt</option>
            </select>
        `;
    }
    
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
    // saveChanges();
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
    }
}; 