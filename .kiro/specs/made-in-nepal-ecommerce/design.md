# Design Document: Made in Nepal E-Commerce Platform

## Overview

The Made in Nepal E-Commerce Platform is a full-stack web application built with React.js frontend, Node.js/Express backend, and MongoDB database. The platform follows a microservices-inspired architecture with clear separation between presentation, business logic, and data layers.

The system serves three primary user roles:
- **Buyers**: Browse, search, and purchase products
- **Sellers**: List and manage products, track sales
- **Administrators**: Manage platform content, verify sellers and products

Key technical features include:
- RESTful API architecture for frontend-backend communication
- JWT-based authentication and authorization
- Integration with Nepali payment gateways (eSewa, Khalti)
- MongoDB text search with fuzzy matching for product discovery
- Collaborative and content-based filtering for recommendations
- Responsive React components with mobile-first design
- Image optimization and CDN delivery
- Real-time notifications using email service integration

## Architecture

### System Architecture

The platform follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
│  (React.js SPA with React Router, Redux for state)      │
└─────────────────────────────────────────────────────────┘
                          │
                    HTTPS/REST API
                          │
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  (Node.js/Express with middleware for auth, validation) │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Product    │  │     User     │  │    Order     │ │
│  │   Service    │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Search    │  │  Recommend   │  │   Payment    │ │
│  │   Service    │  │   Service    │  │   Service    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                    MongoDB Driver
                          │
┌─────────────────────────────────────────────────────────┐
│                     Data Layer                           │
│  (MongoDB with indexes for search and performance)      │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                  External Services                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  eSewa   │  │  Khalti  │  │  Email   │             │
│  │ Gateway  │  │ Gateway  │  │ Service  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Frontend (React.js)**:
- Render responsive UI components
- Manage client-side state (Redux)
- Handle routing and navigation
- Validate user inputs before submission
- Display loading states and error messages
- Implement internationalization (i18n) for Nepali/English

**Backend (Node.js/Express)**:
- Expose RESTful API endpoints
- Authenticate and authorize requests
- Validate and sanitize inputs
- Execute business logic
- Coordinate between services
- Handle payment gateway integration
- Send email notifications

**Database (MongoDB)**:
- Store all application data
- Provide text search capabilities
- Maintain data integrity through validation
- Support efficient queries through indexes

## Components and Interfaces

### Frontend Components

#### Page Components

**HomePage**
- Displays promotional banners
- Shows featured products
- Displays personalized recommendations
- Provides category navigation
- Props: `user`, `featuredProducts`, `recommendations`

**ProductListPage**
- Displays filtered and sorted product grid
- Provides filter sidebar (price, rating, category)
- Provides sort dropdown
- Handles pagination
- Props: `category`, `filters`, `sortBy`, `page`

**ProductDetailPage**
- Displays product images with gallery and zoom
- Shows product information (title, price, description, seller)
- Displays ratings and reviews
- Shows related products
- Provides add to cart and wishlist buttons
- Props: `productId`

**CartPage**
- Displays cart items with quantities
- Shows total cost calculation
- Provides quantity adjustment controls
- Provides remove item functionality
- Shows checkout button
- Props: `cartItems`, `onUpdateQuantity`, `onRemove`, `onCheckout`

**CheckoutPage**
- Displays order summary
- Collects shipping information
- Provides payment method selection
- Handles payment gateway redirection
- Props: `cartItems`, `totalAmount`

**SellerDashboard**
- Displays sales analytics
- Shows product list with edit/delete actions
- Displays order list
- Provides product creation form
- Props: `seller`, `products`, `orders`, `analytics`

**AdminPanel**
- Displays seller verification queue
- Shows product verification queue
- Provides platform analytics
- Manages promotional banners
- Props: `pendingSellers`, `pendingProducts`, `analytics`

#### Shared Components

**Header**
- Navigation menu
- Search bar with autocomplete
- Cart icon with item count
- User account dropdown
- Language selector
- Props: `user`, `cartCount`, `language`, `onLanguageChange`

**SearchBar**
- Input field with autocomplete dropdown
- Debounced search suggestions
- Search submission handler
- Props: `onSearch`, `suggestions`

**ProductCard**
- Product thumbnail
- Product title and price
- Rating display
- Add to cart button
- Wishlist button
- Props: `product`, `onAddToCart`, `onAddToWishlist`

**FilterSidebar**
- Price range slider
- Rating filter checkboxes
- Category filter checkboxes
- Seller filter checkboxes
- Apply/Clear buttons
- Props: `filters`, `onFilterChange`, `onApply`, `onClear`

**ReviewList**
- Displays all product reviews
- Shows reviewer name, rating, date, text
- Provides pagination
- Props: `reviews`, `page`, `totalPages`

**ReviewForm**
- Star rating selector
- Review text area
- Submit button
- Props: `productId`, `onSubmit`

### Backend API Endpoints

#### Authentication Endpoints

```
POST /api/auth/register
Body: { email, phone, password, role }
Response: { user, token }

POST /api/auth/login
Body: { emailOrPhone, password }
Response: { user, token }

POST /api/auth/logout
Headers: { Authorization: Bearer <token> }
Response: { message }

GET /api/auth/me
Headers: { Authorization: Bearer <token> }
Response: { user }
```

#### Product Endpoints

```
GET /api/products
Query: { category, minPrice, maxPrice, minRating, sortBy, page, limit }
Response: { products, totalPages, currentPage }

GET /api/products/:id
Response: { product }

POST /api/products
Headers: { Authorization: Bearer <token> }
Body: { title, description, price, category, images, inventory }
Response: { product }

PUT /api/products/:id
Headers: { Authorization: Bearer <token> }
Body: { title, description, price, category, images, inventory }
Response: { product }

DELETE /api/products/:id
Headers: { Authorization: Bearer <token> }
Response: { message }

GET /api/products/:id/related
Response: { products }
```

#### Search Endpoints

```
GET /api/search
Query: { q, page, limit }
Response: { products, totalPages, currentPage }

GET /api/search/suggestions
Query: { q }
Response: { suggestions }
```

#### Cart Endpoints

```
GET /api/cart
Headers: { Authorization: Bearer <token> }
Response: { cartItems, totalAmount }

POST /api/cart
Headers: { Authorization: Bearer <token> }
Body: { productId, quantity }
Response: { cart }

PUT /api/cart/:itemId
Headers: { Authorization: Bearer <token> }
Body: { quantity }
Response: { cart }

DELETE /api/cart/:itemId
Headers: { Authorization: Bearer <token> }
Response: { cart }
```

#### Order Endpoints

```
POST /api/orders
Headers: { Authorization: Bearer <token> }
Body: { cartItems, shippingAddress, paymentMethod }
Response: { order, paymentUrl }

GET /api/orders
Headers: { Authorization: Bearer <token> }
Response: { orders }

GET /api/orders/:id
Headers: { Authorization: Bearer <token> }
Response: { order }

PUT /api/orders/:id/status
Headers: { Authorization: Bearer <token> }
Body: { status }
Response: { order }
```

#### Review Endpoints

```
GET /api/products/:id/reviews
Query: { page, limit }
Response: { reviews, totalPages, currentPage }

POST /api/products/:id/reviews
Headers: { Authorization: Bearer <token> }
Body: { rating, text }
Response: { review }
```

#### Wishlist Endpoints

```
GET /api/wishlist
Headers: { Authorization: Bearer <token> }
Response: { products }

POST /api/wishlist
Headers: { Authorization: Bearer <token> }
Body: { productId }
Response: { wishlist }

DELETE /api/wishlist/:productId
Headers: { Authorization: Bearer <token> }
Response: { wishlist }
```

#### Seller Endpoints

```
GET /api/seller/dashboard
Headers: { Authorization: Bearer <token> }
Response: { analytics, products, orders }

GET /api/seller/products
Headers: { Authorization: Bearer <token> }
Response: { products }

GET /api/seller/orders
Headers: { Authorization: Bearer <token> }
Response: { orders }
```

#### Admin Endpoints

```
GET /api/admin/sellers/pending
Headers: { Authorization: Bearer <token> }
Response: { sellers }

PUT /api/admin/sellers/:id/verify
Headers: { Authorization: Bearer <token> }
Body: { approved, reason }
Response: { seller }

GET /api/admin/products/pending
Headers: { Authorization: Bearer <token> }
Response: { products }

PUT /api/admin/products/:id/verify
Headers: { Authorization: Bearer <token> }
Body: { approved, reason }
Response: { product }

GET /api/admin/analytics
Headers: { Authorization: Bearer <token> }
Response: { totalSales, activeUsers, popularProducts }

POST /api/admin/banners
Headers: { Authorization: Bearer <token> }
Body: { image, link, title, active }
Response: { banner }
```

#### Payment Endpoints

```
POST /api/payment/esewa/initiate
Headers: { Authorization: Bearer <token> }
Body: { orderId, amount }
Response: { paymentUrl }

POST /api/payment/esewa/verify
Body: { orderId, transactionId }
Response: { verified, order }

POST /api/payment/khalti/initiate
Headers: { Authorization: Bearer <token> }
Body: { orderId, amount }
Response: { paymentUrl }

POST /api/payment/khalti/verify
Body: { orderId, token }
Response: { verified, order }
```

### Service Layer

#### ProductService

**Responsibilities**:
- Create, read, update, delete products
- Validate product data
- Handle image uploads and optimization
- Calculate weighted ratings
- Fetch related products

**Key Methods**:
```javascript
createProduct(productData, sellerId)
getProductById(productId)
updateProduct(productId, updates, sellerId)
deleteProduct(productId, sellerId)
getProducts(filters, sortBy, page, limit)
getRelatedProducts(productId, limit)
calculateWeightedRating(averageRating, reviewCount)
```

#### SearchService

**Responsibilities**:
- Execute text search queries
- Provide autocomplete suggestions
- Rank search results using TF-IDF
- Handle fuzzy matching for typos

**Key Methods**:
```javascript
search(query, page, limit)
getSuggestions(query, limit)
rankResults(results, query)
fuzzyMatch(query, threshold)
```

**Search Algorithm**:
- Use MongoDB text indexes for initial search
- Apply TF-IDF scoring with boost factors:
  - Exact title match: 3x boost
  - Title contains query: 2x boost
  - Description contains query: 1x boost
- Apply fuzzy matching using Levenshtein distance (threshold: 2 edits)
- Sort by combined score (TF-IDF * boost * rating weight)

#### RecommendationService

**Responsibilities**:
- Generate personalized recommendations
- Implement collaborative filtering
- Implement content-based filtering
- Track user behavior

**Key Methods**:
```javascript
getPersonalizedRecommendations(userId, limit)
getRelatedProducts(productId, limit)
trackProductView(userId, productId)
collaborativeFiltering(userId, limit)
contentBasedFiltering(productId, limit)
```

**Recommendation Algorithms**:

*Collaborative Filtering*:
- Find users with similar purchase/view history
- Use Jaccard similarity: `J(A,B) = |A ∩ B| / |A ∪ B|`
- Recommend products purchased by similar users
- Weight by similarity score

*Content-Based Filtering*:
- Extract product features (category, price range, seller)
- Calculate cosine similarity between products
- Recommend products with highest similarity scores
- Formula: `similarity(A,B) = (A · B) / (||A|| * ||B||)`

#### UserService

**Responsibilities**:
- User registration and authentication
- Password hashing and verification
- JWT token generation and validation
- Role-based access control

**Key Methods**:
```javascript
register(userData)
login(emailOrPhone, password)
verifyToken(token)
hashPassword(password)
comparePassword(password, hash)
generateToken(userId, role)
```

#### OrderService

**Responsibilities**:
- Create and manage orders
- Update order status
- Generate tracking numbers
- Coordinate with payment service

**Key Methods**:
```javascript
createOrder(userId, cartItems, shippingAddress, paymentMethod)
getOrderById(orderId)
updateOrderStatus(orderId, status)
getUserOrders(userId, page, limit)
getSellerOrders(sellerId, page, limit)
generateTrackingNumber()
```

#### PaymentService

**Responsibilities**:
- Integrate with eSewa and Khalti gateways
- Initiate payment transactions
- Verify payment completion
- Handle payment callbacks

**Key Methods**:
```javascript
initiateEsewaPayment(orderId, amount)
verifyEsewaPayment(orderId, transactionId)
initiateKhaltiPayment(orderId, amount)
verifyKhaltiPayment(orderId, token)
handlePaymentCallback(gateway, data)
```

**Payment Flow**:
1. User selects payment method at checkout
2. Backend creates order with status "pending"
3. Backend calls payment gateway API to initiate transaction
4. Backend returns payment URL to frontend
5. Frontend redirects user to payment gateway
6. User completes payment on gateway
7. Gateway redirects back with transaction details
8. Backend verifies payment with gateway API
9. Backend updates order status to "confirmed"
10. Backend sends confirmation email

#### EmailService

**Responsibilities**:
- Send transactional emails
- Format email templates
- Handle email delivery failures

**Key Methods**:
```javascript
sendOrderConfirmation(order, userEmail)
sendShippingNotification(order, userEmail, trackingNumber)
sendDeliveryConfirmation(order, userEmail)
sendSellerNotification(order, sellerEmail)
formatEmailTemplate(templateName, data)
```

#### CartService

**Responsibilities**:
- Manage cart items
- Calculate totals
- Validate product availability
- Handle cart persistence

**Key Methods**:
```javascript
getCart(userId)
addToCart(userId, productId, quantity)
updateCartItem(userId, itemId, quantity)
removeFromCart(userId, itemId)
clearCart(userId)
calculateTotal(cartItems)
```

## Data Models

### User Model

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  phone: String (unique, sparse),
  password: String (hashed, required),
  role: String (enum: ['buyer', 'seller', 'admin'], required),
  firstName: String,
  lastName: String,
  verificationStatus: String (enum: ['pending', 'approved', 'rejected']),
  verificationReason: String,
  createdAt: Date,
  updatedAt: Date,
  language: String (enum: ['en', 'ne'], default: 'en'),
  
  // Seller-specific fields
  businessName: String,
  businessAddress: String,
  businessPhone: String,
  businessDocuments: [String], // URLs to verification documents
  
  // Buyer-specific fields
  shippingAddresses: [{
    fullName: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    district: String,
    postalCode: String,
    isDefault: Boolean
  }]
}
```

**Indexes**:
- `{ email: 1 }` (unique)
- `{ phone: 1 }` (unique, sparse)
- `{ role: 1, verificationStatus: 1 }`

### Product Model

```javascript
{
  _id: ObjectId,
  title: {
    en: String (required),
    ne: String
  },
  description: {
    en: String (required),
    ne: String
  },
  price: Number (required, min: 0),
  category: String (required, enum: ['food', 'handicrafts', 'clothing', 'electronics', 'other']),
  images: [String] (required, min: 1), // URLs to product images
  inventory: Number (required, min: 0),
  sellerId: ObjectId (ref: 'User', required),
  verificationStatus: String (enum: ['pending', 'approved', 'rejected'], default: 'pending'),
  verificationReason: String,
  madeInNepalProof: String, // URL to verification document
  
  // Calculated fields
  averageRating: Number (default: 0, min: 0, max: 5),
  reviewCount: Number (default: 0, min: 0),
  weightedRating: Number (default: 0), // Used for ranking
  viewCount: Number (default: 0),
  purchaseCount: Number (default: 0),
  
  createdAt: Date,
  updatedAt: Date,
  isActive: Boolean (default: true)
}
```

**Indexes**:
- `{ title.en: 'text', description.en: 'text' }` (text search)
- `{ category: 1, weightedRating: -1 }`
- `{ sellerId: 1, createdAt: -1 }`
- `{ verificationStatus: 1 }`
- `{ weightedRating: -1 }`

**Weighted Rating Calculation**:
```
weightedRating = (averageRating * reviewCount) / (reviewCount + K)
where K = 10 (confidence parameter)
```

This formula ensures products with more reviews rank higher when ratings are similar.

### Order Model

```javascript
{
  _id: ObjectId,
  orderNumber: String (unique, required), // e.g., "MN-2024-001234"
  buyerId: ObjectId (ref: 'User', required),
  items: [{
    productId: ObjectId (ref: 'Product', required),
    title: String (required), // Snapshot at order time
    price: Number (required),
    quantity: Number (required, min: 1),
    sellerId: ObjectId (ref: 'User', required)
  }],
  
  shippingAddress: {
    fullName: String (required),
    phone: String (required),
    addressLine1: String (required),
    addressLine2: String,
    city: String (required),
    district: String (required),
    postalCode: String
  },
  
  paymentMethod: String (enum: ['esewa', 'khalti', 'cod'], required),
  paymentStatus: String (enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending'),
  paymentTransactionId: String,
  
  subtotal: Number (required),
  shippingCost: Number (default: 0),
  totalAmount: Number (required),
  
  status: String (enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending'),
  trackingNumber: String,
  
  createdAt: Date,
  updatedAt: Date,
  
  // Timestamps for status changes
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date
}
```

**Indexes**:
- `{ orderNumber: 1 }` (unique)
- `{ buyerId: 1, createdAt: -1 }`
- `{ 'items.sellerId': 1, createdAt: -1 }`
- `{ status: 1 }`

### Review Model

```javascript
{
  _id: ObjectId,
  productId: ObjectId (ref: 'Product', required),
  buyerId: ObjectId (ref: 'User', required),
  orderId: ObjectId (ref: 'Order', required),
  rating: Number (required, min: 1, max: 5),
  text: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ productId: 1, createdAt: -1 }`
- `{ buyerId: 1, productId: 1 }` (unique - one review per buyer per product)

### Cart Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required, unique),
  items: [{
    productId: ObjectId (ref: 'Product', required),
    quantity: Number (required, min: 1),
    addedAt: Date
  }],
  updatedAt: Date
}
```

**Indexes**:
- `{ userId: 1 }` (unique)

### Wishlist Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required, unique),
  products: [ObjectId] (ref: 'Product'),
  updatedAt: Date
}
```

**Indexes**:
- `{ userId: 1 }` (unique)

### RecentlyViewed Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required, unique),
  products: [{
    productId: ObjectId (ref: 'Product', required),
    viewedAt: Date (required)
  }],
  updatedAt: Date
}
```

**Indexes**:
- `{ userId: 1 }` (unique)

### Banner Model

```javascript
{
  _id: ObjectId,
  title: {
    en: String (required),
    ne: String
  },
  image: String (required), // URL to banner image
  link: String, // URL to navigate when clicked
  active: Boolean (default: true),
  displayOrder: Number (default: 0),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ active: 1, displayOrder: 1 }`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Category Filtering Correctness

*For any* category filter applied to product listings, all returned products must belong to the specified category.

**Validates: Requirements 1.2**

### Property 2: Product Detail Completeness

*For any* product retrieved by ID, the response must contain all required fields: images, description, price, seller information, and ratings.

**Validates: Requirements 1.3**

### Property 3: Weighted Rating Ordering

*For any* product listing query, products must be ordered by weighted rating in descending order, where weighted rating is calculated as `(averageRating * reviewCount) / (reviewCount + 10)`.

**Validates: Requirements 1.5**

### Property 4: Related Products Relevance

*For any* product, all related product recommendations must share the same category or have similar attributes (price range within 50%, same seller).

**Validates: Requirements 1.6**

### Property 5: Autocomplete Substring Matching

*For any* search query, all autocomplete suggestions must contain the query as a substring (case-insensitive).

**Validates: Requirements 2.1**

### Property 6: Search Result Relevance

*For any* search query, all returned products must have titles or descriptions that match the query terms or fuzzy variants (Levenshtein distance ≤ 2).

**Validates: Requirements 2.2, 2.4**

### Property 7: Search Ranking Boost

*For any* search query, products with exact title matches must rank higher than products with partial matches or description matches.

**Validates: Requirements 2.3**

### Property 8: Cart Addition Increases Size

*For any* cart and valid product, adding the product to the cart must increase the cart item count by one (or increase quantity if product already exists).

**Validates: Requirements 3.1**

### Property 9: Cart Total Calculation

*For any* cart, the total cost must equal the sum of (price × quantity) for all cart items.

**Validates: Requirements 3.2, 3.3**

### Property 10: Cart Removal Decreases Size

*For any* cart item, removing it from the cart must decrease the cart item count by one and recalculate the total correctly.

**Validates: Requirements 3.4**

### Property 11: Cart Persistence Round Trip

*For any* logged-in buyer with cart items, logging out and logging back in must restore the exact same cart contents.

**Validates: Requirements 3.5**

### Property 12: Password Strength Validation

*For any* password string, if it does not meet security criteria (minimum 8 characters, contains uppercase, lowercase, and number), registration must be rejected.

**Validates: Requirements 4.2**

### Property 13: Authentication Success for Valid Credentials

*For any* registered user, providing correct email/phone and password must result in successful authentication and return a valid JWT token.

**Validates: Requirements 4.3**

### Property 14: Unverified Seller Product Creation Rejection

*For any* seller with verification status "pending" or "rejected", attempting to create a product listing must be rejected with appropriate error.

**Validates: Requirements 5.1**

### Property 15: Product Creation Required Fields

*For any* product creation request, if any required field (title, description, price, category, images) is missing, the request must be rejected.

**Validates: Requirements 5.3**

### Property 16: Image Optimization Reduces Size

*For any* uploaded product image, the optimized version stored in the system must have a smaller file size than the original while maintaining acceptable quality.

**Validates: Requirements 5.4, 16.2**

### Property 17: Product Update Persistence

*For any* product owned by a seller, updating product fields must persist the changes such that subsequent retrieval returns the updated values.

**Validates: Requirements 5.5**

### Property 18: Payment Gateway Redirection

*For any* checkout with eSewa or Khalti payment method, the response must include a valid payment URL for redirection.

**Validates: Requirements 6.2**

### Property 19: Successful Payment Creates Order

*For any* successful payment verification, an order must be created with status "confirmed" and payment status "completed".

**Validates: Requirements 6.3**

### Property 20: Failed Payment Preserves Cart

*For any* failed payment attempt, the buyer's cart contents must remain unchanged.

**Validates: Requirements 6.5**

### Property 21: Payment Transaction Persistence

*For any* payment transaction (successful or failed), a transaction record must be stored with transaction ID, order ID, amount, and status.

**Validates: Requirements 6.6**

### Property 22: Review Authorization

*For any* buyer and product, the buyer can only submit a review if they have a delivered order containing that product.

**Validates: Requirements 7.1, 7.5**

### Property 23: Average Rating Calculation

*For any* product with reviews, the average rating must equal the sum of all review ratings divided by the number of reviews.

**Validates: Requirements 7.3**

### Property 24: Weighted Rating Formula

*For any* product, the weighted rating must be calculated as `(averageRating * reviewCount) / (reviewCount + 10)`, ensuring products with more reviews rank higher when ratings are similar.

**Validates: Requirements 7.4**

### Property 25: Unique Order Tracking Numbers

*For any* two distinct orders, they must have different tracking numbers.

**Validates: Requirements 8.1**

### Property 26: Order Status Validity

*For any* order, the status field must be one of: pending, confirmed, shipped, delivered, or cancelled.

**Validates: Requirements 8.2**

### Property 27: Status Change Triggers Notification

*For any* order status change, an email notification must be sent to the buyer with updated status information.

**Validates: Requirements 8.3**

### Property 28: Order Detail Completeness

*For any* order retrieved by ID, the response must contain all required fields: order number, items, shipping address, payment method, status, and tracking number.

**Validates: Requirements 8.4**

### Property 29: Filter Application Correctness

*For any* combination of filters (price range, rating, category), all returned products must satisfy all applied filter criteria.

**Validates: Requirements 10.2**

### Property 30: Sort Order Correctness

*For any* sort option selected (price ascending, price descending, rating, popularity, newest), products must be ordered according to the specified criterion.

**Validates: Requirements 10.4**

### Property 31: Filter Persistence Across Pagination

*For any* applied filters and sort options, navigating to the next page must maintain the same filters and return the next set of matching products.

**Validates: Requirements 10.5**

### Property 32: Wishlist Addition Increases Size

*For any* wishlist and product, adding the product must increase the wishlist size by one (unless already present).

**Validates: Requirements 11.1**

### Property 33: Wishlist Removal Decreases Size

*For any* product in a wishlist, removing it must decrease the wishlist size by one.

**Validates: Requirements 11.3**

### Property 34: Wishlist to Cart Transfer

*For any* product in a wishlist, moving it to cart must add the product to the cart (and optionally remove from wishlist).

**Validates: Requirements 11.4**

### Property 35: Wishlist Persistence Round Trip

*For any* logged-in buyer with wishlist items, logging out and logging back in must restore the exact same wishlist contents.

**Validates: Requirements 11.5**

### Property 36: Order Creation Triggers Email

*For any* order creation, an order confirmation email must be sent to the buyer's email address.

**Validates: Requirements 12.1**

### Property 37: Shipping Status Triggers Email

*For any* order status change from confirmed to shipped, a shipping notification email must be sent with tracking information.

**Validates: Requirements 12.2**

### Property 38: Delivery Status Triggers Email

*For any* order status change to delivered, a delivery confirmation email must be sent.

**Validates: Requirements 12.3**

### Property 39: Email Content Completeness

*For any* notification email sent, it must contain order number, items, total amount, and current status.

**Validates: Requirements 12.4**

### Property 40: Recently Viewed Recording

*For any* product view by a buyer, the product must be added to the buyer's recently viewed list with current timestamp.

**Validates: Requirements 13.1**

### Property 41: Recently Viewed Chronological Order

*For any* recently viewed list, products must be ordered by view timestamp in descending order (most recent first).

**Validates: Requirements 13.2**

### Property 42: Recently Viewed Size Limit

*For any* recently viewed list, it must contain at most 20 products, with oldest items removed when limit is exceeded.

**Validates: Requirements 13.3**

### Property 43: Language Selection Updates UI

*For any* language selection (Nepali or English), all interface text must be displayed in the selected language.

**Validates: Requirements 14.2**

### Property 44: Language Preference Persistence

*For any* logged-in user's language selection, logging out and back in must restore the same language preference.

**Validates: Requirements 14.3**

### Property 45: Product Bilingual Support

*For any* product, it must have title and description fields for both English and Nepali languages.

**Validates: Requirements 14.4**

### Property 46: Currency Display Consistency

*For any* language setting, all prices must be displayed in Nepali Rupees (NPR).

**Validates: Requirements 14.5**

### Property 47: Collaborative Filtering Similarity

*For any* user receiving personalized recommendations via collaborative filtering, recommended products must be purchased or viewed by users with similar behavior (Jaccard similarity ≥ 0.3).

**Validates: Requirements 17.1**

### Property 48: Content-Based Filtering Similarity

*For any* product receiving content-based recommendations, recommended products must have cosine similarity ≥ 0.5 based on category, price range, and seller features.

**Validates: Requirements 17.2**

### Property 49: Related Products Same Category

*For any* product, at least 80% of related product recommendations must be from the same category.

**Validates: Requirements 17.3**

### Property 50: Password Hashing

*For any* user registration or password change, the stored password must be a bcrypt hash, not plaintext.

**Validates: Requirements 18.1**

### Property 51: No Payment Credential Storage

*For any* payment transaction, credit card numbers or payment gateway credentials must not be stored in the database.

**Validates: Requirements 18.3**

### Property 52: Rate Limiting Enforcement

*For any* API endpoint, making more than 100 requests per minute from the same IP address must result in rate limit errors (HTTP 429).

**Validates: Requirements 18.4**

### Property 53: Input Sanitization

*For any* user input containing HTML tags or SQL injection patterns, the input must be sanitized or rejected before processing.

**Validates: Requirements 18.5**

### Property 54: CSRF Token Validation

*For any* state-changing operation (POST, PUT, DELETE), the request must include a valid CSRF token or be rejected.

**Validates: Requirements 18.6**

## Error Handling

### Error Categories

**Validation Errors (HTTP 400)**:
- Missing required fields
- Invalid data formats
- Business rule violations (e.g., negative prices)
- Password strength requirements not met

**Authentication Errors (HTTP 401)**:
- Invalid credentials
- Expired JWT tokens
- Missing authentication tokens

**Authorization Errors (HTTP 403)**:
- Insufficient permissions for operation
- Unverified seller attempting to create products
- Buyer attempting to review unpurchased product

**Not Found Errors (HTTP 404)**:
- Product ID does not exist
- Order ID does not exist
- User ID does not exist

**Conflict Errors (HTTP 409)**:
- Duplicate email registration
- Duplicate phone registration
- Duplicate review submission

**Rate Limit Errors (HTTP 429)**:
- Too many requests from same IP
- Exceeded API rate limits

**Payment Errors (HTTP 402)**:
- Payment gateway rejection
- Insufficient funds
- Payment verification failure

**Server Errors (HTTP 500)**:
- Database connection failures
- External service unavailability
- Unexpected exceptions

### Error Response Format

All errors must follow consistent JSON format:

```javascript
{
  success: false,
  error: {
    code: String, // e.g., "INVALID_CREDENTIALS"
    message: String, // Human-readable error message
    details: Object // Optional additional context
  }
}
```

### Error Handling Strategies

**Frontend Error Handling**:
- Display user-friendly error messages
- Provide actionable guidance (e.g., "Password must be at least 8 characters")
- Log errors to monitoring service
- Implement retry logic for transient failures
- Show fallback UI for critical failures

**Backend Error Handling**:
- Catch and log all exceptions
- Return appropriate HTTP status codes
- Sanitize error messages (no sensitive data exposure)
- Implement circuit breakers for external services
- Use try-catch blocks around database operations
- Validate inputs before processing

**Payment Error Handling**:
- Preserve cart contents on payment failure
- Provide clear instructions for retry
- Log payment gateway responses
- Implement idempotency for payment operations
- Handle timeout scenarios gracefully

**Database Error Handling**:
- Implement connection pooling with retry logic
- Handle duplicate key errors gracefully
- Validate data before insertion
- Use transactions for multi-document operations
- Implement proper indexing to prevent timeouts

## Testing Strategy

### Dual Testing Approach

The platform requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Both approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing

**Library**: Use `fast-check` for JavaScript/TypeScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `// Feature: made-in-nepal-ecommerce, Property {number}: {property_text}`

**Example Property Test**:

```javascript
// Feature: made-in-nepal-ecommerce, Property 9: Cart Total Calculation
test('cart total equals sum of item prices times quantities', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        price: fc.integer({ min: 1, max: 100000 }),
        quantity: fc.integer({ min: 1, max: 10 })
      })),
      (cartItems) => {
        const expectedTotal = cartItems.reduce(
          (sum, item) => sum + (item.price * item.quantity),
          0
        );
        const calculatedTotal = calculateCartTotal(cartItems);
        return calculatedTotal === expectedTotal;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Framework**: Use Jest for JavaScript/TypeScript unit testing

**Coverage Requirements**:
- Minimum 80% code coverage
- All error handling paths tested
- All edge cases documented in requirements

**Test Categories**:

**API Endpoint Tests**:
- Test each endpoint with valid inputs
- Test authentication and authorization
- Test validation error responses
- Test rate limiting

**Service Layer Tests**:
- Test business logic functions
- Test data transformations
- Test external service integrations (mocked)
- Test error handling

**Database Tests**:
- Test CRUD operations
- Test query filters and sorting
- Test data validation
- Test index usage

**Frontend Component Tests**:
- Test component rendering
- Test user interactions
- Test state management
- Test error display

### Integration Testing

**Scope**: Test complete user flows across multiple components

**Key Flows to Test**:
1. User registration → login → browse products → add to cart → checkout → payment
2. Seller registration → verification → product creation → order fulfillment
3. Admin verification → product approval → banner management
4. Search → filter → sort → product detail → add to wishlist
5. Order creation → status updates → email notifications

**Tools**:
- Supertest for API integration tests
- React Testing Library for frontend integration tests
- MongoDB Memory Server for database testing

### End-to-End Testing

**Framework**: Playwright or Cypress

**Critical Paths**:
- Complete purchase flow (guest and logged-in)
- Seller product management flow
- Admin verification flow
- Multi-language switching
- Payment gateway integration (use sandbox)

### Performance Testing

**Tools**: Apache JMeter or k6

**Metrics to Test**:
- Homepage load time < 3 seconds
- API response time < 500ms (95th percentile)
- Search response time < 1 second
- Concurrent user capacity (target: 1000 concurrent users)
- Database query performance

### Security Testing

**Areas to Test**:
- SQL injection prevention
- XSS prevention
- CSRF protection
- Authentication bypass attempts
- Authorization bypass attempts
- Rate limiting effectiveness
- Password hashing verification
- Session management security

### Test Data Generation

**For Property Tests**:
- Use fast-check generators for random data
- Define custom generators for domain objects (products, users, orders)
- Ensure generated data respects business constraints

**For Unit/Integration Tests**:
- Create fixture data for common scenarios
- Use factory functions for test data creation
- Maintain separate test database

### Continuous Integration

**CI Pipeline**:
1. Run linting and code formatting checks
2. Run unit tests with coverage reporting
3. Run property-based tests
4. Run integration tests
5. Run security scans
6. Build Docker images
7. Deploy to staging environment
8. Run E2E tests against staging

**Quality Gates**:
- All tests must pass
- Code coverage ≥ 80%
- No critical security vulnerabilities
- No linting errors
