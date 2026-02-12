import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import type { Product } from '../types';

const ProductListPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const minRating = searchParams.get('minRating') || '';
  const sort = searchParams.get('sort') || 'weighted-rating';

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '12');
        if (category) params.append('category', category);
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);
        if (minRating) params.append('minRating', minRating);
        params.append('sortBy', sort);

        const response = await api.get(`/products?${params.toString()}`);
        
        // Handle the response structure correctly
        if (response.data.success && response.data.data) {
          setProducts(response.data.data.products || []);
          setTotalPages(response.data.data.totalPages || 1);
        } else {
          setProducts([]);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page, category, minPrice, maxPrice, minRating, sort]);

  const handleFilterChange = (filters: {
    categories: string[];
    minPrice: number;
    maxPrice: number;
    minRating: number;
  }) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', '1'); // Reset to first page on filter change

    if (filters.categories.length > 0) {
      newParams.set('category', filters.categories.join(','));
    } else {
      newParams.delete('category');
    }

    if (filters.minPrice > 0) {
      newParams.set('minPrice', filters.minPrice.toString());
    } else {
      newParams.delete('minPrice');
    }

    if (filters.maxPrice > 0) {
      newParams.set('maxPrice', filters.maxPrice.toString());
    } else {
      newParams.delete('maxPrice');
    }

    if (filters.minRating > 0) {
      newParams.set('minRating', filters.minRating.toString());
    } else {
      newParams.delete('minRating');
    }

    setSearchParams(newParams);
    setShowFilters(false);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', e.target.value);
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Products` : 'All Products'}
            </h1>
            <p className="text-gray-600 mt-2">Discover authentic Nepali products</p>
          </div>
          
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {t('common.filter')}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <FilterSidebar
              onFilterChange={handleFilterChange}
              isOpen={showFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {/* Sort Dropdown */}
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
              <p className="text-gray-700 font-medium">
                <span className="text-blue-600 font-bold">{products.length}</span> {products.length === 1 ? 'Product' : 'Products'} Found
              </p>
              <select
                value={sort}
                onChange={handleSortChange}
                className="border-2 border-gray-200 rounded-lg px-4 py-2 font-medium focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="newest">{t('sort.newest')}</option>
                <option value="weighted-rating">{t('sort.popularity')}</option>
                <option value="price-asc">{t('sort.price_low_high')}</option>
                <option value="price-desc">{t('sort.price_high_low')}</option>
                <option value="rating">{t('sort.rating_high_low')}</option>
              </select>
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <div className="text-8xl mb-6">🔍</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">No Products Found</h3>
                <p className="text-gray-600 text-lg mb-8">
                  {category 
                    ? `No products available in the ${category} category yet.`
                    : 'Try adjusting your filters or check back later for new products!'
                  }
                </p>
                <button
                  onClick={() => {
                    setSearchParams(new URLSearchParams());
                    setShowFilters(false);
                  }}
                  className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all transform hover:scale-105"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 font-semibold transition-all"
                >
                  ← {t('pagination.previous')}
                </button>
                
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-5 py-3 border-2 rounded-xl font-semibold transition-all ${
                        pageNum === page
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 font-semibold transition-all"
                >
                  {t('pagination.next')} →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductListPage;
