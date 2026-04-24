const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_URL || 'postgres://postgres:postgres@localhost:5432/retailer_db');

const Retailer = sequelize.define('Retailer', {
    name: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    lat: { type: DataTypes.FLOAT, allowNull: false },
    lng: { type: DataTypes.FLOAT, allowNull: false },
    address: { type: DataTypes.STRING }
});

app.get('/', async (req, res) => {
    res.json(await Retailer.findAll());
});

app.post('/', async (req, res) => {
    try {
        const retailer = await Retailer.create(req.body);
        res.status(201).json(retailer);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
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

const connectWithRetry = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to Database');
        await sequelize.sync({ alter: true });
        
        if (await Retailer.count() === 0) {
            await Retailer.bulkCreate([
                { name: 'VK Paints Central', city: 'Bangalore', email: 'central@vkpaints.com', lat: 12.9716, lng: 77.5946, address: 'MG Road, Bangalore' },
                { name: 'VK Paints Whitefield', city: 'Bangalore', email: 'whitefield@vkpaints.com', lat: 12.9698, lng: 77.7499, address: 'Whitefield, Bangalore' },
                { name: 'VK Paints South', city: 'Mumbai', email: 'south@vkpaints.com', lat: 18.9220, lng: 72.8347, address: 'Colaba, Mumbai' },
                { name: 'VK Paints NCR', city: 'Delhi', email: 'ncr@vkpaints.com', lat: 28.7041, lng: 77.1025, address: 'Connaught Place, Delhi' }
            ]);
        }
        
        app.listen(process.env.PORT || 3005, () => console.log('Retailer Service running'));
    } catch (err) {
        console.error('Database connection failed, retrying in 5s...', err.message);
        setTimeout(connectWithRetry, 5000);
    }
};

connectWithRetry();
