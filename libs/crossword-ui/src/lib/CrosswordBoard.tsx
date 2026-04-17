import React from 'react';
import { GameState } from '@game-engine/shared-types';
import { Grid } from './Grid.js';
import { ClueList } from './ClueList.js';
import { WinModal } from './WinModal.js';
import { useCrossword } from './useCrossword.js';
import styles from './crossword-ui.module.css';

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
  const apiKey = propApiKey || (import.meta as any).env.VITE_GEMINI_API_KEY;
  
  const { state, handlers } = useCrossword({
    initialData,
    onComplete,
    onRestart,
    apiKey
  });

  return (
    <div className={styles.boardContainer}>
      <header className={styles.boardHeader}>
        <h1>{initialData.metadata.title}</h1>
        <div className={styles.statsBar}>
          <span>
            Words: <span style={{ color: 'var(--accent-primary)' }}>{state.completedWords.length} / {initialData.words.length}</span>
          </span>
          <span>
            Score: <span style={{ color: 'var(--accent-primary)' }}>{state.score}</span>
          </span>
          <span>
            Hints: <span style={{ color: 'var(--accent-secondary)' }}>{state.hintsUsed}</span>
          </span>
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
            disabled={state.hasWon}
            style={{ 
              background: '#047857', 
              color: 'white', 
              border: 'none',
              padding: '0.4rem 1.5rem',
              borderRadius: '0.5rem',
              cursor: state.hasWon ? 'not-allowed' : 'pointer',
              opacity: state.hasWon ? 0.5 : 1,
              transition: 'all 0.2s',
              marginLeft: '0.5rem',
              fontWeight: 'bold'
            }}
          >
            Submit Puzzle
          </button>
        </div>
        {state.hasWon && (
          <div style={{ color: 'var(--cell-correct)', fontWeight: 'bold', marginTop: '1rem', fontSize: '1.2rem' }}>
            🎉 Puzzle Corrected! Perfect!
          </div>
        )}
        {state.aiHint && (
          <div style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--accent-secondary)' }}>
            <strong>Gemini Idea:</strong> {state.aiHint}
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

