import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { Product } from '../types';

const ProductFormPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { productId } = useParams();
  const isEditMode = !!productId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    titleEn: '',
    titleNe: '',
    descriptionEn: '',
    descriptionNe: '',
    price: '',
    category: '',
    inventory: ''
  });

  useEffect(() => {
    if (isEditMode) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/products/${productId}`);
      const product: Product = response.data.data;
      
      setFormData({
        titleEn: product.title.en,
        titleNe: product.title.ne,
        descriptionEn: product.description.en,
        descriptionNe: product.description.ne,
        price: product.price.toString(),
        category: product.category,
        inventory: product.inventory.toString()
      });
      setExistingImages(product.images);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);
    
    // Create previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const validateForm = () => {
    if (!formData.titleEn.trim()) {
      setError('English title is required');
      return false;
    }
    if (!formData.titleNe.trim()) {
      setError('Nepali title is required');
      return false;
    }
    if (!formData.descriptionEn.trim()) {
      setError('English description is required');
      return false;
    }
    if (!formData.descriptionNe.trim()) {
      setError('Nepali description is required');
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Valid price is required');
      return false;
    }
    if (!formData.category) {
      setError('Category is required');
      return false;
    }
    if (!formData.inventory || parseInt(formData.inventory) < 0) {
      setError('Valid inventory is required');
      return false;
    }
    if (!isEditMode && imageFiles.length === 0) {
      setError('At least one image is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Upload images first if there are new ones
      let imageUrls = existingImages;
      if (imageFiles.length > 0) {
        const formDataImages = new FormData();
        imageFiles.forEach(file => {
          formDataImages.append('images', file);
        });
        
        const uploadResponse = await api.post('/api/products/upload-image', formDataImages, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        imageUrls = uploadResponse.data.data.urls;
      }

      // Create or update product
      const productData = {
        title: {
          en: formData.titleEn,
          ne: formData.titleNe
        },
        description: {
          en: formData.descriptionEn,
          ne: formData.descriptionNe
        },
        price: parseFloat(formData.price),
        category: formData.category,
        inventory: parseInt(formData.inventory),
        images: imageUrls
      };

      if (isEditMode) {
        await api.put(`/api/products/${productId}`, productData);
      } else {
        await api.post('/api/products', productData);
      }

      navigate('/seller/products');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {isEditMode ? t('seller.products.edit_product') : t('seller.products.create_product')}
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {/* English Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('seller.products.title_en')} *
          </label>
          <input
            type="text"
            name="titleEn"
            value={formData.titleEn}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Nepali Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('seller.products.title_ne')} *
          </label>
          <input
            type="text"
            name="titleNe"
            value={formData.titleNe}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* English Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('seller.products.description_en')} *
          </label>
          <textarea
            name="descriptionEn"
            value={formData.descriptionEn}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Nepali Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('seller.products.description_ne')} *
          </label>
          <textarea
            name="descriptionNe"
            value={formData.descriptionNe}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Price and Inventory Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('product.price')} (NPR) *
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('seller.products.inventory')} *
            </label>
            <input
              type="number"
              name="inventory"
              value={formData.inventory}
              onChange={handleInputChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('product.category')} *
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">{t('seller.products.select_category')}</option>
            <option value="handicrafts">{t('categories.handicrafts')}</option>
            <option value="textiles">{t('categories.textiles')}</option>
            <option value="food_&_beverages">{t('categories.food_&_beverages')}</option>
            <option value="jewelry">{t('categories.jewelry')}</option>
            <option value="home_decor">{t('categories.home_decor')}</option>
            <option value="clothing">{t('categories.clothing')}</option>
          </select>
        </div>

        {/* Image Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('seller.products.images')} {!isEditMode && '*'}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">
            {t('seller.products.image_hint')}
          </p>

          {/* Image Previews */}
          {(imagePreviews.length > 0 || existingImages.length > 0) && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {imagePreviews.length > 0
                ? imagePreviews.map((preview, index) => (
                    <img
                      key={index}
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))
                : existingImages.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Existing ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? t('common.loading') : t('common.save')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/seller/products')}
            className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductFormPage;
