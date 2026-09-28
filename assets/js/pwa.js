(function(){
"use strict";

var activeRegistration=null;
var waitingWorker=null;
var controllerReloadPending=false;
var lastOnlineState=navigator.onLine;
var toastHost=null;

function statusElement(){return document.getElementById("offlineStatus");}
function preferences(){
  try{
    if(window.CIAppState&&window.CIAppState.getPreferences)return window.CIAppState.getPreferences();
  }catch(e){}
  return {haptics:true,animations:true};
}
function animationsEnabled(){return preferences().animations!==false&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches;}
function haptic(kind){
  if(preferences().haptics===false||typeof navigator.vibrate!=="function")return false;
  var pattern=kind==="success"?[10,30,14]:kind==="warning"?[18,35,18]:[8];
  try{return navigator.vibrate(pattern);}catch(e){return false;}
}
function ensureToastHost(){
  if(toastHost&&toastHost.isConnected)return toastHost;
  toastHost=document.createElement("div");
  toastHost.className="ciToastHost";
  toastHost.setAttribute("aria-live","polite");
  toastHost.setAttribute("aria-atomic","false");
  document.body.appendChild(toastHost);
  return toastHost;
}
function dismissToast(node){
  if(!node||!node.isConnected)return;
  if(animationsEnabled()){
    node.classList.add("ciToastLeaving");
    setTimeout(function(){if(node.isConnected)node.remove();},170);
  }else node.remove();
}
function toast(options){
  if(typeof options==="string")options={title:options};
  options=options||{};
  var host=ensureToastHost(),node=document.createElement("div");
  node.className="ciToast"+(options.kind?" ciToast"+String(options.kind).replace(/[^a-z0-9_-]/gi,""):"");
  if(options.persistent)node.dataset.persistent="1";
  var icon=document.createElement("div");icon.className="ciToastIcon";icon.textContent=options.icon||"✓";
  var text=document.createElement("div");text.className="ciToastText";
  var title=document.createElement("strong");title.textContent=options.title||"";
  text.appendChild(title);
  if(options.message){var message=document.createElement("span");message.textContent=options.message;text.appendChild(message);}
  node.append(icon,text);
  if(options.actionLabel&&typeof options.onAction==="function"){
    var action=document.createElement("button");action.type="button";action.className="ciToastAction";action.textContent=options.actionLabel;
    action.addEventListener("click",function(){
      haptic("tap");
      try{options.onAction();}catch(e){}
      if(!options.keepAfterAction)dismissToast(node);
    });
    node.appendChild(action);
  }
  host.appendChild(node);
  var duration=Number(options.duration);
  if(!options.persistent)setTimeout(function(){dismissToast(node);},duration>0?duration:3200);
  return node;
}
function setOfflineStatus(text,state){
  var el=statusElement();
  if(!el)return;
  el.textContent=text;
  el.setAttribute("data-state",state||"");
  el.classList.remove("hidden");
}
function refreshOfflineStatus(){
  if(!("serviceWorker" in navigator)){setOfflineStatus("Offline nicht verfügbar","error");return;}
  if(!navigator.onLine&&navigator.serviceWorker.controller){setOfflineStatus("Offline-Modus","offline");return;}
  if(navigator.serviceWorker.controller){setOfflineStatus("Offline bereit","ready");return;}
  setOfflineStatus("Offline wird vorbereitet …","pending");
}
function showUpdateReady(worker){
  waitingWorker=worker||waitingWorker;
  if(!waitingWorker)return;
  var existing=document.querySelector(".ciToastUpdate[data-update-ready='1']");
  if(existing)return;
  toast({
    icon:"⬆️",
    title:"Update verfügbar",
    message:"Die neue Version ist bereit.",
    actionLabel:"Jetzt laden",
    persistent:true,
    kind:"Update",
    onAction:function(){
      if(!waitingWorker)return;
      controllerReloadPending=true;
      try{waitingWorker.postMessage({type:"SKIP_WAITING"});}catch(e){controllerReloadPending=false;}
    }
  }).dataset.updateReady="1";
}
function checkForUpdate(){
  if(!activeRegistration)return;
  try{activeRegistration.update();}catch(e){}
}
function watchRegistration(registration){
  activeRegistration=registration;
  refreshOfflineStatus();
  if(registration.waiting&&navigator.serviceWorker.controller)showUpdateReady(registration.waiting);
  checkForUpdate();
  registration.addEventListener("updatefound",function(){
    var worker=registration.installing;
    if(!worker)return;
    setOfflineStatus("Update wird vorbereitet …","pending");
    worker.addEventListener("statechange",function(){
      if(worker.state==="installed"){
        if(navigator.serviceWorker.controller){
          setOfflineStatus("Update verfügbar","ready");
          showUpdateReady(worker);
        }else refreshOfflineStatus();
      }else if(worker.state==="redundant")refreshOfflineStatus();
    });
  });
}
function registerOfflineSupport(){
  if(!("serviceWorker" in navigator)){refreshOfflineStatus();return;}
  navigator.serviceWorker.register("/service-worker.js",{scope:"/",updateViaCache:"none"})
    .then(watchRegistration)
    .catch(function(){
      navigator.serviceWorker.register("/service-worker.js",{scope:"/"})
        .then(watchRegistration)
        .catch(function(){setOfflineStatus("Offline nicht verfügbar","error");});
    });
}
function internalHref(anchor){
  var raw=anchor.getAttribute("href");
  if(!raw||raw.charAt(0)==="#"||anchor.hasAttribute("download")||anchor.target&&anchor.target!=="_self")return null;
  try{
    var url=new URL(raw,window.location.href);
    if(url.origin!==window.location.origin)return null;
    return url.href;
  }catch(e){return null;}
}
function navigate(href){
  if(!href)return;
  if(!animationsEnabled()){window.location.href=href;return;}
  document.body.classList.add("ciPageLeaving");
  setTimeout(function(){window.location.href=href;},135);
}
function pressableTarget(target){
  if(!target||!target.closest)return null;
  var el=target.closest("button,a,[role='button'],.gameCard,.presetCard,.sessionCard,.playerCard,.categoryCard");
  if(!el||el.hasAttribute("disabled")||el.getAttribute("aria-disabled")==="true")return null;
  return el;
}
function installInteractionLayer(){
  document.addEventListener("pointerdown",function(event){
    var el=pressableTarget(event.target);if(!el)return;
    el.classList.add("ciPressable","ciPressed");
  },true);
  ["pointerup","pointercancel","pointerleave"].forEach(function(type){
    document.addEventListener(type,function(event){
      var el=pressableTarget(event.target);if(el)el.classList.remove("ciPressed");
    },true);
  });
  document.addEventListener("click",function(event){
    var interactive=pressableTarget(event.target);
    if(interactive&&interactive.tagName!=="INPUT")haptic("tap");
    if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    var anchor=event.target&&event.target.closest?event.target.closest("a[href]"):null;
    if(!anchor||anchor.dataset.ciNativeNav==="off")return;
    var href=internalHref(anchor);if(!href)return;
    event.preventDefault();navigate(href);
  });
}
function handleAchievement(event){
  var items=event&&event.detail&&Array.isArray(event.detail.items)?event.detail.items:[];
  items.slice(0,3).forEach(function(item,index){
    setTimeout(function(){
      haptic("success");
      toast({
        icon:item.icon||"🏆",
        title:"Achievement freigeschaltet",
        message:item.title||"Neuer Meilenstein",
        kind:"Achievement",
        duration:4300
      });
    },index*480);
  });
}

window.CIAppUI={toast:toast,navigate:navigate,haptic:haptic,showUpdateReady:showUpdateReady};
installInteractionLayer();
window.addEventListener("ci:achievement-unlocked",handleAchievement);

if(document.readyState==="complete")registerOfflineSupport();
else window.addEventListener("load",registerOfflineSupport,{once:true});

if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("controllerchange",function(){
    refreshOfflineStatus();
    if(controllerReloadPending){controllerReloadPending=false;window.location.reload();}
  });
}
window.addEventListener("online",function(){
  refreshOfflineStatus();checkForUpdate();
  if(lastOnlineState===false)toast({icon:"✓",title:"Wieder online",message:"Verbindung wiederhergestellt.",duration:2200});
  lastOnlineState=true;
});
window.addEventListener("offline",function(){
  refreshOfflineStatus();
  if(lastOnlineState===true)toast({icon:"☁️",title:"Offline-Modus",message:"Die gespeicherten Spiele bleiben verfügbar.",kind:"Offline",duration:3000});
  lastOnlineState=false;
});
refreshOfflineStatus();
})();