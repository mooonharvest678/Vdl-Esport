import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from /<repo-name>/. Override with BASE_PATH when
// deploying somewhere else (a custom domain or the local preview).
const base = process.env.BASE_PATH ?? '/Club-Clash-Picker/';

export default defineConfig({
  base,
  plugins: [react()],
});
