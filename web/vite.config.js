import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site is served under /Backstory_Workflows/
export default defineConfig({
  plugins: [react()],
  base: '/Backstory_Workflows/',
});
