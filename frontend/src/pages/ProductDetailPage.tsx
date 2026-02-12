import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addItem } from '../store/slices/cartSlice';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import ReviewList from '../components/ReviewList';
import ReviewForm from '../components/ReviewForm';
import type { Product } from '../types';

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const [productRes, relatedRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get(`/products/${id}/related`).catch(() => ({ data: [] })),
        ]);

        setProduct(productRes.data);
        setRelatedProducts(relatedRes.data.slice(0, 4));

        // Track product view
        if (user) {
          api.post('/recently-viewed', { productId: id }).catch(() => {});
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, user]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to add items to cart');
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    setAddingToCart(true);
    try {
      await api.post('/cart', {
        productId: product._id,
        quantity,
      });
      
      dispatch(addItem({
        _id: product._id,
        product,
        quantity,
      }));
      
      alert('Product added to cart successfully!');
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      if (error.response?.status === 401) {
        alert('Please login to add items to cart');
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      } else {
        alert('Failed to add product to cart. Please try again.');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!product) return;
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to add items to wishlist');
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    setAddingToWishlist(true);
    try {
      await api.post('/wishlist', { productId: product._id });
      alert('Product added to wishlist!');
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      if (error.response?.status === 401) {
        alert('Please login to add items to wishlist');
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      } else {
        alert('Failed to add product to wishlist. Please try again.');
      }
    } finally {
      setAddingToWishlist(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center text-gray-600">{t('product.not_found')}</p>
      </div>
    );
  }

  const currentLang = i18n.language as 'en' | 'ne';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <Link to="/" className="text-blue-600 hover:underline">{t('nav.home')}</Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="text-blue-600 hover:underline">{t('product.title')}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{product.title[currentLang]}</span>
        </nav>

        {/* Product Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div>
              <div className="mb-4">
                <img
                  src={product.images[selectedImage] || product.images[0]}
                  alt={product.title[currentLang]}
                  className="w-full h-96 object-cover rounded-lg"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`border-2 rounded-lg overflow-hidden ${
                      selectedImage === index ? 'border-blue-600' : 'border-gray-300'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.title[currentLang]} ${index + 1}`}
                      className="w-full h-20 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div>
              <h1 className="text-3xl font-bold mb-4">{product.title[currentLang]}</h1>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < Math.round(product.averageRating) ? 'text-yellow-400' : 'text-gray-300'}>
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-gray-600">
                  {product.averageRating.toFixed(1)} ({product.reviewCount} {t('product.reviews')})
                </span>
              </div>

              {/* Price */}
              <p className="text-3xl font-bold text-blue-600 mb-4">
                NPR {product.price.toLocaleString()}
              </p>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{t('product.description')}</h2>
                <p className="text-gray-700 whitespace-pre-line">{product.description[currentLang]}</p>
              </div>

              {/* Category */}
              <p className="text-gray-600 mb-4">
                <span className="font-semibold">{t('product.category')}:</span> {product.category}
              </p>

              {/* Stock Status */}
              <p className={`mb-6 ${product.inventory > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.inventory > 0 ? t('product.inStock') : t('product.outOfStock')}
              </p>

              {/* Quantity Selector */}
              {product.inventory > 0 && (
                <div className="flex items-center gap-4 mb-6">
                  <label className="font-semibold">{t('cart.quantity')}:</label>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.inventory, quantity + 1))}
                      className="px-4 py-2 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={product.inventory === 0 || addingToCart}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {addingToCart ? t('common.loading') : t('common.addToCart')}
                </button>
                <button
                  onClick={handleAddToWishlist}
                  disabled={addingToWishlist}
                  className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                >
                  {addingToWishlist ? '...' : '♡'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">{t('product.reviews')}</h2>
          
          {user && (
            <div className="mb-8">
              <ReviewForm
                productId={product._id}
                onReviewSubmitted={() => setReviewRefresh(prev => prev + 1)}
              />
            </div>
          )}
          
          <ReviewList productId={product._id} refreshTrigger={reviewRefresh} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">{t('product.relatedProducts')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct._id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
