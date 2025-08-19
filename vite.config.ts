import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  // Get dynamic version information
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = packageJson.version;
  const gitCommitId = execSync('git rev-parse HEAD').toString().trim();
  const buildDate = new Date().toISOString();

  return {
    define: {
      __VF_VERSION__: JSON.stringify(version),
      __VF_GIT_COMMIT_ID__: JSON.stringify(gitCommitId),
      __VF_BUILD_DATE__: JSON.stringify(buildDate),
    },
    build: {
      outDir: 'dist/umd',
      emptyOutDir: false,
      sourcemap: true,
      minify: isProduction,
      lib: {
        entry: resolve(__dirname, 'entry/vexflow.ts'),
        name: 'VexFlow',
        formats: ['umd'],
        fileName: () => `vexflow${isProduction ? '' : '-debug'}.js`,
      },
      assetsInlineLimit: 4096000,
    },
    server: {
      open: true, // auto-open browser for dev playground
    },
  }
});
