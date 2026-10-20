import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Three.js pèse ~600 ko minifié : on relève le seuil d'avertissement
    chunkSizeWarningLimit: 800,
  },
});
