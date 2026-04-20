import { Cell, Word, Direction } from '@game-engine/shared-types';

/**
 * Checks if the crossword puzzle is completely and correctly solved.
 * @param grid The current 2D array of cells.
 */
export function isSolved(grid: Cell[][]): boolean {
  for (const row of grid) {
    for (const cell of row) {
      if (
        !cell.isBlocked &&
        cell.userLetter.toUpperCase() !== cell.correctLetter.toUpperCase()
      ) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Retrieves all cells associated with a specific word in the grid.
 * @param grid The 2D array of cells.
 * @param word The word for which to find cells.
 */
export function getCellsForWord(grid: Cell[][], word: Word): Cell[] {
  const cells: Cell[] = [];
  const { row, col } = word.start;
  for (let i = 0; i < word.length; i++) {
    const r = word.direction === 'across' ? row : row + i;
    const c = word.direction === 'across' ? col + i : col;
    
    if (grid[r] && grid[r][c]) {
      cells.push(grid[r][c]);
    }
  }
  return cells;
}

/**
 * Finds the next or previous focusable (non-blocked) cell in the grid based on current orientation.
 * @param grid The 2D array of cells.
 * @param currentRow The current focused row index.
 * @param currentCol The current focused column index.
 * @param direction Navigation direction: 'Forward' or 'Backward'.
 * @param orientation Current game orientation: 'across' or 'down'.
 */
export function getNextFocusableCell(
  grid: Cell[][],
  currentRow: number,
  currentCol: number,
  direction: 'Forward' | 'Backward',
  orientation: Direction
): { row: number; col: number } | null {
  const rowCount = grid.length;
  const colCount = grid[0]?.length || 0;

  let r = currentRow;
  let c = currentCol;

  // Move one step based on orientation and direction
  if (orientation === 'across') {
    c += direction === 'Forward' ? 1 : -1;
  } else {
    r += direction === 'Forward' ? 1 : -1;
  }

  // Check bounds and blocked status
  if (r >= 0 && r < rowCount && c >= 0 && c < colCount) {
    if (!grid[r][c].isBlocked) {
      return { row: r, col: c };
    }
    // If blocked, keep searching in the same direction? 
    // Usually crosswords jump over blocks to the next valid cell.
    return getNextFocusableCell(grid, r, c, direction, orientation);
  }

  return null;
}

/**
 * Moves focus in an arbitrary direction, skipping blocked cells.
 * @param grid The 2D array of cells.
 * @param startRow Current focused row.
 * @param startCol Current focused column.
 * @param dRow Change in row.
 * @param dCol Change in column.
 */
export function getNearbyFocusableCell(
  grid: Cell[][],
  startRow: number,
  startCol: number,
  dRow: number,
  dCol: number
): { row: number; col: number } | null {
  const rowCount = grid.length;
  const colCount = grid[0]?.length || 0;

  let r = startRow + dRow;
  let c = startCol + dCol;

  while (r >= 0 && r < rowCount && c >= 0 && c < colCount) {
    if (!grid[r][c].isBlocked) {
      return { row: r, col: c };
    }
    r += dRow;
    c += dCol;
  }

  return null;
}
