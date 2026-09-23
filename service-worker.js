"use strict";

const CACHE_PREFIX="imposter-games-";
const CACHE_NAME=CACHE_PREFIX+"v70-r2";

const CORE_URLS=[
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/assets/css/launcher.css?v=70",
  "/assets/js/launcher.js?v=70",
  "/assets/js/pwa.js?v=70",
  "/assets/css/game.css?v=70",
  "/assets/js/game-engine.js?v=70",
  "/data/games.json",
  "/data/circa-questions.json",
  "/data/classic-words.json",
  "/games/circa-imposter/",
  "/games/circa-imposter/index.html",
  "/games/classic-imposter/",
  "/games/classic-imposter/index.html",
  "/circa_impostor_detective_icon_180.png",
  "/circa_impostor_detective_icon_512.png"
];

const NAV_PATHS=new Set([
  "/",
  "/index.html",
  "/games/circa-imposter/",
  "/games/circa-imposter/index.html",
  "/games/classic-imposter/",
  "/games/classic-imposter/index.html"
]);

const DATA_PATHS=new Set([
  "/data/games.json",
  "/data/circa-questions.json",
  "/data/classic-words.json"
]);

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>{
      /* A release is installable only when every required app file was
         fetched successfully. The currently active cache is not touched. */
      const requests=CORE_URLS.map(url=>new Request(url,{cache:"reload"}));
      return cache.addAll(requests);
    })
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME)
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

async function cacheFirst(request,fallbackKey){
  const cache=await caches.open(CACHE_NAME);
  const cached=(await cache.match(request))||
               (fallbackKey?await cache.match(fallbackKey):null);
  if(cached)return cached;
  return fetch(request);
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==="navigate"){
    if(!NAV_PATHS.has(url.pathname))return;
    /* Navigation stays on one complete release. A newer release is installed
       by the browser in parallel and becomes active after the old client ends. */
    event.respondWith(cacheFirst(request,url.pathname));
    return;
  }

  if(DATA_PATHS.has(url.pathname)){
    /* Data and runtime must belong to the same release as the page. */
    event.respondWith(cacheFirst(request,url.pathname));
    return;
  }

  /* Only pre-cached requests are retained. Cache misses go to the network
     without being added, preventing an ever-growing runtime cache. */
  event.respondWith(cacheFirst(request,null));
});
