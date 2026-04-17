import { GameState, Cell, Word, GameMetadata, Grid, Direction } from '@game-engine/shared-types';
import { isSolved, getCellsForWord } from '@game-engine/crossword-logic';
import { generateCrosswordFromText, getClueHint } from '@game-engine/ai-service';

/**
 * The CrosswordEngine acts as a central orchestrator (plugin wrapper)
 * for the crossword lifecycle, including creation, state management,
 * and AI integrations.
 */
export class CrosswordEngine {
  private state: GameState;
  private apiKey?: string;

  constructor(initialData: GameState, apiKey?: string) {
    this.state = initialData;
    this.apiKey = apiKey;
  }

  /**
   * Static factory to create a new game instance via AI Topic.
   * Performs automatic word placement and direction mapping.
   */
  static async createFromTopic(
    topic: string,
    apiKey: string,
    metadata: GameMetadata = { title: 'New Puzzle', author: 'AI Assistant' },
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<CrosswordEngine> {
    const aiResponse = await generateCrosswordFromText(topic, apiKey, difficulty);
    
    if (aiResponse.length < 6) {
      throw new Error(`Could not generate a valid crossword with enough words (got ${aiResponse.length}, minimum 6 required). Please try again.`);
    }

    console.log(`[GAME ENGINE] Topic: "${topic}" - Received ${aiResponse.length} word-clue pairs.`);

    const createEmptyGrid = (rows = 15, cols = 15): Grid => Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({
        row, col, correctLetter: '', userLetter: '', isBlocked: true,
      }))
    );

    // Sort words longest to shortest
    const sourceWords = [...aiResponse].sort((a, b) => b.word.length - a.word.length);

    let bestGrid: Grid = createEmptyGrid();
    let bestWords: Word[] = [];
    let attempts = 0;
    const maxAttempts = 500;

    const cloneGrid = (g: Grid): Grid => g.map(row => row.map(cell => ({ ...cell })));
    const cloneWords = (w: Word[]): Word[] => w.map(word => ({ ...word, start: { ...word.start } }));

    const backtrack = (wordIndex: number, currentGrid: Grid, placedWords: Word[]): boolean => {
      attempts++;
      if (attempts > maxAttempts) return true; // Abort cleanly

      if (placedWords.length > bestWords.length) {
        bestWords = cloneWords(placedWords);
        bestGrid = cloneGrid(currentGrid);
      }

      if (wordIndex >= sourceWords.length) {
        return true; 
      }

      const sw = sourceWords[wordIndex];

      if (placedWords.length === 0) {
        const startRow = 7;
        const startCol = Math.max(0, 7 - Math.floor(sw.word.length / 2));
        
        if (this.canPlaceWord(currentGrid, sw.word, startRow, startCol, 'across')) {
          const newGrid = cloneGrid(currentGrid);
          this.writeWordToGrid(newGrid, sw.word, startRow, startCol, 'across');
          
          const newWord: Word = {
            id: `word-${placedWords.length}`,
            word: sw.word,
            clue: sw.clue,
            number: 0,
            direction: 'across',
            start: { row: startRow, col: startCol },
            length: sw.word.length
          };
          
          if (backtrack(wordIndex + 1, newGrid, [...placedWords, newWord])) return true;
        }
      } else {
        for (const existing of placedWords) {
          for (let i = 0; i < existing.word.length; i++) {
            for (let j = 0; j < sw.word.length; j++) {
              if (existing.word[i] === sw.word[j]) {
                const newDirection: Direction = existing.direction === 'across' ? 'down' : 'across';
                const exRow = existing.direction === 'across' ? existing.start.row : existing.start.row + i;
                const exCol = existing.direction === 'across' ? existing.start.col + i : existing.start.col;

                const newStartRow = newDirection === 'across' ? exRow : exRow - j;
                const newStartCol = newDirection === 'across' ? exCol - j : exCol;

                if (this.canPlaceWord(currentGrid, sw.word, newStartRow, newStartCol, newDirection)) {
                  const newGrid = cloneGrid(currentGrid);
                  this.writeWordToGrid(newGrid, sw.word, newStartRow, newStartCol, newDirection);
                  
                  const newWord: Word = {
                    id: `word-${placedWords.length}`,
                    word: sw.word,
                    clue: sw.clue,
                    number: 0,
                    direction: newDirection,
                    start: { row: newStartRow, col: newStartCol },
                    length: sw.word.length
                  };

                  if (backtrack(wordIndex + 1, newGrid, [...placedWords, newWord])) return true;
                }
              }
            }
          }
        }
        
        // Skip word if placing failed or wasn't attempted
        if (backtrack(wordIndex + 1, currentGrid, placedWords)) return true;
      }

      return false;
    };

    console.log(`[GAME ENGINE] Starting generation backtracking engine...`);
    backtrack(0, createEmptyGrid(), []);

    if (bestWords.length < 6) {
      throw new Error(`Could not find a valid intersecting layout for enough words (only mapped ${bestWords.length}, minimum 6 required). Please try again.`);
    }

    this.finalizeMetadata(bestGrid, bestWords);

    console.log(`[GAME ENGINE] Final layout: ${bestWords.length} words mapped into a 15x15 dimension grid.`);

    const initialState: GameState = {
      grid: bestGrid,
      words: bestWords,
      score: 0,
      hintsUsed: 0,
      selectedWord: null,
      direction: 'across',
      metadata,
      hasWon: false,
    };

    return new CrosswordEngine(initialState, apiKey);
  }

  private static canPlaceWord(grid: Grid, word: string, row: number, col: number, direction: Direction): boolean {
    const rowCount = grid.length;
    const colCount = grid[0]?.length || 0;

    if (row < 0 || col < 0) return false;
    if (direction === 'across' && col + word.length > colCount) return false;
    if (direction === 'down' && row + word.length > rowCount) return false;

    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      
      const currentCell = grid[r][c];
      
      if (currentCell.correctLetter !== '' && currentCell.correctLetter !== word[i]) {
        return false;
      }

      const dr = direction === 'across' ? [1, -1] : [0, 0];
      const dc = direction === 'across' ? [0, 0] : [1, -1];
      
      for (let j = 0; j < 2; j++) {
        const nr = r + dr[j];
        const nc = c + dc[j];
        if (nr >= 0 && nr < rowCount && nc >= 0 && nc < colCount) {
          const adj = grid[nr][nc];
          if (!adj.isBlocked && currentCell.correctLetter === '') return false;
        }
      }
    }
    return true;
  }

  private static writeWordToGrid(grid: Grid, word: string, row: number, col: number, direction: Direction): void {
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      grid[r][c].correctLetter = word[i];
      grid[r][c].isBlocked = false;
    }
  }

  private static finalizeMetadata(grid: Grid, words: Word[]): void {
    let nextNumber = 1;
    const numberMap: Record<string, number> = {};
    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wordsStartingHere = words.filter(w => w.start.row === r && w.start.col === c);
        if (wordsStartingHere.length > 0) {
          wordsStartingHere.forEach(w => w.number = nextNumber);
          grid[r][c].number = nextNumber;
          nextNumber++;
        }
      }
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public updateCell(row: number, col: number, letter: string): void {
    const cell = this.state.grid[row][col];
    if (!cell || cell.isBlocked || cell.isRevealed) return;

    cell.userLetter = letter.toUpperCase();
    this.state.hasWon = isSolved(this.state.grid);
  }

  public async getHintForActiveWord(wordId: string): Promise<string> {
    const word = this.state.words.find(w => w.id === wordId);
    if (!word) return 'No active word selected.';
    
    this.state.hintsUsed += 1;
    return getClueHint(word, this.apiKey);
  }

  /**
   * Reveals a specific cell, marks it as revealed, and increments hints used.
   */
  public revealCell(row: number, col: number): void {
    const cell = this.state.grid[row][col];
    if (!cell || cell.isBlocked) return;

    cell.userLetter = cell.correctLetter;
    cell.isRevealed = true;
    this.state.hintsUsed += 1;
    this.state.hasWon = isSolved(this.state.grid);
  }

  /**
   * Reveals an entire word.
   */
  public revealWord(wordId: string): void {
    const word = this.state.words.find(w => w.id === wordId);
    if (!word) return;

    const cells = getCellsForWord(this.state.grid, word);
    cells.forEach(cell => {
      cell.userLetter = cell.correctLetter;
      cell.isRevealed = true;
    });

    this.state.hintsUsed += 5; // Penalty for revealing whole word
    this.state.hasWon = isSolved(this.state.grid);
  }

  /**
   * Checks if a word is currently correct.
   */
  public checkWord(wordId: string): boolean {
    const word = this.state.words.find(w => w.id === wordId);
    if (!word) return false;

    const cells = getCellsForWord(this.state.grid, word);
    return cells.every(cell => 
      cell.userLetter.toUpperCase() === cell.correctLetter.toUpperCase()
    );
  }

  /**
   * Resets the entire game board.
   */
  public resetGame(): void {
    this.state.grid.forEach(row => {
      row.forEach(cell => {
        if (!cell.isBlocked) {
          cell.userLetter = '';
          cell.isRevealed = false;
        }
      });
    });
    this.state.score = 0;
    this.state.hintsUsed = 0;
    this.state.hasWon = false;
  }

  /**
   * Static factory to restore a game instance from a serialized GameState.
   */
  static fromState(state: GameState, apiKey?: string): CrosswordEngine {
    return new CrosswordEngine(state, apiKey);
  }

  /**
   * Exports the current game state as a JSON string.
   */
  public serialize(): string {
    return JSON.stringify(this.state);
  }

  /**
   * Restores the game state from a JSON string.
   */
  public deserialize(data: string): void {
    try {
      this.state = JSON.parse(data);
    } catch (e) {
      console.error('Failed to deserialize crossword state:', e);
    }
  }
}
