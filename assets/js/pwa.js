(function(){
"use strict";

if(!("serviceWorker" in navigator))return;

function registerOfflineSupport(){
  navigator.serviceWorker.register("/service-worker.js",{
    scope:"/",
    updateViaCache:"none"
  }).then(function(registration){
    /* Check on every online app start. A new worker may install in the
       background, but it is deliberately not forced over a running round. */
    try{registration.update();}catch(e){}
  }).catch(function(){
    /* The app itself must stay usable even if service workers are unavailable. */
  });
}

if(document.readyState==="complete"){
  registerOfflineSupport();
}else{
  window.addEventListener("load",registerOfflineSupport,{once:true});
}
})();
