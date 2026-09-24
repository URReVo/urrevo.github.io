(function(){
"use strict";

var KEY="imposterGames.prototype.appState.v1";
var LEGACY_KEY="imposterGames.prototype.appState.legacy";
var MAX_SESSIONS=50;
var BACKUP_FORMAT="imposter-games-prototype-backup";
var BACKUP_VERSION=2;
var GAME_STORAGE_PREFIX="imposterGames.prototype.game.";
var GAME_STORAGE_KEYS=[
  "circa.players.v1","classic.players.v1",
  "circa.categories.v1","classic.categories.v1",
  "circa.deckProgress.v1","circa.difficulty.v1",
  "circa.playerStats.v1","circa.deviceStats.v1","circa.completedQuestions.v1",
  "classic.deck.v1","classic.hint.v1","classic.timer.v1",
  "whoami.players.v1","whoami.categories.v1","whoami.deck.v1",
  "charades.players.v1","charades.categories.v1","charades.deck.v1","charades.timer.v1","charades.motionFlip.v1",
  "v72Migration.v1"
];
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
function isGenericPlayerName(v){
  return /^spieler(?:\s+\d+)?$/i.test(cleanName(v));
}
function clone(v){return JSON.parse(JSON.stringify(v));}
function now(){return new Date().toISOString();}
function baseProfileStats(){
  return {rounds:0,circaRounds:0,classicRounds:0,impostor:0,impostorEscapes:0,closest:0,farthest:0,perfect:0,errorSum:0,errorSamples:0,circaQids:[],classicWids:[],categories:[],legacyPerfectUnknown:false,legacyCategoryUnknown:false};
}
function baseStats(){
  return {rounds:0,circaRounds:0,classicRounds:0,perfectEstimates:0,circaQids:[],classicWids:[],categories:[]};
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
function readLegacyJson(key,fallback){
  try{
    var raw=localStorage.getItem(key);
    if(!raw)return fallback;
    var parsed=JSON.parse(raw);
    return parsed==null?fallback:parsed;
  }catch(e){return fallback;}
}
function migrateV72(){
  var migrated=defaults();
  var profiles=[],profileStats={},byName={};

  function upsert(name,avatar,legacyStat){
    name=cleanName(name);
    if(!name)return null;
    var key=name.toLocaleLowerCase("de-DE");
    var existing=byName[key];
    if(!existing){
      existing={id:uid("player"),name:name,avatar:String(avatar||"😎").slice(0,8),aliases:[],createdAt:now()};
      byName[key]=existing;
      profiles.push(existing);
      profileStats[existing.id]=baseProfileStats();
    }else if((!existing.avatar||existing.avatar==="😎")&&avatar){
      existing.avatar=String(avatar).slice(0,8);
    }
    if(legacyStat){
      var st=profileStats[existing.id];
      st.rounds=Math.max(st.rounds,Math.max(0,Number(legacyStat.rounds)||0));
      st.circaRounds=st.rounds;
      st.impostor=Math.max(st.impostor,Math.max(0,Number(legacyStat.impostor)||0));
      st.impostorEscapes=Math.max(st.impostorEscapes,Math.max(0,Number(legacyStat.impostorWins)||0));
      st.closest=Math.max(st.closest,Math.max(0,Number(legacyStat.closest)||0));
      st.farthest=Math.max(st.farthest,Math.max(0,Number(legacyStat.farthest)||0));
      st.errorSum=Math.max(st.errorSum,Math.max(0,Number(legacyStat.errorSum)||0));
      st.errorSamples=Math.max(st.errorSamples,Math.max(0,Number(legacyStat.errorSamples)||0));
      if(st.rounds>0){
        if(st.errorSamples>0&&st.errorSum===0)st.perfect=Math.max(st.perfect,st.errorSamples);
        else st.legacyPerfectUnknown=true;
      }
    }
    return existing;
  }

  var oldStats=readLegacyJson("circaImpostor.playerStats.v1",{});
  if(oldStats&&typeof oldStats==="object"&&!Array.isArray(oldStats)){
    Object.keys(oldStats).forEach(function(key){
      var item=oldStats[key];
      if(item&&typeof item==="object")upsert(item.name,item.avatar,item);
    });
  }

  ["circaImpostor.players.v1","classicImpostor.players.v1"].forEach(function(storageKey){
    var saved=readLegacyJson(storageKey,null);
    var list=saved&&Array.isArray(saved.players)?saved.players:[];
    list.forEach(function(item){
      if(item&&typeof item==="object")upsert(item.name,item.avatar,null);
    });
  });

  if(profiles.length){
    migrated.profiles=profiles;
    migrated.profileStats=profileStats;
    migrated.selectedProfileId=profiles[0].id;
    migrated.primaryProfileId=profiles[0].id;
  }

  var oldDevice=readLegacyJson("circaImpostor.deviceStats.v1",{});
  var oldRounds=Math.max(0,Number(oldDevice&&oldDevice.roundsPlayed)||0);
  var oldCompleted=readLegacyJson("circaImpostor.completedQuestions.v1",[]);
  migrated.stats.rounds=oldRounds;
  migrated.stats.circaRounds=oldRounds;
  if(Array.isArray(oldCompleted)){
    oldCompleted.forEach(function(qid){addUnique(migrated.stats.circaQids,qid);});
    if(oldRounds>0){
      profiles.forEach(function(profile){
        var st=profileStats[profile.id];
        if(st&&st.circaRounds===oldRounds){
          oldCompleted.forEach(function(qid){addUnique(st.circaQids,qid);});
          st.legacyCategoryUnknown=false;
        }else if(st&&st.circaRounds>0&&oldRounds>st.circaRounds){
          st.legacyCategoryUnknown=true;
        }
      });
    }
  }

  var migratedKnownPerfect=0;
  Object.keys(profileStats).forEach(function(id){migratedKnownPerfect+=Math.max(0,Number(profileStats[id].perfect)||0);});
  migrated.stats.perfectEstimates=Math.max(migrated.stats.perfectEstimates,migratedKnownPerfect);

  migrated.imports={
    v72MigrationCompleted:true,
    v72MigratedAt:now(),
    v72ProfilesFound:profiles.length,
    v72ProfileChoicePending:profiles.length>1,
    v72PerfectUnknown:oldRounds>0
  };
  return migrated;
}
function backfillV72Details(data){
  if(!data||!data.imports||!data.imports.v72MigrationCompleted||data.imports.v72DetailBackfillV1)return;
  var oldStats=readLegacyJson("circaImpostor.playerStats.v1",{});
  var oldDevice=readLegacyJson("circaImpostor.deviceStats.v1",{});
  var oldCompleted=readLegacyJson("circaImpostor.completedQuestions.v1",[]);
  var oldRounds=Math.max(0,Number(oldDevice&&oldDevice.roundsPlayed)||0);
  var byName={};
  (data.profiles||[]).forEach(function(p){
    if(p&&p.name)byName[cleanName(p.name).toLocaleLowerCase("de-DE")]=p;
  });
  if(oldStats&&typeof oldStats==="object"&&!Array.isArray(oldStats)){
    Object.keys(oldStats).forEach(function(key){
      var item=oldStats[key];
      if(!item||typeof item!=="object")return;
      var profile=byName[cleanName(item.name).toLocaleLowerCase("de-DE")];
      if(!profile)return;
      var st=data.profileStats[profile.id]||baseProfileStats();
      data.profileStats[profile.id]=st;
      var legacyRounds=Math.max(0,Number(item.rounds)||0);
      var errorSamples=Math.max(0,Number(item.errorSamples)||0);
      var errorSum=Math.max(0,Number(item.errorSum)||0);
      if(legacyRounds>0){
        if(errorSamples>0&&errorSum===0)st.perfect=Math.max(Number(st.perfect)||0,errorSamples);
        else st.legacyPerfectUnknown=true;
      }
      if(oldRounds>0&&legacyRounds===oldRounds&&Array.isArray(oldCompleted)){
        if(!Array.isArray(st.circaQids))st.circaQids=[];
        oldCompleted.forEach(function(qid){addUnique(st.circaQids,qid);});
        st.legacyCategoryUnknown=false;
      }else if(legacyRounds>0&&oldRounds>legacyRounds){
        st.legacyCategoryUnknown=true;
      }
    });
  }
  if(oldRounds>0)data.imports.v72PerfectUnknown=true;
  var knownPerfect=0;
  Object.keys(data.profileStats||{}).forEach(function(id){
    knownPerfect+=Math.max(0,Number(data.profileStats[id]&&data.profileStats[id].perfect)||0);
  });
  data.stats.perfectEstimates=Math.max(Math.max(0,Number(data.stats.perfectEstimates)||0),knownPerfect);
  data.imports.v72DetailBackfillV1=true;
}
function load(){
  var data=null,hadStoredState=false;
  try{
    var raw=localStorage.getItem(KEY);
    hadStoredState=!!raw;
    data=raw?JSON.parse(raw):null;
  }catch(e){}
  if(!data||typeof data!=="object"||Array.isArray(data)){
    data=defaults();
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
    ["rounds","circaRounds","classicRounds","impostor","impostorEscapes","closest","farthest","perfect","errorSum","errorSamples"].forEach(function(k){st[k]=Math.max(0,Number(st[k])||0);});
    ["circaQids","classicWids","categories"].forEach(function(k){if(!Array.isArray(st[k]))st[k]=[];});
    st.legacyPerfectUnknown=st.legacyPerfectUnknown===true;
    st.legacyCategoryUnknown=st.legacyCategoryUnknown===true;
  });
  if(!data.profileArchive||typeof data.profileArchive!=="object"||Array.isArray(data.profileArchive))data.profileArchive={};
  if(!data.stats||typeof data.stats!=="object")data.stats=baseStats();
  ["circaQids","classicWids","categories"].forEach(function(k){if(!Array.isArray(data.stats[k]))data.stats[k]=[];});
  ["rounds","circaRounds","classicRounds","perfectEstimates"].forEach(function(k){data.stats[k]=Math.max(0,Number(data.stats[k])||0);});
  if(!Array.isArray(data.sessions))data.sessions=[];
  data.sessions.forEach(function(session){
    (session&&Array.isArray(session.rounds)?session.rounds:[]).forEach(function(round){
      (round&&Array.isArray(round.players)?round.players:[]).forEach(function(rp){
        if(!rp||!rp.profileId)return;
        var pst=data.profileStats[rp.profileId];
        if(!pst){pst=baseProfileStats();data.profileStats[rp.profileId]=pst;}
        if(!Array.isArray(pst.circaQids))pst.circaQids=[];
        if(!Array.isArray(pst.classicWids))pst.classicWids=[];
        if(!Array.isArray(pst.categories))pst.categories=[];
        if(round.game==="circa"&&round.qid)addUnique(pst.circaQids,round.qid);
        if(round.game==="classic"&&round.wid)addUnique(pst.classicWids,round.wid);
        if(round.category)addUnique(pst.categories,round.category);
      });
    });
  });
  if(!data.achievements||typeof data.achievements!=="object")data.achievements={};
  if(!Array.isArray(data.presets))data.presets=[];
  if(!data.preferences||typeof data.preferences!=="object")data.preferences={sound:true,haptics:true,animations:true};
  if(!data.imports||typeof data.imports!=="object")data.imports={v72MigrationCompleted:true,v72ProfileChoicePending:false};
  if(typeof data.imports.v72MigrationCompleted!=="boolean")data.imports.v72MigrationCompleted=true;
  if(typeof data.imports.v72ProfileChoicePending!=="boolean")data.imports.v72ProfileChoicePending=false;
  /* Prototype storage is isolated: never import/backfill production or V72 data automatically. */

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
  data.profiles.push({id:id,name:p.name,avatar:p.avatar,aliases:[],createdAt:now()});
  ensureStat(id);save();return id;
}
function updateProfile(id,input){
  var p=profileById(id);if(!p)return false;
  var n=normalizeProfile(input);
  var lower=n.name.toLocaleLowerCase("de-DE");
  var duplicate=data.profiles.some(function(x){return x.id!==id&&x.name.toLocaleLowerCase("de-DE")===lower;});
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
  var match=data.profiles.find(function(p){return p.name.toLocaleLowerCase("de-DE")===lower;});
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
  var session={id:uid("session"),startedAt:now(),endedAt:null,profileIds:profileIds,lastProfileIds:profileIds.slice(),rounds:[],awards:[]};
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
    if(dir>0){
      if(round.game==="circa"&&round.qid)addUnique(st.circaQids,round.qid);
      if(round.game==="classic"&&round.wid)addUnique(st.classicWids,round.wid);
      if(round.category)addUnique(st.categories,round.category);
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
function achievementDefs(){
  return [
    {id:"first-session",icon:"🎬",title:"Erster Abend",text:"Eine Session mit mindestens einer Runde abgeschlossen",done:function(){return data.sessions.some(function(s){return !!s.endedAt&&Array.isArray(s.rounds)&&s.rounds.length>0;});},progress:function(){return data.sessions.some(function(s){return !!s.endedAt&&Array.isArray(s.rounds)&&s.rounds.length>0;})?"1/1":"0/1";}},
    {id:"perfect",icon:"🎯",title:"Punktlandung",text:"Eine Circa-Schätzung exakt treffen",done:function(){return data.stats.perfectEstimates>=1;},progress:function(){return data.stats.perfectEstimates>=1?"1/1":data.imports&&data.imports.v72PerfectUnknown?"V72: nicht erfasst":"0/1";}},
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
function profileAchievementDefs(id){
  var st=ensureStat(id);
  function endedSession(){return data.sessions.some(function(s){return !!s.endedAt&&Array.isArray(s.rounds)&&s.rounds.length>0&&Array.isArray(s.profileIds)&&s.profileIds.indexOf(id)!==-1;});}
  return [
    {id:"first-session",icon:"🎬",title:"Erster Abend",text:"Eine Session abgeschlossen",done:endedSession,progress:function(){return endedSession()?"1/1":"0/1";}},
    {id:"perfect",icon:"🎯",title:"Punktlandung",text:"Eine Circa-Schätzung exakt treffen",done:function(){return st.perfect>=1;},progress:function(){return st.perfect>=1?"1/1":st.legacyPerfectUnknown?"V72: nicht erfasst":"0/1";}},
    {id:"escape-3",icon:"🕵️",title:"Unentdeckt",text:"3× als Imposter davonkommen",done:function(){return st.impostorEscapes>=3;},progress:function(){return Math.min(3,st.impostorEscapes)+"/3";}},
    {id:"all-categories",icon:"🗺️",title:"Alles gesehen",text:"Alle 10 Kategorien mindestens einmal",done:function(){return st.categories.length>=10;},progress:function(){var p=Math.min(10,st.categories.length)+"/10";return st.categories.length>=10?p:st.legacyCategoryUnknown?p+" · V72 teils":p;}},
    {id:"hundred-rounds",icon:"💯",title:"Veteran",text:"100 Runden insgesamt spielen",done:function(){return st.rounds>=100;},progress:function(){return Math.min(100,st.rounds)+"/100";}},
    {id:"classic-50",icon:"🎭",title:"Schauspieler",text:"50 Classic-Runden spielen",done:function(){return st.classicRounds>=50;},progress:function(){return Math.min(50,st.classicRounds)+"/50";}}
  ];
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
  session.lastGame=round.game==="classic"?"classic":"circa";
  round.players=(round.players||[]).map(function(p){
    var profileId=p&&p.profileId&&profileById(p.profileId)?p.profileId:null;
    if(!profileId&&p&&cleanName(p.name))profileId=ensureProfileForPlayer(p);
    if(!profileId)return null;
    var out=Object.assign({},p,{profileId:profileId});
    delete out.name;delete out.avatar;
    return out;
  }).filter(Boolean);

  var existing=session.rounds.findIndex(function(r){return r.roundKey===round.roundKey;});
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
function getProfileAchievements(id){
  if(!profileById(id)&&!data.profileArchive[id])return [];
  return profileAchievementDefs(id).map(function(def){
    return {id:def.id,icon:def.icon,title:def.title,text:def.text,unlocked:!!def.done(),progress:def.progress()};
  });
}
function getStats(){return clone(data.stats);}
function getProfileStats(id){return clone(data.profileStats[id]||baseProfileStats());}
function getSessions(){return clone(data.sessions.slice().reverse());}
function getActiveSession(){var s=data.activeSessionId&&sessionById(data.activeSessionId);return s?clone(s):null;}
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
function setActiveSessionGame(game){
  var session=data.activeSessionId&&sessionById(data.activeSessionId);
  if(!session||session.endedAt)return false;
  session.lastGame=game==="classic"?"classic":"circa";save();return true;
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
    session.awards=session.endedAt&&(session.rounds||[]).length?computeAwards(session):[];
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
  return {
    rounds:Math.max(0,Number(src.rounds)||0),
    circaRounds:Math.max(0,Number(src.circaRounds)||0),
    classicRounds:Math.max(0,Number(src.classicRounds)||0),
    perfectEstimates:Math.max(0,Number(src.perfectEstimates)||0),
    circaQids:Array.isArray(src.circaQids)?src.circaQids.map(String).slice(0,520):[],
    classicWids:Array.isArray(src.classicWids)?src.classicWids.map(String).slice(0,250):[],
    categories:Array.isArray(src.categories)?src.categories.map(String).slice(0,30):[]
  };
}
function sanitizeImportedProfileStats(src){
  var out={};if(!src||typeof src!=="object"||Array.isArray(src))return out;
  Object.keys(src).slice(0,250).forEach(function(id){
    var item=src[id]||{},safe=baseProfileStats();
    ["rounds","circaRounds","classicRounds","impostor","impostorEscapes","closest","farthest","perfect","errorSum","errorSamples"].forEach(function(k){safe[k]=Math.max(0,Number(item[k])||0);});
    safe.circaQids=Array.isArray(item.circaQids)?item.circaQids.map(String).slice(0,520):[];
    safe.classicWids=Array.isArray(item.classicWids)?item.classicWids.map(String).slice(0,250):[];
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
      lastGame:x.lastGame==="classic"?"classic":x.lastGame==="circa"?"circa":null
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
function clearV73GameStorage(){
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
  clearV73GameStorage();
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
  }catch(e){}
}
function importSnapshot(input){
  var src=input,gameStorage=null;
  if(typeof src==="string"){try{src=JSON.parse(src);}catch(e){return {ok:false,reason:"json"};}}
  if(!src||typeof src!=="object"||Array.isArray(src))return {ok:false,reason:"shape"};
  if(src.format){
    if(src.format!==BACKUP_FORMAT)return {ok:false,reason:"format"};
    var version=Number(src.formatVersion);
    if(!Number.isFinite(version)||version<1||version>BACKUP_VERSION)return {ok:false,reason:"version"};
    gameStorage=src.gameStorage&&typeof src.gameStorage==="object"&&!Array.isArray(src.gameStorage)?src.gameStorage:null;
    src=src.data;
  }
  if(!src||typeof src!=="object"||Array.isArray(src))return {ok:false,reason:"shape"};
  if(!Array.isArray(src.profiles)||!src.profiles.length)return {ok:false,reason:"profiles"};

  var profiles=[],seen={},seenNames={},duplicateProfileName=false;
  src.profiles.forEach(function(item){
    var p=sanitizeImportedProfile(item);
    if(!p||seen[p.id])return;
    var nameKey=p.name.toLocaleLowerCase("de-DE");
    if(seenNames[nameKey]){duplicateProfileName=true;return;}
    seen[p.id]=true;seenNames[nameKey]=true;profiles.push(p);
  });
  if(duplicateProfileName)return {ok:false,reason:"duplicate-profiles"};
  if(!profiles.length)return {ok:false,reason:"profiles"};

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
  imported.imports.restoredFromBackupAt=now();
  imported.imports.v72DetailBackfillV1=true;

  var activeId=String(src.activeSessionId||"");
  if(activeId&&imported.sessions.some(function(x){return x.id===activeId&&!x.endedAt;}))imported.activeSessionId=activeId;

  data=imported;
  evaluateAchievements();
  if(!save())return {ok:false,reason:"storage"};
  restoreGameStorage(gameStorage);
  return {ok:true,profiles:data.profiles.length,sessions:data.sessions.length,rounds:data.stats.rounds,gameStorage:!!gameStorage};
}
function applyCircaQuestionMetadata(items){
  if(!Array.isArray(items)||!items.length)return false;
  var categoryByQid={};
  items.forEach(function(item){
    if(item&&item.qid&&item.cat)categoryByQid[String(item.qid)]=String(item.cat);
  });
  var changed=false;
  (data.stats.circaQids||[]).forEach(function(qid){
    var cat=categoryByQid[String(qid)];
    if(cat&&data.stats.categories.indexOf(cat)===-1){data.stats.categories.push(cat);changed=true;}
  });
  Object.keys(data.profileStats||{}).forEach(function(id){
    var st=data.profileStats[id];
    if(!st)return;
    if(!Array.isArray(st.categories))st.categories=[];
    (st.circaQids||[]).forEach(function(qid){
      var cat=categoryByQid[String(qid)];
      if(cat&&st.categories.indexOf(cat)===-1){st.categories.push(cat);changed=true;}
    });
  });
  if(changed)save();
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
    clearV73GameStorage();
    localStorage.setItem(GAME_STORAGE_PREFIX+"v72Migration.v1",JSON.stringify({completed:true,reset:true,at:now()}));
  }catch(e){}
  data=defaults();
  data.imports={
    v72MigrationCompleted:true,
    v72ProfileChoicePending:false,
    v72ProfilesFound:0,
    v72PerfectUnknown:false,
    v72DetailBackfillV1:true,
    resetAt:now()
  };
  save();
}
function snapshot(){return clone(data);}
function createBackup(){
  return {
    format:BACKUP_FORMAT,
    formatVersion:BACKUP_VERSION,
    exportedAt:now(),
    data:snapshot(),
    gameStorage:snapshotGameStorage()
  };
}

save();
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
  importSnapshot:importSnapshot,
  createBackup:createBackup,
  reset:reset
};
})();
