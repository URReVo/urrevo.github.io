(async function(){
"use strict";
var list=document.getElementById("gameList");
function createCard(game){
  var a=document.createElement("a");a.className="gameCard";a.href=game.path;a.setAttribute("aria-label",game.title+" öffnen");
  var icon=document.createElement("div");icon.className="gameIcon";icon.textContent=game.icon||"🎮";
  var info=document.createElement("div");info.className="gameInfo";
  var title=document.createElement("div");title.className="gameTitle";title.textContent=game.title;
  var desc=document.createElement("div");desc.className="gameDesc";desc.textContent=game.description||"";
  var meta=document.createElement("div");meta.className="gameMeta";meta.textContent=game.meta||"";
  info.appendChild(title);info.appendChild(desc);info.appendChild(meta);
  var arrow=document.createElement("div");arrow.className="gameArrow";arrow.textContent="›";
  a.appendChild(icon);a.appendChild(info);a.appendChild(arrow);return a;
}
try{
  var response=await fetch("data/games.json",{cache:"no-cache"});
  if(!response.ok)throw new Error("Spielekatalog konnte nicht geladen werden.");
  var payload=await response.json();
  var games=Array.isArray(payload)?payload:payload.games;
  if(!Array.isArray(games)||!games.length)throw new Error("Keine Spiele verfügbar.");
  list.innerHTML="";
  games.forEach(function(game){list.appendChild(createCard(game));});
}catch(error){list.innerHTML='<div class="launcherError">Die Spiele konnten gerade nicht geladen werden.</div>';}
})();