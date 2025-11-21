const crypto = require('crypto');

class PayWayService {
    constructor() {
        this.config = {
            API_URL: process.env.PAYWAY_API_URL,
            API_KEY: process.env.PAYWAY_API_KEY,
            MERCHANT_ID: process.env.PAYWAY_MERCHANT_ID
        };
        
        this.validateConfig();
    }

    validateConfig() {
        const required = ['API_URL', 'API_KEY', 'MERCHANT_ID'];
        for (const key of required) {
            if (!this.config[key]) {
                throw new Error(`Missing required PayWay configuration: ${key}`);
            }
        }
    }

    generateHash(str) {
        if (!this.config.API_KEY) {
            throw new Error('API_KEY is not configured');
        }

        try {
            return crypto
                .createHmac('sha512', this.config.API_KEY)
                .update(str)
                .digest('base64');
        } catch (error) {
            throw new Error(`Hash generation failed: ${error.message}`);
        }
    }

    // FIXED: Generate simple transaction ID like the PHP version
    generateTransactionId() {
        // Use simple timestamp like the PHP version did
        return Math.floor(Date.now() / 1000).toString();
    }

    // Simple checkout data (matching original PHP format)
    prepareSimpleCheckout() {
        const req_time = Math.floor(Date.now() / 1000);
        const transactionId = req_time.toString(); // Simple timestamp as transaction ID
        const amount = process.env.DEFAULT_AMOUNT || '0.01';
        const firstName = process.env.DEFAULT_FIRST_NAME || 'Makara';
        const lastName = process.env.DEFAULT_LAST_NAME || 'Prom';
        const phone = process.env.DEFAULT_PHONE || '093630466';
        const email = process.env.DEFAULT_EMAIL || 'prom.makara@ababank.com';
        const return_params = "Hello World!";

        // Create hash string (EXACTLY matching PHP order)
        const hashString = req_time + this.config.MERCHANT_ID + transactionId + 
                          amount + firstName + lastName + email + phone + return_params;
        
        console.log('Hash string:', hashString); // For debugging
        
        const hash = this.generateHash(hashString);

        return {
            req_time,
            transactionId,
            amount,
            firstName,
            lastName,
            phone,
            email,
            return_params,
            merchant_id: this.config.MERCHANT_ID,
            hash,
            api_url: this.config.API_URL
        };
    }

    prepareCheckoutData(customerData = {}) {
        const {
            firstName = process.env.DEFAULT_FIRST_NAME,
            lastName = process.env.DEFAULT_LAST_NAME,
            phone = process.env.DEFAULT_PHONE,
            email = process.env.DEFAULT_EMAIL,
            amount = process.env.DEFAULT_AMOUNT,
            return_params = "Hello World!"
        } = customerData;

        const req_time = Math.floor(Date.now() / 1000);
        const transactionId = req_time.toString(); // Simple timestamp

        // Create hash string (same order as PHP version)
        const hashString = req_time + this.config.MERCHANT_ID + transactionId + 
                          amount + firstName + lastName + email + phone + return_params;
        
        console.log('Hash string:', hashString);
        
        const hash = this.generateHash(hashString);

        return {
            req_time,
            transactionId,
            amount,
            firstName,
            lastName,
            phone,
            email,
            return_params,
            merchant_id: this.config.MERCHANT_ID,
            hash,
            api_url: this.config.API_URL
        };
    }

    getApiUrl() {
        return this.config.API_URL;
    }

    getMerchantId() {
        return this.config.MERCHANT_ID;
    }
}

module.exports = PayWayService;