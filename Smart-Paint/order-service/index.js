const express = require('express');
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
