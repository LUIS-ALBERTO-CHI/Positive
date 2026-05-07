// sw.js
self.addEventListener('push', event => {
    const data = event.data.json();
    console.log('Notificación push recibida', data);

    // Opciones para mostrar en la notificación
    const options = {
        body: data.body,
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIj48cmVjdCB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgZmlsbD0iIzAwN2JmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCIgZHk9Ii4zZW0iPlBXQTwvdGV4dD48L3N2Zz4='
    };

    // Mostramos la notificación nativa en el dispositivo
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    // Aquí puedes redirigir al usuario al hacer clic en la notificación
    event.waitUntil(
        clients.openWindow('http://localhost:3000/')
    );
});

// Este es el evento que faltaba.
// Hace que la PWA sea "instalable" al demostrar que puede manejar peticiones de red.
self.addEventListener('fetch', event => {
    // Por ahora, simplemente dejamos que la petición continúe a la red.
});
