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
      <header className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-6 mb-8 mt-4 mx-4">
        {/* Top Navigation & Title Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="w-full md:w-auto flex justify-start">
            <button 
              className="px-5 py-2.5 rounded-xl transition-all duration-300 font-bold shadow-lg active:scale-95 flex items-center gap-2 border-2 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500"
              onClick={onExit}
              aria-label="Go back to main page"
            >
              ← Back
            </button>
          </div>

          <div className="flex-1 text-center">
            <h1 className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 tracking-tight drop-shadow-[0_2px_15px_rgba(129,140,248,0.4)] uppercase">
              {initialData.metadata.title}
            </h1>
            {state.isViewMode && (
              <button 
                onClick={handlers.toggleAnswerMode}
                className={`mt-3 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-500 border-2 ${
                  state.isAnswerMode 
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                  : "bg-blue-500/10 border-blue-500/50 text-blue-400 hover:border-blue-400"
                }`}
              >
                {state.isAnswerMode ? "Showing Solutions ✓" : "Quiz Mode Active"}
              </button>
            )}
          </div>

          <div className="w-full md:w-auto flex flex-wrap justify-center md:justify-end gap-3">
            {!state.isViewMode && (
              <>
                <button
                  className="px-4 py-2.5 rounded-xl transition-all duration-300 font-bold shadow-lg active:scale-95 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlers.useAiHint}
                  disabled={state.hasWon || state.isHintLoading}
                >
                  <span className="text-lg">💡</span>
                  {state.isHintLoading ? 'Thinking...' : 'AI Hint'}
                </button>
                <button
                  className="px-4 py-2.5 rounded-xl transition-all duration-300 font-bold shadow-lg active:scale-95 flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlers.handleRevealLetter}
                  disabled={state.hasWon}
                >
                  <span className="text-lg">🔍</span>
                  Reveal (-50)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats & Actions Row */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-4 border-t border-slate-700/50">
          <div className="flex flex-wrap items-center gap-3">
            {state.isViewMode ? (
              <div className="flex flex-wrap gap-4">
                <div className="bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-700/50 backdrop-blur-sm group transition-all hover:border-blue-500/30">
                  <span className="text-[10px] text-slate-500 uppercase font-black block mb-0.5">⏱ Time</span>
                  <span className="text-blue-400 font-mono font-bold text-lg">{new Date((state.elapsedSeconds || 0) * 1000).toISOString().substr(14, 5)}</span>
                </div>
                <div className="bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-700/50 backdrop-blur-sm group transition-all hover:border-purple-500/30">
                  <span className="text-[10px] text-slate-500 uppercase font-black block mb-0.5">🧮 Score</span>
                  <span className="text-purple-400 font-bold text-lg">{state.score}</span>
                </div>
                <div className="bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-700/50 backdrop-blur-sm group transition-all hover:border-emerald-500/30">
                  <span className="text-[10px] text-slate-500 uppercase font-black block mb-0.5">✅ Correct</span>
                  <span className="text-emerald-400 font-bold text-lg">{state.completedWords.length}</span>
                </div>
                <div className="bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-700/50 backdrop-blur-sm group transition-all hover:border-rose-500/30">
                  <span className="text-[10px] text-slate-500 uppercase font-black block mb-0.5">❌ Errors</span>
                  <span className="text-rose-400 font-bold text-lg">{initialData.words.length - state.completedWords.length}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
                  <span className="text-slate-500 font-bold text-xs uppercase">Words</span>
                  <span className="text-blue-400 font-black">{state.completedWords.length} / {initialData.words.length}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
                  <span className="text-slate-500 font-bold text-xs uppercase">Score</span>
                  <span className="text-indigo-400 font-black">{state.score}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
                  <span className="text-slate-500 font-bold text-xs uppercase">Hints</span>
                  <span className="text-rose-400 font-black">{state.hintsUsed}</span>
                </div>
              </>
            )}
          </div>

          {!state.isViewMode && (
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <button
                className="flex-1 lg:flex-none px-5 py-2.5 rounded-xl transition-all duration-300 font-bold shadow-lg active:scale-95 bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                onClick={handlers.handleCheckWord}
                disabled={state.hasWon}
              >
                Check Word
              </button>
              <button
                className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl transition-all duration-300 font-black shadow-lg active:scale-95 text-white ${
                  state.isSubmitted 
                  ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                }`}
                onClick={handlers.handleCheckPuzzle}
                disabled={state.isSubmitted}
              >
                {state.isSubmitted ? 'SUBMITTED' : 'SUBMIT PUZZLE'}
              </button>
              <button
                className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl transition-all duration-300 font-black shadow-lg active:scale-95 ${
                  isSaved 
                  ? 'bg-slate-800 border border-emerald-500/50 text-emerald-400 cursor-default' 
                  : 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                }`}
                onClick={handleSave}
                disabled={isSaved}
              >
                {isSaved ? "SAVED ✓" : "SAVE PUZZLE"}
              </button>
            </div>
          )}
        </div>

        {/* Message Notifications */}
        <div className="flex flex-col gap-2">
          {saveStatus && (
            <div className="text-emerald-400 font-bold text-sm flex items-center gap-2 animate-bounce">
              <span className="p-1 bg-emerald-500/20 rounded-full text-[10px]">✓</span> {saveStatus}
            </div>
          )}
          {state.hasWon && !state.isSubmitted && (
            <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/20 font-black text-center animate-pulse">
              🎉 PUZZLE COMPLETED! PERFECT!
            </div>
          )}
          {state.aiHint && (
            <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 text-slate-300 text-sm italic shadow-inner">
              <span className="text-indigo-400 font-black not-italic mr-2">AI IDEA:</span> {state.aiHint}
            </div>
          )}
        </div>
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

