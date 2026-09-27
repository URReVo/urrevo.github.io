(function(){
"use strict";

var store=window.CIAppState;
if(!store)return;

var selectedAvatar="😎";
var selectedPreset=null;
var selectedSession=null;
var statsScope="profile";
var launcherAudioCtx=null;
var circaMetadataItems=null;
var circaMetadataPromise=null;
var GAME_META={
  circa:{title:"Circa",full:"Circa Imposter",icon:"🎯",path:"games/circa-imposter/",min:3},
  classic:{title:"Classic",full:"Klassisches Imposter",icon:"🎭",path:"games/classic-imposter/",min:3},
  whoami:{title:"Wer bin ich?",full:"Wer bin ich?",icon:"❓",path:"games/who-am-i/",min:2},
  charades:{title:"Scharade",full:"Scharade",icon:"🎬",path:"games/charades/",min:2},
  personal:{title:"Persönlich",full:"Persönlicher Impostor",icon:"💬",path:"games/personal-impostor/",min:3}
};
function gameMeta(game){return GAME_META[game]||GAME_META.circa;}

function byId(id){return document.getElementById(id);}
function launcherSoundEnabled(){
  return !store.getPreferences||store.getPreferences().sound!==false;
}
function launcherAudio(){
  if(!launcherSoundEnabled())return null;
  try{
    var Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return null;
    if(!launcherAudioCtx||launcherAudioCtx.state==="closed")launcherAudioCtx=new Ctx();
    if(launcherAudioCtx.state==="suspended")launcherAudioCtx.resume().catch(function(){});
    return launcherAudioCtx;
  }catch(e){return null;}
}
function launcherTone(freq,duration,gain,type,delay){
  var ctx=launcherAudio();if(!ctx)return;
  try{
    var osc=ctx.createOscillator(),amp=ctx.createGain(),start=ctx.currentTime+(delay||0),end=start+(duration||0.04);
    osc.type=type||"sine";osc.frequency.setValueAtTime(freq,start);
    amp.gain.setValueAtTime(0.0001,start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002,gain||0.012),start+0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001,end);
    osc.connect(amp);amp.connect(ctx.destination);osc.start(start);osc.stop(end+0.01);
  }catch(e){}
}
function uiSound(kind){
  if(!launcherSoundEnabled())return;
  if(kind==="start"){
    launcherTone(330,0.055,0.014,"sine",0);
    launcherTone(510,0.07,0.016,"sine",0.045);
  }else if(kind==="confirm"){
    launcherTone(500,0.045,0.011,"sine",0);
    launcherTone(690,0.065,0.013,"sine",0.035);
  }else if(kind==="success"){
    launcherTone(520,0.04,0.010,"sine",0);
    launcherTone(680,0.05,0.011,"sine",0.035);
    launcherTone(840,0.07,0.012,"sine",0.075);
  }else if(kind==="end"){
    launcherTone(620,0.045,0.010,"sine",0);
    launcherTone(430,0.07,0.012,"sine",0.04);
  }else if(kind==="select"){
    launcherTone(540,0.04,0.010,"sine",0);
    launcherTone(650,0.045,0.010,"sine",0.025);
  }else{
    launcherTone(430,0.032,0.008,"sine",0);
  }
}
function navigateWithSound(href){
  uiSound("start");
  setTimeout(function(){window.location.href=href;},55);
}
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
  if(session&&GAME_META[session.lastGame])return session.lastGame;
  var rounds=session&&Array.isArray(session.rounds)?session.rounds:[];
  var last=rounds.length?rounds[rounds.length-1].game:null;
  return GAME_META[last]?last:"circa";
}
function gameCounts(session){
  var counts={circa:0,classic:0,whoami:0,charades:0,personal:0};
  (session&&session.rounds||[]).forEach(function(r){if(Object.prototype.hasOwnProperty.call(counts,r.game))counts[r.game]++;});
  return counts;
}
function gameMixText(session){
  var counts=gameCounts(session),parts=[];
  Object.keys(counts).forEach(function(game){if(counts[game])parts.push(counts[game]+"× "+gameMeta(game).title);});
  return parts.length?parts.join(" · "):"Noch keine Runde";
}
function sessionLaunchProfileIds(session){
  if(!session)return [];
  var ids=Array.isArray(session.lastProfileIds)?session.lastProfileIds.slice():[];
  if(!ids.length&&Array.isArray(session.rounds)&&session.rounds.length){
    var last=session.rounds[session.rounds.length-1];
    (last.players||[]).forEach(function(p){
      if(p&&p.profileId&&ids.indexOf(p.profileId)===-1)ids.push(p.profileId);
    });
  }
  if(!ids.length&&Array.isArray(session.profileIds))ids=session.profileIds.slice();
  return ids;
}
function activeProfilesForLaunch(session){
  return sessionLaunchProfileIds(session).filter(function(id){
    var p=store.getProfileById?store.getProfileById(id):null;
    return p&&!p.deletedAt;
  });
}
function launchSessionGroup(session){
  if(!session||!store.setLaunchGroup)return false;
  var ids=activeProfilesForLaunch(session);
  var game=sessionGame(session),meta=gameMeta(game);
  if(ids.length<meta.min)return false;
  store.setLaunchGroup(ids);
  navigateWithSound(meta.path);
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
      var selectedNow=store.getSelectedProfile?store.getSelectedProfile():store.getPrimaryProfile();
      if(selectedNow&&selectedNow.id===p.id)return;
      if(store.setSelectedProfile)store.setSelectedProfile(p.id);else store.setPrimaryProfile(p.id);
      uiSound("select");renderAll();
    }
    card.addEventListener("click",selectProfile);
    card.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();selectProfile();}});
    var edit=document.createElement("button");edit.type="button";edit.className="playerEdit";edit.textContent="•••";edit.setAttribute("aria-label",p.name+" bearbeiten");
    edit.addEventListener("click",function(e){e.stopPropagation();uiSound("tap");openProfileEditor(p.id);});
    card.appendChild(av);card.appendChild(info);card.appendChild(edit);box.appendChild(card);
  });
}
function renderAvatars(){
  var grid=byId("avatarGrid");grid.textContent="";
  store.avatars.forEach(function(avatar){
    var b=document.createElement("button");b.type="button";b.className="avatarChoice"+(avatar===selectedAvatar?" selected":"");b.textContent=avatar;
    b.addEventListener("click",function(){selectedAvatar=avatar;uiSound("tap");renderAvatars();});
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
    b.addEventListener("click",function(){uiSound("tap");openPreset(p);});box.appendChild(b);
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
  if(r.game==="classic"){
    var classic=r.category||"Classic";
    if(r.word)classic+=" · "+r.word;
    return classic+(r.wid?" · "+r.wid:"");
  }
  if(r.game==="whoami")return (r.category||"Alle")+" · "+((r.players||[]).length)+" Begriffe";
  if(r.game==="charades"){
    var correct=0,skipped=0;(r.players||[]).forEach(function(p){correct+=Number(p.correct)||0;skipped+=Number(p.skipped)||0;});
    return correct+" richtig · "+skipped+" übersprungen";
  }
  if(r.game==="personal")return "Fragepaar "+(r.qid||"");
  return gameMeta(r.game).title;
}
function renderSessionSheet(session){
  if(!session)return;
  selectedSession=session;
  byId("sessionSheetTitle").textContent=(session.endedAt?"Session · ":"Aktuelle Session · ")+fmtDateTime(session.startedAt);

  var meta=byId("sessionMeta");meta.textContent="";
  var gamesUsed=Object.values(gameCounts(session)).filter(function(n){return n>0;}).length;
  [
    {value:fmtDuration(session.startedAt,session.endedAt),label:"Session-Dauer"},
    {value:(session.rounds||[]).length,label:(session.rounds||[]).length===1?"Runde":"Runden"},
    {value:gamesUsed||"–",label:gamesUsed===1?"Spielmodus":"Spielmodi"}
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
    var game=document.createElement("strong");game.textContent=gameMeta(r.game).title;
    var detail=document.createElement("small");detail.textContent=sessionRoundLabel(r);
    row.appendChild(nr);row.appendChild(game);row.appendChild(detail);rounds.appendChild(row);
  });
  if(!(session.rounds||[]).length){
    var emptyRound=document.createElement("div");emptyRound.innerHTML="<span>–</span><strong>Noch keine Runde</strong><small>Starte ein Spiel</small>";rounds.appendChild(emptyRound);
  }

  var replay=byId("replaySession");
  var replayable=!!session.endedAt&&activeProfilesForLaunch(session).length>=3;
  replay.classList.toggle("hidden",!replayable);
  replay.textContent="Noch einmal mit dieser Gruppe · "+gameMeta(sessionGame(session)).title;
  replay.onclick=function(){launchSessionGroup(session);};

  byId("sessionNote").textContent=session.endedAt?"Abgeschlossene Session · Awards und Runden bleiben lokal gespeichert.":"Diese Session läuft noch. Beim Beenden werden die Awards berechnet.";
  openSheet("sessionSheet");
}
function renderSessionHistory(sessions){
  var box=byId("sessionHistoryList");box.textContent="";
  if(!sessions.length){
    var empty=document.createElement("div");empty.className="emptyState";empty.textContent="Noch keine abgeschlossene Session. Beendete Sessions erscheinen hier automatisch.";box.appendChild(empty);return;
  }
  sessions.slice(0,10).forEach(function(session){
    var counts=gameCounts(session),used=Object.keys(counts).filter(function(k){return counts[k]>0;});
    var b=document.createElement("button");b.type="button";b.className="historySession";
    var icon=document.createElement("span");icon.className="historySessionIcon";icon.textContent=used.length>1?"🎲":used.length?gameMeta(used[0]).icon:"🟢";
    var main=document.createElement("span");main.className="historySessionMain";
    var title=document.createElement("strong");title.textContent=fmtDateTime(session.endedAt||session.startedAt);
    var detail=document.createElement("span");detail.textContent=gameMixText(session)+" · "+session.profileIds.length+" Spieler";
    main.appendChild(title);main.appendChild(detail);
    var meta=document.createElement("span");meta.className="historySessionMeta";
    var rounds=document.createElement("strong");rounds.textContent=session.rounds.length+" "+(session.rounds.length===1?"Runde":"Runden");
    var awards=document.createElement("small");awards.textContent=(session.awards||[]).length+" Awards";
    meta.appendChild(rounds);meta.appendChild(awards);
    b.appendChild(icon);b.appendChild(main);b.appendChild(meta);
    b.addEventListener("click",function(){uiSound("tap");renderSessionSheet(session);});
    box.appendChild(b);
  });
}
function renderSessions(){
  var active=store.getActiveSession();
  byId("activeSessionBlock").classList.toggle("hidden",!active);
  byId("sessionStatusPill").textContent=active?"Session läuft · "+fmtDuration(active.startedAt,null):"Keine Session aktiv";
  if(active){
    var currentGame=sessionGame(active),currentMeta=gameMeta(currentGame);
    byId("activeSessionTitle").textContent="Seit "+fmtTime(active.startedAt)+" · "+fmtDuration(active.startedAt,null);
    byId("activeSessionMain").textContent=currentMeta.full+" · "+active.rounds.length+" "+(active.rounds.length===1?"Runde":"Runden");
    byId("activeSessionCard").querySelector(".sessionIcon").textContent=currentMeta.icon;
    var roundAge=active.gameStartedAt?fmtDuration(active.gameStartedAt,null):"–";
    var activity=active.activity?active.activity+" · ":"";
    byId("activeSessionSub").textContent=activity+"aktuell seit "+roundAge;
    var cont=byId("continueSession");
    cont.textContent="Session fortsetzen · "+currentMeta.title;
    cont.disabled=activeProfilesForLaunch(active).length<currentMeta.min;
  }
  var sessions=store.getSessions().filter(function(s){return !!s.endedAt;});
  var last=sessions[0]||null;
  byId("lastSessionBlock").classList.toggle("hidden",!last);
  if(last){
    byId("lastSessionTitle").textContent=fmtDateTime(last.endedAt);
    byId("lastSessionMain").textContent=last.rounds.length+" "+(last.rounds.length===1?"Runde":"Runden")+" · "+last.profileIds.length+" Spieler";
    byId("lastSessionSub").textContent=fmtDuration(last.startedAt,last.endedAt)+" · "+gameMixText(last);
    byId("openLastSession").onclick=function(){uiSound("tap");renderSessionSheet(last);};
    byId("lastSessionCard").onclick=function(){uiSound("tap");renderSessionSheet(last);};
  }
}
function renderStats(){
  var selected=store.getSelectedProfile?store.getSelectedProfile():store.getPrimaryProfile();
  var personal=statsScope==="profile";
  var st=personal?store.getProfileStats(selected.id):store.getStats();

  byId("statsScopeProfile").textContent=selected.name;
  byId("statsScopeProfile").classList.toggle("active",personal);
  byId("statsScopeGlobal").classList.toggle("active",!personal);
  byId("statsScopeLabel").textContent=personal?"Gespielt von "+selected.name:"Gesamt gespielt";
  byId("statsScopeSub").textContent=personal?"Runden dieses lokalen Profils":"Runden auf diesem Gerät";

  byId("totalRounds").textContent=st.rounds||0;
  byId("circaRounds").textContent=st.circaRounds||0;
  byId("classicRounds").textContent=st.classicRounds||0;
  byId("whoamiRounds").textContent=st.whoamiRounds||0;
  byId("charadesRounds").textContent=st.charadesRounds||0;
  byId("personalRounds").textContent=st.personalRounds||0;
  byId("impostorCount").textContent=st.impostor||0;
  byId("personalImpostorCount").textContent=st.personalImpostor||0;
  byId("charadesCorrect").textContent=st.charadesCorrect||0;
  byId("charadesSkipped").textContent=st.charadesSkipped||0;
  var charadesTurns=Number(st.charadesTurns)||0;
  byId("charadesAverage").textContent=charadesTurns?(Number(st.charadesCorrect||0)/charadesTurns).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1}):"0,0";
  byId("charadesBestTurn").textContent=st.charadesBestTurn||0;
  var migrationStatus=store.getMigrationStatus?store.getMigrationStatus():{};
  if(personal){
    var personalPerfect=Number(st.perfect)||0;
    byId("perfectCount").textContent=st.legacyPerfectUnknown?(personalPerfect?personalPerfect+"+":"–"):personalPerfect;
  }else{
    var globalPerfect=Number(st.perfectEstimates)||0;
    byId("perfectCount").textContent=migrationStatus.perfectUnknown?(globalPerfect?globalPerfect+"+":"–"):globalPerfect;
  }
  var cats=Array.isArray(st.categories)?st.categories:[];
  byId("categoryCount").textContent=cats.length+" / 10";
  var cq=Array.isArray(st.circaQids)?st.circaQids.length:0;
  var cw=Array.isArray(st.classicWids)?st.classicWids.length:0;
  var wi=Array.isArray(st.whoamiTermIds)?st.whoamiTermIds.length:0;
  var ch=Array.isArray(st.charadesTermIds)?st.charadesTermIds.length:0;
  var pq=Array.isArray(st.personalQids)?st.personalQids.length:0;
  byId("circaProgress").textContent=Math.round(cq/520*100)+"%";
  byId("classicProgress").textContent=Math.round(cw/250*100)+"%";
  byId("whoamiProgress").textContent=Math.round(wi/275*100)+"%";
  byId("charadesProgress").textContent=Math.round(ch/300*100)+"%";
  byId("personalProgress").textContent=Math.round(pq/100*100)+"%";
  byId("circaProgressSub").textContent=cq+" / 520 Circa";
  byId("classicProgressSub").textContent=cw+" / 250 Classic";
  byId("whoamiProgressSub").textContent=wi+" / 275 Begriffe";
  byId("charadesProgressSub").textContent=ch+" / 300 Begriffe";
  byId("personalProgressSub").textContent=pq+" / 100 Fragen";

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
function hydrateCircaMetadata(){
  if(!store.applyCircaQuestionMetadata)return Promise.resolve(false);
  if(circaMetadataItems){
    var changed=store.applyCircaQuestionMetadata(circaMetadataItems);
    if(changed){renderPlayers();renderStats();}
    return Promise.resolve(changed);
  }
  if(circaMetadataPromise)return circaMetadataPromise;
  circaMetadataPromise=fetch("data/circa-questions.json",{cache:"no-cache"})
    .then(function(response){if(!response.ok)throw new Error("Circa-Metadaten konnten nicht geladen werden.");return response.json();})
    .then(function(payload){
      circaMetadataItems=Array.isArray(payload)?payload:(Array.isArray(payload.items)?payload.items:[]);
      var changed=store.applyCircaQuestionMetadata(circaMetadataItems);
      if(changed){renderPlayers();renderStats();}
      return changed;
    })
    .catch(function(){return false;})
    .finally(function(){circaMetadataPromise=null;});
  return circaMetadataPromise;
}
function renderMigrationChoice(){
  if(!store.getMigrationStatus||!store.completeMigrationProfileChoice)return;
  var status=store.getMigrationStatus();
  if(!status.profileChoicePending)return;
  var profiles=store.getProfiles();
  if(profiles.length<2)return;
  byId("migrationText").textContent="Wir haben "+profiles.length+" Spieler aus V72 übernommen. Welches Profil bist du?";
  var box=byId("migrationProfiles");box.textContent="";
  profiles.forEach(function(p){
    var st=store.getProfileStats(p.id);
    var b=document.createElement("button");b.type="button";b.className="migrationProfileButton";
    var avatar=document.createElement("span");avatar.className="migrationAvatar";avatar.textContent=p.avatar||"😎";
    var text=document.createElement("span");
    var name=document.createElement("strong");name.textContent=p.name;
    var meta=document.createElement("small");meta.textContent=(st.rounds||0)+" bisherige Circa-Runden";
    text.appendChild(name);text.appendChild(meta);
    var arrow=document.createElement("span");arrow.className="migrationArrow";arrow.textContent="›";
    b.appendChild(avatar);b.appendChild(text);b.appendChild(arrow);
    b.addEventListener("click",function(){
      if(store.completeMigrationProfileChoice(p.id)){
        uiSound("confirm");closeSheets();renderAll();
        byId("dataStatus").textContent="V72-Daten wurden übernommen. "+p.name+" ist jetzt dein ausgewähltes Profil.";
      }
    });
    box.appendChild(b);
  });
  openSheet("migrationSheet");
}

for(var i=3;i<=12;i++){
  var opt=document.createElement("option");opt.value=String(i);opt.textContent=String(i);byId("presetPlayersInput").appendChild(opt);
}

document.querySelectorAll(".tab").forEach(function(tab){tab.addEventListener("click",function(){
  var target=tab.getAttribute("data-view");
  if(!tab.classList.contains("active"))uiSound("tap");
  setView(target);
});});
byId("profileButton").addEventListener("click",function(){uiSound("tap");setView("profile");});
byId("settingsShortcut").addEventListener("click",function(){uiSound("tap");setView("settings");});
byId("addPlayer").addEventListener("click",function(){uiSound("tap");openProfileEditor(null);});
byId("addPreset").addEventListener("click",function(){uiSound("tap");openPresetEditor();});
byId("presetGameInput").addEventListener("change",renderPresetEditorMode);

byId("saveProfile").addEventListener("click",function(){
  var id=byId("profileId").value;
  var input=byId("profileName");
  var name=input.value.trim();
  input.setCustomValidity("");
  if(!name){input.focus();return;}
  var duplicate=store.getProfiles().some(function(p){
    return p.id!==id&&p.name.toLocaleLowerCase("de-DE")===name.toLocaleLowerCase("de-DE");
  });
  if(duplicate){
    input.setCustomValidity("Ein Profil mit diesem Namen existiert bereits.");
    input.reportValidity();return;
  }
  if(id){
    if(!store.updateProfile(id,{name:name,avatar:selectedAvatar})){
      input.setCustomValidity("Profil konnte nicht gespeichert werden.");
      input.reportValidity();return;
    }
  }else{
    id=store.addProfile({name:name,avatar:selectedAvatar});
    if(store.setSelectedProfile)store.setSelectedProfile(id);else store.setPrimaryProfile(id);
  }
  uiSound("confirm");closeSheets();renderAll();
});
byId("profileName").addEventListener("input",function(){this.setCustomValidity("");});
byId("deleteProfile").addEventListener("click",function(){
  var id=byId("profileId").value;if(!id)return;
  if(!window.confirm("Dieses Profil löschen? Bereits gespeicherte Session-Historie bleibt erhalten."))return;
  store.deleteProfile(id);uiSound("end");closeSheets();renderAll();
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
  uiSound("confirm");closeSheets();renderAll();
});
byId("presetOpenGame").addEventListener("click",function(){
  if(!selectedPreset)return;
  store.setLaunchPreset(selectedPreset);
  navigateWithSound(selectedPreset.game==="classic"?"games/classic-imposter/":"games/circa-imposter/");
});
byId("deletePreset").addEventListener("click",function(){
  if(!selectedPreset||selectedPreset.builtIn)return;
  store.deletePreset(selectedPreset.id);uiSound("end");closeSheets();renderAll();
});

byId("activeSessionCard").addEventListener("click",function(){var s=store.getActiveSession();if(s){uiSound("tap");renderSessionSheet(s);}});
byId("continueSession").addEventListener("click",function(){var s=store.getActiveSession();if(s)launchSessionGroup(s);});
document.querySelectorAll("[data-stats-scope]").forEach(function(button){
  button.addEventListener("click",function(){var next=this.getAttribute("data-stats-scope")==="global"?"global":"profile";if(next!==statsScope)uiSound("tap");statsScope=next;renderStats();});
});
byId("endSession").addEventListener("click",function(){
  var s=store.getActiveSession();if(!s)return;
  if(!s.rounds.length&&!window.confirm("Die Session enthält noch keine abgeschlossene Runde. Trotzdem beenden?"))return;
  var ended=store.endSession();if(ended)uiSound("end");renderAll();if(ended)renderSessionSheet(ended);
});

["Sound","Haptics","Animations"].forEach(function(name){
  byId("setting"+name).addEventListener("change",function(){
    store.setPreference(name.toLowerCase(),byId("setting"+name).checked);
    if(name!=="Sound"||byId("settingSound").checked)uiSound(name==="Sound"?"confirm":"tap");
    renderSettings();
  });
});

byId("exportData").addEventListener("click",async function(){
  try{
    var backup=store.createBackup?await store.createBackup():store.snapshot();
    var blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");a.href=url;a.download="imposter-games-prototype-v73-backup.json";document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    uiSound("success");byId("dataStatus").textContent="Backup wurde vorbereitet.";
  }catch(e){byId("dataStatus").textContent="Export ist auf diesem Gerät gerade nicht verfügbar.";}
});
byId("importData").addEventListener("click",function(){
  byId("importDataFile").value="";
  byId("importDataFile").click();
});
byId("importDataFile").addEventListener("change",function(){
  var input=this,file=input.files&&input.files[0];
  if(!file)return;
  if(file.size>8*1024*1024){
    byId("dataStatus").textContent="Import abgebrochen: Die JSON-Datei ist größer als 8 MB.";
    input.value="";return;
  }
  var reader=new FileReader();
  reader.onerror=function(){byId("dataStatus").textContent="Die Datei konnte nicht gelesen werden.";input.value="";};
  reader.onload=async function(){
    var parsed=null;
    try{parsed=JSON.parse(String(reader.result||""));}catch(e){
      byId("dataStatus").textContent="Import abgebrochen: Keine gültige JSON-Datei.";input.value="";return;
    }
    if(!window.confirm("Dieses Backup ersetzt die aktuellen lokalen Prototyp-Daten. Fortfahren?")){input.value="";return;}
    var result=store.importSnapshot?await store.importSnapshot(parsed):{ok:false,reason:"unsupported"};
    if(!result.ok){
      var reason=result.reason==="profiles"?"Keine gültigen Profile im Backup gefunden.":result.reason==="duplicate-profiles"?"Das Backup enthält doppelte Profilnamen und wurde aus Sicherheitsgründen nicht übernommen.":result.reason==="storage"?"Die importierten Daten konnten nicht lokal gespeichert werden.":result.reason==="version"?"Nur geprüfte Backup-V3-Dateien werden importiert. Ältere ungeprüfte Backups werden nicht mehr akzeptiert.":result.reason==="format"?"Die Datei ist kein Imposter-App-Backup.":result.reason==="integrity"?"Das Backup wurde verändert oder ist beschädigt.":result.reason==="integrity-unavailable"?"Die Integrität dieses Backups kann auf diesem Gerät nicht geprüft werden.":"Das Backup passt nicht zu dieser App-Version.";
      byId("dataStatus").textContent="Import abgebrochen: "+reason;
      input.value="";return;
    }
    uiSound("success");closeSheets();renderAll();hydrateCircaMetadata();
    byId("dataStatus").textContent="Backup importiert: "+result.profiles+" Profile · "+result.sessions+" Sessions · "+result.rounds+" Runden.";
    input.value="";
  };
  reader.readAsText(file);
});
byId("resetAppData").addEventListener("click",function(){
  if(!window.confirm("Wirklich alle lokalen Prototyp-Daten löschen? Die Live-App bleibt unangetastet."))return;
  uiSound("end");store.reset();byId("dataStatus").textContent="Lokale Prototyp-Daten wurden zurückgesetzt.";closeSheets();setView("home");renderAll();
});

document.querySelectorAll(".closeSheet").forEach(function(b){b.addEventListener("click",closeSheets);});
byId("sheetBackdrop").addEventListener("click",function(){
  var status=store.getMigrationStatus?store.getMigrationStatus():null;
  if(status&&status.profileChoicePending)return;
  closeSheets();
});
document.querySelectorAll("a.gameCard[href]").forEach(function(card){
  card.addEventListener("click",function(event){
    if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return;
    event.preventDefault();
    navigateWithSound(card.getAttribute("href"));
  });
});
document.addEventListener("copy",function(event){
  var target=event.target;
  var editable=target&&(
    target.matches&&target.matches("input,textarea,select,[contenteditable=\"true\"]")||
    target.closest&&target.closest("input,textarea,select,[contenteditable=\"true\"]")
  );
  if(!editable)event.preventDefault();
});
window.addEventListener("pageshow",function(){renderAll();renderMigrationChoice();});
document.addEventListener("visibilitychange",function(){if(!document.hidden){renderAll();renderMigrationChoice();}});

renderAll();
setInterval(function(){if(store.getActiveSession&&store.getActiveSession())renderSessions();},30000);
hydrateCircaMetadata();
renderMigrationChoice();
})();
