import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { Order } from '../types';

const OrderConfirmationPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { t, i18n } = useTranslation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      
      setLoading(true);
      try {
        const response = await api.get(`/orders/${orderId}`);
        setOrder(response.data.data);
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Order not found</p>
      </div>
    );
  }

  const currentLang = i18n.language as 'en' | 'ne';
  const paymentStatusColor = 
    order.paymentStatus === 'completed' ? 'text-green-600' :
    order.paymentStatus === 'failed' ? 'text-red-600' :
    'text-yellow-600';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order. We'll send you a confirmation email shortly.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
            <p className="text-sm text-gray-600 mb-1">{t('order.orderNumber')}</p>
            <p className="text-2xl font-bold text-blue-600">{order.orderNumber}</p>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Order Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('order.trackingNumber')}</p>
              <p className="font-semibold">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('order.date')}</p>
              <p className="font-semibold">
                {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Method</p>
              <p className="font-semibold uppercase">{order.paymentMethod}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Status</p>
              <p className={`font-semibold uppercase ${paymentStatusColor}`}>
                {order.paymentStatus}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Items Ordered</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => {
                const product = typeof item.product === 'object' ? item.product : null;
                return (
                  <div key={index} className="flex gap-4">
                    {product && (
                      <>
                        <img
                          src={product.images[0]}
                          alt={product.title[currentLang]}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-grow">
                          <p className="font-medium">{product.title[currentLang]}</p>
                          <p className="text-gray-600 text-sm">Quantity: {item.quantity}</p>
                          <p className="text-blue-600 font-semibold">
                            NPR {(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div className="border-t mt-6 pt-6">
            <div className="flex justify-between text-xl font-bold">
              <span>{t('cart.total')}</span>
              <span>NPR {order.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
          <div className="text-gray-700">
            <p className="font-semibold">{order.shippingAddress.fullName}</p>
            <p>{order.shippingAddress.phone}</p>
            <p>{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && (
              <p>{order.shippingAddress.addressLine2}</p>
            )}
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.postalCode}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to={`/orders/${order._id}`}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 text-center"
          >
            View Order Details
          </Link>
          <Link
            to="/products"
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 text-center"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
