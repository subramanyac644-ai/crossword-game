# app-flow.md — Crossword Game
> Strictly derived from GameEngine PRD v1.0 · Section 8 (UX flows), Section 5.1, Section 7

---

## 1. First-time flow (Section 8.1)

This is the flow every new user goes through when they open the engine for the first time in a session.

```
Step 1 — Upload screen
  User sees a drag-and-drop zone
  Text reads: "Upload a resource to get started"
  Accepted: PDF (max 10 MB, max 50 pages) or plain text .txt / .md (max 200 KB)

        ↓  user drops or selects a file

Step 2 — Validation
  Engine runs: type check → size check → format sniff
  If validation FAILS  →  show error message with reason, return to upload screen
  If validation PASSES →  proceed immediately

        ↓  validation passes

Step 3 — AI generation starts (background)
  Text extraction begins (PDF.js for PDF, direct read for .txt/.md)
  Content chunked into ~2,000-token segments
  Claude generates a short resource summary
  Claude API call fires for Crossword word/clue generation (parallel with other games)
  Launcher appears IMMEDIATELY — Crossword card shows "generating" state

        ↓  generation completes (target: within 8 s)

Step 4 — Crossword card becomes ready
  Card changes from "generating" to "ready"
  Resource preview strip shows: uploaded file name + one-sentence AI summary

        ↓  user clicks the Crossword card

Step 5 — Game launches
  Crossword loads fullscreen within the plugin container
  Grid renders with all cells, across/down clue lists displayed
  Score = 0, timer starts, progress bar at 0%

        ↓  user plays (see Section 3 below for in-game flow)

Step 6 — Game ends
  User clicks "Check puzzle" button
  Results screen shown: score breakdown, time taken, correct/incorrect count
  Two options: "Play again" | "Try another game"
```

---

## 2. Returning flow — same session (Section 8.2)

When the user has already uploaded a resource and returns to the launcher within the same browser session.

```
Launcher shown
  All game cards are ready (cached from first generation)
  Previously played games show a last-score badge on their card
  Crossword card shows the score from the last completed session (if any)

        ↓  user clicks Crossword card

Game launches immediately (< 200 ms, PRD Section 9)
  Cached word/clue pairs used — no new API call
  Fresh grid generated from cached data
  Timer and score reset

        ↓  optionally

Re-upload button clicked
  Session cleared
  All cached game data discarded
  Engine returns to Step 1 (upload screen)
```

---

## 3. In-game flow — Crossword (Section 7.2)

```
Game loaded
  15×15 grid (cropped to bounding box) displayed
  Across clues list on one side, Down clues list on the other
  Score display shows current score
  Progress bar at 0%
  Hint button visible

        ↓  user interaction loop

[ Select a cell ]
  Click any white cell → cell highlighted, word highlighted
  Click same cell again → direction toggles (across ↔ down)
  Click a clue in the clue list → corresponding cells highlighted in grid

[ Type a letter ]
  Letter fills the selected cell
  Cursor auto-advances to next cell in the word
  If end of word reached, cursor stays on last cell

[ Backspace ]
  Clears the current cell
  Cursor moves backward one cell in the word

[ Use hint ]
  One letter in the selected word is revealed
  Score immediately deducted by 50 pts
  Hint count incremented

[ Check word ]
  Correct letters → highlighted green
  Incorrect letters → highlighted red
  No score change on check

[ Check puzzle ]
  Game ends
  Final score calculated: (words correct × 50) − (hints used × 50)
  → Go to Results screen

        ↓  results screen

Results screen shows:
  - Total score
  - Number of words correct / total words
  - Number of hints used
  - Time taken
  - "Play again" button → resets grid, same word set, score = 0
  - "Try another game" button → returns to launcher
```

---

## 4. Controlled mode flow (Section 8.3)

Used when the host application pre-loads a resource programmatically via the `resource` prop.

```
Host passes resource prop to <GameEngine />
  Upload UI is skipped entirely (hideUpload = true implied)
  Generation starts immediately on component mount

        ↓

User lands on launcher
  Game cards show "generating" state
  Cards become ready one by one as generation completes

        ↓

Crossword card ready → user clicks → game launches
  (same in-game flow as Section 3 above)
```

---

## 5. Error states

| Error trigger | User-facing behaviour |
|---|---|
| File too large (> 10 MB PDF / > 200 KB text) | Validation fails; error message shown; return to upload screen |
| Wrong file type | Validation fails; error message shown; return to upload screen |
| Claude API call fails | User-facing error + retry button shown on the Crossword card |
| Fewer than 6 words placed by algorithm | Automatic re-prompt to Claude; user sees "generating" state continue |
| Re-prompt also fails | Error state on card; retry button offered |
