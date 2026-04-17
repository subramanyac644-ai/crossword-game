1. Game identity
FieldValueGame IDG6NameCrosswordTagWord / spatialResource typeAny text / PDFDifficultyMedium → HardSession length8 – 20 minMax score~600 pts

2. Resource ingestion requirements
2.1 Supported input types

PDF — text extracted via PDF.js, max 10 MB, max 50 pages parsed
Plain text (.txt, .md) — UTF-8, max 200 KB

2.2 Processing pipeline (all games share this)

File validation: type check, size check, format sniff
Text extraction: PDF → raw text chunks → token-counted segments
Chunking: split into semantic chunks of ~2,000 tokens each
Context summary: Claude generates a short resource summary stored in session
Per-game generation: one API call per game type, results cached in session

2.3 Generation timing

Generation is triggered on resource upload, not on game launch
All enabled games generate in parallel immediately after upload completes
Target: full generation for all 7 games within 8 seconds on a standard API tier
Games with completed generation are enabled instantly; others show a loading state
Cached game data persists for the lifetime of the browser session


3. AI content generation requirements
3.1 Output format
Claude must return a list of { word, clue } pairs:

Minimum 8 pairs requested
Maximum 12 pairs requested
Clues must be resource-specific (e.g. "the process described in section 2") — NOT generic dictionary definitions

3.2 Re-prompt condition

If the backtracking algorithm places fewer than 6 words successfully, Claude must be re-prompted for replacement words
This re-prompt is automatic and transparent to the user


4. Grid generation requirements (Section 7.1)
The grid is auto-generated using a backtracking placement algorithm:

AI returns a list of { word, clue } pairs (8–12 words)
Words sorted longest-to-shortest
First word placed horizontally at centre of a 15×15 grid
Each subsequent word tested for valid intersections (shared letters) with already-placed words
Backtracking algorithm tries up to 500 positions per word before skipping
Minimum 6 words must be placed; if fewer intersect, AI is re-prompted for replacements
Final grid cropped to minimal bounding box


5. Interaction model requirements (Section 7.2)
InteractionRequired behaviourClick a cellSelects the cell; starts entering in current directionClick same cell againToggles direction between across / downClick a clue in clue listSelects the corresponding cells in the gridType a letterFills the selected cell and advances cursor to next cell in the wordBackspaceClears the current cell and moves cursor backward"Check word" buttonHighlights correct letters green, incorrect letters red"Check puzzle" buttonEnds the game and reveals the score breakdownHint buttonReveals one letter in the selected word; costs 50 pts per use

6. Scoring requirements (Section 5.4)
ElementRuleBase points50 pts per correct wordHint penalty−50 pts per hint usedMaximum score~600 ptsModifiersNone beyond hint penalty

7. In-game common feature requirements (Section 5.3)
All games including Crossword must include:

Score display — current score visible at all times
Pause / exit — saves progress in session state, returns to launcher
Hint system — hint deducts 50 pts, reveals one letter in selected word
Progress bar — shows completion percentage of the current game session
Results screen — score breakdown, correct/incorrect count, time taken, play again and try another game options
Accessibility — all interactive elements keyboard-navigable, ARIA labels on game controls, colour contrast WCAG 2.1 AA compliant


8. Non-functional requirements (Section 9)
AreaRequirementMeasurementPerformanceGame generation completes in < 8 s for all 7 gamesFrom upload complete to last game readyPerformanceGame launch from ready state < 200 msTime from click to first interactive frameBundle sizeCore bundle < 120 KB gzippedvite build --reportBundle sizeEach game lazy-loaded; not in initial bundleDynamic import() per game componentAccessibilityWCAG 2.1 AA complianceAxe scan + manual keyboard testBrowser supportChrome 100+, Firefox 100+, Safari 16+, Edge 100+BrowserStack automated testsSecurityAPI key never logged or stored in localStorageSecurity audit of bundle outputError handlingAll API failures show user-facing error + retrySimulated API failure testsTypeScript100% typed public API; no implicit anytsc --strict passes with zero errors

9. Out of scope for v1 (Section 2.3 Non-goals)

Native mobile apps (React Native) — web only
Multiplayer or real-time co-op sessions
Persistent user accounts or cross-session leaderboards
Self-hosted AI model support — Claude API only
DOCX, PPTX, URL/webpage scrape as input (deferred to v2)
