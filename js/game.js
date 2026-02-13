// Main game file
import { gridWidth, gridHeight, minTileSize, maxTileSize, cursorScale } from './config.js';
import { state, audio } from './state.js';
import { showTurnDialog } from './turn.js';
import { endTurn } from './turn.js';
import { Wizard } from './Wizard.js';
import { GameBoard } from './GameBoard.js';
import { initMagicBolt } from './spells/bolt.js';
import { initLightning } from './spells/lightning.js';
import { initArrow } from './spells/arrow.js';
import { castOffensiveSpell, createIceWall, executeMove } from './actions.js';
import { Goblin } from './creatures/Goblin.js';

// Exit targeting mode and restore cursor
function exitTargetingMode(scene) {
    state.targetingMode = false;
    state.targetingSpell = null;
    state.casterPiece = null;

    // Restore cursor color
    scene.cursor.clearTint();

    // Stop action music, resume game music
    audio.actionmusic.stop();
    audio.gamemusic.play();
}

const config = {
    type: Phaser.AUTO,
    width: 800, // Becomes the "base" resolution
    height: 600,
    // backgroundColor is removed as transparent: true handles it
    scale: {
        mode: Phaser.Scale.RESIZE, 
        // autoCenter is removed as it's redundant with RESIZE
    },
    render: {
        transparent: true,
        pixelArt: false // Add this as true if you're doing retro styles!
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

function preload() {
    this.load.image('tile', './assets/tile.jpg');
    this.load.spritesheet('white_wizard', './assets/white_wizard_idle.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('cartoon_wizard', './assets/cartoon_wizard_idle.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('goblin_right', './assets/goblin-right.png', { frameWidth: 100, frameHeight: 100 });
    this.load.image('cursor', './assets/cursor2.png');
    this.load.audio("menuclick", ["./assets/menuclick.mp3"]);
    this.load.audio("error", ["./assets/error.mp3"]);
    this.load.audio("gamemusic", ["./assets/prism.mp3"]);
    this.load.audio("actionmusic", ["./assets/action.mp3"]);
    this.load.image('iceTexture', ["./textures/ice.png"]);
}

function create() {
    state.gameScene = this;

    // Calculate dynamic tile size to fit fixed 15x10 grid
    const marginX = 100;  // Total margin left/right
    const marginY = 100;  // Total margin top/bottom
    const availableWidth = this.sys.game.canvas.width - marginX;
    const availableHeight = this.sys.game.canvas.height - marginY;
    const maxTileWidth = Math.floor(availableWidth / gridWidth);
    const maxTileHeight = Math.floor(availableHeight / gridHeight);
    const calculatedTileSize = Math.min(maxTileWidth, maxTileHeight);
    state.tileSize = Math.max(Math.min(calculatedTileSize, maxTileSize), minTileSize);

    // Reset game state for new game
    state.currentPlayer = 1;
    state.turnNumber = 1;
    state.movementMode = false;
    state.selectedPiece = null;
    state.isSelected = false;
    state.keymonitor = false;
    state.spellsMode = false;
    state.targetingMode = false;
    state.targetingSpell = null;
    state.casterPiece = null;
    state.turnDialogActive = false;
    state.currentMenuHandler = null;

    // Setup audio
    audio.menuclick = this.sound.add("menuclick", { loop: false });
    audio.error = this.sound.add("error", { loop: false });
    audio.gamemusic = this.sound.add("gamemusic", { loop: true });
    audio.gamemusic.setVolume(0.4);
    audio.gamemusic.play();    
    audio.actionmusic = this.sound.add("actionmusic", { loop: true });
    audio.actionmusic.setVolume(0.4);

    // Calculate centering offsets so the grid is centered on screen
    // Grid pixel formula: offset + (gridPos - 1) * tileSize + tileSize / 2
    // Grid spans exactly gridWidth * tileSize pixels wide, gridHeight * tileSize tall
    const canvasWidth = this.sys.game.canvas.width;
    const canvasHeight = this.sys.game.canvas.height;
    const gridPixelWidth = gridWidth * state.tileSize;
    const gridPixelHeight = gridHeight * state.tileSize;
    state.offsetX = Math.floor((canvasWidth - gridPixelWidth) / 2);
    state.offsetY = Math.floor((canvasHeight - gridPixelHeight) / 2);

    // Helper: convert grid position (1-indexed) to pixel center
    // Store on state so other modules can use it
    state.gridToPixelX = (gx) => state.offsetX + (gx - 1) * state.tileSize + (state.tileSize / 2);
    state.gridToPixelY = (gy) => state.offsetY + (gy - 1) * state.tileSize + (state.tileSize / 2);

    // Setup cursor at grid position (1, 1)
    this.cursor = this.add.image(0, 0, 'cursor');
    this.cursor.setOrigin(0.5, 0.5);
    this.cursor.setScale(cursorScale);
    this.cursor.setDepth(4);
    this.cursor.x = state.gridToPixelX(1);
    this.cursor.y = state.gridToPixelY(1);

    this.cursorBlinkEvent = this.time.addEvent({
        delay: 500,
        callback: () => {
            this.cursor.visible = !this.cursor.visible;
        },
        loop: true,
        paused: true
    });
    this.cursorBlinkEvent.paused = false;

    // Create game board first so we can store tile references
    this.gameBoard = new GameBoard(this, gridWidth, gridHeight);

    // Create the grid tiles (fixed 15x10 with dynamic tile size), centered on screen
    for (let y = 1; y <= gridHeight; y++) {
        for (let x = 1; x <= gridWidth; x++) {
            const tile = this.add.image(
                state.gridToPixelX(x),
                state.gridToPixelY(y),
                'tile'
            );
            tile.setDepth(2);
            tile.setDisplaySize(state.tileSize, state.tileSize);

            // Store tile sprite reference in gameBoard for later destruction effects
            const tileKey = `${x},${y}`;
            this.gameBoard.tileSprites[tileKey] = tile;

            state.bx = x;
            state.by = y;
        }
    }

    let whiteWizard = new Wizard(this, 2, 2, 'white_wizard', 1, 1); // Player 1 (left health bar)
    this.gameBoard.addPiece(whiteWizard, 1, 1, "player1");

    let cartoonWizard = new Wizard(this, 2, 2, 'cartoon_wizard', 1, 2); // Player 2 (right health bar)
    this.gameBoard.addPiece(cartoonWizard, state.bx, state.by, "player2");

    this.gameBoard.setupCursor();
    this.gameBoard.setupBoardDimensions(state.bx, state.by);

    console.log(this.gameBoard);

    // Initialize spell systems
    initMagicBolt(this);
    initLightning(this);
    initArrow(this);

    // Show HP bubbles for both wizards at game start (staggered)
    this.time.delayedCall(500, () => {
        whiteWizard.showHp();
    });
    this.time.delayedCall(800, () => {
        cartoonWizard.showHp();
    });

    // WASD + diagonal keys (Q/E/Z/C) + S as space
    this.keys = this.input.keyboard.addKeys({
        Q: Phaser.Input.Keyboard.KeyCodes.Q,
        W: Phaser.Input.Keyboard.KeyCodes.W,
        E: Phaser.Input.Keyboard.KeyCodes.E,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        Z: Phaser.Input.Keyboard.KeyCodes.Z,
        X: Phaser.Input.Keyboard.KeyCodes.X,
        C: Phaser.Input.Keyboard.KeyCodes.C,
    });

    // Show initial turn dialog
    showTurnDialog();
 
    // goblin test
    /* console.log("Adding goblin...");
    let goblin = new Goblin(this, 5, 5,1.005);
    this.gameBoard.addPiece(goblin, 5, 5, "goblin_right");*/

}

async function update() {
    // Block input while turn dialog is showing
    if (state.turnDialogActive) return;

    const cursors = this.input.keyboard.createCursorKeys();
    const keys = this.keys;

    // Targeting mode - select target for spell
    if (state.targetingMode) {
        let dx = 0;
        let dy = 0;

        if (cursors.left.isDown && !this.targetLeftKeyDown) {
            dx = -1;
            this.targetLeftKeyDown = true;
        } else if (cursors.left.isUp) {
            this.targetLeftKeyDown = false;
        }

        if (cursors.right.isDown && !this.targetRightKeyDown) {
            dx = 1;
            this.targetRightKeyDown = true;
        } else if (cursors.right.isUp) {
            this.targetRightKeyDown = false;
        }

        if (cursors.up.isDown && !this.targetUpKeyDown) {
            dy = -1;
            this.targetUpKeyDown = true;
        } else if (cursors.up.isUp) {
            this.targetUpKeyDown = false;
        }

        if (cursors.down.isDown && !this.targetDownKeyDown) {
            dy = 1;
            this.targetDownKeyDown = true;
        } else if (cursors.down.isUp) {
            this.targetDownKeyDown = false;
        }

        // Letter key targeting movement
        if (keys.Q.isDown && !this.targetQKeyDown) { dx = -1; dy = -1; this.targetQKeyDown = true; } else if (keys.Q.isUp) { this.targetQKeyDown = false; }
        if (keys.W.isDown && !this.targetWKeyDown) { dy = -1; this.targetWKeyDown = true; } else if (keys.W.isUp) { this.targetWKeyDown = false; }
        if (keys.E.isDown && !this.targetEKeyDown) { dx = 1; dy = -1; this.targetEKeyDown = true; } else if (keys.E.isUp) { this.targetEKeyDown = false; }
        if (keys.A.isDown && !this.targetAKeyDown) { dx = -1; this.targetAKeyDown = true; } else if (keys.A.isUp) { this.targetAKeyDown = false; }
        if (keys.D.isDown && !this.targetDKeyDown) { dx = 1; this.targetDKeyDown = true; } else if (keys.D.isUp) { this.targetDKeyDown = false; }
        if (keys.Z.isDown && !this.targetZKeyDown) { dx = -1; dy = 1; this.targetZKeyDown = true; } else if (keys.Z.isUp) { this.targetZKeyDown = false; }
        if (keys.X.isDown && !this.targetXKeyDown) { dy = 1; this.targetXKeyDown = true; } else if (keys.X.isUp) { this.targetXKeyDown = false; }
        if (keys.C.isDown && !this.targetCKeyDown) { dx = 1; dy = 1; this.targetCKeyDown = true; } else if (keys.C.isUp) { this.targetCKeyDown = false; }

        // Move cursor if within range
        if (dx !== 0 || dy !== 0) {
            const cursorPos = this.gameBoard.reportCursor();
            const newX = cursorPos.x + dx;
            const newY = cursorPos.y + dy;

            // Check if new position is within range of caster
            const distX = Math.abs(newX - state.casterX);
            const distY = Math.abs(newY - state.casterY);
            const distance = Math.max(distX, distY); // Chebyshev distance (allows diagonal)

            // Check bounds
            if (newX >= 1 && newX <= state.bx && newY >= 1 && newY <= state.by) {
                if (distance <= state.targetingRange) {
                    this.cursor.x += dx * state.tileSize;
                    this.cursor.y += dy * state.tileSize;
                    this.gameBoard.alterCursor("x", dx);
                    this.gameBoard.alterCursor("y", dy);
                    audio.menuclick.play();
                } else {
                    audio.error.play();
                    console.log("Target out of range!");
                }
            } else {
                audio.error.play();
            }
        }

        // Confirm target with Space or S
        if ((cursors.space.isDown || keys.S.isDown) && !this.spaceKeyDown) {
            this.spaceKeyDown = true;
            const cursorPos = this.gameBoard.reportCursor();

            // Calculate distance to confirm it's in range
            const distX = Math.abs(cursorPos.x - state.casterX);
            const distY = Math.abs(cursorPos.y - state.casterY);
            const distance = Math.max(distX, distY);

            if (distance > 0 && distance <= state.targetingRange) {
                // Fire the spell!
                audio.menuclick.play();

                console.log(`Casting ${state.targetingSpell} from (${state.casterX}, ${state.casterY}) to (${cursorPos.x}, ${cursorPos.y})`);

                // Restore cursor immediately
                this.cursor.clearTint();

                // Fire spell based on type
                const scene = this;
                const targetX = cursorPos.x;
                const targetY = cursorPos.y;
                const currentSpell = state.targetingSpell;

                // Mark spell as used
                if (state.casterPiece && state.casterPiece.piece.markSpellUsed) {
                    state.casterPiece.piece.markSpellUsed(currentSpell);
                }

                // Handle Ice Wall separately (creates obstacle, no damage)
                if (currentSpell === "Ice Wall") {
                    const success = createIceWall(scene, { x: targetX, y: targetY }, () => {
                        state.casterPiece = null;
                        state.targetingSpell = null;
                        endTurn();
                    });

                    if (!success) {
                        // Unmark the spell since it failed
                        if (state.casterPiece && state.casterPiece.piece.usedSpells) {
                            state.casterPiece.piece.usedSpells.delete(currentSpell);
                        }
                        state.targetingMode = false;
                        state.casterPiece = null;
                        state.targetingSpell = null;
                        return;
                    }

                    state.targetingMode = false;
                    return;
                }

                // Cast offensive spell (Magic Bolt or Lightning)
                castOffensiveSpell(
                    scene,
                    { x: state.casterX, y: state.casterY },
                    { x: targetX, y: targetY },
                    currentSpell,
                    () => {
                        state.casterPiece = null;
                        state.targetingSpell = null;
                        endTurn();
                    }
                );

                // Exit targeting mode (spell animation playing)
                state.targetingMode = false;
            } else if (distance === 0) {
                audio.error.play();
                console.log("Can't target yourself!");
            } else {
                audio.error.play();
                console.log("Target out of range!");
            }
        } else if (cursors.space.isUp && keys.S.isUp) {
            this.spaceKeyDown = false;
        }

        // Cancel targeting with Escape (using shift as fallback since Phaser doesn't have escape in cursors)
        const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        if (escKey.isDown && !this.escKeyDown) {
            this.escKeyDown = true;
            audio.menuclick.play();
            exitTargetingMode(this);
            console.log("Targeting cancelled");
        } else if (escKey.isUp) {
            this.escKeyDown = false;
        }

        return; // Don't process other inputs while targeting
    }

    // Movement mode - move the selected piece
    if (state.movementMode && state.selectedPiece) {
        let dx = 0;
        let dy = 0;

        if (cursors.left.isDown && !this.moveLeftKeyDown) {
            dx = -1;
            this.moveLeftKeyDown = true;
        } else if (cursors.left.isUp) {
            this.moveLeftKeyDown = false;
        }

        if (cursors.right.isDown && !this.moveRightKeyDown) {
            dx = 1;
            this.moveRightKeyDown = true;
        } else if (cursors.right.isUp) {
            this.moveRightKeyDown = false;
        }

        if (cursors.up.isDown && !this.moveUpKeyDown) {
            dy = -1;
            this.moveUpKeyDown = true;
        } else if (cursors.up.isUp) {
            this.moveUpKeyDown = false;
        }

        if (cursors.down.isDown && !this.moveDownKeyDown) {
            dy = 1;
            this.moveDownKeyDown = true;
        } else if (cursors.down.isUp) {
            this.moveDownKeyDown = false;
        }

        // Letter key movement
        if (keys.Q.isDown && !this.moveQKeyDown) { dx = -1; dy = -1; this.moveQKeyDown = true; } else if (keys.Q.isUp) { this.moveQKeyDown = false; }
        if (keys.W.isDown && !this.moveWKeyDown) { dy = -1; this.moveWKeyDown = true; } else if (keys.W.isUp) { this.moveWKeyDown = false; }
        if (keys.E.isDown && !this.moveEKeyDown) { dx = 1; dy = -1; this.moveEKeyDown = true; } else if (keys.E.isUp) { this.moveEKeyDown = false; }
        if (keys.A.isDown && !this.moveAKeyDown) { dx = -1; this.moveAKeyDown = true; } else if (keys.A.isUp) { this.moveAKeyDown = false; }
        if (keys.D.isDown && !this.moveDKeyDown) { dx = 1; this.moveDKeyDown = true; } else if (keys.D.isUp) { this.moveDKeyDown = false; }
        if (keys.Z.isDown && !this.moveZKeyDown) { dx = -1; dy = 1; this.moveZKeyDown = true; } else if (keys.Z.isUp) { this.moveZKeyDown = false; }
        if (keys.X.isDown && !this.moveXKeyDown) { dy = 1; this.moveXKeyDown = true; } else if (keys.X.isUp) { this.moveXKeyDown = false; }
        if (keys.C.isDown && !this.moveCKeyDown) { dx = 1; dy = 1; this.moveCKeyDown = true; } else if (keys.C.isUp) { this.moveCKeyDown = false; }

        if (dx !== 0 || dy !== 0) {
            const moved = executeMove(this.gameBoard, state.selectedPiece, dx, dy, () => {
                state.movementMode = false;
                state.selectedPiece = null;
                endTurn();
            });

            if (!moved) {
                audio.error.play();
            }
        }

        // Cancel movement mode with space or S
        if ((cursors.space.isDown || keys.S.isDown) && !this.spaceKeyDown) {
            audio.menuclick.play();
            state.movementMode = false;
            state.selectedPiece = null;
            this.spaceKeyDown = true;
            console.log("Movement cancelled");
        } else if (cursors.space.isUp && keys.S.isUp) {
            this.spaceKeyDown = false;
        }
        return;
    }

    // Cursor movement
    if (cursors.left.isDown && !this.leftKeyDown && !state.isSelected) {
        const pos = this.gameBoard.reportCursor();
        if (pos.x - 1 === 0) {
            audio.error.play();
            return false;
        }
        this.cursor.x -= state.tileSize;
        this.leftKeyDown = true;
        this.gameBoard.alterCursor("x", -1);
    } else if (cursors.left.isUp) {
        this.leftKeyDown = false;
    }

    if (cursors.right.isDown && !this.rightKeyDown && !state.isSelected) {
        const pos = this.gameBoard.reportCursor();
        if (pos.x + 1 === state.bx + 1) {
            audio.error.play();
            return false;
        }
        this.cursor.x += state.tileSize;
        this.rightKeyDown = true;
        this.gameBoard.alterCursor("x", 1);
    } else if (cursors.right.isUp) {
        this.rightKeyDown = false;
    }

    if (cursors.up.isDown && !this.upKeyDown && !state.isSelected) {
        const pos = this.gameBoard.reportCursor();
        if (pos.y - 1 === 0) {
            audio.error.play();
            return false;
        }
        this.cursor.y -= state.tileSize;
        this.upKeyDown = true;
        this.gameBoard.alterCursor("y", -1);
    } else if (cursors.up.isUp) {
        this.upKeyDown = false;
    }

    if (cursors.down.isDown && !this.downKeyDown && !state.isSelected) {
        const pos = this.gameBoard.reportCursor();
        if (pos.y + 1 === state.by + 1) {
            audio.error.play();
            return false;
        }
        this.cursor.y += state.tileSize;
        this.downKeyDown = true;
        this.gameBoard.alterCursor("y", 1);
    } else if (cursors.down.isUp) {
        this.downKeyDown = false;
    }

    // Letter key cursor movement (WASD + diagonals QEZXC)
    {
        const letterMoves = [
            { key: 'Q', dx: -1, dy: -1 }, { key: 'W', dx: 0, dy: -1 }, { key: 'E', dx: 1, dy: -1 },
            { key: 'A', dx: -1, dy: 0 },                                 { key: 'D', dx: 1, dy: 0 },
            { key: 'Z', dx: -1, dy: 1 },  { key: 'X', dx: 0, dy: 1 },  { key: 'C', dx: 1, dy: 1 },
        ];
        for (const { key, dx, dy } of letterMoves) {
            const tracker = `${key.toLowerCase()}CursorKeyDown`;
            if (keys[key].isDown && !this[tracker] && !state.isSelected) {
                const pos = this.gameBoard.reportCursor();
                const newX = pos.x + dx;
                const newY = pos.y + dy;
                if (newX >= 1 && newX <= state.bx && newY >= 1 && newY <= state.by) {
                    this.cursor.x += dx * state.tileSize;
                    this.cursor.y += dy * state.tileSize;
                    if (dx !== 0) this.gameBoard.alterCursor("x", dx);
                    if (dy !== 0) this.gameBoard.alterCursor("y", dy);
                } else {
                    audio.error.play();
                }
                this[tracker] = true;
            } else if (keys[key].isUp) {
                this[tracker] = false;
            }
        }
    }

    // Space or S - select/deselect
    if ((cursors.space.isDown || keys.S.isDown) && !this.spaceKeyDown) {
        audio.menuclick.play();
        state.isSelected = !state.isSelected;
        this.spaceKeyDown = true;
        if (state.isSelected) {
            let proceed = this.gameBoard.selectBox(this.cursor.x, this.cursor.y);
            this.cursor.visible = true;
            if (proceed === false) {
                state.isSelected = false;
                this.cursor.visible = false;
                setTimeout(() => {
                    this.cursor.visible = true;
                }, 100);
            }
        } else {
            this.gameBoard.toggleMenu(0, 0, false);
            state.keymonitor = false;
        }
    } else if (cursors.space.isUp && keys.S.isUp) {
        this.spaceKeyDown = false;
    }

   // Keep cursor within bounds (1-indexed, centered grid)
    this.cursor.x = Phaser.Math.Clamp(this.cursor.x, state.gridToPixelX(1), state.gridToPixelX(gridWidth));
    this.cursor.y = Phaser.Math.Clamp(this.cursor.y, state.gridToPixelY(1), state.gridToPixelY(gridHeight));
}

console.log(config);
const game = new Phaser.Game(config);