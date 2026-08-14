import { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Star, BrainCircuit } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import ItemCard from '../../components/ItemCard';
import ItemDetailModal from '../../components/ItemDetailModal';

const SUGGESTIONS = [
  'something spicy and vegetarian under 200',
  'a light lunch that is not fried',
  'sweet dessert under 100',
  'non-veg under 250',
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSmartMode, setIsSmartMode] = useState(true);
  const [isAiResult, setIsAiResult] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchMenu();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [isAuthenticated]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const response = await api.get('/menu');
      setMenuItems(response.data);
      setIsAiResult(false);
    } catch (error) {
      console.error('Failed to fetch menu', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/menu/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await api.get('/users/recommendations');
      setRecommendations(response.data);
    } catch (error) {
      console.error('Failed to fetch recommendations', error);
    }
  };

  const runSearch = async (query) => {
    if (!query.trim()) {
      fetchMenu();
      return;
    }
    setIsSearching(true);
    setActiveCategory('All');
    try {
      const mode = isSmartMode ? 'llm' : 'semantic';
      const response = await api.get(`/search?q=${encodeURIComponent(query)}&mode=${mode}`);
      setMenuItems(response.data);
      setIsAiResult(true);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    runSearch(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery('');
    fetchMenu();
  };

  const visibleItems = isAiResult
    ? menuItems
    : menuItems.filter((i) => activeCategory === 'All' || i.category === activeCategory);

  return (
    <div>
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">Craving something delicious? <span>Just ask.</span></h1>
          <p className="hero-subtitle">
            Describe what you're in the mood for and our AI will find the best matches from today's menu —
            no more scrolling through endless categories.
          </p>

          <form onSubmit={handleSearch} className="ai-search-bar">
            <Search size={19} color="var(--text-faint)" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Try "something spicy and vegetarian under 200 rupees"'
            />
            {searchQuery && (
              <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={clearSearch}>
                <X size={15} />
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={isSearching}>
              <Sparkles size={16} /> {isSearching ? 'Searching…' : 'AI Search'}
            </button>
          </form>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', color: isSmartMode ? 'var(--primary)' : 'var(--text-muted)' }}>
              <input 
                type="checkbox" 
                checked={isSmartMode} 
                onChange={(e) => setIsSmartMode(e.target.checked)} 
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
              />
              AI MODE
            </label>
          </div>

          <div className="ai-chip-row">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="ai-chip" onClick={() => { setSearchQuery(s); runSearch(s); }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        {!isAiResult && recommendations.length > 0 && activeCategory === 'All' && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)' }}>
              <Star size={20} /> Recommended for You
            </h3>
            <div className="menu-grid">
              {recommendations.map((item) => (
                <ItemCard key={`rec-${item.id}`} item={item} onClick={setSelectedItem} />
              ))}
            </div>
          </div>
        )}

        {!isAiResult && (
          <div className="category-row">
            <button
              className={`category-pill ${activeCategory === 'All' ? 'active' : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`category-pill ${activeCategory === c ? 'active' : ''}`}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {isAiResult && (
          <div className="section-head" style={{ marginTop: '1.5rem' }}>
            <h3>✨ AI matches for "{searchQuery}"</h3>
            <button className="btn btn-ghost btn-sm" onClick={clearSearch}>Clear search</button>
          </div>
        )}

        {loading || isSearching ? (
          <div className="center-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }} />
            {isSearching && isSmartMode && (
              <div style={{ color: 'var(--primary)', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
                Cooking...
              </div>
            )}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🔍</div>
            <h3>No dishes found</h3>
            <p>Try a different search or category.</p>
          </div>
        ) : (
          <div className="menu-grid">
            {visibleItems.map((item) => (
              <ItemCard key={item.id} item={item} onClick={setSelectedItem} />
            ))}
          </div>
        )}
      </div>

      <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
