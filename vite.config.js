import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the same build works on Netlify (/) and GitHub Pages (/repo/).
export default defineConfig({
  plugins: [react()],
  base: './',
});
