import React, { useState } from 'react';

export default function Quotation() {
  const [area, setArea] = useState(500);
  const [price, setPrice] = useState(500);
  const [coverage, setCoverage] = useState(100);
  const [quote, setQuote] = useState(null);

  const calculate = () => {
    const liters = Math.ceil(area / coverage);
    const cost = liters * price;
    setQuote({ liters, cost });
  };

  return (
    <div style={{maxWidth: '600px', margin: '0 auto'}}>
      <div className="card">
        <h2 className="mb-4">Calculate Paint Requirement</h2>
        <div className="form-group">
          <label>Wall Area (Sq Ft)</label>
          <input type="number" value={area} onChange={e=>setArea(e.target.value)} className="form-control" />
        </div>
        <div className="form-group">
          <label>Paint Price per Liter (₹)</label>
          <input type="number" value={price} onChange={e=>setPrice(e.target.value)} className="form-control" />
        </div>
        <div className="form-group">
          <label>Coverage (Sq Ft per Liter)</label>
          <input type="number" value={coverage} onChange={e=>setCoverage(e.target.value)} className="form-control" />
        </div>
        <button className="btn btn-primary mt-4" onClick={calculate}>Calculate</button>
        
        {quote && (
          <div className="mt-4" style={{padding: '1rem', backgroundColor: '#ecfdf5', borderRadius: '0.375rem', border: '1px solid #a7f3d0'}}>
            <h3 style={{color: '#065f46'}}>Estimated Requirement</h3>
            <p style={{fontSize: '1.2rem', marginTop: '0.5rem'}}>Liters Required: <strong>{quote.liters} L</strong></p>
            <p style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#047857'}}>Total Cost: ₹{quote.cost}</p>
          </div>
        )}
      </div>
    </div>
  );
}
