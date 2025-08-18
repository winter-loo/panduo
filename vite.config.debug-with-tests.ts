import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(__dirname, 'entry/vexflow-debug-with-tests.ts'),
      name: 'VexFlow',
      formats: ['umd'],
      fileName: (format) => `vexflow-debug-with-tests.js`,
    },
  },
});
