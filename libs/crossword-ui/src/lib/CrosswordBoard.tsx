import React from 'react';
import { GameState } from '@game-engine/shared-types';
import { Grid } from './Grid.js';
import { ClueList } from './ClueList.js';
import { WinModal } from './WinModal.js';
import { useCrossword } from './useCrossword.js';
import { savePuzzle } from '@game-engine/puzzle-storage';
import styles from './crossword-ui.module.css';
import { useState } from 'react';

interface CrosswordBoardProps {
  initialData: GameState;
  onComplete?: () => void;
  onRestart?: () => void;
  onExit?: () => void;
  apiKey?: string;
}

export const CrosswordBoard: React.FC<CrosswordBoardProps> = ({
  initialData,
  onComplete,
  onRestart,
  onExit,
  apiKey: propApiKey,
}) => {
  const apiKey = propApiKey || (import.meta as any).env.VITE_OPENROUTER_API_KEY;
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  const { state, handlers } = useCrossword({
    initialData,
    onComplete,
    onRestart,
    apiKey
  });

  // Validation Check: Ensure data integrity
  React.useEffect(() => {
    const missingData = initialData.grid.some(row => 
      row.some(cell => !cell.isBlocked && !cell.correctLetter)
    );
    if (missingData) {
      console.error("CRITICAL: Puzzle loaded with missing correctLetter data! Submission will fail.");
    }
  }, [initialData]);

  const handleSave = () => {
    if (isSaved) return;

    savePuzzle({
      id: `puzzle_${Date.now()}`,
      topic: initialData.metadata.title,
      words: initialData.words,
      grid: state.grid,
      createdAt: Date.now(),
      score: state.score,
      hintsUsed: state.hintsUsed,
      elapsedSeconds: state.elapsedSeconds || 0,
      completedWords: state.completedWords,
      correctCount: state.completedWords.length,
      incorrectCount: initialData.words.length - state.completedWords.length
    });
    setIsSaved(true);
    setSaveStatus('Puzzle Saved!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className={styles.boardContainer}>
      <header className="bg-[#0f172a] rounded-2xl p-5 border border-slate-800 shadow-2xl space-y-4 mb-8 mt-4 mx-4">
        {/* Row 1: Back Button & Title */}
        <div className="flex items-center justify-between relative px-2">
          <button 
            className="px-4 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs font-bold hover:bg-slate-800 hover:text-slate-200 transition-all flex items-center gap-2"
            onClick={onExit}
            aria-label="Go back to main page"
          >
            ← Back
          </button>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-sky-400 to-indigo-500 rounded-full" />
            <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
              {initialData.metadata.title.toLowerCase().replace(/\s*crossword\s*$/i, '')} Crossword
            </h1>
          </div>

          <div className="flex-1" />
        </div>

        {/* Row 2: Unified Stats & Action Buttons (One Neat Path) */}
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4 px-2">
          {/* Stats Badges */}
          <div className="flex items-center gap-2 text-sm font-bold bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/50">
            <span className="text-slate-400 text-[10px] uppercase tracking-widest">Words</span>
            <span className="text-sky-400 font-black">{state.completedWords.length} / {initialData.words.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/50">
            <span className="text-slate-400 text-[10px] uppercase tracking-widest">Score</span>
            <span className="text-emerald-400 font-black">{state.score}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/50">
            <span className="text-slate-400 text-[10px] uppercase tracking-widest">Hints</span>
            <span className="text-amber-400 font-black">{state.hintsUsed}</span>
          </div>

          {/* Action Buttons Sequence */}
          <div className="flex flex-wrap items-center gap-3">
            {!state.isViewMode && (
              <>
                <button
                  className="px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border border-sky-500/30 text-sky-400 bg-sky-500/5 hover:bg-sky-500/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(56,189,248,0.1)]"
                  onClick={handlers.useAiHint}
                  disabled={state.hasWon || state.isHintLoading}
                >
                  {state.isHintLoading ? 'Thinking...' : 'AI Hint'}
                </button>
                <button
                  className="px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border border-rose-500/30 text-rose-400 bg-rose-500/5 hover:bg-rose-500/20 active:scale-95 transition-all"
                  onClick={handlers.handleRevealLetter}
                  disabled={state.hasWon}
                >
                  Reveal
                </button>
                <button
                  className="px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/60 active:scale-95 transition-all"
                  onClick={handlers.handleCheckWord}
                  disabled={state.hasWon}
                >
                  Check Word
                </button>
                <button
                  className="px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlers.handleCheckPuzzle}
                  disabled={state.isSubmitted}
                >
                  {state.isSubmitted ? 'SUBMITTED' : 'Submit Puzzle'}
                </button>
              </>
            )}
            <button
              className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                isSaved 
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-default' 
                : 'bg-white text-[#0f172a] hover:bg-slate-200 shadow-xl'
              }`}
              onClick={handleSave}
              disabled={isSaved}
            >
              {isSaved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>

        {/* Message Notifications Bar */}
        {(saveStatus || state.hasWon || state.aiHint) && (
          <div className="flex items-center gap-4 pt-2 border-t border-slate-800/50">
            {saveStatus && (
              <div className="text-emerald-400 text-xs font-bold animate-pulse flex items-center gap-1">
                <span className="text-[10px]">●</span> {saveStatus}
              </div>
            )}
            {state.hasWon && !state.isSubmitted && (
              <div className="text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase">
                Puzzle Complete 
              </div>
            )}
            {state.aiHint && (
              <div className="text-indigo-300 text-[11px] italic bg-slate-900/50 px-3 py-1 rounded border border-indigo-500/20 flex-1">
                <span className="font-bold text-indigo-400 not-italic mr-2">HINT:</span> {state.aiHint}
              </div>
            )}
          </div>
        )}
      </header>

      <main className={styles.boardLayout}>
        <Grid
          grid={state.grid}
          focus={state.focus}
          activeWordId={state.activeWordId}
          words={initialData.words}
          onCellFocus={handlers.handleCellFocus}
          onCellChange={handlers.handleCellChange}
          onCellKeyDown={handlers.handleCellKeyDown}
          onCellClick={handlers.handleCellClick}
          isSubmitted={state.isSubmitted}
          isViewMode={state.isViewMode}
          isAnswerMode={state.isAnswerMode}
        />

        <ClueList
          words={initialData.words}
          activeWordId={state.activeWordId}
          onWordClick={handlers.handleWordClick}
        />
      </main>

      {state.hasWon && (
        <WinModal 
          score={state.score} 
          hintsUsed={state.hintsUsed} 
          correctWords={state.completedWords.length}
          incorrectWords={initialData.words.length - state.completedWords.length}
          elapsedSeconds={state.elapsedSeconds || 0}
          onRestart={handlers.handleRestart} 
          onExit={onExit || (() => {})}
        />
      )}
    </div>
  );
};

