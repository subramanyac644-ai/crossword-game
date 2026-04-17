import { describe, it, expect } from 'vitest';
import { isSolved, getCellsForWord, getNextFocusableCell } from './crossword-logic';
import { Cell, Word } from '@game-engine/shared-types';

describe('Crossword Logic Core', () => {
  const createMockCell = (correctLetter: string, userLetter: string, isBlocked = false): Cell => ({
    correctLetter,
    userLetter,
    isBlocked,
    row: 0,
    col: 0,
    status: null
  });

  describe('isSolved', () => {
    it('returns true when all non-blocked cells have correct letters', () => {
      const grid = [
        [createMockCell('A', 'A'), createMockCell('B', 'B')],
        [createMockCell('X', '', true), createMockCell('C', 'c')] // Case insensitive match
      ];
      expect(isSolved(grid)).toBe(true);
    });

    it('returns false when any non-blocked cell has an incorrect letter', () => {
      const grid = [
        [createMockCell('A', 'A'), createMockCell('B', 'X')]
      ];
      expect(isSolved(grid)).toBe(false);
    });

    it('returns false when any non-blocked cell is empty', () => {
      const grid = [
        [createMockCell('A', 'A'), createMockCell('B', '')]
      ];
      expect(isSolved(grid)).toBe(false);
    });
  });

  describe('getCellsForWord', () => {
    const grid = [
      [createMockCell('H', 'H'), createMockCell('E', ''), createMockCell('Y', '')],
      [createMockCell('I', 'I'), createMockCell('X', '', true), createMockCell('Z', '')]
    ];

    it('correctly maps across directions', () => {
      const mockWord: Word = {
        id: '1', word: 'HEY', clue: 'test', length: 3, direction: 'across', start: { row: 0, col: 0 }
      };
      
      const cells = getCellsForWord(grid, mockWord);
      expect(cells.length).toBe(3);
      expect(cells[0].correctLetter).toBe('H');
      expect(cells[1].correctLetter).toBe('E');
      expect(cells[2].correctLetter).toBe('Y');
    });

    it('correctly maps down directions', () => {
      const mockWord: Word = {
        id: '2', word: 'HI', clue: 'test', length: 2, direction: 'down', start: { row: 0, col: 0 }
      };
      
      const cells = getCellsForWord(grid, mockWord);
      expect(cells.length).toBe(2);
      expect(cells[0].correctLetter).toBe('H');
      expect(cells[1].correctLetter).toBe('I');
    });
  });

  describe('getNextFocusableCell', () => {
    const grid = [
      [createMockCell('A', '', false), createMockCell('B', '', true), createMockCell('C', '', false)]
    ];

    // Give them mapped row/col indices natively for testing logic
    grid.forEach((row, ri) => row.forEach((cell, ci) => {
      cell.row = ri;
      cell.col = ci;
    }));

    it('skips blocked cells entirely', () => {
      const nextCell = getNextFocusableCell(grid, 0, 0, 'Forward', 'across');
      // Should skip column 1 (blocked) and jump directly to column 2
      expect(nextCell).toEqual({ row: 0, col: 2 });
    });

    it('returns null if at the boundary bounds limits', () => {
      const nextCell = getNextFocusableCell(grid, 0, 2, 'Forward', 'across');
      expect(nextCell).toBeNull();
    });
    
    it('successfully traverses backward', () => {
      const prevCell = getNextFocusableCell(grid, 0, 2, 'Backward', 'across');
      // Again skipping the middle block
      expect(prevCell).toEqual({ row: 0, col: 0 });
    });
  });
});
