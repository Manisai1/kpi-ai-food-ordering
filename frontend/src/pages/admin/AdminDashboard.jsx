import { useState, useEffect } from 'react';
import { IndianRupee, ShoppingBag, TrendingUp, Clock, Settings } from 'lucide-react';
import api from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [prompt, setPrompt] = useState('');
  const [filterPrompt, setFilterPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');

  useEffect(() => {
    const loadStats = () => api.get('/dashboard/stats').then(({ data }) => setStats(data)).finally(() => setLoading(false));
    loadStats();
    
    // Load system prompt
    api.get('/admin/prompt').then(({ data }) => {
      setPrompt(data.system_prompt);
      if (data.filter_prompt) setFilterPrompt(data.filter_prompt);
    }).catch(err => console.error(err));

    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    setPromptMessage('');
    try {
      await api.put('/admin/prompt', { system_prompt: prompt, filter_prompt: filterPrompt });
      setPromptMessage('Prompts saved successfully!');
    } catch (err) {
      setPromptMessage('Failed to save prompt.');
    } finally {
      setSavingPrompt(false);
    }
  };

  if (loading || !stats) return <div className="center-loading"><div className="spinner" /></div>;

  const statusOrder = ['Placed', 'Confirmed', 'Preparing', 'Ready', 'Picked Up', 'Cancelled'];

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }}>Dashboard</h2>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <IndianRupee size={20} />
          </div>
          <div className="stat-value">₹{stats.total_revenue_today.toFixed(2)}</div>
          <div className="stat-label">Revenue Today</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-value">₹{stats.total_revenue_all_time.toFixed(2)}</div>
          <div className="stat-label">All-Time Revenue</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <ShoppingBag size={20} />
          </div>
          <div className="stat-value">{stats.orders_today}</div>
          <div className="stat-label">Orders Today</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <Clock size={20} />
          </div>
          <div className="stat-value">{stats.orders_by_status['Placed'] || 0}</div>
          <div className="stat-label">Pending Orders</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="card card-pad">
          <h4 style={{ marginBottom: '1rem' }}>Orders by Status</h4>
          {statusOrder.map((s) => (
            <div key={s} className="cart-summary-row" style={{ alignItems: 'center' }}>
              <span>{s}</span>
              <span style={{ fontWeight: 700 }}>{stats.orders_by_status[s] || 0}</span>
            </div>
          ))}
        </div>
        <div className="card card-pad">
          <h4 style={{ marginBottom: '1rem' }}>Most Popular Items</h4>
          {stats.popular_items.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No orders yet.</p>
          ) : (
            stats.popular_items.map((item, idx) => (
              <div key={item.name} className="cart-summary-row" style={{ alignItems: 'center' }}>
                <span>#{idx + 1} {item.name}</span>
                <span style={{ fontWeight: 700 }}>{item.quantity} sold</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card card-pad">
        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <Settings size={18} /> AI Configuration
        </h4>
        
        <h5 style={{ marginBottom: '0.5rem' }}>Cart Builder Prompt</h5>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Customize how the AI interprets natural language to build a cart. Use {"{menu_context}"} to inject the current menu data.
        </p>
        <textarea 
          className="input" 
          rows={6} 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '1.5rem' }}
        />

        <h5 style={{ marginBottom: '0.5rem' }}>Smart Filter Prompt</h5>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Customize the strict logical filtering rules the AI uses for Smart Search.
        </p>
        <textarea 
          className="input" 
          rows={6} 
          value={filterPrompt} 
          onChange={(e) => setFilterPrompt(e.target.value)} 
          style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '1rem' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={handleSavePrompt} disabled={savingPrompt}>
            {savingPrompt ? 'Saving...' : 'Save Prompts'}
          </button>
          {promptMessage && <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>{promptMessage}</span>}
        </div>
      </div>
    </div>
  );
}
