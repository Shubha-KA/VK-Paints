import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : `${window.location.protocol}//${window.location.hostname}:3000`;

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
      // Fallback to empty
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (product) => {
    // Navigate to quotation page with product data in state
    navigate('/quote', { state: { selectedProduct: product } });
  };

  const getColorDisplay = (colorName) => {
    const colorMap = {
      'white': '#FFFFFF',
      'beige': '#F5F5DC',
      'blue': '#3B82F6',
      'red': '#EF4444',
      'green': '#10B981',
      'yellow': '#F59E0B',
      'grey': '#6B7280',
      'gray': '#6B7280',
      'black': '#1F2937',
      'cream': '#FFFDD0',
      'ivory': '#FFFFF0',
    };
    return colorMap[colorName.toLowerCase()] || colorName;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderColor: 'rgba(99,102,241,0.2)', borderTopColor: 'var(--primary)' }}></div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.025em' }}>Paint Catalog</h2>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>Browse our premium paint collection and select one to get a quotation</p>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: '1.5rem' }}>
          Could not load products from server. Please check your connection.
        </div>
      )}

      {products.length === 0 && !error ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <p className="text-muted">No products available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3">
          {products.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Color swatch */}
              <div style={{
                width: '100%',
                height: '120px',
                background: `linear-gradient(135deg, ${getColorDisplay(p.color)}, ${getColorDisplay(p.color)}dd)`,
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--border)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
              }}></div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: '600' }}>{p.name}</h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>{p.type}</span>
                <span style={{
                  background: 'rgba(16,185,129,0.1)',
                  color: 'var(--secondary)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>{p.color}</span>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Coverage</span>
                  <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{p.coverage_sqft_per_liter} sq ft/L</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Price</span>
                  <span style={{ fontWeight: '700', fontSize: '1.25rem', color: 'var(--primary)' }}>₹{p.price_per_liter}/L</span>
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => handleSelect(p)}
                >
                  Select & Get Quote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
