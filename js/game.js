// Main game file
import { gridWidth, gridHeight, tileSize, cursorScale } from './config.js';
import { state, audio } from './state.js';
import { showTurnDialog } from './turn.js';
import { endTurn } from './turn.js';
import { Wizard } from './Wizard.js';
import { GameBoard } from './GameBoard.js';
import { initMagicBolt } from './spells/bolt.js';
import { initLightning } from './spells/lightning.js';
import { castOffensiveSpell, createIceWall, executeMove } from './actions.js';

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
    width: 800,
    height: 600,
    backgroundColor: 'white',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

function preload() {
    this.load.image('tile', './assets/tile.png');
    this.load.spritesheet('white_wizard', './assets/white_wizard_idle.png', { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('cartoon_wizard', './assets/cartoon_wizard_idle.png', { frameWidth: 100, frameHeight: 100 });
    this.load.image('cursor', './assets/cursor2.png');
    this.load.audio("menuclick", ["./assets/menuclick.mp3"]);
    this.load.audio("error", ["./assets/error.mp3"]);
    this.load.audio("gamemusic", ["./assets/prism.mp3"]);
    this.load.audio("actionmusic", ["./assets/action.mp3"]);
    this.load.image('iceTexture', ["./textures/ice.png"]);
}

function create() {
    state.gameScene = this;

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
    audio.gamemusic.play();
    audio.gamemusic.setVolume(0.7);
    audio.actionmusic = this.sound.add("actionmusic", { loop: true });
    audio.actionmusic.setVolume(0.8);

    // Setup cursor
    this.cursor = this.add.image(0, 0, 'cursor');
    this.cursor.setScale(cursorScale);
    this.cursor.setDepth(4);
    this.cursor.x = tileSize + (tileSize / 2);
    this.cursor.y = tileSize + (tileSize / 2);

    this.cursorBlinkEvent = this.time.addEvent({
        delay: 500,
        callback: () => {
            this.cursor.visible = !this.cursor.visible;
        },
        loop: true,
        paused: true
    });
    this.cursorBlinkEvent.paused = false;

    // Calculate grid dimensions
    const startX = 0;
    const startY = 0;
    const widthMax = (this.sys.game.canvas.width / tileSize).toFixed(0);
    const heightMax = (this.sys.game.canvas.height / tileSize).toFixed(0);

    // Create the grid
    for (let y = 1; y < heightMax - 1; y++) {
        for (let x = 1; x < widthMax - 1; x++) {
            const tile = this.add.image(
                startX + (x * tileSize) + (tileSize / 2),
                startY + (y * tileSize) + (tileSize / 2),
                'tile'
            );
            tile.setDepth(2);
            tile.setDisplaySize(tileSize, tileSize);

            state.bx = x;
            state.by = y;
        }
    }

    // Create game board and pieces
    this.gameBoard = new GameBoard(this, gridWidth, gridHeight);

    let whiteWizard = new Wizard(this, 2, 2, 'white_wizard', 1);
    this.gameBoard.addPiece(whiteWizard, 1, 1, "player1");

    let cartoonWizard = new Wizard(this, 2, 2, 'cartoon_wizard', 1);
    this.gameBoard.addPiece(cartoonWizard, state.bx, state.by, "player2");

    this.gameBoard.setupCursor();
    this.gameBoard.setupBoardDimensions(state.bx, state.by);

    console.log(this.gameBoard);

    // Initialize spell systems
    initMagicBolt(this);
    initLightning(this);

    // Show HP bubbles for both wizards at game start (staggered)
    this.time.delayedCall(500, () => {
        whiteWizard.showHp();
    });
    this.time.delayedCall(800, () => {
        cartoonWizard.showHp();
    });

    // Show initial turn dialog
    showTurnDialog();
 

}

async function update() {
    // Block input while turn dialog is showing
    if (state.turnDialogActive) return;

    const cursors = this.input.keyboard.createCursorKeys();

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
                    this.cursor.x += dx * tileSize;
                    this.cursor.y += dy * tileSize;
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

        // Confirm target with Space
        if (cursors.space.isDown && !this.spaceKeyDown) {
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
        } else if (cursors.space.isUp) {
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

        // Cancel movement mode with space
        if (cursors.space.isDown && !this.spaceKeyDown) {
            audio.menuclick.play();
            state.movementMode = false;
            state.selectedPiece = null;
            this.spaceKeyDown = true;
            console.log("Movement cancelled");
        } else if (cursors.space.isUp) {
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
        this.cursor.x -= tileSize;
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
        this.cursor.x += tileSize;
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
        this.cursor.y -= tileSize;
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
        this.cursor.y += tileSize;
        this.downKeyDown = true;
        this.gameBoard.alterCursor("y", 1);
    } else if (cursors.down.isUp) {
        this.downKeyDown = false;
    }

    // Space - select/deselect
    if (cursors.space.isDown && !this.spaceKeyDown) {
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
    } else if (cursors.space.isUp) {
        this.spaceKeyDown = false;
    }

    // Keep cursor within bounds
    this.cursor.x = Phaser.Math.Clamp(this.cursor.x, 0, (gridWidth - 1) * tileSize);
    this.cursor.y = Phaser.Math.Clamp(this.cursor.y, 0, (gridHeight - 1) * tileSize);
}

console.log(config);
const game = new Phaser.Game(config);
