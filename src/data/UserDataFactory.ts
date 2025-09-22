import { faker } from '@faker-js/faker';

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: 'male' | 'female';
  fullName: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface InvalidUserData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export class UserDataFactory {
  private static setSeed(): void {
    if (process.env.ENABLE_FAKER_SEED === 'true' && process.env.FAKER_SEED) {
      faker.seed(parseInt(process.env.FAKER_SEED));
    }
  }

  static createValidUser(): User {
    this.setSeed();

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const password = this.generateValidPassword();

    // Generate a highly unique email with timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const baseEmail = faker.internet.email({ firstName, lastName }).toLowerCase();
    const uniqueEmail = baseEmail.replace('@', `_${timestamp}_${randomString}@`);

    return {
      firstName,
      lastName,
      email: uniqueEmail,
      password,
      confirmPassword: password,
      gender: faker.helpers.arrayElement(['male', 'female']),
      fullName: `${firstName} ${lastName}`
    };
  }

  static createMultipleUsers(count: number): User[] {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push(this.createValidUser());
    }
    return users;
  }

  static createLoginCredentials(): LoginCredentials {
    this.setSeed();

    // Generate unique email for login credentials
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const baseEmail = faker.internet.email().toLowerCase();
    const uniqueEmail = baseEmail.replace('@', `_${timestamp}_${randomString}@`);

    return {
      email: uniqueEmail,
      password: this.generateValidPassword()
    };
  }

  static createPredefinedUser(): User {
    // Create a new user each time to avoid conflicts
    const user = this.createValidUser();
    return {
      ...user,
      // Use a timestamp-based email to ensure uniqueness
      email: `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`
    };
  }

  static createInvalidUserData(): {
    emptyFields: InvalidUserData;
    invalidEmail: InvalidUserData;
    weakPassword: InvalidUserData;
    passwordMismatch: InvalidUserData;
    shortPassword: InvalidUserData;
    longEmail: InvalidUserData;
  } {
    this.setSeed();

    const validPassword = this.generateValidPassword();
    const weakPassword = '123';
    const shortPassword = 'Ab1!';

    return {
      emptyFields: {
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: ''
      },
      invalidEmail: {
        email: 'invalid-email',
        password: validPassword,
        confirmPassword: validPassword,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      },
      weakPassword: {
        email: faker.internet.email().toLowerCase(),
        password: weakPassword,
        confirmPassword: weakPassword,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      },
      passwordMismatch: {
        email: faker.internet.email().toLowerCase(),
        password: validPassword,
        confirmPassword: this.generateValidPassword(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      },
      shortPassword: {
        email: faker.internet.email().toLowerCase(),
        password: shortPassword,
        confirmPassword: shortPassword,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      },
      longEmail: {
        email: `${'a'.repeat(250)}@${'b'.repeat(250)}.com`,
        password: validPassword,
        confirmPassword: validPassword,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName()
      }
    };
  }

  static generateValidPassword(): string {
    const upperCase = faker.string.alpha({ length: 2, casing: 'upper' });
    const lowerCase = faker.string.alpha({ length: 4, casing: 'lower' });
    const numbers = faker.string.numeric(2);
    const symbols = faker.helpers.arrayElement(['!', '@', '#', '$', '%']);

    return faker.helpers.shuffle([...upperCase, ...lowerCase, ...numbers, symbols]).join('');
  }

  static createUserWithSpecificEmail(email: string): User {
    this.setSeed();

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const password = this.generateValidPassword();

    return {
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      confirmPassword: password,
      gender: faker.helpers.arrayElement(['male', 'female']),
      fullName: `${firstName} ${lastName}`
    };
  }

  static createAdminUser(): User {
    return {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@demowebshop.com',
      password: 'AdminPassword123!',
      confirmPassword: 'AdminPassword123!',
      gender: 'male',
      fullName: 'Admin User'
    };
  }

  static createBulkUsers(count: number, emailDomain?: string): User[] {
    const users: User[] = [];

    for (let i = 0; i < count; i++) {
      const user = this.createValidUser();

      if (emailDomain) {
        const username = user.email.split('@')[0];
        user.email = `${username}@${emailDomain}`;
      }

      users.push(user);
    }

    return users;
  }
}