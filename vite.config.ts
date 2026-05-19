import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Custom domain wcx-malima.riloq.net (configurado vía public/CNAME)
  // Antes era '/corex-worldcupx/' cuando estábamos en github.io/corex-worldcupx/
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
