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
import { castOffensiveSpell, createIceWall, summonGoblin, executeMove } from './actions.js';

// debugging
import { showMeleeHitEffect } from './actions.js';

// Helper function to convert screen coordinates to grid coordinates
function screenToGrid(px, py) {
    // Ensure state and tileSize are accessible
    // state.offsetX and state.offsetY are already calculated in create()
    const scene = state.gameScene;
    // Calculate gridX and gridY based on screen coordinates, offset, and tile size
    const gridX = ((px - state.offsetX - (state.tileSize / 2)) / state.tileSize) + 1;
    const gridY = ((py - state.offsetY - (state.tileSize / 2)) / state.tileSize) + 1;
    // Round to nearest integer for grid coordinates
    return { x: Math.round(gridX), y: Math.round(gridY) };
}

// Show floating movement key hints around player 1 at game start
function showMovementHint(scene) {
    const player1Piece = scene.gameBoard.pieces.find(p => p.cat === 'player1');
    if (!player1Piece) return;

    const cx = state.gridToPixelX(player1Piece.x);
    const cy = state.gridToPixelY(player1Piece.y);
    const ts = state.tileSize;

    const keys = [
        { label: 'Q', dx: -1, dy: -1 },
        { label: 'W', dx:  0, dy: -1 },
        { label: 'E', dx:  1, dy: -1 },
        { label: 'A', dx: -1, dy:  0 },
        { label: 'D', dx:  1, dy:  0 },
        { label: 'Z', dx: -1, dy:  1 },
        { label: 'X', dx:  0, dy:  1 },
        { label: 'C', dx:  1, dy:  1 },
    ];

    const containers = [];

    for (const k of keys) {
        const x = cx + k.dx * ts * 0.5;
        const y = cy + k.dy * ts * 0.5;

        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.75);
        bg.fillRoundedRect(-15, -15, 30, 30, 5);
        bg.lineStyle(2, 0xffffff, 0.9);
        bg.strokeRoundedRect(-15, -15, 30, 30, 5);

        const text = scene.add.text(0, 1, k.label, {
            fontSize: '16px',
            fontFamily: '"minecraft"',
            fill: '#ffffff',
        });
        text.setOrigin(0.5, 0.5);

        const container = scene.add.container(x, y, [bg, text]);
        container.setDepth(15);
        containers.push(container);

        // Each key bobs independently with a slight stagger
        scene.tweens.add({
            targets: container,
            y: y - 7,
            duration: 750,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: (keys.indexOf(k) / keys.length) * 400,
        });
    }

    // "S - Select" bar spanning the width of the Z/X/C row
    const barY = cy + ts * 0.5 + 36;
    const barWidth = ts + 30;
    const barHeight = 28;

    const barBg = scene.add.graphics();
    barBg.fillStyle(0x000000, 0.75);
    barBg.fillRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, 5);
    barBg.lineStyle(2, 0xffffff, 0.9);
    barBg.strokeRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, 5);

    const barText = scene.add.text(0, 1, 'S - Select', {
        fontSize: '14px',
        fontFamily: '"minecraft"',
        fill: '#ffffff',
    });
    barText.setOrigin(0.5, 0.5);

    const barContainer = scene.add.container(cx, barY, [barBg, barText]);
    barContainer.setDepth(15);
    containers.push(barContainer);

    scene.tweens.add({
        targets: barContainer,
        y: barY - 7,
        duration: 750,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 200,
    });

    // Fade out after 4 seconds then destroy
    scene.time.delayedCall(4000, () => {
        scene.tweens.add({
            targets: containers,
            alpha: 0,
            duration: 600,
            onComplete: () => containers.forEach(c => c.destroy()),
        });
    });
}

// Show the help / pause modal
function showHelpModal(scene) {
    if (state.isPaused) return;
    state.isPaused = true;

    const sw = scene.sys.game.canvas.width;
    const sh = scene.sys.game.canvas.height;
    const modalWidth = Math.min(500, sw - 60);
    const modalHeight = Math.min(500, sh - 60);
    const mx = sw / 2;
    const my = sh / 2;

    const elements = [];

    // Dark overlay
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, sw, sh);
    overlay.setDepth(30);
    elements.push(overlay);

    // Modal box
    const modal = scene.add.graphics();
    modal.fillStyle(0x111111, 0.97);
    modal.fillRoundedRect(mx - modalWidth / 2, my - modalHeight / 2, modalWidth, modalHeight, 8);
    modal.lineStyle(3, 0xffffff, 1);
    modal.strokeRoundedRect(mx - modalWidth / 2, my - modalHeight / 2, modalWidth, modalHeight, 8);
    modal.setDepth(31);
    elements.push(modal);

    // "- Paused -" title
    const title = scene.add.text(mx, my - modalHeight / 2 + 28, '- Paused -', {
        fontSize: '22px',
        fontFamily: '"minecraft"',
        fill: '#ffffff',
    });
    title.setOrigin(0.5, 0.5);
    title.setDepth(32);
    elements.push(title);

    // Divider under title
    const divider = scene.add.graphics();
    divider.lineStyle(1, 0x888888, 0.8);
    divider.lineBetween(
        mx - modalWidth / 2 + 20, my - modalHeight / 2 + 52,
        mx + modalWidth / 2 - 20, my - modalHeight / 2 + 52
    );
    divider.setDepth(32);
    elements.push(divider);

    // =============================================
    // ADD HELP CONTENT HERE
    // Each entry in helpLines is one row of text.
    // Lines render from top of the content area (~75px below modal top)
    // downward at 22px spacing, centered on mx.
    // Font: 13px minecraft, color #cccccc.
    // =============================================
    const helpLines = [
        "Welcome to WizardFight",
        "-",
        "You can select one spell at a time",
        "Warning: Some spells have limited range",
        "Melee combat is available after movement",
        "-",
        "Arrow keys / WASD  -  Move cursor",
        'S / Space -  Select',
        '1  -  Open spell menu',
        '2  -  Open movement menu',
        '3  -  Examine character',
        '4  -  Control goblin (if you have one)',
        "-",
        "Version: 2026-02-15",
    ];

    let lineY = my - modalHeight / 2 + 75;
    for (const line of helpLines) {
        const t = scene.add.text(mx, lineY, line, {
            fontSize: '17px',
            fontFamily: '"minecraft"',
            fill: '#cccccc',
        });
        t.setOrigin(0.5, 0);
        t.setDepth(32);
        elements.push(t);
        lineY += 22;
    }

    // "Return To Game" button
    const btnW = 200;
    const btnH = 36;
    const btnX = mx;
    const btnY = my + modalHeight / 2 - 36;

    const btnBg = scene.add.graphics();
    const drawBtn = (hover) => {
        btnBg.clear();
        btnBg.fillStyle(hover ? 0x444444 : 0x222222, 1);
        btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 5);
        btnBg.lineStyle(2, 0xffffff, hover ? 1 : 0.9);
        btnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 5);
    };
    drawBtn(false);
    btnBg.setDepth(32);
    elements.push(btnBg);

    const btnText = scene.add.text(btnX, btnY, 'Return To Game', {
        fontSize: '14px',
        fontFamily: '"minecraft"',
        fill: '#ffffff',
    });
    btnText.setOrigin(0.5, 0.5);
    btnText.setDepth(33);
    elements.push(btnText);

    const btnZone = scene.add.zone(btnX, btnY, btnW, btnH);
    btnZone.setDepth(34);
    btnZone.setInteractive({ useHandCursor: true });
    elements.push(btnZone);

    const closeModal = () => {
        elements.forEach(e => e.destroy());
        state.isPaused = false;
    };

    btnZone.on('pointerdown', closeModal);
    btnZone.on('pointerover', () => drawBtn(true));
    btnZone.on('pointerout',  () => drawBtn(false));
}

// Create the persistent "?" help button in the top-right corner
function createHelpButton(scene) {
    const btnSize = 34;
    const padding = 16;
    const x = scene.sys.game.canvas.width - padding - btnSize / 2;
    const y = padding + btnSize / 2;

    const bg = scene.add.graphics();
    const drawBg = (hover) => {
        bg.clear();
        bg.fillStyle(hover ? 0x333333 : 0x000000, hover ? 0.9 : 0.75);
        bg.fillRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 5);
        bg.lineStyle(2, 0xffffff, hover ? 1 : 0.9);
        bg.strokeRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 5);
    };
    drawBg(false);

    const label = scene.add.text(0, 1, '?', {
        fontSize: '18px',
        fontFamily: '"minecraft"',
        fill: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    const container = scene.add.container(x, y, [bg, label]);
    container.setDepth(20);
    container.setSize(btnSize, btnSize);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => showHelpModal(scene));
    container.on('pointerover', () => drawBg(true));
    container.on('pointerout',  () => drawBg(false));
}

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
        pixelArt: false, // Add this as true if you're doing retro styles!
        resolution: window.devicePixelRatio || 1,
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
    state.isPaused = false;
    state.player1Goblins = [];
    state.player2Goblins = [];
    state.goblinMovementMode = false;

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

    // Swipe detection for touch devices
    const holdDurationThreshold = 300; // ms

    this.input.on('pointerdown', (pointer) => {
        this._swipeStartX = pointer.x;
        this._swipeStartY = pointer.y;
        // Record start time for hold detection
        state.holdStartTime = this.time.now;
        // Reset gesture type and clear previous swipe for new gesture
        state.gestureType = null;
        state.swipeDirection = null;
    });
    this.input.on('pointerup', (pointer) => {
        // Calculate hold duration
        const holdDuration = this.time.now - state.holdStartTime;
        const dx = pointer.x - this._swipeStartX;
        const dy = pointer.y - this._swipeStartY;
        const minSwipe = 40;

        // Determine gesture type
        if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
            // It's either a tap or a hold
            if (holdDuration < holdDurationThreshold) {
                state.gestureType = 'tap';
                // Store tap coordinates
                state.tapX = pointer.x;
                state.tapY = pointer.y;
            } else {
                state.gestureType = 'hold';
            }
        } else {
            // It's a swipe
            state.gestureType = 'swipe';
            if (Math.abs(dx) >= Math.abs(dy)) {
                state.swipeDirection = dx > 0 ? 'right' : 'left';
            } else {
                state.swipeDirection = dy > 0 ? 'down' : 'up';
            }
        }
        // Reset hold start time after gesture is processed
        state.holdStartTime = null;
    });

    // Help button (top-right corner)
    createHelpButton(this);

    // Show initial turn dialog
    showTurnDialog();

    // Show movement key hints around player 1 after the opening dialog clears (desktop only)
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!isMobile) {
        this.time.delayedCall(1700, () => {
            showMovementHint(this);
        });
    }

    // debugging: show melee hit effect at center of grid after 1 seconds
    console.log("TEST: testMeleeEffect() will show a melee hit effect");
    window.testMeleeEffect = () => {
        showMeleeHitEffect(this, 450, 405); 
    }

}

async function update() {
    // Block input while turn dialog is showing or help modal is open
    if (state.turnDialogActive) return;
    if (state.isPaused) return;

    const cursors = this.input.keyboard.createCursorKeys();
    const keys = this.keys;

    // Consume pending swipe as a one-shot dx/dy
    let swipeDx = 0;
    let swipeDy = 0;
    if (state.swipeDirection) {
        if (state.swipeDirection === 'left')  swipeDx = -1;
        if (state.swipeDirection === 'right') swipeDx =  1;
        if (state.swipeDirection === 'up')    swipeDy = -1;
        if (state.swipeDirection === 'down')  swipeDy =  1;
        state.swipeDirection = null;
    }

    // Targeting mode - select target for spell
    if (state.targetingMode) {
        let dx = swipeDx;
        let dy = swipeDy;

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

        // TAP in targeting mode: jump cursor to tapped position AND fire spell immediately
        if (state.gestureType === 'tap' && state.tapX !== null) {
            const tappedGrid = screenToGrid(state.tapX, state.tapY);
            state.tapX = null;
            state.tapY = null;
            state.gestureType = null;

            const distX = Math.abs(tappedGrid.x - state.casterX);
            const distY = Math.abs(tappedGrid.y - state.casterY);
            const distance = Math.max(distX, distY);
            const inBounds = tappedGrid.x >= 1 && tappedGrid.x <= state.bx &&
                             tappedGrid.y >= 1 && tappedGrid.y <= state.by;

            if (distance === 0) {
                audio.error.play();
                console.log("Can't target yourself!");
            } else if (!inBounds || distance > state.targetingRange) {
                audio.error.play();
                console.log("Target out of range!");
            } else {
                // Move cursor to tapped position
                const cursorPos = this.gameBoard.reportCursor();
                const deltaX = tappedGrid.x - cursorPos.x;
                const deltaY = tappedGrid.y - cursorPos.y;
                this.cursor.x = state.gridToPixelX(tappedGrid.x);
                this.cursor.y = state.gridToPixelY(tappedGrid.y);
                if (deltaX !== 0) this.gameBoard.alterCursor("x", deltaX);
                if (deltaY !== 0) this.gameBoard.alterCursor("y", deltaY);

                // Fire the spell
                audio.menuclick.play();
                this.cursor.clearTint();

                const tapScene = this;
                const tapTargetX = tappedGrid.x;
                const tapTargetY = tappedGrid.y;
                const tapSpell = state.targetingSpell;

                if (state.casterPiece && state.casterPiece.piece.markSpellUsed) {
                    state.casterPiece.piece.markSpellUsed(tapSpell);
                }

                if (tapSpell === "Summon Goblin") {
                    const success = summonGoblin(tapScene, { x: tapTargetX, y: tapTargetY }, state.currentPlayer, () => {
                        state.casterPiece = null;
                        state.targetingSpell = null;
                        endTurn();
                    });
                    if (!success) {
                        if (state.casterPiece && state.casterPiece.piece.usedSpells) {
                            state.casterPiece.piece.usedSpells.delete(tapSpell);
                        }
                        return;
                    }
                    state.targetingMode = false;
                    return;
                }

                if (tapSpell === "Ice Wall") {
                    const success = createIceWall(tapScene, { x: tapTargetX, y: tapTargetY }, () => {
                        state.casterPiece = null;
                        state.targetingSpell = null;
                        endTurn();
                    });
                    if (!success) {
                        if (state.casterPiece && state.casterPiece.piece.usedSpells) {
                            state.casterPiece.piece.usedSpells.delete(tapSpell);
                        }
                        state.targetingMode = false;
                        state.casterPiece = null;
                        state.targetingSpell = null;
                        return;
                    }
                    state.targetingMode = false;
                    return;
                }

                castOffensiveSpell(
                    tapScene,
                    { x: state.casterX, y: state.casterY },
                    { x: tapTargetX, y: tapTargetY },
                    tapSpell,
                    () => {
                        state.casterPiece = null;
                        state.targetingSpell = null;
                        endTurn();
                    }
                );

                state.targetingMode = false;
            }
        }

        // Confirm target with Space, S, or HOLD TAP
        if ((cursors.space.isDown || keys.S.isDown || state.gestureType === 'hold') && !this.spaceKeyDown) {
            audio.menuclick.play();
            this.spaceKeyDown = true;
            state.gestureType = null; // Consume the hold gesture

            const cursorPos = this.gameBoard.reportCursor();

            // Calculate distance to confirm it's in range
            const distX = Math.abs(cursorPos.x - state.casterX);
            const distY = Math.abs(cursorPos.y - state.casterY);
            const distance = Math.max(distX, distY);

            if (distance > 0 && distance <= state.targetingRange) {
                // Fire the spell!
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

                // Handle Summon Goblin (creates creature, no damage)
                if (currentSpell === "Summon Goblin") {
                    const success = summonGoblin(scene, { x: targetX, y: targetY }, state.currentPlayer, () => {
                        state.casterPiece = null;
                        state.targetingSpell = null;
                        endTurn();
                    });

                    if (!success) {
                        // Unmark the spell since it failed
                        if (state.casterPiece && state.casterPiece.piece.usedSpells) {
                            state.casterPiece.piece.usedSpells.delete(currentSpell);
                        }
                        // Stay in targeting mode so player can pick another square
                        return;
                    }

                    state.targetingMode = false;
                    return;
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
            state.gestureType = null; // Consume the hold gesture if it was active
        } else if (escKey.isUp) {
            this.escKeyDown = false;
        }

        return; // Don't process other inputs while targeting
    }

    // Movement mode - move the selected piece
    if (state.movementMode && state.selectedPiece) {
        let dx = swipeDx;
        let dy = swipeDy;

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
                state.goblinMovementMode = false;
                state.selectedPiece = null;
                endTurn();
            });

            if (!moved) {
                audio.error.play();
            }
        }

        // Cancel movement mode with space, S, or HOLD TAP
        if ((cursors.space.isDown || keys.S.isDown || state.gestureType === 'hold') && !this.spaceKeyDown) {
            audio.menuclick.play();
            state.movementMode = false;
            state.goblinMovementMode = false;
            state.selectedPiece = null;
            this.spaceKeyDown = true;
            state.gestureType = null; // Consume the hold gesture
            console.log("Movement cancelled");
        } else if (cursors.space.isUp && keys.S.isUp) {
            this.spaceKeyDown = false;
        }
        return;
    }

    // Handle Tap gesture (Selection)
    if (state.gestureType === 'tap') {
        if (state.tapX !== null && state.tapY !== null) {
            const gridPos = screenToGrid(state.tapX, state.tapY);

            // Calculate cursor movement delta
            const currentCursorGridPos = this.gameBoard.reportCursor();
            const diffX = gridPos.x - currentCursorGridPos.x;
            const diffY = gridPos.y - currentCursorGridPos.y;

            // Move cursor visually and update its internal grid position
            this.cursor.x = state.gridToPixelX(gridPos.x);
            this.cursor.y = state.gridToPixelY(gridPos.y);
            if (diffX !== 0) this.gameBoard.alterCursor("x", diffX);
            if (diffY !== 0) this.gameBoard.alterCursor("y", diffY);
            audio.menuclick.play(); // Sound for cursor movement

            // If not in a mode that requires confirmation (hold), a tap should select the square/piece.
            // This includes selecting a piece, or just moving the cursor to an empty tile.
            // The `state.isSelected` state should be managed by `gameBoard.selectBox`.
            // We call selectBox if we are not in a mode that overrides selection.
            if (!state.movementMode && !state.targetingMode && !state.spellsMode && !state.isPaused) {
                 // Attempt to select the piece/tile at the new cursor location.
                 // `selectBox` is expected to handle updating `state.isSelected` if it selects a piece.
                 this.gameBoard.selectBox(this.cursor.x, this.cursor.y); // Pixel coords for selectBox
            }
            // If in movement or targeting mode, a tap just moves the cursor; confirmation is via hold.

            // Clear stored tap coordinates
            state.tapX = null;
            state.tapY = null;
        }
        // Consume the tap gesture
        state.gestureType = null;
    }

    // Swipe cursor movement
    if ((swipeDx !== 0 || swipeDy !== 0) && !state.isSelected) {
        const pos = this.gameBoard.reportCursor();
        const newX = pos.x + swipeDx;
        const newY = pos.y + swipeDy;
        if (newX >= 1 && newX <= state.bx && newY >= 1 && newY <= state.by) {
            this.cursor.x += swipeDx * state.tileSize;
            this.cursor.y += swipeDy * state.tileSize;
            this.gameBoard.alterCursor("x", swipeDx);
            this.gameBoard.alterCursor("y", swipeDy);
            audio.menuclick.play();
        } else {
            audio.error.play();
        }
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

    // Space, S, or HOLD TAP - select/deselect
    if ((cursors.space.isDown || keys.S.isDown || state.gestureType === 'hold') && !this.spaceKeyDown) {
        audio.menuclick.play();
        this.spaceKeyDown = true;
        state.gestureType = null; // Consume the hold gesture

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
