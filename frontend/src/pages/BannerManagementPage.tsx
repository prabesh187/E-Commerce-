import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Banner } from '../types';

const BannerManagementPage = () => {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    titleEn: '',
    titleNe: '',
    image: '',
    link: '',
    active: true
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/admin/banners', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBanners(data.data);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const bannerData = {
      title: {
        en: formData.titleEn,
        ne: formData.titleNe
      },
      image: formData.image,
      link: formData.link,
      active: formData.active
    };

    try {
      const url = editingBanner 
        ? `/api/admin/banners/${editingBanner._id}`
        : '/api/admin/banners';
      
      const response = await fetch(url, {
        method: editingBanner ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bannerData)
      });

      if (response.ok) {
        fetchBanners();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving banner:', error);
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm(t('admin.banners.confirm_delete'))) return;

    try {
      const response = await fetch(`/api/admin/banners/${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchBanners();
      }
    } catch (error) {
      console.error('Error deleting banner:', error);
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      titleEn: banner.title.en,
      titleNe: banner.title.ne,
      image: banner.image,
      link: banner.link || '',
      active: banner.active
    });
    setShowForm(true);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newBanners = [...banners];
    [newBanners[index], newBanners[index - 1]] = [newBanners[index - 1], newBanners[index]];
    await updateBannerOrder(newBanners);
  };

  const handleMoveDown = async (index: number) => {
    if (index === banners.length - 1) return;
    const newBanners = [...banners];
    [newBanners[index], newBanners[index + 1]] = [newBanners[index + 1], newBanners[index]];
    await updateBannerOrder(newBanners);
  };

  const updateBannerOrder = async (newBanners: Banner[]) => {
    try {
      const updates = newBanners.map((banner, index) => ({
        id: banner._id,
        order: index
      }));

      await fetch('/api/admin/banners/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ banners: updates })
      });

      setBanners(newBanners);
    } catch (error) {
      console.error('Error updating banner order:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      titleEn: '',
      titleNe: '',
      image: '',
      link: '',
      active: true
    });
    setEditingBanner(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('admin.banners.title')}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? t('common.cancel') : t('admin.banners.create_banner')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingBanner ? t('admin.banners.edit_banner') : t('admin.banners.create_banner')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('admin.banners.title_en')}
              </label>
              <input
                type="text"
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('admin.banners.title_ne')}
              </label>
              <input
                type="text"
                value={formData.titleNe}
                onChange={(e) => setFormData({ ...formData, titleNe: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('admin.banners.image_url')}
              </label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="https://example.com/image.jpg"
                required
              />
              {formData.image && (
                <img 
                  src={formData.image} 
                  alt="Preview" 
                  className="mt-2 h-32 object-cover rounded"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('admin.banners.link')}
              </label>
              <input
                type="text"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="/products?category=handicrafts"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="active" className="text-sm font-medium">
                {t('admin.banners.active')}
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {banners.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {t('admin.banners.no_banners')}
          </div>
        ) : (
          <div className="divide-y">
            {banners.map((banner, index) => (
              <div key={banner._id} className="p-4 flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === banners.length - 1}
                    className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                  >
                    ↓
                  </button>
                </div>

                <img 
                  src={banner.image} 
                  alt={banner.title.en}
                  className="w-32 h-20 object-cover rounded"
                />

                <div className="flex-1">
                  <h3 className="font-semibold">{banner.title.en}</h3>
                  <p className="text-sm text-gray-600">{banner.title.ne}</p>
                  {banner.link && (
                    <p className="text-sm text-blue-600">{banner.link}</p>
                  )}
                  <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                    banner.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {banner.active ? t('admin.banners.active') : t('admin.banners.inactive')}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(banner)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(banner._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerManagementPage;
