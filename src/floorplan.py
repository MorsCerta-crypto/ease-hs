from fasthtml.common import *
import json

app = FastHTML()

# Datenmodell für Floorplan-Elemente
elements = {}
element_id_counter = 0

# Elementtypen
ELEMENT_TYPES = {
    "wall": "Wand",
    "window": "Fenster",
    "door": "Tür",
    "machine": "Maschine",
    "safety_closet": "Sicherheitsschrank",
    "emergency_kit": "Notfallausrüstung",
    "emergency_route": "Fluchtweg"
}

@app.get("/")
def home():
    return Titled("Floorplan Editor",
        Div(
            H1("Floorplan Editor", cls="text-2xl font-bold mb-4"),
            # Umschalter zwischen Ansichts- und Bearbeitungsmodus
            Div(
                Button("Bearbeitungsmodus", 
                       id="edit-mode-btn", 
                       cls="bg-blue-500 text-white px-4 py-2 rounded mr-2",
                       hx_get="/edit-mode",
                       hx_target="#canvas-container"),
                Button("Ansichtsmodus", 
                       id="view-mode-btn", 
                       cls="bg-green-500 text-white px-4 py-2 rounded",
                       hx_get="/view-mode",
                       hx_target="#canvas-container"),
                cls="mb-4"
            ),
            # Container für Canvas und Werkzeuge
            Div(id="canvas-container", cls="flex"),
            # Container für Elementdetails
            Div(id="element-details", cls="mt-4 p-4 border rounded"),
            cls="container mx-auto p-4"
        ),
        # Einbinden der benötigten Bibliotheken
        Script(src="https://cdn.tailwindcss.com"),
        Script(src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"),
        Script(src="https://unpkg.com/htmx.org@1.9.10")
    )
@app.get("/edit-mode")
def edit_mode():
    return Div(
        # Zeichenwerkzeuge
        Div(
            H2("Werkzeuge", cls="text-lg font-bold mb-2"),
            Div(
                Button("Auswählen", id="tool-select", cls="bg-gray-200 px-3 py-1 rounded mr-2 mb-2", onclick="selectTool('select')"),
                Button("Löschen", id="tool-delete", cls="bg-red-200 px-3 py-1 rounded mr-2 mb-2", onclick="selectTool('delete')"),
                *[Button(
                    ELEMENT_TYPES[tool], 
                    id=f"tool-{tool}", 
                    cls="bg-gray-200 px-3 py-1 rounded mr-2 mb-2",
                    onclick=f"selectTool('{tool}')"
                ) for tool in ELEMENT_TYPES],
                cls="mb-4"
            ),
            # Eigenschaften-Editor
            Div(
                H3("Eigenschaften", cls="text-md font-bold mb-2"),
                Div(id="properties-editor", cls="p-2 border rounded"),
                cls="mb-4"
            ),
            # Floorplan scale settings
            Div(
                H3("Floorplan Maße", cls="text-md font-bold mb-2"),
                Div(
                    Label("Breite (m):", cls="block text-sm"),
                    Input(type="number", id="floorplan-width", value="10", min="1", max="100", step="0.1", cls="w-full p-1 border rounded mb-2"),
                    Label("Höhe (m):", cls="block text-sm"),
                    Input(type="number", id="floorplan-height", value="8", min="1", max="100", step="0.1", cls="w-full p-1 border rounded mb-2"),
                    Button("Anwenden", cls="bg-blue-500 text-white px-3 py-1 rounded w-full", onclick="updateFloorplanScale()"),
                    cls="p-2 border rounded mb-4"
                ),
            ),
            # Grid settings
            Div(
                H3("Raster", cls="text-md font-bold mb-2"),
                Div(
                    Label("Rastergröße (m):", cls="block text-sm"),
                    Input(type="number", id="grid-size", value="0.5", min="0.1", max="2", step="0.1", cls="w-full p-1 border rounded mb-2"),
                    Div(
                        Input(type="checkbox", id="snap-to-grid", checked=True, cls="mr-1"),
                        Label("An Raster einrasten", cls="text-sm"),
                        cls="flex items-center mb-2"
                    ),
                    Button("Raster aktualisieren", cls="bg-blue-500 text-white px-3 py-1 rounded w-full", onclick="updateGrid()"),
                    cls="p-2 border rounded mb-4"
                ),
            ),
            # Save Button
            Button("Speichern", 
                   id="save-button", 
                   cls="bg-green-500 text-white px-4 py-2 rounded w-full",
                   onclick="saveAllElements()"),
            cls="w-64 p-4 bg-gray-100 mr-4"
        ),
        # Canvas zum Zeichnen
        Div(
            Canvas(id="floorplan-canvas", width="800", height="600", 
                   cls="border border-gray-300"),
            cls="flex-grow"
        ),
        # JavaScript für die Zeichenfunktionalität
        Script(edit_mode_js()),
        cls="flex"
    )

def edit_mode_js():
    return """
    let canvas = new fabric.Canvas('floorplan-canvas');
    let currentTool = null;
    let currentElement = null;
    let previewElement = null;
    let dimensionLabels = [];
    let drawStartPoint = null;
    let unsavedChanges = false;
    
    // Scale settings
    let pixelsPerMeter = 100; // Default: 100px = 1m
    let gridSize = 0.5; // Default grid size in meters
    let snapToGrid = true;
    
    // Create grid
    let gridLines = [];
    
    function initializeGrid() {
        // Clear any existing grid
        gridLines.forEach(line => canvas.remove(line));
        gridLines = [];
        
        const width = canvas.width;
        const height = canvas.height;
        const gridPixels = gridSize * pixelsPerMeter;
        
        // Create vertical lines
        for (let x = 0; x <= width; x += gridPixels) {
            const line = new fabric.Line([x, 0, x, height], {
                stroke: '#ddd',
                selectable: false,
                evented: false,
                strokeWidth: 1
            });
            gridLines.push(line);
            canvas.add(line);
        }
        
        // Create horizontal lines
        for (let y = 0; y <= height; y += gridPixels) {
            const line = new fabric.Line([0, y, width, y], {
                stroke: '#ddd',
                selectable: false,
                evented: false,
                strokeWidth: 1
            });
            gridLines.push(line);
            canvas.add(line);
        }
        
        // Send grid to back
        gridLines.forEach(line => {
            canvas.sendToBack(line);
        });
    }
    
    function updateGrid() {
        gridSize = parseFloat(document.getElementById('grid-size').value);
        snapToGrid = document.getElementById('snap-to-grid').checked;
        initializeGrid();
    }
    
    function updateFloorplanScale() {
        const widthMeters = parseFloat(document.getElementById('floorplan-width').value);
        const heightMeters = parseFloat(document.getElementById('floorplan-height').value);
        
        // Calculate pixels per meter based on canvas size
        pixelsPerMeter = Math.min(
            canvas.width / widthMeters,
            canvas.height / heightMeters
        );
        
        // Update grid with new scale
        updateGrid();
        
        // Update all dimension labels
        updateAllDimensionLabels();
    }
    
    function updateAllDimensionLabels() {
        canvas.forEachObject(function(obj) {
            if (obj.dimensionLabel) {
                updateDimensionLabel(obj);
            }
        });
    }
    
    function snapToGridPoint(point) {
        if (!snapToGrid) return point;
        
        const gridPixels = gridSize * pixelsPerMeter;
        return {
            x: Math.round(point.x / gridPixels) * gridPixels,
            y: Math.round(point.y / gridPixels) * gridPixels
        };
    }
    
    function pixelsToMeters(pixels) {
        return pixels / pixelsPerMeter;
    }
    
    function selectTool(tool) {
        currentTool = tool;
        document.querySelectorAll('[id^="tool-"]').forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200');
        });
        document.getElementById(`tool-${tool}`).classList.remove('bg-gray-200');
        document.getElementById(`tool-${tool}`).classList.add('bg-blue-500', 'text-white');
        
        // Modus je nach Werkzeug anpassen
        if (tool === 'select') {
            canvas.selection = true;  // Enable selection rectangle
            enableObjectSelection(true);
        } else if (tool === 'delete') {
            canvas.selection = false; // Disable selection rectangle
            enableObjectSelection(true);
        } else {
            canvas.selection = false;
            enableObjectSelection(false);
        }
        
        // Clear property editor when changing tools
        if (tool !== 'select') {
            document.getElementById('properties-editor').innerHTML = '';
        }
    }
    
    function enableObjectSelection(enabled) {
        canvas.forEachObject(function(obj) {
            // Don't make grid lines selectable
            if (gridLines.includes(obj)) return;
            obj.selectable = enabled;
        });
        canvas.renderAll();
    }
    
    function clearPreview() {
        if (previewElement) {
            canvas.remove(previewElement);
            previewElement = null;
        }
        dimensionLabels.forEach(label => canvas.remove(label));
        dimensionLabels = [];
    }
    
    function findClosestWall(pointer, maxDistance = 20) {
        let closestWall = null;
        let minDistance = maxDistance;
        
        canvas.forEachObject(function(obj) {
            if (obj.elementType === 'wall') {
                // Calculate distance from point to line segment
                const x1 = obj.x1, y1 = obj.y1, x2 = obj.x2, y2 = obj.y2;
                const A = pointer.x - x1;
                const B = pointer.y - y1;
                const C = x2 - x1;
                const D = y2 - y1;
                
                const dot = A * C + B * D;
                const lenSq = C * C + D * D;
                let param = -1;
                if (lenSq !== 0) param = dot / lenSq;
                
                let xx, yy;
                
                if (param < 0) {
                    xx = x1;
                    yy = y1;
                } else if (param > 1) {
                    xx = x2;
                    yy = y2;
                } else {
                    xx = x1 + param * C;
                    yy = y1 + param * D;
                }
                
                const dx = pointer.x - xx;
                const dy = pointer.y - yy;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestWall = obj;
                }
            }
        });
        
        return closestWall;
    }
    
    function calculatePositionOnWall(wall, pointer) {
        // Berechne die Position entlang der Wand (0-1)
        const wallStart = { x: wall.x1, y: wall.y1 };
        const wallEnd = { x: wall.x2, y: wall.y2 };
        
        // Vektor von Start zu Ende
        const wallVector = {
            x: wallEnd.x - wallStart.x,
            y: wallEnd.y - wallStart.y
        };
        
        // Vektor von Start zu Pointer
        const pointerVector = {
            x: pointer.x - wallStart.x,
            y: pointer.y - wallStart.y
        };
        
        // Projektion berechnen
        const wallLength = Math.sqrt(wallVector.x * wallVector.x + wallVector.y * wallVector.y);
        const dotProduct = wallVector.x * pointerVector.x + wallVector.y * pointerVector.y;
        
        // Position normalisiert zwischen 0 und 1
        return Math.min(Math.max(dotProduct / (wallLength * wallLength), 0), 1);
    }
    
    function createDimensionLabel(x, y, pixelValue, suffix = '') {
        // Convert to meters and create label
        const meters = pixelsToMeters(pixelValue);
        const text = `${meters.toFixed(2)}m${suffix}`;
        
        const label = new fabric.Text(text, {
            left: x,
            top: y - 15,
            fontSize: 12,
            fill: 'black',
            backgroundColor: 'rgba(255,255,255,0.7)',
            selectable: false
        });
        dimensionLabels.push(label);
        canvas.add(label);
        return label;
    }
    
    function updateDimensionLabel(obj) {
        // Find the dimension label for this object and update it
        if (!obj.dimensionLabel) return;
        
        let text = '';
        let x = 0, y = 0;
        
        if (obj.elementType === 'wall' || obj.elementType === 'window' || obj.elementType === 'door') {
            // Calculate length for lines
            const dx = obj.x2 - obj.x1;
            const dy = obj.y2 - obj.y1;
            const pixelLength = Math.sqrt(dx*dx + dy*dy);
            const meterLength = pixelsToMeters(pixelLength);
            
            text = `${meterLength.toFixed(2)}m`;
            x = (obj.x1 + obj.x2) / 2;
            y = (obj.y1 + obj.y2) / 2;
            
        } else if (obj.elementType === 'machine' || obj.elementType === 'safety_closet') {
            // Rectangle dimensions
            const pixelWidth = obj.width;
            const pixelHeight = obj.height;
            const meterWidth = pixelsToMeters(pixelWidth);
            const meterHeight = pixelsToMeters(pixelHeight);
            
            text = `${meterWidth.toFixed(2)}m x ${meterHeight.toFixed(2)}m`;
            x = obj.left + obj.width/2;
            y = obj.top - 5;
            
        } else if (obj.elementType === 'emergency_kit') {
            // Circle radius
            const pixelRadius = obj.radius;
            const meterRadius = pixelsToMeters(pixelRadius);
            
            text = `r: ${meterRadius.toFixed(2)}m`;
            x = obj.left + obj.radius;
            y = obj.top - 5;
        }
        
        obj.dimensionLabel.set({
            text: text,
            left: x,
            top: y - 15
        });
    }
    
    canvas.on('mouse:down', function(options) {
        if (!currentTool) return;
        
        const pointer = canvas.getPointer(options.e);
        
        // For delete tool, remove any object clicked
        if (currentTool === 'delete') {
            if (options.target && !gridLines.includes(options.target)) {
                // Remove any associated dimension label
                if (options.target.dimensionLabel) {
                    canvas.remove(options.target.dimensionLabel);
                }
                
                canvas.remove(options.target);
                unsavedChanges = true;
            }
            return;
        }
        
        if (currentTool === 'select') {
            return; // Just allow selection
        }
        
        clearPreview();
        
        // For wall tool, snap to grid
        let startPoint = pointer;
        if (currentTool === 'wall' && snapToGrid) {
            startPoint = snapToGridPoint(pointer);
        }
        
        drawStartPoint = { x: startPoint.x, y: startPoint.y };
        
        if (currentTool === 'wall') {
            currentElement = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
                stroke: 'black',
                strokeWidth: 5,
                selectable: false,
                elementType: 'wall',
                elementData: { name: 'Neue Wand', length: 0 }
            });
            canvas.add(currentElement);
        } else if (currentTool === 'window' || currentTool === 'door') {
            // Find closest wall
            const closestWall = findClosestWall(pointer);
            if (!closestWall) return;
            
            // Start drawing on wall
            const position = calculatePositionOnWall(closestWall, pointer);
            const startX = closestWall.x1 + (closestWall.x2 - closestWall.x1) * position;
            const startY = closestWall.y1 + (closestWall.y2 - closestWall.y1) * position;
            
            // Get angle of wall
            const angle = Math.atan2(closestWall.y2 - closestWall.y1, closestWall.x2 - closestWall.x1);
            
            currentElement = new fabric.Line([startX, startY, startX, startY], {
                stroke: currentTool === 'window' ? 'lightblue' : 'brown',
                strokeWidth: 10,
                selectable: false,
                elementType: currentTool,
                elementData: { 
                    name: currentTool === 'window' ? 'Neues Fenster' : 'Neue Tür', 
                    width: 0,
                    wallId: closestWall.id,
                    position: position
                },
                wallAngle: angle,
                wallReference: closestWall
            });
            canvas.add(currentElement);
        } else if (currentTool === 'machine' || currentTool === 'safety_closet') {
            // Create rectangles with zero size initially
            currentElement = new fabric.Rect({
                left: startPoint.x,
                top: startPoint.y,
                width: 0,
                height: 0,
                fill: currentTool === 'machine' ? 'blue' : 'yellow',
                selectable: false,
                elementType: currentTool,
                elementData: { 
                    name: currentTool === 'machine' ? 'Neue Maschine' : 'Neuer Sicherheitsschrank',
                    width: 0,
                    height: 0
                }
            });
            canvas.add(currentElement);
        } else if (currentTool === 'emergency_kit') {
            // Create circle with zero radius initially
            currentElement = new fabric.Circle({
                left: startPoint.x,
                top: startPoint.y,
                radius: 0,
                fill: 'red',
                selectable: false,
                elementType: 'emergency_kit',
                elementData: { 
                    name: 'Neue Notfallausrüstung', 
                    radius: 0,
                    type: '' 
                }
            });
            canvas.add(currentElement);
        } else if (currentTool === 'emergency_route') {
            // Create path with initial point
            currentElement = new fabric.Path(`M ${startPoint.x} ${startPoint.y}`, {
                stroke: 'green',
                strokeWidth: 3,
                strokeDashArray: [5, 5],
                fill: '',
                selectable: false,
                elementType: 'emergency_route',
                elementData: { 
                    name: 'Neuer Fluchtweg', 
                    destination: '',
                    points: [[startPoint.x, startPoint.y]]
                }
            });
            canvas.add(currentElement);
        }
    });
    
    canvas.on('mouse:move', function(options) {
        if (!currentTool || currentTool === 'select' || currentTool === 'delete' || !drawStartPoint || !currentElement) return;
        
        const pointer = canvas.getPointer(options.e);
        
        // Snap to grid for walls
        let currentPoint = pointer;
        if (currentTool === 'wall' && snapToGrid) {
            currentPoint = snapToGridPoint(pointer);
        }
        
        // Clear previous dimension labels
        dimensionLabels.forEach(label => canvas.remove(label));
        dimensionLabels = [];
        
        if (currentTool === 'wall') {
            // Update wall line
            currentElement.set({ x2: currentPoint.x, y2: currentPoint.y });
            
            // Calculate and update length
            const dx = currentElement.x2 - currentElement.x1;
            const dy = currentElement.y2 - currentElement.y1;
            const length = Math.sqrt(dx*dx + dy*dy);
            currentElement.elementData.length = Math.round(length);
            
            // Create dimension label
            createDimensionLabel(
                (currentElement.x1 + currentElement.x2) / 2,
                (currentElement.y1 + currentElement.y2) / 2,
                length
            );
        } else if (currentTool === 'window' || currentTool === 'door') {
            if (currentElement.wallReference) {
                const wall = currentElement.wallReference;
                
                // Calculate position along wall based on mouse movement
                const position = calculatePositionOnWall(wall, pointer);
                const newX = wall.x1 + (wall.x2 - wall.x1) * position;
                const newY = wall.y1 + (wall.y2 - wall.y1) * position;
                
                // Calculate width based on distance along wall
                const startPosition = currentElement.elementData.position;
                const startX = wall.x1 + (wall.x2 - wall.x1) * startPosition;
                const startY = wall.y1 + (wall.y2 - wall.y1) * startPosition;
                
                // Update line
                currentElement.set({
                    x1: startX,
                    y1: startY,
                    x2: newX,
                    y2: newY
                });
                
                // Calculate width
                const dx = newX - startX;
                const dy = newY - startY;
                const width = Math.sqrt(dx*dx + dy*dy);
                currentElement.elementData.width = Math.round(width);
                
                // Create dimension label
                createDimensionLabel(
                    (startX + newX) / 2,
                    (startY + newY) / 2,
                    width
                );
            }
        } else if (currentTool === 'machine' || currentTool === 'safety_closet') {
            // Update rectangle dimensions
            const width = Math.abs(currentPoint.x - drawStartPoint.x);
            const height = Math.abs(currentPoint.y - drawStartPoint.y);
            const left = Math.min(currentPoint.x, drawStartPoint.x);
            const top = Math.min(currentPoint.y, drawStartPoint.y);
            
            currentElement.set({
                left: left,
                top: top,
                width: width,
                height: height
            });
            
            // Update element data
            currentElement.elementData.width = Math.round(width);
            currentElement.elementData.height = Math.round(height);
            
            // Create dimension label
            createDimensionLabel(
                left + width/2,
                top - 5,
                width,
                ` x ${pixelsToMeters(height).toFixed(2)}m`
            );
        } else if (currentTool === 'emergency_kit') {
            // Calculate radius based on distance from start point
            const dx = currentPoint.x - drawStartPoint.x;
            const dy = currentPoint.y - drawStartPoint.y;
            const radius = Math.sqrt(dx*dx + dy*dy);
            
            currentElement.set({
                left: drawStartPoint.x - radius,
                top: drawStartPoint.y - radius,
                radius: radius
            });
            
            // Update element data
            currentElement.elementData.radius = Math.round(radius);
            
            // Create dimension label
            createDimensionLabel(
                drawStartPoint.x,
                drawStartPoint.y - radius - 5,
                radius,
                ' radius'
            );
        } else if (currentTool === 'emergency_route') {
            // Get current points
            let points = currentElement.elementData.points || [];
            
            // Add new point
            points.push([currentPoint.x, currentPoint.y]);
            currentElement.elementData.points = points;
            
            // Update path
            let pathString = `M ${points[0][0]} ${points[0][1]}`;
            for (let i = 1; i < points.length; i++) {
                pathString += ` L ${points[i][0]} ${points[i][1]}`;
            }
            currentElement.set('path', pathString);
            
            // Calculate total path length
            let totalLength = 0;
            for (let i = 1; i < points.length; i++) {
                const dx = points[i][0] - points[i-1][0];
                const dy = points[i][1] - points[i-1][1];
                totalLength += Math.sqrt(dx*dx + dy*dy);
            }
            
            // Create dimension label
            createDimensionLabel(
                currentPoint.x + 10,
                currentPoint.y,
                totalLength
            );
        }
        
        canvas.renderAll();
    });
    
    canvas.on('mouse:up', function() {
        if (!currentTool || currentTool === 'select' || currentTool === 'delete' || !drawStartPoint || !currentElement) {
            drawStartPoint = null;
            return;
        }
        
        // For elements with very small dimensions, consider it a click rather than a drag
        // This helps avoid creating tiny elements
        if (['machine', 'safety_closet', 'emergency_kit'].includes(currentTool)) {
            if (currentTool === 'emergency_kit') {
                if (currentElement.radius < 5) {
                    canvas.remove(currentElement);
                    currentElement = null;
                    drawStartPoint = null;
                    return;
                }
            } else {
                if (currentElement.width < 10 || currentElement.height < 10) {
                    canvas.remove(currentElement);
                    currentElement = null;
                    drawStartPoint = null;
                    return;
                }
            }
        }
        
        if (currentElement) {
            // Add permanent dimension label
            let dimensionLabel;
            
            if (currentElement.elementType === 'wall' || currentElement.elementType === 'window' || currentElement.elementType === 'door') {
                const dx = currentElement.x2 - currentElement.x1;
                const dy = currentElement.y2 - currentElement.y1;
                const length = Math.sqrt(dx*dx + dy*dy);
                
                // Skip tiny walls
                if (length < 10) {
                    canvas.remove(currentElement);
                    currentElement = null;
                    drawStartPoint = null;
                    return;
                }
                
                // Add dimension label
                dimensionLabel = new fabric.Text(`${pixelsToMeters(length).toFixed(2)}m`, {
                    left: (currentElement.x1 + currentElement.x2) / 2,
                    top: (currentElement.y1 + currentElement.y2) / 2 - 15,
                    fontSize: 12,
                    fill: 'black',
                    backgroundColor: 'white',
                    selectable: false
                });
            } else if (currentElement.elementType === 'machine' || currentElement.elementType === 'safety_closet') {
                dimensionLabel = new fabric.Text(`${pixelsToMeters(currentElement.width).toFixed(2)}m x ${pixelsToMeters(currentElement.height).toFixed(2)}m`, {
                    left: currentElement.left + currentElement.width/2,
                    top: currentElement.top - 15,
                    fontSize: 12,
                    fill: 'black',
                    backgroundColor: 'white',
                    selectable: false
                });
            } else if (currentElement.elementType === 'emergency_kit') {
                dimensionLabel = new fabric.Text(`r: ${pixelsToMeters(currentElement.radius).toFixed(2)}m`, {
                    left: currentElement.left + currentElement.radius,
                    top: currentElement.top - 15,
                    fontSize: 12,
                    fill: 'black',
                    backgroundColor: 'white',
                    selectable: false
                });
            } else if (currentElement.elementType === 'emergency_route') {
                // Calculate total path length
                let totalLength = 0;
                const points = currentElement.elementData.points;
                
                for (let i = 1; i < points.length; i++) {
                    const dx = points[i][0] - points[i-1][0];
                    const dy = points[i][1] - points[i-1][1];
                    totalLength += Math.sqrt(dx*dx + dy*dy);
                }
                
                const lastPoint = points[points.length - 1];
                dimensionLabel = new fabric.Text(`${pixelsToMeters(totalLength).toFixed(2)}m`, {
                    left: lastPoint[0] + 10,
                    top: lastPoint[1] - 15,
                    fontSize: 12,
                    fill: 'black',
                    backgroundColor: 'white',
                    selectable: false
                });
            }
            
            if (dimensionLabel) {
                canvas.add(dimensionLabel);
                currentElement.dimensionLabel = dimensionLabel;
            }
            
            // Set final properties
            currentElement.id = 'temp_' + Date.now().toString();
            currentElement.selectable = false;
            
            // Set constraints for line elements
            if (['wall', 'window', 'door'].includes(currentElement.elementType)) {
                currentElement.lockScalingY = true;
                currentElement.setControlsVisibility({
                    mt: false, // middle top
                    mb: false, // middle bottom
                    ml: true,  // middle left
                    mr: true,  // middle right
                    mtr: true  // rotation control
                });
            }
            
            // Mark as unsaved
            unsavedChanges = true;
            
            currentElement = null;
        }
        
        dimensionLabels.forEach(label => canvas.remove(label));
        dimensionLabels = [];
        
        drawStartPoint = null;
    });
    
    // Handle object modification - update dimension labels
    canvas.on('object:modified', function(options) {
        const obj = options.target;
        if (obj && obj.elementType) {
            // If the object has a dimension label, update it
            updateDimensionLabel(obj);
            unsavedChanges = true;
        }
    });
    
    // Handle element selection constraints
    canvas.on('object:selected', function(options) {
        const obj = options.target;
        if (!obj || currentTool !== 'select') return;
        
        if (['wall', 'window', 'door'].includes(obj.elementType)) {
            // Line elements should only be scalable along their length
            obj.lockScalingY = true;
            obj.lockScalingX = false;
            obj.setControlsVisibility({
                mt: false,  // middle top
                mb: false,  // middle bottom
                ml: true,   // middle left
                mr: true,   // middle right
                mtr: true   // rotation control
            });
        }
    });
    
    // Function to save all elements
    function saveAllElements() {
        const elementsToSave = [];
        
        canvas.forEachObject(function(obj) {
            // Don't save grid lines or dimension labels
            if (gridLines.includes(obj) || !obj.elementType) return;
            
            // For path elements (emergency routes), ensure the path is serialized correctly
            if (obj.elementType === 'emergency_route' && obj.elementData.points) {
                // Make sure the path is stored in the object
                if (typeof obj.path === 'string') {
                    obj.path = new fabric.Path(obj.path).path;
                }
            }
            
            elementsToSave.push({
                id: obj.id,
                type: obj.elementType,
                data: obj.elementData,
                canvasObject: JSON.stringify(obj.toJSON())
            });
        });
        
        fetch('/save-elements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(elementsToSave)
        })
        .then(response => {
            if (response.ok) {
                alert('Floorplan gespeichert!');
                unsavedChanges = false;
            } else {
                alert('Fehler beim Speichern!');
            }
        });
    }
    
    // Initialize grid on startup
    initializeGrid();
    
    // Warning if leaving with unsaved changes
    window.addEventListener('beforeunload', function(e) {
        if (unsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });
    """
@app.get("/view-mode")
def view_mode():
    return Div(
        Canvas(id="floorplan-view-canvas", width="800", height="600", 
               cls="border border-gray-300"),
        Script(view_mode_js()),
        cls="flex-grow"
    )

def view_mode_js():
    return """
    let viewCanvas = new fabric.Canvas('floorplan-view-canvas');
    viewCanvas.selection = false;
    let pixelsPerMeter = 100; // Default, will be updated from elements if available
    
    // Alle Elemente vom Server laden
    fetch('/get-all-elements')
        .then(response => response.json())
        .then(elements => {
            elements.forEach(element => {
                const canvasObj = JSON.parse(element.canvasObject);
                fabric.util.enlivenObjects([canvasObj], function(objects) {
                    const obj = objects[0];
                    obj.id = element.id;
                    obj.elementType = element.type;
                    obj.elementData = element.data;
                    obj.selectable = true;
                    obj.hasControls = false;
                    obj.hasBorders = false;
                    viewCanvas.add(obj);
                    
                    // Add dimension label
                    addDimensionLabel(obj);
                });
            });
        });
    
    function pixelsToMeters(pixels) {
        return pixels / pixelsPerMeter;
    }
    
    function addDimensionLabel(obj) {
        let dimensionLabel;
        
        if (obj.elementType === 'wall' || obj.elementType === 'window' || obj.elementType === 'door') {
            const dx = obj.x2 - obj.x1;
            const dy = obj.y2 - obj.y1;
            const length = Math.sqrt(dx*dx + dy*dy);
            
            dimensionLabel = new fabric.Text(`${pixelsToMeters(length).toFixed(2)}m`, {
                left: (obj.x1 + obj.x2) / 2,
                top: (obj.y1 + obj.y2) / 2 - 15,
                fontSize: 12,
                fill: 'black',
                backgroundColor: 'white',
                selectable: false
            });
        } else if (obj.elementType === 'machine' || obj.elementType === 'safety_closet') {
            dimensionLabel = new fabric.Text(`${pixelsToMeters(obj.width).toFixed(2)}m x ${pixelsToMeters(obj.height).toFixed(2)}m`, {
                left: obj.left + obj.width/2,
                top: obj.top - 15,
                fontSize: 12,
                fill: 'black',
                backgroundColor: 'white',
                selectable: false
            });
        } else if (obj.elementType === 'emergency_kit') {
            dimensionLabel = new fabric.Text(`r: ${pixelsToMeters(obj.radius).toFixed(2)}m`, {
                left: obj.left + obj.radius,
                top: obj.top - 15,
                fontSize: 12,
                fill: 'black',
                backgroundColor: 'white',
                selectable: false
            });
        }
        
        if (dimensionLabel) {
            viewCanvas.add(dimensionLabel);
        }
    }
    
    // Element-Details anzeigen bei Klick
    viewCanvas.on('mouse:down', function(options) {
        if (options.target) {
            const element = options.target;
            if (element.id) {
                fetch(`/show-element-data/${element.id}`)
                    .then(response => response.text())
                    .then(html => {
                        document.getElementById('element-details').innerHTML = html;
                    });
            }
        }
    });
    """
@app.post("/save-elements")
def save_elements(request):
    global elements
    elements_data = json.loads(request.body)
    
    # Clear existing elements
    elements = {}
    
    # Add all elements
    for element in elements_data:
        elements[element['id']] = element
        
    return ""

@app.post("/update-element/{element_id}")
def update_element(element_id: str, name: str, **kwargs):
    if element_id in elements:
        elements[element_id]['data']['name'] = name
        
        # Elementspezifische Felder aktualisieren
        for key, value in kwargs.items():
            elements[element_id]['data'][key] = value
            
        return Div(
            P(f"Element {name} aktualisiert", cls="text-green-500"),
            # Formular erneut anzeigen
            Form(
                Div(
                    Label("Name:", cls="block text-sm"),
                    Input(type="text", name="name", value=name, cls="w-full p-1 border rounded"),
                    cls="mb-2"
                ),
                # Elementspezifische Felder dynamisch generieren
                *generate_element_fields(elements[element_id]),
                Button("Speichern", type="submit", cls="bg-blue-500 text-white px-3 py-1 rounded mt-2"),
                hx_post=f"/update-element/{element_id}",
                hx_target="#properties-editor"
            )
        )
    return ""

@app.get("/get-all-elements")
def get_all_elements():
    return json.dumps(list(elements.values()))

@app.get("/show-element-data/{element_id}")
def show_element_data(element_id: str):
    if element_id in elements:
        element = elements[element_id]
        return Div(
            H3(f"{ELEMENT_TYPES[element['type']]}: {element['data']['name']}", 
               cls="text-lg font-bold mb-2"),
            Div(
                *[P(f"{key.capitalize()}: {value}", cls="mb-1") 
                  for key, value in element['data'].items()],
                cls="p-2 bg-gray-100 rounded"
            )
        )
    return Div(P("Element nicht gefunden", cls="text-red-500"))

def generate_element_fields(element):
    """Generiert elementspezifische Formularfelder basierend auf dem Elementtyp"""
    fields = []
    element_type = element['type']
    element_data = element['data']
    
    if element_type == 'wall':
        fields.append(
            Div(
                Label("Länge:", cls="block text-sm"),
                Input(type="number", name="length", value=element_data.get('length', 0), 
                      cls="w-full p-1 border rounded", readonly=True),
                cls="mb-2"
            )
        )
    elif element_type == 'machine':
        fields.extend([
            Div(
                Label("Modell:", cls="block text-sm"),
                Input(type="text", name="model", value=element_data.get('model', ''), 
                      cls="w-full p-1 border rounded"),
                cls="mb-2"
            ),
            Div(
                Label("Spezifikationen:", cls="block text-sm"),
                Textarea(element_data.get('specifications', ''), 
                         name="specifications", cls="w-full p-1 border rounded"),
                cls="mb-2"
            )
        ])
    # Weitere Elementtypen hier hinzufügen
    
    return fields

@app.post("/delete-element/{element_id}")
def delete_element(element_id: str):
    if element_id in elements:
        del elements[element_id]
    return ""

# Server starten
if __name__ == "__main__":
    serve()
