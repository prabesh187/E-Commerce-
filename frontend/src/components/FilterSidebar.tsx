import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export interface FilterState {
  categories: string[];
  minPrice: number;
  maxPrice: number;
  minRating: number;
}

const CATEGORIES = [
  'Handicrafts',
  'Textiles',
  'Jewelry',
  'Food & Beverages',
  'Art',
  'Home Decor',
  'Fashion',
  'Accessories',
];

const FilterSidebar = ({ onFilterChange, isOpen = true, onClose }: FilterSidebarProps) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    minPrice: 0,
    maxPrice: 100000,
    minRating: 0,
  });

  const [tempPriceRange, setTempPriceRange] = useState({
    min: 0,
    max: 100000,
  });

  useEffect(() => {
    setTempPriceRange({
      min: filters.minPrice,
      max: filters.maxPrice,
    });
  }, [filters.minPrice, filters.maxPrice]);

  const handleCategoryChange = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    
    setFilters({ ...filters, categories: newCategories });
  };

  const handleRatingChange = (rating: number) => {
    setFilters({ ...filters, minRating: rating === filters.minRating ? 0 : rating });
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseInt(value) || 0;
    setTempPriceRange({
      ...tempPriceRange,
      [type]: numValue,
    });
  };

  const applyFilters = () => {
    const newFilters = {
      ...filters,
      minPrice: tempPriceRange.min,
      maxPrice: tempPriceRange.max,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
    if (onClose) onClose();
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      categories: [],
      minPrice: 0,
      maxPrice: 100000,
      minRating: 0,
    };
    setFilters(defaultFilters);
    setTempPriceRange({ min: 0, max: 100000 });
    onFilterChange(defaultFilters);
  };

  const sidebarContent = (
    <div className="bg-white h-full overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('common.filter')}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('product.category')}</h3>
          <div className="space-y-2">
            {CATEGORIES.map((category) => (
              <label key={category} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => handleCategoryChange(category)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700">{category}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('product.price')} Range</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Min Price (NPR)</label>
              <input
                type="number"
                value={tempPriceRange.min}
                onChange={(e) => handlePriceChange('min', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Max Price (NPR)</label>
              <input
                type="number"
                value={tempPriceRange.max}
                onChange={(e) => handlePriceChange('max', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>NPR {tempPriceRange.min.toLocaleString()}</span>
              <span>-</span>
              <span>NPR {tempPriceRange.max.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Rating Filter */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('product.rating')}</h3>
          <div className="space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <label key={rating} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.minRating === rating}
                  onChange={() => handleRatingChange(rating)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-2 flex items-center">
                  {[...Array(5)].map((_, index) => (
                    <svg
                      key={index}
                      className={`w-4 h-4 ${
                        index < rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="ml-1 text-gray-700">& Up</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={applyFilters}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile drawer
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      <div className="md:hidden">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
        {/* Drawer */}
        <div className="fixed inset-y-0 left-0 w-80 max-w-full bg-white z-50 shadow-xl">
          {sidebarContent}
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;
