// GameBoard class
import { state } from './state.js';
import { menus } from './config.js';
import { renderMenu, handleMenuKeydown } from './menus.js';

export class GameBoard {
    constructor(scene, gridWidth, gridHeight) {
        this.scene = scene;
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.pieces = [];
    }

    toggleMenu(x, y, toggle, cat) {
        console.log(x, y, "menu at");
        console.log(toggle, this.menuGraphics, this.menuText);

        if (toggle) {
            let transferscene = this.scene;
            // Check if this is a player piece (player1 or player2)
            if (cat === "player1" || cat === "player2") {
                const playerNum = cat === "player1" ? 1 : 2;
                const menuTitle = `Player ${playerNum}`;

                // Store which player is selected for bio lookup
                state.selectedPlayerCat = cat;

                renderMenu(false, "player", "root", menuTitle, this.scene, x, y, toggle);

                // Remove any existing handler first
                if (state.currentMenuHandler) {
                    document.removeEventListener("keydown", state.currentMenuHandler);
                }

                // Create and store the new handler
                state.currentMenuHandler = function(event) {
                    handleMenuKeydown(event, menus["player"]["root"], transferscene);
                };

                console.log("adding keydown handlemenukeydown");
                state.keymonitor = true;
                state.spellsMode = false;
                document.addEventListener("keydown", state.currentMenuHandler);
            } else if (cat === "goblin") {
                // Goblin menu
                renderMenu(false, "goblin", "root", "Goblin", this.scene, x, y, toggle);

                // Remove any existing handler first
                if (state.currentMenuHandler) {
                    document.removeEventListener("keydown", state.currentMenuHandler);
                }

                // Create and store the new handler
                state.currentMenuHandler = function(event) {
                    handleMenuKeydown(event, menus["goblin"]["root"], transferscene);
                };

                console.log("adding keydown handlemenukeydown for goblin");
                state.keymonitor = true;
                document.addEventListener("keydown", state.currentMenuHandler);
            }
        } else {
            setTimeout(() => {
                this.scene.cursorBlinkEvent.paused = false;
                renderMenu(true);

                console.log("removing keydown handlemenukeydown");
                if (state.currentMenuHandler) {
                    document.removeEventListener("keydown", state.currentMenuHandler);
                    state.currentMenuHandler = null;
                }
            }, 50);
        }
    }

    selectBox(x, y) {
        const cursor = this.pieces.find(piece => piece.piece === "cursor");
        const selectedBox = this.pieces.find(piece =>
            piece.x === cursor.x && piece.y === cursor.y && piece.piece !== "cursor"
        );
        console.log("selectedBox", selectedBox);
        if (selectedBox) {
            // Check ownership - can only select your own units
            const owner = this.getPieceOwner(selectedBox);
            if (owner !== null && owner !== state.currentPlayer) {
                console.log(`Cannot select enemy unit (owner: ${owner}, current: ${state.currentPlayer})`);
                if (state.gameScene && state.gameScene.sound) {
                    const errorSound = state.gameScene.sound.get('error');
                    if (errorSound) errorSound.play();
                }
                return false;
            }

            // Check if this unit has already acted this turn
            if (state.actedUnits.has(selectedBox.piece)) {
                console.log(`Unit has already acted this turn`);
                if (state.gameScene && state.gameScene.sound) {
                    const errorSound = state.gameScene.sound.get('error');
                    if (errorSound) errorSound.play();
                }
                return false;
            }

            this.toggleMenu(x, y, true, selectedBox.cat);
            this.scene.cursorBlinkEvent.paused = true;
        } else {
            return false;
        }
    }

    setupBoardDimensions(x, y) {
        this.boardWidth = x;
        this.boardHeight = y;
    }

    setupCursor() {
        this.pieces.push({ piece: "cursor", x: 1, y: 1, cat: "cursor" });
    }

    reportCursor() {
        const cursorpos = this.pieces.find(piece => piece.piece === "cursor");
        if (cursorpos) {
            return { x: cursorpos.x, y: cursorpos.y };
        }
        return false;
    }

    alterCursor(dimension, value) {
        const cursorIndex = this.pieces.findIndex(piece => piece.piece === "cursor");
        if (cursorIndex !== -1) {
            if (dimension === "x") {
                this.pieces[cursorIndex].x += value;
            } else if (dimension === "y") {
                this.pieces[cursorIndex].y += value;
            }
        }
    }

    addPiece(piece, x, y, cat, owner = null) {
        if (this.isValidPosition(x, y)) {
            this.pieces.push({ piece: piece, x: x, y: y, cat: cat, owner: owner });
            piece.sprite.x = state.gridToPixelX(x);
            piece.sprite.y = state.gridToPixelY(y);
            this.scene.add.existing(piece.sprite);
        } else {
            console.error("Invalid position for piece:", x, y);
        }
    }

    // Get the owner of a piece (returns 1, 2, or null)
    getPieceOwner(pieceData) {
        // If owner is explicitly set, use that
        if (pieceData.owner !== null && pieceData.owner !== undefined) {
            return pieceData.owner;
        }
        // Fall back to extracting from cat for backwards compatibility
        if (pieceData.cat === "player1") return 1;
        if (pieceData.cat === "player2") return 2;
        return null;
    }

    isValidPosition(x, y) {
        return x >= 1 && x <= this.gridWidth && y >= 1 && y <= this.gridHeight;
    }

    movePiece(piece, dx, dy) {
        const pieceData = this.pieces.find(p => p.piece === piece);
        if (!pieceData) return false;

        const newX = pieceData.x + dx;
        const newY = pieceData.y + dy;

        // Check bounds
        if (newX < 1 || newX > this.boardWidth || newY < 1 || newY > this.boardHeight) {
            return false;
        }

        // Check if another piece occupies the target square
        const occupied = this.pieces.find(p =>
            p.x === newX && p.y === newY && p.piece !== "cursor" && p.piece !== piece
        );
        if (occupied) {
            return false;
        }

        // Update piece position
        pieceData.x = newX;
        pieceData.y = newY;
        piece.sprite.x = state.gridToPixelX(newX);
        piece.sprite.y = state.gridToPixelY(newY);

        // Notify piece of movement (for shield visual updates, etc.)
        if (piece.onMove) {
            piece.onMove();
        }

        return true;
    }

    getSelectedPiece() {
        const cursor = this.pieces.find(piece => piece.piece === "cursor");
        return this.pieces.find(piece =>
            piece.x === cursor.x && piece.y === cursor.y && piece.piece !== "cursor"
        );
    }

    // Check for obstacles (ice walls) in the path between two points
    // Returns the first obstacle found, or null if path is clear
    getObstacleInPath(fromX, fromY, toX, toY) {
        // Use Bresenham-like line algorithm to check each cell along the path
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);
        const sx = fromX < toX ? 1 : -1;
        const sy = fromY < toY ? 1 : -1;

        let x = fromX;
        let y = fromY;
        let err = dx - dy;

        while (true) {
            // Don't check the starting position (caster's position)
            if (x !== fromX || y !== fromY) {
                // Don't check the final position (we want to hit the target)
                if (x === toX && y === toY) {
                    break;
                }

                // Check for ice wall at this position
                const obstacle = this.pieces.find(p =>
                    p.x === x && p.y === y && p.cat === "icewall"
                );

                if (obstacle) {
                    return obstacle;
                }
            }

            if (x === toX && y === toY) {
                break;
            }

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }

        return null;
    }

    // Remove a piece from the board
    removePiece(piece) {
        const index = this.pieces.findIndex(p => p.piece === piece);
        if (index !== -1) {
            this.pieces.splice(index, 1);
            return true;
        }
        return false;
    }

    // Find an adjacent enemy (any unit owned by the other player)
    // Returns the enemy piece data if found, null otherwise
    getAdjacentEnemy(pieceData) {
        const { x, y } = pieceData;

        // Get this piece's owner
        const myOwner = this.getPieceOwner(pieceData);
        if (myOwner === null) return null;

        // Check all 8 adjacent squares
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                // Skip the center square (the piece itself)
                if (dx === 0 && dy === 0) continue;

                const adjX = x + dx;
                const adjY = y + dy;

                const adjacent = this.pieces.find(p => {
                    if (p.x !== adjX || p.y !== adjY) return false;
                    // Skip cursor and non-owned pieces
                    if (p.cat === "cursor" || p.cat === "icewall") return false;
                    // Check if owned by enemy
                    const theirOwner = this.getPieceOwner(p);
                    return theirOwner !== null && theirOwner !== myOwner;
                });

                if (adjacent) {
                    console.log(`Adjacent enemy found! ${pieceData.cat} at (${x}, ${y}) is adjacent to ${adjacent.cat} at (${adjX}, ${adjY})`);
                    return adjacent;
                }
            }
        }

        return null;
    }
}