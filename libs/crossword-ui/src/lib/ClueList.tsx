import React from 'react';
import { Word } from '@game-engine/shared-types';
import styles from './crossword-ui.module.css';

interface ClueListProps {
  words: Word[];
  activeWordId?: string;
  onWordClick: (id: string) => void;
}

export const ClueList: React.FC<ClueListProps> = ({
  words,
  activeWordId,
  onWordClick,
}) => {
  const scrollRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (activeWordId && scrollRefs.current[activeWordId]) {
      scrollRefs.current[activeWordId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeWordId]);

  const acrossClues = words
    .filter((w) => w.direction === 'across')
    .sort((a, b) => a.number - b.number);
  const downClues = words
    .filter((w) => w.direction === 'down')
    .sort((a, b) => a.number - b.number);

  const renderClue = (word: Word) => (
    <div
      key={word.id}
      ref={(el) => (scrollRefs.current[word.id] = el)}
      className={`${styles.clueItem} ${
        activeWordId === word.id ? styles.clueItemActive : ''
      }`}
      onClick={() => onWordClick(word.id)}
    >
      <span className={styles.clueNumber}>{word.number}</span>
      {word.clue}
    </div>
  );

  return (
    <div className={styles.clueContainer}>
      <div className={styles.clueGrid}>
        <div className={styles.clueSection}>
          <h3><span>➡️</span> Across</h3>
          <div className={styles.clueScroll}>
            {acrossClues.map(renderClue)}
          </div>
        </div>
        <div className={styles.clueSection}>
          <h3><span>⬇️</span> Down</h3>
          <div className={styles.clueScroll}>
            {downClues.map(renderClue)}
          </div>
        </div>
      </div>
    </div>
  );
};
