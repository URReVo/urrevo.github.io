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
const personal=JSON.parse(read("data/personal-impostor.json"));
const manifest=JSON.parse(read("manifest.webmanifest"));
const release=String(games.platformVersion);
const cacheRevision=(read("service-worker.js").match(/const CACHE_REVISION="([^"]+)"/)||[])[1]||"";
const launcherBuild="V"+release+String(cacheRevision).toUpperCase();

const htmlFiles=["index.html","games/circa-imposter/index.html","games/classic-imposter/index.html","games/who-am-i/index.html","games/charades/index.html","games/personal-impostor/index.html"];
const html=Object.fromEntries(htmlFiles.map(p=>[p,read(p)]));
const normalizeContentText=value=>String(value||"")
  .toLocaleLowerCase("de-DE")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9äöüß]+/g," ")
  .trim()
  .replace(/\s+/g," ");
const assertUniqueNormalized=(items,selector,label)=>{
  const seen=new Map();
  for(const item of items){
    const value=normalizeContentText(selector(item));
    assert(value,label+" contains empty normalized content");
    if(seen.has(value))fail(label+" duplicate: "+value);
    seen.set(value,true);
  }
};

for(const [file,source] of Object.entries(html)){
  assert(!source.includes("\\n"),file+" contains literal \\n text");
  const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
  assert(!duplicates.length,file+" duplicate IDs: "+duplicates.join(", "));
}

assert(html["index.html"].includes("V"+release),"launcher title/version mismatch");
assert(html["index.html"].includes("<title>Imposter Games · "+launcherBuild+"</title>"),"launcher build label mismatch");
assert(html["index.html"].includes("Gilt für alle Spiele"),"launcher settings still use outdated game-count wording");
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
assert(html["index.html"].includes("launcher-dev.js?v="+release),"launcher DEV JS version mismatch");
assert(html["index.html"].includes("pwa.js?v="+release),"launcher pwa version mismatch");
assert(html["index.html"].indexOf("app-state.js?v="+release)<html["index.html"].indexOf("pwa.js?v="+release)&&html["index.html"].indexOf("pwa.js?v="+release)<html["index.html"].indexOf("launcher.js?v="+release),"launcher app UI load order mismatch");
for(const file of htmlFiles)assert(html[file].includes("app-ui.css?v="+release),file+" shared app UI stylesheet missing");
for(const file of ["games/circa-imposter/index.html","games/classic-imposter/index.html"]){
  assert(html[file].includes("app-state.js?v="+release),file+" app-state version mismatch");
  assert(html[file].indexOf("app-state.js?v="+release)<html[file].indexOf("pwa.js?v="+release)&&html[file].indexOf("pwa.js?v="+release)<html[file].indexOf("game-engine.js?v="+release),file+" app UI load order mismatch");
}
assert(html["games/who-am-i/index.html"].includes("V"+release),"WhoAmI title/version mismatch");
assert(html["games/who-am-i/index.html"].includes("game.css?v="+release),"WhoAmI game.css version mismatch");
assert(html["games/who-am-i/index.html"].includes("who-am-i.css?v="+release),"WhoAmI CSS version mismatch");
assert(html["games/who-am-i/index.html"].includes("app-state.js?v="+release),"WhoAmI app-state version mismatch");
assert(html["games/who-am-i/index.html"].includes("who-am-i.js?v="+release),"WhoAmI JS version mismatch");
assert(html["games/who-am-i/index.html"].includes("pwa.js?v="+release),"WhoAmI pwa version mismatch");
assert(html["games/who-am-i/index.html"].indexOf("app-state.js?v="+release)<html["games/who-am-i/index.html"].indexOf("pwa.js?v="+release)&&html["games/who-am-i/index.html"].indexOf("pwa.js?v="+release)<html["games/who-am-i/index.html"].indexOf("who-am-i.js?v="+release),"WhoAmI app UI load order mismatch");
assert(html["games/charades/index.html"].includes("V"+release),"Scharade title/version mismatch");
assert(html["games/charades/index.html"].includes("game.css?v="+release),"Scharade game.css version mismatch");
assert(html["games/charades/index.html"].includes("charades.css?v="+release),"Scharade CSS version mismatch");
assert(html["games/charades/index.html"].includes("app-state.js?v="+release),"Scharade app-state version mismatch");
assert(html["games/charades/index.html"].includes("charades.js?v="+release),"Scharade JS version mismatch");
assert(html["games/charades/index.html"].includes("pwa.js?v="+release),"Scharade pwa version mismatch");
assert(html["games/charades/index.html"].indexOf("app-state.js?v="+release)<html["games/charades/index.html"].indexOf("pwa.js?v="+release)&&html["games/charades/index.html"].indexOf("pwa.js?v="+release)<html["games/charades/index.html"].indexOf("charades.js?v="+release),"Scharade app UI load order mismatch");
assert(html["games/personal-impostor/index.html"].includes("V"+release),"Personal title/version mismatch");
assert(html["games/personal-impostor/index.html"].includes("game.css?v="+release),"Personal game.css version mismatch");
assert(html["games/personal-impostor/index.html"].includes("personal-impostor.css?v="+release),"Personal CSS version mismatch");
assert(html["games/personal-impostor/index.html"].includes("app-state.js?v="+release),"Personal app-state version mismatch");
assert(html["games/personal-impostor/index.html"].includes("personal-impostor.js?v="+release),"Personal JS version mismatch");
assert(html["games/personal-impostor/index.html"].includes("pwa.js?v="+release),"Personal pwa version mismatch");
assert(html["games/personal-impostor/index.html"].indexOf("app-state.js?v="+release)<html["games/personal-impostor/index.html"].indexOf("pwa.js?v="+release)&&html["games/personal-impostor/index.html"].indexOf("pwa.js?v="+release)<html["games/personal-impostor/index.html"].indexOf("personal-impostor.js?v="+release),"Personal app UI load order mismatch");

const sw=read("service-worker.js");
const swRelease=(sw.match(/const RELEASE="([^"]+)"/)||[])[1];
assert(swRelease===release,"service worker RELEASE mismatch");
assert((sw.match(/self\.skipWaiting\(\)/g)||[]).length===1,"service worker explicit update activation mismatch");
assert(sw.includes('event.data&&event.data.type==="SKIP_WAITING"'),"service worker update activation must require explicit message");
assert(!sw.includes("localStorage"),"service worker must not touch localStorage");
assert(sw.includes("caches.delete(CACHE_NAME)"),"failed install cache cleanup missing");
assert(sw.includes('versioned("/assets/js/app-state.js")'),"service worker app-state cache missing");
assert(sw.includes('versioned("/assets/css/app-ui.css")'),"service worker shared app UI cache missing");

const circaForbidden=["classicRole","classicDiscussion","classicResult","classicOptions","classicTimerSelect"];
const classicForbidden=["stats","difficultyControl","question","normalReveal","answers","result","openStats","scrubber"];
for(const id of circaForbidden)assert(!html["games/circa-imposter/index.html"].includes('id="'+id+'"'),"Circa contains Classic DOM: "+id);
for(const id of classicForbidden)assert(!html["games/classic-imposter/index.html"].includes('id="'+id+'"'),"Classic contains Circa DOM: "+id);

assert(Number(questions.count)===questions.items.length,"Circa count mismatch");
const qids=questions.items.map(x=>x.qid);
assert(new Set(qids).size===qids.length,"duplicate Circa qid");
assert(new Set(questions.items.map(x=>x.cat)).size===10,"Circa category count mismatch");
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
  assert(normalizeContentText(item.normal)!==normalizeContentText(item.imp),"identical Circa questions "+item.qid);
}
for(const [cat,counts] of Object.entries(difficultyCoverage)){
  for(const level of ["leicht","mittel","schwer"])assert(counts[level]>0,"no "+level+" Circa questions in "+cat);
}
assertUniqueNormalized(questions.items,item=>item.normal,"Circa normal questions");
assertUniqueNormalized(questions.items,item=>item.imp,"Circa impostor questions");

assert(Number(words.count)===words.items.length,"Classic count mismatch");
const wids=words.items.map(x=>x.wid);
assert(new Set(wids).size===wids.length,"duplicate Classic wid");
assert(new Set(words.items.map(x=>x.cat)).size===10,"Classic category count mismatch");
for(const item of words.items)assert(item.wid&&item.cat&&item.word&&item.hint,"malformed Classic item "+item.wid);
const wordNames=words.items.map(x=>String(x.word).toLocaleLowerCase("de-DE"));
const hints=words.items.map(x=>String(x.hint).toLocaleLowerCase("de-DE"));
assert(new Set(wordNames).size===wordNames.length,"duplicate Classic word");
assert(new Set(hints).size===hints.length,"duplicate Classic hint");
assertUniqueNormalized(words.items,item=>item.word,"Classic words");
assertUniqueNormalized(words.items,item=>item.hint,"Classic hints");
for(const item of words.items){
  const word=normalizeContentText(item.word),hint=normalizeContentText(item.hint);
  assert(hint&&hint!==word,"Classic hint equals answer "+item.wid);
  assert(word.length<3||!(" "+hint+" ").includes(" "+word+" "),"Classic hint reveals answer "+item.wid);
}

assert(Number(who.count)===who.items.length,"WhoAmI count mismatch");
assert(who.items.length===275,"WhoAmI production term count mismatch");
const whoIds=who.items.map(x=>String(x.id));
const whoTerms=who.items.map(x=>String(x.term).toLocaleLowerCase("de-DE"));
assert(new Set(whoIds).size===whoIds.length,"duplicate WhoAmI id");
assert(new Set(whoTerms).size===whoTerms.length,"duplicate WhoAmI term");
assertUniqueNormalized(who.items,item=>item.term,"WhoAmI terms");
assert(Array.isArray(who.categories)&&who.categories.length===11,"WhoAmI category count mismatch");
const whoCategoryNames=new Set(who.categories.map(category=>category.name));
for(const item of who.items)assert(whoCategoryNames.has(item.cat),"unknown WhoAmI category: "+item.cat);
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
assertUniqueNormalized(charades.items,item=>item.term,"Scharade terms");
assert(charades.items.every(item=>String(item.term).trim().split(/\s+/).length<=3),"Scharade terms must stay compact concepts, not sentence-like phrases");
const charadesActionTerms=charades.items.filter(item=>item.cat==="Aktionen & Situationen");
assert(charadesActionTerms.length===25,"Scharade action category count mismatch");
assert(charadesActionTerms.every(item=>String(item.term).trim().split(/\s+/).length===1),"Scharade actions must be single terms");
assert(Array.isArray(charades.categories)&&charades.categories.length===12,"Scharade category count mismatch");
const charadesCategoryNames=new Set(charades.categories.map(category=>category.name));
for(const item of charades.items)assert(charadesCategoryNames.has(item.cat),"unknown Scharade category: "+item.cat);
for(const category of charades.categories){
  const actual=charades.items.filter(item=>item.cat===category.name).length;
  assert(actual===Number(category.count),"Scharade category metadata mismatch: "+category.name);
}

assert(Number(personal.count)===personal.items.length,"Personal count mismatch");
assert(personal.items.length===100,"Personal production pair count mismatch");
const personalIds=personal.items.map(x=>String(x.id));
assert(new Set(personalIds).size===personalIds.length,"duplicate Personal id");
assertUniqueNormalized(personal.items,item=>item.normal,"Personal normal questions");
assertUniqueNormalized(personal.items,item=>item.impostor,"Personal impostor questions");
for(const item of personal.items){
  assert(item.id&&item.normal&&item.impostor&&item.answerType,"malformed Personal item "+item.id);
  assert(normalizeContentText(item.normal)!==normalizeContentText(item.impostor),"identical Personal questions "+item.id);
  assert(["integer","number","rating","percent","time","text"].includes(item.answerType),"invalid Personal answer type "+item.id);
  if(item.answerType==="rating")assert(Number(item.min)===1&&Number(item.max)===10,"invalid Personal rating range "+item.id);
  if(item.answerType==="percent")assert(Number(item.min)===0&&Number(item.max)===100,"invalid Personal percent range "+item.id);
}
const retiredVsFirstCar=personal.items.find(item=>item.id==="personal-0008");
assert(retiredVsFirstCar&&retiredVsFirstCar.impostor.includes("finanziell unabhängig"),"Personal age pair 0008 balance regression");
const dinnerTimePair=personal.items.find(item=>item.id==="personal-0067");
assert(dinnerTimePair&&dinnerTimePair.impostor.includes("Abend mit Freunden"),"Personal time pair 0067 balance regression");
const trustPair=personal.items.find(item=>item.id==="personal-0085");
assert(trustPair&&trustPair.impostor.includes("neue Menschen"),"Personal rating pair 0085 balance regression");

assert(manifest.start_url==="/"&&manifest.scope==="/","manifest root scope/start mismatch");
assert(manifest.display==="standalone","manifest display must be standalone");
assert(manifest.description.includes("Wer bin ich?")&&manifest.description.includes("Scharade")&&manifest.description.includes("Persönlicher Impostor"),"manifest description must describe the five-game launcher");

const readme=read("README.md");
assert(!readme.includes("\\n"),"README contains literal \\n text");
assert(["Circa Imposter","Klassisches Imposter","Wer bin ich?","Scharade","Persönlicher Impostor"].every(name=>readme.includes(name)),"README must describe the five-game app");
const changelog=read("CHANGELOG.md");
assert(changelog.includes("V74R23")&&changelog.includes("Offline-Cache **r23**"),"V74R23 changelog entry missing");

const appStateSource=read("assets/js/app-state.js");
const launcherSource=read("assets/js/launcher.js");
const launcherDevSource=read("assets/js/launcher-dev.js");
const pwaSource=read("assets/js/pwa.js");
const launcherCss=read("assets/css/launcher.css");
const appUiCss=read("assets/css/app-ui.css");
const gameCss=read("assets/css/game.css");
const engineSource=read("assets/js/game-engine.js");
const whoSource=read("assets/js/who-am-i.js");
const whoCss=read("assets/css/who-am-i.css");
const charadesSource=read("assets/js/charades.js");
const charadesCss=read("assets/css/charades.css");
const personalSource=read("assets/js/personal-impostor.js");
const personalCss=read("assets/css/personal-impostor.css");
const integrityTestSource=read("scripts/test-progress-integrity.mjs");
for(const [name,source] of [["app-state",appStateSource],["launcher",launcherSource],["launcher-dev",launcherDevSource],["pwa",pwaSource],["game-engine",engineSource],["who-am-i",whoSource],["charades",charadesSource],["personal-impostor",personalSource]]){
  try{new Function(source);}catch(error){fail(name+" syntax error: "+error.message);}
}
assert(appStateSource.includes('var KEY="imposterGames.appState.v1"'),"production app-state key missing");
assert(appStateSource.includes('BACKUP_FORMAT="imposter-games-backup"'),"production backup format missing");
assert(engineSource.includes('EXP_STORAGE="imposterGames.v74.game."'),"V74 isolated game storage missing");
assert(!appStateSource.includes("imposterGames.prototype."),"production app-state must not reference prototype storage");
assert(!engineSource.includes("imposterGames.prototype."),"production game engine must not reference prototype storage");
assert(whoSource.includes('STORAGE_PREFIX="imposterGames.v74.game.whoami."'),"WhoAmI production storage namespace missing");
assert(!whoSource.includes("imposterGames.prototype."),"production WhoAmI must not reference prototype storage");
assert(appStateSource.includes('"whoami.players.v1","whoami.categories.v1","whoami.deck.v1"'),"WhoAmI backup allowlist missing");
assert(charadesSource.includes('PREFIX="imposterGames.v74.game.charades."'),"Scharade production storage namespace missing");
assert(!charadesSource.includes("imposterGames.prototype."),"production Scharade must not reference prototype storage");
assert(appStateSource.includes('"charades.players.v1","charades.categories.v1","charades.deck.v1","charades.timer.v1","charades.motionFlip.v2"'),"Scharade backup allowlist missing");
assert(personalSource.includes('PREFIX="imposterGames.v74.game.personal."'),"Personal production storage namespace missing");
assert(!personalSource.includes("imposterGames.prototype."),"production Personal must not reference prototype storage");
assert(appStateSource.includes('"personal.players.v1","personal.deck.v1"'),"Personal backup allowlist missing");
assert(personalSource.includes("window.visualViewport"),"R23 Personal visualViewport recovery missing");
assert(personalSource.includes('window.visualViewport.addEventListener("resize",syncPersonalViewportHeight'),"R23 Personal visualViewport resize hook missing");
assert(personalSource.includes('document.addEventListener("focusout"'),"R23 Personal keyboard focusout recovery missing");
assert(personalSource.includes("[80,180,320,520,760]"),"R23 Personal staged viewport settle timings missing");
assert(personalSource.includes('document.documentElement.style.setProperty("--personal-viewport-height"'),"R23 Personal viewport CSS variable sync missing");
assert(personalCss.includes('body[data-game="personal-impostor"].game-active .app')&&personalCss.includes('height:var(--personal-viewport-height,100dvh)!important'),"R23 Personal viewport-height CSS binding missing");
assert(appStateSource.includes('PREVIOUS_GAME_STORAGE_PREFIX="imposterGames.v73.game."'),"V73 to V74 game-storage migration missing");
assert(charadesSource.includes('window.addEventListener("devicemotion",onDeviceMotion,true)'),"Scharade DeviceMotion listener missing");
assert(charadesSource.includes("latestGravityZ-baseGravityZ"),"Scharade signed gravity direction missing");
assert(charadesSource.includes("ACTION_COOLDOWN_MS=3000"),"Scharade 3-second action cooldown missing");
assert(charadesSource.includes("GRAVITY_CORRECT_TRIGGER=7.0")&&charadesSource.includes("GRAVITY_SKIP_TRIGGER=5.0"),"Scharade bidirectional thresholds missing");
assert(!sw.includes("/experiments/prototype"),"production service worker must not cache prototype paths");
const prototypeAppStateSource=read("experiments/prototype/assets/js/app-state.js");
const prototypeEngineSource=read("experiments/prototype/assets/js/game-engine.js");
const prototypeWhoSource=read("experiments/prototype/assets/js/who-am-i.js");
const prototypeCharadesSource=read("experiments/prototype/assets/js/charades.js");
const prototypePersonalSource=read("experiments/prototype/assets/js/personal-impostor.js");
assert(prototypeAppStateSource.includes('var KEY="imposterGames.prototype.appState.v1"'),"prototype app-state key lost isolation");
assert(prototypeAppStateSource.includes('BACKUP_FORMAT="imposter-games-prototype-backup"'),"prototype backup format lost isolation");
assert(prototypeEngineSource.includes('EXP_STORAGE="imposterGames.prototype.game."'),"prototype game storage lost isolation");
assert(!prototypeAppStateSource.includes('var KEY="imposterGames.appState.v1"'),"prototype must not use production app-state key");
assert(!prototypeEngineSource.includes('EXP_STORAGE="imposterGames.v74.game."'),"prototype must not use production game storage");
assert(prototypeWhoSource.includes('STORAGE_PREFIX="imposterGames.prototype.game.whoami."'),"prototype WhoAmI namespace lost isolation");
assert(!prototypeWhoSource.includes('STORAGE_PREFIX="imposterGames.v74.game.whoami."'),"prototype WhoAmI must not use production storage");
assert(prototypeCharadesSource.includes('PREFIX="imposterGames.prototype.game.charades."'),"prototype Scharade namespace lost isolation");
assert(!prototypeCharadesSource.includes('PREFIX="imposterGames.v74.game.charades."'),"prototype Scharade must not use production storage");
assert(prototypePersonalSource.includes('PREFIX="imposterGames.prototype.game.personal."'),"prototype Personal namespace lost isolation");
assert(!prototypePersonalSource.includes('PREFIX="imposterGames.v74.game.personal."'),"prototype Personal must not use production storage");
assert(!prototypeAppStateSource.includes("circaImpostor.")&&!prototypeAppStateSource.includes("classicImpostor."),"prototype app-state must not contain production legacy storage reads");
assert(!prototypeEngineSource.includes("circaImpostor.")&&!prototypeEngineSource.includes("classicImpostor."),"prototype game engine must not contain production legacy storage reads");
const prototypePwaSource=read("experiments/prototype/assets/js/pwa.js");
const prototypeSwSource=read("experiments/prototype/service-worker.js");
assert(prototypePwaSource.includes('/experiments/prototype/service-worker.js')&&prototypePwaSource.includes('scope:"/experiments/prototype/"'),"prototype PWA registration lost isolated scope");
assert(prototypeSwSource.includes('const BASE="/experiments/prototype"')&&prototypeSwSource.includes('CACHE_PREFIX="imposter-games-prototype-"'),"prototype service worker lost isolated base/cache namespace");
const expectedPrototypePwa=read("assets/js/pwa.js")
  .replaceAll('navigator.serviceWorker.register("/service-worker.js",{scope:"/",updateViaCache:"none"})','navigator.serviceWorker.register("/experiments/prototype/service-worker.js",{scope:"/experiments/prototype/",updateViaCache:"none"})')
  .replaceAll('navigator.serviceWorker.register("/service-worker.js",{scope:"/"})','navigator.serviceWorker.register("/experiments/prototype/service-worker.js",{scope:"/experiments/prototype/"})');
assert(prototypePwaSource===expectedPrototypePwa,"prototype PWA logic drifted from production beyond isolated scope");
assert(prototypeWhoSource===read("assets/js/who-am-i.js").replace('STORAGE_PREFIX="imposterGames.v74.game.whoami."','STORAGE_PREFIX="imposterGames.prototype.game.whoami."'),"prototype WhoAmI logic drifted from production beyond storage namespace");
assert(prototypeCharadesSource===read("assets/js/charades.js").replace('PREFIX="imposterGames.v74.game.charades."','PREFIX="imposterGames.prototype.game.charades."'),"prototype Scharade logic drifted from production beyond storage namespace");
assert(prototypePersonalSource===read("assets/js/personal-impostor.js").replace('PREFIX="imposterGames.v74.game.personal."','PREFIX="imposterGames.prototype.game.personal."'),"prototype Personal logic drifted from production beyond storage namespace");

const prototypeMirrorPairs=[
  ["experiments/prototype/index.html","index.html"],
  ["experiments/prototype/assets/css/launcher.css","assets/css/launcher.css"],
  ["experiments/prototype/assets/css/app-ui.css","assets/css/app-ui.css"],
  ["experiments/prototype/assets/css/game.css","assets/css/game.css"],
  ["experiments/prototype/assets/css/charades.css","assets/css/charades.css"],
  ["experiments/prototype/assets/css/who-am-i.css","assets/css/who-am-i.css"],
  ["experiments/prototype/assets/css/personal-impostor.css","assets/css/personal-impostor.css"],
  ["experiments/prototype/assets/js/launcher.js","assets/js/launcher.js"],
  ["experiments/prototype/assets/js/launcher-dev.js","assets/js/launcher-dev.js"],
  ["experiments/prototype/games/circa-imposter/index.html","games/circa-imposter/index.html"],
  ["experiments/prototype/games/classic-imposter/index.html","games/classic-imposter/index.html"],
  ["experiments/prototype/games/who-am-i/index.html","games/who-am-i/index.html"],
  ["experiments/prototype/games/charades/index.html","games/charades/index.html"],
  ["experiments/prototype/games/personal-impostor/index.html","games/personal-impostor/index.html"],
  ["experiments/prototype/data/games.json","data/games.json"],
  ["experiments/prototype/data/circa-questions.json","data/circa-questions.json"],
  ["experiments/prototype/data/classic-words.json","data/classic-words.json"],
  ["experiments/prototype/data/who-am-i.json","data/who-am-i.json"],
  ["experiments/prototype/data/charades.json","data/charades.json"],
  ["experiments/prototype/data/personal-impostor.json","data/personal-impostor.json"]
];
for(const [prototypeFile,productionFile] of prototypeMirrorPairs){
  assert(read(prototypeFile)===read(productionFile),"prototype baseline drift: "+prototypeFile+" differs from "+productionFile);
}
for(const obsoletePrototypeFile of [
  "experiments/prototype/assets/css/party-makeover.css",
  "experiments/prototype/assets/css/party-launcher-p3.css",
  "experiments/prototype/assets/js/party-makeover.js",
  "experiments/prototype/assets/js/party-launcher-p3.js"
]){
  assert(!fs.existsSync(path.join(root,obsoletePrototypeFile)),"obsolete prototype makeover asset still present: "+obsoletePrototypeFile);
}
assert(prototypeSwSource.includes('CACHE_REVISION="r23-baseline"'),"prototype baseline cache revision missing");
assert(!prototypeSwSource.includes("party-makeover")&&!prototypeSwSource.includes("party-launcher-p3"),"prototype service worker still caches discarded makeover assets");
const prototypeManifest=JSON.parse(read("experiments/prototype/manifest.webmanifest"));
assert(prototypeManifest.start_url==="/experiments/prototype/"&&prototypeManifest.scope==="/experiments/prototype/","prototype manifest lost isolated scope");
assert(!html["index.html"].includes("APP-SHELL TEST"),"production launcher still contains experiment badge");
assert(launcherCss.includes("padding:calc(18px + var(--safeTop)) 16px 26px"),"launcher safe-area top padding missing");
assert(html["index.html"].includes('id="heroGoal"')&&html["index.html"].includes('id="surpriseGame"'),"R13 motivational launcher surfaces missing");
assert(launcherSource.includes("function renderMotivationHero()")&&launcherSource.includes("function renderGameCards()"),"R13 contextual launcher logic missing");
assert(launcherCss.includes("V74R13 motivational design pass")&&launcherCss.includes(".gameCard.chosenPulse"),"R13 launcher design layer missing");
assert(gameCss.includes("V74R13 game feel")&&gameCss.includes('body[data-game="classic"] .classicRoleCard.isImpostor'),"R13 shared game feel missing");
assert(engineSource.includes('card.classList.toggle("isImpostor",isImp)'),"R13 Classic role styling state missing");
assert(html["games/charades/index.html"].includes('id="charadesTimeRail"'),"R13 Scharade time rail markup missing");
assert(charadesSource.includes('byId("charadesTimeFill")')&&charadesCss.includes(".charadesTimeRail.critical"),"R13 Scharade time rail behavior missing");
assert(html["games/personal-impostor/index.html"].includes('id="questionReveal"')&&html["games/personal-impostor/index.html"].includes('id="revealSharedQuestion"'),"R14 Personal shared-question reveal markup missing");
assert(personalSource.includes('else showSharedQuestionReveal();')&&personalSource.includes("function toggleSharedQuestionReveal()"),"R14 Personal flow must reveal the shared question before answers");
assert(personalSource.includes('byId("answersSharedQuestion").textContent=currentPair.normal'),"R14 Personal answers must retain the shared question");
assert(html["games/personal-impostor/index.html"].includes("Anders, aber vergleichbar"),"R16 Personal balancing copy missing");
assert(!html["games/personal-impostor/index.html"].includes("Absichtlich weit auseinander"),"R16 obsolete Personal distance copy still present");
assert(personalCss.includes(".personalQuestionRevealScreen:not(.hidden){display:flex}")&&!personalCss.includes(".personalBottomButton{")&&!personalCss.includes(".personalResultActions{")&&!personalCss.includes(".personalEdgeAction{")&&!personalCss.includes(".personalEdgeActions{")&&!html["games/personal-impostor/index.html"].includes("personalEdgeAction"),"R21 Personal must not override shared Circa action geometry");
assert(html["games/personal-impostor/index.html"].includes('id="saveAnswer" type="button" class="full confirmButton"'),"R21 Personal save action must use Circa confirmButton without dead marker classes");
assert(html["games/personal-impostor/index.html"].includes('id="revealSharedQuestion" type="button" class="full stageButton"')&&html["games/personal-impostor/index.html"].includes('id="reveal" type="button" class="full stageButton"'),"R21 Personal reveal actions must use Circa stageButton without dead marker classes");
assert(html["games/personal-impostor/index.html"].includes('id="resultActions" class="grid2 resultActions"'),"R21 Personal result actions must share Circa resultActions DOM contract");
assert(gameCss.includes("#questionReveal .stageButton"),"R21 Personal shared-question action must use exact shared stage geometry");
assert(!gameCss.includes(".resultActions{\n  margin-top:7px!important;"),"R21 obsolete resultActions margin override remains");
assert(!personalCss.includes("prototype-only"),"R21 production Personal CSS still carries prototype-only label");
assert(personalSource.includes("function resetPersonalViewport(delayed)")&&personalSource.includes("window.scrollTo(0,0)")&&personalSource.includes("document.documentElement.scrollTop=0;document.body.scrollTop=0"),"R20 Personal viewport reset missing");
assert(personalSource.includes("function dismissAnswerKeyboard()")&&personalSource.includes("dismissAnswerKeyboard();sound(\"save\")"),"R20 Personal keyboard dismissal before screen change missing");
assert(personalSource.includes('resetPersonalViewport(id!=="question");'),"R20 Personal screen changes must restore viewport baseline");
assert(engineSource.includes("experimentStartPending=false,experimentRoundStartPending=false")&&engineSource.includes("if(experimentStartPending)return;")&&engineSource.includes("if(experimentRoundStartPending)return;"),"R21 Circa/Classic duplicate-start guards missing");
assert(whoSource.includes("roundStartPending=false")&&whoSource.includes("if(roundStartPending)return;roundStartPending=true;try{"),"R21 WhoAmI duplicate-start guard missing");
assert(charadesSource.includes("roundStartPending=false")&&charadesSource.includes("if(roundStartPending)return;roundStartPending=true;try{"),"R21 Scharade duplicate-start guard missing");
assert(personalSource.includes("roundStartPending=false")&&personalSource.includes("if(roundStartPending)return;roundStartPending=true;try{"),"R21 Personal duplicate-start guard missing");
assert(read("data/games.json").includes("andere, aber vergleichbare Frage"),"R21 Personal launcher wording mismatch");
assert(read("README.md").includes("andere, aber vergleichbare Frage"),"R21 README Personal wording mismatch");
assert(read(".github/workflows/validate.yml").includes("node scripts/audit-full.mjs"),"R21 full audit is not wired into release validation");
assert(gameCss.includes(".gameScreen:not(.hidden){flex:1 1 0;height:0;min-height:0}")&&gameCss.includes(".confirmButton,.stageButton,.classicRoleButton,.classicResultActions,.resultActions{margin-top:auto!important}"),"R14 shared bottom-action anchoring missing");
assert(whoCss.includes(".whoViewerScreen .whoBottomButton{margin-top:auto}"),"R14 WhoAmI bottom action anchoring missing");
assert(!html["index.html"].includes("--profile-progress:0deg"),"R15 launcher avatar must not carry inline progress paint");
assert(!launcherSource.includes('byId("headerAvatar").style.setProperty("--profile-progress"'),"R15 launcher must not repaint the header avatar with XP progress");
assert(!launcherCss.includes("conic-gradient(var(--accent) var(--profile-progress")&&launcherCss.includes("background:#37383d;")&&launcherCss.includes("margin-bottom:10px"),"R15 launcher avatar/hero spacing fix missing");
assert(sw.includes('const CACHE_REVISION="r22"'),"V74 cache revision mismatch");
assert(sw.includes('versioned("/assets/js/launcher-dev.js")'),"service worker launcher DEV cache missing");
assert(appStateSource.includes("var BACKUP_VERSION=3"),"backup format v3 missing");
assert(appStateSource.includes('INTEGRITY_DB_NAME="imposterGames.progressIntegrity.v1"'),"R17 progress-integrity IndexedDB namespace missing");
assert(appStateSource.includes('generateKey({name:"HMAC",hash:"SHA-256",length:256},false,["sign","verify"])'),"R17 non-exportable HMAC key generation missing");
assert(appStateSource.includes("function integrityRepairInitialProgressState("),"R17 first-run plausibility repair missing");
assert(appStateSource.includes("function validateBackupPlausibility(")&&appStateSource.includes("function validateBackupCategoryProgress("),"R22 strict backup plausibility validator missing");
assert(appStateSource.includes("var plausibility=validateBackupPlausibility(imported,src);")&&appStateSource.includes("if(!plausibility.ok)return plausibility;"),"R22 backup must be rejected before replacing app state");
assert(!appStateSource.includes("data=imported;\n  integrityRepairInitialProgressState(data);"),"R22 backup import must not silently repair imported progress");
assert(launcherSource.includes("Die Fortschrittsdaten sind widersprüchlich. Dein aktueller Spielstand wurde nicht verändert.")&&launcherSource.includes("Die Kategorie-Freischaltungen passen nicht zum gespeicherten Fortschritt."),"R22 backup rejection UX missing");
assert(integrityTestSource.includes("re-hashed impossible total-round backup")&&integrityTestSource.includes("impossible Popkultur challenge unlock")&&integrityTestSource.includes("impossible Technik challenge unlock")&&integrityTestSource.includes("impossible Spicy challenge unlock")&&integrityTestSource.includes("unearned category ticket unlock"),"R22 strict backup regression scenarios missing");
assert(appStateSource.includes("function validateProgressIntegrity("),"R17 progress integrity validator missing");
assert(appStateSource.includes("pre-r17-recovery"),"R17 pre-migration recovery snapshot missing");
assert(appStateSource.includes("checkpoint-missing"),"R17 missing-checkpoint guard missing");
assert(appStateSource.includes("queueProgressIntegritySeal();"),"R17 legitimate progress reseal missing");
assert(engineSource.includes("await experimentValidateProgressBeforeRound()"),"R17 Circa/Classic round gate missing");
assert(whoSource.includes("await validateProgressBeforeRound()"),"R17 WhoAmI round gate missing");
assert(charadesSource.includes("await validateProgressBeforeRound()"),"R17 Scharade round gate missing");
assert(personalSource.includes("await validateProgressBeforeRound()"),"R17 Personal round gate missing");
assert(engineSource.includes("selectedCategories=experimentFilterCategories(selectedCategories);"),"R17 Circa/Classic category re-filter after integrity check missing");
assert(whoSource.includes("selectedCategories=filterCategories(selectedCategories);"),"R17 WhoAmI category re-filter after integrity check missing");
assert(charadesSource.includes("selectedCategories=filterCategories(selectedCategories);"),"R17 Scharade category re-filter after integrity check missing");
assert(appStateSource.includes("progressIntegrityV1InitializedAt"),"R17 secondary initialized-state marker missing");
assert(integrityTestSource.includes("51 legitimate rounds were not retained")&&integrityTestSource.includes("fake Tech unlock was not removed")&&integrityTestSource.includes("fake session round survived repair"),"R17 integrity regression scenarios missing");
assert(engineSource.includes("experimentRecordCirca(null);"),"Circa shared base-round recording missing");
assert(engineSource.includes("impostorEscaped:outcome===true?true:outcome===false?false:null"),"Circa unresolved outcome state missing");
assert((engineSource.match(/experimentGameRunId="run_"/g)||[]).length>=2,"new game run IDs are not regenerated per party");
assert(engineSource.includes("function experimentActiveProfile"),"active-profile identity guard missing");
assert(engineSource.includes('setPreference("sound",soundEnabled)'),"in-game sound preference persistence missing");
assert(engineSource.includes("function motionEnabled()"),"game animation preference helper missing");
assert(gameCss.includes(".experimentReduceMotion *"),"game reduced-motion CSS missing");
assert(gameCss.includes("body.booting .app{visibility:hidden}"),"game boot state must hide uninitialized UI");
assert(html["games/personal-impostor/index.html"].includes("100 Fragepaare"),"Personal static question count mismatch");
assert(!html["games/personal-impostor/index.html"].includes("89 Fragepaare"),"Personal stale question count remains");
assert(html["index.html"].includes("IMPOSTOR · GESAMT"),"launcher Impostor aggregate label mismatch");
assert(html["index.html"].includes("DAVON · PERSÖNLICH"),"launcher Personal Impostor label mismatch");
assert(html["index.html"].includes("Profile, Presets, Sessions, Crews, Statistik, Spielzeit"),"launcher backup/reset copy missing profile/crew data scope");
assert(html["index.html"].includes('id="launcherDevTrigger"'),"launcher DEV trigger missing");
assert(html["index.html"].includes('id="launcherDevPanelOverlay"'),"launcher DEV panel missing");
assert(launcherCss.includes(".launcherDevOverlay")&&launcherCss.includes(".launcherDevAchievements"),"launcher DEV styles missing");
assert(launcherSource.includes("function launcherSoundEnabled()"),"launcher sound preference guard missing");
assert(launcherSource.includes("function uiSound(kind)"),"launcher UI sound generator missing");
assert(launcherSource.includes("function navigateWithSound(href)"),"launcher start-sound navigation missing");
assert(launcherSource.includes("store.getPreferences().sound!==false"),"launcher sound is not tied to global preference");
assert(launcherSource.includes("function renderUsageStats()"),"launcher playtime statistics missing");
assert(launcherSource.includes("function achievementRequiredAmount(id)"),"achievement requirement sorter missing");
assert(launcherSource.includes("function sortAchievementsByRequirement(items)"),"achievement sorting helper missing");
assert(launcherSource.includes("achievementData=sortAchievementsByRequirement(achievementData);"),"achievement list is not sorted by requirement");
assert(appStateSource.includes("function trackUsage(game)"),"foreground playtime tracking missing");
assert(appStateSource.includes("function getUsageStats()"),"playtime stats API missing");
assert(appStateSource.includes('DEV_STORAGE_KEY="imposterGames.devState.v1"'),"launcher DEV state namespace missing");
assert(appStateSource.includes("function devPatchStats(")&&appStateSource.includes("function devReplaceStats("),"launcher DEV statistics APIs missing");
assert(appStateSource.includes("function devSetUsage("),"launcher DEV usage API missing");
assert(appStateSource.includes("function devSetAchievementOverride("),"launcher DEV achievement API missing");
assert(appStateSource.includes("function devSetCategoryPackOverride(")&&appStateSource.includes("function devClearCategoryPackOverrides("),"launcher DEV category progression APIs missing");
assert(html["index.html"].includes('id="launcherDevCategoryPacks"'),"launcher DEV category progression panel missing");
assert(launcherDevSource.includes("function renderCategoryPacks()")&&launcherDevSource.includes("store.devSetCategoryPackOverride"),"launcher DEV category progression controls missing");
assert(appStateSource.includes("function devClearSessions("),"launcher DEV session API missing");
assert(launcherDevSource.includes('var SESSION_KEY="ci.diag.session.v1"'),"launcher DEV session unlock key mismatch");
assert(launcherDevSource.includes('salt:b64Bytes("2vIOc2m/dMogebMxv2A8YA==")'),"launcher DEV PIN salt mismatch");
assert(launcherDevSource.includes('b64Bytes("YkZr4kQ14jp6eIv00xAYKCr265VTIWWuWiQCWQtN2B0=")'),"launcher DEV PIN hash mismatch");
assert(launcherDevSource.includes("tapTimes.length>=7"),"launcher DEV seven-tap trigger missing");
assert(launcherDevSource.includes("store.devSetAchievementOverride"),"launcher DEV achievement controls missing");
assert(launcherDevSource.includes("store.devReplaceStats"),"launcher DEV raw statistics editor missing");
assert(launcherDevSource.includes("fillContentProgress"),"launcher DEV content progress tool missing");
assert(launcherSource.includes("window.CILauncherRefresh"),"launcher DEV refresh bridge missing");
assert(html["index.html"].includes('id="sessionMiniBar"'),"launcher persistent session mini bar missing");
assert(launcherSource.includes("function installSheetSwipe()"),"launcher sheet swipe gesture missing");
assert(launcherSource.includes("function shouldDismissSheetSwipe("),"launcher swipe decision helper missing");
{
  const start=launcherSource.indexOf("function shouldDismissSheetSwipe(");
  const end=launcherSource.indexOf("function installSheetSwipe()",start);
  assert(start>=0&&end>start,"launcher swipe helper extraction failed");
  const swipeFn=new Function(launcherSource.slice(start,end)+";return shouldDismissSheetSwipe;")();
  assert(swipeFn(84,900,5)===true,"slow long swipe should dismiss");
  assert(swipeFn(34,55,3)===true,"fast flick should dismiss");
  assert(swipeFn(40,600,2)===false,"short slow swipe should snap back");
  assert(swipeFn(18,20,1)===false,"tiny flick should not dismiss");
  assert(swipeFn(60,80,80)===false,"horizontal swipe should not dismiss");
  assert(swipeFn(-100,100,0)===false,"upward swipe should not dismiss");
}
assert(launcherSource.includes('sheet.addEventListener("pointerdown",begin)'),"sheet/header swipe binding missing");
assert(launcherSource.includes('target.closest(".sheetHeader")'),"sheet header drag zone missing");
assert(launcherSource.includes('sheet.classList.add("sheetSwipeSnapBack")'),"sheet snap-back state missing");
assert(launcherSource.includes('style.removeProperty("--sheet-backdrop-alpha")'),"sheet backdrop reset missing");
assert(launcherCss.includes(".sheetHandle::after")&&launcherCss.includes("width:72px;height:28px"),"sheet touch target enlargement missing");
assert(launcherCss.includes(".bottomSheet.sheetDragging")&&launcherCss.includes(".bottomSheet.sheetSwipeDismiss"),"sheet drag transition states missing");
assert(launcherSource.includes('sheet.id==="migrationSheet"'),"mandatory migration sheet must not be swipe-dismissable");
assert(launcherSource.includes('sheet.id==="presetPlayersSheet"')&&launcherSource.includes('profileEditorReturnTarget==="preset"'),"nested sheet swipe navigation guards missing");
assert(launcherSource.includes('view.classList.add(motion)'),"launcher directional view transition missing");
assert(launcherSource.includes('byId("sessionMiniBar").addEventListener'),"launcher mini-session action missing");
assert(launcherCss.includes(".sessionMiniBar")&&launcherCss.includes(".view.ciViewForward"),"launcher app-feel styles missing");
assert(appUiCss.includes(".ciPressable.ciPressed")&&appUiCss.includes(".ciToastHost"),"shared touch/toast styles missing");
assert(pwaSource.includes("window.CIAppUI="),"shared app UI runtime missing");
assert(pwaSource.includes("function installInteractionLayer()"),"shared touch interaction layer missing");
assert(pwaSource.includes("function showUpdateReady(worker)"),"in-app update prompt missing");
assert(pwaSource.includes('postMessage({type:"SKIP_WAITING"})'),"in-app update activation message missing");
assert(pwaSource.includes('window.addEventListener("ci:achievement-unlocked"'),"achievement toast listener missing");
assert(pwaSource.includes('var DEV_SESSION_KEY="ci.diag.session.v1"'),"shared DEV preview session key mismatch");
assert(pwaSource.includes("function installDevUiTests()"),"shared DEV preview installer missing");
assert(pwaSource.includes("function installSharedGameDevEntry()"),"shared in-game DEV preview entry missing");
assert(pwaSource.includes("!devSessionUnlocked()"),"shared in-game DEV preview must require existing DEV unlock");
assert(pwaSource.includes('DEV_SESSION_KEY="ci.diag.session.v1"'),"shared in-game DEV preview must use common unlock session");
assert(!pwaSource.includes("recordRound(")&&!pwaSource.includes("devPatchStats(")&&!pwaSource.includes("devSetAchievementOverride("),"shared UI previews must not mutate game/stat state");
for(const file of ["games/circa-imposter/index.html","games/classic-imposter/index.html"]){
  assert(html[file].includes('id="devPanelOverlay"')&&html[file].includes('class="devGrid"'),file+" native DEV panel missing for app-feel injection");
}
for(const file of ["games/who-am-i/index.html","games/charades/index.html","games/personal-impostor/index.html"]){
  assert(html[file].includes('class="toolbarActions"'),file+" toolbar missing for shared DEV test entry");
}
assert(pwaSource.includes("function buildGameDevTestCard()"),"shared in-game DEV preview card missing");
assert(pwaSource.includes('["Achievement anzeigen","achievement"]'),"DEV achievement preview button missing");
assert(pwaSource.includes('["3 Achievements","achievement-stack"]'),"DEV achievement stack preview missing");
assert(pwaSource.includes('["Update-Hinweis","update"]'),"DEV update preview missing");
assert(pwaSource.includes('["Haptik testen","haptic"]'),"DEV haptic preview missing");
assert(pwaSource.includes('["Mini-Session","mini-session"]'),"launcher mini-session DEV preview missing");
assert(pwaSource.includes('closeDevPanelForPreview()'),"DEV visual previews must close overlays before display");
assert(appStateSource.includes('new CustomEvent("ci:achievement-unlocked"'),"achievement unlock event missing");
assert(appStateSource.includes("emitAchievementUnlocks(unlocked)"),"achievement unlock dispatch not wired");
assert(appStateSource.includes("function buildRoundFeedback(")&&appStateSource.includes("function buildSessionFeedback("),"motivational feedback engine missing");
assert(appStateSource.includes('new CustomEvent("ci:motivational-feedback"'),"motivational feedback event missing");
assert(appStateSource.includes("function nearAchievementFeedback("),"near-achievement feedback missing");
assert(appStateSource.includes("function previousCircaBest("),"Circa personal-record feedback missing");
assert(appStateSource.includes('progress:def.progress()'),"achievement unlock payload must include completed progress");
assert(pwaSource.includes("var feedbackQueue=[]")&&pwaSource.includes("function queueFeedback("),"central feedback queue missing");
assert(pwaSource.includes("var feedbackPumpScheduled=false"),"feedback queue batching flag missing");
assert(pwaSource.includes("feedbackQueue.sort(function(a,b){return b.intensity-a.intensity;})"),"feedback queue must prioritize intensity");
assert(pwaSource.includes("setTimeout(function(){feedbackPumpScheduled=false;pumpFeedback();},0)"),"same-tick feedback batching missing");
assert(pwaSource.includes("function feedbackSound(level)"),"tiered feedback sound missing");
assert(pwaSource.includes("function feedbackHero(item)"),"hero feedback presentation missing");
assert(pwaSource.includes('window.addEventListener("ci:motivational-feedback"'),"motivational feedback listener missing");
assert(pwaSource.includes('["Feedback · klein","feedback-1"]')&&pwaSource.includes('["Feedback · mittel","feedback-2"]')&&pwaSource.includes('["Feedback · Hero","feedback-3"]'),"DEV feedback-level previews missing");
assert(pwaSource.includes('["Session-Finale","feedback-session"]'),"DEV session-final feedback preview missing");
assert(appUiCss.includes(".ciToastFeedback1")&&appUiCss.includes(".ciToastFeedback2"),"tiered feedback toast styles missing");
assert(appUiCss.includes(".ciFeedbackHero")&&appUiCss.includes("@keyframes ciFeedbackHeroIn"),"feedback hero animation missing");
assert(appStateSource.includes("function computeCrew(")&&appStateSource.includes("function getCrews()")&&appStateSource.includes("function setCrewChallenge("),"Party-Pass state APIs missing");
assert(appStateSource.includes("function crewLevelInfo(")&&appStateSource.includes("function crewChallengeDefs("),"crew level/challenge model missing");
assert(appStateSource.includes("function buildCrewFeedback("),"crew feedback integration missing");
assert(appStateSource.includes("getCrew:getCrew")&&appStateSource.includes("getCrews:getCrews")&&appStateSource.includes("setCrewChallenge:setCrewChallenge"),"Party-Pass APIs not exported");
assert(appStateSource.includes("crewProgress:normalizeCrewProgress(src.crewProgress)"),"crew progress backup import missing");
assert(html["index.html"].includes('id="crewHomeBlock"')&&html["index.html"].includes('id="crewSheet"')&&html["index.html"].includes('id="crewHistoryList"'),"Party-Pass launcher UI missing");
assert(html["index.html"].includes("Gemeinsamer Fortschritt verfällt nicht"),"non-expiring crew-progress copy missing");
assert(launcherSource.includes("function renderCrewHome()")&&launcherSource.includes("function renderCrewHistory()")&&launcherSource.includes("function openCrewSheet("),"Party-Pass launcher rendering missing");
assert(launcherSource.includes("store.setCrewChallenge"),"crew goal choice interaction missing");
assert(launcherCss.includes(".crewPassCard")&&launcherCss.includes(".crewChallengeChoice")&&launcherCss.includes(".crewMemory"),"Party-Pass visual system missing");
assert(launcherCss.includes("conic-gradient(#ef9f45 var(--crew-progress)"),"crew level progress ring missing");
assert(pwaSource.includes('"crew-level"')&&pwaSource.includes('"crew-challenge"'),"DEV crew feedback previews missing");
assert(appStateSource.includes("function profileXpBreakdown(")&&appStateSource.includes("function profileLevelInfoFromStats("),"profile level model missing");
assert(appStateSource.includes("function levelCurveInfo(")&&appStateSource.includes("var breakdown=profileXpBreakdown(st),base=levelCurveInfo(breakdown.total)"),"profile level curve model missing");
assert(!appStateSource.includes("base=crewLevelInfo(breakdown.total)"),"profile progression must not depend on crew semantics");
assert(appStateSource.includes("rounds:Math.max(0,Number(st.rounds)||0)*2")&&appStateSource.includes("variety:games*8"),"profile XP experience weighting missing");
assert(appStateSource.includes("precision:Math.min(10,Math.max(0,Number(st.perfect)||0))*2")&&appStateSource.includes("escapes:Math.min(10,Math.max(0,Number(st.impostorEscapes)||0))")&&appStateSource.includes("charades:Math.min(10,Math.floor(Math.max(0,Number(st.charadesCorrect)||0)/10))"),"profile performance XP caps missing");
assert(appStateSource.includes("var xp=stats.rounds+stats.sessions*8+stats.awards*3+stats.games.length*5"),"crew XP formula changed unexpectedly");
assert(appStateSource.includes("function preserveRoundContentIdentity(")&&appStateSource.includes("if(previousRound)round=preserveRoundContentIdentity(previousRound,round)"),"round edit identity guard missing");
assert(appStateSource.includes("function profileLevelFeedback("),"profile level-up feedback missing");
assert(appStateSource.includes("getProfileLevel:getProfileLevel"),"profile level API not exported");
assert(html["index.html"].includes('id="headerLevel"')&&html["index.html"].includes('id="profileLevelBlock"')&&html["index.html"].includes('id="profileLevelOrb"'),"profile level launcher UI missing");
assert(launcherSource.includes("store.getProfileLevel")&&launcherSource.includes('byId("profileLevelFill")'),"profile level launcher rendering missing");
assert(launcherCss.includes(".profileLevelCard")&&launcherCss.includes(".profileLevelOrb")&&launcherCss.includes(".playerLevelTrack"),"profile level visual system missing");
assert(launcherCss.includes("conic-gradient(#ef9f45 var(--profile-progress)"),"profile level progress ring missing");
assert(pwaSource.includes('"profile-level"')&&pwaSource.includes("Profil Level-Up"),"DEV profile level feedback preview missing");
assert(appStateSource.includes("var CATEGORY_TICKET_THRESHOLDS=[8,20,40]"),"category unlock thresholds mismatch");
assert(["popculture","tech","spicy"].every(id=>appStateSource.includes('id:"'+id+'"')),"category progression pack definitions missing");
assert(appStateSource.includes("function getCategoryProgress()")&&appStateSource.includes("function unlockCategoryPack("),"category progression APIs missing");
assert(appStateSource.includes("getCategoryProgress:getCategoryProgress")&&appStateSource.includes("filterUnlockedCategories:filterUnlockedCategories"),"category progression API exports missing");
assert(appStateSource.includes('new CustomEvent("ci:category-unlocked"'),"category unlock event missing");
assert(appStateSource.includes('new CustomEvent("ci:category-ticket-earned"'),"category ticket event missing");
assert(pwaSource.includes("function openCategoryUnlock(game,category)"),"category progression modal missing");
assert(pwaSource.includes('window.addEventListener("ci:category-unlocked"'),"category unlock feedback listener missing");
assert(pwaSource.includes('window.addEventListener("ci:category-ticket-earned"'),"category ticket feedback listener missing");
assert(appUiCss.includes(".categoryCard.locked")&&appUiCss.includes(".ciProgressOverlay"),"category lock/progression styles missing");
assert(html["index.html"].includes('id="categoryProgressList"')&&html["index.html"].includes('id="categoryTicketCount"'),"launcher category progression UI missing");
assert(launcherSource.includes("function renderCategoryProgress()"),"launcher category progression renderer missing");
assert(launcherSource.includes("function firstLockedPresetCategory("),"preset category lock guard missing");
assert(launcherSource.includes('button.dataset.locked==="1"'),"preset category picker lock guard missing");
assert(engineSource.includes("allCats=allCats.filter(experimentCategoryUnlocked)"),"Circa 'Alle' must exclude locked categories");
assert(engineSource.includes("all=all.filter(experimentCategoryUnlocked)"),"Classic 'Alle' must exclude locked categories");
assert(whoSource.includes("return bank.filter(function(item){return categoryUnlocked(item.cat);})"),"WhoAmI 'Alle' must exclude locked categories");
assert(charadesSource.includes("return bank.filter(function(item){return categoryUnlocked(item.cat);})"),"Charades 'Alle' must exclude locked categories");

{
  const categorySets={
    circa:[...new Set(questions.items.map(item=>item.cat))],
    classic:[...new Set(words.items.map(item=>item.cat))],
    whoami:(who.categories||[]).map(item=>typeof item==="string"?item:item.name),
    charades:(charades.categories||[]).map(item=>typeof item==="string"?item:item.name)
  };
  const locked={
    circa:["Popkultur","Technik","Spicy 🌶️"],
    classic:["Popkultur","Technik","Spicy 🌶️"],
    whoami:["Film & Serien","Games & Figuren","Marken & Technik"],
    charades:["Film & Serien","Musik & Bühne","Technik & Internet"]
  };
  for(const game of Object.keys(categorySets)){
    const total=categorySets[game].length;
    const open=total-locked[game].length;
    const ratio=open/total;
    assert(ratio>=0.65&&ratio<=0.80,game+" initial category availability must stay around 70–75%");
    assert(locked[game].every(cat=>categorySets[game].includes(cat)),game+" progression references unknown category");
  }
}
assert(appStateSource.includes("function profileMatchesName(profile,lower)"),"profile alias matching helper missing");
assert(appStateSource.includes('if(game==="circa"&&round.category)addUnique(st.categories,round.category);'),"profile Circa category guard missing");
assert(appStateSource.includes('if(game==="circa"&&round.category)addUnique(data.stats.categories,round.category);'),"global Circa category guard missing");
assert(appStateSource.includes("data.stats.categories=globalCategories"),"Circa category repair missing");
assert(appStateSource.includes("preset.profileIds=preset.profileIds.filter"),"stale preset profile cleanup missing");
assert(launcherSource.includes("activeProfilesForLaunch(session).length>=gameMeta(sessionGame(session)).min"),"session replay must use per-game minimum");
assert(launcherSource.includes('byId("presetOpenGame").disabled=!playable'),"incomplete preset launch guard missing");
assert(whoSource.includes('if(currentRoundKey&&!window.confirm("Aktuelle Runde abbrechen und neue Begriffe verteilen?"))return;'),"WhoAmI active-round restart guard missing");
assert(personalSource.includes('if(currentRoundKey&&!window.confirm("Aktuelle Runde abbrechen und ein neues Fragepaar starten?"))return;'),"Personal active-round restart guard missing");
assert(charadesSource.includes('function leave(){if(currentPartyKey&&!window.confirm'),"Charades active-party leave guard missing");
assert(launcherSource.includes('byId("presetAddPlayer")'),"preset direct player creation missing");
assert(launcherSource.includes('openProfileEditor(null,"preset")'),"preset player creation flow missing");
assert(launcherSource.includes('querySelectorAll("a.gameCard[href]")'),"game-card sound/navigation binding missing");
assert(!/\.(mp3|wav|m4a|aac|ogg)["']/i.test(launcherSource),"launcher should not depend on external audio files");
assert(launcherCss.includes("-webkit-user-select:none")&&launcherCss.includes("user-select:none"),"launcher text-selection lock missing");
assert(launcherSource.includes('document.addEventListener("copy"'),"launcher copy guard missing");
assert(gameCss.includes("V74 launcher-aligned game makeover"),"launcher-aligned game makeover missing");
assert(gameCss.includes(".classicRoleScreen:not(.hidden)"),"Classic visible-only transition layout missing");
assert(gameCss.includes(".classicRoleScreen.hidden"),"Classic hidden-screen safety missing");
assert(gameCss.includes("color:#00d747!important"),"Circa result success green missing");
assert(html["games/circa-imposter/index.html"].includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"Circa opaque iOS status bar missing");
assert(html["games/classic-imposter/index.html"].includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"Classic opaque iOS status bar missing");
assert(html["games/who-am-i/index.html"].includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"WhoAmI opaque iOS status bar missing");
assert(html["games/charades/index.html"].includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"Scharade opaque iOS status bar missing");
assert(html["games/personal-impostor/index.html"].includes('apple-mobile-web-app-status-bar-style\" content=\"black\"'),"Personal opaque iOS status bar missing");
assert(whoCss.includes(".whoViewerScreen .whoBottomButton{margin-top:auto}"),"WhoAmI bottom reveal action anchoring missing");
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
assert(html["index.html"].includes('href="games/personal-impostor/"'),"Personal launcher card missing");
assert(games.games.some(game=>game.id==="personal-impostor"&&game.path==="games/personal-impostor/"),"Personal registry entry missing");
assert(sw.includes('versioned("/assets/js/personal-impostor.js")')&&sw.includes('versioned("/assets/css/personal-impostor.css")'),"Personal service-worker assets missing");
assert(sw.includes('"/data/personal-impostor.json"')&&sw.includes('"/games/personal-impostor/"'),"Personal service-worker data/page missing");
assert(personalCss.includes(".personalAnswerRow.impostorCaught .impostorX"),"Personal reveal X animation styling missing");

/* Simulate the first V72 -> V74 profile migration. */
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
assert(migratedStore.getProfileLevel(byName.marlon.id).level>=2,"migrated profile level did not backfill from existing stats");
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
assert(legacySeed.has("imposterGames.appState.v1"),"V74 app-state was not persisted");

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

/* V74 state/regression audit: round idempotency, groups, reset and backup v3. */
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
function auditStore(holder,eventSink){
  let tick=0;
  const crypto={getRandomValues(arr){tick++;for(let i=0;i<arr.length;i++)arr[i]=tick*1000+i;return arr;},subtle:globalThis.crypto.subtle};
  class AuditCustomEvent{constructor(type,init){this.type=type;this.detail=init&&init.detail;}}
  const win={crypto,dispatchEvent(event){if(Array.isArray(eventSink))eventSink.push(event);return true;}};
  return new Function("window","localStorage","crypto","CustomEvent",appStateSource+";return window.CIAppState;")(win,holder.storage,crypto,AuditCustomEvent);
}
const v73Storage=auditStorage([
  ["imposterGames.v73.game.circa.deckProgress.v1",JSON.stringify({"Allgemein::mittel":[questions.items[0].qid]})],
  ["imposterGames.v73.game.classic.timer.v1",JSON.stringify(180)],
  ["imposterGames.v73.game.whoami.deck.v1",JSON.stringify({"Alle":[who.items[0].id]})],
  ["imposterGames.v73.game.charades.deck.v1",JSON.stringify({"Alle":[charades.items[0].id]})]
]);
auditStore(v73Storage);
assert(JSON.parse(v73Storage.storage.getItem("imposterGames.v74.game.circa.deckProgress.v1"))["Allgemein::mittel"][0]===questions.items[0].qid,"V73 Circa storage was not copied to V74");
assert(JSON.parse(v73Storage.storage.getItem("imposterGames.v74.game.classic.timer.v1"))===180,"V73 Classic storage was not copied to V74");
assert(JSON.parse(v73Storage.storage.getItem("imposterGames.v74.game.whoami.deck.v1")).Alle[0]===who.items[0].id,"V73 WhoAmI storage was not copied to V74");
assert(JSON.parse(v73Storage.storage.getItem("imposterGames.v74.game.charades.deck.v1")).Alle[0]===charades.items[0].id,"V73 Scharade storage was not copied to V74");
assert(v73Storage.storage.getItem("imposterGames.v73.game.circa.deckProgress.v1")!==null,"V73 source storage must remain untouched");

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
assert(auditState.updateProfile(auditM.id,{name:"Marlon Neu",avatar:"😎"})===true,"second profile rename failed");
const profileCountBeforeAlias=auditState.getProfiles().length;
assert(auditState.ensureProfileForPlayer({name:"Marlon",avatar:"😎"})===auditM.id,"profile alias did not resolve to renamed profile");
assert(auditState.getProfiles().length===profileCountBeforeAlias,"profile alias resolution created a duplicate profile");
const auditTemp=auditState.addProfile({name:"Temp",avatar:"🤖"});
const auditPreset=auditState.savePreset({name:"Audit",game:"circa",profileIds:[auditM.id,auditL,auditTemp],categories:["Alle"],difficulty:"mittel"});
assert(auditState.deleteProfile(auditTemp)===true,"temporary profile deletion failed");
const cleanedPreset=auditState.getPresets().find(p=>p.id===auditPreset.id);
assert(cleanedPreset&&cleanedPreset.profileIds.length===2&&cleanedPreset.playerCount===2,"deleted profile remained in custom preset");

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

/* V74R9 motivational-feedback audit: priorities, records, milestones, near goals and session finale. */
const feedbackMem=auditStorage(),feedbackEvents=[];
const feedbackState=auditStore(feedbackMem,feedbackEvents);
const feedbackP1=feedbackState.getProfiles()[0];
feedbackState.updateProfile(feedbackP1.id,{name:"Feedback One",avatar:"😎"});
const feedbackP2=feedbackState.addProfile({name:"Feedback Two",avatar:"🦊"});
const feedbackP3=feedbackState.addProfile({name:"Feedback Three",avatar:"🐼"});
const feedbackPlayers=[feedbackP1.id,feedbackP2,feedbackP3];
feedbackState.beginSession(feedbackPlayers.map(id=>({profileId:id,name:id})));
function feedbackRoundPlayers(errors){
  return feedbackPlayers.map(function(id,index){
    return {profileId:id,role:index===2?"impostor":"normal",error:errors[index],closest:index===0};
  });
}
feedbackState.recordRound({roundKey:"fb-c1",game:"circa",category:"Allgemein",qid:"fb-q1",players:feedbackRoundPlayers([10,20,30])});
feedbackEvents.length=0;
feedbackState.recordRound({
  roundKey:"fb-c2",game:"circa",category:"Allgemein",qid:"fb-q2",
  players:[
    {profileId:feedbackP1.id,role:"normal",error:0,perfect:true,closest:true},
    {profileId:feedbackP2,role:"normal",error:15},
    {profileId:feedbackP3,role:"impostor",error:25}
  ]
});
const perfectAchievementIndex=feedbackEvents.findIndex(event=>event.type==="ci:achievement-unlocked"&&(event.detail.items||[]).some(item=>item.id==="perfect"));
const firstPerfectFeedbackIndex=feedbackEvents.findIndex(event=>event.type==="ci:motivational-feedback");
assert(perfectAchievementIndex>=0,"first perfect estimate did not unlock achievement");
assert(firstPerfectFeedbackIndex<0||perfectAchievementIndex<firstPerfectFeedbackIndex,"achievement feedback must take priority over secondary round feedback");
assert((feedbackEvents.find(event=>event.type==="ci:achievement-unlocked").detail.items.find(item=>item.id==="perfect")||{}).progress==="1/1","achievement unlock feedback lost completed progress");
const firstPerfectRoundFeedback=feedbackEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
assert(!firstPerfectRoundFeedback.some(item=>item.title==="Punktlandung!"),"first perfect estimate duplicated achievement hero feedback");

feedbackEvents.length=0;
feedbackState.recordRound({
  roundKey:"fb-c3",game:"circa",category:"Allgemein",qid:"fb-q3",
  players:[
    {profileId:feedbackP1.id,role:"normal",error:0,perfect:true,closest:true},
    {profileId:feedbackP2,role:"normal",error:14},
    {profileId:feedbackP3,role:"impostor",error:24}
  ]
});
let feedbackItems=feedbackEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
assert(feedbackItems.some(item=>item.title==="Punktlandung!"&&item.intensity===3),"repeat perfect estimate did not trigger level-3 hero feedback");
assert(!feedbackEvents.some(event=>event.type==="ci:achievement-unlocked"&&(event.detail.items||[]).some(item=>item.id==="perfect")),"repeat perfect estimate re-unlocked achievement");

feedbackEvents.length=0;
feedbackState.recordRound({roundKey:"fb-r4",game:"classic",category:"Allgemein",wid:"fb-w4",players:feedbackPlayers.map((id,index)=>({profileId:id,role:index===2?"impostor":"normal"}))});
feedbackState.recordRound({roundKey:"fb-r5",game:"classic",category:"Allgemein",wid:"fb-w5",impostorEscaped:null,players:feedbackPlayers.map((id,index)=>({profileId:id,role:index===2?"impostor":"normal"}))});
feedbackItems=feedbackEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
assert(feedbackItems.some(item=>item.title==="5. Runde der Session"&&item.intensity===1),"five-round session milestone feedback missing");

feedbackEvents.length=0;
const roundsBeforeEscape=feedbackState.getStats().rounds;
feedbackState.recordRound({roundKey:"fb-r5",game:"classic",category:"Allgemein",wid:"fb-w5",impostorEscaped:true,players:feedbackPlayers.map((id,index)=>({profileId:id,role:index===2?"impostor":"normal"}))});
feedbackItems=feedbackEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
assert(feedbackItems.some(item=>item.title==="Unentdeckt!"&&item.intensity===2),"late impostor outcome feedback missing");
assert(feedbackState.getStats().rounds===roundsBeforeEscape,"late impostor outcome feedback double-counted round");

feedbackEvents.length=0;
for(let i=6;i<=9;i++){
  feedbackState.recordRound({roundKey:"fb-r"+i,game:"classic",category:"Allgemein",wid:"fb-w"+i,players:feedbackPlayers.map((id,index)=>({profileId:id,role:index===2?"impostor":"normal"}))});
}
feedbackItems=feedbackEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
assert(feedbackItems.some(item=>item.title==="Fast geschafft · Warmgelaufen"&&item.message.includes("9/10")),"near-achievement 9/10 feedback missing");

feedbackEvents.length=0;
const feedbackEnded=feedbackState.endSession();
feedbackItems=feedbackEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
assert(feedbackEnded&&feedbackEnded.rounds.length===9,"feedback audit session round count mismatch");
assert(feedbackItems.some(item=>(item.type==="session-end"||item.type==="crew")&&item.intensity>=2),"session completion feedback missing");
assert(feedbackItems.every(item=>item.intensity>=1&&item.intensity<=3),"feedback intensity outside 1..3");

/* V74R12 progression harmony audit: personal level, crew level, categories and feedback stay independent. */
const harmonyMem=auditStorage(),harmonyEvents=[];
const harmonyState=auditStore(harmonyMem,harmonyEvents);
const harmonyP1=harmonyState.getProfiles()[0];
harmonyState.updateProfile(harmonyP1.id,{name:"Harmony One",avatar:"😎"});
const harmonyP2=harmonyState.addProfile({name:"Harmony Two",avatar:"🦊"});
const harmonyP3=harmonyState.addProfile({name:"Harmony Three",avatar:"🐼"});
const harmonyIds=[harmonyP1.id,harmonyP2,harmonyP3];
harmonyIds.forEach(id=>{
  const level=harmonyState.getProfileLevel(id);
  assert(level.level===1&&level.xp===0&&level.remaining===20,"fresh profile level must start at LVL 1 / 0 XP");
});
harmonyState.beginSession(harmonyIds.map(id=>({profileId:id,name:id})));
for(let i=1;i<=10;i++){
  harmonyState.recordRound({
    roundKey:"harmony-"+i,game:"classic",category:"Allgemein",wid:"harmony-w"+i,
    impostorEscaped:i===3,
    players:harmonyIds.map((id,index)=>({profileId:id,role:index===2?"impostor":"normal"}))
  });
}
const harmonyBeforeEndLevels=harmonyIds.map(id=>harmonyState.getProfileLevel(id));
assert(harmonyBeforeEndLevels.every(level=>level.level>=2),"profiles did not progress independently during play");
assert(harmonyBeforeEndLevels.every(level=>level.progress>=0&&level.progress<=1&&level.nextXp>level.startXp),"profile level progress model invalid");
let harmonyItems=harmonyEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
assert(harmonyItems.some(item=>item.type==="profile-level"&&item.intensity===2),"profile level-up feedback missing");
const harmonyCrewBefore=harmonyState.getCrew(harmonyIds);
assert(harmonyCrewBefore&&!harmonyCrewBefore.hasHistory&&harmonyCrewBefore.xp===0,"crew XP must not grow before a shared session is completed");
const harmonyCategoryBefore=JSON.stringify(harmonyState.getCategoryProgress());
harmonyEvents.length=0;
harmonyState.endSession();
const harmonyAfterEndLevels=harmonyIds.map(id=>harmonyState.getProfileLevel(id));
assert(harmonyAfterEndLevels.every((level,index)=>level.xp===harmonyBeforeEndLevels[index].xp&&level.level===harmonyBeforeEndLevels[index].level),"ending a session must not change personal profile XP");
const harmonyCrewAfter=harmonyState.getCrew(harmonyIds);
assert(harmonyCrewAfter.hasHistory&&harmonyCrewAfter.stats.sessions===1&&harmonyCrewAfter.level.level>=2,"completed shared session did not progress crew independently");
assert(JSON.stringify(harmonyState.getCategoryProgress())===harmonyCategoryBefore,"crew/session completion changed category progression unexpectedly");
harmonyItems=harmonyEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
assert(harmonyItems.some(item=>item.type==="crew"),"crew completion feedback missing in harmony audit");
assert(!harmonyItems.some(item=>item.type==="profile-level"),"session completion emitted a false personal level-up");
const harmonyReload=auditStore(harmonyMem);
harmonyIds.forEach((id,index)=>{
  const level=harmonyReload.getProfileLevel(id);
  assert(level.level===harmonyAfterEndLevels[index].level&&level.xp===harmonyAfterEndLevels[index].xp,"profile level did not survive reload through source stats");
});
const harmonyBackup=await harmonyState.createBackup();
const harmonyRestoreMem=auditStorage(),harmonyRestore=auditStore(harmonyRestoreMem);
const harmonyRestoreResult=await harmonyRestore.importSnapshot(harmonyBackup);
assert(harmonyRestoreResult.ok,"profile/crew harmony backup restore failed");
harmonyIds.forEach((id,index)=>{
  const level=harmonyRestore.getProfileLevel(id);
  assert(level.level===harmonyAfterEndLevels[index].level&&level.xp===harmonyAfterEndLevels[index].xp,"profile level changed after backup restore");
});
assert(harmonyRestore.getCrew(harmonyIds).level.level===harmonyCrewAfter.level.level,"crew level changed after backup restore");

/* V74R12 round-edit audit: one round key may update outcomes, never rewrite its identity or mint duplicate XP. */
const editMem=auditStorage(),editEvents=[];
const editState=auditStore(editMem,editEvents);
const editP1=editState.getProfiles()[0];
editState.updateProfile(editP1.id,{name:"Edit One",avatar:"😎"});
const editP2=editState.addProfile({name:"Edit Two",avatar:"🦊"});
const editP3=editState.addProfile({name:"Edit Three",avatar:"🐼"});
const editIds=[editP1.id,editP2,editP3];
editState.beginSession(editIds.map(id=>({profileId:id,name:id})));
const editQid=questions.items[0].qid;
editState.recordRound({
  roundKey:"edit-stable-1",game:"circa",category:"Allgemein",qid:editQid,impostorEscaped:null,
  players:editIds.map((id,index)=>({profileId:id,role:index===2?"impostor":"normal",error:10+index}))
});
const editXpBefore=editIds.map(id=>editState.getProfileLevel(id).xp);
editEvents.length=0;
editState.recordRound({
  roundKey:"edit-stable-1",game:"classic",category:"Technik",wid:words.items[0].wid,qid:"should-not-stick",impostorEscaped:true,
  players:editIds.map(id=>({profileId:id}))
});
let editedSession=editState.getActiveSession(),editedRound=editedSession.rounds[0];
assert(editState.getStats().rounds===1&&editedSession.rounds.length===1,"round edit created duplicate rounds");
assert(editedRound.game==="circa"&&editedRound.qid===editQid&&!editedRound.wid&&editedRound.category==="Allgemein","round edit rewrote immutable content identity");
assert(editedRound.players.every((player,index)=>player.role===(index===2?"impostor":"normal")&&player.error===10+index),"partial round outcome update lost immutable player data");
assert(editIds.every(id=>editState.getProfileStats(id).circaQids.length===1&&editState.getProfileStats(id).circaQids[0]===editQid),"round edit polluted profile discovery content");
const editXpEscaped=editIds.map(id=>editState.getProfileLevel(id).xp);
assert(editXpEscaped[0]===editXpBefore[0]&&editXpEscaped[1]===editXpBefore[1]&&editXpEscaped[2]===editXpBefore[2]+1,"impostor outcome correction changed unrelated personal XP");
let editFeedback=editEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
assert(!editFeedback.some(item=>item.type==="profile-level"),"round edit emitted duplicate personal level-up feedback");
editEvents.length=0;
editState.recordRound({
  roundKey:"edit-stable-1",game:"classic",category:"Spicy 🌶️",wid:"still-wrong",impostorEscaped:false,
  players:editIds.map(id=>({profileId:id}))
});
assert(editIds.map(id=>editState.getProfileLevel(id).xp).every((xp,index)=>xp===editXpBefore[index]),"reverted impostor outcome did not restore personal XP");
assert(editState.getProfileStats(editP3).impostorEscapes===0,"reverted impostor outcome left stale escape stats");
const editLevelCapped=editState.devPatchStats("profile",editP1.id,{
  rounds:100,circaRounds:100,perfect:100,impostorEscapes:100,charadesCorrect:1000
});
const cappedProfileLevel=editState.getProfileLevel(editP1.id);
assert(cappedProfileLevel.breakdown.precision===20&&cappedProfileLevel.breakdown.escapes===10&&cappedProfileLevel.breakdown.charades===10,"personal performance XP is not capped");
assert(cappedProfileLevel.breakdown.rounds>cappedProfileLevel.breakdown.precision+cappedProfileLevel.breakdown.escapes+cappedProfileLevel.breakdown.charades,"personal progression became performance-dominated");

/* V74R10 Party-Pass audit: exact-group identity, persistent goal choice, crew memories and feedback. */
const crewMem=auditStorage(),crewEvents=[];
const crewState=auditStore(crewMem,crewEvents);
const crewP1=crewState.getProfiles()[0];
crewState.updateProfile(crewP1.id,{name:"Crew One",avatar:"😎"});
const crewP2=crewState.addProfile({name:"Crew Two",avatar:"🦊"});
const crewP3=crewState.addProfile({name:"Crew Three",avatar:"🐼"});
const crewIds=[crewP1.id,crewP2,crewP3];
function beginCrewSession(ids){
  crewState.beginSession(ids.map(id=>({profileId:id,name:id})));
}
function crewPlayers(ids,options={}){
  return ids.map(function(id,index){
    return {
      profileId:id,
      role:index===ids.length-1?"impostor":"normal",
      error:options.error?options.error[index]:undefined,
      correct:options.correct?options.correct[index]:undefined,
      skipped:options.skipped?options.skipped[index]:undefined,
      termIds:options.termIds?options.termIds[index]:undefined,
      termId:options.termId?options.termId[index]:undefined
    };
  });
}
for(let sessionNo=1;sessionNo<=3;sessionNo++){
  beginCrewSession(crewIds);
  crewState.recordRound({
    roundKey:"crew-classic-"+sessionNo,game:"classic",category:"Allgemein",wid:"crew-w-"+sessionNo,
    impostorEscaped:sessionNo>1,
    players:crewPlayers(crewIds)
  });
  crewEvents.length=0;
  crewState.endSession();
  const crewNow=crewState.getCrew(crewIds);
  assert(crewNow&&crewNow.stats.sessions===sessionNo,"crew session count mismatch at evening "+sessionNo);
  assert(crewNow.selectedChallenge.id==="reunion-3","default crew goal changed before explicit choice");
  if(sessionNo===1){
    const items=crewEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
    assert(items.some(item=>item.title==="Neue Crew gestartet"&&item.intensity===2),"first crew evening did not create Party-Pass feedback");
    assert(!items.some(item=>item.type==="session-end"),"generic session finale should yield to new-crew feedback");
  }
  if(sessionNo===3){
    const items=crewEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
    assert(crewNow.selectedChallenge.done===true&&crewNow.selectedChallenge.progress==="3/3","reunion crew goal did not complete at third evening");
    assert(items.some(item=>item.title==="Wiedersehen geschafft"&&item.intensity===3),"completed selected crew challenge did not trigger hero feedback");
  }
}
let crew=crewState.getCrew(crewIds);
assert(crew.stats.rounds===3&&crew.completedChallenges>=1,"crew cumulative history mismatch");
assert(crewState.getCrews().length===1,"same profile combination created duplicate crews");
crew=crewState.setCrewChallenge(crewIds,"all-games");
assert(crew&&crew.selectedChallenge.id==="all-games","crew goal choice was not applied");

beginCrewSession(crewIds);
[
  {game:"circa",roundKey:"crew-circa",qid:"crew-q",category:"Allgemein",players:crewPlayers(crewIds,{error:[4,12,30]})},
  {game:"whoami",roundKey:"crew-who",category:"Personen & Geschichte",players:crewPlayers(crewIds,{termId:["cw1","cw2","cw3"]})},
  {game:"charades",roundKey:"crew-char",category:"Tiere",players:crewPlayers(crewIds,{correct:[8,3,1],skipped:[1,0,0],termIds:[["ct1","ct2"],["ct3"],["ct4"]]})},
  {game:"personal",roundKey:"crew-personal",qid:"crew-p",players:crewPlayers(crewIds)}
].forEach(round=>crewState.recordRound(round));
crewEvents.length=0;
crewState.endSession();
crew=crewState.getCrew(crewIds);
let crewFeedback=crewEvents.filter(event=>event.type==="ci:motivational-feedback").flatMap(event=>event.detail.items||[]);
assert(crew.selectedChallenge.done===true&&crew.selectedChallenge.progress==="5/5","selected all-games crew goal did not complete");
assert(crewFeedback.some(item=>item.title==="Allrounder geschafft"&&item.intensity===3),"all-games crew challenge feedback missing");
assert(crew.stats.bestCirca&&crew.stats.bestCirca.error===4,"crew best-Circa memory mismatch");
assert(crew.stats.bestCharades&&crew.stats.bestCharades.correct===8,"crew Scharade memory mismatch");
assert(crew.stats.impostorEscapes===2,"crew impostor-escape memory mismatch");
assert(crew.level.level>=2&&crew.level.progress>=0&&crew.level.progress<=1,"crew level model invalid");

const crewP4=crewState.addProfile({name:"Crew Four",avatar:"🐸"});
const otherCrewIds=[crewP1.id,crewP2,crewP4];
beginCrewSession(otherCrewIds);
crewState.recordRound({roundKey:"crew-other",game:"classic",category:"Allgemein",wid:"crew-other-w",players:crewPlayers(otherCrewIds)});
crewState.endSession();
assert(crewState.getCrews().length===2,"different profile combination did not create separate crew");
assert(crewState.getCrew(crewIds).stats.sessions===4,"different crew polluted original Party-Pass history");
assert(crewState.getCrew(otherCrewIds).stats.sessions===1,"second crew history missing");

const reorderedCrew=crewState.getCrew([crewP3,crewP1.id,crewP2]);
assert(reorderedCrew&&reorderedCrew.key===crewState.getCrew(crewIds).key&&reorderedCrew.stats.sessions===4,"same crew in different profile order created a different Party-Pass");
beginCrewSession([crewP3,crewP1.id,crewP2]);
crewState.endSession();
assert(crewState.getCrew(crewIds).stats.sessions===4&&crewState.getCrews().length===2,"empty crew session changed Party-Pass history");
const archivedLevelBefore=crewState.getProfileLevel(crewP3);
assert(crewState.deleteProfile(crewP3)===true,"crew member deletion failed");
const archivedCrew=crewState.getCrew(crewIds),archivedLevelAfter=crewState.getProfileLevel(crewP3);
assert(archivedCrew&&archivedCrew.members.some(member=>member.id===crewP3&&member.name==="Crew Three"),"deleted crew member lost archived Party-Pass identity");
assert(archivedCrew.stats.sessions===4&&archivedCrew.selectedChallenge.id==="all-games","deleted crew member changed shared history or selected goal");
assert(archivedLevelBefore&&archivedLevelAfter&&archivedLevelAfter.xp===archivedLevelBefore.xp&&archivedLevelAfter.level===archivedLevelBefore.level,"deleted profile lost personal level history");

const crewReload=auditStore(crewMem);
assert(crewReload.getCrew(crewIds).selectedChallenge.id==="all-games","crew goal choice did not survive reload");
assert(crewReload.getCrew(crewIds).stats.rounds===7,"crew history did not backfill from stored sessions after reload");

const crewBackup=await crewState.createBackup();
assert(crewBackup.data.crewProgress&&typeof crewBackup.data.crewProgress==="object","Party-Pass progress missing from backup");
const crewRestoreMem=auditStorage(),crewRestoreState=auditStore(crewRestoreMem);
const crewRestoreResult=await crewRestoreState.importSnapshot(crewBackup);
assert(crewRestoreResult.ok,"Party-Pass backup restore failed");
assert(crewRestoreState.getCrew(crewIds).selectedChallenge.id==="all-games","crew selected goal was not restored from backup");
assert(crewRestoreState.getCrew(crewIds).stats.sessions===4,"crew sessions were not restored from backup");

/* V74R8 category progression audit: autonomy, challenge paths, persistence and no lock bypass. */
const progressionMem=auditStorage();
const progressionState=auditStore(progressionMem);
let progression=progressionState.getCategoryProgress();
assert(progression.packs.length===3&&progression.packs.every(pack=>!pack.unlocked),"fresh category progression must start with three locked packs");
assert(progression.tickets.available===0&&progression.tickets.earned===0,"fresh category progression must start without unlock choices");
assert(progressionState.isCategoryUnlocked("circa","Allgemein")===true,"base Circa category unexpectedly locked");
assert(progressionState.isCategoryUnlocked("circa","Popkultur")===false,"Popkultur must start locked");
assert(progressionState.isCategoryUnlocked("whoami","Marken & Technik")===false,"Tech pack must start locked across games");
assert(JSON.stringify(progressionState.filterUnlockedCategories("circa",["Allgemein","Technik"]))===JSON.stringify(["Allgemein"]),"locked explicit category was not filtered");
assert(JSON.stringify(progressionState.filterUnlockedCategories("circa",["Alle"]))===JSON.stringify(["Alle"]),"Alle category sentinel must remain stable");

const progP1=progressionState.getProfiles()[0];
progressionState.updateProfile(progP1.id,{name:"Prog One",avatar:"😎"});
const progP2=progressionState.addProfile({name:"Prog Two",avatar:"🦊"});
const progP3=progressionState.addProfile({name:"Prog Three",avatar:"🐼"});
const progPlayers=[
  {profileId:progP1.id,role:"normal"},
  {profileId:progP2,role:"normal"},
  {profileId:progP3,role:"impostor"}
];
progressionState.beginSession([
  {profileId:progP1.id,name:"Prog One",avatar:"😎"},
  {profileId:progP2,name:"Prog Two",avatar:"🦊"},
  {profileId:progP3,name:"Prog Three",avatar:"🐼"}
]);
for(let i=0;i<7;i++){
  progressionState.recordRound({roundKey:"prog-ticket-"+i,game:"classic",category:"Allgemein",wid:"prog-w"+i,players:progPlayers});
}
assert(progressionState.getCategoryProgress().tickets.available===0,"unlock choice appeared before 8 rounds");
progressionState.recordRound({roundKey:"prog-ticket-7",game:"classic",category:"Allgemein",wid:"prog-w7",players:progPlayers});
progression=progressionState.getCategoryProgress();
assert(progression.tickets.available===1&&progression.tickets.earned===1,"first free category unlock was not earned at 8 rounds");
const ticketUnlock=progressionState.unlockCategoryPack("tech","ticket");
assert(ticketUnlock.ok===true&&progressionState.isCategoryUnlocked("charades","Technik & Internet")===true,"free choice did not unlock tech pack globally");
assert(progressionState.getCategoryProgress().tickets.available===0,"spent unlock choice remained available");

const varietyMem=auditStorage();
const varietyState=auditStore(varietyMem);
const varietyP1=varietyState.getProfiles()[0];
varietyState.updateProfile(varietyP1.id,{name:"Var One",avatar:"😎"});
const varietyP2=varietyState.addProfile({name:"Var Two",avatar:"🦊"});
const varietyP3=varietyState.addProfile({name:"Var Three",avatar:"🐼"});
const varietyPlayers=[{profileId:varietyP1.id},{profileId:varietyP2},{profileId:varietyP3}];
varietyState.recordRound({roundKey:"var-c",game:"circa",category:"Allgemein",qid:"var-q",players:varietyPlayers});
varietyState.recordRound({roundKey:"var-k",game:"classic",category:"Allgemein",wid:"var-w",players:varietyPlayers});
varietyState.recordRound({roundKey:"var-p",game:"personal",qid:"var-p",players:varietyPlayers});
assert(varietyState.isCategoryUnlocked("circa","Popkultur")===true,"three-game variety challenge did not unlock Popkultur");
assert(varietyState.getCategoryProgress().packs.find(pack=>pack.id==="popculture").method==="challenge","challenge unlock method was not persisted");

const collectorMem=auditStorage();
const collectorState=auditStore(collectorMem);
collectorState.devPatchStats("global",null,{rounds:5,circaRounds:5,circaQids:Array.from({length:60},(_,i)=>"collector-"+i)});
assert(collectorState.isCategoryUnlocked("classic","Technik")===true,"60-content challenge did not unlock tech pack");
assert(collectorState.getCategoryProgress().tickets.spent===0,"challenge unlock consumed a free category choice");

const spicyMem=auditStorage();
const spicyState=auditStore(spicyMem);
const spicyP1=spicyState.getProfiles()[0];
spicyState.updateProfile(spicyP1.id,{name:"Spicy One",avatar:"😎"});
const spicyP2=spicyState.addProfile({name:"Spicy Two",avatar:"🦊"});
const spicyP3=spicyState.addProfile({name:"Spicy Three",avatar:"🐼"});
const spicyPlayers=[{profileId:spicyP1.id},{profileId:spicyP2},{profileId:spicyP3}];
spicyState.beginSession([
  {profileId:spicyP1.id,name:"Spicy One"},
  {profileId:spicyP2,name:"Spicy Two"},
  {profileId:spicyP3,name:"Spicy Three"}
]);
for(let i=0;i<9;i++)spicyState.recordRound({roundKey:"spicy-"+i,game:"classic",category:"Allgemein",wid:"spicy-w"+i,players:spicyPlayers});
assert(spicyState.isCategoryUnlocked("classic","Spicy 🌶️")===false,"Spicy unlocked before 10 rounds in one session");
spicyState.recordRound({roundKey:"spicy-9",game:"classic",category:"Allgemein",wid:"spicy-w9",players:spicyPlayers});
assert(spicyState.isCategoryUnlocked("classic","Spicy 🌶️")===true,"10-round session challenge did not unlock Spicy");

const progressionReload=auditStore(progressionMem);
assert(progressionReload.isCategoryUnlocked("whoami","Marken & Technik")===true,"category unlock did not survive local-state reload");
assert(progressionReload.getCategoryProgress().tickets.spent===1,"ticket spend did not survive local-state reload");

/* Simulate a pre-R8 state with rounds but no categoryProgress: earned choices must be restored silently. */
const legacyProgressSnapshot=progressionReload.snapshot();
legacyProgressSnapshot.stats.rounds=20;
legacyProgressSnapshot.stats.circaRounds=20;
delete legacyProgressSnapshot.categoryProgress;
const legacyProgressMem=auditStorage([["imposterGames.appState.v1",JSON.stringify(legacyProgressSnapshot)]]);
const legacyProgressState=auditStore(legacyProgressMem);
const legacyProgress=legacyProgressState.getCategoryProgress();
assert(legacyProgress.tickets.earned===2,"pre-R8 rounds did not backfill earned unlock choices");
assert(legacyProgressState.snapshot().categoryProgress.ticketNotices===2,"pre-R8 ticket notice baseline would cause retroactive spam");

const categoryMem=auditStorage();
const categoryState=auditStore(categoryMem);
const categoryP1=categoryState.getProfiles()[0];
categoryState.updateProfile(categoryP1.id,{name:"Cat One",avatar:"😎"});
const categoryP2=categoryState.addProfile({name:"Cat Two",avatar:"🦊"});
categoryState.beginSession([{profileId:categoryP1.id,name:"Cat One"},{profileId:categoryP2,name:"Cat Two"}]);
categoryState.recordRound({
  roundKey:"audit-whoami",game:"whoami",category:"Film & Serien",
  players:[{profileId:categoryP1.id,termId:who.items[0].id},{profileId:categoryP2,termId:who.items[1].id}]
});
categoryState.recordRound({
  roundKey:"audit-charades",game:"charades",category:"Tiere",
  players:[{profileId:categoryP1.id,correct:1,skipped:0,termIds:[charades.items[0].id]},{profileId:categoryP2,correct:1,skipped:0,termIds:[charades.items[1].id]}]
});
assert(categoryState.getStats().categories.length===0,"non-Circa rounds polluted Circa category statistics");
categoryState.devPatchStats("global",null,{circaQids:[questions.items[0].qid],categories:["Film & Serien","Tiere",questions.items[0].cat]});
categoryState.applyCircaQuestionMetadata(questions.items);
assert(categoryState.getStats().categories.length===1&&categoryState.getStats().categories[0]===questions.items[0].cat,"Circa category repair failed");

const devMem=auditStorage();
const devState=auditStore(devMem);
const devProfile=devState.getProfiles()[0];
assert(devState.devPatchStats("global",null,{rounds:42,circaRounds:17}).rounds===42,"DEV global statistics patch failed");
assert(devState.devPatchStats("profile",devProfile.id,{rounds:9,charadesCorrect:33}).charadesCorrect===33,"DEV profile statistics patch failed");
const devUsage=devState.devSetUsage({appMs:600000,games:{circa:300000,classic:120000}});
assert(devUsage.appMs===600000&&devUsage.games.circa===300000,"DEV usage update failed");
devState.devSetAchievementOverride("hundred-rounds",true,null);
assert(devState.getAchievements().find(a=>a.id==="hundred-rounds").unlocked===true,"DEV achievement unlock override failed");
devState.devSetAchievementOverride("hundred-rounds",false,null);
assert(devState.getAchievements().find(a=>a.id==="hundred-rounds").unlocked===false,"DEV achievement lock override failed");
devState.devSetAchievementOverride("hundred-rounds",null,null);
assert(devState.getAchievements().find(a=>a.id==="hundred-rounds").unlocked===false,"DEV achievement auto override reset failed");
devState.devSetCategoryPackOverride("popculture",true);
let devPack=devState.getCategoryProgress().packs.find(pack=>pack.id==="popculture");
assert(devPack.unlocked===true&&devPack.actualUnlocked===false&&devPack.devOverride===true,"DEV category unlock override failed");
devState.devSetCategoryPackOverride("popculture",false);
devPack=devState.getCategoryProgress().packs.find(pack=>pack.id==="popculture");
assert(devPack.unlocked===false&&devPack.devOverride===false,"DEV category lock override failed");
devState.devSetCategoryPackOverride("popculture",null);
devPack=devState.getCategoryProgress().packs.find(pack=>pack.id==="popculture");
assert(devPack.unlocked===false&&devPack.devOverride===null,"DEV category auto override reset failed");

const emptyMem=auditStorage();
const emptyState=auditStore(emptyMem);
const emptyP1=emptyState.getProfiles()[0];
emptyState.updateProfile(emptyP1.id,{name:"One",avatar:"😎"});
const emptyP2=emptyState.addProfile({name:"Two",avatar:"🦊"});
const emptyP3=emptyState.addProfile({name:"Three",avatar:"🐼"});
emptyState.beginSession([{profileId:emptyP1.id,name:"One"},{profileId:emptyP2,name:"Two"},{profileId:emptyP3,name:"Three"}]);
emptyState.endSession();
assert(!emptyState.getAchievements().find(a=>a.id==="first-session").unlocked,"empty session unlocked first-session achievement");

auditMem.storage.setItem("imposterGames.v74.game.circa.deckProgress.v1",JSON.stringify({"Allgemein::mittel":[questions.items[0].qid]}));
auditMem.storage.setItem("imposterGames.v74.game.circa.completedQuestions.v1",JSON.stringify([questions.items[0].qid]));
auditMem.storage.setItem("imposterGames.v74.game.classic.timer.v1",JSON.stringify(180));
auditMem.storage.setItem("imposterGames.v74.game.whoami.deck.v1",JSON.stringify({"Alle":[who.items[0].id]}));
auditMem.storage.setItem("imposterGames.v74.game.charades.deck.v1",JSON.stringify({"Alle":[charades.items[0].id]}));
auditMem.storage.setItem("imposterGames.v74.game.charades.timer.v1",JSON.stringify(60));
const auditBackup=await auditState.createBackup();
assert(auditBackup.formatVersion===3&&auditBackup.gameStorage,"backup v3 game storage missing");
assert(auditBackup.integrity&&auditBackup.integrity.algorithm==="SHA-256"&&/^[a-f0-9]{64}$/.test(auditBackup.integrity.sha256),"backup v3 SHA-256 integrity missing");
assert(auditBackup.data.categoryProgress&&auditBackup.data.categoryProgress.unlocks,"backup v3 category progression missing");
assert(auditBackup.data.crewProgress&&typeof auditBackup.data.crewProgress==="object","backup v3 crew progress missing");

const tamperedBackup=structuredClone(auditBackup);
tamperedBackup.data.stats.rounds=Number(tamperedBackup.data.stats.rounds||0)+99;
const tamperMem=auditStorage();
const tamperState=auditStore(tamperMem);
const tamperResult=await tamperState.importSnapshot(tamperedBackup);
assert(!tamperResult.ok&&tamperResult.reason==="integrity","tampered backup v3 was accepted");
assert(tamperState.getStats().rounds===0,"tampered backup modified local state before integrity rejection");

const restoreMem=auditStorage();
restoreMem.storage.setItem("imposterGames.v74.game.circa.completedQuestions.v1",JSON.stringify(["stale"]));
const restoreState=auditStore(restoreMem);
const restoreResult=await restoreState.importSnapshot(auditBackup);
assert(restoreResult.ok&&restoreResult.gameStorage===true,"backup v3 restore failed on fresh device state");
assert(JSON.parse(restoreMem.storage.getItem("imposterGames.v74.game.circa.completedQuestions.v1"))[0]===questions.items[0].qid,"game progress was not restored");
assert(JSON.parse(restoreMem.storage.getItem("imposterGames.v74.game.whoami.deck.v1")).Alle[0]===who.items[0].id,"WhoAmI game progress was not restored");
assert(JSON.parse(restoreMem.storage.getItem("imposterGames.v74.game.charades.deck.v1")).Alle[0]===charades.items[0].id,"Scharade game progress was not restored");
assert(JSON.parse(restoreMem.storage.getItem("imposterGames.v74.game.charades.timer.v1"))===60,"Scharade timer was not restored");
assert(JSON.stringify(restoreState.getCategoryProgress())===JSON.stringify(auditState.getCategoryProgress()),"category progression was not restored from backup");
assert(JSON.stringify(restoreState.snapshot().crewProgress)===JSON.stringify(auditState.snapshot().crewProgress),"crew progress was not restored from backup");

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
const remainingGameKeys=Array.from(restoreMem.map.keys()).filter(key=>key.startsWith("imposterGames.v74.game."));
assert(remainingGameKeys.length===2&&remainingGameKeys.includes("imposterGames.v74.game.v72Migration.v1")&&remainingGameKeys.includes("imposterGames.v74.game.v73Migration.v1"),"reset left stale V74 game storage");

console.log("Release validation OK · V"+release+" · "+questions.items.length+" Circa pairs · "+words.items.length+" Classic words · "+who.items.length+" WhoAmI terms · "+charades.items.length+" Scharade terms · "+personal.items.length+" Personal pairs");
