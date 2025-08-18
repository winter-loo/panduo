
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/umd',
    sourcemap: true,
    minify: true,
    lib: {
      entry: resolve(__dirname, 'entry/vexflow-umd.ts'),
      name: 'Vex',
      formats: ['umd'],
      fileName: (format, entryName) => `vexflow.js`,
    },
  },
});
