import { useState, useEffect } from 'react';
import api from '../../api';
import StatusBadge, { PaymentBadge } from '../../components/StatusBadge';

const STATUS_FLOW = ['Placed', 'Confirmed', 'Preparing', 'Ready', 'Picked Up'];
const FILTERS = ['All', ...STATUS_FLOW, 'Cancelled'];

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = () => {
    api.get('/orders').then(({ data }) => setOrders(data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const nextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  const updateStatus = async (order, status) => {
    setUpdatingId(order.id);
    try {
      await api.put(`/orders/${order.id}/status`, { status });
      loadOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  const visibleOrders = filter === 'All' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <div className="section-head">
        <h2>Orders</h2>
      </div>

      <div className="category-row" style={{ paddingTop: 0 }}>
        {FILTERS.map((f) => (
          <button key={f} className={`category-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="center-loading"><div className="spinner" /></div>
      ) : visibleOrders.length === 0 ? (
        <div className="empty-state"><div className="emoji">📭</div><h3>No orders here</h3></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {visibleOrders.map((order) => {
            const next = nextStatus(order.status);
            return (
              <div className="card card-pad" key={order.id}>
                <div className="section-head" style={{ marginBottom: '0.6rem' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      Order #{order.id} — {order.order_type}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(order.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <StatusBadge status={order.status} />
                    <PaymentBadge status={order.payment_status} />
                  </div>
                </div>

                <div style={{ fontSize: '0.87rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {order.items.map((oi) => `${oi.menu_item.name} ×${oi.quantity}`).join(', ')}
                </div>
                
                {order.order_type === 'Online Delivery' && order.delivery_address && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-faint)', marginBottom: '0.6rem' }}>
                    📍 {order.delivery_address}
                  </div>
                )}
                
                {order.order_type === 'Dine-in' && order.table_number && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-faint)', marginBottom: '0.6rem' }}>
                    🍽️ Table: {order.table_number}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>₹{order.total_price.toFixed(2)}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {order.status !== 'Cancelled' && order.status !== 'Picked Up' && (
                      <button className="btn btn-outline btn-sm" disabled={updatingId === order.id}
                        onClick={() => updateStatus(order, 'Cancelled')}>
                        Cancel
                      </button>
                    )}
                    {next && (
                      <button className="btn btn-primary btn-sm" disabled={updatingId === order.id}
                        onClick={() => updateStatus(order, next)}>
                        {updatingId === order.id ? 'Updating…' : `Mark as ${next}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
