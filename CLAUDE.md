# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wizard Fight is a browser-based tactical grid combat game built with Phaser 3, Express.js, and ES6 modules. Two wizards battle on a grid using turn-based movement, ranged spells, and melee attacks. Features include AI opponent, spell cooldowns, shield mechanics, destructible ice walls, and Minecraft-style fonts.

## Quick Start

```bash
# Install dependencies
npm install

# Start server (runs on http://localhost:3000)
node server.js
```

Visit http://localhost:3000 in your browser to play.

No test framework, linting, or build tools are currently configured.

## Architecture Overview

### Module Structure (js/)

```
js/
├── game.js         # Main Phaser scene (preload, create, update loop)
├── config.js       # Grid settings, spell data, menu definitions
├── state.js        # Centralized mutable game state and audio references
├── turn.js         # Turn management and dialog overlays
├── menus.js        # Menu rendering and keyboard input handling
├── actions.js      # Shared action execution (spell casting, movement, melee)
├── utils.js        # Utility functions (gridToPixel, properCase, etc.)
├── ai.js           # AI decision-making for Player 2
├── Wizard.js       # Wizard class - animated sprite, HP, shields, spell tracking
├── GameBoard.js    # GameBoard class - piece management, collision, pathfinding
├── IceWall.js      # IceWall class - destructible obstacle
├── spells/         # Spell projectile implementations
│   ├── bolt.js     # Magic Bolt visual effects
│   ├── lightning.js # Lightning visual effects
│   └── arrow.js    # Mighty Arrow visual effects
└── audiofx/        # Procedural audio generation
    ├── bolt.js     # Magic Bolt sound
    ├── lightning.js # Lightning sound
    ├── thud.js     # Impact sound
    └── bell.js     # Menu sound
```

### Entry Points

- **index.html** - Loads Phaser 3 and `js/game.js` as ES6 module
- **server.js** - Express.js static file server

### Key Configuration (config.js)

```javascript
export const gridWidth = 10;    // Tiles horizontally
export const gridHeight = 9;    // Tiles vertically
export const tileSize = 90;     // Pixels per tile (dynamic)
export const spriteScale = 0.7; // Wizard display size

export const spellData = {
    "Magic Bolt": { range: 5, minDamage: 1, maxDamage: 5 },
    "Lightning": { range: 3, minDamage: 3, maxDamage: 10 },
    "Shield": { range: 0, shieldHp: 3, selfCast: true },
    "Mighty Arrow": { range: 9, minDamage: 2, maxDamage: 5 },
    "Ice Wall": { range: 5, createObstacle: true }
};

export const menus = {
    "player": {
        "root": ["Cast Spell", "Move Character", "Examine Character"],
        "spells": ["Magic Bolt", "Lightning", "Shield", "Mighty Arrow", "Ice Wall"]
    },
    "player1": {
        "bio": ["Zephyr the White", "Age: 125", ...]
    },
    "player2": {
        "bio": ["Mordecai the Dark", "Age: 340", ...]
    }
};
```

### Game State (state.js)

Centralized mutable state tracking:

```javascript
export const state = {
    currentPlayer: 1,          // 1 or 2
    turnNumber: 1,
    isSelected: false,
    movementMode: false,
    selectedPiece: null,
    targetingMode: false,      // Active when selecting spell target
    targetingSpell: null,      // Current spell being cast
    casterPiece: null,
    targetingRange: 5,
    aiEnabled: true,           // AI controls player 2
    // ... more state fields
};

export const audio = {
    menuclick: null,
    error: null,
    gamemusic: null,
    actionmusic: null
};
```

### Core Modules

**game.js**: Phaser scene lifecycle
- `preload()` - Load assets (images, spritesheets, audio)
- `create()` - Initialize game board, wizards, cursor, music
- `update()` - Handle movement mode, targeting mode, cursor input

**turn.js**: Turn management
- `endTurn()` - Switch players, reset spell cooldowns, trigger AI
- `showTurnDialog()` - Display "Player X's Turn" overlay
- `showAttackDialog()` - Display melee attack confirmation
- `showGameEndDialog()` - Display winner and restart game
- `moveCursorToCurrentPlayer()` - Auto-position cursor

**menus.js**: Menu system
- `renderMenu()` - Create/destroy menu overlays with borders
- `handleMenuKeydown()` - Process keyboard input (1-5 keys, Space to cancel)
- `enterTargetingMode()` - Enter spell targeting with colored cursor
- `castSelfSpell()` - Execute self-targeting spells like Shield
- **CRITICAL ISSUE**: Menu keys (1-5) are hardcoded to specific spell array indices

**actions.js**: Shared action execution (used by both player and AI)
- `castOffensiveSpell()` - Execute damage spells with projectiles
- `createIceWall()` - Place ice wall obstacle
- `castShield()` - Apply shield to wizard
- `executeMove()` - Move piece and trigger melee attack prompt
- `executeMeleeAttack()` - Deal melee damage to adjacent enemy

**GameBoard.js**: Core game logic
- `pieces[]` - Array of `{ piece, x, y, cat }` objects
- `movePiece()` - Move with bounds/collision checking
- `getAdjacentEnemy()` - Find enemy in adjacent square
- `getObstacleInPath()` - Check for ice walls blocking spell paths
- `toggleMenu()` - Open context menu for selected piece
- `selectBox()` - Select/deselect tiles

**Wizard.js**: Character class
- Animated sprite with idle animation
- HP system (takeDamage, heal, death detection)
- Shield system (addShield, shield absorbs damage first)
- Spell tracking (markSpellUsed, hasUsedSpell, resetSpells)
- Visual feedback (showBubble for damage/heal numbers)

**IceWall.js**: Obstacle class
- Blocks movement and spell line-of-sight
- Destroyed when hit by offensive spells
- Visual representation with ice texture

**ai.js**: AI decision-making
- `makeAIDecision()` - Choose action (cast spell, move, shield)
- `findBestSpellTarget()` - Select optimal spell target
- `findBestMove()` - Navigate toward enemy using A* pathfinding

## Controls

| Key | Action |
|-----|--------|
| Arrow Keys | Move cursor / Move piece (in movement mode) / Move targeting reticle |
| Space | Select tile / Open menu / Cancel / Confirm targeting |
| 1 | Cast Spell (root menu) / Cast Magic Bolt (spell menu) |
| 2 | Move Character (root menu) / Cast Lightning (spell menu) |
| 3 | Examine Character (root menu) / Cast Shield (spell menu) |
| 4 | Cast Mighty Arrow (spell menu) |
| 5 | Cast Ice Wall (spell menu) |

## Turn System

1. Turn begins with dialog showing current player
2. Cursor auto-moves to current player's wizard
3. Player selects their wizard and chooses action
4. After action completes, turn automatically ends
5. Used spells are marked and reset at turn start
6. AI automatically takes turn when it's Player 2's turn

## Spell System

### Spell Types

**Offensive Spells** (require targeting)
- Deal damage to target
- Can be blocked by ice walls
- Trigger projectile animations
- Examples: Magic Bolt, Lightning, Mighty Arrow

**Self-Cast Spells** (instant)
- Applied immediately to caster
- No targeting required
- Example: Shield

**Utility Spells** (require targeting)
- Create obstacles or effects
- Example: Ice Wall

### Spell Mechanics

- Each spell can only be cast **once per turn**
- Used spells show `[USED]` suffix in menu
- Spell cooldowns reset at start of each turn
- Spells have individual ranges (3-9 tiles)
- Line-of-sight checked for ice walls

### Current Spells

| Spell | Type | Range | Damage | Special |
|-------|------|-------|--------|---------|
| Magic Bolt | Offensive | 5 | 1-5 | Orange projectile |
| Lightning | Offensive | 3 | 3-10 | Blue projectile, high damage |
| Shield | Self-Cast | 0 | - | +3 shield HP |
| Mighty Arrow | Offensive | 9 | 2-5 | Green projectile, long range |
| Ice Wall | Utility | 5 | - | Creates destructible obstacle |

---

## How to Add a New Spell

Adding a spell requires modifications across **7 different locations**. This process is currently **not dynamic** and requires manual updates in multiple files.

### Known Issues with Current Implementation

- **Menu keys are hardcoded**: Each spell number (1-5) is hardcoded in `menus.js:handleMenuKeydown()`
- **No dynamic menu generation**: Adding spell #6 would require new keyboard handler
- **Spell order matters**: Array index in `menus.player.spells` must match key number
- **Refactoring needed**: Future work should make this data-driven

### Step-by-Step Guide

#### 1. Define Spell Data (config.js)

Add spell configuration to `spellData` object:

```javascript
export const spellData = {
    // ... existing spells
    "Fireball": {
        range: 7,           // Maximum targeting range in tiles
        minDamage: 5,       // Minimum damage dealt
        maxDamage: 12       // Maximum damage dealt
    }
};
```

**For different spell types:**

```javascript
// Self-cast spell (like Shield)
"Heal": {
    range: 0,
    healAmount: 5,
    selfCast: true
}

// Utility spell (like Ice Wall)
"Poison Cloud": {
    range: 6,
    createObstacle: true,
    duration: 3  // Custom property
}
```

#### 2. Add to Spell Menu (config.js)

Add spell name to the spells menu array:

```javascript
export const menus = {
    "player": {
        "root": ["Cast Spell", "Move Character", "Examine Character"],
        "spells": [
            "Magic Bolt",    // Key 1
            "Lightning",     // Key 2
            "Shield",        // Key 3
            "Mighty Arrow",  // Key 4
            "Ice Wall",      // Key 5
            "Fireball"       // Key 6 - YOUR NEW SPELL
        ]
    },
    // ...
};
```

**IMPORTANT**: Array index determines which number key casts it (0-indexed, so index 5 = key 6)

#### 3. Add Keyboard Handler (menus.js)

**This is the most tedious part** due to hardcoding. Add a new if-block to `handleMenuKeydown()`:

```javascript
export function handleMenuKeydown(event, menu, scene) {
    // ... existing handlers for keys 1-5 ...

    // NEW HANDLER FOR KEY 6
    if (event && event.key === "6" && state.keymonitor) {
        // Check if we're in spells menu selecting Fireball
        if (state.lastMenu === "spells" && state.spellsMode) {
            const selectedSpell = menus["player"]["spells"][5]; // Array index 5 for Fireball

            // Check if spell already used
            if (!canCastSpell(scene, selectedSpell)) {
                audio.error.play();
                console.log(`${selectedSpell} already used!`);
                return;
            }

            renderMenu(true); // Close menu
            state.spellsMode = false;

            // For offensive/utility spells with targeting
            enterTargetingMode(scene, selectedSpell);

            // For self-cast spells, use instead:
            // castSelfSpell(scene, selectedSpell);

            return;
        }
    }
}
```

**Key points:**
- `event.key === "6"` matches the menu display number
- `menus["player"]["spells"][5]` is array index (6 - 1)
- Choose `enterTargetingMode()` for targeted spells
- Choose `castSelfSpell()` for instant self-buffs

#### 4. Implement Spell Execution (actions.js)

Add logic to handle your spell when cast. Location depends on spell type:

**For offensive spells**, add to `castOffensiveSpell()`:

```javascript
export function castOffensiveSpell(scene, casterPos, targetPos, spellName, onComplete) {
    // ... existing code ...

    // Add to fireSpellProjectile function at bottom of file:
}

function fireSpellProjectile(spellName, startPixel, endPixel, onComplete) {
    if (spellName === "Lightning") { /* ... */ }
    if (spellName === "Mighty Arrow") { /* ... */ }
    if (spellName === "Magic Bolt") { /* ... */ }

    // ADD YOUR SPELL HERE
    if (spellName === "Fireball") {
        const fireball = getFireball();  // Import from spells/fireball.js
        if (fireball) {
            playFireballSound();  // Import from audiofx/fireball.js
            fireball.fire(startPixel.x, startPixel.y, endPixel.x, endPixel.y, 0xff4400, onComplete);
        }
    }
}
```

**For self-cast spells**, add to `castSelfSpell()` in menus.js:

```javascript
export function castSelfSpell(scene, spellName) {
    // ... existing code ...

    if (spellName === "Shield") {
        casterPiece.piece.addShield(spell.shieldHp);
    }

    // ADD YOUR SPELL HERE
    if (spellName === "Heal") {
        casterPiece.piece.heal(spell.healAmount);
    }

    // ... rest of function
}
```

**For utility spells**, create new function in actions.js following `createIceWall()` pattern.

#### 5. Create Spell Visual Effect (js/spells/yourspell.js)

Create a new spell projectile class (copy from bolt.js or lightning.js):

```javascript
// js/spells/fireball.js
import { state } from '../state.js';

export class Fireball {
    constructor(scene) {
        this.scene = scene;
    }

    fire(startX, startY, endX, endY, color = 0xff4400, onComplete = null) {
        const scene = this.scene;

        // Create visual elements (sprites, particles, graphics)
        const projectile = scene.add.circle(startX, startY, 25, color);
        projectile.setDepth(14);

        // Animate projectile to target
        scene.tweens.add({
            targets: projectile,
            x: endX,
            y: endY,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                // Impact effects here
                projectile.destroy();
                if (onComplete) onComplete();
            }
        });
    }
}

// Singleton pattern
let fireballInstance = null;

export function initFireball(scene) {
    fireballInstance = new Fireball(scene);
}

export function getFireball() {
    return fireballInstance;
}
```

**Reference existing spell files for advanced particle effects and visual polish.**

#### 6. Create Spell Sound Effect (js/audiofx/yourspell.js)

Add procedural audio for your spell (copy from bolt.js or lightning.js):

```javascript
// js/audiofx/fireball.js
export function playFireballSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create oscillators, filters, envelopes
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(80, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
}
```

**Reference existing audio files for working examples.**

#### 7. Initialize Spell in Game (game.js)

Add initialization in the `create()` function:

```javascript
import { initFireball } from './spells/fireball.js';

function create() {
    // ... existing initialization ...

    initMagicBolt(this);
    initLightning(this);
    initArrow(this);
    initFireball(this);  // ADD THIS LINE

    // ... rest of create function ...
}
```

#### 8. Update AI Logic (ai.js) [Optional]

If you want the AI to use your spell, add it to spell selection logic:

```javascript
function findBestSpellTarget(scene, wizard, enemy, enemyData) {
    const spells = ["Magic Bolt", "Lightning", "Mighty Arrow", "Fireball"];  // ADD HERE

    // ... spell selection logic ...
}
```

### Testing Your New Spell

1. Start the server: `node server.js`
2. Open http://localhost:3000
3. Select your wizard
4. Press `1` to open spell menu
5. Press the number key for your spell (e.g., `6` for Fireball)
6. Select target and press Space to cast
7. Verify:
   - Projectile animation plays
   - Sound effect plays
   - Damage is applied correctly
   - Spell shows `[USED]` after casting
   - AI uses spell appropriately (if enabled)

---

## Future Refactoring Needed

The spell system should be refactored to be data-driven:

### Proposed Architecture

```javascript
// config.js - Add spell configuration
export const spellData = {
    "Fireball": {
        range: 7,
        minDamage: 5,
        maxDamage: 12,
        type: "offensive",        // NEW: spell type
        visualFx: "fireball",     // NEW: links to spells/fireball.js
        audioFx: "fireball",      // NEW: links to audiofx/fireball.js
        menuKey: "6"              // NEW: dynamic key binding
    }
};

// menus.js - Dynamic menu generation (FUTURE)
function handleMenuKeydown(event, menu, scene) {
    const keyPressed = event.key;
    const spellIndex = parseInt(keyPressed) - 1;

    if (state.lastMenu === "spells" && state.spellsMode) {
        const selectedSpell = menus["player"]["spells"][spellIndex];
        if (!selectedSpell) return;

        const spellConfig = spellData[selectedSpell];

        // Generic handler based on spell type
        if (spellConfig.type === "offensive") {
            enterTargetingMode(scene, selectedSpell);
        } else if (spellConfig.type === "selfCast") {
            castSelfSpell(scene, selectedSpell);
        }
    }
}
```

This would eliminate hardcoded key handlers and make adding spells much simpler.

---

## Phaser Scene Flow

1. **preload()** - Load all assets (tiles, sprites, audio)
2. **create()** - Build game board, spawn wizards, initialize systems
3. **update()** - Game loop handling movement/targeting modes
4. Keyboard events handled via `scene.input.keyboard.on()`

## Audio System

- **Background music**: prism.mp3 (game), action.mp3 (combat)
- **Sound effects**: menuclick.mp3, error.mp3
- **Procedural audio**: Spell sounds generated via Web Audio API (js/audiofx/)

## Visual Assets

- **Sprites**: white_wizard_idle.png, cartoon_wizard_idle.png (100x100 spritesheets)
- **Textures**: tile.jpg (grid), cursor2.png, ice.png
- **Fonts**: minecraft.ttf (UI), ponari.ttf (alternate)

## Notes

- Uses ES6 modules with `type="module"` in HTML script tag
- Grid size is **10x9** (not 18x12 as in old docs)
- Tile size is **dynamic** based on viewport (50-450px)
- Responsive design with Phaser.Scale.RESIZE
- AI-controlled Player 2 by default (state.aiEnabled)
- No backend - purely client-side game logic
