import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ShoppingCartPage extends BasePage {
  private readonly pageTitle: Locator;
  private readonly cartItems: Locator;
  private readonly emptyCartMessage: Locator;
  private readonly continueShoppingButton: Locator;
  private readonly updateCartButton: Locator;
  private readonly checkoutButton: Locator;
  private readonly estimateShippingButton: Locator;
  private readonly discountBox: Locator;
  private readonly applyCouponButton: Locator;
  private readonly giftCardBox: Locator;
  private readonly applyGiftCardButton: Locator;
  private readonly orderTotal: Locator;
  private readonly subTotal: Locator;
  private readonly shippingCost: Locator;
  private readonly tax: Locator;
  private readonly termsOfServiceCheckbox: Locator;

  constructor(page: Page) {
    super(page, '/cart');

    this.pageTitle = page.locator('.page-title h1').or(page.locator('h1'));
    this.cartItems = page.locator('.cart-item-row').or(page.locator('[class*="cart-item"]'));
    this.emptyCartMessage = page.locator('.order-summary-content:has-text("Your Shopping Cart is empty!")').or(page.locator('.no-data')).first();
    this.continueShoppingButton = page.locator('.continue-shopping-button').or(page.locator('button:has-text("Continue shopping")'));
    this.updateCartButton = page.locator('input[name="updatecart"]').or(page.locator('button:has-text("Update")'));
    this.checkoutButton = page.locator('#checkout').or(page.locator('button:has-text("Checkout")'));
    this.estimateShippingButton = page.locator('.estimate-shipping-button');
    this.discountBox = page.locator('#discountcouponcode');
    this.applyCouponButton = page.locator('input[name="applydiscountcouponcode"]');
    this.giftCardBox = page.locator('#giftcardcouponcode');
    this.applyGiftCardButton = page.locator('input[name="applygiftcardcouponcode"]');
    this.orderTotal = page.locator('table.cart-total tr:last-child .cart-total-right').first();
    this.subTotal = page.locator('.order-subtotal .value-summary').or(page.locator('[class*="subtotal"]')).first();
    this.shippingCost = page.locator('.shipping-cost .value-summary').or(page.locator('[class*="shipping"]'));
    this.tax = page.locator('.tax-value .value-summary').or(page.locator('[class*="tax"]'));
    this.termsOfServiceCheckbox = page.locator('#termsofservice').or(page.locator('input[name*="terms"]'));
  }

  async getCartItems(): Promise<CartItem[]> {
    const items: CartItem[] = [];
    const itemElements = await this.cartItems.all();

    for (const item of itemElements) {
      const name = await item.locator('.product-name').textContent() || '';
      const price = await item.locator('.product-unit-price').textContent() || '';
      const quantity = await item.locator('.qty-input').inputValue() || '0';
      const total = await item.locator('.product-subtotal').textContent() || '';

      items.push({
        name: name.trim(),
        price: price.trim(),
        quantity: parseInt(quantity),
        total: total.trim()
      });
    }

    return items;
  }

  async updateQuantity(productName: string, quantity: number): Promise<void> {
    const cartItems = await this.cartItems.all();

    for (const item of cartItems) {
      const name = await item.locator('.product-name').textContent();
      if (name && name.includes(productName)) {
        const quantityInput = item.locator('.qty-input');
        await this.fillInput(quantityInput, quantity.toString());
        break;
      }
    }

    await this.clickElement(this.updateCartButton);
  }

  async removeItem(productName: string): Promise<void> {
    const cartItems = await this.cartItems.all();

    for (const item of cartItems) {
      const name = await item.locator('.product-name').textContent();
      if (name && name.includes(productName)) {
        const removeCheckbox = item.locator('input[name="removefromcart"]');
        await this.clickElement(removeCheckbox);
        break;
      }
    }

    await this.clickElement(this.updateCartButton);
  }

  async proceedToCheckout(): Promise<void> {
    if (await this.isElementVisible(this.termsOfServiceCheckbox)) {
      await this.clickElement(this.termsOfServiceCheckbox);
    }
    await this.clickElement(this.checkoutButton);
  }

  async continueShopping(): Promise<void> {
    await this.clickElement(this.continueShoppingButton);
  }

  async applyDiscountCoupon(couponCode: string): Promise<void> {
    await this.fillInput(this.discountBox, couponCode);
    await this.clickElement(this.applyCouponButton);
  }

  async applyGiftCard(giftCardCode: string): Promise<void> {
    await this.fillInput(this.giftCardBox, giftCardCode);
    await this.clickElement(this.applyGiftCardButton);
  }

  async getOrderTotal(): Promise<string> {
    return await this.getElementText(this.orderTotal);
  }

  async getSubTotal(): Promise<string> {
    return await this.getElementText(this.subTotal);
  }

  async getShippingCost(): Promise<string> {
    if (await this.isElementVisible(this.shippingCost)) {
      return await this.getElementText(this.shippingCost);
    }
    return '';
  }

  async getTax(): Promise<string> {
    if (await this.isElementVisible(this.tax)) {
      return await this.getElementText(this.tax);
    }
    return '';
  }

  async isCartEmpty(): Promise<boolean> {
    return await this.isElementVisible(this.emptyCartMessage);
  }

  async getCartItemCount(): Promise<number> {
    const items = await this.cartItems.all();
    return items.length;
  }

  async estimateShipping(): Promise<void> {
    await this.clickElement(this.estimateShippingButton);
  }

  async waitForCartPage(): Promise<void> {
    await this.waitForElement(this.pageTitle);
  }

  async acceptTermsOfService(): Promise<void> {
    if (await this.isElementVisible(this.termsOfServiceCheckbox)) {
      await this.clickElement(this.termsOfServiceCheckbox);
    }
  }

  async isTermsOfServiceChecked(): Promise<boolean> {
    if (await this.strictIsVisible(this.termsOfServiceCheckbox)) {
      return await this.strictIsChecked(this.termsOfServiceCheckbox);
    }
    return true;
  }

  async getPageTitle(): Promise<string> {
    return await this.getElementText(this.pageTitle);
  }

  async selectAllItemsForRemoval(): Promise<void> {
    const removeCheckboxes = await this.page.locator('input[name="removefromcart"]').all();
    for (const checkbox of removeCheckboxes) {
      await this.clickElement(checkbox);
    }
    await this.clickElement(this.updateCartButton);
  }
}

export interface CartItem {
  name: string;
  price: string;
  quantity: number;
  total: string;
}