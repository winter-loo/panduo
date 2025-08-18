
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
    lib: {
      entry: resolve(__dirname, 'entry/vexflow-core.ts'),
      name: 'VexFlow',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `${format}/vexflow-core.js`,
    },
  },
});
