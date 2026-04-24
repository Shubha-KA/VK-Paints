import React, { useState, useRef, useCallback } from 'react';

// Rich color palette - each color has 6 shades from dark to light
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

// Euclidean color distance — much more accurate edge detection than per-channel
function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt(
    (r1 - r2) ** 2 +
    (g1 - g2) ** 2 +
    (b1 - b2) ** 2
  );
}

/**
 * Flood fill that ALWAYS checks against the ORIGINAL image pixels.
 * This prevents edge bleed from spreading into areas that changed due to painting.
 * @param {ImageData} currentData  - what is currently on the canvas (will be mutated)
 * @param {ImageData} originalData - the clean original upload (never mutated, used for boundary checks)
 * @param {number} x, y            - click position
 * @param {string} fillHex         - selected color hex
 * @param {number} tolerance       - max Euclidean distance (0-441)
 * @param {boolean} erase          - if true, restore original pixels instead of painting
 */
function smartFloodFill(currentData, originalData, x, y, fillHex, tolerance, erase = false) {
  const { width, height } = currentData;
  const cur = currentData.data;
  const orig = originalData.data;
  const [fr, fg, fb] = hexToRgb(fillHex);
  const OPACITY = 0.80; // paint opacity (blend factor)

  // Target color taken from ORIGINAL image at click point
  const startIdx = (y * width + x) * 4;
  const targetR = orig[startIdx];
  const targetG = orig[startIdx + 1];
  const targetB = orig[startIdx + 2];

  const visited = new Uint8Array(width * height);
  const stack = [y * width + x];

  while (stack.length > 0) {
    const pos = stack.pop();
    if (visited[pos]) continue;
    visited[pos] = 1;

    const px = pos % width;
    const py = (pos - px) / width;
    const idx = pos * 4;

    // Compare against ORIGINAL pixel — never the painted one
    const or_ = orig[idx];
    const og  = orig[idx + 1];
    const ob  = orig[idx + 2];

    if (colorDist(or_, og, ob, targetR, targetG, targetB) > tolerance) continue;

    if (erase) {
      // Restore original colour exactly
      cur[idx]     = or_;
      cur[idx + 1] = og;
      cur[idx + 2] = ob;
      cur[idx + 3] = orig[idx + 3];
    } else {
      // Blend fill colour over original (preserves texture/shading)
      cur[idx]     = Math.round(or_ * (1 - OPACITY) + fr * OPACITY);
      cur[idx + 1] = Math.round(og  * (1 - OPACITY) + fg * OPACITY);
      cur[idx + 2] = Math.round(ob  * (1 - OPACITY) + fb * OPACITY);
    }

    // Push 4-connected neighbours
    if (px > 0)         stack.push(pos - 1);
    if (px < width - 1) stack.push(pos + 1);
    if (py > 0)         stack.push(pos - width);
    if (py < height -1) stack.push(pos + width);
  }

  return currentData;
}

export default function Visualizer() {
  const canvasRef   = useRef(null);
  const fileInputRef = useRef(null);

  // Keep a permanent copy of the original image so flood-fill always has clean boundaries
  const originalDataRef = useRef(null);

  const [hasImage,      setHasImage]      = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [tolerance,     setTolerance]     = useState(30);
  const [mode,          setMode]          = useState('paint'); // 'paint' | 'erase'
  const [isPainting,    setIsPainting]    = useState(false);

  // ─── Load image onto canvas ────────────────────────────────────────────────
  const drawImageOnCanvas = useCallback((img) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const maxW = canvas.parentElement.clientWidth || 800;
    const maxH = 500;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }

    canvas.width  = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    // Store a permanent copy of the original pixel data
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
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const loadSampleImage = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => drawImageOnCanvas(img);
    img.onerror = () => alert('Could not load sample image. Please upload your own.');
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Living_room_at_Knole%2C_the_Cartoon_Gallery.jpg/800px-Living_room_at_Knole%2C_the_Cartoon_Gallery.jpg';
  };

  // ─── Canvas click → flood fill ────────────────────────────────────────────
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

    // Work on current painted state
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = smartFloodFill(
      currentData,
      originalDataRef.current,
      x, y,
      selectedColor,
      tolerance,
      mode === 'erase'
    );
    ctx.putImageData(result, 0, 0);
    setIsPainting(false);
  }, [hasImage, selectedColor, tolerance, mode]);

  // ─── Reset / Download ─────────────────────────────────────────────────────
  const handleReset = () => {
    if (!originalDataRef.current) return;
    const canvas = canvasRef.current;
    canvas.getContext('2d').putImageData(originalDataRef.current, 0, 0);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = 'paint-preview.png';
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  // ─── Cursor style ─────────────────────────────────────────────────────────
  const canvasCursor = isPainting
    ? 'wait'
    : mode === 'erase'
    ? 'cell'
    : 'crosshair';

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.025em' }}>Paint Visualizer</h2>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>
          Upload your room photo · click a wall to paint · click again to erase
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Canvas ── */}
        <div className="card" style={{ padding: '1rem' }}>

          {/* Upload drop zone */}
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
              <button
                className="btn btn-primary"
                onClick={e => { e.stopPropagation(); fileInputRef.current.click(); }}
              >
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

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              display: hasImage ? 'block' : 'none',
              width: '100%', height: 'auto',
              cursor: canvasCursor,
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${mode === 'erase' ? '#EF4444' : 'var(--border)'}`,
              transition: 'border-color 0.2s'
            }}
          />

          {/* Action buttons */}
          {hasImage && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => fileInputRef.current.click()} style={{ fontSize: '0.85rem' }}>
                📁 Change Image
              </button>
              <button
                className="btn"
                onClick={handleReset}
                style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.85rem' }}
              >
                ↺ Reset All
              </button>
              <button className="btn btn-secondary" onClick={handleDownload} style={{ fontSize: '0.85rem' }}>
                ⬇ Download
              </button>
            </div>
          )}

          {/* Tip banner */}
          <div style={{
            marginTop: '0.75rem', padding: '0.6rem 1rem',
            background: mode === 'erase' ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.08)',
            borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
            color: mode === 'erase' ? '#EF4444' : 'var(--primary)', fontWeight: '500'
          }}>
            {!hasImage && '💡 Upload a room photo to get started'}
            {hasImage && mode === 'paint' && '🎨 Click on any wall or surface to paint it'}
            {hasImage && mode === 'erase' && '🧹 Click on a painted area to restore original colour'}
          </div>
        </div>

        {/* ── Controls panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Mode switcher */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Tool</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setMode('paint')}
                style={{
                  flex: 1, padding: '0.65rem', borderRadius: 'var(--radius-md)',
                  border: '2px solid',
                  borderColor: mode === 'paint' ? 'var(--primary)' : 'var(--border)',
                  background: mode === 'paint' ? 'var(--primary-light)' : 'white',
                  color: mode === 'paint' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                🎨 Paint
              </button>
              <button
                onClick={() => setMode('erase')}
                style={{
                  flex: 1, padding: '0.65rem', borderRadius: 'var(--radius-md)',
                  border: '2px solid',
                  borderColor: mode === 'erase' ? '#EF4444' : 'var(--border)',
                  background: mode === 'erase' ? 'rgba(239,68,68,0.08)' : 'white',
                  color: mode === 'erase' ? '#EF4444' : 'var(--text-secondary)',
                  fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                🧹 Erase
              </button>
            </div>
          </div>

          {/* Tolerance */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Selection Sensitivity</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
              <span className="text-muted">Tolerance</span>
              <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{tolerance}</span>
            </div>
            <input
              type="range" min="5" max="100" step="5"
              value={tolerance}
              onChange={e => setTolerance(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span>🎯 Precise edges</span>
              <span>Broad fill 🪣</span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
              Lower = stops at sharper edges (good for walls next to furniture). Start at 20–35.
            </p>
          </div>

          {/* Selected Color */}
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
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>Pick any colour</span>
            </div>
          </div>

          {/* Palette */}
          <div className="card" style={{ maxHeight: '380px', overflowY: 'auto' }}>
            <h4 style={{
              fontWeight: '600', marginBottom: '1rem', fontSize: '0.95rem',
              position: 'sticky', top: 0, background: 'white', paddingBottom: '0.5rem',
              borderBottom: '1px solid var(--border)'
            }}>
              Colour Palette
            </h4>
            {COLOR_PALETTE.map(group => (
              <div key={group.name} style={{ marginBottom: '1rem' }}>
                <p style={{
                  fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem'
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
                        flex: 1, height: '30px', backgroundColor: shade,
                        borderRadius: '4px', cursor: 'pointer',
                        border: selectedColor === shade ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)',
                        transform: selectedColor === shade ? 'scaleY(1.25)' : 'scale(1)',
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

      <input
        ref={fileInputRef} type="file" accept="image/*"
        onChange={handleFileUpload} style={{ display: 'none' }}
      />
    </div>
  );
}
