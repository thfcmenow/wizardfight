// AI module for computer-controlled player 2
import { state } from './state.js';
import { spellData } from './config.js';
import { endTurn } from './turn.js';
import { chebyshevDistance } from './utils.js';
import {
    castOffensiveSpell,
    createIceWall,
    castShield,
    executeMove,
    setCursorTintForSpell,
    clearCursorTint,
    moveCursorToGrid
} from './actions.js';

// AI behavior configuration
const AI_CONFIG = {
    preferredAttackRange: 4,  // Try to get within this range
    thinkingDelay: 800,       // Delay before AI acts (ms)
    actionDelay: 500          // Delay between action phases (ms)
};

// Get wizard piece by player category
function getWizardByPlayer(playerNum) {
    const cat = `player${playerNum}`;
    return state.gameScene.gameBoard.pieces.find(p => p.cat === cat);
}

// Find the best offensive spell to use based on distance, availability, and clear path
function chooseBestOffensiveSpell(distance, wizard, targetWizard, gameBoard) {
    // Check if path to target is blocked by ice wall
    const obstacle = gameBoard.getObstacleInPath(wizard.x, wizard.y, targetWizard.x, targetWizard.y);

    // If blocked, don't waste a spell (unless we want to clear the wall)
    if (obstacle) {
        console.log("AI: Path to target blocked by ice wall");
        return null;
    }

    // Prefer Lightning (higher damage) if in range and available
    if (distance <= spellData["Lightning"].range && !wizard.piece.hasUsedSpell("Lightning")) {
        return "Lightning";
    }
    // Fall back to Magic Bolt if in range and available
    if (distance <= spellData["Magic Bolt"].range && !wizard.piece.hasUsedSpell("Magic Bolt")) {
        return "Magic Bolt";
    }
    return null;
}

// Check if AI should cast Shield
function shouldCastShield(aiWizard, playerWizard, distance, gameBoard) {
    // Don't cast if already used
    if (aiWizard.piece.hasUsedSpell("Shield")) {
        return false;
    }

    // Don't cast if already have shield
    if (aiWizard.piece.shield > 0) {
        return false;
    }

    // Cast Shield if:
    // 1. Not in attack range and no offensive spells available at current distance
    // 2. Or HP is getting low (defensive play)
    const hasOffensiveSpell = chooseBestOffensiveSpell(distance, aiWizard, playerWizard, gameBoard) !== null;
    const lowHp = aiWizard.piece.hp <= 8;

    // If we're far away and can't attack, shield up
    if (!hasOffensiveSpell && distance > spellData["Magic Bolt"].range) {
        return true;
    }

    // If HP is low and we haven't shielded yet
    if (lowHp) {
        return true;
    }

    return false;
}

// Find best position for Ice Wall (between AI and player)
function findIceWallPosition(aiWizard, playerWizard, gameBoard) {
    const aiX = aiWizard.x;
    const aiY = aiWizard.y;
    const playerX = playerWizard.x;
    const playerY = playerWizard.y;

    // Calculate direction from player to AI
    const dx = Math.sign(aiX - playerX);
    const dy = Math.sign(aiY - playerY);

    // Try to place wall between player and AI, closer to player
    const candidates = [];

    // Primary: directly in front of player (toward AI)
    if (dx !== 0 || dy !== 0) {
        candidates.push({ x: playerX + dx, y: playerY + dy });
        candidates.push({ x: playerX + dx * 2, y: playerY + dy * 2 });
    }

    // Secondary: adjacent to player's likely path
    candidates.push({ x: playerX + 1, y: playerY });
    candidates.push({ x: playerX - 1, y: playerY });
    candidates.push({ x: playerX, y: playerY + 1 });
    candidates.push({ x: playerX, y: playerY - 1 });

    for (const pos of candidates) {
        // Check bounds
        if (pos.x < 1 || pos.x > gameBoard.boardWidth ||
            pos.y < 1 || pos.y > gameBoard.boardHeight) {
            continue;
        }

        // Check if within Ice Wall range
        const distFromAI = chebyshevDistance(aiX, aiY, pos.x, pos.y);
        if (distFromAI > spellData["Ice Wall"].range) {
            continue;
        }

        // Check if square is empty
        const occupied = gameBoard.pieces.find(p =>
            p.x === pos.x && p.y === pos.y && p.piece !== "cursor"
        );
        if (occupied) {
            continue;
        }

        return pos;
    }

    return null;
}

// Check if AI should cast Ice Wall
function shouldCastIceWall(aiWizard, playerWizard, distance, gameBoard) {
    // Don't cast if already used
    if (aiWizard.piece.hasUsedSpell("Ice Wall")) {
        return null;
    }

    // Cast Ice Wall if:
    // 1. Player is approaching (distance 4-6) and we have no offensive spells ready
    // 2. To slow player down while we close in
    const hasOffensiveSpell = chooseBestOffensiveSpell(distance, aiWizard, playerWizard, gameBoard) !== null;

    // If player is at medium range and we can't attack, create obstacle
    if (!hasOffensiveSpell && distance >= 4 && distance <= 6) {
        return findIceWallPosition(aiWizard, playerWizard, gameBoard);
    }

    return null;
}

// Calculate best move direction toward target
function getBestMoveDirection(fromX, fromY, toX, toY, gameBoard) {
    const possibleMoves = [
        { dx: -1, dy: 0 },   // left
        { dx: 1, dy: 0 },    // right
        { dx: 0, dy: -1 },   // up
        { dx: 0, dy: 1 },    // down
        { dx: -1, dy: -1 },  // up-left
        { dx: 1, dy: -1 },   // up-right
        { dx: -1, dy: 1 },   // down-left
        { dx: 1, dy: 1 }     // down-right
    ];

    let bestMove = null;
    let bestDistance = chebyshevDistance(fromX, fromY, toX, toY);

    for (const move of possibleMoves) {
        const newX = fromX + move.dx;
        const newY = fromY + move.dy;

        // Check bounds
        if (newX < 1 || newX > gameBoard.boardWidth ||
            newY < 1 || newY > gameBoard.boardHeight) {
            continue;
        }

        // Check if square is occupied
        const occupied = gameBoard.pieces.find(p =>
            p.x === newX && p.y === newY && p.piece !== "cursor"
        );
        if (occupied) {
            continue;
        }

        // Calculate new distance to target
        const newDistance = chebyshevDistance(newX, newY, toX, toY);
        if (newDistance < bestDistance) {
            bestDistance = newDistance;
            bestMove = move;
        }
    }

    return bestMove;
}

// Execute AI move action using shared actions
function doAIMove(aiWizard, move, gameBoard) {
    const moved = executeMove(gameBoard, aiWizard, move.dx, move.dy, () => {
        endTurn();
    });

    if (!moved) {
        // Fallback if move failed
        endTurn();
    }
}

// Execute AI Ice Wall cast using shared actions
function doAIIceWall(aiWizard, targetPos) {
    const scene = state.gameScene;

    console.log(`AI casting Ice Wall at (${targetPos.x}, ${targetPos.y})`);

    // Mark spell as used
    aiWizard.piece.markSpellUsed("Ice Wall");

    // Use shared createIceWall action
    createIceWall(scene, targetPos, () => {
        endTurn();
    });
}

// Execute AI Shield cast on self using shared actions
function doAIShield(aiWizard) {
    const scene = state.gameScene;

    console.log("AI casting Shield on self");

    // Mark spell as used
    aiWizard.piece.markSpellUsed("Shield");

    // Use shared castShield action
    castShield(scene, aiWizard.piece, () => {
        endTurn();
    });
}

// Execute AI offensive spell cast using shared actions
function doAISpell(aiWizard, targetWizard, spellName) {
    const scene = state.gameScene;

    console.log(`AI casting ${spellName} at Player 1`);

    // Mark spell as used
    aiWizard.piece.markSpellUsed(spellName);

    // Visual feedback: tint cursor and move to target
    setCursorTintForSpell(scene, spellName);
    moveCursorToGrid(scene, { x: targetWizard.x, y: targetWizard.y });

    // Use shared castOffensiveSpell action
    castOffensiveSpell(
        scene,
        { x: aiWizard.x, y: aiWizard.y },
        { x: targetWizard.x, y: targetWizard.y },
        spellName,
        () => {
            clearCursorTint(scene);
            endTurn();
        }
    );
}

// Main AI turn execution
export function executeAITurn() {
    if (!state.aiEnabled || state.currentPlayer !== 2) {
        return;
    }

    const gameBoard = state.gameScene.gameBoard;
    const aiWizard = getWizardByPlayer(2);
    const playerWizard = getWizardByPlayer(1);

    if (!aiWizard || !playerWizard) {
        console.error("AI: Could not find wizard pieces");
        return;
    }

    const distance = chebyshevDistance(
        aiWizard.x, aiWizard.y,
        playerWizard.x, playerWizard.y
    );

    console.log(`AI thinking... Distance to player: ${distance}`);

    // Decide action after thinking delay
    state.gameScene.time.delayedCall(AI_CONFIG.thinkingDelay, () => {
        // First, check if we should cast Shield
        if (shouldCastShield(aiWizard, playerWizard, distance, gameBoard)) {
            doAIShield(aiWizard);
            return;
        }

        // Check if we can cast an offensive spell
        const bestSpell = chooseBestOffensiveSpell(distance, aiWizard, playerWizard, gameBoard);

        if (bestSpell) {
            // Cast spell at player
            doAISpell(aiWizard, playerWizard, bestSpell);
        } else {
            // No offensive spell available - consider Ice Wall
            const iceWallPos = shouldCastIceWall(aiWizard, playerWizard, distance, gameBoard);
            if (iceWallPos) {
                doAIIceWall(aiWizard, iceWallPos);
                return;
            }

            // Move toward player
            const move = getBestMoveDirection(
                aiWizard.x, aiWizard.y,
                playerWizard.x, playerWizard.y,
                gameBoard
            );

            if (move) {
                doAIMove(aiWizard, move, gameBoard);
            } else {
                // No valid moves - just end turn
                console.log("AI: No valid moves available");
                endTurn();
            }
        }
    });
}
