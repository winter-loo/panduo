import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

const versionInfo = require('./tools/version_info');

// Entry points mapping
const entries = {
  'vexflow': resolve(__dirname, 'entry/vexflow.ts'),
  'vexflow-core': resolve(__dirname, 'entry/vexflow-core.ts'),
  'vexflow-bravura': resolve(__dirname, 'entry/vexflow-bravura.ts'),
  'vexflow-debug': resolve(__dirname, 'entry/vexflow-debug.ts'),
  'vexflow-debug-with-tests': resolve(__dirname, 'entry/vexflow-debug-with-tests.ts'),
};

const banner = 
  `/*!\n * VexFlow ${versionInfo.VERSION}   ${versionInfo.DATE}   ${versionInfo.ID}\n` +
  ' * Copyright (c) 2023-present VexFlow contributors (see https://github.com/vexflow/vexflow/blob/main/AUTHORS.md).\n */';

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';

  if (isDev) {
    return {
      // Development server configuration
      server: {
        port: 8080,
        host: '127.0.0.1',
        open: '/tests/flow.html',
      },
      // Plugin configuration for dev
      plugins: [
        dts({
          outDir: 'build/types',
          include: ['src/**/*', 'entry/**/*'],
          exclude: ['tests/**/*', 'entry/vexflow-debug-with-tests.ts'],
          rollupTypes: true,
        }),
      ],
      // Define version info for replacement
      define: {
        __VF_VERSION__: JSON.stringify(versionInfo.VERSION),
        __VF_GIT_COMMIT_ID__: JSON.stringify(versionInfo.ID),
        __VF_BUILD_DATE__: JSON.stringify(versionInfo.DATE),
      },
    };
  }

  // Production build - ESM and CJS only (UMD needs separate builds)
  return {
    // Build configuration
    build: {
      outDir: 'build',
      sourcemap: true,
      minify: isProd ? 'terser' : false,
      rollupOptions: {
        input: entries,
        output: [
          // ESM build
          {
            format: 'es',
            dir: 'build/esm/entry',
            entryFileNames: '[name].js',
            banner,
          },
          // CJS build
          {
            format: 'cjs',
            dir: 'build/cjs',
            entryFileNames: '[name].js',
            banner,
          },
        ],
      },
      terserOptions: {
        compress: true,
        format: {
          comments: (node, comment) => {
            // Keep the banner comment
            return comment.value.includes('VexFlow') || comment.value.includes('Copyright');
          },
        },
      },
    },

    // Plugin configuration
    plugins: [
      // TypeScript declaration files
      dts({
        outDir: 'build/types',
        include: ['src/**/*', 'entry/**/*'],
        exclude: ['tests/**/*', 'entry/vexflow-debug-with-tests.ts'],
        rollupTypes: true,
      }),
    ],

    // TypeScript configuration
    esbuild: {
      target: 'es6',
    },

    // Define version info for replacement
    define: {
      __VF_VERSION__: JSON.stringify(versionInfo.VERSION),
      __VF_GIT_COMMIT_ID__: JSON.stringify(versionInfo.ID),
      __VF_BUILD_DATE__: JSON.stringify(versionInfo.DATE),
    },

    // Resolve configuration
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },

    // Test configuration (for Vitest)
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
    },
  };
});
