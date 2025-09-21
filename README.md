# Demo WebShop Automation Framework

A comprehensive Playwright automation testing framework for the Tricentis Demo Web Shop using TypeScript, featuring parallel execution, data factories with Faker, and page object model architecture.

## 🚀 Features

- **Page Object Model (POM)** - Modular and maintainable page objects
- **TypeScript** - Full type safety and IntelliSense support
- **Parallel Execution** - Run tests across multiple workers
- **Data Factories** - Generate test data using Faker.js
- **Environment Configuration** - Multiple environment support
- **Cross-browser Testing** - Chrome, Firefox, Safari, and mobile browsers
- **Comprehensive Reporting** - HTML, JSON, and JUnit reports
- **Screenshots & Videos** - Capture on failure for debugging
- **Utilities & Helpers** - Reusable functions for common operations

## 📁 Project Structure

```
├── src/
│   ├── pages/           # Page Object Models
│   ├── data/            # Test data factories
│   ├── utils/           # Utility functions
│   ├── fixtures/        # Test fixtures
│   └── config/          # Configuration files
├── tests/
│   ├── e2e/            # End-to-end tests
│   │   ├── auth/       # Authentication tests
│   │   ├── shopping/   # Shopping functionality tests
│   │   └── search/     # Search functionality tests
│   ├── api/            # API tests (if needed)
│   └── visual/         # Visual regression tests (if needed)
├── .env                # Environment variables
├── playwright.config.ts # Playwright configuration
└── package.json
```

## 🛠️ Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Playwrightv1
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Playwright browsers:
   ```bash
   npm run install:browsers
   ```

4. Copy environment file:
   ```bash
   cp .env.example .env
   ```

5. Update `.env` file with your configuration.

## 🎯 Running Tests

### All Tests
```bash
npm test
```

### Headed Mode (Visual)
```bash
npm run test:headed
```

### Debug Mode
```bash
npm run test:debug
```

### UI Mode
```bash
npm run test:ui
```

### Parallel Execution
```bash
npm run test:parallel
```

### Specific Browser
```bash
npm run test:chrome
npm run test:firefox
npm run test:safari
```

### Specific Test File
```bash
npx playwright test tests/e2e/auth/login.spec.ts
```

### Test Reports
```bash
npm run test:report
```

## 🧪 Test Categories

### Authentication Tests
- User registration with validation
- Login functionality
- Password recovery
- Session management

### Shopping Tests
- Product browsing and filtering
- Shopping cart operations
- Product details viewing
- Wishlist management

### Search Tests
- Product search functionality
- Search filters and sorting
- Search suggestions
- Advanced search features

## 📊 Test Data

The framework uses Faker.js to generate realistic test data:

- **User Data**: Names, emails, passwords
- **Product Data**: Names, prices, descriptions
- **Shopping Data**: Cart items, quantities, coupons

### Example Usage:
```typescript
import { UserDataFactory, ProductDataFactory } from '../src/data';

// Generate a random user
const user = UserDataFactory.createValidUser();

// Generate test products
const products = ProductDataFactory.createMultipleProducts(5);
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
BASE_URL=https://demowebshop.tricentis.com
TEST_EMAIL=testuser@example.com
TEST_PASSWORD=TestPassword123!
WORKERS=4
RETRIES=2
HEADLESS=true
```

### Playwright Config
- Cross-browser support (Chrome, Firefox, Safari, Mobile)
- Parallel execution with 4 workers
- Automatic retries on failure
- Screenshots and videos on failure
- Multiple report formats

## 📝 Page Object Model

### Example Page Object:
```typescript
export class LoginPage extends BasePage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;

  constructor(page: Page) {
    super(page, '/login');
    this.emailInput = page.locator('#Email');
    this.passwordInput = page.locator('#Password');
    this.loginButton = page.locator('input[value="Log in"]');
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.clickElement(this.loginButton);
  }
}
```

## 🔍 Test Fixtures

The framework provides pre-configured fixtures for easy test setup:

```typescript
import { test, expect } from '../../../src/fixtures/BaseFixture';

test('should login successfully', async ({ loginPage, userDataFactory }) => {
  const user = userDataFactory.createValidUser();
  await loginPage.login(user.email, user.password);
  // Test assertions...
});
```

## 🚦 CI/CD Integration

The framework is configured for CI/CD with:
- GitHub Actions support
- Docker compatibility
- Parallel execution
- Artifact collection (screenshots, videos, reports)

## 📈 Reporting

### Available Reports:
- **HTML Report**: Interactive test results
- **JSON Report**: Machine-readable results
- **JUnit Report**: CI/CD integration
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On retry

### View Reports:
```bash
npm run test:report
```

## 🛡️ Best Practices

1. **Page Objects**: Encapsulate page logic and selectors
2. **Data Factories**: Generate dynamic test data
3. **Fixtures**: Set up test prerequisites
4. **Utilities**: Reuse common operations
5. **Environment Config**: Separate test environments
6. **Parallel Execution**: Maximize test efficiency

## 🐛 Debugging

### Debug Single Test:
```bash
npx playwright test tests/e2e/auth/login.spec.ts --debug
```

### Generate Code:
```bash
npm run codegen
```

### Trace Viewer:
```bash
npx playwright show-trace trace.zip
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Faker.js Documentation](https://fakerjs.dev/)
- [Demo WebShop](https://demowebshop.tricentis.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.# Playwright-Automation-Framework
