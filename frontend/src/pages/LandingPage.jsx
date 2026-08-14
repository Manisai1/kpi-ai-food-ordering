import { Link, Navigate } from 'react-router-dom';
import { Sparkles, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated, isAdmin } = useAuth();

  // If already logged in, redirect to menu (or admin dashboard if admin)
  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/menu'} replace />;
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <section className="hero" style={{ background: 'transparent', padding: '4rem 1rem' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '1.5rem', borderRadius: '50%' }}>
              <UtensilsCrossed size={64} />
            </div>
          </div>
          <h1 className="hero-title" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>
            Welcome to <span>KPI Food</span>
          </h1>
          <p className="hero-subtitle" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
            Describe what you're in the mood for and our AI will find the best matches from today's menu. 
            Fresh, delicious, and delivered right to your door.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.85rem 2.5rem', fontSize: '1.1rem' }}>
              <Sparkles size={18} /> Get Started
            </Link>
            <Link to="/menu" className="btn btn-outline" style={{ padding: '0.85rem 2.5rem', fontSize: '1.1rem' }}>
              Browse Menu
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
