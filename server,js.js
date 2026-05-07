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
webpush.setVapidDetails('mailto:tu.correo.real@gmail.com', publicVapidKey, privateVapidKey);

// Configuración de la base de datos PostgreSQL (Neon)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Requerido por Neon en muchas configuraciones de Node
    }
});

// Crear la tabla si no existe al iniciar el servidor
pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        subscription_data JSONB NOT NULL
    )
`).then(() => console.log('✅ Tabla de suscripciones en Neon lista.'))
  .catch(err => console.error('❌ Error al crear tabla:', err));

// Ruta para manejar la suscripción
app.post('/subscribe', async (req, res) => {
    // Obtenemos el objeto de suscripción que envía el frontend
    const subscription = req.body;

    try {
        // Guardamos la suscripción en PostgreSQL. 
        // Si el "endpoint" ya existe, lo ignoramos (DO NOTHING) para no tener duplicados.
        await pool.query(
            'INSERT INTO subscriptions (endpoint, subscription_data) VALUES ($1, $2) ON CONFLICT (endpoint) DO NOTHING',
            [subscription.endpoint, subscription]
        );
        
        res.status(201).json({});
    } catch (error) {
        console.error('Error guardando la suscripción en Neon:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Nueva ruta para disparar notificaciones cuando queramos
app.post('/send-notification', async (req, res) => {
    const { title, body } = req.body;
    const payload = JSON.stringify({ title, body });

    try {
        // Obtenemos todas las suscripciones de la base de datos de Neon
        const result = await pool.query('SELECT subscription_data FROM subscriptions');
        
        // Iteramos sobre las suscripciones y enviamos el push
        result.rows.forEach(row => {
            const subscription = row.subscription_data;
            webpush.sendNotification(subscription, payload)
                .catch(err => console.error('Error al enviar la notificación:', err));
        });

        res.status(200).json({ message: `Notificación enviada a ${result.rowCount} dispositivos registrados.` });
    } catch (error) {
        console.error('Error al obtener suscripciones de Neon:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor iniciado en http://localhost:${PORT}`));
