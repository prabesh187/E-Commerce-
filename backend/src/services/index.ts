export { UserService, userService } from './UserService.js';
export type { RegisterData, TokenPayload, DecodedToken } from './UserService.js';

export { ProductService, productService } from './ProductService.js';
export type {
  CreateProductData,
  UpdateProductData,
  ProductFilters,
  ProductQueryResult,
} from './ProductService.js';

export { ImageService, imageService } from './ImageService.js';
export type {
  ImageSize,
  OptimizedImage,
  ImageUploadResult,
} from './ImageService.js';

export { SearchService, searchService } from './SearchService.js';
export type {
  SearchResult,
  SearchQueryResult,
  Suggestion,
} from './SearchService.js';

export { CartService, cartService } from './CartService.js';
export type {
  CartWithDetails,
  CartTotal,
} from './CartService.js';

export { OrderService, orderService } from './OrderService.js';
export type {
  CreateOrderData,
  OrderWithDetails,
} from './OrderService.js';

export { PaymentService, paymentService } from './PaymentService.js';
export type {
  EsewaPaymentInitiation,
  KhaltiPaymentInitiation,
  PaymentVerificationResult,
} from './PaymentService.js';

export { ReviewService, reviewService } from './ReviewService.js';
export type {
  SubmitReviewData,
  ReviewQueryResult,
} from './ReviewService.js';

export { WishlistService, wishlistService } from './WishlistService.js';
export type {
  WishlistWithDetails,
} from './WishlistService.js';

export { RecentlyViewedService, recentlyViewedService } from './RecentlyViewedService.js';
export type {
  RecentlyViewedWithDetails,
} from './RecentlyViewedService.js';

export { RecommendationService, recommendationService } from './RecommendationService.js';

export { EmailService, emailService } from './EmailService.js';

export { SellerService, sellerService } from './SellerService.js';
export type {
  SellerDashboardAnalytics,
  SellerProductFilters,
  SellerOrderFilters,
} from './SellerService.js';

export { AdminService, adminService } from './AdminService.js';
export type {
  PlatformAnalytics,
  CreateBannerData,
  UpdateBannerData,
} from './AdminService.js';
