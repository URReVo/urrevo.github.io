"use strict";

const RELEASE="74";
const CACHE_REVISION="r25-baseline";
const BASE="/experiments/prototype";
const CACHE_PREFIX="imposter-games-prototype-";
const CACHE_NAME=CACHE_PREFIX+"v"+RELEASE+"-"+CACHE_REVISION;
const versioned=path=>BASE+path+"?v="+RELEASE;

const CORE_URLS=[
  BASE+"/",BASE+"/manifest.webmanifest",
  versioned("/assets/css/launcher.css"),versioned("/assets/css/app-ui.css"),
  versioned("/assets/js/launcher.js"),versioned("/assets/js/launcher-dev.js"),versioned("/assets/js/app-state.js"),
  versioned("/assets/js/pwa.js"),
  versioned("/assets/css/game.css"),versioned("/assets/js/game-engine.js"),
  versioned("/assets/js/who-am-i.js"),versioned("/assets/css/who-am-i.css"),
  versioned("/assets/js/charades.js"),versioned("/assets/css/charades.css"),
  versioned("/assets/js/personal-impostor.js"),versioned("/assets/css/personal-impostor.css"),
  BASE+"/data/games.json",BASE+"/data/circa-questions.json",BASE+"/data/classic-words.json",
  BASE+"/data/who-am-i.json",BASE+"/data/charades.json",BASE+"/data/personal-impostor.json",
  BASE+"/games/circa-imposter/",BASE+"/games/classic-imposter/",BASE+"/games/who-am-i/",
  BASE+"/games/charades/",BASE+"/games/personal-impostor/",
  BASE+"/circa_impostor_detective_icon_180.png",BASE+"/circa_impostor_detective_icon_512.png"
];

const NAV_FALLBACKS={
  [BASE+"/"]:BASE+"/",[BASE+"/index.html"]:BASE+"/",
  [BASE+"/games/circa-imposter/"]:BASE+"/games/circa-imposter/",
  [BASE+"/games/circa-imposter/index.html"]:BASE+"/games/circa-imposter/",
  [BASE+"/games/classic-imposter/"]:BASE+"/games/classic-imposter/",
  [BASE+"/games/classic-imposter/index.html"]:BASE+"/games/classic-imposter/",
  [BASE+"/games/who-am-i/"]:BASE+"/games/who-am-i/",
  [BASE+"/games/who-am-i/index.html"]:BASE+"/games/who-am-i/",
  [BASE+"/games/charades/"]:BASE+"/games/charades/",
  [BASE+"/games/charades/index.html"]:BASE+"/games/charades/",
  [BASE+"/games/personal-impostor/"]:BASE+"/games/personal-impostor/",
  [BASE+"/games/personal-impostor/index.html"]:BASE+"/games/personal-impostor/"
};
const DATA_PATHS=new Set([
  BASE+"/data/games.json",BASE+"/data/circa-questions.json",BASE+"/data/classic-words.json",
  BASE+"/data/who-am-i.json",BASE+"/data/charades.json",BASE+"/data/personal-impostor.json"
]);
self.addEventListener("install",event=>event.waitUntil(
  caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_URLS.map(url=>new Request(url,{cache:"reload"}))))
    .catch(async error=>{try{await caches.delete(CACHE_NAME);}catch(cleanupError){}throw error;})
));
self.addEventListener("activate",event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));
async function cacheFirst(request,fallbackKey){
  const cache=await caches.open(CACHE_NAME);
  const cached=(await cache.match(request))||(fallbackKey?await cache.match(fallbackKey):null);
  if(cached)return cached;
  return fetch(request);
}
self.addEventListener("message",event=>{if(event.data&&event.data.type==="SKIP_WAITING")event.waitUntil(self.skipWaiting());});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const raw=event.notification&&event.notification.data&&event.notification.data.url;
  const target=new URL(raw||"/",self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then(async windowClients=>{
      if(windowClients.length){
        const client=windowClients[0];
        if("navigate" in client){
          try{await client.navigate(target);}catch(error){}
        }
        if("focus" in client)return client.focus();
      }
      if(self.clients.openWindow)return self.clients.openWindow(target);
      return undefined;
    })
  );
});

self.addEventListener("fetch",event=>{
  const request=event.request;if(request.method!=="GET")return;
  const url=new URL(request.url);if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE+"/"))return;
  if(request.mode==="navigate"){const fallback=NAV_FALLBACKS[url.pathname];if(!fallback)return;event.respondWith(cacheFirst(request,fallback));return;}
  if(DATA_PATHS.has(url.pathname)){event.respondWith(cacheFirst(request,url.pathname));return;}
  event.respondWith(cacheFirst(request,null));
});
