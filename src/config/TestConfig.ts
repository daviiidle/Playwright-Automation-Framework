export const TestConfig = {
  baseUrl: process.env.BASE_URL || 'https://demowebshop.tricentis.com',
  apiUrl: process.env.API_URL || 'https://demowebshop.tricentis.com',

  timeouts: {
    default: 30000,
    short: 5000,
    long: 60000,
    element: 10000,
    navigation: 30000
  },

  browser: {
    headless: process.env.HEADLESS === 'true',
    slowMo: parseInt(process.env.SLOW_MO || '0'),
    viewport: {
      width: 1920,
      height: 1080
    }
  },

  test: {
    workers: parseInt(process.env.WORKERS || '4'),
    retries: parseInt(process.env.RETRIES || '2'),
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },

  userData: {
    testEmail: process.env.TEST_EMAIL || 'testuser@example.com',
    testPassword: process.env.TEST_PASSWORD || 'TestPassword123!',
    testFirstName: process.env.TEST_FIRST_NAME || 'John',
    testLastName: process.env.TEST_LAST_NAME || 'Doe'
  },

  faker: {
    enableSeed: process.env.ENABLE_FAKER_SEED === 'true',
    seed: parseInt(process.env.FAKER_SEED || '12345')
  },

  categories: {
    books: '/books',
    computers: '/computers',
    electronics: '/electronics',
    apparelShoes: '/apparel-shoes',
    digitalDownloads: '/digital-downloads',
    jewelry: '/jewelry',
    giftCards: '/gift-cards'
  },

  urls: {
    home: '/',
    login: '/login',
    register: '/register',
    cart: '/cart',
    wishlist: '/wishlist',
    compare: '/compareproducts',
    search: '/search'
  },

  selectors: {
    common: {
      loadingSpinner: '.loading',
      errorMessage: '.message-error',
      successMessage: '.message-success',
      validationError: '.field-validation-error'
    },
    navigation: {
      logo: '.header-logo',
      searchBox: '#small-searchterms',
      searchButton: 'input[value="Search"]',
      cartLink: '#topcartlink',
      wishlistLink: 'a[href="/wishlist"]',
      loginLink: 'a[href="/login"]',
      registerLink: 'a[href="/register"]'
    },
    product: {
      title: '.product-name h1',
      price: '.price-value',
      addToCartButton: '#add-to-cart-button',
      addToWishlistButton: '#add-to-wishlist-button',
      quantityInput: '[id*="EnteredQuantity"]'
    }
  },

  testData: {
    validPasswords: [
      'Password123!',
      'SecureP@ss1',
      'MyP@ssw0rd',
      'Test123456!'
    ],
    invalidPasswords: [
      '123',
      'password',
      '12345678',
      'PASSWORD',
      'Pass123'
    ],
    invalidEmails: [
      'invalid-email',
      'test@',
      '@domain.com',
      'test.domain.com',
      'test@domain'
    ]
  },

  performance: {
    maxLoadTime: 5000,
    maxResponseTime: 2000,
    minLighthouseScore: 70
  },

  accessibility: {
    enableA11yChecks: true,
    wcagLevel: 'AA',
    includedRules: ['color-contrast', 'keyboard-navigation', 'aria-labels']
  }
};