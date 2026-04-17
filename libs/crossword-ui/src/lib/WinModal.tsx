import React from 'react';
import styles from './crossword-ui.module.css';

interface WinModalProps {
  score: number;
  hintsUsed: number;
  correctWords: number;
  incorrectWords: number;
  elapsedSeconds: number;
  onRestart: () => void;
  onExit: () => void;
}

export const WinModal: React.FC<WinModalProps> = ({ 
  score, 
  hintsUsed, 
  correctWords,
  incorrectWords,
  elapsedSeconds,
  onRestart,
  onExit
}) => {
  
  const formattedTime = `${Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Game Over</h2>
        <p style={{ color: 'var(--text-muted)' }}>Here is your final puzzle performance summary.</p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', margin: '2rem 0' }}>
          <div className={styles.statItem} style={{ flex: '1 1 40%' }}>
            <span className={styles.statValue}>{score}</span>
            <span className={styles.statLabel}>Final Score</span>
          </div>
          <div className={styles.statItem} style={{ flex: '1 1 40%' }}>
            <span className={styles.statValue}>{formattedTime}</span>
            <span className={styles.statLabel}>Time Taken</span>
          </div>
          <div className={styles.statItem} style={{ flex: '1 1 25%' }}>
            <span className={styles.statValue} style={{ color: 'var(--cell-correct)' }}>{correctWords}</span>
            <span className={styles.statLabel}>Correct</span>
          </div>
          <div className={styles.statItem} style={{ flex: '1 1 25%' }}>
            <span className={styles.statValue} style={{ color: '#ef4444' }}>{incorrectWords}</span>
            <span className={styles.statLabel}>Incorrect</span>
          </div>
          <div className={styles.statItem} style={{ flex: '1 1 25%' }}>
            <span className={styles.statValue} style={{ color: 'var(--accent-secondary)' }}>{hintsUsed}</span>
            <span className={styles.statLabel}>Hints Used</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className={styles.modalButton} onClick={onRestart}>
            Play Again
          </button>
          <button 
            className={styles.modalButton} 
            onClick={onExit}
            style={{ 
              background: 'transparent',
              border: '2px solid var(--accent-secondary)',
              color: 'var(--text-main)'
            }}
          >
            Exit
          </button>
        </div>

        {/* Decorative elements for "premium" feel */}
        <div style={{
          position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px',
          background: 'var(--accent-primary)', filter: 'blur(60px)', opacity: 0.3, borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', bottom: '-20px', left: '-20px', width: '100px', height: '100px',
          background: 'var(--accent-secondary)', filter: 'blur(60px)', opacity: 0.3, borderRadius: '50%'
        }} />
      </div>
    </div>
  );
};
