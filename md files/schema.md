# schema.md — Crossword Game
> All data shapes · Strictly derived from GameEngine PRD v1.0 · Sections 5, 7, 8

This file defines every data structure used in the Crossword game. These are the single source of truth for types used in `src/types/`.

---

## 1. External API shapes

### 1.1 Claude API — request body

Used for all calls to `POST https://api.anthropic.com/v1/messages`.

```ts
interface ClaudeRequestBody {
  model: 'claude-sonnet-4-20250514';
  max_tokens: 1000;
  messages: ClaudeMessage[];
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

### 1.2 Claude API — response body

```ts
interface ClaudeResponseBody {
  content: ClaudeContentBlock[];
  // other fields (id, model, usage) not used
}

interface ClaudeContentBlock {
  type: 'text';
  text: string;
}
```

### 1.3 Claude — crossword generation output (parsed from content[0].text)

```ts
// Array of 8–12 items
type WordClueApiResponse = WordClue[];

interface WordClue {
  word: string;   // uppercase, letters only, e.g. "PHOTOSYNTHESIS"
  clue: string;   // resource-specific, e.g. "The energy conversion described in chapter 3"
}
```

---

## 2. Resource and session types

### 2.1 ResourceInput

```ts
interface ResourceInput {
  type: 'pdf' | 'text';
  file: File;             // browser File object from upload or prop injection
  name: string;           // display name (file.name)
  sizeBytes: number;      // file.size
}
```

### 2.2 ValidationResult

```ts
interface ValidationResult {
  valid: boolean;
  error?: 'type_not_supported' | 'file_too_large' | 'format_mismatch';
  errorMessage?: string;  // human-readable, shown in upload screen
}
```

### 2.3 SessionState

Top-level session state held in React context. Never written to localStorage.

```ts
interface SessionState {
  resource: ResourceInput | null;
  extractedText: string | null;         // raw extracted text from PDF.js or FileReader
  chunks: string[] | null;              // ~2,000-token chunks
  summary: string | null;              // one-sentence AI summary for preview strip
  games: {
    crossword: CrosswordSessionSlot;
    // other games: separate slots (stubbed for crossword-only build)
  };
}

interface CrosswordSessionSlot {
  status: 'idle' | 'generating' | 'ready' | 'error';
  data: CrosswordGameData | null;       // null until generation complete
  lastScore: number | null;            // null until first game completed
  errorMessage: string | null;
}
```

---

## 3. Grid generation types

### 3.1 RawGrid

The mutable 15×15 array used during backtracking. Internal to `gridGenerator.ts`.

```ts
type RawGrid = (string | null)[][];
// null  = black / blocked cell
// ''    = empty white cell (available for placement)
// 'A'   = placed letter
```

### 3.2 PlacedWord

Represents one successfully placed word in the grid.

```ts
interface PlacedWord {
  id: number;                   // sequential clue number, 1-indexed
  wordClue: WordClue;
  direction: 'across' | 'down';
  startRow: number;             // 0-indexed, in the 15×15 space
  startCol: number;
  length: number;               // wordClue.word.length
}
```

### 3.3 GridCell

Represents one cell in the final rendered grid.

```ts
interface GridCell {
  // Static data (from grid generation)
  letter: string | null;              // null = black cell; uppercase letter = white cell
  isWordStart: boolean;               // true if a clue number appears here
  wordStartNumber: number | null;     // the clue number, e.g. 3
  acrossWordId: number | null;        // id of the across word passing through, or null
  downWordId: number | null;          // id of the down word passing through, or null

  // Runtime state (mutated as user interacts)
  userLetter: string | null;          // null = not yet filled
  displayState: CellDisplayState;
}

type CellDisplayState =
  | 'default'       // white cell, not selected, no feedback
  | 'selected'      // the cursor is on this cell
  | 'highlighted'   // part of the currently selected word but not the cursor cell
  | 'correct'       // Check Word/Puzzle showed this letter is correct → green
  | 'incorrect'     // Check Word/Puzzle showed this letter is wrong → red
  | 'revealed';     // Hint was used to reveal this letter
```

### 3.4 GridData

Final output of the grid generation algorithm.

```ts
interface GridData {
  cells: GridCell[][];          // 2D array, cropped bounding box (rows × cols)
  rows: number;                 // cells.length
  cols: number;                 // cells[0].length
  placedWords: PlacedWord[];    // all successfully placed words (minimum 6)
}
```

### 3.5 GridGeneratorResult

Return type of `gridGenerator()`.

```ts
type GridGeneratorResult =
  | { success: true; gridData: GridData }
  | { success: false };          // < 6 words placed — caller must re-prompt Claude
```

---

## 4. Game data and state types

### 4.1 CrosswordGameData

Stored in `CrosswordSessionSlot.data` once generation is complete.

```ts
interface CrosswordGameData {
  wordClues: WordClue[];        // raw from Claude — 8–12 items
  gridData: GridData;           // output of backtracking algorithm
}
```

### 4.2 CrosswordGameState

Runtime state — held in `useReducer` inside `<CrosswordGame />`. Reset on "Play again".

```ts
interface CrosswordGameState {
  grid: GridCell[][];           // mutable copy of gridData.cells

  // Selection
  selectedCell: CellCoord | null;
  selectedDirection: 'across' | 'down';
  selectedWordId: number | null;

  // Scoring
  score: number;                // starts 0; +50 per correct word; −50 per hint
  hintsUsed: number;            // total hints used this game
  wordsCorrect: number;         // count of words verified correct

  // Timer
  startTime: number;            // Date.now() when game first loaded
  endTime: number | null;       // Date.now() when Check Puzzle pressed

  // Status
  isComplete: boolean;          // true after Check Puzzle
}

interface CellCoord {
  row: number;
  col: number;
}
```

### 4.3 CrosswordAction

Discriminated union for `useReducer` dispatch. Covers all user interactions.

```ts
type CrosswordAction =
  | { type: 'SELECT_CELL'; row: number; col: number }
  | { type: 'TOGGLE_DIRECTION' }
  | { type: 'SELECT_WORD'; wordId: number }
  | { type: 'TYPE_LETTER'; letter: string }
  | { type: 'BACKSPACE' }
  | { type: 'CHECK_WORD' }
  | { type: 'CHECK_PUZZLE' }
  | { type: 'USE_HINT' }
  | { type: 'RESET' };           // "Play again" — resets runtime state, keeps GridData
```

---

## 5. Scoring event types (public API)

Fired via `onScore` and `onGameComplete` props. Part of the public npm API surface.

### 5.1 ScoreEvent

```ts
interface ScoreEvent {
  gameId: 'crossword';
  action: 'word_correct' | 'hint_used';
  pointsDelta: number;           // +50 (word_correct) or −50 (hint_used)
  totalScore: number;            // running total after this action
  timestamp: number;             // Date.now()
}
```

### 5.2 SessionResult

```ts
interface SessionResult {
  gameId: 'crossword';
  finalScore: number;
  wordsCorrect: number;
  totalWords: number;            // placedWords.length from GridData
  hintsUsed: number;
  timeTakenMs: number;           // endTime − startTime
  completedAt: number;           // Date.now() when Check Puzzle pressed
}
```

### 5.3 FullSession

```ts
interface FullSession {
  resourceName: string;          // ResourceInput.name
  gamesPlayed: SessionResult[];  // one entry per completed game in this session
  totalScore: number;            // sum of all finalScore values
  sessionDurationMs: number;     // time from first upload to exit
}
```

---

## 6. Configuration types (public API)

### 6.1 ThemeConfig

```ts
interface ThemeConfig {
  primaryColor?: string;         // CSS colour value, default: indigo
  fontFamily?: string;           // CSS font-family string
  borderRadius?: string;         // CSS border-radius value
}
```

### 6.2 GameEngineProps

```ts
type GameId = 'impostor' | 'spiral' | 'speed-sniper' | 'black-box' | 'hangman' | 'crossword' | 'image-puzzle';

interface GameEngineProps {
  apiKey: string;                                       // required
  games?: GameId[];                                     // default: all 7
  theme?: ThemeConfig;                                  // default: indigo
  difficulty?: 'easy' | 'medium' | 'hard';             // default: 'medium'
  locale?: string;                                      // default: 'en'
  onScore?: (data: ScoreEvent) => void;
  onGameComplete?: (data: SessionResult) => void;
  onSessionEnd?: (data: FullSession) => void;
  maxFileSize?: number;                                 // bytes, default: 10485760
  hideUpload?: boolean;                                 // default: false
  resource?: ResourceInput;                             // pre-load without upload
}
```

---

## 7. Schema constraints summary

| Shape | Constraint | Source |
|---|---|---|
| `WordClue[]` from Claude | 8–12 items | PRD Section 7.1 |
| `WordClue.word` | Uppercase, letters only | PRD Section 7.1 |
| `PlacedWord[]` in GridData | Minimum 6 items (else re-prompt) | PRD Section 7.1 |
| `RawGrid` working size | 15×15 | PRD Section 7.1 |
| `GridData.cells` | Cropped to minimal bounding box | PRD Section 7.1 |
| `ScoreEvent.pointsDelta` | +50 (word correct) or −50 (hint) | PRD Section 5.4 |
| `SessionResult.finalScore` | Max ~600 | PRD Section 5.4 |
| `SessionState` | Never written to localStorage | PRD Section 9 |
| `GameEngineProps.apiKey` | Never logged, never stored | PRD Section 9 |
