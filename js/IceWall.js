// IceWall class - obstacle with glint and shatter particles
import { tileSize } from './config.js';

export class IceWall {
    constructor(scene, gridX, gridY) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridY = gridY;

        const centerX = gridX * tileSize + (tileSize / 2);
        const centerY = gridY * tileSize + (tileSize / 2);
        this.pos = { x: centerX, y: centerY };

        // 1. Setup Graphics Layers
        this.graphics = scene.add.graphics();
        this.graphics.setDepth(3);

        this.glint = scene.add.graphics();
        this.glint.setDepth(4);

        // Create the texture overlay
        this.textureOverlay = scene.add.tileSprite(centerX, centerY, tileSize, tileSize, 'iceTexture');
        this.textureOverlay.setAlpha(0.5); // 50% transparency
        this.textureOverlay.setDepth(3.1); // Just above the base graphics
        this.textureOverlay.setBlendMode(Phaser.BlendModes.ADD); // Optional: makes it "glow"

        // 2. Initial Draw
        this.drawIceWall(centerX, centerY);
        this.createGlintAnimation(centerX, centerY);

        // 3. Spawn Animation
        this.graphics.setScale(0);
        this.glint.setScale(0);
        scene.tweens.add({
            targets: [this.graphics, this.glint],
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });

        // 4. Constant Shimmer
        this.shimmerTween = scene.tweens.add({
            targets: this.graphics,
            alpha: { from: 1, to: 0.8 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    drawIceWall(centerX, centerY) {
        const size = tileSize * 0.8;
        const halfSize = size / 2;
        const x = centerX - halfSize;
        const y = centerY - halfSize;

        // Base Block
        this.graphics.clear();
        this.graphics.fillStyle(0x66aaff, 1);
        this.graphics.fillRoundedRect(x, y, size, size, 4);

        // Inner Frost Glow
        this.graphics.fillStyle(0xaaddff, 0.5);
        this.graphics.fillRoundedRect(x + 4, y + 4, size - 8, size - 8, 2);

        // Random Internal Cracks
        this.graphics.lineStyle(1, 0xffffff, 0.4);
        for (let i = 0; i < 3; i++) {
            this.graphics.lineBetween(
                x + Math.random() * size, y + Math.random() * size,
                x + Math.random() * size, y + Math.random() * size
            );
        }

        // Beveled Edges (Lighting)
        this.graphics.lineStyle(2, 0xffffff, 0.7); // Top/Left highlight
        this.graphics.lineBetween(x, y, x + size, y);
        this.graphics.lineBetween(x, y, x, y + size);

        this.graphics.lineStyle(2, 0x3377bb, 0.7); // Bottom/Right shadow
        this.graphics.lineBetween(x + size, y, x + size, y + size);
        this.graphics.lineBetween(x, y + size, x + size, y + size);
    }

    createGlintAnimation(centerX, centerY) {
        const size = tileSize * 0.8;
        const x = centerX - (size / 2);
        const y = centerY - (size / 2);

        // Draw the glint shape (a small bright diagonal slash)
        this.glint.lineStyle(3, 0xffffff, 1);
        this.glint.lineBetween(0, 0, 12, 12);
        
        this.glint.x = x;
        this.glint.y = y;
        this.glint.alpha = 0;

        // 4-frame style stepped animation
        this.glintTween = this.scene.tweens.add({
            targets: this.glint,
            x: x + size - 12,
            y: y + size - 12,
            alpha: {
                // Stays invisible, then flashes quickly
                value: [
                    { value: 0, duration: 3000, ease: 'Linear' }, 
                    { value: 1, duration: 150, ease: 'Stepped', steps: 4 },
                    { value: 0, duration: 150, ease: 'Stepped', steps: 4 }
                ]
            },
            repeat: -1
        });
    }

    destroy() {
        // Cleanup Tweens
        if (this.shimmerTween) this.shimmerTween.stop();
        if (this.glintTween) this.glintTween.stop();

        // Create Shatter Particles
        if (!this.scene.textures.exists('iceShard')) {
            const shard = this.scene.make.graphics({ x: 0, y: 0, add: false });
            shard.fillStyle(0xffffff, 1);
            shard.fillRect(0, 0, 4, 4);
            shard.generateTexture('iceShard', 4, 4);
        }

        const particles = this.scene.add.particles(this.pos.x, this.pos.y, 'iceShard', {
            speed: { min: 60, max: 160 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            gravityY: 250,
            blendMode: 'ADD',
            emitting: false
        });

        particles.setDepth(5);
        particles.explode(16);

        // Visual Shatter Tween
        this.scene.tweens.add({
            targets: [this.graphics, this.glint],
            alpha: 0,
            scale: 1.5,
            duration: 200,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.graphics.destroy();
                this.glint.destroy();
                // Clean up particle manager after effect finishes
                this.scene.time.delayedCall(500, () => particles.destroy());
            }
        });
    }
}