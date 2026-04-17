import React from 'react';
import { Cell } from '@game-engine/shared-types';
import { CellComponent } from './Cell.js';
import styles from './crossword-ui.module.css';

interface GridProps {
  grid: Cell[][];
  focus: { row: number; col: number };
  activeWordId?: string;
  words: any[]; // Used to calculate which cells are part of active word
  onCellFocus: (row: number, col: number) => void;
  onCellChange: (row: number, col: number, value: string) => void;
  onCellKeyDown: (row: number, col: number, e: React.KeyboardEvent) => void;
}

export const Grid: React.FC<GridProps> = ({
  grid,
  focus,
  activeWordId,
  words,
  onCellFocus,
  onCellChange,
  onCellKeyDown,
}) => {
  const activeWord = words.find((w) => w.id === activeWordId);

  const isCellInActiveWord = (row: number, col: number) => {
    if (!activeWord) return false;
    const { start, length, direction } = activeWord;
    if (direction === 'across') {
      return row === start.row && col >= start.col && col < start.col + length;
    } else {
      return col === start.col && row >= start.row && row < start.row + length;
    }
  };

  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateColumns: `repeat(${grid[0]?.length || 0}, 1fr)`,
      }}
    >
      {grid.map((row, ri) =>
        row.map((cell, ci) => (
          <CellComponent
            key={`${ri}-${ci}`}
            cell={{...cell, isFocused: focus.row === ri && focus.col === ci}}
            isActiveWord={isCellInActiveWord(ri, ci)}
            onFocus={() => onCellFocus(ri, ci)}
            onChange={(val) => onCellChange(ri, ci, val)}
            onKeyDown={(e) => onCellKeyDown(ri, ci, e)}
          />
        ))
      )}
    </div>
  );
};
