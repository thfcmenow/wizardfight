// Game state - mutable values that change during gameplay
export const state = {
    bx: 0,
    by: 0,
    isSelected: false,
    keymonitor: false,
    lastx: 0,
    lasty: 0,
    lastMenu: "root",
    spellsMode: false,
    movementMode: false,
    selectedPiece: null,
    currentPlayer: 1,
    turnNumber: 1,
    gameScene: null,
    turnDialogActive: false,
    currentMenuHandler: null,
    // Targeting mode for spells
    targetingMode: false,
    targetingSpell: null,
    casterPiece: null,
    casterX: 0,
    casterY: 0,
    targetingRange: 5,
    originalCursorTexture: null,
    // Currently selected player for menu context
    selectedPlayerCat: null,
    // AI control for player 2
    aiEnabled: true,
    // Help modal / pause state
    isPaused: false,
    // Creature tracking
    player1Goblins: [],
    player2Goblins: [],
    goblinMovementMode: false
};

// Audio references (set during create)
export const audio = {
    menuclick: null,
    error: null,
    gamemusic: null,
    actionmusic: null
};
