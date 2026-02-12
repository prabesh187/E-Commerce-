import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { Product } from '../types';

const SellerProductsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/seller/products');
      setProducts(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm(t('seller.products.confirm_delete'))) return;
    
    try {
      await api.delete(`/api/products/${productId}`);
      setProducts(products.filter(p => p._id !== productId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete product');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('seller.products.title')}
        </h1>
        <button
          onClick={() => navigate('/seller/products/new')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          {t('seller.products.create_product')}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600 mb-4">{t('seller.products.no_products')}</p>
          <button
            onClick={() => navigate('/seller/products/new')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            {t('seller.products.create_first')}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('seller.products.product')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('seller.products.price')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('seller.products.inventory')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('seller.products.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('seller.products.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={product.images[0] || '/placeholder.png'}
                          alt={product.title[i18n.language as 'en' | 'ne']}
                          className="h-12 w-12 rounded object-cover"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {product.title[i18n.language as 'en' | 'ne']}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.category}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        NPR {product.price.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.inventory}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(product.verificationStatus)}`}>
                        {t(`seller.products.status_${product.verificationStatus}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/seller/products/${product._id}/edit`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {products.map((product) => (
              <div key={product._id} className="border-b border-gray-200 p-4">
                <div className="flex items-start space-x-4">
                  <img
                    src={product.images[0] || '/placeholder.png'}
                    alt={product.title[i18n.language as 'en' | 'ne']}
                    className="h-20 w-20 rounded object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {product.title[i18n.language as 'en' | 'ne']}
                    </h3>
                    <p className="text-sm text-gray-500">{product.category}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      NPR {product.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t('seller.products.inventory')}: {product.inventory}
                    </p>
                    <span className={`mt-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(product.verificationStatus)}`}>
                      {t(`seller.products.status_${product.verificationStatus}`)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={() => navigate(`/seller/products/${product._id}/edit`)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerProductsPage;
