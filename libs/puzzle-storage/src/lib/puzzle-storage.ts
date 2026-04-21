import { Grid, Word } from '@game-engine/shared-types';

export interface Puzzle {
  id: string;
  topic: string;
  words: Word[];
  grid: Grid;
  createdAt: number;
  score?: number;
  hintsUsed?: number;
  elapsedSeconds?: number;
  completedWords?: string[];
  correctCount?: number;
  incorrectCount?: number;
  isSubmitted?: boolean;
}

const STORAGE_KEY = 'crossword_puzzles';

export function savePuzzle(puzzle: Puzzle): void {
  console.log("STORAGE: Saving puzzle to gallery:", puzzle);
  const current = getSavedPuzzles();
  const existingIndex = current.findIndex(p => p.id === puzzle.id);
  if (existingIndex >= 0) {
    current[existingIndex] = puzzle;
  } else {
    current.push(puzzle);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  // Dispatch a custom event so other components can refresh
  window.dispatchEvent(new Event('puzzle_saved'));
}

export function getSavedPuzzles(): Puzzle[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as Puzzle[];
  } catch (e) {
    console.error('Failed to parse saved puzzles', e);
    return [];
  }
}
export function deletePuzzle(id: string): void {
  const current = getSavedPuzzles();
  const filtered = current.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  // Dispatch a custom event so other components can refresh
  window.dispatchEvent(new Event('puzzle_saved'));
}
