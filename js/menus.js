// Menu rendering and handling
import { state, audio } from './state.js';
import { menus, spellData } from './config.js';
import { properCase } from './utils.js';
import { endTurn } from './turn.js';
import { playFMBell } from './audiofx/bell.js';

// Container for menu instances
let menuInstances = [];

export function renderMenu(destroy, first, second, cat, scene, x, y, toggle) {
    // If a destroy flag is set, destroy the last menu if it exists
    if (destroy && menuInstances.length) {
        const lastMenuInstance = menuInstances.pop();
        lastMenuInstance.graphics.destroy();
        lastMenuInstance.text.destroy();
        x = state.lastx;
        y = state.lasty;
        return { x, y };
    }

    // Create and display a new menu
    const menuWidth = 250;
    const menuHeight = 200;
    const screenWidth = scene.sys.game.canvas.width;
    const screenHeight = scene.sys.game.canvas.height;

    // Adjust position if menu would go off-screen
    if (x + menuWidth > screenWidth) {
        x = x - menuWidth - state.tileSize;
    }
    if (y + menuHeight > screenHeight) {
        y = y - menuHeight;
    }

    let graphics = scene.add.graphics();
    graphics.setDepth(6);
    graphics.fillStyle(0x000000, 0.8);
    graphics.fillRect(x, y, menuWidth, menuHeight);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeRect(x, y, menuWidth, menuHeight);

    graphics.setVisible(true);
    state.lastMenu = cat;

    // For spells menu, show which spells are used
    let thisMenu;
    if (second === "spells") {
        const casterPiece = scene.gameBoard.getSelectedPiece();
        thisMenu = menus[first][second].map((spellName, index) => {
            const isUsed = casterPiece && casterPiece.piece.hasUsedSpell && casterPiece.piece.hasUsedSpell(spellName);
            const suffix = isUsed ? " [USED]" : "";
            return (index + 1) + ": " + spellName + suffix + "\n";
        });
    } else {
        thisMenu = menus[first][second].map((menu, index) => index + 1 + ": " + menu + "\n");
    }
    let menuText = properCase(cat) + "\n" + thisMenu.join("") + "\nSpace: Cancel";
    let characterMenu = scene.add.text(x + 10, y + 10, menuText, {
        fill: '#ffffff',
        fontSize: 20,
        fontFamily: '"minecraft"'
    });
    characterMenu.setDepth(8);
    characterMenu.setVisible(true);

    menuInstances.push({ graphics, text: characterMenu });

    state.lastx = x;
    state.lasty = y;
    return cat;
}

// Cast a self-targeting spell (like Shield)
export function castSelfSpell(scene, spellName) {
    const casterPiece = scene.gameBoard.getSelectedPiece();
    if (!casterPiece) {
        console.error("No caster piece found");
        return;
    }

    const spell = spellData[spellName];
    if (!spell || !spell.selfCast) {
        console.error("Not a self-cast spell:", spellName);
        return;
    }

    // Mark spell as used
    casterPiece.piece.markSpellUsed(spellName);

    // Apply the spell effect
    if (spellName === "Shield") {
        casterPiece.piece.addShield(spell.shieldHp);
    }

    audio.menuclick.play();
    // playFMBell(0.3);

    // Clean up state
    state.isSelected = false;
    state.keymonitor = false;
    scene.cursorBlinkEvent.paused = false;

    console.log(`Cast ${spellName} on self`);

    // End turn after brief delay
    scene.time.delayedCall(1500, () => {
        endTurn();
    });
}

export function enterTargetingMode(scene, spellName) {
    console.log("Entering targeting mode for:", spellName);

    // Play action music
    // audio.gamemusic.stop();
    // audio.actionmusic.play();

    // Get the caster's position
    const casterPiece = scene.gameBoard.getSelectedPiece();
    if (!casterPiece) {
        console.error("No caster piece found");
        return;
    }

    // Get spell-specific range from spellData
    const spell = spellData[spellName];
    const spellRange = spell ? spell.range : 5;

    // Store targeting state
    state.targetingMode = true;
    state.targetingSpell = spellName;
    state.casterPiece = casterPiece;
    state.casterX = casterPiece.x;
    state.casterY = casterPiece.y;
    state.targetingRange = spellRange;
    state.isSelected = false;
    state.keymonitor = false;

    // Remove menu handler
    if (state.currentMenuHandler) {
        document.removeEventListener("keydown", state.currentMenuHandler);
        state.currentMenuHandler = null;
    }

    // Change cursor appearance - tint based on spell type
    let cursorTint = 0xff0000; // Default red for damage spells
    if (spellName === "Lightning") {
        cursorTint = 0x4488ff; // Blue for lightning
    } else if (spellName === "Ice Wall") {
        cursorTint = 0x88ccff; // Light blue for ice wall
    }
    scene.cursor.setTint(cursorTint);
    scene.cursorBlinkEvent.paused = false;

    console.log(`Targeting mode active. Caster at (${state.casterX}, ${state.casterY}). Range: ${spellRange} squares.`);
}

// Helper to check if a spell can be cast
function canCastSpell(scene, spellName) {
    const casterPiece = scene.gameBoard.getSelectedPiece();
    if (!casterPiece || !casterPiece.piece.hasUsedSpell) return true;
    return !casterPiece.piece.hasUsedSpell(spellName);
}

export function handleMenuKeydown(event, menu, scene) {
    if (event && event.key === "1" && state.keymonitor) {
        if (menu[parseInt(event.key) - 1]) {
            // Check if we're in spells menu and selecting a spell
            if (state.lastMenu === "spells" && state.spellsMode) {
                const selectedSpell = menus["player"]["spells"][0]; // Magic Bolt

                // Check if spell already used
                if (!canCastSpell(scene, selectedSpell)) {
                    audio.error.play();
                    console.log(`${selectedSpell} already used!`);
                    return;
                }

                renderMenu(true); // Close menu
                state.spellsMode = false;
                enterTargetingMode(scene, selectedSpell);
                return;
            }

            // Otherwise, open spells menu
            let pos = renderMenu(true);
            renderMenu(false, "player", "spells", "spells", scene, pos.x, pos.y);

            if (state.lastMenu === "spells" && !state.spellsMode) {
                state.spellsMode = true;
            }
        }
    }

    if (event && event.key === "2" && state.keymonitor) {
        if (menu[parseInt(event.key) - 1]) {
            // Check if we're in spells menu and selecting Lightning
            if (state.lastMenu === "spells" && state.spellsMode) {
                const selectedSpell = menus["player"]["spells"][1]; // Lightning

                // Check if spell already used
                if (!canCastSpell(scene, selectedSpell)) {
                    audio.error.play();
                    console.log(`${selectedSpell} already used!`);
                    return;
                }

                renderMenu(true); // Close menu
                state.spellsMode = false;
                enterTargetingMode(scene, selectedSpell);
                return;
            }

            renderMenu(true);
            // Enter movement mode
            state.movementMode = true;
            state.selectedPiece = scene.gameBoard.getSelectedPiece();
            state.isSelected = false;
            state.keymonitor = false;
            scene.cursorBlinkEvent.paused = false;
            console.log("Movement mode activated for:", state.selectedPiece);
        }
    }

    if (event && event.key === "3" && state.keymonitor) {
        if (menu[parseInt(event.key) - 1]) {
            // Check if we're in spells menu and selecting Shield
            if (state.lastMenu === "spells" && state.spellsMode) {
                const selectedSpell = menus["player"]["spells"][2]; // Shield

                // Check if spell already used
                if (!canCastSpell(scene, selectedSpell)) {
                    audio.error.play();
                    console.log(`${selectedSpell} already used!`);
                    return;
                }

                renderMenu(true); // Close menu
                state.spellsMode = false;
                castSelfSpell(scene, selectedSpell);
                return;
            }

            let pos = renderMenu(true);
            // Use the selected player's bio (player1 or player2)
            const playerCat = state.selectedPlayerCat || "player1";
            renderMenu(false, playerCat, "bio", "bio", scene, pos.x, pos.y);
        }
    }

     if (event && event.key === "4" && state.keymonitor) {
        if (menu[parseInt(event.key) - 1]) {
            // Check if we're in spells menu and Mighty Arrow
            if (state.lastMenu === "spells" && state.spellsMode) {
                const selectedSpell = menus["player"]["spells"][3]; // Mighty Arrow

                // Check if spell already used
                if (!canCastSpell(scene, selectedSpell)) {
                    audio.error.play();
                    console.log(`${selectedSpell} already used!`);
                    return;
                }

                renderMenu(true); // Close menu
                state.spellsMode = false;
                enterTargetingMode(scene, selectedSpell);
                return;
            }

            renderMenu(true);
            // Enter movement mode
            state.movementMode = true;
            state.selectedPiece = scene.gameBoard.getSelectedPiece();
            state.isSelected = false;
            state.keymonitor = false;
            scene.cursorBlinkEvent.paused = false;
            console.log("Movement mode activated for:", state.selectedPiece);
        }
    }

    if (event && event.key === "5" && state.keymonitor) {
        // Check if we're in spells menu and selecting Ice Wall
        if (state.lastMenu === "spells" && state.spellsMode) {
            const selectedSpell = menus["player"]["spells"][5]; // Ice Wall

            // Check if spell already used
            if (!canCastSpell(scene, selectedSpell)) {
                audio.error.play();
                console.log(`${selectedSpell} already used!`);
                return;
            }

            renderMenu(true); // Close menu
            state.spellsMode = false;
            enterTargetingMode(scene, selectedSpell);
            return;
        }
    }
}
