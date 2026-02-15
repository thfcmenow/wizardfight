// Shared action execution module
// Consolidates spell casting and movement logic for both player and AI

import { state, audio } from './state.js';
import { spellData, getSpellByName } from './config.js';
import { getMagicBolt } from './spells/bolt.js';
import { getLightning } from './spells/lightning.js';
import { getArrow } from './spells/arrow.js';
import { playBolt } from './audiofx/bolt.js';
import { playLightningSound } from './audiofx/lightning.js';
import { playThud } from './audiofx/thud.js';
import { IceWall } from './IceWall.js';
import { Goblin } from './creatures/Goblin.js';
import { gridToPixel } from './utils.js';
import { showGameEndDialog, showAttackDialog } from './turn.js';

/**
 * Cast an offensive spell (Magic Bolt or Lightning)
 * @param {Phaser.Scene} scene - The game scene
 * @param {Object} casterPos - {x, y} grid position of caster
 * @param {Object} targetPos - {x, y} grid position of target
 * @param {string} spellName - Name of the spell ("Magic Bolt" or "Lightning")
 * @param {Function} onComplete - Callback when spell completes
 */
export function castOffensiveSpell(scene, casterPos, targetPos, spellName, onComplete) {
    const gameBoard = scene.gameBoard;
    const spell = spellData[spellName];

    // Calculate pixel positions
    const startPixel = gridToPixel(casterPos.x, casterPos.y, state.tileSize);
    const endPixel = gridToPixel(targetPos.x, targetPos.y, state.tileSize);

    // Check for ice wall blocking the path
    const obstacle = gameBoard.getObstacleInPath(casterPos.x, casterPos.y, targetPos.x, targetPos.y);

    if (obstacle) {
        // Spell hits the ice wall instead
        const wallPixel = gridToPixel(obstacle.x, obstacle.y, state.tileSize);

        console.log(`Spell blocked by Ice Wall at (${obstacle.x}, ${obstacle.y})`);

        const onWallHit = () => {
            // Destroy the ice wall
            if (obstacle.piece && obstacle.piece.destroy) {
                obstacle.piece.destroy();
            }
            gameBoard.removePiece(obstacle.piece);

            // Stop action music, resume game music
            audio.actionmusic.stop();
            audio.gamemusic.play();

            playThud();

            // Call completion callback after brief delay
            scene.time.delayedCall(1000, () => {
                if (onComplete) onComplete();
            });
        };

        // Fire spell to ice wall position
        fireSpellProjectile(spellName, startPixel, wallPixel, onWallHit);
        return;
    }

    // No obstacle - fire at target
    // Calculate damage
    const minDmg = spell.minDamage;
    const maxDmg = spell.maxDamage;
    const damage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;

    const onSpellComplete = () => {
        // Stop action music, resume game music
        audio.actionmusic.stop();
        audio.gamemusic.play();

        // Find the target at the hit position and deal damage
        const targetPiece = gameBoard.pieces.find(p =>
            p.x === targetPos.x && p.y === targetPos.y && p.piece !== "cursor"
        );

        if (targetPiece && targetPiece.piece.takeDamage) {
            const isDead = targetPiece.piece.takeDamage(damage);
            if (isDead) {
                console.log(`${targetPiece.cat} has been defeated!`);

                // Goblin death: remove from board, continue play
                if (targetPiece.cat.startsWith("goblin_")) {
                    removeDeadGoblin(gameBoard, targetPiece);
                    playThud();
                    scene.time.delayedCall(3500, () => {
                        if (onComplete) onComplete();
                    });
                    return;
                }

                // Wizard death: game ends
                const defeatedPlayerNum = targetPiece.cat === "player1" ? 1 : 2;
                const winnerPlayerNum = defeatedPlayerNum === 1 ? 2 : 1;

                playThud();

                // Show game end dialog and restart
                scene.time.delayedCall(3500, () => {
                    showGameEndDialog(winnerPlayerNum);
                });

                return;
            }
        } else {
            // No target found - destroy the tile at this position
            console.log(`Spell hit empty square at (${targetPos.x}, ${targetPos.y}) - destroying tile`);
            gameBoard.destroyTile(targetPos.x, targetPos.y);
        }

        playThud();

        // Call completion callback after delay to let HP bubbles display
        scene.time.delayedCall(3500, () => {
            if (onComplete) onComplete();
        });
    };

    // Fire spell at target
    fireSpellProjectile(spellName, startPixel, endPixel, onSpellComplete);
}

/**
 * Fire a spell projectile (internal helper)
 * Uses spell configuration from registry to determine visual effects and colors
 */
function fireSpellProjectile(spellName, startPixel, endPixel, onComplete) {
    const spell = getSpellByName(spellName);
    const spellColor = spell?.color || 0xff0000; // Use spell color or default red

    // Route to appropriate spell effect based on spell name
    // TODO: Could be made more dynamic with a spell visual registry
    if (spellName === "Lightning") {
        const lightning = getLightning();
        if (lightning) {
            playLightningSound();
            lightning.fire(startPixel.x, startPixel.y, endPixel.x, endPixel.y, onComplete);
        }
    }
    else if (spellName === "Mighty Arrow") {
        const arrow = getArrow();
        if (arrow) {
            arrow.fire(startPixel.x, startPixel.y, endPixel.x, endPixel.y, spellColor, onComplete);
        }
    }
    else if (spellName === "Magic Bolt") {
        const magicBolt = getMagicBolt();
        if (magicBolt) {
            playBolt();
            magicBolt.fire(startPixel.x, startPixel.y, endPixel.x, endPixel.y, spellColor, onComplete);
        }
    }
    else {
        // Fallback for unknown spells - use Magic Bolt effect with spell's color
        console.warn(`No visual effect registered for spell: ${spellName}, using Magic Bolt`);
        const magicBolt = getMagicBolt();
        if (magicBolt) {
            playBolt();
            magicBolt.fire(startPixel.x, startPixel.y, endPixel.x, endPixel.y, spellColor, onComplete);
        }
    }
}

/**
 * Create an Ice Wall at the target position
 * @param {Phaser.Scene} scene - The game scene
 * @param {Object} targetPos - {x, y} grid position for the wall
 * @param {Function} onComplete - Callback when creation completes
 * @returns {boolean} - True if wall was created, false if position was occupied
 */
export function createIceWall(scene, targetPos, onComplete) {
    const gameBoard = scene.gameBoard;

    // Check if tile is destroyed
    if (gameBoard.isTileDestroyed(targetPos.x, targetPos.y)) {
        audio.error.play();
        console.log("Can't place Ice Wall on destroyed tile!");
        return false;
    }

    // Check if target square is already occupied
    const occupied = gameBoard.pieces.find(p =>
        p.x === targetPos.x && p.y === targetPos.y && p.piece !== "cursor"
    );

    if (occupied) {
        audio.error.play();
        console.log("Can't place Ice Wall on occupied square!");
        return false;
    }

    // Create the ice wall
    const iceWall = new IceWall(scene, targetPos.x, targetPos.y);
    gameBoard.pieces.push({
        piece: iceWall,
        x: targetPos.x,
        y: targetPos.y,
        cat: "icewall"
    });

    console.log(`Ice Wall created at (${targetPos.x}, ${targetPos.y})`);
    audio.menuclick.play();

    // Call completion callback after brief delay
    scene.time.delayedCall(500, () => {
        if (onComplete) onComplete();
    });

    return true;
}

/**
 * Summon a Goblin at the target position
 * @param {Phaser.Scene} scene - The game scene
 * @param {Object} targetPos - {x, y} grid position for the goblin
 * @param {number} ownerPlayer - 1 or 2, the player who owns this goblin
 * @param {Function} onComplete - Callback when summoning completes
 * @returns {boolean} - True if goblin was summoned, false if position was invalid
 */
export function summonGoblin(scene, targetPos, ownerPlayer, onComplete) {
    const gameBoard = scene.gameBoard;

    // Check if tile is destroyed
    if (gameBoard.isTileDestroyed(targetPos.x, targetPos.y)) {
        audio.error.play();
        console.log("Can't summon on a destroyed tile!");
        return false;
    }

    // Check if target square is already occupied
    const occupied = gameBoard.pieces.find(p =>
        p.x === targetPos.x && p.y === targetPos.y && p.piece !== "cursor"
    );

    if (occupied) {
        audio.error.play();
        console.log("Can't summon on an occupied square!");
        return false;
    }

    // Create the goblin
    const goblin = new Goblin(scene, targetPos.x, targetPos.y);
    goblin.owner = ownerPlayer;

    const cat = `goblin_p${ownerPlayer}`;
    gameBoard.addPiece(goblin, targetPos.x, targetPos.y, cat);

    // Track in state
    const pieceEntry = gameBoard.pieces.find(p => p.piece === goblin);
    const goblinArray = ownerPlayer === 1 ? state.player1Goblins : state.player2Goblins;
    goblinArray.push(pieceEntry);

    console.log(`Goblin summoned at (${targetPos.x}, ${targetPos.y}) for player ${ownerPlayer}`);
    audio.menuclick.play();

    // Call completion callback after brief delay
    scene.time.delayedCall(500, () => {
        if (onComplete) onComplete();
    });

    return true;
}

/**
 * Cast Shield on a wizard
 * @param {Phaser.Scene} scene - The game scene
 * @param {Object} wizard - The wizard piece to shield
 * @param {Function} onComplete - Callback when shield is applied
 */
export function castShield(scene, wizard, onComplete) {
    const spell = spellData["Shield"];

    console.log("Casting Shield");

    // Apply shield
    wizard.addShield(spell.shieldHp);

    audio.menuclick.play();

    // Call completion callback after delay
    scene.time.delayedCall(1500, () => {
        if (onComplete) onComplete();
    });
}

/**
 * Execute a movement for a piece
 * @param {GameBoard} gameBoard - The game board
 * @param {Object} pieceData - The piece data from gameBoard.pieces
 * @param {number} dx - X direction (-1, 0, or 1)
 * @param {number} dy - Y direction (-1, 0, or 1)
 * @param {Function} onComplete - Callback when move completes
 * @returns {boolean} - True if move was successful
 */
export function executeMove(gameBoard, pieceData, dx, dy, onComplete) {
    const moved = gameBoard.movePiece(pieceData.piece, dx, dy);

    if (moved) {
        audio.menuclick.play();

        // Update cursor to piece position
        const scene = state.gameScene;
        const cursorData = gameBoard.pieces.find(p => p.piece === "cursor");
        if (cursorData) {
            cursorData.x = pieceData.x;
            cursorData.y = pieceData.y;
        }
        scene.cursor.x = pieceData.piece.sprite.x;
        scene.cursor.y = pieceData.piece.sprite.y;

        // Check for adjacent enemies after movement
        const adjacentEnemy = gameBoard.getAdjacentEnemy(pieceData);

        // Call completion callback after short delay
        scene.time.delayedCall(500, () => {
            if (adjacentEnemy) {
                // Show attack dialog
                showAttackDialog(
                    pieceData,
                    adjacentEnemy,
                    // onYes - attack the enemy
                    () => {
                        executeMeleeAttack(scene, pieceData, adjacentEnemy, onComplete);
                    },
                    // onNo - skip attack
                    () => {
                        if (onComplete) onComplete();
                    }
                );
            } else {
                // No adjacent enemy, proceed normally
                if (onComplete) onComplete();
            }
        });

        return true;
    }

    return false;
}

/**
 * Set cursor tint based on spell color from registry
 * @param {Phaser.Scene} scene - The game scene
 * @param {string} spellName - Name of the spell
 */
export function setCursorTintForSpell(scene, spellName) {
    const spell = getSpellByName(spellName);
    const cursorTint = spell?.color || 0xff0000; // Use spell color or default red
    scene.cursor.setTint(cursorTint);
}

/**
 * Clear cursor tint
 * @param {Phaser.Scene} scene - The game scene
 */
export function clearCursorTint(scene) {
    scene.cursor.clearTint();
}

/**
 * Update cursor position to a grid location
 * @param {Phaser.Scene} scene - The game scene
 * @param {Object} gridPos - {x, y} grid position
 */
export function moveCursorToGrid(scene, gridPos) {
    const gameBoard = scene.gameBoard;
    const pixel = gridToPixel(gridPos.x, gridPos.y, state.tileSize);

    const cursorData = gameBoard.pieces.find(p => p.piece === "cursor");
    if (cursorData) {
        cursorData.x = gridPos.x;
        cursorData.y = gridPos.y;
    }
    scene.cursor.x = pixel.x;
    scene.cursor.y = pixel.y;
}

/**
 * Show a spinning asterisk hit effect at a world position (Chaos-style melee impact)
 */
export function showMeleeHitEffect(scene, x, y) {
    const graphics = scene.add.graphics();
    graphics.setPosition(x, y);
    graphics.setDepth(20);
    
    // Randomize initial rotation for variety
    graphics.setAngle(Math.random() * 360);

    const radius = 35; // Slightly larger for "longer" feel
    const numSpokes = 8; // More spokes = more visual "chaos"
    const color = 0xffffff;

    // 1. Draw a central core "flash"
    graphics.fillStyle(color, 1);
    graphics.fillCircle(0, 0, 6);

    // 2. Draw the spokes
    graphics.lineStyle(4, color, 1);
    for (let i = 0; i < numSpokes; i++) {
        const angle = (i / numSpokes) * Math.PI * 2;
        graphics.lineBetween(
            Math.cos(angle) * radius * 0.2, Math.sin(angle) * radius * 0.2,
            Math.cos(angle) * radius, Math.sin(angle) * radius
        );
    }

    // 3. The "Punchy" Animation Loop
    scene.tweens.add({
        targets: graphics,
        angle: '+=1080',          // 3 full spins
        scale: { from: 0, to: 1.5 }, // Massive expansion
        alpha: { from: 1, to: 0.5 }, // Fade out slightly
        duration: 2000,           // Longer duration (1 second)
        ease: 'Back.out',         // "Back" ease gives it that snappy overshoot
        onComplete: () => { graphics.destroy(); }
    });
}

/**
 * Remove a dead goblin from the board and state tracking arrays
 * @param {GameBoard} gameBoard - The game board
 * @param {Object} pieceEntry - The goblin's piece entry from gameBoard.pieces
 */
function removeDeadGoblin(gameBoard, pieceEntry) {
    gameBoard.removePiece(pieceEntry.piece);
    const ownerNum = pieceEntry.cat === "goblin_p1" ? 1 : 2;
    const goblinArray = ownerNum === 1 ? state.player1Goblins : state.player2Goblins;
    const idx = goblinArray.indexOf(pieceEntry);
    if (idx !== -1) goblinArray.splice(idx, 1);
    console.log(`Goblin removed from player ${ownerNum}'s army`);
}

/**
 * Execute a melee attack
 * @param {Phaser.Scene} scene - The game scene
 * @param {Object} attacker - The attacker piece data (used for damage range)
 * @param {Object} defender - The defender piece data
 * @param {Function} onComplete - Callback when attack completes
 */
export function executeMeleeAttack(scene, attacker, defender, onComplete) {
    // Use attacker's damage stats if available, otherwise default 1-3
    let minDmg = 1;
    let maxDmg = 3;
    if (attacker && attacker.piece && attacker.piece.minDamage !== undefined) {
        minDmg = attacker.piece.minDamage;
        maxDmg = attacker.piece.maxDamage;
    }
    const damage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;

    console.log(`[executeMeleeAttack] ${attacker.cat} dealing ${damage} damage to ${defender.cat}`);

    playThud();

    // Show spinning asterisk hit effect on the defender
    if (defender && defender.piece && defender.piece.sprite) {
        showMeleeHitEffect(scene, defender.piece.sprite.x, defender.piece.sprite.y);
    }

    // Apply damage to defender
    if (defender && defender.piece && defender.piece.takeDamage) {
        const isDead = defender.piece.takeDamage(damage);

        if (isDead) {
            console.log(`${defender.cat} has been defeated!`);

            // Goblin death: remove from board, don't end game
            if (defender.cat.startsWith("goblin_")) {
                removeDeadGoblin(scene.gameBoard, defender);
                scene.time.delayedCall(3500, () => {
                    if (onComplete) onComplete();
                });
                return;
            }

            // Wizard death: game ends
            const defeatedPlayerNum = defender.cat === "player1" ? 1 : 2;
            const winnerPlayerNum = defeatedPlayerNum === 1 ? 2 : 1;

            // Show game end dialog and restart
            scene.time.delayedCall(3500, () => {
                showGameEndDialog(winnerPlayerNum);
            });

            return;
        }
    }

    // Call completion callback after delay to let HP bubbles display
    scene.time.delayedCall(3500, () => {
        if (onComplete) onComplete();
    });
}
