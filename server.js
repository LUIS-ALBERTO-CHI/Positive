// server.js
require('dotenv').config();
const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// Configura el servidor para servir los archivos estáticos de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Reemplaza estas cadenas con las claves generadas en el paso anterior
const publicVapidKey = 'BM9XbhYKTpbl8TL4S0CqEvKSSKtjTODu4SZctw7ShIJLMfpAB1Bp2l6XLjBhjHdtSpKIyRxJarq6ojcIKUS2ZFM';
const privateVapidKey = 'cQ0uN1e8R-pofPx8AoxX0E7K2sHUU3RpW259zsaOKDs';

// Configuración de VAPID
webpush.setVapidDetails('mailto:albchicasanova16@gmail.com', publicVapidKey, privateVapidKey);

// Configuración de la base de datos PostgreSQL (Neon)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Requerido por Neon
    }
});

// Crear la tabla si no existe al iniciar el servidor
pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        username TEXT,
        endpoint TEXT UNIQUE NOT NULL,
        subscription_data JSONB NOT NULL
    )
`).then(() => {
    return pool.query('ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS username TEXT;');
}).then(() => console.log('✅ Tabla de suscripciones en Neon lista.'))
  .catch(err => console.error('❌ Error al configurar la tabla:', err));

// Ruta para manejar la suscripción
app.post('/subscribe', async (req, res) => {
    // Ahora esperamos un objeto con la suscripción y el nombre de usuario
    const { subscription, username } = req.body;

    if (!subscription || !username) {
        return res.status(400).json({ error: 'Faltan datos de suscripción o nombre de usuario.' });
    }

    try {
        // Guardamos la suscripción asociada al usuario.
        // Si el endpoint ya existe, actualizamos su username.
        await pool.query(
            `INSERT INTO subscriptions (username, endpoint, subscription_data) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (endpoint) 
             DO UPDATE SET username = $1`,
            [username, subscription.endpoint, subscription]
        );
        res.status(201).json({ message: `Usuario ${username} suscrito correctamente.` });
    } catch (error) {
        console.error('Error guardando la suscripción para el usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Nueva ruta para disparar notificaciones cuando queramos
app.post('/send-notification', async (req, res) => {
    const { title, body } = req.body;
    const payload = JSON.stringify({ title, body });

    try {
        const result = await pool.query('SELECT subscription_data FROM subscriptions');
        result.rows.forEach(row => {
            const subscription = row.subscription_data;
            webpush.sendNotification(subscription, payload)
                .catch(err => {
                    // Si el código de estado es 410 (Gone), la suscripción ha expirado.
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
        res.status(500).json({ error: 'Error interno' });
    }
});

// NUEVA RUTA: Enviar notificación a un usuario específico
app.post('/send-to-user', async (req, res) => {
    const { username, title, body } = req.body;
    const payload = JSON.stringify({ title, body });

    try {
        const result = await pool.query('SELECT subscription_data FROM subscriptions WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: `No se encontraron suscripciones para el usuario ${username}.` });
        }

        result.rows.forEach(row => {
            const subscription = row.subscription_data;
            webpush.sendNotification(subscription, payload)
                .catch(err => {
                    if (err.statusCode === 410) {
                        console.log(`Suscripción expirada para ${username}. Eliminando: ${subscription.endpoint}`);
                        pool.query('DELETE FROM subscriptions WHERE endpoint = $1', [subscription.endpoint]);
                    } else {
                        console.error('Error al enviar a un dispositivo:', err);
                    }
                });
        });
        res.status(200).json({ message: `Notificación enviada a ${result.rowCount} dispositivos de ${username}.` });
    } catch (error) {
        console.error(`Error al enviar notificación a ${username}:`, error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor iniciado en http://localhost:${PORT}`));
