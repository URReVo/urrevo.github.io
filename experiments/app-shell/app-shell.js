(function(){
"use strict";

var store=window.CIAppState;
if(!store)return;

var selectedAvatar="😎";
var selectedPreset=null;
var selectedSession=null;

function byId(id){return document.getElementById(id);}
function fmtDate(iso){
  try{return new Date(iso).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"});}catch(e){return "–";}
}
function fmtTime(iso){
  try{return new Date(iso).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});}catch(e){return "–";}
}
function fmtDateTime(iso){
  if(!iso)return "–";
  return fmtDate(iso)+" · "+fmtTime(iso);
}
function updateGreeting(){
  var hour=new Date().getHours();
  byId("greeting").textContent=hour<11?"Guten Morgen":hour<18?"Hallo":"Guten Abend";
}
function setView(name){
  document.querySelectorAll(".view").forEach(function(view){view.classList.toggle("active",view.id==="view-"+name);});
  document.querySelectorAll(".tab").forEach(function(tab){tab.classList.toggle("active",tab.getAttribute("data-view")===name);});
  renderAll();
  window.scrollTo({top:0,behavior:store.getPreferences().animations===false?"auto":"smooth"});
}
function openSheet(id){
  byId("sheetBackdrop").classList.remove("hidden");
  byId("sheetBackdrop").setAttribute("aria-hidden","false");
  byId(id).classList.remove("hidden");
}
function closeSheets(){
  byId("sheetBackdrop").classList.add("hidden");
  byId("sheetBackdrop").setAttribute("aria-hidden","true");
  document.querySelectorAll(".bottomSheet").forEach(function(sheet){sheet.classList.add("hidden");});
}
function profileName(id){
  var p=store.getProfileById?store.getProfileById(id):store.getProfiles().find(function(x){return x.id===id;});
  return p?p.name:"Ehemaliger Spieler";
}
function renderHeader(){
  var p=store.getPrimaryProfile();
  byId("headerAvatar").textContent=p.avatar||"😎";
  byId("headerName").textContent=p.name||"Spieler";
  updateGreeting();
}
function renderPlayers(){
  var box=byId("playerList"),profiles=store.getProfiles(),primary=store.getPrimaryProfile();
  box.textContent="";
  profiles.forEach(function(p){
    var st=store.getProfileStats(p.id);
    var card=document.createElement("article");card.className="playerCard";
    var av=document.createElement("div");av.className="playerAvatarBig";av.textContent=p.avatar||"😎";
    var info=document.createElement("div");info.className="playerInfo";
    var name=document.createElement("strong");name.textContent=p.name;
    var meta=document.createElement("span");meta.textContent=st.rounds+" Runden · "+st.impostor+"× Imposter · "+st.impostorEscapes+"× unentdeckt";
    info.appendChild(name);info.appendChild(meta);
    if(p.id===primary.id){var tag=document.createElement("span");tag.className="primaryTag";tag.textContent="HAUPTPROFIL";info.appendChild(tag);}
    var edit=document.createElement("button");edit.type="button";edit.className="playerEdit";edit.textContent="•••";edit.setAttribute("aria-label",p.name+" bearbeiten");
    edit.addEventListener("click",function(){openProfileEditor(p.id);});
    card.appendChild(av);card.appendChild(info);card.appendChild(edit);box.appendChild(card);
  });
}
function renderAvatars(){
  var grid=byId("avatarGrid");grid.textContent="";
  store.avatars.forEach(function(avatar){
    var b=document.createElement("button");b.type="button";b.className="avatarChoice"+(avatar===selectedAvatar?" selected":"");b.textContent=avatar;
    b.addEventListener("click",function(){selectedAvatar=avatar;renderAvatars();});
    grid.appendChild(b);
  });
}
function openProfileEditor(id){
  var profiles=store.getProfiles(),primary=store.getPrimaryProfile();
  var p=id?profiles.find(function(x){return x.id===id;}):null;
  byId("profileId").value=p?p.id:"";
  byId("profileSheetTitle").textContent=p?"Profil bearbeiten":"Spieler hinzufügen";
  byId("profileName").value=p?p.name:"";
  selectedAvatar=p?p.avatar:"😎";
  byId("makePrimary").checked=!!(p&&p.id===primary.id);
  byId("deleteProfile").classList.toggle("hidden",!p||profiles.length<=1);
  renderAvatars();openSheet("profileSheet");
}
function renderPresets(){
  var box=byId("presetScroller");box.textContent="";
  store.getPresets().forEach(function(p){
    var b=document.createElement("button");b.type="button";b.className="presetCard";
    var icon=document.createElement("span");icon.className="presetEmoji";icon.textContent=p.icon||"⭐️";
    var name=document.createElement("strong");name.textContent=p.name;
    var small=document.createElement("small");small.textContent=p.summary||"Schnellstart";
    b.appendChild(icon);b.appendChild(name);b.appendChild(small);
    b.addEventListener("click",function(){openPreset(p);});box.appendChild(b);
  });
}
function openPreset(p){
  selectedPreset=p;
  byId("presetTitle").textContent=p.name;
  byId("presetGame").textContent=p.game==="classic"?"Klassisches Imposter":"Circa Imposter";
  byId("presetDetail").textContent=p.summary||"";
  byId("deletePreset").classList.toggle("hidden",!!p.builtIn);
  openSheet("presetSheet");
}
function renderPresetEditorMode(){
  var classic=byId("presetGameInput").value==="classic";
  byId("circaPresetFields").classList.toggle("hidden",classic);
  byId("classicPresetFields").classList.toggle("hidden",!classic);
}
function openPresetEditor(){
  byId("presetNameInput").value="";
  byId("presetGameInput").value="circa";
  byId("presetPlayersInput").value="4";
  byId("presetCategoryInput").value="Alle";
  byId("presetDifficultyInput").value="mittel";
  byId("presetHintInput").checked=true;
  byId("presetTimerInput").value="180";
  renderPresetEditorMode();openSheet("presetEditorSheet");
}
function sessionRoundLabel(r){
  if(r.game==="circa"){
    var circa=(r.category||"Circa")+(r.difficulty?" · "+r.difficulty:"");
    return circa+(r.qid?" · "+r.qid:"");
  }
  var classic=r.category||"Classic";
  if(r.word)classic+=" · "+r.word;
  return classic+(r.wid?" · "+r.wid:"");
}
function renderSessionSheet(session){
  if(!session)return;
  selectedSession=session;
  byId("sessionSheetTitle").textContent=(session.endedAt?"Session · ":"Aktuelle Session · ")+fmtDateTime(session.startedAt);
  var awards=byId("sessionAwards");awards.textContent="";
  var list=session.awards||[];
  if(!list.length){
    var empty=document.createElement("div");empty.style.gridColumn="1/-1";empty.className="prototypeNote";empty.textContent=session.endedAt?"Noch keine Awards in dieser Session.":"Awards werden beim Beenden der Session berechnet.";awards.appendChild(empty);
  }else{
    list.forEach(function(a){
      var card=document.createElement("div");
      var icon=document.createElement("span");icon.textContent=a.icon||"🏆";
      var name=document.createElement("strong");name.textContent=profileName(a.profileId);
      var detail=document.createElement("small");detail.textContent=a.title+" · "+a.detail;
      card.appendChild(icon);card.appendChild(name);card.appendChild(detail);awards.appendChild(card);
    });
  }
  var rounds=byId("roundHistory");rounds.textContent="";
  (session.rounds||[]).forEach(function(r,i){
    var row=document.createElement("div");
    var nr=document.createElement("span");nr.textContent="R"+(i+1);
    var game=document.createElement("strong");game.textContent=r.game==="circa"?"Circa":"Classic";
    var detail=document.createElement("small");detail.textContent=sessionRoundLabel(r);
    row.appendChild(nr);row.appendChild(game);row.appendChild(detail);rounds.appendChild(row);
  });
  if(!(session.rounds||[]).length){
    var emptyRound=document.createElement("div");emptyRound.innerHTML="<span>–</span><strong>Noch keine Runde</strong><small>Starte ein Testspiel</small>";rounds.appendChild(emptyRound);
  }
  byId("sessionNote").textContent=session.endedAt?"Diese Zusammenfassung stammt aus echten Runden innerhalb des App-Shell-Tests.":"Diese Session läuft noch. Beim Beenden werden die Awards berechnet.";
  openSheet("sessionSheet");
}
function renderSessionHistory(sessions){
  var box=byId("sessionHistoryList");box.textContent="";
  if(!sessions.length){
    var empty=document.createElement("div");empty.className="emptyState";empty.textContent="Noch keine abgeschlossene Test-Session. Beendete Sessions erscheinen hier automatisch.";box.appendChild(empty);return;
  }
  sessions.slice(0,10).forEach(function(session){
    var c=session.rounds.filter(function(r){return r.game==="circa";}).length;
    var k=session.rounds.length-c;
    var b=document.createElement("button");b.type="button";b.className="historySession";
    var icon=document.createElement("span");icon.className="historySessionIcon";icon.textContent=c&&k?"🎲":c?"🎯":"🎭";
    var main=document.createElement("span");main.className="historySessionMain";
    var title=document.createElement("strong");title.textContent=fmtDateTime(session.endedAt||session.startedAt);
    var detail=document.createElement("span");detail.textContent=c+"× Circa · "+k+"× Classic · "+session.profileIds.length+" Spieler";
    main.appendChild(title);main.appendChild(detail);
    var meta=document.createElement("span");meta.className="historySessionMeta";
    var rounds=document.createElement("strong");rounds.textContent=session.rounds.length+" "+(session.rounds.length===1?"Runde":"Runden");
    var awards=document.createElement("small");awards.textContent=(session.awards||[]).length+" Awards";
    meta.appendChild(rounds);meta.appendChild(awards);
    b.appendChild(icon);b.appendChild(main);b.appendChild(meta);
    b.addEventListener("click",function(){renderSessionSheet(session);});
    box.appendChild(b);
  });
}
function renderSessions(){
  var active=store.getActiveSession();
  byId("activeSessionBlock").classList.toggle("hidden",!active);
  byId("sessionStatusPill").textContent=active?"Session läuft · "+active.rounds.length+" Runden":"Keine Session aktiv";
  if(active){
    byId("activeSessionTitle").textContent="Seit "+fmtTime(active.startedAt);
    byId("activeSessionMain").textContent=active.rounds.length+" "+(active.rounds.length===1?"Runde":"Runden");
    byId("activeSessionSub").textContent=active.profileIds.length+" Spieler · "+(active.rounds.length?"Statistik wird live geführt":"noch keine Runde abgeschlossen");
  }
  var sessions=store.getSessions().filter(function(s){return !!s.endedAt;});
  renderSessionHistory(sessions);
  var last=sessions[0]||null;
  byId("lastSessionBlock").classList.toggle("hidden",!last);
  if(last){
    byId("lastSessionTitle").textContent=fmtDateTime(last.endedAt);
    byId("lastSessionMain").textContent=last.rounds.length+" "+(last.rounds.length===1?"Runde":"Runden")+" · "+last.profileIds.length+" Spieler";
    var c=last.rounds.filter(function(r){return r.game==="circa";}).length;
    var k=last.rounds.length-c;
    byId("lastSessionSub").textContent=c+"× Circa · "+k+"× Classic";
    byId("openLastSession").onclick=function(){renderSessionSheet(last);};
    byId("lastSessionCard").onclick=function(){renderSessionSheet(last);};
  }
}
function renderStats(){
  var st=store.getStats();
  byId("totalRounds").textContent=st.rounds;
  byId("circaRounds").textContent=st.circaRounds;
  byId("classicRounds").textContent=st.classicRounds;
  byId("perfectCount").textContent=st.perfectEstimates;
  byId("categoryCount").textContent=st.categories.length+" / 10";
  var cq=st.circaQids.length,cw=st.classicWids.length;
  byId("circaProgress").textContent=Math.round(cq/520*100)+"%";
  byId("classicProgress").textContent=Math.round(cw/250*100)+"%";
  byId("circaProgressSub").textContent=cq+" / 520 Circa";
  byId("classicProgressSub").textContent=cw+" / 250 Classic";

  var box=byId("achievementList");box.textContent="";
  store.getAchievements().forEach(function(a){
    var card=document.createElement("article");card.className="achievement"+(a.unlocked?" unlocked":"");
    var icon=document.createElement("span");icon.className="achievementIcon";icon.textContent=a.icon;
    var text=document.createElement("div");
    var title=document.createElement("strong");title.textContent=a.title;
    var sub=document.createElement("span");sub.textContent=a.text;
    text.appendChild(title);text.appendChild(sub);
    var state=document.createElement("span");state.className=a.unlocked?"achievementState":"achievementProgress";state.textContent=a.unlocked?"✓":a.progress;
    card.appendChild(icon);card.appendChild(text);card.appendChild(state);box.appendChild(card);
  });
}
function renderSettings(){
  var p=store.getPreferences();
  byId("settingSound").checked=p.sound!==false;
  byId("settingHaptics").checked=p.haptics!==false;
  byId("settingAnimations").checked=p.animations!==false;
  document.documentElement.classList.toggle("reduceExperimentMotion",p.animations===false);
}
function renderAll(){
  renderHeader();renderPlayers();renderPresets();renderSessions();renderStats();renderSettings();
}

for(var i=3;i<=12;i++){
  var opt=document.createElement("option");opt.value=String(i);opt.textContent=String(i);byId("presetPlayersInput").appendChild(opt);
}

document.querySelectorAll(".tab").forEach(function(tab){tab.addEventListener("click",function(){setView(tab.getAttribute("data-view"));});});
byId("profileButton").addEventListener("click",function(){setView("profile");});
byId("settingsShortcut").addEventListener("click",function(){setView("settings");});
byId("addPlayer").addEventListener("click",function(){openProfileEditor(null);});
byId("addPreset").addEventListener("click",openPresetEditor);
byId("presetGameInput").addEventListener("change",renderPresetEditorMode);

byId("saveProfile").addEventListener("click",function(){
  var id=byId("profileId").value;
  var name=byId("profileName").value.trim();
  if(!name){byId("profileName").focus();return;}
  if(id)store.updateProfile(id,{name:name,avatar:selectedAvatar});
  else id=store.addProfile({name:name,avatar:selectedAvatar});
  if(byId("makePrimary").checked)store.setPrimaryProfile(id);
  closeSheets();renderAll();
});
byId("deleteProfile").addEventListener("click",function(){
  var id=byId("profileId").value;if(!id)return;
  if(!window.confirm("Dieses Testprofil löschen? Bereits aggregierte Teststatistik bleibt intern erhalten, wird aber nicht mehr als Profil angezeigt."))return;
  store.deleteProfile(id);closeSheets();renderAll();
});

byId("savePreset").addEventListener("click",function(){
  var game=byId("presetGameInput").value;
  store.savePreset({
    name:byId("presetNameInput").value||"Eigenes Preset",
    icon:"⭐️",
    game:game,
    playerCount:Number(byId("presetPlayersInput").value),
    categories:[game==="classic"?"Alle":byId("presetCategoryInput").value],
    difficulty:byId("presetDifficultyInput").value,
    hint:byId("presetHintInput").checked,
    timer:Number(byId("presetTimerInput").value)
  });
  closeSheets();renderAll();
});
byId("presetOpenGame").addEventListener("click",function(){
  if(!selectedPreset)return;
  store.setLaunchPreset(selectedPreset);
  window.location.href=selectedPreset.game==="classic"?"games/classic-imposter/":"games/circa-imposter/";
});
byId("deletePreset").addEventListener("click",function(){
  if(!selectedPreset||selectedPreset.builtIn)return;
  store.deletePreset(selectedPreset.id);closeSheets();renderAll();
});

byId("activeSessionCard").addEventListener("click",function(){var s=store.getActiveSession();if(s)renderSessionSheet(s);});
byId("endSession").addEventListener("click",function(){
  var s=store.getActiveSession();if(!s)return;
  if(!s.rounds.length&&!window.confirm("Die Session enthält noch keine abgeschlossene Runde. Trotzdem beenden?"))return;
  var ended=store.endSession();renderAll();if(ended)renderSessionSheet(ended);
});

["Sound","Haptics","Animations"].forEach(function(name){
  byId("setting"+name).addEventListener("change",function(){
    store.setPreference(name.toLowerCase(),byId("setting"+name).checked);renderSettings();
  });
});

byId("importLegacy").addEventListener("click",function(){
  var result=store.importLegacyCirca();
  if(!result.ok&&result.reason==="empty"){
    byId("dataStatus").textContent="Keine produktiven V72-Circa-Daten auf diesem Gerät gefunden.";
    return;
  }
  if(!result.ok&&result.reason==="already"){
    byId("dataStatus").textContent="V72-Daten sind bereits aktuell übernommen: "+result.players+" Spieler · "+result.rounds+" Runden · "+result.questions+" Fragepaare.";
    return;
  }
  byId("dataStatus").textContent=(result.updated?"V72-Daten aktualisiert: ":"V72-Daten übernommen: ")+result.players+" Spieler · "+result.rounds+" Runden · "+result.questions+" Fragepaare.";
  renderAll();
});
byId("exportData").addEventListener("click",function(){
  try{
    var blob=new Blob([JSON.stringify(store.snapshot(),null,2)],{type:"application/json"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");a.href=url;a.download="imposter-app-shell-test.json";document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    byId("dataStatus").textContent="Teststatistik wurde als JSON vorbereitet.";
  }catch(e){byId("dataStatus").textContent="Export ist auf diesem Gerät gerade nicht verfügbar.";}
});
byId("resetExperiment").addEventListener("click",function(){
  if(!window.confirm("Wirklich alle App-Shell-Testdaten löschen? Die produktive V72 bleibt vollständig unangetastet."))return;
  store.reset();byId("dataStatus").textContent="Testdaten wurden zurückgesetzt.";closeSheets();setView("home");renderAll();
});

document.querySelectorAll(".closeSheet").forEach(function(b){b.addEventListener("click",closeSheets);});
byId("sheetBackdrop").addEventListener("click",closeSheets);
window.addEventListener("pageshow",renderAll);
document.addEventListener("visibilitychange",function(){if(!document.hidden)renderAll();});

renderAll();
})();
