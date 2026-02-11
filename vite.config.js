import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './', // Necessário para Electron (caminhos relativos)
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'core': ['./dataManager.js', './eventBus.js', './uiShared.js'] // Core da aplicação
        }
      },
      input: {
        main: resolve(__dirname, 'index.html'),
        details: resolve(__dirname, 'details.html'),
        expenses: resolve(__dirname, 'expenses.html'),
        income: resolve(__dirname, 'income.html'),
        wallet: resolve(__dirname, 'wallet.html'),
        settings: resolve(__dirname, 'settings.html'),
        tests: resolve(__dirname, 'tests.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
});
