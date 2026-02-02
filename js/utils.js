// Utility functions

export function properCase(str) {
    return str.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}

// Chebyshev distance (diagonal movement allowed)
export function chebyshevDistance(x1, y1, x2, y2) {
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

// Convert grid coordinates to pixel coordinates
export function gridToPixel(gridX, gridY, tileSize) {
    return {
        x: gridX * tileSize + (tileSize / 2),
        y: gridY * tileSize + (tileSize / 2)
    };
}
