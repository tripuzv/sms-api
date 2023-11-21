import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;
const app = express();
const port = 3000;

app.use(express.json());

// PostgreSQL pool configuration
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

// POST endpoint to save SMS data into DB
app.post('/sms', async (req, res) => {
    console.log('API triggered'); // Log message when the API is triggered

    try {
        const { from, text, sentStamp, receivedStamp, sim } = req.body;

        // Check if all required parameters are present
        if (!from || !text || !sentStamp || !receivedStamp || !sim) {
            return res.status(400).send('All parameters (from, text, sentStamp, receivedStamp, sim) are required.');
        }

        // Convert timestamps to UTC
        const sentUTC = new Date(sentStamp).toISOString();
        const receivedUTC = new Date(receivedStamp).toISOString();

        const query = 'INSERT INTO SMS ("from", text, sentStamp, receivedStamp, sim) VALUES ($1, $2, $3, $4, $5)';
        await pool.query(query, [from, text, sentUTC, receivedUTC, sim]);
        res.status(201).send('Data saved');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving data');
    }
});

// GET endpoint to receive SMS messages from DB
app.get('/sms', async (req, res) => {
    try {
        const { sim, from, sentStamp, receivedStamp, page = 1 } = req.query;
        const limit = 15;
        const offset = (page - 1) * limit;

        let baseQuery = 'SELECT * FROM SMS';
        let filterConditions = [];
        let queryParams = [];

        if (sim) {
            filterConditions.push(' sim = $1');
            queryParams.push(sim);
        }
        if (from) {
            filterConditions.push(' "from" = $2');
            queryParams.push(from);
        }
        if (sentStamp) {
            filterConditions.push(' sentStamp = $3');
            queryParams.push(sentStamp);
        }
        if (receivedStamp) {
            filterConditions.push(' receivedStamp = $4');
            queryParams.push(receivedStamp);
        }

        if (filterConditions.length > 0) {
            baseQuery += ' WHERE' + filterConditions.join(' AND');
        }

        baseQuery += ' ORDER BY id DESC';

        const finalQuery = `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
        const response = await pool.query(finalQuery, queryParams);

        res.json(response.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving data');
    }
});
app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});
