import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';

const WishlistPage = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const response = await api.get('/wishlist');
      setProducts(response.data.data.products || response.data.data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: string) => {
    setActionLoading(productId);
    try {
      await api.delete(`/wishlist/${productId}`);
      setProducts(products.filter((p) => p._id !== productId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      alert(t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleMoveToCart = async (productId: string) => {
    setActionLoading(productId);
    try {
      await api.post(`/wishlist/${productId}/move-to-cart`);
      setProducts(products.filter((p) => p._id !== productId));
      alert('Moved to cart successfully!');
    } catch (error) {
      console.error('Error moving to cart:', error);
      alert(t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t('nav.wishlist')}</h1>

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">♡</div>
            <h2 className="text-2xl font-bold mb-2">Your Wishlist is Empty</h2>
            <p className="text-gray-600 mb-6">
              Save items you love to your wishlist and shop them later!
            </p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 text-gray-600">
              {products.length} item(s) in your wishlist
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product._id} className="relative">
                  <ProductCard product={product} />
                  
                  {/* Action Buttons Overlay */}
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={() => handleMoveToCart(product._id)}
                      disabled={actionLoading === product._id || product.inventory === 0}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {actionLoading === product._id ? t('common.loading') : 'Move to Cart'}
                    </button>
                    <button
                      onClick={() => handleRemove(product._id)}
                      disabled={actionLoading === product._id}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {actionLoading === product._id ? t('common.loading') : t('cart.remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
