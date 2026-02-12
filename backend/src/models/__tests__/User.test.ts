import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import User from '../User';
import bcrypt from 'bcrypt';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should create a user with required fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);

      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.password).not.toBe(userData.password); // Password should be hashed
      expect(user.verificationStatus).toBe('pending');
      expect(user.language).toBe('en');
    });

    it('should create a seller with business fields', async () => {
      const sellerData = {
        email: 'seller@example.com',
        password: 'Password123',
        role: 'seller' as const,
        businessName: 'Nepal Handicrafts',
        businessAddress: 'Kathmandu, Nepal',
        businessPhone: '+977-1234567890',
        businessDocuments: ['doc1.pdf', 'doc2.pdf'],
      };

      const seller = await User.create(sellerData);

      expect(seller.email).toBe(sellerData.email);
      expect(seller.role).toBe('seller');
      expect(seller.businessName).toBe(sellerData.businessName);
      expect(seller.businessAddress).toBe(sellerData.businessAddress);
      expect(seller.businessPhone).toBe(sellerData.businessPhone);
      expect(seller.businessDocuments).toEqual(sellerData.businessDocuments);
    });

    it('should create a buyer with shipping addresses', async () => {
      const buyerData = {
        email: 'buyer@example.com',
        password: 'Password123',
        role: 'buyer' as const,
        shippingAddresses: [
          {
            fullName: 'John Doe',
            phone: '+977-9876543210',
            addressLine1: '123 Main St',
            addressLine2: 'Apt 4B',
            city: 'Kathmandu',
            district: 'Kathmandu',
            postalCode: '44600',
            isDefault: true,
          },
        ],
      };

      const buyer = await User.create(buyerData);

      expect(buyer.email).toBe(buyerData.email);
      expect(buyer.role).toBe('buyer');
      expect(buyer.shippingAddresses).toHaveLength(1);
      expect(buyer.shippingAddresses![0].fullName).toBe('John Doe');
      expect(buyer.shippingAddresses![0].isDefault).toBe(true);
    });

    it('should require email or phone field', async () => {
      const userData = {
        password: 'Password123',
        role: 'buyer' as const,
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should require password field', async () => {
      const userData = {
        email: 'test@example.com',
        role: 'buyer' as const,
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      await User.create(userData);
      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce unique phone constraint', async () => {
      const user1Data = {
        email: 'user1@example.com',
        phone: '+977-1234567890',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user2Data = {
        email: 'user2@example.com',
        phone: '+977-1234567890',
        password: 'Password123',
        role: 'buyer' as const,
      };

      await User.create(user1Data);
      await expect(User.create(user2Data)).rejects.toThrow();
    });

    it('should allow multiple users without phone numbers', async () => {
      const user1Data = {
        email: 'user1@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user2Data = {
        email: 'user2@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user1 = await User.create(user1Data);
      const user2 = await User.create(user2Data);

      expect(user1.email).toBe(user1Data.email);
      expect(user2.email).toBe(user2Data.email);
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123',
        role: 'buyer' as const,
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce role enum values', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'invalid-role' as any,
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce verificationStatus enum values', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
        verificationStatus: 'invalid-status' as any,
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce language enum values', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
        language: 'fr' as any,
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'Password123';
      const userData = {
        email: 'test@example.com',
        password: plainPassword,
        role: 'buyer' as const,
      };

      const user = await User.create(userData);

      expect(user.password).not.toBe(plainPassword);
      expect(user.password.length).toBeGreaterThan(plainPassword.length);
    });

    it('should use bcrypt to hash password', async () => {
      const plainPassword = 'Password123';
      const userData = {
        email: 'test@example.com',
        password: plainPassword,
        role: 'buyer' as const,
      };

      const user = await User.create(userData);

      // Verify it's a valid bcrypt hash
      const isValidHash = await bcrypt.compare(plainPassword, user.password);
      expect(isValidHash).toBe(true);
    });

    it('should not rehash password if not modified', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);
      const originalHash = user.password;

      // Update a different field
      user.firstName = 'John';
      await user.save();

      expect(user.password).toBe(originalHash);
    });

    it('should rehash password if modified', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);
      const originalHash = user.password;

      // Update password
      user.password = 'NewPassword456';
      await user.save();

      expect(user.password).not.toBe(originalHash);
      expect(user.password).not.toBe('NewPassword456');
    });
  });

  describe('comparePassword Method', () => {
    it('should return true for correct password', async () => {
      const plainPassword = 'Password123';
      const userData = {
        email: 'test@example.com',
        password: plainPassword,
        role: 'buyer' as const,
      };

      const user = await User.create(userData);
      const isMatch = await user.comparePassword(plainPassword);

      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);
      const isMatch = await user.comparePassword('WrongPassword');

      expect(isMatch).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);
      const isMatch = await user.comparePassword('password123');

      expect(isMatch).toBe(false);
    });
  });

  describe('Indexes', () => {
    it('should have email index', async () => {
      const indexes = await User.collection.getIndexes();
      const emailIndex = Object.keys(indexes).find((key) =>
        key.includes('email')
      );
      expect(emailIndex).toBeDefined();
    });

    it('should have phone index', async () => {
      const indexes = await User.collection.getIndexes();
      const phoneIndex = Object.keys(indexes).find((key) =>
        key.includes('phone')
      );
      expect(phoneIndex).toBeDefined();
    });

    it('should have role and verificationStatus compound index', async () => {
      const indexes = await User.collection.getIndexes();
      const compoundIndex = Object.keys(indexes).find(
        (key) => key.includes('role') && key.includes('verificationStatus')
      );
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should automatically add createdAt and updatedAt', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);
      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      user.firstName = 'John';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe('Default Values', () => {
    it('should set default role to buyer', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const user = await User.create(userData);

      expect(user.role).toBe('buyer');
    });

    it('should set default verificationStatus to pending', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'seller' as const,
      };

      const user = await User.create(userData);

      expect(user.verificationStatus).toBe('pending');
    });

    it('should set default language to en', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);

      expect(user.language).toBe('en');
    });

    it('should set default empty arrays for businessDocuments and shippingAddresses', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);

      expect(user.businessDocuments).toEqual([]);
      expect(user.shippingAddresses).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle email with uppercase letters', async () => {
      const userData = {
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);

      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from email', async () => {
      const userData = {
        email: '  test@example.com  ',
        password: 'Password123',
        role: 'buyer' as const,
      };

      const user = await User.create(userData);

      expect(user.email).toBe('test@example.com');
    });

    it('should handle multiple shipping addresses', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'buyer' as const,
        shippingAddresses: [
          {
            fullName: 'John Doe',
            phone: '+977-9876543210',
            addressLine1: '123 Main St',
            city: 'Kathmandu',
            district: 'Kathmandu',
            isDefault: true,
          },
          {
            fullName: 'Jane Doe',
            phone: '+977-9876543211',
            addressLine1: '456 Second St',
            city: 'Pokhara',
            district: 'Kaski',
            isDefault: false,
          },
        ],
      };

      const user = await User.create(userData);

      expect(user.shippingAddresses).toHaveLength(2);
      expect(user.shippingAddresses![0].fullName).toBe('John Doe');
      expect(user.shippingAddresses![1].fullName).toBe('Jane Doe');
    });

    it('should handle verification status changes', async () => {
      const userData = {
        email: 'seller@example.com',
        password: 'Password123',
        role: 'seller' as const,
      };

      const user = await User.create(userData);
      expect(user.verificationStatus).toBe('pending');

      user.verificationStatus = 'approved';
      await user.save();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser!.verificationStatus).toBe('approved');
    });

    it('should handle verification reason', async () => {
      const userData = {
        email: 'seller@example.com',
        password: 'Password123',
        role: 'seller' as const,
        verificationStatus: 'rejected' as const,
        verificationReason: 'Incomplete documentation',
      };

      const user = await User.create(userData);

      expect(user.verificationStatus).toBe('rejected');
      expect(user.verificationReason).toBe('Incomplete documentation');
    });
  });
});
