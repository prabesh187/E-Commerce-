import mongoose from 'mongoose';
import Product, { IProduct, IBilingualText } from '../models/Product.js';
import User from '../models/User.js';

/**
 * Interface for product creation data
 */
export interface CreateProductData {
  title: IBilingualText;
  description: IBilingualText;
  price: number;
  category: 'food' | 'handicrafts' | 'clothing' | 'electronics' | 'other';
  images: string[];
  inventory: number;
  madeInNepalProof?: string;
}

/**
 * Interface for product update data
 */
export interface UpdateProductData {
  title?: IBilingualText;
  description?: IBilingualText;
  price?: number;
  category?: 'food' | 'handicrafts' | 'clothing' | 'electronics' | 'other';
  images?: string[];
  inventory?: number;
  madeInNepalProof?: string;
  isActive?: boolean;
}

/**
 * Interface for product filtering options
 */
export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sellerId?: string;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
}

/**
 * Interface for product query result
 */
export interface ProductQueryResult {
  products: IProduct[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

/**
 * ProductService handles product management operations
 */
export class ProductService {
  /**
   * Validate required fields for product creation
   */
  private validateProductData(productData: CreateProductData): void {
    const errors: string[] = [];

    if (!productData.title?.en) {
      errors.push('Product title (English) is required');
    }

    if (!productData.description?.en) {
      errors.push('Product description (English) is required');
    }

    if (productData.price === undefined || productData.price === null) {
      errors.push('Product price is required');
    } else if (productData.price < 0) {
      errors.push('Product price cannot be negative');
    }

    if (!productData.category) {
      errors.push('Product category is required');
    }

    if (!productData.images || productData.images.length === 0) {
      errors.push('At least one product image is required');
    }

    if (productData.inventory === undefined || productData.inventory === null) {
      errors.push('Product inventory is required');
    } else if (productData.inventory < 0) {
      errors.push('Product inventory cannot be negative');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('. '));
    }
  }

  /**
   * Verify that seller is approved before allowing product creation
   */
  private async verifySeller(sellerId: string): Promise<void> {
    const seller = await User.findById(sellerId);

    if (!seller) {
      throw new Error('Seller not found');
    }

    if (seller.role !== 'seller') {
      throw new Error('User is not a seller');
    }

    if (seller.verificationStatus !== 'approved') {
      throw new Error(
        `Seller verification is ${seller.verificationStatus}. Only approved sellers can create products.`
      );
    }
  }

  /**
   * Calculate weighted rating for a product
   * Formula: (averageRating * reviewCount) / (reviewCount + K)
   * where K = 10 (confidence parameter)
   * @param averageRating - Average rating of the product
   * @param reviewCount - Number of reviews
   * @returns Weighted rating
   */
  calculateWeightedRating(averageRating: number, reviewCount: number): number {
    const K = 10; // Confidence parameter
    return (averageRating * reviewCount) / (reviewCount + K);
  }

  /**
   * Create a new product
   * @param productData - Product creation data
   * @param sellerId - ID of the seller creating the product
   * @returns Created product
   * @throws Error if validation fails or seller is not verified
   */
  async createProduct(
    productData: CreateProductData,
    sellerId: string
  ): Promise<IProduct> {
    // Validate product data
    this.validateProductData(productData);

    // Verify seller is approved
    await this.verifySeller(sellerId);

    // Create product with default values
    const product = new Product({
      ...productData,
      sellerId,
      verificationStatus: 'pending',
      averageRating: 0,
      reviewCount: 0,
      weightedRating: 0,
      viewCount: 0,
      purchaseCount: 0,
      isActive: true,
    });

    await product.save();

    return product;
  }

  /**
   * Get product by ID with populated seller information
   * @param productId - Product ID
   * @returns Product with seller info
   * @throws Error if product not found
   */
  async getProductById(productId: string): Promise<IProduct> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    const product = await Product.findById(productId).populate(
      'sellerId',
      'firstName lastName businessName email phone'
    );

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Update product with ownership verification
   * @param productId - Product ID
   * @param updates - Product update data
   * @param sellerId - ID of the seller updating the product
   * @returns Updated product
   * @throws Error if product not found or seller doesn't own the product
   */
  async updateProduct(
    productId: string,
    updates: UpdateProductData,
    sellerId: string
  ): Promise<IProduct> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    const product = await Product.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    // Verify ownership
    if (product.sellerId.toString() !== sellerId) {
      throw new Error('You do not have permission to update this product');
    }

    // Validate price if being updated
    if (updates.price !== undefined && updates.price < 0) {
      throw new Error('Product price cannot be negative');
    }

    // Validate inventory if being updated
    if (updates.inventory !== undefined && updates.inventory < 0) {
      throw new Error('Product inventory cannot be negative');
    }

    // Validate images if being updated
    if (updates.images !== undefined && updates.images.length === 0) {
      throw new Error('At least one product image is required');
    }

    // Apply updates
    Object.assign(product, updates);

    await product.save();

    return product;
  }

  /**
   * Delete product with ownership verification
   * @param productId - Product ID
   * @param sellerId - ID of the seller deleting the product
   * @throws Error if product not found or seller doesn't own the product
   */
  async deleteProduct(productId: string, sellerId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    const product = await Product.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    // Verify ownership
    if (product.sellerId.toString() !== sellerId) {
      throw new Error('You do not have permission to delete this product');
    }

    await Product.findByIdAndDelete(productId);
  }

  /**
   * Get products with filtering, sorting, and pagination
   * @param filters - Filter criteria
   * @param sortBy - Sort option (price-asc, price-desc, rating, popularity, newest, weighted-rating)
   * @param page - Page number (1-indexed)
   * @param limit - Number of products per page
   * @returns Products with pagination info
   */
  async getProducts(
    filters: ProductFilters = {},
    sortBy: string = 'weighted-rating',
    page: number = 1,
    limit: number = 20
  ): Promise<ProductQueryResult> {
    // Build query
    const query: any = { isActive: true };

    // Apply category filter
    if (filters.category) {
      query.category = filters.category;
    }

    // Apply price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.price = {};
      if (filters.minPrice !== undefined) {
        query.price.$gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        query.price.$lte = filters.maxPrice;
      }
    }

    // Apply rating filter
    if (filters.minRating !== undefined) {
      query.averageRating = { $gte: filters.minRating };
    }

    // Apply seller filter
    if (filters.sellerId) {
      query.sellerId = filters.sellerId;
    }

    // Apply verification status filter
    if (filters.verificationStatus) {
      query.verificationStatus = filters.verificationStatus;
    }

    // Build sort criteria
    let sort: any = {};
    switch (sortBy) {
      case 'price-asc':
        sort = { price: 1 };
        break;
      case 'price-desc':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { averageRating: -1, reviewCount: -1 };
        break;
      case 'popularity':
        sort = { purchaseCount: -1, viewCount: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'weighted-rating':
      default:
        sort = { weightedRating: -1 };
        break;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [products, totalCount] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('sellerId', 'firstName lastName businessName'),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      products,
      totalPages,
      currentPage: page,
      totalCount,
    };
  }

  /**
   * Get related products based on category and seller
   * @param productId - Product ID
   * @param limit - Maximum number of related products
   * @returns Related products
   */
  async getRelatedProducts(
    productId: string,
    limit: number = 10
  ): Promise<IProduct[]> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    const product = await Product.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    // Find products in the same category or from the same seller
    // Exclude the current product
    const relatedProducts = await Product.find({
      _id: { $ne: productId },
      isActive: true,
      verificationStatus: 'approved',
      $or: [
        { category: product.category },
        { sellerId: product.sellerId },
      ],
    })
      .sort({ weightedRating: -1 })
      .limit(limit)
      .populate('sellerId', 'firstName lastName businessName');

    return relatedProducts;
  }

  /**
   * Update product rating after a review is added or updated
   * @param productId - Product ID
   * @param newAverageRating - New average rating
   * @param newReviewCount - New review count
   */
  async updateProductRating(
    productId: string,
    newAverageRating: number,
    newReviewCount: number
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    const weightedRating = this.calculateWeightedRating(
      newAverageRating,
      newReviewCount
    );

    await Product.findByIdAndUpdate(productId, {
      averageRating: newAverageRating,
      reviewCount: newReviewCount,
      weightedRating,
    });
  }

  /**
   * Increment product view count
   * @param productId - Product ID
   */
  async incrementViewCount(productId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    await Product.findByIdAndUpdate(productId, {
      $inc: { viewCount: 1 },
    });
  }

  /**
   * Increment product purchase count
   * @param productId - Product ID
   * @param quantity - Quantity purchased
   */
  async incrementPurchaseCount(
    productId: string,
    quantity: number = 1
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    await Product.findByIdAndUpdate(productId, {
      $inc: { purchaseCount: quantity },
    });
  }
}

// Export singleton instance
export const productService = new ProductService();
