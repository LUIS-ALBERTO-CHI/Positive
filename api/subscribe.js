// api/subscribe.js
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { subscription, username } = req.body;

    if (!subscription || !username) {
        return res.status(400).json({ error: 'Faltan datos de suscripción o nombre de usuario.' });
    }

    try {
        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                username TEXT,
                endpoint TEXT UNIQUE NOT NULL,
                subscription_data JSONB NOT NULL
            )
        `);
        await pool.query('ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS username TEXT;');

        // Save subscription
        await pool.query(
            `INSERT INTO subscriptions (username, endpoint, subscription_data)
             VALUES ($1, $2, $3)
             ON CONFLICT (endpoint)
             DO UPDATE SET username = $1`,
            [username, subscription.endpoint, subscription]
        );
        res.status(201).json({ message: `Usuario ${username} suscrito correctamente.` });
    } catch (error) {
        console.error('Error guardando la suscripción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}