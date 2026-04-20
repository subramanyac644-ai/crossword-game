export type Direction = 'across' | 'down';

export type Grid = Cell[][];

export interface WordClue {
  word: string;
  clue: string;
}

export interface Position {
  row: number;
  col: number;
}

export interface Cell {
  row: number;
  col: number;
  correctLetter: string;
  userLetter: string;
  isBlocked: boolean;
  isFocused?: boolean;
  isRevealed?: boolean;
  number?: number;
  status?: 'correct' | 'error' | null;
}

export interface Word {
  id: string;
  word: string;
  clue: string;
  number: number;
  direction: Direction;
  start: Position;
  length: number;
}

export interface AIWordResponse {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  length: number;
}

export interface GameMetadata {
  title: string;
  author: string;
  description?: string;
}

export interface GameState {
  grid: Grid;
  words: Word[];
  score: number;
  hintsUsed: number;
  selectedWord: string | null;
  direction: Direction;
  metadata: GameMetadata;
  hasWon: boolean;
  isSubmitted?: boolean;
  elapsedSeconds?: number;
  completedWords?: string[];
}

// Re-exporting for backward compatibility with prototype if needed
export type IGameState = GameState;
export type ICell = Cell;
export type IWord = Word;
