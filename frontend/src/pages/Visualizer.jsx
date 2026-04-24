import React, { useState, useRef, useEffect, useCallback } from 'react';

// Rich color palette - each color has 6 shades from dark to light
const COLOR_PALETTE = [
  {
    name: 'Whites & Creams',
    shades: ['#F5F5F0', '#FFFFF0', '#FFFDD0', '#FAF0E6', '#FFF8DC', '#FAEBD7']
  },
  {
    name: 'Beige & Tan',
    shades: ['#8B7355', '#A0845C', '#C4A882', '#D2B48C', '#DEB887', '#F5DEB3']
  },
  {
    name: 'Greys',
    shades: ['#1F2937', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6']
  },
  {
    name: 'Blues',
    shades: ['#1E3A5F', '#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE']
  },
  {
    name: 'Greens',
    shades: ['#14532D', '#15803D', '#16A34A', '#4ADE80', '#86EFAC', '#DCFCE7']
  },
  {
    name: 'Yellows',
    shades: ['#78350F', '#B45309', '#D97706', '#F59E0B', '#FCD34D', '#FEF3C7']
  },
  {
    name: 'Reds',
    shades: ['#7F1D1D', '#B91C1C', '#DC2626', '#F87171', '#FCA5A5', '#FEE2E2']
  },
  {
    name: 'Purples',
    shades: ['#3B0764', '#6B21A8', '#7C3AED', '#A78BFA', '#C4B5FD', '#EDE9FE']
  },
  {
    name: 'Pinks',
    shades: ['#831843', '#BE185D', '#EC4899', '#F472B6', '#F9A8D4', '#FCE7F3']
  },
  {
    name: 'Teals',
    shades: ['#134E4A', '#0F766E', '#14B8A6', '#2DD4BF', '#99F6E4', '#CCFBF1']
  },
];

// Hex to RGB
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// Color similarity check (tolerance-based)
function colorMatch(r1, g1, b1, r2, g2, b2, tolerance) {
  return (
    Math.abs(r1 - r2) <= tolerance &&
    Math.abs(g1 - g2) <= tolerance &&
    Math.abs(b1 - b2) <= tolerance
  );
}

// Flood fill on ImageData
function floodFill(imageData, startX, startY, fillColor, tolerance) {
  const { data, width, height } = imageData;
  const [fr, fg, fb] = hexToRgb(fillColor);
  const [fillOpacity] = [0.75]; // 75% opacity blend

  const startIdx = (startY * width + startX) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];

  // Don't fill if already the fill color
  if (colorMatch(targetR, targetG, targetB, fr, fg, fb, 5)) return imageData;

  const visited = new Uint8Array(width * height);
  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = y * width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pixelIdx = idx * 4;
    const r = data[pixelIdx];
    const g = data[pixelIdx + 1];
    const b = data[pixelIdx + 2];

    if (!colorMatch(r, g, b, targetR, targetG, targetB, tolerance)) continue;

    // Blend fill color with original (paint-like effect)
    data[pixelIdx]     = Math.round(r * (1 - fillOpacity) + fr * fillOpacity);
    data[pixelIdx + 1] = Math.round(g * (1 - fillOpacity) + fg * fillOpacity);
    data[pixelIdx + 2] = Math.round(b * (1 - fillOpacity) + fb * fillOpacity);

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return imageData;
}

export default function Visualizer() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [originalImageData, setOriginalImageData] = useState(null);
  const [hasImage, setHasImage] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [tolerance, setTolerance] = useState(35);
  const [mode, setMode] = useState('paint'); // 'paint' | 'erase'
  const [isPainting, setIsPainting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [instructions, setInstructions] = useState('Upload a room photo to get started');

  const drawImageOnCanvas = useCallback((img) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const maxW = canvas.parentElement.clientWidth || 800;
    const maxH = 500;
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    if (w > maxW) { h = (h * maxW) / w; w = maxW; }
    if (h > maxH) { w = (w * maxH) / h; h = maxH; }

    canvas.width = Math.round(w);
    canvas.height = Math.round(h);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Save original pixel data for reset
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setOriginalImageData(imgData);
    setHasImage(true);
    setImageLoaded(true);
    setInstructions('Click on any wall area to paint it with the selected color');
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => drawImageOnCanvas(img);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasClick = useCallback((e) => {
    if (!hasImage || mode !== 'paint') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

    setIsPainting(true);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newData = floodFill(imageData, x, y, selectedColor, tolerance);
    ctx.putImageData(newData, 0, 0);
    setIsPainting(false);
  }, [hasImage, mode, selectedColor, tolerance]);

  const handleReset = () => {
    if (!originalImageData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(originalImageData, 0, 0);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'paint-preview.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const loadSampleImage = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => drawImageOnCanvas(img);
    img.onerror = () => alert('Could not load sample image. Please upload your own.');
    // Use a plain room image that works cross-origin
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Living_room_at_Knole%2C_the_Cartoon_Gallery.jpg/800px-Living_room_at_Knole%2C_the_Cartoon_Gallery.jpg';
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.025em' }}>Paint Visualizer</h2>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>Upload your room photo, click on a wall area, and preview the paint color</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Canvas Area */}
        <div className="card" style={{ padding: '1rem' }}>
          {!hasImage && (
            <div
              onClick={() => fileInputRef.current.click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '3rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'var(--transition)',
                background: 'var(--primary-light)',
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: '3rem' }}>🖼️</div>
              <div>
                <p style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1.1rem' }}>Upload Room Image</p>
                <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>Click to browse or drag & drop your room photo</p>
              </div>
              <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
                📁 Browse Files
              </button>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>— or —</p>
              <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }} onClick={(e) => { e.stopPropagation(); loadSampleImage(); }}>
                Try Sample Image
              </button>
            </div>
          )}

          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              display: hasImage ? 'block' : 'none',
              width: '100%',
              height: 'auto',
              cursor: mode === 'paint' ? (isPainting ? 'wait' : 'crosshair') : 'default',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}
          />

          {hasImage && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => fileInputRef.current.click()} style={{ fontSize: '0.85rem' }}>
                📁 Change Image
              </button>
              <button className="btn" onClick={handleReset} style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '0.85rem' }}>
                ↺ Reset Colors
              </button>
              <button className="btn btn-secondary" onClick={handleDownload} style={{ fontSize: '0.85rem' }}>
                ⬇ Download Preview
              </button>
            </div>
          )}

          {/* Instruction banner */}
          <div style={{
            marginTop: '0.75rem',
            padding: '0.6rem 1rem',
            background: 'rgba(99,102,241,0.08)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--primary)',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            💡 {instructions}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Tolerance */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Selection Sensitivity</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
              <span className="text-muted">Tolerance</span>
              <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{tolerance}</span>
            </div>
            <input
              type="range"
              min="5" max="80" step="5"
              value={tolerance}
              onChange={e => setTolerance(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span>Precise</span>
              <span>Broad</span>
            </div>
          </div>

          {/* Selected Color Preview */}
          <div className="card">
            <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Selected Color</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '48px', height: '48px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: selectedColor,
                border: '2px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                flexShrink: 0
              }}></div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem' }}>{selectedColor.toUpperCase()}</div>
                <div className="text-muted" style={{ fontSize: '0.8rem' }}>Click a swatch below to change</div>
              </div>
            </div>
            {/* Custom color picker */}
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <label className="text-muted">Custom:</label>
              <input
                type="color"
                value={selectedColor}
                onChange={e => setSelectedColor(e.target.value)}
                style={{ width: '40px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
              />
            </div>
          </div>

          {/* Color Palette */}
          <div className="card" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <h4 style={{ fontWeight: '600', marginBottom: '1rem', fontSize: '0.95rem', position: 'sticky', top: 0, background: 'white', paddingBottom: '0.5rem' }}>
              Color Palette
            </h4>
            {COLOR_PALETTE.map((group) => (
              <div key={group.name} style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  {group.name}
                </p>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {group.shades.map((shade) => (
                    <div
                      key={shade}
                      onClick={() => setSelectedColor(shade)}
                      title={shade}
                      style={{
                        flex: 1,
                        height: '32px',
                        backgroundColor: shade,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: selectedColor === shade
                          ? '2px solid var(--primary)'
                          : '1px solid rgba(0,0,0,0.1)',
                        transform: selectedColor === shade ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                        boxShadow: selectedColor === shade ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
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
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
}
