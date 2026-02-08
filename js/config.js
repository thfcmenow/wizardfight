// Grid and display settings
export const gridWidth = 10;
export const gridHeight = 9;
export const tileSize = 90;
export const minTileSize = 50;  // Minimum tile size (enforces minimum resolution)
export const maxTileSize = 450; // Maximum tile size
export const cursorScale = 1.4;
export const cursorOpacity = 0.5;
export const characterSize = tileSize - 25;
export const characterX = 25;
export const characterY = 25;
export const spriteScale = 0.7;
export const FONT_NAME = 'minecraft';

// Spell definitions with range and damage
export const spellData = {
    "Magic Bolt": { range: 5, minDamage: 1, maxDamage: 5 },
    "Lightning": { range: 3, minDamage: 3, maxDamage: 10 },
    "Mighty Arrow": { range: 9, minDamage: 2, maxDamage: 5 },
    "Shield": { range: 0, shieldHp: 3, selfCast: true },
    "Ice Wall": { range: 5, createObstacle: true }
};

// Menu definitions
export const menus = {
    "player": {
        "root": ["Cast Spell", "Move Character", "Examine Character"],
        "spells": ["Magic Bolt", "Lightning", "Shield", "Mighty Arrow","Ice Wall"]
    },
    "player1": {
        "bio": ["Zephyr the White", "Age: 125", "School: Elemental", "Power: 8", "Defense: 5"]
    },
    "player2": {
        "bio": ["Mordecai the Dark", "Age: 340", "School: Necromancy", "Power: 6", "Defense: 7"]
    }
};
