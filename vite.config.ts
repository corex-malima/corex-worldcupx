import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Servido desde github.io/corex-worldcupx/ → necesita base con el nombre del repo.
  // Si en el futuro vuelven a usar dominio custom: base: '/' + restaurar public/CNAME.
  base: '/corex-worldcupx/',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
