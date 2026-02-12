import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { User } from '../types';

const SellerVerificationPage = () => {
  const { t } = useTranslation();
  const [sellers, setSellers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<User | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingSellers();
  }, []);

  const fetchPendingSellers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/sellers/pending');
      setSellers(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load pending sellers');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (sellerId: string, approved: boolean) => {
    if (!approved && !reason.trim()) {
      alert(t('admin.sellers.reason_required'));
      return;
    }

    try {
      setActionLoading(true);
      await api.put(`/api/admin/sellers/${sellerId}/verify`, {
        approved,
        reason: approved ? undefined : reason
      });
      
      // Remove from list
      setSellers(sellers.filter(s => s._id !== sellerId));
      setSelectedSeller(null);
      setReason('');
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to verify seller');
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
        {t('admin.sellers.title')}
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {sellers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">{t('admin.sellers.no_pending')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sellers List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('admin.sellers.pending_list')} ({sellers.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {sellers.map((seller) => (
                <div
                  key={seller._id}
                  onClick={() => setSelectedSeller(seller)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                    selectedSeller?._id === seller._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {seller.businessName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {seller.email || seller.phone}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {seller.businessAddress}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {t('admin.sellers.pending')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seller Details */}
          <div className="bg-white rounded-lg shadow">
            {selectedSeller ? (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('admin.sellers.seller_details')}
                </h2>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {t('admin.sellers.business_name')}
                    </label>
                    <p className="text-gray-900">{selectedSeller.businessName}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {t('admin.sellers.contact')}
                    </label>
                    <p className="text-gray-900">
                      {selectedSeller.email || selectedSeller.phone}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      {t('admin.sellers.business_address')}
                    </label>
                    <p className="text-gray-900">{selectedSeller.businessAddress}</p>
                  </div>
                  
                  {selectedSeller.documents && selectedSeller.documents.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        {t('admin.sellers.documents')}
                      </label>
                      <div className="space-y-2">
                        {selectedSeller.documents.map((doc: string, index: number) => (
                          <a
                            key={index}
                            href={doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-blue-600 hover:text-blue-800 text-sm"
                          >
                            {t('admin.sellers.document')} {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rejection Reason */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.sellers.rejection_reason')}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('admin.sellers.reason_placeholder')}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleVerify(selectedSeller._id, true)}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? t('common.loading') : t('admin.sellers.approve')}
                  </button>
                  <button
                    onClick={() => handleVerify(selectedSeller._id, false)}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? t('common.loading') : t('admin.sellers.reject')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                {t('admin.sellers.select_seller')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerVerificationPage;
