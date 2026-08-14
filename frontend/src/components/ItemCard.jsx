import { Plus, Flame, Leaf } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ItemCard({ item, onClick }) {
  const { items, addItem, updateQuantity } = useCart();
  const cartItem = items.find((i) => i.id === item.id);

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem(item, 1);
  };

  return (
    <div className="card item-card" onClick={() => onClick(item)} style={{ cursor: 'pointer' }}>
      {typeof item.match_score === 'number' && (
        <span className="match_score">✨ {Math.round(item.match_score * 100)}% match</span>
      )}
      <div className="item-media">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : '🍽️'}
      </div>
      <div className="item-body">
        <div className="item-tags">
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
        <div className="item-name">{item.name}</div>
        <div className="item-desc">{item.description}</div>
        <div className="item-footer">
          <span className="item-price">₹{item.price}</span>
          {!item.is_available ? (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)', fontWeight: 600 }}>Unavailable</span>
          ) : cartItem ? (
            <div className="qty-control" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}>−</button>
              <span>{cartItem.quantity}</span>
              <button onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}>+</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>
              <Plus size={14} /> Add
            </button>
          )}
        </div>
      </div>
      {!item.is_available && <div className="unavailable-badge">Currently unavailable</div>}
    </div>
  );
}
