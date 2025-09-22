import { test, expect } from '../../../src/fixtures/BaseFixture';

test.describe('User Registration', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.navigateToRegister();
  });

  test('should register a new user successfully', async ({
    registerPage,
    userDataFactory
  }) => {
    const user = userDataFactory.createValidUser();

    await registerPage.register(
      user.gender,
      user.firstName,
      user.lastName,
      user.email,
      user.password,
      user.confirmPassword
    );

    const successMessage = await registerPage.getSuccessMessage();
    expect(successMessage.toLowerCase()).toContain('registration');
  });

  test('should show validation errors for empty required fields', async ({
    registerPage
  }) => {
    await registerPage.clickElement(registerPage['registerButton']);

    const validationErrors = await registerPage.getValidationErrors();
    expect(validationErrors.length).toBeGreaterThan(0);
    expect(validationErrors.some(error =>
      error.includes('First name is required') ||
      error.includes('required')
    )).toBe(true);
  });

  test('should validate email format', async ({
    registerPage,
    userDataFactory
  }) => {
    const invalidData = userDataFactory.createInvalidUserData();

    await registerPage.register(
      'male',
      invalidData.invalidEmail.firstName,
      invalidData.invalidEmail.lastName,
      invalidData.invalidEmail.email,
      invalidData.invalidEmail.password,
      invalidData.invalidEmail.confirmPassword
    );

    const validationErrors = await registerPage.getValidationErrors();
    expect(validationErrors.some(error =>
      error.includes('Wrong email') ||
      error.includes('email')
    )).toBe(true);
  });

  test('should validate password confirmation', async ({
    registerPage,
    userDataFactory
  }) => {
    const invalidData = userDataFactory.createInvalidUserData();

    await registerPage.register(
      'female',
      invalidData.passwordMismatch.firstName,
      invalidData.passwordMismatch.lastName,
      invalidData.passwordMismatch.email,
      invalidData.passwordMismatch.password,
      invalidData.passwordMismatch.confirmPassword
    );

    const validationErrors = await registerPage.getValidationErrors();
    expect(validationErrors.some(error =>
      error.includes('password') && error.includes('confirm')
    )).toBe(true);
  });

  test('should validate minimum password requirements', async ({
    registerPage,
    userDataFactory
  }) => {
    const invalidData = userDataFactory.createInvalidUserData();

    await registerPage.register(
      'male',
      invalidData.weakPassword.firstName,
      invalidData.weakPassword.lastName,
      invalidData.weakPassword.email,
      invalidData.weakPassword.password,
      invalidData.weakPassword.confirmPassword
    );

    const validationErrors = await registerPage.getValidationErrors();
    expect(validationErrors.some(error =>
      error.includes('password') || error.includes('must')
    )).toBe(true);
  });

  test('should handle email registration attempts', async ({
    registerPage,
    userDataFactory
  }) => {
    // Use a commonly used test email
    const testEmail = 'test@example.com';
    const user = userDataFactory.createUserWithSpecificEmail(testEmail);

    // Try to register with the test email
    await registerPage.register(
      user.gender,
      user.firstName,
      user.lastName,
      user.email,
      user.password,
      user.confirmPassword
    );

    // Check that registration completes (either with success or appropriate error)
    const errorMessage = await registerPage.getErrorMessage();
    const successMessage = await registerPage.getSuccessMessage();
    const currentUrl = await registerPage.getCurrentUrl();

    // Verify that registration process completes appropriately
    const hasCompletedRegistration =
      (successMessage && successMessage.toLowerCase().includes('registration')) ||
      (errorMessage && errorMessage.toLowerCase().includes('email')) ||
      currentUrl.includes('registerresult');

    expect(hasCompletedRegistration).toBe(true);
  });

  test('should navigate to login page from registration', async ({
    registerPage,
    loginPage
  }) => {
    await registerPage.navigateToLogin();
    await loginPage.waitForLoginPage();

    const pageTitle = await loginPage.getPageTitle();
    expect(pageTitle).toContain('Sign In');
  });

  test('should validate gender selection', async ({
    registerPage,
    userDataFactory
  }) => {
    const user = userDataFactory.createValidUser();

    await registerPage.selectGender('male');
    let selectedGender = await registerPage.getSelectedGender();
    expect(selectedGender).toBe('male');

    await registerPage.selectGender('female');
    selectedGender = await registerPage.getSelectedGender();
    expect(selectedGender).toBe('female');
  });

  test('should clear registration form', async ({
    registerPage,
    userDataFactory
  }) => {
    const user = userDataFactory.createValidUser();

    await registerPage.fillInput(registerPage['firstNameInput'], user.firstName);
    await registerPage.fillInput(registerPage['lastNameInput'], user.lastName);
    await registerPage.fillInput(registerPage['emailInput'], user.email);

    await registerPage.clearRegistrationForm();

    const firstName = await registerPage['firstNameInput'].inputValue();
    const lastName = await registerPage['lastNameInput'].inputValue();
    const email = await registerPage['emailInput'].inputValue();

    expect(firstName).toBe('');
    expect(lastName).toBe('');
    expect(email).toBe('');
  });

  test('should validate maximum field lengths', async ({
    registerPage,
    userDataFactory
  }) => {
    const invalidData = userDataFactory.createInvalidUserData();

    await registerPage.register(
      'male',
      invalidData.longEmail.firstName,
      invalidData.longEmail.lastName,
      invalidData.longEmail.email,
      invalidData.longEmail.password,
      invalidData.longEmail.confirmPassword
    );

    const validationErrors = await registerPage.getValidationErrors();
    expect(validationErrors.some(error =>
      error.includes('email') || error.includes('long')
    )).toBe(true);
  });
});