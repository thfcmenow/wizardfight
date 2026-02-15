# Creature System Implementation Plan

Goblins (and future creatures) are player-owned units summoned via spell, controlled
once per turn, and capable of melee combat. This document breaks the work into discrete,
testable phases.

---

## Phase 1 — Summoning (Cast Goblin Spell)

**Goal:** "Summon Goblin" casts a targeting overlay limited to 1 tile adjacent to the
caster. On confirm, a Goblin is placed on the board owned by the current player.

### Changes

**`state.js`**
- Add `player1Goblins: []` and `player2Goblins: []` arrays to track owned goblins.

**`config.js`**
- Add `"Summon Goblin"` to `spellData` with `selfCast: false`, `range: 1`,
  `summonCreature: "goblin"` (custom type flag).
- Confirm it exists in `menus["player"]["spells"]` (you said this is already done).

**`actions.js`**
- Add `summonGoblin(scene, casterPos, targetPos, ownerPlayer, onComplete)`.
  - Finds a free adjacent square within 1 tile of `casterPos`.
  - Creates a `new Goblin(scene, targetPos.x, targetPos.y)`.
  - Calls `gameBoard.addPiece(goblin, x, y, "goblin_p1")` or `"goblin_p2"` based on
    `ownerPlayer`.
  - Pushes the piece reference into `state.player1Goblins` / `state.player2Goblins`.
  - Calls `onComplete` (which calls `endTurn()`).

**`menus.js`**
- Wire the "Summon Goblin" key handler to call `enterTargetingMode(scene, "Summon Goblin")`
  with `targetingRange: 1`.

**`game.js` (update loop)**
- In the targeting-mode confirm block, add a branch for `currentSpell === "Summon Goblin"`
  that calls `summonGoblin()` instead of `castOffensiveSpell()`.
- Remove the static test goblin from `create()` once Phase 1 is working.

**`Goblin.js`**
- Add configurable attack stats: `this.minDamage = 1; this.maxDamage = 2;`
- Add `this.hasActed = false;` flag.
- Add `this.owner = null;` (set by `summonGoblin` after creation).

**Test**
- Cast Summon Goblin, confirm a goblin spawns adjacent to the wizard.
- Verify turn ends after summoning.
- Verify the goblin is tracked in the correct player array.

---

## Phase 2 — Goblin Selection and Movement

**Goal:** During your turn, you can select an owned goblin and move it 1 square. Moving
the goblin counts as your turn action (same as moving the wizard).

### How Turn Actions Work (current)
A turn ends when the player performs one action (spell cast, move, or melee). We keep
this model — controlling the goblin is the turn action.

### Changes

**`config.js` / `menus.js`**
- Add `"Control Goblin"` as a new root menu item (alongside "Cast Spell", "Move
  Character", "Examine Character").
- Only render it (or enable it) when `state.currentPlayer === 1` and
  `state.player1Goblins.length > 0` (or player 2 equivalent).

**Root menu key handler (menus.js)**
- On "Control Goblin" selected:
  - If there is exactly one friendly goblin, select it automatically.
  - If there are multiple, enter a secondary selection UI (future scope; for now assume one).
  - Set `state.movementMode = true` and `state.selectedPiece = goblinPiece`.
  - Set `state.goblinMovementMode = true` (new flag) so the update loop knows the 1-tile
    move limit applies.

**`state.js`**
- Add `goblinMovementMode: false`.

**`game.js` (update loop — movement mode block)**
- When `state.goblinMovementMode === true`, enforce the 1-tile move limit by only
  accepting a single key press then locking further movement input until turn ends.
- After the goblin moves 1 tile, check for an adjacent enemy (see Phase 3).
- If no adjacent enemy: call `endTurn()`, reset `goblinMovementMode`.

**`turn.js` (endTurn)**
- When a turn ends, reset `goblin.hasActed = false` for all goblins belonging to the
  player whose turn just ended.

**Test**
- Select "Control Goblin" from the menu.
- Move the goblin exactly 1 square.
- Verify the turn ends automatically after moving 1 tile.
- Verify the goblin cannot move a second tile in the same turn.

---

## Phase 3 — Goblin Melee Attack

**Goal:** If, after the goblin moves, it is within 1 square of an enemy unit (wizard or
enemy goblin), a melee attack prompt appears. Attacking also ends the turn.

### Attack Resolution Rules
- Goblin attacks wizard: applies `minDamage`–`maxDamage` to wizard HP (or shield first).
- Goblin attacks enemy goblin: applies damage to that goblin's HP; if HP <= 0, goblin
  dies and is removed from the board.
- Attack power is set on the `Goblin` instance so it can be customized per creature type.

### Changes

**`actions.js`**
- Add `executeGoblinMelee(scene, attackerGoblinPiece, targetPiece, onComplete)`.
  - Rolls damage between `attacker.piece.minDamage` and `attacker.piece.maxDamage`.
  - Calls `target.piece.takeDamage(damage)` (works for both Wizard and Goblin since both
    implement `takeDamage`).
  - Shows attacker's `showBubble` with the damage number.
  - If target is a goblin and dies (`takeDamage` returns `true`):
    - Calls `gameBoard.removePiece(targetPiece)` (new GameBoard method — see below).
    - Removes from owner's goblin array in `state`.
  - Calls `onComplete`.

**`GameBoard.js`**
- Add `removePiece(pieceEntry)` — removes from `this.pieces[]` and destroys the sprite.

**`game.js` (update loop — goblin movement mode)**
- After a goblin moves 1 tile, call `gameBoard.getAdjacentEnemy(goblinPiece.x, goblinPiece.y)`
  (this already exists but targets wizards — extend it to also find enemy goblins by
  checking ownership tag).
- If an adjacent enemy exists: show `showAttackDialog()` (existing turn.js function, or a
  new equivalent for goblins) prompting the player to attack or skip.
  - Confirm → `executeGoblinMelee(...)` → `endTurn()`.
  - Cancel → `endTurn()` (forfeits attack but goblin already moved).

**`GameBoard.js` — `getAdjacentEnemy`**
- Extend to accept an `ownerTag` parameter (`"p1"` or `"p2"`) so it can find enemy
  goblins as valid targets, not just the enemy wizard.

**Test**
- Move goblin adjacent to enemy wizard; verify damage prompt appears and damage is dealt.
- Move goblin adjacent to enemy goblin; verify goblin-vs-goblin damage and death removal.
- Verify skipping the attack still ends the turn.

---

## Phase 4 — AI Goblin Control

**Goal:** Player 2's AI can summon a goblin and move/attack with it each turn.

### Changes

**`ai.js`**

**Summoning logic (add to `executeAITurn`)**
- New function `shouldSummonGoblin(aiWizard, gameBoard)`:
  - Returns `true` if AI doesn't yet own a goblin AND "Summon Goblin" spell hasn't been
    used AND there is a free adjacent tile.
- New function `doAISummonGoblin(aiWizard, gameBoard)`:
  - Finds a free tile adjacent to the AI wizard.
  - Calls `summonGoblin(scene, aiWizardPos, targetPos, 2, () => endTurn())`.

**Goblin control logic (add to `executeAITurn`)**
- New function `doAIGoblinTurn(goblinPiece, playerWizard, gameBoard)`:
  - If adjacent to player wizard or player goblin → call `executeGoblinMelee(...)` then
    `endTurn()`.
  - Otherwise → call `getBestMoveDirection` (reuse existing) to move 1 tile toward player
    wizard → then check adjacency → attack or `endTurn()`.
- Insert into the main decision tree: after checking offensive spells and before moving
  the wizard, check `state.player2Goblins.length > 0` and call `doAIGoblinTurn` if the
  goblin hasn't acted yet.

**Priority order for AI turn (revised)**
1. Cast Shield (if HP low / conditions met)
2. Cast offensive spell at wizard (if in range)
3. Cast Ice Wall (if needed)
4. Control goblin (move + attack if possible)
5. Move wizard toward player
6. End turn

**Test**
- Enable AI and play until turn 2+; verify AI casts Summon Goblin.
- Verify AI moves the goblin toward the player each turn.
- Verify AI goblin attacks when adjacent to player wizard.

---

## Phase 5 — Polish and Edge Cases

These are not blocking but should be addressed before shipping.

| Item | Description |
|------|-------------|
| Goblin death cleanup | Remove from `state.playerXGoblins` array when goblin dies from any source (spell, melee, goblin attack). |
| Spell hits goblin | `castOffensiveSpell` should be able to target and damage enemy goblins, not just wizards. Requires updating the target-finding logic in `actions.js`. |
| "Control Goblin" hidden when no goblin | Menu item should not appear (or be grayed out) if the player has no living goblin. |
| Multiple goblins | If more than one goblin per player is allowed, add a selection sub-menu and allow one goblin action per turn per goblin (tracked via `goblin.hasActed`). |
| Goblin HP bar | Optionally show a small HP indicator above the goblin sprite (reuse or simplify the wizard HP bar). |
| Goblin on game restart | Ensure `state.player1Goblins` and `state.player2Goblins` are cleared and any live goblin sprites are destroyed when `game.js` `create()` reinitializes the scene. |

---

## File Change Summary

| File | Phase(s) | Change |
|------|----------|--------|
| `state.js` | 1, 2 | Add goblin arrays and `goblinMovementMode` flag |
| `config.js` | 1 | Add Summon Goblin to `spellData` |
| `Goblin.js` | 1 | Add `owner`, `hasActed`, `minDamage`, `maxDamage` |
| `actions.js` | 1, 3 | Add `summonGoblin`, `executeGoblinMelee` |
| `GameBoard.js` | 3 | Add `removePiece`, extend `getAdjacentEnemy` |
| `menus.js` | 1, 2 | Wire Summon Goblin key, add Control Goblin menu item |
| `game.js` | 1, 2, 3 | Targeting branch for summon, goblin movement mode |
| `turn.js` | 2 | Reset `goblin.hasActed` on turn end |
| `ai.js` | 4 | Add summon + goblin control logic |
