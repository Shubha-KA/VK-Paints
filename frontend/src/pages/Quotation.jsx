import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : `${window.location.protocol}//${window.location.hostname}:3000`;

export default function Quotation() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedProduct = location.state?.selectedProduct || null;

  const [area, setArea] = useState(500);
  const [productName, setProductName] = useState(selectedProduct?.name || '');
  const [price, setPrice] = useState(selectedProduct?.price_per_liter || 500);
  const [coverage, setCoverage] = useState(selectedProduct?.coverage_sqft_per_liter || 100);
  const [quote, setQuote] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  const calculate = () => {
    const liters = Math.ceil(area / coverage);
    const cost = liters * price;
    setQuote({ liters, cost });
    setOrderPlaced(false);
  };

  const placeOrder = async () => {
    if (!quote) return;

    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('Please log in to place an order');
      return;
    }

    setOrderLoading(true);
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: parseInt(userId),
          productId: selectedProduct?.id || 1,
          liters: quote.liters,
          total_cost: quote.cost
        })
      });

      if (!res.ok) throw new Error('Failed to place order');

      setOrderPlaced(true);
    } catch (err) {
      alert('Error placing order: ' + err.message);
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>Calculate Paint Requirement</h2>
        {selectedProduct && (
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            Selected: <strong style={{ color: 'var(--primary)' }}>{selectedProduct.name}</strong> ({selectedProduct.type} — {selectedProduct.color})
          </p>
        )}
        {!selectedProduct && (
          <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
            Enter details manually or <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{ fontWeight: '600' }}>select a product from catalog</a>
          </p>
        )}

        <div className="form-group">
          <label>Wall Area (Sq Ft)</label>
          <input type="number" value={area} onChange={e => setArea(Number(e.target.value))} className="form-control" />
        </div>
        <div className="form-group">
          <label>Paint Price per Liter (₹)</label>
          <input 
            type="number" 
            value={price} 
            onChange={e => setPrice(Number(e.target.value))} 
            className="form-control" 
            readOnly={!!selectedProduct}
            style={selectedProduct ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
          />
        </div>
        <div className="form-group">
          <label>Coverage (Sq Ft per Liter)</label>
          <input 
            type="number" 
            value={coverage} 
            onChange={e => setCoverage(Number(e.target.value))} 
            className="form-control"
            readOnly={!!selectedProduct}
            style={selectedProduct ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
          />
        </div>
        <button className="btn btn-primary mt-4" onClick={calculate} style={{ width: '100%' }}>
          Calculate
        </button>
        
        {quote && (
          <div className="mt-4" style={{
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.15))',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16,185,129,0.2)'
          }}>
            <h3 style={{ color: '#065f46', fontSize: '1.1rem', marginBottom: '0.75rem' }}>Estimated Requirement</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Liters Required</span>
              <strong>{quote.liters} L</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Total Cost</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#047857' }}>₹{quote.cost.toLocaleString()}</span>
            </div>

            {!orderPlaced ? (
              <button 
                className="btn btn-secondary mt-4" 
                style={{ width: '100%' }} 
                onClick={placeOrder}
                disabled={orderLoading}
              >
                {orderLoading ? 'Placing Order...' : 'Place Order'}
              </button>
            ) : (
              <div className="mt-4" style={{
                padding: '0.75rem 1rem',
                background: 'rgba(16,185,129,0.15)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                color: '#065f46',
                fontWeight: '600'
              }}>
                ✅ Order placed successfully! <a href="#" onClick={(e) => { e.preventDefault(); navigate('/orders'); }} style={{ color: '#047857' }}>View Orders</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
