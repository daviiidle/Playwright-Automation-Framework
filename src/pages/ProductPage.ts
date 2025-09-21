import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  private readonly productTitle: Locator;
  private readonly productPrice: Locator;
  private readonly productImage: Locator;
  private readonly productDescription: Locator;
  private readonly addToCartButton: Locator;
  private readonly addToWishlistButton: Locator;
  private readonly addToCompareButton: Locator;
  private readonly quantityInput: Locator;
  private readonly emailFriendButton: Locator;
  private readonly productReviews: Locator;
  private readonly writeReviewButton: Locator;
  private readonly productAttributes: Locator;
  private readonly relatedProducts: Locator;
  private readonly productTags: Locator;
  private readonly breadcrumb: Locator;
  private readonly successMessage: Locator;
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page, '');

    this.productTitle = page.locator('.product-name h1').or(page.locator('h1'));
    this.productPrice = page.locator('[class*="price-value"]').or(page.locator('.price-actual-price'));
    this.productImage = page.locator('.picture img').or(page.locator('.product-image img'));
    this.productDescription = page.locator('.full-description').or(page.locator('.short-description'));
    this.addToCartButton = page.locator('[id*="add-to-cart-button"]').or(page.locator('button:has-text("Add to cart")'));
    this.addToWishlistButton = page.locator('[id*="add-to-wishlist-button"]').or(page.locator('button:has-text("Add to wishlist")'));
    this.addToCompareButton = page.locator('[id*="add-to-compare"]').or(page.locator('button:has-text("Add to compare")'));
    this.quantityInput = page.locator('[id*="EnteredQuantity"]').or(page.locator('input[name*="quantity"]'));
    this.emailFriendButton = page.locator('.email-a-friend-button');
    this.productReviews = page.locator('.product-review-item');
    this.writeReviewButton = page.locator('.write-product-review');
    this.productAttributes = page.locator('.attributes');
    this.relatedProducts = page.locator('.related-products-grid .item-box');
    this.productTags = page.locator('.tags');
    this.breadcrumb = page.locator('.breadcrumb');
    this.successMessage = page.locator('.bar-notification.success');
    this.errorMessage = page.locator('.bar-notification.error');
  }

  async getProductTitle(): Promise<string> {
    return await this.getElementText(this.productTitle);
  }

  async getProductPrice(): Promise<string> {
    return await this.getElementText(this.productPrice);
  }

  async getProductDescription(): Promise<string> {
    return await this.getElementText(this.productDescription);
  }

  async addToCart(quantity: number = 1): Promise<void> {
    if (quantity !== 1) {
      await this.fillInput(this.quantityInput, quantity.toString());
    }
    await this.clickElement(this.addToCartButton);
  }

  async addToWishlist(): Promise<void> {
    await this.clickElement(this.addToWishlistButton);
  }

  async addToCompareList(): Promise<void> {
    await this.clickElement(this.addToCompareButton);
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.fillInput(this.quantityInput, quantity.toString());
  }

  async getQuantity(): Promise<number> {
    const quantityValue = await this.quantityInput.inputValue();
    return parseInt(quantityValue) || 1;
  }

  async emailToFriend(): Promise<void> {
    await this.clickElement(this.emailFriendButton);
  }

  async writeReview(): Promise<void> {
    await this.clickElement(this.writeReviewButton);
  }

  async getProductReviews(): Promise<string[]> {
    const reviews = [];
    const reviewElements = await this.productReviews.all();

    for (const review of reviewElements) {
      const reviewText = await review.locator('.review-text').textContent();
      if (reviewText) {
        reviews.push(reviewText.trim());
      }
    }

    return reviews;
  }

  async getRelatedProducts(): Promise<string[]> {
    const products = [];
    const productElements = await this.relatedProducts.all();

    for (const product of productElements) {
      const title = await product.locator('.product-title a').textContent();
      if (title) {
        products.push(title.trim());
      }
    }

    return products;
  }

  async getProductTags(): Promise<string[]> {
    const tags = [];
    const tagElements = await this.productTags.locator('a').all();

    for (const tag of tagElements) {
      const tagText = await tag.textContent();
      if (tagText) {
        tags.push(tagText.trim());
      }
    }

    return tags;
  }

  async getBreadcrumb(): Promise<string[]> {
    const breadcrumbItems = [];
    const breadcrumbElements = await this.breadcrumb.locator('a').all();

    for (const item of breadcrumbElements) {
      const itemText = await item.textContent();
      if (itemText) {
        breadcrumbItems.push(itemText.trim());
      }
    }

    return breadcrumbItems;
  }

  async getSuccessMessage(): Promise<string> {
    if (await this.isElementVisible(this.successMessage)) {
      return await this.getElementText(this.successMessage);
    }
    return '';
  }

  async getErrorMessage(): Promise<string> {
    if (await this.isElementVisible(this.errorMessage)) {
      return await this.getElementText(this.errorMessage);
    }
    return '';
  }

  async isAddToCartButtonEnabled(): Promise<boolean> {
    return await this.addToCartButton.isEnabled();
  }

  async isProductImageVisible(): Promise<boolean> {
    return await this.isElementVisible(this.productImage);
  }

  async clickProductImage(): Promise<void> {
    await this.clickElement(this.productImage);
  }

  async selectProductAttribute(attributeName: string, value: string): Promise<void> {
    const attributeLocator = this.page.locator(`[data-productattribute="${attributeName}"]`);
    if (await attributeLocator.isVisible()) {
      const selectElement = attributeLocator.locator('select');
      if (await selectElement.isVisible()) {
        await this.selectOption(selectElement, value);
      } else {
        const radioButton = attributeLocator.locator(`input[value="${value}"]`);
        if (await radioButton.isVisible()) {
          await this.clickElement(radioButton);
        }
      }
    }
  }

  async waitForProductPage(): Promise<void> {
    await this.waitForElement(this.productTitle);
    await this.waitForElement(this.productPrice);
    await this.waitForElement(this.addToCartButton);
  }

  async closeNotificationBar(): Promise<void> {
    const closeButton = this.page.locator('.bar-notification .close');
    if (await closeButton.isVisible()) {
      await this.clickElement(closeButton);
    }
  }
}