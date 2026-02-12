import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { Product } from '../types';

const ProductVerificationPage = () => {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingProducts();
  }, []);

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/products/pending');
      setProducts(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load pending products');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (productId: string, approved: boolean) => {
    if (!approved && !reason.trim()) {
      alert(t('admin.products.reason_required'));
      return;
    }

    try {
      setActionLoading(true);
      await api.put(`/api/admin/products/${productId}/verify`, {
        approved,
        reason: approved ? undefined : reason
      });
      
      // Remove from list
      setProducts(products.filter(p => p._id !== productId));
      setSelectedProduct(null);
      setReason('');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to verify product');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {t('admin.products.title')}
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">{t('admin.products.no_pending')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Products List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('admin.products.pending_list')} ({products.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {products.map((product) => (
                <div
                  key={product._id}
                  onClick={() => setSelectedProduct(product)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                    selectedProduct?._id === product._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <img
                      src={product.images[0] || '/placeholder.png'}
                      alt={product.title[i18n.language as 'en' | 'ne']}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {product.title[i18n.language as 'en' | 'ne']}
                      </p>
                      <p className="text-sm text-gray-600">
                        {product.category}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        NPR {product.price.toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {t('admin.products.pending')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="bg-white rounded-lg shadow">
            {selectedProduct ? (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('admin.products.product_details')}
                </h2>
                
                {/* Product Images */}
                <div className="mb-4">
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProduct.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Product ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {t('admin.products.title_en')}
                    </label>
                    <p className="text-gray-900">{selectedProduct.title.en}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {t('admin.products.title_ne')}
                    </label>
                    <p className="text-gray-900">{selectedProduct.title.ne}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {t('admin.products.description_en')}
                    </label>
                    <p className="text-gray-900 text-sm">{selectedProduct.description.en}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {t('admin.products.description_ne')}
                    </label>
                    <p className="text-gray-900 text-sm">{selectedProduct.description.ne}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {t('product.price')}
                      </label>
                      <p className="text-gray-900 font-semibold">
                        NPR {selectedProduct.price.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {t('product.category')}
                      </label>
                      <p className="text-gray-900">{selectedProduct.category}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {t('admin.products.inventory')}
                    </label>
                    <p className="text-gray-900">{selectedProduct.inventory}</p>
                  </div>
                </div>

                {/* Rejection Reason */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.products.rejection_reason')}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('admin.products.reason_placeholder')}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleVerify(selectedProduct._id, true)}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? t('common.loading') : t('admin.products.approve')}
                  </button>
                  <button
                    onClick={() => handleVerify(selectedProduct._id, false)}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? t('common.loading') : t('admin.products.reject')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                {t('admin.products.select_product')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductVerificationPage;
