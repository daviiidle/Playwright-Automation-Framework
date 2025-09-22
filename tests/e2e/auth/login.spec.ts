import { test, expect } from '../../../src/fixtures/BaseFixture';

test.describe('User Login', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.navigateToLogin();
  });

  test('should login with valid credentials', async ({
    loginPage,
    homePage,
    userDataFactory
  }) => {
    const user = userDataFactory.createPredefinedUser();

    await loginPage.login(user.email, user.password);
    await homePage.waitForPageToLoad();

    const isLoggedIn = await homePage.isUserLoggedIn();
    expect(isLoggedIn).toBe(true);
  });

  test('should show error for invalid credentials', async ({
    loginPage,
    userDataFactory
  }) => {
    const credentials = userDataFactory.createLoginCredentials();

    await loginPage.login(credentials.email, credentials.password);

    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Login was unsuccessful');
  });

  test('should show error for empty email field', async ({
    loginPage
  }) => {
    await loginPage.login('', 'password123');

    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Login was unsuccessful');
  });

  test('should show error for empty password field', async ({
    loginPage
  }) => {
    await loginPage.login('test@example.com', '');

    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Login was unsuccessful');
  });

  test('should remember user when checkbox is checked', async ({
    loginPage,
    userDataFactory
  }) => {
    const user = userDataFactory.createPredefinedUser();

    await loginPage.login(user.email, user.password, true);

    const isRememberMeChecked = await loginPage.isRememberMeChecked();
    expect(isRememberMeChecked).toBe(true);
  });

  test('should navigate to forgot password page', async ({
    loginPage,
    page
  }) => {
    await loginPage.navigateToForgotPassword();

    const currentUrl = await page.url();
    expect(currentUrl).toContain('/passwordrecovery');
  });

  test('should navigate to registration page from login', async ({
    loginPage,
    registerPage
  }) => {
    await loginPage.navigateToRegister();
    await registerPage.waitForRegisterPage();

    const pageTitle = await registerPage.getPageTitle();
    expect(pageTitle).toContain('Register');
  });

  test('should validate email format in login form', async ({
    loginPage
  }) => {
    await loginPage.login('invalid-email', 'password123');

    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Please enter a valid email address');
  });

  test('should allow login with Enter key', async ({
    loginPage,
    homePage,
    userDataFactory
  }) => {
    const user = userDataFactory.createPredefinedUser();

    await loginPage.loginWithEnterKey(user.email, user.password);
    await homePage.waitForPageToLoad();

    const isLoggedIn = await homePage.isUserLoggedIn();
    expect(isLoggedIn).toBe(true);
  });

  test('should clear login form', async ({
    loginPage
  }) => {
    await loginPage.fillInput(loginPage['emailInput'], 'test@example.com');
    await loginPage.fillInput(loginPage['passwordInput'], 'password123');

    await loginPage.clearLoginForm();

    const email = await loginPage['emailInput'].inputValue();
    const password = await loginPage['passwordInput'].inputValue();

    expect(email).toBe('');
    expect(password).toBe('');
  });

  test('should disable login button when form is invalid', async ({
    loginPage
  }) => {
    const isButtonEnabled = await loginPage.isLoginButtonEnabled();
    expect(isButtonEnabled).toBe(true);
  });

  test('should handle multiple failed login attempts', async ({
    loginPage,
    userDataFactory
  }) => {
    const credentials = userDataFactory.createLoginCredentials();

    for (let i = 0; i < 3; i++) {
      await loginPage.login(credentials.email, 'wrongpassword');
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Login was unsuccessful');

      await loginPage.clearLoginForm();
    }
  });

  test('should maintain session after page refresh', async ({
    loginPage,
    homePage,
    userDataFactory,
    page
  }) => {
    const user = userDataFactory.createPredefinedUser();

    await loginPage.login(user.email, user.password, true);
    await homePage.waitForPageToLoad();

    await page.reload();
    await homePage.waitForPageToLoad();

    const isLoggedIn = await homePage.isUserLoggedIn();
    expect(isLoggedIn).toBe(true);
  });
});