const express = require('express');

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
