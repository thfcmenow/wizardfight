// Goblin class - Simplified unit (no spells, no shields)
import { spriteScale } from '../config.js';
import { state } from '../state.js';

export class Goblin {
    constructor(scene, gridX, gridY, scale = spriteScale) {
        console.log("Creating goblin at grid:", gridX, gridY);
        this.scene = scene;

        // Convert grid coords to pixels
        const pixelX = state.gridToPixelX(gridX);
        const pixelY = state.gridToPixelY(gridY);

        this.sprite = scene.add.sprite(pixelX, pixelY, 'goblin_right');
        this.sprite.setScale(scale);
        this.sprite.setDepth(3);

        // Goblin stats
        this.hp = 4;
        this.maxHp = 4;
        this.minDamage = 1;
        this.maxDamage = 2;
        this.owner = null;
        this.hasActed = false;

        console.log(`Goblin HP: ${this.hp}`);

        // Create idle animation if it doesn't exist
        if (!scene.anims.exists('goblin_right')) {
            scene.anims.create({
                key: 'goblin_right',
                frames: scene.anims.generateFrameNumbers('goblin_right', { start: 0, end: 0 }),
                frameRate: 1,
                repeat: -1
            });
        }
        this.sprite.play('goblin_right');

        // Persistent HP indicator below the sprite
        this.hpText = scene.add.text(pixelX, pixelY + 35, `${this.hp}/${this.maxHp}`, {
            fontFamily: 'minecraft',
            fontSize: '12px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.hpText.setOrigin(0.5);
        this.hpText.setDepth(5);
    }

    // Update the persistent HP indicator text and color
    updateHpDisplay() {
        if (!this.hpText) return;
        const color = this.hp <= 1 ? '#ff4444' : (this.hp <= 2 ? '#ffaa00' : '#00ff00');
        this.hpText.setText(`${this.hp}/${this.maxHp}`);
        this.hpText.setColor(color);
        this.hpText.setPosition(this.sprite.x, this.sprite.y + 35);
    }

    // Show a text bubble above the goblin with hovering animation
    showBubble(text, color = '#ffffff', duration = 1500) {
        const bubbleX = this.sprite.x;
        const bubbleY = this.sprite.y - 60;

        // Create bubble background
        const padding = 10;
        const bubbleGraphics = this.scene.add.graphics();
        bubbleGraphics.setDepth(10);

        // Create text first to measure it
        const bubbleText = this.scene.add.text(bubbleX, bubbleY, text, {
            fontFamily: 'minecraft',
            fontSize: '18px',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        });
        bubbleText.setOrigin(0.5);
        bubbleText.setDepth(11);

        // Draw bubble background based on text size
        const bubbleWidth = bubbleText.width + padding * 2;
        const bubbleHeight = bubbleText.height + padding * 2;

        bubbleGraphics.fillStyle(0x000000, 0.7);
        bubbleGraphics.fillRoundedRect(
            bubbleX - bubbleWidth / 2,
            bubbleY - bubbleHeight / 2,
            bubbleWidth,
            bubbleHeight,
            8
        );

        // Add small triangle pointer at bottom
        bubbleGraphics.fillTriangle(
            bubbleX - 8, bubbleY + bubbleHeight / 2,
            bubbleX + 8, bubbleY + bubbleHeight / 2,
            bubbleX, bubbleY + bubbleHeight / 2 + 10
        );

        // Hovering animation - move up and down slightly
        this.scene.tweens.add({
            targets: [bubbleGraphics, bubbleText],
            y: '-=8',
            duration: 400,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut'
        });

        // Fade out and destroy after duration
        this.scene.time.delayedCall(duration, () => {
            this.scene.tweens.add({
                targets: [bubbleGraphics, bubbleText],
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    bubbleGraphics.destroy();
                    bubbleText.destroy();
                }
            });
        });

        return { graphics: bubbleGraphics, text: bubbleText };
    }

    // Take damage and show damage bubble, then show new HP
    takeDamage(amount) {
        this.hp -= amount;
        console.log(`Goblin took ${amount} damage, HP now: ${this.hp}`);

        // Show damage bubble (red)
        this.showBubble(`-${amount}`, '#ff4444', 1200);

        // Check if dead
        if (this.hp <= 0) {
            // Destroy HP indicator
            if (this.hpText) {
                this.hpText.destroy();
                this.hpText = null;
            }
            // Show death animation
            this.scene.tweens.add({
                targets: this.sprite,
                alpha: 0,
                scale: 0,
                duration: 400,
                onComplete: () => {
                    this.sprite.destroy();
                }
            });
            return true; // isDead
        }

        // Update persistent HP display
        this.updateHpDisplay();

        // After damage bubble, show new HP with color coding
        this.scene.time.delayedCall(1400, () => {
            const hpColor = this.hp <= 2 ? '#ff4444' : '#ffaa00';
            this.showBubble(`HP: ${this.hp}`, hpColor, 1800);
        });

        return false; // isAlive
    }

    // Called by GameBoard when piece moves - update HP indicator position
    onMove() {
        this.updateHpDisplay();
    }
}
