import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CrosswordEngine',
      fileName: 'game-engine',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      // We explicitly DO NOT externalize @game-engine/shared-types or ai-service
      // meaning Vite will seamlessly bundle them into the final output.
      external: [],
    },
  },
});
