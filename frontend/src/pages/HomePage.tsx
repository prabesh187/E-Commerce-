import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import type { Product, Banner } from '../types';

const HomePage = () => {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [loading, setLoading] = useState(true);

  const categories = [
    { name: 'Handicrafts', icon: '🎨', link: '/products?category=handicrafts', gradient: 'from-purple-500 to-pink-500' },
    { name: 'Food', icon: '🍵', link: '/products?category=food', gradient: 'from-green-500 to-teal-500' },
    { name: 'Clothing', icon: '👕', link: '/products?category=clothing', gradient: 'from-blue-500 to-indigo-500' },
    { name: 'Electronics', icon: '📱', link: '/products?category=electronics', gradient: 'from-yellow-500 to-orange-500' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bannersRes, productsRes, recsRes] = await Promise.all([
          api.get('/banners').catch(() => ({ data: [] })),
          api.get('/products?limit=12').catch(() => ({ data: { products: [] } })),
          api.get('/recommendations').catch(() => ({ data: [] })),
        ]);

        setBanners(bannersRes.data.filter((b: Banner) => b.active));
        setFeaturedProducts(productsRes.data.products || productsRes.data || []);
        setRecommendations(recsRes.data.slice(0, 8));
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBanner((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading amazing products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Hero Banner Carousel */}
      {banners.length > 0 && (
        <div className="relative w-full h-96 md:h-[500px] bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden">
          {banners.map((banner, index) => (
            <div
              key={banner._id}
              className={`absolute inset-0 transition-all duration-700 ${
                index === currentBanner ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
            >
              <Link to={banner.link || '#'}>
                <img
                  src={banner.image}
                  alt={banner.title.en}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                  <div className="max-w-7xl mx-auto">
                    <h2 className="text-white text-3xl md:text-5xl font-bold mb-4 animate-fade-in">
                      {banner.title.en}
                    </h2>
                    <button className="bg-white text-gray-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg">
                      Shop Now →
                    </button>
                  </div>
                </div>
              </Link>
            </div>
          ))}
          
          {/* Modern Banner Navigation */}
          {banners.length > 1 && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 z-10">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBanner(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentBanner ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Discover Authentic <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Nepali Products</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Support local artisans and businesses. Shop handcrafted, authentic products made in Nepal 🇳🇵
        </p>
      </div>

      {/* Category Cards - Modern Design */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.link}
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
              <div className="relative p-8 text-center text-white">
                <div className="text-5xl mb-3 transform group-hover:scale-110 transition-transform">{category.icon}</div>
                <div className="font-bold text-lg">{category.name}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Products - Modern Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
            <p className="text-gray-600 mt-2">Handpicked items just for you</p>
          </div>
          <Link 
            to="/products" 
            className="hidden md:flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold group"
          >
            View All 
            <span className="transform group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
        
        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Products Yet</h3>
            <p className="text-gray-600 mb-6">Check back soon for amazing Nepali products!</p>
            <Link 
              to="/products" 
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        )}
        
        <div className="mt-8 text-center md:hidden">
          <Link 
            to="/products" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
          >
            View All Products →
          </Link>
        </div>
      </div>

      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl my-8">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">Recommended For You</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recommendations.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Trust Badges */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="p-6">
            <div className="text-4xl mb-3">✓</div>
            <h3 className="font-bold text-gray-900 mb-2">100% Authentic</h3>
            <p className="text-sm text-gray-600">Verified Nepali products</p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-3">🚚</div>
            <h3 className="font-bold text-gray-900 mb-2">Fast Delivery</h3>
            <p className="text-sm text-gray-600">Quick & reliable shipping</p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-3">💳</div>
            <h3 className="font-bold text-gray-900 mb-2">Secure Payment</h3>
            <p className="text-sm text-gray-600">eSewa, Khalti & COD</p>
          </div>
          <div className="p-6">
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="font-bold text-gray-900 mb-2">Support Local</h3>
            <p className="text-sm text-gray-600">Help Nepali artisans</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
