import React, { useRef, useEffect } from 'react';
import { Cell } from '@game-engine/shared-types';
import styles from './crossword-ui.module.css';

interface CellProps {
  cell: Cell;
  isActiveWord: boolean;
  onFocus: () => void;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClick?: () => void;
  isSubmitted?: boolean;
  isViewMode?: boolean;
  isAnswerMode?: boolean;
}

const CellRenderer: React.FC<CellProps> = ({
  cell,
  isActiveWord,
  onFocus,
  onChange,
  onKeyDown,
  onClick,
  isSubmitted,
  isViewMode,
  isAnswerMode,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cell.isFocused && inputRef.current && !isViewMode) {
      inputRef.current.focus();
    }
  }, [cell.isFocused, isViewMode]);

  if (cell.isBlocked) {
    return <div className={`${styles.cellWrapper} ${styles.cellBlock}`} />;
  }

  const isCorrectInAnswerMode = isViewMode && isAnswerMode && 
    (cell.userLetter || '').toUpperCase() === cell.correctLetter.toUpperCase();
  const isErrorInAnswerMode = isViewMode && isAnswerMode && !isCorrectInAnswerMode;

  return (
    <div
      className={`${styles.cellWrapper} ${
        isActiveWord ? styles.cellActiveWord : ''
      } ${
        (cell.status === 'correct' || isCorrectInAnswerMode) ? styles.cellCorrect : ''
      } ${
        (cell.status === 'error' || isErrorInAnswerMode) ? styles.cellError : ''
      } ${
        isViewMode ? styles.cellViewMode : ''
      }`}
    >
      {cell.number && <span className={styles.cellNumber}>{cell.number}</span>}
      <input
        ref={inputRef}
        className={styles.cellInput}
        maxLength={1}
        value={(isViewMode && isAnswerMode) ? cell.correctLetter : (cell.userLetter || '')}
        onChange={(e) => onChange(e.currentTarget.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onClick={onClick}
        autoComplete="off"
        spellCheck="false"
        readOnly={isSubmitted || isViewMode}
      />
    </div>
  );
};

export const CellComponent = React.memo(CellRenderer, (prevProps, nextProps) => {
  // Only re-render if the active word state changes, or the deeply watched variables inside `cell` mutate.
  // This physically blocks react from re-rendering 224 un-affected cells on every keystroke!
  return (
    prevProps.isActiveWord === nextProps.isActiveWord &&
    prevProps.cell.userLetter === nextProps.cell.userLetter &&
    prevProps.cell.isFocused === nextProps.cell.isFocused &&
    prevProps.cell.status === nextProps.cell.status &&
    prevProps.isSubmitted === nextProps.isSubmitted &&
    prevProps.isViewMode === nextProps.isViewMode &&
    prevProps.isAnswerMode === nextProps.isAnswerMode
  );
});
