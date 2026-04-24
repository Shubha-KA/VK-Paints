import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : `${window.location.protocol}//${window.location.hostname}:3000`;

export default function AdminDashboard() {
  const { tab } = useParams();
  const activeTab = tab || 'orders';
  
  const [orders, setOrders] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Retailer Form State
  const [newRetailer, setNewRetailer] = useState({ name: '', city: '', email: '', lat: 0, lng: 0, address: '' });
  // New Product Form State
  const [newProduct, setNewProduct] = useState({ name: '', type: 'Interior', color: '', price_per_liter: 0, coverage_sqft_per_liter: 100 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, retailersRes, productsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/orders`),
        fetch(`${API_BASE}/retailers`),
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/users`)
      ]);
      setOrders(ordersRes.ok ? await ordersRes.json() : []);
      setRetailers(retailersRes.ok ? await retailersRes.json() : []);
      setProducts(productsRes.ok ? await productsRes.json() : []);
      setUsers(usersRes.ok ? await usersRes.json() : []);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRetailer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/retailers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRetailer)
      });
      if (res.ok) {
        alert('Retailer added');
        setNewRetailer({ name: '', city: '', email: '', lat: 0, lng: 0, address: '' });
        fetchData();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        alert('Product added');
        setNewProduct({ name: '', type: 'Interior', color: '', price_per_liter: 0, coverage_sqft_per_liter: 100 });
        fetchData();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleNotifyRetailer = async (order) => {
    const retailer = retailers.find(r => r.id === order.retailerId);
    if (!retailer || !retailer.email) {
      alert('Retailer not found or missing email');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/orders/${order.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'RETAILER', email: retailer.email })
      });
      if (res.ok) alert('Retailer notified successfully!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    const order = orders.find(o => o.id === orderId);
    const user = users.find(u => u.id === order.userId);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userEmail: user?.email })
      });
      if (res.ok) {
        alert(`Status updated to ${status}. Customer notified.`);
        fetchData();
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Admin Dashboard...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>
          {activeTab === 'orders' ? 'Order Management' : activeTab === 'retailers' ? 'Retail Management' : 'Product Management'}
        </h2>
        <p className="text-muted">Manage your platform data</p>
      </div>

      {activeTab === 'orders' && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Customer Orders</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Customer</th>
                <th style={{ padding: '0.75rem' }}>Items</th>
                <th style={{ padding: '0.75rem' }}>Labour</th>
                <th style={{ padding: '0.75rem' }}>Retailer</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const user = users.find(u => u.id === o.userId);
                const retailer = retailers.find(r => r.id === o.retailerId);
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '600' }}>#{o.id}</td>
                    <td style={{ padding: '0.75rem' }}>{user ? `${user.name} (${user.email})` : o.userId}</td>
                    <td style={{ padding: '0.75rem' }}>{o.items ? o.items.length + ' items' : o.liters + ' L'}</td>
                    <td style={{ padding: '0.75rem' }}>{o.requires_labour ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '0.75rem' }}>{retailer ? retailer.name : 'N/A'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <select 
                        value={o.status} 
                        onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                        style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                      >
                        <option value="Placed">Placed</option>
                        <option value="Approved">Approved</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Dispatched">Dispatched</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }} onClick={() => handleNotifyRetailer(o)}>
                        📧 Notify Retailer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'retailers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Add New Retailer</h3>
            <form onSubmit={handleAddRetailer}>
              <div className="form-group"><label>Name</label><input type="text" className="form-control" value={newRetailer.name} onChange={e=>setNewRetailer({...newRetailer, name: e.target.value})} required/></div>
              <div className="form-group"><label>City</label><input type="text" className="form-control" value={newRetailer.city} onChange={e=>setNewRetailer({...newRetailer, city: e.target.value})} required/></div>
              <div className="form-group"><label>Email</label><input type="email" className="form-control" value={newRetailer.email} onChange={e=>setNewRetailer({...newRetailer, email: e.target.value})} required/></div>
              <div className="form-group"><label>Address</label><input type="text" className="form-control" value={newRetailer.address} onChange={e=>setNewRetailer({...newRetailer, address: e.target.value})} required/></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label>Latitude</label><input type="number" step="any" className="form-control" value={newRetailer.lat} onChange={e=>setNewRetailer({...newRetailer, lat: parseFloat(e.target.value)})} required/></div>
                <div className="form-group"><label>Longitude</label><input type="number" step="any" className="form-control" value={newRetailer.lng} onChange={e=>setNewRetailer({...newRetailer, lng: parseFloat(e.target.value)})} required/></div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Retailer</button>
            </form>
          </div>
          <div className="card" style={{ overflowY: 'auto', maxHeight: '500px' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Existing Retailers</h3>
            {retailers.map(r => (
              <div key={r.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                <strong>{r.name}</strong> ({r.city})<br/>
                <small className="text-muted">{r.email} | {r.address}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Add New Product</h3>
            <form onSubmit={handleAddProduct}>
              <div className="form-group"><label>Name</label><input type="text" className="form-control" value={newProduct.name} onChange={e=>setNewProduct({...newProduct, name: e.target.value})} required/></div>
              <div className="form-group"><label>Type/Category</label><input type="text" className="form-control" value={newProduct.type} onChange={e=>setNewProduct({...newProduct, type: e.target.value})} required/></div>
              <div className="form-group"><label>Color</label><input type="text" className="form-control" value={newProduct.color} onChange={e=>setNewProduct({...newProduct, color: e.target.value})} required/></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label>Price/Liter (₹)</label><input type="number" className="form-control" value={newProduct.price_per_liter} onChange={e=>setNewProduct({...newProduct, price_per_liter: parseFloat(e.target.value)})} required/></div>
                <div className="form-group"><label>Coverage (sqft/L)</label><input type="number" className="form-control" value={newProduct.coverage_sqft_per_liter} onChange={e=>setNewProduct({...newProduct, coverage_sqft_per_liter: parseFloat(e.target.value)})} required/></div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Product</button>
            </form>
          </div>
          <div className="card" style={{ overflowY: 'auto', maxHeight: '500px' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: '600' }}>Existing Products</h3>
            {products.map(p => (
              <div key={p.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{p.name}</strong> <span style={{ fontSize: '0.8rem', background: 'var(--bg-light)', padding: '2px 6px', borderRadius: '4px' }}>{p.type}</span><br/>
                  <small className="text-muted">{p.color} finish</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>₹{p.price_per_liter}</strong>/L<br/>
                  <small className="text-muted">{p.coverage_sqft_per_liter} sqft/L</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
