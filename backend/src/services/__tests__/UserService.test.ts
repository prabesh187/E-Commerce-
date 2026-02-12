import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserService } from '../UserService.js';
import User from '../../models/User.js';

describe('UserService', () => {
  let mongoServer: MongoMemoryServer;
  let userService: UserService;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database before each test
    await User.deleteMany({});
    userService = new UserService();
  });

  describe('register', () => {
    it('should register a new user with email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
        firstName: 'Test',
        lastName: 'User',
      };

      const result = await userService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('buyer');
      expect(result.user.firstName).toBe('Test');
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should register a new user with phone', async () => {
      const userData = {
        phone: '9841234567',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const result = await userService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.user.phone).toBe('9841234567');
      expect(result.token).toBeDefined();
    });

    it('should register a new user with both email and phone', async () => {
      const userData = {
        email: 'test@example.com',
        phone: '9841234567',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const result = await userService.register(userData);

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.phone).toBe('9841234567');
    });

    it('should set verification status to pending for sellers', async () => {
      const userData = {
        email: 'seller@example.com',
        password: 'Password123',
        role: 'seller' as const,
        businessName: 'Test Business',
      };

      const result = await userService.register(userData);

      expect(result.user.verificationStatus).toBe('pending');
      expect(result.user.businessName).toBe('Test Business');
    });

    it('should set verification status to approved for buyers', async () => {
      const userData = {
        email: 'buyer@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const result = await userService.register(userData);

      expect(result.user.verificationStatus).toBe('approved');
    });

    it('should throw error if neither email nor phone is provided', async () => {
      const userData = {
        password: 'Password123',
      };

      await expect(userService.register(userData)).rejects.toThrow(
        'Either email or phone number is required'
      );
    });

    it('should throw error for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123',
      };

      await expect(userService.register(userData)).rejects.toThrow(
        'Invalid email format'
      );
    });

    it('should throw error for invalid phone format', async () => {
      const userData = {
        phone: '123',
        password: 'Password123',
      };

      await expect(userService.register(userData)).rejects.toThrow(
        'Invalid phone number format'
      );
    });

    it('should accept valid Nepali mobile number formats', async () => {
      const validPhones = [
        '9841234567',
        '+9779841234567',
        '98 4123 4567',
        '984-123-4567',
      ];

      for (const phone of validPhones) {
        await User.deleteMany({});
        const userData = {
          phone,
          password: 'Password123',
        };

        const result = await userService.register(userData);
        expect(result.user).toBeDefined();
      }
    });

    it('should throw error for password less than 8 characters', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Pass1',
      };

      await expect(userService.register(userData)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should throw error for password without lowercase letter', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'PASSWORD123',
      };

      await expect(userService.register(userData)).rejects.toThrow(
        'Password must contain at least one lowercase letter'
      );
    });

    it('should throw error for password without uppercase letter', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(userService.register(userData)).rejects.toThrow(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should throw error for password without number', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'PasswordABC',
      };

      await expect(userService.register(userData)).rejects.toThrow(
        'Password must contain at least one number'
      );
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      await userService.register(userData);

      await expect(userService.register(userData)).rejects.toThrow(
        'Email already registered'
      );
    });

    it('should throw error if phone already exists', async () => {
      const userData = {
        phone: '9841234567',
        password: 'Password123',
      };

      await userService.register(userData);

      await expect(userService.register(userData)).rejects.toThrow(
        'Phone number already registered'
      );
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = await userService.register(userData);
      const savedUser = await User.findById(result.user._id);

      expect(savedUser?.password).not.toBe('Password123');
      expect(savedUser?.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should convert email to lowercase', async () => {
      const userData = {
        email: 'Test@EXAMPLE.COM',
        password: 'Password123',
      };

      const result = await userService.register(userData);

      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user
      await userService.register({
        email: 'test@example.com',
        phone: '9841234567',
        password: 'Password123',
        role: 'buyer',
      });
    });

    it('should login with valid email and password', async () => {
      const result = await userService.login('test@example.com', 'Password123');

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeDefined();
    });

    it('should login with valid phone and password', async () => {
      const result = await userService.login('9841234567', 'Password123');

      expect(result.user).toBeDefined();
      expect(result.user.phone).toBe('9841234567');
      expect(result.token).toBeDefined();
    });

    it('should be case-insensitive for email', async () => {
      const result = await userService.login('TEST@EXAMPLE.COM', 'Password123');

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for non-existent email', async () => {
      await expect(
        userService.login('nonexistent@example.com', 'Password123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for non-existent phone', async () => {
      await expect(
        userService.login('9999999999', 'Password123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for incorrect password', async () => {
      await expect(
        userService.login('test@example.com', 'WrongPassword123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should return different tokens for different login sessions', async () => {
      const result1 = await userService.login('test@example.com', 'Password123');
      
      // Wait a moment to ensure different timestamps (JWT iat claim has 1-second precision)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result2 = await userService.login('test@example.com', 'Password123');

      expect(result1.token).not.toBe(result2.token);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = userService.generateToken('user123', 'buyer');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include userId and role in token payload', () => {
      const token = userService.generateToken('user123', 'seller');
      const decoded = userService.verifyToken(token);

      expect(decoded.userId).toBe('user123');
      expect(decoded.role).toBe('seller');
    });

    it('should generate different tokens for different users', () => {
      const token1 = userService.generateToken('user1', 'buyer');
      const token2 = userService.generateToken('user2', 'buyer');

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = userService.generateToken('user123', 'buyer');
      const decoded = userService.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe('user123');
      expect(decoded.role).toBe('buyer');
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      expect(() => userService.verifyToken('invalid-token')).toThrow(
        'Invalid token'
      );
    });

    it('should throw error for malformed token', () => {
      expect(() => userService.verifyToken('not.a.token')).toThrow(
        'Invalid token'
      );
    });

    it('should throw error for empty token', () => {
      expect(() => userService.verifyToken('')).toThrow('Invalid token');
    });

    it('should include expiration time in decoded token', () => {
      const token = userService.generateToken('user123', 'buyer');
      const decoded = userService.verifyToken(token);

      expect(decoded.exp).toBeGreaterThan(decoded.iat);
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const { user } = await userService.register({
        email: 'test@example.com',
        password: 'Password123',
      });

      const foundUser = await userService.getUserById(user._id.toString());

      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe('test@example.com');
    });

    it('should not include password in returned user', async () => {
      const { user } = await userService.register({
        email: 'test@example.com',
        password: 'Password123',
      });

      const foundUser = await userService.getUserById(user._id.toString());

      expect(foundUser.password).toBeUndefined();
    });

    it('should throw error for non-existent user ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(userService.getUserById(fakeId)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error for invalid user ID format', async () => {
      await expect(userService.getUserById('invalid-id')).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle registration with all optional fields', async () => {
      const userData = {
        email: 'seller@example.com',
        phone: '9841234567',
        password: 'Password123',
        role: 'seller' as const,
        firstName: 'John',
        lastName: 'Doe',
        businessName: 'John\'s Handicrafts',
        businessAddress: 'Kathmandu, Nepal',
        businessPhone: '01-4123456',
      };

      const result = await userService.register(userData);

      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('Doe');
      expect(result.user.businessName).toBe('John\'s Handicrafts');
      expect(result.user.businessAddress).toBe('Kathmandu, Nepal');
      expect(result.user.businessPhone).toBe('01-4123456');
    });

    it('should handle password with special characters', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'P@ssw0rd!123',
      };

      const result = await userService.register(userData);
      expect(result.user).toBeDefined();

      // Should be able to login with the same password
      const loginResult = await userService.login('test@example.com', 'P@ssw0rd!123');
      expect(loginResult.user).toBeDefined();
    });

    it('should handle very long valid password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123' + 'a'.repeat(100),
      };

      const result = await userService.register(userData);
      expect(result.user).toBeDefined();
    });

    it('should handle email with plus addressing', async () => {
      const userData = {
        email: 'test+tag@example.com',
        password: 'Password123',
      };

      const result = await userService.register(userData);
      expect(result.user.email).toBe('test+tag@example.com');
    });

    it('should handle Nepali landline numbers', async () => {
      const userData = {
        phone: '01-4123456',
        password: 'Password123',
      };

      const result = await userService.register(userData);
      expect(result.user).toBeDefined();
    });
  });
});
