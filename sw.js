const CACHE_NAME = 'gastos-app-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './expenses.html',
  './income.html',
  './wallet.html',
  './details.html',
  './settings.html',
  './manifest.json',
  './styles.css',
  './script.js',
  './uiShared.js',
  './settings.js',
  './dataManager.js',
  './safeStorage.js',
  './eventBus.js',
  './notificationSystem.js',
  './cloudSync.js',
  './smartAutoSave.js',
  './globalFunctionChecker.js',
  './aiService.js',
  './analytics.js',
  './details.js',
  './expenses.js',
  './income.js',
  './wallet.js',
  './updateDashboardCards.js',
  './bankSyncService.js',
  './bankStatementParser.js',
  './asyncErrorHandler.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
