import { Page } from '@playwright/test';
import { HomePage, LoginPage, RegisterPage } from '../pages';
import { UserDataFactory, User } from '../data';

export class UserManager {
  private static createdUsers: Set<string> = new Set();
  private static userSessions: Map<string, User> = new Map();

  static async createAndAuthenticateUser(page: Page, retries: number = 3): Promise<User> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const user = this.generateUniqueUser();
        const homePage = new HomePage(page);
        const registerPage = new RegisterPage(page);
        const loginPage = new LoginPage(page);

        // Navigate to home and then register
        await homePage.goto();
        await homePage.waitForPageToLoad();
        await homePage.navigateToRegister();
        await registerPage.waitForRegisterPage();

        // Register the user
        await registerPage.register(
          user.gender,
          user.firstName,
          user.lastName,
          user.email,
          user.password,
          user.confirmPassword
        );

        // Wait for registration to complete
        await page.waitForTimeout(2000);

        // Check for success or navigate to login
        const currentUrl = await page.url();
        if (!currentUrl.includes('/registerresult')) {
          // Registration might have redirected to login, try to navigate there
          await homePage.goto();
          await homePage.navigateToLogin();
        } else {
          // Registration successful, navigate to login
          await homePage.goto();
          await homePage.navigateToLogin();
        }

        await loginPage.waitForLoginPage();

        // Login with the created user
        await loginPage.login(user.email, user.password);
        await page.waitForTimeout(2000);

        // Verify login success
        await homePage.goto();
        const isLoggedIn = await homePage.isUserLoggedIn();

        if (isLoggedIn) {
          // Store user session
          this.createdUsers.add(user.email);
          this.userSessions.set(user.email, user);
          return user;
        } else {
          throw new Error('Login verification failed');
        }

      } catch (error) {
        lastError = error as Error;
        console.log(`Authentication attempt ${attempt + 1} failed:`, error);

        if (attempt < retries - 1) {
          // Wait before retry
          await page.waitForTimeout(1000 * (attempt + 1));
        }
      }
    }

    throw new Error(`Failed to create and authenticate user after ${retries} attempts. Last error: ${lastError?.message}`);
  }

  static async loginExistingUser(page: Page, email: string, password: string): Promise<boolean> {
    try {
      const homePage = new HomePage(page);
      const loginPage = new LoginPage(page);

      await homePage.goto();
      await homePage.navigateToLogin();
      await loginPage.waitForLoginPage();
      await loginPage.login(email, password);

      // Verify login
      await homePage.goto();
      return await homePage.isUserLoggedIn();
    } catch (error) {
      console.log('Login failed:', error);
      return false;
    }
  }

  static generateUniqueUser(): User {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const uniqueId = `${timestamp}_${randomId}`;

    const baseUser = UserDataFactory.createValidUser();

    return {
      ...baseUser,
      email: `testuser_${uniqueId}@automationtest.com`,
      firstName: `Test_${uniqueId.substring(0, 8)}`,
      lastName: `User_${uniqueId.substring(8, 16)}`
    };
  }

  static async logout(page: Page): Promise<void> {
    try {
      const logoutLink = page.locator('a[href="/logout"]').or(page.locator(':text("Log out")'));
      if (await logoutLink.isVisible()) {
        await logoutLink.click();
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('Logout failed:', error);
    }
  }

  static async clearUserSession(page: Page): Promise<void> {
    try {
      // Clear cookies and local storage
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      console.log('Failed to clear user session:', error);
    }
  }

  static getCreatedUsers(): string[] {
    return Array.from(this.createdUsers);
  }

  static getUserSession(email: string): User | undefined {
    return this.userSessions.get(email);
  }

  static cleanup(): void {
    this.createdUsers.clear();
    this.userSessions.clear();
  }

  static async ensureUserLoggedOut(page: Page): Promise<void> {
    try {
      const homePage = new HomePage(page);
      await homePage.goto();

      const isLoggedIn = await homePage.isUserLoggedIn();
      if (isLoggedIn) {
        await this.logout(page);
      }

      await this.clearUserSession(page);
    } catch (error) {
      console.log('Error ensuring user logged out:', error);
    }
  }
}