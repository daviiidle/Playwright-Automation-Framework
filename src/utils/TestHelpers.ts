import { Page, expect } from '@playwright/test';

export class TestHelpers {
  static async waitForPageToLoad(page: Page, timeout: number = 30000): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout });
  }

  static async scrollToBottom(page: Page): Promise<void> {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  static async scrollToTop(page: Page): Promise<void> {
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  }

  static async takeFullPageScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  static async waitForAnimation(page: Page, duration: number = 1000): Promise<void> {
    await page.waitForTimeout(duration);
  }

  static async clearLocalStorage(page: Page): Promise<void> {
    await page.evaluate(() => {
      localStorage.clear();
    });
  }

  static async clearSessionStorage(page: Page): Promise<void> {
    await page.evaluate(() => {
      sessionStorage.clear();
    });
  }

  static async clearAllStorage(page: Page): Promise<void> {
    await this.clearLocalStorage(page);
    await this.clearSessionStorage(page);
  }

  static async getLocalStorageItem(page: Page, key: string): Promise<string | null> {
    return await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, key);
  }

  static async setLocalStorageItem(page: Page, key: string, value: string): Promise<void> {
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, value);
    }, { key, value });
  }

  static async getCurrentUrl(page: Page): Promise<string> {
    return page.url();
  }

  static async getPageTitle(page: Page): Promise<string> {
    return await page.title();
  }

  static async refreshPage(page: Page): Promise<void> {
    await page.reload({ waitUntil: 'networkidle' });
  }

  static async navigateBack(page: Page): Promise<void> {
    await page.goBack({ waitUntil: 'networkidle' });
  }

  static async navigateForward(page: Page): Promise<void> {
    await page.goForward({ waitUntil: 'networkidle' });
  }

  static async switchToNewTab(page: Page): Promise<Page> {
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
    ]);
    await newPage.waitForLoadState();
    return newPage;
  }

  static async closeAllTabsExceptFirst(page: Page): Promise<void> {
    const pages = page.context().pages();
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  }

  static async simulateSlowNetwork(page: Page): Promise<void> {
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
  }

  static async blockImages(page: Page): Promise<void> {
    await page.route('**/*.{png,jpg,jpeg,gif,svg,webp}', route => route.abort());
  }

  static async blockCss(page: Page): Promise<void> {
    await page.route('**/*.css', route => route.abort());
  }

  static async mockApiResponse(page: Page, url: string, response: any): Promise<void> {
    await page.route(url, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  static async interceptNetworkRequests(page: Page): Promise<void> {
    page.on('request', request => {
      console.log('Request:', request.url());
    });

    page.on('response', response => {
      console.log('Response:', response.url(), response.status());
    });
  }

  static generateRandomString(length: number = 10): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  static generateRandomEmail(): string {
    const username = this.generateRandomString(8);
    const domain = this.generateRandomString(6);
    return `${username}@${domain}.com`.toLowerCase();
  }

  static generateTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  static async waitForElementToDisappear(page: Page, selector: string, timeout: number = 10000): Promise<void> {
    await page.waitForSelector(selector, { state: 'detached', timeout });
  }

  static async waitForElementToAppear(page: Page, selector: string, timeout: number = 10000): Promise<void> {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  }

  static async getElementCount(page: Page, selector: string): Promise<number> {
    return await page.locator(selector).count();
  }

  static async isElementVisible(page: Page, selector: string): Promise<boolean> {
    return await page.locator(selector).isVisible();
  }

  static async getElementText(page: Page, selector: string): Promise<string> {
    return await page.locator(selector).textContent() || '';
  }

  static async clickElementWithRetry(page: Page, selector: string, maxRetries: number = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.locator(selector).click({ timeout: 5000 });
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await page.waitForTimeout(1000);
      }
    }
  }

  static async fillInputWithRetry(page: Page, selector: string, text: string, maxRetries: number = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.locator(selector).fill(text, { timeout: 5000 });
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        await page.waitForTimeout(1000);
      }
    }
  }

  static async dragAndDrop(page: Page, sourceSelector: string, targetSelector: string): Promise<void> {
    await page.locator(sourceSelector).dragTo(page.locator(targetSelector));
  }

  static async hoverOverElement(page: Page, selector: string): Promise<void> {
    await page.locator(selector).hover();
  }

  static async doubleClickElement(page: Page, selector: string): Promise<void> {
    await page.locator(selector).dblclick();
  }

  static async rightClickElement(page: Page, selector: string): Promise<void> {
    await page.locator(selector).click({ button: 'right' });
  }

  static async pressKeyboard(page: Page, key: string): Promise<void> {
    await page.keyboard.press(key);
  }

  static async typeText(page: Page, text: string, delay: number = 50): Promise<void> {
    await page.keyboard.type(text, { delay });
  }

  static extractNumberFromText(text: string): number {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  static extractPriceFromText(text: string): number {
    const match = text.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  static async verifyPageTitle(page: Page, expectedTitle: string): Promise<void> {
    await expect(page).toHaveTitle(expectedTitle);
  }

  static async verifyUrl(page: Page, expectedUrl: string): Promise<void> {
    await expect(page).toHaveURL(expectedUrl);
  }

  static async verifyUrlContains(page: Page, urlFragment: string): Promise<void> {
    await expect(page).toHaveURL(new RegExp(urlFragment));
  }
}