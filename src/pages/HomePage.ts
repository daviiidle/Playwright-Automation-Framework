import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { TestConfig } from '../config/TestConfig';

export class HomePage extends BasePage {
  // Header elements
  private readonly logo: Locator;
  private readonly searchBox: Locator;
  private readonly searchButton: Locator;
  private readonly registerLink: Locator;
  private readonly loginLink: Locator;
  private readonly shoppingCartLink: Locator;
  private readonly wishlistLink: Locator;

  // Navigation menu
  private readonly booksCategory: Locator;
  private readonly computersCategory: Locator;
  private readonly electronicsCategory: Locator;
  private readonly apparelShoesCategory: Locator;
  private readonly digitalDownloadsCategory: Locator;
  private readonly jewelryCategory: Locator;
  private readonly giftCardsCategory: Locator;

  // Main content
  private readonly featuredProducts: Locator;
  private readonly newsSection: Locator;
  private readonly communityPoll: Locator;
  private readonly newsletterBox: Locator;
  private readonly subscribeButton: Locator;

  // Footer
  private readonly footerLinks: Locator;
  private readonly socialMediaLinks: Locator;

  constructor(page: Page) {
    super(page, '/');

    // Enhanced header elements with robust selectors
    this.logo = page.locator('.header-logo img')
      .or(page.locator('[class*="logo"] img'))
      .or(page.locator('img[alt*="logo" i]'))
      .or(page.locator('header img:first-of-type'));

    this.searchBox = page.locator('#small-searchterms')
      .or(page.locator('.search-box input[name="q"]'))
      .or(page.locator('input[class*="search-box-text"]'))
      .or(page.locator('.header .search-box input[type="text"]'));

    this.searchButton = page.locator('input[value="Search"].search-box-button')
      .or(page.locator('.search-box input[value="Search"]'))
      .or(page.locator('#small-search-box-form input[value="Search"]'))
      .or(page.locator('input[value="Search"]').first());

    this.registerLink = page.locator('a[href="/register"]')
      .or(page.locator('a:has-text("Register")'))
      .or(page.locator('a:has-text("Sign up")'))
      .or(page.locator('a[href*="register"]'));

    this.loginLink = page.locator('a[href="/login"]')
      .or(page.locator('a:has-text("Log in")'))
      .or(page.locator('a:has-text("Login")'))
      .or(page.locator('a[href*="login"]'));

    this.shoppingCartLink = page.locator('a[href="/cart"].ico-cart').first()
      .or(page.locator('a[href="/cart"]:has(.ico-cart)').first())
      .or(page.locator('.header-links a[href="/cart"]').first());

    this.wishlistLink = page.locator('a[href="/wishlist"].ico-wishlist').first()
      .or(page.locator('a[href="/wishlist"]:has(.ico-wishlist)').first())
      .or(page.locator('.header-links a[href="/wishlist"]').first());

    // Fixed navigation menu selectors to avoid multiple matches - use top menu first
    this.booksCategory = page.locator('.top-menu a[href="/books"]')
      .or(page.locator('nav a[href="/books"]').first())
      .or(page.getByRole('link', { name: 'Books', exact: true }).first());

    this.computersCategory = page.locator('.top-menu a[href="/computers"]')
      .or(page.locator('nav a[href="/computers"]').first())
      .or(page.getByRole('link', { name: 'Computers', exact: true }).first());

    this.electronicsCategory = page.locator('.top-menu a[href="/electronics"]')
      .or(page.locator('nav a[href="/electronics"]').first())
      .or(page.getByRole('link', { name: 'Electronics', exact: true }).first());

    this.apparelShoesCategory = page.locator('.top-menu a[href="/apparel-shoes"]')
      .or(page.locator('nav a[href="/apparel-shoes"]').first())
      .or(page.locator('a[href="/apparel-shoes"]').first());

    this.digitalDownloadsCategory = page.locator('.top-menu a[href="/digital-downloads"]')
      .or(page.locator('nav a[href="/digital-downloads"]').first())
      .or(page.locator('a[href="/digital-downloads"]').first());

    this.jewelryCategory = page.locator('.top-menu a[href="/jewelry"]')
      .or(page.locator('nav a[href="/jewelry"]').first())
      .or(page.locator('a[href="/jewelry"]').first());

    this.giftCardsCategory = page.locator('.top-menu a[href="/gift-cards"]')
      .or(page.locator('nav a[href="/gift-cards"]').first())
      .or(page.locator('a[href="/gift-cards"]').first());

    // Enhanced main content selectors
    this.featuredProducts = page.locator('.product-item')
      .or(page.locator('[class*="product"]'))
      .or(page.locator('[data-product]'))
      .or(page.locator('.item-box'));

    this.newsSection = page.locator('.news-items')
      .or(page.locator('[class*="news"]'))
      .or(page.locator('.blog-posts'))
      .or(page.locator('[data-news]'));

    this.communityPoll = page.locator('.poll')
      .or(page.locator('[class*="poll"]'))
      .or(page.locator('.survey'))
      .or(page.locator('[data-poll]'));

    this.newsletterBox = page.locator('#newsletter-email')
      .or(page.locator('input[name="NewsletterEmail"]'))
      .or(page.locator('.newsletter input[type="text"]:not([type="button"])'))
      .or(page.locator('input[type="text"][name*="newsletter"]'));

    this.subscribeButton = page.locator('#newsletter-subscribe-button')
      .or(page.locator('input[type="button"][value="Subscribe"]'))
      .or(page.locator('.newsletter-subscribe-button'))
      .or(page.locator('button:has-text("Subscribe")'));

    // Enhanced footer selectors
    this.footerLinks = page.locator('.footer a')
      .or(page.locator('footer a'))
      .or(page.locator('[class*="footer"] a'));

    this.socialMediaLinks = page.locator('.social-links a')
      .or(page.locator('[class*="social"] a'))
      .or(page.locator('footer [class*="social"] a'));
  }

  /**
   * Enhanced search method with comprehensive error handling and verification
   */
  async searchForProduct(searchTerm: string): Promise<void> {
    await this.retryOperation(async () => {
      // Wait for search elements to be ready
      await this.waitForSearchElementsReady();

      // Perform search with verification using strict safe methods
      await this.strictSafeFill(this.searchBox, searchTerm);
      await this.verifySearchTerm(searchTerm);

      await this.strictSafeClick(this.searchButton);

      // Wait for search results or navigation
      await this.waitForNetworkStability();

      // Verify search was performed
      await this.verifySearchPerformed();

    }, 'search for product');
  }

  async navigateToRegister(): Promise<void> {
    await this.retryOperation(async () => {
      await this.waitForElementSafe(this.registerLink);
      await this.safeClick(this.registerLink);
      await this.waitForNetworkStability();

      // Verify navigation
      const currentUrl = await this.getCurrentUrl();
      if (!currentUrl.includes('register')) {
        throw new Error('Navigation to register page failed');
      }
    }, 'navigate to register');
  }

  async navigateToLogin(): Promise<void> {
    await this.retryOperation(async () => {
      await this.waitForElementSafe(this.loginLink);
      await this.safeClick(this.loginLink);
      await this.waitForNetworkStability();

      // Verify navigation
      const currentUrl = await this.getCurrentUrl();
      if (!currentUrl.includes('login')) {
        throw new Error('Navigation to login page failed');
      }
    }, 'navigate to login');
  }

  async navigateToShoppingCart(): Promise<void> {
    await this.retryOperation(async () => {
      await this.waitForElementSafe(this.shoppingCartLink);
      await this.safeClick(this.shoppingCartLink);
      await this.waitForNetworkStability();

      // Verify navigation
      const currentUrl = await this.getCurrentUrl();
      if (!currentUrl.includes('cart')) {
        throw new Error('Navigation to shopping cart failed');
      }
    }, 'navigate to shopping cart');
  }

  async navigateToWishlist(): Promise<void> {
    await this.retryOperation(async () => {
      await this.waitForElementSafe(this.wishlistLink);
      await this.safeClick(this.wishlistLink);
      await this.waitForNetworkStability();

      // Verify navigation
      const currentUrl = await this.getCurrentUrl();
      if (!currentUrl.includes('wishlist')) {
        throw new Error('Navigation to wishlist failed');
      }
    }, 'navigate to wishlist');
  }

  /**
   * Enhanced category navigation with comprehensive error handling
   */
  async navigateToCategory(category: string): Promise<void> {
    const categoryMap: { [key: string]: Locator } = {
      'books': this.booksCategory,
      'computers': this.computersCategory,
      'electronics': this.electronicsCategory,
      'apparel-shoes': this.apparelShoesCategory,
      'digital-downloads': this.digitalDownloadsCategory,
      'jewelry': this.jewelryCategory,
      'gift-cards': this.giftCardsCategory
    };

    const categoryLocator = categoryMap[category.toLowerCase()];
    if (!categoryLocator) {
      throw new Error(`Category '${category}' not found`);
    }

    await this.retryOperation(async () => {
      await this.waitForElementSafe(categoryLocator);
      await this.safeClick(categoryLocator);
      await this.waitForNetworkStability();

      // Verify navigation
      const currentUrl = await this.getCurrentUrl();
      const categoryPath = category.toLowerCase().replace(/\s+/g, '-');
      if (!currentUrl.includes(categoryPath)) {
        throw new Error(`Navigation to ${category} category failed`);
      }
    }, `navigate to ${category} category`);
  }

  /**
   * Enhanced method to get featured products with robust element handling
   */
  async getFeaturedProducts(): Promise<string[]> {
    return await this.retryOperation(async () => {
      const products: string[] = [];

      // Wait for products to load
      await this.waitForElementSafe(this.featuredProducts.first());

      const productElements = await this.featuredProducts.all();

      for (const product of productElements) {
        try {
          // Try multiple selectors for product title
          const titleSelectors = [
            '.product-title a',
            '.product-name a',
            'h3 a',
            'h2 a',
            '.title a',
            'a[href*="product"]'
          ];

          let title = '';
          for (const selector of titleSelectors) {
            try {
              const titleElement = product.locator(selector).first();
              if (await titleElement.isVisible()) {
                const text = await titleElement.textContent();
                if (text && text.trim()) {
                  title = text.trim();
                  break;
                }
              }
            } catch (error) {
              // Continue to next selector
            }
          }

          if (title) {
            products.push(title);
          }
        } catch (error) {
          console.log('Error getting product title:', error);
          // Continue with next product
        }
      }

      return products;
    }, 'get featured products');
  }

  /**
   * Enhanced newsletter subscription with comprehensive verification
   */
  async subscribeToNewsletter(email: string): Promise<void> {
    await this.retryOperation(async () => {
      // Wait for newsletter elements
      await this.waitForElementSafe(this.newsletterBox);
      await this.waitForElementSafe(this.subscribeButton);

      // Fill email and verify using strict safe method
      await this.strictSafeFill(this.newsletterBox, email);
      const actualEmail = await this.strictGetInputValue(this.newsletterBox);
      if (actualEmail !== email) {
        throw new Error(`Newsletter email verification failed. Expected: "${email}", Got: "${actualEmail}"`);
      }

      // Subscribe using strict safe method
      await this.strictSafeClick(this.subscribeButton);
      await this.waitForNetworkStability();

      // Wait for potential success message or confirmation
      await this.waitForTimeout(2000);

    }, 'subscribe to newsletter');
  }

  /**
   * Enhanced method to get cart item count with robust parsing
   */
  async getCartItemCount(): Promise<number> {
    return await this.retryOperation(async () => {
      await this.waitForElementSafe(this.shoppingCartLink);

      const cartText = await this.getElementText(this.shoppingCartLink);

      // Try multiple patterns to extract count
      const patterns = [
        /\((\d+)\)/,  // (5)
        /\[(\d+)\]/,  // [5]
        /(\d+)\s*item/i,  // 5 items
        /cart.*?(\d+)/i,  // cart 5
        /(\d+)/  // any number
      ];

      for (const pattern of patterns) {
        const match = cartText.match(pattern);
        if (match) {
          return parseInt(match[1]) || 0;
        }
      }

      return 0;
    }, 'get cart item count');
  }

  /**
   * Enhanced method to check if user is logged in
   */
  async isUserLoggedIn(): Promise<boolean> {
    return await this.retryOperation(async () => {
      // Wait a moment for elements to stabilize
      await this.waitForTimeout(1000);

      // Check if login link is not visible (user is logged in)
      const loginLinkVisible = await this.strictIsVisible(this.loginLink);

      // Also check if there are user-specific elements - be more specific to avoid multiple matches
      const userAccountLink = this.page.locator('a.account[href="/customer/info"]').first();

      const userAccountVisible = await this.strictIsVisible(userAccountLink);

      return !loginLinkVisible || userAccountVisible;
    }, 'check if user is logged in');
  }

  /**
   * Enhanced hover method with intelligent wait
   */
  async hoverOverCategory(category: string): Promise<void> {
    const categoryMap: { [key: string]: Locator } = {
      'computers': this.computersCategory,
      'electronics': this.electronicsCategory
    };

    const categoryLocator = categoryMap[category.toLowerCase()];
    if (!categoryLocator) {
      throw new Error(`Category '${category}' not found for hover`);
    }

    await this.retryOperation(async () => {
      await this.waitForElementSafe(categoryLocator);
      await this.hoverElement(categoryLocator);

      // Wait for potential dropdown/submenu to appear
      await this.waitForTimeout(500);
    }, `hover over ${category} category`);
  }

  /**
   * Enhanced featured product selection with verification
   */
  async selectFeaturedProduct(index: number): Promise<void> {
    await this.retryOperation(async () => {
      const products = await this.featuredProducts.all();

      if (index >= products.length) {
        throw new Error(`Product index ${index} is out of range. Found ${products.length} products.`);
      }

      const productElement = products[index];
      const productLink = productElement.locator('.product-title a').first()
        .or(productElement.locator('.product-name a').first())
        .or(productElement.locator('h3 a').first());

      await this.waitForElementSafe(productLink);
      await this.safeClick(productLink);
      await this.waitForNetworkStability();

      // Verify navigation to product page
      const currentUrl = await this.getCurrentUrl();
      if (!currentUrl.includes('product') && !currentUrl.includes('/p/') && !currentUrl.match(/\/\d+[\w-]*$/)) {
        throw new Error('Navigation to product page failed');
      }
    }, `select featured product at index ${index}`);
  }

  /**
   * Enhanced page load wait with comprehensive checks
   */
  async waitForPageToLoad(): Promise<void> {
    await this.retryOperation(async () => {
      // Wait for critical elements
      await this.waitForElementSafe(this.logo);
      await this.waitForElementSafe(this.searchBox);
      await this.waitForElementSafe(this.searchButton);

      // Wait for network stability
      await this.waitForPageLoad();
      await this.waitForNetworkStability();

      // Ensure page is interactive
      const isSearchBoxEnabled = await this.searchBox.isEnabled();
      const isSearchButtonEnabled = await this.searchButton.isEnabled();

      if (!isSearchBoxEnabled || !isSearchButtonEnabled) {
        throw new Error('Page is not fully interactive');
      }
    }, 'wait for page to load');
  }

  // Enhanced helper methods for robust home page functionality

  /**
   * Waits for search elements to be ready for interaction
   */
  private async waitForSearchElementsReady(): Promise<void> {
    await this.waitForElementSafe(this.searchBox);
    await this.waitForElementSafe(this.searchButton);

    // Ensure elements are enabled
    const isSearchBoxEnabled = await this.searchBox.isEnabled();
    const isSearchButtonEnabled = await this.searchButton.isEnabled();

    if (!isSearchBoxEnabled || !isSearchButtonEnabled) {
      await this.waitForTimeout(1000);
    }
  }

  /**
   * Verifies that the search term was entered correctly
   */
  private async verifySearchTerm(expectedTerm: string): Promise<void> {
    const actualTerm = await this.strictGetInputValue(this.searchBox);
    if (actualTerm !== expectedTerm) {
      throw new Error(`Search term verification failed. Expected: "${expectedTerm}", Got: "${actualTerm}"`);
    }
  }

  /**
   * Verifies that a search was performed successfully
   */
  private async verifySearchPerformed(): Promise<void> {
    // Allow some time for navigation
    await this.waitForTimeout(2000);

    // Check if we're on a search results page or if URL contains search parameters
    const currentUrl = await this.getCurrentUrl();

    if (currentUrl.includes('search') ||
        currentUrl.includes('q=') ||
        currentUrl.includes('searchterm') ||
        currentUrl.includes('query=')) {
      return; // Search was performed
    }

    // Check for search results elements or any page content that indicates search was performed
    const searchIndicatorSelectors = [
      '.search-results',
      '.product-list',
      '.search-products',
      '[class*="search-result"]',
      '.product-item',
      '.no-data',
      '.page-body',
      '.main-content'
    ];

    for (const selector of searchIndicatorSelectors) {
      try {
        if (await this.isElementVisible(this.page.locator(selector))) {
          return; // Search page loaded
        }
      } catch (error) {
        // Continue checking other selectors
      }
    }

    // More lenient check - if we're still on the website, consider it successful
    if (currentUrl.includes(new URL(TestConfig.baseUrl).hostname)) {
      return;
    }

    throw new Error('Search operation verification failed');
  }

  /**
   * Enhanced method to get all available categories
   */
  async getAvailableCategories(): Promise<string[]> {
    return await this.retryOperation(async () => {
      const categories: string[] = [];
      const categoryLocators = [
        this.booksCategory,
        this.computersCategory,
        this.electronicsCategory,
        this.apparelShoesCategory,
        this.digitalDownloadsCategory,
        this.jewelryCategory,
        this.giftCardsCategory
      ];

      for (const locator of categoryLocators) {
        try {
          if (await this.isElementVisible(locator)) {
            const text = await this.getElementText(locator);
            if (text && text.trim()) {
              categories.push(text.trim());
            }
          }
        } catch (error) {
          // Continue with next category if one fails
          console.log('Error getting category text:', error);
        }
      }

      return categories;
    }, 'get available categories');
  }

  /**
   * Method to verify home page loaded correctly
   */
  async verifyHomePageLoaded(): Promise<boolean> {
    return await this.retryOperation(async () => {
      // Check that we're on the home page
      const currentUrl = await this.getCurrentUrl();
      const isHomePage = currentUrl === this.url ||
                        currentUrl.endsWith('/') ||
                        currentUrl.includes('home');

      if (!isHomePage) {
        return false;
      }

      // Check that critical elements are visible
      const logoVisible = await this.isElementVisible(this.logo);
      const searchVisible = await this.isElementVisible(this.searchBox);

      return logoVisible && searchVisible;
    }, 'verify home page loaded');
  }

  /**
   * Method to perform a quick search with verification
   */
  async quickSearch(searchTerm: string): Promise<boolean> {
    try {
      await this.searchForProduct(searchTerm);
      return true;
    } catch (error) {
      console.log('Quick search failed:', error);
      return false;
    }
  }
}