import React, { useState, useEffect } from 'react';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : `${window.location.protocol}//${window.location.hostname}:3000`;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('Please log in to view orders');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/orders/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Delivered': return '#10B981';
      case 'Dispatched': return '#3B82F6';
      case 'Approved': return '#8B5CF6';
      case 'Assigned': return '#F97316';
      case 'Placed': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.025em' }}>My Orders</h2>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>Track your paint orders and delivery status</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {orders.length === 0 && !error ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No orders yet</h3>
          <p className="text-muted">Browse the catalog and place your first order!</p>
        </div>
      ) : orders.length > 0 && (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order ID</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Products</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Labour</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cost</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const isLegacy = !o.items;
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--primary)' }}>#{o.id}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{formatDate(o.createdAt)}</td>
                    <td style={{ padding: '1rem' }}>
                      {isLegacy ? (
                        <span>Legacy Order ({o.liters} L)</span>
                      ) : (
                        <div>
                          {o.items.map((item, i) => (
                            <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              • {item.name} ({item.liters} L)
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {o.requires_labour ? (
                        <span style={{ color: '#047857', fontWeight: '600', fontSize: '0.85rem' }}>✓ Requested</span>
                      ) : (
                        <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Not Needed</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>₹{o.total_cost?.toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        backgroundColor: getStatusColor(o.status) + '18',
                        color: getStatusColor(o.status),
                        padding: '0.3rem 0.85rem',
                        borderRadius: '9999px',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        letterSpacing: '0.02em'
                      }}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
