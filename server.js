require('dotenv').config();
const express = require('express');
const path = require('path');
const PayWayService = require('./PayWayService');

const app = express();
const PORT = process.env.PORT || 3001;
const paywayService = new PayWayService();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    try {
        const checkoutData = paywayService.prepareCheckoutData();
        res.render('index', { 
            ...checkoutData,
            totalAmount: '$2.00'
        });
    } catch (error) {
        console.error('Error preparing checkout:', error);
        res.status(500).send('Error initializing checkout');
    }
});

// Simple checkout route with minimal data
app.get('/simple-checkout', (req, res) => {
    try {
        const checkoutData = paywayService.prepareSimpleCheckout();
        res.render('simple-checkout', { 
            ...checkoutData,
            totalAmount: '$2.00'
        });
    } catch (error) {
        console.error('Error preparing simple checkout:', error);
        res.status(500).send('Error initializing checkout');
    }
});

// Checkout route with custom data
app.post('/checkout', (req, res) => {
    try {
        const { firstName, lastName, phone, email, amount } = req.body;
        
        const checkoutData = paywayService.prepareCheckoutData({
            firstName: firstName || process.env.DEFAULT_FIRST_NAME,
            lastName: lastName || process.env.DEFAULT_LAST_NAME,
            phone: phone || process.env.DEFAULT_PHONE,
            email: email || process.env.DEFAULT_EMAIL,
            amount: amount || process.env.DEFAULT_AMOUNT
        });
        
        res.render('index', { 
            ...checkoutData,
            totalAmount: `$${(parseFloat(amount) || 2.00).toFixed(2)}`
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Checkout processing failed' });
    }
});

// Payment callback handler
app.post('/payment-callback', (req, res) => {
    console.log('Payment callback received:', req.body);
    res.json({ 
        status: 'success', 
        message: 'Payment callback processed',
        data: req.body 
    });
});

// Payment success page
app.get('/payment/success', (req, res) => {
    res.render('success', { 
        transactionId: req.query.tran_id,
        amount: req.query.amount 
    });
});

// Payment failure page
app.get('/payment/failed', (req, res) => {
    res.render('failed', { 
        error: req.query.error || 'Payment failed' 
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'PayWay Checkout Node.js' 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 PayWay Checkout Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 PayWay API: ${process.env.PAYWAY_API_URL}`);
});