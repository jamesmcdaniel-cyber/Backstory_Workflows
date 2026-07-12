import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves under /Backstory_Workflows/; Vercel (VERCEL=1 at build) serves at root.
// VITE_BASE overrides both if set explicitly.
const base = process.env.VITE_BASE ?? (process.env.VERCEL ? '/' : '/Backstory_Workflows/');

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
});
