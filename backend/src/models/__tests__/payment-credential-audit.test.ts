import mongoose from 'mongoose';
import Payment from '../Payment';
import User from '../User';
import Order from '../Order';
import Cart from '../Cart';
import Product from '../Product';
import Banner from '../Banner';
import RecentlyViewed from '../RecentlyViewed';
import Review from '../Review';
import Wishlist from '../Wishlist';

/**
 * Security Audit: Payment Credential Storage
 * 
 * **Validates: Requirements 18.3**
 * 
 * This test suite audits all database models to ensure compliance with
 * Requirement 18.3: "THE Platform SHALL not store credit card or payment gateway credentials"
 * 
 * Forbidden fields include:
 * - Credit card numbers (cardNumber, creditCard, ccNumber, etc.)
 * - CVV/CVC codes (cvv, cvc, securityCode, etc.)
 * - Card expiry dates (expiryDate, expMonth, expYear, etc.)
 * - Payment gateway API keys/secrets (apiKey, apiSecret, merchantKey, etc.)
 * - Bank account details (accountNumber, routingNumber, etc.)
 * - PIN codes or passwords for payment systems
 */

describe('Payment Credential Storage Audit', () => {
  // List of forbidden field patterns that indicate payment credential storage
  const forbiddenPatterns = [
    // Credit card related
    /card.*number/i,
    /credit.*card/i,
    /debit.*card/i,
    /cc.*number/i,
    /pan/i, // Primary Account Number
    
    // Security codes
    /cvv/i,
    /cvc/i,
    /security.*code/i,
    /card.*code/i,
    
    // Expiry information
    /expir/i,
    /exp.*month/i,
    /exp.*year/i,
    /valid.*thru/i,
    
    // Payment gateway credentials
    /api.*key/i,
    /api.*secret/i,
    /merchant.*key/i,
    /merchant.*secret/i,
    /gateway.*key/i,
    /gateway.*secret/i,
    /gateway.*password/i,
    /gateway.*credential/i,
    
    // Bank account details
    /account.*number/i,
    /routing.*number/i,
    /iban/i,
    /swift/i,
    /bank.*account/i,
    
    // PIN and passwords
    /pin.*code/i,
    /payment.*password/i,
    /payment.*pin/i,
  ];

  /**
   * Helper function to extract all field paths from a Mongoose schema
   */
  function getSchemaFields(schema: mongoose.Schema): string[] {
    const fields: string[] = [];
    
    schema.eachPath((path) => {
      fields.push(path);
    });
    
    return fields;
  }

  /**
   * Helper function to check if a field name matches forbidden patterns
   */
  function isForbiddenField(fieldName: string): boolean {
    return forbiddenPatterns.some(pattern => pattern.test(fieldName));
  }

  describe('Payment Model', () => {
    it('should only store transaction IDs and payment status, not sensitive payment data', () => {
      const fields = getSchemaFields(Payment.schema);
      
      // Check for forbidden fields
      const forbiddenFields = fields.filter(isForbiddenField);
      
      expect(forbiddenFields).toEqual([]);
      
      // Verify allowed fields are present
      expect(fields).toContain('orderId');
      expect(fields).toContain('gateway');
      expect(fields).toContain('transactionId');
      expect(fields).toContain('amount');
      expect(fields).toContain('status');
      
      // Verify NO credit card fields
      expect(fields).not.toContain('cardNumber');
      expect(fields).not.toContain('cvv');
      expect(fields).not.toContain('expiryDate');
      expect(fields).not.toContain('apiKey');
      expect(fields).not.toContain('apiSecret');
    });

    it('should not have any fields matching forbidden payment credential patterns', () => {
      const fields = getSchemaFields(Payment.schema);
      const violations: string[] = [];
      
      fields.forEach(field => {
        forbiddenPatterns.forEach(pattern => {
          if (pattern.test(field)) {
            violations.push(`Field "${field}" matches forbidden pattern: ${pattern}`);
          }
        });
      });
      
      expect(violations).toEqual([]);
    });
  });

  describe('User Model', () => {
    it('should not store any payment credentials', () => {
      const fields = getSchemaFields(User.schema);
      const forbiddenFields = fields.filter(isForbiddenField);
      
      expect(forbiddenFields).toEqual([]);
    });
  });

  describe('Order Model', () => {
    it('should only store payment method and transaction ID reference, not credentials', () => {
      const fields = getSchemaFields(Order.schema);
      const forbiddenFields = fields.filter(isForbiddenField);
      
      expect(forbiddenFields).toEqual([]);
      
      // Verify it only has safe payment references
      expect(fields).toContain('paymentMethod');
      expect(fields).toContain('paymentTransactionId');
      expect(fields).toContain('paymentStatus');
      
      // Verify NO sensitive payment data
      expect(fields).not.toContain('cardNumber');
      expect(fields).not.toContain('cvv');
    });
  });

  describe('Cart Model', () => {
    it('should not store any payment credentials', () => {
      const fields = getSchemaFields(Cart.schema);
      const forbiddenFields = fields.filter(isForbiddenField);
      
      expect(forbiddenFields).toEqual([]);
    });
  });

  describe('Product Model', () => {
    it('should not store any payment credentials', () => {
      const fields = getSchemaFields(Product.schema);
      const forbiddenFields = fields.filter(isForbiddenField);
      
      expect(forbiddenFields).toEqual([]);
    });
  });

  describe('Banner Model', () => {
    it('should not store any payment credentials', () => {
      const fields = getSchemaFields(Banner.schema);
      const forbiddenFields = fields.filter(isForbiddenField);
      
      expect(forbiddenFields).toEqual([]);
    });
  });

  describe('RecentlyViewed Model', () => {
    it('should not store any payment credentials', () => {
      const fields = getSchemaFields(RecentlyViewed.schema);
      const forbiddenFields = fields.filter(isForbiddenField);
      
      expect(forbiddenFields).toEqual([]);
    });
  });

  describe('Review Model', () => {
    it('should not store any payment credentials', () => {
      const fields = getSchemaFields(Review.schema);
      const forbiddenFields = fields.filter(isForbiddenField);
      
      expect(forbiddenFields).toEqual([]);
    });
  });

  describe('Wishlist Model', () => {
    it('should not store any payment credentials', () => {
      const fields = getSchemaFields(Wishlist.schema);
      const forbiddenFields = fields.filter(isForbiddenField);
      
      expect(forbiddenFields).toEqual([]);
    });
  });

  describe('Comprehensive Audit', () => {
    it('should verify all models are free of payment credentials', () => {
      const models = [
        { name: 'Payment', model: Payment },
        { name: 'User', model: User },
        { name: 'Order', model: Order },
        { name: 'Cart', model: Cart },
        { name: 'Product', model: Product },
        { name: 'Banner', model: Banner },
        { name: 'RecentlyViewed', model: RecentlyViewed },
        { name: 'Review', model: Review },
        { name: 'Wishlist', model: Wishlist },
      ];

      const auditResults: { model: string; violations: string[] }[] = [];

      models.forEach(({ name, model }) => {
        const fields = getSchemaFields(model.schema);
        const violations = fields.filter(isForbiddenField);
        
        if (violations.length > 0) {
          auditResults.push({ model: name, violations });
        }
      });

      // Report any violations
      if (auditResults.length > 0) {
        const report = auditResults.map(
          ({ model, violations }) =>
            `${model}: ${violations.join(', ')}`
        ).join('\n');
        
        fail(`Payment credential violations found:\n${report}`);
      }

      expect(auditResults).toEqual([]);
    });
  });
});
