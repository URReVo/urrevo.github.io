(function(){
"use strict";

var activeRegistration=null;
var prototypeScope="/experiments/prototype/";

function statusElement(){
  return document.getElementById("offlineStatus");
}
function setOfflineStatus(text,state){
  var el=statusElement();
  if(!el)return;
  el.textContent=text;
  el.setAttribute("data-state",state||"");
  el.classList.remove("hidden");
}
function refreshOfflineStatus(){
  if(!("serviceWorker" in navigator)){
    setOfflineStatus("Offline nicht verfügbar","error");
    return;
  }
  if(!navigator.onLine&&navigator.serviceWorker.controller){
    setOfflineStatus("Offline-Modus","offline");
    return;
  }
  if(navigator.serviceWorker.controller){
    setOfflineStatus("Offline bereit","ready");
    return;
  }
  setOfflineStatus("Offline wird vorbereitet …","pending");
}
function checkForUpdate(){
  if(!activeRegistration)return;
  try{activeRegistration.update();}catch(e){}
}
function watchRegistration(registration){
  activeRegistration=registration;
  refreshOfflineStatus();
  checkForUpdate();

  registration.addEventListener("updatefound",function(){
    var worker=registration.installing;
    if(!worker)return;
    setOfflineStatus("Update wird vorbereitet …","pending");
    worker.addEventListener("statechange",function(){
      if(worker.state==="installed"){
        if(navigator.serviceWorker.controller)setOfflineStatus("Update beim nächsten Start bereit","ready");
        else refreshOfflineStatus();
      }else if(worker.state==="redundant"){
        refreshOfflineStatus();
      }
    });
  });
}
function registerOfflineSupport(){
  if(!("serviceWorker" in navigator)){
    refreshOfflineStatus();
    return;
  }

  navigator.serviceWorker.register(prototypeScope+"service-worker.js",{
    scope:prototypeScope,
    updateViaCache:"none"
  }).then(watchRegistration).catch(function(){
    navigator.serviceWorker.register(prototypeScope+"service-worker.js",{scope:prototypeScope})
      .then(watchRegistration)
      .catch(function(){setOfflineStatus("Offline nicht verfügbar","error");});
  });
}

if(document.readyState==="complete"){
  registerOfflineSupport();
}else{
  window.addEventListener("load",registerOfflineSupport,{once:true});
}

if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("controllerchange",refreshOfflineStatus);
}
window.addEventListener("online",function(){refreshOfflineStatus();checkForUpdate();});
window.addEventListener("offline",refreshOfflineStatus);
refreshOfflineStatus();
})();
