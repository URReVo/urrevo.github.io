(function(){
"use strict";
function all(sel){return Array.prototype.slice.call(document.querySelectorAll(sel));}
function animationsEnabled(){
  try{
    return !(window.CIAppState&&window.CIAppState.getPreferences&&window.CIAppState.getPreferences().animations===false)
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }catch(e){return true;}
}
function installTileFeedback(){
  all(".partyGameTile").forEach(function(tile){
    tile.addEventListener("pointerdown",function(event){
      tile.classList.add("isPressed");
      if(!animationsEnabled())return;
      var rect=tile.getBoundingClientRect();
      var ripple=document.createElement("span");
      ripple.className="partyRipple";
      ripple.style.left=(event.clientX-rect.left)+"px";
      ripple.style.top=(event.clientY-rect.top)+"px";
      tile.appendChild(ripple);
      window.setTimeout(function(){ripple.remove();},600);
    });
    ["pointerup","pointercancel","pointerleave"].forEach(function(type){
      tile.addEventListener(type,function(){tile.classList.remove("isPressed");});
    });
  });
}
function installFinePointerDepth(){
  if(!window.matchMedia||!window.matchMedia("(pointer:fine)").matches||!animationsEnabled())return;
  all(".partyGameTile").forEach(function(tile){
    tile.addEventListener("pointermove",function(event){
      var rect=tile.getBoundingClientRect();
      var x=(event.clientX-rect.left)/rect.width-.5;
      var y=(event.clientY-rect.top)/rect.height-.5;
      tile.style.transform="perspective(700px) rotateX("+(-y*2)+"deg) rotateY("+(x*2.5)+"deg)";
    });
    tile.addEventListener("pointerleave",function(){tile.style.transform="";});
  });
}
function boot(){
  document.body.classList.add("party-launcher-p3");
  installTileFeedback();
  installFinePointerDepth();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();