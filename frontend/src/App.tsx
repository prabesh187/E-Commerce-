import { Routes, Route } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OrderDetailPage from './pages/OrderDetailPage';
import WishlistPage from './pages/WishlistPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import SellerProductsPage from './pages/SellerProductsPage';
import ProductFormPage from './pages/ProductFormPage';
import SellerOrdersPage from './pages/SellerOrdersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SellerVerificationPage from './pages/SellerVerificationPage';
import ProductVerificationPage from './pages/ProductVerificationPage';
import BannerManagementPage from './pages/BannerManagementPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        
        {/* Protected Routes - Buyer */}
        <Route path="/cart" element={
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        } />
        <Route path="/checkout" element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:orderId/confirmation" element={
          <ProtectedRoute>
            <OrderConfirmationPage />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute>
            <OrderHistoryPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:orderId" element={
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/wishlist" element={
          <ProtectedRoute>
            <WishlistPage />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        
        {/* Protected Routes - Seller */}
        <Route path="/seller/dashboard" element={
          <ProtectedRoute requiredRole="seller">
            <div className="container mx-auto p-8">Seller Dashboard (Coming Soon)</div>
          </ProtectedRoute>
        } />
        <Route path="/seller/products" element={
          <ProtectedRoute requiredRole="seller">
            <SellerProductsPage />
          </ProtectedRoute>
        } />
        <Route path="/seller/products/new" element={
          <ProtectedRoute requiredRole="seller">
            <ProductFormPage />
          </ProtectedRoute>
        } />
        <Route path="/seller/products/:productId/edit" element={
          <ProtectedRoute requiredRole="seller">
            <ProductFormPage />
          </ProtectedRoute>
        } />
        <Route path="/seller/orders" element={
          <ProtectedRoute requiredRole="seller">
            <SellerOrdersPage />
          </ProtectedRoute>
        } />
        
        {/* Protected Routes - Admin */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/sellers/pending" element={
          <ProtectedRoute requiredRole="admin">
            <SellerVerificationPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/products/pending" element={
          <ProtectedRoute requiredRole="admin">
            <ProductVerificationPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/banners" element={
          <ProtectedRoute requiredRole="admin">
            <BannerManagementPage />
          </ProtectedRoute>
        } />
        
        {/* 404 */}
        <Route path="*" element={
          <div className="container mx-auto p-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
            <p className="text-gray-600">Page not found</p>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;
