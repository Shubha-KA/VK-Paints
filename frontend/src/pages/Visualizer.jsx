import React, { useState, useRef, useCallback } from 'react';

const COLOR_PALETTE = [
  { name: 'Whites & Creams', shades: ['#F5F5F0', '#FFFFF0', '#FFFDD0', '#FAF0E6', '#FFF8DC', '#FAEBD7'] },
  { name: 'Beige & Tan',     shades: ['#8B7355', '#A0845C', '#C4A882', '#D2B48C', '#DEB887', '#F5DEB3'] },
  { name: 'Greys',           shades: ['#1F2937', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6'] },
  { name: 'Blues',           shades: ['#1E3A5F', '#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'] },
  { name: 'Greens',          shades: ['#14532D', '#15803D', '#16A34A', '#4ADE80', '#86EFAC', '#DCFCE7'] },
  { name: 'Yellows',         shades: ['#78350F', '#B45309', '#D97706', '#F59E0B', '#FCD34D', '#FEF3C7'] },
  { name: 'Reds',            shades: ['#7F1D1D', '#B91C1C', '#DC2626', '#F87171', '#FCA5A5', '#FEE2E2'] },
  { name: 'Purples',         shades: ['#3B0764', '#6B21A8', '#7C3AED', '#A78BFA', '#C4B5FD', '#EDE9FE'] },
  { name: 'Pinks',           shades: ['#831843', '#BE185D', '#EC4899', '#F472B6', '#F9A8D4', '#FCE7F3'] },
  { name: 'Teals',           shades: ['#134E4A', '#0F766E', '#14B8A6', '#2DD4BF', '#99F6E4', '#CCFBF1'] },
];

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function colorDist(r1,g1,b1,r2,g2,b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

/** Sobel edge detection — returns Float32Array of gradient magnitudes (0–~360) */
function computeEdgeMap(imageData) {
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2];
  }
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tl = gray[(y-1)*width+(x-1)], tm = gray[(y-1)*width+x], tr = gray[(y-1)*width+(x+1)];
      const ml = gray[y*width+(x-1)],                                mr = gray[y*width+(x+1)];
      const bl = gray[(y+1)*width+(x-1)], bm = gray[(y+1)*width+x], br = gray[(y+1)*width+(x+1)];
      const gx = -tl + tr - 2*ml + 2*mr - bl + br;
      const gy = -tl - 2*tm - tr + bl + 2*bm + br;
      edges[y*width+x] = Math.sqrt(gx*gx + gy*gy);
    }
  }
  return edges;
}

/**
 * Scanline flood fill with Sobel edge barriers.
 * - Compares against ORIGINAL image (no re-bleed from painted pixels)
 * - Stops at any pixel whose edge magnitude > edgeThreshold (furniture/object boundary)
 */
function floodFill(currentData, originalData, edgeMap, sx, sy, fillHex, tolerance, edgeThreshold, erase) {
  const { width, height } = currentData;
  const cur = currentData.data;
  const orig = originalData.data;
  const [fr, fg, fb] = hexToRgb(fillHex);
  const OPACITY = 0.80;

  const si = (sy * width + sx) * 4;
  const tR = orig[si], tG = orig[si+1], tB = orig[si+2];

  const visited = new Uint8Array(width * height);

  const canFill = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const pos = y * width + x;
    if (visited[pos]) return false;
    // STOP at strong edges (object/furniture boundaries)
    if (edgeMap[pos] > edgeThreshold) return false;
    const i = pos * 4;
    return colorDist(orig[i], orig[i+1], orig[i+2], tR, tG, tB) <= tolerance;
  };

  const paint = (x, y) => {
    const pos = y * width + x;
    visited[pos] = 1;
    const i = pos * 4;
    if (erase) {
      cur[i] = orig[i]; cur[i+1] = orig[i+1]; cur[i+2] = orig[i+2]; cur[i+3] = orig[i+3];
    } else {
      cur[i]   = Math.round(orig[i]   * (1-OPACITY) + fr * OPACITY);
      cur[i+1] = Math.round(orig[i+1] * (1-OPACITY) + fg * OPACITY);
      cur[i+2] = Math.round(orig[i+2] * (1-OPACITY) + fb * OPACITY);
    }
  };

  const stack = [[sx, sy]];
  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    if (!canFill(cx, cy)) continue;

    let lx = cx; while (lx > 0 && canFill(lx-1, cy)) lx--;
    let rx = cx; while (rx < width-1 && canFill(rx+1, cy)) rx++;

    let addAbove = false, addBelow = false;
    for (let x = lx; x <= rx; x++) {
      paint(x, cy);
      if (cy > 0)        { if (canFill(x, cy-1)) { if (!addAbove) { stack.push([x, cy-1]); addAbove=true; } } else addAbove=false; }
      if (cy < height-1) { if (canFill(x, cy+1)) { if (!addBelow) { stack.push([x, cy+1]); addBelow=true; } } else addBelow=false; }
    }
  }
  return currentData;
}

export default function Visualizer() {
  const canvasRef       = useRef(null);
  const fileInputRef    = useRef(null);
  const originalDataRef = useRef(null);
  const edgeMapRef      = useRef(null);

  const [hasImage,      setHasImage]      = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [tolerance,     setTolerance]     = useState(30);
  const [edgeThreshold, setEdgeThreshold] = useState(25);
  const [mode,          setMode]          = useState('paint');
  const [isPainting,    setIsPainting]    = useState(false);

  const drawImageOnCanvas = useCallback((img) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maxW = canvas.parentElement.clientWidth || 800;
    const maxH = 480;
    let w = img.naturalWidth, h = img.naturalHeight;
    if (w > maxW) { h = Math.round(h*maxW/w); w = maxW; }
    if (h > maxH) { w = Math.round(w*maxH/h); h = maxH; }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    originalDataRef.current = imgData;
    edgeMapRef.current = computeEdgeMap(imgData);   // compute once on load
    setHasImage(true);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => drawImageOnCanvas(img);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const loadSample = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => drawImageOnCanvas(img);
    img.onerror = () => alert('Could not load sample. Please upload your own image.');
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Living_room_at_Knole%2C_the_Cartoon_Gallery.jpg/800px-Living_room_at_Knole%2C_the_Cartoon_Gallery.jpg';
  };

  const handleCanvasClick = useCallback((e) => {
    if (!hasImage || !originalDataRef.current || !edgeMapRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (canvas.width  / rect.width));
    const y = Math.round((e.clientY - rect.top)  * (canvas.height / rect.height));
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;
    setIsPainting(true);
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = floodFill(
      currentData, originalDataRef.current, edgeMapRef.current,
      x, y, selectedColor, tolerance, edgeThreshold, mode === 'erase'
    );
    ctx.putImageData(result, 0, 0);
    setIsPainting(false);
  }, [hasImage, selectedColor, tolerance, edgeThreshold, mode]);

  const handleReset = () => {
    if (!originalDataRef.current) return;
    canvasRef.current.getContext('2d').putImageData(originalDataRef.current, 0, 0);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.download = 'paint-preview.png';
    a.href = canvasRef.current.toDataURL();
    a.click();
  };

  const isErase = mode === 'erase';

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.025em' }}>Paint Visualizer</h2>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>
          Upload your room photo · click a wall to paint · furniture edges are automatically detected as barriers
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 660px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Canvas */}
        <div className="card" style={{ padding: '1rem' }}>
          {!hasImage && (
            <div onClick={() => fileInputRef.current.click()} style={{
              border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)',
              padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer',
              background: 'var(--primary-light)', minHeight: '300px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '1rem', transition: 'var(--transition)'
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: '3rem' }}>🖼️</div>
              <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>Upload Room Image</p>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>JPG, PNG, WEBP supported</p>
              <button className="btn btn-primary" onClick={e => { e.stopPropagation(); fileInputRef.current.click(); }}>📁 Browse Files</button>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>— or —</p>
              <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={e => { e.stopPropagation(); loadSample(); }}>Try Sample Image</button>
            </div>
          )}

          <canvas ref={canvasRef} onClick={handleCanvasClick} style={{
            display: hasImage ? 'block' : 'none', width: '100%', height: 'auto',
            cursor: isPainting ? 'wait' : isErase ? 'cell' : 'crosshair',
            borderRadius: 'var(--radius-md)',
            border: `2px solid ${isErase ? '#EF4444' : 'var(--border)'}`,
            transition: 'border-color 0.2s'
          }} />

          {hasImage && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => fileInputRef.current.click()} style={{ fontSize: '0.85rem' }}>📁 Change Image</button>
              <button className="btn" onClick={handleReset} style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.85rem' }}>↺ Reset</button>
              <button className="btn btn-secondary" onClick={handleDownload} style={{ fontSize: '0.85rem' }}>⬇ Download</button>
            </div>
          )}

          <div style={{
            marginTop: '0.75rem', padding: '0.6rem 1rem',
            background: isErase ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)',
            borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
            color: isErase ? '#EF4444' : 'var(--primary)', fontWeight: '500'
          }}>
            {!hasImage && '💡 Upload a room photo to get started'}
            {hasImage && !isErase && '🎨 Click a wall — edge detection auto-stops at furniture boundaries'}
            {hasImage && isErase  && '🧹 Click painted area to restore original colour'}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

          {/* Tool */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Tool</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { key: 'paint', label: '🎨 Paint', ac: 'var(--primary)', ab: 'var(--primary-light)' },
                { key: 'erase', label: '🧹 Erase', ac: '#EF4444', ab: 'rgba(239,68,68,0.08)' },
              ].map(({ key, label, ac, ab }) => (
                <button key={key} onClick={() => setMode(key)} style={{
                  flex: 1, padding: '0.65rem', borderRadius: 'var(--radius-md)',
                  border: `2px solid ${mode === key ? ac : 'var(--border)'}`,
                  background: mode === key ? ab : 'white',
                  color: mode === key ? ac : 'var(--text-secondary)',
                  fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition)'
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Selected Colour */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Selected Colour</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-md)', backgroundColor: selectedColor, border: '2px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '700', fontFamily: 'monospace' }}>{selectedColor.toUpperCase()}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Click a swatch below</div>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <label className="text-muted">Custom:</label>
              <input type="color" value={selectedColor} onChange={e => setSelectedColor(e.target.value)}
                style={{ width: '40px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px' }} />
            </div>
          </div>

          {/* Object Barrier Strength */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.95rem' }}>🛡️ Object Barrier Strength</h4>
            <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: '0.65rem', lineHeight: 1.5 }}>
              Lower = stronger edge barrier (stops sooner at furniture). Higher = ignores finer edges.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              <span className="text-muted">Threshold</span>
              <span style={{ fontWeight: '700', color: '#F59E0B' }}>{edgeThreshold}</span>
            </div>
            <input type="range" min="5" max="80" step="5" value={edgeThreshold}
              onChange={e => setEdgeThreshold(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#F59E0B' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              <span>🛡️ Strong barrier</span><span>Weak barrier</span>
            </div>
          </div>

          {/* Colour Tolerance */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Colour Tolerance</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              <span className="text-muted">Value</span>
              <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{tolerance}</span>
            </div>
            <input type="range" min="5" max="80" step="5" value={tolerance}
              onChange={e => setTolerance(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              <span>Precise</span><span>Broad</span>
            </div>
          </div>

          {/* Palette — spans both columns */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', gridColumn: '1 / -1' }}>
            <div style={{ padding: '0.9rem 1rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'white' }}>
              <h4 style={{ fontWeight: '600', fontSize: '0.95rem', margin: 0 }}>Colour Palette</h4>
            </div>
            <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '0.85rem 1rem 1rem' }}>
              {COLOR_PALETTE.map(group => (
                <div key={group.name} style={{ marginBottom: '0.85rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                    {group.name}
                  </p>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {group.shades.map(shade => (
                      <div key={shade} onClick={() => { setSelectedColor(shade); if (mode === 'erase') setMode('paint'); }}
                        title={shade}
                        style={{
                          flex: 1, height: '28px', backgroundColor: shade, borderRadius: '4px', cursor: 'pointer',
                          border: selectedColor === shade ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)',
                          transform: selectedColor === shade ? 'scaleY(1.2)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                          boxShadow: selectedColor === shade ? '0 2px 6px rgba(0,0,0,0.25)' : 'none',
                        }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
    </div>
  );
}
