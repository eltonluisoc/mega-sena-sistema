// Service Worker para Bolões Aleatórios PWA
const CACHE_NAME = 'boloes-aleatorios-v2';
const BASE_PATH = '/mega-sena-sistema/';

// Lista de arquivos locais para cache (apenas os que com certeza existem)
const urlsToCache = [
  BASE_PATH + 'index.html',
  BASE_PATH + 'admin.html',
  BASE_PATH + 'style.css',
  BASE_PATH + 'script.js',
  BASE_PATH + 'admin.js',
  BASE_PATH + 'firebase-config.js',
  BASE_PATH + 'manifest.json'
];

// URLs externas (não tentar cache durante a instalação - apenas sob demanda)
const externalUrls = [
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics-compat.js',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto');
        // Tentar adicionar apenas os arquivos locais
        return cache.addAll(urlsToCache).catch(err => {
          console.log('[SW] Erro ao adicionar alguns arquivos:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', event => {
  console.log('[SW] Ativado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepta requisições e busca do cache
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Ignorar requisições para Firebase (sempre buscar da rede)
  if (url.includes('firebaseio.com') || url.includes('googleapis.com') || url.includes('gstatic.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna do cache
        if (response) {
          return response;
        }
        // Se não está no cache, busca na rede
        return fetch(event.request).then(response => {
          // Verifica se é uma resposta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          // Clona a resposta para guardar no cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
  );
});