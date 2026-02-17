// Utility functions

import { state } from './state.js';

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
        x: state.offsetX + (gridX - 1) * tileSize + (tileSize / 2),
        y: state.offsetY + (gridY - 1) * tileSize + (tileSize / 2)
    };
}

/**
 * Animate the game canvas flipping away (0deg → 90deg edge-on).
 * Call onComplete when finished to trigger a scene restart.
 * @param {HTMLCanvasElement} canvas
 * @param {Function} onComplete
 * @param {number} duration - ms
 */
export function boardFlipOut(canvas, onComplete, duration = 450) {
    canvas.style.transformOrigin = '50% 50%';
    canvas.style.transition = `transform ${duration}ms ease-in`;
    canvas.style.transform = 'perspective(800px) rotateX(90deg)';
    setTimeout(() => {
        canvas.style.transition = '';
        if (onComplete) onComplete();
    }, duration + 30);
}

/**
 * Snap the game canvas to edge-on (-90deg) then animate flat (0deg).
 * Call at the top of create() so the board always flips in on (re)start.
 * @param {HTMLCanvasElement} canvas
 * @param {number} duration - ms
 */
export function boardFlipIn(canvas, duration = 450) {
    canvas.style.transformOrigin = '50% 50%';
    // Snap to edge-on (invisible) with no transition
    canvas.style.transition = 'none';
    canvas.style.transform = 'perspective(800px) rotateX(-90deg)';
    // Double rAF: first frame commits the -90deg state to the browser's
    // rendering pipeline; second frame safely starts the transition.
    // (void offsetWidth is unreliable when called inside Phaser's RAF loop.)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            canvas.style.transition = `transform ${duration}ms ease-out`;
            canvas.style.transform = 'perspective(800px) rotateX(0deg)';
            setTimeout(() => {
                canvas.style.transition = '';
                canvas.style.transform = '';
            }, duration + 30);
        });
    });
}