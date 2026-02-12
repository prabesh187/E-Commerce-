import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Product } from '../types';
import api from '../services/api';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
}

const ProductCard = ({ product, onAddToCart, onAddToWishlist }: ProductCardProps) => {
  const { t, i18n } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);

  const title = i18n.language === 'ne' ? product.title.ne : product.title.en;
  const imageUrl = product.images[0] || '/placeholder-product.jpg';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAddingToCart) return;
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to login with return URL
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    setIsAddingToCart(true);
    try {
      if (onAddToCart) {
        onAddToCart(product._id);
      } else {
        await api.post('/cart', { productId: product._id, quantity: 1 });
        // Show success message
        alert('Product added to cart successfully!');
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      // Show error message
      if (error.response?.status === 401) {
        alert('Please login to add items to cart');
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      } else {
        alert('Failed to add product to cart. Please try again.');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleAddToWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAddingToWishlist) return;
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to login with return URL
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    setIsAddingToWishlist(true);
    try {
      if (onAddToWishlist) {
        onAddToWishlist(product._id);
      } else {
        await api.post('/wishlist', { productId: product._id });
        // Show success message
        alert('Product added to wishlist!');
      }
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      // Show error message
      if (error.response?.status === 401) {
        alert('Please login to add items to wishlist');
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      } else {
        alert('Failed to add product to wishlist. Please try again.');
      }
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  return (
    <Link
      to={`/products/${product._id}`}
      className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col transform hover:-translate-y-1"
    >
      {/* Image Container with Modern Overlay */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 w-full h-full"></div>
          </div>
        )}
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        
        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Wishlist Button - Modern Floating Style */}
        <button
          onClick={handleAddToWishlist}
          disabled={isAddingToWishlist}
          className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200"
          aria-label="Add to wishlist"
        >
          <svg
            className={`w-5 h-5 ${isAddingToWishlist ? 'text-gray-400' : 'text-red-500 hover:fill-current'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>

        {/* Stock Badge - Modern Pill Style */}
        {product.inventory === 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg">
            Out of Stock
          </div>
        )}
        
        {/* Quick View Badge */}
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-full text-sm font-semibold text-center shadow-lg">
            Quick View →
          </div>
        </div>
      </div>

      {/* Product Info - Modern Spacing */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Title with Better Typography */}
        <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors leading-snug">
          {title}
        </h3>

        {/* Rating - Modern Stars */}
        <div className="flex items-center mb-3">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, index) => (
              <svg
                key={index}
                className={`w-4 h-4 ${
                  index < Math.floor(product.averageRating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="ml-2 text-sm text-gray-500 font-medium">
            ({product.reviewCount})
          </span>
        </div>

        {/* Price - Bold and Prominent */}
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            Rs. {product.price.toLocaleString()}
          </span>
          {product.inventory < 10 && product.inventory > 0 && (
            <span className="text-xs text-orange-600 font-semibold">
              Only {product.inventory} left!
            </span>
          )}
        </div>

        {/* Add to Cart Button - Modern Gradient */}
        <button
          onClick={handleAddToCart}
          disabled={product.inventory === 0 || isAddingToCart}
          className={`w-full py-3 px-4 rounded-xl font-bold transition-all duration-200 transform ${
            product.inventory === 0
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : isAddingToCart
              ? 'bg-blue-400 text-white cursor-wait'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg active:scale-95'
          }`}
        >
          {isAddingToCart ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Adding...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Add to Cart
            </span>
          )}
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;
