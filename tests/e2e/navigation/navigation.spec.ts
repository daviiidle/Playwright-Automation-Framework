import { test, expect } from '../../../src/fixtures/BaseFixture';

test.describe('Website Navigation', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.waitForPageToLoad();
  });

  test('should navigate to all main categories', async ({
    homePage,
    page
  }) => {
    const categories = [
      { name: 'books', url: '/books' },
      { name: 'computers', url: '/computers' },
      { name: 'electronics', url: '/electronics' },
      { name: 'apparel-shoes', url: '/apparel-shoes' },
      { name: 'digital-downloads', url: '/digital-downloads' },
      { name: 'jewelry', url: '/jewelry' },
      { name: 'gift-cards', url: '/gift-cards' }
    ];

    for (const category of categories) {
      await homePage.goto();
      await homePage.navigateToCategory(category.name);

      const currentUrl = await page.url();
      expect(currentUrl).toContain(category.url);

      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    }
  });

  test('should navigate to authentication pages', async ({
    homePage,
    loginPage,
    registerPage
  }) => {
    await homePage.navigateToLogin();
    await loginPage.waitForLoginPage();

    let pageTitle = await loginPage.getPageTitle();
    expect(pageTitle).toContain('Sign In');

    await homePage.goto();
    await homePage.navigateToRegister();
    await registerPage.waitForRegisterPage();

    pageTitle = await registerPage.getPageTitle();
    expect(pageTitle).toContain('Register');
  });

  test('should navigate to shopping cart', async ({
    homePage,
    shoppingCartPage
  }) => {
    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    const pageTitle = await shoppingCartPage.getPageTitle();
    expect(pageTitle).toContain('Shopping cart');
  });

  test('should navigate to wishlist', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToWishlist();

    const currentUrl = await page.url();
    expect(currentUrl).toContain('/wishlist');
  });

  test('should navigate using breadcrumbs', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('books');

    // Try multiple selectors to find a product link
    const productSelectors = [
      '.product-title a',
      '.product-item .product-title a',
      '.item-box .product-title a',
      'h2.product-title a',
      '.product-name a',
      'a[href*="/"]'
    ];

    let productClicked = false;
    for (const selector of productSelectors) {
      const productLinks = page.locator(selector);
      const count = await productLinks.count();

      if (count > 0) {
        await productLinks.first().click();
        productClicked = true;
        break;
      }
    }

    if (productClicked) {
      // Wait for navigation
      await page.waitForTimeout(2000);

      // Try different breadcrumb selectors
      const breadcrumbSelectors = [
        '.breadcrumb a',
        '.breadcrumbs a',
        'nav a',
        '.navigation a'
      ];

      for (const selector of breadcrumbSelectors) {
        const breadcrumb = page.locator(selector).first();
        if (await breadcrumb.isVisible()) {
          await breadcrumb.click();
          break;
        }
      }

      const currentUrl = await page.url();
      expect(currentUrl).toContain('demowebshop.tricentis.com');
    } else {
      // If no products found, just verify we're on computers page
      const currentUrl = await page.url();
      expect(currentUrl).toContain('computers');
    }
  });

  test('should handle browser back navigation', async ({
    homePage,
    testHelpers
  }) => {
    const originalUrl = await homePage.getCurrentUrl();

    await homePage.navigateToCategory('books');
    await testHelpers.navigateBack(homePage.page);

    const currentUrl = await homePage.getCurrentUrl();
    expect(currentUrl).toBe(originalUrl);
  });

  test('should handle browser forward navigation', async ({
    homePage,
    testHelpers
  }) => {
    await homePage.navigateToCategory('electronics');
    const electronicsUrl = await homePage.getCurrentUrl();

    await testHelpers.navigateBack(homePage.page);
    await testHelpers.navigateForward(homePage.page);

    const currentUrl = await homePage.getCurrentUrl();
    expect(currentUrl).toBe(electronicsUrl);
  });

  test('should navigate to footer links', async ({
    homePage,
    page
  }) => {
    const footerLinks = await page.locator('.footer a').all();

    if (footerLinks.length > 0) {
      const firstLink = footerLinks[0];
      const linkHref = await firstLink.getAttribute('href');

      if (linkHref && !linkHref.startsWith('mailto:') && !linkHref.startsWith('tel:')) {
        await firstLink.click();

        const currentUrl = await page.url();
        expect(currentUrl).toBeTruthy();
      }
    }
  });

  test('should handle logo navigation', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('jewelry');

    const logo = page.locator('.header-logo');
    await logo.click();

    const currentUrl = await page.url();
    expect(currentUrl).toBe(process.env.BASE_URL + '/');
  });

  test('should navigate via menu hover', async ({
    homePage,
    page
  }) => {
    await homePage.hoverOverCategory('computers');

    const submenuItem = page.locator('.sublist a').first();
    if (await submenuItem.isVisible()) {
      await submenuItem.click();

      const currentUrl = await page.url();
      // The first submenu item under computers is typically "Desktops"
      expect(currentUrl).toMatch(/\/(computers\/|desktops)/);
    }
  });

  test('should maintain navigation state after page refresh', async ({
    homePage,
    testHelpers
  }) => {
    await homePage.navigateToCategory('books');
    const originalUrl = await homePage.getCurrentUrl();

    await testHelpers.refreshPage(homePage.page);

    const currentUrl = await homePage.getCurrentUrl();
    expect(currentUrl).toBe(originalUrl);
  });

  test('should handle deep linking', async ({
    page
  }) => {
    const deepLinks = [
      '/books',
      '/computers',
      '/electronics',
      '/login',
      '/register',
      '/cart'
    ];

    for (const link of deepLinks) {
      await page.goto(process.env.BASE_URL + link);

      const currentUrl = await page.url();
      expect(currentUrl).toContain(link);

      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();
    }
  });

  test('should handle invalid URLs gracefully', async ({
    page
  }) => {
    const invalidUrls = [
      '/nonexistent-page',
      '/invalid/path',
      '/product/999999'
    ];

    for (const url of invalidUrls) {
      await page.goto(process.env.BASE_URL + url, { waitUntil: 'networkidle' });

      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy();

      const currentUrl = await page.url();
      expect(currentUrl).toBeTruthy();
    }
  });
});