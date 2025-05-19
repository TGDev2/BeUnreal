/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [
      {
        // Tout import de "react-router-dom" tombe dans notre shim
        find: /^react-router-dom$/,
        replacement: path.resolve(__dirname, 'src/react-router-dom-shim.tsx'),
      },
    ],
  },
  plugins: [
    react(),
    legacy()
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
