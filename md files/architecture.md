# architecture.md — Crossword Game
> Strictly derived from GameEngine PRD v1.0 · Sections 1, 5, 7, 9

---

## 1. System overview

GameEngine is a standalone, pluggable npm library. It is a single React component that the host application drops in. It has zero backend coupling — it calls the Claude API directly from the browser using the host's API key.

```
Host Application
└── <GameEngine apiKey="..." games={["crossword"]} ... />
        │
        ├── Upload UI layer
        │     └── File validation → text extraction (PDF.js)
        │
        ├── Resource processing layer
        │     └── Chunking (~2,000 tokens) → Claude summary API call
        │
        ├── Game generation layer
        │     └── Claude API call (crossword) → { word, clue }[] cached in session
        │
        ├── Game launcher UI
        │     └── Game cards → readiness indicators → launches CrosswordGame
        │
        └── CrosswordGame (lazy-loaded)
              ├── Grid generation engine (backtracking algorithm)
              ├── Grid UI (15×15 cropped to bounding box)
              ├── Clue list UI (across / down)
              ├── Interaction handler (click, type, backspace, hint)
              ├── Scoring engine (50 pts/word, −50 pts/hint)
              └── Results screen
```

---

## 2. Key architectural constraints from PRD

| Constraint | Source | Detail |
|---|---|---|
| Zero backend | Section 1 | Claude API called directly from browser using host's API key |
| API key security | Section 9 | API key must never be logged or stored in localStorage |
| Lazy loading | Section 9 | Each game loaded via dynamic import(); not in initial bundle |
| Core bundle size | Section 9 | < 120 KB gzipped |
| Game launch speed | Section 9 | < 200 ms from ready card click to first interactive frame |
| Generation speed | Section 9 | All games generated within 8 s of upload completing |
| Session caching | Section 5.1 | Generated game data cached for lifetime of browser session |
| TypeScript strict | Section 9 | tsc --strict, no implicit any, 100% typed public API |

---

## 3. Component tree — Crossword game

```
<GameEngine />
  <UploadScreen />                      — shown on first-time flow
  <Launcher />
    <ResourcePreviewStrip />            — file name + AI summary
    <GameCard gameId="crossword" />     — readiness state indicator
  <CrosswordGame />                     — lazy loaded via dynamic import()
    <GameHeader />                      — score display, progress bar, exit button
    <CrosswordGrid />                   — rendered 2D array of cells
      <GridCell />                      — individual cell (black / white / selected / correct / wrong)
    <CluePanel />
      <ClueList direction="across" />
      <ClueList direction="down" />
    <GameControls />                    — Hint button, Check Word, Check Puzzle
    <ResultsScreen />                   — shown after Check Puzzle
```

---

## 4. Data flow

```
1. User uploads file
        │
        ▼
2. FileValidator
   → type check (PDF / .txt / .md only)
   → size check (≤ 10 MB PDF, ≤ 200 KB text)
   → format sniff
        │
        ▼
3. TextExtractor
   → PDF.js for PDF files
   → direct read for .txt / .md
   → output: raw text string
        │
        ▼
4. Chunker
   → splits text into ~2,000 token semantic chunks
        │
        ▼
5. Claude API — summary call
   → input: chunked text
   → output: one-sentence resource summary (stored in session)
        │
        ▼
6. Claude API — crossword generation call (parallel with other games)
   → input: chunked text + prompt for 8–12 { word, clue } pairs
   → output: { word: string, clue: string }[]
   → cached in session state
        │
        ▼
7. GridGenerator (backtracking algorithm)
   → input: { word, clue }[]
   → sort words longest → shortest
   → place first word horizontally at centre of 15×15 grid
   → attempt intersections for remaining words (up to 500 tries/word)
   → if < 6 words placed → trigger re-prompt to Claude (step 6 repeats)
   → crop grid to minimal bounding box
   → output: GridData (2D cell array + placed word metadata)
        │
        ▼
8. CrosswordGrid renders
   → cells rendered from GridData
   → clue lists derived from placed word metadata
        │
        ▼
9. User interacts → InteractionHandler updates GridState
        │
        ▼
10. ScoringEngine
    → tracks: words correct, hints used
    → score = (words correct × 50) − (hints used × 50)
    → fires onScore callback (ScoreEvent) after each scored action
    → fires onGameComplete callback (SessionResult) on Check Puzzle
```

---

## 5. Session state shape

All state lives in memory (React state / context). Nothing written to localStorage.

```ts
interface SessionState {
  resource: ResourceInput | null;
  summary: string | null;
  games: {
    crossword: {
      status: 'idle' | 'generating' | 'ready' | 'error';
      data: CrosswordGameData | null;
      lastScore: number | null;
    };
    // ...other games
  };
}

interface CrosswordGameData {
  wordClues: WordClue[];       // raw from Claude API
  gridData: GridData;          // output of backtracking algorithm
}

interface WordClue {
  word: string;
  clue: string;
}

interface GridData {
  cells: GridCell[][];         // 2D array, cropped to bounding box
  placedWords: PlacedWord[];
}

interface GridCell {
  letter: string | null;       // null = black cell
  wordNumbers: number[];       // clue numbers that pass through this cell
  isWordStart: boolean;
  wordStartNumber: number | null;
}

interface PlacedWord {
  wordClue: WordClue;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
  number: number;              // clue number (1, 2, 3 ...)
}
```

---

## 6. Public API surface (Section 5.5)

```ts
// Props passed by host application to <GameEngine />
interface GameEngineProps {
  apiKey: string;                              // required — Anthropic API key
  games?: GameId[];                            // default: all 7
  theme?: ThemeConfig;                         // default: indigo
  difficulty?: 'easy' | 'medium' | 'hard';    // default: 'medium'
  locale?: string;                             // default: 'en'
  onScore?: (data: ScoreEvent) => void;        // fired after each scored action
  onGameComplete?: (data: SessionResult) => void; // fired when game ends
  onSessionEnd?: (data: FullSession) => void;  // fired when user exits engine
  maxFileSize?: number;                        // default: 10485760 (10 MB)
  hideUpload?: boolean;                        // default: false
  resource?: ResourceInput;                    // pre-load resource without upload
}
```

---

## 7. Technology stack (from PRD)

| Layer | Technology |
|---|---|
| Framework | React + TypeScript |
| Build tool | Vite (dynamic import() per game for lazy loading) |
| PDF extraction | PDF.js |
| AI backend | Claude API (Anthropic) — browser-direct, no backend proxy |
| Styling | Host-supplied theme via ThemeConfig prop |
| Type checking | tsc --strict |
| Accessibility | WCAG 2.1 AA — axe scan + manual keyboard test |
| Browser targets | Chrome 100+, Firefox 100+, Safari 16+, Edge 100+ |
