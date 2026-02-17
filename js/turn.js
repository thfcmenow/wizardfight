// Turn management functions
import { state } from './state.js';
import { executeAITurn } from './ai.js';
import { audio } from './state.js';
import { boardFlipOut } from './utils.js';

export function isCurrentPlayerPiece(cat) {
    return cat === `player${state.currentPlayer}`;
}

export function endTurn() {
    console.log(`[endTurn] Current player: ${state.currentPlayer}, Switching to player ${state.currentPlayer === 1 ? 2 : 1}`);

    // Reset hasActed for the current player's goblins before switching
    const goblinArray = state.currentPlayer === 1 ? state.player1Goblins : state.player2Goblins;
    for (const goblinEntry of goblinArray) {
        if (goblinEntry.piece && goblinEntry.piece.hasActed !== undefined) {
            goblinEntry.piece.hasActed = false;
        }
    }

    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
    state.turnNumber++;
    console.log(`[endTurn] Turn ${state.turnNumber} - Player ${state.currentPlayer}'s turn`);
    showTurnDialog();
}

export function showTurnDialog() {
    if (!state.gameScene || state.turnDialogActive) return;

    state.turnDialogActive = true;

    const screenWidth = state.gameScene.sys.game.canvas.width;
    const screenHeight = state.gameScene.sys.game.canvas.height;
    const dialogWidth = 300;
    const dialogHeight = 100;
    const x = (screenWidth - dialogWidth) / 2;
    const y = (screenHeight - dialogHeight) / 2;

    // Create dialog background
    let graphics = state.gameScene.add.graphics();
    graphics.setDepth(10);
    graphics.fillStyle(0x000000, 0.9);
    graphics.fillRect(x, y, dialogWidth, dialogHeight);
    graphics.lineStyle(3, 0xffffff, 1);
    graphics.strokeRect(x, y, dialogWidth, dialogHeight);

    // Create dialog text
    const message = `Player ${state.currentPlayer}'s Turn`;
    let text = state.gameScene.add.text(screenWidth / 2, screenHeight / 2, message, {
        fill: '#ffffff',
        fontSize: 28,
        fontFamily: '"minecraft"'
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(11);

    // Auto-dismiss after 1.5 seconds
    state.gameScene.time.delayedCall(1500, () => {
        graphics.destroy();
        text.destroy();
        moveCursorToCurrentPlayer();
        state.turnDialogActive = false;

        // Trigger AI if it's player 2's turn and AI is enabled
        if (state.currentPlayer === 2 && state.aiEnabled) {
            executeAITurn();
        }
    });
}

export function moveCursorToCurrentPlayer() {
    if (!state.gameScene || !state.gameScene.gameBoard) return;

    const playerCat = `player${state.currentPlayer}`;
    const playerPiece = state.gameScene.gameBoard.pieces.find(p => p.cat === playerCat);

    if (playerPiece) {
        // Update cursor position in pieces array
        const cursorData = state.gameScene.gameBoard.pieces.find(p => p.piece === "cursor");
        if (cursorData) {
            cursorData.x = playerPiece.x;
            cursorData.y = playerPiece.y;
        }

        // Update visual cursor position
        state.gameScene.cursor.x = state.gridToPixelX(playerPiece.x);
        state.gameScene.cursor.y = state.gridToPixelY(playerPiece.y);
    }
}

export function showGameEndDialog(winnerPlayer) {
    if (!state.gameScene) return;

    state.turnDialogActive = true;

    const screenWidth = state.gameScene.sys.game.canvas.width;
    const screenHeight = state.gameScene.sys.game.canvas.height;
    const dialogWidth = 350;
    const dialogHeight = 120;
    const x = (screenWidth - dialogWidth) / 2;
    const y = (screenHeight - dialogHeight) / 2;

    // Create dialog background
    let graphics = state.gameScene.add.graphics();
    graphics.setDepth(10);
    graphics.fillStyle(0x000000, 0.9);
    graphics.fillRect(x, y, dialogWidth, dialogHeight);
    graphics.lineStyle(3, 0xffff00, 1);
    graphics.strokeRect(x, y, dialogWidth, dialogHeight);

    // Create dialog text
    const message = `Player ${winnerPlayer} Wins!`;
    let text = state.gameScene.add.text(screenWidth / 2, screenHeight / 2, message, {
        fill: '#ffff00',
        fontSize: 36,
        fontFamily: '"minecraft"'
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(11);

    // After 3 seconds, flip the board away then restart
    state.gameScene.time.delayedCall(3000, () => {
        graphics.destroy();
        text.destroy();
        const canvas = state.gameScene.sys.game.canvas;
        boardFlipOut(canvas, () => {
            state.gameScene.scene.restart();
        });
    });
}

export function showAttackDialog(attacker, defender, onYes, onNo) {
    if (!state.gameScene) return;

    console.log(`[showAttackDialog] ${attacker.cat} adjacent to ${defender.cat}, Player ${state.currentPlayer}'s turn`);

    state.turnDialogActive = true;
    let dialogDismissed = false;

    const screenWidth = state.gameScene.sys.game.canvas.width;
    const screenHeight = state.gameScene.sys.game.canvas.height;
    const dialogWidth = 300;
    const dialogHeight = 150;
    const x = (screenWidth - dialogWidth) / 2;
    const y = (screenHeight - dialogHeight) / 2;

    // If it's AI's turn, automatically decide to attack
    if (state.currentPlayer === 2 && state.aiEnabled) {
        console.log(`[showAttackDialog] AI auto-attacking`);
        state.turnDialogActive = false;
        if (onYes) onYes();
        return;
    }

    // Create dialog background
    let graphics = state.gameScene.add.graphics();
    graphics.setDepth(10);
    graphics.fillStyle(0x000000, 0.9);
    graphics.fillRect(x, y, dialogWidth, dialogHeight);
    graphics.lineStyle(3, 0xff6666, 1);
    graphics.strokeRect(x, y, dialogWidth, dialogHeight);

    // Create dialog text
    const message = "Attack?";
    let text = state.gameScene.add.text(screenWidth / 2, screenHeight / 2 - 20, message, {
        fill: '#ff6666',
        fontSize: 32,
        fontFamily: '"minecraft"'
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(11);

    // Build Yes / No buttons
    const scene = state.gameScene;
    const btnW = 90;
    const btnH = 40;
    const btnY = screenHeight / 2 + 38;
    const gap = 20;
    const yesBtnX = screenWidth / 2 - btnW / 2 - gap / 2;
    const noBtnX  = screenWidth / 2 + btnW / 2 + gap / 2;

    const makeBtn = (cx, label, color) => {
        const bg = scene.add.graphics();
        const draw = (hover) => {
            bg.clear();
            bg.fillStyle(hover ? 0x444444 : 0x111111, 0.95);
            bg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
            bg.lineStyle(2, color, 1);
            bg.strokeRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
        };
        draw(false);
        bg.setDepth(11);

        const txt = scene.add.text(cx, btnY, label, {
            fill: '#ffffff',
            fontSize: 18,
            fontFamily: '"minecraft"'
        });
        txt.setOrigin(0.5, 0.5);
        txt.setDepth(12);

        const zone = scene.add.zone(cx, btnY, btnW, btnH);
        zone.setDepth(13);
        zone.setInteractive({ useHandCursor: true });

        zone.on('pointerover', () => draw(true));
        zone.on('pointerout',  () => draw(false));

        return { bg, txt, zone, draw };
    };

    const yesBtn = makeBtn(yesBtnX, 'Yes (Y)', 0x66ff66);
    const noBtn  = makeBtn(noBtnX,  'No  (N)', 0xff6666);

    // Store the auto-dismiss timeout so we can cancel it
    let autoDismissEvent = null;

    const cleanup = () => {
        if (!dialogDismissed) {
            dialogDismissed = true;
            graphics.destroy();
            text.destroy();
            yesBtn.bg.destroy();
            yesBtn.txt.destroy();
            yesBtn.zone.destroy();
            noBtn.bg.destroy();
            noBtn.txt.destroy();
            noBtn.zone.destroy();
            state.turnDialogActive = false;
            document.removeEventListener("keydown", keyHandler);
            if (autoDismissEvent) {
                autoDismissEvent.remove();
            }
        }
    };

    yesBtn.zone.on('pointerdown', () => {
        cleanup();
        audio.menuclick.play();
        if (onYes) onYes();
    });

    noBtn.zone.on('pointerdown', () => {
        cleanup();
        audio.menuclick.play();
        if (onNo) onNo();
    });

    const keyHandler = (event) => {
        if (dialogDismissed) return;

        if (event.key.toLowerCase() === 'y') {
            cleanup();
            audio.menuclick.play();
            if (onYes) onYes();
        } else if (event.key.toLowerCase() === 'n') {
            cleanup();
            audio.menuclick.play();
            if (onNo) onNo();
        }
    };

    document.addEventListener("keydown", keyHandler);

    // Auto-dismiss after 10 seconds if no response
    autoDismissEvent = state.gameScene.time.delayedCall(10000, () => {
        cleanup();
        if (onNo) onNo();
    });
}