// app.js

// IMPORTANTE: Pon la misma clave PÚBLICA que pusiste en server.js
const publicVapidKey = 'BM9XbhYKTpbl8TL4S0CqEvKSSKtjTODu4SZctw7ShIJLMfpAB1Bp2l6XLjBhjHdtSpKIyRxJarq6ojcIKUS2ZFM';

// Función para convertir la clave VAPID para que sea compatible con PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Lógica principal de registro y suscripción
async function subscribeUser(username) {
    try {
        // 1. Registrar Service Worker
        const register = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        console.log('Service Worker registrado');

        // 2. Suscribirse a Push Notifications
        const subscription = await register.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
        console.log('Suscripción Push creada');

        // 3. Enviar la suscripción a nuestro backend Node.js
        await fetch('/subscribe', {
            method: 'POST',
            body: JSON.stringify({ subscription, username }), // Enviamos la suscripción Y el usuario
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Suscripción enviada al servidor');
        alert(`¡Usuario '${username}' suscrito correctamente!`);

    } catch (error) {
        console.error('Error al suscribir:', error);
    }
}

// Asignar el evento al botón para pedir usuario y suscribir
document.getElementById('btn-subscribe').addEventListener('click', async () => {
    const username = prompt("Por favor, introduce tu nombre de usuario (ej: alberto, maria):");
    if (!username) {
        alert("El nombre de usuario es necesario para suscribirse.");
        return;
    }

    // Pedir permiso explícito al usuario
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        subscribeUser(username);
    } else {
        alert('Permiso de notificaciones denegado.');
    }
});

// Asignar el evento al botón de enviar notificación de prueba
document.getElementById('btn-send-test').addEventListener('click', async () => {
    const title = prompt("Introduce el título de la notificación:", "¡Notificación de prueba!");
    if (!title) return; // El usuario canceló

    const body = prompt("Introduce el mensaje:", "Este es un mensaje enviado desde el nuevo botón.");
    if (!body) return; // El usuario canceló

    try {
        const response = await fetch('/send-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, body })
        });
        const result = await response.json();
        alert(result.message || 'Notificación enviada');
    } catch (error) {
        console.error('Error al enviar la prueba:', error);
        alert('Hubo un error al intentar enviar la notificación.');
    }
});
