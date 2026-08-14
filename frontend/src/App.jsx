import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import { CustomerRoute, AdminRoute } from './components/ProtectedRoute';
import { Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Menu from './pages/customer/Home'; // This is actually the menu search page, we'll keep its file as is for now, or just import it as Menu
import Cart from './pages/customer/Cart';
import UnifiedLogin from './pages/customer/Login'; // Unified login
import CustomerRegister from './pages/customer/Register';
import OrderTracking from './pages/customer/OrderTracking';
import MyOrders from './pages/customer/MyOrders';

import AdminRegister from './pages/admin/AdminRegister'; // Keeping just in case invite link is used
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import MenuManagement from './pages/admin/MenuManagement';
import OrdersManagement from './pages/admin/OrdersManagement';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1 }}>
              <Routes>
                {/* Public landing and menu */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/menu" element={<Menu />} />
                
                {/* Unified Login */}
                <Route path="/login" element={<UnifiedLogin />} />
                <Route path="/admin/login" element={<Navigate to="/login" replace />} />
                <Route path="/register" element={<CustomerRegister />} />
                <Route path="/admin/register" element={<AdminRegister />} />
                
                {/* Customer routes */}
                <Route path="/cart" element={<Cart />} />
                <Route path="/order/:id" element={<OrderTracking />} />
                <Route
                  path="/orders"
                  element={
                    <CustomerRoute>
                      <MyOrders />
                    </CustomerRoute>
                  }
                />

                {/* Admin protected area */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="menu" element={<MenuManagement />} />
                  <Route path="orders" element={<OrdersManagement />} />
                </Route>
              </Routes>
            </main>
            <footer className="footer">
              <div className="container">
                🍽️ KPI Food — Powered by AI-driven menu search · Payments secured by Razorpay
              </div>
            </footer>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
