import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameContainer } from './GameContainer';
import * as CrosswordEngineModule from '@game-engine/game-engine';

// Mock the backend engine so we don't hit Gemini API during UI testing
vi.mock('@game-engine/game-engine', () => {
  return {
    CrosswordEngine: {
      createFromTopic: vi.fn(),
    }
  };
});

describe('GameContainer UI Iteration Tests', () => {
  it('safely locks the generate button if the topic input is whitespace', () => {
    render(<GameContainer apiKey="TEST_API" />);

    const generateBtn = screen.getByRole('button', { name: /generate/i });
    expect(generateBtn).toBeDisabled(); // Button disables when topic is entirely empty natively!

    const input = screen.getByPlaceholderText(/e.g. quantum physics/i);
    
    // Type whitespace
    fireEvent.change(input, { target: { value: '    ' } });
    expect(generateBtn).toBeDisabled(); // Should STILL be disabled because of .trim() logic
    
    // Type actual word
    fireEvent.change(input, { target: { value: 'Jupiter' } });
    expect(generateBtn).not.toBeDisabled(); // Should unleash button
  });

  it('triggers the API framework payload successfully on button click', async () => {
    const mockCreate = vi.spyOn(CrosswordEngineModule.CrosswordEngine, 'createFromTopic').mockResolvedValue({
      getState: () => ({ /* mock game state */ grid: [], words: [] }),
    } as any);

    render(<GameContainer apiKey="TEST_API_KEY" />);
    
    const input = screen.getByPlaceholderText(/e.g. quantum physics/i);
    const generateBtn = screen.getByRole('button', { name: /generate/i });

    // Input "Biology"
    fireEvent.change(input, { target: { value: 'Biology' } });
    fireEvent.click(generateBtn);

    // Ensure it sets loading flag (shimmer loading text appears)
    expect(screen.getByText(/Gemini is drafting your puzzle.../i)).toBeTruthy();

    await waitFor(() => {
      // Confirm the mocked GameEngine was pinged precisely with the payload!
      expect(mockCreate).toHaveBeenCalledWith('Biology', 'TEST_API_KEY', expect.any(Object), 'medium');
    });
  });

  it('detects 10MB file limit breaks correctly without querying the network', () => {
    // Generate a massive fake 15MB txt blob object
    const largeFile = new File(['a'.repeat(15 * 1024 * 1024)], 'giant_book.txt', { type: 'text/plain' });
    
    render(<GameContainer apiKey="TEST_API_KEY" />);
    
    const uploader = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(uploader).toBeTruthy();

    // Dynamically inject the mock file into the form event
    Object.defineProperty(uploader, 'files', { value: [largeFile] });
    fireEvent.change(uploader);

    // Validate that the exact Error validation DOM text renders, throwing out the process safely.
    expect(screen.getByText(/exceeds the 10MB size limit/i)).toBeTruthy();
  });
});
