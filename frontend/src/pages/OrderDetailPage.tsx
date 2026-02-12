import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { Order } from '../types';

const OrderDetailPage = () => {
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
        <div className="text-center mt-4">
          <Link to="/orders" className="text-blue-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const currentLang = i18n.language as 'en' | 'ne';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <Link to="/" className="text-blue-600 hover:underline">{t('nav.home')}</Link>
          <span className="mx-2">/</span>
          <Link to="/orders" className="text-blue-600 hover:underline">{t('order.title')}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{order.orderNumber}</span>
        </nav>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{t('order.details')}</h1>
          <Link
            to="/orders"
            className="text-blue-600 hover:underline"
          >
            ← Back to Orders
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('order.orderNumber')}</p>
                  <p className="text-2xl font-bold">{order.orderNumber}</p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('order.date')}</p>
                  <p className="font-medium">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                  <p className="font-medium uppercase">{order.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                  <p className="font-medium uppercase">{order.paymentStatus}</p>
                </div>
                {order.transactionId && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
                    <p className="font-medium">{order.transactionId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Status Timeline */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Order Timeline</h2>
              <div className="space-y-4">
                {order.statusHistory.map((history, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="ml-4 flex-grow">
                      <p className="font-semibold capitalize">{history.status}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(history.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => {
                  const product = typeof item.product === 'object' ? item.product : null;
                  return (
                    <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
                      {product && (
                        <>
                          <Link to={`/products/${product._id}`}>
                            <img
                              src={product.images[0]}
                              alt={product.title[currentLang]}
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                          </Link>
                          <div className="flex-grow">
                            <Link
                              to={`/products/${product._id}`}
                              className="font-semibold hover:text-blue-600 block mb-1"
                            >
                              {product.title[currentLang]}
                            </Link>
                            <p className="text-gray-600 text-sm mb-2">
                              Quantity: {item.quantity}
                            </p>
                            <p className="text-blue-600 font-bold">
                              NPR {item.price.toLocaleString()} × {item.quantity} = NPR{' '}
                              {(item.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t mt-6 pt-6">
                <div className="flex justify-between text-xl font-bold">
                  <span>{t('cart.total')}</span>
                  <span>NPR {order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
              <div className="text-gray-700 space-y-1">
                <p className="font-semibold">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.phone}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && (
                  <p>{order.shippingAddress.addressLine2}</p>
                )}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}
                </p>
                <p>{order.shippingAddress.postalCode}</p>
              </div>
            </div>

            {/* Tracking Info */}
            {order.status === 'shipped' || order.status === 'delivered' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-bold mb-2">{t('order.trackingNumber')}</h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">{order.orderNumber}</p>
                <p className="text-sm text-gray-600">
                  Use this tracking number to track your shipment
                </p>
              </div>
            ) : null}

            {/* Actions */}
            <div className="space-y-3">
              {order.status === 'delivered' && (
                <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
                  Leave a Review
                </button>
              )}
              {order.status === 'pending' && (
                <button className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700">
                  Cancel Order
                </button>
              )}
              <Link
                to="/products"
                className="block w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 text-center"
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

export default OrderDetailPage;
