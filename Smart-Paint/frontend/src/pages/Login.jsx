import React, { useState } from 'react';

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
