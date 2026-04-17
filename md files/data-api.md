# data-api.md — Crossword Game
> Strictly derived from GameEngine PRD v1.0 · Sections 5.1, 5.4, 5.5, 7, 9

---

## 1. External API — Claude (Anthropic)

The engine calls the Claude API directly from the browser. No backend proxy. The host's API key is passed as a prop and used only in memory — never logged, never stored in localStorage (PRD Section 9).

### 1.1 Endpoint

```
POST https://api.anthropic.com/v1/messages
```

### 1.2 Crossword generation call

**When triggered:** Immediately after upload validation passes (parallel with other game generation calls). Target: complete within 8 s of upload finishing.

**Request body:**

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1000,
  "messages": [
    {
      "role": "user",
      "content": "<chunked resource text>\n\nFrom the above resource, extract 8 to 12 key terms and generate a clue for each. Each clue must be specific to the content of the resource (e.g. 'the process described in section 2'), NOT a generic dictionary definition. Return only a JSON array in this exact shape with no preamble or markdown:\n[{\"word\": \"EXAMPLE\", \"clue\": \"...\"}]"
    }
  ]
}
```

**Expected response — `data.content[0].text`:**

```json
[
  { "word": "PHOTOSYNTHESIS", "clue": "The energy conversion process described in chapter 3" },
  { "word": "CHLOROPLAST", "clue": "The organelle where the light reactions take place" },
  ...
]
```

**Constraints on Claude output:**
- 8–12 `{ word, clue }` objects (PRD Section 7.1)
- Words must be uppercase (for grid processing)
- Clues must be resource-specific, not dictionary definitions (PRD Section 4, G6)
- Response must be parseable JSON array — strip any ` ```json ` fences before `JSON.parse()`

### 1.3 Re-prompt call

**When triggered:** If the backtracking algorithm places fewer than 6 words (PRD Section 7.1, step 6).

**Request body:** Same structure as 1.2, with an additional instruction:

```json
{
  "role": "user",
  "content": "<chunked resource text>\n\nThe previous word list produced fewer than 6 intersecting words in the crossword grid. Please generate a new list of 8 to 12 key terms that are more likely to share common letters (e.g. prefer terms with E, A, R, S, T, N). Return only a JSON array: [{\"word\": \"...\", \"clue\": \"...\"}]"
}
```

### 1.4 Resource summary call

**When triggered:** Immediately after text extraction, before game generation (one call per upload, shared across all games).

**Request body:**

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 100,
  "messages": [
    {
      "role": "user",
      "content": "<chunked resource text>\n\nWrite a single sentence summarising this resource. Return only the sentence, no preamble."
    }
  ]
}
```

**Output:** Plain string — shown in the resource preview strip on the launcher.

### 1.5 Error handling

All Claude API calls must be wrapped in try/catch. On failure:
- Crossword card shows error state
- User-facing error message displayed
- Retry button offered (PRD Section 9 — error handling requirement)
- Do not expose raw API error messages to the user

---

## 2. Internal data types

All types below are used internally within the Crossword game. They are not part of the public npm API surface.

### 2.1 WordClue

```ts
interface WordClue {
  word: string;   // uppercase, letters only
  clue: string;   // resource-specific clue text
}
```

### 2.2 GridCell

```ts
interface GridCell {
  letter: string | null;         // null = black/blocked cell
  userLetter: string | null;     // what the user has typed (null = empty)
  wordNumbers: number[];         // clue numbers passing through this cell
  isWordStart: boolean;          // true if a clue number label sits here
  wordStartNumber: number | null;
  state: 'default' | 'selected' | 'highlighted' | 'correct' | 'incorrect' | 'revealed';
}
```

### 2.3 PlacedWord

```ts
interface PlacedWord {
  id: number;                    // sequential clue number (1, 2, 3...)
  wordClue: WordClue;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
  length: number;
}
```

### 2.4 GridData

```ts
interface GridData {
  cells: GridCell[][];           // 2D array — rows × cols (cropped bounding box)
  rows: number;
  cols: number;
  placedWords: PlacedWord[];
}
```

### 2.5 CrosswordGameData

```ts
interface CrosswordGameData {
  wordClues: WordClue[];         // raw output from Claude, 8–12 items
  gridData: GridData;            // output of backtracking algorithm
}
```

### 2.6 CrosswordGameState (runtime)

```ts
interface CrosswordGameState {
  grid: GridCell[][];            // mutable copy of gridData.cells — updated as user types
  selectedCell: { row: number; col: number } | null;
  selectedDirection: 'across' | 'down';
  selectedWordId: number | null;
  score: number;                 // starts at 0; +50 per correct word; −50 per hint
  hintsUsed: number;
  wordsCorrect: number;
  startTime: number;             // Date.now() when game loaded
  isComplete: boolean;
}
```

---

## 3. Public event callbacks (Section 5.5)

These are fired by the engine and consumed by the host application.

### 3.1 ScoreEvent — fired after each scored action

```ts
interface ScoreEvent {
  gameId: 'crossword';
  action: 'word_correct' | 'hint_used';
  pointsDelta: number;           // +50 for correct word, −50 for hint
  totalScore: number;            // running total
  timestamp: number;
}
```

### 3.2 SessionResult — fired when game ends (Check Puzzle)

```ts
interface SessionResult {
  gameId: 'crossword';
  finalScore: number;
  wordsCorrect: number;
  totalWords: number;
  hintsUsed: number;
  timeTakenMs: number;
  completedAt: number;           // Unix timestamp
}
```

### 3.3 FullSession — fired when user exits the engine

```ts
interface FullSession {
  resourceName: string;
  gamesPlayed: SessionResult[];
  totalScore: number;
  sessionDurationMs: number;
}
```

---

## 4. Public configuration props (Section 5.5)

| Prop | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | required | Anthropic API key — passed in memory only, never stored |
| `games` | `GameId[]` | all 7 | Pass `['crossword']` to restrict to Crossword only |
| `theme` | `ThemeConfig` | indigo | Primary colour, font, border radius |
| `difficulty` | `'easy' \| 'medium' \| 'hard'` | `'medium'` | Override Crossword difficulty |
| `locale` | `string` | `'en'` | Language for UI strings |
| `onScore` | `(data: ScoreEvent) => void` | undefined | Fired after each scored action |
| `onGameComplete` | `(data: SessionResult) => void` | undefined | Fired when game ends |
| `onSessionEnd` | `(data: FullSession) => void` | undefined | Fired when user exits engine |
| `maxFileSize` | `number` (bytes) | `10485760` | Override upload file size limit |
| `hideUpload` | `boolean` | `false` | Hide upload UI; inject resource programmatically |
| `resource` | `ResourceInput` | undefined | Pre-load a resource without user upload |

---

## 5. File validation rules (Section 5.1)

| Input type | Allowed MIME / extension | Max size | Notes |
|---|---|---|---|
| PDF | `application/pdf` / `.pdf` | 10 MB | Max 50 pages parsed |
| Plain text | `text/plain` / `.txt`, `.md` | 200 KB | UTF-8 only |
| Image | Not accepted for Crossword | — | Images only accepted by G7 (Image puzzle) |
