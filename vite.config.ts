import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/worldcupx/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
