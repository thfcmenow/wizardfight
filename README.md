# Wizard Fight - JS Module Overview

## Core Modules

| File | Description |
|------|-------------|
| `game.js` | Main Phaser scene. Handles `preload`, `create`, and `update` lifecycle. Initializes the game board, wizards, cursor, music, and all input handlers. |
| `config.js` | Static configuration: grid dimensions, tile size, spell data (range, damage, type), and menu item definitions. |
| `state.js` | Centralized mutable game state (current player, turn number, targeting mode, etc.) and audio object references. |
| `menus.js` | Menu rendering and keyboard input. Draws bordered overlay menus, handles number key selection, and routes to targeting or self-cast logic. |
| `actions.js` | Shared action execution used by both the player and AI: casting offensive spells, creating ice walls, applying shields, moving pieces, and executing melee attacks. |
| `turn.js` | Turn lifecycle management. Switches active player, resets spell cooldowns, triggers the AI, and shows turn/attack/game-end dialog overlays. |
| `ai.js` | AI decision-making for Player 2. Selects spells, finds optimal targets, and navigates toward the enemy using A* pathfinding. |
| `utils.js` | Utility helpers: `gridToPixel` coordinate conversion, `properCase` string formatting, and other shared functions. |

## Classes

| File | Description |
|------|-------------|
| `Wizard.js` | Wizard character class. Manages animated sprite, HP, shield system, spell usage tracking, and floating damage/heal bubbles. |
| `GameBoard.js` | Core board logic. Tracks all pieces, handles movement with bounds/collision checking, line-of-sight queries, and tile selection. |
| `IceWall.js` | Destructible obstacle class. Blocks movement and spell paths; destroyed on impact from offensive spells. |
| `creatures/Goblin.js` | Simplified unit class (no spells, no shields). 4 HP, 1–2 damage melee unit with idle sprite and floating damage bubbles. |

## Spell Visuals (`spells/`)

| File | Description |
|------|-------------|
| `spells/bolt.js` | Magic Bolt projectile: orange particle effect traveling from caster to target. |
| `spells/lightning.js` | Lightning projectile: blue high-damage effect with visual flash. |
| `spells/arrow.js` | Mighty Arrow projectile: green long-range effect. |

## Audio Effects (`audiofx/`)

| File | Description |
|------|-------------|
| `audiofx/bolt.js` | Procedural Web Audio sound for Magic Bolt. |
| `audiofx/lightning.js` | Procedural Web Audio sound for Lightning. |
| `audiofx/thud.js` | Impact sound used for melee hits. |
| `audiofx/bell.js` | Menu interaction chime. |
| `audiofx/shieldLoss.js` | Retro 16-bit style descending hum played when a shield is destroyed. |
