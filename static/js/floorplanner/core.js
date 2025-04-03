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
    isResizing: false,
    resizeHandle: null,
    showExportGrid: false
};

// Floor plan editor initialization
function initFloorPlanEditor() {
    const canvas = document.getElementById('floorplan-canvas');
    if (!canvas) return;
    
    // Get the floorplan data attributes
    currentState.floorplanId = parseInt(canvas.getAttribute('data-floorplan-id'));
    console.log('Floorplan ID from attribute:', canvas.getAttribute('data-floorplan-id'));
    const width = parseFloat(canvas.dataset.width);
    const height = parseFloat(canvas.dataset.height);
    
    // Load elements from data attribute
    try {
        if (canvas.dataset.floorplanElements) {
            currentState.elements = JSON.parse(canvas.dataset.floorplanElements);
            console.log('Loaded elements:', currentState.elements);
            console.log('Loaded id:', currentState.floorplanId);
        }
    } catch (error) {
        console.error('Error parsing floorplan elements:', error);
    }
    
    // Set up 2D context
    const ctx = canvas.getContext('2d');
    
    // Calculate the scale to fit the canvas
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;
    currentState.scale = Math.min(scaleX, scaleY) * 0.9;
    
    // Center the floorplan
    currentState.panOffset.x = (canvas.width - width * currentState.scale) / 2;
    currentState.panOffset.y = (canvas.height - height * currentState.scale) / 2;
    
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

document.addEventListener('DOMContentLoaded', () => {
    // Initialize immediately if canvas already exists
    if (document.getElementById('floorplan-canvas')) {
        initFloorPlanEditor();
    }
    
    // Initialize the editor when the floorplan canvas is loaded via HTMX
    document.body.addEventListener('htmx:afterSwap', (event) => {
        if ((event.detail.target.id === 'main-content' || event.detail.target.id === 'floorplan-editor-container') && 
            document.getElementById('floorplan-canvas')) {
            initFloorPlanEditor();
        }
    });
});

// Generate a unique ID for new elements
function generateId() {
    return 'element_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
} 



// Delete selected element
function deleteSelectedElement() {
    if (!currentState.selectedElement) return;
    
    const index = currentState.elements.findIndex(el => el.id === currentState.selectedElement.id);
    if (index !== -1) {
        currentState.elements.splice(index, 1);
        currentState.selectedElement = null;
        updatePropertiesPanel();
        render(document.getElementById('floorplan-canvas'));
    }
}