(async function(){
"use strict";
var config=window.CI_GAME_CONFIG||{};
var gameMode=config.mode==="classic"?"classic":"circa";
var bank=[];
var classicWords=[];

async function loadConfiguredData(){
  var url=String(config.dataUrl||"");
  if(!url)throw new Error("Keine Datenquelle konfiguriert.");
  var response=await fetch(url,{cache:"no-cache"});
  if(!response.ok)throw new Error("Daten konnten nicht geladen werden ("+response.status+").");
  var payload=await response.json();
  var items=Array.isArray(payload)?payload:payload.items;
  if(!Array.isArray(items))throw new Error("Ungültiges Datenformat.");
  if(gameMode==="classic")classicWords=items;
  else bank=items;
}

function renderLoadError(error){
  while(document.body.firstChild)document.body.removeChild(document.body.firstChild);

  var main=document.createElement("main");
  main.style.cssText="min-height:100vh;display:grid;place-items:center;padding:24px;background:#292929;color:#f8f8fa;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;text-align:center";

  var box=document.createElement("div");
  var icon=document.createElement("div");
  icon.style.fontSize="42px";
  icon.textContent="⚠️";

  var title=document.createElement("h1");
  title.style.fontSize="24px";
  title.textContent="Spiel konnte nicht geladen werden";

  var message=document.createElement("p");
  message.style.cssText="color:#aaa;line-height:1.45";
  message.textContent=String(error&&error.message||error||"Unbekannter Fehler");

  var back=document.createElement("a");
  back.href="../../";
  back.style.cssText="color:#f39a32;font-weight:800";
  back.textContent="Zur Spieleauswahl";

  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(message);
  box.appendChild(back);
  main.appendChild(box);
  document.body.appendChild(main);
}
try{
  await loadConfiguredData();
}catch(loadError){
  renderLoadError(loadError);
  return;
}
/* Classic word bank for the classic word-based Impostor mode.
   WIDs are independent from Circa QIDs so both deck systems can evolve safely. */

function byId(id){return document.getElementById(id);}
var sections=gameMode==="classic"?["setup","handoff","classicRole","classicDiscussion","classicResult"]:["setup","stats","handoff","question","normalReveal","answers","result"];
var count=3,players=[],active=0,impIndex=0,round=0,current=null,scrubbing=false;
var guessLocked=false,guessSaveTimer=null;

/* Fairness state exists only for the current game session. */
var impostorSessionCounts=[];
var impostorRecent=[];
var normalQuestionRevealed=false;
var playerStats={};
var deviceStats={roundsPlayed:0};
var selectedStatsMetric="closest";
var roundStatsRecorded=false;
var roundOutcomeChoice=null;
var diagRoundDirty=false;

/* Per-game local state. Circa keeps its historic keys so existing
   Circa progress/statistics remain available after the platform split. */
var STORAGE_PLAYERS=gameMode==="classic"?"classicImpostor.players.v1":"circaImpostor.players.v1";
var STORAGE_CATEGORIES=gameMode==="classic"?"classicImpostor.categories.v1":"circaImpostor.categories.v1";
var STORAGE_DECK="circaImpostor.deckProgress.v5";
var STORAGE_DIFFICULTY="circaImpostor.difficulty.v1";
var STORAGE_STATS="circaImpostor.playerStats.v1";
var STORAGE_DEVICE_STATS="circaImpostor.deviceStats.v1";
var STORAGE_COMPLETED_QUESTIONS="circaImpostor.completedQuestions.v1";
var STORAGE_CLASSIC_DECK="classicImpostor.deck.v1";
var STORAGE_CLASSIC_HINT="classicImpostor.hint.v1";
var STORAGE_CLASSIC_TIMER="classicImpostor.timer.v1";
var LEGACY_CLASSIC_DECK="circaImpostor.classicDeck.v1";
var LEGACY_CLASSIC_HINT="circaImpostor.classicHint.v1";
var LEGACY_CLASSIC_TIMER="circaImpostor.classicTimer.v1";
var deckProgress={};
var completedQuestionIds=[];
var savedPlayerNames=[];
var selectedDifficulty="mittel";
var classicDeckProgress={};
var classicCurrent=null;
var classicDiscussionStarter=0;
var classicHintEnabled=true;
var classicTimerSeconds=0;
var classicTimerHandle=null;
var classicTimerRemaining=0;
var classicTimerPaused=false;
var classicTimerDeadline=0;
var classicTimerExpiredSignaled=false;
var classicResolved=false;

function storageGet(key,fallback){
  try{
    var raw=localStorage.getItem(key);
    if(!raw)return fallback;
    var value=JSON.parse(raw);
    return value===null?fallback:value;
  }catch(e){return fallback;}
}
function storageSet(key,value){
  try{
    localStorage.setItem(key,JSON.stringify(value));
    return true;
  }catch(e){return false;}
}
function storageRemove(key){
  try{localStorage.removeItem(key);return true;}catch(e){return false;}
}
function difficultyRatio(item){
  var a=Math.abs(Number(item.normalValue)),b=Math.abs(Number(item.impValue));
  var low=Math.min(a,b),high=Math.max(a,b);
  if(!isFinite(low)||!isFinite(high)||low<=0)return 999;
  return high/low;
}
function difficultyFits(item,difficulty){
  var ratio=difficultyRatio(item);

  /* Fixed levels are mutually exclusive; Random uses the full bank. */
  if(difficulty==="zufaellig")return true;
  if(difficulty==="leicht")return ratio<=1.30;
  if(difficulty==="mittel")return ratio>1.30&&ratio<=1.80;
  if(difficulty==="schwer")return ratio>1.80;
  return false;
}
function difficultyName(difficulty){
  if(difficulty==="leicht")return "Leicht";
  if(difficulty==="schwer")return "Schwer";
  if(difficulty==="zufaellig")return "Zufällig";
  return "Mittel";
}
function difficultyHintText(difficulty){
  if(difficulty==="leicht")return "Ähnliche Zielwerte – der Impostor kann sich leichter verstecken";
  if(difficulty==="schwer")return "Deutlich größerer Abstand – schwieriger für den Impostor";
  if(difficulty==="zufaellig")return "Alles kann drankommen – von sehr nah bis deutlich auseinander";
  return "Spürbarer Abstand zwischen den beiden Zielwerten";
}

function loadClassicSettings(){
  var storedHint=storageGet(STORAGE_CLASSIC_HINT,null);
  if(storedHint===null){
    storedHint=storageGet(LEGACY_CLASSIC_HINT,true);
    if(storageSet(STORAGE_CLASSIC_HINT,storedHint!==false))storageRemove(LEGACY_CLASSIC_HINT);
  }else{
    storageRemove(LEGACY_CLASSIC_HINT);
  }
  classicHintEnabled=storedHint!==false;

  var storedTimer=storageGet(STORAGE_CLASSIC_TIMER,null);
  if(storedTimer===null){
    storedTimer=storageGet(LEGACY_CLASSIC_TIMER,0);
    if(storageSet(STORAGE_CLASSIC_TIMER,Number(storedTimer)||0))storageRemove(LEGACY_CLASSIC_TIMER);
  }else{
    storageRemove(LEGACY_CLASSIC_TIMER);
  }
  var timer=Number(storedTimer);
  if([0,60,90,120,150,180,210,240,270,300].indexOf(timer)===-1)timer=0;
  classicTimerSeconds=timer;
}
function classicTimerLabel(seconds){
  if(!seconds)return "Aus";
  var m=Math.floor(seconds/60),s=seconds%60;
  return m+":"+String(s).padStart(2,"0");
}
function syncClassicOptionsUI(){
  var hintButtons=byId("classicHintControl").querySelectorAll("[data-classic-hint]");
  for(var i=0;i<hintButtons.length;i++){
    var selected=(hintButtons[i].getAttribute("data-classic-hint")==="1")===classicHintEnabled;
    hintButtons[i].classList.toggle("selected",selected);
    hintButtons[i].setAttribute("aria-pressed",selected?"true":"false");
  }
  byId("classicHintStatus").textContent=classicHintEnabled?"Ja":"Nein";

  var timerSelect=byId("classicTimerSelect");
  if(timerSelect)timerSelect.value=String(classicTimerSeconds);
  byId("classicTimerStatus").textContent=classicTimerLabel(classicTimerSeconds);
}
function setClassicHint(enabled){
  classicHintEnabled=!!enabled;
  storageSet(STORAGE_CLASSIC_HINT,classicHintEnabled);
  syncClassicOptionsUI();
  tone(classicHintEnabled?500:350,0.04,0.012,"sine",0);
}
function setClassicTimer(seconds){
  seconds=Number(seconds);
  if([0,60,90,120,150,180,210,240,270,300].indexOf(seconds)===-1)return;
  classicTimerSeconds=seconds;
  storageSet(STORAGE_CLASSIC_TIMER,classicTimerSeconds);
  syncClassicOptionsUI();
  tone(seconds?500:350,0.04,0.012,"sine",0);
}
function syncGameModeUI(){
  if(gameMode==="classic"){
    byId("setupSubtitle").textContent="Alle kennen das geheime Wort – außer einer Person.";
    byId("start").textContent="Imposter starten";
    byId("poolCount").textContent=classicWords.length+" geheime Wörter";
    var classicOptions=byId("classicOptions");
    if(classicOptions)classicOptions.classList.remove("hidden");
    syncClassicOptionsUI();
  }else{
    byId("setupSubtitle").textContent="Alle bekommen dieselbe Schätzfrage – außer einer Person.";
    byId("start").textContent="Spiel starten";
    byId("poolCount").textContent=bank.length+" Fragepaare";
  }
  syncSetupScrollFit();
}

function deckKey(cat,difficulty){
  return cat+"::"+difficulty;
}
function validIdsForDeck(cat,difficulty){
  var ids=[];
  for(var i=0;i<bank.length;i++){
    if(bank[i].cat===cat&&difficultyFits(bank[i],difficulty))ids.push(bank[i].qid);
  }
  return ids;
}
function loadSavedGameMode(){
  gameMode=config.mode==="classic"?"classic":"circa";
}
function loadSavedDifficulty(){
  var saved=storageGet(STORAGE_DIFFICULTY,"mittel");
  if(saved!=="leicht"&&saved!=="mittel"&&saved!=="schwer"&&saved!=="zufaellig")saved="mittel";
  selectedDifficulty=saved;
}
function syncDifficultyUI(){
  var buttons=byId("difficultyControl").querySelectorAll(".difficultyButton");
  for(var i=0;i<buttons.length;i++){
    var selected=buttons[i].getAttribute("data-difficulty")===selectedDifficulty;
    buttons[i].classList.toggle("selected",selected);
    buttons[i].setAttribute("aria-pressed",selected?"true":"false");
  }
  byId("difficultyHint").textContent=difficultyHintText(selectedDifficulty);
}
function setDifficulty(difficulty){
  if(difficulty!=="leicht"&&difficulty!=="mittel"&&difficulty!=="schwer"&&difficulty!=="zufaellig")return;
  selectedDifficulty=difficulty;
  storageSet(STORAGE_DIFFICULTY,selectedDifficulty);
  syncDifficultyUI();
  tone(difficulty==="leicht"?390:(difficulty==="schwer"?520:(difficulty==="zufaellig"?590:450)),0.045,0.012,"sine",0);
}
function loadDeckProgress(){
  var data=storageGet(STORAGE_DECK,null);
  if(!data||typeof data!=="object"||Array.isArray(data))data={};

  deckProgress={};
  var cats={};
  for(var i=0;i<bank.length;i++)cats[bank[i].cat]=true;
  var levels=["leicht","mittel","schwer","zufaellig"];

  for(var cat in cats){
    for(var d=0;d<levels.length;d++){
      var diff=levels[d],key=deckKey(cat,diff);
      var valid=validIdsForDeck(cat,diff);
      var saved=Array.isArray(data[key])?data[key]:[],clean=[];
      for(var j=0;j<saved.length;j++){
        if(valid.indexOf(saved[j])!==-1&&clean.indexOf(saved[j])===-1){
          clean.push(saved[j]);
        }
      }
      deckProgress[key]=clean;
    }
  }
  storageSet(STORAGE_DECK,deckProgress);
}
function rememberQuestion(item){
  if(!item||!item.qid)return;
  var key=deckKey(item.cat,selectedDifficulty);
  if(!deckProgress[key])deckProgress[key]=[];
  if(deckProgress[key].indexOf(item.qid)===-1)deckProgress[key].push(item.qid);
  storageSet(STORAGE_DECK,deckProgress);
}

/* Unique, successfully completed question pairs.
   Deck progress is still used separately for repeat prevention. */
function validQuestionId(qid){
  if(!qid)return false;
  for(var i=0;i<bank.length;i++){
    if(bank[i].qid===qid)return true;
  }
  return false;
}
function loadCompletedQuestionIds(){
  var saved=storageGet(STORAGE_COMPLETED_QUESTIONS,null);
  var clean=[];

  if(Array.isArray(saved)){
    for(var i=0;i<saved.length;i++){
      var qid=String(saved[i]||"");
      if(validQuestionId(qid)&&clean.indexOf(qid)===-1)clean.push(qid);
    }
  }else{
    /* First-run migration: preserve as much pre-V58 history as the current
       deck-progress storage can still provide. */
    try{
      for(var key in deckProgress){
        if(!Object.prototype.hasOwnProperty.call(deckProgress,key))continue;
        var arr=deckProgress[key];
        if(!Array.isArray(arr))continue;
        for(var j=0;j<arr.length;j++){
          var legacyQid=String(arr[j]||"");
          if(validQuestionId(legacyQid)&&clean.indexOf(legacyQid)===-1)clean.push(legacyQid);
        }
      }
    }catch(e){}
  }

  completedQuestionIds=clean;
  storageSet(STORAGE_COMPLETED_QUESTIONS,completedQuestionIds);
}
function markQuestionCompleted(item){
  if(!item||!item.qid||!validQuestionId(item.qid))return;
  if(completedQuestionIds.indexOf(item.qid)!==-1)return;
  completedQuestionIds.push(item.qid);
  storageSet(STORAGE_COMPLETED_QUESTIONS,completedQuestionIds);
}
function completedQuestionCount(){
  return completedQuestionIds.length;
}

function loadClassicDeckProgress(){
  var data=storageGet(STORAGE_CLASSIC_DECK,null);
  if(data===null){
    data=storageGet(LEGACY_CLASSIC_DECK,{});
    var migratedDeck=data&&typeof data==="object"&&!Array.isArray(data)?data:{};
    if(storageSet(STORAGE_CLASSIC_DECK,migratedDeck))storageRemove(LEGACY_CLASSIC_DECK);
    data=migratedDeck;
  }else{
    storageRemove(LEGACY_CLASSIC_DECK);
  }
  if(!data||typeof data!=="object"||Array.isArray(data))data={};
  var valid={};
  for(var key in data){
    if(!Object.prototype.hasOwnProperty.call(data,key)||!Array.isArray(data[key]))continue;
    var seen={},clean=[];
    for(var i=0;i<data[key].length;i++){
      var id=String(data[key][i]||"");
      if(!id||seen[id])continue;
      for(var w=0;w<classicWords.length;w++){
        if(classicWords[w].wid===id){seen[id]=true;clean.push(id);break;}
      }
    }
    valid[key]=clean;
  }
  classicDeckProgress=valid;
  storageSet(STORAGE_CLASSIC_DECK,classicDeckProgress);
}
function classicEligibleCategories(){
  var all=[],seen={};
  for(var i=0;i<classicWords.length;i++){
    if(!seen[classicWords[i].cat]){seen[classicWords[i].cat]=true;all.push(classicWords[i].cat);}
  }
  if(selectedCategories.indexOf("Alle")!==-1)return all;
  var out=[];
  for(var j=0;j<selectedCategories.length;j++){
    if(seen[selectedCategories[j]])out.push(selectedCategories[j]);
  }
  return out.length?out:all;
}
function classicPickWord(){
  if(diagClassicPinnedWord){
    classicCurrent=diagClassicPinnedWord;
    diagClassicPinnedWord=null;
    diagMarkRoundDirty("Vorgemerktes DEV-Wort verwendet: "+classicCurrent.wid);
  }else{
    var cats=classicEligibleCategories();
    if(!cats.length)return false;
    var cat=cats[Math.floor(randomUnit()*cats.length)];
    var eligible=[];
    for(var i=0;i<classicWords.length;i++)if(classicWords[i].cat===cat)eligible.push(classicWords[i]);
    if(!eligible.length)return false;

    var key="classic::"+cat;
    if(!Array.isArray(classicDeckProgress[key]))classicDeckProgress[key]=[];
    var pool=[];
    for(var j=0;j<eligible.length;j++){
      if(classicDeckProgress[key].indexOf(eligible[j].wid)===-1)pool.push(eligible[j]);
    }
    if(!pool.length){
      classicDeckProgress[key]=[];
      pool=eligible.slice();
    }
    classicCurrent=pool[Math.floor(randomUnit()*pool.length)];
    classicDeckProgress[key].push(classicCurrent.wid);
    storageSet(STORAGE_CLASSIC_DECK,classicDeckProgress);
  }

  impIndex=selectImpostor();
  active=0;
  round++;
  classicResolved=false;
  classicDiscussionStarter=Math.floor(randomUnit()*players.length);
  updateToolbar();
  diagLog("Classic","R"+round+" · "+classicCurrent.wid+" · "+classicCurrent.cat+" · Hinweis "+(classicHintEnabled?"an":"aus")+" · Timer "+classicTimerLabel(classicTimerSeconds));
  return true;
}

function cleanPlayerName(value){
  return String(value==null?"":value).replace(/^\s+|\s+$/g,"").slice(0,24);
}
function statsPlayerKey(name){
  return cleanPlayerName(name).toLocaleLowerCase("de-DE");
}
function sanitizeStatNumber(value){
  value=Number(value);
  return isFinite(value)&&value>=0?Math.floor(value):0;
}
function loadPlayerStats(){
  var saved=storageGet(STORAGE_STATS,{});
  if(!saved||typeof saved!=="object"||Array.isArray(saved))saved={};
  playerStats={};

  for(var key in saved){
    if(!Object.prototype.hasOwnProperty.call(saved,key))continue;
    var item=saved[key];
    if(!item||typeof item!=="object")continue;
    var name=cleanPlayerName(item.name);
    if(!name)continue;

    var safeKey=statsPlayerKey(name);
    var errorSum=Number(item.errorSum);
    var errorSamples=sanitizeStatNumber(item.errorSamples);
    playerStats[safeKey]={
      name:name,
      avatar:String(item.avatar||"😎").slice(0,8),
      closest:sanitizeStatNumber(item.closest),
      farthest:sanitizeStatNumber(item.farthest),
      impostor:sanitizeStatNumber(item.impostor),
      impostorWins:sanitizeStatNumber(item.impostorWins),
      rounds:sanitizeStatNumber(item.rounds),
      errorSum:isFinite(errorSum)&&errorSum>=0?errorSum:0,
      errorSamples:errorSamples
    };
  }

  var savedDevice=storageGet(STORAGE_DEVICE_STATS,{roundsPlayed:0});
  if(!savedDevice||typeof savedDevice!=="object"||Array.isArray(savedDevice))savedDevice={roundsPlayed:0};
  deviceStats={roundsPlayed:sanitizeStatNumber(savedDevice.roundsPlayed)};
}
function savePlayerStats(){
  storageSet(STORAGE_STATS,playerStats);
  storageSet(STORAGE_DEVICE_STATS,deviceStats);
}
function ensurePlayerStat(player){
  var key=statsPlayerKey(player.name);
  if(!playerStats[key]){
    playerStats[key]={
      name:cleanPlayerName(player.name),
      avatar:player.avatar||"😎",
      closest:0,
      farthest:0,
      impostor:0,
      impostorWins:0,
      rounds:0,
      errorSum:0,
      errorSamples:0
    };
  }else{
    if(!isFinite(Number(playerStats[key].errorSum))||Number(playerStats[key].errorSum)<0)playerStats[key].errorSum=0;
    playerStats[key].errorSamples=sanitizeStatNumber(playerStats[key].errorSamples);
    playerStats[key].name=cleanPlayerName(player.name);
    playerStats[key].avatar=player.avatar||playerStats[key].avatar||"😎";
  }
  return playerStats[key];
}
function roundPerformance(){
  var stats=[];
  for(var i=0;i<players.length;i++){
    var target=playerTargetValue(i);
    stats.push({
      index:i,
      name:players[i].name,
      avatar:players[i].avatar||"😎",
      guess:Number(players[i].guess),
      target:target,
      err:errorPercent(Number(players[i].guess),target)
    });
  }
  stats.sort(function(a,b){
    if(a.err!==b.err)return a.err-b.err;
    return a.index-b.index;
  });
  return stats;
}
function recordRoundBaseStats(){
  if(roundStatsRecorded||!players.length||!current)return;
  if(diagRoundDirty){
    roundStatsRecorded=true;
    diagLog("Statistik","DEV-manipulierte Runde wurde nicht gespeichert");
    return;
  }

  var perf=roundPerformance();
  if(!perf.length)return;

  for(var i=0;i<players.length;i++){
    var stat=ensurePlayerStat(players[i]);
    stat.rounds++;

    var target=playerTargetValue(i);
    var err=errorPercent(Number(players[i].guess),target);
    if(isFinite(err)&&err>=0){
      stat.errorSum+=err;
      stat.errorSamples++;
    }
  }

  ensurePlayerStat(players[perf[0].index]).closest++;
  ensurePlayerStat(players[perf[perf.length-1].index]).farthest++;
  ensurePlayerStat(players[impIndex]).impostor++;
  deviceStats.roundsPlayed++;
  markQuestionCompleted(current);

  roundStatsRecorded=true;
  savePlayerStats();
}
function setImpostorOutcome(won){
  if(diagRoundDirty){
    roundStatsRecorded=true;
    roundOutcomeChoice=!!won;
    byId("impostorWonYes").classList.toggle("selected",roundOutcomeChoice===true);
    byId("impostorWonNo").classList.toggle("selected",roundOutcomeChoice===false);
    byId("impostorWonYes").setAttribute("aria-pressed",roundOutcomeChoice===true?"true":"false");
    byId("impostorWonNo").setAttribute("aria-pressed",roundOutcomeChoice===false?"true":"false");
    byId("resultActions").classList.remove("hidden");
    diagLog("Ergebnis","DEV-Runde: Impostor versteckt = "+(roundOutcomeChoice?"Ja":"Nein"));
    tone(roundOutcomeChoice?620:390,0.07,0.018,"sine",0);
    return;
  }

  if(!roundStatsRecorded)recordRoundBaseStats();
  if(!players[impIndex])return;

  var stat=ensurePlayerStat(players[impIndex]);

  /* Allow correcting a mistaken tap before the next round. */
  if(roundOutcomeChoice===true&&stat.impostorWins>0)stat.impostorWins--;
  roundOutcomeChoice=!!won;
  if(roundOutcomeChoice)stat.impostorWins++;

  savePlayerStats();

  byId("impostorWonYes").classList.toggle("selected",roundOutcomeChoice===true);
  byId("impostorWonNo").classList.toggle("selected",roundOutcomeChoice===false);
  byId("impostorWonYes").setAttribute("aria-pressed",roundOutcomeChoice===true?"true":"false");
  byId("impostorWonNo").setAttribute("aria-pressed",roundOutcomeChoice===false?"true":"false");

  byId("resultActions").classList.remove("hidden");
  diagLog("Ergebnis","Impostor versteckt = "+(roundOutcomeChoice?"Ja":"Nein"));
  tone(roundOutcomeChoice?620:390,0.07,0.018,"sine",0);
}
var statsMetricMeta={
  closest:{
    icon:"🎯",
    title:"Am meisten nah dran",
    hint:"Wer lag über die gespielten Runden am häufigsten am nächsten?",
    empty:"Noch keine abgeschlossenen Runden gespeichert."
  },
  farthest:{
    icon:"😵",
    title:"Am meisten am weitesten weg",
    hint:"Wer hatte am häufigsten die größte Abweichung von der eigenen richtigen Antwort?",
    empty:"Noch keine abgeschlossenen Runden gespeichert."
  },
  impostor:{
    icon:"🎭",
    title:"Am meisten Impostor",
    hint:"Wer wurde bisher am häufigsten als Impostor ausgewählt?",
    empty:"Noch keine Impostor-Runden gespeichert."
  },
  impostorWins:{
    icon:"🥷",
    title:"Meiste Impostor-Siege",
    hint:"Wer konnte sich als Impostor am häufigsten bis zum Ende verstecken?",
    empty:"Noch kein Impostor-Sieg gespeichert."
  }
};
function statsScoreLabel(metric,value){
  if(metric==="impostorWins")return value===1?"1 Sieg":value+" Siege";
  return value+"×";
}
function averageDeviation(item){
  var samples=sanitizeStatNumber(item.errorSamples);
  if(!samples)return null;
  var sum=Number(item.errorSum);
  if(!isFinite(sum)||sum<0)return null;
  return sum/samples;
}
function averageCloseness(item){
  var deviation=averageDeviation(item);
  if(deviation===null)return null;
  return Math.max(0,100-deviation);
}
function statPercent(value){
  if(value===null||!isFinite(value))return "–";
  if(value>=100)return Math.round(value)+" %";
  return value.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1})+" %";
}
function renderStatistics(){
  var meta=statsMetricMeta[selectedStatsMetric]||statsMetricMeta.closest;
  var played=deviceStats.roundsPlayed||0;
  byId("statsDeviceRounds").textContent="Auf diesem Gerät gespielt: "+played+(played===1?" Runde":" Runden");
  byId("statsMetricIcon").textContent=meta.icon;
  byId("statsMetricTitle").textContent=meta.title;
  byId("statsMetricHint").textContent=meta.hint;

  var tabs=byId("statsTabs").querySelectorAll(".statsTab");
  for(var t=0;t<tabs.length;t++){
    var selected=tabs[t].getAttribute("data-stat")===selectedStatsMetric;
    tabs[t].classList.toggle("selected",selected);
    tabs[t].setAttribute("aria-selected",selected?"true":"false");
  }

  var list=[];
  for(var key in playerStats){
    if(!Object.prototype.hasOwnProperty.call(playerStats,key))continue;
    var item=playerStats[key];
    list.push(item);
  }

  list.sort(function(a,b){
    var diff=(b[selectedStatsMetric]||0)-(a[selectedStatsMetric]||0);
    if(diff!==0)return diff;
    if((b.rounds||0)!==(a.rounds||0))return (b.rounds||0)-(a.rounds||0);
    return String(a.name).localeCompare(String(b.name),"de-DE");
  });

  var box=byId("statsLeaderboard");
  box.innerHTML="";

  var hasPositive=false;
  for(var x=0;x<list.length;x++){
    if((list[x][selectedStatsMetric]||0)>0){hasPositive=true;break;}
  }

  if(!list.length||!hasPositive){
    byId("statsEmpty").textContent=meta.empty;
    byId("statsEmpty").classList.remove("hidden");
    return;
  }

  byId("statsEmpty").classList.add("hidden");

  var previousScore=null,currentRank=0;
  for(var i=0;i<list.length;i++){
    var item=list[i],score=item[selectedStatsMetric]||0;
    if(score<=0)continue;

    if(previousScore===null||score!==previousScore)currentRank=i+1;
    previousScore=score;

    var row=document.createElement("div");
    row.className="statsRow";

    var rank=document.createElement("div");
    rank.className="statsRank";
    if(currentRank===1){rank.textContent="🥇";rank.classList.add("medal");}
    else if(currentRank===2){rank.textContent="🥈";rank.classList.add("medal");}
    else if(currentRank===3){rank.textContent="🥉";rank.classList.add("medal");}
    else rank.textContent="#"+currentRank;

    var player=document.createElement("div");
    player.className="statsPlayer";

    var avatar=document.createElement("span");
    avatar.className="statsPlayerAvatar";
    avatar.textContent=item.avatar||"😎";

    var info=document.createElement("div");
    info.className="statsPlayerInfo";

    var name=document.createElement("div");
    name.className="statsPlayerName";
    name.textContent=item.name;

    var avg=document.createElement("div");
    avg.className="statsPlayerAverage";
    var near=averageCloseness(item),away=averageDeviation(item);
    if(near===null||away===null){
      avg.textContent="Ø Nähe – · Ø Abweichung –";
    }else{
      var nearSpan=document.createElement("span");
      nearSpan.className="statsAverageNear";
      nearSpan.textContent="Ø Nähe "+statPercent(near);
      var awaySpan=document.createElement("span");
      awaySpan.className="statsAverageAway";
      awaySpan.textContent=" · Ø Abweichung "+statPercent(away);
      avg.appendChild(nearSpan);
      avg.appendChild(awaySpan);
    }

    info.appendChild(name);
    info.appendChild(avg);

    var scoreEl=document.createElement("div");
    scoreEl.className="statsScore";
    scoreEl.textContent=statsScoreLabel(selectedStatsMetric,score);

    player.appendChild(avatar);
    player.appendChild(info);
    row.appendChild(rank);
    row.appendChild(player);
    row.appendChild(scoreEl);
    box.appendChild(row);
  }
}
function openStatistics(){
  renderStatistics();
  show("stats");
}
function closeStatistics(){
  show("setup");
}
function resetStatistics(){
  if(!window.confirm("Alle lokal gespeicherten Statistiken zurücksetzen?"))return;
  playerStats={};
  deviceStats={roundsPlayed:0};
  storageSet(STORAGE_STATS,playerStats);
  storageSet(STORAGE_DEVICE_STATS,deviceStats);
  renderStatistics();
}
function loadSavedPlayers(){
  var data=storageGet(STORAGE_PLAYERS,null);
  if(!data||!Array.isArray(data.players)||data.players.length<3)return;
  var list=data.players.slice(0,12);
  count=Math.max(3,Math.min(12,list.length));
  savedPlayerNames=[];
  avatarSelections=[];
  for(var i=0;i<count;i++){
    var item=list[i]&&typeof list[i]==="object"?list[i]:{};
    var name=cleanPlayerName(item.name)||("Spieler "+(i+1));
    var avatar=String(item.avatar||"");
    if(avatarPool.indexOf(avatar)===-1)avatar=avatarPool[i%avatarPool.length];
    savedPlayerNames.push(name);
    avatarSelections.push(avatar);
  }
}
function savePlayers(){
  var nodes=byId("names").querySelectorAll("input"),list=[];
  for(var i=0;i<count;i++){
    var name=cleanPlayerName(nodes[i]&&nodes[i].value?nodes[i].value:"");
    if(!name)name="Spieler "+(i+1);
    list.push({name:name,avatar:avatarSelections[i]||avatarPool[i%avatarPool.length]});
  }
  savedPlayerNames=list.map(function(p){return p.name;});
  storageSet(STORAGE_PLAYERS,{players:list});
}

var roundIntroTimer=null;
var categoryPulseTimer=null;
var selectedCategories=["Alle"];

function saveSelectedCategories(){
  storageSet(STORAGE_CATEGORIES,selectedCategories.slice());
}
function loadSavedCategories(){
  var saved=storageGet(STORAGE_CATEGORIES,["Alle"]);
  if(!Array.isArray(saved)){
    selectedCategories=["Alle"];
    return;
  }

  var valid=[],seenValid={};
  var categorySource=gameMode==="classic"?classicWords:bank;
  for(var v=0;v<categorySource.length;v++){
    if(!seenValid[categorySource[v].cat]){seenValid[categorySource[v].cat]=true;valid.push(categorySource[v].cat);}
  }
  var clean=[];

  /* "Alle" is exclusive. Old/corrupt values are discarded safely. */
  if(saved.indexOf("Alle")!==-1){
    selectedCategories=["Alle"];
    return;
  }

  for(var i=0;i<saved.length;i++){
    if(valid.indexOf(saved[i])!==-1&&clean.indexOf(saved[i])===-1){
      clean.push(saved[i]);
    }
  }

  selectedCategories=clean.length?clean:["Alle"];
}

var avatarPool=["😎","🦊","🐼","🤠","👾","🐸","🦁","🐯","🦄","🐵","🧸","🥷","👽","🤖","😈","🐧"];
var avatarSelections=["😎","🦊","🐼"];
var categoryIcons={
  "Alle":"✨",
  "Allgemein":"🧠",
  "Geografie":"🌍",
  "Technik":"⚡",
  "Natur":"🌿",
  "Alltag":"☕",
  "Sport":"🏆",
  "Auto":"🏎️",
  "Essen":"🍕",
  "Popkultur":"🎬",
  "Spicy 🌶️":"🌶️"
};


/* Keep the natural setup layout. Suppress only tiny phantom scrolling when
   the content already fits; shorter screens remain naturally scrollable. */
var setupFitFrame=0;
function syncSetupScrollFit(){
  if(setupFitFrame){cancelAnimationFrame(setupFitFrame);setupFitFrame=0;}
  if(document.body.classList.contains("game-active")){
    document.body.classList.remove("setup-fits");
    return;
  }
  document.body.classList.remove("setup-fits");
  setupFitFrame=requestAnimationFrame(function(){
    setupFitFrame=0;
    if(document.body.classList.contains("game-active")){
      document.body.classList.remove("setup-fits");
      return;
    }
    var doc=document.documentElement;
    var needed=Math.max(doc.scrollHeight,document.body.scrollHeight);
    var viewport=window.innerHeight||doc.clientHeight||0;
    var fits=needed<=viewport+1;
    document.body.classList.toggle("setup-fits",fits);
    if(fits){
      try{window.scrollTo(0,0);}catch(e){}
    }
  });
}
window.addEventListener("resize",syncSetupScrollFit,{passive:true});
window.addEventListener("orientationchange",function(){setTimeout(syncSetupScrollFit,80);},{passive:true});

var audioCtx=null,soundEnabled=true,lastSliderSoundAt=0,lastSliderSoundValue=null;

function getAudioContext(){
  if(!soundEnabled)return null;
  try{
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    if(!audioCtx||audioCtx.state==="closed")audioCtx=new AC();
    return audioCtx;
  }catch(e){return null;}
}
function primeAudio(ctx){
  if(!ctx||ctx.state!=="running")return;
  try{
    var buffer=ctx.createBuffer(1,1,22050);
    var source=ctx.createBufferSource();
    source.buffer=buffer;
    source.connect(ctx.destination);
    source.start(0);
  }catch(e){}
}
function unlockAudio(){
  var ctx=getAudioContext();
  if(!ctx)return null;
  try{
    if(ctx.state==="running")return ctx;
    var resumed=ctx.resume();
    if(resumed&&typeof resumed.then==="function"){
      resumed.then(function(){primeAudio(ctx);}).catch(function(){});
    }else if(ctx.state==="running"){
      primeAudio(ctx);
    }
    return ctx;
  }catch(e){return ctx;}
}
function ensureAudio(){
  return unlockAudio();
}
function withAudio(fn){
  if(!soundEnabled)return;
  var ctx=getAudioContext();
  if(!ctx)return;
  if(ctx.state==="running"){
    fn(ctx);
    return;
  }
  try{
    /* Do not serialize resume() behind a previous pointer event. On iOS the
       sound-producing click itself is the strongest user activation, so each
       requested sound gets its own chance to resume during that gesture. */
    var resumed=ctx.resume();
    if(resumed&&typeof resumed.then==="function"){
      resumed.then(function(){
        if(soundEnabled&&ctx.state==="running"){
          primeAudio(ctx);
          fn(ctx);
        }
      }).catch(function(){});
    }else if(ctx.state==="running"){
      primeAudio(ctx);
      fn(ctx);
    }
  }catch(e){}
}
function tone(freq,duration,volume,type,delay){
  if(!soundEnabled)return;
  withAudio(function(ctx){
    try{
      var t=ctx.currentTime+(delay||0);
      var osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type=type||"sine";
      osc.frequency.setValueAtTime(freq,t);
      gain.gain.setValueAtTime(0.0001,t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001,volume||0.025),t+.006);
      gain.gain.exponentialRampToValueAtTime(0.0001,t+duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t+duration+.02);
    }catch(e){}
  });
}
function noiseHit(duration,volume,delay){
  if(!soundEnabled)return;
  withAudio(function(ctx){
    try{
      var len=Math.max(1,Math.floor(ctx.sampleRate*duration));
      var buf=ctx.createBuffer(1,len,ctx.sampleRate),data=buf.getChannelData(0);
      for(var i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
      var src=ctx.createBufferSource(),gain=ctx.createGain();
      src.buffer=buf;
      gain.gain.value=volume||0.035;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(ctx.currentTime+(delay||0));
    }catch(e){}
  });
}
function soundTick(value){
  var now=Date.now();
  if(now-lastSliderSoundAt<55) return;
  if(lastSliderSoundValue===value) return;
  lastSliderSoundAt=now;lastSliderSoundValue=value;
  tone(620,0.035,0.012,"square",0);
}
function soundLock(){
  tone(420,0.07,0.035,"sine",0);
  tone(720,0.09,0.03,"sine",0.045);
}
function soundHandoff(){
  tone(260,0.07,0.018,"sine",0);
  tone(360,0.08,0.018,"sine",0.05);
}
function soundRevealTension(){
  tone(210,0.06,0.025,"sine",0);
  tone(240,0.06,0.026,"sine",0.23);
  tone(275,0.07,0.028,"sine",0.46);
}
function soundImpact(){
  noiseHit(0.12,0.06,0);
  tone(95,0.18,0.05,"sine",0);
  tone(520,0.08,0.025,"square",0.02);
}
function soundCorrect(){
  tone(440,0.10,0.035,"sine",0);
  tone(660,0.11,0.035,"sine",0.08);
  tone(880,0.16,0.03,"sine",0.16);
}
function soundNextRound(){
  tone(330,0.07,0.018,"sine",0);
  tone(495,0.08,0.018,"sine",0.06);
}
function setSoundEnabled(on){
  soundEnabled=!!on;
  byId("soundOnIcon").classList.toggle("hidden",!soundEnabled);
byId("soundOffIcon").classList.toggle("hidden",soundEnabled);
  byId("soundToggle").setAttribute("aria-pressed",soundEnabled?"true":"false");
  byId("soundToggle").setAttribute("aria-label",soundEnabled?"Sound ausschalten":"Sound einschalten");
  if(soundEnabled){ensureAudio();tone(560,0.06,0.02,"sine",0);}
}


function show(id){
  for(var i=0;i<sections.length;i++){
    var section=byId(sections[i]);
    if(section)section.classList.toggle("hidden",sections[i]!==id);
  }
  var isGame=id!=="setup"&&id!=="stats";
  var topbar=byId("gameTopbar");
  if(topbar)topbar.classList.toggle("hidden",!isGame);
  document.body.classList.toggle("game-active",isGame);
  if(id!=="setup")document.body.classList.remove("setup-fits");
  try{window.scrollTo(0,0);}catch(e){}
  if(id==="setup")syncSetupScrollFit();
}
function updateToolbar(){
  byId("topCategory").textContent=gameMode==="classic"?"Impostor":(current ? current.cat : selectedCategoryLabel());
  byId("topRound").textContent="R"+round;

  document.body.classList.remove("cat-spicy","cat-auto","cat-sport","cat-tech","cat-food","cat-geo","cat-pop","cat-allgemein","cat-natur","cat-alltag","cat-alle","categoryPulse");
  var cat=gameMode==="classic"?"Alle":(current ? current.cat : (selectedCategories.length===1 ? selectedCategories[0] : "Alle"));
  if(cat==="Spicy 🌶️") document.body.classList.add("cat-spicy");
  if(cat==="Auto") document.body.classList.add("cat-auto");
  if(cat==="Sport") document.body.classList.add("cat-sport");
  if(cat==="Technik") document.body.classList.add("cat-tech");
  if(cat==="Essen") document.body.classList.add("cat-food");
  if(cat==="Geografie") document.body.classList.add("cat-geo");
  if(cat==="Popkultur") document.body.classList.add("cat-pop");
  if(cat==="Allgemein") document.body.classList.add("cat-allgemein");
  if(cat==="Natur") document.body.classList.add("cat-natur");
  if(cat==="Alltag") document.body.classList.add("cat-alltag");
  if(cat==="Alle") document.body.classList.add("cat-alle");

  if(categoryPulseTimer){clearTimeout(categoryPulseTimer);categoryPulseTimer=null;}
  void document.body.offsetWidth;
  document.body.classList.add("categoryPulse");
  categoryPulseTimer=setTimeout(function(){
    document.body.classList.remove("categoryPulse");
    categoryPulseTimer=null;
  },550);
}
function syncCategoryUI(){
  var deck=byId("categoryDeck"),cards=deck.querySelectorAll(".categoryCard");
  for(var i=0;i<cards.length;i++){
    var cat=cards[i].getAttribute("data-category");
    cards[i].classList.toggle("selected", selectedCategories.indexOf(cat)!==-1);
  }
  for(var j=0;j<cards.length;j++){
    cards[j].setAttribute("aria-pressed",cards[j].classList.contains("selected")?"true":"false");
  }
}
function toggleCategory(cat){
  if(cat==="Alle"){
    selectedCategories=["Alle"];
    saveSelectedCategories();
    syncCategoryUI();
    updateToolbar();
    tone(430,0.045,0.012,"sine",0);
    return;
  }
  var idx=selectedCategories.indexOf(cat);
  if(selectedCategories.indexOf("Alle")!==-1) selectedCategories=[];
  if(idx!==-1){
    selectedCategories.splice(idx,1);
  }else{
    selectedCategories.push(cat);
  }
  if(selectedCategories.length===0) selectedCategories=["Alle"];
  saveSelectedCategories();
  syncCategoryUI();
  updateToolbar();
  tone(430,0.045,0.012,"sine",0);
}
function selectedCategoryLabel(){
  if(selectedCategories.indexOf("Alle")!==-1) return "Alle";
  if(selectedCategories.length<=2) return selectedCategories.join(" · ");
  return selectedCategories.length+" Kategorien";
}
function initCategories(){
  var seen={},cats=["Alle"];
  var categorySource=gameMode==="classic"?classicWords:bank;
  for(var i=0;i<categorySource.length;i++) if(!seen[categorySource[i].cat]){seen[categorySource[i].cat]=true;cats.push(categorySource[i].cat);}
  var deck=byId("categoryDeck");
  deck.innerHTML="";
  for(var j=0;j<cats.length;j++){
    var c=cats[j];

    var b=document.createElement("button");
    b.type="button";b.className="categoryCard";b.setAttribute("aria-pressed","false");
    b.setAttribute("data-category",c);
    var em=document.createElement("span");em.className="categoryEmoji";em.textContent=categoryIcons[c]||"🎲";
    var nm=document.createElement("span");nm.className="categoryName";nm.textContent=c;
    b.appendChild(em);b.appendChild(nm);
    b.addEventListener("click",function(){toggleCategory(this.getAttribute("data-category"));});
    deck.appendChild(b);
  }
  loadSavedCategories();
  syncCategoryUI();
}
function getOldNames(){
  var nodes=byId("names").querySelectorAll("input"),arr=[];
  for(var i=0;i<nodes.length;i++)arr.push(nodes[i].value);
  if(arr.length===0&&savedPlayerNames.length)return savedPlayerNames.slice();
  return arr;
}
function renderNames(){
  var old=getOldNames(),box=byId("names");box.innerHTML="";
  while(avatarSelections.length<count) avatarSelections.push(avatarPool[avatarSelections.length%avatarPool.length]);
  for(var i=0;i<count;i++){
    (function(index){
      var row=document.createElement("div");row.className="playerRow";

      var av=document.createElement("button");
      av.type="button";av.className="playerAvatarButton";
      av.textContent=avatarSelections[index]||avatarPool[index%avatarPool.length];
      av.setAttribute("aria-label","Avatar für Spieler "+(index+1)+" ändern");
      av.addEventListener("click",function(){
        var cur=avatarPool.indexOf(avatarSelections[index]);
        cur=(cur+1)%avatarPool.length;
        avatarSelections[index]=avatarPool[cur];
        av.textContent=avatarSelections[index];
        savePlayers();
        tone(500+cur*8,0.04,0.012,"sine",0);
      });

      var inp=document.createElement("input");
      inp.type="text";inp.className="playerInput";inp.autocomplete="off";inp.maxLength=24;
      inp.value=old[index]||("Spieler "+(index+1));inp.placeholder="Spieler "+(index+1);
      inp.addEventListener("input",savePlayers);
      inp.addEventListener("blur",savePlayers);

      row.appendChild(av);row.appendChild(inp);box.appendChild(row);
    })(i);
  }
  byId("minus").disabled=count<=3;byId("plus").disabled=count>=12;
  syncSetupScrollFit();
}
function start(){
  var nodes=byId("names").querySelectorAll("input"),names=[],set=Object.create(null);
  if(nodes.length<count){byId("error").textContent="Spielerliste konnte nicht vollständig geladen werden.";return;}
  for(var i=0;i<count;i++){
    var n=cleanPlayerName(nodes[i].value);
    if(!n){byId("error").textContent="Bitte für jeden Spieler einen Namen eintragen.";return;}
    var key=n.toLocaleLowerCase("de-DE");
    if(set[key]){byId("error").textContent="Jeder Spieler braucht einen anderen Namen.";return;}
    set[key]=true;
    names.push(n);
  }
  byId("error").textContent="";
  players=[];
  for(var k=0;k<names.length;k++) players.push({name:names[k],avatar:avatarSelections[k]||avatarPool[k%avatarPool.length],guess:null});
  savePlayers();
  round=0;
  diagRoundDirty=false;
  resetImpostorFairness();
  diagLog("Partie","Gestartet mit "+players.length+" Spielern · "+(gameMode==="classic"?"Impostor":"Circa"));
  if(gameMode==="classic")classicNewRound(false);
  else newRound(false);
}

function randomUnit(){
  try{
    if(window.crypto&&window.crypto.getRandomValues){
      var a=new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return a[0]/4294967296;
    }
  }catch(e){}
  return Math.random();
}
function resetImpostorFairness(){
  impostorSessionCounts=[];
  for(var i=0;i<players.length;i++)impostorSessionCounts.push(0);
  impostorRecent=[];
}
function ensureImpostorFairnessState(){
  if(impostorSessionCounts.length!==players.length)resetImpostorFairness();
}
function boundedProbabilities(weights,minP,maxP){
  var n=weights.length;
  if(!n)return [];

  minP=Math.max(0,Number(minP)||0);
  maxP=Math.max(minP,Number(maxP)||1);

  /* Fallback only if callers ever provide mathematically impossible bounds. */
  if(minP*n>1+1e-12||maxP*n<1-1e-12){
    var uniform=[];
    for(var u=0;u<n;u++)uniform.push(1/n);
    return uniform;
  }

  var clean=[],result=new Array(n),active=[],i;
  for(i=0;i<n;i++){
    var w=Number(weights[i]);
    if(w===Infinity)w=1e100;
    if(!isFinite(w)||w<=0)w=1e-100;
    clean.push(Math.min(1e100,Math.max(1e-100,w)));
    active.push(i);
  }

  var remaining=1;
  while(active.length){
    var sumWeight=0;
    for(i=0;i<active.length;i++)sumWeight+=clean[active[i]];
    if(!isFinite(sumWeight)||sumWeight<=0)sumWeight=active.length;

    var next=[],changed=false;
    for(i=0;i<active.length;i++){
      var idx=active[i];
      var share=remaining*(clean[idx]/sumWeight);
      if(share<minP-1e-12){
        result[idx]=minP;
        remaining-=minP;
        changed=true;
      }else if(share>maxP+1e-12){
        result[idx]=maxP;
        remaining-=maxP;
        changed=true;
      }else{
        next.push(idx);
      }
    }

    if(!changed){
      var finalWeight=0;
      for(i=0;i<active.length;i++)finalWeight+=clean[active[i]];
      if(!isFinite(finalWeight)||finalWeight<=0)finalWeight=active.length;
      for(i=0;i<active.length;i++){
        var finalIdx=active[i];
        result[finalIdx]=remaining*(clean[finalIdx]/finalWeight);
      }
      remaining=0;
      break;
    }
    active=next;
  }

  /* Correct only floating-point dust without ever leaving the configured bounds. */
  var sum=0;
  for(i=0;i<n;i++)sum+=result[i];
  var diff=1-sum;
  if(Math.abs(diff)>1e-12){
    for(i=0;i<n&&Math.abs(diff)>1e-12;i++){
      var room=diff>0?(maxP-result[i]):(result[i]-minP);
      if(room<=0)continue;
      var move=Math.min(Math.abs(diff),room);
      if(diff>0){result[i]+=move;diff-=move;}
      else{result[i]-=move;diff+=move;}
    }
  }
  return result;
}
function impostorProbabilities(){
  ensureImpostorFairnessState();
  var n=players.length;

  /* 5+ players keep equal random probabilities. */
  if(n!==3&&n!==4){
    var uniform=[];
    for(var u=0;u<n;u++)uniform.push(1/n);
    return uniform;
  }

  /* 3 players: 25–45 %. 4 players: 20–35 %.
     No player can ever be excluded, even after hundreds of rounds. */
  var minP=n===3?0.25:0.20;
  var maxP=n===3?0.45:0.35;
  var fairnessStrength=1.20;

  var totalSelections=0;
  for(var c=0;c<n;c++)totalSelections+=impostorSessionCounts[c]||0;
  var expected=totalSelections/n;
  var weights=[];

  for(var i=0;i<n;i++){
    var deficit=expected-(impostorSessionCounts[i]||0);
    var weight=Math.exp(fairnessStrength*deficit);

    /* The previous Impostor gets a penalty, but never a ban. */
    if(impostorRecent.length&&impostorRecent[impostorRecent.length-1]===i){
      weight*=0.62;
    }
    weights.push(weight);
  }

  return boundedProbabilities(weights,minP,maxP);
}
function selectImpostor(){
  var probabilities=impostorProbabilities();
  var roll=randomUnit(),cursor=0,chosen=probabilities.length-1;

  for(var i=0;i<probabilities.length;i++){
    cursor+=probabilities[i];
    if(roll<cursor){chosen=i;break;}
  }

  ensureImpostorFairnessState();
  impostorSessionCounts[chosen]=(impostorSessionCounts[chosen]||0)+1;
  impostorRecent.push(chosen);
  if(impostorRecent.length>2)impostorRecent.shift();

  var probParts=[];
  for(var pi=0;pi<probabilities.length;pi++){
    var pn=players[pi]?players[pi].name:("Spieler "+(pi+1));
    probParts.push(pn+" "+(probabilities[pi]*100).toFixed(1)+"%");
  }
  diagLog("Impostor","Gewählt: "+(players[chosen]?players[chosen].name:("Spieler "+(chosen+1)))+" · "+probParts.join(" · "));
  return chosen;
}
function rollbackCurrentImpostorSelection(){
  /* Aborted unfinished rounds do not affect the following weighting. */
  ensureImpostorFairnessState();
  if(impIndex>=0&&impIndex<impostorSessionCounts.length&&impostorSessionCounts[impIndex]>0){
    impostorSessionCounts[impIndex]--;
  }
  if(impostorRecent.length&&impostorRecent[impostorRecent.length-1]===impIndex){
    impostorRecent.pop();
  }
}

function questionConceptKey(text){
  return String(text||"")
    .toLocaleLowerCase("de-DE")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[–—-]/g," ")
    .replace(/[?!.,:;()]/g," ")
    .replace(/\b(grob|ungefahr|etwa|geschatzt|circa|ca)\b/g," ")
    .replace(/\s+/g," ").trim();
}
function questionByQid(qid){
  for(var i=0;i<bank.length;i++)if(bank[i].qid===qid)return bank[i];
  return null;
}
function pickRound(){
  for(var i=0;i<players.length;i++)players[i].guess=null;

  var allCats=[],seenCats={};
  for(var j=0;j<bank.length;j++){
    if(!seenCats[bank[j].cat]){seenCats[bank[j].cat]=true;allCats.push(bank[j].cat);}
  }
  var requestedCats=selectedCategories.indexOf("Alle")!==-1?allCats:selectedCategories.slice();
  if(!requestedCats.length)requestedCats=allCats;

  /* Keep category weighting fair, but only include categories that have
     questions in the selected difficulty band. */
  var cats=[];
  for(var c=0;c<requestedCats.length;c++){
    var hasMatch=false;
    for(var q=0;q<bank.length;q++){
      if(bank[q].cat===requestedCats[c]&&difficultyFits(bank[q],selectedDifficulty)){
        hasMatch=true;break;
      }
    }
    if(hasMatch)cats.push(requestedCats[c]);
  }
  if(!cats.length)return false;

  var chosenCat=cats[Math.floor(Math.random()*cats.length)];
  var eligible=[];
  for(var k=0;k<bank.length;k++){
    if(bank[k].cat===chosenCat&&difficultyFits(bank[k],selectedDifficulty))eligible.push(k);
  }

  var key=deckKey(chosenCat,selectedDifficulty);
  if(!deckProgress[key])deckProgress[key]=[];

  /* Prevent near-identical concepts from resurfacing in the same deck cycle.
     The database keeps every QID, but wording variants such as
     "ungefähr / etwa / grob geschätzt" no longer feel like repeats. */
  var usedConcepts={};
  for(var dp=0;dp<deckProgress[key].length;dp++){
    var usedItem=questionByQid(deckProgress[key][dp]);
    if(!usedItem)continue;
    usedConcepts[questionConceptKey(usedItem.normal)]=true;
    usedConcepts[questionConceptKey(usedItem.imp)]=true;
  }

  var unplayed=[];
  var pool=[];
  for(var a=0;a<eligible.length;a++){
    var idx=eligible[a],candidate=bank[idx];
    if(deckProgress[key].indexOf(candidate.qid)!==-1)continue;
    unplayed.push(idx);

    var normalConcept=questionConceptKey(candidate.normal);
    var impConcept=questionConceptKey(candidate.imp);
    if(!usedConcepts[normalConcept]&&!usedConcepts[impConcept])pool.push(idx);
  }

  /* Concept diversity is a preference, never a reason to discard unplayed
     QIDs. Only reset after every eligible QID was actually used once. */
  if(pool.length===0&&unplayed.length)pool=unplayed.slice();
  if(pool.length===0){
    deckProgress[key]=[];
    storageSet(STORAGE_DECK,deckProgress);
    pool=eligible.slice();
  }

  if(!pool.length)return false;
  var chosen=pool[Math.floor(Math.random()*pool.length)];
  current=bank[chosen];
  rememberQuestion(current);
  impIndex=selectImpostor();
  active=0;round++;
  updateToolbar();
  diagLog("Runde","R"+round+" · "+current.qid+" · "+current.cat+" · "+diagDifficultyName(current));
  return true;
}
function prepareHandoff(){
  byId("handoffName").textContent="Handy an "+players[active].name;
  byId("handoffAvatar").textContent=players[active].avatar||"😎";
  byId("showQuestion").textContent=gameMode==="classic"?"Meine Rolle anzeigen":"Ich bin bereit";
  show("handoff");
}
function animateHandoff(){
  var hi=byId("handoffInner");
  hi.classList.remove("handoffPop");void hi.offsetWidth;hi.classList.add("handoffPop");
  soundHandoff();
}

function clearClassicTimer(){
  if(classicTimerHandle){clearInterval(classicTimerHandle);classicTimerHandle=null;}
}
function resetClassicTimerRuntime(){
  clearClassicTimer();
  classicTimerRemaining=0;
  classicTimerPaused=false;
  classicTimerDeadline=0;
  classicTimerExpiredSignaled=false;
}
function syncClassicTimerFromClock(){
  if(!classicTimerPaused&&classicTimerDeadline>0){
    classicTimerRemaining=Math.max(0,Math.ceil((classicTimerDeadline-Date.now())/1000));
  }
  return classicTimerRemaining;
}
function renderClassicTimer(){
  syncClassicTimerFromClock();
  var value=byId("classicTimerValue"),note=byId("classicTimerNote"),pause=byId("classicTimerPause");
  if(!value||!note)return;
  if(classicTimerRemaining<=0){
    value.textContent="0:00";
    note.textContent="Zeit abgelaufen – ihr könnt jetzt auflösen.";
    if(pause){pause.textContent="Zeit abgelaufen";pause.disabled=true;}
    return;
  }
  value.textContent=classicTimerLabel(classicTimerRemaining);
  if(classicTimerPaused){
    note.textContent="Timer pausiert.";
    if(pause){pause.textContent="▶ Fortsetzen";pause.disabled=false;}
  }else{
    note.textContent="Diskutiert, bis ihr euch sicher seid.";
    if(pause){pause.textContent="⏸ Pause";pause.disabled=false;}
  }
}
function signalClassicTimerExpired(){
  if(classicTimerExpiredSignaled)return;
  classicTimerExpiredSignaled=true;
  clearClassicTimer();
  classicTimerRemaining=0;
  renderClassicTimer();

  var expiredAgo=classicTimerDeadline?Date.now()-classicTimerDeadline:0;
  if(expiredAgo<1500){
    tone(620,0.12,0.03,"sine",0);
    tone(440,0.16,0.025,"sine",0.11);
    softHaptic([40,30,70]);
  }
  var boxEl=byId("classicTimerBox");
  if(boxEl){
    boxEl.classList.remove("timerExpired");void boxEl.offsetWidth;boxEl.classList.add("timerExpired");
  }
}
function tickClassicTimer(){
  syncClassicTimerFromClock();
  if(classicTimerRemaining<=0){
    signalClassicTimerExpired();
    return;
  }
  renderClassicTimer();
}
function runClassicTimer(){
  clearClassicTimer();
  if(classicTimerPaused||classicTimerRemaining<=0)return;
  if(!classicTimerDeadline)classicTimerDeadline=Date.now()+classicTimerRemaining*1000;
  tickClassicTimer();
  if(classicTimerRemaining>0)classicTimerHandle=setInterval(tickClassicTimer,250);
}
function toggleClassicTimerPause(){
  if(!classicTimerSeconds)return;
  syncClassicTimerFromClock();
  if(classicTimerRemaining<=0)return;

  if(classicTimerPaused){
    classicTimerPaused=false;
    classicTimerDeadline=Date.now()+classicTimerRemaining*1000;
    runClassicTimer();
  }else{
    classicTimerPaused=true;
    classicTimerDeadline=0;
    clearClassicTimer();
    renderClassicTimer();
  }
  tone(classicTimerPaused?330:500,0.04,0.012,"sine",0);
}
function startClassicTimer(){
  resetClassicTimerRuntime();
  var box=byId("classicTimerBox");
  if(!classicTimerSeconds){
    box.classList.add("hidden");
    return;
  }
  classicTimerRemaining=classicTimerSeconds;
  classicTimerDeadline=Date.now()+classicTimerSeconds*1000;
  box.classList.remove("hidden");
  box.classList.remove("timerExpired");
  renderClassicTimer();
  runClassicTimer();
}
function refreshClassicTimerFromClock(){
  if(gameMode!=="classic"||classicTimerPaused||!classicTimerDeadline||classicResolved)return;
  tickClassicTimer();
}
function classicNewRound(confirmFirst){
  if(confirmFirst && !window.confirm("Aktuelle Runde abbrechen und eine neue Runde starten?"))return;
  if(confirmFirst&&round>0&&!classicResolved)rollbackCurrentImpostorSelection();
  resetClassicTimerRuntime();
  if(typeof clearRevealTimers==="function")clearRevealTimers();
  if(roundIntroTimer){clearTimeout(roundIntroTimer);roundIntroTimer=null;}
  if(guessSaveTimer){clearTimeout(guessSaveTimer);guessSaveTimer=null;}
  diagRoundDirty=false;

  if(!classicPickWord()){
    byId("error").textContent="Für diese Auswahl sind keine Wörter verfügbar.";
    show("setup");
    return;
  }

  var intro=byId("roundIntro");
  byId("roundIntroText").textContent="Runde "+round;
  byId("roundIntroCategory").textContent="IMPOSTOR";
  byId("roundIntroIcon").textContent="🎭";
  intro.classList.remove("hidden","showIntro");
  void intro.offsetWidth;
  intro.classList.add("showIntro");

  prepareHandoff();
  soundNextRound();
  roundIntroTimer=setTimeout(function(){
    intro.classList.add("hidden");
    intro.classList.remove("showIntro");
    roundIntroTimer=null;
    animateHandoff();
  },1700);
}
function classicOpenRole(){
  ensureAudio();
  if(!classicCurrent||!players.length)return;
  var player=players[active],isImp=active===impIndex;
  byId("classicRoleName").textContent=player.name;
  byId("classicRoleAvatar").textContent=player.avatar||"😎";
  byId("classicRoleProgress").textContent=(active+1)+"/"+players.length;

  var word=byId("classicRoleWord"),hint=byId("classicRoleHint"),eyebrow=byId("classicRoleEyebrow");
  word.classList.toggle("impostorWord",isImp);

  if(isImp){
    eyebrow.textContent="DEINE ROLLE";
    word.textContent="DU BIST DER IMPOSTOR";
    if(classicHintEnabled){
      hint.textContent="Hinweis: "+classicCurrent.hint;
    }else{
      hint.textContent="Du kennst das geheime Wort nicht. Hör gut zu und füge dich unauffällig ein.";
    }
  }else{
    eyebrow.textContent="GEHEIMES WORT";
    word.textContent=classicCurrent.word;
    hint.textContent="Merke dir dein Wort und verrate es niemandem.";
  }

  byId("classicRoleDone").textContent=active<players.length-1?"Verstanden · weitergeben":"Verstanden · Runde starten";
  show("classicRole");
  var card=byId("classicRoleCard");
  card.classList.remove("revealFlip");void card.offsetWidth;card.classList.add("revealFlip");
  tone(isImp?260:420,0.06,0.016,"sine",0);
}
function classicRoleDone(){
  ensureAudio();
  if(active<players.length-1){
    active++;
    handoff();
    return;
  }
  classicPrepareDiscussion();
}
function classicPrepareDiscussion(){
  var starter=players[classicDiscussionStarter]||players[0];
  byId("classicDiscussionAvatar").textContent=starter.avatar||"😎";
  byId("classicDiscussionName").textContent=starter.name+" beginnt";
  show("classicDiscussion");
  startClassicTimer();
  tone(360,0.06,0.015,"sine",0);
}
function classicReveal(){
  if(!classicCurrent||!players[impIndex])return;
  resetClassicTimerRuntime();
  classicResolved=true;
  var imp=players[impIndex];
  byId("classicResultIcon").textContent=imp.avatar||"🎭";
  byId("classicResultTitle").textContent=imp.name+" war der Impostor";
  byId("classicSecretWord").textContent=classicCurrent.word;
  show("classicResult");
  soundImpact();
  softHaptic([45,35,70]);
  pulseScreen();
  diagLog("Classic Auflösung","Impostor: "+imp.name+" · Wort: "+classicCurrent.word);
}

function newRound(confirmFirst){
  if(confirmFirst && !window.confirm("Aktuelle Runde abbrechen und eine neue Runde starten?"))return;
  var previousRoundCompleted=roundStatsRecorded;
  if(confirmFirst&&round>0&&!previousRoundCompleted){
    rollbackCurrentImpostorSelection();
  }
  if(typeof clearRevealTimers==="function")clearRevealTimers();
  if(roundIntroTimer){clearTimeout(roundIntroTimer);roundIntroTimer=null;}
  if(guessSaveTimer){clearTimeout(guessSaveTimer);guessSaveTimer=null;}
  guessLocked=false;
  normalQuestionRevealed=false;
  roundStatsRecorded=false;
  roundOutcomeChoice=null;
  diagRoundDirty=false;
  byId("saveGuess").disabled=false;

  if(!pickRound()){
    byId("error").textContent="Für diese Auswahl sind keine Fragen verfügbar.";
    show("setup");
    return;
  }

  var intro=byId("roundIntro");
  byId("roundIntroText").textContent="Runde "+round;
  byId("roundIntroCategory").textContent=current.cat+" · "+difficultyName(selectedDifficulty);
  byId("roundIntroIcon").textContent=categoryIcons[current.cat]||"✨";

  /* Cover the screen first. Only then prepare the first player underneath.
     This prevents the first player's handoff screen from flashing before
     the round/category animation starts. */
  intro.classList.remove("hidden","showIntro");
  void intro.offsetWidth;
  intro.classList.add("showIntro");

  /* The handoff is prepared underneath, but the opaque intro background
     prevents it from becoming visible before its own animation starts. */
  prepareHandoff();
  soundNextRound();

  roundIntroTimer=setTimeout(function(){
    intro.classList.add("hidden");
    intro.classList.remove("showIntro");
    roundIntroTimer=null;
    animateHandoff();
  },1700);
}
function handoff(){
  prepareHandoff();
  animateHandoff();
}
function fitQuestionElement(el){
  var len=el.textContent.length;
  el.classList.remove("longQ","veryLongQ");
  if(len>115) el.classList.add("veryLongQ");
  else if(len>82) el.classList.add("longQ");
}
function fitQuestion(){
  fitQuestionElement(byId("questionText"));
}
function renderProgressDots(){
  var box=byId("progressDots");box.innerHTML="";
  for(var i=0;i<players.length;i++){
    var dot=document.createElement("span");
    dot.className="progressDot "+(i<active?"done":(i===active?"active":"future"));
    box.appendChild(dot);
  }
}
function activeQuestionUnit(){
  if(!current)return "";
  return active===impIndex?current.impUnit:current.normalUnit;
}
function openQuestion(){
  ensureAudio();
  guessLocked=false;
  byId("saveGuess").disabled=false;
  byId("progress").textContent=(active+1)+"/"+players.length;
  byId("currentName").textContent=players[active].name;byId("currentAvatar").textContent=players[active].avatar||"😎";
  byId("questionText").textContent=(active===impIndex?current.imp:current.normal);
  fitQuestion();
  var unit=activeQuestionUnit();
  byId("questionUnitBadge").textContent="Einheit: "+(unit||"–");
  configureSlider(current,unit);
  renderProgressDots();
  show("question");
  var qc=byId("questionCard");
  qc.classList.remove("revealFlip");void qc.offsetWidth;qc.classList.add("revealFlip");
  tone(390,0.05,0.012,"sine",0);
}

function decimals(n){
  var s=String(n),p=s.indexOf(".");
  return p<0?0:s.length-p-1;
}
function formatEstimate(v){
  var step=Number(byId("guessSlider").step)||1;
  var places=decimals(step);
  if(places===0) return Math.round(Number(v)).toLocaleString("de-DE");
  return Number(v).toFixed(places).replace(".",",");
}
function formatCompact(v){
  if(v>=1000000) return (v/1000000).toString().replace(".",",")+" Mio.";
  if(v>=1000) return Math.round(v).toLocaleString("de-DE");
  return String(v).replace(".",",");
}
function configureSlider(item,unitLabel){
  var slider=byId("guessSlider");
  slider.min=0;
  slider.max=item.max;
  slider.step=item.step;
  slider.value=0;
  byId("rangeMax").textContent=formatCompact(item.max);
  byId("estimateUnit").textContent=unitLabel||"";
  var scrub=byId("scrubber");
  scrub.setAttribute("aria-valuemin","0");
  scrub.setAttribute("aria-valuemax",String(item.max));
  lastSliderSoundAt=0;
  lastSliderSoundValue=null;
  updateSliderVisual(true);
}
function updateSliderVisual(silent){
  var slider=byId("guessSlider"),max=Number(slider.max),v=Number(slider.value);
  var pct=max<=0?0:(v/max)*100;
  byId("sliderFill").style.width=pct+"%";
  byId("sliderThumb").style.left=pct+"%";
  var val=byId("estimateValue"),txt=formatEstimate(v);
  val.textContent=txt;
  val.classList.remove("mediumValue","smallValue","valuePulse");
  if(txt.length>=7) val.classList.add("smallValue");
  else if(txt.length>=5) val.classList.add("mediumValue");
  void val.offsetWidth;val.classList.add("valuePulse");

  var scrub=byId("scrubber");
  scrub.setAttribute("aria-valuenow",String(v));
  scrub.setAttribute("aria-valuetext",txt+" "+(current?activeQuestionUnit():""));
  scrub.classList.remove("tickFlash");void scrub.offsetWidth;scrub.classList.add("tickFlash");
  if(!silent)soundTick(v);
}
function setEstimateFromClientX(clientX){
  var rail=byId("sliderRail"),r=rail.getBoundingClientRect();
  var pct=(clientX-r.left)/Math.max(1,r.width);
  pct=Math.max(0,Math.min(1,pct));
  var slider=byId("guessSlider"),max=Number(slider.max),step=Number(slider.step)||1;
  var value=Math.round((pct*max)/step)*step;
  slider.value=Math.max(0,Math.min(max,value));
  updateSliderVisual();
}
function nudge(dir){
  var slider=byId("guessSlider"),step=Number(slider.step)||1;
  slider.value=Math.max(0,Math.min(Number(slider.max),Number(slider.value)+dir*step));
  updateSliderVisual();
}
function saveGuess(){
  if(guessLocked)return;
  ensureAudio();
  var v=Number(byId("guessSlider").value);
  if(!isFinite(v))return;
  guessLocked=true;
  players[active].guess=v;
  diagLog("Schätzung",players[active].name+" = "+formatEstimate(v)+" "+(activeQuestionUnit()||""));

  var btn=byId("saveGuess");
  btn.disabled=true;
  btn.classList.remove("locking");void btn.offsetWidth;btn.classList.add("locking");
  soundLock();

  if(guessSaveTimer)clearTimeout(guessSaveTimer);
  guessSaveTimer=setTimeout(function(){
    guessSaveTimer=null;
    if(active<players.length-1){
      active++;
      handoff();
    }else{
      prepareNormalQuestionReveal();
    }
  },170);
}
function prepareNormalQuestionReveal(){
  normalQuestionRevealed=false;

  var question=byId("normalRevealQuestion");
  question.textContent="?";
  question.classList.remove("longQ","veryLongQ","revealFlip");
  question.classList.add("concealedQuestion");

  byId("normalRevealTitle").textContent="Welche Frage hatten die meisten?";
  byId("normalRevealHint").textContent="Die gemeinsame Frage bleibt noch einen Moment verdeckt.";

  var unit=byId("normalRevealUnit");
  unit.textContent="Einheit: –";
  unit.classList.add("normalRevealUnitReserved");

  var button=byId("revealNormalQuestion");
  button.disabled=false;
  button.textContent="Richtige Frage aufdecken";

  show("normalReveal");
  tone(300,0.06,0.014,"sine",0);
}

function revealNormalQuestion(){
  ensureAudio();

  if(!normalQuestionRevealed){
    normalQuestionRevealed=true;
    diagLog("Reveal","Richtige Frage aufgedeckt · "+current.qid);

    var question=byId("normalRevealQuestion");
    question.textContent=current.normal;
    question.classList.remove("concealedQuestion","revealFlip");
    fitQuestionElement(question);
    void question.offsetWidth;
    question.classList.add("revealFlip");

    byId("normalRevealTitle").textContent="Das war die richtige Frage";
    byId("normalRevealHint").textContent="Jetzt könnt ihr die Schätzungen miteinander vergleichen.";

    var unit=byId("normalRevealUnit");
    unit.textContent="Einheit: "+(current.normalUnit||"–");
    unit.classList.remove("normalRevealUnitReserved");

    byId("revealNormalQuestion").textContent="Schätzungen anzeigen";

    tone(390,0.07,0.018,"sine",0);
    tone(520,0.09,0.018,"sine",0.08);
    softHaptic([25]);
    pulseScreen();
    return;
  }

  renderAnswers();
  show("answers");
}

var revealStage=0;
var revealTimers=[];
var revealRunToken=0;

function clearRevealTimers(){
  revealRunToken++;
  for(var i=0;i<revealTimers.length;i++) clearTimeout(revealTimers[i]);
  revealTimers=[];
  document.body.classList.remove("revealPulse");
}
function softHaptic(pattern){
  try{
    if(navigator.vibrate) navigator.vibrate(pattern);
  }catch(e){}
}
function pulseScreen(){
  document.body.classList.remove("revealPulse");
  void document.body.offsetWidth;
  document.body.classList.add("revealPulse");
  revealTimers.push(setTimeout(function(){document.body.classList.remove("revealPulse");},350));
}
function renderAnswers(){
  revealStage=0;
  clearRevealTimers();

  byId("answersNormalQuestion").textContent=current.normal;
  byId("answersNormalUnit").textContent="Einheit: "+(current.normalUnit||"–");

  var button=byId("reveal");
  button.disabled=false;
  button.textContent="Impostor aufdecken";
  var box=byId("answerList");
  box.classList.remove("tension");
  box.innerHTML="";
  for(var i=0;i<players.length;i++){
    var tile=document.createElement("div");
    tile.className="answerTile";
    tile.setAttribute("data-player-index",String(i));

    var avatar=document.createElement("div");
    avatar.className="answerTileAvatar";
    avatar.textContent=players[i].avatar||"😎";

    var name=document.createElement("div");
    name.className="answerTileName";
    name.textContent=players[i].name;

    var value=document.createElement("div");
    value.className="answerTileValue";
    value.textContent=formatEstimate(players[i].guess);

    var mark=document.createElement("div");
    mark.className="impostorX";
    mark.textContent="×";

    tile.appendChild(avatar);tile.appendChild(name);tile.appendChild(value);tile.appendChild(mark);
    box.appendChild(tile);
  }
}
function reveal(){
  ensureAudio();

  if(revealStage===0){
    revealStage=1;
    byId("reveal").disabled=true;
    byId("reveal").textContent="Wer ist es…?";
    var grid=byId("answerList"),tiles=grid.querySelectorAll(".answerTile");
    grid.classList.add("tension");

    for(var i=0;i<tiles.length;i++) tiles[i].classList.add("dimmed");
    soundRevealTension();

    var order=[];
    for(var j=0;j<players.length;j++) if(j!==impIndex) order.push(j);
    for(var oi=order.length-1;oi>0;oi--){
      var oj=Math.floor(Math.random()*(oi+1)),tmp=order[oi];
      order[oi]=order[oj];order[oj]=tmp;
    }
    /* Show a couple of harmless candidates first. */
    var steps=Math.min(3,order.length);
    for(var s=0;s<steps;s++){
      (function(idx,delay){
        revealTimers.push(setTimeout(function(){
          for(var z=0;z<tiles.length;z++) tiles[z].classList.remove("focused");
          var t=grid.querySelector('[data-player-index="'+idx+'"]');
          if(t){t.classList.remove("dimmed");t.classList.add("focused");}
          tone(250+delay*.25,0.055,0.018,"sine",0);
        },delay));
      })(order[s],260+s*260);
    }

    var finalDelay=260+steps*260+140;
    revealTimers.push(setTimeout(function(){
      for(var z=0;z<tiles.length;z++){tiles[z].classList.add("dimmed");tiles[z].classList.remove("focused");}
      var tile=grid.querySelector('[data-player-index="'+impIndex+'"]');
      if(tile){
        tile.classList.remove("dimmed");
        tile.classList.add("focused","impostorCaught");
      }
      soundImpact();
      softHaptic([45,35,90]);
      pulseScreen();
      diagLog("Reveal","Impostor: "+(players[impIndex]?players[impIndex].name:"–"));
      byId("reveal").disabled=false;
      byId("reveal").textContent="Auflösung";
    },finalDelay));
    return;
  }

  if(revealStage===1){
    revealStage=2;
    startResolution();
  }
}
function numberString(v,forceInt){
  var n=Number(v);
  if(forceInt || Math.abs(n-Math.round(n))<0.000001) return Math.round(n).toLocaleString("de-DE");
  var places=n<10?2:1;
  return n.toLocaleString("de-DE",{minimumFractionDigits:0,maximumFractionDigits:places});
}
function roundedStart(value){
  var v=Math.abs(Number(value));
  if(v <= 20) return 0;
  if(v <= 200) return Math.floor(v*0.3);
  if(v <= 5000) return Math.floor(v*0.22/5)*5;
  if(v <= 100000) return Math.floor(v*0.18/100)*100;
  return Math.floor(v*0.15/1000)*1000;
}
function animateNumber(el,value,duration,onDone){
  var token=revealRunToken;
  var end=Number(value),start=roundedStart(end),begin=null;
  var whole=Math.abs(end-Math.round(end))<0.000001;
  el.classList.remove("locked");
  function frame(ts){
    if(token!==revealRunToken)return;
    if(begin===null) begin=ts;
    var p=Math.min(1,(ts-begin)/duration);
    var eased=1-Math.pow(1-p,3);
    var now=start+(end-start)*eased;
    if(whole) now=Math.round(now);
    el.textContent=numberString(now,whole);
    if(p<1) requestAnimationFrame(frame);
    else{
      if(token!==revealRunToken)return;
      el.textContent=numberString(end,whole);
      el.classList.add("locked");
      softHaptic([30,25,55]);
      soundCorrect();
      if(onDone) onDone();
    }
  }
  requestAnimationFrame(frame);
}

function playerTargetValue(index){
  return index===impIndex?Number(current.impValue):Number(current.normalValue);
}
function errorPercent(guess,target){
  if(target===0) return Math.abs(guess-target)*100;
  return Math.abs(guess-target)/Math.abs(target)*100;
}
function buildAwards(){
  if(!players.length) return;
  var stats=roundPerformance();
  var closest=stats[0],wild=stats[stats.length-1];

  var c=byId("closestAward");
  c.className="awardCard closest";
  c.innerHTML='<div class="awardEyebrow">'+closest.avatar+' &nbsp;🎯 AM NÄCHSTEN</div>'+
    '<div class="awardTitle"></div><div class="awardDetail"></div>';
  c.querySelector(".awardTitle").textContent=closest.name;
  c.querySelector(".awardDetail").textContent=formatEstimatePercent(closest.err)+" daneben";

  var w=byId("wildAward");
  w.className="awardCard wild";
  w.innerHTML='<div class="awardEyebrow">'+wild.avatar+' &nbsp;😵 WILDESTE SCHÄTZUNG</div>'+
    '<div class="awardTitle"></div><div class="awardDetail"></div>';
  w.querySelector(".awardTitle").textContent=wild.name;
  w.querySelector(".awardDetail").textContent=formatEstimatePercent(wild.err)+" daneben";
}
function formatEstimatePercent(v){
  if(v<1) return v.toLocaleString("de-DE",{maximumFractionDigits:1})+" %";
  return Math.round(v).toLocaleString("de-DE")+" %";
}

function startResolution(){
  clearRevealTimers();
  byId("normalQ").textContent=current.normal;
  byId("normalAnswer").textContent=current.normalAnswer;
  byId("normalAnswer").classList.remove("visible");
  byId("normalCounter").textContent=numberString(roundedStart(current.normalValue), Math.abs(Number(current.normalValue)-Math.round(Number(current.normalValue)))<0.000001);
  byId("normalCounter").classList.remove("locked");

  byId("impostorQ").textContent=current.imp;
  byId("impAnswer").textContent=current.impAnswer;
  byId("impAnswer").classList.remove("visible");
  byId("impCounter").textContent=numberString(roundedStart(current.impValue), Math.abs(Number(current.impValue)-Math.round(Number(current.impValue)))<0.000001);
  byId("impCounter").classList.remove("locked");

  byId("impResolution").classList.add("hidden");
  byId("impResolution").classList.remove("reveal");
  byId("resultActions").classList.add("hidden");
  byId("roundAwards").classList.add("hidden");
  byId("impostorOutcome").classList.add("hidden");
  byId("impostorWonYes").classList.remove("selected");
  byId("impostorWonNo").classList.remove("selected");
  byId("impostorWonYes").setAttribute("aria-pressed","false");
  byId("impostorWonNo").setAttribute("aria-pressed","false");
  byId("impostorOutcomeName").textContent=players[impIndex]?players[impIndex].name:"der Impostor";
  byId("impostorOutcomeAvatar").textContent=players[impIndex]?(players[impIndex].avatar||"🎭"):"🎭";
  byId("spicyNote").classList.toggle("hidden",current.cat!=="Spicy 🌶️");

  show("result");
  pulseScreen();

  revealTimers.push(setTimeout(function(){
    tone(300,0.08,0.018,"sine",0);
    tone(380,0.08,0.018,"sine",0.22);
    tone(470,0.08,0.018,"sine",0.44);
    animateNumber(byId("normalCounter"),current.normalValue,1450,function(){
      byId("normalAnswer").classList.add("visible");
      revealTimers.push(setTimeout(function(){
        var panel=byId("impResolution");
        panel.classList.remove("hidden");
        panel.classList.add("reveal");
        softHaptic([25]);
        revealTimers.push(setTimeout(function(){
          animateNumber(byId("impCounter"),current.impValue,1200,function(){
            byId("impAnswer").classList.add("visible");
            revealTimers.push(setTimeout(function(){
              buildAwards();
              recordRoundBaseStats();
              byId("roundAwards").classList.remove("hidden");
              byId("impostorOutcome").classList.remove("hidden");
            },300));
          });
        },320));
      },700));
    });
  },350));
}
function leaveGame(){
  if(!window.confirm("Spiel verlassen und zurück zum Start?"))return;
  if(roundIntroTimer){clearTimeout(roundIntroTimer);roundIntroTimer=null;}
  if(guessSaveTimer){clearTimeout(guessSaveTimer);guessSaveTimer=null;}
  resetClassicTimerRuntime();
  var intro=byId("roundIntro");
  if(intro){intro.classList.add("hidden");intro.classList.remove("showIntro");}
  if(typeof clearRevealTimers==="function")clearRevealTimers();
  guessLocked=false;
  roundStatsRecorded=false;
  roundOutcomeChoice=null;
  var saveGuessButton=byId("saveGuess");
  if(saveGuessButton)saveGuessButton.disabled=false;
  players=[];active=0;round=0;current=null;
  classicCurrent=null;classicResolved=false;
  impostorSessionCounts=[];impostorRecent=[];
  byId("error").textContent="";
  updateToolbar();
  show("setup");
}


/* -------------------------- hidden diagnostics -------------------------- */
var diagSessionKey="ci.diag.session.v1";
var diagTapTimes=[];
var diagFailures=0;
var diagLockedUntil=0;
var diagEvents=[];

function diagUnlocked(){
  try{return sessionStorage.getItem(diagSessionKey)==="1";}catch(e){return false;}
}
function setDiagUnlocked(value){
  try{
    if(value)sessionStorage.setItem(diagSessionKey,"1");
    else sessionStorage.removeItem(diagSessionKey);
  }catch(e){}
  syncDiagVisibility();
}
function syncDiagVisibility(){
  var unlocked=diagUnlocked();
  var items=document.querySelectorAll(".devOnly");
  for(var i=0;i<items.length;i++)items[i].classList.toggle("hidden",!unlocked);
}
function openDiagGate(){
  if(diagUnlocked()){openDiagPanel();return;}
  byId("devPinInput").value="";
  byId("devGateError").textContent="";
  byId("devGateOverlay").classList.remove("hidden");
  byId("devGateOverlay").setAttribute("aria-hidden","false");
  setTimeout(function(){try{byId("devPinInput").focus();}catch(e){}},80);
}
function closeDiagGate(){
  byId("devGateOverlay").classList.add("hidden");
  byId("devGateOverlay").setAttribute("aria-hidden","true");
  byId("devPinInput").value="";
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
async function verifyDiagEntry(value){
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
async function submitDiagGate(){
  var now=Date.now();
  if(now<diagLockedUntil){
    var left=Math.ceil((diagLockedUntil-now)/1000);
    byId("devGateError").textContent="Bitte "+left+" Sekunden warten.";
    return;
  }
  var value=byId("devPinInput").value.trim();
  if(value.length!==6||!/^[0-9]+$/.test(value)){
    byId("devGateError").textContent="Ungültige Eingabe.";
    return;
  }

  byId("devGateSubmit").disabled=true;
  byId("devGateError").textContent="Prüfe …";
  var ok=false;
  try{ok=await verifyDiagEntry(value);}catch(e){ok=false;}
  byId("devGateSubmit").disabled=false;

  if(ok){
    diagFailures=0;
    diagLockedUntil=0;
    setDiagUnlocked(true);
    closeDiagGate();
    openDiagPanel();
    return;
  }

  diagFailures++;
  byId("devPinInput").value="";
  if(diagFailures>=5){
    diagFailures=0;
    diagLockedUntil=Date.now()+30000;
    byId("devGateError").textContent="Zu viele Versuche. 30 Sekunden gesperrt.";
  }else{
    byId("devGateError").textContent="Zugriff nicht möglich.";
  }
}
function diagVisibleSection(){
  for(var i=0;i<sections.length;i++){
    var el=byId(sections[i]);
    if(el&&!el.classList.contains("hidden"))return sections[i];
  }
  return "–";
}
function diagDifficultyName(item){
  if(!item)return "–";
  var r=difficultyRatio(item);
  if(r<=1.30)return "Leicht";
  if(r<=1.80)return "Mittel";
  return "Schwer";
}
function diagEsc(value){
  return String(value===undefined||value===null?"–":value)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function diagSessionHtml(){
  var activePlayers=players.length?players.length:count;
  var rows=[
    '<div class="k">Version</div><div class="v">V'+diagEsc(config.version||"–")+'</div>',
    '<div class="k">Spiel</div><div class="v">'+(gameMode==="classic"?"Klassisches Imposter":"Circa Imposter")+'</div>',
    '<div class="k">Ansicht</div><div class="v">'+diagEsc(diagVisibleSection())+'</div>',
    '<div class="k">Spieler</div><div class="v">'+activePlayers+'</div>',
    '<div class="k">Runde</div><div class="v">'+(round||0)+'</div>',
    '<div class="k">DEV manipuliert</div><div class="v">'+(diagRoundDirty?"Ja":"Nein")+'</div>',
    '<div class="k">Sound</div><div class="v">'+(soundEnabled?"An":"Aus")+' · '+diagEsc(audioCtx?audioCtx.state:"nicht initialisiert")+'</div>'
  ];
  if(gameMode==="classic"){
    rows.push('<div class="k">Hinweis</div><div class="v">'+(classicHintEnabled?"An":"Aus")+'</div>');
    rows.push('<div class="k">Timer</div><div class="v">'+diagEsc(classicTimerLabel(classicTimerSeconds))+'</div>');
  }else{
    rows.push('<div class="k">Geräterunden</div><div class="v">'+(deviceStats&&deviceStats.roundsPlayed||0)+'</div>');
  }
  return rows.join("");
}
function diagImpostorHtml(){
  if(!players.length){
    return '<div class="devQuestionMeta">Noch keine laufende Partie. Die Fairness startet beim Spielstart neutral.</div>';
  }
  ensureImpostorFairnessState();
  var probs=impostorProbabilities();
  var rows=[];
  for(var i=0;i<players.length;i++){
    rows.push(
      '<div class="devProbRow">'+
      '<div class="devProbName">'+diagEsc((players[i].avatar||"")+" "+players[i].name)+'</div>'+
      '<div class="devProbChance">'+(probs[i]*100).toFixed(1).replace(".",",")+' %</div>'+
      '<div class="devProbCount">'+(impostorSessionCounts[i]||0)+'×</div>'+
      '</div>'
    );
  }
  var currentImp=(round>0&&players[impIndex])?diagEsc(players[impIndex].name):"–";
  var recent="–";
  if(impostorRecent.length){
    var recentNames=[];
for(var r=0;r<impostorRecent.length;r++){
      var rp=players[impostorRecent[r]];
      if(rp)recentNames.push(diagEsc(rp.name));
    }
    if(recentNames.length)recent=recentNames.join(" → ");
  }
  rows.push('<div class="devQuestionMeta" style="margin-top:7px">Aktueller Impostor: <strong>'+currentImp+'</strong><br>Letzte Auswahl: '+recent+'<br>Prozentwerte = Chance für die nächste Auswahl.</div>');
  return rows.join("");
}
function diagQuestionHtml(){
  if(!current){
    return '<div class="devQuestionMeta">Noch kein Fragepaar aktiv.</div>';
  }
  return [
    '<div class="devKv">',
      '<div class="k">QID</div><div class="v">'+diagEsc(current.qid)+'</div>',
      '<div class="k">Kategorie</div><div class="v">'+diagEsc(current.cat)+'</div>',
      '<div class="k">Schwierigkeit</div><div class="v">'+diagEsc(diagDifficultyName(current))+' · Ratio '+difficultyRatio(current).toFixed(2)+'</div>',
    '</div>',
    '<div class="devQuestionText"><strong>Normal:</strong> '+diagEsc(current.normal)+'</div>',
    '<div class="devQuestionMeta">'+diagEsc(current.normalValue)+' '+diagEsc(current.normalUnit||"")+' · '+diagEsc(current.normalAnswer||"")+'</div>',
    '<div class="devQuestionText"><strong>Impostor:</strong> '+diagEsc(current.imp)+'</div>',
    '<div class="devQuestionMeta">'+diagEsc(current.impValue)+' '+diagEsc(current.impUnit||"")+' · '+diagEsc(current.impAnswer||"")+'</div>'
  ].join("");
}
function diagClassicWordHtml(){
  var item=classicCurrent||diagClassicPinnedWord;
  if(!item){
    return '<div class="devQuestionMeta">Noch kein geheimes Wort aktiv.</div>';
  }
  return [
    '<div class="devKv">',
      '<div class="k">WID</div><div class="v">'+diagEsc(item.wid)+'</div>',
      '<div class="k">Kategorie</div><div class="v">'+diagEsc(item.cat)+'</div>',
      '<div class="k">Wort</div><div class="v">'+diagEsc(item.word)+'</div>',
      '<div class="k">Hinweis</div><div class="v">'+diagEsc(item.hint||"–")+'</div>',
    '</div>',
    '<div class="devQuestionMeta" style="margin-top:7px">Die Kategorie bleibt im normalen Spiel verborgen und ist nur hier im DEV sichtbar.</div>'
  ].join("");
}
function diagClassicStorageHtml(){
  var deckUsed=0,deckKeys=0;
  try{
    var keys=Object.keys(classicDeckProgress||{});
    deckKeys=keys.length;
    for(var i=0;i<keys.length;i++){
      if(Array.isArray(classicDeckProgress[keys[i]]))deckUsed+=classicDeckProgress[keys[i]].length;
    }
  }catch(e){}
  return [
    '<div class="k">Wortbank</div><div class="v">'+classicWords.length+' Wörter</div>',
    '<div class="k">Im Deck markiert</div><div class="v">'+deckUsed+'</div>',
    '<div class="k">Deck-Kategorien</div><div class="v">'+deckKeys+'</div>',
    '<div class="k">Auswahl</div><div class="v">'+diagEsc(selectedCategories.join(", "))+'</div>',
    '<div class="k">Hinweis</div><div class="v">'+(classicHintEnabled?"An":"Aus")+'</div>',
    '<div class="k">Timer</div><div class="v">'+diagEsc(classicTimerLabel(classicTimerSeconds))+'</div>'
  ].join("");
}

function diagStorageHtml(){
  if(gameMode==="classic")return diagClassicStorageHtml();
  var statPlayers=0,deckKeys=0;
  try{statPlayers=Object.keys(playerStats||{}).length;}catch(e){}
  try{deckKeys=Object.keys(deckProgress||{}).length;}catch(e){}
  return [
    '<div class="k">Statistik-Spieler</div><div class="v">'+statPlayers+'</div>',
    '<div class="k">Erfolgreich gespielte Fragepaare</div><div class="v">'+completedQuestionCount()+' / '+bank.length+'</div>',
    '<div class="k">Deck-Fortschritte</div><div class="v">'+deckKeys+'</div>',
    '<div class="k">Schwierigkeit</div><div class="v">'+diagEsc(difficultyName(selectedDifficulty))+'</div>',
    '<div class="k">Kategorien</div><div class="v">'+diagEsc(selectedCategories.join(", "))+'</div>'
  ].join("");
}

function diagLog(type,text){
  var now=new Date();
  var hh=String(now.getHours()).padStart(2,"0");
  var mm=String(now.getMinutes()).padStart(2,"0");
  var ss=String(now.getSeconds()).padStart(2,"0");
  diagEvents.push({time:hh+":"+mm+":"+ss,type:String(type||"Event"),text:String(text||"")});
  if(diagEvents.length>40)diagEvents.splice(0,diagEvents.length-40);
  if(byId("devEventLog"))renderDiagLog();
}
function renderDiagLog(){
  var box=byId("devEventLog");
  if(!box)return;
  if(!diagEvents.length){
    box.innerHTML='<div class="devLogEmpty">Noch keine Ereignisse in dieser Sitzung.</div>';
    return;
  }
  var rows=[];
  for(var i=diagEvents.length-1;i>=0;i--){
    var e=diagEvents[i];
    rows.push(
      '<div class="devLogItem">'+
      '<div class="devLogTime">'+diagEsc(e.time)+'</div>'+
      '<div class="devLogType">'+diagEsc(e.type)+'</div>'+
      '<div class="devLogText">'+diagEsc(e.text)+'</div>'+
      '</div>'
    );
  }
  box.innerHTML=rows.join("");
}
function clearDiagLog(){
  diagEvents=[];
  renderDiagLog();
}
function diagSetStatus(id,text,isError){
  var el=byId(id);
  if(!el)return;
  el.textContent=text||"";
  el.classList.toggle("error",!!isError);
}
function diagMarkRoundDirty(reason){
  diagRoundDirty=true;
  if(reason)diagLog("DEV",reason);
}
var diagClassicPinnedWord=null;

function populateDiagClassicWordFilters(){
  var select=byId("devClassicWordCategory");
  if(!select||select.options.length)return;
  var cats=[],seen={};
  for(var i=0;i<classicWords.length;i++){
    if(!seen[classicWords[i].cat]){seen[classicWords[i].cat]=true;cats.push(classicWords[i].cat);}
  }
  cats.sort(function(a,b){return a.localeCompare(b,"de");});
  var all=document.createElement("option");
  all.value="Alle";all.textContent="Alle Kategorien";
  select.appendChild(all);
  for(var c=0;c<cats.length;c++){
    var opt=document.createElement("option");
    opt.value=cats[c];opt.textContent=cats[c];
    select.appendChild(opt);
  }
}
function findDiagClassicWordByWid(wid){
  var needle=String(wid||"").trim().toLowerCase();
  if(!needle)return null;
  for(var i=0;i<classicWords.length;i++){
    if(String(classicWords[i].wid).toLowerCase()===needle)return classicWords[i];
  }
  return null;
}
function diagRenderClassicResultInstant(){
  if(!players.length||!classicCurrent||!players[impIndex])return;
  clearClassicTimer();
  classicResolved=true;
  var imp=players[impIndex];
  byId("classicResultIcon").textContent=imp.avatar||"🎭";
  byId("classicResultTitle").textContent=imp.name+" war der Impostor";
  byId("classicSecretWord").textContent=classicCurrent.word;
  show("classicResult");
}
function applyDiagClassicWord(item){
  if(!item)return false;
  classicCurrent=item;
  classicResolved=false;

  if(players.length){
    diagClassicPinnedWord=null;
    diagMarkRoundDirty("Classic-Wort geladen: "+item.wid);
    var visible=diagVisibleSection();
    if(visible==="classicRole")classicOpenRole();
    else if(visible==="classicResult")diagRenderClassicResultInstant();
  }else{
    diagClassicPinnedWord=item;
    diagLog("DEV","Classic-Wort für nächste Runde vorgemerkt: "+item.wid);
  }

  diagSetStatus(
    "devClassicWordPickerStatus",
    (players.length?"Geladen: ":"Für nächste Runde: ")+item.wid+" · "+item.cat+" · "+item.word,
    false
  );
  refreshDiagPanel();
  return true;
}
function loadDiagWid(){
  var input=byId("devWidInput");
  var item=findDiagClassicWordByWid(input?input.value:"");
  if(!item){
    diagSetStatus("devClassicWordPickerStatus","WID nicht gefunden.",true);
    return;
  }
  applyDiagClassicWord(item);
}
function loadDiagRandomClassicWord(){
  var select=byId("devClassicWordCategory");
  var cat=select?(select.value||"Alle"):"Alle";
  var pool=[];
  for(var i=0;i<classicWords.length;i++){
    if(cat!=="Alle"&&classicWords[i].cat!==cat)continue;
    pool.push(classicWords[i]);
  }
  if(!pool.length){
    diagSetStatus("devClassicWordPickerStatus","Für diese Kategorie gibt es kein Wort.",true);
    return;
  }
  var item=pool[Math.floor(randomUnit()*pool.length)];
  var input=byId("devWidInput");
  if(input)input.value=item.wid;
  applyDiagClassicWord(item);
}

function populateDiagQuestionFilters(){
  var select=byId("devQuestionCategory");
  if(!select||select.options.length)return;
  var cats=[],seen={};
  for(var i=0;i<bank.length;i++){
    if(!seen[bank[i].cat]){seen[bank[i].cat]=true;cats.push(bank[i].cat);}
  }
  cats.sort(function(a,b){return a.localeCompare(b,"de");});
  var all=document.createElement("option");
  all.value="Alle";all.textContent="Alle Kategorien";
  select.appendChild(all);
  for(var c=0;c<cats.length;c++){
    var opt=document.createElement("option");
    opt.value=cats[c];opt.textContent=cats[c];
    select.appendChild(opt);
  }
}
function renderDiagForceButtons(){
  var box=byId("devForceImpostorButtons");
  if(!box)return;
  box.innerHTML="";
  if(!players.length){
    box.innerHTML='<div class="devQuestionMeta">Erst eine Partie starten.</div>';
    return;
  }
  for(var i=0;i<players.length;i++){
    var btn=document.createElement("button");
    btn.type="button";
    btn.className="secondary";
    btn.setAttribute("data-dev-force",String(i));
    btn.textContent=(players[i].avatar||"🎭")+" "+players[i].name+(i===impIndex?" · aktuell":"");
    btn.addEventListener("click",function(){
      forceDiagImpostor(Number(this.getAttribute("data-dev-force")));
    });
    box.appendChild(btn);
  }
}
function forceDiagImpostor(index){
  var activeItem=gameMode==="classic"?classicCurrent:current;
  if(!players.length||!activeItem){
    diagSetStatus("devActionStatus","Erst eine Partie starten.",true);
    return;
  }
  if(index<0||index>=players.length)return;
  if(gameMode!=="classic"&&roundStatsRecorded&&!diagRoundDirty){
    diagSetStatus("devActionStatus","Diese Runde ist bereits dauerhaft ausgewertet. Bitte neue Runde starten.",true);
    return;
  }

  rollbackCurrentImpostorSelection();
  impIndex=index;
  ensureImpostorFairnessState();
  impostorSessionCounts[index]=(impostorSessionCounts[index]||0)+1;
  impostorRecent.push(index);
  if(impostorRecent.length>2)impostorRecent.shift();

  diagMarkRoundDirty("Impostor erzwungen: "+players[index].name);
  diagSetStatus("devActionStatus","Impostor auf "+players[index].name+" gesetzt.",false);

  var visible=diagVisibleSection();
  if(gameMode==="classic"){
    if(visible==="classicRole")classicOpenRole();
    else if(visible==="classicResult")diagRenderClassicResultInstant();
  }else{
    if(visible==="question")openQuestion();
    else if(visible==="answers"){diagEnsureGuesses();renderAnswers();show("answers");}
    else if(visible==="result")diagRenderResultInstant();
  }

  refreshDiagPanel();
}
function findDiagQuestionByQid(qid){
  var needle=String(qid||"").trim().toLowerCase();
  if(!needle)return null;
  for(var i=0;i<bank.length;i++){
    if(String(bank[i].qid).toLowerCase()===needle)return bank[i];
  }
  return null;
}
function applyDiagQuestion(item){
  if(!item)return false;
  current=item;
  normalQuestionRevealed=false;
  revealStage=0;
  if(players.length){
    for(var i=0;i<players.length;i++)players[i].guess=null;
    active=Math.max(0,Math.min(active,players.length-1));
    diagMarkRoundDirty("Frage geladen: "+item.qid);
  }else{
    diagLog("DEV","Frage vorgeladen: "+item.qid);
  }
  updateToolbar();

  var visible=diagVisibleSection();
  if(players.length&&visible==="question")openQuestion();
  else if(players.length&&visible==="normalReveal")prepareNormalQuestionReveal();
  else if(players.length&&visible==="answers"){diagEnsureGuesses();renderAnswers();show("answers");}
  else if(players.length&&visible==="result")diagRenderResultInstant();

  diagSetStatus("devQuestionPickerStatus","Geladen: "+item.qid+" · "+item.cat+" · "+diagDifficultyName(item),false);
  refreshDiagPanel();
  return true;
}
function loadDiagQid(){
  var item=findDiagQuestionByQid(byId("devQidInput").value);
  if(!item){
    diagSetStatus("devQuestionPickerStatus","QID nicht gefunden.",true);
    return;
  }
  applyDiagQuestion(item);
}
function loadDiagRandomQuestion(){
  var cat=byId("devQuestionCategory").value||"Alle";
  var difficulty=byId("devQuestionDifficulty").value||"zufaellig";
  var pool=[];
  for(var i=0;i<bank.length;i++){
    if(cat!=="Alle"&&bank[i].cat!==cat)continue;
    if(!difficultyFits(bank[i],difficulty))continue;
    pool.push(bank[i]);
  }
  if(!pool.length){
    diagSetStatus("devQuestionPickerStatus","Für diesen Filter gibt es keine Frage.",true);
    return;
  }
  var item=pool[Math.floor(randomUnit()*pool.length)];
  byId("devQidInput").value=item.qid;
  applyDiagQuestion(item);
}
function diagEnsureGuesses(){
  if(!players.length||!current)return;
  var factors=[0.88,1.06,0.96,1.14,0.81,1.21,0.92,1.09,0.74,1.27,0.99,1.17];
  var step=Number(current.step)||1;
  var max=Number(current.max)||100;
  var changed=false;
  for(var i=0;i<players.length;i++){
    if(players[i].guess!==null&&isFinite(Number(players[i].guess)))continue;
    var target=playerTargetValue(i);
    var value=Math.round((target*factors[i%factors.length])/step)*step;
    value=Math.max(0,Math.min(max,value));
    players[i].guess=value;
    changed=true;
  }
  if(changed)diagMarkRoundDirty("Test-Schätzungen automatisch erzeugt");
}
function diagRevealImpostorInstant(){
  diagEnsureGuesses();
  renderAnswers();
  show("answers");
  revealStage=1;
  var grid=byId("answerList"),tiles=grid.querySelectorAll(".answerTile");
  for(var i=0;i<tiles.length;i++){
    tiles[i].classList.add("dimmed");
    tiles[i].classList.remove("focused","impostorCaught");
  }
  var tile=grid.querySelector('[data-player-index="'+impIndex+'"]');
  if(tile){
    tile.classList.remove("dimmed");
    tile.classList.add("focused","impostorCaught");
  }
  byId("reveal").disabled=false;
  byId("reveal").textContent="Auflösung";
}
function diagRenderResultInstant(){
  if(!players.length||!current)return;
  diagEnsureGuesses();
  clearRevealTimers();

  byId("normalQ").textContent=current.normal;
  byId("normalAnswer").textContent=current.normalAnswer;
  byId("normalAnswer").classList.add("visible");
  byId("normalCounter").textContent=numberString(current.normalValue,Math.abs(Number(current.normalValue)-Math.round(Number(current.normalValue)))<0.000001);
  byId("normalCounter").classList.add("locked");

  byId("impostorQ").textContent=current.imp;
  byId("impAnswer").textContent=current.impAnswer;
  byId("impAnswer").classList.add("visible");
  byId("impCounter").textContent=numberString(current.impValue,Math.abs(Number(current.impValue)-Math.round(Number(current.impValue)))<0.000001);
  byId("impCounter").classList.add("locked");

  byId("impResolution").classList.remove("hidden");
  byId("impResolution").classList.add("reveal");
  byId("resultActions").classList.add("hidden");
  byId("impostorWonYes").classList.remove("selected");
  byId("impostorWonNo").classList.remove("selected");
  byId("impostorWonYes").setAttribute("aria-pressed","false");
  byId("impostorWonNo").setAttribute("aria-pressed","false");
  roundOutcomeChoice=null;

  byId("impostorOutcomeName").textContent=players[impIndex]?players[impIndex].name:"der Impostor";
  byId("impostorOutcomeAvatar").textContent=players[impIndex]?(players[impIndex].avatar||"🎭"):"🎭";
  byId("spicyNote").classList.toggle("hidden",current.cat!=="Spicy 🌶️");

  buildAwards();
  byId("roundAwards").classList.remove("hidden");
  byId("impostorOutcome").classList.remove("hidden");
  show("result");
}
function jumpDiagScreen(stage){
  if(gameMode==="classic"){
    if(!players.length||!classicCurrent){
      diagSetStatus("devActionStatus","Erst eine Partie starten.",true);
      return;
    }
    if(roundIntroTimer){clearTimeout(roundIntroTimer);roundIntroTimer=null;}
    if(guessSaveTimer){clearTimeout(guessSaveTimer);guessSaveTimer=null;}
    clearClassicTimer();
    var classicIntro=byId("roundIntro");
    if(classicIntro){classicIntro.classList.add("hidden");classicIntro.classList.remove("showIntro");}
    diagMarkRoundDirty("Classic Screen-Jump: "+stage);

    if(stage==="classicHandoff"){
      active=Math.max(0,Math.min(active,players.length-1));
      prepareHandoff();
    }else if(stage==="classicRole"){
      active=Math.max(0,Math.min(active,players.length-1));
      classicOpenRole();
    }else if(stage==="classicDiscussion"){
      classicPrepareDiscussion();
    }else if(stage==="classicResult"){
      diagRenderClassicResultInstant();
    }else{
      diagSetStatus("devActionStatus","Unbekanntes Classic-Ziel.",true);
      return;
    }
    closeDiagPanel();
    return;
  }

  if(!players.length||!current){
    diagSetStatus("devActionStatus","Erst eine Partie starten.",true);
    return;
  }

  if(roundIntroTimer){clearTimeout(roundIntroTimer);roundIntroTimer=null;}
  if(guessSaveTimer){clearTimeout(guessSaveTimer);guessSaveTimer=null;}
  var intro=byId("roundIntro");
  if(intro){intro.classList.add("hidden");intro.classList.remove("showIntro");}
  clearRevealTimers();
  diagMarkRoundDirty("Screen-Jump: "+stage);

  if(stage==="handoff"){
    active=Math.max(0,Math.min(active,players.length-1));
    prepareHandoff();
  }else if(stage==="question"){
    active=Math.max(0,Math.min(active,players.length-1));
    openQuestion();
  }else if(stage==="normalHidden"){
    prepareNormalQuestionReveal();
  }else if(stage==="normalOpen"){
    prepareNormalQuestionReveal();
    revealNormalQuestion();
  }else if(stage==="answers"){
    diagEnsureGuesses();
    renderAnswers();
    show("answers");
  }else if(stage==="impostor"){
    diagRevealImpostorInstant();
  }else if(stage==="result"){
    diagRenderResultInstant();
  }else{
    diagSetStatus("devActionStatus","Unbekanntes Ziel.",true);
    return;
  }

  closeDiagPanel();
}

function refreshDiagPanel(){
  byId("devSessionInfo").innerHTML=diagSessionHtml();
  byId("devImpostorInfo").innerHTML=diagImpostorHtml();
  byId("devStorageInfo").innerHTML=diagStorageHtml();

  if(gameMode==="classic"){
    var wordInfo=byId("devClassicWordInfo");
    if(wordInfo)wordInfo.innerHTML=diagClassicWordHtml();
    populateDiagClassicWordFilters();
  }else{
    var questionInfo=byId("devQuestionInfo");
    if(questionInfo)questionInfo.innerHTML=diagQuestionHtml();
    populateDiagQuestionFilters();
  }

  renderDiagForceButtons();
  renderDiagLog();
}
function openDiagPanel(){
  if(!diagUnlocked()){openDiagGate();return;}
  refreshDiagPanel();
  document.body.classList.add("devCopyMode");
  byId("devPanelOverlay").classList.remove("hidden");
  byId("devPanelOverlay").setAttribute("aria-hidden","false");
}
function closeDiagPanel(){
  byId("devPanelOverlay").classList.add("hidden");
  byId("devPanelOverlay").setAttribute("aria-hidden","true");
  document.body.classList.remove("devCopyMode");
  try{
    var sel=window.getSelection&&window.getSelection();
    if(sel&&sel.removeAllRanges)sel.removeAllRanges();
  }catch(e){}
}
function diagSimProbabilities(n,counts,last){
  if(n!==3&&n!==4){
    var uniform=[];
    for(var u=0;u<n;u++)uniform.push(1/n);
    return uniform;
  }
  var minP=n===3?0.25:0.20;
  var maxP=n===3?0.45:0.35;
  var expected=0;
  for(var c=0;c<n;c++)expected+=counts[c]||0;
  expected/=n;
  var weights=[];
  for(var i=0;i<n;i++){
    var weight=Math.exp(1.20*(expected-(counts[i]||0)));
    if(last===i)weight*=0.62;
    weights.push(weight);
  }
  return boundedProbabilities(weights,minP,maxP);
}
function runDiagSimulation(rounds){
  var n=players.length||count;
  var counts=[],i;
  for(i=0;i<n;i++)counts.push(0);
  var last=-1,maxRun=0,run=0,previous=-1;
  for(var r=0;r<rounds;r++){
    var p=diagSimProbabilities(n,counts,last);
    var roll=randomUnit(),sum=0,chosen=n-1;
    for(i=0;i<n;i++){
      sum+=p[i];
      if(roll<sum){chosen=i;break;}
    }
    counts[chosen]++;
    if(chosen===previous)run++;else run=1;
    if(run>maxRun)maxRun=run;
    previous=chosen;
    last=chosen;
  }
  var lines=["Simulation: "+rounds+" Runden · "+n+" Spieler"];
  for(i=0;i<n;i++){
    var label=players[i]?players[i].name:("Spieler "+(i+1));
    lines.push(label+": "+counts[i]+"× ("+(counts[i]/rounds*100).toFixed(1).replace(".",",")+" %)");
  }
  lines.push("Längste direkte Impostor-Serie: "+maxRun);
  byId("devSimulationResult").textContent=lines.join("\n");
  byId("devSimulationResult").classList.remove("hidden");
}
function lockDiag(){
  setDiagUnlocked(false);
  document.body.classList.remove("devCopyMode");
  closeDiagPanel();
}
function handleDiagTrigger(){
  var now=Date.now();
  diagTapTimes=diagTapTimes.filter(function(t){return now-t<=4000;});
  diagTapTimes.push(now);
  if(diagTapTimes.length>=7){
    diagTapTimes=[];
    openDiagGate();
  }
}

byId("devGateTrigger").addEventListener("click",handleDiagTrigger);
byId("devGateClose").addEventListener("click",closeDiagGate);
byId("devGateCancel").addEventListener("click",closeDiagGate);
byId("devGateSubmit").addEventListener("click",submitDiagGate);
byId("devPinInput").addEventListener("keydown",function(e){
  if(e.key==="Enter"){submitDiagGate();e.preventDefault();}
});
byId("devOpenSetup").addEventListener("click",openDiagPanel);
byId("devOpenGame").addEventListener("click",openDiagPanel);
byId("devPanelClose").addEventListener("click",closeDiagPanel);
byId("devCloseBottom").addEventListener("click",closeDiagPanel);
byId("devRefresh").addEventListener("click",refreshDiagPanel);
byId("devSimulate").addEventListener("click",function(){runDiagSimulation(1000);});
byId("devLock").addEventListener("click",lockDiag);
var devLoadQid=byId("devLoadQid");
if(devLoadQid)devLoadQid.addEventListener("click",loadDiagQid);
var devLoadRandomQuestion=byId("devLoadRandomQuestion");
if(devLoadRandomQuestion)devLoadRandomQuestion.addEventListener("click",loadDiagRandomQuestion);
var devQidInput=byId("devQidInput");
if(devQidInput)devQidInput.addEventListener("keydown",function(e){
  if(e.key==="Enter"){loadDiagQid();e.preventDefault();}
});

var devLoadWid=byId("devLoadWid");
if(devLoadWid)devLoadWid.addEventListener("click",loadDiagWid);
var devLoadRandomWord=byId("devLoadRandomWord");
if(devLoadRandomWord)devLoadRandomWord.addEventListener("click",loadDiagRandomClassicWord);
var devWidInput=byId("devWidInput");
if(devWidInput)devWidInput.addEventListener("keydown",function(e){
  if(e.key==="Enter"){loadDiagWid();e.preventDefault();}
});

byId("devClearLog").addEventListener("click",clearDiagLog);

var diagJumpRoot=byId("devJumpButtons");
var diagJumpButtons=diagJumpRoot?diagJumpRoot.querySelectorAll("[data-dev-jump]"):[];
for(var dj=0;dj<diagJumpButtons.length;dj++){
  diagJumpButtons[dj].addEventListener("click",function(){
    jumpDiagScreen(this.getAttribute("data-dev-jump"));
  });
}
var diagClassicJumpRoot=byId("devClassicJumpButtons");
var diagClassicJumpButtons=diagClassicJumpRoot?diagClassicJumpRoot.querySelectorAll("[data-dev-jump]"):[];
for(var dcj=0;dcj<diagClassicJumpButtons.length;dcj++){
  diagClassicJumpButtons[dcj].addEventListener("click",function(){
    jumpDiagScreen(this.getAttribute("data-dev-jump"));
  });
}

syncDiagVisibility();
renderDiagLog();
/* ------------------------ end hidden diagnostics ------------------------ */


/* Setup controls */
byId("plus").addEventListener("click",function(){if(count<12){count++;if(!avatarSelections[count-1])avatarSelections[count-1]=avatarPool[(count-1)%avatarPool.length];renderNames();savePlayers();}});
byId("minus").addEventListener("click",function(){if(count>3){count--;avatarSelections=avatarSelections.slice(0,count);renderNames();savePlayers();}});
byId("start").addEventListener("click",function(){ensureAudio();tone(300,0.05,0.012,"sine",0);start();});

if(gameMode==="classic"){
  var classicHintButtons=byId("classicHintControl").querySelectorAll("[data-classic-hint]");
  for(var ch=0;ch<classicHintButtons.length;ch++){
    classicHintButtons[ch].addEventListener("click",function(){
      ensureAudio();
      setClassicHint(this.getAttribute("data-classic-hint")==="1");
    });
  }
  byId("classicTimerSelect").addEventListener("change",function(){
    ensureAudio();
    setClassicTimer(Number(this.value));
  });
  byId("classicTimerPause").addEventListener("click",function(){
    ensureAudio();
    toggleClassicTimerPause();
  });
}else{
  byId("openStats").addEventListener("click",openStatistics);
  byId("closeStats").addEventListener("click",closeStatistics);
  byId("resetStats").addEventListener("click",resetStatistics);

  var statsTabs=byId("statsTabs").querySelectorAll(".statsTab");
  for(var st=0;st<statsTabs.length;st++){
    statsTabs[st].addEventListener("click",function(){
      selectedStatsMetric=this.getAttribute("data-stat")||"closest";
      renderStatistics();
      tone(430,0.04,0.010,"sine",0);
    });
  }

  var difficultyButtons=byId("difficultyControl").querySelectorAll(".difficultyButton");
  for(var db=0;db<difficultyButtons.length;db++){
    difficultyButtons[db].addEventListener("click",function(){
      ensureAudio();
      setDifficulty(this.getAttribute("data-difficulty"));
    });
  }
}

/* Game */
byId("showQuestion").addEventListener("click",function(){if(gameMode==="classic")classicOpenRole();else openQuestion();});

if(gameMode==="classic"){
  byId("classicRoleDone").addEventListener("click",classicRoleDone);
  byId("classicReveal").addEventListener("click",classicReveal);
  byId("classicNext").addEventListener("click",function(){ensureAudio();classicNewRound(false);});
  byId("classicRestart").addEventListener("click",leaveGame);
}else{
  byId("saveGuess").addEventListener("click",saveGuess);
  byId("revealNormalQuestion").addEventListener("click",revealNormalQuestion);
  byId("reveal").addEventListener("click",reveal);
  byId("impostorWonYes").addEventListener("click",function(){setImpostorOutcome(true);});
  byId("impostorWonNo").addEventListener("click",function(){setImpostorOutcome(false);});
  byId("next").addEventListener("click",function(){ensureAudio();newRound(false);});
  byId("restart").addEventListener("click",leaveGame);
}

byId("freshRound").addEventListener("click",function(){ensureAudio();if(gameMode==="classic")classicNewRound(true);else newRound(true);});
byId("leaveGame").addEventListener("click",leaveGame);
byId("soundToggle").addEventListener("click",function(){setSoundEnabled(!soundEnabled);});


/* iOS Safari/Home-Screen apps may suspend or interrupt Web Audio after
   locking the device, app switching or navigation. A real touch always gets
   the first chance to resume. Passive lifecycle events only restore an
   already-created context so they cannot accidentally create a locked one. */
function restoreExistingAudio(){
  if(!soundEnabled||!audioCtx||audioCtx.state==="closed")return;
  if(audioCtx.state!=="running")unlockAudio();
}
if(window.PointerEvent){
  document.addEventListener("pointerdown",function(){if(soundEnabled)unlockAudio();},{passive:true,capture:true});
}else{
  document.addEventListener("touchstart",function(){if(soundEnabled)unlockAudio();},{passive:true,capture:true});
}
window.addEventListener("pageshow",function(){
  restoreExistingAudio();
  refreshClassicTimerFromClock();
});
document.addEventListener("visibilitychange",function(){
  if(!document.hidden){
    restoreExistingAudio();
    refreshClassicTimerFromClock();
  }
});

/* App-like Safari interaction: suppress selection/copy callouts outside inputs.
   V54 exception: while the protected DEV panel is open, its text may be
   selected and copied. Leaving DEV restores the normal lock immediately. */
function devCopyAllowed(target){
  return !!(
    document.body.classList.contains("devCopyMode") &&
    target&&target.closest&&target.closest("#devPanelOverlay")
  );
}
document.addEventListener("selectstart",function(e){
  if(devCopyAllowed(e.target))return;
  if(e.target&&e.target.closest&&e.target.closest('input'))return;
  e.preventDefault();
});
document.addEventListener("contextmenu",function(e){
  if(devCopyAllowed(e.target))return;
  if(e.target&&e.target.closest&&e.target.closest('input'))return;
  e.preventDefault();
});
document.addEventListener("copy",function(e){
  if(devCopyAllowed(e.target))return;
  if(e.target&&e.target.closest&&e.target.closest('input'))return;
  e.preventDefault();
});
document.addEventListener("cut",function(e){
  if(devCopyAllowed(e.target))return;
  if(e.target&&e.target.closest&&e.target.closest('input'))return;
  e.preventDefault();
});

/* Huge thumb-friendly slider: touch anywhere in the field and drag. */
if(gameMode!=="classic"){
var scrubber=byId("scrubber");
scrubber.addEventListener("pointerdown",function(e){
  scrubbing=true;
  try{scrubber.setPointerCapture(e.pointerId);}catch(err){}
  setEstimateFromClientX(e.clientX);
  e.preventDefault();
});
scrubber.addEventListener("pointermove",function(e){
  if(!scrubbing)return;
  setEstimateFromClientX(e.clientX);
  e.preventDefault();
});
function stopScrub(){scrubbing=false;}
scrubber.addEventListener("pointerup",stopScrub);
scrubber.addEventListener("pointercancel",stopScrub);
scrubber.addEventListener("keydown",function(e){
  if(e.key==="ArrowLeft"||e.key==="ArrowDown"){nudge(-1);e.preventDefault();}
  if(e.key==="ArrowRight"||e.key==="ArrowUp"){nudge(1);e.preventDefault();}
  if(e.key==="Home"){byId("guessSlider").value=0;updateSliderVisual();e.preventDefault();}
  if(e.key==="End"){byId("guessSlider").value=byId("guessSlider").max;updateSliderVisual();e.preventDefault();}
});

/* Fallback for older WebKit builds without Pointer Events. */
if(!window.PointerEvent){
  scrubber.addEventListener("touchstart",function(e){
    if(!e.touches.length)return;
    setEstimateFromClientX(e.touches[0].clientX);e.preventDefault();
  },{passive:false});
  scrubber.addEventListener("touchmove",function(e){
    if(!e.touches.length)return;
    setEstimateFromClientX(e.touches[0].clientX);e.preventDefault();
  },{passive:false});
}
}

loadSavedGameMode();
if(gameMode==="classic"){
  loadClassicSettings();
  loadClassicDeckProgress();
  loadSavedPlayers();
  initCategories();
  renderNames();
  syncGameModeUI();
  updateToolbar();
  show("setup");
}else{
  loadSavedDifficulty();
  loadDeckProgress();
  loadCompletedQuestionIds();
  loadSavedPlayers();
  loadPlayerStats();
  initCategories();
  syncDifficultyUI();
  renderNames();
  syncGameModeUI();
  updateToolbar();
  show("setup");
}
document.body.classList.remove("booting");
document.body.removeAttribute("aria-busy");
})();