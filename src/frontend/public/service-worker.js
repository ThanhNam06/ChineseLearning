const CACHE_NAME = 'hanzihub-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
});

// Push notification listener
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { 
    title: 'Học tiếng Trung', 
    body: 'Đã đến lúc ôn tập từ vựng rồi! Hãy dành 5 phút để ghi nhớ nhé. 🔥',
    url: '/'
  };

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || self.registration.scope
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click notification listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
