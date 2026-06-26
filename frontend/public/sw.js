self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
    const title = event.data.title || 'Sasl';
    const body = event.data.body || 'New notification';
    
    // Show native notification (plays system sound)
    self.registration.showNotification(title, {
      body: body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'sasl-notification',
      requireInteraction: false,
      silent: false
    });
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
