// game refactor 1 -  2024-11-01

class GameScene extends Phaser.Scene {
    constructor() {
        super();
        this.cursor = null;
        this.cursorBlinkEvent = null;
        this.gameBoard = null;
        this.keyStates = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };
        this.isSelected = false;
        this.keyMonitor = false;
    }

    preload() {
        this.load.image('tile', './assets/tile.png');
        this.load.spritesheet('white_wizard', './assets/white_wizard_idle.png', { 
            frameWidth: 100, 
            frameHeight: 100 
        });
        this.load.spritesheet('cartohison_wizard', './assets/white_wizard.png', { 
            frameWidth: 100, 
            frameHeight: 100 
        });
        this.load.image('cursor', './assets/cursor2.png');
    }

    create() {
        this.setupCursor();
        this.createGrid();
        this.setupGameBoard();
        this.setupInputHandling();
    }

    setupCursor() {
        this.cursor = this.add.image(
            GRID_CONFIG.tileSize + (GRID_CONFIG.tileSize / 2),
            GRID_CONFIG.tileSize + (GRID_CONFIG.tileSize / 2),
            'cursor'
        );
        this.cursor.setDepth(4);

        this.cursorBlinkEvent = this.time.addEvent({
            delay: 500,
            callback: () => this.cursor.visible = !this.cursor.visible,
            loop: true
        });
    }

    createGrid() {
        const widthMax = Math.floor(this.sys.game.canvas.width / GRID_CONFIG.tileSize);
        const heightMax = Math.floor(this.sys.game.canvas.height / GRID_CONFIG.tileSize);

        for (let y = 1; y < heightMax - 1; y++) {
            for (let x = 1; x < widthMax - 1; x++) {
                const tile = this.add.image(
                    x * GRID_CONFIG.tileSize + (GRID_CONFIG.tileSize / 2),
                    y * GRID_CONFIG.tileSize + (GRID_CONFIG.tileSize / 2),
                    'tile'
                )
                .setDepth(2)
                .setDisplaySize(GRID_CONFIG.tileSize, GRID_CONFIG.tileSize);
            }
        }
    }

    setupGameBoard() {
        this.gameBoard = new GameBoard(this, GRID_CONFIG.width, GRID_CONFIG.height);
        
        const whiteWizard = new Wizard(this, 2, 2, 'white_wizard', 0.5);
        const cartoonWizard = new Wizard(this, 2, 2, 'white_wizard', 0.5);
        
        this.gameBoard.addPiece(whiteWizard, 1, 1, "player");
        this.gameBoard.addPiece(cartoonWizard, this.gameBoard.boardWidth, 
            this.gameBoard.boardHeight, "player");
    }

    setupInputHandling() {
        const cursors = this.input.keyboard.createCursorKeys();
        
        // Handle movement keys
        ['left', 'right', 'up', 'down', 'space'].forEach(key => {
            cursors[key].on('down', () => this.handleKeyDown(key));
            cursors[key].on('up', () => this.handleKeyUp(key));
        });
    }

    handleKeyDown(key) {
        if (this.keyStates[key] || (key !== 'space' && this.isSelected)) return;

        this.keyStates[key] = true;
        
        if (key === 'space') {
            this.handleSpaceKey();
        } else {
            this.handleMovementKey(key);
        }
    }

    handleKeyUp(key) {
        this.keyStates[key] = false;
    }

    handleSpaceKey() {
        this.isSelected = !this.isSelected;
        
        if (this.isSelected) {
            const proceed = this.gameBoard.selectBox(this.cursor.x, this.cursor.y);
            this.cursor.visible = true;
            
            if (!proceed) {
                this.isSelected = false;
                this.blinkCursor();
            }
        } else {
            this.gameBoard.toggleMenu(0, 0, false);
            this.keyMonitor = false;
        }
    }

    handleMovementKey(key) {
        const movement = {
            left: { x: -1, check: pos => pos.x - 1 === 0 },
            right: { x: 1, check: pos => pos.x + 1 === this.gameBoard.boardWidth + 1 },
            up: { y: -1, check: pos => pos.y - 1 === 0 },
            down: { y: 1, check: pos => pos.y + 1 === this.gameBoard.boardHeight + 1 }
        };

        const move = movement[key];
        const pos = this.gameBoard.reportCursor();
        
        if (move.check(pos)) return;

        if (move.x) {
            this.cursor.x += move.x * GRID_CONFIG.tileSize;
            this.gameBoard.alterCursor("x", move.x);
        } else {
            this.cursor.y += move.y * GRID_CONFIG.tileSize;
            this.gameBoard.alterCursor("y", move.y);
        }
    }

    blinkCursor() {
        this.cursor.visible = false;
        this.time.delayedCall(100, () => {
            this.cursor.visible = true;
        });
    }

    update() {
        // Clamp cursor position
        this.cursor.x = Phaser.Math.Clamp(
            this.cursor.x, 
            0, 
            (GRID_CONFIG.width - 1) * GRID_CONFIG.tileSize
        );
        this.cursor.y = Phaser.Math.Clamp(
            this.cursor.y, 
            0, 
            (GRID_CONFIG.height - 1) * GRID_CONFIG.tileSize
        );
    }
}


// Configuration object with scene class
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: 'black',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: GameScene
};

// Constants
const GRID_CONFIG = {
    width: 18,
    height: 12,
    tileSize: 50,
    characterSize: 25,
    spriteScale: 1
};

const MENUS = {
    player: {
        root: ["Cast Spell", "Move Character", "Examine Character"]
    },
    spells: ["spell A", "spell B", "spell C", "spell D", "spell E", "spell F"]
};

// Main Game Scene

// Configuration and GameScene class remain the same as before...

// Wizard Class
class Wizard {
    /**
     * @param {Phaser.Scene} scene - The scene this wizard belongs to
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     * @param {string} spriteKey - Key for the sprite sheet
     * @param {number} scale - Scale factor for the sprite
     * @param {boolean} animate - Whether to animate the sprite
     */
    constructor(scene, x, y, spriteKey, scale = 1, animate = true) {
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, spriteKey)
            .setScale(scale)
            .setDepth(3);

        if (animate) {
            this.setupAnimation(spriteKey);
        }
    }

    setupAnimation(spriteKey) {
        const animConfig = {
            key: 'idle',
            frames: this.scene.anims.generateFrameNumbers(spriteKey, { 
                start: 0, 
                end: 3 
            }),
            frameRate: 8,
            repeat: -1
        };

        // Only create animation if it doesn't exist
        if (!this.scene.anims.exists('idle')) {
            this.scene.anims.create(animConfig);
        }

        this.sprite.play('idle');
    }

    /**
     * Move the wizard to a new position
     * @param {number} x - New x position
     * @param {number} y - New y position
     * @param {boolean} animate - Whether to animate the movement
     */
    moveTo(x, y, animate = true) {
        if (animate) {
            this.scene.tweens.add({
                targets: this.sprite,
                x,
                y,
                duration: 500,
                ease: 'Power2'
            });
        } else {
            this.sprite.setPosition(x, y);
        }
    }

    destroy() {
        this.sprite.destroy();
    }
}

// GameBoard Class
class GameBoard {
    /**
     * @param {Phaser.Scene} scene - The scene this board belongs to
     * @param {number} gridWidth - Width of the grid in tiles
     * @param {number} gridHeight - Height of the grid in tiles
     */
    constructor(scene, gridWidth, gridHeight) {
        this.scene = scene;
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.pieces = new Map(); // Using Map for better performance with frequent lookups
        this.menuSystem = new MenuSystem(scene);
        this.boardWidth = 0;
        this.boardHeight = 0;
    }

    setupBoardDimensions(width, height) {
        this.boardWidth = width;
        this.boardHeight = height;
    }

    setupCursor() {
        this.pieces.set('cursor', { 
            piece: 'cursor', 
            x: 1, 
            y: 1, 
            cat: 'cursor' 
        });
    }

    reportCursor() {
        const cursor = this.pieces.get('cursor');
        return cursor ? { x: cursor.x, y: cursor.y } : null;
    }

    alterCursor(dimension, value) {
        const cursor = this.pieces.get('cursor');
        if (cursor) {
            cursor[dimension] += value;
        }
    }

    /**
     * @param {Wizard} piece - The game piece to add
     * @param {number} x - Grid x position
     * @param {number} y - Grid y position
     * @param {string} category - Category of the piece
     */
    addPiece(piece, x, y, category) {
        if (!this.isValidPosition(x, y)) {
            console.error("Invalid position for piece:", x, y);
            return false;
        }

        const id = `piece_${x}_${y}`;
        this.pieces.set(id, {
            piece,
            x,
            y,
            cat: category
        });

        const pixelPos = this.gridToPixel(x, y);
        piece.sprite.setPosition(pixelPos.x, pixelPos.y);

        return true;
    }

    /**
     * Convert grid coordinates to pixel coordinates
     */
    gridToPixel(gridX, gridY) {
        return {
            x: gridX * GRID_CONFIG.tileSize + (GRID_CONFIG.tileSize / 2),
            y: gridY * GRID_CONFIG.tileSize + (GRID_CONFIG.tileSize / 2)
        };
    }

    isValidPosition(x, y) {
        return x >= 0 && 
               x < this.gridWidth && 
               y >= 0 && 
               y < this.gridHeight;
    }

    selectBox(x, y) {
        const cursor = this.pieces.get('cursor');
        if (!cursor) return false;

        // Find piece at cursor position
        const pieceId = `piece_${cursor.x}_${cursor.y}`;
        const selectedPiece = this.pieces.get(pieceId);

        if (selectedPiece && selectedPiece.cat !== 'cursor') {
            const pixelPos = this.gridToPixel(cursor.x, cursor.y);
            this.menuSystem.toggle(true, pixelPos.x, pixelPos.y, selectedPiece.cat);
            return true;
        }

        return false;
    }
}

// Menu System Class (Separated from GameBoard for better organization)
class MenuSystem {
    constructor(scene) {
        this.scene = scene;
        this.graphics = null;
        this.text = null;
        this.currentMenu = null;
    }

    toggle(show, x, y, category) {
        if (show) {
            this.show(x, y, category);
        } else {
            this.hide();
        }
    }

    show(x, y, category) {
        // Create menu background
        this.graphics = this.scene.add.graphics()
            .setDepth(6)
            .fillStyle(0x000000, 0.8)
            .fillRect(x, y, 250, 200)
            .lineStyle(2, 0xffffff, 1)
            .strokeRect(x, y, 250, 200);

        // Generate menu text
        const menuItems = MENUS[category]?.root || [];
        const menuText = this.formatMenuText(category, menuItems);

        // Create menu text
        this.text = this.scene.add.text(x + 10, y + 10, menuText, {
            fill: '#ffffff',
            fontSize: 20,
            fontFamily: 'minecraft'
        }).setDepth(8);

        // Setup menu controls
        this.setupMenuControls(menuItems);
    }

    formatMenuText(category, items) {
        const title = category.charAt(0).toUpperCase() + category.slice(1);
        const options = items.map((item, index) => `${index + 1}: ${item}`).join('\n');
        return `${title}\n${options}\nSpace: Cancel`;
    }

    setupMenuControls(menuItems) {
        const handleInput = (event) => {
            const index = parseInt(event.key) - 1;
            if (index >= 0 && index < menuItems.length) {
                console.log('Selected:', menuItems[index]);
            }
        };

        document.addEventListener('keydown', handleInput);
        this.currentMenu = handleInput; // Store for cleanup
    }

    hide() {
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
        }
        if (this.text) {
            this.text.destroy();
            this.text = null;
        }
        if (this.currentMenu) {
            document.removeEventListener('keydown', this.currentMenu);
            this.currentMenu = null;
        }
    }
}


const game = new Phaser.Game(config);

