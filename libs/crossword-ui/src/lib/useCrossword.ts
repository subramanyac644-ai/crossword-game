import { useState, useEffect, useMemo } from 'react';
import { GameState, Cell, Direction } from '@game-engine/shared-types';
import { getNextFocusableCell, isSolved, getCellsForWord, getNearbyFocusableCell } from '@game-engine/crossword-logic';
import { getClueHint } from '@game-engine/ai-service';

export interface UseCrosswordConfig {
  initialData: GameState;
  onComplete?: () => void;
  onRestart?: () => void;
  apiKey?: string;
}

export function useCrossword({ initialData, onComplete, onRestart, apiKey }: UseCrosswordConfig) {
  const STORAGE_KEY = `crossword_save_${initialData.metadata.title}`;

  // Consolidate initial state loading
  const savedState = useMemo(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log(`STORAGE: Recovering state for "${initialData.metadata.title}":`, parsed);
        return parsed;
      } catch (e) {
        console.error("STORAGE: Failed to parse saved state", e);
      }
    }
    return null;
  }, [STORAGE_KEY, initialData.metadata.title]);

  const [grid, setGrid] = useState<Cell[][]>(() => savedState?.grid || initialData.grid);
  const [score, setScore] = useState<number>(() => savedState?.score || 0);
  const [hintsUsed, setHintsUsed] = useState<number>(() => savedState?.hintsUsed ?? 0);
  const [completedWords, setCompletedWords] = useState<string[]>(() => savedState?.completedWords || []);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => savedState?.elapsedSeconds || 0);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => savedState?.isSubmitted ?? initialData.isSubmitted ?? false);
  const [isAnswerMode, setIsAnswerMode] = useState<boolean>(() => savedState?.isAnswerMode ?? initialData.isAnswerMode ?? false);
  const [hasWon, setHasWon] = useState(() => savedState?.hasWon ?? initialData.hasWon ?? false);
  
  const [focus, setFocus] = useState<{ row: number; col: number }>(() => {
    if (initialData.words && initialData.words.length > 0) {
      return initialData.words[0].start;
    }
    return { row: 0, col: 0 };
  });

  const [direction, setDirection] = useState<Direction>(() => {
    if (initialData.words && initialData.words.length > 0) {
      return initialData.words[0].direction;
    }
    return initialData.direction;
  });

  const [aiHint, setAiHint] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [isViewMode] = useState<boolean>(!!initialData.isViewMode);

  const toggleAnswerMode = () => {
    if (isViewMode) {
      setIsAnswerMode(prev => !prev);
    }
  };

  useEffect(() => {
    let interval: any;
    if (!hasWon && !isViewMode) {
      interval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [hasWon, isViewMode]);

  useEffect(() => {
    const fullState = { ...initialData, grid, score, hintsUsed, completedWords, elapsedSeconds, hasWon, isSubmitted, isViewMode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));
  }, [grid, score, hintsUsed, completedWords, elapsedSeconds, hasWon, isSubmitted, isViewMode, STORAGE_KEY, initialData]);



  const activeWordId = useMemo(() => {
    return initialData.words.find((w) => {
      const { row, col } = w.start;
      if (w.direction === direction) {
        if (direction === 'across') {
          return row === focus.row && focus.col >= col && focus.col < col + w.length;
        } else {
          return col === focus.col && focus.row >= row && focus.row < row + w.length;
        }
      }
      return false;
    })?.id;
  }, [direction, focus, initialData.words]);

  const handleCellChange = (row: number, col: number, value: string) => {
    if (hasWon || isSubmitted || isViewMode) return;

    const char = value.slice(-1).toUpperCase();
    const newGrid = grid.map((r, ri) =>
      r.map((c, ci) => (ri === row && ci === col ? { ...c, userLetter: char } : c))
    );

    setGrid(newGrid);

    const newlyCompleted = initialData.words.filter(w => {
      if (completedWords.includes(w.id)) return false;
      const cells = getCellsForWord(newGrid, w);
      return cells.every(c => c.userLetter.toUpperCase() === c.correctLetter.toUpperCase());
    });

    if (newlyCompleted.length > 0) {
      setCompletedWords(prev => [...prev, ...newlyCompleted.map(w => w.id)]);
      setScore(s => s + (newlyCompleted.length * 50));
    }

    if (char) {
      const next = getNextFocusableCell(newGrid, row, col, 'Forward', direction);
      if (next) setFocus(next);
    }

    if (isSolved(newGrid)) {
      setHasWon(true);
      if (onComplete) onComplete();
    }
  };

  const handleCellKeyDown = (row: number, col: number, e: React.KeyboardEvent) => {
    if (hasWon || isSubmitted || isViewMode) return;

    if (e.key === 'Backspace' && !grid[row][col].userLetter) {
      const prev = getNextFocusableCell(grid, row, col, 'Backward', direction);
      if (prev) setFocus(prev);
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = getNearbyFocusableCell(grid, row, col, 0, 1);
      if (next) {
        setFocus(next);
        setDirection('across');
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = getNearbyFocusableCell(grid, row, col, 0, -1);
      if (next) {
        setFocus(next);
        setDirection('across');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = getNearbyFocusableCell(grid, row, col, 1, 0);
      if (next) {
        setFocus(next);
        setDirection('down');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = getNearbyFocusableCell(grid, row, col, -1, 0);
      if (next) {
        setFocus(next);
        setDirection('down');
      }
    }

    if (e.key === ' ') {
      e.preventDefault();
      setDirection((d) => (d === 'across' ? 'down' : 'across'));
    }
  };

  const handleCellFocus = (row: number, col: number) => {
    setFocus({ row, col });
  };

  const handleCellClick = (row: number, col: number) => {
    if (row === focus.row && col === focus.col) {
      setDirection((d) => (d === 'across' ? 'down' : 'across'));
    }
    setFocus({ row, col });
  };

  const handleWordClick = (id: string) => {
    const word = initialData.words.find((w) => w.id === id);
    if (word) {
      setFocus(word.start);
      setDirection(word.direction);
    }
  };

  const useAiHint = async () => {
    const activeWord = initialData.words.find((w) => w.id === activeWordId);
    if (!activeWord) {
      setAiHint("Please select a word on the board first to get a hint.");
      return;
    }
    setIsHintLoading(true);
    setAiHint(null);
    try {
      setHintsUsed((h) => h + 1);
      setScore(s => s - 50);
      const hint = await getClueHint(activeWord, apiKey);
      setAiHint(hint);
    } catch (e) {
      setAiHint("Failed to load Gemini hint. Please try again.");
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleRevealLetter = () => {
    if (hasWon || isSubmitted || isViewMode) return;
    const activeWord = initialData.words.find((w) => w.id === activeWordId);
    if (!activeWord) {
      setAiHint("Please select a word to reveal a letter.");
      return;
    }

    const cellsInWord = getCellsForWord(grid, activeWord);
    const targetCell = cellsInWord.find(c => c.userLetter.toUpperCase() !== c.correctLetter.toUpperCase());

    if (targetCell) {
      const newGrid = grid.map(r => r.map(c => 
        c.row === targetCell.row && c.col === targetCell.col 
        ? { ...c, userLetter: c.correctLetter, isRevealed: true } 
        : c
      ));

      setGrid(newGrid);
      
      const newlyCompleted = initialData.words.filter(w => {
        if (completedWords.includes(w.id)) return false;
        const cells = getCellsForWord(newGrid, w);
        return cells.every(c => c.userLetter.toUpperCase() === c.correctLetter.toUpperCase());
      });

      setCompletedWords(prev => [...prev, ...newlyCompleted.map(w => w.id)]);
      setScore(s => s - 50 + (newlyCompleted.length * 50));

      if (isSolved(newGrid)) {
        setHasWon(true);
        if (onComplete) onComplete();
      }
    } else {
      setAiHint("This word is already completely filled correctly!");
    }
  };

  const handleCheckWord = () => {
    if (hasWon || isSubmitted || isViewMode) return;
    const activeWord = initialData.words.find((w) => w.id === activeWordId);
    if (!activeWord) {
      setAiHint("Please select a word to verify.");
      return;
    }

    const newGrid = grid.map(r => r.map(c => ({ ...c })));
    const cellsInWord = getCellsForWord(newGrid, activeWord);
    
    cellsInWord.forEach(c => {
      if (c.userLetter) {
        c.status = c.userLetter.toUpperCase() === c.correctLetter.toUpperCase() ? 'correct' : 'error';
      }
    });

    setGrid(newGrid);
  };

  const handleCheckPuzzle = () => {
    if (hasWon || isSubmitted || isViewMode) return;
    
    console.log("Submitting puzzle. Revealing all correct answers.");
    
    const newGrid = grid.map(row => 
      row.map(cell => {
        if (!cell.isBlocked) {
          const isCorrect = cell.userLetter?.toUpperCase() === cell.correctLetter.toUpperCase();
          return {
            ...cell,
            userLetter: cell.correctLetter,
            status: isCorrect ? 'correct' : 'error' as any
          };
        }
        return cell;
      })
    );

    setGrid(newGrid);
    setIsSubmitted(true);
    setHasWon(true);
    if (onComplete) onComplete();
  };

  const handleRestart = () => {
    localStorage.removeItem(STORAGE_KEY);
    if (onRestart) onRestart();
  };

  return {
    state: {
      grid,
      score,
      hintsUsed,
      completedWords,
      elapsedSeconds,
      focus,
      direction,
      activeWordId,
      aiHint,
      isHintLoading,
      hasWon,
      isSubmitted,
      isViewMode,
      isAnswerMode,
    },
    handlers: {
      handleCellChange,
      handleCellKeyDown,
      handleCellFocus,
      handleCellClick,
      handleWordClick,
      useAiHint,
      handleRevealLetter,
      handleCheckWord,
      handleCheckPuzzle,
      handleRestart,
      toggleAnswerMode,
    }
  };
}
