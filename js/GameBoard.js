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
        this.destroyedTiles = new Set(); // Track destroyed tile coordinates as "x,y" strings
        this.tileSprites = {}; // Store references to tile sprites for visual updates
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

    addPiece(piece, x, y, cat) {
        if (this.isValidPosition(x, y)) {
            this.pieces.push({ piece: piece, x: x, y: y, cat: cat });
            piece.sprite.x = state.gridToPixelX(x);
            piece.sprite.y = state.gridToPixelY(y);
            this.scene.add.existing(piece.sprite);
        } else {
            console.error("Invalid position for piece:", x, y);
        }
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

        // Check if tile is destroyed
        const tileKey = `${newX},${newY}`;
        if (this.destroyedTiles.has(tileKey)) {
            console.log("Can't move to destroyed tile!");
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

    // Find an adjacent enemy (wizard or goblin)
    // Returns the enemy piece data if found, null otherwise
    getAdjacentEnemy(pieceData) {
        const { x, y, cat } = pieceData;

        // Determine which side this piece belongs to
        let ownerSide = null;
        if (cat === "player1" || cat === "goblin_p1") ownerSide = 1;
        else if (cat === "player2" || cat === "goblin_p2") ownerSide = 2;

        if (!ownerSide) return null;

        // Enemy categories: opposing wizard and any opposing goblins
        const enemyCats = ownerSide === 1
            ? ["player2", "goblin_p2"]
            : ["player1", "goblin_p1"];

        // Check all 8 adjacent squares
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                // Skip the center square (the piece itself)
                if (dx === 0 && dy === 0) continue;

                const adjX = x + dx;
                const adjY = y + dy;

                const adjacent = this.pieces.find(p =>
                    p.x === adjX && p.y === adjY && enemyCats.includes(p.cat)
                );

                if (adjacent) {
                    console.log(`Adjacent enemy found! ${cat} at (${x}, ${y}) is adjacent to ${adjacent.cat} at (${adjX}, ${adjY})`);
                    return adjacent;
                }
            }
        }

        return null;
    }

    // Destroy a tile at the given position
    // Makes the tile impassable and updates its visual appearance
    destroyTile(x, y) {
        const tileKey = `${x},${y}`;

        // Check if already destroyed
        if (this.destroyedTiles.has(tileKey)) {
            return false;
        }

        // Mark as destroyed
        this.destroyedTiles.add(tileKey);

        // Update visual appearance if we have a reference to the tile sprite
        if (this.tileSprites[tileKey]) {
            const tileSprite = this.tileSprites[tileKey];

            // Darken the tile and add a red tint to show it's destroyed
            tileSprite.setTint(0x330000);
            tileSprite.setAlpha(0.5);

            // Optional: add a crack/hole effect with graphics
            const graphics = this.scene.add.graphics();
            graphics.setDepth(3); // Above tiles but below pieces
            graphics.fillStyle(0x000000, 0.7);
            graphics.fillCircle(tileSprite.x, tileSprite.y, state.tileSize * 0.4);
        }

        console.log(`Tile destroyed at (${x}, ${y})`);
        return true;
    }

    // Check if a tile is destroyed
    isTileDestroyed(x, y) {
        return this.destroyedTiles.has(`${x},${y}`);
    }
}