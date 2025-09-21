import { test, expect } from '../../../src/fixtures/BaseFixture';

test.describe('Product Browsing', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.waitForPageToLoad();
  });

  test('should display featured products on homepage', async ({
    homePage
  }) => {
    const featuredProducts = await homePage.getFeaturedProducts();
    expect(featuredProducts.length).toBeGreaterThan(0);
  });

  test('should navigate to product categories', async ({
    homePage,
    page
  }) => {
    const categories = ['books', 'computers', 'electronics', 'jewelry'];

    for (const category of categories) {
      await homePage.goto();
      await homePage.navigateToCategory(category);

      const currentUrl = await page.url();
      expect(currentUrl).toContain(`/${category}`);
    }
  });

  test('should search for products', async ({
    homePage,
    page
  }) => {
    const searchTerms = ['laptop', 'book', 'phone', 'jewelry'];

    for (const term of searchTerms) {
      await homePage.goto();
      await homePage.searchForProduct(term);

      const currentUrl = await page.url();
      expect(currentUrl).toContain('/search');
      expect(currentUrl).toContain(term);
    }
  });

  test('should display search results', async ({
    homePage,
    page
  }) => {
    await homePage.searchForProduct('computer');

    const searchResults = await page.locator('.product-item').count();
    expect(searchResults).toBeGreaterThan(0);
  });

  test('should show no results for invalid search', async ({
    homePage,
    page
  }) => {
    await homePage.searchForProduct('xyzinvalidproduct123');

    const noResultsMessage = await page.locator('.no-data').isVisible();
    expect(noResultsMessage).toBe(true);
  });

  test('should navigate to product details', async ({
    homePage,
    productPage
  }) => {
    await homePage.selectFeaturedProduct(0);
    await productPage.waitForProductPage();

    const productTitle = await productPage.getProductTitle();
    expect(productTitle).toBeTruthy();

    const productPrice = await productPage.getProductPrice();
    expect(productPrice).toBeTruthy();
  });

  test('should hover over category menu', async ({
    homePage,
    page
  }) => {
    await homePage.hoverOverCategory('computers');

    const submenu = await page.locator('.sublist').isVisible();
    expect(submenu).toBe(true);
  });

  test('should filter products by category', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('computers');

    const categoryFilter = await page.locator('.block-category-navigation').isVisible();
    expect(categoryFilter).toBe(true);

    const products = await page.locator('.product-item').count();
    expect(products).toBeGreaterThan(0);
  });

  test('should sort products', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('books');

    const sortDropdown = page.locator('#products-orderby');
    if (await sortDropdown.isVisible()) {
      await sortDropdown.selectOption('10');

      await page.waitForTimeout(2000);

      const products = await page.locator('.product-item').count();
      expect(products).toBeGreaterThan(0);
    }
  });

  test('should change product display options', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('electronics');

    const displayOption = page.locator('#products-pagesize');
    if (await displayOption.isVisible()) {
      await displayOption.selectOption('4');

      await page.waitForTimeout(2000);

      const products = await page.locator('.product-item').count();
      expect(products).toBeLessThanOrEqual(4);
    }
  });

  test('should navigate product pagination', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('books');

    const paginationNext = page.locator('.next-page');
    if (await paginationNext.isVisible()) {
      await paginationNext.click();

      await page.waitForTimeout(2000);

      const currentUrl = await page.url();
      expect(currentUrl).toContain('page=2');
    }
  });

  test('should view product quick info', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('computers');

    const firstProduct = page.locator('.product-item').first();
    await firstProduct.hover();

    const productTitle = await firstProduct.locator('.product-title').textContent();
    const productPrice = await firstProduct.locator('.price').textContent();

    expect(productTitle).toBeTruthy();
    expect(productPrice).toBeTruthy();
  });

  test('should add product to compare list from category page', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('electronics');

    const compareButton = page.locator('.add-to-compare-list-button').first();
    if (await compareButton.isVisible()) {
      await compareButton.click();

      const notification = await page.locator('.bar-notification').isVisible();
      expect(notification).toBe(true);
    }
  });

  test('should add product to wishlist from category page', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('jewelry');

    const wishlistButton = page.locator('.add-to-wishlist-button').first();
    if (await wishlistButton.isVisible()) {
      await wishlistButton.click();

      const notification = await page.locator('.bar-notification').isVisible();
      expect(notification).toBe(true);
    }
  });

  test('should view product manufacturer', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('computers');

    const manufacturerFilter = page.locator('.manufacturer-filter');
    if (await manufacturerFilter.isVisible()) {
      const manufacturers = await manufacturerFilter.locator('a').count();
      expect(manufacturers).toBeGreaterThan(0);
    }
  });

  test('should handle empty category', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('gift-cards');

    const products = await page.locator('.product-item').count();
    if (products === 0) {
      const noDataMessage = await page.locator('.no-data').isVisible();
      expect(noDataMessage).toBe(true);
    } else {
      expect(products).toBeGreaterThan(0);
    }
  });
});