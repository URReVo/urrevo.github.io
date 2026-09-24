import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const fail=msg=>{throw new Error(msg);};
const assert=(cond,msg)=>{if(!cond)fail(msg);};

const games=JSON.parse(read("data/games.json"));
const questions=JSON.parse(read("data/circa-questions.json"));
const words=JSON.parse(read("data/classic-words.json"));
const manifest=JSON.parse(read("manifest.webmanifest"));
const release=String(games.platformVersion);

const htmlFiles=["index.html","games/circa-imposter/index.html","games/classic-imposter/index.html"];
const html=Object.fromEntries(htmlFiles.map(p=>[p,read(p)]));

for(const [file,source] of Object.entries(html)){
  assert(!source.includes("\\n"),file+" contains literal \\n text");
  const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
  assert(!duplicates.length,file+" duplicate IDs: "+duplicates.join(", "));
}

assert(html["index.html"].includes("V"+release),"launcher title/version mismatch");
for(const file of ["games/circa-imposter/index.html","games/classic-imposter/index.html"]){
  assert(html[file].includes("V"+release),file+" title/version mismatch");
  assert(html[file].includes('version:"'+release+'"'),file+" config version mismatch");
  assert(html[file].includes("game.css?v="+release),file+" game.css version mismatch");
  assert(html[file].includes("game-engine.js?v="+release),file+" engine version mismatch");
  assert(html[file].includes("pwa.js?v="+release),file+" pwa version mismatch");
}
assert(html["index.html"].includes("launcher.css?v="+release),"launcher.css version mismatch");
assert(html["index.html"].includes("app-state.js?v="+release),"launcher app-state version mismatch");
assert(html["index.html"].includes("launcher.js?v="+release),"launcher.js version mismatch");
assert(html["index.html"].includes("pwa.js?v="+release),"launcher pwa version mismatch");
for(const file of ["games/circa-imposter/index.html","games/classic-imposter/index.html"]){
  assert(html[file].includes("app-state.js?v="+release),file+" app-state version mismatch");
  assert(html[file].indexOf("app-state.js?v="+release)<html[file].indexOf("game-engine.js?v="+release),file+" must load app-state before engine");
}

const sw=read("service-worker.js");
const swRelease=(sw.match(/const RELEASE="([^"]+)"/)||[])[1];
assert(swRelease===release,"service worker RELEASE mismatch");
assert(!sw.includes("skipWaiting"),"service worker must not force skipWaiting");
assert(!sw.includes("localStorage"),"service worker must not touch localStorage");
assert(sw.includes("caches.delete(CACHE_NAME)"),"failed install cache cleanup missing");
assert(sw.includes('versioned("/assets/js/app-state.js")'),"service worker app-state cache missing");

const circaForbidden=["classicRole","classicDiscussion","classicResult","classicOptions","classicTimerSelect"];
const classicForbidden=["stats","difficultyControl","question","normalReveal","answers","result","openStats","scrubber"];
for(const id of circaForbidden)assert(!html["games/circa-imposter/index.html"].includes('id="'+id+'"'),"Circa contains Classic DOM: "+id);
for(const id of classicForbidden)assert(!html["games/classic-imposter/index.html"].includes('id="'+id+'"'),"Classic contains Circa DOM: "+id);

assert(Number(questions.count)===questions.items.length,"Circa count mismatch");
const qids=questions.items.map(x=>x.qid);
assert(new Set(qids).size===qids.length,"duplicate Circa qid");
for(const item of questions.items){
  assert(item.qid&&item.cat&&item.normal&&item.imp,"malformed Circa item "+item.qid);
  const step=Number(item.step),max=Number(item.max);
  assert(Number.isFinite(step)&&step>0&&Number.isFinite(max)&&max>0,"invalid slider "+item.qid);
  const values=[Number(item.normalValue),Number(item.impValue)];
  for(const value of values){
    assert(Number.isFinite(value)&&value>=0&&value<=max,"target out of bounds "+item.qid);
    assert(Math.abs(value/step-Math.round(value/step))<1e-8,"unreachable target "+item.qid);
  }
  const high=Math.max(...values);
  assert(max+1e-9>=high*1.15,"slider headroom below 15% "+item.qid);
}
const difficultyCoverage={};
for(const item of questions.items){
  const a=Math.abs(Number(item.normalValue)),b=Math.abs(Number(item.impValue));
  const low=Math.min(a,b),high=Math.max(a,b),ratio=low>0?high/low:999;
  const level=ratio<=1.30?"leicht":ratio<=1.80?"mittel":"schwer";
  if(!difficultyCoverage[item.cat])difficultyCoverage[item.cat]={leicht:0,mittel:0,schwer:0};
  difficultyCoverage[item.cat][level]++;
  assert(Number(item.normalValue)!==0&&Number(item.impValue)!==0,"zero target value "+item.qid);
  assert(String(item.normal).trim().toLocaleLowerCase("de-DE")!==String(item.imp).trim().toLocaleLowerCase("de-DE"),"identical Circa questions "+item.qid);
}
for(const [cat,counts] of Object.entries(difficultyCoverage)){
  for(const level of ["leicht","mittel","schwer"])assert(counts[level]>0,"no "+level+" Circa questions in "+cat);
}

assert(Number(words.count)===words.items.length,"Classic count mismatch");
const wids=words.items.map(x=>x.wid);
assert(new Set(wids).size===wids.length,"duplicate Classic wid");
const wordNames=words.items.map(x=>String(x.word).toLocaleLowerCase("de-DE"));
const hints=words.items.map(x=>String(x.hint).toLocaleLowerCase("de-DE"));
assert(new Set(wordNames).size===wordNames.length,"duplicate Classic word");
assert(new Set(hints).size===hints.length,"duplicate Classic hint");

assert(manifest.start_url==="/"&&manifest.scope==="/","manifest root scope/start mismatch");
assert(manifest.display==="standalone","manifest display must be standalone");

const readme=read("README.md");
assert(!readme.includes("\\n"),"README contains literal \\n text");

const appStateSource=read("assets/js/app-state.js");
const launcherSource=read("assets/js/launcher.js");
const launcherCss=read("assets/css/launcher.css");
const gameCss=read("assets/css/game.css");
const engineSource=read("assets/js/game-engine.js");
for(const [name,source] of [["app-state",appStateSource],["launcher",launcherSource],["game-engine",engineSource]]){
  try{new Function(source);}catch(error){fail(name+" syntax error: "+error.message);}
}
assert(appStateSource.includes('var KEY="imposterGames.appState.v1"'),"production app-state key missing");
assert(appStateSource.includes('BACKUP_FORMAT="imposter-games-backup"'),"production backup format missing");
assert(engineSource.includes('EXP_STORAGE="imposterGames.v73.game."'),"V73 isolated game storage missing");
assert(!html["index.html"].includes("APP-SHELL TEST"),"production launcher still contains experiment badge");
assert(launcherCss.includes("padding:calc(18px + var(--safeTop)) 16px 26px"),"launcher safe-area top padding missing");
assert(sw.includes('const CACHE_REVISION="r6"'),"V73 launcher-audio cache revision mismatch");
assert(appStateSource.includes("var BACKUP_VERSION=2"),"backup format v2 missing");
assert(engineSource.includes("experimentRecordCirca(null);"),"Circa shared base-round recording missing");
assert(engineSource.includes("impostorEscaped:outcome===true?true:outcome===false?false:null"),"Circa unresolved outcome state missing");
assert((engineSource.match(/experimentGameRunId="run_"/g)||[]).length>=2,"new game run IDs are not regenerated per party");
assert(engineSource.includes("function experimentActiveProfile"),"active-profile identity guard missing");
assert(engineSource.includes('setPreference("sound",soundEnabled)'),"in-game sound preference persistence missing");
assert(engineSource.includes("function motionEnabled()"),"game animation preference helper missing");
assert(gameCss.includes(".experimentReduceMotion *"),"game reduced-motion CSS missing");
assert(launcherSource.includes("function launcherSoundEnabled()"),"launcher sound preference guard missing");
assert(launcherSource.includes("function uiSound(kind)"),"launcher UI sound generator missing");
assert(launcherSource.includes("function navigateWithSound(href)"),"launcher start-sound navigation missing");
assert(launcherSource.includes("store.getPreferences().sound!==false"),"launcher sound is not tied to global preference");
assert(launcherSource.includes('querySelectorAll("a.gameCard[href]")'),"game-card sound/navigation binding missing");
assert(!/\.(mp3|wav|m4a|aac|ogg)["']/i.test(launcherSource),"launcher should not depend on external audio files");
assert(launcherCss.includes("-webkit-user-select:none")&&launcherCss.includes("user-select:none"),"launcher text-selection lock missing");
assert(launcherSource.includes('document.addEventListener("copy"'),"launcher copy guard missing");
assert(gameCss.includes("V73 launcher-aligned game makeover"),"launcher-aligned game makeover missing");
assert(gameCss.includes(".classicRoleScreen:not(.hidden)"),"Classic visible-only transition layout missing");
assert(gameCss.includes(".classicRoleScreen.hidden"),"Classic hidden-screen safety missing");
assert(gameCss.includes("color:#00d747!important"),"Circa result success green missing");
assert(circaHtml.includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"Circa opaque iOS status bar missing");
assert(classicHtml.includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"Classic opaque iOS status bar missing");

/* Simulate the first V72 -> V73 profile migration. */
const legacySeed=new Map();
const put=(key,value)=>legacySeed.set(key,JSON.stringify(value));
put("circaImpostor.playerStats.v1",{
  marlon:{name:"Marlon",avatar:"😎",rounds:8,closest:3,farthest:1,impostor:2,impostorWins:1,errorSum:44,errorSamples:8},
  leon:{name:"Leon",avatar:"🦊",rounds:5,closest:1,farthest:2,impostor:1,impostorWins:0,errorSum:31,errorSamples:5}
});
put("circaImpostor.deviceStats.v1",{roundsPlayed:8});
const legacyQids=[questions.items[0].qid,questions.items[1].qid];
put("circaImpostor.completedQuestions.v1",legacyQids);
put("circaImpostor.players.v1",{players:[{name:"Marlon",avatar:"😎"},{name:"Leon",avatar:"🦊"},{name:"Alex",avatar:"🐼"}]});
put("classicImpostor.players.v1",{players:[{name:"LEON",avatar:"🦊"},{name:"Chris",avatar:"🤠"}]});
const legacyBefore=new Map(legacySeed);
const fakeStorage={
  getItem:key=>legacySeed.has(key)?legacySeed.get(key):null,
  setItem:(key,value)=>legacySeed.set(key,String(value)),
  removeItem:key=>legacySeed.delete(key)
};
let fakeCryptoTick=0;
const fakeCrypto={getRandomValues(arr){fakeCryptoTick++;for(let i=0;i<arr.length;i++)arr[i]=fakeCryptoTick*100+i;return arr;}};
const fakeWindow={crypto:fakeCrypto};
const migratedStore=new Function("window","localStorage","crypto",appStateSource+";return window.CIAppState;")(fakeWindow,fakeStorage,fakeCrypto);
const migratedProfiles=migratedStore.getProfiles();
assert(migratedProfiles.length===4,"V72 migration should create 4 unique profiles");
const byName=Object.fromEntries(migratedProfiles.map(p=>[p.name.toLocaleLowerCase("de-DE"),p]));
assert(byName.marlon&&byName.leon&&byName.alex&&byName.chris,"V72 migration profile names incomplete");
const marlonStats=migratedStore.getProfileStats(byName.marlon.id);
assert(marlonStats.rounds===8&&marlonStats.circaRounds===8,"Marlon V72 rounds not migrated");
assert(marlonStats.impostor===2&&marlonStats.impostorEscapes===1,"Marlon Impostor stats not migrated");
assert(marlonStats.closest===3&&marlonStats.farthest===1,"Marlon estimate stats not migrated");
assert(marlonStats.circaQids.length===legacyQids.length,"full-participation V72 QIDs not attributed to Marlon");
const leonStats=migratedStore.getProfileStats(byName.leon.id);
assert(leonStats.circaQids.length===0&&leonStats.legacyCategoryUnknown===true,"partial V72 player must not receive unverifiable QIDs");
migratedStore.applyCircaQuestionMetadata(questions.items);
const marlonHydrated=migratedStore.getProfileStats(byName.marlon.id);
assert(marlonHydrated.categories.includes(questions.items[0].cat),"legacy personal Circa category metadata not restored");
assert(migratedStore.getStats().categories.includes(questions.items[0].cat),"legacy global Circa category metadata not restored");
const migrationStatus=migratedStore.getMigrationStatus();
assert(migrationStatus.completed&&migrationStatus.profileChoicePending&&migrationStatus.profilesFound===4,"V72 migration status invalid");
for(const [key,value] of legacyBefore){
  assert(legacySeed.get(key)===value,"V72 key was modified during migration: "+key);
}
assert(legacySeed.has("imposterGames.appState.v1"),"V73 app-state was not persisted");

/* Simulate a device that already completed the original V73 migration before the metadata hotfix. */
const retroSeed=new Map();
const retroProfileId="player_existing";
retroSeed.set("imposterGames.appState.v1",JSON.stringify({
  schemaVersion:1,
  selectedProfileId:retroProfileId,
  primaryProfileId:retroProfileId,
  profiles:[{id:retroProfileId,name:"Marlon",avatar:"😎",createdAt:"2026-09-23T20:00:00.000Z"}],
  profileStats:{[retroProfileId]:{rounds:8,circaRounds:8,classicRounds:0,impostor:2,impostorEscapes:1,closest:3,farthest:1,perfect:0,errorSum:44,errorSamples:8,circaQids:[],classicWids:[],categories:[]}},
  profileArchive:{},
  stats:{rounds:8,circaRounds:8,classicRounds:0,perfectEstimates:0,circaQids:legacyQids.slice(),classicWids:[],categories:[]},
  sessions:[],
  activeSessionId:null,
  achievements:{},
  presets:[],
  launchPreset:null,
  launchGroup:null,
  preferences:{sound:true,haptics:true,animations:true},
  imports:{v72MigrationCompleted:true,v72ProfileChoicePending:false,v72ProfilesFound:1}
}));
retroSeed.set("circaImpostor.playerStats.v1",legacySeed.get("circaImpostor.playerStats.v1"));
retroSeed.set("circaImpostor.deviceStats.v1",legacySeed.get("circaImpostor.deviceStats.v1"));
retroSeed.set("circaImpostor.completedQuestions.v1",legacySeed.get("circaImpostor.completedQuestions.v1"));
const retroStorage={
  getItem:key=>retroSeed.has(key)?retroSeed.get(key):null,
  setItem:(key,value)=>retroSeed.set(key,String(value)),
  removeItem:key=>retroSeed.delete(key)
};
let retroTick=0;
const retroCrypto={getRandomValues(arr){retroTick++;for(let i=0;i<arr.length;i++)arr[i]=retroTick*200+i;return arr;}};
const retroWindow={crypto:retroCrypto};
const retroStore=new Function("window","localStorage","crypto",appStateSource+";return window.CIAppState;")(retroWindow,retroStorage,retroCrypto);
const retroStats=retroStore.getProfileStats(retroProfileId);
assert(retroStats.circaQids.length===legacyQids.length,"already-migrated V73 profile did not receive legacy QID backfill");
assert(retroStats.legacyPerfectUnknown===true,"already-migrated V73 profile did not receive perfect-stat uncertainty");
retroStore.applyCircaQuestionMetadata(questions.items);
assert(retroStore.getProfileStats(retroProfileId).categories.includes(questions.items[0].cat),"already-migrated V73 profile category backfill failed");

/* V73 state/regression audit: round idempotency, groups, reset and backup v2. */
function auditStorage(seedEntries=[]){
  const map=new Map(seedEntries);
  return {
    map,
    storage:{
      getItem:key=>map.has(key)?map.get(key):null,
      setItem:(key,value)=>map.set(key,String(value)),
      removeItem:key=>map.delete(key),
      key:index=>Array.from(map.keys())[index]??null,
      get length(){return map.size;}
    }
  };
}
function auditStore(holder){
  let tick=0;
  const crypto={getRandomValues(arr){tick++;for(let i=0;i<arr.length;i++)arr[i]=tick*1000+i;return arr;}};
  const win={crypto};
  return new Function("window","localStorage","crypto",appStateSource+";return window.CIAppState;")(win,holder.storage,crypto);
}
const auditMem=auditStorage();
const auditState=auditStore(auditMem);
const auditM=auditState.getProfiles()[0];
assert(auditState.updateProfile(auditM.id,{name:"Marlon",avatar:"😎"})===true,"profile rename failed");
const auditL=auditState.addProfile({name:"Leon",avatar:"🦊"});
const auditA=auditState.addProfile({name:"Alex",avatar:"🐼"});
const auditC=auditState.addProfile({name:"Chris",avatar:"🤠"});
assert(auditState.updateProfile(auditA,{name:"LEON",avatar:"🐼"})===false,"duplicate profile rename was accepted");
const auditMProfile=auditState.getProfileById(auditM.id);
assert(!auditMProfile.aliases.includes("Spieler"),"generic placeholder leaked into profile aliases");

auditState.beginSession([
  {profileId:auditM.id,name:"Marlon",avatar:"😎"},
  {profileId:auditL,name:"Leon",avatar:"🦊"},
  {profileId:auditA,name:"Alex",avatar:"🐼"}
]);
const auditCirca={
  roundKey:"audit-run-1::circa::1",game:"circa",category:"Allgemein",qid:questions.items[0].qid,
  impostorId:auditL,impostorEscaped:null,
  players:[
    {profileId:auditM.id,role:"normal",error:0,perfect:true,closest:true},
    {profileId:auditL,role:"impostor",error:10},
    {profileId:auditA,role:"normal",error:30,farthest:true}
  ]
};
auditState.recordRound(auditCirca);
assert(auditState.getStats().rounds===1&&auditState.getStats().perfectEstimates===1,"Circa base round counted incorrectly");
auditState.recordRound({...auditCirca,impostorEscaped:true});
assert(auditState.getStats().rounds===1&&auditState.getProfileStats(auditL).impostorEscapes===1,"Circa outcome update double-counted");
auditState.recordRound({...auditCirca,impostorEscaped:false});
assert(auditState.getStats().rounds===1&&auditState.getProfileStats(auditL).impostorEscapes===0,"Circa outcome correction failed");

auditState.beginSession([
  {profileId:auditM.id,name:"Marlon",avatar:"😎"},
  {profileId:auditL,name:"Leon",avatar:"🦊"},
  {profileId:auditC,name:"Chris",avatar:"🤠"}
]);
let auditSession=auditState.getActiveSession();
assert(auditSession.profileIds.length===4,"session participant union did not update");
assert(auditSession.lastProfileIds.length===3&&auditSession.lastProfileIds.includes(auditC),"latest session group did not update");

const auditClassic={
  roundKey:"audit-run-2::classic::1",game:"classic",category:"Alltag",wid:words.items[0].wid,word:words.items[0].word,
  impostorId:auditC,impostorEscaped:null,
  players:[
    {profileId:auditM.id,role:"normal"},
    {profileId:auditL,role:"normal"},
    {profileId:auditC,role:"impostor"}
  ]
};
auditState.recordRound(auditClassic);
auditState.recordRound(auditClassic);
auditSession=auditState.getActiveSession();
assert(auditState.getStats().rounds===2&&auditState.getStats().classicRounds===1,"Classic round idempotency failed");
assert(auditSession.rounds.length===2,"session contains duplicate round records");

const emptyMem=auditStorage();
const emptyState=auditStore(emptyMem);
const emptyP1=emptyState.getProfiles()[0];
emptyState.updateProfile(emptyP1.id,{name:"One",avatar:"😎"});
const emptyP2=emptyState.addProfile({name:"Two",avatar:"🦊"});
const emptyP3=emptyState.addProfile({name:"Three",avatar:"🐼"});
emptyState.beginSession([{profileId:emptyP1.id,name:"One"},{profileId:emptyP2,name:"Two"},{profileId:emptyP3,name:"Three"}]);
emptyState.endSession();
assert(!emptyState.getAchievements().find(a=>a.id==="first-session").unlocked,"empty session unlocked first-session achievement");

auditMem.storage.setItem("imposterGames.v73.game.circa.deckProgress.v1",JSON.stringify({"Allgemein::mittel":[questions.items[0].qid]}));
auditMem.storage.setItem("imposterGames.v73.game.circa.completedQuestions.v1",JSON.stringify([questions.items[0].qid]));
auditMem.storage.setItem("imposterGames.v73.game.classic.timer.v1",JSON.stringify(180));
const auditBackup=auditState.createBackup();
assert(auditBackup.formatVersion===2&&auditBackup.gameStorage,"backup v2 game storage missing");

const restoreMem=auditStorage();
restoreMem.storage.setItem("imposterGames.v73.game.circa.completedQuestions.v1",JSON.stringify(["stale"]));
const restoreState=auditStore(restoreMem);
const restoreResult=restoreState.importSnapshot(auditBackup);
assert(restoreResult.ok&&restoreResult.gameStorage===true,"backup v2 restore failed");
assert(JSON.parse(restoreMem.storage.getItem("imposterGames.v73.game.circa.completedQuestions.v1"))[0]===questions.items[0].qid,"game progress was not restored");

restoreState.reset();
const resetReload=auditStore(restoreMem);
assert(resetReload.getProfiles().length===1&&resetReload.getProfiles()[0].name==="Spieler","reset profile state resurrected old data");
assert(resetReload.getMigrationStatus().perfectUnknown===false,"reset leaked V72 perfect uncertainty");
const remainingGameKeys=Array.from(restoreMem.map.keys()).filter(key=>key.startsWith("imposterGames.v73.game."));
assert(remainingGameKeys.length===1&&remainingGameKeys[0]==="imposterGames.v73.game.v72Migration.v1","reset left stale V73 game storage");

console.log("Release validation OK · V"+release+" · "+questions.items.length+" Circa pairs · "+words.items.length+" Classic words");
