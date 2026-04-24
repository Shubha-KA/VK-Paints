import os

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

# Root files
create_file("frontend/package.json", """{
  "name": "smart-paint-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.16.0",
    "axios": "^1.5.0",
    "lucide-react": "^0.279.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5"
  }
}
""")

create_file("frontend/vite.config.js", """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\\/api/, '')
      }
    }
  }
})
""")

create_file("frontend/index.html", """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Smart Paint Selection Platform</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
""")

# Source files
create_file("frontend/src/main.jsx", """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
""")

create_file("frontend/src/index.css", """:root {
  --primary: #4F46E5;
  --primary-hover: #4338CA;
  --secondary: #10B981;
  --dark: #1F2937;
  --light: #F9FAFB;
  --border: #E5E7EB;
  --text-main: #111827;
  --text-muted: #6B7280;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--light);
  color: var(--text-main);
  line-height: 1.5;
}

a {
  text-decoration: none;
  color: var(--primary);
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background-color: white;
  border-bottom: 1px solid var(--border);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.navbar-brand {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--primary);
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: var(--text-muted);
  font-weight: 500;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--primary);
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: var(--primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-hover);
}

.btn-secondary {
  background-color: var(--secondary);
  color: white;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  font-family: inherit;
}

.grid {
  display: grid;
  gap: 1.5rem;
}

.grid-cols-3 {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.text-center { text-align: center; }
.mt-4 { margin-top: 1rem; }
.mb-4 { margin-bottom: 1rem; }
""")

create_file("frontend/src/App.jsx", """import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import Catalog from './pages/Catalog';
import Visualizer from './pages/Visualizer';
import Quotation from './pages/Quotation';
import Orders from './pages/Orders';

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <Link to="/" className="navbar-brand">Smart Paint</Link>
          <div className="nav-links">
            <Link to="/" className="nav-link">Catalog</Link>
            <Link to="/visualizer" className="nav-link">Visualizer</Link>
            <Link to="/quote" className="nav-link">Quotation</Link>
            <Link to="/orders" className="nav-link">My Orders</Link>
            <Link to="/login" className="nav-link">Login</Link>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/visualizer" element={<Visualizer />} />
            <Route path="/quote" element={<Quotation />} />
            <Route path="/orders" element={<Orders />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
""")

create_file("frontend/src/pages/Catalog.jsx", """import React, { useState, useEffect } from 'react';

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
""")

create_file("frontend/src/pages/Login.jsx", """import React, { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Login simulation: ' + email);
  };

  return (
    <div style={{maxWidth: '400px', margin: '0 auto', marginTop: '4rem'}}>
      <div className="card">
        <h2 className="text-center mb-4">Login to Smart Paint</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="form-control" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '1rem'}}>Login</button>
        </form>
      </div>
    </div>
  );
}
""")

create_file("frontend/src/pages/Quotation.jsx", """import React, { useState } from 'react';

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
""")

create_file("frontend/src/pages/Visualizer.jsx", """import React, { useState } from 'react';

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
""")

create_file("frontend/src/pages/Orders.jsx", """import React, { useState } from 'react';

export default function Orders() {
  const [orders, setOrders] = useState([
    { id: 'ORD-1001', date: '2023-10-25', product: 'Royal Matt', liters: 10, total: 5000, status: 'Delivered' },
    { id: 'ORD-1002', date: '2023-11-02', product: 'WeatherCoat', liters: 15, total: 9750, status: 'Dispatched' },
    { id: 'ORD-1003', date: '2023-11-15', product: 'Satin Enamel', liters: 5, total: 2000, status: 'Placed' }
  ]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Delivered': return '#10B981';
      case 'Dispatched': return '#3B82F6';
      case 'Placed': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <div>
      <h2 className="mb-4">My Orders</h2>
      <div className="card">
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr style={{borderBottom: '2px solid #E5E7EB', textAlign: 'left'}}>
              <th style={{padding: '1rem'}}>Order ID</th>
              <th style={{padding: '1rem'}}>Date</th>
              <th style={{padding: '1rem'}}>Product</th>
              <th style={{padding: '1rem'}}>Liters</th>
              <th style={{padding: '1rem'}}>Total Cost</th>
              <th style={{padding: '1rem'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{borderBottom: '1px solid #E5E7EB'}}>
                <td style={{padding: '1rem', fontWeight: '500'}}>{o.id}</td>
                <td style={{padding: '1rem'}}>{o.date}</td>
                <td style={{padding: '1rem'}}>{o.product}</td>
                <td style={{padding: '1rem'}}>{o.liters} L</td>
                <td style={{padding: '1rem', fontWeight: 'bold'}}>₹{o.total}</td>
                <td style={{padding: '1rem'}}>
                  <span style={{
                    backgroundColor: getStatusColor(o.status) + '20',
                    color: getStatusColor(o.status),
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontWeight: '500',
                    fontSize: '0.875rem'
                  }}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
""")

print("Frontend generated successfully.")
