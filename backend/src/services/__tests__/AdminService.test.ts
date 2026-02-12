import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AdminService } from '../AdminService.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Banner from '../../models/Banner.js';

describe('AdminService', () => {
  let mongoServer: MongoMemoryServer;
  let adminService: AdminService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    adminService = new AdminService();
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Banner.deleteMany({});
  });

  describe('getPendingSellers', () => {
    it('should return only pending sellers', async () => {
      await User.create([
        {
          email: 'pending@test.com',
          password: 'Password123',
          role: 'seller',
          verificationStatus: 'pending',
          businessName: 'Pending Business',
        },
        {
          email: 'approved@test.com',
          password: 'Password123',
          role: 'seller',
          verificationStatus: 'approved',
          businessName: 'Approved Business',
        },
      ]);

      const pendingSellers = await adminService.getPendingSellers();
      expect(pendingSellers).toHaveLength(1);
      expect(pendingSellers[0].email).toBe('pending@test.com');
      expect(pendingSellers[0].password).toBeUndefined();
    });

    it('should return empty array when no pending sellers', async () => {
      const pendingSellers = await adminService.getPendingSellers();
      expect(pendingSellers).toHaveLength(0);
    });
  });

  describe('verifySeller', () => {
    it('should approve a pending seller', async () => {
      const seller = await User.create({
        email: 'seller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'pending',
        businessName: 'Test Business',
      });

      const result = await adminService.verifySeller(
        seller._id.toString(),
        true,
        'Business documents verified'
      );

      expect(result.verificationStatus).toBe('approved');
      expect(result.verificationReason).toBe('Business documents verified');
    });

    it('should reject a pending seller', async () => {
      const seller = await User.create({
        email: 'seller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'pending',
        businessName: 'Test Business',
      });

      const result = await adminService.verifySeller(
        seller._id.toString(),
        false,
        'Incomplete documentation'
      );

      expect(result.verificationStatus).toBe('rejected');
      expect(result.verificationReason).toBe('Incomplete documentation');
    });

    it('should throw error for invalid seller ID', async () => {
      await expect(
        adminService.verifySeller('invalid-id', true)
      ).rejects.toThrow('Invalid seller ID');
    });

    it('should throw error for non-existent seller', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        adminService.verifySeller(fakeId, true)
      ).rejects.toThrow('Seller not found');
    });

    it('should throw error when user is not a seller', async () => {
      const buyer = await User.create({
        email: 'buyer@test.com',
        password: 'Password123',
        role: 'buyer',
        verificationStatus: 'approved',
      });

      await expect(
        adminService.verifySeller(buyer._id.toString(), true)
      ).rejects.toThrow('User is not a seller');
    });
  });

  describe('getPendingProducts', () => {
    it('should return only pending products with seller info', async () => {
      const seller = await User.create({
        email: 'seller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
        businessName: 'Test Business',
      });

      await Product.create([
        {
          title: { en: 'Pending Product' },
          description: { en: 'Description' },
          price: 100,
          category: 'handicrafts',
          images: ['image1.jpg'],
          inventory: 10,
          sellerId: seller._id,
          verificationStatus: 'pending',
        },
        {
          title: { en: 'Approved Product' },
          description: { en: 'Description' },
          price: 200,
          category: 'handicrafts',
          images: ['image2.jpg'],
          inventory: 5,
          sellerId: seller._id,
          verificationStatus: 'approved',
        },
      ]);

      const pendingProducts = await adminService.getPendingProducts();

      expect(pendingProducts).toHaveLength(1);
      expect(pendingProducts[0].title.en).toBe('Pending Product');
      expect(pendingProducts[0].verificationStatus).toBe('pending');
      expect(pendingProducts[0].sellerId).toBeDefined();
    });

    it('should return empty array when no pending products', async () => {
      const pendingProducts = await adminService.getPendingProducts();
      expect(pendingProducts).toHaveLength(0);
    });
  });

  describe('verifyProduct', () => {
    it('should approve a pending product', async () => {
      const seller = await User.create({
        email: 'seller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      const product = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Description' },
        price: 100,
        category: 'handicrafts',
        images: ['image1.jpg'],
        inventory: 10,
        sellerId: seller._id,
        verificationStatus: 'pending',
      });

      const result = await adminService.verifyProduct(
        product._id.toString(),
        true,
        'Verified as Made in Nepal'
      );

      expect(result.verificationStatus).toBe('approved');
      expect(result.verificationReason).toBe('Verified as Made in Nepal');
    });

    it('should reject a pending product', async () => {
      const seller = await User.create({
        email: 'seller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      const product = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Description' },
        price: 100,
        category: 'handicrafts',
        images: ['image1.jpg'],
        inventory: 10,
        sellerId: seller._id,
        verificationStatus: 'pending',
      });

      const result = await adminService.verifyProduct(
        product._id.toString(),
        false,
        'Not made in Nepal'
      );

      expect(result.verificationStatus).toBe('rejected');
      expect(result.verificationReason).toBe('Not made in Nepal');
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        adminService.verifyProduct('invalid-id', true)
      ).rejects.toThrow('Invalid product ID');
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        adminService.verifyProduct(fakeId, true)
      ).rejects.toThrow('Product not found');
    });
  });

  describe('getPlatformAnalytics', () => {
    it('should calculate platform analytics correctly', async () => {
      const buyer1 = await User.create({
        email: 'buyer1@test.com',
        password: 'Password123',
        role: 'buyer',
        verificationStatus: 'approved',
      });

      const buyer2 = await User.create({
        email: 'buyer2@test.com',
        password: 'Password123',
        role: 'buyer',
        verificationStatus: 'approved',
      });

      const seller = await User.create({
        email: 'seller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      await User.create({
        email: 'pending@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'pending',
      });

      const product1 = await Product.create({
        title: { en: 'Product 1' },
        description: { en: 'Description' },
        price: 100,
        category: 'handicrafts',
        images: ['image1.jpg'],
        inventory: 10,
        sellerId: seller._id,
        verificationStatus: 'approved',
        averageRating: 4.5,
      });

      const product2 = await Product.create({
        title: { en: 'Product 2' },
        description: { en: 'Description' },
        price: 200,
        category: 'handicrafts',
        images: ['image2.jpg'],
        inventory: 5,
        sellerId: seller._id,
        verificationStatus: 'pending',
        averageRating: 4.0,
      });

      await Order.create([
        {
          orderNumber: 'MN-2024-001',
          buyerId: buyer1._id,
          items: [
            {
              productId: product1._id,
              title: 'Product 1',
              price: 100,
              quantity: 2,
              sellerId: seller._id,
            },
          ],
          shippingAddress: {
            fullName: 'Test User',
            phone: '9841234567',
            addressLine1: 'Address',
            city: 'Kathmandu',
            district: 'Kathmandu',
          },
          paymentMethod: 'cod',
          subtotal: 200,
          totalAmount: 200,
          status: 'delivered',
        },
        {
          orderNumber: 'MN-2024-002',
          buyerId: buyer2._id,
          items: [
            {
              productId: product1._id,
              title: 'Product 1',
              price: 100,
              quantity: 1,
              sellerId: seller._id,
            },
            {
              productId: product2._id,
              title: 'Product 2',
              price: 200,
              quantity: 1,
              sellerId: seller._id,
            },
          ],
          shippingAddress: {
            fullName: 'Test User 2',
            phone: '9841234568',
            addressLine1: 'Address',
            city: 'Kathmandu',
            district: 'Kathmandu',
          },
          paymentMethod: 'esewa',
          subtotal: 300,
          totalAmount: 300,
          status: 'confirmed',
        },
      ]);

      const analytics = await adminService.getPlatformAnalytics();

      expect(analytics.totalSales).toBe(4);
      expect(analytics.totalRevenue).toBe(500);
      expect(analytics.activeUsers.buyers).toBe(2);
      expect(analytics.activeUsers.sellers).toBe(1);
      expect(analytics.activeUsers.total).toBe(3);
      expect(analytics.popularProducts).toHaveLength(2);
      expect(analytics.popularProducts[0].productId).toBe(product1._id.toString());
      expect(analytics.popularProducts[0].salesCount).toBe(3);
      expect(analytics.popularProducts[0].averageRating).toBe(4.5);
      expect(analytics.pendingSellers).toBe(1);
      expect(analytics.pendingProducts).toBe(1);
    });

    it('should return zero values when no data exists', async () => {
      const analytics = await adminService.getPlatformAnalytics();

      expect(analytics.totalSales).toBe(0);
      expect(analytics.totalRevenue).toBe(0);
      expect(analytics.activeUsers.buyers).toBe(0);
      expect(analytics.activeUsers.sellers).toBe(0);
      expect(analytics.activeUsers.total).toBe(0);
      expect(analytics.popularProducts).toHaveLength(0);
      expect(analytics.pendingSellers).toBe(0);
      expect(analytics.pendingProducts).toBe(0);
    });

    it('should exclude cancelled orders from analytics', async () => {
      const buyer = await User.create({
        email: 'buyer@test.com',
        password: 'Password123',
        role: 'buyer',
      });

      const seller = await User.create({
        email: 'seller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      const product = await Product.create({
        title: { en: 'Product' },
        description: { en: 'Description' },
        price: 100,
        category: 'handicrafts',
        images: ['image.jpg'],
        inventory: 10,
        sellerId: seller._id,
        verificationStatus: 'approved',
      });

      await Order.create({
        orderNumber: 'MN-2024-001',
        buyerId: buyer._id,
        items: [
          {
            productId: product._id,
            title: 'Product',
            price: 100,
            quantity: 5,
            sellerId: seller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 500,
        totalAmount: 500,
        status: 'cancelled',
      });

      const analytics = await adminService.getPlatformAnalytics();

      expect(analytics.totalSales).toBe(0);
      expect(analytics.totalRevenue).toBe(0);
    });
  });

  describe('Banner Management', () => {
    describe('createBanner', () => {
      it('should create a banner with all fields', async () => {
        const bannerData = {
          title: { en: 'Test Banner', ne: 'परकषण बयनर' },
          image: 'https://example.com/banner.jpg',
          link: 'https://example.com/products',
          active: true,
          displayOrder: 0,
        };

        const banner = await adminService.createBanner(bannerData);

        expect(banner.title.en).toBe('Test Banner');
        expect(banner.title.ne).toBe('परकषण बयनर');
        expect(banner.image).toBe('https://example.com/banner.jpg');
        expect(banner.link).toBe('https://example.com/products');
        expect(banner.active).toBe(true);
        expect(banner.displayOrder).toBe(0);
      });

      it('should auto-assign display order if not provided', async () => {
        await adminService.createBanner({
          title: { en: 'Banner 1' },
          image: 'image1.jpg',
        });

        const banner2 = await adminService.createBanner({
          title: { en: 'Banner 2' },
          image: 'image2.jpg',
        });

        expect(banner2.displayOrder).toBe(1);
      });

      it('should throw error if title is missing', async () => {
        await expect(
          adminService.createBanner({
            title: {} as any,
            image: 'image.jpg',
          })
        ).rejects.toThrow('Banner title (English) is required');
      });

      it('should throw error if image is missing', async () => {
        await expect(
          adminService.createBanner({
            title: { en: 'Test' },
            image: '',
          })
        ).rejects.toThrow('Banner image is required');
      });
    });

    describe('updateBanner', () => {
      it('should update banner fields', async () => {
        const banner = await adminService.createBanner({
          title: { en: 'Original Title' },
          image: 'original.jpg',
          active: true,
        });

        const updated = await adminService.updateBanner(banner._id.toString(), {
          title: { en: 'Updated Title', ne: 'अपडट गरएक शरषक' },
          image: 'updated.jpg',
          active: false,
          displayOrder: 5,
        });

        expect(updated.title.en).toBe('Updated Title');
        expect(updated.title.ne).toBe('अपडट गरएक शरषक');
        expect(updated.image).toBe('updated.jpg');
        expect(updated.active).toBe(false);
        expect(updated.displayOrder).toBe(5);
      });

      it('should update only provided fields', async () => {
        const banner = await adminService.createBanner({
          title: { en: 'Original Title' },
          image: 'original.jpg',
          active: true,
        });

        const updated = await adminService.updateBanner(banner._id.toString(), {
          active: false,
        });

        expect(updated.title.en).toBe('Original Title');
        expect(updated.image).toBe('original.jpg');
        expect(updated.active).toBe(false);
      });

      it('should throw error for invalid banner ID', async () => {
        await expect(
          adminService.updateBanner('invalid-id', { active: false })
        ).rejects.toThrow('Invalid banner ID');
      });

      it('should throw error for non-existent banner', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        await expect(
          adminService.updateBanner(fakeId, { active: false })
        ).rejects.toThrow('Banner not found');
      });
    });

    describe('deleteBanner', () => {
      it('should delete a banner', async () => {
        const banner = await adminService.createBanner({
          title: { en: 'Test Banner' },
          image: 'test.jpg',
        });

        const result = await adminService.deleteBanner(banner._id.toString());

        expect(result.message).toBe('Banner deleted successfully');

        const banners = await Banner.find();
        expect(banners).toHaveLength(0);
      });

      it('should throw error for invalid banner ID', async () => {
        await expect(
          adminService.deleteBanner('invalid-id')
        ).rejects.toThrow('Invalid banner ID');
      });

      it('should throw error for non-existent banner', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        await expect(
          adminService.deleteBanner(fakeId)
        ).rejects.toThrow('Banner not found');
      });
    });

    describe('reorderBanners', () => {
      it('should reorder banners correctly', async () => {
        const banner1 = await adminService.createBanner({
          title: { en: 'Banner 1' },
          image: 'image1.jpg',
        });

        const banner2 = await adminService.createBanner({
          title: { en: 'Banner 2' },
          image: 'image2.jpg',
        });

        const banner3 = await adminService.createBanner({
          title: { en: 'Banner 3' },
          image: 'image3.jpg',
        });

        const reordered = await adminService.reorderBanners([
          banner3._id.toString(),
          banner1._id.toString(),
          banner2._id.toString(),
        ]);

        expect(reordered[0]._id.toString()).toBe(banner3._id.toString());
        expect(reordered[0].displayOrder).toBe(0);
        expect(reordered[1]._id.toString()).toBe(banner1._id.toString());
        expect(reordered[1].displayOrder).toBe(1);
        expect(reordered[2]._id.toString()).toBe(banner2._id.toString());
        expect(reordered[2].displayOrder).toBe(2);
      });

      it('should throw error for invalid banner ID', async () => {
        await expect(
          adminService.reorderBanners(['invalid-id'])
        ).rejects.toThrow('Invalid banner ID');
      });

      it('should throw error if banner not found', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        await expect(
          adminService.reorderBanners([fakeId])
        ).rejects.toThrow('One or more banners not found');
      });
    });

    describe('getAllBanners', () => {
      it('should return all banners sorted by display order', async () => {
        await adminService.createBanner({
          title: { en: 'Banner 1' },
          image: 'image1.jpg',
          displayOrder: 2,
        });

        await adminService.createBanner({
          title: { en: 'Banner 2' },
          image: 'image2.jpg',
          displayOrder: 0,
        });

        await adminService.createBanner({
          title: { en: 'Banner 3' },
          image: 'image3.jpg',
          displayOrder: 1,
        });

        const banners = await adminService.getAllBanners();

        expect(banners).toHaveLength(3);
        expect(banners[0].title.en).toBe('Banner 2');
        expect(banners[1].title.en).toBe('Banner 3');
        expect(banners[2].title.en).toBe('Banner 1');
      });

      it('should return empty array when no banners exist', async () => {
        const banners = await adminService.getAllBanners();
        expect(banners).toHaveLength(0);
      });
    });

    describe('getActiveBanners', () => {
      it('should return only active banners', async () => {
        await adminService.createBanner({
          title: { en: 'Active Banner 1' },
          image: 'image1.jpg',
          active: true,
        });

        await adminService.createBanner({
          title: { en: 'Inactive Banner' },
          image: 'image2.jpg',
          active: false,
        });

        await adminService.createBanner({
          title: { en: 'Active Banner 2' },
          image: 'image3.jpg',
          active: true,
        });

        const banners = await adminService.getActiveBanners();

        expect(banners).toHaveLength(2);
        expect(banners.every((b) => b.active)).toBe(true);
      });

      it('should return empty array when no active banners', async () => {
        await adminService.createBanner({
          title: { en: 'Inactive Banner' },
          image: 'image.jpg',
          active: false,
        });

        const banners = await adminService.getActiveBanners();
        expect(banners).toHaveLength(0);
      });
    });
  });
});
