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
        await sequelize.sync({ alter: true });
        
        const count = await Product.count();
        if (count === 0) {
            await Product.bulkCreate([
                { name: 'Standard Wall Putty', type: 'Wall Putty', color: 'White', price_per_liter: 40, coverage_sqft_per_liter: 15 },
                { name: 'Acrylic Wall Putty', type: 'Wall Putty', color: 'White', price_per_liter: 80, coverage_sqft_per_liter: 20 },
                { name: 'Interior Wall Primer', type: 'Wall Primer', color: 'White', price_per_liter: 150, coverage_sqft_per_liter: 100 },
                { name: 'Exterior Wall Primer', type: 'Wall Primer', color: 'White', price_per_liter: 180, coverage_sqft_per_liter: 90 },
                { name: 'Acrylic Distemper', type: 'Distemper', color: 'White', price_per_liter: 60, coverage_sqft_per_liter: 60 },
                { name: 'Synthetic Distemper', type: 'Distemper', color: 'Cream', price_per_liter: 50, coverage_sqft_per_liter: 50 },
                { name: 'Premium Interior Emulsion', type: 'Emulsion', color: 'White', price_per_liter: 300, coverage_sqft_per_liter: 120 },
                { name: 'Luxury Exterior Emulsion', type: 'Emulsion', color: 'White', price_per_liter: 450, coverage_sqft_per_liter: 100 },
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
