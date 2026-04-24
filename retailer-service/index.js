const express = require('express');
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

const connectWithRetry = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to Database');
        await sequelize.sync();
        
        if (await Retailer.count() === 0) {
            await Retailer.bulkCreate([
                { name: 'City Paints', lat: 40.7128, lng: -74.0060, address: 'NY Center' },
                { name: 'Metro Hardware', lat: 34.0522, lng: -118.2437, address: 'LA Metro' }
            ]);
        }
        
        app.listen(process.env.PORT || 3005, () => console.log('Retailer Service running'));
    } catch (err) {
        console.error('Database connection failed, retrying in 5s...', err.message);
        setTimeout(connectWithRetry, 5000);
    }
};

connectWithRetry();
