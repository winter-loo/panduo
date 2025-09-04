import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

export default defineConfig(({ mode: _mode }) => {
  // Get dynamic version information
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = packageJson.version;

  let gitCommitId = 'unknown';
  let buildDate = new Date().toISOString();

  try {
    gitCommitId = execSync('git rev-parse HEAD').toString().trim();
  } catch {
    console.warn('Could not get git commit ID');
  }

  return {
    plugins: [sveltekit()],
    define: {
      __VF_VERSION__: JSON.stringify(version),
      __VF_GIT_COMMIT_ID__: JSON.stringify(gitCommitId),
      __VF_BUILD_DATE__: JSON.stringify(buildDate),
    },
    server: {
      open: true,
    },
    test: {
      include: ['src/**/*.{test,spec}.{js,ts}'],
      exclude: ['e2e/**/*'],
      environment: 'happy-dom',
      setupFiles: ['src/test-setup.ts'],
    },
  };
});