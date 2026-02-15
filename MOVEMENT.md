## Proposed Phased Approach
   14
   15 The goal is to implement a more intuitive touch control scheme:
   16 1.  **Tap:** Select the square the user is tapping on. This should be usable for selecting pieces, selecting movement destinations, or selecting
      spell targets.
   17 2.  **Hold-Tap:** Mimic the current Spacebar/tap function for action confirmation (e.g., confirming a move, casting a spell, or canceling an action
   18
   19 ### Phase 1: Implement Tap and Hold-Tap Differentiation
   20
   21 *   **Objective:** Introduce the ability to distinguish between a quick tap and a press-and-hold gesture.
   22 *   **Description:**
   23     *   Modify the touch event listeners in `js/game.js`.
   24     *   On `pointerdown`, record the exact start time (`holdStartTime`) and coordinates.
   25     *   On `pointerup`, calculate the duration of the press (`pointer.upTime - holdStartTime`).
   26     *   Define a `holdDurationThreshold` (e.g., 300ms).
   27     *   If the press duration is less than `holdDurationThreshold` and the pointer movement is minimal (less than `minSwipe`), register it as a
      **"tap"**.
   28     *   If the press duration is greater than or equal to `holdDurationThreshold`, register it as a **"hold-tap"**.
   29 *   **State Changes:**
   30     *   Potentially add `holdStartTime` and `holdDurationThreshold` to `state.js` or manage them within `game.js`.
   31     *   The existing `state.tapPressed` might be repurposed or supplemented.
   32
   33 ### Phase 2: Implement Tap for Square Selection
   34
   35 *   **Objective:** Use the new "tap" gesture to select the specific grid square that was tapped.
   36 *   **Description:**
   37     *   When a "tap" is detected (Phase 1), determine the grid coordinates from the pointer's `x`, `y` position.
   38     *   Check the current game state (`state.isSelected`, `state.movementMode`, `state.targetingMode`).
   39     *   If `state.isSelected` is `false` and the game is not in an active action mode (like targeting), a tap should select the game piece or tile
      the tapped location, similar to how the cursor movement and Spacebar currently work together. This might involve updating the cursor position and
      calling `gameBoard.selectBox()`.
   40     *   If the game is in `state.movementMode` or `state.targetingMode`, a tap should confirm the selection of the tapped square as the destination
      or target. This would involve updating `state.selectedPiece`'s position or confirming the spell target.
   41 *   **Code Impact:**
   42     *   Update `js/game.js`'s `update` function to process "tap" gestures.
   43     *   Modify or extend `GameBoard.js`'s `selectBox` or related methods to handle direct tile selection via tap coordinates.
   44     *   The current swipe-based cursor movement will still be available, but direct tapping offers a more precise selection method.
   45
   46 ### Phase 3: Implement Hold-Tap for Action Confirmation
   47
   48 *   **Objective:** Utilize the "hold-tap" gesture for confirming actions, replacing the current Space/S key and simple tap confirmation.
   49 *   **Description:**
   50     *   When a "hold-tap" is detected (Phase 1), trigger the primary action confirmation logic.
   51     *   This logic should be equivalent to what currently occurs when Space or 'S' is pressed.
   52     *   Examples:
   53         *   If in `state.movementMode`, the "hold-tap" confirms the piece's move.
   54         *   If in `state.targetingMode`, the "hold-tap" confirms the spell target.
   55         *   If an action (like a menu item) is selected, the "hold-tap" executes it.
   56     *   This phase will effectively make the Spacebar/S key functionality accessible via a long press on touch devices.
   57 *   **Code Impact:**
   58     *   Modify `js/game.js`'s `update` function to trigger action confirmation logic when a "hold-tap" is detected.
   59     *   The existing checks like `(cursors.space.isDown || keys.S.isDown || state.tapPressed)` will need to be adapted to prioritize or include the
      "hold-tap" condition.
   60     *   The `state.tapPressed` flag might be updated to reflect "hold-tap" or a new flag introduced.
   61
   62 ### Considerations for Implementation
   63
   64 *   **Disambiguation:** Ensure that the system correctly distinguishes between a tap (select), a hold-tap (confirm), and a swipe (cursor movement)
      avoid accidental inputs.
   65 *   **Game State Awareness:** All touch input handling must be context-aware, respecting the current game state (`state.movementMode`,
      `state.targetingMode`, etc.).
   66 *   **User Feedback:** Provide clear visual feedback for taps and hold-taps (e.g., visual indication of hold duration, highlighting selected
      squares).
   67 *   **Existing Logic:** Carefully integrate these changes with the existing swipe detection and `state.tapPressed` logic to maintain current
      functionality where appropriate.