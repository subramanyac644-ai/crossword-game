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
      completedWords: state.completedWords
    });
    setIsSaved(true);
    setSaveStatus('Puzzle Saved!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className={styles.boardContainer}>
      <header className={styles.boardHeader}>
        <div className={styles.headerTop}>
          <button 
            className={styles.backButton} 
            onClick={onExit}
            aria-label="Go back to main page"
          >
            ← Back
          </button>
          <h1>{initialData.metadata.title}</h1>
          {state.isViewMode && (
            <div style={{ 
              background: 'rgba(56, 189, 248, 0.1)', 
              color: '#38bdf8', 
              padding: '0.4rem 1rem', 
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              marginLeft: '1rem'
            }}>
              Viewing Saved Puzzle (Answers Mode)
            </div>
          )}
        </div>
        <div className={styles.statsBar}>
          {state.isViewMode ? (
            <>
              <span>
                Time: <span style={{ color: 'var(--accent-primary)' }}>{new Date((state.elapsedSeconds || 0) * 1000).toISOString().substr(14, 5)}</span>
              </span>
              <span>
                Score: <span style={{ color: 'var(--accent-primary)' }}>{state.score}</span>
              </span>
              <span>
                Hints: <span style={{ color: 'var(--accent-secondary)' }}>{state.hintsUsed}</span>
              </span>
              <span>
                Correct: <span style={{ color: '#22c55e' }}>{state.completedWords.length}</span>
              </span>
              <span>
                Incorrect: <span style={{ color: '#ef4444' }}>{initialData.words.length - state.completedWords.length}</span>
              </span>
            </>
          ) : (
            <>
              <span>
                Words: <span style={{ color: 'var(--accent-primary)' }}>{state.completedWords.length} / {initialData.words.length}</span>
              </span>
              <span>
                Score: <span style={{ color: 'var(--accent-primary)' }}>{state.score}</span>
              </span>
              <span>
                Hints: <span style={{ color: 'var(--accent-secondary)' }}>{state.hintsUsed}</span>
              </span>
            </>
          )}
          {!state.isViewMode && (
            <>
              <button
                className={styles.hintButton}
                onClick={handlers.useAiHint}
                disabled={state.hasWon || state.isHintLoading}
                style={{ 
                  background: 'var(--bg-dark)', 
                  color: 'var(--accent-primary)', 
                  border: '1px solid var(--accent-primary)',
                  padding: '0.4rem 1rem',
                  borderRadius: '0.5rem',
                  cursor: (state.hasWon || state.isHintLoading) ? 'not-allowed' : 'pointer',
                  opacity: (state.hasWon || state.isHintLoading) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  minWidth: '90px',
                  marginRight: '0.5rem'
                }}
              >
                {state.isHintLoading ? 'Thinking...' : 'AI Hint'}
              </button>
              <button
                className={styles.hintButton}
                onClick={handlers.handleRevealLetter}
                disabled={state.hasWon}
                style={{ 
                  background: 'var(--bg-dark)', 
                  color: '#f43f5e', 
                  border: '1px solid #f43f5e',
                  padding: '0.4rem 1rem',
                  borderRadius: '0.5rem',
                  cursor: state.hasWon ? 'not-allowed' : 'pointer',
                  opacity: state.hasWon ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                Reveal Letter (-50)
              </button>
              <button
                className={styles.hintButton}
                onClick={handlers.handleCheckWord}
                disabled={state.hasWon}
                style={{ 
                  background: 'var(--bg-dark)', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--glass-border)',
                  padding: '0.4rem 1rem',
                  borderRadius: '0.5rem',
                  cursor: state.hasWon ? 'not-allowed' : 'pointer',
                  opacity: state.hasWon ? 0.5 : 1,
                  transition: 'all 0.2s',
                  marginLeft: '0.5rem'
                }}
              >
                Check Word
              </button>
              <button
                className={styles.hintButton}
                onClick={handlers.handleCheckPuzzle}
                disabled={state.isSubmitted}
                style={{ 
                  background: '#047857', 
                  color: 'white', 
                  border: 'none',
                  padding: '0.4rem 1.5rem',
                  borderRadius: '0.5rem',
                  cursor: state.isSubmitted ? 'not-allowed' : 'pointer',
                  opacity: state.isSubmitted ? 0.5 : 1,
                  transition: 'all 0.2s',
                  marginLeft: '0.5rem',
                  fontWeight: 'bold'
                }}
              >
                {state.isSubmitted ? 'Submitted' : 'Submit Puzzle'}
              </button>
              <button
                className={styles.hintButton}
                onClick={handleSave}
                disabled={isSaved}
                style={{ 
                  background: isSaved ? '#334155' : 'var(--accent-primary)', 
                  color: isSaved ? 'var(--text-muted)' : 'black', 
                  border: 'none',
                  padding: '0.4rem 1.5rem',
                  borderRadius: '0.5rem',
                  cursor: isSaved ? 'not-allowed' : 'pointer',
                  marginLeft: '0.5rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
                }}
              >
                {isSaved ? "Saved ✓" : "Save Puzzle"}
              </button>
            </>
          )}
        </div>
        {saveStatus && (
          <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', marginTop: '0.5rem' }}>
            ✅ {saveStatus}
          </div>
        )}
        {state.hasWon && (
          <div style={{ color: 'var(--cell-correct)', fontWeight: 'bold', marginTop: '1rem', fontSize: '1.2rem' }}>
            🎉 Puzzle Corrected! Perfect!
          </div>
        )}
        {state.aiHint && (
          <div style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--accent-secondary)' }}>
            <strong>AI Idea:</strong> {state.aiHint}
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

