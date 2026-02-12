import { Router } from 'express';
import {
  initiateEsewaPayment,
  verifyEsewaPayment,
  initiateKhaltiPayment,
  verifyKhaltiPayment,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Payment Routes
 * 
 * POST /api/payment/esewa/initiate - Initiate eSewa payment (requires auth)
 * POST /api/payment/esewa/verify - Verify eSewa payment (no auth required for callback)
 * POST /api/payment/khalti/initiate - Initiate Khalti payment (requires auth)
 * POST /api/payment/khalti/verify - Verify Khalti payment (no auth required for callback)
 */

// eSewa routes
router.post('/esewa/initiate', authenticate, initiateEsewaPayment);
router.post('/esewa/verify', verifyEsewaPayment); // No auth required for gateway callback

// Khalti routes
router.post('/khalti/initiate', authenticate, initiateKhaltiPayment);
router.post('/khalti/verify', verifyKhaltiPayment); // No auth required for gateway callback

export default router;
