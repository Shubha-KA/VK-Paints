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
  return Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2);
}

function computeEdgeMap(imageData) {
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++)
    gray[i] = 0.299*data[i*4] + 0.587*data[i*4+1] + 0.114*data[i*4+2];
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height-1; y++) {
    for (let x = 1; x < width-1; x++) {
      const tl=gray[(y-1)*width+(x-1)],tm=gray[(y-1)*width+x],tr=gray[(y-1)*width+(x+1)];
      const ml=gray[y*width+(x-1)],mr=gray[y*width+(x+1)];
      const bl=gray[(y+1)*width+(x-1)],bm=gray[(y+1)*width+x],br=gray[(y+1)*width+(x+1)];
      const gx=-tl+tr-2*ml+2*mr-bl+br, gy=-tl-2*tm-tr+bl+2*bm+br;
      edges[y*width+x]=Math.sqrt(gx*gx+gy*gy);
    }
  }
  return edges;
}

function floodFill(currentData, originalData, edgeMap, sx, sy, fillHex, tolerance, edgeThreshold, erase) {
  const { width, height } = currentData;
  const cur=currentData.data, orig=originalData.data;
  const [fr,fg,fb]=hexToRgb(fillHex);
  const OPACITY=0.80;
  const si=(sy*width+sx)*4;
  const tR=orig[si],tG=orig[si+1],tB=orig[si+2];
  const visited=new Uint8Array(width*height);

  const canFill=(x,y)=>{
    if(x<0||x>=width||y<0||y>=height) return false;
    const pos=y*width+x;
    if(visited[pos]) return false;
    if(edgeMap[pos]>edgeThreshold) return false;
    const i=pos*4;
    return colorDist(orig[i],orig[i+1],orig[i+2],tR,tG,tB)<=tolerance;
  };
  const paint=(x,y)=>{
    const pos=y*width+x; visited[pos]=1; const i=pos*4;
    if(erase){ cur[i]=orig[i]; cur[i+1]=orig[i+1]; cur[i+2]=orig[i+2]; cur[i+3]=orig[i+3]; }
    else{ cur[i]=Math.round(orig[i]*(1-OPACITY)+fr*OPACITY); cur[i+1]=Math.round(orig[i+1]*(1-OPACITY)+fg*OPACITY); cur[i+2]=Math.round(orig[i+2]*(1-OPACITY)+fb*OPACITY); }
  };

  const stack=[[sx,sy]];
  while(stack.length>0){
    const [cx,cy]=stack.pop();
    if(!canFill(cx,cy)) continue;
    let lx=cx; while(lx>0&&canFill(lx-1,cy)) lx--;
    let rx=cx; while(rx<width-1&&canFill(rx+1,cy)) rx++;
    let aa=false,ab=false;
    for(let x=lx;x<=rx;x++){
      paint(x,cy);
      if(cy>0){if(canFill(x,cy-1)){if(!aa){stack.push([x,cy-1]);aa=true;}}else aa=false;}
      if(cy<height-1){if(canFill(x,cy+1)){if(!ab){stack.push([x,cy+1]);ab=true;}}else ab=false;}
    }
  }
  return currentData;
}

export default function Visualizer() {
  const canvasRef=useRef(null), fileInputRef=useRef(null);
  const originalDataRef=useRef(null), edgeMapRef=useRef(null);
  const [hasImage,setHasImage]=useState(false);
  const [selectedColor,setSelectedColor]=useState('#3B82F6');
  const [tolerance,setTolerance]=useState(30);
  const [edgeThreshold,setEdgeThreshold]=useState(25);
  const [mode,setMode]=useState('paint');
  const [isPainting,setIsPainting]=useState(false);

  const drawImageOnCanvas=useCallback((img)=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const maxW=canvas.parentElement.clientWidth||700, maxH=480;
    let w=img.naturalWidth, h=img.naturalHeight;
    if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
    if(h>maxH){w=Math.round(w*maxH/h);h=maxH;}
    canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
    const d=ctx.getImageData(0,0,w,h);
    originalDataRef.current=d; edgeMapRef.current=computeEdgeMap(d);
    setHasImage(true);
  },[]);

  const handleFileUpload=(e)=>{
    const file=e.target.files[0]; if(!file||!file.type.startsWith('image/')) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{ const img=new Image(); img.onload=()=>drawImageOnCanvas(img); img.src=ev.target.result; };
    reader.readAsDataURL(file); e.target.value='';
  };

  const loadSample=()=>{
    const img=new Image(); img.crossOrigin='anonymous';
    img.onload=()=>drawImageOnCanvas(img);
    img.onerror=()=>alert('Could not load sample. Please upload your own.');
    img.src='https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Living_room_at_Knole%2C_the_Cartoon_Gallery.jpg/800px-Living_room_at_Knole%2C_the_Cartoon_Gallery.jpg';
  };

  const handleCanvasClick=useCallback((e)=>{
    if(!hasImage||!originalDataRef.current||!edgeMapRef.current) return;
    const canvas=canvasRef.current, ctx=canvas.getContext('2d'), rect=canvas.getBoundingClientRect();
    const x=Math.round((e.clientX-rect.left)*(canvas.width/rect.width));
    const y=Math.round((e.clientY-rect.top)*(canvas.height/rect.height));
    if(x<0||x>=canvas.width||y<0||y>=canvas.height) return;
    setIsPainting(true);
    const d=ctx.getImageData(0,0,canvas.width,canvas.height);
    ctx.putImageData(floodFill(d,originalDataRef.current,edgeMapRef.current,x,y,selectedColor,tolerance,edgeThreshold,mode==='erase'),0,0);
    setIsPainting(false);
  },[hasImage,selectedColor,tolerance,edgeThreshold,mode]);

  const handleReset=()=>{ if(originalDataRef.current) canvasRef.current.getContext('2d').putImageData(originalDataRef.current,0,0); };
  const handleDownload=()=>{ const a=document.createElement('a'); a.download='paint-preview.png'; a.href=canvasRef.current.toDataURL(); a.click(); };

  const isErase=mode==='erase';

  // Shared slider card style
  const sliderCard={ padding:'0.85rem', display:'flex', flexDirection:'column', gap:'0.4rem' };
  const cardTitle={ fontWeight:'600', fontSize:'0.85rem', marginBottom:'0.1rem' };
  const sliderRow={ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color:'var(--text-muted)' };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:'1.75rem', fontWeight:'700', letterSpacing:'-0.025em' }}>Paint Visualizer</h2>
        <p className="text-muted" style={{ marginTop:'0.2rem', fontSize:'0.9rem' }}>
          Upload your room photo · click any wall to paint · edge detection stops fill at furniture
        </p>
      </div>

      {/*
        4-column flex layout:
          Canvas  → flex: 2  (takes ~55% — 2 of 4 visual columns)
          Controls → flex: 2  (takes ~45% — 2 of 4 visual columns, internal 2-col grid)
        On mobile both stack vertically.
      */}
      <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', alignItems:'start' }}>

        {/* ── Canvas panel (2 of 4 cols) ── */}
        <div className="card" style={{ flex:'2 1 380px', minWidth:0, padding:'0.85rem' }}>

          {/* Upload drop zone */}
          {!hasImage && (
            <div onClick={()=>fileInputRef.current.click()} style={{
              border:'2px dashed var(--border)', borderRadius:'var(--radius-md)',
              padding:'2.5rem 1.5rem', textAlign:'center', cursor:'pointer',
              background:'var(--primary-light)', minHeight:'260px',
              display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:'0.85rem', transition:'var(--transition)'
            }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='var(--primary)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
            >
              <div style={{ fontSize:'2.5rem' }}>🖼️</div>
              <div>
                <p style={{ fontWeight:'600', fontSize:'1rem' }}>Upload Room Image</p>
                <p className="text-muted" style={{ fontSize:'0.85rem', marginTop:'0.2rem' }}>JPG · PNG · WEBP</p>
              </div>
              <button className="btn btn-primary" style={{ fontSize:'0.85rem' }} onClick={e=>{e.stopPropagation();fileInputRef.current.click();}}>
                📁 Browse Files
              </button>
              <span className="text-muted" style={{ fontSize:'0.78rem' }}>— or —</span>
              <button className="btn btn-secondary" style={{ fontSize:'0.8rem', padding:'0.35rem 0.85rem' }} onClick={e=>{e.stopPropagation();loadSample();}}>
                Try Sample Image
              </button>
            </div>
          )}

          <canvas ref={canvasRef} onClick={handleCanvasClick} style={{
            display: hasImage?'block':'none',
            width:'100%', height:'auto',
            cursor: isPainting?'wait': isErase?'cell':'crosshair',
            borderRadius:'var(--radius-md)',
            border:`2px solid ${isErase?'#EF4444':'var(--border)'}`,
            transition:'border-color 0.2s'
          }}/>

          {hasImage && (
            <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.75rem', flexWrap:'wrap' }}>
              <button className="btn btn-primary" style={{ fontSize:'0.8rem', padding:'0.45rem 0.85rem' }} onClick={()=>fileInputRef.current.click()}>📁 Change</button>
              <button className="btn" style={{ fontSize:'0.8rem', padding:'0.45rem 0.85rem', background:'var(--primary-light)', color:'var(--primary)' }} onClick={handleReset}>↺ Reset</button>
              <button className="btn btn-secondary" style={{ fontSize:'0.8rem', padding:'0.45rem 0.85rem' }} onClick={handleDownload}>⬇ Download</button>
            </div>
          )}

          <div style={{
            marginTop:'0.6rem', padding:'0.5rem 0.85rem',
            background: isErase?'rgba(239,68,68,0.08)':'rgba(99,102,241,0.08)',
            borderRadius:'var(--radius-md)', fontSize:'0.8rem',
            color: isErase?'#EF4444':'var(--primary)', fontWeight:'500'
          }}>
            {!hasImage && '💡 Upload a room photo to get started'}
            {hasImage && !isErase && '🎨 Click a wall — edge detection stops at furniture'}
            {hasImage && isErase  && '🧹 Click painted area to restore original colour'}
          </div>
        </div>

        {/* ── Controls panel (2 of 4 cols) — internal 2×2 grid ── */}
        <div style={{ flex:'2 1 300px', minWidth:0, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', alignContent:'start' }}>

          {/* Tool */}
          <div className="card" style={sliderCard}>
            <h4 style={cardTitle}>Tool</h4>
            <div style={{ display:'flex', gap:'0.4rem' }}>
              {[
                { key:'paint', label:'🎨 Paint', ac:'var(--primary)', ab:'var(--primary-light)' },
                { key:'erase', label:'🧹 Erase', ac:'#EF4444',        ab:'rgba(239,68,68,0.08)' },
              ].map(({ key,label,ac,ab })=>(
                <button key={key} onClick={()=>setMode(key)} style={{
                  flex:1, padding:'0.5rem 0.25rem', borderRadius:'var(--radius-md)',
                  border:`2px solid ${mode===key?ac:'var(--border)'}`,
                  background:mode===key?ab:'white',
                  color:mode===key?ac:'var(--text-secondary)',
                  fontWeight:'600', fontSize:'0.8rem', cursor:'pointer', transition:'var(--transition)'
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Selected Colour */}
          <div className="card" style={sliderCard}>
            <h4 style={cardTitle}>Selected Colour</h4>
            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'var(--radius-md)', backgroundColor:selectedColor, border:'2px solid var(--border)', flexShrink:0 }}/>
              <div>
                <div style={{ fontWeight:'700', fontFamily:'monospace', fontSize:'0.85rem' }}>{selectedColor.toUpperCase()}</div>
                <div className="text-muted" style={{ fontSize:'0.75rem' }}>Click swatch below</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', fontSize:'0.8rem', marginTop:'0.2rem' }}>
              <label className="text-muted">Custom:</label>
              <input type="color" value={selectedColor} onChange={e=>setSelectedColor(e.target.value)}
                style={{ width:'34px', height:'28px', border:'none', borderRadius:'4px', cursor:'pointer', padding:'2px' }}/>
            </div>
          </div>

          {/* Object Barrier */}
          <div className="card" style={sliderCard}>
            <h4 style={cardTitle}>🛡️ Object Barrier</h4>
            <p className="text-muted" style={{ fontSize:'0.72rem', lineHeight:1.4 }}>Lower = stops sooner at furniture edges.</p>
            <div style={sliderRow}><span>Threshold</span><span style={{ fontWeight:'700', color:'#F59E0B' }}>{edgeThreshold}</span></div>
            <input type="range" min="5" max="80" step="5" value={edgeThreshold}
              onChange={e=>setEdgeThreshold(Number(e.target.value))}
              style={{ width:'100%', accentColor:'#F59E0B', margin:0 }}/>
            <div style={sliderRow}><span>🛡️ Strong</span><span>Weak</span></div>
          </div>

          {/* Colour Tolerance */}
          <div className="card" style={sliderCard}>
            <h4 style={cardTitle}>Colour Tolerance</h4>
            <div style={sliderRow}><span>Value</span><span style={{ fontWeight:'700', color:'var(--primary)' }}>{tolerance}</span></div>
            <input type="range" min="5" max="80" step="5" value={tolerance}
              onChange={e=>setTolerance(Number(e.target.value))}
              style={{ width:'100%', accentColor:'var(--primary)', margin:0 }}/>
            <div style={sliderRow}><span>Precise</span><span>Broad</span></div>
          </div>

          {/* Colour Palette — spans both columns */}
          <div className="card" style={{ padding:0, overflow:'hidden', gridColumn:'1 / -1' }}>
            {/* Fixed header */}
            <div style={{ padding:'0.7rem 1rem 0.5rem', borderBottom:'1px solid var(--border)', background:'white' }}>
              <h4 style={{ fontWeight:'600', fontSize:'0.9rem', margin:0 }}>Colour Palette</h4>
            </div>
            {/* Scrollable swatches */}
            <div style={{ maxHeight:'240px', overflowY:'auto', padding:'0.75rem 1rem' }}>
              {COLOR_PALETTE.map(group=>(
                <div key={group.name} style={{ marginBottom:'0.7rem' }}>
                  <p style={{ fontSize:'0.68rem', fontWeight:'600', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.3rem' }}>
                    {group.name}
                  </p>
                  <div style={{ display:'flex', gap:'3px' }}>
                    {group.shades.map(shade=>(
                      <div key={shade}
                        onClick={()=>{ setSelectedColor(shade); if(mode==='erase') setMode('paint'); }}
                        title={shade}
                        style={{
                          flex:1, height:'24px', backgroundColor:shade, borderRadius:'3px', cursor:'pointer',
                          border:selectedColor===shade?'2px solid var(--primary)':'1px solid rgba(0,0,0,0.1)',
                          transform:selectedColor===shade?'scaleY(1.2)':'scale(1)',
                          transition:'all 0.15s ease',
                          boxShadow:selectedColor===shade?'0 1px 4px rgba(0,0,0,0.2)':'none',
                        }}/>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>{/* end controls */}
      </div>{/* end flex row */}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display:'none' }}/>
    </div>
  );
}
