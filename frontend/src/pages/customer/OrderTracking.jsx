import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Phone, MapPin } from 'lucide-react';
import api from '../../api';
import StatusBadge, { PaymentBadge } from '../../components/StatusBadge';

const STEPS = ['Placed', 'Confirmed', 'Preparing', 'Ready', 'Picked Up'];

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load this order.');
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 8000); // poll for live status updates
    return () => clearInterval(interval);
  }, [fetchOrder]);

  if (error) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="emoji">😕</div>
          <h3>{error}</h3>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Menu</Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return <div className="center-loading"><div className="spinner" /></div>;
  }

  const currentStepIndex = STEPS.indexOf(order.status);
  const isCancelled = order.status === 'Cancelled';

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 720 }}>
      <div className="section-head">
        <div>
          <h2>Order #{order.id}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Placed {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.payment_status} />
        </div>
      </div>

      {!isCancelled && (
        <div className="card card-pad" style={{ marginBottom: '1.25rem' }}>
          <div className="tracker">
            {STEPS.map((step, idx) => (
              <div
                key={step}
                className={`tracker-step ${idx < currentStepIndex ? 'done' : ''} ${idx === currentStepIndex ? 'current' : ''}`}
              >
                <div className="tracker-dot">{idx < currentStepIndex ? <CheckCircle size={16} /> : idx + 1}</div>
                <div className="tracker-label">{step}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card card-pad" style={{ marginBottom: '1.25rem' }}>
        <h4 style={{ marginBottom: '0.8rem' }}>Delivery Details</h4>
        {order.delivery_address && (
          <p style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            <MapPin size={16} /> {order.delivery_address}
          </p>
        )}
        {order.customer_phone && (
          <p style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <Phone size={16} /> {order.customer_phone}
          </p>
        )}
      </div>

      <div className="card card-pad">
        <h4 style={{ marginBottom: '0.8rem' }}>Order Items</h4>
        {order.items.map((oi) => (
          <div key={oi.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <span>{oi.menu_item.image_emoji} {oi.menu_item.name} × {oi.quantity}</span>
            <span style={{ fontWeight: 600 }}>₹{(oi.price_at_time_of_order * oi.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="cart-summary-total"><span>Total Paid</span><span>₹{order.total_price.toFixed(2)}</span></div>
      </div>
    </div>
  );
}
