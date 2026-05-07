// api/send-notification.js
require('dotenv').config();
const webpush = require('web-push');
const { Pool } = require('pg');

// Configure VAPID
webpush.setVapidDetails('mailto:albchicasanova16@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { title, body } = req.body;
    const payload = JSON.stringify({ title, body });

    try {
        const result = await pool.query('SELECT subscription_data FROM subscriptions');
        result.rows.forEach(row => {
            const subscription = row.subscription_data;
            webpush.sendNotification(subscription, payload)
                .catch(err => {
                    if (err.statusCode === 410) {
                        console.log(`Suscripción expirada detectada. Eliminando: ${subscription.endpoint}`);
                        pool.query('DELETE FROM subscriptions WHERE endpoint = $1', [subscription.endpoint]);
                    } else {
                        console.error('Error al enviar notificación:', err);
                    }
                });
        });
        res.status(200).json({ message: `Notificación enviada a ${result.rowCount} dispositivos.` });
    } catch (error) {
        console.error('Error al obtener suscripciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}