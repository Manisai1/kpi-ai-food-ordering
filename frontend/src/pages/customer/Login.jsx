import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function UnifiedLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('user'); // 'user' or 'admin'
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      
      if (role === 'admin') {
        if (user.role?.toLowerCase() !== 'admin') {
          setError('This account is not an admin account.');
          return;
        }
        navigate('/admin');
      } else {
        if (user.role?.toLowerCase() !== 'customer') {
          setError('This is an admin account. Please select Admin role.');
          return;
        }
        navigate(location.state?.from || '/menu');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={role === 'admin' ? { background: 'linear-gradient(135deg, #1c1c1c, #2c2c2c)' } : {}}>
      <div className="card auth-card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <button 
            type="button"
            className={`btn ${role === 'user' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ flex: 1 }} 
            onClick={() => setRole('user')}
          >
            <UserIcon size={18} /> User
          </button>
          <button 
            type="button"
            className={`btn ${role === 'admin' ? 'btn-primary' : 'btn-ghost'}`} 
            style={{ flex: 1 }}
            onClick={() => setRole('admin')}
          >
            <ShieldCheck size={18} /> Admin
          </button>
        </div>

        {role === 'admin' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
              <ShieldCheck size={22} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.04em' }}>ADMIN PORTAL</span>
            </div>
            <h2 className="auth-title">Restaurant Admin</h2>
            <p className="auth-subtitle">Manage menu, orders and view live sales.</p>
          </>
        ) : (
          <>
            <h2 className="auth-title">Welcome back 👋</h2>
            <p className="auth-subtitle">Log in to order your favourite food.</p>
          </>
        )}

        {error && <div className="alert-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              placeholder={role === 'admin' ? 'admin@kpifood.com' : 'you@example.com'} />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Logging in…' : (role === 'admin' ? 'Log In to Dashboard' : 'Log In')}
          </button>
        </form>
        
        <div className="auth-switch">
          {role === 'admin' ? (
            <>Need an admin account? <Link to="/admin/register">Register with invite code</Link></>
          ) : (
            <>New here? <Link to="/register">Create an account</Link></>
          )}
        </div>
        
        <div className="demo-hint">
          {role === 'admin' ? (
            <>Demo login: <b>admin@kpifood.com</b> / <b>Admin@123</b></>
          ) : (
            <>Demo login: <b>customer@demo.com</b> / <b>Demo@123</b></>
          )}
        </div>
      </div>
    </div>
  );
}
