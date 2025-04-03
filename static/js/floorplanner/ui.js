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
            
            // Show a status message for snapping when drawing doors or windows
            if (['door-standard', 'door-emergency', 'window'].includes(currentState.currentTool)) {
                // Check if we'd snap to a wall
                const snappedPoints = getSnappedPreviewPoints(currentState.startPoint, pos);
                if (snappedPoints.wall) {
                    // Show visual feedback in the UI
                    const statusElement = document.getElementById('status-message');
                    if (statusElement) {
                        statusElement.textContent = 'Snapping to wall';
                        statusElement.style.display = 'block';
                        // Hide the message after 3 seconds
                        setTimeout(() => {
                            statusElement.style.display = 'none';
                        }, 3000);
                    }
                }
            }
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
        } else if (currentState.selectedElement && currentState.selectedElement.element_type === 'emergency-route') {
            // Add point to emergency route on double click
            if (e.detail === 2) {
                const pos = getCanvasMousePosition(e, canvas);
                addPointToEmergencyRoute(pos);
            }
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

    // Key down event - handle delete key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            deleteSelectedElement();
        }
    });
}

// Set up tool buttons
function setupToolButtons() {
    const toolButtons = document.querySelectorAll('.tool-btn');
    
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            setActiveTool(button.dataset.tool);
        });
    });
    
    // Set up delete button
    const deleteButton = document.getElementById('delete-btn');
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            setActiveTool('select');
            deleteSelectedElement();
        });
    }
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
};

// Select an element
function selectElement(element) {
    // Update the current state to track the newly selected element
    currentState.selectedElement = element;
    
    // Clear resizing and drawing states
    currentState.isResizing = true;
    currentState.isDrawing = false;
    currentState.resizeHandle = null;
    
    
    // Update UI to show the element is selected
    const canvas = document.getElementById('floorplan-canvas');
    if (canvas) {
        if (element) {
            canvas.style.cursor = 'move';
        } else {
            canvas.style.cursor = currentState.currentTool === 'select' ? 'default' : 'crosshair';
        }
    }
} 