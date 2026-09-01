// Service Worker para Bolões Aleatórios PWA
const CACHE_NAME = 'boloes-aleatorios-v14';  // ← VERSÃO ATUALIZADA
const BASE_PATH = '/mega-sena-sistema/';

// Lista de arquivos locais para cache
const urlsToCache = [
  BASE_PATH + 'index.html',
  BASE_PATH + 'admin.html',
  BASE_PATH + 'style.css',
  BASE_PATH + 'script.js',
  BASE_PATH + 'admin.js',
  BASE_PATH + 'firebase-config.js',
  BASE_PATH + 'manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto');
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

// Intercepta requisições: rede primeiro, cache só como fallback offline
// (evita que deploys novos fiquem escondidos atrás de conteúdo cacheado)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Ignorar requisições externas (Firebase, CDNs)
  if (url.includes('firebaseio.com') || url.includes('googleapis.com') || url.includes('gstatic.com') || url.includes('cdn.sheetjs.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});