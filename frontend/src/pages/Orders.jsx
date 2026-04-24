import React, { useState } from 'react';

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
