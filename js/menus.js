// Menu rendering and handling
import { state, audio } from './state.js';
import { menus, spellData, spells, getSpellByKey } from './config.js';
import { properCase } from './utils.js';
import { endTurn } from './turn.js';
import { playFMBell } from './audiofx/bell.js';

// Container for menu instances
let menuInstances = [];

export function renderMenu(destroy, first, second, cat, scene, x, y, toggle) {
    // If a destroy flag is set, destroy the last menu if it exists
    if (destroy && menuInstances.length) {
        const lastMenuInstance = menuInstances.pop();
        if (lastMenuInstance.graphics) lastMenuInstance.graphics.destroy();
        if (lastMenuInstance.text) lastMenuInstance.text.destroy();
        x = state.lastx;
        y = state.lasty;
        if (window.hideTouchMenu) window.hideTouchMenu();
        return { x, y };
    }

    // Create and display a new menu
    // const menuWidth = 280;
    // const menuHeight = 280;
    // const screenWidth = scene.sys.game.canvas.width;
    // const screenHeight = scene.sys.game.canvas.height;

    // Adjust position if menu would go off-screen
    // if (x + menuWidth > screenWidth) {
    //     x = x - menuWidth - state.tileSize;
    // }
    // if (y + menuHeight > screenHeight) {
    //     y = y - menuHeight;
    // }

    // Bubble popup disabled - bottom touch menu used instead
    // let graphics = scene.add.graphics();
    // graphics.setDepth(6);
    // graphics.fillStyle(0x000000, 0.8);
    // graphics.fillRect(x, y, menuWidth, menuHeight);
    // graphics.lineStyle(2, 0xffffff, 1);
    // graphics.strokeRect(x, y, menuWidth, menuHeight);
    // graphics.setVisible(true);

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
        thisMenu = menus[first][second].map((menu, index) => {
            let suffix = "";
            if (menu === "Control Goblin") {
                const goblinArray = state.currentPlayer === 1 ? state.player1Goblins : state.player2Goblins;
                if (goblinArray.length === 0) suffix = " [NONE]";
            }
            return (index + 1) + ": " + menu + suffix + "\n";
        });
    }
    // Bubble popup disabled - bottom touch menu used instead
    // let menuText = properCase(cat) + "\n" + thisMenu.join("") + "\nSpace: Cancel";
    // let characterMenu = scene.add.text(x + 10, y + 10, menuText, {
    //     fill: '#ffffff',
    //     fontSize: 20,
    //     fontFamily: '"minecraft"'
    // });
    // characterMenu.setDepth(8);
    // characterMenu.setVisible(true);

    menuInstances.push({ graphics: null, text: null });

    if (window.showTouchMenu) window.showTouchMenu(thisMenu);

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
    if (!spell || spell.type !== "selfCast") {
        console.error("Not a self-cast spell:", spellName);
        return;
    }

    // Mark spell as used
    casterPiece.piece.markSpellUsed(spellName);

    // Apply spell effects based on spell properties
    if (spell.shieldHp) {
        casterPiece.piece.addShield(spell.shieldHp);
    }
    if (spell.healAmount) {
        casterPiece.piece.heal(spell.healAmount);
    }
    // Future self-cast spells can add more property checks here

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

    // Change cursor appearance - tint based on spell color
    const cursorTint = spell.color || 0xff0000; // Use spell's color or default red
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
    if (!event || !state.keymonitor) return;

    const keyPressed = event.key;

    // ========================================================================
    // SPELL MENU - Dynamic spell casting based on spell registry
    // ========================================================================
    if (state.lastMenu === "spells" && state.spellsMode) {
        // Get the spell configuration by the key pressed
        const spell = getSpellByKey(keyPressed);

        if (spell) {
            console.log(`Spell selected: ${spell.name} (key: ${keyPressed})`);

            // Check if spell already used
            if (!canCastSpell(scene, spell.name)) {
                audio.error.play();
                console.log(`${spell.name} already used!`);
                return;
            }

            // Close menu
            renderMenu(true);
            state.spellsMode = false;

            // Route based on spell type
            if (spell.type === "selfCast") {
                castSelfSpell(scene, spell.name);
            } else if (spell.type === "offensive" || spell.type === "utility" || spell.type === "creature") {
                enterTargetingMode(scene, spell.name);
            } else {
                console.error(`Unknown spell type: ${spell.type}`);
            }

            return;
        }
    }

    // ========================================================================
    // ROOT MENU - Static menu options (Cast Spell, Move, Examine)
    // ========================================================================
    if (keyPressed === "1") {
        // Open spells menu
        let pos = renderMenu(true);
        renderMenu(false, "player", "spells", "spells", scene, pos.x, pos.y);

        if (state.lastMenu === "spells" && !state.spellsMode) {
            state.spellsMode = true;
        }
        return;
    }

    if (keyPressed === "2") {
        // Enter movement mode
        renderMenu(true);
        state.movementMode = true;
        state.selectedPiece = scene.gameBoard.getSelectedPiece();
        state.isSelected = false;
        state.keymonitor = false;
        scene.cursorBlinkEvent.paused = false;
        console.log("Movement mode activated for:", state.selectedPiece);
        return;
    }

    if (keyPressed === "3") {
        // Show character bio
        let pos = renderMenu(true);
        const playerCat = state.selectedPlayerCat || "player1";
        renderMenu(false, playerCat, "bio", "bio", scene, pos.x, pos.y);
        return;
    }

    if (keyPressed === "4") {
        // Control Goblin - enter goblin movement mode
        const goblinArray = state.currentPlayer === 1 ? state.player1Goblins : state.player2Goblins;

        if (goblinArray.length === 0) {
            audio.error.play();
            console.log("No goblins to control!");
            return;
        }

        renderMenu(true); // close menu

        const goblinPiece = goblinArray[0]; // auto-select first goblin

        // Move cursor to goblin position
        const cursorData = scene.gameBoard.pieces.find(p => p.piece === "cursor");
        if (cursorData) {
            cursorData.x = goblinPiece.x;
            cursorData.y = goblinPiece.y;
        }
        scene.cursor.x = state.gridToPixelX(goblinPiece.x);
        scene.cursor.y = state.gridToPixelY(goblinPiece.y);

        state.movementMode = true;
        state.goblinMovementMode = true;
        state.selectedPiece = goblinPiece;
        state.isSelected = false;
        state.keymonitor = false;
        scene.cursorBlinkEvent.paused = false;

        console.log("Goblin movement mode activated for:", goblinPiece);
        return;
    }
}
