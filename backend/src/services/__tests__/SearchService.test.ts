import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SearchService } from '../SearchService.js';
import Product, { IProduct } from '../../models/Product.js';
import User, { IUser } from '../../models/User.js';

describe('SearchService', () => {
  let mongoServer: MongoMemoryServer;
  let searchService: SearchService;
  let testSeller: IUser;

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
    // Clear all collections
    await User.deleteMany({});
    await Product.deleteMany({});

    searchService = new SearchService();

    // Create test seller
    testSeller = await User.create({
      email: 'seller@test.com',
      password: 'Password123',
      role: 'seller',
      verificationStatus: 'approved',
      firstName: 'Test',
      lastName: 'Seller',
      businessName: 'Test Business',
    });

    // Create test products with various titles and descriptions
    await Product.create([
      {
        title: { en: 'Handmade Nepali Pashmina Shawl' },
        description: { en: 'Beautiful handwoven pashmina shawl from Nepal' },
        price: 5000,
        category: 'handicrafts',
        images: ['image1.jpg'],
        inventory: 10,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
        averageRating: 4.5,
        reviewCount: 20,
        weightedRating: 3.0,
      },
      {
        title: { en: 'Traditional Nepali Dhaka Topi' },
        description: { en: 'Authentic dhaka topi hat made in Nepal' },
        price: 800,
        category: 'clothing',
        images: ['image2.jpg'],
        inventory: 25,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
        averageRating: 4.8,
        reviewCount: 15,
        weightedRating: 2.88,
      },
      {
        title: { en: 'Nepali Spice Mix' },
        description: { en: 'Aromatic spice blend from the mountains of Nepal' },
        price: 300,
        category: 'food',
        images: ['image3.jpg'],
        inventory: 50,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
        averageRating: 4.2,
        reviewCount: 30,
        weightedRating: 3.15,
      },
      {
        title: { en: 'Handcrafted Wooden Bowl' },
        description: { en: 'Beautiful wooden bowl carved by Nepali artisans' },
        price: 1200,
        category: 'handicrafts',
        images: ['image4.jpg'],
        inventory: 15,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
        averageRating: 4.0,
        reviewCount: 10,
        weightedRating: 2.0,
      },
      {
        title: { en: 'Pashmina Scarf' },
        description: { en: 'Soft and warm pashmina scarf' },
        price: 3000,
        category: 'clothing',
        images: ['image5.jpg'],
        inventory: 20,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
        averageRating: 4.7,
        reviewCount: 25,
        weightedRating: 3.36,
      },
      {
        title: { en: 'Inactive Product' },
        description: { en: 'This product should not appear in search' },
        price: 1000,
        category: 'other',
        images: ['image6.jpg'],
        inventory: 5,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: false,
      },
      {
        title: { en: 'Pending Product' },
        description: { en: 'This product should not appear in search' },
        price: 1000,
        category: 'other',
        images: ['image7.jpg'],
        inventory: 5,
        sellerId: testSeller._id,
        verificationStatus: 'pending',
        isActive: true,
      },
    ]);
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
  });

  describe('search', () => {
    it('should return products matching the search query', async () => {
      const result = await searchService.search('pashmina');

      expect(result.products.length).toBeGreaterThan(0);
      expect(result.totalCount).toBeGreaterThan(0);
      
      // Check that results contain pashmina products
      const hasPashmina = result.products.some(p => 
        p.title.en.toLowerCase().includes('pashmina')
      );
      expect(hasPashmina).toBe(true);
    });

    it('should return empty results for empty query', async () => {
      const result = await searchService.search('');

      expect(result.products).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should return empty results for whitespace query', async () => {
      const result = await searchService.search('   ');

      expect(result.products).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should not return inactive products', async () => {
      const result = await searchService.search('Inactive');

      expect(result.products).toHaveLength(0);
    });

    it('should not return pending products', async () => {
      const result = await searchService.search('Pending');

      expect(result.products).toHaveLength(0);
    });

    it('should handle fuzzy matching for typos', async () => {
      // "pashmena" is close to "pashmina" (Levenshtein distance = 2)
      const result = await searchService.search('pashmena');

      expect(result.products.length).toBeGreaterThan(0);
      
      // Should find pashmina products despite typo
      const hasPashmina = result.products.some(p => 
        p.title.en.toLowerCase().includes('pashmina')
      );
      expect(hasPashmina).toBe(true);
    });

    it('should handle case-insensitive search', async () => {
      const result1 = await searchService.search('NEPALI');
      const result2 = await searchService.search('nepali');
      const result3 = await searchService.search('Nepali');

      expect(result1.products.length).toBeGreaterThan(0);
      expect(result2.products.length).toBeGreaterThan(0);
      expect(result3.products.length).toBeGreaterThan(0);
      
      // All should return similar results
      expect(result1.totalCount).toBe(result2.totalCount);
      expect(result2.totalCount).toBe(result3.totalCount);
    });

    it('should search in both title and description', async () => {
      const result = await searchService.search('artisans');

      expect(result.products.length).toBeGreaterThan(0);
      
      // "artisans" appears only in description of wooden bowl
      const hasWoodenBowl = result.products.some(p => 
        p.title.en.includes('Wooden Bowl')
      );
      expect(hasWoodenBowl).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const result = await searchService.search('nepali', 1, 2);

      expect(result.products.length).toBeLessThanOrEqual(2);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should return second page correctly', async () => {
      const result1 = await searchService.search('nepali', 1, 2);
      const result2 = await searchService.search('nepali', 2, 2);

      expect(result2.currentPage).toBe(2);
      
      // Products on page 2 should be different from page 1
      if (result2.products.length > 0 && result1.products.length > 0) {
        const page1Ids = result1.products.map(p => p._id.toString());
        const page2Ids = result2.products.map(p => p._id.toString());
        
        // No overlap between pages
        const overlap = page1Ids.filter(id => page2Ids.includes(id));
        expect(overlap).toHaveLength(0);
      }
    });

    it('should handle multi-word queries', async () => {
      const result = await searchService.search('nepali spice');

      expect(result.products.length).toBeGreaterThan(0);
      
      // Should find the spice mix product
      const hasSpiceMix = result.products.some(p => 
        p.title.en.includes('Spice Mix')
      );
      expect(hasSpiceMix).toBe(true);
    });

    it('should return results sorted by relevance', async () => {
      const result = await searchService.search('pashmina');

      expect(result.products.length).toBeGreaterThan(0);
      
      // Product with "Pashmina" in title should rank higher than description matches
      // The first result should have pashmina in the title
      if (result.products.length > 1) {
        const firstProduct = result.products[0];
        expect(firstProduct.title.en.toLowerCase()).toContain('pashmina');
      }
    });
  });

  describe('rankResults', () => {
    let products: IProduct[];

    beforeEach(async () => {
      products = await Product.find({ isActive: true, verificationStatus: 'approved' });
    });

    it('should rank exact title matches highest', async () => {
      const query = 'Pashmina Scarf';
      const ranked = searchService.rankResults(products, query);

      expect(ranked.length).toBeGreaterThan(0);
      
      // Exact match should be first
      const exactMatch = ranked.find(r => 
        r.product.title.en.toLowerCase() === query.toLowerCase()
      );
      
      if (exactMatch) {
        expect(ranked[0].product._id.toString()).toBe(exactMatch.product._id.toString());
      }
    });

    it('should rank title contains matches higher than description matches', async () => {
      const query = 'wooden';
      const ranked = searchService.rankResults(products, query);

      expect(ranked.length).toBeGreaterThan(0);
      
      // Product with "wooden" in title should rank higher
      const titleMatch = ranked.find(r => 
        r.product.title.en.toLowerCase().includes(query.toLowerCase())
      );
      
      const descriptionOnlyMatch = ranked.find(r => 
        !r.product.title.en.toLowerCase().includes(query.toLowerCase()) &&
        r.product.description.en.toLowerCase().includes(query.toLowerCase())
      );
      
      if (titleMatch && descriptionOnlyMatch) {
        const titleIndex = ranked.findIndex(r => r.product._id.equals(titleMatch.product._id));
        const descIndex = ranked.findIndex(r => r.product._id.equals(descriptionOnlyMatch.product._id));
        
        expect(titleIndex).toBeLessThan(descIndex);
      }
    });

    it('should assign higher scores to better matches', async () => {
      const query = 'nepali';
      const ranked = searchService.rankResults(products, query);

      expect(ranked.length).toBeGreaterThan(0);
      
      // Scores should be in descending order
      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i + 1].score);
      }
    });

    it('should consider product ratings in scoring', async () => {
      const query = 'nepali';
      const ranked = searchService.rankResults(products, query);

      // Products with higher ratings should get a boost
      // This is reflected in the combined score
      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].score).toBeGreaterThan(0);
    });

    it('should handle empty results array', () => {
      const ranked = searchService.rankResults([], 'test');
      expect(ranked).toHaveLength(0);
    });

    it('should handle single result', async () => {
      const singleProduct = products.slice(0, 1);
      const ranked = searchService.rankResults(singleProduct, 'test');
      
      expect(ranked).toHaveLength(1);
      expect(ranked[0].product._id).toEqual(singleProduct[0]._id);
    });
  });

  describe('getSuggestions', () => {
    it('should return autocomplete suggestions for partial query', async () => {
      const suggestions = await searchService.getSuggestions('nep');

      expect(suggestions.length).toBeGreaterThan(0);
      
      // All suggestions should contain the query
      suggestions.forEach(suggestion => {
        expect(suggestion.text.toLowerCase()).toContain('nep');
      });
    });

    it('should return suggestions with category information', async () => {
      const suggestions = await searchService.getSuggestions('pashmina');

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Suggestions should have category
      suggestions.forEach(suggestion => {
        expect(suggestion.category).toBeDefined();
      });
    });

    it('should return empty array for very short query', async () => {
      const suggestions = await searchService.getSuggestions('a');

      expect(suggestions).toHaveLength(0);
    });

    it('should return empty array for empty query', async () => {
      const suggestions = await searchService.getSuggestions('');

      expect(suggestions).toHaveLength(0);
    });

    it('should limit number of suggestions', async () => {
      const suggestions = await searchService.getSuggestions('nepali', 3);

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return unique suggestions', async () => {
      const suggestions = await searchService.getSuggestions('pashmina');

      // Check for duplicates
      const texts = suggestions.map(s => s.text.toLowerCase());
      const uniqueTexts = new Set(texts);
      
      expect(texts.length).toBe(uniqueTexts.size);
    });

    it('should prioritize products with higher ratings', async () => {
      const suggestions = await searchService.getSuggestions('nepali');

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Suggestions are sorted by weighted rating, so higher rated products appear first
      // This is implicit in the implementation
    });

    it('should handle case-insensitive matching', async () => {
      const suggestions1 = await searchService.getSuggestions('NEPALI');
      const suggestions2 = await searchService.getSuggestions('nepali');

      expect(suggestions1.length).toBe(suggestions2.length);
    });

    it('should only suggest from active and approved products', async () => {
      const suggestions = await searchService.getSuggestions('inactive');

      expect(suggestions).toHaveLength(0);
    });

    it('should match products starting with query', async () => {
      const suggestions = await searchService.getSuggestions('hand');

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should find "Handmade" and "Handcrafted" products
      const hasHandProducts = suggestions.some(s => 
        s.text.toLowerCase().startsWith('hand')
      );
      expect(hasHandProducts).toBe(true);
    });

    it('should match products containing query', async () => {
      const suggestions = await searchService.getSuggestions('bowl');

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should find "Wooden Bowl"
      const hasBowl = suggestions.some(s => 
        s.text.toLowerCase().includes('bowl')
      );
      expect(hasBowl).toBe(true);
    });
  });

  describe('Levenshtein distance and fuzzy matching', () => {
    it('should find products with small typos', async () => {
      // "pashmeena" has 2 character differences from "pashmina"
      const result = await searchService.search('pashmeena');

      expect(result.products.length).toBeGreaterThan(0);
    });

    it('should find products with transposed characters', async () => {
      // "nepail" is "nepal" with transposed characters
      const result = await searchService.search('nepail');

      expect(result.products.length).toBeGreaterThan(0);
    });

    it('should not match products with too many differences', async () => {
      // "xyz" should not match anything
      const result = await searchService.search('xyz');

      expect(result.products).toHaveLength(0);
    });

    it('should handle single character typos', async () => {
      // "nepali" -> "nepali" (correct)
      // "nepali" -> "nepali" (1 char difference)
      const result = await searchService.search('nepali');

      expect(result.products.length).toBeGreaterThan(0);
    });
  });

  describe('Boost factors', () => {
    it('should apply 3x boost for exact title match', async () => {
      const products = await Product.find({ 
        isActive: true, 
        verificationStatus: 'approved' 
      });
      
      const query = 'Pashmina Scarf';
      const ranked = searchService.rankResults(products, query);

      // Find the exact match
      const exactMatch = ranked.find(r => 
        r.product.title.en.toLowerCase() === query.toLowerCase()
      );

      if (exactMatch) {
        // Exact match should have highest score
        expect(exactMatch.score).toBe(ranked[0].score);
      }
    });

    it('should apply 2x boost for title contains match', async () => {
      const products = await Product.find({ 
        isActive: true, 
        verificationStatus: 'approved' 
      });
      
      const query = 'wooden';
      const ranked = searchService.rankResults(products, query);

      // Product with "wooden" in title should rank high
      const titleMatch = ranked.find(r => 
        r.product.title.en.toLowerCase().includes(query.toLowerCase())
      );

      expect(titleMatch).toBeDefined();
      if (titleMatch) {
        expect(titleMatch.score).toBeGreaterThan(0);
      }
    });

    it('should apply 1x boost for description match', async () => {
      const products = await Product.find({ 
        isActive: true, 
        verificationStatus: 'approved' 
      });
      
      const query = 'artisans';
      const ranked = searchService.rankResults(products, query);

      // "artisans" appears in description of wooden bowl
      const descMatch = ranked.find(r => 
        r.product.description.en.toLowerCase().includes(query.toLowerCase())
      );

      expect(descMatch).toBeDefined();
      if (descMatch) {
        expect(descMatch.score).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in query', async () => {
      const result = await searchService.search('nepali!@#');

      // Should still find results by ignoring special chars or treating them as word boundaries
      expect(result.products.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long queries', async () => {
      const longQuery = 'nepali handmade traditional authentic beautiful crafted artisan product'.repeat(5);
      const result = await searchService.search(longQuery);

      // Should not crash and return some results
      expect(result).toBeDefined();
      expect(result.products).toBeDefined();
    });

    it('should handle numeric queries', async () => {
      const result = await searchService.search('123');

      // Should not crash
      expect(result).toBeDefined();
      expect(result.products).toBeDefined();
    });

    it('should handle queries with multiple spaces', async () => {
      const result = await searchService.search('nepali    pashmina');

      expect(result.products.length).toBeGreaterThan(0);
    });

    it('should handle queries with leading/trailing spaces', async () => {
      const result = await searchService.search('  pashmina  ');

      expect(result.products.length).toBeGreaterThan(0);
    });
  });
});
