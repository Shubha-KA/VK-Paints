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
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * SCANLINE flood fill — expands in clean horizontal bands, no oval artifacts.
 * Always reads boundaries from ORIGINAL image so painted areas don't bleed further.
 */
function scanlineFloodFill(currentData, originalData, startX, startY, fillHex, tolerance, erase) {
  const { width, height } = currentData;
  const cur  = currentData.data;
  const orig = originalData.data;
  const [fr, fg, fb] = hexToRgb(fillHex);
  const OPACITY = 0.82;

  // Target color from original image at click point
  const si = (startY * width + startX) * 4;
  const tR = orig[si], tG = orig[si + 1], tB = orig[si + 2];

  const visited = new Uint8Array(width * height);

  const matches = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const pos = y * width + x;
    if (visited[pos]) return false;
    const i = pos * 4;
    return colorDist(orig[i], orig[i + 1], orig[i + 2], tR, tG, tB) <= tolerance;
  };

  const paint = (x, y) => {
    const pos = y * width + x;
    visited[pos] = 1;
    const i = pos * 4;
    if (erase) {
      cur[i]     = orig[i];
      cur[i + 1] = orig[i + 1];
      cur[i + 2] = orig[i + 2];
      cur[i + 3] = orig[i + 3];
    } else {
      cur[i]     = Math.round(orig[i]     * (1 - OPACITY) + fr * OPACITY);
      cur[i + 1] = Math.round(orig[i + 1] * (1 - OPACITY) + fg * OPACITY);
      cur[i + 2] = Math.round(orig[i + 2] * (1 - OPACITY) + fb * OPACITY);
    }
  };

  // Stack holds [x, y] pairs — scanline style
  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [sx, sy] = stack.pop();
    if (!matches(sx, sy)) continue;

    // Scan left to find left edge
    let lx = sx;
    while (lx > 0 && matches(lx - 1, sy)) lx--;

    // Scan right to find right edge
    let rx = sx;
    while (rx < width - 1 && matches(rx + 1, sy)) rx++;

    // Paint the whole scanline from lx to rx
    for (let x = lx; x <= rx; x++) paint(x, sy);

    // Add seeds for rows above and below — only where transitions start
    // This prevents duplicate seeds from being stacked for every pixel
    let addedAbove = false, addedBelow = false;
    for (let x = lx; x <= rx; x++) {
      if (sy > 0) {
        if (matches(x, sy - 1)) {
          if (!addedAbove) { stack.push([x, sy - 1]); addedAbove = true; }
        } else {
          addedAbove = false;
        }
      }
      if (sy < height - 1) {
        if (matches(x, sy + 1)) {
          if (!addedBelow) { stack.push([x, sy + 1]); addedBelow = true; }
        } else {
          addedBelow = false;
        }
      }
    }
  }

  return currentData;
}

export default function Visualizer() {
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);
  const originalDataRef = useRef(null);

  const [hasImage,      setHasImage]      = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [tolerance,     setTolerance]     = useState(25);
  const [mode,          setMode]          = useState('paint');
  const [isPainting,    setIsPainting]    = useState(false);

  const drawImageOnCanvas = useCallback((img) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maxW = canvas.parentElement.clientWidth || 800;
    const maxH = 500;
    let w = img.naturalWidth, h = img.naturalHeight;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    originalDataRef.current = ctx.getImageData(0, 0, w, h);
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

  const loadSampleImage = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => drawImageOnCanvas(img);
    img.onerror = () => alert('Could not load sample image. Please upload your own.');
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Living_room_at_Knole%2C_the_Cartoon_Gallery.jpg/800px-Living_room_at_Knole%2C_the_Cartoon_Gallery.jpg';
  };

  const handleCanvasClick = useCallback((e) => {
    if (!hasImage || !originalDataRef.current) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top)  * scaleY);
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

    setIsPainting(true);
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = scanlineFloodFill(
      currentData, originalDataRef.current,
      x, y, selectedColor, tolerance, mode === 'erase'
    );
    ctx.putImageData(result, 0, 0);
    setIsPainting(false);
  }, [hasImage, selectedColor, tolerance, mode]);

  const handleReset = () => {
    if (!originalDataRef.current) return;
    canvasRef.current.getContext('2d').putImageData(originalDataRef.current, 0, 0);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = 'paint-preview.png';
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const isErase = mode === 'erase';

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.025em' }}>Paint Visualizer</h2>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>
          Upload your room photo · click a wall to paint it · adjust tolerance to fine-tune edges
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Canvas Area ── */}
        <div className="card" style={{ padding: '1rem' }}>
          {!hasImage && (
            <div
              onClick={() => fileInputRef.current.click()}
              style={{
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
              <div>
                <p style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1.1rem' }}>Upload Room Image</p>
                <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>Click to browse · JPG, PNG, WEBP</p>
              </div>
              <button className="btn btn-primary" onClick={e => { e.stopPropagation(); fileInputRef.current.click(); }}>
                📁 Browse Files
              </button>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>— or —</p>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                onClick={e => { e.stopPropagation(); loadSampleImage(); }}
              >
                Try Sample Image
              </button>
            </div>
          )}

          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              display: hasImage ? 'block' : 'none',
              width: '100%', height: 'auto',
              cursor: isPainting ? 'wait' : isErase ? 'cell' : 'crosshair',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${isErase ? '#EF4444' : 'var(--border)'}`,
              transition: 'border-color 0.2s'
            }}
          />

          {hasImage && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => fileInputRef.current.click()} style={{ fontSize: '0.85rem' }}>
                📁 Change Image
              </button>
              <button className="btn" onClick={handleReset}
                style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.85rem' }}>
                ↺ Reset All
              </button>
              <button className="btn btn-secondary" onClick={handleDownload} style={{ fontSize: '0.85rem' }}>
                ⬇ Download
              </button>
            </div>
          )}

          <div style={{
            marginTop: '0.75rem', padding: '0.6rem 1rem',
            background: isErase ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)',
            borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
            color: isErase ? '#EF4444' : 'var(--primary)', fontWeight: '500'
          }}>
            {!hasImage && '💡 Upload a room photo to get started'}
            {hasImage && !isErase && '🎨 Click on any wall to paint. Lower tolerance = tighter edge detection'}
            {hasImage && isErase  && '🧹 Click on a painted area to restore the original colour'}
          </div>
        </div>

        {/* ── Controls Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Tool */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Tool</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { key: 'paint', label: '🎨 Paint', activeColor: 'var(--primary)', activeBg: 'var(--primary-light)' },
                { key: 'erase', label: '🧹 Erase', activeColor: '#EF4444',        activeBg: 'rgba(239,68,68,0.08)' }
              ].map(({ key, label, activeColor, activeBg }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: 'var(--radius-md)',
                    border: `2px solid ${mode === key ? activeColor : 'var(--border)'}`,
                    background: mode === key ? activeBg : 'white',
                    color: mode === key ? activeColor : 'var(--text-secondary)',
                    fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition)'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tolerance */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Edge Sensitivity</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
              <span className="text-muted">Tolerance</span>
              <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{tolerance}</span>
            </div>
            <input
              type="range" min="5" max="100" step="5" value={tolerance}
              onChange={e => setTolerance(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span>🎯 Tight edges</span>
              <span>Broad fill 🪣</span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
              Keep at <strong>15–30</strong> to stop at furniture edges. Increase only for very uniform walls.
            </p>
          </div>

          {/* Selected colour preview */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Selected Colour</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
                backgroundColor: selectedColor, border: '2px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0
              }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', fontFamily: 'monospace' }}>{selectedColor.toUpperCase()}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Click a swatch below</div>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <label className="text-muted">Custom:</label>
              <input
                type="color" value={selectedColor}
                onChange={e => setSelectedColor(e.target.value)}
                style={{ width: '40px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
              />
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>Any colour</span>
            </div>
          </div>

          {/* ── Colour Palette — fixed header, scrollable body ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Fixed header — outside scroll area so it never moves */}
            <div style={{
              padding: '0.9rem 1rem 0.6rem',
              borderBottom: '1px solid var(--border)',
              background: 'white'
            }}>
              <h4 style={{ fontWeight: '600', fontSize: '0.95rem', margin: 0 }}>Colour Palette</h4>
            </div>

            {/* Scrollable swatches */}
            <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '0.85rem 1rem 1rem' }}>
              {COLOR_PALETTE.map(group => (
                <div key={group.name} style={{ marginBottom: '0.9rem' }}>
                  <p style={{
                    fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem'
                  }}>
                    {group.name}
                  </p>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {group.shades.map(shade => (
                      <div
                        key={shade}
                        onClick={() => { setSelectedColor(shade); if (mode === 'erase') setMode('paint'); }}
                        title={shade}
                        style={{
                          flex: 1, height: '28px', backgroundColor: shade,
                          borderRadius: '4px', cursor: 'pointer',
                          border: selectedColor === shade ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)',
                          transform: selectedColor === shade ? 'scaleY(1.2)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                          boxShadow: selectedColor === shade ? '0 2px 6px rgba(0,0,0,0.25)' : 'none',
                        }}
                      />
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
