import { X, Flame, Leaf } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ItemDetailModal({ item, onClose }) {
  const { addItem } = useCart();
  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{item.name}</h3>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="item-media" style={{ borderRadius: 'var(--radius-md)', marginBottom: '1rem', height: '150px' }}>
            {item.image_url ? (
               <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
            ) : '🍽️'}
          </div>
          <div className="item-tags" style={{ marginBottom: '0.6rem' }}>
            {item.dietary_tag === 'Vegetarian' && (
              <span className="tag tag-veg"><Leaf size={11} /> VEG</span>
            )}
            {item.dietary_tag === 'Non-Vegetarian' && (
              <span className="tag tag-nonveg">● NON-VEG</span>
            )}
            {item.dietary_tag === 'Spicy' && (
              <span className="tag tag-spicy"><Flame size={11} /> Spicy</span>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{item.description}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="item-price" style={{ fontSize: '1.3rem' }}>₹{item.price}</span>
            <button
              className="btn btn-primary"
              disabled={!item.is_available}
              onClick={() => { addItem(item, 1); onClose(); }}
            >
              {item.is_available ? 'Add to Cart' : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
