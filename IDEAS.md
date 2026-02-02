# Wizard Fight - Enhancement Ideas

A collection of ideas for future development.

---

## Spells

### Summon Creature
Create a spell that summons a creature you control in addition to your wizard. The creature would:
- Have its own HP (lower than wizard, e.g., 5-8)
- Take a turn after your wizard's turn (or share the turn)
- Have limited abilities (maybe just movement + basic attack)
- Die permanently when HP reaches 0
- Limit: One summon active per player at a time

Possible creature types:
- **Imp** - Fast (2 movement per turn), weak attack (1-2 damage)
- **Golem** - Slow (1 movement), strong attack (3-5 damage), high HP
- **Spirit** - Can pass through occupied squares, medium stats

### Healing Spell
Restore 3-5 HP to self. One-time use like other spells.

### Teleport
Instantly move to any unoccupied square within range (e.g., 6 tiles). Great for repositioning or escaping.

### Fireball (Area Effect)
Hits target square AND all adjacent squares for reduced damage (e.g., 2-4 center, 1-2 splash).

### Ice Wall
Create a temporary obstacle on a tile that blocks movement for 3 turns. Strategic terrain control.

### Drain Life
Deal 2-4 damage to enemy and heal self for the same amount.

---

## Combat

### Hand-to-Hand Combat
When two characters are in adjacent squares, pressing the arrow key toward the opponent triggers melee combat:
- Low damage (1-3 HP)
- Doesn't end turn (can still move or cast after)
- OR: Ends turn but can be done unlimited times (no one-time restriction)
- Visual: Quick punch/staff swing animation
- Could have knockback (push enemy 1 square away)

### Counterattack
When hit by a melee attack, 25% chance to automatically counter for 1 damage.

### Charge Attack
If you move 3+ squares in a straight line toward an enemy and end adjacent, deal bonus melee damage.

---

## Creatures & Allies

### Creature Control System
For summoned creatures:
- After wizard's action, prompt "Control [Creature Name]?"
- Creature has simpler menu: Move / Attack / Wait
- Creatures can't cast spells
- If wizard dies, creatures disappear

### Creature Types
| Creature | HP | Movement | Attack | Special |
|----------|-----|----------|--------|---------|
| Imp | 5 | 2 | 1-2 | Can fly over obstacles |
| Golem | 10 | 1 | 3-5 | Takes 1 less damage from spells |
| Wolf | 6 | 3 | 2-3 | Bonus damage if adjacent to another wolf |
| Skeleton | 4 | 1 | 2-4 | Revives once at 2 HP |

---

## Terrain & Environment

### Obstacles
Add rocks, trees, or pillars that block movement and line-of-sight for spells.

### Hazard Tiles
- **Lava** - 2 damage per turn if standing on it
- **Ice** - Slide an extra tile in movement direction
- **Poison** - 1 damage per turn, persists for 2 turns after leaving

### Destructible Objects
Barrels or crates that can be destroyed, possibly dropping items.

### Random Map Generation
Generate different board layouts each game with varied obstacle placement.

---

## Items & Pickups

### Potion Spawns
Randomly spawn on the board mid-game:
- **Health Potion** - Restore 5 HP
- **Mana Crystal** - Restore one used spell
- **Speed Scroll** - Move twice this turn

### Equipment
Start of game draft where each player picks:
- **Staff** - +1 spell range
- **Robe** - +3 starting HP
- **Boots** - +1 movement per turn
- **Amulet** - Start with shield active

---

## Game Modes

### Best of 3
Win 2 rounds to win the match. Track wins between rounds.

### Timed Turns
30-second timer per turn. If time runs out, turn is skipped.

### Fog of War
Can only see tiles within 5 squares of your units. Adds strategy and surprise.

### King of the Hill
Control the center tile for 5 consecutive turns to win (alternative victory condition).

### Campaign Mode
Series of battles against progressively harder AI with:
- Story/dialogue between fights
- Unlock new spells as you progress
- Boss battles with unique mechanics

---

## AI Improvements

### Difficulty Levels
- **Easy** - Random decisions, doesn't use Shield optimally
- **Medium** - Current behavior
- **Hard** - Predicts player movement, optimal spell usage, retreats when low

### AI Personalities
- **Aggressive** - Always moves toward player, attacks ASAP
- **Defensive** - Shields early, keeps distance, uses hit-and-run
- **Tactical** - Balances offense/defense based on HP comparison

### Smarter Positioning
AI tries to stay at optimal range (just within Magic Bolt range but outside Lightning range).

---

## Visual & Audio

### Spell Animations
- Screen shake on big hits
- Particle effects for different spell schools (fire, ice, lightning)
- Death animation when wizard reaches 0 HP

### Character Customization
Choose wizard color/style at game start.

### Battle Log
Scrolling text log showing: "Zephyr cast Magic Bolt for 4 damage!"

### Dynamic Music
- Intensity increases as HP gets low
- Victory/defeat jingles

### Floating Damage Numbers
Damage numbers float up and fade (in addition to bubbles).

---

## Multiplayer

### Local Hot-Seat
Already works - two players on same keyboard.

### Online Multiplayer
WebSocket-based real-time multiplayer:
- Lobby system
- Match history
- Ranked mode with ELO

### Spectator Mode
Watch ongoing matches.

---

## Quality of Life

### Undo Move
Before ending turn, option to undo movement (but not spell casts).

### Spell Range Preview
When hovering over a spell, highlight valid target squares.

### Turn History
Review previous turns to see what happened.

### Settings Menu
- Music/SFX volume sliders
- Toggle AI on/off mid-game
- Adjust game speed

---

## Balance Considerations

### Spell Refresh
Instead of one-time use, spells could have cooldowns (e.g., Lightning: 3 turns).

### Movement Points
Instead of 1 move per turn, have 3 movement points. Moving costs 1, casting costs 2, etc.

### Initiative System
Higher initiative wizard goes first each round (could be random or stat-based).

---

*Last updated: February 2026*
