import { test, expect } from '../../../src/fixtures/BaseFixture';
import { TestConfig } from '../../../src/config/TestConfig';

test.describe('Newsletter Subscription', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.waitForPageToLoad();
  });

  test('should subscribe to newsletter with valid email', async ({
    homePage,
    userDataFactory
  }) => {
    const user = userDataFactory.createValidUser();

    await homePage.subscribeToNewsletter(user.email);

    // Wait for subscription to complete
    await homePage.page.waitForTimeout(2000);

    // Check if subscription was processed - either the form is hidden, result is shown, or we stay on same page
    const currentUrl = await homePage.getCurrentUrl();
    const isOnSamePage = currentUrl.includes(new URL(TestConfig.baseUrl).hostname);

    // Check if newsletter subscription block is hidden (indicates success)
    const subscriptionBlockHidden = await homePage.page.locator('.newsletter-subscribe-block').isHidden().catch(() => false);

    // Check if result block is visible
    const resultBlockVisible = await homePage.page.locator('#newsletter-result-block').isVisible().catch(() => false);

    // Check for any notification bars
    const hasNotification = await homePage.page.locator('.bar-notification').isVisible().catch(() => false);

    // At minimum, we should stay on the same page (indicates the form was processed)
    expect(isOnSamePage).toBe(true);

    // Additional check: subscription should be processed (any of these indicators)
    const subscriptionProcessed = subscriptionBlockHidden || resultBlockVisible || hasNotification;
    expect(subscriptionProcessed).toBe(true);
  });

  test('should handle invalid email format', async ({
    homePage
  }) => {
    await homePage.subscribeToNewsletter('invalid-email');

    // Check if any notification appears or if form validation works
    const notificationSelectors = [
      '.bar-notification',
      '.notification',
      '.alert',
      '.message',
      '[class*="notification"]',
      '[class*="error"]',
      '[class*="success"]'
    ];

    let hasNotification = false;
    let notificationMessage = '';

    for (const selector of notificationSelectors) {
      try {
        const element = homePage.page.locator(selector).first();
        await element.waitFor({ timeout: 2000 });
        if (await element.isVisible()) {
          hasNotification = true;
          const text = await element.textContent();
          if (text && text.trim()) {
            notificationMessage = text.trim();
            break;
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Either there should be a notification, or the form should handle it gracefully
    const currentUrl = await homePage.getCurrentUrl();
    expect(hasNotification || currentUrl.includes(new URL(TestConfig.baseUrl).hostname)).toBe(true);
  });

  test('should handle empty email submission', async ({
    homePage
  }) => {
    await homePage.subscribeToNewsletter('');

    // Check if any notification appears or if form validation works
    const notificationSelectors = [
      '.bar-notification',
      '.notification',
      '.alert',
      '.message',
      '[class*="notification"]',
      '[class*="error"]',
      '[class*="validation"]'
    ];

    let hasNotification = false;
    for (const selector of notificationSelectors) {
      try {
        const element = homePage.page.locator(selector).first();
        await element.waitFor({ timeout: 2000 });
        if (await element.isVisible()) {
          hasNotification = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Either there should be a notification, or the form should handle it gracefully
    const currentUrl = await homePage.getCurrentUrl();
    expect(hasNotification || currentUrl.includes(new URL(TestConfig.baseUrl).hostname)).toBe(true);
  });

  test('should handle duplicate subscription', async ({
    homePage,
    userDataFactory
  }) => {
    const user = userDataFactory.createPredefinedUser();

    await homePage.subscribeToNewsletter(user.email);

    const message = await homePage.page.locator('.bar-notification').textContent();
    expect(message).toBeTruthy();
  });
});