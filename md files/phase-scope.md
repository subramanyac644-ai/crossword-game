# phase-scope.md — Crossword Game
> Strictly derived from GameEngine PRD v1.0 · All sections

---

## Overview

The Crossword game is built as part of GameEngine (G6 of 7 games). The phases below cover everything needed to deliver a working, PRD-compliant Crossword game. Each phase has a clear entry condition, a defined deliverable, and an exit criterion tied directly to PRD requirements.

---

## Phase 1 — Project foundation

**Entry condition:** Empty repository

**Goal:** Working React + TypeScript project with Vite, correctly structured for lazy-loaded games and zero backend.

### Tasks
- Initialise project: `npm create vite@latest crossword-game -- --template react-ts`
- Install dependencies: `react`, `typescript`, `tailwindcss`, `pdfjs-dist`
- Configure `.env` for `VITE_ANTHROPIC_API_KEY` — never commit this key
- Create folder structure:
  ```
  src/
    components/
    services/
    types/
    hooks/
    App.tsx
  ```
- Set up TypeScript `strict` mode in `tsconfig.json` (`tsc --strict`, no implicit any)
- Configure Vite for dynamic `import()` per game component (lazy loading requirement)
- Set up Tailwind with the default theme configuration

**Exit criterion:** `npm run dev` works. `tsc --strict` passes with zero errors. Project builds with `vite build --report` and core bundle is on track for < 120 KB gzipped.

---

## Phase 2 — TypeScript types and data contracts

**Entry condition:** Phase 1 complete

**Goal:** All types defined before any implementation — zero implicit `any` throughout the project.

### Tasks
- Create `src/types/crossword.ts` with:
  - `WordClue`
  - `GridCell`
  - `PlacedWord`
  - `GridData`
  - `CrosswordGameData`
  - `CrosswordGameState`
- Create `src/types/engine.ts` with public API types:
  - `GameEngineProps`
  - `ScoreEvent`
  - `SessionResult`
  - `FullSession`
  - `ResourceInput`
  - `ThemeConfig`
- Create `src/types/session.ts` with:
  - `SessionState` (covers all 7 game slots; for now stub non-crossword games)

**Exit criterion:** All types in place. `tsc --strict` passes with zero errors.

---

## Phase 3 — Resource ingestion service

**Entry condition:** Phase 2 complete

**Goal:** File upload, validation, and text extraction working end-to-end.

### Tasks
- Build `src/services/fileValidator.ts`:
  - Type check: accept only `application/pdf`, `.txt`, `.md`
  - Size check: PDF ≤ 10 MB, text ≤ 200 KB
  - Format sniff: read first bytes to confirm declared type
  - Return: `{ valid: boolean; error?: string }`
- Build `src/services/textExtractor.ts`:
  - PDF: use PDF.js (`pdfjs-dist`) — extract text from max 50 pages
  - Plain text: direct `FileReader` read
  - Return: `string` (raw extracted text)
- Build `src/services/chunker.ts`:
  - Split extracted text into semantic chunks of ~2,000 tokens each
  - Return: `string[]`
- Build `src/components/UploadScreen.tsx`:
  - Drag-and-drop zone
  - Label: "Upload a resource to get started"
  - Calls `fileValidator` → shows error or proceeds
  - Shows progress indicator during extraction

**Exit criterion:** Upload a PDF and a .txt file. Both validate correctly. Text is extracted and chunked. Wrong file types and oversized files show a clear error message.

---

## Phase 4 — Claude API service

**Entry condition:** Phase 3 complete

**Goal:** Claude API calls firing correctly, returning parseable word/clue data, with error handling and retry.

### Tasks
- Build `src/services/claudeService.ts`:
  - `generateSummary(chunks: string[], apiKey: string): Promise<string>`
    - One-sentence summary for resource preview strip
  - `generateCrosswordWords(chunks: string[], apiKey: string): Promise<WordClue[]>`
    - Returns 8–12 `{ word, clue }` pairs
    - Strip ` ```json ` fences before `JSON.parse()`
    - Validate: array length 8–12, each item has `word` (string) and `clue` (string)
  - `regenerateCrosswordWords(chunks: string[], apiKey: string): Promise<WordClue[]>`
    - Re-prompt variant used when < 6 words placed (same return type)
  - All calls wrapped in try/catch; on failure throw typed error for UI to catch
- API key passed from props into service calls — never stored, never logged
- All calls use model `claude-sonnet-4-20250514`, `max_tokens: 1000`

**Exit criterion:** Upload a PDF. Claude returns 8–12 word/clue pairs. API error (wrong key, network failure) shows user-facing error + retry button. Response parses correctly.

---

## Phase 5 — Grid generation engine

**Entry condition:** Phase 4 complete

**Goal:** Backtracking placement algorithm producing a valid crossword grid from any list of 8–12 words.

### Tasks
- Build `src/services/gridGenerator.ts` implementing the algorithm exactly as PRD Section 7.1:
  1. Sort words longest → shortest
  2. Place first word horizontally at centre of 15×15 grid
  3. For each subsequent word, test all valid intersections with already-placed words
  4. Try up to 500 positions per word before skipping
  5. If fewer than 6 words placed → return `{ success: false }` so caller can re-prompt
  6. Crop grid to minimal bounding box
  7. Return `GridData` (typed 2D cell array + `PlacedWord[]`)
- Build `src/services/crosswordOrchestrator.ts`:
  - Calls `generateCrosswordWords` → runs `gridGenerator`
  - If `success: false` → calls `regenerateCrosswordWords` → runs `gridGenerator` again
  - If still `success: false` after re-prompt → sets card to error state
  - On success → caches `CrosswordGameData` in session state

**Exit criterion:** Feed 10 arbitrary words into `gridGenerator`. Grid renders correctly. At least 6 words are always placed. Fewer-than-6 case triggers re-prompt path.

---

## Phase 6 — Game UI

**Entry condition:** Phase 5 complete — `GridData` available

**Goal:** Fully interactive crossword grid with clue list, matching all interaction requirements from PRD Section 7.2.

### Tasks
- Build `src/components/CrosswordGrid.tsx`:
  - Renders 2D array of `GridCell` components
  - Black cells: non-interactive, dark background
  - White cells: show user-typed letter; small number label if `isWordStart`
  - Selected cell: highlighted; entire selected word highlighted
- Build `src/components/GridCell.tsx`:
  - `state` prop controls visual: `default | selected | highlighted | correct | incorrect | revealed`
  - Keyboard event handler: letter keys fill cell + advance; Backspace clears + retreats
- Build `src/components/CluePanel.tsx`:
  - Two columns: Across | Down
  - Each clue: number + clue text
  - Active clue highlighted
  - Clicking a clue → selects that word in the grid
- Build `src/components/GameControls.tsx`:
  - "Hint" button: reveals one letter in selected word; fires score deduction
  - "Check word" button: highlights cells green/red for selected word
  - "Check puzzle" button: ends game, triggers results screen
- Build `src/components/GameHeader.tsx`:
  - Score display (updates in real time)
  - Progress bar (% of cells correctly filled)
  - Exit/pause button (returns to launcher, saves last score)
- Implement interaction rules (PRD Section 7.2):
  - Click cell → select; click same cell → toggle direction
  - Click clue → select word in grid
  - Type → fill + advance
  - Backspace → clear + retreat
- All interactive elements keyboard-navigable (WCAG 2.1 AA)
- ARIA labels on all game controls

**Exit criterion:** Full game playable. All 7 interactions from PRD Section 7.2 work correctly. Keyboard-only navigation works end-to-end. Axe scan passes.

---

## Phase 7 — Scoring engine and results screen

**Entry condition:** Phase 6 complete

**Goal:** Correct scoring implementation, results screen, and event callbacks.

### Tasks
- Build `src/services/scoringEngine.ts`:
  - `scoreWord(state: CrosswordGameState, wordId: number): CrosswordGameState`
    - Checks if all letters of the word match correctly
    - If correct: `score += 50`, `wordsCorrect += 1`, fire `onScore(ScoreEvent)`
  - `scoreHint(state: CrosswordGameState): CrosswordGameState`
    - `score -= 50`, `hintsUsed += 1`, fire `onScore(ScoreEvent)`
  - `finalizePuzzle(state: CrosswordGameState): SessionResult`
    - Calculates `timeTakenMs`, builds `SessionResult`, fires `onGameComplete`
- Build `src/components/ResultsScreen.tsx`:
  - Shows: total score, words correct / total, hints used, time taken
  - "Play again" button: resets `CrosswordGameState`, same `GridData`
  - "Try another game" button: returns to launcher

**Exit criterion:** Complete a full game. Score updates correctly (+50 per word, −50 per hint). Results screen shows correct breakdown. `onScore` and `onGameComplete` callbacks fire with correct data shapes.

---

## Phase 8 — Session state, launcher, and caching

**Entry condition:** Phase 7 complete

**Goal:** Session caching, launcher integration, returning-user flow, and controlled mode.

### Tasks
- Build `src/context/SessionContext.tsx`:
  - Holds `SessionState` in React context
  - No localStorage writes — memory only
  - `crossword.lastScore` persists within session
- Build `src/components/Launcher.tsx`:
  - Grid of game cards
  - Crossword card: shows readiness state (`generating | ready | error`), last-score badge
  - Resource preview strip: file name + summary
  - Re-upload button: clears session, returns to upload screen
- Implement controlled mode: if `resource` prop passed → skip upload screen → generation starts on mount
- Implement parallel generation: `generateSummary` + `generateCrosswordWords` fire simultaneously (Promise.all)

**Exit criterion:** Upload, play a game, exit to launcher — last-score badge appears. Re-upload clears session. Controlled mode (resource prop) skips upload screen. Crossword card transitions: `generating → ready` within 8 s of upload.

---

## Phase 9 — Non-functional requirements and polish

**Entry condition:** Phase 8 complete — full game working

**Goal:** Meet all PRD Section 9 non-functional requirements before ship.

### Tasks
- Bundle audit: run `vite build --report` — confirm core bundle < 120 KB gzipped
- Confirm Crossword loads via `dynamic import()` — not in initial bundle
- Game launch speed: measure click-to-first-interactive-frame — must be < 200 ms
- API key audit: grep bundle output — key must not appear; must not be in localStorage
- Browser testing: Chrome 100+, Firefox 100+, Safari 16+, Edge 100+
- Accessibility: run Axe scan, manual keyboard test — all controls reachable
- TypeScript: `tsc --strict` zero errors
- Error simulation: cut network; confirm error state + retry button appear on Crossword card
- Generation timing: measure upload → all games ready — must be ≤ 8 s

**Exit criterion:** All 9 non-functional requirements from PRD Section 9 pass their defined measurement criteria.

---

## Scope boundary — what is NOT in scope (PRD Section 2.3)

| Item | Reason |
|---|---|
| React Native / mobile app | Web only in v1 |
| Multiplayer | Not in v1 |
| Persistent cross-session leaderboards | Host manages via callbacks |
| Self-hosted AI models | Claude API only in v1 |
| DOCX / PPTX / URL input | Deferred to v2 |
| Other 6 games (G1–G5, G7) | Separate parallel workstreams |
