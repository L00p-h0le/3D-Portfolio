import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Relative base keeps asset paths working under the GitHub Pages project path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
