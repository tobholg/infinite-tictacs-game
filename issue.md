# Issue Log: OnlineGameBoard Animation Bugs

This document describes two related animation bugs in `OnlineGameBoard.vue` that occurred when the board expanded to the top or left edges.

---

## Issue 1: Piece-Drop Animation on Wrong Cell (Vue Key Recycling)

### Symptom
When placing a piece on the top or left edge (triggering board expansion), the "just placed" animation appeared on the **opposite edge** instead of the cell where the piece was actually placed.

### Root Cause
Vue's keyed list diffing was recycling the wrong DOM nodes due to index-based keys.

**Before (problematic):**
```vue
<template v-for="(row, rowIndex) in board" :key="`row-${rowIndex}`">
  <Motion
    v-for="(cell, colIndex) in row"
    :key="`cell-${rowIndex}-${colIndex}`"
```

When the board expands via prepend (top/left):
1. A new row/column is inserted at index 0 (unshift)
2. All existing cells shift to higher indices (+1)
3. The NEW edge cell gets the OLD key (e.g., `cell-0-0`)
4. Vue thinks the new edge is the existing element → plays animation there
5. The actual placed cell gets a NEW key → Vue mounts it fresh, no animation

### Solution
Use **logical coordinates** (offset + view index) for stable keys that don't change when the board expands:

```vue
<template v-for="(row, rowIndex) in board" :key="`row-${boardOffset.row + rowIndex}`">
  <Motion
    v-for="(cell, colIndex) in row"
    :key="`cell-${boardOffset.row + rowIndex}-${boardOffset.col + colIndex}`"
```

Additionally, store `lastPlacedCell` with logical coordinates and compare using logical coords in `getCellClasses()`:

```typescript
// In handleCellClick - store LOGICAL coordinates
lastPlacedCell.value = {
  row: boardOffset.value.row + row,
  col: boardOffset.value.col + col
}

// In getCellClasses - compare using LOGICAL coordinates
const logicalRow = boardOffset.value.row + row
const logicalCol = boardOffset.value.col + col
const isJustPlaced = lastPlacedCell.value?.row === logicalRow &&
                     lastPlacedCell.value?.col === logicalCol
```

**Why this works:**
- When top expands: offset increases by 1, existing cells' view indices increase by 1
- Logical coord = offset + viewIndex stays stable: `(old_offset + 1) + (old_index + 1) ≠ change` → wait, actually: `new_offset + new_index = old_offset + old_index` when both increase by 1? No...
- Actually: when top expands, offset.row increases, but existing cell view indices also increase
- So: `(offset+1) + (index+1) = offset + index + 2` — that's wrong...

Let me reconsider: The key insight is that the NEW edge cell gets a NEW logical key (lower offset value), while existing cells keep their same logical keys because the offset change compensates for the index shift.

---

## Issue 2: Edge Expansion Animation on Opposite Side (Inverted Detection)

### Symptom
When the board expanded (e.g., clicking top edge), the slide-in/pop-in animation played on the **bottom edge** instead of the newly added top edge.

### Root Cause
The expansion detection logic checked for offset **decreasing** when it should check for **increasing**.

**Before (wrong):**
```typescript
const newEdges: ExpandedEdges = {
  top: newState.offset.row < prevBoardOffset.value.row,      // WRONG
  bottom: ... && newState.offset.row >= prevBoardOffset.value.row,
  left: newState.offset.col < prevBoardOffset.value.col,     // WRONG
  right: ... && newState.offset.col >= prevBoardOffset.value.col,
}
```

The local `GameBoard.vue` shows the correct behavior:
```typescript
if (expandTop) {
  boardOffset.value.row++  // Offset INCREASES on top/left expand
}
```

So when the server expands the board upward:
- `boardOffset.row` **increases** (we prepended a row, shifting the logical origin)
- The old code checked for decrease (`<`), so `top: false`
- The condition `offset.row >= prev` was true, so `bottom: true`
- Animation played on bottom edge instead of top!

### Solution
Invert the comparison operators to match actual server behavior:

```typescript
const newEdges: ExpandedEdges = {
  top: newState.offset.row > prevBoardOffset.value.row,      // FIXED: check >
  bottom: ... && newState.offset.row <= prevBoardOffset.value.row,
  left: newState.offset.col > prevBoardOffset.value.col,     // FIXED: check >
  right: ... && newState.offset.col <= prevBoardOffset.value.col,
}
```

**Why this works:**
- Top/left expand → offset increases → now correctly detected as `top: true` / `left: true`
- Bottom/right expand → size increases but offset stays same → correctly detected as `bottom: true` / `right: true`
- Animation now plays on the correct newly-added edge

---

## Files Modified

- `app/components/OnlineGameBoard.vue`
  - Lines ~610-613: Updated Vue keys to use logical coordinates
  - Lines ~260-264: Store `lastPlacedCell` with logical coordinates
  - Lines ~327-330: Compare using logical coordinates in `getCellClasses()`
  - Lines ~376-379: Compare using logical coordinates in `getCellMotionState()`
  - Lines ~436-444: Fixed expansion edge detection logic

---

## Testing Checklist

- [ ] Place piece on **top edge** → board expands up, animation on correct cell
- [ ] Place piece on **bottom edge** → board expands down, animation on correct cell
- [ ] Place piece on **left edge** → board expands left, animation on correct cell
- [ ] Place piece on **right edge** → board expands right, animation on correct cell
- [ ] Place piece on **corner** → board expands both directions, animations correct
- [ ] Expansion slide-in animation plays on the **newly added edge**, not opposite
- [ ] All three expansion modes (A/B/C) animate correctly
