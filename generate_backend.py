import os

directories = [
    "api-gateway", "user-service", "product-service", "quotation-service",
    "order-service", "retailer-service", "notification-service", "frontend"
]

for d in directories:
    os.makedirs(d, exist_ok=True)

# API Gateway
with open("api-gateway/index.js", "w") as f:
    f.write("""const express = require('express');
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
""")

with open("api-gateway/package.json", "w") as f:
    f.write("""{
  "name": "api-gateway",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6",
    "morgan": "^1.10.0"
  }
}""")

# Common Dependencies for microservices
common_deps = """{
  "name": "%s",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "morgan": "^1.10.0",
    "pg": "^8.11.3",
    "sequelize": "^6.33.0",
    "amqplib": "^0.10.3",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  }
}"""

# User Service
with open("user-service/package.json", "w") as f:
    f.write(common_deps % "user-service")

with open("user-service/index.js", "w") as f:
    f.write("""const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_URL || 'postgres://postgres:postgres@localhost:5432/user_db');

const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: 'Customer' } // Customer, Admin, Retailer
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, role });
        res.status(201).json({ message: 'User created', userId: user.id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        res.json({ token, role: user.role, userId: user.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

sequelize.sync().then(() => {
    app.listen(process.env.PORT || 3001, () => console.log('User Service running'));
});
""")

# Product Service
with open("product-service/package.json", "w") as f:
    f.write(common_deps % "product-service")

with open("product-service/index.js", "w") as f:
    f.write("""const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_URL || 'postgres://postgres:postgres@localhost:5432/product_db');

const Product = sequelize.define('Product', {
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // e.g., Interior, Exterior
    color: { type: DataTypes.STRING, allowNull: false },
    price_per_liter: { type: DataTypes.FLOAT, allowNull: false },
    coverage_sqft_per_liter: { type: DataTypes.FLOAT, defaultValue: 100 }
});

app.get('/', async (req, res) => {
    const products = await Product.findAll();
    res.json(products);
});

app.post('/', async (req, res) => {
    const product = await Product.create(req.body);
    res.status(201).json(product);
});

app.get('/:id', async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if(product) res.json(product);
    else res.status(404).send('Not found');
});

sequelize.sync().then(async () => {
    const count = await Product.count();
    if (count === 0) {
        await Product.bulkCreate([
            { name: 'Royal Matt', type: 'Interior', color: 'White', price_per_liter: 500, coverage_sqft_per_liter: 120 },
            { name: 'WeatherCoat', type: 'Exterior', color: 'Beige', price_per_liter: 650, coverage_sqft_per_liter: 90 },
            { name: 'Satin Enamel', type: 'Wood/Metal', color: 'Blue', price_per_liter: 400, coverage_sqft_per_liter: 150 }
        ]);
    }
    app.listen(process.env.PORT || 3002, () => console.log('Product Service running'));
});
""")

# Quotation Service
with open("quotation-service/package.json", "w") as f:
    f.write(common_deps % "quotation-service")

with open("quotation-service/index.js", "w") as f:
    f.write("""const express = require('express');

const app = express();
app.use(express.json());

app.post('/', (req, res) => {
    const { area, price_per_liter, coverage } = req.body;
    if (!area || !price_per_liter || !coverage) {
        return res.status(400).json({ error: 'Missing parameters' });
    }
    const liters_required = Math.ceil(area / coverage);
    const total_cost = liters_required * price_per_liter;
    
    res.json({ liters_required, total_cost });
});

app.listen(process.env.PORT || 3003, () => console.log('Quotation Service running'));
""")

# Retailer Service
with open("retailer-service/package.json", "w") as f:
    f.write(common_deps % "retailer-service")

with open("retailer-service/index.js", "w") as f:
    f.write("""const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_URL || 'postgres://postgres:postgres@localhost:5432/retailer_db');

const Retailer = sequelize.define('Retailer', {
    name: { type: DataTypes.STRING, allowNull: false },
    lat: { type: DataTypes.FLOAT, allowNull: false },
    lng: { type: DataTypes.FLOAT, allowNull: false },
    address: { type: DataTypes.STRING }
});

app.get('/', async (req, res) => {
    res.json(await Retailer.findAll());
});

app.post('/nearest', async (req, res) => {
    const { lat, lng } = req.body;
    const retailers = await Retailer.findAll();
    
    if (retailers.length === 0) return res.status(404).json({ error: 'No retailers found' });
    
    let nearest = retailers[0];
    let minDistance = Math.sqrt(Math.pow(nearest.lat - lat, 2) + Math.pow(nearest.lng - lng, 2));

    for (let r of retailers) {
        const dist = Math.sqrt(Math.pow(r.lat - lat, 2) + Math.pow(r.lng - lng, 2));
        if (dist < minDistance) {
            minDistance = dist;
            nearest = r;
        }
    }
    
    res.json(nearest);
});

sequelize.sync().then(async () => {
    if (await Retailer.count() === 0) {
        await Retailer.bulkCreate([
            { name: 'City Paints', lat: 40.7128, lng: -74.0060, address: 'NY Center' },
            { name: 'Metro Hardware', lat: 34.0522, lng: -118.2437, address: 'LA Metro' }
        ]);
    }
    app.listen(process.env.PORT || 3005, () => console.log('Retailer Service running'));
});
""")

# Order Service
with open("order-service/package.json", "w") as f:
    f.write(common_deps % "order-service")

with open("order-service/index.js", "w") as f:
    f.write("""const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_URL || 'postgres://postgres:postgres@localhost:5432/order_db');

const Order = sequelize.define('Order', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    retailerId: { type: DataTypes.INTEGER, allowNull: true },
    liters: { type: DataTypes.INTEGER, allowNull: false },
    total_cost: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'Placed' } // Placed, Approved, Assigned, Dispatched, Delivered
});

let channel;
async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        channel = await connection.createChannel();
        await channel.assertQueue('order_notifications');
        console.log('Connected to RabbitMQ');
    } catch (err) {
        console.error('RabbitMQ connection failed, retrying in 5s...', err);
        setTimeout(connectRabbitMQ, 5000);
    }
}
connectRabbitMQ();

app.post('/', async (req, res) => {
    try {
        const order = await Order.create(req.body);
        if (channel) {
            channel.sendToQueue('order_notifications', Buffer.from(JSON.stringify({
                event: 'ORDER_PLACED',
                orderId: order.id,
                userId: order.userId
            })));
        }
        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/:userId', async (req, res) => {
    const orders = await Order.findAll({ where: { userId: req.params.userId } });
    res.json(orders);
});

sequelize.sync().then(() => {
    app.listen(process.env.PORT || 3004, () => console.log('Order Service running'));
});
""")

# Notification Service
with open("notification-service/package.json", "w") as f:
    f.write(common_deps % "notification-service")

with open("notification-service/index.js", "w") as f:
    f.write("""const amqp = require('amqplib');

async function start() {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        const channel = await connection.createChannel();
        await channel.assertQueue('order_notifications');
        
        console.log('Notification Service waiting for messages...');
        
        channel.consume('order_notifications', (msg) => {
            if (msg !== null) {
                const event = JSON.parse(msg.content.toString());
                console.log(`[Notification Simulated] Sending email/SMS for event: ${event.event}, Order ID: ${event.orderId}`);
                channel.ack(msg);
            }
        });
    } catch (err) {
        console.error('RabbitMQ connection failed, retrying in 5s...');
        setTimeout(start, 5000);
    }
}

start();
""")

print("Backend generated successfully.")
