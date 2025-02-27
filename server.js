import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import https from 'https';

const app = express();
const port = process.env.PORT || 3000;

const httpsAgent = new https.Agent({
    timeout: 30000,
    keepAlive: true
});

// Updated CORS configuration
app.use(cors({
    origin: '*',  // Allow all origins in development
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Access-Control-Allow-Origin'],
    credentials: false  // Changed to false since we're using '*'
}));

// Remove the separate options middleware since we're handling all origins
app.get('/proxy/:environment/:receiptNumber', async (req, res) => {
    const { environment, receiptNumber } = req.params;
    const url = `${decodeURIComponent(environment)}${receiptNumber}`;

    console.log('Received request:', {
        url,
        auth: req.headers.authorization ? 'Present' : 'Missing',
        origin: req.headers.origin
    });

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization
            },
            agent: httpsAgent
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Request failed:', error);
        res.status(500).json({ 
            error: 'Failed to process request',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});