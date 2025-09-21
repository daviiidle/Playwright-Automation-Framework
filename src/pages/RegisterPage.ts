import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class RegisterPage extends BasePage {
  public readonly genderMaleRadio: Locator;
  public readonly genderFemaleRadio: Locator;
  public readonly firstNameInput: Locator;
  public readonly lastNameInput: Locator;
  public readonly emailInput: Locator;
  public readonly passwordInput: Locator;
  public readonly confirmPasswordInput: Locator;
  public readonly registerButton: Locator;
  private readonly loginLink: Locator;
  private readonly errorMessage: Locator;
  private readonly successMessage: Locator;
  private readonly pageTitle: Locator;
  private readonly validationSummary: Locator;

  constructor(page: Page) {
    super(page, '/register');

    // Fixed selectors - use highly specific unique identifiers to avoid strict mode violations
    this.genderMaleRadio = page.locator('#gender-male')
      .or(page.locator('input[type="radio"][name="Gender"][value="M"]'))
      .or(page.getByRole('radio', { name: 'Male', exact: true }));

    this.genderFemaleRadio = page.locator('#gender-female')
      .or(page.locator('input[type="radio"][name="Gender"][value="F"]'))
      .or(page.getByRole('radio', { name: 'Female', exact: true }));

    this.firstNameInput = page.locator('#FirstName')
      .or(page.locator('input[name="FirstName"]'))
      .or(page.locator('input[placeholder*="First" i]'))
      .or(page.locator('input[id*="first" i][id*="name" i]'));

    this.lastNameInput = page.locator('#LastName')
      .or(page.locator('input[name="LastName"]'))
      .or(page.locator('input[placeholder*="Last" i]'))
      .or(page.locator('input[id*="last" i][id*="name" i]'));

    this.emailInput = page.locator('#Email')
      .or(page.locator('input[name="Email"]'))
      .or(page.locator('input[type="email"]'))
      .or(page.locator('input[placeholder*="email" i]'));

    this.passwordInput = page.locator('#Password')
      .or(page.locator('input[name="Password"]'))
      .or(page.locator('input[type="password"]:not([name*="confirm" i])'))
      .or(page.locator('input[placeholder*="password" i]:not([placeholder*="confirm" i])'));

    this.confirmPasswordInput = page.locator('#ConfirmPassword')
      .or(page.locator('input[name="ConfirmPassword"]'))
      .or(page.locator('input[name*="confirm" i][type="password"]'))
      .or(page.locator('input[placeholder*="confirm" i][type="password"]'));

    this.registerButton = page.locator('button:has-text("Register")')
      .or(page.locator('input[value="Register"]'))
      .or(page.locator('input[type="submit"][value*="Register" i]'))
      .or(page.locator('button[type="submit"]:has-text("Register")'));
    this.loginLink = page.locator('a[href="/login"]')
      .or(page.locator('a:has-text("Log in")'))
      .or(page.locator('a:has-text("Login")'))
      .or(page.locator('a[href*="login"]'));

    this.errorMessage = page.locator('.message-error')
      .or(page.locator('.validation-summary-errors'))
      .or(page.locator('.alert-danger'))
      .or(page.locator('[class*="error"][class*="message"]'));

    this.successMessage = page.locator('.result')
      .or(page.locator('.registration-result-page'))
      .or(page.locator('.alert-success'))
      .or(page.locator('[class*="success"][class*="message"]'));

    this.pageTitle = page.locator('.page-title h1')
      .or(page.locator('h1'))
      .or(page.locator('.page-header h1'))
      .or(page.locator('[class*="title"] h1'));

    this.validationSummary = page.locator('.validation-summary-errors')
      .or(page.locator('[data-valmsg-summary="true"]'))
      .or(page.locator('.validation-summary ul'))
      .or(page.locator('div[class*="validation"][class*="summary"]'));
  }

  /**
   * Enhanced registration method with comprehensive error handling and verification
   */
  async register(
    gender: 'male' | 'female',
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<void> {
    await this.retryOperation(async () => {
      // Wait for the registration form to be fully loaded
      await this.waitForRegistrationFormReady();

      // Select gender with verification
      await this.selectGenderSafely(gender);

      // Fill form fields with enhanced safety and verification
      await this.safeFill(this.firstNameInput, firstName);
      await this.verifyFieldValue(this.firstNameInput, firstName, 'First Name');

      await this.safeFill(this.lastNameInput, lastName);
      await this.verifyFieldValue(this.lastNameInput, lastName, 'Last Name');

      await this.safeFill(this.emailInput, email);
      await this.verifyFieldValue(this.emailInput, email, 'Email');

      await this.safeFill(this.passwordInput, password);
      await this.verifyFieldValue(this.passwordInput, password, 'Password');

      await this.safeFill(this.confirmPasswordInput, confirmPassword);
      await this.verifyFieldValue(this.confirmPasswordInput, confirmPassword, 'Confirm Password');

      // Ensure all fields are properly filled before submission (skip for validation testing)
      const hasValidData = firstName.trim() && lastName.trim() && email.trim() && password.trim() && confirmPassword.trim();
      if (hasValidData) {
        await this.validateFormCompleteness();
      }

      // Submit the form with verification
      await this.safeClick(this.registerButton);

      // Wait for navigation or response
      await this.waitForNetworkStability();

    }, 'registration');
  }

  async navigateToLogin(): Promise<void> {
    await this.retryOperation(async () => {
      await this.safeClick(this.loginLink);
      await this.waitForNetworkStability();
    }, 'navigate to login');
  }

  async getErrorMessage(): Promise<string> {
    return await this.retryOperation(async () => {
      await this.waitForTimeout(1000); // Allow time for error messages to appear
      if (await this.isElementVisible(this.errorMessage)) {
        return await this.getElementText(this.errorMessage);
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

  async getValidationErrors(): Promise<string[]> {
    const errors = [];

    // Check for validation summary first
    const validationSummaryExists = await this.strictIsVisible(this.validationSummary);
    if (validationSummaryExists) {
      // Try to get errors from list items in validation summary
      const listItems = await this.validationSummary.locator('li').all();
      if (listItems.length > 0) {
        for (const errorElement of listItems) {
          const errorText = await errorElement.textContent();
          if (errorText) {
            errors.push(errorText.trim());
          }
        }
      } else {
        // If no list items, get text directly from the validation element
        const errorText = await this.strictGetText(this.validationSummary);
        if (errorText) {
          errors.push(errorText.trim());
        }
      }
    }

    // Also check for individual field validation errors (but limit to avoid too many matches)
    const fieldErrors = this.page.locator('span.field-validation-error:visible');
    const errorCount = await fieldErrors.count();

    // Only get the first few errors to avoid strict mode violations
    const maxErrors = Math.min(errorCount, 3);
    for (let i = 0; i < maxErrors; i++) {
      try {
        const errorElement = fieldErrors.nth(i);
        const errorText = await errorElement.textContent();
        if (errorText && errorText.trim()) {
          errors.push(errorText.trim());
        }
      } catch (error) {
        // Skip if error getting this element
        continue;
      }
    }

    return [...new Set(errors)]; // Remove duplicates
  }

  async isRegisterButtonEnabled(): Promise<boolean> {
    return await this.registerButton.isEnabled();
  }

  async clearRegistrationForm(): Promise<void> {
    await this.retryOperation(async () => {
      const fields = [
        { locator: this.firstNameInput, name: 'First Name' },
        { locator: this.lastNameInput, name: 'Last Name' },
        { locator: this.emailInput, name: 'Email' },
        { locator: this.passwordInput, name: 'Password' },
        { locator: this.confirmPasswordInput, name: 'Confirm Password' }
      ];

      for (const field of fields) {
        await this.waitForElementSafe(field.locator);
        await field.locator.clear();

        // Verify field was cleared
        const value = await field.locator.inputValue();
        if (value.length > 0) {
          throw new Error(`Failed to clear ${field.name} field`);
        }
      }
    }, 'clear registration form');
  }

  async getPageTitle(): Promise<string> {
    return await this.getElementText(this.pageTitle);
  }

  async waitForRegisterPage(): Promise<void> {
    await this.retryOperation(async () => {
      await this.waitForElementSafe(this.pageTitle);
      await this.waitForElementSafe(this.firstNameInput);
      await this.waitForElementSafe(this.lastNameInput);
      await this.waitForElementSafe(this.emailInput);
      await this.waitForElementSafe(this.passwordInput);
      await this.waitForElementSafe(this.confirmPasswordInput);
      await this.waitForElementSafe(this.registerButton);

      // Ensure form is interactive
      const isButtonEnabled = await this.registerButton.isEnabled();
      if (!isButtonEnabled) {
        await this.waitForTimeout(1000);
      }
    }, 'wait for register page');
  }

  async isRegistrationFormVisible(): Promise<boolean> {
    return await this.isElementVisible(this.firstNameInput) &&
           await this.isElementVisible(this.lastNameInput) &&
           await this.isElementVisible(this.emailInput) &&
           await this.isElementVisible(this.registerButton);
  }

  async validateEmailField(email: string): Promise<string[]> {
    return await this.retryOperation(async () => {
      await this.safeFill(this.emailInput, email);
      await this.pressKey('Tab');
      await this.waitForTimeout(1000); // Allow validation to process
      return await this.getValidationErrors();
    }, 'validate email field');
  }

  async validatePasswordField(password: string): Promise<string[]> {
    return await this.retryOperation(async () => {
      await this.safeFill(this.passwordInput, password);
      await this.pressKey('Tab');
      await this.waitForTimeout(1000); // Allow validation to process
      return await this.getValidationErrors();
    }, 'validate password field');
  }

  async validateConfirmPasswordField(confirmPassword: string): Promise<string[]> {
    return await this.retryOperation(async () => {
      await this.safeFill(this.confirmPasswordInput, confirmPassword);
      await this.pressKey('Tab');
      await this.waitForTimeout(1000); // Allow validation to process
      return await this.getValidationErrors();
    }, 'validate confirm password field');
  }

  async selectGender(gender: 'male' | 'female'): Promise<void> {
    await this.selectGenderSafely(gender);
  }

  private async selectGenderSafely(gender: 'male' | 'female'): Promise<void> {
    await this.retryOperation(async () => {
      const targetRadio = gender === 'male' ? this.genderMaleRadio : this.genderFemaleRadio;
      await this.waitForElementSafe(targetRadio);
      await this.safeClick(targetRadio);

      // Verify selection using strict safe method
      const isSelected = await this.strictIsChecked(targetRadio);
      if (!isSelected) {
        throw new Error(`Failed to select ${gender} gender`);
      }
    }, `select ${gender} gender`);
  }

  async getSelectedGender(): Promise<'male' | 'female' | null> {
    const maleSelected = await this.strictIsChecked(this.genderMaleRadio);
    const femaleSelected = await this.strictIsChecked(this.genderFemaleRadio);

    if (maleSelected) return 'male';
    if (femaleSelected) return 'female';
    return null;
  }

  // Enhanced helper methods for robust registration functionality

  /**
   * Waits for the registration form to be fully ready for interaction
   */
  private async waitForRegistrationFormReady(): Promise<void> {
    await this.waitForElementSafe(this.firstNameInput);
    await this.waitForElementSafe(this.lastNameInput);
    await this.waitForElementSafe(this.emailInput);
    await this.waitForElementSafe(this.passwordInput);
    await this.waitForElementSafe(this.confirmPasswordInput);
    await this.waitForElementSafe(this.registerButton);

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
   * Validates that all required form fields are properly filled
   */
  private async validateFormCompleteness(): Promise<void> {
    const requiredFields = [
      { locator: this.firstNameInput, name: 'First Name' },
      { locator: this.lastNameInput, name: 'Last Name' },
      { locator: this.emailInput, name: 'Email' },
      { locator: this.passwordInput, name: 'Password' },
      { locator: this.confirmPasswordInput, name: 'Confirm Password' }
    ];

    for (const field of requiredFields) {
      const value = await field.locator.inputValue();
      if (!value || value.trim().length === 0) {
        throw new Error(`${field.name} field is empty or not properly filled`);
      }
    }

    // Verify gender selection
    const selectedGender = await this.getSelectedGender();
    if (!selectedGender) {
      throw new Error('Gender selection is required');
    }
  }

  /**
   * Enhanced method to check if registration was successful
   */
  async isRegistrationSuccessful(): Promise<boolean> {
    return await this.retryOperation(async () => {
      await this.waitForTimeout(2000); // Allow time for redirect/success message

      // Check for success message
      if (await this.isElementVisible(this.successMessage)) {
        return true;
      }

      // Check if we've been redirected to a success page
      const currentUrl = await this.getCurrentUrl();
      if (currentUrl.includes('registerresult') || currentUrl.includes('success')) {
        return true;
      }

      // Check if we're no longer on the registration page (successful redirect)
      if (!currentUrl.includes('/register')) {
        return true;
      }

      return false;
    }, 'check registration success');
  }

  /**
   * Enhanced method to get detailed validation errors with context
   */
  async getDetailedValidationErrors(): Promise<{ field: string; errors: string[] }[]> {
    return await this.retryOperation(async () => {
      const fieldErrors: { field: string; errors: string[] }[] = [];

      // Check individual field validation errors
      const fieldsToCheck = [
        { locator: this.firstNameInput, name: 'firstName' },
        { locator: this.lastNameInput, name: 'lastName' },
        { locator: this.emailInput, name: 'email' },
        { locator: this.passwordInput, name: 'password' },
        { locator: this.confirmPasswordInput, name: 'confirmPassword' }
      ];

      for (const field of fieldsToCheck) {
        const fieldErrorLocator = field.locator.locator('xpath=following-sibling::span[contains(@class, "field-validation-error")]');
        if (await fieldErrorLocator.isVisible()) {
          const errorText = await fieldErrorLocator.textContent();
          if (errorText) {
            fieldErrors.push({
              field: field.name,
              errors: [errorText.trim()]
            });
          }
        }
      }

      // Check general validation summary
      const generalErrors = await this.getValidationErrors();
      if (generalErrors.length > 0) {
        fieldErrors.push({
          field: 'general',
          errors: generalErrors
        });
      }

      return fieldErrors;
    }, 'get detailed validation errors');
  }

  /**
   * Method to perform a quick registration with minimal data
   */
  async quickRegister(userData?: Partial<{
    gender: 'male' | 'female';
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }>): Promise<void> {
    const defaultData = {
      gender: 'male' as const,
      firstName: `TestUser${Date.now()}`,
      lastName: 'Tester',
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    const data = { ...defaultData, ...userData };

    await this.register(
      data.gender,
      data.firstName,
      data.lastName,
      data.email,
      data.password,
      data.password
    );
  }
}