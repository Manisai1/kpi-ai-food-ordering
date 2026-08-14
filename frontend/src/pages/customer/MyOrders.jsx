import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import StatusBadge, { PaymentBadge } from '../../components/StatusBadge';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders').then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="center-loading"><div className="spinner" /></div>;

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 780 }}>
      <h2 style={{ marginBottom: '1.5rem' }}>My Orders</h2>
      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">📋</div>
          <h3>No orders yet</h3>
          <p style={{ marginBottom: '1.25rem' }}>Your order history will show up here.</p>
          <Link to="/" className="btn btn-primary">Browse Menu</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map((order) => (
            <Link to={`/order/${order.id}`} key={order.id} className="card card-pad" style={{ display: 'block' }}>
              <div className="section-head" style={{ marginBottom: '0.6rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Order #{order.id}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(order.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <StatusBadge status={order.status} />
                  <PaymentBadge status={order.payment_status} />
                </div>
              </div>
              <div style={{ fontSize: '0.87rem', color: 'var(--text-muted)' }}>
                {order.items.map((oi) => `${oi.menu_item.name} ×${oi.quantity}`).join(', ')}
              </div>
              <div style={{ marginTop: '0.5rem', fontWeight: 700 }}>₹{order.total_price.toFixed(2)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
