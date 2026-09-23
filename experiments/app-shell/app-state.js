(function(){
"use strict";

var KEY="ciExperiment.appShell.data.v1";
var LEGACY_KEY="ciExperiment.appShell.state";
var MAX_SESSIONS=50;
var DEFAULT_AVATARS=["😎","🕵️","🥷","🤠","👻","🤖","🦊","🐼","🐸","🦁","🐙","🦄"];

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
function clone(v){return JSON.parse(JSON.stringify(v));}
function now(){return new Date().toISOString();}
function baseProfileStats(){
  return {rounds:0,circaRounds:0,classicRounds:0,impostor:0,impostorEscapes:0,closest:0,farthest:0,perfect:0,errorSum:0,errorSamples:0};
}
function baseStats(){
  return {rounds:0,circaRounds:0,classicRounds:0,perfectEstimates:0,circaQids:[],classicWids:[],categories:[]};
}
function defaults(){
  var id=uid("player");
  return {
    schemaVersion:1,
    primaryProfileId:id,
    profiles:[{id:id,name:"Spieler",avatar:"😎",createdAt:now()}],
    profileStats:{},
    profileArchive:{},
    stats:baseStats(),
    sessions:[],
    activeSessionId:null,
    achievements:{},
    presets:[],
    launchPreset:null,
    preferences:{sound:true,haptics:true,animations:true},
    imports:{legacyCirca:false}
  };
}
function load(){
  var data=null;
  try{data=JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){}
  if(!data||typeof data!=="object"||Array.isArray(data))data=defaults();

  if(!Array.isArray(data.profiles))data.profiles=[];
  if(!data.profiles.length){
    var p=defaults().profiles[0];data.profiles=[p];data.primaryProfileId=p.id;
  }
  if(!data.profileStats||typeof data.profileStats!=="object")data.profileStats={};
  if(!data.profileArchive||typeof data.profileArchive!=="object"||Array.isArray(data.profileArchive))data.profileArchive={};
  if(!data.stats||typeof data.stats!=="object")data.stats=baseStats();
  ["circaQids","classicWids","categories"].forEach(function(k){if(!Array.isArray(data.stats[k]))data.stats[k]=[];});
  ["rounds","circaRounds","classicRounds","perfectEstimates"].forEach(function(k){data.stats[k]=Math.max(0,Number(data.stats[k])||0);});
  if(!Array.isArray(data.sessions))data.sessions=[];
  if(!data.achievements||typeof data.achievements!=="object")data.achievements={};
  if(!Array.isArray(data.presets))data.presets=[];
  if(!data.preferences||typeof data.preferences!=="object")data.preferences={sound:true,haptics:true,animations:true};
  if(!data.imports||typeof data.imports!=="object")data.imports={legacyCirca:false};

  /* Migrate the first visual prototype's single local profile once. */
  try{
    var legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||"null");
    if(legacy&&typeof legacy==="object"&&data.profiles.length===1&&data.profiles[0].name==="Spieler"){
      data.profiles[0].name=cleanName(legacy.name)||"Spieler";
      if(DEFAULT_AVATARS.indexOf(legacy.avatar)!==-1)data.profiles[0].avatar=legacy.avatar;
      if(typeof legacy.sound==="boolean")data.preferences.sound=legacy.sound;
      if(typeof legacy.haptics==="boolean")data.preferences.haptics=legacy.haptics;
      if(typeof legacy.animations==="boolean")data.preferences.animations=legacy.animations;
    }
  }catch(e){}

  return data;
}
var data=load();

function save(){
  try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch(e){return false;}
}
function profileById(id){
  for(var i=0;i<data.profiles.length;i++)if(data.profiles[i].id===id)return data.profiles[i];
  return null;
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
  var duplicate=data.profiles.find(function(x){return x.name.toLocaleLowerCase("de-DE")===p.name.toLocaleLowerCase("de-DE");});
  if(duplicate)return duplicate.id;
  var id=uid("player");
  data.profiles.push({id:id,name:p.name,avatar:p.avatar,createdAt:now()});
  ensureStat(id);save();return id;
}
function updateProfile(id,input){
  var p=profileById(id);if(!p)return false;
  var n=normalizeProfile(input);p.name=n.name;p.avatar=n.avatar;save();return true;
}
function deleteProfile(id){
  if(data.profiles.length<=1)return false;
  var idx=data.profiles.findIndex(function(p){return p.id===id;});
  if(idx<0)return false;
  var removed=data.profiles[idx];
  data.profileArchive[id]={id:removed.id,name:removed.name,avatar:removed.avatar,createdAt:removed.createdAt||null,deletedAt:now()};
  data.profiles.splice(idx,1);
  if(data.primaryProfileId===id)data.primaryProfileId=data.profiles[0].id;
  save();return true;
}
function getProfileById(id){
  var active=profileById(id);
  if(active)return clone(active);
  return data.profileArchive[id]?clone(data.profileArchive[id]):null;
}
function setPrimary(id){
  if(!profileById(id))return false;
  data.primaryProfileId=id;save();return true;
}
function ensureProfileForPlayer(player){
  var name=cleanName(player&&player.name)||"Spieler";
  var lower=name.toLocaleLowerCase("de-DE");
  var match=data.profiles.find(function(p){return p.name.toLocaleLowerCase("de-DE")===lower;});
  if(match){
    if(player&&player.avatar)match.avatar=String(player.avatar).slice(0,8);
    ensureStat(match.id);
    return match.id;
  }
  return addProfile({name:name,avatar:player&&player.avatar||"😎"});
}
function getPreferredPlayers(limit){
  var list=data.profiles.slice();
  var primaryIndex=list.findIndex(function(p){return p.id===data.primaryProfileId;});
  if(primaryIndex>0){var primary=list.splice(primaryIndex,1)[0];list.unshift(primary);}
  if(limit)list=list.slice(0,limit);
  return clone(list);
}
function sessionById(id){
  return data.sessions.find(function(s){return s.id===id;})||null;
}
function beginSession(players){
  var current=data.activeSessionId&&sessionById(data.activeSessionId);
  if(current&&!current.endedAt)return current.id;
  var profileIds=[];
  (players||[]).forEach(function(p){
    var id=ensureProfileForPlayer(p);
    if(profileIds.indexOf(id)===-1)profileIds.push(id);
  });
  var session={id:uid("session"),startedAt:now(),endedAt:null,profileIds:profileIds,rounds:[],awards:[]};
  data.sessions.push(session);
  data.activeSessionId=session.id;
  if(data.sessions.length>MAX_SESSIONS)data.sessions.splice(0,data.sessions.length-MAX_SESSIONS);
  save();return session.id;
}
function addUnique(arr,value){
  value=String(value||"").trim();if(value&&arr.indexOf(value)===-1)arr.push(value);
}
function contribution(round,dir){
  dir=dir||1;
  data.stats.rounds=Math.max(0,data.stats.rounds+dir);
  if(round.game==="circa")data.stats.circaRounds=Math.max(0,data.stats.circaRounds+dir);
  if(round.game==="classic")data.stats.classicRounds=Math.max(0,data.stats.classicRounds+dir);

  (round.players||[]).forEach(function(rp){
    var st=ensureStat(rp.profileId);
    st.rounds=Math.max(0,st.rounds+dir);
    if(round.game==="circa")st.circaRounds=Math.max(0,st.circaRounds+dir);
    if(round.game==="classic")st.classicRounds=Math.max(0,st.classicRounds+dir);
    if(rp.role==="impostor")st.impostor=Math.max(0,st.impostor+dir);
    if(rp.role==="impostor"&&round.impostorEscaped===true)st.impostorEscapes=Math.max(0,st.impostorEscapes+dir);
    if(rp.closest)st.closest=Math.max(0,st.closest+dir);
    if(rp.farthest)st.farthest=Math.max(0,st.farthest+dir);
    if(rp.perfect){
      st.perfect=Math.max(0,st.perfect+dir);
      data.stats.perfectEstimates=Math.max(0,data.stats.perfectEstimates+dir);
    }
    if(round.game==="circa"&&Number.isFinite(Number(rp.error))){
      st.errorSum=Math.max(0,st.errorSum+dir*Number(rp.error));
      st.errorSamples=Math.max(0,st.errorSamples+dir);
    }
  });

  if(dir>0){
    if(round.game==="circa"&&round.qid)addUnique(data.stats.circaQids,round.qid);
    if(round.game==="classic"&&round.wid)addUnique(data.stats.classicWids,round.wid);
    if(round.category)addUnique(data.stats.categories,round.category);
  }
}
function hasPlayedSession(){
  return data.sessions.some(function(s){return Array.isArray(s.rounds)&&s.rounds.length>0;});
}
function achievementDefs(){
  return [
    {id:"first-session",icon:"🎬",title:"Erster Abend",text:"Die erste Session spielen",done:hasPlayedSession,progress:function(){return hasPlayedSession()?"1/1":"0/1";}},
    {id:"perfect",icon:"🎯",title:"Punktlandung",text:"Eine Circa-Schätzung exakt treffen",done:function(){return data.stats.perfectEstimates>=1;},progress:function(){return Math.min(1,data.stats.perfectEstimates)+"/1";}},
    {id:"escape-3",icon:"🕵️",title:"Unentdeckt",text:"3× als Imposter davonkommen",done:function(){return Object.values(data.profileStats).some(function(s){return s.impostorEscapes>=3;});},progress:function(){var m=0;Object.values(data.profileStats).forEach(function(s){m=Math.max(m,s.impostorEscapes||0);});return Math.min(3,m)+"/3";}},
    {id:"all-categories",icon:"🗺️",title:"Alles gesehen",text:"Alle 10 Kategorien mindestens einmal",done:function(){return data.stats.categories.length>=10;},progress:function(){return Math.min(10,data.stats.categories.length)+"/10";}},
    {id:"hundred-rounds",icon:"💯",title:"Veteran",text:"100 Runden insgesamt spielen",done:function(){return data.stats.rounds>=100;},progress:function(){return Math.min(100,data.stats.rounds)+"/100";}},
    {id:"classic-50",icon:"🎭",title:"Schauspieler",text:"50 Classic-Runden spielen",done:function(){return data.stats.classicRounds>=50;},progress:function(){return Math.min(50,data.stats.classicRounds)+"/50";}}
  ];
}
function evaluateAchievements(){
  achievementDefs().forEach(function(def){
    if(def.done()&&!data.achievements[def.id])data.achievements[def.id]={unlockedAt:now()};
  });
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
    var profileId=p.profileId||ensureProfileForPlayer(p);
    var out=Object.assign({},p,{profileId:profileId});
    delete out.name;delete out.avatar;
    return out;
  });

  var existing=session.rounds.findIndex(function(r){return r.roundKey===round.roundKey;});
  if(existing>=0){
    contribution(session.rounds[existing],-1);
    session.rounds[existing]=round;
  }else{
    session.rounds.push(round);
  }
  contribution(round,1);

  round.players.forEach(function(p){
    if(session.profileIds.indexOf(p.profileId)===-1)session.profileIds.push(p.profileId);
  });

  session.awards=computeAwards(session);
  evaluateAchievements();save();return true;
}
function computeAwards(session){
  var best=null,wild=null,escapes={},impostors={};
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
    });
  });
  function maxEntry(map){
    var entries=Object.entries(map);if(!entries.length)return null;
    entries.sort(function(a,b){return b[1]-a[1];});return {profileId:entries[0][0],value:entries[0][1]};
  }
  var deception=maxEntry(escapes),frequent=maxEntry(impostors),out=[];
  if(best)out.push({type:"best",icon:"🎯",title:"Beste Schätzung",profileId:best.profileId,detail:best.error.toLocaleString("de-DE",{maximumFractionDigits:1})+" % daneben"});
  if(deception)out.push({type:"deception",icon:"🕵️",title:"Täuschungsmeister",profileId:deception.profileId,detail:deception.value+"× unentdeckt"});
  if(wild)out.push({type:"wild",icon:"😵",title:"Wildeste Schätzung",profileId:wild.profileId,detail:wild.error.toLocaleString("de-DE",{maximumFractionDigits:0})+" % daneben"});
  if(frequent)out.push({type:"impostor",icon:"🔥",title:"Dauerverdächtig",profileId:frequent.profileId,detail:frequent.value+"× Imposter"});
  return out.slice(0,4);
}
function endSession(){
  var s=data.activeSessionId&&sessionById(data.activeSessionId);
  if(!s||s.endedAt)return null;
  s.endedAt=now();s.awards=computeAwards(s);data.activeSessionId=null;
  evaluateAchievements();save();return clone(s);
}
function getAchievements(){
  evaluateAchievements();save();
  return achievementDefs().map(function(def){
    return {id:def.id,icon:def.icon,title:def.title,text:def.text,unlocked:!!data.achievements[def.id],unlockedAt:data.achievements[def.id]&&data.achievements[def.id].unlockedAt,progress:def.progress()};
  });
}
function getStats(){return clone(data.stats);}
function getProfileStats(id){return clone(data.profileStats[id]||baseProfileStats());}
function refreshSessionAwards(){
  data.sessions.forEach(function(s){
    if(!Array.isArray(s.rounds))s.rounds=[];
    s.awards=s.rounds.length?computeAwards(s):[];
  });
}
function getSessions(){refreshSessionAwards();save();return clone(data.sessions.slice().reverse());}
function getActiveSession(){var s=data.activeSessionId&&sessionById(data.activeSessionId);if(s){s.awards=s.rounds&&s.rounds.length?computeAwards(s):[];save();}return s?clone(s):null;}
function getPreferences(){return clone(data.preferences);}
function setPreference(key,value){
  if(["sound","haptics","animations"].indexOf(key)===-1)return false;
  data.preferences[key]=!!value;save();return true;
}
function builtInPresets(){
  return [
    {id:"builtin-quick",builtIn:true,name:"Schnelle Runde",icon:"⚡️",game:"circa",playerCount:4,categories:["Alle"],difficulty:"zufaellig",summary:"Circa · 4 Spieler · Zufall"},
    {id:"builtin-party",builtIn:true,name:"Party",icon:"🥳",game:"classic",playerCount:6,categories:["Alle"],hint:true,timer:180,summary:"Classic · 6 Spieler · 3 Min."},
    {id:"builtin-spicy",builtIn:true,name:"Spicy",icon:"🌶️",game:"circa",playerCount:5,categories:["Spicy 🌶️"],difficulty:"mittel",summary:"Circa · 5 Spieler · Spicy"}
  ];
}
function getPresets(){return builtInPresets().concat(clone(data.presets));}
function savePreset(input){
  var p={
    id:input.id&&String(input.id).indexOf("custom-")===0?input.id:uid("custom"),
    builtIn:false,
    name:String(input.name||"Eigenes Preset").trim().slice(0,22)||"Eigenes Preset",
    icon:String(input.icon||"⭐️").slice(0,8),
    game:input.game==="classic"?"classic":"circa",
    playerCount:Math.max(3,Math.min(12,Number(input.playerCount)||4)),
    categories:Array.isArray(input.categories)&&input.categories.length?input.categories.slice(0,10):["Alle"],
    difficulty:["leicht","mittel","schwer","zufaellig"].indexOf(input.difficulty)!==-1?input.difficulty:"mittel",
    hint:input.hint!==false,
    timer:[0,60,90,120,150,180,210,240,270,300].indexOf(Number(input.timer))!==-1?Number(input.timer):0
  };
  p.summary=p.game==="classic"?"Classic · "+p.playerCount+" Spieler"+(p.timer?" · "+Math.round(p.timer/60)+" Min.":""):"Circa · "+p.playerCount+" Spieler · "+(p.categories[0]||"Alle");
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
  data.launchPreset=preset?clone(preset):null;save();
}
function consumeLaunchPreset(game){
  var p=data.launchPreset;
  if(!p||p.game!==game)return null;
  data.launchPreset=null;save();return clone(p);
}
function sanitizeLegacyCircaSource(){
  var legacyStats={},legacyDevice={},legacyCompleted=[];
  try{legacyStats=JSON.parse(localStorage.getItem("circaImpostor.playerStats.v1")||"{}")||{};}catch(e){}
  try{legacyDevice=JSON.parse(localStorage.getItem("circaImpostor.deviceStats.v1")||"{}")||{};}catch(e){}
  try{legacyCompleted=JSON.parse(localStorage.getItem("circaImpostor.completedQuestions.v1")||"[]")||[];}catch(e){}

  var players=[];
  if(legacyStats&&typeof legacyStats==="object"&&!Array.isArray(legacyStats)){
    Object.keys(legacyStats).sort().forEach(function(key){
      var item=legacyStats[key];if(!item||typeof item!=="object")return;
      var name=cleanName(item.name);if(!name)return;
      players.push({
        name:name,
        avatar:String(item.avatar||"😎").slice(0,8),
        rounds:Math.max(0,Number(item.rounds)||0),
        impostor:Math.max(0,Number(item.impostor)||0),
        impostorWins:Math.max(0,Number(item.impostorWins)||0),
        closest:Math.max(0,Number(item.closest)||0),
        farthest:Math.max(0,Number(item.farthest)||0),
        errorSum:Math.max(0,Number(item.errorSum)||0),
        errorSamples:Math.max(0,Number(item.errorSamples)||0)
      });
    });
  }
  var qids=[];
  if(Array.isArray(legacyCompleted))legacyCompleted.forEach(function(qid){addUnique(qids,qid);});
  var rounds=Math.max(0,Number(legacyDevice&&legacyDevice.roundsPlayed)||0);
  var fingerprint=JSON.stringify({players:players,rounds:rounds,qids:qids});
  return {players:players,rounds:rounds,qids:qids,fingerprint:fingerprint,hasData:players.length>0||rounds>0||qids.length>0};
}
function applyLegacyCircaBaseline(source){
  if(!source||!source.hasData)return;
  source.players.forEach(function(item){
    var pid=ensureProfileForPlayer({name:item.name,avatar:item.avatar});
    var st=ensureStat(pid);
    st.rounds+=item.rounds;
    st.circaRounds+=item.rounds;
    st.impostor+=item.impostor;
    st.impostorEscapes+=item.impostorWins;
    st.closest+=item.closest;
    st.farthest+=item.farthest;
    st.errorSum+=item.errorSum;
    st.errorSamples+=item.errorSamples;
  });
  data.stats.rounds+=source.rounds;
  data.stats.circaRounds+=source.rounds;
  source.qids.forEach(function(qid){addUnique(data.stats.circaQids,qid);});
}
function rebuildAggregates(){
  data.profileStats={};
  data.stats=baseStats();
  data.sessions.forEach(function(session){
    (session.rounds||[]).forEach(function(round){contribution(round,1);});
    session.awards=(session.rounds||[]).length?computeAwards(session):[];
  });
  var imported=data.imports&&data.imports.legacyCircaData;
  if(imported){
    applyLegacyCircaBaseline({
      players:Array.isArray(imported.players)?imported.players:[],
      rounds:Math.max(0,Number(imported.rounds)||0),
      qids:Array.isArray(imported.qids)?imported.qids:[],
      hasData:true
    });
  }
  evaluateAchievements();
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
  return {ok:true,updated:!!previous,players:source.players.length,rounds:source.rounds,questions:source.qids.length};
}
function reset(){
  try{localStorage.removeItem(KEY);localStorage.removeItem(LEGACY_KEY);}catch(e){}
  data=defaults();save();
}
function snapshot(){return clone(data);}

save();
window.CIAppState={
  storageKey:KEY,
  avatars:DEFAULT_AVATARS.slice(),
  snapshot:snapshot,
  getProfiles:function(){return clone(data.profiles);},
  getProfileById:getProfileById,
  getPrimaryProfile:function(){return clone(profileById(data.primaryProfileId)||data.profiles[0]);},
  getPreferredPlayers:getPreferredPlayers,
  addProfile:addProfile,
  updateProfile:updateProfile,
  deleteProfile:deleteProfile,
  setPrimaryProfile:setPrimary,
  ensureProfileForPlayer:ensureProfileForPlayer,
  beginSession:beginSession,
  recordRound:recordRound,
  endSession:endSession,
  getSessions:getSessions,
  getActiveSession:getActiveSession,
  getStats:getStats,
  getProfileStats:getProfileStats,
  getAchievements:getAchievements,
  getPreferences:getPreferences,
  setPreference:setPreference,
  getPresets:getPresets,
  savePreset:savePreset,
  deletePreset:deletePreset,
  setLaunchPreset:setLaunchPreset,
  consumeLaunchPreset:consumeLaunchPreset,
  importLegacyCirca:importLegacyCirca,
  getLegacyImportStatus:getLegacyImportStatus,
  reset:reset
};
})();
