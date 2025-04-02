// js/api.js
import * as state from './state.js';
import * as config from './config.js';
import * as dom from './dom-references.js';

export async function saveElements(floorplanId) {
    if (!floorplanId) {
        console.error('No floorplan ID provided for saving');
        return;
    }

    dom.updateStatus("Saving...");
    const dataToSave = {
        elements: state.elements,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch(`/save_floorplan/${floorplanId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status} - ${errorText || response.statusText}`);
        }

        const result = await response.json();
        dom.updateStatus('Save successful!');
        console.log('Save successful:', result);

    } catch (error) {
        dom.updateStatus(`Save failed: ${error.message}`);
        console.error('Save failed:', error);
        alert(`Failed to save: ${error.message}`);
    }
}

export async function loadElements(floorplanId) {
    if (!floorplanId) {
        console.error('No floorplan ID provided for loading');
        return;
    }

    try {
        const response = await fetch(`/floorplan_editor/${floorplanId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! ${response.status}`);
        }

        const data = await response.json();
        
        // Update state with loaded elements
        state.setElements(data.elements || []);
        
        // Update config if available
        if (data.config) {
            config.updateConfig(data.config);
        }

        dom.updateStatus("Floor plan loaded successfully.");
        console.log('Load successful:', data);

    } catch (error) {
        dom.updateStatus(`Load failed: ${error.message}`);
        console.error('Load failed:', error);
        alert(`Failed to load: ${error.message}`);
    }
}

