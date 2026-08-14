import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { openRazorpayCheckout } from '../../utils/razorpay';

const DELIVERY_FEE = 30;
const GST_RATE = 0.05;

export default function Cart() {
  const { items, updateQuantity, removeItem, totalPrice, clearCart, addItem } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState('Takeaway'); // 'Takeaway', 'Dine-in', 'Online Delivery'
  const [address, setAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState('Online');
  
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  
  const [aiQuery, setAiQuery] = useState('');
  const [buildingAi, setBuildingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  const gst = +(totalPrice * GST_RATE).toFixed(2);
  const isDelivery = orderType === 'Online Delivery';
  const grandTotal = +(totalPrice + (isDelivery && items.length ? DELIVERY_FEE : 0) + gst).toFixed(2);

  const handleAiBuild = async () => {
    if (!aiQuery.trim()) return;
    setBuildingAi(true);
    setAiMessage('');
    try {
      const res = await api.post('/cart/ai-add', { query: aiQuery });
      const cartResponse = res.data;
      
      // We need to fetch menu to get the full item details to add to cart
      const menuRes = await api.get('/menu');
      const menuItems = menuRes.data;
      
      if (cartResponse.items && cartResponse.items.length > 0) {
        cartResponse.items.forEach(aiItem => {
           const fullItem = menuItems.find(m => m.id === aiItem.item_id);
           if (fullItem) {
             for(let i = 0; i < aiItem.quantity; i++){
                addItem(fullItem);
             }
           }
        });
      }
      setAiMessage(cartResponse.message || "Cart updated successfully!");
      setAiQuery('');
    } catch (err) {
      console.error(err);
      setAiMessage("Failed to build cart from AI.");
    } finally {
      setBuildingAi(false);
    }
  };

  const handleCheckout = async () => {
    setError('');
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }
    
    if (orderType === 'Online Delivery' && !address.trim()) {
      setError('Please enter a delivery address.');
      return;
    }
    if (orderType === 'Dine-in' && !tableNumber.trim()) {
      setError('Please enter a table number.');
      return;
    }

    setPlacing(true);
    try {
      const orderPayload = {
        items: items.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
        order_type: orderType,
        delivery_address: orderType === 'Online Delivery' ? address : null,
        table_number: orderType === 'Dine-in' ? tableNumber : null,
        payment_method: paymentMethod === 'Cash on Delivery' ? 'COD' : 'Online',
      };
      
      const { data: order } = await api.post('/orders', orderPayload);

      if (paymentMethod === 'Online') {
        const { data: rzpOrder } = await api.post(`/payments/create-order/${order.id}`);

        const paymentResponse = await openRazorpayCheckout({
          keyId: rzpOrder.key_id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          razorpayOrderId: rzpOrder.razorpay_order_id,
          name: user.name,
          email: user.email,
          contact: phone,
          testMode: rzpOrder.test_mode,
        });

        await api.post('/payments/verify', {
          order_id: order.id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
        });
      }

      clearCart();
      navigate(`/order/${order.id}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Something went wrong while placing your order.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 720 }}>
      <h2 style={{ marginBottom: '1.5rem' }}><ShoppingBag size={22} style={{ verticalAlign: '-3px', marginRight: 8 }} />Your Cart</h2>

      <div className="card card-pad" style={{ marginBottom: '1.25rem', background: 'var(--primary-light)' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem', color: 'var(--primary)' }}>
          <Sparkles size={18} /> AI Cart Builder
        </h4>
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
          Type what you want and AI will build your cart! (e.g. "2 paneer tikka and a cold coffee")
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            className="input" 
            value={aiQuery} 
            onChange={e => setAiQuery(e.target.value)} 
            placeholder="What are you craving?"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleAiBuild} disabled={buildingAi}>
            {buildingAi ? 'Building...' : 'Add'}
          </button>
        </div>
        {aiMessage && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--success)' }}>{aiMessage}</p>}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">🛒</div>
          <h3>Your cart is empty</h3>
          <p style={{ marginBottom: '1.25rem' }}>Add some delicious food to get started.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Browse Menu</button>
        </div>
      ) : (
        <>
          <div className="card card-pad">
            {items.map((item) => (
              <div className="cart-item-row" key={item.id}>
                <div className="cart-item-emoji">
                  {item.image_url ? <img src={item.image_url} alt={item.name} style={{width: 40, height: 40, borderRadius: 8}}/> : '🍽️'}
                </div>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>₹{item.price} each</div>
                </div>
                <div className="qty-control" style={{ background: 'var(--primary-light)' }}>
                  <button style={{ color: 'var(--primary)' }} onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                  <span style={{ color: 'var(--primary)' }}>{item.quantity}</span>
                  <button style={{ color: 'var(--primary)' }} onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                <div style={{ width: 70, textAlign: 'right', fontWeight: 700 }}>₹{item.price * item.quantity}</div>
                <button className="icon-btn" style={{ border: 'none' }} onClick={() => removeItem(item.id)}>
                  <Trash2 size={16} color="var(--text-faint)" />
                </button>
              </div>
            ))}

            <div style={{ marginTop: '1rem' }}>
              <div className="cart-summary-row"><span>Item Total</span><span>₹{totalPrice.toFixed(2)}</span></div>
              {isDelivery && <div className="cart-summary-row"><span>Delivery Fee</span><span>₹{DELIVERY_FEE}</span></div>}
              <div className="cart-summary-row"><span>GST (5%)</span><span>₹{gst.toFixed(2)}</span></div>
              <div className="cart-summary-total"><span>To Pay</span><span>₹{grandTotal.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="card card-pad" style={{ marginTop: '1.25rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Order Details</h4>
            {error && <div className="alert-error">{error}</div>}
            
            <div className="field">
              <label>Order Type</label>
              <select className="input" value={orderType} onChange={e => setOrderType(e.target.value)}>
                <option value="Takeaway">Takeaway</option>
                <option value="Dine-in">Dine-in</option>
                <option value="Online Delivery">Online Delivery</option>
              </select>
            </div>

            {orderType === 'Online Delivery' && (
              <div className="field">
                <label>Delivery Address</label>
                <textarea className="input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="Flat / House no., street, area, city" />
              </div>
            )}

            {orderType === 'Dine-in' && (
              <div className="field">
                <label>Table Number</label>
                <input className="input" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="e.g. 5" />
              </div>
            )}

            <div className="field">
              <label>Payment Method</label>
              <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="Online">Pay Online (Razorpay)</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
              </select>
            </div>

            <button className="btn btn-primary btn-block" disabled={placing} onClick={handleCheckout}>
              {placing ? 'Processing…' : `Pay ₹${grandTotal.toFixed(2)} & Place Order`}
            </button>
            {!isAuthenticated && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.6rem', textAlign: 'center' }}>
                You'll be asked to log in before payment.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
