import { test as base, Page } from '@playwright/test';
import { HomePage, LoginPage, RegisterPage, ProductPage, ShoppingCartPage } from '../pages';
import { UserDataFactory, ProductDataFactory } from '../data';
import { TestHelpers } from '../utils/TestHelpers';
import { UserManager } from '../utils/UserManager';
import { TestIsolation } from '../utils/TestIsolation';

type TestFixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  productPage: ProductPage;
  shoppingCartPage: ShoppingCartPage;
  userDataFactory: typeof UserDataFactory;
  productDataFactory: typeof ProductDataFactory;
  testHelpers: typeof TestHelpers;
  authenticatedUser: { page: Page; user: any };
};

export const test = base.extend<TestFixtures>({
  homePage: async ({ page }, use, testInfo) => {
    const testId = await TestIsolation.beforeTest(page, testInfo.title);

    try {
      const homePage = new HomePage(page);
      await use(homePage);
    } catch (error) {
      await TestIsolation.onTestFailure(page, testInfo.title, error as Error);
      throw error;
    } finally {
      await TestIsolation.afterTest(page, testInfo.title, testId);
    }
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await use(registerPage);
  },

  productPage: async ({ page }, use) => {
    const productPage = new ProductPage(page);
    await use(productPage);
  },

  shoppingCartPage: async ({ page }, use) => {
    const shoppingCartPage = new ShoppingCartPage(page);
    await use(shoppingCartPage);
  },

  userDataFactory: async ({}, use) => {
    await use(UserDataFactory);
  },

  productDataFactory: async ({}, use) => {
    await use(ProductDataFactory);
  },

  testHelpers: async ({}, use) => {
    await use(TestHelpers);
  },

  authenticatedUser: async ({ page }, use) => {
    // Ensure clean state before creating user
    await UserManager.ensureUserLoggedOut(page);

    try {
      // Create and authenticate a unique user
      const user = await UserManager.createAndAuthenticateUser(page);

      await use({ page, user });
    } catch (error) {
      console.error('Failed to create authenticated user:', error);
      throw error;
    } finally {
      // Cleanup after test
      await UserManager.ensureUserLoggedOut(page);
    }
  }
});

export { expect } from '@playwright/test';