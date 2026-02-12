# Implementation Plan: Made in Nepal E-Commerce Platform

## Overview

This implementation plan breaks down the Made in Nepal E-Commerce Platform into discrete, incremental coding tasks. The approach follows a layered architecture: database models → backend services → API endpoints → frontend components. Each task builds on previous work, with testing integrated throughout to catch errors early. The plan prioritizes core functionality first (authentication, products, cart, orders) before adding enhancements (recommendations, notifications, admin features).

## Tasks

- [x] 1. Project Setup and Infrastructure
  - Initialize Node.js/Express backend with TypeScript
  - Initialize React.js frontend with TypeScript and Vite
  - Configure MongoDB connection with Mongoose
  - Set up environment variables for configuration
  - Configure ESLint and Prettier for code quality
  - Set up Jest and fast-check for testing
  - Create basic folder structure (models, services, controllers, routes, middleware)
  - _Requirements: All requirements depend on proper project setup_

- [x] 2. Database Models and Schemas
  - [x] 2.1 Create User model with authentication fields
    - Define User schema with email, phone, password, role, verification status
    - Add seller-specific fields (businessName, businessAddress, documents)
    - Add buyer-specific fields (shippingAddresses array)
    - Implement password hashing pre-save hook using bcrypt
    - Create indexes for email, phone, and role+verificationStatus
    - _Requirements: 4.1, 4.2, 5.1_
  
  - [ ]* 2.2 Write property test for password hashing
    - **Property 50: Password Hashing**
    - **Validates: Requirements 18.1**
  
  - [x] 2.3 Create Product model with multilingual support
    - Define Product schema with bilingual title/description
    - Add price, category, images, inventory, seller reference
    - Add calculated fields (averageRating, reviewCount, weightedRating, viewCount, purchaseCount)
    - Create text index for search and compound indexes for filtering/sorting
    - _Requirements: 1.1, 1.2, 1.3, 14.4_
  
  - [ ]* 2.4 Write property test for product field completeness
    - **Property 2: Product Detail Completeness**
    - **Validates: Requirements 1.3**

  - [x] 2.5 Create Order model with status tracking
    - Define Order schema with orderNumber, buyer, items array, shipping address
    - Add payment fields (method, status, transactionId)
    - Add status field with timestamps for each status change
    - Create indexes for orderNumber, buyerId, and seller IDs in items
    - _Requirements: 8.1, 8.2, 6.1_
  
  - [ ]* 2.6 Write property test for unique order tracking numbers
    - **Property 25: Unique Order Tracking Numbers**
    - **Validates: Requirements 8.1**
  
  - [x] 2.7 Create Review, Cart, Wishlist, RecentlyViewed, and Banner models
    - Define Review schema with product, buyer, order, rating, text
    - Define Cart schema with user and items array
    - Define Wishlist schema with user and products array
    - Define RecentlyViewed schema with user and products with timestamps
    - Define Banner schema with bilingual title, image, link, active status
    - Create appropriate indexes for each model
    - _Requirements: 7.1, 3.1, 11.1, 13.1, 9.5_

- [x] 3. Authentication and User Management
  - [x] 3.1 Implement UserService with registration and login
    - Create register method with email/phone validation
    - Implement password strength validation (min 8 chars, mixed case, numbers)
    - Create login method with credential verification
    - Implement JWT token generation with user ID and role
    - Create token verification method
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 3.2 Write property test for password strength validation
    - **Property 12: Password Strength Validation**
    - **Validates: Requirements 4.2**
  
  - [ ]* 3.3 Write property test for authentication with valid credentials
    - **Property 13: Authentication Success for Valid Credentials**
    - **Validates: Requirements 4.3**
  
  - [x] 3.4 Create authentication middleware
    - Implement JWT verification middleware
    - Create role-based authorization middleware (requireRole)
    - Implement rate limiting middleware (100 requests per minute per IP)
    - Create CSRF protection middleware
    - _Requirements: 4.3, 4.5, 18.4, 18.6_
  
  - [ ]* 3.5 Write property test for rate limiting enforcement
    - **Property 52: Rate Limiting Enforcement**
    - **Validates: Requirements 18.4**
  
  - [x] 3.6 Create authentication API endpoints
    - POST /api/auth/register - user registration
    - POST /api/auth/login - user login
    - POST /api/auth/logout - user logout
    - GET /api/auth/me - get current user
    - Apply authentication middleware to protected routes
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Product Management Services and APIs
  - [x] 4.1 Implement ProductService core methods
    - Create createProduct method with validation and seller verification check
    - Implement getProductById with population of seller info
    - Create updateProduct with ownership verification
    - Implement deleteProduct with ownership verification
    - Create getProducts with filtering (category, price range, rating) and sorting
    - Implement calculateWeightedRating method: (avgRating * count) / (count + 10)
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.3, 5.5, 7.4, 10.2, 10.4_
  
  - [ ]* 4.2 Write property test for unverified seller rejection
    - **Property 14: Unverified Seller Product Creation Rejection**
    - **Validates: Requirements 5.1**
  
  - [ ]* 4.3 Write property test for product creation required fields
    - **Property 15: Product Creation Required Fields**
    - **Validates: Requirements 5.3**
  
  - [ ]* 4.4 Write property test for weighted rating calculation
    - **Property 24: Weighted Rating Formula**
    - **Validates: Requirements 7.4**
  
  - [x] 4.5 Implement image upload and optimization
    - Create image upload endpoint using multer
    - Implement image optimization using sharp (resize, compress)
    - Store optimized images and return URLs
    - Generate multiple sizes for responsive images
    - _Requirements: 5.4, 15.4, 16.2_
  
  - [ ]* 4.6 Write property test for image optimization
    - **Property 16: Image Optimization Reduces Size**
    - **Validates: Requirements 5.4, 16.2**
  
  - [x] 4.7 Create product API endpoints
    - GET /api/products - list products with filters and sorting
    - GET /api/products/:id - get product details
    - POST /api/products - create product (seller only)
    - PUT /api/products/:id - update product (seller only)
    - DELETE /api/products/:id - delete product (seller only)
    - POST /api/products/upload-image - upload and optimize images
    - Apply authentication and authorization middleware
    - _Requirements: 1.1, 1.2, 1.3, 5.3, 5.5, 10.1, 10.3_
  
  - [ ]* 4.8 Write property tests for filtering and sorting
    - **Property 1: Category Filtering Correctness**
    - **Property 29: Filter Application Correctness**
    - **Property 30: Sort Order Correctness**
    - **Validates: Requirements 1.2, 10.2, 10.4**

- [x] 5. Search Functionality
  - [x] 5.1 Implement SearchService with text search
    - Create search method using MongoDB text search
    - Implement fuzzy matching using Levenshtein distance (threshold: 2)
    - Create rankResults method with TF-IDF scoring and boost factors
    - Implement getSuggestions method for autocomplete
    - Apply boost factors: exact title match (3x), title contains (2x), description (1x)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 5.2 Write property tests for search functionality
    - **Property 5: Autocomplete Substring Matching**
    - **Property 6: Search Result Relevance**
    - **Property 7: Search Ranking Boost**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
  
  - [x] 5.3 Create search API endpoints
    - GET /api/search - search products with query
    - GET /api/search/suggestions - get autocomplete suggestions
    - _Requirements: 2.1, 2.2_

- [x] 6. Shopping Cart Management
  - [x] 6.1 Implement CartService
    - Create getCart method to retrieve user's cart
    - Implement addToCart with product validation and quantity handling
    - Create updateCartItem to modify quantities
    - Implement removeFromCart to delete items
    - Create calculateTotal method: sum of (price × quantity) for all items
    - Implement clearCart method
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 6.2 Write property tests for cart operations
    - **Property 8: Cart Addition Increases Size**
    - **Property 9: Cart Total Calculation**
    - **Property 10: Cart Removal Decreases Size**
    - **Property 11: Cart Persistence Round Trip**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
  
  - [x] 6.3 Create cart API endpoints
    - GET /api/cart - get user's cart
    - POST /api/cart - add item to cart
    - PUT /api/cart/:itemId - update item quantity
    - DELETE /api/cart/:itemId - remove item from cart
    - Apply authentication middleware
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7. Order Management and Payment Integration
  - [x] 7.1 Implement OrderService core methods
    - Create createOrder method with cart validation
    - Implement generateTrackingNumber (format: MN-YYYY-NNNNNN)
    - Create getOrderById with authorization check
    - Implement getUserOrders for buyer order history
    - Create getSellerOrders for seller dashboard
    - Implement updateOrderStatus with timestamp tracking
    - _Requirements: 6.3, 6.4, 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 7.2 Write property tests for order operations
    - **Property 19: Successful Payment Creates Order**
    - **Property 26: Order Status Validity**
    - **Property 28: Order Detail Completeness**
    - **Validates: Requirements 6.3, 8.2, 8.4**
  
  - [x] 7.3 Implement PaymentService for eSewa and Khalti
    - Create initiateEsewaPayment method with API integration
    - Implement verifyEsewaPayment for callback handling
    - Create initiateKhaltiPayment method with API integration
    - Implement verifyKhaltiPayment for callback handling
    - Create handlePaymentCallback for gateway redirects
    - Store payment transaction records
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_
  
  - [ ]* 7.4 Write property tests for payment operations
    - **Property 18: Payment Gateway Redirection**
    - **Property 20: Failed Payment Preserves Cart**
    - **Property 21: Payment Transaction Persistence**
    - **Validates: Requirements 6.2, 6.5, 6.6**
  
  - [x] 7.5 Create order and payment API endpoints
    - POST /api/orders - create order with payment method
    - GET /api/orders - get user's order history
    - GET /api/orders/:id - get order details
    - PUT /api/orders/:id/status - update order status (seller/admin)
    - POST /api/payment/esewa/initiate - initiate eSewa payment
    - POST /api/payment/esewa/verify - verify eSewa payment
    - POST /api/payment/khalti/initiate - initiate Khalti payment
    - POST /api/payment/khalti/verify - verify Khalti payment
    - Apply authentication and authorization middleware
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.1, 8.3, 8.4, 8.5_

- [x] 8. Checkpoint - Core Backend Functionality Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Reviews and Ratings
  - [x] 9.1 Implement ReviewService
    - Create submitReview with purchase verification
    - Implement getProductReviews with pagination
    - Create updateProductRating to recalculate averages
    - Implement preventDuplicateReview check
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [ ]* 9.2 Write property tests for review operations
    - **Property 22: Review Authorization**
    - **Property 23: Average Rating Calculation**
    - **Validates: Requirements 7.1, 7.3, 7.5**
  
  - [x] 9.3 Create review API endpoints
    - GET /api/products/:id/reviews - get product reviews
    - POST /api/products/:id/reviews - submit review
    - Apply authentication middleware
    - _Requirements: 7.1, 7.2_

- [x] 10. Wishlist and Recently Viewed
  - [x] 10.1 Implement WishlistService
    - Create getWishlist method
    - Implement addToWishlist with duplicate prevention
    - Create removeFromWishlist method
    - Implement moveToCart method
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ]* 10.2 Write property tests for wishlist operations
    - **Property 32: Wishlist Addition Increases Size**
    - **Property 33: Wishlist Removal Decreases Size**
    - **Property 34: Wishlist to Cart Transfer**
    - **Property 35: Wishlist Persistence Round Trip**
    - **Validates: Requirements 11.1, 11.3, 11.4, 11.5**
  
  - [x] 10.3 Implement RecentlyViewedService
    - Create trackProductView method with timestamp
    - Implement getRecentlyViewed with chronological ordering
    - Create maintainSizeLimit method (max 20 items)
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [ ]* 10.4 Write property tests for recently viewed
    - **Property 40: Recently Viewed Recording**
    - **Property 41: Recently Viewed Chronological Order**
    - **Property 42: Recently Viewed Size Limit**
    - **Validates: Requirements 13.1, 13.2, 13.3**
  
  - [x] 10.5 Create wishlist and recently viewed API endpoints
    - GET /api/wishlist - get user's wishlist
    - POST /api/wishlist - add product to wishlist
    - DELETE /api/wishlist/:productId - remove from wishlist
    - POST /api/wishlist/:productId/move-to-cart - move to cart
    - GET /api/recently-viewed - get recently viewed products
    - Apply authentication middleware
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 13.1, 13.2_

- [x] 11. Recommendation Engine
  - [x] 11.1 Implement RecommendationService
    - Create collaborativeFiltering method using Jaccard similarity (threshold: 0.3)
    - Implement contentBasedFiltering using cosine similarity (threshold: 0.5)
    - Create getPersonalizedRecommendations combining both approaches
    - Implement getRelatedProducts (80% same category requirement)
    - Create trackProductView for behavior tracking
    - _Requirements: 1.6, 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [ ]* 11.2 Write property tests for recommendations
    - **Property 4: Related Products Relevance**
    - **Property 47: Collaborative Filtering Similarity**
    - **Property 48: Content-Based Filtering Similarity**
    - **Property 49: Related Products Same Category**
    - **Validates: Requirements 1.6, 17.1, 17.2, 17.3**
  
  - [x] 11.3 Create recommendation API endpoints
    - GET /api/products/:id/related - get related products
    - GET /api/recommendations - get personalized recommendations
    - _Requirements: 1.6, 17.3, 17.4_

- [x] 12. Email Notification Service
  - [x] 12.1 Implement EmailService
    - Set up email transport (using Nodemailer with SMTP)
    - Create sendOrderConfirmation method with order details
    - Implement sendShippingNotification with tracking number
    - Create sendDeliveryConfirmation method
    - Implement sendSellerNotification for new orders
    - Create email templates for each notification type
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [ ]* 12.2 Write property tests for email notifications
    - **Property 36: Order Creation Triggers Email**
    - **Property 37: Shipping Status Triggers Email**
    - **Property 38: Delivery Status Triggers Email**
    - **Property 39: Email Content Completeness**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
  
  - [x] 12.3 Integrate email notifications with order status changes
    - Add email sending to order creation flow
    - Add email sending to status update flow
    - Implement email preference management
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [x] 13. Seller Dashboard and Admin Panel
  - [x] 13.1 Implement SellerService
    - Create getSellerDashboard with analytics calculation
    - Implement getSellerProducts with filtering
    - Create getSellerOrders with status filtering
    - Calculate sales statistics (total sales, revenue, popular products)
    - _Requirements: 5.2, 5.6_
  
  - [x] 13.2 Implement AdminService
    - Create getPendingSellers method
    - Implement verifySeller with approval/rejection
    - Create getPendingProducts method
    - Implement verifyProduct with approval/rejection
    - Create getPlatformAnalytics (total sales, active users, popular products)
    - Implement banner management (create, update, delete, reorder)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [x] 13.3 Create seller and admin API endpoints
    - GET /api/seller/dashboard - get seller analytics
    - GET /api/seller/products - get seller's products
    - GET /api/seller/orders - get seller's orders
    - GET /api/admin/sellers/pending - get pending sellers
    - PUT /api/admin/sellers/:id/verify - verify seller
    - GET /api/admin/products/pending - get pending products
    - PUT /api/admin/products/:id/verify - verify product
    - GET /api/admin/analytics - get platform analytics
    - POST /api/admin/banners - create banner
    - PUT /api/admin/banners/:id - update banner
    - DELETE /api/admin/banners/:id - delete banner
    - Apply role-based authorization (seller/admin only)
    - _Requirements: 5.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 14. Security and Input Validation
  - [x] 14.1 Implement input sanitization middleware
    - Create sanitization middleware for HTML tags
    - Implement SQL injection pattern detection
    - Add XSS prevention using validator library
    - Apply to all user input endpoints
    - _Requirements: 18.5_
  
  - [x] 14.2 Write property test for input sanitization

    - **Property 53: Input Sanitization**
    - **Validates: Requirements 18.5**
  
  - [x] 14.3 Implement CSRF protection
    - Set up CSRF token generation
    - Add CSRF validation middleware
    - Apply to all state-changing operations
    - _Requirements: 18.6_
  
  - [ ]* 14.4 Write property test for CSRF protection
    - **Property 54: CSRF Token Validation**
    - **Validates: Requirements 18.6**
  
  - [x] 14.5 Verify no payment credential storage
    - Audit database models to ensure no credit card fields
    - Verify payment gateway credentials are not stored
    - _Requirements: 18.3_
  
  - [ ]* 14.6 Write property test for payment credential exclusion
    - **Property 51: No Payment Credential Storage**
    - **Validates: Requirements 18.3**

- [x] 15. Checkpoint - Backend Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Frontend Project Setup
  - Initialize React.js project with Vite and TypeScript
  - Set up React Router for navigation
  - Configure Redux Toolkit for state management
  - Set up Axios for API calls with interceptors
  - Configure i18next for internationalization (Nepali/English)
  - Set up Tailwind CSS for styling
  - Create folder structure (components, pages, services, store, utils)
  - _Requirements: 14.1, 14.2, 15.1, 15.2, 15.3_

- [x] 17. Shared Frontend Components
  - [x] 17.1 Create Header component
    - Implement navigation menu with links
    - Add SearchBar with autocomplete
    - Create cart icon with item count badge
    - Add user account dropdown
    - Implement language selector (Nepali/English)
    - Make responsive for mobile/tablet/desktop
    - _Requirements: 2.1, 14.1, 15.1, 15.2, 15.3_
  
  - [x] 17.2 Create SearchBar component
    - Implement input field with debounced onChange
    - Add autocomplete dropdown with suggestions
    - Handle search submission
    - Style for mobile and desktop
    - _Requirements: 2.1_
  
  - [x] 17.3 Create ProductCard component
    - Display product thumbnail with lazy loading
    - Show title, price, and rating
    - Add "Add to Cart" button
    - Add wishlist button
    - Make responsive
    - _Requirements: 1.1, 1.2, 3.1, 11.1, 16.3_
  
  - [x] 17.4 Create FilterSidebar component
    - Implement price range slider
    - Add rating filter checkboxes
    - Add category filter checkboxes
    - Create Apply/Clear buttons
    - Make responsive (drawer on mobile)
    - _Requirements: 10.1, 10.2_
  
  - [x] 17.5 Create ReviewList and ReviewForm components
    - Display reviews with pagination
    - Show reviewer name, rating, date, text
    - Create star rating selector
    - Add review text area
    - Implement submit button
    - _Requirements: 7.1, 7.2_

- [x] 18. Authentication Pages
  - [x] 18.1 Create RegistrationPage
    - Build registration form (email/phone, password, role)
    - Implement client-side validation
    - Add password strength indicator
    - Handle registration API call
    - Redirect to login on success
    - _Requirements: 4.1, 4.2_
  
  - [x] 18.2 Create LoginPage
    - Build login form (email/phone, password)
    - Implement client-side validation
    - Handle login API call
    - Store JWT token in localStorage
    - Redirect to homepage on success
    - _Requirements: 4.3_
  
  - [x] 18.3 Implement authentication state management
    - Create auth slice in Redux
    - Add login, logout, and token refresh actions
    - Implement protected route wrapper
    - Add token to Axios interceptors
    - _Requirements: 4.3, 4.5_

- [x] 19. Product Browsing Pages
  - [x] 19.1 Create HomePage
    - Display promotional banners carousel
    - Show featured products grid
    - Display personalized recommendations
    - Add category navigation cards
    - Implement responsive layout
    - _Requirements: 1.1, 17.4_
  
  - [x] 19.2 Create ProductListPage
    - Display product grid with ProductCard components
    - Add FilterSidebar for filtering
    - Implement sort dropdown
    - Add pagination controls
    - Handle filter and sort state
    - Fetch products from API with filters/sort
    - _Requirements: 1.1, 1.2, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 19.3 Write property test for filter persistence
    - **Property 31: Filter Persistence Across Pagination**
    - **Validates: Requirements 10.5**
  
  - [x] 19.4 Create ProductDetailPage
    - Display product image gallery with zoom
    - Show product information (title, price, description, seller)
    - Display ratings and reviews
    - Show related products section
    - Add "Add to Cart" and "Add to Wishlist" buttons
    - Implement language switching for product content
    - Track product view for recently viewed
    - _Requirements: 1.3, 1.4, 1.6, 7.2, 11.1, 13.1, 14.2_

- [x] 20. Shopping Cart and Checkout
  - [x] 20.1 Create CartPage
    - Display cart items with images, titles, prices, quantities
    - Implement quantity adjustment controls
    - Add remove item buttons
    - Show total cost calculation
    - Add "Proceed to Checkout" button
    - Handle empty cart state
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [x] 20.2 Create CheckoutPage
    - Display order summary
    - Create shipping address form
    - Add payment method selection (eSewa, Khalti, COD)
    - Implement order creation API call
    - Handle payment gateway redirection
    - Show loading states
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [x] 20.3 Create OrderConfirmationPage
    - Display order details
    - Show tracking number
    - Display payment status
    - Add "View Order" button
    - _Requirements: 8.1, 8.4_

- [x] 21. User Account Pages
  - [x] 21.1 Create OrderHistoryPage
    - Display list of user's orders
    - Show order number, date, status, total
    - Add "View Details" button for each order
    - Implement pagination
    - _Requirements: 8.5_
  
  - [x] 21.2 Create OrderDetailPage
    - Display complete order information
    - Show order items with images
    - Display shipping address
    - Show order status timeline
    - Display tracking number
    - _Requirements: 8.4_
  
  - [x] 21.3 Create WishlistPage
    - Display wishlist products in grid
    - Add "Move to Cart" buttons
    - Add "Remove" buttons
    - Handle empty wishlist state
    - _Requirements: 11.2, 11.3, 11.4_
  
  - [x] 21.4 Create ProfilePage
    - Display user information
    - Add language preference selector
    - Show saved shipping addresses
    - Add email notification preferences
    - Implement update functionality
    - _Requirements: 12.5, 14.1, 14.3_

- [x] 22. Seller Dashboard
  - [x] 22.1 Create SellerDashboardPage
    - Display sales analytics (charts and stats)
    - Show recent orders list
    - Display product performance metrics
    - Add quick action buttons
    - _Requirements: 5.2_
  
  - [x] 22.2 Create SellerProductsPage
    - Display seller's products in table/grid
    - Add "Create Product" button
    - Implement edit/delete actions
    - Show verification status
    - _Requirements: 5.3, 5.5_
  
  - [x] 22.3 Create ProductFormPage
    - Build product creation/edit form
    - Implement image upload with preview
    - Add bilingual input fields (English/Nepali)
    - Implement client-side validation
    - Handle form submission
    - _Requirements: 5.3, 5.4, 14.4_
  
  - [x] 22.4 Create SellerOrdersPage
    - Display seller's orders in table
    - Show order details and buyer info
    - Add status update dropdown
    - Implement order filtering
    - _Requirements: 5.6, 8.3_

- [x] 23. Admin Panel
  - [x] 23.1 Create AdminDashboardPage
    - Display platform analytics
    - Show total sales, active users, popular products
    - Add quick links to management sections
    - _Requirements: 9.6_
  
  - [x] 23.2 Create SellerVerificationPage
    - Display pending sellers in table
    - Show seller details and documents
    - Add approve/reject buttons with reason input
    - _Requirements: 9.1, 9.2_
  
  - [x] 23.3 Create ProductVerificationPage
    - Display pending products in table
    - Show product details and Made in Nepal proof
    - Add approve/reject buttons with reason input
    - _Requirements: 9.3_
  
  - [x] 23.4 Create BannerManagementPage
    - Display current banners with preview
    - Add create banner form
    - Implement edit/delete actions
    - Add drag-and-drop reordering
    - _Requirements: 9.5_

- [x] 24. Internationalization and Language Support
  - [x] 24.1 Set up i18next configuration
    - Create translation files for English and Nepali
    - Configure language detection
    - Set up translation namespaces
    - _Requirements: 14.1, 14.2_
  
  - [x] 24.2 Translate all UI text
    - Add translation keys to all components
    - Create English translations
    - Create Nepali translations
    - Test language switching
    - _Requirements: 14.2_
  
  - [ ]* 24.3 Write property tests for language support
    - **Property 43: Language Selection Updates UI**
    - **Property 44: Language Preference Persistence**
    - **Property 45: Product Bilingual Support**
    - **Property 46: Currency Display Consistency**
    - **Validates: Requirements 14.2, 14.3, 14.4, 14.5**

- [x] 25. Responsive Design and Mobile Optimization
  - [x] 25.1 Implement responsive layouts
    - Add mobile breakpoints to all pages
    - Create mobile navigation drawer
    - Optimize touch targets for mobile
    - Test on various screen sizes
    - _Requirements: 15.1, 15.2, 15.3, 15.5_
  
  - [x] 25.2 Implement image lazy loading
    - Add lazy loading to ProductCard images
    - Implement intersection observer
    - Add loading placeholders
    - _Requirements: 16.3_
  
  - [x] 25.3 Optimize frontend performance
    - Implement code splitting for routes
    - Add React.memo to expensive components
    - Optimize bundle size
    - Add loading states for async operations
    - _Requirements: 16.1_

- [x] 26. Final Integration and Testing
  - [x] 26.1 Integration testing for critical flows
    - Test complete purchase flow (browse → cart → checkout → payment)
    - Test seller product management flow
    - Test admin verification flow
    - Test search and filter flow
    - _Requirements: All requirements_
  
  - [ ]* 26.2 End-to-end testing with Playwright
    - Set up Playwright configuration
    - Write E2E tests for buyer journey
    - Write E2E tests for seller journey
    - Write E2E tests for admin journey
    - _Requirements: All requirements_
  
  - [x] 26.3 Security testing
    - Test authentication bypass attempts
    - Test authorization bypass attempts
    - Test XSS prevention
    - Test CSRF protection
    - Test rate limiting
    - _Requirements: 18.1, 18.2, 18.4, 18.5, 18.6_

- [x] 27. Final Checkpoint - Complete Platform
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: models → services → APIs → frontend
- Testing is integrated throughout to catch errors early
- Core functionality (auth, products, cart, orders) is prioritized before enhancements
