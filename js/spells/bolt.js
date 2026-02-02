// Magic Bolt Spell - Phaser compatible (Photon Torpedo style)
import { state } from '../state.js';

/**
 * MagicBolt - A photon torpedo-style projectile with high-res particle effects
 */
export class MagicBolt {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Fire a bolt from start to end coordinates
     * @param {number} startX - Start X position (pixels)
     * @param {number} startY - Start Y position (pixels)
     * @param {number} endX - End X position (pixels)
     * @param {number} endY - End Y position (pixels)
     * @param {number} color - Hex color (default: 0xff6600 orange)
     * @param {function} onComplete - Callback when bolt reaches target
     */
    fire(startX, startY, endX, endY, color = 0xff6600, onComplete = null) {
        const scene = this.scene;

        // Calculate trajectory
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const duration = distance * 1.5; // Slightly faster

        // Color variations for depth
        const coreColor = 0xffffff;
        const innerColor = this.lightenColor(color, 0.5);
        const outerColor = color;
        const trailColor = this.darkenColor(color, 0.3);

        // === TORPEDO HEAD (Multiple layered ellipses) ===
        const torpedoGroup = [];

        // Outer glow (largest, most transparent)
        const outerGlow = scene.add.ellipse(startX, startY, 40, 20, outerColor, 0.15);
        outerGlow.setDepth(14);
        outerGlow.setRotation(angle);
        torpedoGroup.push(outerGlow);

        // Middle glow
        const middleGlow = scene.add.ellipse(startX, startY, 28, 14, innerColor, 0.3);
        middleGlow.setDepth(15);
        middleGlow.setRotation(angle);
        torpedoGroup.push(middleGlow);

        // Inner glow
        const innerGlow = scene.add.ellipse(startX, startY, 18, 10, innerColor, 0.5);
        innerGlow.setDepth(16);
        innerGlow.setRotation(angle);
        torpedoGroup.push(innerGlow);

        // Core (brightest)
        const core = scene.add.ellipse(startX, startY, 10, 6, coreColor, 0.9);
        core.setDepth(17);
        core.setRotation(angle);
        torpedoGroup.push(core);

        // === HIGH-DENSITY PARTICLE TRAIL ===
        const trailParticles = [];

        // Main trail emitter - very frequent
        const trailTimer = scene.time.addEvent({
            delay: 8, // Very frequent particles
            callback: () => {
                // Spawn multiple particles per tick for density
                for (let i = 0; i < 3; i++) {
                    this.spawnTrailParticle(
                        scene,
                        core.x,
                        core.y,
                        angle,
                        outerColor,
                        trailParticles
                    );
                }
            },
            loop: true
        });

        // Secondary wider trail
        const wideTrailTimer = scene.time.addEvent({
            delay: 15,
            callback: () => {
                this.spawnWideTrailParticle(
                    scene,
                    core.x,
                    core.y,
                    angle,
                    trailColor,
                    trailParticles
                );
            },
            loop: true
        });

        // Energy wisps that spiral around the core
        const wispTimer = scene.time.addEvent({
            delay: 25,
            callback: () => {
                this.spawnEnergyWisp(
                    scene,
                    core.x,
                    core.y,
                    angle,
                    innerColor,
                    trailParticles
                );
            },
            loop: true
        });

        // === ANIMATE MOVEMENT ===
        scene.tweens.add({
            targets: torpedoGroup,
            x: endX,
            y: endY,
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                // Cleanup
                trailTimer.destroy();
                wideTrailTimer.destroy();
                wispTimer.destroy();
                torpedoGroup.forEach(obj => obj.destroy());

                // Explosion
                this.explode(endX, endY, color, innerColor);

                if (onComplete) onComplete();
            }
        });

        // Pulsing effect on the core
        scene.tweens.add({
            targets: [core, innerGlow],
            scaleX: { from: 1, to: 1.2 },
            scaleY: { from: 1, to: 1.3 },
            alpha: { from: 0.9, to: 0.7 },
            duration: 50,
            yoyo: true,
            repeat: -1
        });

        // Outer glow breathing
        scene.tweens.add({
            targets: [outerGlow, middleGlow],
            scaleX: { from: 1, to: 1.15 },
            scaleY: { from: 1, to: 1.1 },
            alpha: '-=0.05',
            duration: 80,
            yoyo: true,
            repeat: -1
        });
    }

    spawnTrailParticle(scene, x, y, angle, color, particles) {
        // Offset behind the torpedo
        const offsetX = Math.cos(angle + Math.PI) * (5 + Math.random() * 8);
        const offsetY = Math.sin(angle + Math.PI) * (5 + Math.random() * 8);

        // Slight perpendicular spread
        const spread = (Math.random() - 0.5) * 6;
        const perpX = Math.cos(angle + Math.PI / 2) * spread;
        const perpY = Math.sin(angle + Math.PI / 2) * spread;

        const size = 1.5 + Math.random() * 2.5;
        const particle = scene.add.circle(
            x + offsetX + perpX,
            y + offsetY + perpY,
            size,
            color,
            0.6 + Math.random() * 0.3
        );
        particle.setDepth(12);
        particles.push(particle);

        // Drift backward and fade
        const driftX = Math.cos(angle + Math.PI) * (20 + Math.random() * 30);
        const driftY = Math.sin(angle + Math.PI) * (20 + Math.random() * 30);

        scene.tweens.add({
            targets: particle,
            x: particle.x + driftX,
            y: particle.y + driftY,
            alpha: 0,
            scale: 0.2,
            duration: 200 + Math.random() * 150,
            ease: 'Power2',
            onComplete: () => {
                particle.destroy();
                const idx = particles.indexOf(particle);
                if (idx > -1) particles.splice(idx, 1);
            }
        });
    }

    spawnWideTrailParticle(scene, x, y, angle, color, particles) {
        // Larger, more spread out particles
        const offsetX = Math.cos(angle + Math.PI) * (15 + Math.random() * 10);
        const offsetY = Math.sin(angle + Math.PI) * (15 + Math.random() * 10);

        const spread = (Math.random() - 0.5) * 20;
        const perpX = Math.cos(angle + Math.PI / 2) * spread;
        const perpY = Math.sin(angle + Math.PI / 2) * spread;

        const particle = scene.add.circle(
            x + offsetX + perpX,
            y + offsetY + perpY,
            3 + Math.random() * 4,
            color,
            0.2 + Math.random() * 0.2
        );
        particle.setDepth(11);
        particles.push(particle);

        scene.tweens.add({
            targets: particle,
            alpha: 0,
            scale: 0.3,
            duration: 350 + Math.random() * 200,
            onComplete: () => {
                particle.destroy();
                const idx = particles.indexOf(particle);
                if (idx > -1) particles.splice(idx, 1);
            }
        });
    }

    spawnEnergyWisp(scene, x, y, angle, color, particles) {
        // Small bright particles that spiral slightly
        const offsetAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
        const dist = 8 + Math.random() * 5;

        const particle = scene.add.circle(
            x + Math.cos(offsetAngle) * dist,
            y + Math.sin(offsetAngle) * dist,
            1 + Math.random() * 1.5,
            0xffffff,
            0.8
        );
        particle.setDepth(13);
        particles.push(particle);

        // Spiral outward
        const spiralAngle = offsetAngle + (Math.random() > 0.5 ? 0.5 : -0.5);
        scene.tweens.add({
            targets: particle,
            x: particle.x + Math.cos(spiralAngle) * 25,
            y: particle.y + Math.sin(spiralAngle) * 25,
            alpha: 0,
            duration: 150 + Math.random() * 100,
            onComplete: () => {
                particle.destroy();
                const idx = particles.indexOf(particle);
                if (idx > -1) particles.splice(idx, 1);
            }
        });
    }

    explode(x, y, color, innerColor) {
        const scene = this.scene;

        // === CENTRAL FLASH ===
        const flash = scene.add.circle(x, y, 30, 0xffffff, 1);
        flash.setDepth(20);
        scene.tweens.add({
            targets: flash,
            scale: 3,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });

        // Secondary flash ring
        const ring = scene.add.circle(x, y, 20, innerColor, 0.8);
        ring.setDepth(19);
        scene.tweens.add({
            targets: ring,
            scale: 4,
            alpha: 0,
            duration: 250,
            ease: 'Power1',
            onComplete: () => ring.destroy()
        });

        // === HIGH-DENSITY EXPLOSION PARTICLES ===
        const particleCount = 40;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
            const speed = 40 + Math.random() * 80;
            const size = 2 + Math.random() * 4;

            const particle = scene.add.circle(x, y, size, color, 0.8);
            particle.setDepth(18);

            scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.1,
                duration: 250 + Math.random() * 200,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }

        // Inner bright particles
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;

            const particle = scene.add.circle(x, y, 1.5 + Math.random() * 2, 0xffffff, 1);
            particle.setDepth(19);

            scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 150 + Math.random() * 100,
                onComplete: () => particle.destroy()
            });
        }

        // === SMOKE/DISSIPATION CLOUD ===
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 20;

            const smoke = scene.add.circle(
                x + Math.cos(angle) * dist,
                y + Math.sin(angle) * dist,
                8 + Math.random() * 12,
                this.darkenColor(color, 0.5),
                0.3
            );
            smoke.setDepth(16);

            scene.tweens.add({
                targets: smoke,
                x: smoke.x + Math.cos(angle) * 30,
                y: smoke.y + Math.sin(angle) * 30,
                scale: 2,
                alpha: 0,
                duration: 400 + Math.random() * 200,
                ease: 'Power1',
                onComplete: () => smoke.destroy()
            });
        }

        // === SPARKS ===
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;

            const spark = scene.add.circle(x, y, 1, 0xffffff, 1);
            spark.setDepth(20);

            scene.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 100 + Math.random() * 150,
                ease: 'Linear',
                onComplete: () => spark.destroy()
            });
        }
    }

    // Helper: Lighten a color
    lightenColor(color, amount) {
        const r = Math.min(255, ((color >> 16) & 0xff) + Math.floor(255 * amount));
        const g = Math.min(255, ((color >> 8) & 0xff) + Math.floor(255 * amount));
        const b = Math.min(255, (color & 0xff) + Math.floor(255 * amount));
        return (r << 16) | (g << 8) | b;
    }

    // Helper: Darken a color
    darkenColor(color, amount) {
        const r = Math.max(0, Math.floor(((color >> 16) & 0xff) * (1 - amount)));
        const g = Math.max(0, Math.floor(((color >> 8) & 0xff) * (1 - amount)));
        const b = Math.max(0, Math.floor((color & 0xff) * (1 - amount)));
        return (r << 16) | (g << 8) | b;
    }
}

// Global test function for console
let magicBoltInstance = null;

export function initMagicBolt(scene) {
    magicBoltInstance = new MagicBolt(scene);

    // Expose to global window for console testing
    window.spellMagicBolt = (startX, startY, endX, endY, color = 0xff6600) => {
        if (!magicBoltInstance) {
            console.error('MagicBolt not initialized');
            return;
        }
        console.log(`Firing Photon Torpedo from (${startX}, ${startY}) to (${endX}, ${endY})`);
        magicBoltInstance.fire(startX, startY, endX, endY, color);
    };

    console.log('Photon Torpedo ready! Test with: spellMagicBolt(100, 100, 500, 400)');
    console.log('Colors: 0xff6600 (orange), 0x00aaff (blue), 0xff0066 (red), 0x00ff88 (green)');
}

export function getMagicBolt() {
    return magicBoltInstance;
}
