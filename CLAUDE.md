# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wizard Fight is a browser-based grid tactical game built with Phaser 3, Express.js, and ES6 modules. Two wizards take turns moving on a grid, casting spells, and interacting through menu-driven UI with Minecraft-style fonts.

## Commands

```bash
# Install dependencies
npm install

# Start server (runs on http://localhost:3000)
node server.js
```

No test framework, linting, or build tools are currently configured.

## Architecture

### Module Structure (js/)

```
js/
├── game.js      # Main entry - Phaser scene (preload, create, update)
├── config.js    # Grid settings, constants, menu definitions
├── state.js     # Mutable game state and audio references
├── turn.js      # Turn management (endTurn, showTurnDialog, moveCursorToCurrentPlayer)
├── menus.js     # Menu rendering and keyboard handling
├── Wizard.js    # Wizard class - animated sprite characters
└── GameBoard.js # GameBoard class - piece management, movement, selection
```

### Entry Points
- `index.html` - Loads Phaser and `js/game.js` as ES6 module
- `server.js` - Express.js static file server

### Key Modules

**config.js**: Grid dimensions, tile size, sprite scale, menu definitions
```javascript
export const tileSize = 90;
export const menus = { "player": { "root": [...], "spells": [...] } };
```

**state.js**: Centralized mutable state
```javascript
export const state = { currentPlayer, turnNumber, movementMode, ... };
export const audio = { menuclick, error, gamemusic, actionmusic };
```

**turn.js**: Turn-based game flow
- `endTurn()` - Switch players, increment turn, show dialog
- `showTurnDialog()` - Display "Player X's Turn" overlay
- `moveCursorToCurrentPlayer()` - Auto-position cursor on current player's wizard

**GameBoard.js**: Core game logic
- `pieces[]` - Tracks all objects as `{ piece, x, y, cat }`
- `movePiece()` - Move with bounds/collision checking
- `toggleMenu()` / `selectBox()` - Menu interactions

**Wizard.js**: Character representation with idle animation

### Phaser Scene Flow
1. `preload()` - Load images, spritesheets, audio
2. `create()` - Initialize grid, wizards, cursor, show turn dialog
3. `update()` - Handle movement mode and cursor input

## Game Configuration

```javascript
const gridWidth = 18;      // Tiles horizontally
const gridHeight = 12;     // Tiles vertically
const tileSize = 90;       // Pixels per tile
const spriteScale = 0.7;   // Wizard display size
```

## Controls

| Key | Action |
|-----|--------|
| Arrow Keys | Move cursor / Move piece (in movement mode) |
| Space | Select / Open menu / Cancel |
| 1 | Cast Spell |
| 2 | Move Character |
| 3 | Examine Character |

## Turn System

- `currentPlayer` (1 or 2) tracks whose turn it is
- `turnNumber` increments each turn
- Wizards are categorized as `"player1"` or `"player2"`
- Turn dialog displays at start and after each action
- Cursor auto-moves to current player's wizard

## Audio

Files in `assets/`: prism.mp3 (background), action.mp3 (combat), menuclick.mp3, error.mp3

## Notes

- Uses ES6 modules with `type="module"` in script tag
- Old `game.js` in root is deprecated; use `js/game.js`
- Fonts: minecraft.ttf (primary UI), ponari.ttf (secondary)
