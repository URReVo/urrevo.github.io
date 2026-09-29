import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

const root=process.cwd();
const fail=[];
const warn=[];
const ok=[];

function assert(condition,message){if(!condition)fail.push(message);}
function note(message){ok.push(message);}
function warning(message){warn.push(message);}
function read(p){return fs.readFileSync(path.join(root,p),"utf8");}
function exists(p){return fs.existsSync(path.join(root,p));}
function norm(value){return String(value??"").normalize("NFKC").toLocaleLowerCase("de-DE").replace(/[^\p{L}\p{N}]+/gu," ").trim();}
function allFiles(dir){
  const out=[];
  for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
    const rel=path.posix.join(dir,entry.name);
    if(entry.isDirectory())out.push(...allFiles(rel));
    else out.push(rel);
  }
  return out;
}

const productionJs=[
  ...allFiles("assets/js").filter(p=>p.endsWith(".js")),
  "service-worker.js",
  ...allFiles("scripts").filter(p=>p.endsWith(".mjs")),
  ...allFiles("experiments/prototype/assets/js").filter(p=>p.endsWith(".js")),
  "experiments/prototype/service-worker.js"
].filter(exists);
for(const file of productionJs){
  const run=spawnSync(process.execPath,["--check",file],{cwd:root,encoding:"utf8"});
  assert(run.status===0,`JS syntax: ${file}: ${(run.stderr||run.stdout||"").trim()}`);
}
note(`JS syntax checked: ${productionJs.length} files`);

const jsonFiles=[
  ...allFiles("data").filter(p=>p.endsWith(".json")),
  ...allFiles("ios/ImposterGames/Resources/Content").filter(p=>p.endsWith(".json")),
  ...allFiles("experiments/prototype/data").filter(p=>p.endsWith(".json")),
  "manifest.webmanifest",
  "experiments/prototype/manifest.webmanifest"
].filter(exists);
const json={};
for(const file of jsonFiles){
  try{json[file]=JSON.parse(read(file));}
  catch(error){fail.push(`JSON parse: ${file}: ${error.message}`);}
}
note(`JSON parsed: ${jsonFiles.length} files`);

const htmlFiles=[
  "index.html",
  ...allFiles("games").filter(p=>p.endsWith(".html")),
  "experiments/prototype/index.html",
  ...allFiles("experiments/prototype/games").filter(p=>p.endsWith(".html"))
].filter(exists);
for(const file of htmlFiles){
  const src=read(file);
  const ids=[...src.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
  const seen=new Set(),dup=[];
  for(const id of ids){if(seen.has(id))dup.push(id);seen.add(id);}
  assert(dup.length===0,`Duplicate HTML ids in ${file}: ${[...new Set(dup)].join(", ")}`);

  for(const m of src.matchAll(/\b(?:src|href)=["']([^"'#?]+)(?:\?[^"']*)?["']/g)){
    let ref=m[1];
    if(/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(ref))continue;
    if(ref.endsWith("/")){
      const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),ref,"index.html"));
      assert(exists(target),`Missing linked directory target from ${file}: ${ref} -> ${target}`);
    }else{
      const target=path.posix.normalize(path.posix.join(path.posix.dirname(file),ref));
      assert(exists(target),`Missing linked asset from ${file}: ${ref} -> ${target}`);
    }
  }
}
note(`HTML ids/resources checked: ${htmlFiles.length} files`);

const expectedCounts={
  "data/circa-questions.json":520,
  "data/classic-words.json":250,
  "data/who-am-i.json":275,
  "data/charades.json":300,
  "data/personal-impostor.json":100
};
for(const [file,count] of Object.entries(expectedCounts)){
  const items=json[file]?.items;
  assert(Array.isArray(items),`${file}: items missing`);
  if(!Array.isArray(items))continue;
  assert(items.length===count,`${file}: expected ${count}, got ${items.length}`);
  const idKey=file.includes("circa-questions")?"qid":file.includes("classic-words")?"wid":"id";
  const ids=items.map(x=>String(x?.[idKey]||""));
  assert(ids.every(Boolean),`${file}: missing ${idKey}`);
  assert(new Set(ids).size===ids.length,`${file}: duplicate ${idKey}`);
}
note("Core content counts/ids checked");

for(const file of ["data/classic-words.json","data/who-am-i.json","data/charades.json"]){
  const items=json[file].items;
  const get=x=>x.word??x.term??x.text??x.name??"";
  const seen=new Map();
  for(const item of items){
    const key=norm(get(item));
    if(seen.has(key))fail.push(`${file}: duplicate normalized term "${get(item)}" (${seen.get(key)}, ${item.id})`);
    else seen.set(key,item.id);
  }
}
const actionTerms=json["data/charades.json"].items.filter(x=>x.cat==="Aktionen & Situationen");
assert(actionTerms.length===25,`Charades Aktionen & Situationen expected 25, got ${actionTerms.length}`);
assert(actionTerms.every(x=>String(x.term||x.word||"").trim().split(/\s+/).length===1),"Charades Aktionen & Situationen contains non-single-term entry");

const personal=json["data/personal-impostor.json"].items;
const qSeen=new Map();
for(const item of personal){
  assert(item.normal&&item.impostor,`${item.id}: missing Personal question`);
  assert(norm(item.normal)!==norm(item.impostor),`${item.id}: identical Personal questions`);
  for(const [side,q] of [["normal",item.normal],["impostor",item.impostor]]){
    const key=norm(q);
    if(qSeen.has(key))fail.push(`Personal duplicate question: ${item.id} ${side} duplicates ${qSeen.get(key)}`);
    else qSeen.set(key,`${item.id} ${side}`);
  }
  assert(["integer","number","time","rating","percent","text"].includes(item.answerType),`${item.id}: invalid answerType ${item.answerType}`);
  if(item.answerType==="rating")assert(item.min===1&&item.max===10,`${item.id}: rating contract must be 1..10`);
  if(item.answerType==="percent")assert(item.min===0&&item.max===100,`${item.id}: percent contract must be 0..100`);
}
note("Personal question identity/contracts checked");

const games=json["data/games.json"];
assert(games.platformVersion==="74",`games.json platformVersion mismatch: ${games.platformVersion}`);
assert(Array.isArray(games.games)&&games.games.length===5,"games.json must contain five games");
const personalGame=games.games.find(x=>x.id==="personal-impostor");
assert(personalGame&&!/ganz andere frage/i.test(personalGame.description||""),"Personal launcher description still says 'ganz andere Frage' instead of comparable");
const prototypeGames=json["experiments/prototype/data/games.json"];
const prototypePersonal=prototypeGames&&prototypeGames.games&&prototypeGames.games.find(x=>x.id==="personal-impostor");
assert(prototypePersonal&&!/ganz andere frage/i.test(prototypePersonal.description||""),"Prototype launcher still uses stale Personal description");

const sw=read("service-worker.js");
assert(sw.includes('const CACHE_REVISION="r25"'),"service worker revision is not r25");
const coreMatch=sw.match(/const CORE_URLS=\[([\s\S]*?)\];/);
assert(coreMatch,"service worker CORE_URLS not found");
if(coreMatch){
  for(const m of coreMatch[1].matchAll(/(?:versioned\()?["']([^"']+)["']/g)){
    let ref=m[1];
    if(ref==="/")continue;
    const clean=ref.replace(/^\//,"");
    if(clean.endsWith("/"))assert(exists(clean+"index.html"),`SW missing directory target: ${ref}`);
    else assert(exists(clean),`SW missing core asset: ${ref}`);
  }
}
note("Service-worker core paths checked");

const appStateSource=read("assets/js/app-state.js");
const launcherSource=read("assets/js/launcher.js");
assert(appStateSource.includes("function validateBackupPlausibility(")&&appStateSource.includes("function validateBackupCategoryProgress("),"Strict backup plausibility validation missing");
assert(appStateSource.includes("if(!plausibility.ok)return plausibility;"),"Backup plausibility rejection does not occur before import");
assert(!appStateSource.includes("data=imported;\n  integrityRepairInitialProgressState(data);"),"Backup import still silently repairs progress");
assert(launcherSource.includes("Dein aktueller Spielstand wurde nicht verändert."),"Strict backup rejection UX missing");
note("Strict backup plausibility/import immutability checked");

const parity=[
  "charades.json","circa-questions.json","classic-words.json","who-am-i.json"
];
for(const name of parity){
  assert(read("data/"+name)===read("ios/ImposterGames/Resources/Content/"+name),`iOS/web content parity mismatch: ${name}`);
}
note("Web/iOS shared content parity checked");

const personalHtml=read("games/personal-impostor/index.html");
const personalCss=read("assets/css/personal-impostor.css");
assert(!personalCss.includes(".personalEdgeAction{")&&!personalCss.includes(".personalEdgeActions{"),"Legacy fixed Personal edge-action CSS remains");
assert(!personalHtml.includes("personalBottomButton"),"Dead personalBottomButton marker class remains");
assert(!personalHtml.includes("personalResultActions"),"Dead personalResultActions marker class remains");
assert(personalHtml.includes('id="resultActions" class="grid2 resultActions"'),"Personal result actions do not share Circa resultActions DOM contract");
assert(!personalCss.includes("prototype-only"),"Production Personal CSS still identifies itself as prototype-only");

const gameCss=read("assets/css/game.css");
assert(gameCss.includes("#questionReveal .stageButton"),"Personal question-reveal action is missing exact shared stage-button geometry");
assert(!gameCss.includes(".resultActions{\n  margin-top:7px!important;"),"Legacy resultActions margin override still defeats shared auto anchoring");

const engine=read("assets/js/game-engine.js");
const who=read("assets/js/who-am-i.js");
const charades=read("assets/js/charades.js");
const personalJs=read("assets/js/personal-impostor.js");
assert(engine.includes("experimentStartPending=false,experimentRoundStartPending=false")&&engine.includes("if(experimentRoundStartPending)return;")&&engine.includes("if(experimentStartPending)return;"),"Circa/Classic duplicate-start guard missing");
assert(who.includes("roundStartPending=false")&&who.includes("if(roundStartPending)return;roundStartPending=true;try{"),"WhoAmI duplicate-start guard missing");
assert(charades.includes("roundStartPending=false")&&charades.includes("if(roundStartPending)return;roundStartPending=true;try{"),"Charades duplicate-start guard missing");
assert(personalJs.includes("roundStartPending=false")&&personalJs.includes("if(roundStartPending)return;roundStartPending=true;try{"),"Personal duplicate-start guard missing");

const allProdText=[
  ...htmlFiles,
  ...allFiles("assets").filter(p=>/\.(?:js|css)$/.test(p)),
  ...allFiles("data").filter(p=>p.endsWith(".json")),
  "service-worker.js","manifest.webmanifest"
].map(p=>read(p)).join("\n");
assert(!allProdText.includes("/N"),"Literal /N artifact found in production text");

console.log("\n=== AUDIT OK ===");
for(const x of ok)console.log("OK:",x);
console.log("\n=== AUDIT WARNINGS ===");
for(const x of warn)console.log("WARN:",x);
console.log("\n=== AUDIT FAILURES ===");
for(const x of fail)console.log("FAIL:",x);
console.log(`\nSummary: ${ok.length} OK groups, ${warn.length} warnings, ${fail.length} failures`);
if(fail.length)process.exit(1);
