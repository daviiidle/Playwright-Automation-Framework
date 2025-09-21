import { test, expect } from '../../../src/fixtures/BaseFixture';

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

    const successMessage = await homePage.page.locator('.bar-notification.success').textContent();
    expect(successMessage).toContain('Thank you for signing up');
  });

  test('should show error for invalid email format', async ({
    homePage
  }) => {
    await homePage.subscribeToNewsletter('invalid-email');

    const errorMessage = await homePage.page.locator('.bar-notification.error').textContent();
    expect(errorMessage).toContain('Wrong email');
  });

  test('should show error for empty email', async ({
    homePage
  }) => {
    await homePage.subscribeToNewsletter('');

    const errorMessage = await homePage.page.locator('.bar-notification.error').textContent();
    expect(errorMessage).toContain('Enter valid email');
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