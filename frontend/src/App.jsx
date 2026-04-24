import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Catalog from './pages/Catalog';
import Visualizer from './pages/Visualizer';
import Quotation from './pages/Quotation';
import Orders from './pages/Orders';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppLayout({ children, user, onLogout }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <div className="app-container">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">🎨 Smart Paint</Link>
        <div className="nav-links">
          <Link to="/" className={isActive('/')}>Catalog</Link>
          <Link to="/visualizer" className={isActive('/visualizer')}>Visualizer</Link>
          <Link to="/quote" className={isActive('/quote')}>Quotation</Link>
          <Link to="/orders" className={isActive('/orders')}>My Orders</Link>
          {user?.role === 'Admin' && <Link to="/admin" className={isActive('/admin')}>Admin</Link>}
        </div>
        <div className="nav-user">
          <div className="nav-user-info">
            <div className="user-name">{user?.email || 'User'}</div>
            <div className="user-role">{user?.role || 'Customer'}</div>
          </div>
          <button className="nav-logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');
    const email = localStorage.getItem('userEmail');

    if (token && userId) {
      setIsAuthenticated(true);
      setUser({ token, userId, role, email });
    }
  }, []);

  const handleLogin = (data) => {
    setIsAuthenticated(true);
    setUser({
      token: data.token,
      userId: data.userId,
      role: data.role,
      email: localStorage.getItem('userEmail')
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/signup" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Signup />
        } />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Catalog />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/visualizer" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Visualizer />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/quote" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Quotation />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Orders />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute isAuthenticated={isAuthenticated && user?.role === 'Admin'}>
            <AppLayout user={user} onLogout={handleLogout}>
              <AdminDashboard />
            </AppLayout>
          </ProtectedRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
