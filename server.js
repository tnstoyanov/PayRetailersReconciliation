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

// Enable CORS for all routes
app.use(cors());

// Enable preflight requests for all routes
app.options('*', cors());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.get('/proxy/:environment/:receiptNumber', async (req, res) => {
    const { environment, receiptNumber } = req.params;
    const url = `${decodeURIComponent(environment)}${receiptNumber}`;

    console.log('Received request:', {
        url,
        auth: req.headers.authorization ? 'Present' : 'Missing',
        origin: req.headers.origin || 'No origin'
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

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upstream API Error:', {
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
        res.json(data);
    } catch (error) {
        console.error('Request failed:', error);
        res.status(500).json({ 
            error: 'Failed to process request',
            details: error.message,
            code: error.code || 'UNKNOWN'
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});