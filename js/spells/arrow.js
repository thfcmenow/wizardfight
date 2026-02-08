export class Arrow {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Fire a magic arrow from start to end coordinates
     * @param {number} startX - Start X position (pixels)
     * @param {number} startY - Start Y position (pixels)
     * @param {number} endX - End X position (pixels)
     * @param {number} endY - End Y position (pixels)
     * @param {number} color - Hex color (default: 0xffd700 Gold/Magic)
     * @param {function} onComplete - Callback when arrow hits/explodes
     */
    fire(startX, startY, endX, endY, color = 0xffd700, onComplete = null) {
        const scene = this.scene;

        // Calculate trajectory
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const duration = distance * 1.2; // Fast arrow speed

        // Colors
        const shaftColor = 0xffffff; // White core
        const glowColor = color;
        const featherColor = this.lightenColor(color, 0.7);

        // === CONSTRUCT THE ARROW (Container) ===
        const arrowContainer = scene.add.container(startX, startY);
        arrowContainer.setDepth(20);
        arrowContainer.setRotation(angle);

        // 1. The Graphics (The physical arrow)
        const gfx = scene.add.graphics();
        
        // Glow/Aura (drawn first to be behind)
        gfx.fillStyle(glowColor, 0.3);
        gfx.fillEllipse(-15, 0, 80, 25); // Long aura
        
        // Shaft
        gfx.fillStyle(shaftColor, 1);
        gfx.fillRect(-40, -2, 50, 4); // x, y, width, height

        // Arrow Head
        gfx.fillStyle(glowColor, 1);
        gfx.fillTriangle(10, 0, -5, -8, -5, 8); // Tip at 10,0

        // Fletching (Feathers)
        gfx.fillStyle(featherColor, 1);
        // Top feather
        gfx.beginPath();
        gfx.moveTo(-35, -2);
        gfx.lineTo(-50, -10);
        gfx.lineTo(-42, -2);
        gfx.fillPath();
        // Bottom feather
        gfx.beginPath();
        gfx.moveTo(-35, 2);
        gfx.lineTo(-50, 10);
        gfx.lineTo(-42, 2);
        gfx.fillPath();

        arrowContainer.add(gfx);

        // 2. The Core Light (Bright spot at the head)
        const headGlow = scene.add.circle(5, 0, 8, 0xffffff, 0.8);
        headGlow.setBlendMode(Phaser.BlendModes.ADD);
        arrowContainer.add(headGlow);

        // === PARTICLE TRAIL ===
        const trailParticles = [];
        
        // We use the tween's onUpdate to spawn particles so they follow the arrow perfectly
        const movementTween = scene.tweens.add({
            targets: arrowContainer,
            x: endX,
            y: endY,
            duration: duration,
            ease: 'Quad.easeIn', // Start slightly slower, accelerate into target
            onUpdate: () => {
                // Calculate position of the TAIL of the arrow for particles
                // We use the container's current rotation to find the offset
                const currentAngle = arrowContainer.rotation;
                const tailOffset = 45; // Distance from center to tail
                
                const tailX = arrowContainer.x - Math.cos(currentAngle) * tailOffset;
                const tailY = arrowContainer.y - Math.sin(currentAngle) * tailOffset;

                // Spawn Magic Dust from tail
                if (Math.random() > 0.3) {
                    this.spawnTrailParticle(scene, tailX, tailY, currentAngle, color, trailParticles);
                }
                
                // Spawn larger "Force" rings occasionally
                if (Math.random() > 0.8) {
                    this.spawnForceRing(scene, tailX, tailY, currentAngle, glowColor, trailParticles);
                }
            },
            onComplete: () => {
                // === IMPACT SEQUENCE ===
                
                // 1. Shake effect (Arrow hits and vibrates)
                scene.tweens.add({
                    targets: arrowContainer,
                    x: endX + Math.cos(angle) * 10, // Embed slightly deeper
                    y: endY + Math.sin(angle) * 10,
                    duration: 50,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        // 2. Destroy Arrow
                        arrowContainer.destroy();
                        
                        // 3. Explode
                        this.explode(endX, endY, color, shaftColor);
                        if (onComplete) onComplete();
                    }
                });
            }
        });
    }

    spawnTrailParticle(scene, x, y, angle, color, particles) {
        // Random spread perpendicular to flight path
        const spread = (Math.random() - 0.5) * 10;
        const pAngle = angle + Math.PI / 2;
        const px = x + Math.cos(pAngle) * spread;
        const py = y + Math.sin(pAngle) * spread;

        const particle = scene.add.rectangle(px, py, 4, 4, color);
        particle.setDepth(15);
        particle.setRotation(angle); // Angle the squares to look like speed lines

        scene.tweens.add({
            targets: particle,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            x: px - Math.cos(angle) * 20, // Drift back
            y: py - Math.sin(angle) * 20,
            rotation: angle + Math.random(), // Spin slightly
            duration: 300 + Math.random() * 200,
            onComplete: () => {
                particle.destroy();
            }
        });
    }

    spawnForceRing(scene, x, y, angle, color, particles) {
        // A ring that expands backward from the arrow tail
        const ring = scene.add.ellipse(x, y, 10, 20, 0xffffff, 0.6);
        ring.setStrokeStyle(2, color);
        ring.setDepth(14);
        ring.setRotation(angle);
        
        scene.tweens.add({
            targets: ring,
            scaleX: 2,
            scaleY: 3,
            alpha: 0,
            x: x - Math.cos(angle) * 30, // Move backward
            y: y - Math.sin(angle) * 30,
            duration: 400,
            onComplete: () => ring.destroy()
        });
    }

    explode(x, y, color, innerColor) {
        const scene = this.scene;

        // 1. Flash
        const flash = scene.add.star(x, y, 5, 10, 30, 0xffffff);
        flash.setDepth(25);
        scene.tweens.add({
            targets: flash,
            scale: 3,
            alpha: 0,
            rotation: 1,
            duration: 200,
            onComplete: () => flash.destroy()
        });

        // 2. Arrow Shrapnel / Magic Sparks
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const dist = 30 + Math.random() * 20;
            
            // Draw little lines/sparks
            const spark = scene.add.rectangle(x, y, 8, 2, color);
            spark.setDepth(24);
            spark.setRotation(angle);

            scene.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                scaleX: 0.1,
                alpha: 0,
                duration: 300 + Math.random() * 200,
                ease: 'Back.out',
                onComplete: () => spark.destroy()
            });
        }

        // 3. Shockwave Ring
        const ring = scene.add.circle(x, y, 10);
        ring.setStrokeStyle(3, innerColor);
        ring.setDepth(23);
        
        scene.tweens.add({
            targets: ring,
            radius: 50,
            alpha: 0,
            duration: 400,
            ease: 'Quad.out',
            onComplete: () => ring.destroy()
        });
    }

    // Helper: Lighten a color
    lightenColor(color, amount) {
        const r = Math.min(255, ((color >> 16) & 0xff) + Math.floor(255 * amount));
        const g = Math.min(255, ((color >> 8) & 0xff) + Math.floor(255 * amount));
        const b = Math.min(255, (color & 0xff) + Math.floor(255 * amount));
        return (r << 16) | (g << 8) | b;
    }
}

// Global test function for console
let arrowInstance = null;

export function initArrow(scene) {
    arrowInstance = new Arrow(scene);
}

export function getArrow() {
    return arrowInstance;
}