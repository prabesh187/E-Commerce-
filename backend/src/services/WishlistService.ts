import mongoose from 'mongoose';
import Wishlist, { IWishlist } from '../models/Wishlist.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';

/**
 * Interface for wishlist with populated product details
 */
export interface WishlistWithDetails extends Omit<IWishlist, 'products'> {
  products: Array<{
    _id: mongoose.Types.ObjectId;
    title: { en: string; ne?: string };
    price: number;
    images: string[];
    inventory: number;
    isActive: boolean;
    averageRating: number;
    reviewCount: number;
  }>;
}

/**
 * WishlistService handles wishlist operations
 */
export class WishlistService {
  /**
   * Get user's wishlist with populated product details
   * @param userId - User's ID
   * @returns Wishlist with product details
   */
  async getWishlist(userId: string): Promise<WishlistWithDetails> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    let wishlist = await Wishlist.findOne({ userId }).populate({
      path: 'products',
      select: 'title price images inventory isActive averageRating reviewCount',
    });

    // Create wishlist if it doesn't exist
    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        products: [],
      });
      await wishlist.save();
    }

    return wishlist as unknown as WishlistWithDetails;
  }

  /**
   * Add product to wishlist with duplicate prevention
   * @param userId - User's ID
   * @param productId - Product ID to add
   * @returns Updated wishlist
   * @throws Error if product not found or already in wishlist
   */
  async addToWishlist(
    userId: string,
    productId: string
  ): Promise<WishlistWithDetails> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    // Validate product exists and is available
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.isActive) {
      throw new Error('Product is not available');
    }

    if (product.verificationStatus !== 'approved') {
      throw new Error('Product is not approved');
    }

    // Get or create wishlist
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        products: [],
      });
    }

    // Check if product already in wishlist (duplicate prevention)
    const productExists = wishlist.products.some(
      (id) => id.toString() === productId
    );

    if (productExists) {
      throw new Error('Product already in wishlist');
    }

    // Add product to wishlist
    wishlist.products.push(new mongoose.Types.ObjectId(productId));

    await wishlist.save();

    // Return wishlist with populated product details
    const populatedWishlist = await Wishlist.findById(wishlist._id).populate({
      path: 'products',
      select: 'title price images inventory isActive averageRating reviewCount',
    });

    return populatedWishlist as unknown as WishlistWithDetails;
  }

  /**
   * Remove product from wishlist
   * @param userId - User's ID
   * @param productId - Product ID to remove
   * @returns Updated wishlist
   * @throws Error if wishlist or product not found
   */
  async removeFromWishlist(
    userId: string,
    productId: string
  ): Promise<WishlistWithDetails> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      throw new Error('Wishlist not found');
    }

    // Find product index
    const productIndex = wishlist.products.findIndex(
      (id) => id.toString() === productId
    );

    if (productIndex === -1) {
      throw new Error('Product not found in wishlist');
    }

    // Remove product
    wishlist.products.splice(productIndex, 1);

    await wishlist.save();

    // Return wishlist with populated product details
    const populatedWishlist = await Wishlist.findById(wishlist._id).populate({
      path: 'products',
      select: 'title price images inventory isActive averageRating reviewCount',
    });

    return populatedWishlist as unknown as WishlistWithDetails;
  }

  /**
   * Move product from wishlist to cart
   * @param userId - User's ID
   * @param productId - Product ID to move
   * @param quantity - Quantity to add to cart (default: 1)
   * @returns Updated wishlist
   * @throws Error if product not found or cart operation fails
   */
  async moveToCart(
    userId: string,
    productId: string,
    quantity: number = 1
  ): Promise<WishlistWithDetails> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      throw new Error('Wishlist not found');
    }

    // Check if product is in wishlist
    const productIndex = wishlist.products.findIndex(
      (id) => id.toString() === productId
    );

    if (productIndex === -1) {
      throw new Error('Product not found in wishlist');
    }

    // Validate product exists and is available
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.isActive) {
      throw new Error('Product is not available');
    }

    if (product.verificationStatus !== 'approved') {
      throw new Error('Product is not approved for sale');
    }

    if (quantity > product.inventory) {
      throw new Error(
        `Only ${product.inventory} items available in stock`
      );
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
      });
    }

    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      // Check inventory availability
      if (newQuantity > product.inventory) {
        throw new Error(
          `Only ${product.inventory} items available in stock`
        );
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      cart.items.push({
        productId: new mongoose.Types.ObjectId(productId),
        quantity,
        addedAt: new Date(),
      });
    }

    await cart.save();

    // Remove product from wishlist
    wishlist.products.splice(productIndex, 1);
    await wishlist.save();

    // Return wishlist with populated product details
    const populatedWishlist = await Wishlist.findById(wishlist._id).populate({
      path: 'products',
      select: 'title price images inventory isActive averageRating reviewCount',
    });

    return populatedWishlist as unknown as WishlistWithDetails;
  }
}

// Export singleton instance
export const wishlistService = new WishlistService();
