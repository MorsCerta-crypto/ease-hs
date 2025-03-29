/**
 * Sicherheits-Grundrissplaner
 * Ein Grundrissplaner zum Zeichnen von sicherheitsrelevanten Elementen in einer Einrichtung
 */

// Initialize event listeners after DOM content loads or HTMX content swaps
document.addEventListener('DOMContentLoaded', initializeEventListeners);
document.addEventListener('htmx:afterSwap', initializeEventListeners);

function initializeEventListeners() {
    // Mode toggle functionality
    const modeToggle = document.getElementById('mode-toggle');
    const editLabel = document.getElementById('edit-label');
    const viewLabel = document.getElementById('view-label');
    const editSidebar = document.getElementById('edit-mode-sidebar');
    const viewSidebar = document.getElementById('view-mode-sidebar');
    
    if (modeToggle) {
        modeToggle.addEventListener('change', function() {
            if (this.checked) {
                // View mode
                editLabel.classList.remove('active');
                viewLabel.classList.add('active');
                editSidebar.classList.add('hidden');
                viewSidebar.classList.remove('hidden');
            } else {
                // Edit mode
                editLabel.classList.add('active');
                viewLabel.classList.remove('active');
                editSidebar.classList.remove('hidden');
                viewSidebar.classList.add('hidden');
            }
        });
    }
    
    // Tool buttons activation
    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tool = this.getAttribute('data-tool');
            
            // If delete tool is clicked and we have a selected object, delete it immediately
            if (tool === 'delete' && window.canvasState.selectedObject) {
                deleteElement(window.canvasState.selectedObject);
                window.canvasState.selectedObject = null;
                
                // After deletion, revert to select tool
                const selectButton = document.querySelector('[data-tool="select"]');
                if (selectButton) {
                    // Remove active class from all tool buttons
                    toolButtons.forEach(btn => btn.classList.remove('active'));
                    // Add active class to select button
                    selectButton.classList.add('active');
                    currentTool = 'select';
                }
                
                checkSelectedObject();
                renderCanvas();
                return;
            }
            
            // Remove active class from all tool buttons
            toolButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Set current tool
            currentTool = tool;
            
            // Activate delete button only when select tool is active and an object is selected
            if (currentTool === 'select') {
                checkSelectedObject();
            } else {
                // Disable delete button when not in select mode
                const deleteButton = document.querySelector('[data-tool="delete"]');
                if (deleteButton) {
                    deleteButton.disabled = true;
                }
            }
        });
    });
    
    // Ensure "Auswählen" (select) tool is active by default
    const selectButton = document.querySelector('[data-tool="select"]');
    if (selectButton && !selectButton.classList.contains('active')) {
        toolButtons.forEach(btn => btn.classList.remove('active'));
        selectButton.classList.add('active');
        currentTool = 'select';
    }
    
    // Canvas selection and drawing
    const canvas = document.getElementById('floorplan-canvas');
    if (canvas) {
        // Initialize canvas context and event handlers
        initializeCanvas(canvas);
        
        // Add mousemove handler to show tooltip even when not drawing
        canvas.addEventListener('mousemove', function(e) {
            if (!window.canvasState.isDrawing) {
                updateCanvasTooltip(e, currentTool);
            }
        });
        
        // Hide tooltip when mouse leaves canvas
        canvas.addEventListener('mouseleave', function() {
            const tooltip = document.getElementById('canvas-tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        });
    }
}

// Canvas handling variables
let currentTool = 'select';
let selectedObject = null;

function initializeCanvas(canvas) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const floorplanId = canvas.getAttribute('data-floorplan');
    let elements = [];
    
    // Mouse event handlers for canvas
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // Initialize scale and offset for proper rendering
    const width = parseFloat(canvas.getAttribute('data-width') || 20);
    const height = parseFloat(canvas.getAttribute('data-height') || 15);
    
    // Calculate scales to fit the canvas
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    
    // Center the drawing
    const panOffsetX = (canvas.width - width * scale) / 2;
    const panOffsetY = (canvas.height - height * scale) / 2;
    
    // Make these available to other functions
    window.canvasState = {
        elements: [],
        scale: scale,
        panOffsetX: panOffsetX,
        panOffsetY: panOffsetY,
        selectedObject: null,
        currentTool: 'select',
        isDrawing: false,
        startPoint: null
    };
    
    // Draw initial grid
    drawGrid(ctx, canvas.width, canvas.height);
    
    function handleMouseDown(e) {
        const x = e.offsetX;
        const y = e.offsetY;
        
        // Convert to world coordinates
        const worldX = (x - window.canvasState.panOffsetX) / window.canvasState.scale;
        const worldY = (y - window.canvasState.panOffsetY) / window.canvasState.scale;
        
        if (currentTool === 'select') {
            // Find if clicked on an element
            window.canvasState.selectedObject = findElementAt(worldX, worldY);
            checkSelectedObject();
        } else if (currentTool === 'delete') {
            if (window.canvasState.selectedObject) {
                deleteElement(window.canvasState.selectedObject);
                window.canvasState.selectedObject = null;
                checkSelectedObject();
            }
        } else {
            // Start drawing a new element
            window.canvasState.isDrawing = true;
            window.canvasState.startPoint = { x: worldX, y: worldY };
        }
        
        renderCanvas();
    }
    
    function handleMouseMove(e) {
        const x = e.offsetX;
        const y = e.offsetY;
        
        // Convert to world coordinates
        const worldX = (x - window.canvasState.panOffsetX) / window.canvasState.scale;
        const worldY = (y - window.canvasState.panOffsetY) / window.canvasState.scale;
        
        // Always show tooltip with current action
        updateCanvasTooltip(e, currentTool);
        
        // Handle resizing if in resize mode
        if (window.canvasState.resizing && window.canvasState.selectedObject) {
            const element = window.canvasState.selectedObject;
            const handle = window.canvasState.resizeHandle;
            const original = window.canvasState.originalElement;
            
            // Resize element based on which handle is being dragged
            if (handle.includes('t')) element.start.y = worldY;
            if (handle.includes('b')) element.end.y = worldY;
            if (handle.includes('l')) element.start.x = worldX;
            if (handle.includes('r')) element.end.x = worldX;
            
            renderCanvas();
            return;
        }
        
        if (window.canvasState.isDrawing) {
            // Draw preview
            renderCanvas({ previewEnd: { x: worldX, y: worldY } });
        }
    }
    
    function handleMouseUp(e) {
        // Hide tooltip
        const tooltip = document.getElementById('canvas-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        
        // Handle end of resize operation
        if (window.canvasState.resizing) {
            window.canvasState.resizing = false;
            window.canvasState.resizeHandle = null;
            // saveChanges();
            return;
        }
        
        if (!window.canvasState.isDrawing) return;
        
        const x = e.offsetX;
        const y = e.offsetY;
        
        // Convert to world coordinates
        const worldX = (x - window.canvasState.panOffsetX) / window.canvasState.scale;
        const worldY = (y - window.canvasState.panOffsetY) / window.canvasState.scale;
        
        // Create the element
        createNewElement(currentTool, 
                      window.canvasState.startPoint.x, 
                      window.canvasState.startPoint.y, 
                      worldX, 
                      worldY);
        
        // Reset drawing state
        window.canvasState.isDrawing = false;
        window.canvasState.startPoint = null;
        
        renderCanvas();
    }
    
    function createNewElement(type, startX, startY, endX, endY) {
        // Minimum size check
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        if (distance < 0.2) return;
        
        const newElement = {
            id: `element_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            element_type: type,
            start: { x: startX, y: startY },
            end: { x: endX, y: endY },
            width: type === 'fluchtwege' ? 0.15 : 0.2,
            properties: {}
        };
        
        // Add default properties based on element type
        if (type === 'machine') {
            newElement.properties = {
                name: "Maschine",
                description: "Equipment description",
                hazardLevel: 1
            };
        } else if (type === 'closet') {
            newElement.properties = {
                contentType: "chemical",
                description: "Hazardous materials storage"
            };
        } else if (type === 'fluchtwege') {
            newElement.properties = {
                name: "Fluchtweg",
                description: "Notfallroute"
            };
        }
        
        // Add the element
        window.canvasState.elements.push(newElement);
        console.log(`Created ${type} from (${startX},${startY}) to (${endX},${endY})`);
        
        // Save changes
        // saveChanges();
    }
    
    function findElementAt(x, y) {
        // Simple distance check for elements
        const hitDistance = 0.3; // meters
        
        for (let i = window.canvasState.elements.length - 1; i >= 0; i--) {
            const element = window.canvasState.elements[i];
            
            if (['wall', 'door-standard', 'door-emergency', 'window', 'fluchtwege'].includes(element.element_type)) {
                // For line elements, check distance to line
                const dist = distanceToLine({x, y}, element.start, element.end);
                if (dist < hitDistance) return element;
            } else {
                // For box elements (machines, closets)
                const minX = Math.min(element.start.x, element.end.x);
                const maxX = Math.max(element.start.x, element.end.x);
                const minY = Math.min(element.start.y, element.end.y);
                const maxY = Math.max(element.start.y, element.end.y);
                
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                    return element;
                }
            }
        }
        return null;
    }
    
    function distanceToLine(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        
        if (len_sq !== 0) param = dot / len_sq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    function deleteElement(element) {
        if (!element) return;
        
        try {
            const index = window.canvasState.elements.findIndex(e => e.id === element.id);
            if (index !== -1) {
                // Remove the element from the array
                window.canvasState.elements.splice(index, 1);
                console.log(`Deleted element ${element.id}`);
                
                // Clear selection
                window.canvasState.selectedObject = null;
                
                // Update the canvas
                renderCanvas();
                
                // Re-enable the delete button
                checkSelectedObject();
                
                // Save changes to server
                // saveChanges();
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting element:', error);
            return false;
        }
    }
    
    function renderCanvas(options = {}) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        drawGrid(ctx, canvas.width, canvas.height);
        
        // Draw all elements
        for (const element of window.canvasState.elements) {
            drawElement(ctx, element);
        }
        
        // Draw selection if applicable
        if (window.canvasState.selectedObject) {
            drawSelection(ctx, window.canvasState.selectedObject);
        }
        
        // Draw preview while drawing
        if (window.canvasState.isDrawing && window.canvasState.startPoint && options.previewEnd) {
            drawPreview(ctx, window.canvasState.startPoint, options.previewEnd, currentTool);
        }
    }
    
    function drawGrid(ctx, width, height) {
        const gridSize = 1; // 1 meter grid
        const gridPixels = gridSize * window.canvasState.scale;
        
        ctx.strokeStyle = '#eeeeee';
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = window.canvasState.panOffsetX % gridPixels; x < width; x += gridPixels) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = window.canvasState.panOffsetY % gridPixels; y < height; y += gridPixels) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    function drawElement(ctx, element) {
        // Convert world coordinates to screen coordinates
        const startX = element.start.x * window.canvasState.scale + window.canvasState.panOffsetX;
        const startY = element.start.y * window.canvasState.scale + window.canvasState.panOffsetY;
        const endX = element.end.x * window.canvasState.scale + window.canvasState.panOffsetX;
        const endY = element.end.y * window.canvasState.scale + window.canvasState.panOffsetY;
        
        ctx.beginPath();
        
        switch (element.element_type) {
            case 'wall':
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 6; // Thicker
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                break;
                
            case 'door-standard':
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 4; // Thicker
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                break;
                
            case 'door-emergency':
                ctx.strokeStyle = '#d9534f';
                ctx.lineWidth = 4; // Thicker
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                break;
                
            case 'window':
                ctx.strokeStyle = '#5bc0de';
                ctx.lineWidth = 3; // Slightly thicker
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                break;
                
            case 'fluchtwege':
                // Draw escape route with green dashed line with arrows
                ctx.strokeStyle = '#4CAF50';
                ctx.lineWidth = 4; // Thicker
                ctx.setLineDash([5, 3]);
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                
                // Draw arrow
                drawArrow(ctx, startX, startY, endX, endY, '#4CAF50');
                ctx.setLineDash([]); // Reset dash
                break;
                
            case 'machine':
                // Draw machine as rectangle
                const machineWidth = Math.abs(endX - startX);
                const machineHeight = Math.abs(endY - startY);
                const machineX = Math.min(startX, endX);
                const machineY = Math.min(startY, endY);
                
                ctx.fillStyle = '#f0ad4e';
                ctx.fillRect(machineX, machineY, machineWidth, machineHeight);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2; // Thicker
                ctx.strokeRect(machineX, machineY, machineWidth, machineHeight);
                break;
                
            case 'closet':
                // Draw closet as rectangle
                const closetWidth = Math.abs(endX - startX);
                const closetHeight = Math.abs(endY - startY);
                const closetX = Math.min(startX, endX);
                const closetY = Math.min(startY, endY);
                
                ctx.fillStyle = 'rgba(217, 83, 79, 0.6)';
                ctx.fillRect(closetX, closetY, closetWidth, closetHeight);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2; // Thicker
                ctx.strokeRect(closetX, closetY, closetWidth, closetHeight);
                break;
        }
    }
    
    function drawArrow(ctx, fromX, fromY, toX, toY, color) {
        const headlen = 10; // length of arrow head in pixels
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        
        ctx.fillStyle = color;
        
        // Calculate position for arrowhead
        const arrowX = toX - headlen * Math.cos(angle);
        const arrowY = toY - headlen * Math.sin(angle);
        
        // Draw arrowhead
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(arrowX - headlen * Math.cos(angle - Math.PI/6), 
                  arrowY - headlen * Math.sin(angle - Math.PI/6));
        ctx.lineTo(arrowX - headlen * Math.cos(angle + Math.PI/6), 
                  arrowY - headlen * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fill();
    }
    
    function drawSelection(ctx, element) {
        const startX = element.start.x * window.canvasState.scale + window.canvasState.panOffsetX;
        const startY = element.start.y * window.canvasState.scale + window.canvasState.panOffsetY;
        const endX = element.end.x * window.canvasState.scale + window.canvasState.panOffsetX;
        const endY = element.end.y * window.canvasState.scale + window.canvasState.panOffsetY;
        
        // Draw selection highlight
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        
        if (['wall', 'door-standard', 'door-emergency', 'window', 'fluchtwege'].includes(element.element_type)) {
            // Line selection
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Draw control points
            ctx.setLineDash([]);
            ctx.fillStyle = '#007bff';
            ctx.beginPath();
            ctx.arc(startX, startY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(endX, endY, 5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Rectangle selection
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            const x = Math.min(startX, endX);
            const y = Math.min(startY, endY);
            
            ctx.strokeRect(x, y, width, height);
            
            // Draw control points at corners
            ctx.setLineDash([]);
            ctx.fillStyle = '#007bff';
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
        
        ctx.setLineDash([]); // Reset dash pattern
    }
    
    function drawPreview(ctx, start, end, tool) {
        const startX = start.x * window.canvasState.scale + window.canvasState.panOffsetX;
        const startY = start.y * window.canvasState.scale + window.canvasState.panOffsetY;
        const endX = end.x * window.canvasState.scale + window.canvasState.panOffsetX;
        const endY = end.y * window.canvasState.scale + window.canvasState.panOffsetY;
        
        ctx.beginPath();
        
        switch (tool) {
            case 'wall':
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 4;
                ctx.setLineDash([5, 3]);
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                break;
                
            case 'door-standard':
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]);
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                break;
                
            case 'door-emergency':
                ctx.strokeStyle = '#d9534f';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]);
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                break;
                
            case 'window':
                ctx.strokeStyle = '#5bc0de';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 3]);
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                break;
                
            case 'fluchtwege':
                ctx.strokeStyle = '#4CAF50';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]);
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                // Draw arrow preview
                drawArrow(ctx, startX, startY, endX, endY, '#4CAF50');
                break;
                
            case 'machine':
            case 'closet':
                const width = Math.abs(endX - startX);
                const height = Math.abs(endY - startY);
                const x = Math.min(startX, endX);
                const y = Math.min(startY, endY);
                
                ctx.setLineDash([5, 3]);
                ctx.strokeStyle = tool === 'machine' ? '#f0ad4e' : '#d9534f';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                break;
        }
        
        ctx.setLineDash([]); // Reset dash pattern
    }
    
    // Fix for Export as PNG
    document.getElementById('export-png')?.addEventListener('click', function() {
        // Create a temporary canvas for the export
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Fill with white background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Copy state for temporary rendering
        const originalElements = window.canvasState.elements;
        
        // Draw grid
        drawGrid(tempCtx, tempCanvas.width, tempCanvas.height);
        
        // Draw all elements
        for (const element of originalElements) {
            drawElement(tempCtx, element);
        }
        
        // Create download link
        const link = document.createElement('a');
        link.download = `floorplan-${floorplanId || 'export'}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    
    // Initial render
    renderCanvas();
    
    // Function to save changes
    function saveChanges() {
        const saveStatus = document.getElementById('save-status');
        if (saveStatus) {
            saveStatus.innerHTML = '<div class="success-message">Änderungen werden gespeichert...</div>';
        }
        
        // Format the elements data for sending to server
        const formData = new FormData();
        formData.append('elements', JSON.stringify(window.canvasState.elements));
        
        // Get the floorplan ID
        const canvas = document.getElementById('floorplan-canvas');
        const floorplanId = canvas ? canvas.getAttribute('data-floorplan') : null;
        
        if (!floorplanId) {
            if (saveStatus) {
                saveStatus.innerHTML = '<div class="error-message">Fehler: Keine Grundriss-ID gefunden</div>';
            }
            return;
        }
        
        // Send to server
        fetch(`/save_floorplan/${floorplanId}`, {
            method: 'POST',
            body: formData,
            headers: {
                'HX-Request': 'true'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            if (saveStatus) {
                saveStatus.innerHTML = html;
                setTimeout(() => {
                    saveStatus.innerHTML = '';
                }, 3000);
            }
        })
        .catch(error => {
            console.error('Error saving floorplan:', error);
            if (saveStatus) {
                saveStatus.innerHTML = '<div class="error-message">Fehler beim Speichern: ' + error.message + '</div>';
            }
        });
    }
}

// Add checkSelectedObject function
function checkSelectedObject() {
    const deleteButton = document.querySelector('[data-tool="delete"]');
    if (deleteButton) {
        deleteButton.disabled = !window.canvasState.selectedObject;
    }
}

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
    mode: 'edit', // Current mode: 'edit' or 'view'
    activeElementId: null // Currently active element in view mode
};

// Setup mode toggle
function setupModeToggle() {
    const modeToggle = document.getElementById('mode-toggle');
    if (!modeToggle) return;
    
    modeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            // View mode
            setMode('view');
        } else {
            // Edit mode
            setMode('edit');
        }
    });
}

// Set the current mode
function setMode(mode) {
    currentState.mode = mode;
    
    // Update UI based on mode
    const editModeSidebar = document.getElementById('edit-mode-sidebar');
    const viewModeSidebar = document.getElementById('view-mode-sidebar');
    const propertiesSidebar = document.getElementById('properties-sidebar');
    
    if (mode === 'view') {
        // Switch to view mode
        if (editModeSidebar) editModeSidebar.classList.add('hidden');
        if (viewModeSidebar) viewModeSidebar.classList.remove('hidden');
        if (propertiesSidebar) propertiesSidebar.classList.add('hidden');
        
        // Hide safety info form initially
        const safetyInfoForm = document.getElementById('safety-info-form');
        if (safetyInfoForm) safetyInfoForm.classList.add('hidden');
        
        // Change canvas cursor
        const canvas = document.getElementById('floorplan-canvas');
        if (canvas) canvas.style.cursor = 'pointer';
        
        // Clear any selection
        selectElement(null);
    } else {
        // Switch to edit mode
        if (editModeSidebar) editModeSidebar.classList.remove('hidden');
        if (viewModeSidebar) viewModeSidebar.classList.add('hidden');
        if (propertiesSidebar) propertiesSidebar.classList.remove('hidden');
        
        // Reset current tool to select
        setActiveTool('select');
        
        // Clear active element
        currentState.activeElementId = null;
    }
    
    // Update the canvas
    const canvas = document.getElementById('floorplan-canvas');
    if (canvas) render(canvas);
}

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
        
        if (currentState.mode === 'view') {
            // In view mode, handle clicks on machines and closets
            const element = findElementAtPosition(pos);
            if (element && ['machine', 'closet'].includes(element.element_type)) {
                // Highlight the clicked element
                currentState.activeElementId = element.id;
                // Load safety information
                loadSafetyInformation(element);
                // Render to show the selection
                render(canvas);
            }
        } else {
            // In edit mode
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
        }
    });
    
    // Mouse move event - update drawing or dragging
    canvas.addEventListener('mousemove', (e) => {
        if (currentState.mode === 'edit') {
            const pos = getCanvasMousePosition(e, canvas);
            
            if (currentState.isDrawing && currentState.startPoint) {
                // If drawing, update the preview
                render(canvas, { previewEnd: pos });
            } else if (currentState.selectedElement && e.buttons === 1 && currentState.currentTool === 'select') {
                // If dragging a selected element
                dragSelectedElement(pos);
                render(canvas);
            }
        }
    });
    
    // Mouse up event - finish drawing or dragging
    canvas.addEventListener('mouseup', (e) => {
        if (currentState.mode === 'edit' && currentState.isDrawing && currentState.startPoint) {
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
            
            <label>Gefahrenstufe (1-5)</label>
            <input type="number" id="machine-hazard" value="${element.properties.hazardLevel || 1}" min="1" max="5" 
                   onchange="updateElementProperty('properties.hazardLevel', parseInt(this.value))">
        `;
    } else if (element.element_type === 'closet') {
        propertiesForm += `
            <label>Inhaltstyp</label>
            <select id="closet-type" onchange="updateElementProperty('properties.contentType', this.value)">
                <option value="chemical" ${(element.properties.contentType || '') === 'chemical' ? 'selected' : ''}>Chemisch</option>
                <option value="flammable" ${(element.properties.contentType || '') === 'flammable' ? 'selected' : ''}>Brennbar</option>
                <option value="biological" ${(element.properties.contentType || '') === 'biological' ? 'selected' : ''}>Biologisch</option>
                <option value="radioactive" ${(element.properties.contentType || '') === 'radioactive' ? 'selected' : ''}>Radioaktiv</option>
                <option value="other" ${(element.properties.contentType || '') === 'other' ? 'selected' : ''}>Sonstiges</option>
            </select>
            
            <label>Beschreibung</label>
            <textarea id="closet-description" rows="3" 
                      onchange="updateElementProperty('properties.description', this.value)">${element.properties.description || ''}</textarea>
        `;
    }
    
    propertiesForm += `
            <div style="margin-top: 15px;">
                <button type="button" class="uk-button uk-button-danger" onclick="deleteSelectedElement()">Element löschen</button>
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
        
        // Save changes
        // saveChanges();
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
            name: "Maschine",
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

// Generate a unique ID for new elements
function generateId() {
    return 'element_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// Save changes to the server
function saveChanges() {
    const saveStatus = document.getElementById('save-status');
    if (saveStatus) {
        saveStatus.innerHTML = '<div class="success-message">Änderungen werden gespeichert...</div>';
    }
    
    // Format the elements data for sending to server
    const formData = new FormData();
    formData.append('elements', JSON.stringify(window.canvasState.elements));
    
    // Get the floorplan ID
    const canvas = document.getElementById('floorplan-canvas');
    const floorplanId = canvas ? canvas.getAttribute('data-floorplan') : null;
    
    if (!floorplanId) {
        if (saveStatus) {
            saveStatus.innerHTML = '<div class="error-message">Fehler: Keine Grundriss-ID gefunden</div>';
        }
        return;
    }
    
    // Send to server
    fetch(`/save_floorplan/${floorplanId}`, {
        method: 'POST',
        body: formData,
        headers: {
            'HX-Request': 'true'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(html => {
        if (saveStatus) {
            saveStatus.innerHTML = html;
            setTimeout(() => {
                saveStatus.innerHTML = '';
            }, 3000);
        }
    })
    .catch(error => {
        console.error('Error saving floorplan:', error);
        if (saveStatus) {
            saveStatus.innerHTML = '<div class="error-message">Fehler beim Speichern: ' + error.message + '</div>';
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
    
    // Draw selection in edit mode
    if (currentState.mode === 'edit' && currentState.selectedElement) {
        drawSelectionBox(ctx, currentState.selectedElement);
    }
    
    // Draw active element highlight in view mode
    if (currentState.mode === 'view' && currentState.activeElementId) {
        const activeElement = currentState.elements.find(e => e.id === currentState.activeElementId);
        if (activeElement) {
            drawViewModeHighlight(ctx, activeElement);
        }
    }
    
    // Draw preview while drawing
    if (currentState.isDrawing && currentState.startPoint && options.previewEnd) {
        drawPreview(ctx, currentState.startPoint, options.previewEnd);
    }
}

// Draw grid
function drawGrid(ctx, width, height) {
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Make grid smaller - change from 1 meter to 0.5 meter grid
    const gridSize = 0.5 * window.canvasState.scale;
    
    // Calculate grid start points
    const startX = window.canvasState.panOffsetX % gridSize;
    const startY = window.canvasState.panOffsetY % gridSize;
    
    // Draw minor grid lines
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = startX; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw major grid lines (every 1 meter)
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let x = startX; x < width; x += gridSize * 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y < height; y += gridSize * 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

// Draw elements
function drawElements(ctx, options = {}) {
    // Draw all elements
    for (const element of currentState.elements) {
        drawElement(ctx, element);
        
        // In view mode, add label for machines and closets
        if (currentState.mode === 'view' && ['machine', 'closet'].includes(element.element_type)) {
            drawElementLabel(ctx, element);
        }
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
            ctx.lineWidth = 6; // Thicker
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            break;
            
        case 'door-standard':
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 4; // Thicker
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            break;
            
        case 'door-emergency':
            ctx.strokeStyle = '#d9534f';
            ctx.lineWidth = 4; // Thicker
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            break;
            
        case 'window':
            ctx.strokeStyle = '#5bc0de';
            ctx.lineWidth = 3; // Slightly thicker
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            break;
            
        case 'fluchtwege':
            // Draw escape route with green dashed line with arrows
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 4; // Thicker
            ctx.setLineDash([5, 3]);
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            // Draw arrow
            drawArrow(ctx, start.x, start.y, end.x, end.y, '#4CAF50');
            ctx.setLineDash([]); // Reset dash
            break;
            
        case 'machine':
            // Draw machine as rectangle
            const machineWidth = Math.abs(end.x - start.x);
            const machineHeight = Math.abs(end.y - start.y);
            const machineX = Math.min(start.x, end.x);
            const machineY = Math.min(start.y, end.y);
            
            ctx.fillStyle = '#f0ad4e';
            ctx.fillRect(machineX, machineY, machineWidth, machineHeight);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2; // Thicker
            ctx.strokeRect(machineX, machineY, machineWidth, machineHeight);
            break;
            
        case 'closet':
            // Draw closet as rectangle
            const closetWidth = Math.abs(end.x - start.x);
            const closetHeight = Math.abs(end.y - start.y);
            const closetX = Math.min(start.x, end.x);
            const closetY = Math.min(start.y, end.y);
            
            ctx.fillStyle = 'rgba(217, 83, 79, 0.6)';
            ctx.fillRect(closetX, closetY, closetWidth, closetHeight);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2; // Thicker
            ctx.strokeRect(closetX, closetY, closetWidth, closetHeight);
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
        
        ctx.fillText('AUSGANG', textX, textY);
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
    if (!element) return;
    
    const { start, end } = element;
    
    // Draw selection box
    ctx.strokeStyle = "#1e88e5";
    ctx.lineWidth = 2;
    
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    
    // Convert to screen coordinates
    const screenMinX = minX * window.canvasState.scale + window.canvasState.panOffsetX;
    const screenMaxX = maxX * window.canvasState.scale + window.canvasState.panOffsetX;
    const screenMinY = minY * window.canvasState.scale + window.canvasState.panOffsetY;
    const screenMaxY = maxY * window.canvasState.scale + window.canvasState.panOffsetY;
    
    // Draw selection box
    ctx.strokeRect(screenMinX, screenMinY, screenMaxX - screenMinX, screenMaxY - screenMinY);
    
    // Draw resize handles (8 handles around the element)
    const handleSize = 8;
    ctx.fillStyle = "#1e88e5";
    
    // Corner handles
    ctx.fillRect(screenMinX - handleSize/2, screenMinY - handleSize/2, handleSize, handleSize); // Top-left
    ctx.fillRect(screenMaxX - handleSize/2, screenMinY - handleSize/2, handleSize, handleSize); // Top-right
    ctx.fillRect(screenMinX - handleSize/2, screenMaxY - handleSize/2, handleSize, handleSize); // Bottom-left
    ctx.fillRect(screenMaxX - handleSize/2, screenMaxY - handleSize/2, handleSize, handleSize); // Bottom-right
    
    // Edge handles
    ctx.fillRect(screenMinX + (screenMaxX - screenMinX)/2 - handleSize/2, screenMinY - handleSize/2, handleSize, handleSize); // Top
    ctx.fillRect(screenMinX + (screenMaxX - screenMinX)/2 - handleSize/2, screenMaxY - handleSize/2, handleSize, handleSize); // Bottom
    ctx.fillRect(screenMinX - handleSize/2, screenMinY + (screenMaxY - screenMinY)/2 - handleSize/2, handleSize, handleSize); // Left
    ctx.fillRect(screenMaxX - handleSize/2, screenMinY + (screenMaxY - screenMinY)/2 - handleSize/2, handleSize, handleSize); // Right
    
    // Save the handle positions for mouse interaction
    window.canvasState.resizeHandles = [
        { pos: 'tl', x: screenMinX, y: screenMinY },
        { pos: 'tr', x: screenMaxX, y: screenMinY },
        { pos: 'bl', x: screenMinX, y: screenMaxY },
        { pos: 'br', x: screenMaxX, y: screenMaxY },
        { pos: 't', x: screenMinX + (screenMaxX - screenMinX)/2, y: screenMinY },
        { pos: 'b', x: screenMinX + (screenMaxX - screenMinX)/2, y: screenMaxY },
        { pos: 'l', x: screenMinX, y: screenMinY + (screenMaxY - screenMinY)/2 },
        { pos: 'r', x: screenMaxX, y: screenMinY + (screenMaxY - screenMinY)/2 }
    ];
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

// Draw element label in view mode
function drawElementLabel(ctx, element) {
    if (!element.properties?.name) return;
    
    ctx.save();
    
    // Convert meter coordinates to canvas coordinates
    const center = {
        x: ((element.start.x + element.end.x) / 2) * currentState.scale + currentState.panOffset.x,
        y: ((element.start.y + element.end.y) / 2) * currentState.scale + currentState.panOffset.y
    };
    
    // Set text style
    ctx.font = '12px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Draw text background for better readability
    const text = element.properties.name;
    const textMetrics = ctx.measureText(text);
    const padding = 2;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(
        center.x - textMetrics.width / 2 - padding,
        center.y - 25 - padding,
        textMetrics.width + padding * 2,
        16 + padding * 2
    );
    
    // Draw text
    ctx.fillStyle = '#333';
    ctx.fillText(text, center.x, center.y - 25);
    
    ctx.restore();
}

// Draw a highlight for the active element in view mode
function drawViewModeHighlight(ctx, element) {
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
    
    if (['machine', 'closet'].includes(element.element_type)) {
        // Rectangle type elements
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        
        // Draw pulsing highlight
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 5) * 0.2 + 0.8; // 0.6 to 1.0
        
        ctx.strokeStyle = element.element_type === 'machine' ? 'rgba(240, 173, 78, ' + pulse + ')' : 'rgba(217, 83, 79, ' + pulse + ')';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        
        // Draw glow effect
        ctx.shadowColor = element.element_type === 'machine' ? 'rgba(240, 173, 78, 0.6)' : 'rgba(217, 83, 79, 0.6)';
        ctx.shadowBlur = 10;
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
        
        // Reset shadow and draw inner highlight
        ctx.shadowBlur = 0;
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
        
        // Add "Click for details" tooltip if it has safety info
        if (element.properties?.safety_hazard_class || element.properties?.safety_dangers) {
            ctx.font = 'bold 12px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('Für Sicherheitsinfo klicken', x + width / 2, y + height + 10);
        }
    }
    
    ctx.restore();
}

// Load safety information for an element
function loadSafetyInformation(element) {
    // Show the safety info form
    const safetyInfoForm = document.getElementById('safety-info-form');
    if (safetyInfoForm) safetyInfoForm.classList.remove('hidden');
    
    // Fill in element details
    const nameInput = document.getElementById('element-name');
    const typeDisplay = document.getElementById('element-type-display');
    
    if (nameInput) nameInput.value = element.properties?.name || '';
    if (typeDisplay) {
        let typeName = '';
        switch(element.element_type) {
            case 'machine': typeName = 'Maschine'; break;
            case 'closet': typeName = 'Sicherheitsschrank'; break;
            default: typeName = element.element_type;
        }
        typeDisplay.value = typeName;
    }
    
    // Fill in safety information
    const locationIdInput = document.getElementById('safety-location-id');
    const hazardClassSelect = document.getElementById('safety-hazard-class');
    const dangersTextarea = document.getElementById('safety-dangers');
    const emergencyTextarea = document.getElementById('safety-emergency');
    const equipmentTextarea = document.getElementById('safety-equipment');
    
    if (locationIdInput) locationIdInput.value = element.properties?.safety_location_id || '';
    if (hazardClassSelect) hazardClassSelect.value = element.properties?.safety_hazard_class || '1';
    if (dangersTextarea) dangersTextarea.value = element.properties?.safety_dangers || '';
    if (emergencyTextarea) emergencyTextarea.value = element.properties?.safety_emergency || '';
    if (equipmentTextarea) equipmentTextarea.value = element.properties?.safety_equipment || '';
    
    // Fill in technical specifications
    const techSpecsTextarea = document.getElementById('tech-specs');
    const maintenanceInput = document.getElementById('tech-maintenance');
    const lastInspectionInput = document.getElementById('tech-last-inspection');
    
    if (techSpecsTextarea) techSpecsTextarea.value = element.properties?.tech_specs || '';
    if (maintenanceInput) maintenanceInput.value = element.properties?.tech_maintenance || '';
    if (lastInspectionInput) lastInspectionInput.value = element.properties?.tech_last_inspection || '';
    
    // Load documents list
    loadDocumentsList(element);
    
    // Set up save button
    setupSaveSafetyButton(element);
}

// Load documents list for an element
function loadDocumentsList(element) {
    if (!element) return;
    
    const documents = element.properties?.documents || [];
    const documentsContainer = document.querySelector('.documents-container');
    
    if (!documentsContainer) return;
    
    // If no documents, show the message
    if (documents.length === 0) {
        documentsContainer.innerHTML = '<p id="no-documents-message">Keine Dokumente angehängt</p>';
        return;
    }
    
    // Create the list of documents
    let documentsHtml = '<ul id="documents-list" class="documents-list">';
    
    for (const doc of documents) {
        documentsHtml += `
            <li class="document-item">
                <a href="${doc.path}" target="_blank">${doc.name}</a>
                <span class="document-date">(Hinzugefügt: ${doc.upload_date || 'Unbekanntes Datum'})</span>
            </li>
        `;
    }
    
    documentsHtml += '</ul>';
    documentsContainer.innerHTML = documentsHtml;
}

// Set up save button for safety information
function setupSaveSafetyButton(element) {
    if (!element) return;
    
    const saveButton = document.getElementById('save-safety-info-btn');
    if (!saveButton) return;
    
    // Remove any existing event listeners
    const newSaveButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newSaveButton, saveButton);
    
    // Add new event listener
    newSaveButton.addEventListener('click', () => {
        saveSafetyInformation(element);
    });
    
    // Set up document upload
    setupDocumentUpload(element);
}

// Set up document upload for an element
function setupDocumentUpload(element) {
    if (!element) return;
    
    const uploadInput = document.getElementById('document-upload');
    if (!uploadInput) return;
    
    // Remove any existing event listeners
    const newUploadInput = uploadInput.cloneNode(true);
    uploadInput.parentNode.replaceChild(newUploadInput, uploadInput);
    
    // Add new event listener
    newUploadInput.addEventListener('change', async (e) => {
        if (e.target.files.length === 0) return;
        
        const formData = new FormData();
        formData.append('document_upload', e.target.files[0]);
        
        // Upload the document
        try {
            const response = await fetch(`/upload_document?floorplan_id=${currentState.floorplanId}&element_id=${element.id}`, {
                method: 'POST',
                body: formData
            });
            
            const html = await response.text();
            const documentsContainer = document.querySelector('.documents-container');
            if (documentsContainer) documentsContainer.innerHTML = html;
            
            // Reload element data to include the new document
            for (const el of currentState.elements) {
                if (el.id === element.id) {
                    loadSafetyInformation(el);
                    break;
                }
            }
        } catch (error) {
            console.error('Error uploading document:', error);
        }
    });
}

// Save safety information for an element
function saveSafetyInformation(element) {
    if (!element) return;
    
    // Get all the values from the form
    const nameInput = document.getElementById('element-name');
    const locationIdInput = document.getElementById('safety-location-id');
    const hazardClassSelect = document.getElementById('safety-hazard-class');
    const dangersTextarea = document.getElementById('safety-dangers');
    const emergencyTextarea = document.getElementById('safety-emergency');
    const equipmentTextarea = document.getElementById('safety-equipment');
    const techSpecsTextarea = document.getElementById('tech-specs');
    const maintenanceInput = document.getElementById('tech-maintenance');
    const lastInspectionInput = document.getElementById('tech-last-inspection');
    
    // Update the element properties
    if (!element.properties) element.properties = {};
    
    if (nameInput) element.properties.name = nameInput.value;
    if (locationIdInput) element.properties.safety_location_id = locationIdInput.value;
    if (hazardClassSelect) element.properties.safety_hazard_class = hazardClassSelect.value;
    if (dangersTextarea) element.properties.safety_dangers = dangersTextarea.value;
    if (emergencyTextarea) element.properties.safety_emergency = emergencyTextarea.value;
    if (equipmentTextarea) element.properties.safety_equipment = equipmentTextarea.value;
    if (techSpecsTextarea) element.properties.tech_specs = techSpecsTextarea.value;
    if (maintenanceInput) element.properties.tech_maintenance = maintenanceInput.value;
    if (lastInspectionInput) element.properties.tech_last_inspection = lastInspectionInput.value;
    
    // Save the changes
    const safetyData = JSON.stringify(element.properties);
    
    fetch(`/save_safety_info?floorplan_id=${currentState.floorplanId}&element_id=${element.id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'HX-Request': 'true'
        },
        body: JSON.stringify({ safety_data: safetyData })
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
        
        // Also update the element in the local state
        for (let i = 0; i < currentState.elements.length; i++) {
            if (currentState.elements[i].id === element.id) {
                currentState.elements[i] = element;
                break;
            }
        }
    })
    .catch(error => {
        console.error('Fehler beim Speichern der Sicherheitsinformationen:', error);
        const saveStatus = document.getElementById('save-status');
        if (saveStatus) {
            saveStatus.innerHTML = '<div class="error-message">Fehler beim Speichern der Sicherheitsinformationen</div>';
        }
    });
}

// Fix for the export function
window.exportFloorplanToPNG = function(floorplanId) {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    
    // Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Fill with white background
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw grid and elements
    if (window.canvasState) {
        // Draw grid
        const drawGrid = function(ctx, width, height) {
            const gridSize = 1; // 1 meter grid
            const gridPixels = gridSize * window.canvasState.scale;
            
            ctx.strokeStyle = '#eeeeee';
            ctx.lineWidth = 1;
            
            // Draw vertical lines
            for (let x = window.canvasState.panOffsetX % gridPixels; x < width; x += gridPixels) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            
            // Draw horizontal lines
            for (let y = window.canvasState.panOffsetY % gridPixels; y < height; y += gridPixels) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        };
        
        drawGrid(tempCtx, tempCanvas.width, tempCanvas.height);
        
        // Draw all elements
        for (const element of window.canvasState.elements) {
            // Draw element on temp canvas using the same drawing function
            const drawElement = function(ctx, element) {
                // Convert world coordinates to screen coordinates
                const startX = element.start.x * window.canvasState.scale + window.canvasState.panOffsetX;
                const startY = element.start.y * window.canvasState.scale + window.canvasState.panOffsetY;
                const endX = element.end.x * window.canvasState.scale + window.canvasState.panOffsetX;
                const endY = element.end.y * window.canvasState.scale + window.canvasState.panOffsetY;
                
                ctx.beginPath();
                
                switch (element.element_type) {
                    case 'wall':
                        ctx.strokeStyle = '#333';
                        ctx.lineWidth = 4;
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();
                        break;
                        
                    case 'door-standard':
                        ctx.strokeStyle = '#666';
                        ctx.lineWidth = 3;
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();
                        break;
                        
                    case 'door-emergency':
                        ctx.strokeStyle = '#d9534f';
                        ctx.lineWidth = 3;
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();
                        break;
                        
                    case 'window':
                        ctx.strokeStyle = '#5bc0de';
                        ctx.lineWidth = 2;
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();
                        break;
                        
                    case 'fluchtwege':
                        // Draw escape route with green dashed line with arrows
                        ctx.strokeStyle = '#4CAF50';
                        ctx.lineWidth = 3;
                        ctx.setLineDash([5, 3]);
                        ctx.moveTo(startX, startY);
                        ctx.lineTo(endX, endY);
                        ctx.stroke();
                        ctx.setLineDash([]); // Reset dash
                        break;
                        
                    case 'machine':
                        // Draw machine as rectangle
                        const machineWidth = Math.abs(endX - startX);
                        const machineHeight = Math.abs(endY - startY);
                        const machineX = Math.min(startX, endX);
                        const machineY = Math.min(startY, endY);
                        
                        ctx.fillStyle = '#f0ad4e';
                        ctx.fillRect(machineX, machineY, machineWidth, machineHeight);
                        ctx.strokeStyle = '#333';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(machineX, machineY, machineWidth, machineHeight);
                        break;
                        
                    case 'closet':
                        // Draw closet as rectangle
                        const closetWidth = Math.abs(endX - startX);
                        const closetHeight = Math.abs(endY - startY);
                        const closetX = Math.min(startX, endX);
                        const closetY = Math.min(startY, endY);
                        
                        ctx.fillStyle = 'rgba(217, 83, 79, 0.6)';
                        ctx.fillRect(closetX, closetY, closetWidth, closetHeight);
                        ctx.strokeStyle = '#333';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(closetX, closetY, closetWidth, closetHeight);
                        break;
                }
            };
            
            drawElement(tempCtx, element);
        }
    }
    
    // Create download link
    const link = document.createElement('a');
    link.download = `floorplan-${floorplanId || 'export'}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Create a function to update tooltip
function updateCanvasTooltip(e, tool) {
    // Create tooltip if it doesn't exist
    let tooltip = document.getElementById('canvas-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'canvas-tooltip';
        document.body.appendChild(tooltip);
    }
    
    // Position tooltip
    tooltip.style.left = (e.clientX + 10) + 'px';
    tooltip.style.top = (e.clientY + 10) + 'px';
    
    // Set tooltip content based on current tool or action
    let tooltipText = '';
    if (window.canvasState.resizing) {
        tooltipText = 'Größe ändern';
    } else if (window.canvasState.selectedObject && currentTool === 'select') {
        tooltipText = 'Element ausgewählt: ' + (window.canvasState.selectedObject.element_type || 'Element');
    } else {
        switch (tool) {
            case 'select': tooltipText = 'Auswählen'; break;
            case 'wall': tooltipText = 'Wand zeichnen'; break;
            case 'door-standard': tooltipText = 'Standardtür zeichnen'; break;
            case 'door-emergency': tooltipText = 'Notausgangstür zeichnen'; break;
            case 'window': tooltipText = 'Fenster zeichnen'; break;
            case 'fluchtwege': tooltipText = 'Fluchtweg zeichnen'; break;
            case 'machine': tooltipText = 'Maschine platzieren'; break;
            case 'closet': tooltipText = 'Sicherheitsschrank platzieren'; break;
            case 'delete': tooltipText = 'Element löschen'; break;
            default: tooltipText = tool; break;
        }
    }
    
    tooltip.textContent = tooltipText;
    tooltip.style.display = 'block';
}

// Improve handleMouseDown function for view mode and selection
function handleMouseDown(e) {
    // Get canvas and mouse position
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    
    // Get mouse position
    const pos = getCanvasMousePosition(e, canvas);
    const worldX = (pos.x - window.canvasState.panOffsetX) / window.canvasState.scale;
    const worldY = (pos.y - window.canvasState.panOffsetY) / window.canvasState.scale;
    
    // Check if we clicked on an element
    const modeToggle = document.getElementById('mode-toggle');
    const isViewMode = modeToggle && modeToggle.checked;
    
    if (isViewMode) {
        // Find element at position
        const element = findElementAt(worldX, worldY);
        
        // If we found an element, load its data
        if (element) {
            // Show instruction message if needed
            const instruction = document.getElementById('view-mode-instruction');
            if (instruction) {
                instruction.style.display = 'none';
            }
            
            // Only load form for interactive elements (machine and closet by default)
            if (['machine', 'closet'].includes(element.element_type)) {
                loadElementData(element);
                
                // Highlight the element
                window.canvasState.activeElementId = element.id;
                renderCanvas();
            }
        } else {
            // No element clicked, clear form and show instruction
            const safetyInfoForm = document.getElementById('safety-info-form');
            const instruction = document.getElementById('view-mode-instruction');
            
            if (safetyInfoForm) {
                safetyInfoForm.classList.add('hidden');
            }
            
            if (instruction) {
                instruction.style.display = 'block';
            }
            
            // Clear active element
            window.canvasState.activeElementId = null;
            renderCanvas();
        }
        return;
    }
    
    // Edit mode handling
    if (currentTool === 'select') {
        // Find if clicked on an element
        window.canvasState.selectedObject = findElementAt(worldX, worldY);
        checkSelectedObject();
    } else if (currentTool === 'delete') {
        if (window.canvasState.selectedObject) {
            deleteElement(window.canvasState.selectedObject);
            window.canvasState.selectedObject = null;
            checkSelectedObject();
        }
    } else {
        // Start drawing a new element
        window.canvasState.isDrawing = true;
        window.canvasState.startPoint = { x: worldX, y: worldY };
    }
    
    renderCanvas();
}

// Find element at coordinates
function findElementAt(x, y) {
    const hitDistance = 0.3; // 30cm hit detection radius in meter units
    
    // Reverse loop to find topmost element first (later drawn elements are on top)
    for (let i = window.canvasState.elements.length - 1; i >= 0; i--) {
        const element = window.canvasState.elements[i];
        
        // For area elements (machine and closets)
        if (['machine', 'closet'].includes(element.element_type)) {
            // Create bounds for area elements
            const minX = Math.min(element.start.x, element.end.x);
            const maxX = Math.max(element.start.x, element.end.x);
            const minY = Math.min(element.start.y, element.end.y);
            const maxY = Math.max(element.start.y, element.end.y);
            
            // Point in rectangle test
            if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                return element;
            }
        } 
        // For line elements
        else {
            // Use distance to line algorithm
            const distance = distanceToLine({x, y}, element.start, element.end);
            if (distance < hitDistance) {
                return element;
            }
        }
    }
    
    return null;
}

// Function to load element data in view mode
function loadElementData(element) {
    if (!element) return;
    
    // Make sure safety info form is visible
    const safetyInfoForm = document.getElementById('safety-info-form');
    if (safetyInfoForm) {
        safetyInfoForm.classList.remove('hidden');
    }
    
    // Basic element information
    const elementName = document.getElementById('element-name');
    const elementType = document.getElementById('element-type-display');
    
    if (elementName) elementName.value = element.properties?.name || '';
    if (elementType) {
        let typeDisplay = 'Element';
        
        switch(element.element_type) {
            case 'wall': typeDisplay = 'Wand'; break;
            case 'door-standard': typeDisplay = 'Standardtür'; break;
            case 'door-emergency': typeDisplay = 'Notausgangstür'; break;
            case 'window': typeDisplay = 'Fenster'; break;
            case 'machine': typeDisplay = 'Maschine'; break;
            case 'closet': typeDisplay = 'Sicherheitsschrank'; break;
            case 'fluchtwege': typeDisplay = 'Fluchtweg'; break;
        }
        
        elementType.value = typeDisplay;
    }
    
    // Safety information
    const locationId = document.getElementById('safety-location-id');
    const hazardClass = document.getElementById('safety-hazard-class');
    const dangers = document.getElementById('safety-dangers');
    const emergency = document.getElementById('safety-emergency');
    const equipment = document.getElementById('safety-equipment');
    
    if (locationId) locationId.value = element.properties?.safety_location_id || '';
    if (hazardClass) hazardClass.value = element.properties?.safety_hazard_class || '1';
    if (dangers) dangers.value = element.properties?.safety_dangers || '';
    if (emergency) emergency.value = element.properties?.safety_emergency || '';
    if (equipment) equipment.value = element.properties?.safety_equipment || '';
    
    // Technical specifications
    const techSpecs = document.getElementById('tech-specs');
    const maintenance = document.getElementById('tech-maintenance');
    const lastInspection = document.getElementById('tech-last-inspection');
    
    if (techSpecs) techSpecs.value = element.properties?.tech_specs || '';
    if (maintenance) maintenance.value = element.properties?.tech_maintenance || '';
    if (lastInspection) lastInspection.value = element.properties?.tech_last_inspection || '';
    
    // Load documents if available
    loadDocuments(element);
    
    // Set up save button for safety information
    setupSaveSafetyButton(element);
    
    // Set up document upload for this element
    setupDocumentUpload(element);
    
    // Store currently active element ID
    window.canvasState.activeElementId = element.id;
    renderCanvas();
}

// Function to load documents for an element
function loadDocuments(element) {
    if (!element || !element.id) return;
    
    const documentsContainer = document.querySelector('.documents-container');
    if (!documentsContainer) return;
    
    // Get floorplan ID from canvas
    const canvas = document.getElementById('floorplan-canvas');
    const floorplanId = canvas ? canvas.getAttribute('data-floorplan') : null;
    
    if (!floorplanId) return;
    
    // Fetch documents from server
    fetch(`/get_documents?floorplan_id=${floorplanId}&element_id=${element.id}`)
        .then(response => response.text())
        .then(html => {
            documentsContainer.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading documents:', error);
            documentsContainer.innerHTML = '<p>Fehler beim Laden der Dokumente</p>';
        });
} 