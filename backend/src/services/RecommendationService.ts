import mongoose from 'mongoose';
import Product, { IProduct } from '../models/Product.js';
import Order from '../models/Order.js';
import RecentlyViewed from '../models/RecentlyViewed.js';

/**
 * Interface for product features used in content-based filtering
 */
interface ProductFeatures {
  category: string;
  priceRange: number; // Normalized price range (0-1)
  sellerId: string;
}

/**
 * Interface for user behavior data
 */
interface UserBehavior {
  userId: string;
  viewedProducts: Set<string>;
  purchasedProducts: Set<string>;
}

/**
 * RecommendationService handles product recommendations using collaborative and content-based filtering
 */
export class RecommendationService {
  private readonly COLLABORATIVE_THRESHOLD = 0.3; // Jaccard similarity threshold
  private readonly CONTENT_BASED_THRESHOLD = 0.5; // Cosine similarity threshold
  private readonly RELATED_PRODUCTS_CATEGORY_RATIO = 0.8; // 80% same category requirement

  /**
   * Calculate Jaccard similarity between two sets
   * J(A,B) = |A ∩ B| / |A ∪ B|
   * @param setA - First set
   * @param setB - Second set
   * @returns Jaccard similarity score (0-1)
   */
  private calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) {
      return 0;
    }

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
  }

  /**
   * Calculate cosine similarity between two product feature vectors
   * similarity(A,B) = (A · B) / (||A|| * ||B||)
   * @param featuresA - Features of first product
   * @param featuresB - Features of second product
   * @returns Cosine similarity score (0-1)
   */
  private calculateCosineSimilarity(
    featuresA: ProductFeatures,
    featuresB: ProductFeatures
  ): number {
    // Create feature vectors
    // [category_match, price_similarity, seller_match]
    const categoryMatch = featuresA.category === featuresB.category ? 1 : 0;
    const priceSimilarity = 1 - Math.abs(featuresA.priceRange - featuresB.priceRange);
    const sellerMatch = featuresA.sellerId === featuresB.sellerId ? 1 : 0;

    const vectorA = [categoryMatch, priceSimilarity, sellerMatch];
    const vectorB = [1, 1, 1]; // Perfect match vector

    // Calculate dot product
    const dotProduct = vectorA.reduce((sum, val, idx) => sum + val * vectorB[idx], 0);

    // Calculate magnitudes
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Extract product features for content-based filtering
   * @param product - Product document
   * @param maxPrice - Maximum price for normalization
   * @returns Product features
   */
  private extractProductFeatures(product: IProduct, maxPrice: number): ProductFeatures {
    return {
      category: product.category,
      priceRange: maxPrice > 0 ? product.price / maxPrice : 0,
      sellerId: product.sellerId.toString(),
    };
  }

  /**
   * Get user behavior data (viewed and purchased products)
   * @param userId - User's ID
   * @returns User behavior data
   */
  private async getUserBehavior(userId: string): Promise<UserBehavior> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    // Get viewed products from recently viewed
    const recentlyViewed = await RecentlyViewed.findOne({ userId });
    const viewedProducts = new Set<string>(
      recentlyViewed?.products.map(p => p.productId.toString()) || []
    );

    // Get purchased products from orders
    const orders = await Order.find({
      buyerId: userId,
      status: { $in: ['confirmed', 'shipped', 'delivered'] },
    });

    const purchasedProducts = new Set<string>();
    orders.forEach(order => {
      order.items.forEach(item => {
        purchasedProducts.add(item.productId.toString());
      });
    });

    return {
      userId,
      viewedProducts,
      purchasedProducts,
    };
  }

  /**
   * Get all users' behavior data for collaborative filtering
   * @returns Array of user behavior data
   */
  private async getAllUsersBehavior(): Promise<UserBehavior[]> {
    // Get all recently viewed records
    const allRecentlyViewed = await RecentlyViewed.find({});

    // Get all orders
    const allOrders = await Order.find({
      status: { $in: ['confirmed', 'shipped', 'delivered'] },
    });

    // Build user behavior map
    const userBehaviorMap = new Map<string, UserBehavior>();

    // Add viewed products
    allRecentlyViewed.forEach(rv => {
      const userId = rv.userId.toString();
      if (!userBehaviorMap.has(userId)) {
        userBehaviorMap.set(userId, {
          userId,
          viewedProducts: new Set(),
          purchasedProducts: new Set(),
        });
      }
      const behavior = userBehaviorMap.get(userId)!;
      rv.products.forEach(p => {
        behavior.viewedProducts.add(p.productId.toString());
      });
    });

    // Add purchased products
    allOrders.forEach(order => {
      const userId = order.buyerId.toString();
      if (!userBehaviorMap.has(userId)) {
        userBehaviorMap.set(userId, {
          userId,
          viewedProducts: new Set(),
          purchasedProducts: new Set(),
        });
      }
      const behavior = userBehaviorMap.get(userId)!;
      order.items.forEach(item => {
        behavior.purchasedProducts.add(item.productId.toString());
      });
    });

    return Array.from(userBehaviorMap.values());
  }

  /**
   * Collaborative filtering using Jaccard similarity
   * Recommends products based on similar user behavior
   * @param userId - User's ID
   * @param limit - Maximum number of recommendations
   * @returns Array of recommended products
   */
  async collaborativeFiltering(
    userId: string,
    limit: number = 10
  ): Promise<IProduct[]> {
    // Get current user's behavior
    const userBehavior = await this.getUserBehavior(userId);
    const userProducts = new Set([
      ...userBehavior.viewedProducts,
      ...userBehavior.purchasedProducts,
    ]);

    // If user has no behavior, return empty array
    if (userProducts.size === 0) {
      return [];
    }

    // Get all users' behavior
    const allUsersBehavior = await this.getAllUsersBehavior();

    // Find similar users using Jaccard similarity
    const similarUsers: Array<{ userId: string; similarity: number }> = [];

    for (const otherUser of allUsersBehavior) {
      if (otherUser.userId === userId) {
        continue; // Skip self
      }

      const otherProducts = new Set([
        ...otherUser.viewedProducts,
        ...otherUser.purchasedProducts,
      ]);

      const similarity = this.calculateJaccardSimilarity(userProducts, otherProducts);

      if (similarity >= this.COLLABORATIVE_THRESHOLD) {
        similarUsers.push({
          userId: otherUser.userId,
          similarity,
        });
      }
    }

    // Sort by similarity (highest first)
    similarUsers.sort((a, b) => b.similarity - a.similarity);

    // Collect recommended products from similar users
    const recommendedProductIds = new Set<string>();
    const productScores = new Map<string, number>();

    for (const similarUser of similarUsers) {
      const similarUserBehavior = allUsersBehavior.find(
        u => u.userId === similarUser.userId
      );
      if (!similarUserBehavior) continue;

      const similarUserProducts = new Set([
        ...similarUserBehavior.viewedProducts,
        ...similarUserBehavior.purchasedProducts,
      ]);

      // Add products that similar user has but current user doesn't
      for (const productId of similarUserProducts) {
        if (!userProducts.has(productId)) {
          recommendedProductIds.add(productId);
          // Weight by similarity score
          const currentScore = productScores.get(productId) || 0;
          productScores.set(productId, currentScore + similarUser.similarity);
        }
      }
    }

    // Sort by score and get top products
    const sortedProductIds = Array.from(recommendedProductIds).sort(
      (a, b) => (productScores.get(b) || 0) - (productScores.get(a) || 0)
    );

    const topProductIds = sortedProductIds.slice(0, limit);

    // Fetch and return products
    const products = await Product.find({
      _id: { $in: topProductIds.map(id => new mongoose.Types.ObjectId(id)) },
      isActive: true,
      verificationStatus: 'approved',
    });

    // Sort products by score
    products.sort((a, b) => {
      const scoreA = productScores.get(a._id.toString()) || 0;
      const scoreB = productScores.get(b._id.toString()) || 0;
      return scoreB - scoreA;
    });

    return products;
  }

  /**
   * Content-based filtering using cosine similarity
   * Recommends products similar to a given product
   * @param productId - Product ID to find similar products for
   * @param limit - Maximum number of recommendations
   * @returns Array of similar products
   */
  async contentBasedFiltering(
    productId: string,
    limit: number = 10
  ): Promise<IProduct[]> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    // Get the source product
    const sourceProduct = await Product.findById(productId);
    if (!sourceProduct) {
      throw new Error('Product not found');
    }

    // Get all active products except the source
    const allProducts = await Product.find({
      _id: { $ne: productId },
      isActive: true,
      verificationStatus: 'approved',
    });

    if (allProducts.length === 0) {
      return [];
    }

    // Find max price for normalization
    const maxPrice = Math.max(
      sourceProduct.price,
      ...allProducts.map(p => p.price)
    );

    // Extract features for source product
    const sourceFeatures = this.extractProductFeatures(sourceProduct, maxPrice);

    // Calculate similarity for each product
    const productSimilarities: Array<{ product: IProduct; similarity: number }> = [];

    for (const product of allProducts) {
      const productFeatures = this.extractProductFeatures(product, maxPrice);
      const similarity = this.calculateCosineSimilarity(sourceFeatures, productFeatures);

      if (similarity >= this.CONTENT_BASED_THRESHOLD) {
        productSimilarities.push({ product, similarity });
      }
    }

    // Sort by similarity (highest first)
    productSimilarities.sort((a, b) => b.similarity - a.similarity);

    // Return top products
    return productSimilarities.slice(0, limit).map(ps => ps.product);
  }

  /**
   * Get personalized recommendations combining collaborative and content-based filtering
   * @param userId - User's ID
   * @param limit - Maximum number of recommendations
   * @returns Array of recommended products
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<IProduct[]> {
    // Get recommendations from both approaches
    const collaborativeResults = await this.collaborativeFiltering(userId, limit);
    const userBehavior = await this.getUserBehavior(userId);

    // Get content-based recommendations for recently viewed products
    const contentBasedResults: IProduct[] = [];
    const viewedProductIds = Array.from(userBehavior.viewedProducts);

    // Get content-based recommendations from the most recent viewed products
    for (const viewedProductId of viewedProductIds.slice(0, 3)) {
      try {
        const similar = await this.contentBasedFiltering(viewedProductId, 5);
        contentBasedResults.push(...similar);
      } catch (error) {
        // Skip if product not found
        continue;
      }
    }

    // Combine results and remove duplicates
    const combinedProducts = new Map<string, IProduct>();

    // Add collaborative results (higher priority)
    collaborativeResults.forEach(product => {
      combinedProducts.set(product._id.toString(), product);
    });

    // Add content-based results
    contentBasedResults.forEach(product => {
      if (!combinedProducts.has(product._id.toString())) {
        combinedProducts.set(product._id.toString(), product);
      }
    });

    // Remove products user has already viewed or purchased
    const userProducts = new Set([
      ...userBehavior.viewedProducts,
      ...userBehavior.purchasedProducts,
    ]);

    const filteredProducts = Array.from(combinedProducts.values()).filter(
      product => !userProducts.has(product._id.toString())
    );

    // Return top products
    return filteredProducts.slice(0, limit);
  }

  /**
   * Get related products for a given product
   * At least 80% must be from the same category
   * @param productId - Product ID to find related products for
   * @param limit - Maximum number of related products
   * @returns Array of related products
   */
  async getRelatedProducts(
    productId: string,
    limit: number = 10
  ): Promise<IProduct[]> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    // Get the source product
    const sourceProduct = await Product.findById(productId);
    if (!sourceProduct) {
      throw new Error('Product not found');
    }

    // Calculate how many products should be from same category (80%)
    const sameCategoryCount = Math.ceil(limit * this.RELATED_PRODUCTS_CATEGORY_RATIO);
    const otherCategoryCount = limit - sameCategoryCount;

    // Get products from same category
    const sameCategoryProducts = await Product.find({
      _id: { $ne: productId },
      category: sourceProduct.category,
      isActive: true,
      verificationStatus: 'approved',
    })
      .sort({ weightedRating: -1 })
      .limit(sameCategoryCount);

    // Only get products from other categories if we have enough same-category products
    let otherProducts: IProduct[] = [];
    if (sameCategoryProducts.length >= sameCategoryCount && otherCategoryCount > 0) {
      // Get products from other categories (similar price range or same seller)
      const priceMin = sourceProduct.price * 0.5;
      const priceMax = sourceProduct.price * 1.5;

      otherProducts = await Product.find({
        _id: { $ne: productId },
        category: { $ne: sourceProduct.category },
        $or: [
          { price: { $gte: priceMin, $lte: priceMax } },
          { sellerId: sourceProduct.sellerId },
        ],
        isActive: true,
        verificationStatus: 'approved',
      })
        .sort({ weightedRating: -1 })
        .limit(otherCategoryCount);
    } else if (sameCategoryProducts.length < sameCategoryCount) {
      // If we don't have enough same-category products, fill with more from same category
      // This ensures we maintain the 80% requirement
      const additionalNeeded = limit - sameCategoryProducts.length;
      const additionalProducts = await Product.find({
        _id: { $ne: productId },
        category: sourceProduct.category,
        isActive: true,
        verificationStatus: 'approved',
      })
        .sort({ weightedRating: -1 })
        .skip(sameCategoryProducts.length)
        .limit(additionalNeeded);
      
      sameCategoryProducts.push(...additionalProducts);
    }

    // Combine results and sort by weighted rating
    const relatedProducts = [...sameCategoryProducts, ...otherProducts];
    relatedProducts.sort((a, b) => b.weightedRating - a.weightedRating);

    return relatedProducts;
  }

  /**
   * Track product view for behavior tracking
   * This is a convenience method that delegates to RecentlyViewedService
   * @param userId - User's ID
   * @param productId - Product ID that was viewed
   */
  async trackProductView(userId: string, productId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Get or create recently viewed list
    let recentlyViewed = await RecentlyViewed.findOne({ userId });
    if (!recentlyViewed) {
      recentlyViewed = new RecentlyViewed({
        userId,
        products: [],
      });
    }

    // Remove product if it already exists (to update timestamp)
    recentlyViewed.products = recentlyViewed.products.filter(
      (item) => item.productId.toString() !== productId
    );

    // Add product at the beginning with current timestamp
    recentlyViewed.products.unshift({
      productId: new mongoose.Types.ObjectId(productId),
      viewedAt: new Date(),
    });

    // Maintain size limit (max 20 items)
    if (recentlyViewed.products.length > 20) {
      recentlyViewed.products = recentlyViewed.products.slice(0, 20);
    }

    await recentlyViewed.save();

    // Increment view count on product
    await Product.findByIdAndUpdate(productId, {
      $inc: { viewCount: 1 },
    });
  }
}

// Export singleton instance
export const recommendationService = new RecommendationService();
