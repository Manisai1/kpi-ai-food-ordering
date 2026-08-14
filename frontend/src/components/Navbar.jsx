import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, ClipboardList, LayoutDashboard, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const onAdminSide = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getBrandLink = () => {
    if (onAdminSide) return '/admin';
    if (isAuthenticated) return '/menu';
    return '/';
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to={getBrandLink()} className="brand">🍽️ KPI Food</Link>

        {!onAdminSide ? (
          <div className="nav-actions">
            <Link to={getBrandLink()} className="icon-btn" title="Home">
              <Home size={19} />
            </Link>
            {isAuthenticated && !isAdmin && (
              <Link to="/orders" className="icon-btn" title="My orders">
                <ClipboardList size={19} />
              </Link>
            )}
            <Link to="/cart" className="icon-btn" title="Cart">
              <ShoppingCart size={19} />
              {totalItems > 0 && <span className="badge-count">{totalItems}</span>}
            </Link>
            {isAuthenticated ? (
              <>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Hi, {user.name.split(' ')[0]}
                </span>
                <button className="icon-btn" title="Logout" onClick={handleLogout}>
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">
                <User size={16} /> Login
              </Link>
            )}
          </div>
        ) : (
          <div className="nav-actions">
            {isAuthenticated && isAdmin && (
              <>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>{user.name}</span>
                <button className="btn btn-outline btn-sm" onClick={handleLogout}>
                  <LogOut size={15} /> Logout
                </button>
              </>
            )}
            <Link to="/menu" className="btn btn-ghost btn-sm">View site</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
