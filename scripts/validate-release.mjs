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
assert(html["index.html"].includes("launcher.js?v="+release),"launcher.js version mismatch");
assert(html["index.html"].includes("pwa.js?v="+release),"launcher pwa version mismatch");

const sw=read("service-worker.js");
const swRelease=(sw.match(/const RELEASE="([^"]+)"/)||[])[1];
assert(swRelease===release,"service worker RELEASE mismatch");
assert(!sw.includes("skipWaiting"),"service worker must not force skipWaiting");
assert(!sw.includes("localStorage"),"service worker must not touch localStorage");
assert(sw.includes("caches.delete(CACHE_NAME)"),"failed install cache cleanup missing");

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

console.log("Release validation OK · V"+release+" · "+questions.items.length+" Circa pairs · "+words.items.length+" Classic words");
