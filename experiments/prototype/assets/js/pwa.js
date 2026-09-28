(function(){
"use strict";

var activeRegistration=null;
var waitingWorker=null;
var controllerReloadPending=false;
var lastOnlineState=navigator.onLine;
var toastHost=null;
var feedbackQueue=[];
var feedbackBusy=false;
var feedbackPumpScheduled=false;
var feedbackRecent={};
var feedbackAudioContext=null;
var DEV_SESSION_KEY="ci.diag.session.v1";

function statusElement(){return document.getElementById("offlineStatus");}
function preferences(){
  try{
    if(window.CIAppState&&window.CIAppState.getPreferences)return window.CIAppState.getPreferences();
  }catch(e){}
  return {sound:true,haptics:true,animations:true};
}
function animationsEnabled(){return preferences().animations!==false&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches;}
function haptic(kind){
  if(preferences().haptics===false||typeof navigator.vibrate!=="function")return false;
  var pattern=kind==="feedback3"?[14,28,18,30,24]:kind==="feedback2"?[10,24,14]:kind==="success"?[10,30,14]:kind==="warning"?[18,35,18]:[8];
  try{return navigator.vibrate(pattern);}catch(e){return false;}
}
function feedbackSound(level){
  if(preferences().sound===false)return false;
  var AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return false;
  try{
    if(!feedbackAudioContext)feedbackAudioContext=new AudioCtx();
    var ctx=feedbackAudioContext;
    if(ctx.state==="suspended"&&ctx.resume)ctx.resume();
    var nowAt=ctx.currentTime;
    var notes=level>=3?[523.25,659.25,783.99]:level===2?[523.25,659.25]:[587.33];
    notes.forEach(function(freq,index){
      var osc=ctx.createOscillator(),gain=ctx.createGain(),start=nowAt+index*.07,end=start+(level>=3?.16:.1);
      osc.type=level>=3?"sine":"triangle";osc.frequency.setValueAtTime(freq,start);
      gain.gain.setValueAtTime(0.0001,start);gain.gain.exponentialRampToValueAtTime(level>=3?.055:.035,start+.015);gain.gain.exponentialRampToValueAtTime(0.0001,end);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(end+.02);
    });
    return true;
  }catch(e){return false;}
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
function feedbackHero(item){
  var old=document.getElementById("ciFeedbackHero");
  if(old)old.remove();
  var overlay=document.createElement("div");overlay.id="ciFeedbackHero";overlay.className="ciFeedbackHero ciFeedbackLevel"+item.intensity;
  overlay.setAttribute("aria-live","polite");
  var card=document.createElement("div");card.className="ciFeedbackHeroCard";
  var label=document.createElement("span");label.className="ciFeedbackHeroLabel";label.textContent=item.label||"STARKER MOMENT";
  var icon=document.createElement("div");icon.className="ciFeedbackHeroIcon";icon.textContent=item.icon||"✨";
  var title=document.createElement("strong");title.textContent=item.title||"Stark!";
  var message=document.createElement("span");message.className="ciFeedbackHeroMessage";message.textContent=item.message||"";
  card.append(label,icon,title,message);
  if(animationsEnabled()){
    var burst=document.createElement("div");burst.className="ciFeedbackBurst";
    for(var i=0;i<10;i++){var dot=document.createElement("i");dot.style.setProperty("--i",String(i));burst.appendChild(dot);}
    card.appendChild(burst);
  }
  overlay.appendChild(card);document.body.appendChild(overlay);
  setTimeout(function(){overlay.classList.add("ciFeedbackHeroLeaving");},1650);
  setTimeout(function(){if(overlay.isConnected)overlay.remove();},1950);
}
function normalizeFeedbackItem(item){
  item=item&&typeof item==="object"?item:{};
  return {
    id:String(item.id||("feedback-"+Date.now()+"-"+Math.random())).slice(0,160),
    type:String(item.type||"feedback").slice(0,40),
    icon:String(item.icon||"✨").slice(0,8),
    title:String(item.title||"Starker Moment").slice(0,80),
    message:String(item.message||"").slice(0,180),
    label:String(item.label||"").slice(0,40),
    intensity:Math.max(1,Math.min(3,Math.round(Number(item.intensity)||1)))
  };
}
function presentFeedback(item){
  feedbackSound(item.intensity);
  haptic("feedback"+item.intensity);
  if(item.intensity>=3){
    feedbackHero(item);
    return 2050;
  }
  toast({
    icon:item.icon,
    title:item.title,
    message:item.message,
    kind:"Feedback"+item.intensity,
    duration:item.intensity===2?3900:3000
  });
  return item.intensity===2?1350:1050;
}
function pumpFeedback(){
  if(feedbackBusy||!feedbackQueue.length)return;
  feedbackBusy=true;
  var item=feedbackQueue.shift(),delay=presentFeedback(item);
  setTimeout(function(){feedbackBusy=false;pumpFeedback();},delay);
}
function queueFeedback(items){
  if(!Array.isArray(items))items=[items];
  var nowMs=Date.now(),fresh=[];
  items.forEach(function(raw){
    var item=normalizeFeedbackItem(raw),last=feedbackRecent[item.id]||0;
    if(nowMs-last<8000)return;
    feedbackRecent[item.id]=nowMs;fresh.push(item);
  });
  Object.keys(feedbackRecent).forEach(function(id){if(nowMs-feedbackRecent[id]>60000)delete feedbackRecent[id];});
  feedbackQueue=feedbackQueue.concat(fresh);
  feedbackQueue.sort(function(a,b){return b.intensity-a.intensity;});
  feedbackQueue=feedbackQueue.slice(0,12);
  if(!feedbackPumpScheduled){
    feedbackPumpScheduled=true;
    setTimeout(function(){feedbackPumpScheduled=false;pumpFeedback();},0);
  }
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
  navigator.serviceWorker.register("/experiments/prototype/service-worker.js",{scope:"/experiments/prototype/",updateViaCache:"none"})
    .then(watchRegistration)
    .catch(function(){
      navigator.serviceWorker.register("/experiments/prototype/service-worker.js",{scope:"/experiments/prototype/"})
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
function handleMotivationalFeedback(event){
  var items=event&&event.detail&&Array.isArray(event.detail.items)?event.detail.items:[];
  queueFeedback(items);
}
function handleAchievement(event){
  var items=event&&event.detail&&Array.isArray(event.detail.items)?event.detail.items:[];
  var heroIds={perfect:true,"hundred-rounds":true,"charades-10":true,"session-games-5":true};
  queueFeedback(items.slice(0,3).map(function(item){
    return {
      id:"achievement-"+item.id,icon:item.icon||"🏆",title:"Achievement · "+(item.title||"Freigeschaltet"),
      message:(item.progress?item.progress+" · ":"")+(item.text||"Neuer Meilenstein"),type:"achievement",label:"ACHIEVEMENT FREIGESCHALTET",
      intensity:heroIds[item.id]?3:2
    };
  }));
}
function handleCategoryUnlock(event){
  var items=event&&event.detail&&Array.isArray(event.detail.items)?event.detail.items:[];
  queueFeedback(items.slice(0,3).map(function(item){
    return {
      id:"category-"+item.id,icon:item.icon||"🔓",title:item.title||"Neue Kategorien",
      message:"Bonus-Kategorien freigeschaltet.",type:"progression",label:"NEUER CONTENT",intensity:3
    };
  }));
}
function handleCategoryTicketEarned(event){
  var items=event&&event.detail&&Array.isArray(event.detail.items)?event.detail.items:[];
  if(!items.length)return;
  queueFeedback({
    id:"category-ticket-"+items.map(function(item){return item.threshold;}).join("-"),
    icon:"🔓",title:"Freie Freischaltung verdient",
    message:items.length>1?(items.length+" neue Freischaltungen verfügbar."):"Du kannst jetzt selbst ein Bonus-Paket auswählen.",
    type:"progression",intensity:2
  });
}
function categoryGameLabel(game){
  return {circa:"Circa",classic:"Classic",whoami:"Wer bin ich?",charades:"Scharade"}[game]||game;
}
function ensureCategoryUnlockOverlay(){
  var existing=document.getElementById("ciCategoryUnlockOverlay");
  if(existing)return existing;
  var overlay=document.createElement("div");overlay.id="ciCategoryUnlockOverlay";overlay.className="ciProgressOverlay hidden";overlay.setAttribute("aria-hidden","true");
  var sheet=document.createElement("section");sheet.className="ciProgressSheet";sheet.setAttribute("role","dialog");sheet.setAttribute("aria-modal","true");sheet.setAttribute("aria-labelledby","ciProgressTitle");
  var handle=document.createElement("div");handle.className="ciProgressHandle";
  var header=document.createElement("div");header.className="ciProgressHeader";
  var headText=document.createElement("div");
  var eyebrow=document.createElement("span");eyebrow.className="ciProgressEyebrow";eyebrow.textContent="KATEGORIE GESPERRT";
  var title=document.createElement("h2");title.id="ciProgressTitle";
  headText.append(eyebrow,title);
  var close=document.createElement("button");close.type="button";close.className="ciProgressClose";close.textContent="×";close.setAttribute("aria-label","Schließen");
  header.append(headText,close);
  var body=document.createElement("div");body.id="ciProgressBody";
  sheet.append(handle,header,body);overlay.appendChild(sheet);document.body.appendChild(overlay);
  function closeOverlay(){overlay.classList.add("hidden");overlay.setAttribute("aria-hidden","true");}
  close.addEventListener("click",closeOverlay);
  overlay.addEventListener("click",function(event){if(event.target===overlay)closeOverlay();});
  document.addEventListener("keydown",function(event){if(event.key==="Escape"&&!overlay.classList.contains("hidden"))closeOverlay();});
  overlay._closeProgress=closeOverlay;
  return overlay;
}
function categoryPackCoverage(pack){
  var lines=[];
  Object.keys(pack.categories||{}).forEach(function(game){
    var cats=pack.categories[game]||[];
    if(cats.length)lines.push(categoryGameLabel(game)+": "+cats.join(", "));
  });
  return lines;
}
function openCategoryUnlock(game,category){
  var store=window.CIAppState;
  if(!store||!store.getCategoryLock)return false;
  var lock=store.getCategoryLock(game,category);
  if(!lock){
    toast({icon:"✓",title:"Kategorie verfügbar",message:String(category||""),duration:2200});
    return false;
  }
  var overlay=ensureCategoryUnlockOverlay(),body=document.getElementById("ciProgressBody"),title=document.getElementById("ciProgressTitle");
  title.textContent=(lock.icon||"🔒")+" "+lock.title;
  body.textContent="";

  var intro=document.createElement("p");intro.className="ciProgressIntro";
  intro.textContent="Diese Kategorie gehört zu einem Bonus-Paket. Du kannst sie über die Challenge erspielen oder eine freie Freischaltung einsetzen.";
  body.appendChild(intro);

  var coverage=document.createElement("div");coverage.className="ciProgressCoverage";
  var coverageTitle=document.createElement("strong");coverageTitle.textContent="WIRD FREIGESCHALTET";
  coverage.appendChild(coverageTitle);
  categoryPackCoverage(lock).forEach(function(line){var row=document.createElement("span");row.textContent=line;coverage.appendChild(row);});
  body.appendChild(coverage);

  var challenge=document.createElement("div");challenge.className="ciProgressCard";
  var challengeTop=document.createElement("div");challengeTop.className="ciProgressCardTop";
  var challengeText=document.createElement("div");
  var challengeEyebrow=document.createElement("span");challengeEyebrow.textContent="DIREKT-CHALLENGE";
  var challengeTitle=document.createElement("strong");challengeTitle.textContent=lock.challenge.title;
  challengeText.append(challengeEyebrow,challengeTitle);
  var challengeCount=document.createElement("b");challengeCount.textContent=lock.challenge.progress;
  challengeTop.append(challengeText,challengeCount);
  var desc=document.createElement("p");desc.textContent=lock.challenge.text;
  var track=document.createElement("div");track.className="ciProgressTrack";
  var fill=document.createElement("div");fill.className="ciProgressFill";fill.style.width=Math.round(lock.challenge.ratio*100)+"%";track.appendChild(fill);
  var auto=document.createElement("small");auto.textContent="Fortschritt wird automatisch gezählt.";
  challenge.append(challengeTop,desc,track,auto);body.appendChild(challenge);

  var tickets=lock.tickets||{};
  var ticket=document.createElement("div");ticket.className="ciProgressCard ciProgressTicketCard";
  var ticketTop=document.createElement("div");ticketTop.className="ciProgressCardTop";
  var ticketText=document.createElement("div");
  var ticketEyebrow=document.createElement("span");ticketEyebrow.textContent="FREIE WAHL";
  var ticketTitle=document.createElement("strong");
  ticketTitle.textContent=(tickets.available||0)>0?(tickets.available+" Freischaltung"+(tickets.available===1?"":"en")+" verfügbar"):"Noch keine freie Freischaltung";
  ticketText.append(ticketEyebrow,ticketTitle);
  ticketTop.appendChild(ticketText);ticket.appendChild(ticketTop);
  var ticketDesc=document.createElement("p");
  ticketDesc.textContent=(tickets.available||0)>0
    ?"Du entscheidest selbst, für welches gesperrte Paket du sie einsetzt."
    :(tickets.nextThreshold?("Nächste freie Freischaltung bei "+tickets.nextThreshold+" Gesamtrunden · noch "+tickets.roundsToNext+"."):"Alle Freischaltungen wurden bereits verdient.");
  ticket.appendChild(ticketDesc);
  if((tickets.available||0)>0){
    var use=document.createElement("button");use.type="button";use.className="ciProgressUnlockButton";use.textContent="Freischaltung für "+lock.title+" einsetzen";
    use.addEventListener("click",function(){
      var result=store.unlockCategoryPack(lock.id,"ticket");
      if(result&&result.ok){
        overlay._closeProgress();haptic("success");
      }else{
        toast({icon:"ℹ️",title:"Nicht verfügbar",message:"Die Freischaltung konnte gerade nicht eingesetzt werden.",duration:3000});
      }
    });
    ticket.appendChild(use);
  }else if(tickets.nextThreshold){
    var ticketTrack=document.createElement("div");ticketTrack.className="ciProgressTrack";
    var prev=0;
    (tickets.thresholds||[]).forEach(function(t){if(t<tickets.nextThreshold)prev=t;});
    var span=Math.max(1,tickets.nextThreshold-prev);
    var ratio=Math.max(0,Math.min(1,(tickets.rounds-prev)/span));
    var ticketFill=document.createElement("div");ticketFill.className="ciProgressFill";ticketFill.style.width=Math.round(ratio*100)+"%";ticketTrack.appendChild(ticketFill);ticket.appendChild(ticketTrack);
  }
  body.appendChild(ticket);

  overlay.classList.remove("hidden");overlay.setAttribute("aria-hidden","false");
  return true;
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
function emitTestFeedback(items){
  if(typeof CustomEvent==="undefined")return false;
  try{
    window.dispatchEvent(new CustomEvent("ci:motivational-feedback",{detail:{items:Array.isArray(items)?items:[items]}}));
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
  if(["achievement","achievement-stack","success","offline","update","feedback-1","feedback-2","feedback-3","feedback-session","profile-level","crew-level","crew-challenge"].indexOf(action)!==-1)closeDevPanelForPreview();
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
    }else if(action==="feedback-1"){
      emitTestFeedback({id:"dev-feedback-1-"+Date.now(),icon:"🎯",title:"Starke Schätzung",message:"Nur 8,4 % daneben.",intensity:1,type:"performance"});
    }else if(action==="feedback-2"){
      emitTestFeedback({id:"dev-feedback-2-"+Date.now(),icon:"🔥",title:"Persönlicher Rekord",message:"Neue Bestleistung in dieser Kategorie.",intensity:2,type:"record"});
    }else if(action==="feedback-3"){
      emitTestFeedback({id:"dev-feedback-3-"+Date.now(),icon:"🎯",title:"Punktlandung!",message:"Exakt richtig geschätzt.",label:"AUSSERGEWÖHNLICH",intensity:3,type:"performance"});
    }else if(action==="feedback-session"){
      emitTestFeedback({id:"dev-feedback-session-"+Date.now(),icon:"🏁",title:"Starker Spieleabend",message:"20 Runden · 4 Awards",label:"SESSION ABGESCHLOSSEN",intensity:3,type:"session-end"});
    }else if(action==="profile-level"){
      emitTestFeedback({id:"dev-profile-level-"+Date.now(),icon:"⭐",title:"Marlon · LVL 5",message:"Routinier · 140 XP",label:"LEVEL-UP",intensity:2,type:"profile-level"});
    }else if(action==="crew-level"){
      emitTestFeedback({id:"dev-crew-level-"+Date.now(),icon:"🔥",title:"Crew-Level 5",message:"Stammcrew · 42 gemeinsame Runden",label:"CREW LEVEL-UP",intensity:3,type:"crew"});
    }else if(action==="crew-challenge"){
      emitTestFeedback({id:"dev-crew-challenge-"+Date.now(),icon:"🎲",title:"Allrounder geschafft",message:"5/5 · Gemeinsames Ziel erreicht.",label:"CREW-CHALLENGE",intensity:3,type:"crew"});
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
  var title=document.createElement("div");title.className="devCardTitle";title.textContent="FEEDBACK / APP-FEEL";
  var buttons=document.createElement("div");buttons.className="devButtonGrid";
  [
    ["Achievement anzeigen","achievement"],
    ["3 Achievements","achievement-stack"],
    ["Erfolgs-Toast","success"],
    ["Offline-Hinweis","offline"],
    ["Feedback · klein","feedback-1"],
    ["Feedback · mittel","feedback-2"],
    ["Feedback · Hero","feedback-3"],
    ["Session-Finale","feedback-session"],
    ["Profil Level-Up","profile-level"],
    ["Crew Level-Up","crew-level"],
    ["Crew-Challenge","crew-challenge"],
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
    eyebrow.textContent="FEEDBACK";strong.textContent="Motivierende UI testen";
    headInner.append(eyebrow,strong);head.appendChild(headInner);
    var actions=document.createElement("div");actions.className="launcherDevActions three";
    [
      ["Achievement","achievement"],
      ["3 Achievements","achievement-stack"],
      ["Erfolgs-Toast","success"],
      ["Offline","offline"],
      ["Feedback 1","feedback-1"],
      ["Feedback 2","feedback-2"],
      ["Feedback 3","feedback-3"],
      ["Session-Finale","feedback-session"],
      ["Profil Level-Up","profile-level"],
      ["Crew Level-Up","crew-level"],
      ["Crew-Challenge","crew-challenge"],
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

window.CIAppUI={toast:toast,navigate:navigate,haptic:haptic,queueFeedback:queueFeedback,showUpdateReady:showUpdateReady,openCategoryUnlock:openCategoryUnlock,devTest:runDevUiTest};
installInteractionLayer();
installDevUiTests();
window.addEventListener("ci:motivational-feedback",handleMotivationalFeedback);
window.addEventListener("ci:achievement-unlocked",handleAchievement);
window.addEventListener("ci:category-unlocked",handleCategoryUnlock);
window.addEventListener("ci:category-ticket-earned",handleCategoryTicketEarned);

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