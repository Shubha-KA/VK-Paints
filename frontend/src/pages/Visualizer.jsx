import React, { useState } from 'react';

export default function Visualizer() {
  const [color, setColor] = useState('#4F46E5');
  const [opacity, setOpacity] = useState(0.5);

  return (
    <div className="grid" style={{gridTemplateColumns: '1fr 300px'}}>
      <div className="card" style={{position: 'relative', overflow: 'hidden', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6'}}>
        <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: color, opacity: opacity, mixBlendMode: 'multiply', zIndex: 2}}></div>
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Interior" style={{width: '100%', height: '100%', objectFit: 'cover', zIndex: 1}} />
        <div style={{position: 'absolute', zIndex: 3, backgroundColor: 'rgba(255,255,255,0.8)', padding: '1rem', borderRadius: '0.5rem'}}>
          <h4>Wall Color Preview</h4>
        </div>
      </div>
      
      <div className="card">
        <h3 className="mb-4">Controls</h3>
        <div className="form-group">
          <label>Select Paint Color</label>
          <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{width: '100%', height: '50px', cursor: 'pointer', border: 'none'}} />
        </div>
        <div className="form-group mt-4">
          <label>Intensity ({Math.round(opacity * 100)}%)</label>
          <input type="range" min="0" max="1" step="0.1" value={opacity} onChange={e=>setOpacity(e.target.value)} style={{width: '100%'}} />
        </div>
        <div className="mt-4">
          <h4>Presets</h4>
          <div style={{display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap'}}>
            {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#ffffff', '#1f2937'].map(c => (
              <div key={c} onClick={() => setColor(c)} style={{width: '40px', height: '40px', backgroundColor: c, cursor: 'pointer', borderRadius: '50%', border: '2px solid #e5e7eb'}}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
