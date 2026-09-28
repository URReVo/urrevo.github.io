(function(){
"use strict";
function qs(sel,root){return (root||document).querySelector(sel);}
function animationsEnabled(){
  try{
    return !(window.CIAppState&&window.CIAppState.getPreferences&&window.CIAppState.getPreferences().animations===false)
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }catch(e){return true;}
}
function installAmbient(){
  if(qs(".partyAmbient"))return;
  var layer=document.createElement("div");
  layer.className="partyAmbient";
  layer.setAttribute("aria-hidden","true");
  var noise=document.createElement("div");
  noise.className="partyNoise";
  layer.appendChild(noise);
  document.body.prepend(layer);
}
function boot(){
  document.body.classList.add("party-makeover");
  document.body.classList.toggle("partyNoMotion",!animationsEnabled());
  installAmbient();
  var meta=qs('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content","#090b13");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();