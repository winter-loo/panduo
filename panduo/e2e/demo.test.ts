import { expect, test } from '@playwright/test';

test('home page has notes container', async ({ page }) => {
  // Listen for console errors to debug VexFlow issues
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  await page.goto('/');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Check that the notes container element exists and is visible
  await expect(page.locator('#notes-container')).toBeVisible();

  // Debug: Check if there's an error and what it says
  const errorElement = page.locator('.error');
  const errorCount = await errorElement.count();
  if (errorCount > 0) {
    const errorText = await errorElement.textContent();
    console.log('Error found on page:', errorText);
  }

  // Ensure no error elements are present
  await expect(page.locator('.error')).not.toBeVisible();
});
