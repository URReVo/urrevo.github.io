(async function(){
"use strict";
function byId(id){return document.getElementById(id);}
var PREFIX="imposterGames.prototype.game.charades.";
var STORAGE_PLAYERS=PREFIX+"players.v1",STORAGE_CATEGORIES=PREFIX+"categories.v1",STORAGE_DECK=PREFIX+"deck.v1",STORAGE_TIMER=PREFIX+"timer.v1",STORAGE_FLIP=PREFIX+"motionFlip.v1";
var avatarPool=["😎","🕵️","🥷","🤠","👻","🤖","🦊","🐼","🐸","🦁","🐙","🦄"];
var appState=window.CIAppState||null;
var preferences=appState&&appState.getPreferences?appState.getPreferences():{sound:true,haptics:true,animations:true};
var soundEnabled=preferences.sound!==false,audioCtx=null;
var bank=[],categoryMeta=[],count=3,players=[],savedNames=[],savedIds=[],avatars=[];
var selectedCategories=["Alle"],timerSeconds=60,motionFlip=false;
var playerIndex=0,currentItem=null,turnItems=[],results=[],turnCorrect=0,turnSkipped=0,remaining=60,timerHandle=null;
var turnRunning=false,countdownRunning=false,lastTick=0;
var orientationAttached=false,motionPermission="unknown",latestBeta=null,latestGamma=null,baseBeta=null,baseGamma=null,motionArmed=false,lastMotionAt=0,motionCandidate=0,motionCandidateSince=0,actionLockedUntil=0,actionUnlockTimer=null;
var MOTION_CORRECT_TRIGGER_DEG=58,MOTION_SKIP_TRIGGER_DEG=40,MOTION_NEUTRAL_DEG=16,MOTION_CONFIRM_MS=180,ACTION_COOLDOWN_MS=3000;
var sections=["setup","handoff","play","turnResult","finalResult"];

function get(key,fallback){try{var raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);}catch(e){return fallback;}}
function set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}
function clean(v){return String(v==null?"":v).trim().slice(0,24);}
function randomUnit(){try{if(window.crypto&&window.crypto.getRandomValues){var a=new Uint32Array(1);window.crypto.getRandomValues(a);return a[0]/4294967296;}}catch(e){}return Math.random();}
function pulse(ms){if(preferences.haptics!==false&&navigator.vibrate)try{navigator.vibrate(ms||8);}catch(e){}}
function tone(freq,duration){if(!soundEnabled)return;try{var Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;if(!audioCtx)audioCtx=new Ctx();if(audioCtx.state==="suspended")audioCtx.resume();var o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;o.type="sine";o.frequency.value=freq||520;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+(duration||.06));o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+(duration||.06)+.02);}catch(e){}}
function syncSound(){byId("soundOnIcon").classList.toggle("hidden",!soundEnabled);byId("soundOffIcon").classList.toggle("hidden",soundEnabled);byId("soundToggle").setAttribute("aria-pressed",soundEnabled?"true":"false");}
function show(id){sections.forEach(function(name){byId(name).classList.toggle("hidden",name!==id);});var active=id!=="setup";document.body.classList.toggle("game-active",active);byId("gameTopbar").classList.toggle("hidden",!active);byId("endTurnTop").classList.toggle("hidden",id!=="play");if(active&&players[playerIndex])byId("topPlayer").textContent=players[playerIndex].name;byId("topTimer").textContent=id==="play"?remaining+"s":timerSeconds+"s";}
function loadError(message){document.body.classList.remove("booting");document.body.removeAttribute("aria-busy");var app=byId("app");app.innerHTML="";var box=document.createElement("div");box.className="charadesTermCard";box.style.minHeight="65dvh";var h=document.createElement("h2");h.textContent="Spiel konnte nicht geladen werden";var p=document.createElement("p");p.textContent=String(message||"Unbekannter Fehler");box.append(h,p);app.appendChild(box);}
try{var res=await fetch("../../data/charades.json",{cache:"no-cache"});if(!res.ok)throw new Error("Begriffe konnten nicht geladen werden ("+res.status+").");var payload=await res.json();bank=Array.isArray(payload.items)?payload.items:[];categoryMeta=Array.isArray(payload.categories)?payload.categories:[];if(bank.length<50)throw new Error("Zu wenige Begriffe in der Datenbank.");}catch(error){loadError(error&&error.message||error);return;}

function validProfileId(id,name){if(!appState||!id||!appState.getProfileById)return null;var p=appState.getProfileById(id);return p&&clean(p.name).toLocaleLowerCase("de-DE")===clean(name).toLocaleLowerCase("de-DE")?p.id:null;}
function loadPlayers(){var data=get(STORAGE_PLAYERS,null);if(!data||!Array.isArray(data.players)||data.players.length<2)return false;var list=data.players.slice(0,12);count=Math.max(2,Math.min(12,list.length));savedNames=[];savedIds=[];avatars=[];list.forEach(function(item,i){item=item&&typeof item==="object"?item:{};var name=clean(item.name)||("Spieler "+(i+1));savedNames.push(name);savedIds.push(validProfileId(item.profileId,name));avatars.push(avatarPool.indexOf(item.avatar)!==-1?item.avatar:avatarPool[i%avatarPool.length]);});return true;}
function applyPreferred(){var group=appState&&appState.consumeLaunchGroup?appState.consumeLaunchGroup():null;var preferred=group&&group.length?group:(appState&&appState.getPreferredPlayers?appState.getPreferredPlayers(count):[]);if(group&&group.length)count=Math.max(2,Math.min(12,group.length));if(!preferred||!preferred.length)return;savedNames=[];savedIds=[];avatars=[];for(var i=0;i<count;i++){var p=preferred[i]||{id:null,name:"Spieler "+(i+1),avatar:avatarPool[i%avatarPool.length]};savedNames.push(clean(p.name)||("Spieler "+(i+1)));savedIds.push(p.id||null);avatars.push(avatarPool.indexOf(p.avatar)!==-1?p.avatar:avatarPool[i%avatarPool.length]);}}
function savePlayers(){var nodes=byId("names").querySelectorAll("input"),list=[];for(var i=0;i<count;i++){var name=clean(nodes[i]&&nodes[i].value)||("Spieler "+(i+1));var id=validProfileId(savedIds[i],name);savedIds[i]=id;list.push({name:name,avatar:avatars[i]||avatarPool[i%avatarPool.length],profileId:id});}savedNames=list.map(function(x){return x.name;});set(STORAGE_PLAYERS,{players:list});}
function renderPlayers(){var box=byId("names");box.innerHTML="";while(savedNames.length<count)savedNames.push("Spieler "+(savedNames.length+1));while(savedIds.length<count)savedIds.push(null);while(avatars.length<count)avatars.push(avatarPool[avatars.length%avatarPool.length]);savedNames=savedNames.slice(0,count);savedIds=savedIds.slice(0,count);avatars=avatars.slice(0,count);for(let i=0;i<count;i++){var row=document.createElement("div");row.className="playerRow";var av=document.createElement("button");av.type="button";av.className="playerAvatarButton";av.textContent=avatars[i];av.addEventListener("click",function(){var pos=avatarPool.indexOf(avatars[i]);avatars[i]=avatarPool[(pos+1)%avatarPool.length];av.textContent=avatars[i];savePlayers();tone(510,.04);});var input=document.createElement("input");input.type="text";input.className="playerInput";input.autocomplete="off";input.maxLength=24;input.value=savedNames[i];input.placeholder="Spieler "+(i+1);input.addEventListener("input",function(){savedIds[i]=validProfileId(savedIds[i],input.value);});input.addEventListener("blur",savePlayers);row.append(av,input);box.appendChild(row);}byId("minus").disabled=count<=2;byId("plus").disabled=count>=12;}

function loadCategories(){var saved=get(STORAGE_CATEGORIES,["Alle"]);var valid=categoryMeta.map(function(x){return x.name;});if(!Array.isArray(saved)||saved.indexOf("Alle")!==-1){selectedCategories=["Alle"];return;}selectedCategories=saved.filter(function(x,i){return valid.indexOf(x)!==-1&&saved.indexOf(x)===i;});if(!selectedCategories.length)selectedCategories=["Alle"];}
function saveCategories(){set(STORAGE_CATEGORIES,selectedCategories.slice());}
function pool(){if(selectedCategories.indexOf("Alle")!==-1)return bank.slice();return bank.filter(function(item){return selectedCategories.indexOf(item.cat)!==-1;});}
function renderCategories(){var deck=byId("categoryDeck");deck.innerHTML="";[{name:"Alle",emoji:"✨"}].concat(categoryMeta).forEach(function(meta){var name=meta.name,btn=document.createElement("button");btn.type="button";btn.className="categoryCard"+(selectedCategories.indexOf(name)!==-1?" selected":"");btn.setAttribute("aria-pressed",selectedCategories.indexOf(name)!==-1?"true":"false");var em=document.createElement("span");em.className="categoryEmoji";em.textContent=meta.emoji||"❔";var nm=document.createElement("span");nm.className="categoryName";nm.textContent=name;btn.append(em,nm);btn.addEventListener("click",function(){if(name==="Alle")selectedCategories=["Alle"];else{selectedCategories=selectedCategories.filter(function(x){return x!=="Alle";});var at=selectedCategories.indexOf(name);if(at===-1)selectedCategories.push(name);else selectedCategories.splice(at,1);if(!selectedCategories.length)selectedCategories=["Alle"];}saveCategories();renderCategories();updatePoolCount();tone(540,.04);pulse(5);});deck.appendChild(btn);});}
function updatePoolCount(){byId("poolCount").textContent=pool().length+" Begriffe verfügbar";}
function deckKey(){return selectedCategories.indexOf("Alle")!==-1?"Alle":selectedCategories.slice().sort().join("|");}
function drawOne(){var list=pool(),state=get(STORAGE_DECK,{});if(!state||typeof state!=="object"||Array.isArray(state))state={};var key=deckKey(),used=Array.isArray(state[key])?state[key].map(String):[],available=list.filter(function(x){return used.indexOf(String(x.id))===-1;});if(!available.length){used=[];available=list.slice();}if(!available.length)return null;var item=available[Math.floor(randomUnit()*available.length)];state[key]=used.concat(String(item.id));set(STORAGE_DECK,state);return item;}

function loadTimer(){var value=Number(get(STORAGE_TIMER,60));timerSeconds=[30,45,60,90,120].indexOf(value)!==-1?value:60;motionFlip=get(STORAGE_FLIP,false)===true;}
function renderTimer(){byId("timerControl").querySelectorAll("[data-seconds]").forEach(function(btn){var selected=Number(btn.getAttribute("data-seconds"))===timerSeconds;btn.classList.toggle("selected",selected);btn.setAttribute("aria-pressed",selected?"true":"false");});}
function collectPlayers(){var nodes=byId("names").querySelectorAll("input"),names=[],seen={};if(nodes.length<count)return {ok:false,message:"Spielerliste konnte nicht vollständig geladen werden."};for(var i=0;i<count;i++){var name=clean(nodes[i].value);if(!name)return {ok:false,message:"Bitte für jeden Spieler einen Namen eintragen."};var key=name.toLocaleLowerCase("de-DE");if(seen[key])return {ok:false,message:"Jeder Spieler braucht einen anderen Namen."};seen[key]=true;names.push(name);}players=[];for(var j=0;j<count;j++){var id=validProfileId(savedIds[j],names[j]);if(!id&&appState&&appState.ensureProfileForPlayer&&!/^spieler\s+\d+$/i.test(names[j]))id=appState.ensureProfileForPlayer({name:names[j],avatar:avatars[j]});savedIds[j]=id||null;players.push({name:names[j],avatar:avatars[j]||avatarPool[j%avatarPool.length],profileId:id||null});}savePlayers();return {ok:true};}

function beginParty(reuse){if(!reuse){var check=collectPlayers();if(!check.ok){byId("error").textContent=check.message;return;}}byId("error").textContent="";playerIndex=0;results=[];prepareHandoff();}
function prepareHandoff(){clearTurnRuntime();var p=players[playerIndex];byId("handoffAvatar").textContent=p.avatar;byId("handoffName").textContent=p.name;byId("permissionNote").textContent="";remaining=timerSeconds;show("handoff");}

function attachOrientation(){if(orientationAttached)return;window.addEventListener("deviceorientation",onOrientation,true);orientationAttached=true;}
async function requestMotion(){
  if(!("DeviceOrientationEvent" in window)){motionPermission="unsupported";return motionPermission;}
  try{
    var E=window.DeviceOrientationEvent;
    if(typeof E.requestPermission==="function"){
      var result=await E.requestPermission();
      if(result!=="granted"){motionPermission="denied";return motionPermission;}
    }
    motionPermission="granted";attachOrientation();return motionPermission;
  }catch(e){motionPermission="denied";return motionPermission;}
}
function angleDelta(value,base){var d=value-base;while(d>180)d-=360;while(d<-180)d+=360;return d;}
function screenAngle(){
  var raw=0;
  try{
    if(window.screen&&window.screen.orientation&&Number.isFinite(Number(window.screen.orientation.angle)))raw=Number(window.screen.orientation.angle);
    else if(Number.isFinite(Number(window.orientation)))raw=Number(window.orientation);
  }catch(e){}
  raw=((raw%360)+360)%360;
  return raw;
}
function motionDelta(){
  var db=angleDelta(latestBeta,baseBeta),dg=angleDelta(latestGamma,baseGamma),angle=screenAngle();
  if(angle===90)return -dg;
  if(angle===270)return dg;
  return db;
}
function setActionButtonsLocked(locked){
  byId("correctTerm").disabled=!!locked;
  byId("skipTerm").disabled=!!locked;
}
function actionCooldownRemaining(){
  return Math.max(0,actionLockedUntil-Date.now());
}
function updateActionLockUi(){
  if(!turnRunning)return;
  var left=actionCooldownRemaining();
  if(left<=0){
    setActionButtonsLocked(false);
    if(actionUnlockTimer){clearTimeout(actionUnlockTimer);actionUnlockTimer=null;}
    if(motionPermission!=="granted")byId("motionFeedback").textContent="Touch-Tasten bereit";
    return;
  }
  setActionButtonsLocked(true);
  byId("motionFeedback").textContent="Nächste Wertung in "+Math.max(1,Math.ceil(left/1000))+" s";
  actionUnlockTimer=setTimeout(updateActionLockUi,180);
}
function lockActions(){
  actionLockedUntil=Date.now()+ACTION_COOLDOWN_MS;
  setActionButtonsLocked(true);
  if(actionUnlockTimer)clearTimeout(actionUnlockTimer);
  updateActionLockUi();
}
function onOrientation(event){
  if(Number.isFinite(event.beta))latestBeta=Number(event.beta);
  if(Number.isFinite(event.gamma))latestGamma=Number(event.gamma);
  if(!turnRunning||countdownRunning||motionPermission!=="granted"||!Number.isFinite(baseBeta)||!Number.isFinite(baseGamma))return;
  var delta=motionDelta(),abs=Math.abs(delta),now=Date.now();

  if(!motionArmed){
    motionCandidate=0;motionCandidateSince=0;
    if(abs<=MOTION_NEUTRAL_DEG&&actionCooldownRemaining()<=0){
      motionArmed=true;
      byId("motionFeedback").textContent="Bereit · jetzt deutlich wippen";
    }
    return;
  }

  if(actionCooldownRemaining()>0){
    motionArmed=false;motionCandidate=0;motionCandidateSince=0;
    return;
  }

  var positiveThreshold=MOTION_CORRECT_TRIGGER_DEG;
  var negativeThreshold=MOTION_SKIP_TRIGGER_DEG;
  var direction=0;
  if(delta>=positiveThreshold)direction=1;
  else if(delta<=-negativeThreshold)direction=-1;
  else{
    motionCandidate=0;motionCandidateSince=0;
    return;
  }

  if(motionFlip)direction=-direction;
  if(motionCandidate!==direction){
    motionCandidate=direction;motionCandidateSince=now;
    return;
  }
  if(now-motionCandidateSince<MOTION_CONFIRM_MS)return;

  motionArmed=false;motionCandidate=0;motionCandidateSince=0;lastMotionAt=now;
  markCurrent(direction>0?"correct":"skipped","motion");
}
function motionStatusText(){
  if(motionPermission==="granted")return "Wippen aktiv · vor = richtig · zurück = überspringen";
  if(motionPermission==="denied")return "Bewegung nicht erlaubt · Touch-Tasten aktiv";
  if(motionPermission==="unsupported")return "Bewegung nicht verfügbar · Touch-Tasten aktiv";
  return "Bewegung wird vorbereitet …";
}
async function beginTurn(){
  byId("beginTurn").disabled=true;byId("permissionNote").textContent="Bewegungssensor wird vorbereitet …";
  await requestMotion();
  byId("beginTurn").disabled=false;
  byId("motionStatus").textContent=motionStatusText();
  remaining=timerSeconds;turnCorrect=0;turnSkipped=0;turnItems=[];currentItem=drawOne();
  if(!currentItem){byId("permissionNote").textContent="Keine Begriffe für diese Auswahl verfügbar.";return;}
  var p=players[playerIndex];byId("playAvatar").textContent=p.avatar;byId("playName").textContent=p.name;syncScore();renderTerm();show("play");
  startCountdown();
}
function startCountdown(){
  countdownRunning=true;turnRunning=false;baseBeta=null;baseGamma=null;motionArmed=false;
  var overlay=byId("countdown"),value=byId("countdownValue"),n=3;overlay.classList.remove("hidden");value.textContent=String(n);
  tone(460,.05);
  var step=function(){n--;if(n>0){value.textContent=String(n);tone(460+40*(3-n),.05);setTimeout(step,700);return;}value.textContent="LOS";tone(720,.08);setTimeout(function(){overlay.classList.add("hidden");countdownRunning=false;baseBeta=Number.isFinite(latestBeta)?latestBeta:0;baseGamma=Number.isFinite(latestGamma)?latestGamma:0;motionArmed=false;motionCandidate=0;motionCandidateSince=0;actionLockedUntil=0;turnRunning=true;lastTick=Date.now();setActionButtonsLocked(false);updateTimer();timerHandle=setInterval(tickTimer,200);byId("motionFeedback").textContent=motionPermission==="granted"?"Kurz ruhig halten · dann deutlich wippen":"Touch-Tasten bereit";},450);};
  setTimeout(step,700);
}
function tickTimer(){if(!turnRunning)return;var now=Date.now(),elapsed=(now-lastTick)/1000;if(elapsed<.18)return;var whole=Math.floor(elapsed);if(whole<1)return;remaining=Math.max(0,remaining-whole);lastTick+=whole*1000;updateTimer();if(remaining<=0)endTurn("timer");}
function updateTimer(){byId("topTimer").textContent=remaining+"s";}
function syncScore(){byId("scorePill").textContent="✓ "+turnCorrect+" · ↷ "+turnSkipped;}
function renderTerm(){if(!currentItem)return;byId("termCategory").textContent=currentItem.cat;byId("termText").textContent=currentItem.term;}
function feedback(type){var card=byId("termCard"),label=byId("motionFeedback");card.classList.remove("feedback-correct","feedback-skip");if(type==="correct"){card.classList.add("feedback-correct");label.textContent="✓ Richtig";tone(780,.055);pulse(10);}else{card.classList.add("feedback-skip");label.textContent="↷ Übersprungen";tone(330,.045);pulse(6);}setTimeout(function(){card.classList.remove("feedback-correct","feedback-skip");if(turnRunning&&actionCooldownRemaining()<=0)label.textContent=motionPermission==="granted"?"Zur Mitte zurück · bereit fürs nächste Wippen":"Touch-Tasten bereit";},420);}
function markCurrent(state,source){if(!turnRunning||!currentItem||actionCooldownRemaining()>0)return;turnItems.push({id:currentItem.id,term:currentItem.term,cat:currentItem.cat,state:state,source:source});if(state==="correct")turnCorrect++;else turnSkipped++;syncScore();feedback(state);currentItem=drawOne();if(!currentItem){endTurn("empty");return;}renderTerm();lockActions();motionArmed=false;motionCandidate=0;motionCandidateSince=0;}
function clearTurnRuntime(){turnRunning=false;countdownRunning=false;motionArmed=false;motionCandidate=0;motionCandidateSince=0;actionLockedUntil=0;if(timerHandle){clearInterval(timerHandle);timerHandle=null;}if(actionUnlockTimer){clearTimeout(actionUnlockTimer);actionUnlockTimer=null;}setActionButtonsLocked(false);byId("countdown").classList.add("hidden");}
function endTurn(reason){if(!turnRunning&&!countdownRunning&&byId("play").classList.contains("hidden"))return;clearTurnRuntime();results[playerIndex]={player:players[playerIndex],correct:turnCorrect,skipped:turnSkipped,items:turnItems.slice(),reason:reason||"manual"};renderTurnResult();}
function renderTurnResult(){var result=results[playerIndex],p=result.player;byId("turnResultAvatar").textContent=p.avatar;byId("turnResultName").textContent=p.name;byId("turnCorrect").textContent=String(result.correct);byId("turnSkipped").textContent=String(result.skipped);var box=byId("turnItems");box.innerHTML="";if(!result.items.length){var empty=document.createElement("div");empty.className="savedHint";empty.textContent="Noch kein Begriff gewertet.";box.appendChild(empty);}result.items.forEach(function(item){var row=document.createElement("div");row.className="charadesResultRow";var info=document.createElement("div"),name=document.createElement("strong"),cat=document.createElement("small"),state=document.createElement("span");name.textContent=item.term;cat.textContent=item.cat;state.className="charadesResultState "+item.state;state.textContent=item.state==="correct"?"✓ Richtig":"↷ Übersprungen";info.append(name,cat);row.append(info,state);box.appendChild(row);});byId("nextPlayer").textContent=playerIndex===players.length-1?"Gesamtergebnis":"Nächster Spieler";show("turnResult");}
function advance(){if(playerIndex>=players.length-1){renderFinal();return;}playerIndex++;prepareHandoff();}
function renderFinal(){var rows=results.filter(Boolean).map(function(r,i){return {index:i,player:r.player,correct:r.correct,skipped:r.skipped};}).sort(function(a,b){return b.correct-a.correct||a.skipped-b.skipped||a.index-b.index;});var box=byId("leaderboard");box.innerHTML="";rows.forEach(function(row,i){var el=document.createElement("div");el.className="charadesLeaderRow";var rank=document.createElement("div");rank.className="charadesLeaderRank";rank.textContent="#"+(i+1);var avatar=document.createElement("div");avatar.className="charadesLeaderAvatar";avatar.textContent=row.player.avatar;var info=document.createElement("div");info.className="charadesLeaderInfo";var name=document.createElement("strong");name.textContent=row.player.name;var sub=document.createElement("span");sub.textContent=row.skipped+" übersprungen";info.append(name,sub);var score=document.createElement("div");score.className="charadesLeaderScore";score.textContent=row.correct;el.append(rank,avatar,info,score);box.appendChild(el);});show("finalResult");tone(820,.09);pulse(12);}
function toggleSound(){soundEnabled=!soundEnabled;if(appState&&appState.setPreference)appState.setPreference("sound",soundEnabled);preferences.sound=soundEnabled;syncSound();if(soundEnabled)tone(620,.05);}
function leave(){clearTurnRuntime();if(players.length&&results.length&&!window.confirm("Scharade wirklich verlassen? Die aktuelle Partie wird beendet."))return;window.location.href="../../";}

var hadSaved=loadPlayers();if(!hadSaved)applyPreferred();else{var group=appState&&appState.consumeLaunchGroup?appState.consumeLaunchGroup():null;if(group&&group.length){count=Math.max(2,Math.min(12,group.length));savedNames=[];savedIds=[];avatars=[];for(var g=0;g<count;g++){var gp=group[g];savedNames.push(gp.name);savedIds.push(gp.id);avatars.push(avatarPool.indexOf(gp.avatar)!==-1?gp.avatar:avatarPool[g%avatarPool.length]);}}}
loadCategories();loadTimer();renderPlayers();renderCategories();renderTimer();updatePoolCount();syncSound();if(preferences.animations===false)document.body.classList.add("experimentReduceMotion");

byId("minus").addEventListener("click",function(){if(count>2){savePlayers();count--;renderPlayers();tone(430,.04);}});
byId("plus").addEventListener("click",function(){if(count<12){savePlayers();count++;renderPlayers();tone(520,.04);}});
byId("timerControl").addEventListener("click",function(event){var btn=event.target.closest("[data-seconds]");if(!btn)return;timerSeconds=Number(btn.getAttribute("data-seconds"));set(STORAGE_TIMER,timerSeconds);renderTimer();tone(540,.04);});
byId("start").addEventListener("click",function(){beginParty(false);});
byId("beginTurn").addEventListener("click",beginTurn);
byId("correctTerm").addEventListener("click",function(){markCurrent("correct","touch");});
byId("skipTerm").addEventListener("click",function(){markCurrent("skipped","touch");});
byId("flipMotion").addEventListener("click",function(){motionFlip=!motionFlip;set(STORAGE_FLIP,motionFlip);byId("motionStatus").textContent=(motionPermission==="granted"?"Wipp-Richtung getauscht · ":"")+motionStatusText();tone(470,.04);});
byId("endTurnTop").addEventListener("click",function(){if(turnRunning||countdownRunning)endTurn("manual");});
byId("nextPlayer").addEventListener("click",advance);
byId("sameGroup").addEventListener("click",function(){beginParty(true);});
byId("backSetup").addEventListener("click",function(){clearTurnRuntime();players=[];results=[];show("setup");window.scrollTo(0,0);});
byId("soundToggle").addEventListener("click",toggleSound);
byId("leaveGame").addEventListener("click",leave);
document.addEventListener("visibilitychange",function(){if(document.hidden&&turnRunning)endTurn("hidden");});

show("setup");document.body.classList.remove("booting");document.body.removeAttribute("aria-busy");
})();