self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});





self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'NOTIFICATION') {
    const { title, body } = event.data;
    self.registration.showNotification(title || 'Sasl', {
      body: body || 'New notification',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'sasl-notification',
      requireInteraction: true
    });
  }
});


self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    self.registration.setAppBadge?.(event.data.count);
  }
});



self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://sasl.vercel.app')
  );
});




