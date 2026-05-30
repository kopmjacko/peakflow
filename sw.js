/* ピークフロー記録 — service worker
   Caches the app shell so the app opens offline. CDN assets (fonts, icon font,
   Chart.js) are cached at runtime as they are fetched. */
var CACHE = 'peakflow-v1';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(res){
        // runtime-cache successful GETs (incl. CDN assets) for offline use
        try{
          var copy=res.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        }catch(err){}
        return res;
      }).catch(function(){
        // offline fallback: for navigations, serve the app shell
        if(e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
