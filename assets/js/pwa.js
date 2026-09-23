(function(){
"use strict";

if(!("serviceWorker" in navigator))return;

var activeRegistration=null;

function checkForUpdate(){
  if(!activeRegistration)return;
  try{activeRegistration.update();}catch(e){}
}

function rememberRegistration(registration){
  activeRegistration=registration;
  /* Check on every online app start. A new worker may install in the
     background, but it is deliberately not forced over a running round. */
  checkForUpdate();
}

function registerOfflineSupport(){
  navigator.serviceWorker.register("/service-worker.js",{
    scope:"/",
    updateViaCache:"none"
  }).then(rememberRegistration).catch(function(){
    /* Compatibility fallback: older WebKit builds may not understand every
       registration option. Re-register with the minimal root scope. */
    navigator.serviceWorker.register("/service-worker.js",{scope:"/"})
      .then(rememberRegistration)
      .catch(function(){
        /* The games remain usable online even if service workers are unavailable. */
      });
  });
}

if(document.readyState==="complete"){
  registerOfflineSupport();
}else{
  window.addEventListener("load",registerOfflineSupport,{once:true});
}

/* If the app was opened offline and connectivity returns later, check then. */
window.addEventListener("online",checkForUpdate);
})();
