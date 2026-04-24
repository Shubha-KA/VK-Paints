import React from 'react';
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
