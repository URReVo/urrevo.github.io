import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source=fs.readFileSync("assets/js/app-state.js","utf8");

function assert(condition,message){
  if(!condition)throw new Error(message);
}

function clone(value){return JSON.parse(JSON.stringify(value));}

function canonicalBackupJson(value){
  if(value===null)return "null";
  if(Array.isArray(value))return "["+value.map(item=>canonicalBackupJson(item===undefined?null:item)).join(",")+"]";
  if(typeof value==="object"){
    return "{"+Object.keys(value).sort().filter(key=>value[key]!==undefined&&typeof value[key]!=="function")
      .map(key=>JSON.stringify(key)+":"+canonicalBackupJson(value[key])).join(",")+"}";
  }
  return JSON.stringify(value);
}
async function resealBackup(backup){
  const payload={
    format:backup.format,
    formatVersion:Number(backup.formatVersion),
    exportedAt:backup.exportedAt||null,
    data:backup.data,
    gameStorage:backup.gameStorage&&typeof backup.gameStorage==="object"&&!Array.isArray(backup.gameStorage)?backup.gameStorage:{}
  };
  const digest=await webcrypto.subtle.digest("SHA-256",new TextEncoder().encode(canonicalBackupJson(payload)));
  backup.integrity={...(backup.integrity||{}),algorithm:"SHA-256",sha256:Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,"0")).join("")};
  return backup;
}

function makeLocalStorage(initial={}){
  const map=new Map(Object.entries(initial));
  return {
    get length(){return map.size;},
    key(index){return Array.from(map.keys())[index]??null;},
    getItem(key){return map.has(String(key))?map.get(String(key)):null;},
    setItem(key,value){map.set(String(key),String(value));},
    removeItem(key){map.delete(String(key));},
    clear(){map.clear();},
    _map:map
  };
}

function makeIndexedDb(){
  const dbs=new Map();

  function request(run){
    const req={result:undefined,error:null,onsuccess:null,onerror:null,onupgradeneeded:null,onblocked:null};
    queueMicrotask(()=>{
      try{run(req);}
      catch(error){req.error=error;if(req.onerror)req.onerror();}
    });
    return req;
  }

  function ensureDb(name){
    if(!dbs.has(name))dbs.set(name,{stores:new Map(),version:0});
    return dbs.get(name);
  }

  function dbHandle(name,data){
    return {
      objectStoreNames:{contains(storeName){return data.stores.has(storeName);}},
      createObjectStore(storeName,options={}){
        if(!data.stores.has(storeName))data.stores.set(storeName,{keyPath:options.keyPath||"id",records:new Map()});
        return {};
      },
      transaction(storeName){
        if(!data.stores.has(storeName))throw new Error("Missing object store "+storeName);
        const store=data.stores.get(storeName);
        return {
          objectStore(){
            return {
              get(id){
                return request(req=>{
                  req.result=store.records.get(id);
                  if(req.onsuccess)req.onsuccess();
                });
              },
              put(value){
                return request(req=>{
                  const key=value[store.keyPath];
                  store.records.set(key,value);
                  req.result=key;
                  if(req.onsuccess)req.onsuccess();
                });
              }
            };
          }
        };
      },
      close(){}
    };
  }

  return {
    open(name,version=1){
      const existed=dbs.has(name);
      const data=ensureDb(name);
      const req=request(r=>{
        const db=dbHandle(name,data);
        r.result=db;
        if((!existed||data.version<version)&&r.onupgradeneeded)r.onupgradeneeded();
        data.version=Math.max(data.version,version);
        if(r.onsuccess)r.onsuccess();
      });
      return req;
    },
    deleteDatabase(name){
      return request(req=>{
        dbs.delete(name);
        if(req.onsuccess)req.onsuccess();
      });
    },
    _dbs:dbs
  };
}

async function createHarness(initialState=null,allowFailure=false){
  const localStorage=makeLocalStorage(initialState?{"imposterGames.appState.v1":JSON.stringify(initialState)}:{});
  const indexedDB=makeIndexedDb();
  const window={
    crypto:webcrypto,
    dispatchEvent(){},
    addEventListener(){},
    removeEventListener(){}
  };
  const context={
    window,
    localStorage,
    indexedDB,
    crypto:webcrypto,
    TextEncoder,
    Uint8Array,
    Date,
    Math,
    JSON,
    Promise,
    Object,
    Array,
    Number,
    String,
    Boolean,
    RegExp,
    Set,
    Map,
    Error,
    console,
    btoa(value){return Buffer.from(value,"binary").toString("base64");},
    atob(value){return Buffer.from(value,"base64").toString("binary");},
    CustomEvent:function CustomEvent(type,init){this.type=type;this.detail=init&&init.detail;},
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(source,context,{filename:"assets/js/app-state.js"});
  const store=context.window.CIAppState;
  assert(store,"CIAppState was not exported");
  const status=await store.flushProgressIntegrity();
  if(!allowFailure)assert(status&&status.ok!==false,"initial integrity setup failed: "+JSON.stringify(status));
  return {store,localStorage,indexedDB,context,status};
}

const base=await createHarness();
const baseSnapshot=base.store.snapshot();
const baseProfile=baseSnapshot.profiles[0];
const baseProfileStats=base.store.getProfileStats(baseProfile.id);

const oldState=clone(baseSnapshot);
if(oldState.imports)delete oldState.imports.progressIntegrityV1InitializedAt;
oldState.profileStats[baseProfile.id]=clone(baseProfileStats);
Object.assign(oldState.profileStats[baseProfile.id],{
  rounds:9999,circaRounds:2,impostor:9,personalImpostor:7,impostorEscapes:8,
  closest:5,farthest:4,perfect:6,errorSamples:7,charadesRounds:0,charadesTurns:5,charadesCleanTurns:4
});
Object.assign(oldState.stats,{rounds:9999,circaRounds:2,impostor:9,personalImpostor:5});
oldState.categoryProgress={
  unlocks:{
    popculture:{method:"challenge",at:"2026-01-01T00:00:00.000Z"},
    tech:{method:"ticket",at:"2026-01-02T00:00:00.000Z"},
    spicy:{method:"ticket",at:"2026-01-03T00:00:00.000Z"}
  },
  ticketNotices:3
};

const migrated=await createHarness(oldState);
const migratedState=migrated.store.snapshot();
const repaired=migratedState.profileStats[baseProfile.id];
assert(migratedState.stats.rounds===2&&repaired.rounds===2,"migration did not reconcile total rounds with per-game rounds");
assert(repaired.impostor===2,"migration did not cap impostor count");
assert(repaired.impostorEscapes===2,"migration did not cap impostor escapes");
assert(repaired.personalImpostor===0,"migration did not cap personal impostor count");
assert(repaired.perfect===2&&repaired.errorSamples===2,"migration did not cap Circa-only profile stats");
assert(repaired.charadesTurns===0&&repaired.charadesCleanTurns===0,"migration did not cap Charades turns");
assert(Object.keys(migratedState.categoryProgress.unlocks).length===0,"impossible ticket/challenge unlock survived migration");
assert(migratedState.categoryProgress.ticketNotices===0,"ticket notice count was not repaired");
const recoveryDb=migrated.indexedDB._dbs.get("imposterGames.progressIntegrity.v1");
assert(recoveryDb&&recoveryDb.stores.get("integrity").records.has("pre-r17-recovery"),"pre-R17 recovery snapshot missing");

const h=await createHarness();
const store=h.store;
const profile=store.getSelectedProfile();

for(let i=0;i<51;i++){
  store.beginSession([{profileId:profile.id,name:profile.name,avatar:profile.avatar}]);
  store.recordRound({
    game:"circa",
    roundKey:"integrity-round-"+i,
    qid:"integrity-q-"+(i%10),
    category:"Alltag",
    players:[{profileId:profile.id,role:"normal",error:10,closest:true}]
  });
  store.endSession();
}
await store.flushProgressIntegrity();

let state=store.snapshot();
assert(state.stats.rounds===51,"51 legitimate rounds were not retained");
assert(state.sessions.length===50,"session retention must remain capped at 50");
assert(store.getProfileStats(profile.id).rounds===51,"profile progress lost at 50-session boundary");

let persisted=JSON.parse(h.localStorage.getItem("imposterGames.appState.v1"));
persisted.stats.rounds=9999;
persisted.profileStats[profile.id].rounds=9999;
persisted.categoryProgress.unlocks.tech={method:"challenge",at:new Date().toISOString()};
h.localStorage.setItem("imposterGames.appState.v1",JSON.stringify(persisted));

let result=await store.validateProgressIntegrity();
assert(result.ok&&result.repaired===true,"stat/category tamper was not detected");
state=store.snapshot();
assert(state.stats.rounds===51,"global rounds were not restored");
assert(store.getProfileStats(profile.id).rounds===51,"profile rounds were not restored");
assert(!state.categoryProgress.unlocks.tech,"fake Tech unlock was not removed");
assert(JSON.parse(h.localStorage.getItem("imposterGames.appState.v1")).stats.rounds===51,"repaired state was not persisted");

persisted=JSON.parse(h.localStorage.getItem("imposterGames.appState.v1"));
persisted.sessions[0].rounds.push({
  game:"circa",roundKey:"fake-session-round",qid:"fake-q",category:"Technik",
  players:[{profileId:profile.id,role:"normal"}]
});
persisted.categoryProgress.unlocks.spicy={method:"challenge",at:new Date().toISOString()};
h.localStorage.setItem("imposterGames.appState.v1",JSON.stringify(persisted));

result=await store.validateProgressIntegrity();
assert(result.ok&&result.repaired===true,"session tamper was not detected");
state=store.snapshot();
assert(state.sessions.length===50,"session repair changed retention count");
assert(!state.sessions.some(s=>s.rounds.some(r=>r.roundKey==="fake-session-round")),"fake session round survived repair");
assert(!state.categoryProgress.unlocks.spicy,"fake Spicy unlock survived repair");

store.devPatchStats("profile",profile.id,{rounds:7777,circaRounds:7777});
assert(store.getProfileStats(profile.id).rounds===7777,"DEV patch did not apply for the test");
result=await store.validateProgressIntegrity();
assert(result.ok&&result.repaired===true,"DEV-mutated real progress was not restored at round gate");
assert(store.getProfileStats(profile.id).rounds===51,"DEV mutation became trusted progress");

store.beginSession([{profileId:profile.id,name:profile.name,avatar:profile.avatar}]);
store.recordRound({
  game:"classic",
  roundKey:"integrity-legit-after-repair",
  wid:"integrity-word",
  word:"Test",
  category:"Alltag",
  players:[{profileId:profile.id,role:"normal"}]
});
store.endSession();
await store.flushProgressIntegrity();
result=await store.validateProgressIntegrity();
assert(result.ok&&!result.repaired,"legitimate progress failed validation after reseal");
state=store.snapshot();
assert(state.stats.rounds===52,"legitimate post-repair round was not retained");
assert(state.sessions.length===50,"50-session retention broke after additional legitimate round");

const initializedWithoutCheckpoint=clone(state);
const missingCheckpoint=await createHarness(initializedWithoutCheckpoint,true);
assert(missingCheckpoint.status&&missingCheckpoint.status.ok===false&&missingCheckpoint.status.reason==="checkpoint-missing","initialized state without checkpoint was silently trusted");

/* R22: a correctly re-hashed but logically impossible backup must be rejected
   before it can replace the current local state. */
const importSource=await createHarness();
const importProfile=importSource.store.getSelectedProfile();
importSource.store.beginSession([{profileId:importProfile.id,name:importProfile.name,avatar:importProfile.avatar}]);
for(let i=0;i<2;i++){
  importSource.store.recordRound({
    game:"circa",
    roundKey:"strict-import-circa-"+i,
    qid:"strict-import-q-"+i,
    category:"Alltag",
    players:[{profileId:importProfile.id,role:"normal",error:12}]
  });
}
importSource.store.endSession();
await importSource.store.flushProgressIntegrity();
const cleanBackup=await importSource.store.createBackup();

async function expectRejectedBackup(mutator,expectedReason,label){
  const forged=clone(cleanBackup);
  mutator(forged);
  await resealBackup(forged);
  const destination=await createHarness();
  const before=destination.store.snapshot();
  const result=await destination.store.importSnapshot(forged);
  assert(!result.ok&&result.reason===expectedReason,label+" was not rejected with "+expectedReason+": "+JSON.stringify(result));
  assert(JSON.stringify(destination.store.snapshot())===JSON.stringify(before),label+" changed current app state before rejection");
}

await expectRejectedBackup(
  backup=>{backup.data.stats.rounds=9999;},
  "plausibility",
  "re-hashed impossible total-round backup"
);
await expectRejectedBackup(
  backup=>{backup.data.categoryProgress.unlocks.popculture={method:"challenge",at:"2026-09-28T12:00:00.000Z"};},
  "category-unlock",
  "impossible Popkultur challenge unlock"
);
await expectRejectedBackup(
  backup=>{backup.data.categoryProgress.unlocks.tech={method:"challenge",at:"2026-09-28T12:00:00.000Z"};},
  "category-unlock",
  "impossible Technik challenge unlock"
);
await expectRejectedBackup(
  backup=>{backup.data.categoryProgress.unlocks.spicy={method:"challenge",at:"2026-09-28T12:00:00.000Z"};},
  "category-unlock",
  "impossible Spicy challenge unlock"
);
await expectRejectedBackup(
  backup=>{backup.data.categoryProgress.unlocks.tech={method:"ticket",at:"2026-09-28T12:00:00.000Z"};},
  "category-unlock",
  "unearned category ticket unlock"
);
await expectRejectedBackup(
  backup=>{backup.data.categoryProgress.unlocks.unknownPack={method:"challenge",at:"2026-09-28T12:00:00.000Z"};},
  "category-unlock",
  "unknown category pack unlock"
);

/* A real challenge unlock must still import unchanged. */
const validUnlockSource=await createHarness();
const validProfile=validUnlockSource.store.getSelectedProfile();
validUnlockSource.store.beginSession([{profileId:validProfile.id,name:validProfile.name,avatar:validProfile.avatar}]);
validUnlockSource.store.recordRound({game:"circa",roundKey:"valid-variety-circa",qid:"valid-q",category:"Alltag",players:[{profileId:validProfile.id,role:"normal",error:5}]});
validUnlockSource.store.recordRound({game:"classic",roundKey:"valid-variety-classic",wid:"valid-w",word:"Test",category:"Alltag",players:[{profileId:validProfile.id,role:"normal"}]});
validUnlockSource.store.recordRound({game:"whoami",roundKey:"valid-variety-who",category:"Tiere",players:[{profileId:validProfile.id,termId:"valid-term"}]});
validUnlockSource.store.endSession();
await validUnlockSource.store.flushProgressIntegrity();
const validUnlockBackup=await validUnlockSource.store.createBackup();
assert(validUnlockBackup.data.categoryProgress.unlocks.popculture?.method==="challenge","test fixture did not earn Popkultur challenge unlock");
const validUnlockDestination=await createHarness();
const validUnlockResult=await validUnlockDestination.store.importSnapshot(validUnlockBackup);
assert(validUnlockResult.ok,"legitimate challenge unlock backup was rejected: "+JSON.stringify(validUnlockResult));
assert(validUnlockDestination.store.snapshot().categoryProgress.unlocks.popculture?.method==="challenge","legitimate Popkultur unlock was not preserved");

/* With bounded 50-session history, an old session-based unlock stays plausible
   when lifetime rounds prove that retained sessions no longer contain all history. */
const historicalBackup=await store.createBackup();
historicalBackup.data.categoryProgress.unlocks.spicy={method:"challenge",at:"2026-09-28T12:00:00.000Z"};
await resealBackup(historicalBackup);
const historicalDestination=await createHarness();
const historicalResult=await historicalDestination.store.importSnapshot(historicalBackup);
assert(historicalResult.ok,"historically plausible Spicy unlock was rejected despite truncated session history: "+JSON.stringify(historicalResult));

console.log("Progress integrity and strict backup-import runtime checks passed.");
