# Board Expansion / Highlight Desync Notes

## What players see
- Placing a piece toward the top or left makes the board briefly grow the wrong way, then everything shifts.
- After the shift, some visually empty cells still have the colored background/glow as if a piece is there.

## Root cause (from `app/components/GameBoard.vue`)
- In `makeMove`, the piece is written to `board[row][col]` first.
- If that cell is on an edge, `expandBoard` runs **after** the write and prepends a row/column when `row === 0` or `col === 0`.
- Prepending reindexes all coordinates (the just-placed piece moves from `[0,0]` to `[1,1]`, existing pieces shift too).
- Only a few coordinate stores are adjusted (`moveHistory`, `lastPlacedCell`, `recencyHighlightCell`). Other consumers (e.g., `winningCells`, any cached per-cell effects) stay on the old indices, so highlights can target now-empty cells.

## Suggested fixes
1) **Place after expansion (preferred)**
   - When an edge click happens, call `expandBoard` *before* mutating `board`.
   - Then write the move into the final coordinates (no shifting afterward).
   - This keeps all indices stable and avoids having to patch up other data structures.
   - **Status:** Implemented in `GameBoard.vue` (`makeMove` now expands first and places the piece at the final coordinates).

2) **Or keep prepending but shift all coordinates**
   - If you keep expanding after the write, every coordinate-based structure must be shifted when `row === 0` or `col === 0` (e.g., `winningCells`, any cached highlights/heatmaps).
   - Riskier and more error-prone than option 1.

3) **Alternative: maintain a logical offset**
   - Track a `top/left` offset (already present as `boardOffset`) and render using `row + offset.row`, `col + offset.col` instead of mutating existing indices.
   - Expansion adds empty rows/cols on the appropriate side, but existing data stays put; rendering applies the offset.

## Quick sanity checks after a fix
- Place a piece at the initial top-left edge: board should grow upward/left without shifting existing pieces or highlights.
- Verify `winningCells` still matches the rendered winning line after an upward/left expansion.
- Confirm recency glow/just-placed animation appears only on occupied cells post-expansion. 
