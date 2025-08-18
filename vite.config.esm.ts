
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist/esm',
    sourcemap: true,
    lib: {
      entry: {
        'vexflow': resolve(__dirname, 'entry/vexflow.ts'),
        'vexflow-core': resolve(__dirname, 'entry/vexflow-core.ts'),
        'vexflow-bravura': resolve(__dirname, 'entry/vexflow-bravura.ts'),
        'vexflow-debug': resolve(__dirname, 'entry/vexflow-debug.ts'),
        'vexflow-debug-with-tests': resolve(__dirname, 'entry/vexflow-debug-with-tests.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        entryFileNames: ({ name: fileName }) => {
          return `${fileName}.js`;
        },
      },
    },
  },
});
