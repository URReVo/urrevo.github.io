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
const engineSource=read("assets/js/game-engine.js");
for(const [name,source] of [["app-state",appStateSource],["launcher",launcherSource],["game-engine",engineSource]]){
  try{new Function(source);}catch(error){fail(name+" syntax error: "+error.message);}
}
assert(appStateSource.includes('var KEY="imposterGames.appState.v1"'),"production app-state key missing");
assert(appStateSource.includes('BACKUP_FORMAT="imposter-games-backup"'),"production backup format missing");
assert(engineSource.includes('EXP_STORAGE="imposterGames.v73.game."'),"V73 isolated game storage missing");
assert(!html["index.html"].includes("APP-SHELL TEST"),"production launcher still contains experiment badge");

/* Simulate the first V72 -> V73 profile migration. */
const legacySeed=new Map();
const put=(key,value)=>legacySeed.set(key,JSON.stringify(value));
put("circaImpostor.playerStats.v1",{
  marlon:{name:"Marlon",avatar:"😎",rounds:8,closest:3,farthest:1,impostor:2,impostorWins:1,errorSum:44,errorSamples:8},
  leon:{name:"Leon",avatar:"🦊",rounds:5,closest:1,farthest:2,impostor:1,impostorWins:0,errorSum:31,errorSamples:5}
});
put("circaImpostor.deviceStats.v1",{roundsPlayed:8});
put("circaImpostor.completedQuestions.v1",["q1","q2"]);
put("circaImpostor.players.v1",{players:[{name:"Marlon",avatar:"😎"},{name:"Leon",avatar:"🦊"},{name:"Alex",avatar:"🐼"}]});
put("classicImpostor.players.v1",{players:[{name:"LEON",avatar:"🦊"},{name:"Chris",avatar:"🤠"}]});
const legacyBefore=new Map(legacySeed);
const fakeStorage={
  getItem:key=>legacySeed.has(key)?legacySeed.get(key):null,
  setItem:(key,value)=>legacySeed.set(key,String(value)),
  removeItem:key=>legacySeed.delete(key)
};
const fakeCrypto={getRandomValues(arr){for(let i=0;i<arr.length;i++)arr[i]=100+i;return arr;}};
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
const migrationStatus=migratedStore.getMigrationStatus();
assert(migrationStatus.completed&&migrationStatus.profileChoicePending&&migrationStatus.profilesFound===4,"V72 migration status invalid");
for(const [key,value] of legacyBefore){
  assert(legacySeed.get(key)===value,"V72 key was modified during migration: "+key);
}
assert(legacySeed.has("imposterGames.appState.v1"),"V73 app-state was not persisted");

console.log("Release validation OK · V"+release+" · "+questions.items.length+" Circa pairs · "+words.items.length+" Classic words");
