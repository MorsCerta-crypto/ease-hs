document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    const svg = document.getElementById('layout-svg');
    const canvasContainer = document.getElementById('canvas-container');
    
    if (!svg) {
        console.error('SVG element not found!');
        return;
    }
    
    if (!canvasContainer) {
        console.error('Canvas container not found!');
        return;
    }
    
    console.log('SVG and container found:', {
        svg: svg,
        container: canvasContainer,
        containerSize: {
            width: canvasContainer.clientWidth,
            height: canvasContainer.clientHeight
        }
    });

    let currentTool = 'select';
    let selectedSymbol = null;
    let drawing = false;
    let startX, startY;
    let currentElement = null;
    let selectedElement = null;
    let buildingId = svg.dataset.buildingId;
    let gridSize = 20; // Size of grid cells in pixels
    let zoom = 1;
    let pan = { x: 0, y: 0 };
    let isResizing = false;
    let resizeHandle = null;

    // Initialize SVG with grid and viewport
    function initializeSvg() {
        console.log('Initializing SVG');
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        console.log('Setting SVG dimensions:', { width, height });
        
        // Set SVG attributes
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Create grid
        const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gridGroup.id = "grid";
        gridGroup.setAttribute('stroke', '#ddd');
        gridGroup.setAttribute('stroke-width', '1'); // Make grid lines more visible

        console.log('Creating grid lines');
        // Draw vertical lines
        for (let x = 0; x <= width; x += gridSize) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', x);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', x);
            line.setAttribute('y2', height);
            gridGroup.appendChild(line);
        }

        // Draw horizontal lines
        for (let y = 0; y <= height; y += gridSize) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute('x1', 0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', width);
            line.setAttribute('y2', y);
            gridGroup.appendChild(line);
        }

        // Clear existing grid if any
        const existingGrid = svg.querySelector('#grid');
        if (existingGrid) {
            console.log('Removing existing grid');
            existingGrid.remove();
        }

        // Add new grid
        console.log('Adding new grid');
        svg.insertBefore(gridGroup, svg.firstChild);
        
        console.log('SVG initialization complete');
    }

    // Snap coordinates to grid
    function snapToGrid(x, y) {
        return {
            x: Math.round(x / gridSize) * gridSize,
            y: Math.round(y / gridSize) * gridSize
        };
    }

    // Tool Selection
    document.querySelectorAll('.toolbox button[id^="tool-"], .toolbox button.tool-symbol').forEach(button => {
        button.addEventListener('click', () => {
            // Remove primary class from all buttons
            document.querySelectorAll('.toolbox button').forEach(btn => btn.classList.remove('uk-button-primary'));
            
            if (button.classList.contains('tool-symbol')) {
                selectedSymbol = {
                    kind: button.dataset.symbolKind,
                    src: button.dataset.symbolSrc,
                    width: parseInt(button.dataset.symbolWidth),
                    height: parseInt(button.dataset.symbolHeight)
                };
                console.log('Symbol selected:', selectedSymbol);
                currentTool = 'symbol';
            } else {
                currentTool = button.id.replace('tool-', '');
                selectedSymbol = null;
            }
            
            // Add primary class to selected button
            button.classList.add('uk-button-primary');
        });
    });

    // SVG Interaction Logic
    svg.addEventListener('mousedown', (e) => {
        if (!buildingId) {
            console.warn('No building ID available');
            return;
        }

        const { x, y } = getSvgCoords(e);
        const snapped = snapToGrid(x, y);
        startX = snapped.x;
        startY = snapped.y;
        
        console.log('Mouse down:', { x, y, snapped: { x: startX, y: startY } });

        // Check if clicking on a resize handle
        if (e.target.classList.contains('resize-handle')) {
            console.log('Resize handle clicked');
            isResizing = true;
            resizeHandle = e.target;
            selectedElement = e.target.parentElement;
            return;
        }

        // Check if clicking on an existing element
        if (e.target.classList.contains('layout-item')) {
            console.log('Existing element clicked:', e.target);
            selectedElement = e.target;
            addSelectionHighlight(selectedElement);
            loadInfoForElement(selectedElement.dataset.elementId);
            return;
        }

        // Start drawing new element
        if (currentTool === 'rect' || currentTool === 'line' || currentTool === 'circle') {
            console.log('Starting to draw:', currentTool);
            drawing = true;
            currentElement = createSvgElement(currentTool, { x: startX, y: startY });
            svg.appendChild(currentElement);
        } else if (currentTool === 'symbol' && selectedSymbol) {
            console.log('Placing symbol:', selectedSymbol);
            currentElement = createSvgElement('symbol', { 
                x: startX, 
                y: startY, 
                symbol: selectedSymbol 
            });
            svg.appendChild(currentElement);
            saveElementToServer(currentElement).then(() => {
                // After saving, select the new element
                selectedElement = currentElement;
                addSelectionHighlight(selectedElement);
                loadInfoForElement(selectedElement.dataset.elementId);
                // Switch back to select mode
                document.querySelectorAll('.toolbox button').forEach(btn => btn.classList.remove('uk-button-primary'));
                document.getElementById('tool-select').classList.add('uk-button-primary');
                currentTool = 'select';
                selectedSymbol = null;
            });
            addResizeHandles(currentElement);
        }
    });

    svg.addEventListener('mousemove', (e) => {
        if (isResizing && selectedElement) {
            const { x, y } = getSvgCoords(e);
            const snapped = snapToGrid(x, y);
            resizeElement(selectedElement, resizeHandle, snapped);
            return;
        }

        if (!drawing || !currentElement) return;

        const { x, y } = getSvgCoords(e);
        const snapped = snapToGrid(x, y);
        updateSvgElement(currentElement, currentTool, { startX, startY, currentX: snapped.x, currentY: snapped.y });
    });

    svg.addEventListener('mouseup', (e) => {
        if (isResizing) {
            isResizing = false;
            resizeHandle = null;
            saveElementToServer(selectedElement);
            return;
        }

        if (!drawing) {
            if (currentTool === 'select' && selectedElement && startX !== e.clientX) {
                const { x, y } = getSvgCoords(e);
                const snapped = snapToGrid(x, y);
                updateElementPosition(selectedElement, snapped.x - startX, snapped.y - startY);
                saveElementToServer(selectedElement);
            }
            return;
        }

        drawing = false;
        const { x, y } = getSvgCoords(e);
        const snapped = snapToGrid(x, y);

        if (currentElement && (currentTool === 'rect' || currentTool === 'line' || currentTool === 'circle')) {
            updateSvgElement(currentElement, currentTool, { startX, startY, currentX: snapped.x, currentY: snapped.y, final: true });
            saveElementToServer(currentElement);
            if (currentTool === 'rect') {
                addResizeHandles(currentElement);
            }
            currentElement = null;
            
            // Unselect the current tool and switch to select mode
            document.querySelectorAll('.toolbox button').forEach(btn => btn.classList.remove('uk-button-primary'));
            document.getElementById('tool-select').classList.add('uk-button-primary');
            currentTool = 'select';
        }
    });

    // Zoom and Pan Controls
    svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoom *= delta;
        zoom = Math.max(0.1, Math.min(5, zoom));
        updateViewport();
    }, { passive: false });

    // Pan with middle mouse button
    svg.addEventListener('mousedown', (e) => {
        if (e.button === 1) {
            const { x, y } = getSvgCoords(e);
            pan.startX = x;
            pan.startY = y;
            pan.isPanning = true;
        }
    });

    svg.addEventListener('mousemove', (e) => {
        if (pan.isPanning) {
            const { x, y } = getSvgCoords(e);
            pan.x += x - pan.startX;
            pan.y += y - pan.startY;
            pan.startX = x;
            pan.startY = y;
            updateViewport();
        }
    });

    svg.addEventListener('mouseup', (e) => {
        if (e.button === 1) {
            pan.isPanning = false;
        }
    });

    function updateViewport() {
        const container = document.getElementById('canvas-container');
        const viewBox = [
            -pan.x / zoom,
            -pan.y / zoom,
            container.clientWidth / zoom,
            container.clientHeight / zoom
        ].join(' ');
        svg.setAttribute('viewBox', viewBox);
    }

    // Helper Functions
    function getSvgCoords(event) {
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { x: svgP.x, y: svgP.y };
    }

    function createSvgElement(type, data) {
        const ns = "http://www.w3.org/2000/svg";
        let el;

        switch (type) {
            case 'rect':
                el = document.createElementNS(ns, 'rect');
                el.setAttribute('x', data.x);
                el.setAttribute('y', data.y);
                el.setAttribute('width', '0');
                el.setAttribute('height', '0');
                el.setAttribute('fill', 'rgba(173, 216, 230, 0.3)');
                el.setAttribute('stroke', '#4a90e2');
                el.setAttribute('stroke-width', '2');
                break;
            case 'line':
                el = document.createElementNS(ns, 'line');
                el.setAttribute('x1', data.x);
                el.setAttribute('y1', data.y);
                el.setAttribute('x2', data.x);
                el.setAttribute('y2', data.y);
                el.setAttribute('stroke', '#e24a4a');
                el.setAttribute('stroke-width', '4');
                el.setAttribute('fill', 'none');
                break;
            case 'circle':
                el = document.createElementNS(ns, 'circle');
                el.setAttribute('cx', data.x);
                el.setAttribute('cy', data.y);
                el.setAttribute('r', '0');
                el.setAttribute('fill', 'rgba(144, 238, 144, 0.3)');
                el.setAttribute('stroke', '#4ae24a');
                el.setAttribute('stroke-width', '2');
                break;
            case 'symbol':
                el = document.createElementNS(ns, 'image');
                el.setAttribute('x', data.x - data.symbol.width / 2);
                el.setAttribute('y', data.y - data.symbol.height / 2);
                el.setAttribute('width', data.symbol.width);
                el.setAttribute('height', data.symbol.height);
                el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', data.symbol.src);
                el.dataset.symbolKind = data.symbol.kind;
                el.dataset.elementType = 'symbol';
                break;
        }

        if (el) {
            el.classList.add('layout-item');
            el.dataset.elementId = '';
        }
        return el;
    }

    function updateSvgElement(el, type, data) {
        if (type === 'rect') {
            const width = Math.abs(data.currentX - data.startX);
            const height = Math.abs(data.currentY - data.startY);
            const newX = Math.min(data.currentX, data.startX);
            const newY = Math.min(data.currentY, data.startY);
            el.setAttribute('x', newX);
            el.setAttribute('y', newY);
            el.setAttribute('width', width);
            el.setAttribute('height', height);
        } else if (type === 'line') {
            el.setAttribute('x2', data.currentX);
            el.setAttribute('y2', data.currentY);
        } else if (type === 'circle') {
            const radius = Math.sqrt(
                Math.pow(data.currentX - data.startX, 2) + 
                Math.pow(data.currentY - data.startY, 2)
            );
            el.setAttribute('r', radius);
        }
    }

    function updateElementPosition(el, dx, dy) {
        const currentX = parseFloat(el.getAttribute('x') || el.getAttribute('cx') || el.getAttribute('x1'));
        const currentY = parseFloat(el.getAttribute('y') || el.getAttribute('cy') || el.getAttribute('y1'));

        if (el.tagName.toLowerCase() === 'rect' || el.tagName.toLowerCase() === 'image') {
            el.setAttribute('x', currentX + dx);
            el.setAttribute('y', currentY + dy);
        } else if (el.tagName.toLowerCase() === 'circle') {
            el.setAttribute('cx', currentX + dx);
            el.setAttribute('cy', currentY + dy);
        } else if (el.tagName.toLowerCase() === 'line') {
            const x2 = parseFloat(el.getAttribute('x2'));
            const y2 = parseFloat(el.getAttribute('y2'));
            el.setAttribute('x1', currentX + dx);
            el.setAttribute('y1', currentY + dy);
            el.setAttribute('x2', x2 + dx);
            el.setAttribute('y2', y2 + dy);
        }

        if (el.querySelector('.resize-handles')) {
            addResizeHandles(el);
        }
    }

    function saveElementToServer(el) {
        const data = {
            building_id: buildingId,
            element_type: el.dataset.elementType || el.tagName.toLowerCase(),
            x: parseFloat(el.getAttribute('x') || el.getAttribute('cx') || el.getAttribute('x1')),
            y: parseFloat(el.getAttribute('y') || el.getAttribute('cy') || el.getAttribute('y1')),
        };

        if (data.element_type === 'rect' || data.element_type === 'symbol' || data.element_type === 'image') {
            data.width = parseFloat(el.getAttribute('width'));
            data.height = parseFloat(el.getAttribute('height'));
            if (data.element_type === 'symbol' || data.element_type === 'image') {
                data.element_type = 'symbol';
                data.symbol_kind = el.dataset.symbolKind;
            }
        } else if (data.element_type === 'line') {
            data.x2 = parseFloat(el.getAttribute('x2'));
            data.y2 = parseFloat(el.getAttribute('y2'));
        } else if (data.element_type === 'circle') {
            data.radius = parseFloat(el.getAttribute('r'));
        }

        data.fill = el.getAttribute('fill') || 'transparent';
        data.stroke = el.getAttribute('stroke') || 'black';

        const elementId = el.dataset.elementId;
        const method = elementId ? 'PUT' : 'POST';
        const url = '/element';
        if (elementId) data.id = elementId;

        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            if (method === 'POST') return response.json();
            return null;
        })
        .then(result => {
            if (result && result.new_id) {
                el.dataset.elementId = result.new_id;
                el.id = `el-${result.new_id}`;
            }
            return result;
        })
        .catch(error => {
            console.error('Error saving element:', error);
            throw error;
        });
    }

    function loadInfoForElement(elementId) {
        if (!elementId) return;
        htmx.ajax('GET', `/machine_info/${elementId}`, { target: '#info-panel', swap: 'innerHTML' });
    }

    function clearInfoPanel() {
        document.getElementById('info-panel').innerHTML = '<p>Click on a machine/closet to see details.</p>';
    }

    function addSelectionHighlight(el) {
        removeSelectionHighlight();
        if (el) {
            el.style.outline = '2px dashed #4a90e2';
            el.style.outlineOffset = '2px';
        }
    }

    function removeSelectionHighlight() {
        svg.querySelectorAll('.layout-item').forEach(item => {
            item.style.outline = 'none';
            item.style.outlineOffset = '0';
        });
    }

    function addResizeHandles(element) {
        // Remove existing handles
        const existingHandles = element.querySelectorAll('.resize-handle');
        existingHandles.forEach(handle => handle.remove());

        // Create group for handles
        const handleGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        handleGroup.classList.add('resize-handles');

        // Add handles based on element type
        if (element.tagName.toLowerCase() === 'rect' || element.tagName.toLowerCase() === 'image') {
            const width = parseFloat(element.getAttribute('width'));
            const height = parseFloat(element.getAttribute('height'));
            const x = parseFloat(element.getAttribute('x'));
            const y = parseFloat(element.getAttribute('y'));

            // Corner handles
            addHandle(handleGroup, x, y, 'nw');
            addHandle(handleGroup, x + width, y, 'ne');
            addHandle(handleGroup, x, y + height, 'sw');
            addHandle(handleGroup, x + width, y + height, 'se');

            // Edge handles
            addHandle(handleGroup, x + width/2, y, 'n');
            addHandle(handleGroup, x + width, y + height/2, 'e');
            addHandle(handleGroup, x + width/2, y + height, 's');
            addHandle(handleGroup, x, y + height/2, 'w');
        }

        element.appendChild(handleGroup);
    }

    function addHandle(group, x, y, position) {
        const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        handle.setAttribute('x', x - 4);
        handle.setAttribute('y', y - 4);
        handle.setAttribute('width', '8');
        handle.setAttribute('height', '8');
        handle.setAttribute('fill', '#4a90e2');
        handle.setAttribute('stroke', 'white');
        handle.setAttribute('stroke-width', '1');
        handle.classList.add('resize-handle');
        handle.dataset.position = position;
        group.appendChild(handle);
    }

    function resizeElement(element, handle, newPos) {
        const position = handle.dataset.position;
        const x = parseFloat(element.getAttribute('x'));
        const y = parseFloat(element.getAttribute('y'));
        const width = parseFloat(element.getAttribute('width'));
        const height = parseFloat(element.getAttribute('height'));

        switch (position) {
            case 'nw':
                const newWidth = width + (x - newPos.x);
                const newHeight = height + (y - newPos.y);
                element.setAttribute('x', newPos.x);
                element.setAttribute('y', newPos.y);
                element.setAttribute('width', newWidth);
                element.setAttribute('height', newHeight);
                break;
            // Add similar cases for other positions
        }

        addResizeHandles(element);
    }

    // Add click handler for the delete button
    document.getElementById('delete-selected').addEventListener('click', () => {
        if (selectedElement && selectedElement.dataset.elementId) {
            const elementId = selectedElement.dataset.elementId;
            fetch('/element/selected', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ element_id: elementId })
            })
            .then(response => {
                if (response.ok) {
                    selectedElement.remove();
                    selectedElement = null;
                    removeSelectionHighlight();
                    clearInfoPanel();
                }
            })
            .catch(error => {
                console.error('Error deleting element:', error);
            });
        }
    });

    // Add click handler for the canvas to deselect elements
    svg.addEventListener('click', (e) => {
        // Only deselect if clicking directly on the SVG (not on an element)
        if (e.target === svg) {
            selectedElement = null;
            removeSelectionHighlight();
            clearInfoPanel();
        }
    });

    // Initialize the SVG with grid
    initializeSvg();
}); 