const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

async function createPayWayCheckout() {
    const data = new FormData();
    const req_time = Math.floor(Date.now() / 1000);
    const transactionId = req_time.toString();
    const amount = process.env.DEFAULT_AMOUNT || '1.01';
    const firstName = process.env.DEFAULT_FIRST_NAME || 'Makara';
    const lastName = process.env.DEFAULT_LAST_NAME || 'Prom';
    const phone = process.env.DEFAULT_PHONE || '093630466';
    const email = process.env.DEFAULT_EMAIL || 'prom.makara@ababank.com';
    const return_params = "Hello World!";
    const payment_option = 'abapay_khqr';

    const hashString = req_time + 'ec462603' + transactionId + 
                      amount + firstName + lastName + email + phone + payment_option + return_params;
    
    console.log('Hash string:', hashString);
    
    const hash = crypto
                    .createHmac('sha512', '39546bbc83df8c4ce91437e1b8ed9f960f4db7f9')
                    .update(hashString)
                    .digest('base64');

    data.append('req_time', req_time);
    data.append('merchant_id', 'ec462603');
    data.append('tran_id', req_time);
    data.append('firstname', firstName);
    data.append('lastname', lastName);
    data.append('email', email);
    data.append('phone', phone);
    data.append('payment_option', payment_option);
    data.append('amount', amount);
    data.append('return_params', return_params);
    data.append('hash', hash);

    const config = {
        method: 'post',
        url: 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase',
        headers: { 
            ...data.getHeaders()
        },
        data: data,
        // Important: Set these to handle the HTML response
        maxRedirects: 0,
        validateStatus: function (status) {
            return true; // Accept all status codes
        }
    };

    try {
        console.log('Sending request to PayWay...');
        const response = await axios(config);
        
        console.log('Response status:', response.status);
        console.log('Response headers:', JSON.stringify(response.headers, null, 2));
        
        // Check if it's a redirect
        if (response.status >= 300 && response.status < 400) {
            if (response.headers.location) {
                console.log('✅ Found redirect URL:', response.headers.location);
                return response.headers.location;
            }
        }
        
        // Get the HTML response
        const html = response.data;
        console.log('Response type:', typeof html);
        console.log('Response length:', html.length);
        
        // Save HTML to file for debugging
        const fs = require('fs');
        fs.writeFileSync('response_debug.html', html);
        console.log('Saved response to response_debug.html');
        
        // Extract checkout URL using multiple methods
        const checkoutUrl = extractCheckoutUrl(html);
        
        if (checkoutUrl) {
            console.log('✅ Checkout URL found:', checkoutUrl);
            return checkoutUrl;
        } else {
            console.log('❌ Could not extract checkout URL');
            console.log('First 1000 chars of response:', html.substring(0, 1000));
            return null;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Check if it's a redirect error
        if (error.response) {
            console.log('Error response status:', error.response.status);
            console.log('Error response headers:', error.response.headers);
            
            // Check for redirect in error response
            if (error.response.headers && error.response.headers.location) {
                console.log('✅ Found redirect URL in error:', error.response.headers.location);
                return error.response.headers.location;
            }
        }
        
        return null;
    }
}

function extractCheckoutUrl(html) {
    console.log('Extracting checkout URL from HTML...');
    
    // Method 1: Look for path in __NUXT_DATA__
    console.log('Trying method 1: Extract from __NUXT_DATA__');
    const nuxtRegex = /id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i;
    const nuxtMatch = html.match(nuxtRegex);
    
    if (nuxtMatch && nuxtMatch[1]) {
        console.log('Found __NUXT_DATA__ script');
        try {
            // Try to parse the JSON
            const nuxtData = JSON.parse(nuxtMatch[1]);
            console.log('NUXT data parsed successfully');
            
            // The path is usually at the root level
            if (nuxtData.path && typeof nuxtData.path === 'string') {
                const checkoutPath = nuxtData.path;
                console.log('Found path in NUXT:', checkoutPath);
                
                if (checkoutPath.startsWith('/checkout/')) {
                    const checkoutUrl = `https://checkout-sandbox.payway.com.kh${checkoutPath}`;
                    console.log('Constructed URL from path:', checkoutUrl);
                    return checkoutUrl;
                }
            }
            
            // Also check in state data
            if (nuxtData.state && nuxtData.state.checkout) {
                console.log('Found checkout data in state');
                // Try to find any URL in the state
                const stateStr = JSON.stringify(nuxtData.state);
                const urlRegex = /https?:\/\/[^\s"]*checkout[^\s"]*/g;
                const urls = stateStr.match(urlRegex);
                if (urls && urls.length > 0) {
                    console.log('Found URLs in state:', urls);
                    return urls[0];
                }
            }
            
        } catch (e) {
            console.log('Could not parse NUXT data:', e.message);
            // Try to extract path directly from the string
            const pathRegex = /"path":"([^"]+)"/;
            const pathMatch = nuxtMatch[1].match(pathRegex);
            if (pathMatch && pathMatch[1]) {
                const checkoutPath = pathMatch[1];
                console.log('Extracted path directly:', checkoutPath);
                if (checkoutPath.includes('/checkout/')) {
                    const checkoutUrl = `https://checkout-sandbox.payway.com.kh${checkoutPath}`;
                    return checkoutUrl;
                }
            }
        }
    }
    
    // Method 2: Look for the full URL directly
    console.log('Trying method 2: Extract full URL pattern');
    const urlRegex = /(https?:\/\/checkout-sandbox\.payway\.com\.kh\/checkout\/[a-zA-Z0-9\-_=]+)/g;
    const urlMatch = html.match(urlRegex);
    
    if (urlMatch && urlMatch.length > 0) {
        console.log('Found URL matches:', urlMatch);
        // Get the first URL that looks like a checkout URL
        for (const url of urlMatch) {
            if (url.includes('/checkout/eyJ')) {
                console.log('Selected checkout URL:', url);
                return url;
            }
        }
        return urlMatch[0];
    }
    
    // Method 3: Look for base64 encoded token
    console.log('Trying method 3: Extract base64 token');
    const tokenRegex = /\/checkout\/(eyJ[a-zA-Z0-9\-_=]+)/;
    const tokenMatch = html.match(tokenRegex);
    
    if (tokenMatch && tokenMatch[1]) {
        const token = tokenMatch[1];
        console.log('Found token:', token.substring(0, 50) + '...');
        const checkoutUrl = `https://checkout-sandbox.payway.com.kh/checkout/${token}`;
        return checkoutUrl;
    }
    
    // Method 4: Check for any checkout URL pattern
    console.log('Trying method 4: General checkout URL search');
    const generalRegex = /(https?:\/\/[^"\s]*checkout[^"\s]*)/g;
    const generalMatches = html.match(generalRegex);
    
    if (generalMatches) {
        console.log('General matches found:', generalMatches);
        for (const match of generalMatches) {
            if (match.includes('payway.com.kh') && match.includes('/checkout/')) {
                return match;
            }
        }
    }
    
    console.log('All extraction methods failed');
    return null;
}

// Run the function
createPayWayCheckout().then(checkoutUrl => {
    if (checkoutUrl) {
        console.log('\n🎉 SUCCESS! Your checkout URL is:');
        console.log(checkoutUrl);
        
        // Generate simple iframe HTML
        const iframeHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayWay Payment</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        iframe { width: 100%; height: 700px; border: 1px solid #ddd; border-radius: 8px; }
    </style>
</head>
<body>
    <h1>Complete Your Payment</h1>
    <iframe src="${checkoutUrl}" allow="payment" frameborder="0"></iframe>
</body>
</html>`;
        
        // Save to file
        const fs = require('fs');
        fs.writeFileSync('payway-checkout.html', iframeHTML);
        console.log('\n📁 HTML file saved: payway-checkout.html');
        console.log('Open this file in your browser to see the payment page.');
        
    } else {
        console.log('\n❌ Failed to get checkout URL');
        console.log('Check the response_debug.html file to see what was returned.');
    }
});