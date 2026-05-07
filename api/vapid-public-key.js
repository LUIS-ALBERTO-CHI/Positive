// api/vapid-public-key.js

export default function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
        res.status(500).json({ error: 'VAPID public key not configured' });
        return;
    }

    res.status(200).json({ publicKey });
}