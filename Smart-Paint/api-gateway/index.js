const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(cors());
app.use(morgan('dev'));

// Routing
app.use('/users', createProxyMiddleware({ target: process.env.USER_SERVICE_URL || 'http://localhost:3001', changeOrigin: true }));
app.use('/products', createProxyMiddleware({ target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002', changeOrigin: true }));
app.use('/quotes', createProxyMiddleware({ target: process.env.QUOTATION_SERVICE_URL || 'http://localhost:3003', changeOrigin: true }));
app.use('/orders', createProxyMiddleware({ target: process.env.ORDER_SERVICE_URL || 'http://localhost:3004', changeOrigin: true }));
app.use('/retailers', createProxyMiddleware({ target: process.env.RETAILER_SERVICE_URL || 'http://localhost:3005', changeOrigin: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
