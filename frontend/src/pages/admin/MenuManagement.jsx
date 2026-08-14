import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../api';

const EMPTY_FORM = {
  name: '', description: '', category: '', price: '', image_url: '',
  dietary_tag: 'Vegetarian', is_available: true,
};

export default function MenuManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = () => {
    setLoading(true);
    api.get('/menu').then(({ data }) => setItems(data)).finally(() => setLoading(false));
  };

  useEffect(loadItems, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setForm({ ...item, price: String(item.price) });
    setEditingId(item.id);
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price) };
    try {
      if (editingId) {
        await api.put(`/menu/${editingId}`, payload);
      } else {
        await api.post('/menu', payload);
      }
      setShowForm(false);
      loadItems();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail[0]?.msg : detail || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this menu item? This cannot be undone.')) return;
    await api.delete(`/menu/${id}`);
    loadItems();
  };

  const toggleAvailability = async (item) => {
    await api.put(`/menu/${item.id}`, { ...item, is_available: !item.is_available });
    loadItems();
  };

  return (
    <div>
      <div className="section-head">
        <h2>Menu Management</h2>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Item</button>
      </div>

      {loading ? (
        <div className="center-loading"><div className="spinner" /></div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Dietary Tag</th><th>Available</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} /> : '🍽️'}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 260 }}>{item.description}</div>
                  </td>
                  <td>{item.category}</td>
                  <td>₹{item.price}</td>
                  <td>
                    {item.dietary_tag === 'Vegetarian' && <span className="tag tag-veg">VEG</span>}
                    {item.dietary_tag === 'Non-Vegetarian' && <span className="tag tag-nonveg">NON-VEG</span>}
                    {item.dietary_tag === 'Spicy' && <span className="tag tag-spicy">SPICY</span>}
                    {item.dietary_tag === 'None' && <span className="tag">NONE</span>}
                  </td>
                  <td>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={item.is_available} onChange={() => toggleAvailability(item)} />
                      {item.is_available ? 'Yes' : 'No'}
                    </label>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => openEdit(item)}>
                        <Pencil size={14} />
                      </button>
                      <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} color="var(--primary)" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="empty-state"><div className="emoji">🍽️</div><h3>No menu items yet</h3></div>
          )}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Item' : 'Add Menu Item'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert-error">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="field-row">
                  <div className="field">
                    <label>Name</label>
                    <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Image URL</label>
                    <input className="input" placeholder="https://..." value={form.image_url || ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                  </div>
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea className="input" rows={2} required value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Category</label>
                    <input className="input" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Starters / Main Course / Desserts / Beverages" />
                  </div>
                  <div className="field">
                    <label>Price (₹)</label>
                    <input className="input" type="number" step="0.01" min="0.01" required value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Dietary Tag</label>
                    <select className="input" value={form.dietary_tag || 'Vegetarian'} onChange={e => setForm({ ...form, dietary_tag: e.target.value })}>
                       <option value="Vegetarian">Vegetarian</option>
                       <option value="Non-Vegetarian">Non-Vegetarian</option>
                       <option value="Spicy">Spicy</option>
                       <option value="None">None</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={form.is_available}
                      onChange={(e) => setForm({ ...form, is_available: e.target.checked })} /> Available
                  </label>
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Item'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
