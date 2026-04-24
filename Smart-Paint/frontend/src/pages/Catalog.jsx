import React, { useState, useEffect } from 'react';

export default function Catalog() {
  const [products, setProducts] = useState([
    { id: 1, name: 'Royal Matt', type: 'Interior', color: 'White', price_per_liter: 500, coverage_sqft_per_liter: 120 },
    { id: 2, name: 'WeatherCoat', type: 'Exterior', color: 'Beige', price_per_liter: 650, coverage_sqft_per_liter: 90 },
    { id: 3, name: 'Satin Enamel', type: 'Wood/Metal', color: 'Blue', price_per_liter: 400, coverage_sqft_per_liter: 150 }
  ]);

  return (
    <div>
      <h2 className="mb-4">Paint Catalog</h2>
      <div className="grid grid-cols-3">
        {products.map(p => (
          <div key={p.id} className="card">
            <h3>{p.name}</h3>
            <p className="mt-4 text-muted">Type: {p.type}</p>
            <p>Color: <strong>{p.color}</strong></p>
            <div style={{width:'100%', height:'100px', backgroundColor: p.color.toLowerCase(), marginTop:'10px', border:'1px solid #ccc', borderRadius:'4px'}}></div>
            <p className="mt-4">Coverage: {p.coverage_sqft_per_liter} sq ft / L</p>
            <p style={{fontSize: '1.25rem', fontWeight: 'bold', marginTop: '1rem'}}>₹{p.price_per_liter} / L</p>
            <button className="btn btn-primary mt-4" style={{width: '100%'}}>Select</button>
          </div>
        ))}
      </div>
    </div>
  );
}
