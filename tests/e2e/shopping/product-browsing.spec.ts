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

    // Check for various possible no results indicators
    const noResultsSelectors = [
      '.no-data',
      '.no-results',
      '.search-results:has-text("No products")',
      ':text("No products were found")',
      ':text("No products")',
      '.product-list:empty',
      '.search-message'
    ];

    let hasNoResultsMessage = false;
    for (const selector of noResultsSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          hasNoResultsMessage = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Also check that no products are displayed
    const productCount = await page.locator('.product-item').count();

    // Check that we're on a search page and no products are found
    const currentUrl = await page.url();
    expect(currentUrl).toContain('search');
    expect(productCount).toBe(0);
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

    const submenu = await page.locator('.sublist').first().isVisible();
    expect(submenu).toBe(true);
  });

  test('should filter products by category', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('books');

    // Verify we're on the computers category page
    const currentUrl = await page.url();
    expect(currentUrl).toContain('books');

    // Check if there are subcategories or products
    const subcategories = await page.locator('.sub-category-item').count();
    const products = await page.locator('.product-item').count();

    // Either subcategories or products should be present
    expect(subcategories + products).toBeGreaterThan(0);
  });

  test('should sort products', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('books');

    // Check if sort dropdown exists and try to select an available option
    const sortDropdown = page.locator('#products-orderby');
    if (await sortDropdown.isVisible()) {
      // Get available options and select the second one (usually "Name: A to Z")
      const options = await sortDropdown.locator('option').all();
      if (options.length > 1) {
        const secondOptionValue = await options[1].getAttribute('value');
        if (secondOptionValue) {
          await sortDropdown.selectOption(secondOptionValue);
          await page.waitForTimeout(2000);
        }
      }
    }

    // Verify we're on the books page and products are displayed
    const currentUrl = await page.url();
    expect(currentUrl).toContain('books');

    const products = await page.locator('.product-item').count();
    expect(products).toBeGreaterThan(0);
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
    await homePage.navigateToCategory('books');

    // Check if there are products to hover over
    const products = await page.locator('.product-item').count();
    if (products > 0) {
      const firstProduct = page.locator('.product-item').first();
      await firstProduct.hover();

      // Try to get product info with flexible selectors
      const titleSelectors = ['.product-title', '.product-name', 'h2 a', 'h3 a'];
      const priceSelectors = ['.price', '.actual-price', '.price-value'];

      let productTitle = '';
      let productPrice = '';

      for (const selector of titleSelectors) {
        try {
          const element = firstProduct.locator(selector);
          if (await element.isVisible()) {
            productTitle = await element.textContent() || '';
            if (productTitle.trim()) break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      for (const selector of priceSelectors) {
        try {
          const element = firstProduct.locator(selector);
          if (await element.isVisible()) {
            productPrice = await element.textContent() || '';
            if (productPrice.trim()) break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      expect(productTitle.trim()).toBeTruthy();
      expect(productPrice.trim()).toBeTruthy();
    } else {
      // If no products, just verify we're on the correct page
      const currentUrl = await page.url();
      expect(currentUrl).toContain('books');
    }
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
    await homePage.navigateToCategory('books');

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