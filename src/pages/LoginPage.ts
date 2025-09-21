import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  public readonly emailInput: Locator;
  public readonly passwordInput: Locator;
  public readonly rememberMeCheckbox: Locator;
  public readonly loginButton: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly registerLink: Locator;
  private readonly errorMessage: Locator;
  private readonly successMessage: Locator;
  private readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page, '/login');

    // Highly specific selectors to avoid conflicts and strict mode violations
    this.emailInput = page.locator('#Email')
      .or(page.locator('input[name="Email"][type="text"]'))
      .or(page.locator('.returning-wrapper input[name="Email"]'))
      .or(page.locator('form input[name="Email"]:not([id*="newsletter"])'));

    this.passwordInput = page.locator('#Password')
      .or(page.locator('input[name="Password"][type="password"]'))
      .or(page.locator('.returning-wrapper input[name="Password"]'))
      .or(page.locator('form input[type="password"][name="Password"]'));

    this.rememberMeCheckbox = page.locator('#RememberMe[type="checkbox"]')
      .or(page.locator('input[name="RememberMe"][type="checkbox"]'))
      .or(page.locator('input[type="checkbox"]:near(:text("Remember"))'))
      .or(page.locator('input[type="checkbox"][id*="remember" i]'));

    this.loginButton = page.locator('button:has-text("Log in")')
      .or(page.locator('input[value="Log in"]'))
      .or(page.locator('button:has-text("Login")'))
      .or(page.locator('input[type="submit"][value*="Log" i]'))
      .or(page.locator('button[type="submit"]:has-text("Log")'));

    this.forgotPasswordLink = page.locator('a[href="/passwordrecovery"]')
      .or(page.locator('a:has-text("Forgot")'))
      .or(page.locator('a:has-text("Password")'))
      .or(page.locator('a[href*="password"]'))
      .or(page.locator('a[href*="recovery"]'));

    this.registerLink = page.locator('a[href="/register"]')
      .or(page.locator('a:has-text("Register")'))
      .or(page.locator('a:has-text("Sign up")'))
      .or(page.locator('a[href*="register"]'));

    this.errorMessage = page.locator('div.message-error')
      .or(page.locator('div.validation-summary-errors').first())
      .or(page.locator('.alert-danger'))
      .or(page.locator('[class*="error"][class*="message"]').first());

    this.successMessage = page.locator('.message-success')
      .or(page.locator('.result'))
      .or(page.locator('.alert-success'))
      .or(page.locator('[class*="success"][class*="message"]'));

    this.pageTitle = page.locator('.page-title h1')
      .or(page.locator('h1'))
      .or(page.locator('.page-header h1'))
      .or(page.locator('[class*="title"] h1'));
  }

  /**
   * Enhanced login method with comprehensive error handling and verification
   */
  async login(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    await this.retryOperation(async () => {
      // Wait for the login form to be fully loaded
      await this.waitForLoginFormReady();

      // Fill form fields with enhanced safety and verification using strict safe methods
      await this.strictSafeFill(this.emailInput, email);
      await this.verifyFieldValue(this.emailInput, email, 'Email');

      await this.strictSafeFill(this.passwordInput, password);
      await this.verifyFieldValue(this.passwordInput, password, 'Password');

      // Handle remember me checkbox if requested
      if (rememberMe) {
        await this.setRememberMeCheckbox(true);
      }

      // Ensure all fields are properly filled before submission (only if not testing empty fields)
      if (email.trim() && password.trim()) {
        await this.validateLoginFormCompleteness(email, password);
      }

      // Submit the form with verification using strict safe method
      await this.strictSafeClick(this.loginButton);

      // Wait for navigation or response
      await this.waitForNetworkStability();

    }, 'login');
  }

  async navigateToForgotPassword(): Promise<void> {
    await this.retryOperation(async () => {
      await this.safeClick(this.forgotPasswordLink);
      await this.waitForNetworkStability();
    }, 'navigate to forgot password');
  }

  async navigateToRegister(): Promise<void> {
    await this.retryOperation(async () => {
      await this.safeClick(this.registerLink);
      await this.waitForNetworkStability();
    }, 'navigate to register');
  }

  async getErrorMessage(): Promise<string> {
    return await this.retryOperation(async () => {
      await this.waitForTimeout(1000); // Allow time for error messages to appear
      if (await this.strictIsVisible(this.errorMessage)) {
        return await this.strictGetText(this.errorMessage);
      }
      return '';
    }, 'get error message');
  }

  async getSuccessMessage(): Promise<string> {
    return await this.retryOperation(async () => {
      await this.waitForTimeout(2000); // Allow time for success messages to appear
      if (await this.isElementVisible(this.successMessage)) {
        return await this.getElementText(this.successMessage);
      }
      return '';
    }, 'get success message');
  }

  async isLoginButtonEnabled(): Promise<boolean> {
    return await this.loginButton.isEnabled();
  }

  async clearLoginForm(): Promise<void> {
    await this.retryOperation(async () => {
      // Clear email field using strict safe method
      await this.waitForElementSafe(this.emailInput);
      await this.emailInput.clear();
      const emailValue = await this.strictGetInputValue(this.emailInput);
      if (emailValue.length > 0) {
        throw new Error('Failed to clear email field');
      }

      // Clear password field using strict safe method
      await this.waitForElementSafe(this.passwordInput);
      await this.passwordInput.clear();
      const passwordValue = await this.strictGetInputValue(this.passwordInput);
      if (passwordValue.length > 0) {
        throw new Error('Failed to clear password field');
      }

      // Uncheck remember me if checked
      const isChecked = await this.strictIsChecked(this.rememberMeCheckbox);
      if (isChecked) {
        await this.strictSafeClick(this.rememberMeCheckbox);
        const stillChecked = await this.strictIsChecked(this.rememberMeCheckbox);
        if (stillChecked) {
          throw new Error('Failed to uncheck Remember Me checkbox');
        }
      }
    }, 'clear login form');
  }

  async isRememberMeChecked(): Promise<boolean> {
    return await this.strictIsChecked(this.rememberMeCheckbox);
  }

  async getPageTitle(): Promise<string> {
    return await this.getElementText(this.pageTitle);
  }

  async waitForLoginPage(): Promise<void> {
    await this.retryOperation(async () => {
      await this.waitForElementSafe(this.pageTitle);
      await this.waitForElementSafe(this.emailInput);
      await this.waitForElementSafe(this.passwordInput);
      await this.waitForElementSafe(this.loginButton);
      await this.waitForElementSafe(this.rememberMeCheckbox);

      // Ensure form is interactive
      const isButtonEnabled = await this.loginButton.isEnabled();
      if (!isButtonEnabled) {
        await this.waitForTimeout(1000);
      }
    }, 'wait for login page');
  }

  async isLoginFormVisible(): Promise<boolean> {
    return await this.isElementVisible(this.emailInput) &&
           await this.isElementVisible(this.passwordInput) &&
           await this.isElementVisible(this.loginButton);
  }

  async validateEmailField(email: string): Promise<string[]> {
    return await this.retryOperation(async () => {
      await this.safeFill(this.emailInput, email);
      await this.pressKey('Tab');
      await this.waitForTimeout(1000); // Allow validation to process

      // Look for validation errors specific to email field
      const emailErrorLocator = this.emailInput.locator('xpath=following-sibling::span[contains(@class, "field-validation-error")]');
      const errors: string[] = [];

      if (await emailErrorLocator.isVisible()) {
        const errorText = await emailErrorLocator.textContent();
        if (errorText) {
          errors.push(errorText.trim());
        }
      }

      return errors;
    }, 'validate email field');
  }

  async validatePasswordField(password: string): Promise<string[]> {
    return await this.retryOperation(async () => {
      await this.safeFill(this.passwordInput, password);
      await this.pressKey('Tab');
      await this.waitForTimeout(1000); // Allow validation to process

      // Look for validation errors specific to password field
      const passwordErrorLocator = this.passwordInput.locator('xpath=following-sibling::span[contains(@class, "field-validation-error")]');
      const errors: string[] = [];

      if (await passwordErrorLocator.isVisible()) {
        const errorText = await passwordErrorLocator.textContent();
        if (errorText) {
          errors.push(errorText.trim());
        }
      }

      return errors;
    }, 'validate password field');
  }

  async loginWithEnterKey(email: string, password: string): Promise<void> {
    await this.retryOperation(async () => {
      await this.waitForLoginFormReady();

      await this.safeFill(this.emailInput, email);
      await this.verifyFieldValue(this.emailInput, email, 'Email');

      await this.safeFill(this.passwordInput, password);
      await this.verifyFieldValue(this.passwordInput, password, 'Password');

      // Focus on password field and press Enter
      await this.passwordInput.focus();
      await this.pressKey('Enter');

      await this.waitForNetworkStability();
    }, 'login with enter key');
  }

  // Enhanced helper methods for robust login functionality

  /**
   * Waits for the login form to be fully ready for interaction
   */
  private async waitForLoginFormReady(): Promise<void> {
    await this.waitForElementSafe(this.emailInput);
    await this.waitForElementSafe(this.passwordInput);
    await this.waitForElementSafe(this.loginButton);
    await this.waitForElementSafe(this.rememberMeCheckbox);

    // Ensure all elements are enabled and interactive
    await this.waitForTimeout(500);
  }

  /**
   * Verifies that a field contains the expected value
   */
  private async verifyFieldValue(locator: Locator, expectedValue: string, fieldName: string): Promise<void> {
    const actualValue = await this.strictGetInputValue(locator);
    if (actualValue !== expectedValue) {
      throw new Error(`${fieldName} field verification failed. Expected: "${expectedValue}", Got: "${actualValue}"`);
    }
  }

  /**
   * Validates that all required login form fields are properly filled
   */
  private async validateLoginFormCompleteness(email: string, password: string): Promise<void> {
    // Use strict safe methods to handle potential multiple element issues
    const emailValue = await this.strictGetInputValue(this.emailInput);
    if (!emailValue || emailValue.trim() !== email.trim()) {
      throw new Error(`Email field is not properly filled. Expected: "${email}", Got: "${emailValue}"`);
    }

    const passwordValue = await this.strictGetInputValue(this.passwordInput);
    if (!passwordValue || passwordValue !== password) {
      throw new Error(`Password field is not properly filled. Expected: "${password}", Got: "${passwordValue}"`);
    }
  }

  /**
   * Safely sets the remember me checkbox state
   */
  private async setRememberMeCheckbox(checked: boolean): Promise<void> {
    await this.retryOperation(async () => {
      const isCurrentlyChecked = await this.strictIsChecked(this.rememberMeCheckbox);

      if (isCurrentlyChecked !== checked) {
        await this.strictSafeClick(this.rememberMeCheckbox);

        // Verify the state changed using strict safe method
        const newState = await this.strictIsChecked(this.rememberMeCheckbox);
        if (newState !== checked) {
          throw new Error(`Failed to set Remember Me checkbox to ${checked}`);
        }
      }
    }, `set remember me to ${checked}`);
  }

  /**
   * Enhanced method to check if login was successful
   */
  async isLoginSuccessful(): Promise<boolean> {
    return await this.retryOperation(async () => {
      await this.waitForTimeout(2000); // Allow time for redirect/success message

      // Check if we've been redirected away from login page
      const currentUrl = await this.getCurrentUrl();
      if (!currentUrl.includes('/login')) {
        return true;
      }

      // Check for success message
      if (await this.isElementVisible(this.successMessage)) {
        return true;
      }

      // Check if login/register links are no longer visible (user is logged in)
      const registerLinkVisible = await this.isElementVisible(this.registerLink);
      if (!registerLinkVisible) {
        return true;
      }

      return false;
    }, 'check login success');
  }

  /**
   * Method to get detailed login validation errors
   */
  async getDetailedLoginErrors(): Promise<{ field: string; errors: string[] }[]> {
    return await this.retryOperation(async () => {
      const fieldErrors: { field: string; errors: string[] }[] = [];

      // Check email field errors
      const emailErrors = await this.validateEmailField(await this.emailInput.inputValue());
      if (emailErrors.length > 0) {
        fieldErrors.push({ field: 'email', errors: emailErrors });
      }

      // Check password field errors
      const passwordErrors = await this.validatePasswordField(await this.passwordInput.inputValue());
      if (passwordErrors.length > 0) {
        fieldErrors.push({ field: 'password', errors: passwordErrors });
      }

      // Check general error message
      const generalError = await this.getErrorMessage();
      if (generalError) {
        fieldErrors.push({ field: 'general', errors: [generalError] });
      }

      return fieldErrors;
    }, 'get detailed login errors');
  }

  /**
   * Method to perform a quick login with default credentials
   */
  async quickLogin(credentials?: { email?: string; password?: string }): Promise<void> {
    const defaultCredentials = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    const creds = { ...defaultCredentials, ...credentials };
    await this.login(creds.email, creds.password);
  }

  /**
   * Method to attempt login and verify success
   */
  async loginAndVerify(email: string, password: string, rememberMe: boolean = false): Promise<boolean> {
    await this.login(email, password, rememberMe);
    return await this.isLoginSuccessful();
  }
}