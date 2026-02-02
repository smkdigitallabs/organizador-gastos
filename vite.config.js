import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        details: resolve(__dirname, 'details.html'),
        expenses: resolve(__dirname, 'expenses.html'),
        income: resolve(__dirname, 'income.html'),
        wallet: resolve(__dirname, 'wallet.html'),
        tests: resolve(__dirname, 'tests.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
});
