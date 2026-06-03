/* ピークフロー記録 — service worker (v2)
   Strategy:
   - HTML / navigations: NETWORK-FIRST. Always try to fetch the latest page; fall
     back to cache only when offline. This guarantees app updates show up.
   - Static assets (icons, fonts, Chart.js, manifest): CACHE-FIRST for speed/offline,
     refreshed in the background (stale-while-revalidate).
   Bump CACHE whenever you want to force-clear old caches. */
var CACHE = 'peakflow-v2';
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

function isHTML(req){
  return req.mode === 'navigate' ||
    (req.headers.get('accept')||'').indexOf('text/html') >= 0;
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;

  // NETWORK-FIRST for HTML so updates always appear when online.
  if(isHTML(req)){
    e.respondWith(
      fetch(req).then(function(res){
        try{ var copy=res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }catch(err){}
        return res;
      }).catch(function(){
        return caches.match(req).then(function(c){ return c || caches.match('./index.html'); });
      })
    );
    return;
  }

  // CACHE-FIRST (stale-while-revalidate) for static assets.
  e.respondWith(
    caches.match(req).then(function(cached){
      var network = fetch(req).then(function(res){
        try{ var copy=res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }catch(err){}
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});

// Allow the page to tell a waiting SW to take over immediately.
self.addEventListener('message', function(e){
  if(e.data === 'skipWaiting'){ self.skipWaiting(); }
});
