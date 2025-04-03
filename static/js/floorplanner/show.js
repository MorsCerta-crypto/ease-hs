// Global state
const currentState = {
  canvas: null,
  ctx: null,
  width: 10,
  height: 10,
  elements: [],
  selectedElement: null,
  scale: 1, // Will be calculated dynamically
  panOffset: { x: 0, y: 0 }, // Will be calculated to center the floorplan
  floorplanId: null
};

// Initialize the floorplanner viewer
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('floorplan-canvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  
  currentState.canvas = canvas;
  currentState.ctx = canvas.getContext('2d');
  currentState.floorplanId = canvas.dataset.floorplanId;
  currentState.width = parseFloat(canvas.dataset.width);
  currentState.height = parseFloat(canvas.dataset.height);
  
  // Calculate the scale to fit the canvas
  const scaleX = canvas.width / currentState.width;
  const scaleY = canvas.height / currentState.height;
  currentState.scale = Math.min(scaleX, scaleY) * 0.9;
  
  // Center the floorplan
  currentState.panOffset.x = (canvas.width / currentState.scale - currentState.width) / 2;
  currentState.panOffset.y = (canvas.height / currentState.scale - currentState.height) / 2;
  
  // Initialize elements from data attribute
  try {
    const elementsData = canvas.dataset.floorplanElements;
    
    // If data attribute is empty or malformed, try fetching from API
    if (!elementsData || elementsData === '[]') {
      fetchElementsFromAPI();
    } else {
      currentState.elements = JSON.parse(elementsData || '[]');
      
      // If still no elements, fetch from API
      if (currentState.elements.length === 0) {
        fetchElementsFromAPI();
      }
    }
  } catch (e) {
    console.error('Error parsing elements:', e);
    currentState.elements = [];
    // Try to fetch elements from API as fallback
    fetchElementsFromAPI();
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Initial render
  render();
  
});

// Fetch elements from API
function fetchElementsFromAPI() {
  const floorplanId = currentState.floorplanId;
  if (!floorplanId) {
    console.error('No floorplan ID available for API fetch');
    return;
  }
  
  fetch(`/floorplan_editor/${floorplanId}/elements`)
    .then(response => response.json())
    .then(data => {
      if (Array.isArray(data)) {
        currentState.elements = data;
      } else if (typeof data === 'string') {
        try {
          currentState.elements = JSON.parse(data);
        } catch (e) {
          console.error('Error parsing API response:', e);
        }
      }
      render();
    })
    .catch(error => {
      console.error('Error fetching elements:', error);
    });
}



// Set up event listeners for the canvas
function setupEventListeners() {
  const canvas = currentState.canvas;
  
  // Pan functionality with middle mouse button or right click
  let isPanning = false;
  let lastPanPosition = { x: 0, y: 0 };
  
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2) { // Middle or right mouse button
      e.preventDefault();
      isPanning = true;
      lastPanPosition = { x: e.clientX, y: e.clientY };
    }
  });
  
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent context menu
  });
  
  window.addEventListener('mouseup', () => {
    isPanning = false;
  });
  
  window.addEventListener('mousemove', (e) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPosition.x;
      const dy = e.clientY - lastPanPosition.y;
      
      currentState.panOffset.x += dx / currentState.scale;
      currentState.panOffset.y += dy / currentState.scale;
      
      lastPanPosition = { x: e.clientX, y: e.clientY };
      render();
    }
  });
  
  // Zoom with mouse wheel
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert mouse position to world space
    const worldX = mouseX / currentState.scale - currentState.panOffset.x;
    const worldY = mouseY / currentState.scale - currentState.panOffset.y;
    
    // Adjust scale
    const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
    currentState.scale *= scaleFactor;
    
    // Limit scale
    currentState.scale = Math.max(0.1, Math.min(5, currentState.scale));
    
    // Adjust pan offset to zoom towards mouse position
    currentState.panOffset.x = -(worldX - mouseX / currentState.scale);
    currentState.panOffset.y = -(worldY - mouseY / currentState.scale);
    
    render();
  });
}

// Fetch element properties from server using htmx
function fetchElementProperties(elementId) {
  const floorplanId = currentState.floorplanId;
  // Make a simple htmx GET request
  console.log(`fetching element properties for ${elementId}`)
  htmx.ajax('GET', `/floorplan_editor/${floorplanId}/element/${elementId}`, {
    target: '#element-properties',
    swap: 'innerHTML'
  });
}

// Check if a point is inside an element
function isPointInElement(x, y, element) {
  if (!element) return false;
  
  switch (element.element_type) {
    case 'wall':
    case 'door-standard':
    case 'door-emergency':
    case 'window':
    case 'emergency-route':
      return isPointOnLine(x, y, element.start, element.end, 10);
    case 'emergency-kit':
    case 'machine':
    case 'closet':
      // Calculate bounds using start/end points
      const width = Math.abs(element.end.x - element.start.x);
      const height = Math.abs(element.end.y - element.start.y);
      const rectX = Math.min(element.start.x, element.end.x);
      const rectY = Math.min(element.start.y, element.end.y);
      
      return x >= rectX && x <= rectX + width && y >= rectY && y <= rectY + height;
    default:
      return false;
  }
}

// Check if point is on a line (with thickness)
function isPointOnLine(x, y, start, end, thickness) {
  if (!start || !end) return false;
  
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) return false;
  
  // Project point onto line
  const t = ((x - start.x) * dx + (y - start.y) * dy) / (length * length);
  
  if (t < 0 || t > 1) return false;
  
  const projX = start.x + t * dx;
  const projY = start.y + t * dy;
  
  // Check distance from point to projection
  const distSq = (x - projX) * (x - projX) + (y - projY) * (y - projY);
  return distSq <= (thickness / 2) * (thickness / 2);
}

// Check if point is in rectangle
function isPointInRect(x, y, position, size) {
  if (!position || !size) return false;
  
  return x >= position.x && x <= position.x + size.width &&
         y >= position.y && y <= position.y + size.height;
}

// Render the floorplan
function render() {
  const { canvas, ctx, width, height, elements, selectedElement, scale, panOffset } = currentState;
  
  if (!canvas || !ctx) {
    console.error('Canvas or context not available');
    return;
  }
  
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Set up transform
  ctx.save();
  ctx.translate(panOffset.x * scale, panOffset.y * scale);
  ctx.scale(scale, scale);
  
  // Draw elements
  elements.forEach(element => {
    try {
      drawElement(ctx, element);
      
      // Highlight selected element
      if (selectedElement && element.id === selectedElement.id) {
        highlightElement(ctx, element);
      }
    } catch (e) {
      console.error('Error drawing element:', element, e);
    }
  });
  
  ctx.restore();
}

// Draw an element based on its type
function drawElement(ctx, element) {
  if (!element || !element.element_type) {
    console.warn('Invalid element:', element);
    return;
  }
  
  switch (element.element_type) {
    case 'wall':
      drawWall(ctx, element);
      break;
    case 'door-standard':
      drawDoor(ctx, element, '#4CAF50');
      break;
    case 'door-emergency':
      drawDoor(ctx, element, '#FF5722');
      break;
    case 'window':
      drawWindow(ctx, element);
      break;
    case 'emergency-route':
      drawEmergencyRoute(ctx, element);
      break;
    case 'emergency-kit':
      drawEmergencyKit(ctx, element);
      break;
    case 'machine':
      drawMachine(ctx, element);
      break;
    case 'closet':
      drawCloset(ctx, element);
      break;
    default:
      console.warn('Unknown element type:', element.element_type);
  }
}

// Drawing functions for each element type
function drawWall(ctx, wall) {
  ctx.beginPath();
  ctx.moveTo(wall.start.x, wall.start.y);
  ctx.lineTo(wall.end.x, wall.end.y);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.2;
  ctx.stroke();
}

function drawDoor(ctx, door, color) {
  const angle = Math.atan2(door.end.y - door.start.y, door.end.x - door.start.x);
  const length = Math.sqrt(
    Math.pow(door.end.x - door.start.x, 2) + 
    Math.pow(door.end.y - door.start.y, 2)
  );
  
  ctx.save();
  ctx.translate(door.start.x, door.start.y);
  ctx.rotate(angle);
  
  // Draw door base line
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length, 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.1;
  ctx.stroke();
  
  // Draw door swing arc
  ctx.beginPath();
  ctx.arc(0, 0, length, 0, Math.PI/2, false);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.05;
  ctx.stroke();
  
  ctx.restore();
}

function drawWindow(ctx, window) {
  ctx.beginPath();
  ctx.moveTo(window.start.x, window.start.y);
  ctx.lineTo(window.end.x, window.end.y);
  ctx.strokeStyle = '#2196F3';
  ctx.lineWidth = 0.15;
  ctx.stroke();
  
  // Add window details
  const angle = Math.atan2(window.end.y - window.start.y, window.end.x - window.start.x);
  const length = Math.sqrt(
    Math.pow(window.end.x - window.start.x, 2) + 
    Math.pow(window.end.y - window.start.y, 2)
  );
  
  ctx.save();
  ctx.translate(window.start.x, window.start.y);
  ctx.rotate(angle);
  
  // Draw window details
  const segmentLength = length / 4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * segmentLength, -0.1);
    ctx.lineTo(i * segmentLength, 0.1);
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawEmergencyRoute(ctx, route) {
  ctx.beginPath();
  ctx.moveTo(route.start.x, route.start.y);
  ctx.lineTo(route.end.x, route.end.y);
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 0.15;
  ctx.setLineDash([0.3, 0.2]);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw arrow at the end
  const angle = Math.atan2(route.end.y - route.start.y, route.end.x - route.start.x);
  
  ctx.save();
  ctx.translate(route.end.x, route.end.y);
  ctx.rotate(angle);
  
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-0.3, 0.2);
  ctx.lineTo(-0.3, -0.2);
  ctx.closePath();
  ctx.fillStyle = '#4CAF50';
  ctx.fill();
  
  ctx.restore();
}

function drawEmergencyKit(ctx, kit) {
  const width = Math.abs(kit.end.x - kit.start.x);
  const height = Math.abs(kit.end.y - kit.start.y);
  const x = Math.min(kit.start.x, kit.end.x);
  const y = Math.min(kit.start.y, kit.end.y);
  
  ctx.fillStyle = '#FFECB3';
  ctx.fillRect(x, y, width, height);
  
  ctx.strokeStyle = '#FF5722';
  ctx.lineWidth = 0.05;
  ctx.strokeRect(x, y, width, height);
  
  // Draw cross
  ctx.beginPath();
  ctx.moveTo(x + width/2, y + height*0.3);
  ctx.lineTo(x + width/2, y + height*0.7);
  ctx.moveTo(x + width*0.3, y + height/2);
  ctx.lineTo(x + width*0.7, y + height/2);
  ctx.strokeStyle = '#FF5722';
  ctx.lineWidth = 0.1;
  ctx.stroke();
}

function drawMachine(ctx, machine) {
  const width = Math.abs(machine.end.x - machine.start.x);
  const height = Math.abs(machine.end.y - machine.start.y);
  const x = Math.min(machine.start.x, machine.end.x);
  const y = Math.min(machine.start.y, machine.end.y);
  
  ctx.fillStyle = '#E0E0E0';
  ctx.fillRect(x, y, width, height);
  
  ctx.strokeStyle = '#616161';
  ctx.lineWidth = 0.05;
  ctx.strokeRect(x, y, width, height);
  
  // Draw machine details
  ctx.beginPath();
  ctx.arc(
    x + width/2,
    y + height/2,
    Math.min(width, height) * 0.3,
    0,
    Math.PI * 2
  );
  ctx.strokeStyle = '#616161';
  ctx.lineWidth = 0.05;
  ctx.stroke();
}

function drawCloset(ctx, closet) {
  const width = Math.abs(closet.end.x - closet.start.x);
  const height = Math.abs(closet.end.y - closet.start.y);
  const x = Math.min(closet.start.x, closet.end.x);
  const y = Math.min(closet.start.y, closet.end.y);
  
  ctx.fillStyle = '#BBDEFB';
  ctx.fillRect(x, y, width, height);
  
  ctx.strokeStyle = '#1976D2';
  ctx.lineWidth = 0.05;
  ctx.strokeRect(x, y, width, height);
  
  // Draw door lines
  const doorWidth = width / 2;
  
  ctx.beginPath();
  ctx.moveTo(x + doorWidth, y);
  ctx.lineTo(x + doorWidth, y + height);
  ctx.stroke();
}

// Highlight selected element
function highlightElement(ctx, element) {
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 0.1;
  
  switch (element.element_type) {
    case 'wall':
    case 'door-standard':
    case 'door-emergency':
    case 'window':
    case 'emergency-route':
      // Highlight line
      ctx.beginPath();
      ctx.moveTo(element.start.x, element.start.y);
      ctx.lineTo(element.end.x, element.end.y);
      ctx.stroke();
      
      // Highlight endpoints
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(element.start.x, element.start.y, 0.2, 0, Math.PI * 2);
      ctx.arc(element.end.x, element.end.y, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'emergency-kit':
    case 'machine':
    case 'closet':
      // Highlight rectangle
      const width = Math.abs(element.end.x - element.start.x);
      const height = Math.abs(element.end.y - element.start.y);
      const x = Math.min(element.start.x, element.end.x);
      const y = Math.min(element.start.y, element.end.y);
      
      ctx.strokeRect(
        x - 0.1,
        y - 0.1,
        width + 0.2,
        height + 0.2
      );
      break;
  }
} 