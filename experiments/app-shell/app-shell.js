(function(){
"use strict";

var store=window.CIAppState;
if(!store)return;

var selectedAvatar="😎";
var selectedPreset=null;
var selectedSession=null;
var statsScope="profile";

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
function fmtDuration(start,end){
  var a=new Date(start).getTime(),b=end?new Date(end).getTime():Date.now();
  if(!isFinite(a)||!isFinite(b)||b<a)return "–";
  var min=Math.max(0,Math.round((b-a)/60000));
  if(min<60)return min+" Min.";
  var h=Math.floor(min/60),m=min%60;
  return h+" Std."+(m?" "+m+" Min.":"");
}
function sessionGame(session){
  if(session&&session.lastGame)return session.lastGame;
  var rounds=session&&Array.isArray(session.rounds)?session.rounds:[];
  return rounds.length&&rounds[rounds.length-1].game==="classic"?"classic":"circa";
}
function activeProfilesInSession(session){
  var ids=session&&Array.isArray(session.profileIds)?session.profileIds:[];
  return ids.filter(function(id){var p=store.getProfileById?store.getProfileById(id):null;return p&&!p.deletedAt;});
}
function launchSessionGroup(session){
  if(!session||!store.setLaunchGroup)return false;
  var ids=activeProfilesInSession(session);
  if(ids.length<3)return false;
  store.setLaunchGroup(ids);
  var game=sessionGame(session);
  window.location.href=game==="classic"?"games/classic-imposter/":"games/circa-imposter/";
  return true;
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
  var p=store.getSelectedProfile?store.getSelectedProfile():store.getPrimaryProfile();
  byId("headerAvatar").textContent=p.avatar||"😎";
  byId("headerName").textContent=p.name||"Spieler";
  updateGreeting();
}
function renderPlayers(){
  var box=byId("playerList"),profiles=store.getProfiles(),selected=store.getSelectedProfile?store.getSelectedProfile():store.getPrimaryProfile();
  box.textContent="";
  profiles.forEach(function(p){
    var st=store.getProfileStats(p.id);
    var card=document.createElement("article");card.className="playerCard"+(p.id===selected.id?" selected":"");
    card.setAttribute("role","button");card.setAttribute("tabindex","0");
    card.setAttribute("aria-label",p.name+" auswählen");
    if(p.id===selected.id)card.setAttribute("aria-current","true");
    var av=document.createElement("div");av.className="playerAvatarBig";av.textContent=p.avatar||"😎";
    var info=document.createElement("div");info.className="playerInfo";
    var name=document.createElement("strong");name.textContent=p.name;
    var meta=document.createElement("span");meta.textContent=st.rounds+" Runden · "+st.impostor+"× Imposter · "+st.impostorEscapes+"× unentdeckt";
    info.appendChild(name);info.appendChild(meta);
    if(p.id===selected.id){var tag=document.createElement("span");tag.className="primaryTag";tag.textContent="AUSGEWÄHLT";info.appendChild(tag);}
    function selectProfile(){
      if(store.setSelectedProfile)store.setSelectedProfile(p.id);else store.setPrimaryProfile(p.id);
      renderAll();
    }
    card.addEventListener("click",selectProfile);
    card.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();selectProfile();}});
    var edit=document.createElement("button");edit.type="button";edit.className="playerEdit";edit.textContent="•••";edit.setAttribute("aria-label",p.name+" bearbeiten");
    edit.addEventListener("click",function(e){e.stopPropagation();openProfileEditor(p.id);});
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
  var profiles=store.getProfiles();
  var p=id?profiles.find(function(x){return x.id===id;}):null;
  byId("profileId").value=p?p.id:"";
  byId("profileSheetTitle").textContent=p?"Profil bearbeiten":"Spieler hinzufügen";
  byId("profileName").value=p?p.name:"";
  selectedAvatar=p?p.avatar:"😎";
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

  var c=(session.rounds||[]).filter(function(r){return r.game==="circa";}).length;
  var k=(session.rounds||[]).length-c;
  var meta=byId("sessionMeta");meta.textContent="";
  [
    {value:fmtDuration(session.startedAt,session.endedAt),label:"Dauer"},
    {value:(session.rounds||[]).length,label:(session.rounds||[]).length===1?"Runde":"Runden"},
    {value:c&&k?c+" / "+k:c?c+" Circa":k?k+" Classic":"–",label:c&&k?"Circa / Classic":"Spielmix"}
  ].forEach(function(item){
    var card=document.createElement("div");card.className="sessionMetaItem";
    var strong=document.createElement("strong");strong.textContent=item.value;
    var span=document.createElement("span");span.textContent=item.label;
    card.appendChild(strong);card.appendChild(span);meta.appendChild(card);
  });

  var playersBox=byId("sessionPlayers");playersBox.textContent="";
  (session.profileIds||[]).forEach(function(id){
    var p=store.getProfileById?store.getProfileById(id):null;
    var chip=document.createElement("div");chip.className="sessionPlayerChip";
    var avatar=document.createElement("span");avatar.textContent=p&&p.avatar?p.avatar:"👤";
    var name=document.createElement("strong");name.textContent=p&&p.name?p.name:"Ehemaliger Spieler";
    chip.appendChild(avatar);chip.appendChild(name);playersBox.appendChild(chip);
  });
  if(!(session.profileIds||[]).length){
    var emptyPlayers=document.createElement("div");emptyPlayers.className="emptyState";emptyPlayers.textContent="Für diese Session sind keine Spielerprofile gespeichert.";playersBox.appendChild(emptyPlayers);
  }

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

  var replay=byId("replaySession");
  var replayable=!!session.endedAt&&activeProfilesInSession(session).length>=3;
  replay.classList.toggle("hidden",!replayable);
  replay.textContent="Noch einmal mit dieser Gruppe · "+(sessionGame(session)==="classic"?"Classic":"Circa");
  replay.onclick=function(){launchSessionGroup(session);};

  byId("sessionNote").textContent=session.endedAt?"Abgeschlossene Session · Awards und Runden bleiben lokal gespeichert.":"Diese Session läuft noch. Beim Beenden werden die Awards berechnet.";
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
    byId("activeSessionTitle").textContent="Seit "+fmtTime(active.startedAt)+" · "+fmtDuration(active.startedAt,null);
    byId("activeSessionMain").textContent=active.rounds.length+" "+(active.rounds.length===1?"Runde":"Runden");
    var names=(active.profileIds||[]).map(profileName).slice(0,3);
    byId("activeSessionSub").textContent=(names.length?names.join(", "):active.profileIds.length+" Spieler")+(active.profileIds.length>3?" +"+(active.profileIds.length-3):"");
    var cont=byId("continueSession");
    cont.textContent="Session fortsetzen · "+(sessionGame(active)==="classic"?"Classic":"Circa");
    cont.disabled=activeProfilesInSession(active).length<3;
  }
  var sessions=store.getSessions().filter(function(s){return !!s.endedAt;});
  var last=sessions[0]||null;
  byId("lastSessionBlock").classList.toggle("hidden",!last);
  if(last){
    byId("lastSessionTitle").textContent=fmtDateTime(last.endedAt);
    byId("lastSessionMain").textContent=last.rounds.length+" "+(last.rounds.length===1?"Runde":"Runden")+" · "+last.profileIds.length+" Spieler";
    var c=last.rounds.filter(function(r){return r.game==="circa";}).length;
    var k=last.rounds.length-c;
    byId("lastSessionSub").textContent=fmtDuration(last.startedAt,last.endedAt)+" · "+c+"× Circa · "+k+"× Classic";
    byId("openLastSession").onclick=function(){renderSessionSheet(last);};
    byId("lastSessionCard").onclick=function(){renderSessionSheet(last);};
  }
}
function renderStats(){
  var selected=store.getSelectedProfile?store.getSelectedProfile():store.getPrimaryProfile();
  var personal=statsScope==="profile";
  var st=personal?store.getProfileStats(selected.id):store.getStats();

  byId("statsScopeProfile").textContent=selected.name;
  byId("statsScopeProfile").classList.toggle("active",personal);
  byId("statsScopeGlobal").classList.toggle("active",!personal);
  byId("statsScopeLabel").textContent=personal?selected.name+" gespielt":"Gesamt gespielt";
  byId("statsScopeSub").textContent=personal?"Runden dieses lokalen Profils":"Runden in diesem App-Shell-Test";

  byId("totalRounds").textContent=st.rounds||0;
  byId("circaRounds").textContent=st.circaRounds||0;
  byId("classicRounds").textContent=st.classicRounds||0;
  byId("perfectCount").textContent=personal?(st.perfect||0):(st.perfectEstimates||0);
  var cats=Array.isArray(st.categories)?st.categories:[];
  byId("categoryCount").textContent=cats.length+" / 10";
  var cq=Array.isArray(st.circaQids)?st.circaQids.length:0;
  var cw=Array.isArray(st.classicWids)?st.classicWids.length:0;
  byId("circaProgress").textContent=Math.round(cq/520*100)+"%";
  byId("classicProgress").textContent=Math.round(cw/250*100)+"%";
  byId("circaProgressSub").textContent=cq+" / 520 Circa";
  byId("classicProgressSub").textContent=cw+" / 250 Classic";

  var sessions=store.getSessions().filter(function(session){
    if(!session.endedAt)return false;
    return !personal||(session.profileIds||[]).indexOf(selected.id)!==-1;
  });
  byId("sessionHistoryTitle").textContent=personal?"Sessions mit "+selected.name:"Letzte Sessions";
  byId("sessionHistoryHint").textContent=sessions.length+" gespeichert";
  renderSessionHistory(sessions);

  byId("achievementHeading").textContent=personal?"Persönliche Sammlung":"Gesamte Sammlung";
  var achievementData=personal&&store.getProfileAchievements?store.getProfileAchievements(selected.id):store.getAchievements();
  var box=byId("achievementList");box.textContent="";
  achievementData.forEach(function(a){
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
  else{
    id=store.addProfile({name:name,avatar:selectedAvatar});
    if(store.setSelectedProfile)store.setSelectedProfile(id);else store.setPrimaryProfile(id);
  }
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
byId("continueSession").addEventListener("click",function(){var s=store.getActiveSession();if(s)launchSessionGroup(s);});
document.querySelectorAll("[data-stats-scope]").forEach(function(button){
  button.addEventListener("click",function(){statsScope=this.getAttribute("data-stats-scope")==="global"?"global":"profile";renderStats();});
});
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
    var backup=store.createBackup?store.createBackup():store.snapshot();
    var blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");a.href=url;a.download="imposter-app-shell-test.json";document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    byId("dataStatus").textContent="Testdaten wurden als JSON-Backup vorbereitet.";
  }catch(e){byId("dataStatus").textContent="Export ist auf diesem Gerät gerade nicht verfügbar.";}
});
byId("importData").addEventListener("click",function(){
  byId("importDataFile").value="";
  byId("importDataFile").click();
});
byId("importDataFile").addEventListener("change",function(){
  var input=this,file=input.files&&input.files[0];
  if(!file)return;
  if(file.size>2*1024*1024){
    byId("dataStatus").textContent="Import abgebrochen: Die JSON-Datei ist größer als 2 MB.";
    input.value="";return;
  }
  var reader=new FileReader();
  reader.onerror=function(){byId("dataStatus").textContent="Die Datei konnte nicht gelesen werden.";input.value="";};
  reader.onload=function(){
    var parsed=null;
    try{parsed=JSON.parse(String(reader.result||""));}catch(e){
      byId("dataStatus").textContent="Import abgebrochen: Keine gültige JSON-Datei.";input.value="";return;
    }
    if(!window.confirm("Dieses Backup ersetzt die aktuellen App-Shell-Testdaten. Produktive V72-Daten bleiben unangetastet. Fortfahren?")){input.value="";return;}
    var result=store.importSnapshot?store.importSnapshot(parsed):{ok:false,reason:"unsupported"};
    if(!result.ok){
      var reason=result.reason==="profiles"?"Keine gültigen Profile im Backup gefunden.":result.reason==="storage"?"Die importierten Daten konnten nicht lokal gespeichert werden.":result.reason==="version"?"Das Backup stammt aus einer neueren, hier noch nicht unterstützten Backup-Version.":result.reason==="format"?"Die Datei ist kein Imposter-App-Backup.":"Das Backup passt nicht zum App-Shell-Test.";
      byId("dataStatus").textContent="Import abgebrochen: "+reason;
      input.value="";return;
    }
    closeSheets();renderAll();
    byId("dataStatus").textContent="Backup importiert: "+result.profiles+" Profile · "+result.sessions+" Sessions · "+result.rounds+" Runden.";
    input.value="";
  };
  reader.readAsText(file);
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
