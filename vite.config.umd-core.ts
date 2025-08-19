import { defineConfig } from 'vite';
import { resolve } from 'path';

// build only for production use
export default defineConfig({
  build: {
    outDir: 'dist/umd',
    emptyOutDir: false,
    sourcemap: true,
    minify: true,
    lib: {
      entry: resolve(__dirname, 'entry/vexflow-core.ts'),
      name: 'VexFlow',
      formats: ['umd'],
      fileName: () => 'vexflow-core.js',
    },
    assetsInlineLimit: 4096000,
  },
});
