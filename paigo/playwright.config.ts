import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	testDir: 'e2e',
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['list'] // Keep console output for CI/terminal
	],
	use: {
		// Global test settings
		baseURL: 'http://localhost:4173',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	}
});
