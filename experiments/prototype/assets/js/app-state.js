(function(){
"use strict";

var KEY="imposterGames.prototype.appState.v1";
var LEGACY_KEY="imposterGames.prototype.appState.legacy";
var DEV_STORAGE_KEY="imposterGames.prototype.devState.v1";
var INTEGRITY_DB_NAME="imposterGames.prototype.progressIntegrity.v1";
var INTEGRITY_STORE_NAME="integrity";
var INTEGRITY_MARKER_KEY="imposterGames.prototype.progressIntegrity.marker.v1";
var INTEGRITY_VERSION=1;
var INTEGRITY_USAGE_ACHIEVEMENTS={"app-hour-1":true,"app-hours-5":true,"app-hours-10":true};
var MAX_SESSIONS=50;
var BACKUP_FORMAT="imposter-games-prototype-backup";
var BACKUP_VERSION=3;
var GAME_STORAGE_PREFIX="imposterGames.prototype.game.";
var GAME_STORAGE_KEYS=[
  "circa.players.v1","classic.players.v1",
  "circa.categories.v1","classic.categories.v1",
  "circa.deckProgress.v1","circa.difficulty.v1",
  "circa.playerStats.v1","circa.deviceStats.v1","circa.completedQuestions.v1",
  "classic.deck.v1","classic.hint.v1","classic.timer.v1",
  "whoami.players.v1","whoami.categories.v1","whoami.deck.v1",
  "charades.players.v1","charades.categories.v1","charades.deck.v1","charades.timer.v1","charades.motionFlip.v2",
  "personal.players.v1","personal.deck.v1",
  "v72Migration.v1","v73Migration.v1"
];
var DEFAULT_AVATARS=["😎","🕵️","🥷","🤠","👻","🤖","🦊","🐼","🐸","🦁","🐙","🦄"];
var GAME_IDS=["circa","classic","whoami","charades","personal"];
var CATEGORY_TICKET_THRESHOLDS=[8,20,40];
var CATEGORY_PACKS=[
  {
    id:"popculture",icon:"🎬",title:"Popkultur Pack",
    categories:{
      circa:["Popkultur"],classic:["Popkultur"],
      whoami:["Film & Serien","Games & Figuren"],
      charades:["Film & Serien","Musik & Bühne"]
    },
    challenge:{type:"gameVariety",target:3,title:"Entdecker",text:"Spiele mindestens eine Runde in 3 verschiedenen Spielmodi."}
  },
  {
    id:"tech",icon:"⚡",title:"Technik Pack",
    categories:{
      circa:["Technik"],classic:["Technik"],
      whoami:["Marken & Technik"],
      charades:["Technik & Internet"]
    },
    challenge:{type:"uniqueContent",target:60,title:"Sammler",text:"Erlebe 60 unterschiedliche Fragen, Wörter oder Begriffe."}
  },
  {
    id:"spicy",icon:"🌶️",title:"Spicy Pack",
    categories:{circa:["Spicy 🌶️"],classic:["Spicy 🌶️"]},
    challenge:{type:"sessionRounds",target:10,title:"Langer Abend",text:"Spiele 10 Runden in einer einzigen Session."}
  }
];
function normalizeGame(game){return GAME_IDS.indexOf(game)!==-1?game:"circa";}

function uid(prefix){
  try{
    if(window.crypto&&crypto.getRandomValues){
      var a=new Uint32Array(2);crypto.getRandomValues(a);
      return prefix+"_"+a[0].toString(36)+a[1].toString(36);
    }
  }catch(e){}
  return prefix+"_"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
}
function cleanName(v){return String(v==null?"":v).trim().slice(0,24);}
function isGenericPlayerName(v){
  return /^spieler(?:\s+\d+)?$/i.test(cleanName(v));
}
function clone(v){return JSON.parse(JSON.stringify(v));}
function now(){return new Date().toISOString();}
function baseProfileStats(){
  return {
    rounds:0,circaRounds:0,classicRounds:0,whoamiRounds:0,charadesRounds:0,personalRounds:0,
    impostor:0,personalImpostor:0,impostorEscapes:0,closest:0,farthest:0,perfect:0,errorSum:0,errorSamples:0,
    charadesCorrect:0,charadesSkipped:0,charadesTurns:0,charadesBestTurn:0,charadesCleanTurns:0,
    circaQids:[],classicWids:[],whoamiTermIds:[],charadesTermIds:[],personalQids:[],categories:[],
    legacyPerfectUnknown:false,legacyCategoryUnknown:false
  };
}
function baseStats(){
  return {
    rounds:0,circaRounds:0,classicRounds:0,whoamiRounds:0,charadesRounds:0,personalRounds:0,
    impostor:0,personalImpostor:0,perfectEstimates:0,
    charadesCorrect:0,charadesSkipped:0,charadesTurns:0,charadesBestTurn:0,charadesCleanTurns:0,
    circaQids:[],classicWids:[],whoamiTermIds:[],charadesTermIds:[],personalQids:[],categories:[]
  };
}
function baseUsage(){
  return {appMs:0,games:{circa:0,classic:0,whoami:0,charades:0,personal:0},lastTickAt:null,activeGame:null};
}
function baseCrewProgress(){return {};}
function normalizeCrewProgress(src){
  var out={};
  if(!src||typeof src!=="object"||Array.isArray(src))return out;
  Object.keys(src).slice(0,100).forEach(function(key){
    var item=src[key];
    if(!item||typeof item!=="object"||Array.isArray(item))return;
    var safe={};
    if(item.selectedChallengeId)safe.selectedChallengeId=String(item.selectedChallengeId).slice(0,80);
    if(item.updatedAt)safe.updatedAt=String(item.updatedAt).slice(0,80);
    if(Object.keys(safe).length)out[String(key).slice(0,900)]=safe;
  });
  return out;
}
function baseCategoryProgress(){return {unlocks:{},ticketNotices:0};}
function ticketsEarnedForRounds(rounds){
  rounds=Math.max(0,Number(rounds)||0);
  return CATEGORY_TICKET_THRESHOLDS.filter(function(target){return rounds>=target;}).length;
}
function normalizeCategoryProgress(src){
  var valid=src&&typeof src==="object"&&!Array.isArray(src);
  var out=baseCategoryProgress();
  src=valid?src:{};
  out.ticketNotices=Number.isFinite(Number(src.ticketNotices))?Math.max(0,Math.min(CATEGORY_TICKET_THRESHOLDS.length,Math.floor(Number(src.ticketNotices)))):null;
  var unlocks=src.unlocks&&typeof src.unlocks==="object"&&!Array.isArray(src.unlocks)?src.unlocks:{};
  CATEGORY_PACKS.forEach(function(def){
    var item=unlocks[def.id];
    if(!item||typeof item!=="object")return;
    var method=["challenge","ticket"].indexOf(item.method)!==-1?item.method:"challenge";
    out.unlocks[def.id]={method:method,at:item.at||now()};
  });
  return out;
}
function normalizeUsage(src){
  src=src&&typeof src==="object"&&!Array.isArray(src)?src:{};
  var out=baseUsage();out.appMs=Math.max(0,Number(src.appMs)||0);
  var games=src.games&&typeof src.games==="object"&&!Array.isArray(src.games)?src.games:{};
  GAME_IDS.forEach(function(game){out.games[game]=Math.max(0,Number(games[game])||0);});
  out.lastTickAt=Number(src.lastTickAt)>0?Number(src.lastTickAt):null;
  out.activeGame=GAME_IDS.indexOf(src.activeGame)!==-1?src.activeGame:null;
  return out;
}
function baseDevState(){
  return {globalAchievements:{},profileAchievements:{},categoryPacks:{}};
}
function normalizeDevOverrideMap(src){
  var out={};
  if(!src||typeof src!=="object"||Array.isArray(src))return out;
  Object.keys(src).slice(0,250).forEach(function(id){
    if(src[id]===true||src[id]===false)out[String(id).slice(0,100)]=src[id];
  });
  return out;
}
function loadDevState(){
  var parsed=null;
  try{parsed=JSON.parse(localStorage.getItem(DEV_STORAGE_KEY)||"null");}catch(e){}
  var out=baseDevState();
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return out;
  out.globalAchievements=normalizeDevOverrideMap(parsed.globalAchievements);
  out.categoryPacks=normalizeDevOverrideMap(parsed.categoryPacks);
  var profiles=parsed.profileAchievements;
  if(profiles&&typeof profiles==="object"&&!Array.isArray(profiles)){
    Object.keys(profiles).slice(0,250).forEach(function(id){
      var map=normalizeDevOverrideMap(profiles[id]);
      if(Object.keys(map).length)out.profileAchievements[String(id).slice(0,80)]=map;
    });
  }
  return out;
}
function saveDevState(){
  try{
    var hasGlobal=Object.keys(devState.globalAchievements||{}).length>0;
    var hasProfiles=Object.keys(devState.profileAchievements||{}).length>0;
    var hasCategories=Object.keys(devState.categoryPacks||{}).length>0;
    if(!hasGlobal&&!hasProfiles&&!hasCategories)localStorage.removeItem(DEV_STORAGE_KEY);
    else localStorage.setItem(DEV_STORAGE_KEY,JSON.stringify(devState));
    return true;
  }catch(e){return false;}
}
function achievementOverride(id,profileId){
  var map=profileId?(devState.profileAchievements&&devState.profileAchievements[profileId]):devState.globalAchievements;
  if(!map||!Object.prototype.hasOwnProperty.call(map,id))return null;
  return map[id]===true?true:map[id]===false?false:null;
}
function categoryPackOverride(id){
  var map=devState.categoryPacks||{};
  if(!Object.prototype.hasOwnProperty.call(map,id))return null;
  return map[id]===true?true:map[id]===false?false:null;
}
function defaults(){
  var id=uid("player");
  return {
    schemaVersion:1,
    selectedProfileId:id,
    primaryProfileId:id,
    profiles:[{id:id,name:"Spieler",avatar:"😎",aliases:[],createdAt:now()}],
    profileStats:{},
    profileArchive:{},
    stats:baseStats(),
    usage:baseUsage(),
    categoryProgress:baseCategoryProgress(),
    crewProgress:baseCrewProgress(),
    sessions:[],
    activeSessionId:null,
    achievements:{},
    presets:[],
    launchPreset:null,
    launchGroup:null,
    preferences:{sound:true,haptics:true,animations:true},
    imports:{legacyCirca:false}
  };
}
function migrateV73GameStorageOnce(){
  var marker=GAME_STORAGE_PREFIX+"v73Migration.v1";
  try{
    if(localStorage.getItem(marker)!==null)return;
    localStorage.setItem(marker,JSON.stringify({completed:true,from:"prototype-isolated",at:now()}));
  }catch(e){}
}
function migrateV72(){
  return defaults();
}
function backfillV72Details(data){
  return;
}
function load(){
  var data=null,hadStoredState=false;
  try{
    var raw=localStorage.getItem(KEY);
    hadStoredState=!!raw;
    data=raw?JSON.parse(raw):null;
  }catch(e){}
  if(!data||typeof data!=="object"||Array.isArray(data)){
    data=hadStoredState?defaults():migrateV72();
  }

  if(!Array.isArray(data.profiles))data.profiles=[];
  data.profiles.forEach(function(p){
    if(!Array.isArray(p.aliases))p.aliases=[];
    p.aliases=p.aliases.map(cleanName).filter(function(alias,index,arr){
      return alias&&!isGenericPlayerName(alias)&&arr.findIndex(function(x){return x.toLocaleLowerCase("de-DE")===alias.toLocaleLowerCase("de-DE");})===index;
    }).slice(-8);
  });
  if(!data.profiles.length){
    var p=defaults().profiles[0];data.profiles=[p];data.selectedProfileId=p.id;data.primaryProfileId=p.id;
  }
  var selectedCandidate=data.selectedProfileId||data.primaryProfileId;
  if(!data.profiles.some(function(p){return p.id===selectedCandidate;}))selectedCandidate=data.profiles[0].id;
  data.selectedProfileId=selectedCandidate;
  data.primaryProfileId=selectedCandidate;
  if(!data.profileStats||typeof data.profileStats!=="object")data.profileStats={};
  Object.keys(data.profileStats).forEach(function(id){
    var st=data.profileStats[id];
    if(!st||typeof st!=="object"){data.profileStats[id]=baseProfileStats();return;}
    ["rounds","circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds","impostor","personalImpostor","impostorEscapes","closest","farthest","perfect","errorSum","errorSamples","charadesCorrect","charadesSkipped","charadesTurns","charadesBestTurn","charadesCleanTurns"].forEach(function(k){st[k]=Math.max(0,Number(st[k])||0);});
    ["circaQids","classicWids","whoamiTermIds","charadesTermIds","personalQids","categories"].forEach(function(k){if(!Array.isArray(st[k]))st[k]=[];});
    st.legacyPerfectUnknown=st.legacyPerfectUnknown===true;
    st.legacyCategoryUnknown=st.legacyCategoryUnknown===true;
  });
  if(!data.profileArchive||typeof data.profileArchive!=="object"||Array.isArray(data.profileArchive))data.profileArchive={};
  if(!data.stats||typeof data.stats!=="object")data.stats=baseStats();
  ["circaQids","classicWids","whoamiTermIds","charadesTermIds","personalQids","categories"].forEach(function(k){if(!Array.isArray(data.stats[k]))data.stats[k]=[];});
  ["rounds","circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds","impostor","personalImpostor","perfectEstimates","charadesCorrect","charadesSkipped","charadesTurns","charadesBestTurn","charadesCleanTurns"].forEach(function(k){data.stats[k]=Math.max(0,Number(data.stats[k])||0);});
  data.usage=normalizeUsage(data.usage);
  data.categoryProgress=normalizeCategoryProgress(data.categoryProgress);
  data.crewProgress=normalizeCrewProgress(data.crewProgress);
  if(data.categoryProgress.ticketNotices===null)data.categoryProgress.ticketNotices=ticketsEarnedForRounds(data.stats.rounds);
  /* A persisted heartbeat is never trusted after a reload; page lifecycle code starts a fresh foreground interval. */
  data.usage.lastTickAt=null;data.usage.activeGame=null;
  if(!Array.isArray(data.sessions))data.sessions=[];
  data.sessions.forEach(function(session){
    (session&&Array.isArray(session.rounds)?session.rounds:[]).forEach(function(round){
      (round&&Array.isArray(round.players)?round.players:[]).forEach(function(rp){
        if(!rp||!rp.profileId)return;
        var pst=data.profileStats[rp.profileId];
        if(!pst){pst=baseProfileStats();data.profileStats[rp.profileId]=pst;}
        if(!Array.isArray(pst.circaQids))pst.circaQids=[];
        if(!Array.isArray(pst.classicWids))pst.classicWids=[];
        if(!Array.isArray(pst.whoamiTermIds))pst.whoamiTermIds=[];
        if(!Array.isArray(pst.charadesTermIds))pst.charadesTermIds=[];
        if(!Array.isArray(pst.personalQids))pst.personalQids=[];
        if(!Array.isArray(pst.categories))pst.categories=[];
        if(round.game==="circa"&&round.qid)addUnique(pst.circaQids,round.qid);
        if(round.game==="classic"&&round.wid)addUnique(pst.classicWids,round.wid);
        if(round.game==="whoami"&&rp.termId)addUnique(pst.whoamiTermIds,rp.termId);
        if(round.game==="charades"&&Array.isArray(rp.termIds))rp.termIds.forEach(function(id){addUnique(pst.charadesTermIds,id);});
        if(round.game==="personal"&&round.qid)addUnique(pst.personalQids,round.qid);
        if(round.game==="circa"&&round.category)addUnique(pst.categories,round.category);
      });
    });
  });
  if(!data.achievements||typeof data.achievements!=="object")data.achievements={};
  if(!Array.isArray(data.presets))data.presets=[];
  data.presets=data.presets.filter(function(preset){return preset&&typeof preset==="object";});
  data.presets.forEach(function(preset){
    var hadExplicitProfiles=Array.isArray(preset.profileIds)&&preset.profileIds.length>0;
    if(!Array.isArray(preset.profileIds))preset.profileIds=[];
    preset.profileIds=preset.profileIds.filter(function(profileId,index,arr){
      return data.profiles.some(function(profile){return profile.id===profileId;})&&arr.indexOf(profileId)===index;
    }).slice(0,12);
    if(hadExplicitProfiles){
      preset.playerCount=preset.profileIds.length;
      preset.summary=presetSummary(preset);
    }
  });
  if(!data.preferences||typeof data.preferences!=="object")data.preferences={sound:true,haptics:true,animations:true};
  if(!data.imports||typeof data.imports!=="object")data.imports={v72MigrationCompleted:true,v72ProfileChoicePending:false};
  if(typeof data.imports.v72MigrationCompleted!=="boolean")data.imports.v72MigrationCompleted=true;
  if(typeof data.imports.v72ProfileChoicePending!=="boolean")data.imports.v72ProfileChoicePending=false;
  backfillV72Details(data);

  return data;
}
migrateV73GameStorageOnce();
var data=load();
var devState=loadDevState();

function save(){
  try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch(e){return false;}
}

/* -------------------------------------------------------------------------
 * Local Progress Integrity V1
 *
 * Progress remains fully local. A non-exportable HMAC key plus the last
 * trusted progress checkpoint live in IndexedDB. The normal app-state stays
 * unchanged in localStorage; only progression-relevant fields are mirrored
 * into the signed checkpoint. This is intentionally a local tamper barrier,
 * not a claim of server-grade anti-cheat.
 * ---------------------------------------------------------------------- */
var integrityStarted=false;
var integrityReadyPromise=Promise.resolve({ok:true,protected:false,reason:"not-started"});
var integritySealPromise=Promise.resolve();
var integrityStatus={ok:true,protected:false,reason:"not-started"};
var integrityDevDirty=false;

function integritySupported(){
  return typeof indexedDB!=="undefined"&&typeof TextEncoder!=="undefined"&&
    !!(window&&window.crypto&&window.crypto.subtle&&
      typeof window.crypto.subtle.generateKey==="function"&&
      typeof window.crypto.subtle.sign==="function"&&
      typeof window.crypto.subtle.verify==="function");
}
function integrityOpenDb(){
  return new Promise(function(resolve,reject){
    var request;
    try{request=indexedDB.open(INTEGRITY_DB_NAME,1);}catch(e){reject(e);return;}
    request.onupgradeneeded=function(){
      var db=request.result;
      if(!db.objectStoreNames.contains(INTEGRITY_STORE_NAME))db.createObjectStore(INTEGRITY_STORE_NAME,{keyPath:"id"});
    };
    request.onsuccess=function(){resolve(request.result);};
    request.onerror=function(){reject(request.error||new Error("integrity-db-open"));};
  });
}
function integrityGet(db,id){
  return new Promise(function(resolve,reject){
    var request;
    try{request=db.transaction(INTEGRITY_STORE_NAME,"readonly").objectStore(INTEGRITY_STORE_NAME).get(id);}catch(e){reject(e);return;}
    request.onsuccess=function(){resolve(request.result||null);};
    request.onerror=function(){reject(request.error||new Error("integrity-db-get"));};
  });
}
function integrityPut(db,value){
  return new Promise(function(resolve,reject){
    var request;
    try{request=db.transaction(INTEGRITY_STORE_NAME,"readwrite").objectStore(INTEGRITY_STORE_NAME).put(value);}catch(e){reject(e);return;}
    request.onsuccess=function(){resolve(true);};
    request.onerror=function(){reject(request.error||new Error("integrity-db-put"));};
  });
}
function integrityDeleteDb(){
  return new Promise(function(resolve){
    if(typeof indexedDB==="undefined"){resolve(true);return;}
    var request;
    try{request=indexedDB.deleteDatabase(INTEGRITY_DB_NAME);}catch(e){resolve(false);return;}
    request.onsuccess=function(){resolve(true);};
    request.onerror=function(){resolve(false);};
    request.onblocked=function(){resolve(false);};
  });
}
function integrityCloseDb(db){try{if(db&&typeof db.close==="function")db.close();}catch(e){}}
function integrityBase64(bytes){
  var binary="",view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  for(var i=0;i<view.length;i++)binary+=String.fromCharCode(view[i]);
  return btoa(binary);
}
function integrityBytesFromBase64(value){
  var binary=atob(String(value||"")),out=new Uint8Array(binary.length);
  for(var i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);
  return out;
}
function integrityCanonical(value){return canonicalBackupJson(value);}
function integrityUniqueStrings(list,limit){
  var out=[];
  (Array.isArray(list)?list:[]).forEach(function(value){
    value=String(value);
    if(value&&out.indexOf(value)===-1&&(!limit||out.length<limit))out.push(value);
  });
  return out;
}
function integrityProfileHasProgress(st){
  if(!st||typeof st!=="object")return false;
  var numeric=["rounds","circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds","impostor","personalImpostor","impostorEscapes","closest","farthest","perfect","errorSum","errorSamples","charadesCorrect","charadesSkipped","charadesTurns","charadesBestTurn","charadesCleanTurns"];
  if(numeric.some(function(key){return Number(st[key])>0;}))return true;
  var arrays=["circaQids","classicWids","whoamiTermIds","charadesTermIds","personalQids","categories"];
  return arrays.some(function(key){return Array.isArray(st[key])&&st[key].length>0;})||st.legacyPerfectUnknown===true||st.legacyCategoryUnknown===true;
}
function integrityProfileStatsSnapshot(src){
  var safe=sanitizeImportedProfileStats(src&&src.profileStats),out={};
  Object.keys(safe).sort().forEach(function(id){if(integrityProfileHasProgress(safe[id]))out[id]=safe[id];});
  return out;
}
function integrityAchievementsSnapshot(src){
  var source=src&&src.achievements&&typeof src.achievements==="object"&&!Array.isArray(src.achievements)?src.achievements:{},out={};
  Object.keys(source).sort().slice(0,500).forEach(function(id){
    if(INTEGRITY_USAGE_ACHIEVEMENTS[id])return;
    var item=source[id];
    if(item&&typeof item==="object"&&!Array.isArray(item))out[String(id).slice(0,100)]={unlockedAt:item.unlockedAt||null};
  });
  return out;
}
function integritySessionsSnapshot(src){
  return sanitizeImportedSessions(src&&src.sessions).filter(function(session){
    return Array.isArray(session.rounds)&&session.rounds.length>0;
  }).map(function(session){
    return {
      id:session.id,
      startedAt:session.startedAt||null,
      endedAt:session.endedAt||null,
      profileIds:integrityUniqueStrings(session.profileIds,20),
      lastProfileIds:integrityUniqueStrings(session.lastProfileIds,20),
      rounds:clone(session.rounds),
      awards:Array.isArray(session.awards)?clone(session.awards):[]
    };
  });
}
function integrityProtectedState(src){
  src=src&&typeof src==="object"&&!Array.isArray(src)?src:{};
  var imports=src.imports&&typeof src.imports==="object"&&!Array.isArray(src.imports)?src.imports:{};
  return {
    stats:sanitizeImportedStats(src.stats),
    profileStats:integrityProfileStatsSnapshot(src),
    categoryProgress:normalizeCategoryProgress(src.categoryProgress),
    achievements:integrityAchievementsSnapshot(src),
    sessions:integritySessionsSnapshot(src),
    legacyCircaData:imports.legacyCircaData?clone(imports.legacyCircaData):null
  };
}
function integritySame(a,b){return integrityCanonical(a)===integrityCanonical(b);}
function integrityCheckpointPayload(checkpoint){
  return {
    version:Number(checkpoint.version)||INTEGRITY_VERSION,
    revision:Math.max(1,Number(checkpoint.revision)||1),
    createdAt:checkpoint.createdAt||null,
    state:checkpoint.state
  };
}
async function integritySignCheckpoint(key,checkpoint){
  var bytes=new TextEncoder().encode(integrityCanonical(integrityCheckpointPayload(checkpoint)));
  var signature=await window.crypto.subtle.sign("HMAC",key,bytes);
  return integrityBase64(signature);
}
async function integrityVerifyCheckpoint(key,checkpoint){
  if(!key||!checkpoint||checkpoint.version!==INTEGRITY_VERSION||typeof checkpoint.signature!=="string"||!checkpoint.state)return false;
  try{
    var bytes=new TextEncoder().encode(integrityCanonical(integrityCheckpointPayload(checkpoint)));
    var signature=integrityBytesFromBase64(checkpoint.signature);
    return await window.crypto.subtle.verify("HMAC",key,signature,bytes);
  }catch(e){return false;}
}
async function integrityGetOrCreateKey(db){
  var record=await integrityGet(db,"hmac-key");
  if(record&&record.key)return record.key;
  var key=await window.crypto.subtle.generateKey({name:"HMAC",hash:"SHA-256",length:256},false,["sign","verify"]);
  await integrityPut(db,{id:"hmac-key",key:key,createdAt:now()});
  return key;
}
async function integrityCreateCheckpoint(db,key,revision){
  var checkpoint={
    id:"checkpoint",
    version:INTEGRITY_VERSION,
    revision:Math.max(1,Number(revision)||1),
    createdAt:now(),
    state:integrityProtectedState(data)
  };
  checkpoint.signature=await integritySignCheckpoint(key,checkpoint);
  await integrityPut(db,checkpoint);
  return checkpoint;
}
function integrityApplyProtectedState(state){
  if(!state||typeof state!=="object")return false;
  data.stats=sanitizeImportedStats(state.stats);

  var keepZero={};
  Object.keys(data.profileStats||{}).forEach(function(id){
    var source={};source[id]=data.profileStats[id];
    var safe=sanitizeImportedProfileStats(source)[id];
    if(safe&&!integrityProfileHasProgress(safe))keepZero[id]=safe;
  });
  data.profileStats=keepZero;
  var restoredProfiles=sanitizeImportedProfileStats(state.profileStats);
  Object.keys(restoredProfiles).forEach(function(id){data.profileStats[id]=restoredProfiles[id];});

  data.categoryProgress=normalizeCategoryProgress(state.categoryProgress);

  var achievements={};
  Object.keys(data.achievements||{}).forEach(function(id){
    if(INTEGRITY_USAGE_ACHIEVEMENTS[id])achievements[id]=clone(data.achievements[id]);
  });
  Object.keys(state.achievements||{}).forEach(function(id){achievements[id]=clone(state.achievements[id]);});
  data.achievements=achievements;

  var currentById={};
  (data.sessions||[]).forEach(function(session){if(session&&session.id)currentById[session.id]=session;});
  var restored=(Array.isArray(state.sessions)?state.sessions:[]).map(function(source){
    var old=currentById[source.id]||{};
    return {
      id:String(source.id||uid("session")).slice(0,100),
      startedAt:source.startedAt||now(),
      endedAt:source.endedAt||null,
      profileIds:integrityUniqueStrings(source.profileIds,20),
      lastProfileIds:integrityUniqueStrings(source.lastProfileIds,20),
      rounds:Array.isArray(source.rounds)?clone(source.rounds.slice(0,500)):[],
      awards:Array.isArray(source.awards)?clone(source.awards.slice(0,12)):[],
      lastGame:GAME_IDS.indexOf(old.lastGame)!==-1?old.lastGame:null,
      gameStartedAt:old.gameStartedAt||null,
      activity:old.activity?String(old.activity).slice(0,80):null
    };
  });
  var restoredIds={};restored.forEach(function(session){restoredIds[session.id]=true;});
  (data.sessions||[]).forEach(function(session){
    if(!session||restoredIds[session.id]||(session.rounds||[]).length)return;
    restored.push(session);
  });
  data.sessions=restored.slice(-MAX_SESSIONS);
  if(data.activeSessionId&&!data.sessions.some(function(session){return session.id===data.activeSessionId&&!session.endedAt;}))data.activeSessionId=null;

  if(!data.imports||typeof data.imports!=="object"||Array.isArray(data.imports))data.imports={};
  if(state.legacyCircaData)data.imports.legacyCircaData=clone(state.legacyCircaData);
  else delete data.imports.legacyCircaData;
  return save();
}
function integrityRepairInitialProgressState(target){
  if(!target||typeof target!=="object")return {changed:false,fixes:0};
  var fixes=0;
  function setIfDifferent(obj,key,value){
    if(obj[key]!==value){obj[key]=value;fixes++;}
  }
  function cap(obj,key,max){
    var value=Math.max(0,Number(obj[key])||0),next=Math.min(value,Math.max(0,Number(max)||0));
    setIfDifferent(obj,key,next);
  }
  function cleanLists(st){
    [["circaQids",520],["classicWids",250],["whoamiTermIds",275],["charadesTermIds",300],["personalQids",500],["categories",30]].forEach(function(pair){
      var next=integrityUniqueStrings(st[pair[0]],pair[1]);
      if(!integritySame(next,st[pair[0]]||[])){st[pair[0]]=next;fixes++;}
    });
  }

  target.stats=sanitizeImportedStats(target.stats);
  cleanLists(target.stats);
  var globalModeSum=["circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds"].reduce(function(sum,key){return sum+Math.max(0,Number(target.stats[key])||0);},0);
  setIfDifferent(target.stats,"rounds",globalModeSum);
  cap(target.stats,"impostor",target.stats.rounds);
  cap(target.stats,"personalImpostor",Math.min(target.stats.personalRounds,target.stats.impostor));
  cap(target.stats,"charadesCleanTurns",target.stats.charadesTurns);
  cap(target.stats,"charadesBestTurn",target.stats.charadesCorrect);

  var normalizedProfiles=sanitizeImportedProfileStats(target.profileStats);
  Object.keys(normalizedProfiles).forEach(function(id){
    var st=normalizedProfiles[id];cleanLists(st);
    var modeSum=["circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds"].reduce(function(sum,key){return sum+Math.max(0,Number(st[key])||0);},0);
    setIfDifferent(st,"rounds",modeSum);
    cap(st,"impostor",st.rounds);
    cap(st,"personalImpostor",Math.min(st.personalRounds,st.impostor));
    cap(st,"impostorEscapes",st.impostor);
    cap(st,"closest",st.circaRounds);
    cap(st,"farthest",st.circaRounds);
    cap(st,"perfect",st.circaRounds);
    cap(st,"errorSamples",st.circaRounds);
    cap(st,"charadesTurns",st.charadesRounds);
    cap(st,"charadesCleanTurns",st.charadesTurns);
    cap(st,"charadesBestTurn",st.charadesCorrect);
  });
  target.profileStats=normalizedProfiles;

  target.categoryProgress=normalizeCategoryProgress(target.categoryProgress);
  CATEGORY_PACKS.forEach(function(def){
    var unlock=target.categoryProgress.unlocks[def.id];
    if(!unlock||unlock.method!=="challenge")return;
    var challenge=def.challenge||{},done=true;
    if(challenge.type==="gameVariety"){
      done=["circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds"].filter(function(key){return Number(target.stats[key])>0;}).length>=Math.max(1,Number(challenge.target)||1);
    }else if(challenge.type==="uniqueContent"){
      done=uniqueContentCount(target.stats)>=Math.max(1,Number(challenge.target)||1);
    }else if(challenge.type==="sessionRounds"){
      /* A legitimate long-session unlock can outlive the retained 50-session history. */
      return;
    }
    if(!done){delete target.categoryProgress.unlocks[def.id];fixes++;}
  });
  var earned=ticketsEarnedForRounds(target.stats.rounds);
  var ticketIds=Object.keys(target.categoryProgress.unlocks||{}).filter(function(id){
    return target.categoryProgress.unlocks[id]&&target.categoryProgress.unlocks[id].method==="ticket";
  }).sort(function(a,b){
    return String(target.categoryProgress.unlocks[a].at||"").localeCompare(String(target.categoryProgress.unlocks[b].at||""));
  });
  ticketIds.slice(earned).forEach(function(id){delete target.categoryProgress.unlocks[id];fixes++;});
  if(Number(target.categoryProgress.ticketNotices)>earned){target.categoryProgress.ticketNotices=earned;fixes++;}

  var seenRoundKeys={};
  (target.sessions||[]).forEach(function(session){
    if(!session||!Array.isArray(session.rounds))return;
    var before=session.rounds.length;
    session.rounds=session.rounds.filter(function(round){
      var key=round&&String(round.roundKey||"");
      if(!key)return true;
      if(seenRoundKeys[key])return false;
      seenRoundKeys[key]=true;return true;
    });
    if(session.rounds.length!==before){
      fixes+=before-session.rounds.length;
      if(session.endedAt)session.awards=computeAwards(session);
    }
  });
  return {changed:fixes>0,fixes:fixes};
}
function validateBackupCategoryProgress(rawProgress,target){
  if(rawProgress==null)return {ok:true};
  if(typeof rawProgress!=="object"||Array.isArray(rawProgress))return {ok:false,reason:"category-progress"};
  if(rawProgress.unlocks!=null&&(typeof rawProgress.unlocks!=="object"||Array.isArray(rawProgress.unlocks)))return {ok:false,reason:"category-progress"};
  if(rawProgress.ticketNotices!=null){
    var notices=Number(rawProgress.ticketNotices);
    if(!Number.isFinite(notices)||Math.floor(notices)!==notices||notices<0||notices>CATEGORY_TICKET_THRESHOLDS.length)return {ok:false,reason:"category-progress"};
  }

  var definitions={};
  CATEGORY_PACKS.forEach(function(def){definitions[def.id]=def;});
  var rawUnlocks=rawProgress.unlocks||{};
  var rawIds=Object.keys(rawUnlocks);
  for(var i=0;i<rawIds.length;i++){
    var rawId=rawIds[i],rawUnlock=rawUnlocks[rawId];
    if(!definitions[rawId])return {ok:false,reason:"category-unlock",detail:"unknown-pack"};
    if(!rawUnlock||typeof rawUnlock!=="object"||Array.isArray(rawUnlock))return {ok:false,reason:"category-unlock",detail:"invalid-entry"};
    if(["challenge","ticket"].indexOf(rawUnlock.method)===-1)return {ok:false,reason:"category-unlock",detail:"invalid-method"};
  }

  var progress=target&&target.categoryProgress?target.categoryProgress:baseCategoryProgress();
  var unlocks=progress.unlocks||{};
  var earnedTickets=ticketsEarnedForRounds(target&&target.stats&&target.stats.rounds);
  var usedTickets=Object.keys(unlocks).filter(function(id){return unlocks[id]&&unlocks[id].method==="ticket";}).length;
  if(usedTickets>earnedTickets)return {ok:false,reason:"category-unlock",detail:"ticket-count"};
  if(Number(progress.ticketNotices)>earnedTickets)return {ok:false,reason:"category-unlock",detail:"ticket-notices"};

  var retainedRounds=(target.sessions||[]).reduce(function(total,session){
    return total+(session&&Array.isArray(session.rounds)?session.rounds.length:0);
  },0);
  for(var j=0;j<CATEGORY_PACKS.length;j++){
    var def=CATEGORY_PACKS[j],unlock=unlocks[def.id];
    if(!unlock||unlock.method!=="challenge")continue;
    var challenge=def.challenge||{},done=true;
    if(challenge.type==="gameVariety"){
      done=["circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds"].filter(function(key){
        return Number(target.stats&&target.stats[key])>0;
      }).length>=Math.max(1,Number(challenge.target)||1);
    }else if(challenge.type==="uniqueContent"){
      done=uniqueContentCount(target.stats||{})>=Math.max(1,Number(challenge.target)||1);
    }else if(challenge.type==="sessionRounds"){
      var threshold=Math.max(1,Number(challenge.target)||1);
      var retainedProof=(target.sessions||[]).some(function(session){
        return session&&Array.isArray(session.rounds)&&session.rounds.length>=threshold;
      });
      var missingHistoricalRounds=Math.max(0,Number(target.stats&&target.stats.rounds)||0)>retainedRounds;
      done=retainedProof||missingHistoricalRounds;
    }
    if(!done)return {ok:false,reason:"category-unlock",detail:def.id};
  }
  return {ok:true};
}
function validateBackupPlausibility(target,rawSource){
  var categoryCheck=validateBackupCategoryProgress(rawSource&&rawSource.categoryProgress,target);
  if(!categoryCheck.ok)return categoryCheck;

  var knownProfiles={};
  (target.profiles||[]).forEach(function(profile){if(profile&&profile.id)knownProfiles[profile.id]=true;});
  Object.keys(target.profileArchive||{}).forEach(function(id){knownProfiles[id]=true;});
  var statIds=Object.keys(target.profileStats||{});
  for(var i=0;i<statIds.length;i++)if(!knownProfiles[statIds[i]])return {ok:false,reason:"plausibility",detail:"profile-stats-reference"};

  var sessionIds={},roundKeys={};
  for(var s=0;s<(target.sessions||[]).length;s++){
    var session=target.sessions[s];
    if(!session||!session.id)return {ok:false,reason:"plausibility",detail:"session-id"};
    if(sessionIds[session.id])return {ok:false,reason:"plausibility",detail:"duplicate-session"};
    sessionIds[session.id]=true;
    var sessionProfileIds=(session.profileIds||[]).concat(session.lastProfileIds||[]);
    for(var p=0;p<sessionProfileIds.length;p++){
      if(!knownProfiles[sessionProfileIds[p]])return {ok:false,reason:"plausibility",detail:"session-profile-reference"};
    }
    for(var r=0;r<(session.rounds||[]).length;r++){
      var round=session.rounds[r]||{};
      if(GAME_IDS.indexOf(round.game)===-1)return {ok:false,reason:"plausibility",detail:"round-game"};
      var roundKey=String(round.roundKey||"");
      if(!roundKey)return {ok:false,reason:"plausibility",detail:"round-key"};
      if(roundKeys[roundKey])return {ok:false,reason:"plausibility",detail:"duplicate-round"};
      roundKeys[roundKey]=true;
      var roundPlayers=Array.isArray(round.players)?round.players:[];
      for(var rp=0;rp<roundPlayers.length;rp++){
        if(!roundPlayers[rp]||!knownProfiles[roundPlayers[rp].profileId])return {ok:false,reason:"plausibility",detail:"round-profile-reference"};
      }
    }
  }

  var repaired=clone(target);
  var repair=integrityRepairInitialProgressState(repaired);
  if(repair.changed)return {ok:false,reason:"plausibility",detail:"progress-consistency"};
  return {ok:true};
}

function integrityReadMarker(){
  try{
    var raw=localStorage.getItem(INTEGRITY_MARKER_KEY);
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}
function integrityWriteMarker(){
  try{localStorage.setItem(INTEGRITY_MARKER_KEY,JSON.stringify({version:INTEGRITY_VERSION,initializedAt:now()}));return true;}catch(e){return false;}
}
function integrityStateWasInitialized(){
  return !!(data&&data.imports&&data.imports.progressIntegrityV1InitializedAt);
}
function integrityMarkStateInitialized(){
  if(!data.imports||typeof data.imports!=="object"||Array.isArray(data.imports))data.imports={};
  if(!data.imports.progressIntegrityV1InitializedAt)data.imports.progressIntegrityV1InitializedAt=now();
  save();return true;
}
async function initializeProgressIntegrity(skipRecovery,allowReinitialize){
  if(!integritySupported()){
    integrityStatus={ok:true,protected:false,reason:"unsupported"};
    return integrityStatus;
  }
  var db=null;
  try{
    db=await integrityOpenDb();
    var marker=integrityReadMarker();
    var keyRecord=await integrityGet(db,"hmac-key");
    var checkpoint=await integrityGet(db,"checkpoint");

    if(keyRecord&&keyRecord.key&&checkpoint){
      var valid=await integrityVerifyCheckpoint(keyRecord.key,checkpoint);
      if(!valid){
        integrityStatus={ok:false,protected:true,reason:"checkpoint-invalid"};
        return integrityStatus;
      }
      var current=integrityProtectedState(data);
      var persisted=null,raw=null;
      try{raw=localStorage.getItem(KEY);persisted=raw?JSON.parse(raw):null;}catch(e){}
      var persistedState=persisted&&typeof persisted==="object"&&!Array.isArray(persisted)?integrityProtectedState(persisted):null;
      var repaired=!integritySame(current,checkpoint.state)||!persistedState||!integritySame(persistedState,checkpoint.state);
      if(repaired)integrityApplyProtectedState(checkpoint.state);
      if(!marker)integrityWriteMarker();
      integrityDevDirty=false;
      integrityStatus={ok:true,protected:true,repaired:repaired,revision:checkpoint.revision};
      return integrityStatus;
    }

    if(marker||(!allowReinitialize&&integrityStateWasInitialized())){
      integrityStatus={ok:false,protected:true,reason:"checkpoint-missing"};
      return integrityStatus;
    }

    if(!skipRecovery){
      var recovery=await integrityGet(db,"pre-r17-recovery");
      if(!recovery){
        var rawState=null;try{rawState=localStorage.getItem(KEY);}catch(e){}
        if(rawState)await integrityPut(db,{id:"pre-r17-recovery",createdAt:now(),rawState:rawState});
      }
    }

    var repair=integrityRepairInitialProgressState(data);
    if(repair.changed)save();
    var key=keyRecord&&keyRecord.key?keyRecord.key:await integrityGetOrCreateKey(db);
    var first=await integrityCreateCheckpoint(db,key,1);
    integrityWriteMarker();
    integrityMarkStateInitialized();
    integrityDevDirty=false;
    integrityStatus={ok:true,protected:true,initialized:true,repaired:repair.changed,fixes:repair.fixes,revision:first.revision};
    return integrityStatus;
  }catch(e){
    integrityStatus={ok:true,protected:false,reason:"unavailable"};
    return integrityStatus;
  }finally{integrityCloseDb(db);}
}
function queueProgressIntegritySeal(){
  if(!integrityStarted)return Promise.resolve({ok:true,protected:false,reason:"not-started"});
  integritySealPromise=integritySealPromise.then(async function(){
    var ready=await integrityReadyPromise;
    if(!ready||!ready.ok||!ready.protected||integrityDevDirty)return ready||integrityStatus;
    var db=null;
    try{
      db=await integrityOpenDb();
      var keyRecord=await integrityGet(db,"hmac-key"),checkpoint=await integrityGet(db,"checkpoint");
      if(!keyRecord||!keyRecord.key||!checkpoint||!(await integrityVerifyCheckpoint(keyRecord.key,checkpoint))){
        integrityStatus={ok:false,protected:true,reason:"checkpoint-invalid"};
        return integrityStatus;
      }
      var next=await integrityCreateCheckpoint(db,keyRecord.key,(Number(checkpoint.revision)||0)+1);
      integrityStatus={ok:true,protected:true,repaired:false,revision:next.revision};
      return integrityStatus;
    }catch(e){
      integrityStatus={ok:false,protected:true,reason:"seal-failed"};
      return integrityStatus;
    }finally{integrityCloseDb(db);}
  }).catch(function(){return integrityStatus;});
  return integritySealPromise;
}
async function validateProgressIntegrity(){
  var ready=await integrityReadyPromise;
  await integritySealPromise;
  if(!ready||!ready.ok||!ready.protected)return ready||integrityStatus;
  var db=null;
  try{
    db=await integrityOpenDb();
    var keyRecord=await integrityGet(db,"hmac-key"),checkpoint=await integrityGet(db,"checkpoint");
    if(!keyRecord||!keyRecord.key||!checkpoint||!(await integrityVerifyCheckpoint(keyRecord.key,checkpoint))){
      integrityStatus={ok:false,protected:true,reason:"checkpoint-invalid"};
      return integrityStatus;
    }
    var raw=null,persisted=null;
    try{raw=localStorage.getItem(KEY);persisted=raw?JSON.parse(raw):null;}catch(e){}
    var persistedState=persisted&&typeof persisted==="object"&&!Array.isArray(persisted)?integrityProtectedState(persisted):null;
    var current=integrityProtectedState(data);
    var mismatch=!persistedState||!integritySame(persistedState,checkpoint.state)||!integritySame(current,checkpoint.state);
    if(mismatch)integrityApplyProtectedState(checkpoint.state);
    integrityDevDirty=false;
    integrityStatus={ok:true,protected:true,repaired:mismatch,revision:checkpoint.revision};
    return integrityStatus;
  }catch(e){
    integrityStatus={ok:false,protected:true,reason:"validation-failed"};
    return integrityStatus;
  }finally{integrityCloseDb(db);}
}
async function acceptCurrentProgressAsTrusted(){
  if(!integritySupported())return {ok:true,protected:false,reason:"unsupported"};
  try{localStorage.removeItem(INTEGRITY_MARKER_KEY);}catch(e){}
  await integrityDeleteDb();
  integritySealPromise=Promise.resolve();
  integrityReadyPromise=initializeProgressIntegrity(true,true);
  integrityStatus=await integrityReadyPromise;
  return integrityStatus;
}
function restartProgressIntegrityFromCurrent(){
  if(!integrityStarted)return;
  integrityReadyPromise=(async function(){
    try{localStorage.removeItem(INTEGRITY_MARKER_KEY);}catch(e){}
    await integrityDeleteDb();
    return initializeProgressIntegrity(true,true);
  })();
  integritySealPromise=Promise.resolve();
}
function markIntegrityDevDirty(){integrityDevDirty=true;}

function normalizeCrewIds(profileIds){
  var out=[];
  (Array.isArray(profileIds)?profileIds:[]).forEach(function(id){
    id=String(id||"");
    if(id&&out.indexOf(id)===-1)out.push(id);
  });
  out.sort();
  return out;
}
function crewKey(profileIds){
  var ids=normalizeCrewIds(profileIds);
  return ids.length>=2?ids.join("~"):"";
}
function crewMember(id){
  var profile=profileById(id)||data.profileArchive[id]||null;
  return profile?{id:id,name:profile.name||"Spieler",avatar:profile.avatar||"👤"}:{id:id,name:"Ehemaliger Spieler",avatar:"👤"};
}
function levelThreshold(level){
  var n=Math.max(0,Math.floor(Number(level)||1)-1);
  return 5*n*(n+3);
}
function levelCurveInfo(xp){
  xp=Math.max(0,Math.floor(Number(xp)||0));
  var level=1;
  while(level<99&&xp>=levelThreshold(level+1))level++;
  var start=levelThreshold(level),next=levelThreshold(level+1);
  var span=Math.max(1,next-start),into=xp-start;
  return {level:level,xp:xp,startXp:start,nextXp:next,progress:Math.max(0,Math.min(1,into/span)),remaining:Math.max(0,next-xp)};
}
function crewLevelInfo(xp){
  var base=levelCurveInfo(xp),level=base.level;
  base.title=level>=10?"Legendäre Runde":level>=7?"Stammcrew":level>=4?"Eingespielt":level>=2?"Auf Kurs":"Neue Crew";
  return base;
}
function profileXpBreakdown(st){
  st=st&&typeof st==="object"?st:baseProfileStats();
  var games=["circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds"].filter(function(key){return Number(st[key])>0;}).length;
  var content=uniqueContentCount(st);
  /*
   * Personal XP rewards experience first. Performance stays deliberately capped,
   * so weaker players still progress reliably and DEV/achievement overrides never grant XP.
   */
  var breakdown={
    rounds:Math.max(0,Number(st.rounds)||0)*2,
    variety:games*8,
    discovery:Math.floor(content/10)*2,
    precision:Math.min(10,Math.max(0,Number(st.perfect)||0))*2,
    escapes:Math.min(10,Math.max(0,Number(st.impostorEscapes)||0)),
    charades:Math.min(10,Math.floor(Math.max(0,Number(st.charadesCorrect)||0)/10))
  };
  breakdown.total=Object.keys(breakdown).reduce(function(total,key){return key==="total"?total:total+breakdown[key];},0);
  return breakdown;
}
function profileLevelInfoFromStats(st){
  var breakdown=profileXpBreakdown(st),base=levelCurveInfo(breakdown.total),level=base.level;
  var title=level>=15?"Ikone":level>=10?"Legende":level>=7?"Spielmacher":level>=4?"Routinier":level>=2?"Mitspieler":"Neuling";
  return {
    level:level,title:title,xp:base.xp,startXp:base.startXp,nextXp:base.nextXp,
    progress:base.progress,remaining:base.remaining,breakdown:breakdown
  };
}
function getProfileLevel(id){
  id=String(id||"");
  if(!profileById(id)&&!data.profileArchive[id])return null;
  return clone(profileLevelInfoFromStats(data.profileStats[id]||baseProfileStats()));
}
function profileLevelFeedback(round,context){
  if(!context||!context.isNew)return null;
  var changes=[],seen={};
  (round.players||[]).forEach(function(player){
    var id=player.profileId;if(!id||seen[id])return;seen[id]=true;
    var before=profileLevelInfoFromStats(context.beforeProfiles[id]||baseProfileStats());
    var after=profileLevelInfoFromStats(data.profileStats[id]||baseProfileStats());
    if(after.level>before.level)changes.push({id:id,name:profileDisplayName(id),before:before,after:after});
  });
  if(!changes.length)return null;
  changes.sort(function(a,b){return b.after.level-a.after.level;});
  if(changes.length===1){
    var change=changes[0];
    return {
      id:"profile-level-"+round.roundKey+"-"+change.id+"-"+change.after.level,
      type:"profile-level",icon:"⭐",title:change.name+" · LVL "+change.after.level,
      message:change.after.title+" · "+change.after.xp+" XP",label:"LEVEL-UP",intensity:2
    };
  }
  return {
    id:"profile-level-"+round.roundKey+"-"+changes.map(function(change){return change.id+"-"+change.after.level;}).join("-"),
    type:"profile-level",icon:"⭐",title:changes.length+"× Level-Up",
    message:changes.slice(0,3).map(function(change){return change.name+" · LVL "+change.after.level;}).join(" · "),
    label:"LEVEL-UP",intensity:2
  };
}
function crewChallengeDefs(stats){
  return [
    {id:"reunion-3",icon:"🤝",title:"Wiedersehen",text:"Schließt 3 gemeinsame Spieleabende ab.",current:stats.sessions,target:3},
    {id:"all-games",icon:"🎲",title:"Allrounder",text:"Spielt gemeinsam alle 5 Spielmodi.",current:stats.games.length,target:5},
    {id:"charades-30",icon:"🎭",title:"Schauspieltruppe",text:"Erratet gemeinsam 30 Scharade-Begriffe.",current:stats.charadesCorrect,target:30},
    {id:"escapes-5",icon:"🕵️",title:"Unter Verdacht",text:"Kommt gemeinsam 5× als Impostor davon.",current:stats.impostorEscapes,target:5},
    {id:"rounds-50",icon:"🔥",title:"Stammrunde",text:"Spielt 50 Runden als dieselbe Crew.",current:stats.rounds,target:50}
  ].map(function(def){
    def.current=Math.max(0,Number(def.current)||0);def.target=Math.max(1,Number(def.target)||1);
    def.done=def.current>=def.target;def.progress=Math.min(def.target,def.current)+"/"+def.target;
    def.ratio=Math.max(0,Math.min(1,def.current/def.target));
    def.remaining=Math.max(0,def.target-def.current);
    return def;
  });
}
function computeCrew(profileIds){
  var ids=normalizeCrewIds(profileIds),key=crewKey(ids);
  if(!key)return null;
  var sessions=(data.sessions||[]).filter(function(session){
    return !!(session&&session.endedAt&&(session.rounds||[]).length&&crewKey(session.profileIds)===key);
  });
  var stats={
    sessions:sessions.length,rounds:0,games:[],awards:0,charadesCorrect:0,impostorEscapes:0,
    firstAt:null,lastAt:null,longestSessionRounds:0,longestSessionMs:0,
    bestCirca:null,wildCirca:null,bestCharades:null,escapeLeader:null
  };
  var games={},escapes={};
  sessions.forEach(function(session){
    stats.rounds+=(session.rounds||[]).length;
    stats.awards+=(session.awards||[]).length;
    stats.longestSessionRounds=Math.max(stats.longestSessionRounds,(session.rounds||[]).length);
    var startMs=new Date(session.startedAt).getTime(),endMs=new Date(session.endedAt).getTime();
    if(Number.isFinite(startMs)&&Number.isFinite(endMs))stats.longestSessionMs=Math.max(stats.longestSessionMs,Math.max(0,endMs-startMs));
    if(!stats.firstAt||new Date(session.startedAt).getTime()<new Date(stats.firstAt).getTime())stats.firstAt=session.startedAt;
    if(!stats.lastAt||new Date(session.endedAt).getTime()>new Date(stats.lastAt).getTime())stats.lastAt=session.endedAt;
    (session.rounds||[]).forEach(function(round){
      games[normalizeGame(round.game)]=true;
      (round.players||[]).forEach(function(p){
        if(round.game==="circa"&&Number.isFinite(Number(p.error))){
          var error=Math.max(0,Number(p.error)),entry={profileId:p.profileId,error:error};
          if(!stats.bestCirca||error<stats.bestCirca.error)stats.bestCirca=entry;
          if(!stats.wildCirca||error>stats.wildCirca.error)stats.wildCirca=entry;
        }
        if(round.game==="charades"){
          var correct=Math.max(0,Number(p.correct)||0);
          stats.charadesCorrect+=correct;
          if(!stats.bestCharades||correct>stats.bestCharades.correct)stats.bestCharades={profileId:p.profileId,correct:correct};
        }
        if(p.role==="impostor"&&round.impostorEscaped===true){
          stats.impostorEscapes++;
          escapes[p.profileId]=(escapes[p.profileId]||0)+1;
        }
      });
    });
  });
  stats.games=Object.keys(games);
  var escapeEntries=Object.entries(escapes).sort(function(a,b){return b[1]-a[1];});
  if(escapeEntries.length)stats.escapeLeader={profileId:escapeEntries[0][0],escapes:escapeEntries[0][1]};
  var xp=stats.rounds+stats.sessions*8+stats.awards*3+stats.games.length*5;
  var level=crewLevelInfo(xp),challenges=crewChallengeDefs(stats),stored=data.crewProgress[key]||{};
  var selectedId=stored.selectedChallengeId;
  if(!challenges.some(function(item){return item.id===selectedId;}))selectedId=challenges[0].id;
  var selected=challenges.find(function(item){return item.id===selectedId;})||challenges[0];
  return {
    key:key,profileIds:ids,members:ids.map(crewMember),stats:stats,xp:xp,level:level,
    challenges:challenges,selectedChallenge:selected,
    completedChallenges:challenges.filter(function(item){return item.done;}).length,
    hasHistory:sessions.length>0
  };
}
function getCrews(){
  var seen={},out=[];
  (data.sessions||[]).forEach(function(session){
    if(!session||!session.endedAt||!(session.rounds||[]).length)return;
    var key=crewKey(session.profileIds);if(!key||seen[key])return;seen[key]=true;
    var crew=computeCrew(session.profileIds);if(crew)out.push(crew);
  });
  out.sort(function(a,b){return new Date(b.stats.lastAt||0).getTime()-new Date(a.stats.lastAt||0).getTime();});
  return clone(out);
}
function getCrew(profileIds){var crew=computeCrew(profileIds);return crew?clone(crew):null;}
function setCrewChallenge(profileIds,challengeId){
  var crew=computeCrew(profileIds);if(!crew)return null;
  challengeId=String(challengeId||"");
  if(!crew.challenges.some(function(item){return item.id===challengeId;}))return null;
  data.crewProgress[crew.key]={selectedChallengeId:challengeId,updatedAt:now()};
  save();return getCrew(profileIds);
}
function buildCrewFeedback(before,after){
  if(!after||!after.hasHistory)return [];
  var out=[],selectedAfter=after.selectedChallenge,selectedBefore=before&&before.selectedChallenge;
  if(!before||!before.hasHistory){
    out.push({
      id:"crew-created-"+after.key,type:"crew",icon:"🤝",title:"Neue Crew gestartet",
      message:after.members.map(function(member){return member.name;}).join(" · "),label:"PARTY-PASS",intensity:2
    });
  }
  if(before&&before.hasHistory&&after.level.level>before.level.level){
    out.push({
      id:"crew-level-"+after.key+"-"+after.level.level,type:"crew",icon:"🔥",title:"Crew-Level "+after.level.level,
      message:after.level.title+" · "+after.stats.rounds+" gemeinsame Runden",label:"CREW LEVEL-UP",intensity:after.level.level>=5?3:2
    });
  }
  if(selectedAfter&&selectedAfter.done&&(!selectedBefore||!selectedBefore.done)){
    out.push({
      id:"crew-challenge-"+after.key+"-"+selectedAfter.id,type:"crew",icon:selectedAfter.icon,title:selectedAfter.title+" geschafft",
      message:selectedAfter.progress+" · Gemeinsames Ziel erreicht.",label:"CREW-CHALLENGE",intensity:3
    });
  }
  return out.slice(0,2);
}

function categoryPackDef(id){
  for(var i=0;i<CATEGORY_PACKS.length;i++)if(CATEGORY_PACKS[i].id===id)return CATEGORY_PACKS[i];
  return null;
}
function categoryPackFor(game,category){
  game=normalizeGame(game);category=String(category||"");
  for(var i=0;i<CATEGORY_PACKS.length;i++){
    var list=CATEGORY_PACKS[i].categories[game]||[];
    if(list.indexOf(category)!==-1)return CATEGORY_PACKS[i];
  }
  return null;
}
function categoryPackEffectiveUnlocked(def){
  var override=categoryPackOverride(def.id);
  return override===null?!!data.categoryProgress.unlocks[def.id]:override;
}
function categoryChallengeState(def){
  var challenge=def&&def.challenge||{},current=0,target=Math.max(1,Number(challenge.target)||1);
  if(challenge.type==="gameVariety"){
    current=["circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds"].filter(function(k){return Number(data.stats[k])>0;}).length;
  }else if(challenge.type==="uniqueContent"){
    current=uniqueContentCount(data.stats);
  }else if(challenge.type==="sessionRounds"){
    current=0;
    (data.sessions||[]).forEach(function(session){current=Math.max(current,Array.isArray(session&&session.rounds)?session.rounds.length:0);});
  }
  current=Math.max(0,current);
  return {
    type:challenge.type||"",
    title:challenge.title||"Challenge",
    text:challenge.text||"",
    current:current,
    target:target,
    done:current>=target,
    progress:Math.min(target,current)+"/"+target,
    ratio:Math.max(0,Math.min(1,current/target))
  };
}
function categoryTicketStatus(){
  var rounds=Math.max(0,Number(data.stats.rounds)||0);
  var earned=ticketsEarnedForRounds(rounds);
  var spent=0;
  Object.keys(data.categoryProgress.unlocks||{}).forEach(function(id){
    if(data.categoryProgress.unlocks[id]&&data.categoryProgress.unlocks[id].method==="ticket")spent++;
  });
  var next=null;
  for(var i=0;i<CATEGORY_TICKET_THRESHOLDS.length;i++){
    if(rounds<CATEGORY_TICKET_THRESHOLDS[i]){next=CATEGORY_TICKET_THRESHOLDS[i];break;}
  }
  var banked=Math.max(0,earned-spent);
  var lockedPacks=CATEGORY_PACKS.filter(function(def){return !categoryPackEffectiveUnlocked(def);}).length;
  return {
    thresholds:CATEGORY_TICKET_THRESHOLDS.slice(),
    earned:earned,spent:spent,banked:banked,available:Math.min(banked,lockedPacks),
    rounds:rounds,nextThreshold:next,roundsToNext:next===null?0:Math.max(0,next-rounds)
  };
}
function evaluateCategoryTicketNotices(){
  var earned=ticketsEarnedForRounds(data.stats.rounds);
  var previous=Math.max(0,Number(data.categoryProgress.ticketNotices)||0);
  if(earned<=previous)return [];
  data.categoryProgress.ticketNotices=earned;
  var usable=categoryTicketStatus().available;
  if(usable<1)return [];
  var items=[],count=Math.min(earned-previous,usable);
  for(var i=0;i<count;i++){
    var thresholdIndex=Math.min(CATEGORY_TICKET_THRESHOLDS.length-1,previous+i);
    items.push({index:thresholdIndex+1,threshold:CATEGORY_TICKET_THRESHOLDS[thresholdIndex]});
  }
  return items;
}
function emitCategoryTicketEarned(items){
  if(!items||!items.length||!window||typeof window.dispatchEvent!=="function"||typeof CustomEvent==="undefined")return;
  try{window.dispatchEvent(new CustomEvent("ci:category-ticket-earned",{detail:{items:clone(items),tickets:categoryTicketStatus()}}));}catch(e){}
}
function categoryPackInfo(def){
  var unlock=data.categoryProgress.unlocks[def.id]||null;
  var override=categoryPackOverride(def.id);
  var effective=override===null?!!unlock:override;
  return {
    id:def.id,icon:def.icon,title:def.title,categories:clone(def.categories),
    unlocked:effective,method:effective?(override===true&&!unlock?"dev":unlock&&unlock.method||null):null,
    unlockedAt:unlock&&unlock.at||null,actualUnlocked:!!unlock,devOverride:override,
    challenge:categoryChallengeState(def)
  };
}
function evaluateCategoryUnlocks(){
  var unlocked=[];
  CATEGORY_PACKS.forEach(function(def){
    if(data.categoryProgress.unlocks[def.id])return;
    var challenge=categoryChallengeState(def);
    if(!challenge.done)return;
    data.categoryProgress.unlocks[def.id]={method:"challenge",at:now()};
    unlocked.push(categoryPackInfo(def));
  });
  return unlocked;
}
function emitCategoryUnlocks(items){
  if(!items||!items.length||!window||typeof window.dispatchEvent!=="function"||typeof CustomEvent==="undefined")return;
  try{window.dispatchEvent(new CustomEvent("ci:category-unlocked",{detail:{items:clone(items)}}));}catch(e){}
}
function getCategoryProgress(){
  var newlyUnlocked=evaluateCategoryUnlocks();
  if(newlyUnlocked.length){save();queueProgressIntegritySeal();}
  return {
    packs:CATEGORY_PACKS.map(categoryPackInfo),
    tickets:categoryTicketStatus()
  };
}
function isCategoryUnlocked(game,category){
  if(String(category)==="Alle")return true;
  var def=categoryPackFor(game,category);
  return !def||categoryPackEffectiveUnlocked(def);
}
function getCategoryLock(game,category){
  var def=categoryPackFor(game,category);
  if(!def||categoryPackEffectiveUnlocked(def))return null;
  var info=categoryPackInfo(def);
  info.tickets=categoryTicketStatus();
  info.game=normalizeGame(game);
  info.category=String(category||"");
  return info;
}
function filterUnlockedCategories(game,categories){
  if(!Array.isArray(categories)||!categories.length)return ["Alle"];
  if(categories.indexOf("Alle")!==-1)return ["Alle"];
  var out=[];
  categories.forEach(function(category){
    category=String(category||"");
    if(category&&isCategoryUnlocked(game,category)&&out.indexOf(category)===-1)out.push(category);
  });
  return out.length?out:["Alle"];
}
function unlockCategoryPack(id,method){
  var def=categoryPackDef(String(id||""));
  if(!def)return {ok:false,reason:"pack"};
  if(data.categoryProgress.unlocks[def.id])return {ok:true,already:true,pack:categoryPackInfo(def),tickets:categoryTicketStatus()};
  method=method==="ticket"?"ticket":"challenge";
  if(method==="ticket"){
    if(categoryTicketStatus().available<1)return {ok:false,reason:"ticket",pack:categoryPackInfo(def),tickets:categoryTicketStatus()};
  }else if(!categoryChallengeState(def).done){
    return {ok:false,reason:"challenge",pack:categoryPackInfo(def),tickets:categoryTicketStatus()};
  }
  data.categoryProgress.unlocks[def.id]={method:method,at:now()};
  save();
  queueProgressIntegritySeal();
  var info=categoryPackInfo(def);
  emitCategoryUnlocks([info]);
  return {ok:true,pack:info,tickets:categoryTicketStatus()};
}

function devSetCategoryPackOverride(id,value){
  var def=categoryPackDef(String(id||""));
  if(!def)return false;
  if(value===true||value===false)devState.categoryPacks[def.id]=value;
  else delete devState.categoryPacks[def.id];
  saveDevState();return true;
}
function devClearCategoryPackOverrides(){
  devState.categoryPacks={};
  saveDevState();return true;
}

function profileById(id){
  for(var i=0;i<data.profiles.length;i++)if(data.profiles[i].id===id)return data.profiles[i];
  return null;
}
function profileMatchesName(profile,lower){
  if(!profile)return false;
  if(cleanName(profile.name).toLocaleLowerCase("de-DE")===lower)return true;
  return Array.isArray(profile.aliases)&&profile.aliases.some(function(alias){
    return cleanName(alias).toLocaleLowerCase("de-DE")===lower;
  });
}
function ensureStat(id){
  if(!data.profileStats[id])data.profileStats[id]=baseProfileStats();
  return data.profileStats[id];
}
function normalizeProfile(p){
  var name=cleanName(p&&p.name)||"Spieler";
  var avatar=String(p&&p.avatar||"😎").slice(0,8);
  return {name:name,avatar:avatar};
}
function addProfile(input){
  var p=normalizeProfile(input);
  var duplicate=data.profiles.find(function(x){return profileMatchesName(x,p.name.toLocaleLowerCase("de-DE"));});
  if(duplicate)return duplicate.id;
  var id=uid("player");
  data.profiles.push({id:id,name:p.name,avatar:p.avatar,aliases:[],createdAt:now()});
  ensureStat(id);save();return id;
}
function updateProfile(id,input){
  var p=profileById(id);if(!p)return false;
  var n=normalizeProfile(input);
  var lower=n.name.toLocaleLowerCase("de-DE");
  var duplicate=data.profiles.some(function(x){return x.id!==id&&profileMatchesName(x,lower);});
  if(duplicate)return false;
  if(p.name.toLocaleLowerCase("de-DE")!==n.name.toLocaleLowerCase("de-DE")){
    if(!Array.isArray(p.aliases))p.aliases=[];
    if(!isGenericPlayerName(p.name)&&!p.aliases.some(function(alias){return alias.toLocaleLowerCase("de-DE")===p.name.toLocaleLowerCase("de-DE");})){
      p.aliases.push(p.name);
      if(p.aliases.length>8)p.aliases=p.aliases.slice(-8);
    }
  }
  p.name=n.name;p.avatar=n.avatar;save();return true;
}
function deleteProfile(id){
  if(data.profiles.length<=1)return false;
  var idx=data.profiles.findIndex(function(p){return p.id===id;});
  if(idx<0)return false;
  var removed=data.profiles[idx];
  data.profileArchive[id]={id:removed.id,name:removed.name,avatar:removed.avatar,aliases:Array.isArray(removed.aliases)?removed.aliases.slice():[],createdAt:removed.createdAt||null,deletedAt:now()};
  data.profiles.splice(idx,1);
  (data.presets||[]).forEach(function(preset){
    if(!preset||!Array.isArray(preset.profileIds)||preset.profileIds.indexOf(id)===-1)return;
    preset.profileIds=preset.profileIds.filter(function(profileId){return profileId!==id&&!!profileById(profileId);});
    preset.playerCount=preset.profileIds.length;
    preset.summary=presetSummary(preset);
  });
  if(data.launchPreset&&Array.isArray(data.launchPreset.profileIds)&&data.launchPreset.profileIds.indexOf(id)!==-1)data.launchPreset=null;
  if(Array.isArray(data.launchGroup)){
    data.launchGroup=data.launchGroup.filter(function(profileId){return profileId!==id&&!!profileById(profileId);});
    if(!data.launchGroup.length)data.launchGroup=null;
  }
  if(data.selectedProfileId===id||data.primaryProfileId===id){
    data.selectedProfileId=data.profiles[0].id;
    data.primaryProfileId=data.selectedProfileId;
  }
  save();return true;
}
function getProfileById(id){
  var active=profileById(id);
  if(active)return clone(active);
  return data.profileArchive[id]?clone(data.profileArchive[id]):null;
}
function setSelected(id){
  if(!profileById(id))return false;
  data.selectedProfileId=id;
  data.primaryProfileId=id; /* compatibility with earlier experiment builds */
  save();return true;
}
function getSelected(){
  return clone(profileById(data.selectedProfileId)||data.profiles[0]);
}
function ensureProfileForPlayer(player){
  if(player&&player.profileId&&profileById(player.profileId)){
    ensureStat(player.profileId);
    return player.profileId;
  }
  var name=cleanName(player&&player.name)||"Spieler";
  var lower=name.toLocaleLowerCase("de-DE");
  var match=data.profiles.find(function(p){return profileMatchesName(p,lower);});
  if(match){
    ensureStat(match.id);
    return match.id;
  }
  return addProfile({name:name,avatar:player&&player.avatar||"😎"});
}
function getPreferredPlayers(limit){
  var list=data.profiles.slice();
  var selectedIndex=list.findIndex(function(p){return p.id===data.selectedProfileId;});
  if(selectedIndex>0){var selected=list.splice(selectedIndex,1)[0];list.unshift(selected);}
  if(limit)list=list.slice(0,limit);
  return clone(list);
}
function sessionById(id){
  return data.sessions.find(function(s){return s.id===id;})||null;
}
function beginSession(players){
  var current=data.activeSessionId&&sessionById(data.activeSessionId);
  if(current&&!current.endedAt){
    var activeIds=[];
    (players||[]).forEach(function(p){
      var id=ensureProfileForPlayer(p);
      if(current.profileIds.indexOf(id)===-1)current.profileIds.push(id);
      if(activeIds.indexOf(id)===-1)activeIds.push(id);
    });
    if(activeIds.length)current.lastProfileIds=activeIds;
    save();return current.id;
  }
  var profileIds=[];
  (players||[]).forEach(function(p){
    var id=ensureProfileForPlayer(p);
    if(profileIds.indexOf(id)===-1)profileIds.push(id);
  });
  var session={id:uid("session"),startedAt:now(),endedAt:null,profileIds:profileIds,lastProfileIds:profileIds.slice(),rounds:[],awards:[],lastGame:null,gameStartedAt:null,activity:null};
  data.sessions.push(session);
  data.activeSessionId=session.id;
  if(data.sessions.length>MAX_SESSIONS)data.sessions.splice(0,data.sessions.length-MAX_SESSIONS);
  save();return session.id;
}
function addUnique(arr,value){
  value=String(value||"").trim();if(value&&arr.indexOf(value)===-1)arr.push(value);
}
function preserveRoundContentIdentity(previous,next){
  if(!previous||!next)return next;
  Object.keys(previous).forEach(function(key){
    if(key!=="players"&&!Object.prototype.hasOwnProperty.call(next,key))next[key]=clone(previous[key]);
  });
  ["game","qid","wid","word","category","impostorId","at"].forEach(function(key){
    if(Object.prototype.hasOwnProperty.call(previous,key))next[key]=clone(previous[key]);
    else if(["qid","wid","word","category","impostorId"].indexOf(key)!==-1)delete next[key];
  });
  var previousPlayers={};
  (previous.players||[]).forEach(function(player){if(player&&player.profileId)previousPlayers[player.profileId]=player;});
  (next.players||[]).forEach(function(player){
    var old=previousPlayers[player&&player.profileId];if(!old)return;
    Object.keys(old).forEach(function(key){
      if(!Object.prototype.hasOwnProperty.call(player,key))player[key]=clone(old[key]);
    });
    if(Object.prototype.hasOwnProperty.call(old,"role"))player.role=clone(old.role);
    if(Object.prototype.hasOwnProperty.call(old,"termId"))player.termId=clone(old.termId);
    else delete player.termId;
    if(Array.isArray(old.termIds))player.termIds=old.termIds.slice();
    else delete player.termIds;
  });
  return next;
}
function contribution(round,dir){
  dir=dir||1;
  var game=normalizeGame(round.game);
  var roundField={circa:"circaRounds",classic:"classicRounds",whoami:"whoamiRounds",charades:"charadesRounds",personal:"personalRounds"}[game];
  data.stats.rounds=Math.max(0,data.stats.rounds+dir);
  data.stats[roundField]=Math.max(0,(Number(data.stats[roundField])||0)+dir);

  (round.players||[]).forEach(function(rp){
    var st=ensureStat(rp.profileId);
    st.rounds=Math.max(0,st.rounds+dir);
    st[roundField]=Math.max(0,(Number(st[roundField])||0)+dir);
    if(rp.role==="impostor"){
      st.impostor=Math.max(0,st.impostor+dir);
      data.stats.impostor=Math.max(0,(Number(data.stats.impostor)||0)+dir);
      if(game==="personal"){
        st.personalImpostor=Math.max(0,st.personalImpostor+dir);
        data.stats.personalImpostor=Math.max(0,(Number(data.stats.personalImpostor)||0)+dir);
      }
    }
    if(rp.role==="impostor"&&round.impostorEscaped===true)st.impostorEscapes=Math.max(0,st.impostorEscapes+dir);
    if(rp.closest)st.closest=Math.max(0,st.closest+dir);
    if(rp.farthest)st.farthest=Math.max(0,st.farthest+dir);
    if(rp.perfect){
      st.perfect=Math.max(0,st.perfect+dir);
      data.stats.perfectEstimates=Math.max(0,data.stats.perfectEstimates+dir);
    }
    if(game==="charades"){
      var correct=Math.max(0,Number(rp.correct)||0),skipped=Math.max(0,Number(rp.skipped)||0);
      st.charadesCorrect=Math.max(0,st.charadesCorrect+dir*correct);
      st.charadesSkipped=Math.max(0,st.charadesSkipped+dir*skipped);
      st.charadesTurns=Math.max(0,st.charadesTurns+dir);
      data.stats.charadesCorrect=Math.max(0,data.stats.charadesCorrect+dir*correct);
      data.stats.charadesSkipped=Math.max(0,data.stats.charadesSkipped+dir*skipped);
      data.stats.charadesTurns=Math.max(0,data.stats.charadesTurns+dir);
      if(correct>=5&&skipped===0){
        st.charadesCleanTurns=Math.max(0,st.charadesCleanTurns+dir);
        data.stats.charadesCleanTurns=Math.max(0,data.stats.charadesCleanTurns+dir);
      }
      if(dir>0){
        st.charadesBestTurn=Math.max(st.charadesBestTurn,correct);
        data.stats.charadesBestTurn=Math.max(data.stats.charadesBestTurn,correct);
      }
    }
    if(dir>0){
      if(game==="circa"&&round.qid)addUnique(st.circaQids,round.qid);
      if(game==="classic"&&round.wid)addUnique(st.classicWids,round.wid);
      if(game==="whoami"&&rp.termId)addUnique(st.whoamiTermIds,rp.termId);
      if(game==="charades"&&Array.isArray(rp.termIds))rp.termIds.forEach(function(id){addUnique(st.charadesTermIds,id);});
      if(game==="personal"&&round.qid)addUnique(st.personalQids,round.qid);
      if(game==="circa"&&round.category)addUnique(st.categories,round.category);
    }
    if(game==="circa"&&Number.isFinite(Number(rp.error))){
      st.errorSum=Math.max(0,st.errorSum+dir*Number(rp.error));
      st.errorSamples=Math.max(0,st.errorSamples+dir);
    }
  });

  if(dir>0){
    if(game==="circa"&&round.qid)addUnique(data.stats.circaQids,round.qid);
    if(game==="classic"&&round.wid)addUnique(data.stats.classicWids,round.wid);
    if(game==="whoami") (round.players||[]).forEach(function(rp){if(rp.termId)addUnique(data.stats.whoamiTermIds,rp.termId);});
    if(game==="charades") (round.players||[]).forEach(function(rp){if(Array.isArray(rp.termIds))rp.termIds.forEach(function(id){addUnique(data.stats.charadesTermIds,id);});});
    if(game==="personal"&&round.qid)addUnique(data.stats.personalQids,round.qid);
    if(game==="circa"&&round.category)addUnique(data.stats.categories,round.category);
  }
}
function hourSessionDone(){return data.sessions.some(function(s){if(!s.endedAt||!(s.rounds||[]).length)return false;return new Date(s.endedAt).getTime()-new Date(s.startedAt).getTime()>=60*60*1000;});}
function allGamesDone(st){return ["circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds"].every(function(k){return Number(st[k])>0;});}
function roundHasProfile(round,id){return !id||(round.players||[]).some(function(p){return p.profileId===id;});}
function sessionRoundPeak(id){
  var best=0;data.sessions.forEach(function(s){if(!s.endedAt)return;var count=id?(s.rounds||[]).filter(function(r){return roundHasProfile(r,id);}).length:(s.rounds||[]).length;best=Math.max(best,count);});return best;
}
function sessionGamePeak(id){
  var best=0;data.sessions.forEach(function(s){if(!s.endedAt)return;var seen={};(s.rounds||[]).forEach(function(r){if(roundHasProfile(r,id))seen[normalizeGame(r.game)]=true;});best=Math.max(best,Object.keys(seen).length);});return best;
}
function uniqueContentCount(st){
  return ["circaQids","classicWids","whoamiTermIds","charadesTermIds","personalQids"].reduce(function(total,key){return total+(Array.isArray(st[key])?st[key].length:0);},0);
}
function circaPrecision(st){
  var samples=Math.max(0,Number(st.errorSamples)||0),sum=Math.max(0,Number(st.errorSum)||0);
  return {samples:samples,average:samples?sum/samples:null};
}
function bestGlobalCircaPrecision(){
  var best=null,maxSamples=0;
  Object.values(data.profileStats).forEach(function(st){
    var item=circaPrecision(st);maxSamples=Math.max(maxSamples,item.samples);
    if(item.samples>=20&&item.average!==null&&(!best||item.average<best.average))best=item;
  });
  return {best:best,maxSamples:maxSamples};
}
function achievementDefs(){
  function maxProfileValue(key){var m=0;Object.values(data.profileStats).forEach(function(s){m=Math.max(m,Number(s[key])||0);});return m;}
  function globalPrecisionDone(){var p=bestGlobalCircaPrecision();return !!p.best&&p.best.average<=10;}
  function globalPrecisionProgress(){var p=bestGlobalCircaPrecision();if(p.maxSamples<20)return Math.min(20,p.maxSamples)+"/20";if(!p.best)return "20/20";return "Ø "+p.best.average.toLocaleString("de-DE",{maximumFractionDigits:1})+" %";}
  function usageHours(ms){return Math.floor(Math.max(0,Number(ms)||0)/360000)/10;}
  return [
    {id:"first-session",icon:"🎬",title:"Erster Abend",text:"Eine Session mit mindestens einer Runde abgeschlossen",done:function(){return data.sessions.some(function(s){return !!s.endedAt&&Array.isArray(s.rounds)&&s.rounds.length>0;});},progress:function(){return data.sessions.some(function(s){return !!s.endedAt&&Array.isArray(s.rounds)&&s.rounds.length>0;})?"1/1":"0/1";}},
    {id:"warmup-10",icon:"🏁",title:"Warmgelaufen",text:"10 Runden insgesamt spielen",done:function(){return data.stats.rounds>=10;},progress:function(){return Math.min(10,data.stats.rounds)+"/10";}},
    {id:"fifty-rounds",icon:"🎮",title:"Stammspieler",text:"50 Runden insgesamt spielen",done:function(){return data.stats.rounds>=50;},progress:function(){return Math.min(50,data.stats.rounds)+"/50";}},
    {id:"hundred-rounds",icon:"💯",title:"Veteran",text:"100 Runden insgesamt spielen",done:function(){return data.stats.rounds>=100;},progress:function(){return Math.min(100,data.stats.rounds)+"/100";}},
    {id:"all-games",icon:"🎲",title:"Allrounder",text:"Alle fünf Spielmodi mindestens einmal spielen",done:function(){return allGamesDone(data.stats);},progress:function(){var n=["circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds"].filter(function(k){return Number(data.stats[k])>0;}).length;return n+"/5";}},
    {id:"session-20",icon:"🌙",title:"Langer Abend",text:"20 Runden in einer einzigen Session spielen",done:function(){return sessionRoundPeak(null)>=20;},progress:function(){return Math.min(20,sessionRoundPeak(null))+"/20";}},
    {id:"session-games-3",icon:"🔀",title:"Spielwechsel",text:"3 verschiedene Modi in einer Session spielen",done:function(){return sessionGamePeak(null)>=3;},progress:function(){return Math.min(3,sessionGamePeak(null))+"/3";}},
    {id:"session-games-5",icon:"🧩",title:"Volles Programm",text:"Alle 5 Modi in einer Session spielen",done:function(){return sessionGamePeak(null)>=5;},progress:function(){return Math.min(5,sessionGamePeak(null))+"/5";}},

    {id:"circa-25",icon:"📏",title:"Schätzroutine",text:"25 Circa-Runden spielen",done:function(){return data.stats.circaRounds>=25;},progress:function(){return Math.min(25,data.stats.circaRounds)+"/25";}},
    {id:"classic-25",icon:"😶",title:"Pokerface",text:"25 Classic-Runden spielen",done:function(){return data.stats.classicRounds>=25;},progress:function(){return Math.min(25,data.stats.classicRounds)+"/25";}},
    {id:"whoami-10",icon:"❓",title:"Identitätskrise",text:"10 Runden Wer bin ich? spielen",done:function(){return data.stats.whoamiRounds>=10;},progress:function(){return Math.min(10,data.stats.whoamiRounds)+"/10";}},
    {id:"whoami-25",icon:"🤔",title:"Wer war ich nochmal?",text:"25 Runden Wer bin ich? spielen",done:function(){return data.stats.whoamiRounds>=25;},progress:function(){return Math.min(25,data.stats.whoamiRounds)+"/25";}},
    {id:"charades-25",icon:"🎭",title:"Bühnenreif",text:"25 Scharade-Partien spielen",done:function(){return data.stats.charadesRounds>=25;},progress:function(){return Math.min(25,data.stats.charadesRounds)+"/25";}},
    {id:"personal-10",icon:"💬",title:"Persönlich geworden",text:"10 Runden Persönlicher Impostor spielen",done:function(){return data.stats.personalRounds>=10;},progress:function(){return Math.min(10,data.stats.personalRounds)+"/10";}},
    {id:"personal-25",icon:"📖",title:"Offenes Buch",text:"25 Runden Persönlicher Impostor spielen",done:function(){return data.stats.personalRounds>=25;},progress:function(){return Math.min(25,data.stats.personalRounds)+"/25";}},

    {id:"perfect",icon:"🎯",title:"Punktlandung",text:"Eine Circa-Schätzung exakt treffen",done:function(){return data.stats.perfectEstimates>=1;},progress:function(){return data.stats.perfectEstimates>=1?"1/1":"0/1";}},
    {id:"circa-precision-20",icon:"📐",title:"Präzisionsarbeit",text:"20 Circa-Schätzungen mit höchstens 10 % Durchschnittsfehler",done:globalPrecisionDone,progress:globalPrecisionProgress},
    {id:"escape-3",icon:"🕵️",title:"Unentdeckt",text:"3× als Impostor davonkommen",done:function(){return maxProfileValue("impostorEscapes")>=3;},progress:function(){return Math.min(3,maxProfileValue("impostorEscapes"))+"/3";}},
    {id:"escape-10",icon:"👻",title:"Phantom",text:"10× als Impostor davonkommen",done:function(){return maxProfileValue("impostorEscapes")>=10;},progress:function(){return Math.min(10,maxProfileValue("impostorEscapes"))+"/10";}},
    {id:"impostor-10",icon:"🥷",title:"Stammverdächtig",text:"10× die Impostor-Rolle bekommen",done:function(){return data.stats.impostor>=10;},progress:function(){return Math.min(10,data.stats.impostor)+"/10";}},
    {id:"impostor-25",icon:"🕶️",title:"Berufsverdächtig",text:"25× die Impostor-Rolle bekommen",done:function(){return data.stats.impostor>=25;},progress:function(){return Math.min(25,data.stats.impostor)+"/25";}},

    {id:"charades-50",icon:"🎬",title:"Begriffjäger",text:"50 Begriffe bei Scharade richtig erraten",done:function(){return data.stats.charadesCorrect>=50;},progress:function(){return Math.min(50,data.stats.charadesCorrect)+"/50";}},
    {id:"charades-100",icon:"🗣️",title:"100 Begriffe später",text:"100 Scharade-Begriffe richtig erraten",done:function(){return data.stats.charadesCorrect>=100;},progress:function(){return Math.min(100,data.stats.charadesCorrect)+"/100";}},
    {id:"charades-10",icon:"⚡️",title:"Zehnerlauf",text:"10 richtige Begriffe in einer Scharade-Runde",done:function(){return data.stats.charadesBestTurn>=10;},progress:function(){return Math.min(10,data.stats.charadesBestTurn)+"/10";}},
    {id:"charades-clean",icon:"✨",title:"Saubere Runde",text:"Mindestens 5 richtige Begriffe ohne Überspringen",done:function(){return data.stats.charadesCleanTurns>=1;},progress:function(){return data.stats.charadesCleanTurns>=1?"1/1":"0/1";}},
    {id:"charades-clean-5",icon:"💎",title:"Makellos",text:"5 Scharade-Spieler-Runden mit mindestens 5 richtigen und keinem Skip",done:function(){return data.stats.charadesCleanTurns>=5;},progress:function(){return Math.min(5,data.stats.charadesCleanTurns)+"/5";}},

    {id:"collector-100",icon:"🗃️",title:"Sammler",text:"100 unterschiedliche Fragen, Wörter oder Begriffe erleben",done:function(){return uniqueContentCount(data.stats)>=100;},progress:function(){return Math.min(100,uniqueContentCount(data.stats))+"/100";}},
    {id:"marathon",icon:"🕐",title:"Marathon",text:"Eine Session mindestens 60 Minuten spielen",done:hourSessionDone,progress:function(){return hourSessionDone()?"1/1":"0/1";}},

    {id:"app-hour-1",icon:"⏱️",title:"Eingespielt",text:"1 Stunde sichtbare Zeit in der App verbringen",done:function(){return getUsageStats().appMs>=3600000;},progress:function(){var u=getUsageStats().appMs;return Math.min(60,Math.floor(u/60000))+"/60 Min.";}},
    {id:"app-hours-5",icon:"🕔",title:"Stammgast",text:"5 Stunden sichtbare Zeit in der App verbringen",done:function(){return getUsageStats().appMs>=18000000;},progress:function(){var u=getUsageStats().appMs;return Math.min(5,usageHours(u)).toLocaleString("de-DE",{maximumFractionDigits:1})+"/5 h";}},
    {id:"app-hours-10",icon:"🕙",title:"Dauergast",text:"10 Stunden sichtbare Zeit in der App verbringen",done:function(){return getUsageStats().appMs>=36000000;},progress:function(){var u=getUsageStats().appMs;return Math.min(10,usageHours(u)).toLocaleString("de-DE",{maximumFractionDigits:1})+"/10 h";}}
  ];
}
function evaluateAchievements(){
  var unlocked=[];
  achievementDefs().forEach(function(def){
    if(def.done()&&!data.achievements[def.id]){
      data.achievements[def.id]={unlockedAt:now()};
      unlocked.push({id:def.id,icon:def.icon,title:def.title,text:def.text,progress:def.progress()});
    }
  });
  return unlocked;
}
function emitAchievementUnlocks(items){
  if(!items||!items.length||!window||typeof window.dispatchEvent!=="function"||typeof CustomEvent==="undefined")return;
  try{window.dispatchEvent(new CustomEvent("ci:achievement-unlocked",{detail:{items:clone(items)}}));}catch(e){}
}
function profileAchievementDefs(id){
  var st=ensureStat(id);
  function endedSession(){return data.sessions.some(function(s){return !!s.endedAt&&Array.isArray(s.rounds)&&s.rounds.length>0&&Array.isArray(s.profileIds)&&s.profileIds.indexOf(id)!==-1;});}
  function marathon(){return data.sessions.some(function(s){if(!s.endedAt)return false;var rounds=(s.rounds||[]).filter(function(r){return roundHasProfile(r,id);});if(!rounds.length)return false;return new Date(s.endedAt).getTime()-new Date(s.startedAt).getTime()>=60*60*1000;});}
  function precisionDone(){var p=circaPrecision(st);return p.samples>=20&&p.average!==null&&p.average<=10;}
  function precisionProgress(){var p=circaPrecision(st);if(p.samples<20)return Math.min(20,p.samples)+"/20";return "Ø "+p.average.toLocaleString("de-DE",{maximumFractionDigits:1})+" %";}
  return [
    {id:"first-session",icon:"🎬",title:"Erster Abend",text:"Eine Session abgeschlossen",done:endedSession,progress:function(){return endedSession()?"1/1":"0/1";}},
    {id:"warmup-10",icon:"🏁",title:"Warmgelaufen",text:"10 Runden insgesamt spielen",done:function(){return st.rounds>=10;},progress:function(){return Math.min(10,st.rounds)+"/10";}},
    {id:"fifty-rounds",icon:"🎮",title:"Stammspieler",text:"50 Runden insgesamt spielen",done:function(){return st.rounds>=50;},progress:function(){return Math.min(50,st.rounds)+"/50";}},
    {id:"hundred-rounds",icon:"💯",title:"Veteran",text:"100 Runden insgesamt spielen",done:function(){return st.rounds>=100;},progress:function(){return Math.min(100,st.rounds)+"/100";}},
    {id:"all-games",icon:"🎲",title:"Allrounder",text:"Alle fünf Spielmodi mindestens einmal spielen",done:function(){return allGamesDone(st);},progress:function(){var n=["circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds"].filter(function(k){return Number(st[k])>0;}).length;return n+"/5";}},
    {id:"session-20",icon:"🌙",title:"Langer Abend",text:"20 Runden in einer Session mitspielen",done:function(){return sessionRoundPeak(id)>=20;},progress:function(){return Math.min(20,sessionRoundPeak(id))+"/20";}},
    {id:"session-games-3",icon:"🔀",title:"Spielwechsel",text:"3 verschiedene Modi in einer Session mitspielen",done:function(){return sessionGamePeak(id)>=3;},progress:function(){return Math.min(3,sessionGamePeak(id))+"/3";}},
    {id:"session-games-5",icon:"🧩",title:"Volles Programm",text:"Alle 5 Modi in einer Session mitspielen",done:function(){return sessionGamePeak(id)>=5;},progress:function(){return Math.min(5,sessionGamePeak(id))+"/5";}},

    {id:"circa-25",icon:"📏",title:"Schätzroutine",text:"25 Circa-Runden spielen",done:function(){return st.circaRounds>=25;},progress:function(){return Math.min(25,st.circaRounds)+"/25";}},
    {id:"classic-25",icon:"😶",title:"Pokerface",text:"25 Classic-Runden spielen",done:function(){return st.classicRounds>=25;},progress:function(){return Math.min(25,st.classicRounds)+"/25";}},
    {id:"whoami-10",icon:"❓",title:"Identitätskrise",text:"10 Runden Wer bin ich? spielen",done:function(){return st.whoamiRounds>=10;},progress:function(){return Math.min(10,st.whoamiRounds)+"/10";}},
    {id:"whoami-25",icon:"🤔",title:"Wer war ich nochmal?",text:"25 Runden Wer bin ich? spielen",done:function(){return st.whoamiRounds>=25;},progress:function(){return Math.min(25,st.whoamiRounds)+"/25";}},
    {id:"charades-25",icon:"🎭",title:"Bühnenreif",text:"25 Scharade-Partien spielen",done:function(){return st.charadesRounds>=25;},progress:function(){return Math.min(25,st.charadesRounds)+"/25";}},
    {id:"personal-10",icon:"💬",title:"Persönlich geworden",text:"10 persönliche Runden spielen",done:function(){return st.personalRounds>=10;},progress:function(){return Math.min(10,st.personalRounds)+"/10";}},
    {id:"personal-25",icon:"📖",title:"Offenes Buch",text:"25 persönliche Runden spielen",done:function(){return st.personalRounds>=25;},progress:function(){return Math.min(25,st.personalRounds)+"/25";}},

    {id:"perfect",icon:"🎯",title:"Punktlandung",text:"Eine Circa-Schätzung exakt treffen",done:function(){return st.perfect>=1;},progress:function(){return st.perfect>=1?"1/1":"0/1";}},
    {id:"circa-precision-20",icon:"📐",title:"Präzisionsarbeit",text:"20 Circa-Schätzungen mit höchstens 10 % Durchschnittsfehler",done:precisionDone,progress:precisionProgress},
    {id:"escape-3",icon:"🕵️",title:"Unentdeckt",text:"3× als Impostor davonkommen",done:function(){return st.impostorEscapes>=3;},progress:function(){return Math.min(3,st.impostorEscapes)+"/3";}},
    {id:"escape-10",icon:"👻",title:"Phantom",text:"10× als Impostor davonkommen",done:function(){return st.impostorEscapes>=10;},progress:function(){return Math.min(10,st.impostorEscapes)+"/10";}},
    {id:"impostor-10",icon:"🥷",title:"Stammverdächtig",text:"10× die Impostor-Rolle bekommen",done:function(){return st.impostor>=10;},progress:function(){return Math.min(10,st.impostor)+"/10";}},
    {id:"impostor-25",icon:"🕶️",title:"Berufsverdächtig",text:"25× die Impostor-Rolle bekommen",done:function(){return st.impostor>=25;},progress:function(){return Math.min(25,st.impostor)+"/25";}},

    {id:"charades-50",icon:"🎬",title:"Begriffjäger",text:"50 Scharade-Begriffe richtig erraten",done:function(){return st.charadesCorrect>=50;},progress:function(){return Math.min(50,st.charadesCorrect)+"/50";}},
    {id:"charades-100",icon:"🗣️",title:"100 Begriffe später",text:"100 Scharade-Begriffe richtig erraten",done:function(){return st.charadesCorrect>=100;},progress:function(){return Math.min(100,st.charadesCorrect)+"/100";}},
    {id:"charades-10",icon:"⚡️",title:"Zehnerlauf",text:"10 richtige Begriffe in einer Scharade-Runde",done:function(){return st.charadesBestTurn>=10;},progress:function(){return Math.min(10,st.charadesBestTurn)+"/10";}},
    {id:"charades-clean",icon:"✨",title:"Saubere Runde",text:"5 richtige Begriffe ohne Überspringen",done:function(){return st.charadesCleanTurns>=1;},progress:function(){return st.charadesCleanTurns>=1?"1/1":"0/1";}},
    {id:"charades-clean-5",icon:"💎",title:"Makellos",text:"5 Scharade-Runden mit mindestens 5 richtigen und keinem Skip",done:function(){return st.charadesCleanTurns>=5;},progress:function(){return Math.min(5,st.charadesCleanTurns)+"/5";}},

    {id:"collector-100",icon:"🗃️",title:"Sammler",text:"100 unterschiedliche Fragen, Wörter oder Begriffe erleben",done:function(){return uniqueContentCount(st)>=100;},progress:function(){return Math.min(100,uniqueContentCount(st))+"/100";}},
    {id:"marathon",icon:"🕐",title:"Marathon",text:"Bei einer Session mindestens 60 Minuten dabei sein",done:marathon,progress:function(){return marathon()?"1/1":"0/1";}}
  ];
}
function parseNumericProgress(value){
  var match=String(value==null?"":value).replace(",",".").match(/^\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)/);
  if(!match)return null;
  var current=Number(match[1]),target=Number(match[2]);
  if(!Number.isFinite(current)||!Number.isFinite(target)||target<=0)return null;
  return {current:current,target:target,ratio:Math.max(0,Math.min(1,current/target)),remaining:Math.max(0,target-current)};
}
function achievementProgressSnapshot(){
  return achievementDefs().map(function(def){
    var progress=def.progress();
    return {id:def.id,icon:def.icon,title:def.title,text:def.text,done:!!def.done(),progress:progress,numeric:parseNumericProgress(progress)};
  });
}
function profileDisplayName(id){
  var profile=profileById(id)||data.profileArchive[id];
  return profile&&profile.name?profile.name:"Spieler";
}
function previousCircaBest(roundKey,profileIds){
  var wanted={};(profileIds||[]).forEach(function(id){wanted[id]=true;});
  var out={};Object.keys(wanted).forEach(function(id){out[id]=null;});
  (data.sessions||[]).forEach(function(session){
    (session.rounds||[]).forEach(function(round){
      if(round.roundKey===roundKey||normalizeGame(round.game)!=="circa")return;
      (round.players||[]).forEach(function(p){
        if(!wanted[p.profileId]||!Number.isFinite(Number(p.error)))return;
        var error=Math.max(0,Number(p.error));
        if(out[p.profileId]===null||error<out[p.profileId])out[p.profileId]=error;
      });
    });
  });
  return out;
}
function activeSessionGameCount(session){
  var seen={};(session&&session.rounds||[]).forEach(function(round){seen[normalizeGame(round.game)]=true;});
  return Object.keys(seen).length;
}
function nearAchievementFeedback(before,unlockedIds){
  var after=achievementProgressSnapshot(),byIdBefore={},best=null;
  (before||[]).forEach(function(item){byIdBefore[item.id]=item;});
  after.forEach(function(item){
    var prev=byIdBefore[item.id];
    if(!prev||item.done||unlockedIds[item.id]||!prev.numeric||!item.numeric)return;
    var target=item.numeric.target,remaining=item.numeric.remaining,crossed=false,score=0;
    if(target>=10&&remaining===1&&prev.numeric.remaining>1){crossed=true;score=3;}
    else if(target>=20&&item.numeric.ratio>=0.8&&prev.numeric.ratio<0.8){crossed=true;score=2;}
    if(!crossed)return;
    var candidate={
      id:"near-achievement-"+item.id+"-"+item.progress,
      type:"progress",icon:item.icon||"✨",title:"Fast geschafft · "+item.title,
      message:item.progress+" · "+(remaining===1?"noch 1":"Ziel in Sicht"),intensity:1,score:score
    };
    if(!best||candidate.score>best.score)best=candidate;
  });
  if(best)delete best.score;
  return best;
}
function buildRoundFeedback(round,session,context,unlockedItems,categoryUnlockedItems){
  var items=[],unlockedIds={},categoryUnlockedIds={};
  (unlockedItems||[]).forEach(function(item){unlockedIds[item.id]=true;});
  (categoryUnlockedItems||[]).forEach(function(item){categoryUnlockedIds[item.id]=true;});
  function add(item){if(item&&item.id)items.push(item);}
  var previousRound=context.previousRound||null;

  if(round.impostorEscaped===true&&(!previousRound||previousRound.impostorEscaped!==true)){
    var impostor=(round.players||[]).find(function(p){return p.role==="impostor";});
    if(impostor)add({
      id:"escape-"+round.roundKey,type:"performance",icon:"🕵️",title:"Unentdeckt!",
      message:profileDisplayName(impostor.profileId)+" ist als Impostor davongekommen.",intensity:2
    });
  }

  if(context.isNew&&normalizeGame(round.game)==="circa"){
    var circaCandidates=[];
    (round.players||[]).forEach(function(p){
      if(!Number.isFinite(Number(p.error)))return;
      var error=Math.max(0,Number(p.error)),name=profileDisplayName(p.profileId),previous=context.circaBest[p.profileId];
      if(p.perfect||error===0){
        if(!unlockedIds.perfect)circaCandidates.push({id:"perfect-"+round.roundKey+"-"+p.profileId,type:"performance",icon:"🎯",title:"Punktlandung!",message:name+" liegt exakt richtig.",intensity:3});
      }else if(previous!==null&&error<previous&&error>0){
        circaCandidates.push({
          id:"circa-record-"+round.roundKey+"-"+p.profileId,type:"record",icon:"📈",title:"Persönlicher Rekord",
          message:name+": "+error.toLocaleString("de-DE",{maximumFractionDigits:1})+" % daneben.",intensity:error<=10?2:1
        });
      }else if(p.closest&&error<=10){
        circaCandidates.push({
          id:"circa-close-"+round.roundKey+"-"+p.profileId,type:"performance",icon:"🎯",title:"Starke Schätzung",
          message:name+": nur "+error.toLocaleString("de-DE",{maximumFractionDigits:1})+" % daneben.",intensity:error<=5?2:1
        });
      }
    });
    circaCandidates.sort(function(a,b){return b.intensity-a.intensity;});
    if(circaCandidates.length)add(circaCandidates[0]);
  }

  if(context.isNew&&normalizeGame(round.game)==="charades"){
    var charadesCandidates=[];
    (round.players||[]).forEach(function(p){
      var correct=Math.max(0,Number(p.correct)||0),skipped=Math.max(0,Number(p.skipped)||0);
      var before=context.beforeProfiles[p.profileId]||baseProfileStats(),name=profileDisplayName(p.profileId);
      if(correct>=10){
        if(!unlockedIds["charades-10"])charadesCandidates.push({id:"charades-10-"+round.roundKey+"-"+p.profileId,type:"performance",icon:"⚡️",title:"Zehnerlauf!",message:name+" schafft "+correct+" richtige Begriffe.",intensity:3});
      }else if(unlockedIds["charades-clean"]){
        /* The achievement presentation owns this first clean-run moment. */
      }else if(before.charadesBestTurn>0&&correct>before.charadesBestTurn){
        charadesCandidates.push({id:"charades-record-"+round.roundKey+"-"+p.profileId,type:"record",icon:"🔥",title:"Neuer Scharade-Rekord",message:name+": "+correct+" richtige Begriffe.",intensity:2});
      }else if(correct>=7){
        charadesCandidates.push({id:"charades-strong-"+round.roundKey+"-"+p.profileId,type:"performance",icon:"🎬",title:"Starke Runde",message:name+": "+correct+" richtige Begriffe.",intensity:2});
      }else if(correct>=5&&skipped===0){
        charadesCandidates.push({id:"charades-clean-"+round.roundKey+"-"+p.profileId,type:"performance",icon:"✨",title:"Saubere Runde",message:name+": "+correct+" richtig, kein Skip.",intensity:2});
      }
    });
    charadesCandidates.sort(function(a,b){return b.intensity-a.intensity;});
    if(charadesCandidates.length)add(charadesCandidates[0]);
  }

  if(context.isNew){
    var count=(session.rounds||[]).length;
    var milestone={5:1,10:2,20:3,30:2,50:3}[count];
    if(count===10&&(unlockedIds["warmup-10"]||categoryUnlockedIds.spicy))milestone=0;
    if(milestone)add({
      id:"session-rounds-"+session.id+"-"+count,type:"session",icon:count>=20?"🔥":"🎲",
      title:count+". Runde der Session",message:count>=20?"Das ist ein langer Spieleabend.":"Die Runde läuft.",intensity:milestone
    });
    var gamesAfter=activeSessionGameCount(session);
    if(context.sessionGamesBefore<5&&gamesAfter>=5)add({
      id:"session-all-games-"+session.id,type:"session",icon:"🧩",title:"Volles Programm",
      message:"Alle fünf Spielmodi in einer Session gespielt.",intensity:3
    });

    var levelUp=profileLevelFeedback(round,context);
    if(levelUp)add(levelUp);
    var near=nearAchievementFeedback(context.achievementBefore,unlockedIds);
    if(near)add(near);
  }

  var seen={};
  items=items.filter(function(item){if(seen[item.id])return false;seen[item.id]=true;return true;});
  items.sort(function(a,b){return (b.intensity||1)-(a.intensity||1);});
  return items.slice(0,3);
}
function buildSessionFeedback(session){
  if(!session||!(session.rounds||[]).length)return [];
  var rounds=session.rounds.length,minutes=Math.max(0,Math.round((new Date(session.endedAt).getTime()-new Date(session.startedAt).getTime())/60000));
  var message=rounds+" "+(rounds===1?"Runde":"Runden");
  if(minutes>0)message+=" · "+minutes+" Min.";
  var firstAward=(session.awards||[])[0];
  if(firstAward)message+=" · "+firstAward.title+": "+profileDisplayName(firstAward.profileId);
  return [{
    id:"session-finished-"+session.id,type:"session-end",icon:"🏁",
    title:rounds>=20?"Starker Spieleabend":"Session abgeschlossen",
    message:message,intensity:rounds>=20?3:2
  }];
}
function emitMotivationalFeedback(items){
  if(!items||!items.length||!window||typeof window.dispatchEvent!=="function"||typeof CustomEvent==="undefined")return;
  try{window.dispatchEvent(new CustomEvent("ci:motivational-feedback",{detail:{items:clone(items)}}));}catch(e){}
}

function recordRound(input){
  if(!input||!input.game)return false;
  var session=data.activeSessionId&&sessionById(data.activeSessionId);
  if(!session||session.endedAt){
    beginSession(input.players||[]);
    session=sessionById(data.activeSessionId);
  }

  var round=clone(input);
  round.at=round.at||now();
  round.roundKey=String(round.roundKey||uid("round"));
  round.players=(round.players||[]).map(function(p){
    var profileId=p&&p.profileId&&profileById(p.profileId)?p.profileId:null;
    if(!profileId&&p&&cleanName(p.name))profileId=ensureProfileForPlayer(p);
    if(!profileId)return null;
    var out=Object.assign({},p,{profileId:profileId});
    delete out.name;delete out.avatar;
    return out;
  }).filter(Boolean);

  var existing=session.rounds.findIndex(function(r){return r.roundKey===round.roundKey;});
  var previousRound=existing>=0?clone(session.rounds[existing]):null;
  if(previousRound)round=preserveRoundContentIdentity(previousRound,round);
  session.lastGame=normalizeGame(round.game);
  if(!session.gameStartedAt)session.gameStartedAt=round.at||now();
  var beforeProfiles={},roundIds=round.players.map(function(p){return p.profileId;});
  roundIds.forEach(function(id){beforeProfiles[id]=clone(data.profileStats[id]||baseProfileStats());});
  var feedbackContext={
    isNew:existing<0,
    previousRound:previousRound,
    beforeProfiles:beforeProfiles,
    circaBest:previousCircaBest(round.roundKey,roundIds),
    sessionGamesBefore:activeSessionGameCount(session),
    achievementBefore:achievementProgressSnapshot()
  };
  if(existing>=0){
    contribution(session.rounds[existing],-1);
    session.rounds[existing]=round;
  }else{
    session.rounds.push(round);
  }
  contribution(round,1);

  var roundProfileIds=[];
  round.players.forEach(function(p){
    if(session.profileIds.indexOf(p.profileId)===-1)session.profileIds.push(p.profileId);
    if(roundProfileIds.indexOf(p.profileId)===-1)roundProfileIds.push(p.profileId);
  });
  if(roundProfileIds.length)session.lastProfileIds=roundProfileIds;

  var categoryUnlocked=evaluateCategoryUnlocks();
  var ticketEarned=evaluateCategoryTicketNotices();
  var unlocked=evaluateAchievements();
  var feedback=buildRoundFeedback(round,session,feedbackContext,unlocked,categoryUnlocked);
  save();
  queueProgressIntegritySeal();
  emitAchievementUnlocks(unlocked);
  emitCategoryUnlocks(categoryUnlocked);
  emitCategoryTicketEarned(ticketEarned);
  emitMotivationalFeedback(feedback);
  return true;
}
function computeAwards(session){
  var best=null,wild=null,escapes={},impostors={},charadesCorrect={},charadesSkipped={},charadesTurns={};
  (session.rounds||[]).forEach(function(round){
    (round.players||[]).forEach(function(p){
      if(p.role==="impostor"){
        impostors[p.profileId]=(impostors[p.profileId]||0)+1;
        if(round.impostorEscaped===true)escapes[p.profileId]=(escapes[p.profileId]||0)+1;
      }
      if(round.game==="circa"&&Number.isFinite(Number(p.error))){
        var item={profileId:p.profileId,error:Number(p.error)};
        if(!best||item.error<best.error)best=item;
        if(!wild||item.error>wild.error)wild=item;
      }
      if(round.game==="charades"){
        charadesCorrect[p.profileId]=(charadesCorrect[p.profileId]||0)+Math.max(0,Number(p.correct)||0);
        charadesSkipped[p.profileId]=(charadesSkipped[p.profileId]||0)+Math.max(0,Number(p.skipped)||0);
        charadesTurns[p.profileId]=(charadesTurns[p.profileId]||0)+1;
      }
    });
  });
  function maxEntry(map){
    var entries=Object.entries(map);if(!entries.length)return null;
    entries.sort(function(a,b){return b[1]-a[1];});return {profileId:entries[0][0],value:entries[0][1]};
  }
  var deception=maxEntry(escapes),frequent=maxEntry(impostors),charadesStar=maxEntry(charadesCorrect),out=[];
  if(best)out.push({type:"best",icon:"🎯",title:"Beste Schätzung",profileId:best.profileId,detail:best.error.toLocaleString("de-DE",{maximumFractionDigits:1})+" % daneben"});
  if(charadesStar&&charadesStar.value>0)out.push({type:"charades",icon:"🎬",title:"Begriffjäger",profileId:charadesStar.profileId,detail:charadesStar.value+" richtig"});
  if(deception)out.push({type:"deception",icon:"🕵️",title:"Täuschungsmeister",profileId:deception.profileId,detail:deception.value+"× unentdeckt"});
  if(frequent)out.push({type:"impostor",icon:"🔥",title:"Dauerverdächtig",profileId:frequent.profileId,detail:frequent.value+"× Imposter"});
  if(wild)out.push({type:"wild",icon:"😵",title:"Wildeste Schätzung",profileId:wild.profileId,detail:wild.error.toLocaleString("de-DE",{maximumFractionDigits:0})+" % daneben"});
  return out.slice(0,4);
}
function endSession(){
  var s=data.activeSessionId&&sessionById(data.activeSessionId);
  if(!s||s.endedAt)return null;
  var crewBefore=computeCrew(s.profileIds);
  s.endedAt=now();s.awards=computeAwards(s);data.activeSessionId=null;
  var crewAfter=computeCrew(s.profileIds);
  var categoryUnlocked=evaluateCategoryUnlocks();
  var unlocked=evaluateAchievements();
  var crewFeedback=buildCrewFeedback(crewBefore,crewAfter);
  var feedback=crewFeedback.length?crewFeedback:buildSessionFeedback(s);
  save();
  queueProgressIntegritySeal();
  emitAchievementUnlocks(unlocked);
  emitCategoryUnlocks(categoryUnlocked);
  emitMotivationalFeedback(feedback);
  return clone(s);
}
function getAchievements(){
  evaluateAchievements();save();
  return achievementDefs().map(function(def){
    var override=achievementOverride(def.id,null);
    var actual=!!data.achievements[def.id];
    return {id:def.id,icon:def.icon,title:def.title,text:def.text,unlocked:override===null?actual:override,unlockedAt:data.achievements[def.id]&&data.achievements[def.id].unlockedAt,progress:def.progress(),devOverride:override};
  });
}
function getProfileAchievements(id){
  if(!profileById(id)&&!data.profileArchive[id])return [];
  return profileAchievementDefs(id).map(function(def){
    var override=achievementOverride(def.id,id);
    var actual=!!def.done();
    return {id:def.id,icon:def.icon,title:def.title,text:def.text,unlocked:override===null?actual:override,progress:def.progress(),devOverride:override};
  });
}
function usageCommit(ts){
  data.usage=normalizeUsage(data.usage);
  var last=Number(data.usage.lastTickAt);
  if(last>0){
    var delta=Math.max(0,Number(ts)-last);
    /* Heartbeats run every 15 s. Ignore long gaps so background/sleep time is never counted. */
    if(delta>0&&delta<=60000){
      data.usage.appMs+=delta;
      if(GAME_IDS.indexOf(data.usage.activeGame)!==-1)data.usage.games[data.usage.activeGame]+=delta;
    }
  }
}
function trackUsage(game){
  var ts=Date.now();usageCommit(ts);
  data.usage.lastTickAt=ts;
  data.usage.activeGame=GAME_IDS.indexOf(game)!==-1?game:null;
  var unlocked=evaluateAchievements();
  save();emitAchievementUnlocks(unlocked);return true;
}
function pauseUsage(){
  var ts=Date.now();usageCommit(ts);
  data.usage.lastTickAt=null;data.usage.activeGame=null;
  save();return true;
}
function getUsageStats(){
  var out=normalizeUsage(data.usage),last=Number(data.usage&&data.usage.lastTickAt);
  if(last>0){
    var delta=Math.max(0,Date.now()-last);
    if(delta>0&&delta<=60000){
      out.appMs+=delta;
      if(GAME_IDS.indexOf(data.usage.activeGame)!==-1)out.games[data.usage.activeGame]+=delta;
    }
  }
  out.lastTickAt=null;out.activeGame=null;
  return clone(out);
}
function getStats(){return clone(data.stats);}
function getProfileStats(id){return clone(data.profileStats[id]||baseProfileStats());}
function devPatchStats(scope,profileId,patch){
  patch=patch&&typeof patch==="object"&&!Array.isArray(patch)?patch:{};
  if(scope==="profile"){
    if(!profileById(profileId))return null;
    var source={};source[profileId]=Object.assign({},ensureStat(profileId),patch);
    var safeProfile=sanitizeImportedProfileStats(source)[profileId];
    if(!safeProfile)return null;
    data.profileStats[profileId]=safeProfile;
    evaluateCategoryUnlocks();evaluateAchievements();markIntegrityDevDirty();save();return clone(safeProfile);
  }
  data.stats=sanitizeImportedStats(Object.assign({},data.stats,patch));
  evaluateCategoryUnlocks();evaluateAchievements();markIntegrityDevDirty();save();return clone(data.stats);
}
function devReplaceStats(scope,profileId,next){
  next=next&&typeof next==="object"&&!Array.isArray(next)?next:{};
  if(scope==="profile"){
    if(!profileById(profileId))return null;
    var source={};source[profileId]=next;
    var safeProfile=sanitizeImportedProfileStats(source)[profileId];
    if(!safeProfile)return null;
    data.profileStats[profileId]=safeProfile;
    evaluateCategoryUnlocks();evaluateAchievements();markIntegrityDevDirty();save();return clone(safeProfile);
  }
  data.stats=sanitizeImportedStats(next);
  evaluateCategoryUnlocks();evaluateAchievements();markIntegrityDevDirty();save();return clone(data.stats);
}
function devResetStats(scope,profileId){
  return devReplaceStats(scope,profileId,scope==="profile"?baseProfileStats():baseStats());
}
function devSetUsage(next){
  data.usage=normalizeUsage(next);
  data.usage.lastTickAt=null;data.usage.activeGame=null;
  markIntegrityDevDirty();save();return getUsageStats();
}
function devSetAchievementOverride(id,value,profileId){
  id=String(id||"").trim().slice(0,100);if(!id)return false;
  var map;
  if(profileId){
    if(!profileById(profileId)&&!data.profileArchive[profileId])return false;
    if(!devState.profileAchievements[profileId])devState.profileAchievements[profileId]={};
    map=devState.profileAchievements[profileId];
  }else map=devState.globalAchievements;
  if(value===true||value===false)map[id]=value;
  else delete map[id];
  if(profileId&&Object.keys(map).length===0)delete devState.profileAchievements[profileId];
  return saveDevState();
}
function devClearAchievementOverrides(profileId){
  if(profileId)delete devState.profileAchievements[profileId];
  else devState.globalAchievements={};
  return saveDevState();
}
function devGetAchievementOverrides(){return clone(devState);}
function devClearSessions(){
  data.sessions=[];data.activeSessionId=null;markIntegrityDevDirty();save();return true;
}
function devDeleteSession(id){
  var before=data.sessions.length;
  data.sessions=data.sessions.filter(function(session){return session.id!==id;});
  if(data.activeSessionId===id)data.activeSessionId=null;
  if(data.sessions.length<before)markIntegrityDevDirty();
  save();return data.sessions.length<before;
}
function getSessions(){return clone(data.sessions.slice().reverse());}
function getActiveSession(){var s=data.activeSessionId&&sessionById(data.activeSessionId);return s?clone(s):null;}
function getPreferences(){return clone(data.preferences);}
function setPreference(key,value){
  if(["sound","haptics","animations"].indexOf(key)===-1)return false;
  data.preferences[key]=!!value;save();return true;
}
function presetSummary(p){
  var game=GAME_IDS.indexOf(p&&p.game)!==-1?p.game:"circa";
  var label={circa:"Circa",classic:"Classic",whoami:"Wer bin ich?",charades:"Scharade",personal:"Persönlich"}[game];
  var categories=Array.isArray(p&&p.categories)?p.categories:[];
  var categoryText=!categories.length?"":categories[0]==="Alle"?" · Alle":categories.length===1?" · "+categories[0]:" · "+categories.length+" Kat.";
  var optionText=game==="circa"?" · "+(p&&p.difficulty==="zufaellig"?"Zufall":(p&&p.difficulty||"mittel")):game==="classic"&&Number(p&&p.timer)?" · "+Math.round(Number(p.timer)/60)+" Min.":game==="charades"?" · "+(Number(p&&p.timer)||60)+" Sek.":"";
  return label+" · "+Math.max(0,Number(p&&p.playerCount)||0)+" Spieler"+categoryText+optionText;
}
function builtInPresets(){
  return [
    {id:"builtin-quick",builtIn:true,name:"Schnelle Runde",icon:"⚡️",game:"circa",playerCount:4,profileIds:[],categories:["Alle"],difficulty:"zufaellig",summary:"Circa · 4 Spieler · Zufall"},
    {id:"builtin-party",builtIn:true,name:"Party",icon:"🥳",game:"classic",playerCount:6,profileIds:[],categories:["Alle"],hint:true,timer:180,summary:"Classic · 6 Spieler · 3 Min."},
    {id:"builtin-spicy",builtIn:true,name:"Spicy",icon:"🌶️",game:"circa",playerCount:5,profileIds:[],categories:["Spicy 🌶️"],difficulty:"mittel",summary:"Circa · 5 Spieler · Spicy"},
    {id:"builtin-charades",builtIn:true,name:"Scharade 60",icon:"🎬",game:"charades",playerCount:4,profileIds:[],categories:["Alle"],timer:60,summary:"Scharade · 4 Spieler · 60 Sek."},
    {id:"builtin-personal",builtIn:true,name:"Persönlich",icon:"💬",game:"personal",playerCount:4,profileIds:[],categories:[],summary:"Persönlich · 4 Spieler"}
  ];
}
function getPresets(){return builtInPresets().concat(clone(data.presets));}
function savePreset(input){
  input=input||{};
  var game=GAME_IDS.indexOf(input.game)!==-1?input.game:"circa";
  var minPlayers=(game==="whoami"||game==="charades")?2:3;
  var profileIds=[];
  (Array.isArray(input.profileIds)?input.profileIds:[]).forEach(function(id){if(profileById(id)&&profileIds.indexOf(id)===-1&&profileIds.length<12)profileIds.push(id);});
  var playerCount=profileIds.length||Math.max(minPlayers,Math.min(12,Number(input.playerCount)||4));
  var categories=game==="personal"?[]:(Array.isArray(input.categories)&&input.categories.length?input.categories.map(String).slice(0,20):["Alle"]);
  if(categories.indexOf("Alle")!==-1)categories=["Alle"];
  var allowedClassicTimers=[0,60,90,120,150,180,210,240,270,300];
  var allowedCharadesTimers=[30,45,60,90,120];
  var p={
    id:input.id&&String(input.id).indexOf("custom-")===0?input.id:uid("custom"),
    builtIn:false,
    name:String(input.name||"Eigenes Preset").trim().slice(0,22)||"Eigenes Preset",
    icon:String(input.icon||({circa:"🎯",classic:"🎭",whoami:"❓",charades:"🎬",personal:"💬"}[game]||"⭐️")).slice(0,8),
    game:game,
    playerCount:playerCount,
    profileIds:profileIds,
    categories:categories,
    difficulty:["leicht","mittel","schwer","zufaellig"].indexOf(input.difficulty)!==-1?input.difficulty:"mittel",
    hint:input.hint!==false,
    timer:game==="charades"?(allowedCharadesTimers.indexOf(Number(input.timer))!==-1?Number(input.timer):60):(allowedClassicTimers.indexOf(Number(input.timer))!==-1?Number(input.timer):0)
  };
  p.summary=presetSummary(p);
  var idx=data.presets.findIndex(function(x){return x.id===p.id;});
  if(idx>=0)data.presets[idx]=p;else data.presets.push(p);
  save();return clone(p);
}
function deletePreset(id){
  var before=data.presets.length;
  data.presets=data.presets.filter(function(p){return p.id!==id;});
  save();return data.presets.length<before;
}
function setLaunchPreset(preset){
  data.launchPreset=preset?clone(preset):null;
  if(preset)data.launchGroup=null;
  save();
}
function consumeLaunchPreset(game){
  var p=data.launchPreset;
  if(!p||p.game!==game)return null;
  data.launchPreset=null;save();return clone(p);
}
function setLaunchGroup(profileIds){
  var ids=[];
  (profileIds||[]).forEach(function(id){if(profileById(id)&&ids.indexOf(id)===-1)ids.push(id);});
  data.launchGroup=ids.length?ids:null;
  if(ids.length)data.launchPreset=null;
  save();return ids.length;
}
function consumeLaunchGroup(){
  var ids=Array.isArray(data.launchGroup)?data.launchGroup.slice():null;
  data.launchGroup=null;save();
  if(!ids||!ids.length)return null;
  return ids.map(function(id){return profileById(id);}).filter(Boolean).map(clone);
}
function setActiveSessionGame(game,activity,resetClock){
  var session=data.activeSessionId&&sessionById(data.activeSessionId);
  if(!session||session.endedAt)return false;
  var normalized=normalizeGame(game);
  if(resetClock===true||session.lastGame!==normalized||!session.gameStartedAt)session.gameStartedAt=now();
  session.lastGame=normalized;
  session.activity=activity?String(activity).slice(0,80):session.activity||null;
  save();return true;
}
function sanitizeLegacyCircaSource(){
  return {players:[],rounds:0,qids:[],hasData:false,fingerprint:"prototype-isolated"};
}
function getLegacyImportStatus(){
  var imported=data.imports&&data.imports.legacyCircaData;
  if(!imported)return {imported:false};
  return {
    imported:true,
    importedAt:imported.importedAt||null,
    players:Array.isArray(imported.players)?imported.players.length:0,
    rounds:Math.max(0,Number(imported.rounds)||0),
    questions:Array.isArray(imported.qids)?imported.qids.length:0
  };
}
function importLegacyCirca(){
  var source=sanitizeLegacyCircaSource();
  if(!source.hasData)return {ok:false,reason:"empty",players:0,rounds:0,questions:0};

  var previous=data.imports&&data.imports.legacyCircaData;
  if(previous&&previous.fingerprint===source.fingerprint){
    return {ok:false,reason:"already",players:source.players.length,rounds:source.rounds,questions:source.qids.length};
  }

  data.imports.legacyCircaData={
    importedAt:now(),
    fingerprint:source.fingerprint,
    players:clone(source.players),
    rounds:source.rounds,
    qids:source.qids.slice()
  };
  data.imports.legacyCirca=true;
  rebuildAggregates();
  save();
  queueProgressIntegritySeal();
  return {ok:true,updated:!!previous,players:source.players.length,rounds:source.rounds,questions:source.qids.length};
}
function sanitizeImportedProfile(p){
  if(!p||typeof p!=="object")return null;
  var id=String(p.id||"").trim();
  var name=cleanName(p.name);
  if(!id||!name)return null;
  return {
    id:id.slice(0,80),
    name:name,
    avatar:String(p.avatar||"😎").slice(0,8),
    aliases:Array.isArray(p.aliases)?p.aliases.map(cleanName).filter(function(alias){return alias&&!isGenericPlayerName(alias);}).slice(-8):[],
    createdAt:p.createdAt||now()
  };
}
function sanitizeImportedStats(src){
  src=src&&typeof src==="object"?src:{};
  var safe=baseStats();
  ["rounds","circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds","impostor","personalImpostor","perfectEstimates","charadesCorrect","charadesSkipped","charadesTurns","charadesBestTurn","charadesCleanTurns"].forEach(function(k){safe[k]=Math.max(0,Number(src[k])||0);});
  safe.circaQids=Array.isArray(src.circaQids)?src.circaQids.map(String).slice(0,520):[];
  safe.classicWids=Array.isArray(src.classicWids)?src.classicWids.map(String).slice(0,250):[];
  safe.whoamiTermIds=Array.isArray(src.whoamiTermIds)?src.whoamiTermIds.map(String).slice(0,275):[];
  safe.charadesTermIds=Array.isArray(src.charadesTermIds)?src.charadesTermIds.map(String).slice(0,300):[];
  safe.personalQids=Array.isArray(src.personalQids)?src.personalQids.map(String).slice(0,500):[];
  safe.categories=Array.isArray(src.categories)?src.categories.map(String).slice(0,30):[];
  return safe;
}
function sanitizeImportedProfileStats(src){
  var out={};if(!src||typeof src!=="object"||Array.isArray(src))return out;
  Object.keys(src).slice(0,250).forEach(function(id){
    var item=src[id]||{},safe=baseProfileStats();
    ["rounds","circaRounds","classicRounds","whoamiRounds","charadesRounds","personalRounds","impostor","personalImpostor","impostorEscapes","closest","farthest","perfect","errorSum","errorSamples","charadesCorrect","charadesSkipped","charadesTurns","charadesBestTurn","charadesCleanTurns"].forEach(function(k){safe[k]=Math.max(0,Number(item[k])||0);});
    safe.circaQids=Array.isArray(item.circaQids)?item.circaQids.map(String).slice(0,520):[];
    safe.classicWids=Array.isArray(item.classicWids)?item.classicWids.map(String).slice(0,250):[];
    safe.whoamiTermIds=Array.isArray(item.whoamiTermIds)?item.whoamiTermIds.map(String).slice(0,275):[];
    safe.charadesTermIds=Array.isArray(item.charadesTermIds)?item.charadesTermIds.map(String).slice(0,300):[];
    safe.personalQids=Array.isArray(item.personalQids)?item.personalQids.map(String).slice(0,500):[];
    safe.categories=Array.isArray(item.categories)?item.categories.map(String).slice(0,30):[];
    safe.legacyPerfectUnknown=item.legacyPerfectUnknown===true;
    safe.legacyCategoryUnknown=item.legacyCategoryUnknown===true;
    out[String(id).slice(0,80)]=safe;
  });
  return out;
}
function sanitizeImportedSessions(src){
  if(!Array.isArray(src))return [];
  return src.slice(-MAX_SESSIONS).filter(function(x){return x&&typeof x==="object";}).map(function(x){
    return {
      id:String(x.id||uid("session")).slice(0,100),
      startedAt:x.startedAt||now(),
      endedAt:x.endedAt||null,
      profileIds:Array.isArray(x.profileIds)?x.profileIds.map(String).slice(0,20):[],
      lastProfileIds:Array.isArray(x.lastProfileIds)?x.lastProfileIds.map(String).slice(0,20):[],
      rounds:Array.isArray(x.rounds)?clone(x.rounds.slice(0,500)):[],
      awards:Array.isArray(x.awards)?clone(x.awards.slice(0,12)):[],
      lastGame:GAME_IDS.indexOf(x.lastGame)!==-1?x.lastGame:null,
      gameStartedAt:x.gameStartedAt||null,
      activity:x.activity?String(x.activity).slice(0,80):null
    };
  });
}
function snapshotGameStorage(){
  var out={};
  GAME_STORAGE_KEYS.forEach(function(suffix){
    try{
      var raw=localStorage.getItem(GAME_STORAGE_PREFIX+suffix);
      if(raw===null)return;
      var value=JSON.parse(raw);
      out[suffix]=value;
    }catch(e){}
  });
  return out;
}
function clearCurrentGameStorage(){
  try{
    var keys=[];
    for(var i=0;i<localStorage.length;i++){
      var key=localStorage.key(i);
      if(key&&key.indexOf(GAME_STORAGE_PREFIX)===0)keys.push(key);
    }
    keys.forEach(function(key){localStorage.removeItem(key);});
    return true;
  }catch(e){return false;}
}
function restoreGameStorage(snapshot){
  clearCurrentGameStorage();
  if(snapshot&&typeof snapshot==="object"&&!Array.isArray(snapshot)){
    GAME_STORAGE_KEYS.forEach(function(suffix){
      if(!Object.prototype.hasOwnProperty.call(snapshot,suffix))return;
      try{localStorage.setItem(GAME_STORAGE_PREFIX+suffix,JSON.stringify(snapshot[suffix]));}catch(e){}
    });
  }
  try{
    if(localStorage.getItem(GAME_STORAGE_PREFIX+"v72Migration.v1")===null){
      localStorage.setItem(GAME_STORAGE_PREFIX+"v72Migration.v1",JSON.stringify({completed:true,restored:true,at:now()}));
    }
    if(localStorage.getItem(GAME_STORAGE_PREFIX+"v73Migration.v1")===null){
      localStorage.setItem(GAME_STORAGE_PREFIX+"v73Migration.v1",JSON.stringify({completed:true,restored:true,at:now()}));
    }
  }catch(e){}
}
function canonicalBackupJson(value){
  if(value===null)return "null";
  if(Array.isArray(value))return "["+value.map(function(item){return canonicalBackupJson(item===undefined?null:item);}).join(",")+"]";
  if(typeof value==="object"){
    return "{"+Object.keys(value).sort().filter(function(key){
      return value[key]!==undefined&&typeof value[key]!=="function";
    }).map(function(key){
      return JSON.stringify(key)+":"+canonicalBackupJson(value[key]);
    }).join(",")+"}";
  }
  return JSON.stringify(value);
}
function backupIntegrityPayload(src){
  return {
    format:src.format,
    formatVersion:Number(src.formatVersion),
    exportedAt:src.exportedAt||null,
    data:src.data,
    gameStorage:src.gameStorage&&typeof src.gameStorage==="object"&&!Array.isArray(src.gameStorage)?src.gameStorage:{}
  };
}
async function backupSha256(src){
  var cryptoApi=(window&&window.crypto)||crypto;
  if(!cryptoApi||!cryptoApi.subtle||typeof cryptoApi.subtle.digest!=="function"||typeof TextEncoder==="undefined")throw new Error("sha256-unavailable");
  var bytes=new TextEncoder().encode(canonicalBackupJson(backupIntegrityPayload(src)));
  var digest=await cryptoApi.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest)).map(function(byte){return byte.toString(16).padStart(2,"0");}).join("");
}
async function importSnapshot(input){
  var src=input,gameStorage=null;
  if(typeof src==="string"){try{src=JSON.parse(src);}catch(e){return {ok:false,reason:"json"};}}
  if(!src||typeof src!=="object"||Array.isArray(src))return {ok:false,reason:"shape"};
  if(src.format!==BACKUP_FORMAT)return {ok:false,reason:"format"};
  var version=Number(src.formatVersion);
  if(version!==BACKUP_VERSION)return {ok:false,reason:"version"};
  var integrity=src.integrity;
  if(!integrity||integrity.algorithm!=="SHA-256"||typeof integrity.sha256!=="string"||!/^[a-f0-9]{64}$/i.test(integrity.sha256))return {ok:false,reason:"integrity"};
  var actualHash="";
  try{actualHash=await backupSha256(src);}catch(e){return {ok:false,reason:"integrity-unavailable"};}
  if(actualHash.toLowerCase()!==integrity.sha256.toLowerCase())return {ok:false,reason:"integrity"};
  gameStorage=src.gameStorage&&typeof src.gameStorage==="object"&&!Array.isArray(src.gameStorage)?src.gameStorage:null;
  src=src.data;
  if(!src||typeof src!=="object"||Array.isArray(src))return {ok:false,reason:"shape"};
  if(!Array.isArray(src.profiles)||!src.profiles.length)return {ok:false,reason:"profiles"};

  var profiles=[],seen={},seenNames={},duplicateProfileName=false,duplicateProfileId=false,invalidProfile=false;
  src.profiles.forEach(function(item){
    var p=sanitizeImportedProfile(item);
    if(!p){invalidProfile=true;return;}
    if(seen[p.id]){duplicateProfileId=true;return;}
    var nameKey=p.name.toLocaleLowerCase("de-DE");
    if(seenNames[nameKey]){duplicateProfileName=true;return;}
    seen[p.id]=true;seenNames[nameKey]=true;profiles.push(p);
  });
  if(duplicateProfileId)return {ok:false,reason:"duplicate-profiles"};
  if(duplicateProfileName)return {ok:false,reason:"duplicate-profiles"};
  if(invalidProfile||!profiles.length)return {ok:false,reason:"profiles"};

  var archive={};
  if(src.profileArchive&&typeof src.profileArchive==="object"&&!Array.isArray(src.profileArchive)){
    Object.keys(src.profileArchive).slice(0,250).forEach(function(id){
      var p=sanitizeImportedProfile(src.profileArchive[id]);
      if(p&&!seen[p.id])archive[p.id]=Object.assign(p,{deletedAt:src.profileArchive[id].deletedAt||null});
    });
  }

  var selectedId=String(src.selectedProfileId||src.primaryProfileId||"");
  if(!profiles.some(function(p){return p.id===selectedId;}))selectedId=profiles[0].id;

  var imported={
    schemaVersion:1,
    selectedProfileId:selectedId,
    primaryProfileId:selectedId,
    profiles:profiles,
    profileStats:sanitizeImportedProfileStats(src.profileStats),
    profileArchive:archive,
    stats:sanitizeImportedStats(src.stats),
    usage:normalizeUsage(src.usage),
    categoryProgress:normalizeCategoryProgress(src.categoryProgress),
    crewProgress:normalizeCrewProgress(src.crewProgress),
    sessions:sanitizeImportedSessions(src.sessions),
    activeSessionId:null,
    achievements:src.achievements&&typeof src.achievements==="object"&&!Array.isArray(src.achievements)?clone(src.achievements):{},
    presets:Array.isArray(src.presets)?clone(src.presets.slice(0,50)):[],
    launchPreset:null,
    launchGroup:null,
    preferences:{
      sound:!src.preferences||src.preferences.sound!==false,
      haptics:!src.preferences||src.preferences.haptics!==false,
      animations:!src.preferences||src.preferences.animations!==false
    },
    imports:src.imports&&typeof src.imports==="object"&&!Array.isArray(src.imports)?clone(src.imports):{}
  };
  imported.usage.lastTickAt=null;imported.usage.activeGame=null;
  imported.imports.restoredFromBackupAt=now();
  imported.imports.v72DetailBackfillV1=true;

  var activeId=String(src.activeSessionId||"");
  if(activeId&&imported.sessions.some(function(x){return x.id===activeId&&!x.endedAt;}))imported.activeSessionId=activeId;

  if(imported.categoryProgress.ticketNotices===null)imported.categoryProgress.ticketNotices=ticketsEarnedForRounds(imported.stats.rounds);
  var plausibility=validateBackupPlausibility(imported,src);
  if(!plausibility.ok)return plausibility;

  data=imported;
  evaluateCategoryUnlocks();
  evaluateAchievements();
  if(!save())return {ok:false,reason:"storage"};
  restoreGameStorage(gameStorage);
  await acceptCurrentProgressAsTrusted();
  return {ok:true,profiles:data.profiles.length,sessions:data.sessions.length,rounds:data.stats.rounds,gameStorage:!!gameStorage};
}
function applyCircaQuestionMetadata(items){
  if(!Array.isArray(items)||!items.length)return false;
  var categoryByQid={};
  items.forEach(function(item){
    if(item&&item.qid&&item.cat)categoryByQid[String(item.qid)]=String(item.cat);
  });
  function categoriesFor(qids){
    var out=[];
    (Array.isArray(qids)?qids:[]).forEach(function(qid){
      var cat=categoryByQid[String(qid)];
      if(cat&&out.indexOf(cat)===-1)out.push(cat);
    });
    return out;
  }
  function sameList(a,b){
    a=Array.isArray(a)?a:[];b=Array.isArray(b)?b:[];
    return a.length===b.length&&a.every(function(value,index){return value===b[index];});
  }
  var changed=false;
  var globalCategories=categoriesFor(data.stats.circaQids);
  if(!sameList(data.stats.categories,globalCategories)){data.stats.categories=globalCategories;changed=true;}
  Object.keys(data.profileStats||{}).forEach(function(id){
    var st=data.profileStats[id];
    if(!st)return;
    var profileCategories=categoriesFor(st.circaQids);
    if(!sameList(st.categories,profileCategories)){st.categories=profileCategories;changed=true;}
  });
  if(changed){save();queueProgressIntegritySeal();}
  return changed;
}
function getMigrationStatus(){
  return {
    completed:!!(data.imports&&data.imports.v72MigrationCompleted),
    profileChoicePending:!!(data.imports&&data.imports.v72ProfileChoicePending),
    profilesFound:Math.max(0,Number(data.imports&&data.imports.v72ProfilesFound)||0),
    migratedAt:data.imports&&data.imports.v72MigratedAt||null,
    perfectUnknown:!!(data.imports&&data.imports.v72PerfectUnknown)
  };
}
function completeMigrationProfileChoice(id){
  if(!profileById(id))return false;
  data.selectedProfileId=id;
  data.primaryProfileId=id;
  if(!data.imports||typeof data.imports!=="object")data.imports={};
  data.imports.v72ProfileChoicePending=false;
  data.imports.v72ProfileChosenAt=now();
  save();return true;
}
function reset(){
  try{
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(DEV_STORAGE_KEY);
    clearCurrentGameStorage();
    localStorage.setItem(GAME_STORAGE_PREFIX+"v72Migration.v1",JSON.stringify({completed:true,reset:true,at:now()}));
    localStorage.setItem(GAME_STORAGE_PREFIX+"v73Migration.v1",JSON.stringify({completed:true,reset:true,at:now()}));
  }catch(e){}
  data=defaults();
  devState=baseDevState();
  data.imports={
    v72MigrationCompleted:true,
    v72ProfileChoicePending:false,
    v72ProfilesFound:0,
    v72PerfectUnknown:false,
    v72DetailBackfillV1:true,
    resetAt:now()
  };
  save();
  restartProgressIntegrityFromCurrent();
}
function snapshot(){return clone(data);}
async function createBackup(){
  var integrity=await validateProgressIntegrity();
  if(integrity&&integrity.ok===false)throw new Error("progress-integrity");
  var backup={
    format:BACKUP_FORMAT,
    formatVersion:BACKUP_VERSION,
    exportedAt:now(),
    data:snapshot(),
    gameStorage:snapshotGameStorage()
  };
  backup.integrity={
    algorithm:"SHA-256",
    canonical:"sorted-json-v1",
    sha256:await backupSha256(backup)
  };
  return backup;
}

integrityStarted=true;
integrityReadyPromise=initializeProgressIntegrity(false,false);
var categoryBackfill=evaluateCategoryUnlocks();
if(categoryBackfill.length){save();queueProgressIntegritySeal();}
else save();
window.CIAppState={
  storageKey:KEY,
  avatars:DEFAULT_AVATARS.slice(),
  snapshot:snapshot,
  getProfiles:function(){return clone(data.profiles);},
  getProfileById:getProfileById,
  getSelectedProfile:getSelected,
  setSelectedProfile:setSelected,
  getPrimaryProfile:getSelected,
  getPreferredPlayers:getPreferredPlayers,
  addProfile:addProfile,
  updateProfile:updateProfile,
  deleteProfile:deleteProfile,
  setPrimaryProfile:setSelected,
  ensureProfileForPlayer:ensureProfileForPlayer,
  beginSession:beginSession,
  recordRound:recordRound,
  endSession:endSession,
  getSessions:getSessions,
  getActiveSession:getActiveSession,
  getStats:getStats,
  getProfileStats:getProfileStats,
  getProfileLevel:getProfileLevel,
  getUsageStats:getUsageStats,
  getCrew:getCrew,
  getCrews:getCrews,
  setCrewChallenge:setCrewChallenge,
  getCategoryProgress:getCategoryProgress,
  isCategoryUnlocked:isCategoryUnlocked,
  getCategoryLock:getCategoryLock,
  filterUnlockedCategories:filterUnlockedCategories,
  unlockCategoryPack:unlockCategoryPack,
  devPatchStats:devPatchStats,
  devReplaceStats:devReplaceStats,
  devResetStats:devResetStats,
  devSetUsage:devSetUsage,
  devSetAchievementOverride:devSetAchievementOverride,
  devClearAchievementOverrides:devClearAchievementOverrides,
  devGetAchievementOverrides:devGetAchievementOverrides,
  devSetCategoryPackOverride:devSetCategoryPackOverride,
  devClearCategoryPackOverrides:devClearCategoryPackOverrides,
  devClearSessions:devClearSessions,
  devDeleteSession:devDeleteSession,
  trackUsage:trackUsage,
  pauseUsage:pauseUsage,
  getAchievements:getAchievements,
  getProfileAchievements:getProfileAchievements,
  getPreferences:getPreferences,
  setPreference:setPreference,
  getPresets:getPresets,
  savePreset:savePreset,
  deletePreset:deletePreset,
  setLaunchPreset:setLaunchPreset,
  consumeLaunchPreset:consumeLaunchPreset,
  setLaunchGroup:setLaunchGroup,
  consumeLaunchGroup:consumeLaunchGroup,
  setActiveSessionGame:setActiveSessionGame,
  getMigrationStatus:getMigrationStatus,
  completeMigrationProfileChoice:completeMigrationProfileChoice,
  applyCircaQuestionMetadata:applyCircaQuestionMetadata,
  validateProgressIntegrity:validateProgressIntegrity,
  getProgressIntegrityStatus:function(){return clone(integrityStatus);},
  flushProgressIntegrity:function(){return Promise.all([integrityReadyPromise,integritySealPromise]).then(function(){return clone(integrityStatus);});},
  importSnapshot:importSnapshot,
  createBackup:createBackup,
  reset:reset
};
})();
