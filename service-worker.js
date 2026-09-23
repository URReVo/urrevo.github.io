"use strict";

const CACHE_PREFIX="imposter-games-";
const CACHE_NAME=CACHE_PREFIX+"v70";

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

async function networkFirst(request){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request);
    if(response&&response.ok)await cache.put(request,response.clone());
    return response;
  }catch(error){
    const cached=await cache.match(request);
    if(cached)return cached;
    throw error;
  }
}

async function navigationFallback(request,url){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request);
    if(response&&response.ok)await cache.put(request,response.clone());
    return response;
  }catch(error){
    const direct=await cache.match(request);
    if(direct)return direct;

    if(url.pathname==="/")return cache.match("/");
    if(url.pathname==="/index.html")return cache.match("/index.html");
    if(url.pathname.startsWith("/games/circa-imposter/")){
      return (await cache.match("/games/circa-imposter/"))||
             (await cache.match("/games/circa-imposter/index.html"));
    }
    if(url.pathname.startsWith("/games/classic-imposter/")){
      return (await cache.match("/games/classic-imposter/"))||
             (await cache.match("/games/classic-imposter/index.html"));
    }
    throw error;
  }
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==="navigate"){
    if(NAV_PATHS.has(url.pathname)){
      event.respondWith(navigationFallback(request,url));
    }
    return;
  }

  if(DATA_PATHS.has(url.pathname)){
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache=>
      cache.match(request).then(cached=>cached||fetch(request))
    )
  );
});
