"use strict";

const RELEASE="73";
const CACHE_REVISION="r11";
const CACHE_PREFIX="imposter-games-";
const CACHE_NAME=CACHE_PREFIX+"v"+RELEASE+"-"+CACHE_REVISION;
const versioned=path=>path+"?v="+RELEASE;

const CORE_URLS=[
  "/",
  "/manifest.webmanifest",
  versioned("/assets/css/launcher.css"),
  versioned("/assets/js/launcher.js"),
  versioned("/assets/js/app-state.js"),
  versioned("/assets/js/pwa.js"),
  versioned("/assets/css/game.css"),
  versioned("/assets/js/game-engine.js"),
  versioned("/assets/js/who-am-i.js"),
  versioned("/assets/css/who-am-i.css"),
  "/data/games.json",
  "/data/circa-questions.json",
  "/data/classic-words.json",
  "/data/who-am-i.json",
  "/games/circa-imposter/",
  "/games/classic-imposter/",
  "/games/who-am-i/",
  "/circa_impostor_detective_icon_180.png",
  "/circa_impostor_detective_icon_512.png"
];

const NAV_FALLBACKS={
  "/":"/",
  "/index.html":"/",
  "/games/circa-imposter/":"/games/circa-imposter/",
  "/games/circa-imposter/index.html":"/games/circa-imposter/",
  "/games/classic-imposter/":"/games/classic-imposter/",
  "/games/classic-imposter/index.html":"/games/classic-imposter/",
  "/games/who-am-i/":"/games/who-am-i/",
  "/games/who-am-i/index.html":"/games/who-am-i/"
};

const DATA_PATHS=new Set([
  "/data/games.json",
  "/data/circa-questions.json",
  "/data/classic-words.json",
  "/data/who-am-i.json"
]);

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>{
        const requests=CORE_URLS.map(url=>new Request(url,{cache:"reload"}));
        return cache.addAll(requests);
      })
      .catch(async error=>{
        try{await caches.delete(CACHE_NAME);}catch(cleanupError){}
        throw error;
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
    const fallback=NAV_FALLBACKS[url.pathname];
    if(!fallback)return;
    event.respondWith(cacheFirst(request,fallback));
    return;
  }

  if(DATA_PATHS.has(url.pathname)){
    event.respondWith(cacheFirst(request,url.pathname));
    return;
  }

  event.respondWith(cacheFirst(request,null));
});
