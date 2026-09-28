(function(){
"use strict";

var store=window.CIAppState;
if(!store)return;

var SESSION_KEY="ci.diag.session.v1";
var tapTimes=[];
var failures=0;
var lockedUntil=0;
var selectedScope="global";
var statusTimer=null;

var STAT_ORDER_GLOBAL=[
  "rounds","circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds",
  "impostor","personalImpostor","perfectEstimates",
  "charadesCorrect","charadesSkipped","charadesTurns","charadesBestTurn","charadesCleanTurns"
];
var STAT_ORDER_PROFILE=[
  "rounds","circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds",
  "impostor","personalImpostor","impostorEscapes","closest","farthest","perfect","errorSum","errorSamples",
  "charadesCorrect","charadesSkipped","charadesTurns","charadesBestTurn","charadesCleanTurns"
];
var STAT_LABELS={
  rounds:"Runden gesamt",circaRounds:"Circa-Runden",classicRounds:"Classic-Runden",whoamiRounds:"Wer-bin-ich?-Runden",
  charadesRounds:"Scharade-Partien",personalRounds:"Persönliche Runden",impostor:"Impostor-Rollen",
  personalImpostor:"Davon persönlich",impostorEscapes:"Impostor entkommen",closest:"Beste Schätzungen",
  farthest:"Weiteste Schätzungen",perfect:"Punktlandungen",perfectEstimates:"Punktlandungen",
  errorSum:"Fehler-Summe",errorSamples:"Fehler-Messungen",charadesCorrect:"Scharade richtig",
  charadesSkipped:"Scharade übersprungen",charadesTurns:"Scharade Spieler-Runden",
  charadesBestTurn:"Scharade Bestwert",charadesCleanTurns:"Saubere Scharade-Runden"
};
var GAME_LABELS={circa:"Circa",classic:"Classic",whoami:"Wer bin ich?",charades:"Scharade",personal:"Persönlich"};

function byId(id){return document.getElementById(id);}
function esc(value){
  return String(value===undefined||value===null?"":value)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function diagUnlocked(){
  try{return sessionStorage.getItem(SESSION_KEY)==="1";}catch(e){return false;}
}
function setDiagUnlocked(value){
  try{
    if(value)sessionStorage.setItem(SESSION_KEY,"1");
    else sessionStorage.removeItem(SESSION_KEY);
  }catch(e){}
  syncVisibility();
}
function syncVisibility(){
  var unlocked=diagUnlocked();
  document.querySelectorAll(".launcherDevOnly").forEach(function(el){el.classList.toggle("hidden",!unlocked);});
}
function setStatus(message,kind){
  var el=byId("launcherDevStatus");if(!el)return;
  el.textContent=message||"";
  el.dataset.kind=kind||"";
  if(statusTimer)clearTimeout(statusTimer);
  if(message)statusTimer=setTimeout(function(){el.textContent="";el.dataset.kind="";},5000);
}
function closeGate(){
  var overlay=byId("launcherDevGateOverlay");
  overlay.classList.add("hidden");overlay.setAttribute("aria-hidden","true");
  byId("launcherDevPin").value="";
}
function openGate(){
  if(diagUnlocked()){openPanel();return;}
  byId("launcherDevPin").value="";
  byId("launcherDevGateError").textContent="";
  var overlay=byId("launcherDevGateOverlay");
  overlay.classList.remove("hidden");overlay.setAttribute("aria-hidden","false");
  setTimeout(function(){try{byId("launcherDevPin").focus();}catch(e){}},80);
}
function b64Bytes(text){
  var raw=atob(text),out=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}
function sameBytes(a,b){
  if(a.length!==b.length)return false;
  var diff=0;
  for(var i=0;i<a.length;i++)diff|=(a[i]^b[i]);
  return diff===0;
}
async function verifyEntry(value){
  if(!window.crypto||!window.crypto.subtle||!window.TextEncoder)return false;
  var material=await window.crypto.subtle.importKey(
    "raw",new TextEncoder().encode(String(value||"")),"PBKDF2",false,["deriveBits"]
  );
  var bits=await window.crypto.subtle.deriveBits(
    {name:"PBKDF2",salt:b64Bytes("2vIOc2m/dMogebMxv2A8YA=="),iterations:180000,hash:"SHA-256"},
    material,256
  );
  return sameBytes(new Uint8Array(bits),b64Bytes("YkZr4kQ14jp6eIv00xAYKCr265VTIWWuWiQCWQtN2B0="));
}
async function submitGate(){
  var now=Date.now(),error=byId("launcherDevGateError");
  if(now<lockedUntil){
    error.textContent="Bitte "+Math.ceil((lockedUntil-now)/1000)+" Sekunden warten.";
    return;
  }
  var value=byId("launcherDevPin").value.trim();
  if(value.length!==6||!/^[0-9]+$/.test(value)){error.textContent="Ungültige Eingabe.";return;}
  byId("launcherDevGateSubmit").disabled=true;error.textContent="Prüfe …";
  var ok=false;
  try{ok=await verifyEntry(value);}catch(e){ok=false;}
  byId("launcherDevGateSubmit").disabled=false;
  if(ok){
    failures=0;lockedUntil=0;setDiagUnlocked(true);closeGate();openPanel();return;
  }
  failures++;byId("launcherDevPin").value="";
  if(failures>=5){
    failures=0;lockedUntil=Date.now()+30000;error.textContent="Zu viele Versuche. 30 Sekunden gesperrt.";
  }else error.textContent="Zugriff nicht möglich.";
}
function handleTrigger(){
  var now=Date.now();
  tapTimes=tapTimes.filter(function(t){return now-t<=4000;});
  tapTimes.push(now);
  if(tapTimes.length>=7){tapTimes=[];openGate();}
}
function closePanel(){
  var overlay=byId("launcherDevPanelOverlay");
  overlay.classList.add("hidden");overlay.setAttribute("aria-hidden","true");
  document.body.classList.remove("launcherDevOpen");
}
function openPanel(){
  if(!diagUnlocked()){openGate();return;}
  renderPanel();
  var overlay=byId("launcherDevPanelOverlay");
  overlay.classList.remove("hidden");overlay.setAttribute("aria-hidden","false");
  document.body.classList.add("launcherDevOpen");
}
function refreshLauncher(){
  if(typeof window.CILauncherRefresh==="function")window.CILauncherRefresh();
}
function currentScopeInfo(){
  if(selectedScope.indexOf("profile:")===0){
    var id=selectedScope.slice(8),profile=store.getProfileById(id);
    if(profile&&!profile.deletedAt)return {scope:"profile",profileId:id,label:profile.name,stats:store.getProfileStats(id)};
  }
  selectedScope="global";
  return {scope:"global",profileId:null,label:"Gesamt",stats:store.getStats()};
}
function renderScope(){
  var select=byId("launcherDevScope"),profiles=store.getProfiles();
  var values=["global"].concat(profiles.map(function(p){return "profile:"+p.id;}));
  if(values.indexOf(selectedScope)===-1)selectedScope="global";
  select.textContent="";
  var globalOption=document.createElement("option");globalOption.value="global";globalOption.textContent="Gesamt · Gerät";select.appendChild(globalOption);
  profiles.forEach(function(p){
    var option=document.createElement("option");option.value="profile:"+p.id;option.textContent=p.avatar+" "+p.name;select.appendChild(option);
  });
  select.value=selectedScope;
}
function renderOverview(){
  var snap=store.snapshot(),usage=store.getUsageStats(),active=store.getActiveSession();
  var bytes=0;try{bytes=new Blob([JSON.stringify(snap)]).size;}catch(e){}
  byId("launcherDevSummary").innerHTML=[
    '<div><span>Build</span><strong>'+esc(document.title.replace("Imposter Games · ",""))+'</strong></div>',
    '<div><span>Profile</span><strong>'+snap.profiles.length+'</strong></div>',
    '<div><span>Sessions</span><strong>'+snap.sessions.length+'</strong></div>',
    '<div><span>Presets</span><strong>'+snap.presets.length+'</strong></div>',
    '<div><span>App-Zeit</span><strong>'+Math.floor(usage.appMs/60000)+' Min.</strong></div>',
    '<div><span>State</span><strong>'+(bytes?Math.max(1,Math.round(bytes/1024))+" KB":"–")+'</strong></div>'
  ].join("");
  byId("launcherDevActiveSession").textContent=active
    ?"Aktiv: "+((active.rounds||[]).length)+" Runden · "+(active.lastGame||"–")
    :"Keine aktive Session";
  byId("launcherDevEndSession").disabled=!active;
}
function renderStats(){
  var info=currentScopeInfo(),stats=info.stats;
  byId("launcherDevScopeHint").textContent=info.scope==="global"?"Geräteweite Statistik":"Profil: "+info.label;
  var keys=info.scope==="profile"?STAT_ORDER_PROFILE:STAT_ORDER_GLOBAL,grid=byId("launcherDevStatsGrid");
  grid.textContent="";
  keys.forEach(function(key){
    if(typeof stats[key]!=="number")return;
    var label=document.createElement("label");label.className="launcherDevField";
    var name=document.createElement("span");name.textContent=STAT_LABELS[key]||key;
    var input=document.createElement("input");input.type="number";input.min="0";input.step=key==="errorSum"?"0.1":"1";input.value=String(stats[key]);input.dataset.statKey=key;
    label.append(name,input);grid.appendChild(label);
  });
  byId("launcherDevStatsJson").value=JSON.stringify(stats,null,2);
}
function saveQuickStats(){
  var info=currentScopeInfo(),patch={};
  byId("launcherDevStatsGrid").querySelectorAll("[data-stat-key]").forEach(function(input){
    patch[input.dataset.statKey]=Math.max(0,Number(input.value)||0);
  });
  var result=store.devPatchStats(info.scope,info.profileId,patch);
  if(!result){setStatus("Statistik konnte nicht gespeichert werden.","error");return;}
  renderStats();renderAchievements();renderOverview();refreshLauncher();setStatus("Statistik gespeichert.","ok");
}
function saveRawStats(){
  var info=currentScopeInfo(),parsed;
  try{parsed=JSON.parse(byId("launcherDevStatsJson").value);}catch(e){setStatus("JSON ist ungültig.","error");return;}
  var result=store.devReplaceStats(info.scope,info.profileId,parsed);
  if(!result){setStatus("Statistik konnte nicht übernommen werden.","error");return;}
  renderStats();renderAchievements();renderOverview();refreshLauncher();setStatus("Rohdaten übernommen und bereinigt.","ok");
}
function resetStats(){
  var info=currentScopeInfo();
  if(!window.confirm("Statistik für "+info.label+" wirklich auf 0 setzen?"))return;
  store.devResetStats(info.scope,info.profileId);
  renderStats();renderAchievements();renderOverview();refreshLauncher();setStatus("Statistik zurückgesetzt.","ok");
}
async function fillContentProgress(){
  var info=currentScopeInfo();
  setStatus("Lade Inhaltsdaten …","");
  try{
    var responses=await Promise.all([
      fetch("data/circa-questions.json",{cache:"no-cache"}),
      fetch("data/classic-words.json",{cache:"no-cache"}),
      fetch("data/who-am-i.json",{cache:"no-cache"}),
      fetch("data/charades.json",{cache:"no-cache"}),
      fetch("data/personal-impostor.json",{cache:"no-cache"})
    ]);
    if(responses.some(function(r){return !r.ok;}))throw new Error("load");
    var payloads=await Promise.all(responses.map(function(r){return r.json();}));
    var patch={
      circaQids:(payloads[0].items||[]).map(function(x){return x.qid;}),
      classicWids:(payloads[1].items||[]).map(function(x){return x.wid;}),
      whoamiTermIds:(payloads[2].items||[]).map(function(x){return x.id;}),
      charadesTermIds:(payloads[3].items||[]).map(function(x){return x.id;}),
      personalQids:(payloads[4].items||[]).map(function(x){return x.id;}),
      categories:Array.from(new Set((payloads[0].items||[]).map(function(x){return x.cat;})))
    };
    store.devPatchStats(info.scope,info.profileId,patch);
    renderStats();renderAchievements();refreshLauncher();setStatus("Content-Fortschritt auf 100 % gesetzt.","ok");
  }catch(e){setStatus("Inhaltsdaten konnten nicht geladen werden.","error");}
}
function clearContentProgress(){
  var info=currentScopeInfo();
  if(!window.confirm("Content-Fortschritt für "+info.label+" leeren?"))return;
  store.devPatchStats(info.scope,info.profileId,{circaQids:[],classicWids:[],whoamiTermIds:[],charadesTermIds:[],personalQids:[],categories:[]});
  renderStats();renderAchievements();refreshLauncher();setStatus("Content-Fortschritt geleert.","ok");
}
function renderUsage(){
  var usage=store.getUsageStats(),games=usage.games||{};
  byId("launcherDevUsageApp").value=(usage.appMs/60000).toFixed(1).replace(/\.0$/,"");
  Object.keys(GAME_LABELS).forEach(function(game){
    byId("launcherDevUsage"+game[0].toUpperCase()+game.slice(1)).value=((games[game]||0)/60000).toFixed(1).replace(/\.0$/,"");
  });
}
function saveUsage(){
  var games={};
  Object.keys(GAME_LABELS).forEach(function(game){
    var id="launcherDevUsage"+game[0].toUpperCase()+game.slice(1);
    games[game]=Math.max(0,Number(String(byId(id).value).replace(",","."))||0)*60000;
  });
  var appMs=Math.max(0,Number(String(byId("launcherDevUsageApp").value).replace(",","."))||0)*60000;
  store.devSetUsage({appMs:appMs,games:games});
  if(store.trackUsage)store.trackUsage(null);
  renderUsage();renderOverview();refreshLauncher();setStatus("Spielzeit gespeichert.","ok");
}
function currentAchievementContext(){
  var info=currentScopeInfo();
  return info.scope==="profile"
    ?{profileId:info.profileId,label:info.label,items:store.getProfileAchievements(info.profileId)}
    :{profileId:null,label:"Gesamt",items:store.getAchievements()};
}
function renderAchievements(){
  var ctx=currentAchievementContext(),box=byId("launcherDevAchievements");
  byId("launcherDevAchievementHint").textContent=ctx.profileId?"Profil: "+ctx.label:"Geräteweite Achievements";
  box.textContent="";
  ctx.items.forEach(function(a){
    var row=document.createElement("div");row.className="launcherDevAchievement";
    var info=document.createElement("div");info.className="launcherDevAchievementInfo";
    var title=document.createElement("strong");title.textContent=a.icon+" "+a.title;
    var sub=document.createElement("span");sub.textContent=(a.unlocked?"Freigeschaltet":"Gesperrt")+" · "+a.progress;
    info.append(title,sub);
    var controls=document.createElement("div");controls.className="launcherDevAchievementControls";
    [["true","Frei"],["false","Sperren"],["auto","Auto"]].forEach(function(item){
      var button=document.createElement("button");button.type="button";button.textContent=item[1];
      button.dataset.achievementId=a.id;button.dataset.achievementValue=item[0];
      var active=(item[0]==="true"&&a.devOverride===true)||(item[0]==="false"&&a.devOverride===false)||(item[0]==="auto"&&a.devOverride===null);
      if(active)button.classList.add("active");
      controls.appendChild(button);
    });
    row.append(info,controls);box.appendChild(row);
  });
}
function setAchievement(id,value){
  var ctx=currentAchievementContext();
  var parsed=value==="true"?true:value==="false"?false:null;
  store.devSetAchievementOverride(id,parsed,ctx.profileId);
  renderAchievements();refreshLauncher();setStatus("Achievement-Status geändert.","ok");
}
function setAllAchievements(value){
  var ctx=currentAchievementContext();
  ctx.items.forEach(function(a){store.devSetAchievementOverride(a.id,value,ctx.profileId);});
  renderAchievements();refreshLauncher();setStatus(value===true?"Alle Achievements freigegeben.":value===false?"Alle Achievements gesperrt.":"Achievement-Overrides entfernt.","ok");
}
function renderSessions(){
  var sessions=store.getSessions(),box=byId("launcherDevSessions");
  box.textContent="";
  sessions.slice(0,12).forEach(function(session){
    var row=document.createElement("div");row.className="launcherDevSessionRow";
    var info=document.createElement("div");
    var strong=document.createElement("strong");strong.textContent=(session.endedAt?"Beendet":"Aktiv")+" · "+((session.rounds||[]).length)+" Runden";
    var span=document.createElement("span");span.textContent=(session.lastGame||"–")+" · "+(session.profileIds||[]).length+" Spieler";
    info.append(strong,span);
    var del=document.createElement("button");del.type="button";del.textContent="Löschen";del.dataset.sessionId=session.id;
    row.append(info,del);box.appendChild(row);
  });
  if(!sessions.length){
    var empty=document.createElement("div");empty.className="launcherDevEmpty";empty.textContent="Keine Sessions gespeichert.";box.appendChild(empty);
  }
}
function endActiveSession(){
  var active=store.getActiveSession();if(!active)return;
  store.endSession();renderSessions();renderOverview();renderAchievements();refreshLauncher();setStatus("Aktive Session beendet.","ok");
}
function clearSessions(){
  if(!window.confirm("Alle Sessions löschen? Statistiken bleiben unverändert."))return;
  store.devClearSessions();renderSessions();renderOverview();renderAchievements();refreshLauncher();setStatus("Sessions gelöscht.","ok");
}
async function copySnapshot(){
  var text=JSON.stringify(store.snapshot(),null,2);
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(text);
    else{
      var area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();
      document.execCommand("copy");area.remove();
    }
    setStatus("App-State in die Zwischenablage kopiert.","ok");
  }catch(e){setStatus("Kopieren ist auf diesem Gerät nicht verfügbar.","error");}
}
function renderPanel(){
  renderScope();renderOverview();renderStats();renderUsage();renderAchievements();renderSessions();
}
function lockDev(){
  setDiagUnlocked(false);closePanel();setStatus("","");
}
function deleteSession(id){
  if(!window.confirm("Diese Session löschen? Statistiken bleiben unverändert."))return;
  store.devDeleteSession(id);renderSessions();renderOverview();refreshLauncher();setStatus("Session gelöscht.","ok");
}

byId("launcherDevTrigger").addEventListener("click",handleTrigger);
byId("launcherDevOpen").addEventListener("click",openPanel);
byId("launcherDevGateClose").addEventListener("click",closeGate);
byId("launcherDevGateCancel").addEventListener("click",closeGate);
byId("launcherDevGateSubmit").addEventListener("click",submitGate);
byId("launcherDevPin").addEventListener("keydown",function(event){if(event.key==="Enter"){submitGate();event.preventDefault();}});
byId("launcherDevPanelClose").addEventListener("click",closePanel);
byId("launcherDevRefresh").addEventListener("click",function(){renderPanel();setStatus("DEV-Ansicht aktualisiert.","ok");});
byId("launcherDevLock").addEventListener("click",lockDev);
byId("launcherDevScope").addEventListener("change",function(){selectedScope=this.value;renderStats();renderAchievements();});
byId("launcherDevSaveStats").addEventListener("click",saveQuickStats);
byId("launcherDevSaveJson").addEventListener("click",saveRawStats);
byId("launcherDevResetStats").addEventListener("click",resetStats);
byId("launcherDevFillProgress").addEventListener("click",fillContentProgress);
byId("launcherDevClearProgress").addEventListener("click",clearContentProgress);
byId("launcherDevSaveUsage").addEventListener("click",saveUsage);
byId("launcherDevAchievements").addEventListener("click",function(event){
  var button=event.target.closest("[data-achievement-id]");if(!button)return;
  setAchievement(button.dataset.achievementId,button.dataset.achievementValue);
});
byId("launcherDevUnlockAll").addEventListener("click",function(){setAllAchievements(true);});
byId("launcherDevLockAll").addEventListener("click",function(){setAllAchievements(false);});
byId("launcherDevAutoAll").addEventListener("click",function(){setAllAchievements(null);});
byId("launcherDevEndSession").addEventListener("click",endActiveSession);
byId("launcherDevClearSessions").addEventListener("click",clearSessions);
byId("launcherDevSessions").addEventListener("click",function(event){
  var button=event.target.closest("[data-session-id]");if(button)deleteSession(button.dataset.sessionId);
});
byId("launcherDevCopyState").addEventListener("click",copySnapshot);
byId("launcherDevGateOverlay").addEventListener("click",function(event){if(event.target===this)closeGate();});
byId("launcherDevPanelOverlay").addEventListener("click",function(event){if(event.target===this)closePanel();});
document.addEventListener("keydown",function(event){
  if(event.key!=="Escape")return;
  if(!byId("launcherDevGateOverlay").classList.contains("hidden"))closeGate();
  else if(!byId("launcherDevPanelOverlay").classList.contains("hidden"))closePanel();
});

syncVisibility();
})();
