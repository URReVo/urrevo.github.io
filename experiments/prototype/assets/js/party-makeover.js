(function(){
"use strict";
function qs(sel,root){return (root||document).querySelector(sel);}
function qsa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
function animations(){
  try{return !(window.CIAppState&&window.CIAppState.getPreferences&&window.CIAppState.getPreferences().animations===false)&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch(e){return true;}
}
function ambient(){
  if(qs(".partyAmbient"))return;
  var layer=document.createElement("div");layer.className="partyAmbient";layer.setAttribute("aria-hidden","true");
  var noise=document.createElement("div");noise.className="partyNoise";layer.appendChild(noise);document.body.prepend(layer);
}
function badge(){
  if(qs(".partyLabBadge"))return;
  var node=document.createElement("div");node.className="partyLabBadge";node.textContent="PARTY LAB · V74R22 · P1";node.setAttribute("aria-hidden","true");document.body.appendChild(node);
}
var COLORS={circa:"#62b6ff",classic:"#ffad57",whoami:"#a78aff",charades:"#45e0cd",personal:"#ff78c8"};
function setTheme(id){if(!COLORS[id])return;document.body.dataset.partyGame=id;var meta=qs('meta[name="theme-color"]');if(meta)meta.setAttribute("content","#090b13");}
function gameStage(){
  var grid=qs(".gameGrid");if(!grid)return;
  var cards=qsa(".gameCard[data-game-card]",grid);if(!cards.length)return;
  var ticking=false;
  function focus(){
    ticking=false;var r=grid.getBoundingClientRect(),cx=r.left+r.width/2,best=null,dist=Infinity;
    cards.forEach(function(card){var b=card.getBoundingClientRect(),d=Math.abs((b.left+b.width/2)-cx);if(d<dist){dist=d;best=card;}});
    cards.forEach(function(card){card.classList.toggle("partyFocus",card===best);});
    if(best)setTheme(best.getAttribute("data-game-card"));
  }
  grid.addEventListener("scroll",function(){if(ticking)return;ticking=true;requestAnimationFrame(focus);},{passive:true});
  window.addEventListener("resize",focus,{passive:true});focus();
  var mo=new MutationObserver(function(records){records.forEach(function(rec){var card=rec.target;if(card.classList.contains("chosenPulse")){try{card.scrollIntoView({behavior:animations()?"smooth":"auto",block:"nearest",inline:"center"});}catch(e){}setTheme(card.getAttribute("data-game-card"));}});});
  cards.forEach(function(card){mo.observe(card,{attributes:true,attributeFilter:["class"]});});
  if(window.matchMedia("(pointer:fine)").matches&&animations())cards.forEach(function(card){
    card.addEventListener("pointermove",function(ev){if(!card.classList.contains("partyFocus"))return;var b=card.getBoundingClientRect(),x=(ev.clientX-b.left)/b.width-.5,y=(ev.clientY-b.top)/b.height-.5;card.style.transform="perspective(800px) rotateX("+(-y*2.2)+"deg) rotateY("+(x*3.2)+"deg) scale(1)";});
    card.addEventListener("pointerleave",function(){card.style.transform="";});
  });
}
function reveal(){
  if(!("IntersectionObserver" in window)||!animations())return;
  var nodes=qsa(".sectionBlock,.bigStat,.profileLevelCard");
  nodes.forEach(function(n){n.style.opacity=".001";n.style.transform="translateY(10px)";});
  var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(!e.isIntersecting)return;e.target.style.transition="opacity .38s ease,transform .38s cubic-bezier(.2,.8,.2,1)";e.target.style.opacity="1";e.target.style.transform="none";io.unobserve(e.target);});},{threshold:.08});
  nodes.forEach(function(n){io.observe(n);});
}
function boot(){
  document.body.classList.add("party-makeover");document.body.classList.toggle("partyNoMotion",!animations());ambient();badge();
  if(document.body.classList.contains("party-launcher")){gameStage();reveal();}
  var game=document.body.getAttribute("data-game"),map={"who-am-i":"whoami","personal-impostor":"personal"};if(game)setTheme(map[game]||game);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();