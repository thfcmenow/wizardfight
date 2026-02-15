// Grid and display settings
export const gridWidth = 7;
export const gridHeight = 6;
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

// ============================================================================
// UNIFIED SPELL REGISTRY
// ============================================================================
// All spell data in one place. Adding a new spell requires only adding one
// object to this array (plus implementing visual/audio in spells/ and audiofx/)
export const spells = [
    {
        name: "Magic Bolt",
        menuKey: "1",
        type: "offensive",
        range: 5,
        minDamage: 1,
        maxDamage: 5,
        color: 0xff6600  // Orange
    },
    {
        name: "Lightning",
        menuKey: "2",
        type: "offensive",
        range: 3,
        minDamage: 3,
        maxDamage: 10,
        color: 0x4488ff  // Blue
    },
    {
        name: "Shield",
        menuKey: "3",
        type: "selfCast",
        range: 0,
        shieldHp: 3,
        selfCast: true  // Kept for backward compatibility
    },
    {
        name: "Mighty Arrow",
        menuKey: "4",
        type: "offensive",
        range: 9,
        minDamage: 2,
        maxDamage: 5,
        color: 0x66ff66  // Green
    },
    {
        name: "Ice Wall",
        menuKey: "5",
        type: "utility",
        range: 5,
        createObstacle: true,
        color: 0x88ccff  // Light blue
    },
    {
        name: "Summon Goblin",
        menuKey: "6",
        type: "creature",
        range: 1,
        createObstacle: false,
        color: 0x88ccff  // Light blue
    }
];

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================
// These maintain the old API so existing code doesn't break

// Generate spellData object from spells array
export const spellData = Object.fromEntries(
    spells.map(spell => [spell.name, spell])
);

// Generate spell menu array from spells
const generatedSpellMenu = spells.map(spell => spell.name);

// Menu definitions
export const menus = {
    "player": {
        "root": ["Cast Spell", "Move Character", "Examine Character"],
        "spells": generatedSpellMenu  // Now dynamically generated from spells array
    },
    "player1": {
        "bio": ["Zephyr the White", "Age: 125", "School: Elemental", "Power: 8", "Defense: 5"]
    },
    "player2": {
        "bio": ["Mordecai the Dark", "Age: 340", "School: Necromancy", "Power: 6", "Defense: 7"]
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get spell configuration by menu key (e.g., "1", "2", "3")
 * @param {string} key - The menu key pressed
 * @returns {Object|undefined} - Spell configuration object or undefined
 */
export function getSpellByKey(key) {
    return spells.find(spell => spell.menuKey === key);
}

/**
 * Get spell configuration by name
 * @param {string} name - The spell name (e.g., "Magic Bolt")
 * @returns {Object|undefined} - Spell configuration object or undefined
 */
export function getSpellByName(name) {
    return spellData[name];
}

/**
 * Get all spells of a specific type
 * @param {string} type - "offensive", "selfCast", or "utility"
 * @returns {Array} - Array of spell objects matching the type
 */
export function getSpellsByType(type) {
    return spells.filter(spell => spell.type === type);
}
