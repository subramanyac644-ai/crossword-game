# skills.md — Crossword Game
> Developer skill guide · Strictly derived from GameEngine PRD v1.0

This file documents every technical skill and implementation knowledge area required to build the Crossword game (G6) to PRD specification.

---

## 1. React + TypeScript (strict)

**Why needed:** The entire engine is built in React with TypeScript. The PRD mandates tsc --strict, no implicit any, and 100% typed public API (Section 9).

**What you must know:**
- Functional components and hooks (`useState`, `useEffect`, `useReducer`, `useContext`, `useCallback`, `useMemo`)
- `useReducer` for complex game state (grid state, selection, score, direction)
- `useContext` for session state shared across components (game data cache, last scores)
- TypeScript strict mode: explicit return types, no implicit any, discriminated unions for cell states
- Generic types for reusable service functions
- Type narrowing with `in`, `typeof`, `instanceof`

**PRD reference:** Section 1 (framework), Section 9 (TypeScript requirement)

---

## 2. Vite and dynamic import (lazy loading)

**Why needed:** PRD Section 9 mandates each game is lazy-loaded via `dynamic import()` — not included in the initial bundle. Core bundle must be < 120 KB gzipped.

**What you must know:**
- `React.lazy(() => import('./CrosswordGame'))` pattern
- `<Suspense fallback={...}>` wrapping lazy components
- Vite build configuration for code splitting
- `vite build --report` to audit bundle size
- How to measure gzipped output size

**PRD reference:** Section 9 (bundle size, lazy loading)

---

## 3. PDF.js (pdfjs-dist)

**Why needed:** PDFs are the primary resource type. Text must be extracted from PDFs up to 10 MB / 50 pages (PRD Section 5.1).

**What you must know:**
- Load PDF from `ArrayBuffer` using `pdfjsLib.getDocument()`
- Iterate pages up to 50: `pdf.getPage(i)` → `page.getTextContent()` → join text items
- Set `workerSrc` correctly for Vite projects
- Handle password-protected or corrupt PDFs gracefully (return error, not crash)

**PRD reference:** Section 5.1 (resource ingestion, PDF support)

---

## 4. File validation and the FileReader API

**Why needed:** All uploads must be validated before processing (PRD Section 5.1 — type check, size check, format sniff).

**What you must know:**
- `File` object properties: `name`, `size`, `type`
- Magic byte / format sniff: read first 4–8 bytes to confirm PDF magic (`%PDF`)
- `FileReader.readAsArrayBuffer()` for PDF extraction
- `FileReader.readAsText()` for .txt / .md files
- Drag-and-drop API: `dragover`, `drop`, `dataTransfer.files`
- Input `accept` attribute for MIME filtering

**PRD reference:** Section 5.1 (file validation pipeline)

---

## 5. Claude API (Anthropic — browser-direct)

**Why needed:** All game content is generated at runtime by Claude. No backend proxy — API is called directly from the browser using the host's API key (PRD Section 1, Section 9).

**What you must know:**
- `fetch` to `POST https://api.anthropic.com/v1/messages`
- Request headers: `Content-Type: application/json` (API key handled by proxy or passed in header)
- Request body shape: `model`, `max_tokens`, `messages[]`
- Response shape: `data.content[0].text`
- Parsing Claude's JSON output: strip ` ```json ` fences before `JSON.parse()`
- Error handling: catch network errors, HTTP 4xx/5xx, malformed JSON
- API key security: pass as prop, use in-memory only, never log, never write to localStorage

**PRD reference:** Section 1 (AI backend), Section 5.1 (per-game generation), Section 9 (security)

---

## 6. Text chunking

**Why needed:** Extracted text must be split into ~2,000-token semantic chunks before sending to Claude (PRD Section 5.1).

**What you must know:**
- Approximate token counting: ~4 characters per token for English text
- Split on paragraph boundaries (double newline) where possible — prefer semantic splits over hard character limits
- If a paragraph exceeds 2,000 tokens, split on sentence boundaries
- Pass chunks as concatenated context in Claude prompt (or as separate user messages if context window requires)

**PRD reference:** Section 5.1 (chunking step in processing pipeline)

---

## 7. Backtracking grid placement algorithm

**Why needed:** The crossword grid is auto-generated using a backtracking algorithm. PRD Section 7.1 specifies the exact algorithm steps.

**What you must know:**
- Represent the grid as a 2D array: `string[][]` (empty string = blank, '#' = black, letter = placed)
- Sort words by length descending before placement
- Place first word at centre of 15×15: `startCol = Math.floor((15 - word.length) / 2)`, `startRow = 7`
- For each subsequent word: iterate all already-placed words → find shared letters → compute intersection position → check if placement fits grid without conflict
- Conflict check: adjacent cells must be empty (no touching of parallel words), crossing cell must match the shared letter
- Try up to 500 positions per word; skip word if none found
- Track placed words as `PlacedWord[]` with direction, startRow, startCol, clue number
- After placement: find bounding box (`minRow`, `maxRow`, `minCol`, `maxCol`) → crop grid
- Return `{ success: boolean; gridData?: GridData }` — `success: false` if < 6 words placed

**PRD reference:** Section 7.1 (steps 1–7)

---

## 8. Crossword grid UI (CSS Grid / absolute positioning)

**Why needed:** The grid must render a variable-size 2D array of cells, with correct visual states for each cell (PRD Section 7.2).

**What you must know:**
- CSS Grid with dynamic `grid-template-columns: repeat(N, 1fr)` where N = `gridData.cols`
- Render black cells vs white cells based on `cell.letter === null`
- Position clue number labels in top-left corner of word-start cells using `position: absolute`
- Cell visual states: default / selected / highlighted (word) / correct (green) / incorrect (red) / revealed (hint)
- Keep cells square: use `aspect-ratio: 1` or `padding-top: 100%` trick
- Scroll container for large grids on small screens

**PRD reference:** Section 7.2 (interaction model), Section 9 (WCAG 2.1 AA)

---

## 9. Keyboard and interaction handling

**Why needed:** PRD Section 7.2 specifies 7 exact interaction behaviours. Section 9 requires full keyboard navigability (WCAG 2.1 AA).

**What you must know:**
- `onKeyDown` on a focused container or cell
- Letter key detection: `e.key.length === 1 && /[a-zA-Z]/.test(e.key)`
- Backspace handling: clear cell, move cursor to previous cell in word
- Arrow key navigation (for accessibility — move between cells)
- Direction toggle: track `selectedDirection` in state; click same cell → flip
- Cursor advancement: given current cell and direction, find next cell in the same word
- `tabIndex` and `onFocus` for keyboard tab navigation to cells and clue list items
- ARIA roles: `role="grid"`, `role="gridcell"`, `aria-selected`, `aria-label` on controls

**PRD reference:** Section 7.2, Section 5.3 (accessibility), Section 9 (WCAG)

---

## 10. Scoring engine

**Why needed:** PRD Section 5.4 specifies exact scoring rules for Crossword.

**What you must know:**
- Score formula: `(wordsCorrect × 50) − (hintsUsed × 50)`, max ~600
- Word correct check: compare all `userLetter` values in a `PlacedWord`'s cells against correct `letter` values
- Hint: reveal one letter in selected word → find first unrevealed cell → set `userLetter` = `letter`, mark `state: 'revealed'`
- Score state is a running total — update after each word completion or hint
- Build and fire `ScoreEvent` after each action; build and fire `SessionResult` on game end

**PRD reference:** Section 5.4, Section 7.2 (hint cost)

---

## 11. Session state management (in-memory only)

**Why needed:** Generated game data must be cached for the session lifetime without using localStorage (PRD Section 5.1, Section 9 security).

**What you must know:**
- React context + useReducer for session state
- State persists in memory across launcher ↔ game navigation (using component tree, not re-mounting)
- Last score per game persists in session: show badge on launcher card
- Re-upload action clears all session state and returns to upload screen
- Never call `localStorage.setItem` or `sessionStorage.setItem` anywhere in the codebase

**PRD reference:** Section 5.1 (caching), Section 8.2 (returning flow), Section 9 (security)

---

## 12. Progress bar and timer

**Why needed:** PRD Section 5.3 requires a progress bar (completion %) and the results screen requires time taken.

**What you must know:**
- Start timer with `Date.now()` when game loads; store `startTime` in state
- Calculate `timeTakenMs = Date.now() - startTime` on game end
- Progress: `(cellsCorrectlyFilled / totalWhiteCells) * 100` — update after each cell fills correctly
- Or simpler progress: `(wordsCorrect / totalWords) * 100`
- Display as a `<progress>` element or a CSS width-animated div

**PRD reference:** Section 5.3 (progress bar, results screen)

---

## 13. Accessibility (WCAG 2.1 AA)

**Why needed:** PRD Section 5.3 and Section 9 mandate WCAG 2.1 AA compliance.

**What you must know:**
- Colour contrast: all text on coloured backgrounds must meet 4.5:1 ratio (normal text) or 3:1 (large text)
- Green/red feedback must not rely on colour alone — add icon or text label for colour-blind users
- Focus indicators: visible focus ring on all interactive elements
- ARIA grid semantics: `role="grid"` on grid container, `role="row"` on each row, `role="gridcell"` on each cell
- ARIA on buttons: `aria-label="Hint: costs 50 points"`, `aria-label="Check word"`, `aria-label="Check puzzle"`
- Axe DevTools for automated scanning
- Manual test: tab through entire game, play without mouse

**PRD reference:** Section 5.3, Section 9

---

## 14. Error handling and retry UI

**Why needed:** PRD Section 9 mandates all API failures show a user-facing error + retry button.

**What you must know:**
- Catch all `fetch` rejections and non-2xx responses in `claudeService.ts`
- Translate to a typed error: `{ code: 'api_error' | 'parse_error' | 'insufficient_words'; message: string }`
- Surface error on the Crossword game card (not as a browser alert)
- Retry button re-triggers the generation function from the beginning
- Never expose raw API error messages (e.g. Anthropic error bodies) directly to the user

**PRD reference:** Section 9 (error handling)
