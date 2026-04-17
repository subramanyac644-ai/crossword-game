import { describe, it, expect, vi } from 'vitest';
import { render, act, renderHook } from '@testing-library/react';
import { useCrossword } from './useCrossword';
import { GameState } from '@game-engine/shared-types';

describe('useCrossword Scoring Framework', () => {
  const mockInitialData: GameState = {
    score: 0,
    hintsUsed: 0,
    completedWords: [],
    elapsedSeconds: 0,
    grid: [
      [
        { correctLetter: 'A', userLetter: '', isBlocked: false, row: 0, col: 0, status: null },
        { correctLetter: 'B', userLetter: '', isBlocked: false, row: 0, col: 1, status: null }
      ]
    ],
    words: [
      { id: '1', word: 'AB', clue: 'Testing', number: 1, direction: 'across', length: 2, start: { row: 0, col: 0 } }
    ],
    selectedWord: null,
    metadata: { title: 'Test', author: 'Jest' }
  };

  it('accurately applies +50 points when a word is dynamically completed via typing', () => {
    // Note: RenderHook is available natively in recent @testing-library/react environments. 
    // We mock localStorage tracking so it doesn't pollute.
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.getItem = vi.fn(() => null);

    const { result } = renderHook(() => useCrossword({ initialData: mockInitialData }));

    // Verify initial constraints
    expect(result.current.state.score).toBe(0);

    // Act: Type 'A' inside (0, 0)
    act(() => {
      result.current.handlers.handleCellChange(0, 0, 'A');
    });

    expect(result.current.state.score).toBe(0); // Word not finished yet

    // Act: Type 'B' inside (0, 1) finishing the word 'AB'
    act(() => {
      result.current.handlers.handleCellChange(0, 1, 'B');
    });

    // Asset Mathematical logic: +50 per correct word rule perfectly executed!
    expect(result.current.state.score).toBe(50);
    expect(result.current.state.completedWords).toContain('1');
  });

  it('correctly calculates penalty limits (-50) for revealing letters', () => {
    const { result } = renderHook(() => useCrossword({ initialData: mockInitialData }));
    
    // Select the word so we can reveal it
    act(() => {
      result.current.handlers.handleWordClick('1');
    });

    // Reveal one letter
    act(() => {
      // It uses the active focus to reveal.
      result.current.handlers.handleRevealLetter(); 
    });

    // Confirm it drops below 0 correctly
    expect(result.current.state.score).toBe(-50);
    expect(result.current.state.hintsUsed).toBe(1);
    
    // Reveal second letter (completes the word, applying +50, canceling out the -50 to hit -50 total)
    act(() => {
      // Manually shift focus exactly to second letter to reveal it next
      result.current.handlers.handleCellFocus(0, 1);
      result.current.handlers.handleRevealLetter();
    });

    // Score: -50 (penalty) + 50 (word complete payout) = -50 
    expect(result.current.state.score).toBe(-50);
    expect(result.current.state.hintsUsed).toBe(2);
  });
});
