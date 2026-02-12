// User types
export interface User {
  _id: string;
  email?: string;
  phone?: string;
  role: 'buyer' | 'seller' | 'admin';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  businessName?: string;
  businessAddress?: string;
  documents?: string[];
  shippingAddresses?: ShippingAddress[];
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

// Product types
export interface Product {
  _id: string;
  title: {
    en: string;
    ne: string;
  };
  description: {
    en: string;
    ne: string;
  };
  price: number;
  category: string;
  images: string[];
  inventory: number;
  seller: string | User;
  averageRating: number;
  reviewCount: number;
  weightedRating: number;
  viewCount: number;
  purchaseCount: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// Cart types
export interface CartItem {
  _id: string;
  product: Product;
  quantity: number;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  totalAmount: number;
}

// Order types
export interface OrderItem {
  product: string | Product;
  quantity: number;
  price: number;
  seller: string | User;
}

export interface Order {
  _id: string;
  orderNumber: string;
  buyer: string | User;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: 'esewa' | 'khalti' | 'cod';
  paymentStatus: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  statusHistory: Array<{
    status: string;
    timestamp: Date;
  }>;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

// Review types
export interface Review {
  _id: string;
  product: string | Product;
  buyer: string | User;
  order: string;
  rating: number;
  text: string;
  createdAt: string;
  updatedAt: string;
}

// Wishlist types
export interface Wishlist {
  _id: string;
  user: string;
  products: Product[];
}

// Banner types
export interface Banner {
  _id: string;
  title: {
    en: string;
    ne: string;
  };
  image: string;
  link?: string;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
