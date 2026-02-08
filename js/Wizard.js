// Wizard class
import { spriteScale } from './config.js';
import { playShieldLoss } from './audiofx/shieldLoss.js';

export class Wizard {
    constructor(scene, x, y, spriteKey, scale = spriteScale) {
        console.log("adding: ", spriteKey, scale);
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, spriteKey);
        this.sprite.setScale(scale);
        this.sprite.setDepth(3);

        // HP randomly assigned between 10 and 20
        // this.hp = Math.floor(Math.random() * 11) + 10;
        this.hp = 8;

        this.maxHp = this.hp;
        console.log(`${spriteKey} HP: ${this.hp}`);

        // Shield system
        this.shield = 0;
        this.shieldGraphic = null;

        // Track used spells (each spell can only be cast once)
        this.usedSpells = new Set();

        scene.anims.create({
            key: `${spriteKey}_idle`,
            frames: scene.anims.generateFrameNumbers(spriteKey, { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });
        this.sprite.play(`${spriteKey}_idle`);
    }

    // Show a text bubble above the wizard with hovering animation
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

    // Show current HP in a bubble
    showHp() {
        this.showBubble(`HP: ${this.hp}`, '#00ff00', 2000);
    }

    // Take damage and show damage bubble, then show new HP
    takeDamage(amount) {
        let remainingDamage = amount;
        let shieldDamage = 0;
        let hpDamage = 0;

        // Shield absorbs damage first
        if (this.shield > 0) {
            shieldDamage = Math.min(remainingDamage, this.shield);
            this.shield -= shieldDamage;
            remainingDamage -= shieldDamage;

            console.log(`Shield absorbed ${shieldDamage} damage, shield now: ${this.shield}`);

            // Destroy shield visual if shield is gone
            if (this.shield <= 0) {
                playShieldLoss()
                this.destroyShieldVisual();
            } else {
                this.updateShieldVisual();
            }
        }

        // Remaining damage hits HP
        if (remainingDamage > 0) {
            hpDamage = Math.min(remainingDamage, this.hp);
            this.hp -= hpDamage;
        }

        console.log(`Wizard took ${amount} damage (${shieldDamage} to shield, ${hpDamage} to HP), HP now: ${this.hp}`);

        // Show damage bubble (red)
        const damageText = shieldDamage > 0 && hpDamage > 0
            ? `-${shieldDamage}🛡 -${hpDamage}`
            : shieldDamage > 0
            ? `-${shieldDamage}🛡`
            : `-${hpDamage}`;
        this.showBubble(damageText, '#ff4444', 1200);

        // After damage bubble, show new HP (and shield if active)
        this.scene.time.delayedCall(1400, () => {
            const hpColor = this.hp <= 5 ? '#ff4444' : (this.hp <= 10 ? '#ffaa00' : '#00ff00');
            const statusText = this.shield > 0 ? `HP: ${this.hp} 🛡${this.shield}` : `HP: ${this.hp}`;
            this.showBubble(statusText, hpColor, 1800);
        });

        return this.hp <= 0;
    }

    // Add shield to wizard
    addShield(amount) {
        this.shield = amount;
        console.log(`Shield added: ${amount}`);

        // Create shield visual
        this.createShieldVisual();

        // Show shield bubble
        this.showBubble(`+${amount}🛡`, '#44aaff', 1500);
    }

    // Create the visual shield bubble around wizard
    createShieldVisual() {
        if (this.shieldGraphic) {
            this.shieldGraphic.destroy();
        }


        this.shieldGraphic = this.scene.add.graphics();
        this.shieldGraphic.setDepth(2); // Behind wizard but above tiles

        this.updateShieldVisual();

        // Add pulsing animation
        this.shieldTween = this.scene.tweens.add({
            targets: this.shieldGraphic,
            alpha: { from: 0.6, to: 0.3 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // Update shield visual (size/color based on remaining shield)
    updateShieldVisual() {
        if (!this.shieldGraphic) return;

        this.shieldGraphic.clear();

        // Color based on shield HP
        const color = this.shield >= 3 ? 0x44aaff : (this.shield >= 2 ? 0x88aaff : 0xaaaaff);

        this.shieldGraphic.lineStyle(3, color, 0.8);
        this.shieldGraphic.fillStyle(color, 0.2);

        const radius = 45;
        this.shieldGraphic.strokeCircle(this.sprite.x, this.sprite.y, radius);
        this.shieldGraphic.fillCircle(this.sprite.x, this.sprite.y, radius);

        this.shieldGraphic.clear();
    
    // Set Blend Mode to ADD for a "neon" glow effect
    this.shieldGraphic.setBlendMode(Phaser.BlendModes.ADD);

    // Draw 3 layers for depth
    this.shieldGraphic.lineStyle(4, 0x00ffff, 0.8); // Thick outer
    this.shieldGraphic.strokeCircle(this.sprite.x, this.sprite.y, 40);
    
    this.shieldGraphic.lineStyle(2, 0xffffff, 0.5); // Thin white "sheen"
    this.shieldGraphic.strokeCircle(this.sprite.x, this.sprite.y, 38);

    this.shieldGraphic.fillStyle(0x00ffff, 0.15); // Faint center fill
    this.shieldGraphic.fillCircle(this.sprite.x, this.sprite.y, 40);
    }

    // Called after wizard moves to update shield position
    onMove() {
        if (this.shield > 0 && this.shieldGraphic) {
            this.updateShieldVisual();
        }
    }

    // Destroy shield visual with pop effect
    destroyShieldVisual() {
        if (!this.shieldGraphic) return;

        if (this.shieldTween) {
            this.shieldTween.stop();
        }

        // Pop animation
        this.scene.tweens.add({
            targets: this.shieldGraphic,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                if (this.shieldGraphic) {
                    this.shieldGraphic.destroy();
                    this.shieldGraphic = null;
                }
            }
        });

        // this.showBubble('Shield broken!', '#ff8844', 1000);
    }

    // Check if a spell has been used
    hasUsedSpell(spellName) {
        return this.usedSpells.has(spellName);
    }

    // Mark a spell as used
    markSpellUsed(spellName) {
        this.usedSpells.add(spellName);
        console.log(`${spellName} marked as used. Used spells:`, Array.from(this.usedSpells));
    }

    // Get list of available (unused) spells
    getAvailableSpells() {
        const allSpells = ["Magic Bolt", "Lightning", "Shield", "Ice Wall"];
        return allSpells.filter(spell => !this.usedSpells.has(spell));
    }

    // Deal random damage between 1-5
    takeRandomDamage() {
        const damage = Math.floor(Math.random() * 5) + 1;
        return this.takeDamage(damage);
    }
}
