import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store/hooks';
import api from '../services/api';
import type { ShippingAddress } from '../types';

const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/me');
      setAddresses(response.data.data.shippingAddresses || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
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
        <h1 className="text-3xl font-bold mb-8">{t('nav.profile')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Email
                  </label>
                  <p className="text-lg">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Phone
                  </label>
                  <p className="text-lg">{user?.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Role
                  </label>
                  <p className="text-lg capitalize">{user?.role}</p>
                </div>
                {user?.role === 'seller' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Business Name
                      </label>
                      <p className="text-lg">{user?.businessName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Verification Status
                      </label>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          user?.verificationStatus === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : user?.verificationStatus === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {user?.verificationStatus?.toUpperCase()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Shipping Addresses */}
            {user?.role === 'buyer' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Shipping Addresses</h2>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Add Address
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">
                    No shipping addresses saved yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((address, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-500"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold">{address.fullName}</p>
                          {address.isDefault && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700">{address.phone}</p>
                        <p className="text-gray-700">{address.addressLine1}</p>
                        {address.addressLine2 && (
                          <p className="text-gray-700">{address.addressLine2}</p>
                        )}
                        <p className="text-gray-700">
                          {address.city}, {address.state} {address.postalCode}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button className="text-blue-600 hover:underline text-sm">
                            Edit
                          </button>
                          <button className="text-red-600 hover:underline text-sm">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Language Preference */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Language Preference</h2>
              <div className="space-y-2">
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="language"
                    value="en"
                    checked={i18n.language === 'en'}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3">English</span>
                </label>
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="language"
                    value="ne"
                    checked={i18n.language === 'ne'}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-3">नेपाली (Nepali)</span>
                </label>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Email Notifications</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Order Updates</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Promotions</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">New Products</span>
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </label>
              </div>
              <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                Save Preferences
              </button>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Account Actions</h2>
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                  Change Password
                </button>
                <button className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
