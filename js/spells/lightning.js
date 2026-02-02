// Lightning Spell - Jagged electrical bolt effect
import { state } from '../state.js';

/**
 * Lightning - A crackling electrical bolt that arcs from caster to target
 */
export class Lightning {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Fire a lightning bolt from start to end coordinates
     * @param {number} startX - Start X position (pixels)
     * @param {number} startY - Start Y position (pixels)
     * @param {number} endX - End X position (pixels)
     * @param {number} endY - End Y position (pixels)
     * @param {function} onComplete - Callback when lightning finishes
     */
    fire(startX, startY, endX, endY, onComplete = null) {
        const scene = this.scene;

        // Lightning colors
        const coreColor = 0xffffff;
        const innerColor = 0x88ccff;
        const outerColor = 0x4488ff;
        const glowColor = 0x2244aa;

        // Generate jagged lightning path
        const segments = this.generateLightningPath(startX, startY, endX, endY);

        // Create multiple lightning bolts for thickness
        const bolts = [];

        // Main bolt (brightest, thickest)
        const mainBolt = this.drawLightningBolt(segments, coreColor, 3, 1);
        bolts.push(mainBolt);

        // Inner glow
        const innerBolt = this.drawLightningBolt(segments, innerColor, 6, 0.7);
        bolts.push(innerBolt);

        // Outer glow
        const outerBolt = this.drawLightningBolt(segments, outerColor, 10, 0.4);
        bolts.push(outerBolt);

        // Widest glow
        const glowBolt = this.drawLightningBolt(segments, glowColor, 16, 0.2);
        bolts.push(glowBolt);

        // Add crackling branch bolts
        const branches = this.createBranches(segments, innerColor);
        bolts.push(...branches);

        // Flicker effect - rapidly toggle visibility
        let flickerCount = 0;
        const flickerTimer = scene.time.addEvent({
            delay: 50,
            callback: () => {
                flickerCount++;
                const visible = flickerCount % 2 === 0;
                bolts.forEach(bolt => {
                    if (bolt && bolt.active) {
                        bolt.setAlpha(visible ? bolt.getData('baseAlpha') : bolt.getData('baseAlpha') * 0.3);
                    }
                });
            },
            repeat: 7
        });

        // Add spark particles along the path
        this.spawnSparks(segments, outerColor);

        // Flash at impact point
        scene.time.delayedCall(50, () => {
            this.createImpactFlash(endX, endY, innerColor, outerColor);
        });

        // Create secondary lightning bolts (re-strike effect)
        scene.time.delayedCall(100, () => {
            const segments2 = this.generateLightningPath(startX, startY, endX, endY);
            const restrike = this.drawLightningBolt(segments2, coreColor, 2, 0.8);
            bolts.push(restrike);

            scene.time.delayedCall(150, () => {
                if (restrike && restrike.active) restrike.destroy();
            });
        });

        // Cleanup and callback
        scene.time.delayedCall(400, () => {
            flickerTimer.destroy();
            bolts.forEach(bolt => {
                if (bolt && bolt.active) bolt.destroy();
            });

            if (onComplete) onComplete();
        });
    }

    /**
     * Generate a jagged path for the lightning
     */
    generateLightningPath(startX, startY, endX, endY) {
        const segments = [];
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Number of segments based on distance
        const numSegments = Math.max(5, Math.floor(distance / 30));

        // Direction perpendicular to the main path
        const perpX = -dy / distance;
        const perpY = dx / distance;

        let currentX = startX;
        let currentY = startY;

        segments.push({ x: currentX, y: currentY });

        for (let i = 1; i < numSegments; i++) {
            // Progress along the path
            const t = i / numSegments;

            // Base position along straight line
            const baseX = startX + dx * t;
            const baseY = startY + dy * t;

            // Add jagged offset (more in the middle, less at ends)
            const jitterScale = Math.sin(t * Math.PI) * 40; // Max 40 pixels offset
            const jitter = (Math.random() - 0.5) * 2 * jitterScale;

            currentX = baseX + perpX * jitter;
            currentY = baseY + perpY * jitter;

            segments.push({ x: currentX, y: currentY });
        }

        // End point
        segments.push({ x: endX, y: endY });

        return segments;
    }

    /**
     * Draw a lightning bolt from segments
     */
    drawLightningBolt(segments, color, lineWidth, alpha) {
        const graphics = this.scene.add.graphics();
        graphics.setDepth(15);
        graphics.lineStyle(lineWidth, color, alpha);
        graphics.setData('baseAlpha', alpha);

        graphics.beginPath();
        graphics.moveTo(segments[0].x, segments[0].y);

        for (let i = 1; i < segments.length; i++) {
            graphics.lineTo(segments[i].x, segments[i].y);
        }

        graphics.strokePath();

        return graphics;
    }

    /**
     * Create branching bolts off the main lightning
     */
    createBranches(segments, color) {
        const branches = [];
        const scene = this.scene;

        // Create 2-4 random branches
        const numBranches = 2 + Math.floor(Math.random() * 3);

        for (let b = 0; b < numBranches; b++) {
            // Pick a random segment point to branch from (not first or last)
            const branchIndex = 1 + Math.floor(Math.random() * (segments.length - 2));
            const branchPoint = segments[branchIndex];

            // Branch direction - somewhat random but angled away
            const angle = Math.random() * Math.PI * 2;
            const branchLength = 20 + Math.random() * 40;

            // Generate small jagged branch
            const branchSegments = [];
            let bx = branchPoint.x;
            let by = branchPoint.y;
            branchSegments.push({ x: bx, y: by });

            const branchSegs = 3 + Math.floor(Math.random() * 3);
            for (let i = 1; i <= branchSegs; i++) {
                const t = i / branchSegs;
                bx += (Math.cos(angle) * branchLength / branchSegs) + (Math.random() - 0.5) * 15;
                by += (Math.sin(angle) * branchLength / branchSegs) + (Math.random() - 0.5) * 15;
                branchSegments.push({ x: bx, y: by });
            }

            const branch = this.drawLightningBolt(branchSegments, color, 2, 0.5);
            branches.push(branch);
        }

        return branches;
    }

    /**
     * Spawn spark particles along the lightning path
     */
    spawnSparks(segments, color) {
        const scene = this.scene;

        // Spawn sparks at random points along the path
        for (let i = 0; i < 15; i++) {
            const segIndex = Math.floor(Math.random() * (segments.length - 1));
            const seg = segments[segIndex];

            const spark = scene.add.circle(
                seg.x + (Math.random() - 0.5) * 20,
                seg.y + (Math.random() - 0.5) * 20,
                1 + Math.random() * 2,
                0xffffff,
                1
            );
            spark.setDepth(16);

            // Spark flies outward
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 50;

            scene.tweens.add({
                targets: spark,
                x: spark.x + Math.cos(angle) * speed,
                y: spark.y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 150 + Math.random() * 150,
                onComplete: () => spark.destroy()
            });
        }
    }

    /**
     * Create flash effect at impact point
     */
    createImpactFlash(x, y, innerColor, outerColor) {
        const scene = this.scene;

        // Bright central flash
        const flash = scene.add.circle(x, y, 25, 0xffffff, 1);
        flash.setDepth(20);
        scene.tweens.add({
            targets: flash,
            scale: 2.5,
            alpha: 0,
            duration: 200,
            onComplete: () => flash.destroy()
        });

        // Inner ring
        const innerRing = scene.add.circle(x, y, 15, innerColor, 0.8);
        innerRing.setDepth(19);
        scene.tweens.add({
            targets: innerRing,
            scale: 3,
            alpha: 0,
            duration: 250,
            onComplete: () => innerRing.destroy()
        });

        // Outer ring
        const outerRing = scene.add.circle(x, y, 10, outerColor, 0.5);
        outerRing.setDepth(18);
        scene.tweens.add({
            targets: outerRing,
            scale: 4,
            alpha: 0,
            duration: 300,
            onComplete: () => outerRing.destroy()
        });

        // Electric sparks burst
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 80;
            const spark = scene.add.circle(x, y, 1.5, 0xffffff, 1);
            spark.setDepth(20);

            scene.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 100 + Math.random() * 150,
                onComplete: () => spark.destroy()
            });
        }
    }
}

// Global instance
let lightningInstance = null;

export function initLightning(scene) {
    lightningInstance = new Lightning(scene);

    // Expose to global window for console testing
    window.spellLightning = (startX, startY, endX, endY) => {
        if (!lightningInstance) {
            console.error('Lightning not initialized');
            return;
        }
        console.log(`Casting Lightning from (${startX}, ${startY}) to (${endX}, ${endY})`);
        lightningInstance.fire(startX, startY, endX, endY);
    };

    console.log('Lightning ready! Test with: spellLightning(100, 100, 500, 400)');
}

export function getLightning() {
    return lightningInstance;
}
