(function(){
"use strict";

var activeRegistration=null;
var waitingWorker=null;
var controllerReloadPending=false;
var lastOnlineState=navigator.onLine;
var toastHost=null;
var DEV_SESSION_KEY="ci.diag.session.v1";

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
function closeDevPanelForPreview(){
  var gamePanel=document.getElementById("devPanelOverlay");
  if(gamePanel&&!gamePanel.classList.contains("hidden")){
    gamePanel.classList.add("hidden");gamePanel.setAttribute("aria-hidden","true");
  }
  var sharedGamePanel=document.getElementById("ciSharedDevPanelOverlay");
  if(sharedGamePanel&&!sharedGamePanel.classList.contains("hidden")){
    sharedGamePanel.classList.add("hidden");sharedGamePanel.setAttribute("aria-hidden","true");
  }
  var launcherPanel=document.getElementById("launcherDevPanelOverlay");
  if(launcherPanel&&!launcherPanel.classList.contains("hidden")){
    launcherPanel.classList.add("hidden");launcherPanel.setAttribute("aria-hidden","true");
    document.body.classList.remove("launcherDevOpen");
  }
}
function emitTestAchievements(items){
  if(typeof CustomEvent==="undefined")return false;
  try{
    window.dispatchEvent(new CustomEvent("ci:achievement-unlocked",{detail:{items:items}}));
    return true;
  }catch(e){return false;}
}
function previewMiniSession(){
  var bar=document.getElementById("sessionMiniBar");
  if(!bar){toast({icon:"ℹ️",title:"Nur im Launcher",message:"Die Mini-Session-Leiste existiert nur im Launcher.",duration:2800});return;}
  var state=window.CIAppState&&window.CIAppState.getActiveSession?window.CIAppState.getActiveSession():null;
  if(state){toast({icon:"🟢",title:"Echte Session läuft bereits",message:"Die Mini-Session-Leiste zeigt gerade echte Daten.",duration:3000});return;}
  var icon=document.getElementById("sessionMiniIcon"),title=document.getElementById("sessionMiniTitle"),sub=document.getElementById("sessionMiniSub");
  var old={icon:icon.textContent,title:title.textContent,sub:sub.textContent,disabled:bar.disabled,hidden:bar.classList.contains("hidden"),body:document.body.classList.contains("hasMiniSession")};
  icon.textContent="🎬";title.textContent="Scharade · 7 Runden";sub.textContent="DEV-Vorschau · Tippen zum Fortsetzen";
  bar.disabled=true;bar.classList.remove("hidden");document.body.classList.add("hasMiniSession");
  setTimeout(function(){
    if(!bar.isConnected)return;
    icon.textContent=old.icon;title.textContent=old.title;sub.textContent=old.sub;bar.disabled=old.disabled;
    bar.classList.toggle("hidden",old.hidden);document.body.classList.toggle("hasMiniSession",old.body);
  },4200);
}
function runDevUiTest(action){
  action=String(action||"");
  if(["achievement","achievement-stack","success","offline","update"].indexOf(action)!==-1)closeDevPanelForPreview();
  setTimeout(function(){
    if(action==="achievement"){
      emitTestAchievements([{id:"dev-preview",icon:"🏆",title:"Warmgelaufen",text:"DEV-Vorschau"}]);
    }else if(action==="achievement-stack"){
      emitTestAchievements([
        {id:"dev-preview-1",icon:"🎬",title:"Erster Abend",text:"DEV-Vorschau"},
        {id:"dev-preview-2",icon:"🎯",title:"Punktlandung",text:"DEV-Vorschau"},
        {id:"dev-preview-3",icon:"💯",title:"Veteran",text:"DEV-Vorschau"}
      ]);
    }else if(action==="success"){
      haptic("success");
      toast({icon:"✓",title:"Aktion erfolgreich",message:"So sieht ein normaler Erfolgs-Hinweis aus.",duration:3600});
    }else if(action==="offline"){
      toast({icon:"☁️",title:"Offline-Modus",message:"Die gespeicherten Spiele bleiben verfügbar.",kind:"Offline",duration:4000});
    }else if(action==="update"){
      toast({
        icon:"⬆️",title:"Update verfügbar",message:"DEV-Vorschau – es wird nichts aktualisiert.",
        actionLabel:"Test schließen",persistent:true,kind:"Update",onAction:function(){}
      }).dataset.devUpdatePreview="1";
    }else if(action==="mini-session"){
      previewMiniSession();
    }else if(action==="haptic"){
      var ok=haptic("success");
      toast({
        icon:ok?"📳":"ℹ️",
        title:ok?"Haptik ausgelöst":"Keine Browser-Haptik",
        message:ok?"Das Gerät hat den Test angenommen.":"Der Browser meldet für navigator.vibrate keine Unterstützung oder Haptik ist deaktiviert.",
        duration:3600
      });
    }
  },120);
}
function devTestButton(label,action,className){
  var button=document.createElement("button");
  button.type="button";button.textContent=label;button.dataset.ciDevUiTest=action;
  if(className)button.className=className;
  return button;
}
function devSessionUnlocked(){
  try{return sessionStorage.getItem(DEV_SESSION_KEY)==="1";}catch(e){return false;}
}
function buildGameDevTestCard(){
  var card=document.createElement("div");card.id="ciDevUiTests";card.className="devCard devWide";
  var title=document.createElement("div");title.className="devCardTitle";title.textContent="APP-FEEL TESTS";
  var buttons=document.createElement("div");buttons.className="devButtonGrid";
  [
    ["Achievement anzeigen","achievement"],
    ["3 Achievements","achievement-stack"],
    ["Erfolgs-Toast","success"],
    ["Offline-Hinweis","offline"],
    ["Update-Hinweis","update"],
    ["Haptik testen","haptic"]
  ].forEach(function(item){buttons.appendChild(devTestButton(item[0],item[1],"secondary"));});
  var note=document.createElement("div");note.className="devQuestionMeta";
  note.textContent="Vorschauen nutzen die echten Produktions-UI-Pfade, verändern aber keine Statistik oder Achievement-Freischaltung.";
  card.append(title,buttons,note);
  return card;
}
function installSharedGameDevEntry(){
  if(!document.body||!document.body.dataset||!document.body.dataset.game||document.getElementById("devPanelOverlay")||!devSessionUnlocked())return;
  var toolbar=document.querySelector(".gameTopbar .toolbarActions");
  if(!toolbar||document.getElementById("ciSharedDevOpen"))return;

  var open=document.createElement("button");
  open.id="ciSharedDevOpen";open.type="button";open.className="iconButton devToolbarButton";
  open.textContent="DEV";open.setAttribute("aria-label","App-Feel DEV Tests öffnen");open.title="DEV";

  var overlay=document.createElement("div");overlay.id="ciSharedDevPanelOverlay";overlay.className="devOverlay hidden";overlay.setAttribute("aria-hidden","true");
  var sheet=document.createElement("div");sheet.className="devSheet";sheet.setAttribute("role","dialog");sheet.setAttribute("aria-modal","true");sheet.setAttribute("aria-labelledby","ciSharedDevTitle");
  var header=document.createElement("div");header.className="devSheetHeader";
  var title=document.createElement("div");title.id="ciSharedDevTitle";title.className="devSheetTitle";title.textContent="DEV Tools · App-Feel";
  var close=document.createElement("button");close.type="button";close.className="devClose";close.textContent="✕";close.setAttribute("aria-label","Schließen");
  header.append(title,close);
  var grid=document.createElement("div");grid.className="devGrid";grid.appendChild(buildGameDevTestCard());
  sheet.append(header,grid);overlay.appendChild(sheet);document.body.appendChild(overlay);toolbar.appendChild(open);

  function closePanel(){overlay.classList.add("hidden");overlay.setAttribute("aria-hidden","true");}
  open.addEventListener("click",function(){overlay.classList.remove("hidden");overlay.setAttribute("aria-hidden","false");});
  close.addEventListener("click",closePanel);
  overlay.addEventListener("click",function(event){if(event.target===overlay)closePanel();});
  document.addEventListener("keydown",function(event){if(event.key==="Escape"&&!overlay.classList.contains("hidden"))closePanel();});
}
function installDevUiTests(){
  if(document.getElementById("ciDevUiTests")||document.getElementById("ciLauncherDevUiTests")){installSharedGameDevEntry();return;}

  var gameGrid=document.querySelector("#devPanelOverlay .devGrid");
  if(gameGrid)gameGrid.appendChild(buildGameDevTestCard());

  var launcherPanel=document.querySelector("#launcherDevPanelOverlay .launcherDevPanel");
  if(launcherPanel){
    var section=document.createElement("section");section.id="ciLauncherDevUiTests";section.className="launcherDevSection";
    var head=document.createElement("div");head.className="launcherDevSectionHead";
    var headInner=document.createElement("div"),eyebrow=document.createElement("span"),strong=document.createElement("strong");
    eyebrow.textContent="APP-FEEL";strong.textContent="Neue UI-Funktionen testen";
    headInner.append(eyebrow,strong);head.appendChild(headInner);
    var actions=document.createElement("div");actions.className="launcherDevActions three";
    [
      ["Achievement","achievement"],
      ["3 Achievements","achievement-stack"],
      ["Erfolgs-Toast","success"],
      ["Offline","offline"],
      ["Update","update"],
      ["Haptik","haptic"],
      ["Mini-Session","mini-session"]
    ].forEach(function(item){actions.appendChild(devTestButton(item[0],item[1],"launcherDevButton secondary"));});
    var hint=document.createElement("p");hint.className="launcherDevHint";
    hint.textContent="Nur Vorschau: Die Tests ändern keine echten Statistiken, Sessions oder Achievement-Zustände.";
    section.append(head,actions,hint);
    var toolsSection=launcherPanel.querySelector(".launcherDevSection:last-of-type");
    if(toolsSection)launcherPanel.insertBefore(section,toolsSection);else launcherPanel.appendChild(section);
  }

  installSharedGameDevEntry();
  document.addEventListener("click",function(event){
    var button=event.target&&event.target.closest?event.target.closest("[data-ci-dev-ui-test]"):null;
    if(!button)return;
    event.preventDefault();runDevUiTest(button.dataset.ciDevUiTest);
  });
}

window.CIAppUI={toast:toast,navigate:navigate,haptic:haptic,showUpdateReady:showUpdateReady,devTest:runDevUiTest};
installInteractionLayer();
installDevUiTests();
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