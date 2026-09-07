// Fin JM - Service Worker
// Cuida da instalação do PWA e da exibição de notificações push.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Recebe uma notificação push enviada pelo backend (Edge Function) e exibe-a
self.addEventListener('push', (event) => {
  let dados = { title: 'Fin JM', body: 'Você tem uma nova notificação.' };
  try {
    if (event.data) dados = event.data.json();
  } catch (e) {
    // ignora payloads que não sejam JSON válido
  }

  event.waitUntil(
    self.registration.showNotification(dados.title || 'Fin JM', {
      body: dados.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { url: dados.url || '/' },
    })
  );
});

// Ao tocar na notificação, abre (ou foca) o app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
