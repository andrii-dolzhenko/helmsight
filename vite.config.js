import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'
import { w3cApprovedCssPilots } from './scripts/w3c-vite-pilot.mjs'

export default defineConfig({
  plugins: [react(), w3cApprovedCssPilots()],
  // Pilot: test standards-based CSS output on current browsers while keeping JS targeting unchanged.
  build: {
    cssTarget: ['chrome111', 'edge111', 'firefox114', 'safari18', 'ios18'],
  },
  test: {
    // Node's built-in test runner owns the standalone scripts/*.test.mjs suites.
    exclude: [...configDefaults.exclude, 'scripts/*.test.mjs'],
    globals: false,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
})
