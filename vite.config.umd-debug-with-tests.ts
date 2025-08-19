import { defineConfig } from 'vite';
import { resolve } from 'path';

// build only in debug mode
export default defineConfig({
  build: {
    outDir: 'dist/umd',
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(__dirname, 'entry/vexflow-debug-with-tests.ts'),
      name: 'VexFlow',
      formats: ['umd'],
      fileName: () => 'vexflow-debug-with-tests.js',
    },
    assetsInlineLimit: 4096000,
  },
});
