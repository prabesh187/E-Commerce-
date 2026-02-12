import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCart } from '../store/slices/cartSlice';
import api from '../services/api';

const CartPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items, totalAmount } = useAppSelector((state) => state.cart);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await api.get('/cart');
      if (response.data.success) {
        dispatch(setCart(response.data.data));
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setUpdating(itemId);
    try {
      await api.put(`/cart/${itemId}`, { quantity: newQuantity });
      await fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert(t('common.error'));
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      await api.delete(`/cart/${itemId}`);
      await fetchCart();
    } catch (error) {
      console.error('Error removing item:', error);
      alert(t('common.error'));
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h1 className="text-3xl font-bold mb-4">{t('cart.empty')}</h1>
            <p className="text-gray-600 mb-8">Add some products to your cart to get started!</p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700"
            >
              {t('nav.products')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentLang = i18n.language as 'en' | 'ne';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t('cart.title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-lg shadow-md p-6 flex flex-col sm:flex-row gap-4"
              >
                {/* Product Image */}
                <Link
                  to={`/products/${item.product._id}`}
                  className="flex-shrink-0"
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.title[currentLang]}
                    className="w-full sm:w-32 h-32 object-cover rounded-lg"
                  />
                </Link>

                {/* Product Details */}
                <div className="flex-grow">
                  <Link
                    to={`/products/${item.product._id}`}
                    className="text-lg font-semibold hover:text-blue-600 mb-2 block"
                  >
                    {item.product.title[currentLang]}
                  </Link>
                  <p className="text-2xl font-bold text-blue-600 mb-4">
                    NPR {item.product.price.toLocaleString()}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                        disabled={updating === item._id || item.quantity <= 1}
                        className="px-4 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        -
                      </button>
                      <span className="px-4 py-2 border-x border-gray-300 min-w-[60px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                        disabled={updating === item._id || item.quantity >= item.product.inventory}
                        className="px-4 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      disabled={updating === item._id}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {t('cart.remove')}
                    </button>
                  </div>

                  {/* Subtotal */}
                  <p className="text-gray-600 mt-4">
                    Subtotal: NPR {(item.product.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.length} items)</span>
                  <span>NPR {totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-xl font-bold">
                  <span>{t('cart.total')}</span>
                  <span>NPR {totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-4"
              >
                {t('cart.checkout')}
              </button>

              <Link
                to="/products"
                className="block text-center text-blue-600 hover:underline"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
