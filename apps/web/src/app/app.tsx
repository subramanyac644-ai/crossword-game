import { GameContainer } from '@game-engine/crossword-ui';

export function App() {
  const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

  const handleGameComplete = (metrics: any) => {
    console.log("Game successfully completed in container. Metrics:", metrics);
  };

  return (
    <GameContainer 
      apiKey={apiKey}
      theme="glass"
      difficulty="medium"
      onGameComplete={handleGameComplete}
    />
  );
}

export default App;
