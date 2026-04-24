const express = require('express');
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
        res.json({ token, role: user.role, userId: user.id, email: user.email });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: ['id', 'name', 'email', 'role'] });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const connectWithRetry = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to Database');
        await sequelize.sync();

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (adminEmail && adminPassword) {
            const adminExists = await User.findOne({ where: { email: adminEmail } });
            if (!adminExists) {
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                await User.create({ name: 'System Admin', email: adminEmail, password: hashedPassword, role: 'Admin' });
                console.log('Default Admin user created from ENV variables.');
            }
        }

        app.listen(process.env.PORT || 3001, () => console.log('User Service running'));
    } catch (err) {
        console.error('Database connection failed, retrying in 5s...', err.message);
        setTimeout(connectWithRetry, 5000);
    }
};

connectWithRetry();
