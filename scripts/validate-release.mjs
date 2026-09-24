import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const fail=msg=>{throw new Error(msg);};
const assert=(cond,msg)=>{if(!cond)fail(msg);};

const games=JSON.parse(read("data/games.json"));
const questions=JSON.parse(read("data/circa-questions.json"));
const words=JSON.parse(read("data/classic-words.json"));
const who=JSON.parse(read("data/who-am-i.json"));
const charades=JSON.parse(read("data/charades.json"));
const manifest=JSON.parse(read("manifest.webmanifest"));
const release=String(games.platformVersion);
const cacheRevision=(read("service-worker.js").match(/const CACHE_REVISION="([^"]+)"/)||[])[1]||"";
const launcherBuild="V"+release+String(cacheRevision).toUpperCase();

const htmlFiles=["index.html","games/circa-imposter/index.html","games/classic-imposter/index.html","games/who-am-i/index.html","games/charades/index.html"];
const html=Object.fromEntries(htmlFiles.map(p=>[p,read(p)]));

for(const [file,source] of Object.entries(html)){
  assert(!source.includes("\\n"),file+" contains literal \\n text");
  const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
  assert(!duplicates.length,file+" duplicate IDs: "+duplicates.join(", "));
}

assert(html["index.html"].includes("V"+release),"launcher title/version mismatch");
assert(html["index.html"].includes("<title>Imposter Games · "+launcherBuild+"</title>"),"launcher build label mismatch");
assert(html["index.html"].includes("<strong>Imposter Games · "+launcherBuild+"</strong>"),"settings build label mismatch");
assert(!html["index.html"].includes("IMPOSTER GAMES · "+launcherBuild),"home eyebrow must not show build revision");
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
assert(html["games/who-am-i/index.html"].includes("V"+release),"WhoAmI title/version mismatch");
assert(html["games/who-am-i/index.html"].includes("game.css?v="+release),"WhoAmI game.css version mismatch");
assert(html["games/who-am-i/index.html"].includes("who-am-i.css?v="+release),"WhoAmI CSS version mismatch");
assert(html["games/who-am-i/index.html"].includes("app-state.js?v="+release),"WhoAmI app-state version mismatch");
assert(html["games/who-am-i/index.html"].includes("who-am-i.js?v="+release),"WhoAmI JS version mismatch");
assert(html["games/who-am-i/index.html"].includes("pwa.js?v="+release),"WhoAmI pwa version mismatch");
assert(html["games/who-am-i/index.html"].indexOf("app-state.js?v="+release)<html["games/who-am-i/index.html"].indexOf("who-am-i.js?v="+release),"WhoAmI app-state load order mismatch");
assert(html["games/charades/index.html"].includes("V"+release),"Scharade title/version mismatch");
assert(html["games/charades/index.html"].includes("game.css?v="+release),"Scharade game.css version mismatch");
assert(html["games/charades/index.html"].includes("charades.css?v="+release),"Scharade CSS version mismatch");
assert(html["games/charades/index.html"].includes("app-state.js?v="+release),"Scharade app-state version mismatch");
assert(html["games/charades/index.html"].includes("charades.js?v="+release),"Scharade JS version mismatch");
assert(html["games/charades/index.html"].includes("pwa.js?v="+release),"Scharade pwa version mismatch");
assert(html["games/charades/index.html"].indexOf("app-state.js?v="+release)<html["games/charades/index.html"].indexOf("charades.js?v="+release),"Scharade app-state load order mismatch");

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

assert(Number(who.count)===who.items.length,"WhoAmI count mismatch");
assert(who.items.length===275,"WhoAmI production term count mismatch");
const whoIds=who.items.map(x=>String(x.id));
const whoTerms=who.items.map(x=>String(x.term).toLocaleLowerCase("de-DE"));
assert(new Set(whoIds).size===whoIds.length,"duplicate WhoAmI id");
assert(new Set(whoTerms).size===whoTerms.length,"duplicate WhoAmI term");
assert(Array.isArray(who.categories)&&who.categories.length===11,"WhoAmI category count mismatch");
for(const category of who.categories){
  const actual=who.items.filter(item=>item.cat===category.name).length;
  assert(actual===Number(category.count),"WhoAmI category metadata mismatch: "+category.name);
}

assert(Number(charades.count)===charades.items.length,"Scharade count mismatch");
assert(charades.items.length===300,"Scharade production term count mismatch");
const charadesIds=charades.items.map(x=>String(x.id));
const charadesTerms=charades.items.map(x=>String(x.term).toLocaleLowerCase("de-DE"));
assert(new Set(charadesIds).size===charadesIds.length,"duplicate Scharade id");
assert(new Set(charadesTerms).size===charadesTerms.length,"duplicate Scharade term");
assert(Array.isArray(charades.categories)&&charades.categories.length===12,"Scharade category count mismatch");
for(const category of charades.categories){
  const actual=charades.items.filter(item=>item.cat===category.name).length;
  assert(actual===Number(category.count),"Scharade category metadata mismatch: "+category.name);
}

assert(manifest.start_url==="/"&&manifest.scope==="/","manifest root scope/start mismatch");
assert(manifest.display==="standalone","manifest display must be standalone");

const readme=read("README.md");
assert(!readme.includes("\\n"),"README contains literal \\n text");

const appStateSource=read("assets/js/app-state.js");
const launcherSource=read("assets/js/launcher.js");
const launcherCss=read("assets/css/launcher.css");
const gameCss=read("assets/css/game.css");
const engineSource=read("assets/js/game-engine.js");
const whoSource=read("assets/js/who-am-i.js");
const whoCss=read("assets/css/who-am-i.css");
const charadesSource=read("assets/js/charades.js");
const charadesCss=read("assets/css/charades.css");
for(const [name,source] of [["app-state",appStateSource],["launcher",launcherSource],["game-engine",engineSource],["who-am-i",whoSource],["charades",charadesSource]]){
  try{new Function(source);}catch(error){fail(name+" syntax error: "+error.message);}
}
assert(appStateSource.includes('var KEY="imposterGames.appState.v1"'),"production app-state key missing");
assert(appStateSource.includes('BACKUP_FORMAT="imposter-games-backup"'),"production backup format missing");
assert(engineSource.includes('EXP_STORAGE="imposterGames.v73.game."'),"V73 isolated game storage missing");
assert(!appStateSource.includes("imposterGames.prototype."),"production app-state must not reference prototype storage");
assert(!engineSource.includes("imposterGames.prototype."),"production game engine must not reference prototype storage");
assert(whoSource.includes('STORAGE_PREFIX="imposterGames.v73.game.whoami."'),"WhoAmI production storage namespace missing");
assert(!whoSource.includes("imposterGames.prototype."),"production WhoAmI must not reference prototype storage");
assert(appStateSource.includes('"whoami.players.v1","whoami.categories.v1","whoami.deck.v1"'),"WhoAmI backup allowlist missing");
assert(charadesSource.includes('PREFIX="imposterGames.v73.game.charades."'),"Scharade production storage namespace missing");
assert(!charadesSource.includes("imposterGames.prototype."),"production Scharade must not reference prototype storage");
assert(appStateSource.includes('"charades.players.v1","charades.categories.v1","charades.deck.v1","charades.timer.v1","charades.motionFlip.v2"'),"Scharade backup allowlist missing");
assert(charadesSource.includes('window.addEventListener("devicemotion",onDeviceMotion,true)'),"Scharade DeviceMotion listener missing");
assert(charadesSource.includes("latestGravityZ-baseGravityZ"),"Scharade signed gravity direction missing");
assert(charadesSource.includes("ACTION_COOLDOWN_MS=3000"),"Scharade 3-second action cooldown missing");
assert(charadesSource.includes("GRAVITY_CORRECT_TRIGGER=7.0")&&charadesSource.includes("GRAVITY_SKIP_TRIGGER=5.0"),"Scharade bidirectional thresholds missing");
assert(!sw.includes("/experiments/prototype"),"production service worker must not cache prototype paths");
const prototypeAppStateSource=read("experiments/prototype/assets/js/app-state.js");
const prototypeEngineSource=read("experiments/prototype/assets/js/game-engine.js");
const prototypeWhoSource=read("experiments/prototype/assets/js/who-am-i.js");
const prototypeCharadesSource=read("experiments/prototype/assets/js/charades.js");
assert(prototypeAppStateSource.includes('var KEY="imposterGames.prototype.appState.v1"'),"prototype app-state key lost isolation");
assert(prototypeAppStateSource.includes('BACKUP_FORMAT="imposter-games-prototype-backup"'),"prototype backup format lost isolation");
assert(prototypeEngineSource.includes('EXP_STORAGE="imposterGames.prototype.game."'),"prototype game storage lost isolation");
assert(!prototypeAppStateSource.includes('var KEY="imposterGames.appState.v1"'),"prototype must not use production app-state key");
assert(!prototypeEngineSource.includes('EXP_STORAGE="imposterGames.v73.game."'),"prototype must not use production game storage");
assert(prototypeWhoSource.includes('STORAGE_PREFIX="imposterGames.prototype.game.whoami."'),"prototype WhoAmI namespace lost isolation");
assert(!prototypeWhoSource.includes('STORAGE_PREFIX="imposterGames.v73.game.whoami."'),"prototype WhoAmI must not use production storage");
assert(prototypeCharadesSource.includes('PREFIX="imposterGames.prototype.game.charades."'),"prototype Scharade namespace lost isolation");
assert(!prototypeCharadesSource.includes('PREFIX="imposterGames.v73.game.charades."'),"prototype Scharade must not use production storage");
assert(!html["index.html"].includes("APP-SHELL TEST"),"production launcher still contains experiment badge");
assert(launcherCss.includes("padding:calc(18px + var(--safeTop)) 16px 26px"),"launcher safe-area top padding missing");
assert(sw.includes('const CACHE_REVISION="r12"'),"V73 cache revision mismatch");
assert(appStateSource.includes("var BACKUP_VERSION=3"),"backup format v3 missing");
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
assert(html["games/circa-imposter/index.html"].includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"Circa opaque iOS status bar missing");
assert(html["games/classic-imposter/index.html"].includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"Classic opaque iOS status bar missing");
assert(html["games/who-am-i/index.html"].includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"WhoAmI opaque iOS status bar missing");
assert(html["games/charades/index.html"].includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"Scharade opaque iOS status bar missing");
assert(whoCss.includes(".whoViewerScreen .whoBottomButton{margin-top:18px}"),"WhoAmI reveal spacing missing");
assert(whoCss.includes(".whoViewerHeader{flex:0 0 auto;margin:-7px 2px 10px}"),"WhoAmI reveal content vertical position missing");
assert(html["index.html"].includes('href="games/who-am-i/"'),"WhoAmI launcher card missing");
assert(games.games.some(game=>game.id==="who-am-i"&&game.path==="games/who-am-i/"),"WhoAmI registry entry missing");
assert(sw.includes('versioned("/assets/js/who-am-i.js")')&&sw.includes('versioned("/assets/css/who-am-i.css")'),"WhoAmI service-worker assets missing");
assert(sw.includes('"/data/who-am-i.json"')&&sw.includes('"/games/who-am-i/"'),"WhoAmI service-worker data/page missing");
assert(html["index.html"].includes('href="games/charades/"'),"Scharade launcher card missing");
assert(games.games.some(game=>game.id==="charades"&&game.path==="games/charades/"),"Scharade registry entry missing");
assert(sw.includes('versioned("/assets/js/charades.js")')&&sw.includes('versioned("/assets/css/charades.css")'),"Scharade service-worker assets missing");
assert(sw.includes('"/data/charades.json"')&&sw.includes('"/games/charades/"'),"Scharade service-worker data/page missing");
assert(charadesCss.includes(".charadesActions button:disabled"),"Scharade cooldown button styling missing");

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
  const crypto={getRandomValues(arr){tick++;for(let i=0;i<arr.length;i++)arr[i]=tick*1000+i;return arr;},subtle:globalThis.crypto.subtle};
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
auditMem.storage.setItem("imposterGames.v73.game.whoami.deck.v1",JSON.stringify({"Alle":[who.items[0].id]}));
auditMem.storage.setItem("imposterGames.v73.game.charades.deck.v1",JSON.stringify({"Alle":[charades.items[0].id]}));
auditMem.storage.setItem("imposterGames.v73.game.charades.timer.v1",JSON.stringify(60));
const auditBackup=await auditState.createBackup();
assert(auditBackup.formatVersion===3&&auditBackup.gameStorage,"backup v3 game storage missing");
assert(auditBackup.integrity&&auditBackup.integrity.algorithm==="SHA-256"&&/^[a-f0-9]{64}$/.test(auditBackup.integrity.sha256),"backup v3 SHA-256 integrity missing");

const tamperedBackup=structuredClone(auditBackup);
tamperedBackup.data.stats.rounds=Number(tamperedBackup.data.stats.rounds||0)+99;
const tamperMem=auditStorage();
const tamperState=auditStore(tamperMem);
const tamperResult=await tamperState.importSnapshot(tamperedBackup);
assert(!tamperResult.ok&&tamperResult.reason==="integrity","tampered backup v3 was accepted");
assert(tamperState.getStats().rounds===0,"tampered backup modified local state before integrity rejection");

const restoreMem=auditStorage();
restoreMem.storage.setItem("imposterGames.v73.game.circa.completedQuestions.v1",JSON.stringify(["stale"]));
const restoreState=auditStore(restoreMem);
const restoreResult=await restoreState.importSnapshot(auditBackup);
assert(restoreResult.ok&&restoreResult.gameStorage===true,"backup v3 restore failed on fresh device state");
assert(JSON.parse(restoreMem.storage.getItem("imposterGames.v73.game.circa.completedQuestions.v1"))[0]===questions.items[0].qid,"game progress was not restored");
assert(JSON.parse(restoreMem.storage.getItem("imposterGames.v73.game.whoami.deck.v1")).Alle[0]===who.items[0].id,"WhoAmI game progress was not restored");
assert(JSON.parse(restoreMem.storage.getItem("imposterGames.v73.game.charades.deck.v1")).Alle[0]===charades.items[0].id,"Scharade game progress was not restored");
assert(JSON.parse(restoreMem.storage.getItem("imposterGames.v73.game.charades.timer.v1"))===60,"Scharade timer was not restored");

const downgradedBackup=structuredClone(auditBackup);
downgradedBackup.formatVersion=2;
const downgradeMem=auditStorage();
const downgradeState=auditStore(downgradeMem);
const downgradeResult=await downgradeState.importSnapshot(downgradedBackup);
assert(!downgradeResult.ok&&downgradeResult.reason==="version","backup v3 -> v2 downgrade bypass was accepted");
assert(downgradeState.getStats().rounds===0,"downgraded backup modified local state");

const legacyV2Backup={
  format:auditBackup.format,
  formatVersion:2,
  exportedAt:auditBackup.exportedAt,
  data:structuredClone(auditBackup.data),
  gameStorage:structuredClone(auditBackup.gameStorage)
};
const legacyMem=auditStorage();
const legacyState=auditStore(legacyMem);
const legacyResult=await legacyState.importSnapshot(legacyV2Backup);
assert(!legacyResult.ok&&legacyResult.reason==="version","legacy backup v2 was accepted");

const unwrappedBackup=structuredClone(auditBackup.data);
const unwrappedMem=auditStorage();
const unwrappedState=auditStore(unwrappedMem);
const unwrappedResult=await unwrappedState.importSnapshot(unwrappedBackup);
assert(!unwrappedResult.ok&&unwrappedResult.reason==="format","unwrapped legacy snapshot bypass was accepted");

restoreState.reset();
const resetReload=auditStore(restoreMem);
assert(resetReload.getProfiles().length===1&&resetReload.getProfiles()[0].name==="Spieler","reset profile state resurrected old data");
assert(resetReload.getMigrationStatus().perfectUnknown===false,"reset leaked V72 perfect uncertainty");
const remainingGameKeys=Array.from(restoreMem.map.keys()).filter(key=>key.startsWith("imposterGames.v73.game."));
assert(remainingGameKeys.length===1&&remainingGameKeys[0]==="imposterGames.v73.game.v72Migration.v1","reset left stale V73 game storage");

console.log("Release validation OK · V"+release+" · "+questions.items.length+" Circa pairs · "+words.items.length+" Classic words · "+who.items.length+" WhoAmI terms · "+charades.items.length+" Scharade terms");
