# Bug Report: Empty Cells Showing Highlight/Glow After Board Expansion

## Summary

When placing pieces on edge cells (top or left), the board expands and shifts existing content. After expansion, empty cells incorrectly display a glow/highlight effect that should only appear on cells containing pieces.

## Related Documentation

See `BOARD_EXPANSION_ISSUE.md` for the deeper architectural analysis of this problem. That document identifies the **root cause** as the expansion happening *after* the piece is placed, which causes coordinate shifting issues across multiple data structures.

This document focuses on a **secondary symptom**: the Motion library animation state persistence that compounds the problem.

## Root Cause (Animation Layer)

**Location:** `app/components/GameBoard.vue`, function `getCellMotionState` (lines 727-767)

The Motion library (`@motionone/vue`) does not automatically reset CSS properties that aren't explicitly specified in a new animation state. When a cell transitions from "just placed" to "empty" during board expansion, the `boxShadow` and `rotate` properties from the previous animation persist.

### The Problem in Detail

When a piece is just placed, the animation state includes a glow effect:

```javascript
// Lines 732-739
if (justPlaced) {
  return {
    opacity: 1,
    scale: [0.85, 1.1, 1],
    rotate: [-4, 0],
    boxShadow: '0 24px 45px rgba(99, 102, 241, 0.35)'  // Glow effect
  }
}
```

When a cell becomes empty (or just filled without being "just placed"), the animation state does NOT reset these properties:

```javascript
// Lines 763-766 (empty cell state)
return {
  opacity: 0.92,
  scale: 1
  // boxShadow is NOT specified - previous value persists!
  // rotate is NOT specified - previous value persists!
}
```

### Timeline of the Bug

1. User places piece at position `(0, 0)` (top-left edge)
2. `getCellMotionState` returns the "justPlaced" state with `boxShadow` glow
3. After 850ms delay, `expandBoard` runs
4. Board shifts: the piece moves from `[0][0]` to `[1][1]` in the data
5. The DOM element at grid position `(0, 0)` (Vue key `'0-0'`) now represents an empty cell
6. `getCellMotionState` returns the empty state WITHOUT `boxShadow`
7. Motion library animates to new state but **retains** the `boxShadow` since it wasn't explicitly cleared
8. Result: Empty cell at `(0, 0)` still shows the glow

## Suggested Fix

Explicitly set `boxShadow: 'none'` and `rotate: 0` in all animation states that should not have these effects.

### Code Changes

In `app/components/GameBoard.vue`, modify the `getCellMotionState` function:

**Before (lines 749-766):**
```javascript
if (winning) {
  return {
    opacity: 1,
    scale: 1
  }
}

if (filled) {
  return {
    opacity: 1,
    scale: 1
  }
}

return {
  opacity: 0.92,
  scale: 1
}
```

**After:**
```javascript
if (winning) {
  return {
    opacity: 1,
    scale: 1,
    boxShadow: 'none',
    rotate: 0
  }
}

if (filled) {
  return {
    opacity: 1,
    scale: 1,
    boxShadow: 'none',
    rotate: 0
  }
}

return {
  opacity: 0.92,
  scale: 1,
  boxShadow: 'none',
  rotate: 0
}
```

## Alternative Solutions

### Option 2: Force Element Recreation on Board Expansion

Change the Vue key to include cell content, forcing Vue to recreate elements when content changes:

```vue
<!-- Before -->
:key="`${rowIndex}-${colIndex}`"

<!-- After -->
:key="`${rowIndex}-${colIndex}-${cell || 'empty'}`"
```

**Pros:** Guarantees clean state on content change
**Cons:** May cause unnecessary DOM recreation and lose smooth animations

### Option 3: Reset Animation State Before Expansion

Add explicit animation reset when `isExpanding` becomes true:

```javascript
// In expandBoard, after setting isExpanding = true
// Force all cells to reset their Motion state
```

**Pros:** Centralized fix
**Cons:** More complex implementation, may interrupt animations

## Recommended Approach

### Primary Fix: Address the Architectural Issue

The proper fix is described in `BOARD_EXPANSION_ISSUE.md` - **expand the board before placing the piece**. This eliminates coordinate shifting entirely and prevents this class of bugs.

If you implement "Place after expansion":
- Cells won't transition from "filled+glowing" to "empty" in the same DOM position
- The Motion animation persistence becomes a non-issue
- All coordinate-based structures stay in sync

### Secondary Fix: Defensive Animation Reset

Even after fixing the architectural issue, **Option 1 (explicit property reset)** is still recommended as defensive coding:
- It's minimal and targeted
- It preserves smooth animations
- It follows the principle of explicit state management
- It protects against future edge cases where animation state might persist unexpectedly
- **Status:** Implemented — `getCellMotionState` now sets `boxShadow: 'none'` and `rotate: 0` for all non "just placed" states to prevent glow persistence on empty cells.

## Testing

After applying the fix, verify:
1. Place a piece on a top edge cell - board expands, no glow on the new empty row
2. Place a piece on a left edge cell - board expands, no glow on the new empty column
3. Place a piece on top-left corner - board expands in both directions, no residual glows
4. Normal piece placement still shows the placement animation correctly
5. Winning cell animations still work correctly
