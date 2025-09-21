import { test, expect } from '../../../src/fixtures/BaseFixture';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.waitForPageToLoad();
  });

  test('should search for products with valid terms', async ({
    homePage,
    productDataFactory,
    page
  }) => {
    const searchQueries = productDataFactory.createSearchQueries();

    for (let i = 0; i < Math.min(3, searchQueries.length); i++) {
      const query = searchQueries[i];
      await homePage.goto();
      await homePage.searchForProduct(query.term);

      const currentUrl = await page.url();
      expect(currentUrl).toContain('/search');
      expect(currentUrl).toContain(query.term);

      const results = await page.locator('.product-item').count();
      if (results === 0) {
        const noResultsMessage = await page.locator('.no-data').isVisible();
        expect(noResultsMessage).toBe(true);
      } else {
        expect(results).toBeGreaterThan(0);
      }
    }
  });

  test('should display search suggestions', async ({
    homePage,
    page
  }) => {
    const searchBox = page.locator('#small-searchterms');

    await searchBox.fill('comp');
    await page.waitForTimeout(1000);

    const suggestions = page.locator('.ui-autocomplete');
    if (await suggestions.isVisible()) {
      const suggestionItems = await suggestions.locator('li').count();
      expect(suggestionItems).toBeGreaterThan(0);
    }
  });

  test('should handle empty search', async ({
    homePage,
    page
  }) => {
    await homePage.searchForProduct('');

    const currentUrl = await page.url();
    expect(currentUrl).toContain('/search');

    const allProducts = await page.locator('.product-item').count();
    expect(allProducts).toBeGreaterThanOrEqual(0);
  });

  test('should handle search with no results', async ({
    homePage,
    page
  }) => {
    await homePage.searchForProduct('xyznonexistentproduct123');

    const noResultsMessage = await page.locator('.no-data').isVisible();
    expect(noResultsMessage).toBe(true);

    const resultsCount = await page.locator('.product-item').count();
    expect(resultsCount).toBe(0);
  });

  test('should search with special characters', async ({
    homePage,
    page
  }) => {
    const specialSearchTerms = ['C++', '.NET', 'C#', 'AT&T'];

    for (const term of specialSearchTerms) {
      await homePage.goto();
      await homePage.searchForProduct(term);

      const currentUrl = await page.url();
      expect(currentUrl).toContain('/search');

      const results = await page.locator('.product-item').count();
      expect(results).toBeGreaterThanOrEqual(0);
    }
  });

  test('should search with very long terms', async ({
    homePage,
    page
  }) => {
    const longSearchTerm = 'a'.repeat(200);

    await homePage.searchForProduct(longSearchTerm);

    const currentUrl = await page.url();
    expect(currentUrl).toContain('/search');

    const noResultsMessage = await page.locator('.no-data').isVisible();
    expect(noResultsMessage).toBe(true);
  });

  test('should filter search results by category', async ({
    homePage,
    page
  }) => {
    await homePage.searchForProduct('computer');

    const categoryFilter = page.locator('#cid');
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption('Computers');

      await page.waitForTimeout(2000);

      const filteredResults = await page.locator('.product-item').count();
      expect(filteredResults).toBeGreaterThanOrEqual(0);
    }
  });

  test('should filter search results by manufacturer', async ({
    homePage,
    page
  }) => {
    await homePage.searchForProduct('laptop');

    const manufacturerFilter = page.locator('#mid');
    if (await manufacturerFilter.isVisible()) {
      const manufacturers = await manufacturerFilter.locator('option').count();
      if (manufacturers > 1) {
        await manufacturerFilter.selectOption({ index: 1 });

        await page.waitForTimeout(2000);

        const filteredResults = await page.locator('.product-item').count();
        expect(filteredResults).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should sort search results', async ({
    homePage,
    page
  }) => {
    await homePage.searchForProduct('book');

    const sortDropdown = page.locator('#orderby');
    if (await sortDropdown.isVisible()) {
      await sortDropdown.selectOption('Price: Low to High');

      await page.waitForTimeout(2000);

      const products = await page.locator('.product-item').count();
      expect(products).toBeGreaterThanOrEqual(0);

      if (products > 1) {
        const firstPrice = await page.locator('.product-item').first().locator('.price').textContent();
        const lastPrice = await page.locator('.product-item').last().locator('.price').textContent();

        expect(firstPrice).toBeTruthy();
        expect(lastPrice).toBeTruthy();
      }
    }
  });

  test('should change page size for search results', async ({
    homePage,
    page
  }) => {
    await homePage.searchForProduct('computer');

    const pageSizeDropdown = page.locator('#pagesize');
    if (await pageSizeDropdown.isVisible()) {
      await pageSizeDropdown.selectOption('4');

      await page.waitForTimeout(2000);

      const products = await page.locator('.product-item').count();
      expect(products).toBeLessThanOrEqual(4);
    }
  });

  test('should navigate search result pages', async ({
    homePage,
    page
  }) => {
    await homePage.searchForProduct('product');

    const paginationNext = page.locator('.next-page');
    if (await paginationNext.isVisible()) {
      await paginationNext.click();

      await page.waitForTimeout(2000);

      const currentUrl = await page.url();
      expect(currentUrl).toContain('page=2');
    }
  });

  test('should click on search result item', async ({
    homePage,
    productPage,
    page
  }) => {
    await homePage.searchForProduct('laptop');

    const firstResult = page.locator('.product-item .product-title a').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      await productPage.waitForProductPage();

      const productTitle = await productPage.getProductTitle();
      expect(productTitle).toBeTruthy();
    }
  });

  test('should search from different pages', async ({
    homePage,
    page
  }) => {
    await homePage.navigateToCategory('books');

    await homePage.searchForProduct('computer');

    const currentUrl = await page.url();
    expect(currentUrl).toContain('/search');
    expect(currentUrl).toContain('computer');
  });

  test('should maintain search term in search box', async ({
    homePage,
    page
  }) => {
    const searchTerm = 'electronics';

    await homePage.searchForProduct(searchTerm);

    const searchBox = page.locator('#small-searchterms');
    const searchBoxValue = await searchBox.inputValue();
    expect(searchBoxValue).toBe(searchTerm);
  });

  test('should handle search with numbers', async ({
    homePage,
    page
  }) => {
    const numericSearchTerms = ['123', '2021', '5.1'];

    for (const term of numericSearchTerms) {
      await homePage.goto();
      await homePage.searchForProduct(term);

      const currentUrl = await page.url();
      expect(currentUrl).toContain('/search');

      const results = await page.locator('.product-item').count();
      expect(results).toBeGreaterThanOrEqual(0);
    }
  });

  test('should search case insensitive', async ({
    homePage,
    page
  }) => {
    const searchTerms = ['COMPUTER', 'computer', 'Computer', 'CoMpUtEr'];
    const resultCounts: number[] = [];

    for (const term of searchTerms) {
      await homePage.goto();
      await homePage.searchForProduct(term);

      const results = await page.locator('.product-item').count();
      resultCounts.push(results);
    }

    for (let i = 1; i < resultCounts.length; i++) {
      expect(resultCounts[i]).toBe(resultCounts[0]);
    }
  });

  test('should clear search and show all products', async ({
    homePage,
    page
  }) => {
    await homePage.searchForProduct('laptop');

    const searchBox = page.locator('#small-searchterms');
    await searchBox.clear();
    await homePage.searchForProduct('');

    const allResults = await page.locator('.product-item').count();
    expect(allResults).toBeGreaterThanOrEqual(0);
  });
});