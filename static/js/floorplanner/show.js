document.addEventListener('DOMContentLoaded', function() {
    // Get floorplan ID from URL or another source
    const floorplanId = getFloorplanIdFromUrl();
    console.log('Floorplan ID:', floorplanId);
    const elementContainer = document.getElementById('elements-container');
    const propertyPanel = document.getElementById('property-panel');
    
    // Load and display all elements
    loadElements(floorplanId);
    
    function getFloorplanIdFromUrl() {
        // Extract floorplan ID from URL - adjust based on your URL structure
        const pathParts = window.location.pathname.split('/');
        const index = pathParts.indexOf('floorplan_editor') + 1;
        return index > 0 && index < pathParts.length ? pathParts[index] : null;
    }
    
    function loadElements(floorplanId) {
        fetch(`/floorplan_editor/${floorplanId}/elements`)
            .then(response => response.json())
            .then(elements => {
                displayElements(elements);
            })
            .catch(error => console.error('Error loading elements:', error));
    }
    
    function displayElements(elements) {
        // Clear existing elements
        elementContainer.innerHTML = '';
        
        // Display each element
        elements.forEach(element => {
            const elementDiv = document.createElement('div');
            elementDiv.className = 'floorplan-element';
            elementDiv.dataset.id = element.id;
            
            // Set element appearance based on its properties
            elementDiv.style.position = 'absolute';
            elementDiv.style.left = `${element.x}px`;
            elementDiv.style.top = `${element.y}px`;
            elementDiv.style.width = `${element.width}px`;
            elementDiv.style.height = `${element.height}px`;
            
            // Add click handler
            elementDiv.addEventListener('click', function() {
                loadElementProperties(floorplanId, element.id);
            });
            
            elementContainer.appendChild(elementDiv);
        });
    }
    
    function loadElementProperties(floorplanId, elementId) {
        // Highlight selected element
        document.querySelectorAll('.floorplan-element').forEach(el => {
            el.classList.remove('selected');
        });
        document.querySelector(`.floorplan-element[data-id="${elementId}"]`).classList.add('selected');
        
        // Fetch element properties
        fetch(`/floorplan_editor/${floorplanId}/element/${elementId}`)
            .then(response => response.json())
            .then(properties => {
                displayProperties(properties);
            })
            .catch(error => console.error('Error loading properties:', error));
    }
    
    function displayProperties(properties) {
        // Clear existing properties
        propertyPanel.innerHTML = '';
        
        // Display each property
        Object.entries(properties).forEach(([key, value]) => {
            const propertyDiv = document.createElement('div');
            propertyDiv.className = 'property-item';
            propertyDiv.innerHTML = `
                <span class="property-name">${key}:</span>
                <span class="property-value">${value}</span>
            `;
            propertyPanel.appendChild(propertyDiv);
        });
    }
}); 