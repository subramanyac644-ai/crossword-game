import React, { useState, useEffect, Suspense } from 'react';
const CrosswordBoardLazy = React.lazy(() => 
  import('./CrosswordBoard').then(module => ({ default: module.CrosswordBoard }))
);
import { GameState } from '@game-engine/shared-types';
import { CrosswordEngine } from '@game-engine/game-engine';
import { getSavedPuzzles, deletePuzzle, Puzzle } from '@game-engine/puzzle-storage';
import styles from './game-container.module.css';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface GameContainerProps {
  apiKey: string;
  theme?: 'dark' | 'light' | 'glass';
  difficulty?: 'easy' | 'medium' | 'hard';
  onGameComplete?: (state: GameState) => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  apiKey,
  theme = 'glass',
  difficulty = 'medium',
  onGameComplete
}) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedGame, setSavedGame] = useState<string | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Shared types might be slightly different than what savePuzzle stores (the raw grid vs full state)
    // But for "Saved Puzzles" we are loading the static puzzle definition.
    setPuzzles(getSavedPuzzles());
    
    const handlePuzzleSaved = () => setPuzzles(getSavedPuzzles());
    window.addEventListener('puzzle_saved', handlePuzzleSaved);
    return () => window.removeEventListener('puzzle_saved', handlePuzzleSaved);
  }, []);

  useEffect(() => {
    // Check for any saved games in localStorage
    const saved = Object.keys(localStorage).find(key => key.startsWith('crossword_save_'));
    if (saved) {
      setSavedGame(saved);
    }
  }, [gameState]);

  const resumeGame = () => {
    if (!savedGame) return;
    const data = localStorage.getItem(savedGame);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setGameState(parsed);
      } catch (e) {
        setError('Failed to load saved game.');
      }
    }
  };

  const loadSavedPuzzle = (puzzle: Puzzle) => {
    console.log("Loading saved puzzle:", puzzle.topic, puzzle.id);
    // Construct a fresh GameState from the saved puzzle definition
    const freshState: GameState = {
      grid: puzzle.grid,
      words: puzzle.words,
      score: puzzle.score || 0,
      hintsUsed: puzzle.hintsUsed || 0,
      selectedWord: null,
      direction: 'across',
      metadata: {
        title: puzzle.topic,
        author: 'GPT-4o mini'
      },
      hasWon: false,
      completedWords: puzzle.completedWords || [],
      elapsedSeconds: puzzle.elapsedSeconds || 0,
      isSubmitted: false, // Puzzles loaded from the static "Saved" gallery start fresh
      isViewMode: true // ALWAYS open saved gallery items in read-only view mode
    };
    setGameState(freshState);
  };

  const handleDeletePuzzle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent loading the puzzle
    if (window.confirm("Are you sure you want to delete this saved puzzle?")) {
      deletePuzzle(id);
      setSuccessMessage("Puzzle deleted successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const startNewGame = async (promptQuery: string, documentName?: string) => {
    setLoading(true);
    setError(null);
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('crossword_save_')) {
          localStorage.removeItem(key);
        }
      });
      setSavedGame(null);

      if (!apiKey) {
        throw new Error('API Key is missing. Please provide a valid key via props.');
      }

      const engine = await CrosswordEngine.createFromTopic(promptQuery, apiKey, {
        title: documentName ? `${documentName} Puzzle` : `${promptQuery} Crossword`,
        author: 'GPT-4o mini',
      }, difficulty);
      
      const newState = engine.getState();
      newState.isViewMode = false; // Newly generated puzzles are always in play mode
      setGameState(newState);
    } catch (err: any) {
      setError(err.message || 'Failed to start game.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTopic = () => {
    if (!topic.trim()) return;
    startNewGame(topic.trim());
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File exceeds the 10MB size limit. Please upload a smaller document.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      let extractedText = '';

      if (file.type === 'application/pdf') {
         const arrayBuffer = await file.arrayBuffer();
         const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
         let textContent = '';
         for(let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContentObj = await page.getTextContent();
            const pageText = textContentObj.items.map((item: any) => item.str).join(' ');
            textContent += pageText + ' \n';
         }
         extractedText = textContent;
      } else if (file.type === 'text/plain') {
         extractedText = await file.text();
      } else {
         throw new Error('Unsupported file type. Please upload a strictly PDF or .txt file.');
      }

      if (extractedText.trim().length === 0) {
         throw new Error('Could not extract any text from the document. It might be an image-only PDF.');
      }

      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      await startNewGame(extractedText, cleanName);

    } catch (err: any) {
      setError(err.message || 'File parsing failed.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container} data-theme={theme}>
      {loading && (
        <div className={`${styles.loadingOverlay} ${styles.shimmer}`}>
          <div className={styles.pulse} />
          <h2 style={{ color: '#38bdf8', fontSize: '1.5rem' }}>AI is drafting your puzzle...</h2>
          <p style={{ color: '#94a3b8' }}>Generating clues and weaving words together.</p>
        </div>
      )}

      {!gameState ? (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className={styles.hero}>
            <h1 className={styles.title}>Crossword Hub</h1>
            <p className={styles.subtitle}>
              Unleash your curiosity. Enter a topic or upload a document, and our AI will craft a unique 
              crossword puzzle from it.
            </p>
          </div>
          
          <div className={styles.inputGroup} style={{ flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <input 
                className={styles.input}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && topic.trim() && handleGenerateTopic()}
                placeholder="e.g. quantum physics, 90s rock..."
                style={{ flex: 1 }}
              />
              <button 
                className={styles.startButton}
                onClick={handleGenerateTopic}
                disabled={loading || !topic.trim()}
              >
                Generate
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
              <hr style={{ flex: 1, borderColor: 'var(--glass-border)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>OR</span>
              <hr style={{ flex: 1, borderColor: 'var(--glass-border)' }} />
            </div>

            <div style={{ display: 'flex', width: '100%', gap: '0.5rem' }}>
              <input 
                type="file" 
                id="file-upload"
                accept=".txt,.pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <label 
                htmlFor="file-upload"
                className={styles.startButton}
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'transparent',
                  border: '2px dashed var(--accent-secondary)',
                  color: 'var(--accent-secondary)'
                }}
              >
                Upload Document (PDF / TXT)
              </label>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>
              Max file size: 10MB. We extract text natively in your browser!
            </p>
          </div>

          {successMessage && (
            <div className={styles.successMsg}>
              {successMessage}
            </div>
          )}

          {puzzles.length > 0 && (
            <div className={styles.savedPuzzlesSection}>
              <h2 className={styles.sectionTitle}>
                <span style={{ fontSize: '1.2rem' }}>📚</span> Saved Puzzles
              </h2>
              <div className={styles.puzzlesGrid}>
                {puzzles.map((p) => (
                  <div 
                    key={p.id} 
                    className={styles.puzzleCard}
                    onClick={() => loadSavedPuzzle(p)}
                  >
                    <button 
                      className={styles.deleteBtn}
                      onClick={(e) => handleDeletePuzzle(e, p.id)}
                      title="Delete Puzzle"
                    >
                      🗑️
                    </button>
                    <div className={styles.puzzleTopic}>{p.topic}</div>
                    <div className={styles.puzzleDate}>
                      {new Date(p.createdAt).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {savedGame && !loading && (
            <button className={styles.resumeButton} onClick={resumeGame}>
              Resume Last Session
            </button>
          )}

          {error && (
            <div className={styles.errorCard}>
              <h3>Generation Troubleshooting</h3>
              <p>{error}</p>
              <div className={styles.troubleshootingSteps}>
                <div><strong>• API Key:</strong> Ensure VITE_OPENROUTER_API_KEY in .env is correct.</div>
                <div><strong>• Region:</strong> Check if your country is on the <a href="https://ai.google.dev/available_regions" target="_blank" rel="noreferrer">Gemini Availability List</a>.</div>
                <div><strong>• Quota:</strong> You may have exceeded your daily limit.</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Suspense fallback={
          <div className={`${styles.loadingOverlay} ${styles.shimmer}`}>
            <div className={styles.pulse} />
            <h2 style={{ color: '#38bdf8', fontSize: '1.5rem' }}>Loading Game Engine...</h2>
          </div>
        }>
          <CrosswordBoardLazy 
            initialData={gameState} 
            apiKey={apiKey}
            onRestart={() => setGameState(null)}
            onExit={() => {
              setGameState(null);
              if (onGameComplete) onGameComplete(gameState);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};
