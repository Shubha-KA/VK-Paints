const express = require('express');
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

const connectWithRetry = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to Database');
        await sequelize.sync();
        
        const count = await Product.count();
        if (count === 0) {
            await Product.bulkCreate([
                { name: 'Royal Matt', type: 'Interior', color: 'White', price_per_liter: 500, coverage_sqft_per_liter: 120 },
                { name: 'WeatherCoat', type: 'Exterior', color: 'Beige', price_per_liter: 650, coverage_sqft_per_liter: 90 },
                { name: 'Satin Enamel', type: 'Wood/Metal', color: 'Blue', price_per_liter: 400, coverage_sqft_per_liter: 150 }
            ]);
        }
        
        app.listen(process.env.PORT || 3002, () => console.log('Product Service running'));
    } catch (err) {
        console.error('Database connection failed, retrying in 5s...', err.message);
        setTimeout(connectWithRetry, 5000);
    }
};

connectWithRetry();
