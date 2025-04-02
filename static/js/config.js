// js/config.js
export const PIXELS_PER_METER = 50;
export const GRID_SIZE_PIXELS = 25;
export const WALL_THICKNESS = 6;
export const elementColors = {
    wall: '#333', window: '#6495ED', door: '#8B4513', route: '#FF0000',
    machine: '#708090', closet: '#228B22', gear: '#FFA500', default: '#000'
};
export const dimensionColor = '#555';
export const dimensionFontSize = 10;
export const gridColor = '#E0E0E0';
export const selectionColor = '#007bff';
export const handleSize = 8;
export const handleColor = '#FFF';
export const handleStrokeColor = '#000';
export const snapTolerance = 10;
export const wallPlacementTolerance = WALL_THICKNESS * 1.5;
export const routeArrowSize = 10;
export const doorEndSnapTolerance = 15;
export const minDoorWindowLength = 10;