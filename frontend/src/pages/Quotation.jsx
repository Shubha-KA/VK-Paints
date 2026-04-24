import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : `${window.location.protocol}//${window.location.hostname}:3000`;

export default function Quotation() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialProduct = location.state?.selectedProduct || null;

  const [products, setProducts] = useState([]);
  const [lineItems, setLineItems] = useState([
    {
      id: Date.now(),
      productId: initialProduct ? initialProduct.id : '',
      area: 500,
      liters: 0,
      cost: 0,
      calculated: false
    }
  ]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems, 
      { id: Date.now(), productId: '', area: 500, liters: 0, cost: 0, calculated: false }
    ]);
    setOrderPlaced(false);
  };

  const removeLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id));
    setOrderPlaced(false);
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value, calculated: false };
      }
      return item;
    }));
    setOrderPlaced(false);
  };

  const calculate = () => {
    setLineItems(lineItems.map(item => {
      if (!item.productId) return item;
      const product = products.find(p => p.id === Number(item.productId));
      if (!product) return item;
      
      const liters = Math.ceil(item.area / product.coverage_sqft_per_liter);
      const cost = liters * product.price_per_liter;
      
      return { ...item, liters, cost, calculated: true };
    }));
    setOrderPlaced(false);
  };

  const totalCost = lineItems.reduce((sum, item) => sum + (item.calculated ? item.cost : 0), 0);
  const isCalculated = lineItems.some(item => item.calculated);

  const placeOrder = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('Please log in to place an order');
      navigate('/login');
      return;
    }

    const itemsToOrder = lineItems.filter(item => item.calculated && item.productId);
    if (itemsToOrder.length === 0) return;

    setOrderLoading(true);
    try {
      // Place all orders concurrently
      await Promise.all(itemsToOrder.map(item => 
        fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: parseInt(userId),
            productId: parseInt(item.productId),
            liters: item.liters,
            total_cost: item.cost
          })
        }).then(res => {
          if (!res.ok) throw new Error('Failed to place order');
        })
      ));

      setOrderPlaced(true);
    } catch (err) {
      alert('Error placing order: ' + err.message);
    } finally {
      setOrderLoading(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(4, 120, 87); // primary color
    doc.text('Smart Paint Quotation', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);
    
    // Table
    const tableColumn = ["Product", "Type", "Area (Sq Ft)", "Req. Liters", "Price/L", "Total Cost"];
    const tableRows = [];
    
    lineItems.filter(item => item.calculated && item.productId).forEach(item => {
      const product = products.find(p => p.id === Number(item.productId));
      if (product) {
        const row = [
          product.name,
          product.type,
          item.area.toString(),
          `${item.liters} L`,
          `Rs. ${product.price_per_liter}`,
          `Rs. ${item.cost.toLocaleString()}`
        ];
        tableRows.push(row);
      }
    });
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    // Total
    const finalY = doc.previousAutoTable.finalY || 40;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`Grand Total: Rs. ${totalCost.toLocaleString()}`, 14, finalY + 15);
    
    doc.save('paint-quotation.pdf');
  };

  // Group products by type for the dropdown
  const groupedProducts = products.reduce((acc, product) => {
    acc[product.type] = acc[product.type] || [];
    acc[product.type].push(product);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>Smart Quotation Builder</h2>
            <p className="text-muted">Select multiple products like primer, putty, and paint to estimate costs</p>
          </div>
          {isCalculated && (
            <button className="btn btn-secondary" onClick={downloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📄 Download PDF
            </button>
          )}
        </div>

        {lineItems.map((item, index) => (
          <div key={item.id} style={{
            padding: '1.25rem',
            marginBottom: '1rem',
            background: 'var(--bg-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            position: 'relative'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Select Product / Category</label>
                <select 
                  className="form-control" 
                  value={item.productId} 
                  onChange={(e) => updateLineItem(item.id, 'productId', e.target.value)}
                >
                  <option value="">-- Select Product --</option>
                  {Object.keys(groupedProducts).map(type => (
                    <optgroup label={type} key={type}>
                      {groupedProducts[type].map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Coverage: {p.coverage_sqft_per_liter} sqft/L - ₹{p.price_per_liter}/L)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Wall Area (Sq Ft)</label>
                <input 
                  type="number" 
                  value={item.area} 
                  onChange={(e) => updateLineItem(item.id, 'area', Number(e.target.value))} 
                  className="form-control" 
                />
              </div>
            </div>

            {lineItems.length > 1 && (
              <button 
                onClick={() => removeLineItem(item.id)}
                style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: 'none', border: 'none', color: '#EF4444',
                  cursor: 'pointer', fontSize: '1.2rem', padding: '5px'
                }}
                title="Remove Item"
              >
                ×
              </button>
            )}

            {item.calculated && item.productId && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: 'rgba(16,185,129,0.1)', 
                borderRadius: 'var(--radius-sm)',
                display: 'flex', justifyContent: 'space-between',
                color: '#065f46', fontSize: '0.9rem', fontWeight: '500'
              }}>
                <span>Requirement: {item.liters} L</span>
                <span>Cost: ₹{item.cost.toLocaleString()}</span>
              </div>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button 
            className="btn" 
            style={{ flex: 1, background: 'var(--primary-light)', color: 'var(--primary)' }}
            onClick={addLineItem}
          >
            + Add Another Product
          </button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={calculate}>
            Calculate Total Estimate
          </button>
        </div>
        
        {isCalculated && (
          <div className="mt-4" style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.15))',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16,185,129,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.2rem', color: '#065f46' }}>Grand Total</span>
              <span style={{ fontSize: '2rem', fontWeight: '700', color: '#047857' }}>₹{totalCost.toLocaleString()}</span>
            </div>

            {!orderPlaced ? (
              <button 
                className="btn btn-secondary mt-4" 
                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} 
                onClick={placeOrder}
                disabled={orderLoading}
              >
                {orderLoading ? 'Processing Order...' : 'Place Order for All Items'}
              </button>
            ) : (
              <div className="mt-4" style={{
                padding: '1rem',
                background: 'rgba(16,185,129,0.15)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                color: '#065f46',
                fontWeight: '600'
              }}>
                ✅ All orders placed successfully! <a href="#" onClick={(e) => { e.preventDefault(); navigate('/orders'); }} style={{ color: '#047857' }}>View My Orders</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
