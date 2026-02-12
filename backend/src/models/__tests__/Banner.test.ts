import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import Banner from '../Banner';

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
  await Banner.deleteMany({});
});

describe('Banner Model', () => {
  describe('Schema Validation', () => {
    it('should create a banner with all required fields', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Summer Sale',
          ne: 'ग्रीष्मकालीन बिक्री',
        },
        image: 'https://example.com/banner.jpg',
        link: 'https://example.com/sale',
        active: true,
        displayOrder: 1,
      });

      expect(banner.title.en).toBe('Summer Sale');
      expect(banner.title.ne).toBe('ग्रीष्मकालीन बिक्री');
      expect(banner.image).toBe('https://example.com/banner.jpg');
      expect(banner.link).toBe('https://example.com/sale');
      expect(banner.active).toBe(true);
      expect(banner.displayOrder).toBe(1);
      expect(banner.createdAt).toBeDefined();
      expect(banner.updatedAt).toBeDefined();
    });

    it('should create a banner with only English title', async () => {
      const banner = await Banner.create({
        title: {
          en: 'New Arrivals',
        },
        image: 'https://example.com/banner2.jpg',
      });

      expect(banner.title.en).toBe('New Arrivals');
      expect(banner.title.ne).toBeUndefined();
    });

    it('should create a banner without optional link', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Promotional Banner',
        },
        image: 'https://example.com/banner3.jpg',
      });

      expect(banner.link).toBeUndefined();
    });

    it('should set default active to true', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Default Active Banner',
        },
        image: 'https://example.com/banner4.jpg',
      });

      expect(banner.active).toBe(true);
    });

    it('should set default displayOrder to 0', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Default Order Banner',
        },
        image: 'https://example.com/banner5.jpg',
      });

      expect(banner.displayOrder).toBe(0);
    });

    it('should fail to create banner without title', async () => {
      await expect(
        Banner.create({
          image: 'https://example.com/banner.jpg',
        })
      ).rejects.toThrow();
    });

    it('should fail to create banner without English title', async () => {
      await expect(
        Banner.create({
          title: {
            ne: 'नेपाली शीर्षक',
          },
          image: 'https://example.com/banner.jpg',
        })
      ).rejects.toThrow();
    });

    it('should fail to create banner without image', async () => {
      await expect(
        Banner.create({
          title: {
            en: 'No Image Banner',
          },
        })
      ).rejects.toThrow();
    });

    it('should trim link field', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Trimmed Link Banner',
        },
        image: 'https://example.com/banner.jpg',
        link: '  https://example.com/sale  ',
      });

      expect(banner.link).toBe('https://example.com/sale');
    });
  });

  describe('Banner Operations', () => {
    it('should update banner active status', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Active Banner',
        },
        image: 'https://example.com/banner.jpg',
        active: true,
      });

      banner.active = false;
      await banner.save();

      const updated = await Banner.findById(banner._id);
      expect(updated?.active).toBe(false);
    });

    it('should update banner display order', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Ordered Banner',
        },
        image: 'https://example.com/banner.jpg',
        displayOrder: 1,
      });

      banner.displayOrder = 5;
      await banner.save();

      const updated = await Banner.findById(banner._id);
      expect(updated?.displayOrder).toBe(5);
    });

    it('should update banner title', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Original Title',
        },
        image: 'https://example.com/banner.jpg',
      });

      banner.title.en = 'Updated Title';
      banner.title.ne = 'अद्यावधिक शीर्षक';
      await banner.save();

      const updated = await Banner.findById(banner._id);
      expect(updated?.title.en).toBe('Updated Title');
      expect(updated?.title.ne).toBe('अद्यावधिक शीर्षक');
    });

    it('should update banner image', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Image Update Banner',
        },
        image: 'https://example.com/old-banner.jpg',
      });

      banner.image = 'https://example.com/new-banner.jpg';
      await banner.save();

      const updated = await Banner.findById(banner._id);
      expect(updated?.image).toBe('https://example.com/new-banner.jpg');
    });

    it('should update banner link', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Link Update Banner',
        },
        image: 'https://example.com/banner.jpg',
        link: 'https://example.com/old-link',
      });

      banner.link = 'https://example.com/new-link';
      await banner.save();

      const updated = await Banner.findById(banner._id);
      expect(updated?.link).toBe('https://example.com/new-link');
    });
  });

  describe('Querying', () => {
    beforeEach(async () => {
      // Create multiple banners with different active status and display orders
      await Banner.create([
        {
          title: { en: 'Banner 1' },
          image: 'banner1.jpg',
          active: true,
          displayOrder: 2,
        },
        {
          title: { en: 'Banner 2' },
          image: 'banner2.jpg',
          active: true,
          displayOrder: 1,
        },
        {
          title: { en: 'Banner 3' },
          image: 'banner3.jpg',
          active: false,
          displayOrder: 3,
        },
        {
          title: { en: 'Banner 4' },
          image: 'banner4.jpg',
          active: true,
          displayOrder: 0,
        },
      ]);
    });

    it('should fetch only active banners', async () => {
      const activeBanners = await Banner.find({ active: true });

      expect(activeBanners).toHaveLength(3);
      activeBanners.forEach((banner) => {
        expect(banner.active).toBe(true);
      });
    });

    it('should fetch banners sorted by displayOrder', async () => {
      const banners = await Banner.find({ active: true }).sort({
        displayOrder: 1,
      });

      expect(banners).toHaveLength(3);
      expect(banners[0].displayOrder).toBe(0);
      expect(banners[1].displayOrder).toBe(1);
      expect(banners[2].displayOrder).toBe(2);
    });

    it('should fetch active banners sorted by displayOrder using compound index', async () => {
      const banners = await Banner.find({ active: true }).sort({
        displayOrder: 1,
      });

      expect(banners).toHaveLength(3);
      expect(banners[0].title.en).toBe('Banner 4');
      expect(banners[1].title.en).toBe('Banner 2');
      expect(banners[2].title.en).toBe('Banner 1');
    });

    it('should fetch inactive banners', async () => {
      const inactiveBanners = await Banner.find({ active: false });

      expect(inactiveBanners).toHaveLength(1);
      expect(inactiveBanners[0].title.en).toBe('Banner 3');
    });

    it('should fetch all banners regardless of active status', async () => {
      const allBanners = await Banner.find({});

      expect(allBanners).toHaveLength(4);
    });
  });

  describe('Indexes', () => {
    it('should use compound index for active and displayOrder queries', async () => {
      // Create multiple banners
      await Banner.create([
        {
          title: { en: 'Banner A' },
          image: 'a.jpg',
          active: true,
          displayOrder: 1,
        },
        {
          title: { en: 'Banner B' },
          image: 'b.jpg',
          active: true,
          displayOrder: 2,
        },
        {
          title: { en: 'Banner C' },
          image: 'c.jpg',
          active: false,
          displayOrder: 1,
        },
      ]);

      // Query using the compound index
      const banners = await Banner.find({ active: true }).sort({
        displayOrder: 1,
      });

      expect(banners).toHaveLength(2);
      expect(banners[0].title.en).toBe('Banner A');
      expect(banners[1].title.en).toBe('Banner B');
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt and updatedAt on creation', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Timestamp Banner',
        },
        image: 'https://example.com/banner.jpg',
      });

      expect(banner.createdAt).toBeDefined();
      expect(banner.updatedAt).toBeDefined();
      expect(banner.createdAt).toBeInstanceOf(Date);
      expect(banner.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt when banner is modified', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Update Test Banner',
        },
        image: 'https://example.com/banner.jpg',
      });

      const originalUpdatedAt = banner.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      banner.title.en = 'Modified Title';
      await banner.save();

      expect(banner.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it('should not change createdAt when banner is modified', async () => {
      const banner = await Banner.create({
        title: {
          en: 'CreatedAt Test Banner',
        },
        image: 'https://example.com/banner.jpg',
      });

      const originalCreatedAt = banner.createdAt;

      // Wait and modify
      await new Promise((resolve) => setTimeout(resolve, 10));

      banner.title.en = 'Modified Title';
      await banner.save();

      expect(banner.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });
  });

  describe('Bilingual Support', () => {
    it('should support both English and Nepali titles', async () => {
      const banner = await Banner.create({
        title: {
          en: 'Welcome to Made in Nepal',
          ne: 'नेपालमा बनेकोमा स्वागत छ',
        },
        image: 'https://example.com/banner.jpg',
      });

      expect(banner.title.en).toBe('Welcome to Made in Nepal');
      expect(banner.title.ne).toBe('नेपालमा बनेकोमा स्वागत छ');
    });

    it('should allow updating Nepali title independently', async () => {
      const banner = await Banner.create({
        title: {
          en: 'English Title',
        },
        image: 'https://example.com/banner.jpg',
      });

      banner.title.ne = 'नेपाली शीर्षक';
      await banner.save();

      const updated = await Banner.findById(banner._id);
      expect(updated?.title.en).toBe('English Title');
      expect(updated?.title.ne).toBe('नेपाली शीर्षक');
    });
  });
});
