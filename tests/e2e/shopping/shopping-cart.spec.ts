import { test, expect } from '../../../src/fixtures/BaseFixture';

test.describe('Shopping Cart', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.waitForPageToLoad();
  });

  test('should add product to cart', async ({
    homePage,
    productPage,
    shoppingCartPage,
    productDataFactory
  }) => {
    await homePage.navigateToCategory('books');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    const quantity = productDataFactory.getRandomQuantity(1, 3);
    await productPage.addToCart(quantity);

    await productPage.closeNotificationBar();
    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    const cartItems = await shoppingCartPage.getCartItems();
    expect(cartItems.length).toBeGreaterThan(0);
    expect(cartItems[0].quantity).toBe(quantity);
  });

  test('should update product quantity in cart', async ({
    homePage,
    productPage,
    shoppingCartPage
  }) => {
    await homePage.navigateToCategory('computers');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    await productPage.addToCart(1);
    await productPage.closeNotificationBar();

    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    const cartItems = await shoppingCartPage.getCartItems();
    if (cartItems.length > 0) {
      const productName = cartItems[0].name;
      await shoppingCartPage.updateQuantity(productName, 3);

      const updatedItems = await shoppingCartPage.getCartItems();
      expect(updatedItems[0].quantity).toBe(3);
    }
  });

  test('should remove product from cart', async ({
    homePage,
    productPage,
    shoppingCartPage
  }) => {
    await homePage.navigateToCategory('electronics');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    await productPage.addToCart(1);
    await productPage.closeNotificationBar();

    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    const initialCartItems = await shoppingCartPage.getCartItems();
    if (initialCartItems.length > 0) {
      const productName = initialCartItems[0].name;
      await shoppingCartPage.removeItem(productName);

      const finalCartItems = await shoppingCartPage.getCartItems();
      expect(finalCartItems.length).toBeLessThan(initialCartItems.length);
    }
  });

  test('should calculate cart totals correctly', async ({
    homePage,
    productPage,
    shoppingCartPage,
    testHelpers
  }) => {
    await homePage.navigateToCategory('books');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    await productPage.addToCart(2);
    await productPage.closeNotificationBar();

    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    const cartItems = await shoppingCartPage.getCartItems();
    const subTotal = await shoppingCartPage.getSubTotal();
    const orderTotal = await shoppingCartPage.getOrderTotal();

    expect(subTotal).toBeTruthy();
    expect(orderTotal).toBeTruthy();

    const subTotalValue = testHelpers.extractPriceFromText(subTotal);
    const orderTotalValue = testHelpers.extractPriceFromText(orderTotal);

    expect(orderTotalValue).toBeGreaterThanOrEqual(subTotalValue);
  });

  test('should apply discount coupon', async ({
    homePage,
    productPage,
    shoppingCartPage
  }) => {
    await homePage.navigateToCategory('jewelry');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    await productPage.addToCart(1);
    await productPage.closeNotificationBar();

    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    await shoppingCartPage.applyDiscountCoupon('TESTCOUPON');

    const notification = await homePage.page.locator('.bar-notification').isVisible();
    expect(notification).toBe(true);
  });

  test('should estimate shipping', async ({
    homePage,
    productPage,
    shoppingCartPage
  }) => {
    await homePage.navigateToCategory('apparel-shoes');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    await productPage.addToCart(1);
    await productPage.closeNotificationBar();

    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    const estimateButton = shoppingCartPage.page.locator('.estimate-shipping-button');
    if (await estimateButton.isVisible()) {
      await shoppingCartPage.estimateShipping();

      const shippingForm = await shoppingCartPage.page.locator('.estimate-shipping').isVisible();
      expect(shippingForm).toBe(true);
    }
  });

  test('should continue shopping from cart', async ({
    homePage,
    shoppingCartPage
  }) => {
    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    await shoppingCartPage.continueShopping();

    const currentUrl = await shoppingCartPage.page.url();
    expect(currentUrl).toBe(process.env.BASE_URL + '/');
  });

  test('should handle empty cart', async ({
    shoppingCartPage
  }) => {
    await shoppingCartPage.goto();
    await shoppingCartPage.waitForCartPage();

    const isEmpty = await shoppingCartPage.isCartEmpty();
    if (isEmpty) {
      const pageTitle = await shoppingCartPage.getPageTitle();
      expect(pageTitle).toContain('Shopping cart');
    }
  });

  test('should proceed to checkout', async ({
    homePage,
    productPage,
    shoppingCartPage
  }) => {
    await homePage.navigateToCategory('digital-downloads');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    await productPage.addToCart(1);
    await productPage.closeNotificationBar();

    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    await shoppingCartPage.acceptTermsOfService();
    await shoppingCartPage.proceedToCheckout();

    const currentUrl = await shoppingCartPage.page.url();
    expect(currentUrl).toContain('/checkout') || expect(currentUrl).toContain('/login');
  });

  test('should validate terms of service', async ({
    homePage,
    productPage,
    shoppingCartPage
  }) => {
    await homePage.navigateToCategory('books');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    await productPage.addToCart(1);
    await productPage.closeNotificationBar();

    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    const termsCheckbox = shoppingCartPage.page.locator('#termsofservice');
    if (await termsCheckbox.isVisible()) {
      const checkoutButton = shoppingCartPage.page.locator('#checkout');
      await checkoutButton.click();

      const validationMessage = await shoppingCartPage.page.locator('.message-error').isVisible();
      expect(validationMessage).toBe(true);
    }
  });

  test('should clear entire cart', async ({
    homePage,
    productPage,
    shoppingCartPage
  }) => {
    await homePage.navigateToCategory('computers');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    await productPage.addToCart(1);
    await productPage.closeNotificationBar();

    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    await shoppingCartPage.selectAllItemsForRemoval();

    const isEmpty = await shoppingCartPage.isCartEmpty();
    expect(isEmpty).toBe(true);
  });

  test('should update cart when navigating back from checkout', async ({
    homePage,
    productPage,
    shoppingCartPage
  }) => {
    await homePage.navigateToCategory('jewelry');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    await productPage.addToCart(1);
    await productPage.closeNotificationBar();

    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    const initialCount = await shoppingCartPage.getCartItemCount();

    await shoppingCartPage.acceptTermsOfService();
    await shoppingCartPage.proceedToCheckout();

    await shoppingCartPage.page.goBack();
    await shoppingCartPage.waitForCartPage();

    const finalCount = await shoppingCartPage.getCartItemCount();
    expect(finalCount).toBe(initialCount);
  });

  test('should handle invalid quantities', async ({
    homePage,
    productPage,
    shoppingCartPage,
    productDataFactory
  }) => {
    await homePage.navigateToCategory('electronics');
    await homePage.page.locator('.product-title a').first().click();
    await productPage.waitForProductPage();

    await productPage.addToCart(1);
    await productPage.closeNotificationBar();

    await homePage.navigateToShoppingCart();
    await shoppingCartPage.waitForCartPage();

    const cartItems = await shoppingCartPage.getCartItems();
    if (cartItems.length > 0) {
      const productName = cartItems[0].name;
      const invalidQuantities = productDataFactory.getInvalidQuantities();

      for (const quantity of invalidQuantities) {
        if (quantity > 0) {
          await shoppingCartPage.updateQuantity(productName, quantity);

          const errorMessage = await shoppingCartPage.page.locator('.message-error').isVisible();
          if (errorMessage) {
            expect(errorMessage).toBe(true);
          }
        }
      }
    }
  });
});