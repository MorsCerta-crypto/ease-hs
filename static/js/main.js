// Global state
const currentState = {
    currentTool: null,
    currentElement: null,
    scale: 1, // pixels per meter
    grid: 0.5 // meters per grid cell
};

// Global functions
window.selectTool = function(tool) {
    if (!window.canvas) return;
    currentState.currentTool = tool;
    document.querySelectorAll('[id^="tool-"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200');
    });
    document.getElementById(`tool-${tool}`).classList.remove('bg-gray-200');
    document.getElementById(`tool-${tool}`).classList.add('bg-blue-500', 'text-white');
    
    window.canvas.isDrawingMode = false;
    window.canvas.selection = tool !== 'wall';
};

window.deleteSelectedElement = function() {
    if (!window.canvas) return;
    const selectedObject = window.canvas.getActiveObject();
    if (selectedObject) {
        window.canvas.remove(selectedObject);
        window.canvas.renderAll();
    }
};

// Main application code
document.addEventListener('DOMContentLoaded', function() {
    // Initialize canvas
    const container = document.getElementById('canvas-container');
    if (!container) {
        console.error('Canvas container not found');
        return;
    }

    // Set explicit dimensions for the container
    container.style.width = '1000px';
    container.style.height = '700px';
    container.style.border = '1px solid #ccc';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // Create canvas element
    const canvasElement = document.createElement('canvas');
    canvasElement.id = 'floorPlanCanvas';
    canvasElement.width = 1000;
    canvasElement.height = 700;
    canvasElement.style.position = 'absolute';
    canvasElement.style.top = '0';
    canvasElement.style.left = '0';
    container.appendChild(canvasElement);

    console.log('Canvas element created and appended:', canvasElement);
    
    // Check if fabric is already defined
    if (typeof fabric === 'undefined') {
        console.error('Fabric.js not loaded!');
        return;
    }

    try {
        // Create Fabric canvas
        window.canvas = new fabric.Canvas('floorPlanCanvas', {
            width: 1000,
            height: 700,
            selection: true,
            preserveObjectStacking: true
        });
        
        console.log('Fabric canvas initialized:', window.canvas);

        // Load initial data
        if (container.dataset.floorplanElements) {
            try {
                const initialData = JSON.parse(container.dataset.floorplanElements);
                if (initialData && initialData.length > 0) {
                    fabric.util.enlivenObjects(initialData, function(objects) {
                        objects.forEach(obj => window.canvas.add(obj));
                        window.canvas.renderAll();
                    });
                }
            } catch (e) {
                console.error('Error loading floor plan data:', e);
            }
        }

        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                selectTool(this.dataset.tool);
            });
        });

        // Add drawing tools functionality
        let isDrawing = false;
        let currentObject = null;
        let currentTool = null;

        function selectTool(tool) {
            currentTool = tool;
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-gray-200');
            });
            const toolBtn = document.getElementById(`tool-${tool}`);
            if (toolBtn) {
                toolBtn.classList.remove('bg-gray-200');
                toolBtn.classList.add('bg-blue-500', 'text-white');
            }
            
            window.canvas.isDrawingMode = false;
            window.canvas.selection = tool !== 'wall';
        }

        // Make selectTool globally available
        window.selectTool = selectTool;

        // Delete handler
        document.getElementById('deleteBtn')?.addEventListener('click', function() {
            const activeObject = window.canvas.getActiveObject();
            if (activeObject) {
                if (activeObject.type === 'activeSelection') {
                    activeObject.forEachObject(obj => window.canvas.remove(obj));
                    window.canvas.discardActiveObject();
                } else {
                    window.canvas.remove(activeObject);
                }
                window.canvas.requestRenderAll();
            }
        });

        // Save button handler
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                const json = JSON.stringify(window.canvas.toJSON(['elementType', 'elementData']));
                const formData = new FormData();
                formData.append('elements', json);
                
                fetch(saveBtn.getAttribute('hx-post'), {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    const saveStatus = document.getElementById('save-status');
                    if (saveStatus) saveStatus.textContent = data.message;
                })
                .catch(error => console.error('Error saving floor plan:', error));
            });
        }

        // Export PNG
        const exportButton = document.getElementById('export-png');
        if (exportButton) {
            exportButton.addEventListener('click', function() {
                const dataURL = window.canvas.toDataURL({ format: 'png', quality: 1 });
                const link = document.createElement('a');
                link.download = 'floorplan.png';
                link.href = dataURL;
                link.click();
            });
        }

        // Canvas mouse events
        window.canvas.on('mouse:down', function(options) {
            if (!currentTool || currentTool === 'delete') return;
            
            isDrawing = true;
            const pointer = window.canvas.getPointer(options.e);
            
            switch(currentTool) {
                case 'wall':
                    currentObject = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                        stroke: '#333',
                        strokeWidth: 6,
                        elementType: 'wall',
                        elementData: { name: 'Wall' }
                    });
                    break;
                case 'window':
                    currentObject = new fabric.Rect({
                        left: pointer.x,
                        top: pointer.y,
                        width: 40,
                        height: 10,
                        fill: 'transparent',
                        stroke: '#5bc0de',
                        strokeWidth: 3,
                        elementType: 'window',
                        elementData: { name: 'Window' }
                    });
                    break;
                case 'door-standard':
                    currentObject = new fabric.Rect({
                        left: pointer.x,
                        top: pointer.y,
                        width: 50,
                        height: 10,
                        fill: 'transparent',
                        stroke: '#666',
                        strokeWidth: 4,
                        elementType: 'door-standard',
                        elementData: { name: 'Door' }
                    });
                    break;
                case 'door-emergency':
                    currentObject = new fabric.Rect({
                        left: pointer.x,
                        top: pointer.y,
                        width: 50,
                        height: 10,
                        fill: 'transparent',
                        stroke: '#d9534f',
                        strokeWidth: 4,
                        elementType: 'door-emergency',
                        elementData: { name: 'Emergency Door' }
                    });
                    break;
                case 'machine':
                    currentObject = new fabric.Rect({
                        left: pointer.x,
                        top: pointer.y,
                        width: 60,
                        height: 60,
                        fill: '#f0ad4e',
                        stroke: '#333',
                        elementType: 'machine',
                        elementData: { name: 'Machine' }
                    });
                    break;
                case 'closet':
                    currentObject = new fabric.Rect({
                        left: pointer.x,
                        top: pointer.y,
                        width: 40,
                        height: 60,
                        fill: '#d9534f',
                        opacity: 0.8,
                        stroke: '#333',
                        elementType: 'closet',
                        elementData: { name: 'Closet' }
                    });
                    break;
                case 'emergency-kit':
                    currentObject = new fabric.Circle({
                        left: pointer.x,
                        top: pointer.y,
                        radius: 15,
                        fill: '#dc3545',
                        stroke: '#333',
                        elementType: 'emergency-kit',
                        elementData: { name: 'Emergency Kit' }
                    });
                    break;
                case 'emergency-route':
                    currentObject = new fabric.Path(`M ${pointer.x} ${pointer.y}`, {
                        stroke: '#28a745',
                        strokeWidth: 3,
                        strokeDashArray: [5, 5],
                        fill: '',
                        elementType: 'emergency-route',
                        elementData: { name: 'Emergency Route' }
                    });
                    break;
            }
            
            if (currentObject) {
                currentObject.set({
                    originX: 'center',
                    originY: 'center',
                    id: Date.now().toString()
                });
                window.canvas.add(currentObject);
            }
        });

        window.canvas.on('mouse:move', function(options) {
            if (!isDrawing || !currentObject) return;
            
            const pointer = window.canvas.getPointer(options.e);
            
            if (currentTool === 'wall') {
                currentObject.set({ x2: pointer.x, y2: pointer.y });
            } else if (currentTool === 'emergency-route' && currentObject.path) {
                currentObject.path.push(['L', pointer.x, pointer.y]);
            } else {
                // For rectangles and other objects, update width/height
                if (currentObject.type === 'rect') {
                    currentObject.set({
                        width: Math.abs(pointer.x - currentObject.left),
                        height: Math.abs(pointer.y - currentObject.top)
                    });
                } else if (currentObject.type === 'circle') {
                    const radius = Math.sqrt(
                        Math.pow(pointer.x - currentObject.left, 2) + 
                        Math.pow(pointer.y - currentObject.top, 2)
                    );
                    currentObject.set({ radius: radius });
                }
            }
            
            window.canvas.renderAll();
        });

        window.canvas.on('mouse:up', function() {
            isDrawing = false;
            currentObject = null;
        });

        // Show element properties when selected
        window.canvas.on('selection:created', updateElementProperties);
        window.canvas.on('selection:updated', updateElementProperties);

        function updateElementProperties(event) {
            const element = event.selected[0];
            if (!element || !element.elementData) return;
            
            const propertiesPanel = document.getElementById('element-properties');
            if (!propertiesPanel) return;
            
            const floorplanId = container.dataset.floorplanId;
            
            let formHtml = `
                <form id="element-form" hx-post="/update-element/${floorplanId}/${element.id}">
                    <div class="mb-2">
                        <label class="block text-sm">Name:</label>
                        <input type="text" name="name" value="${element.elementData.name || ''}" class="w-full p-1 border rounded">
                    </div>
                    <button type="submit" class="bg-blue-500 text-white px-3 py-1 rounded mt-2">Save</button>
                </form>
            `;
            
            propertiesPanel.innerHTML = formHtml;
        }
    } catch (error) {
        console.error('Error initializing Fabric canvas:', error);
    }
}); 