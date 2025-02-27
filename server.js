import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import https from 'https';

const app = express();
const port = process.env.PORT || 3000;

// Create HTTPS agent with longer timeout and keep-alive
const httpsAgent = new https.Agent({
    timeout: 30000,
    keepAlive: true
});

// CORS configuration for both local and production
app.use(cors({
    origin: [
        'https://tnstoyanov.github.io',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Enable preflight for all routes
app.options('*', cors());

app.get('/proxy/:environment/:receiptNumber', async (req, res) => {
    const { environment, receiptNumber } = req.params;
    const url = `${decodeURIComponent(environment)}${receiptNumber}`;

    console.log('Received request:', {
        url,
        auth: req.headers.authorization ? 'Present' : 'Missing'
    });

    try {
        // Test DNS resolution first
        const dns = await import('dns');
        const { hostname } = new URL(url);
        
        try {
            await dns.promises.lookup(hostname);
        } catch (dnsError) {
            console.error('DNS lookup failed:', dnsError);
            return res.status(502).json({
                error: 'DNS resolution failed',
                details: `Cannot resolve hostname: ${hostname}`
            });
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization
            },
            agent: httpsAgent
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            return res.status(response.status).json({
                error: `API Error: ${response.status} ${response.statusText}`,
                details: errorText
            });
        }

        const data = await response.json();
        console.log('Successful response for:', receiptNumber);
        res.json(data);
    } catch (error) {
        console.error('Request failed:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Failed to process request',
            details: error.message,
            code: error.code || 'UNKNOWN'
        });
    }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('CORS enabled for:', [
        'https://tnstoyanov.github.io',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ]);
});