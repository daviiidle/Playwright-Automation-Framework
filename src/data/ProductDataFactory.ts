import { faker } from '@faker-js/faker';

export interface Product {
  name: string;
  price: number;
  description: string;
  category: string;
  sku: string;
  inStock: boolean;
  quantity: number;
  rating: number;
  brand: string;
  tags: string[];
}

export interface SearchQuery {
  term: string;
  category: string;
  priceRange: {
    min: number;
    max: number;
  };
  sortBy: string;
}

export interface CartItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export class ProductDataFactory {
  private static setSeed(): void {
    if (process.env.ENABLE_FAKER_SEED === 'true' && process.env.FAKER_SEED) {
      faker.seed(parseInt(process.env.FAKER_SEED));
    }
  }

  static createProduct(): Product {
    this.setSeed();

    const categories = [
      'Books',
      'Computers',
      'Electronics',
      'Apparel & Shoes',
      'Digital downloads',
      'Jewelry',
      'Gift Cards'
    ];

    const brands = [
      'Apple', 'Samsung', 'Nike', 'Adidas', 'Sony', 'Microsoft',
      'Canon', 'HP', 'Dell', 'Asus', 'Lenovo', 'Intel'
    ];

    const name = faker.commerce.productName();
    const price = parseFloat(faker.commerce.price({ min: 10, max: 2000 }));

    return {
      name,
      price,
      description: faker.commerce.productDescription(),
      category: faker.helpers.arrayElement(categories),
      sku: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
      inStock: faker.datatype.boolean({ probability: 0.8 }),
      quantity: faker.number.int({ min: 0, max: 100 }),
      rating: faker.number.float({ min: 1, max: 5, multipleOf: 0.1 }),
      brand: faker.helpers.arrayElement(brands),
      tags: faker.helpers.arrayElements([
        'new', 'popular', 'sale', 'bestseller', 'featured',
        'limited', 'premium', 'eco-friendly', 'durable'
      ], { min: 1, max: 4 })
    };
  }

  static createMultipleProducts(count: number): Product[] {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      products.push(this.createProduct());
    }
    return products;
  }

  static createComputerProduct(): Product {
    this.setSeed();

    const computerTypes = [
      'Laptop', 'Desktop PC', 'Gaming PC', 'Workstation',
      'Notebook', 'Ultrabook', 'Tablet', 'All-in-One PC'
    ];

    const computerBrands = ['Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Apple', 'Microsoft'];

    return {
      name: `${faker.helpers.arrayElement(computerBrands)} ${faker.helpers.arrayElement(computerTypes)}`,
      price: parseFloat(faker.commerce.price({ min: 300, max: 3000 })),
      description: `High-performance ${faker.helpers.arrayElement(computerTypes).toLowerCase()} with latest technology`,
      category: 'Computers',
      sku: `COMP-${faker.string.alphanumeric({ length: 6, casing: 'upper' })}`,
      inStock: faker.datatype.boolean({ probability: 0.9 }),
      quantity: faker.number.int({ min: 1, max: 50 }),
      rating: faker.number.float({ min: 3.5, max: 5, multipleOf: 0.1 }),
      brand: faker.helpers.arrayElement(computerBrands),
      tags: ['computers', 'technology', 'electronic']
    };
  }

  static createBookProduct(): Product {
    this.setSeed();

    const bookGenres = [
      'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction',
      'Biography', 'History', 'Self-Help', 'Business', 'Technical'
    ];

    return {
      name: faker.lorem.words({ min: 2, max: 5 }).split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      price: parseFloat(faker.commerce.price({ min: 5, max: 50 })),
      description: `Fascinating ${faker.helpers.arrayElement(bookGenres).toLowerCase()} book that will captivate readers`,
      category: 'Books',
      sku: `BOOK-${faker.string.alphanumeric({ length: 6, casing: 'upper' })}`,
      inStock: faker.datatype.boolean({ probability: 0.95 }),
      quantity: faker.number.int({ min: 0, max: 200 }),
      rating: faker.number.float({ min: 3, max: 5, multipleOf: 0.1 }),
      brand: faker.company.name(),
      tags: ['books', 'reading', faker.helpers.arrayElement(bookGenres).toLowerCase()]
    };
  }

  static createSearchQueries(): SearchQuery[] {
    this.setSeed();

    const searchTerms = [
      'laptop', 'book', 'phone', 'shoes', 'jewelry', 'gift card',
      'camera', 'headphones', 'watch', 'tablet', 'gaming'
    ];

    const categories = [
      'All categories', 'Books', 'Computers', 'Electronics',
      'Apparel & Shoes', 'Digital downloads', 'Jewelry', 'Gift Cards'
    ];

    const sortOptions = [
      'Position', 'Name: A to Z', 'Name: Z to A',
      'Price: Low to High', 'Price: High to Low', 'Created on'
    ];

    return searchTerms.map(term => ({
      term,
      category: faker.helpers.arrayElement(categories),
      priceRange: {
        min: faker.number.int({ min: 0, max: 100 }),
        max: faker.number.int({ min: 100, max: 1000 })
      },
      sortBy: faker.helpers.arrayElement(sortOptions)
    }));
  }

  static createCartItems(count: number = 3): CartItem[] {
    this.setSeed();

    const cartItems: CartItem[] = [];

    for (let i = 0; i < count; i++) {
      const quantity = faker.number.int({ min: 1, max: 5 });
      const unitPrice = parseFloat(faker.commerce.price({ min: 10, max: 500 }));

      cartItems.push({
        productName: faker.commerce.productName(),
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice
      });
    }

    return cartItems;
  }

  static createCouponCodes(): string[] {
    return [
      'SAVE10',
      'DISCOUNT20',
      'WELCOME15',
      'FREESHIP',
      'NEWUSER25',
      'HOLIDAY30',
      'SPRING20',
      'SUMMER15'
    ];
  }

  static createGiftCardCodes(): string[] {
    this.setSeed();

    return Array.from({ length: 5 }, () =>
      faker.string.alphanumeric({ length: 12, casing: 'upper' })
    );
  }

  static createProductReview(): {
    title: string;
    rating: number;
    comment: string;
    reviewer: string;
    date: string;
  } {
    this.setSeed();

    return {
      title: faker.lorem.sentence({ min: 3, max: 8 }),
      rating: faker.number.int({ min: 1, max: 5 }),
      comment: faker.lorem.paragraphs({ min: 1, max: 3 }),
      reviewer: faker.person.fullName(),
      date: faker.date.recent({ days: 30 }).toLocaleDateString()
    };
  }

  static createWishlistItems(count: number = 5): Product[] {
    const wishlistItems: Product[] = [];

    for (let i = 0; i < count; i++) {
      wishlistItems.push(this.createProduct());
    }

    return wishlistItems;
  }

  static getRandomQuantity(min: number = 1, max: number = 10): number {
    return faker.number.int({ min, max });
  }

  static getInvalidQuantities(): number[] {
    return [-1, 0, 1001, 999999];
  }

  static createComparisonList(): Product[] {
    return [
      this.createComputerProduct(),
      this.createComputerProduct(),
      this.createComputerProduct()
    ];
  }
}