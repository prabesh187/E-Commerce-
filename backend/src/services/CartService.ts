import mongoose from 'mongoose';
import Cart, { ICart } from '../models/Cart.js';
import Product from '../models/Product.js';

/**
 * Interface for cart with populated product details
 */
export interface CartWithDetails extends Omit<ICart, 'items'> {
  items: Array<{
    _id: mongoose.Types.ObjectId;
    productId: {
      _id: mongoose.Types.ObjectId;
      title: { en: string; ne?: string };
      price: number;
      images: string[];
      inventory: number;
      isActive: boolean;
    };
    quantity: number;
    addedAt: Date;
  }>;
}



/**
 * CartService handles shopping cart operations
 */
export class CartService {
  /**
   * Get user's cart with populated product details
   * @param userId - User's ID
   * @returns Cart with product details
   */
  async getCart(userId: string): Promise<CartWithDetails> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    let cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'title price images inventory isActive',
    });

    // Create cart if it doesn't exist
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
      });
      await cart.save();
    }

    return cart as unknown as CartWithDetails;
  }

  /**
   * Add product to cart or update quantity if already exists
   * @param userId - User's ID
   * @param productId - Product ID to add
   * @param quantity - Quantity to add (default: 1)
   * @returns Updated cart
   * @throws Error if product not found or invalid quantity
   */
  async addToCart(
    userId: string,
    productId: string,
    quantity: number = 1
  ): Promise<CartWithDetails> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
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
      // Check inventory availability
      if (quantity > product.inventory) {
        throw new Error(
          `Only ${product.inventory} items available in stock`
        );
      }

      // Add new item to cart
      cart.items.push({
        productId: new mongoose.Types.ObjectId(productId),
        quantity,
        addedAt: new Date(),
      });
    }

    await cart.save();

    // Return cart with populated product details
    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.productId',
      select: 'title price images inventory isActive',
    });

    return populatedCart as unknown as CartWithDetails;
  }

  /**
   * Update cart item quantity
   * @param userId - User's ID
   * @param itemId - Cart item ID
   * @param quantity - New quantity
   * @returns Updated cart
   * @throws Error if item not found or invalid quantity
   */
  async updateCartItem(
    userId: string,
    itemId: string,
    quantity: number
  ): Promise<CartWithDetails> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new Error('Invalid item ID');
    }

    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new Error('Cart not found');
    }

    // Find the item in cart using type assertion for _id
    const item = cart.items.find((item) => {
      const cartItem = item as any;
      return cartItem._id && cartItem._id.toString() === itemId;
    });

    if (!item) {
      throw new Error('Item not found in cart');
    }

    // Validate product availability
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.isActive) {
      throw new Error('Product is no longer available');
    }

    if (quantity > product.inventory) {
      throw new Error(
        `Only ${product.inventory} items available in stock`
      );
    }

    // Update quantity
    item.quantity = quantity;

    await cart.save();

    // Return cart with populated product details
    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.productId',
      select: 'title price images inventory isActive',
    });

    return populatedCart as unknown as CartWithDetails;
  }

  /**
   * Remove item from cart
   * @param userId - User's ID
   * @param itemId - Cart item ID to remove
   * @returns Updated cart
   * @throws Error if cart or item not found
   */
  async removeFromCart(
    userId: string,
    itemId: string
  ): Promise<CartWithDetails> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new Error('Invalid item ID');
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new Error('Cart not found');
    }

    // Find item index using type assertion for _id
    const itemIndex = cart.items.findIndex((item) => {
      const cartItem = item as any;
      return cartItem._id && cartItem._id.toString() === itemId;
    });

    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }

    // Remove item
    cart.items.splice(itemIndex, 1);

    await cart.save();

    // Return cart with populated product details
    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.productId',
      select: 'title price images inventory isActive',
    });

    return populatedCart as unknown as CartWithDetails;
  }

  /**
   * Calculate cart total
   * @param cart - Cart with populated product details
   * @returns Total amount (subtotal)
   */
  calculateTotal(cart: any): number {
    let subtotal = 0;

    for (const item of cart.items) {
      // Check if productId is populated
      if (item.productId && typeof item.productId === 'object' && 'price' in item.productId) {
        const product = item.productId as any;
        subtotal += product.price * item.quantity;
      }
    }

    return subtotal;
  }

  /**
   * Clear all items from cart
   * @param userId - User's ID
   * @returns Empty cart
   */
  async clearCart(userId: string): Promise<CartWithDetails> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.items = [];
    await cart.save();

    // Return cart with populated product details (empty)
    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.productId',
      select: 'title price images inventory isActive',
    });

    return populatedCart as unknown as CartWithDetails;
  }
}

// Export singleton instance
export const cartService = new CartService();
