const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_URL || 'postgres://postgres:postgres@localhost:5432/order_db');

const Order = sequelize.define('Order', {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    retailerId: { type: DataTypes.INTEGER, allowNull: true },
    items: { type: DataTypes.JSONB, allowNull: false }, // Array of { productId, name, liters, cost }
    total_cost: { type: DataTypes.FLOAT, allowNull: false },
    requires_labour: { type: DataTypes.BOOLEAN, defaultValue: false },
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
        if (channel && req.body.userEmail) {
            channel.sendToQueue('order_notifications', Buffer.from(JSON.stringify({
                event: 'ORDER_PLACED',
                orderId: order.id,
                userId: order.userId,
                userEmail: req.body.userEmail,
                order
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

app.get('/', async (req, res) => {
    res.json(await Order.findAll());
});

app.post('/:id/notify', async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Not found' });
        
        if (channel) {
            channel.sendToQueue('order_notifications', Buffer.from(JSON.stringify({
                event: req.body.target === 'RETAILER' ? 'NOTIFY_RETAILER' : 'NOTIFY_CUSTOMER',
                order,
                email: req.body.email
            })));
        }
        res.json({ message: 'Notification queued' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/:id/status', async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Not found' });
        
        order.status = req.body.status;
        await order.save();

        if (channel && req.body.userEmail) {
            channel.sendToQueue('order_notifications', Buffer.from(JSON.stringify({
                event: 'NOTIFY_CUSTOMER',
                order,
                email: req.body.userEmail
            })));
        }
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const connectWithRetry = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to Database');
        await sequelize.sync({ alter: true });
        app.listen(process.env.PORT || 3004, () => console.log('Order Service running'));
    } catch (err) {
        console.error('Database connection failed, retrying in 5s...', err.message);
        setTimeout(connectWithRetry, 5000);
    }
};

connectWithRetry();
