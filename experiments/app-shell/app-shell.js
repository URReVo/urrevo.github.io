(function(){
"use strict";

var PREFIX="ciExperiment.appShell.";
var avatars=["😎","🕵️","🥷","🤠","👻","🤖","🦊","🐼","🐸","🦁","🐙","🦄"];
var state={
  name:"Spieler",
  avatar:"😎",
  sound:true,
  haptics:true,
  animations:true
};

function load(){
  try{
    var raw=localStorage.getItem(PREFIX+"state");
    if(raw){
      var saved=JSON.parse(raw);
      if(saved&&typeof saved==="object"){
        state.name=String(saved.name||state.name).slice(0,18);
        if(avatars.indexOf(saved.avatar)!==-1)state.avatar=saved.avatar;
        state.sound=saved.sound!==false;
        state.haptics=saved.haptics!==false;
        state.animations=saved.animations!==false;
      }
    }
  }catch(e){}
}
function save(){
  try{localStorage.setItem(PREFIX+"state",JSON.stringify(state));}catch(e){}
}
function byId(id){return document.getElementById(id);}
function updateGreeting(){
  var hour=new Date().getHours();
  var text=hour<11?"Guten Morgen":hour<18?"Hallo":"Guten Abend";
  byId("greeting").textContent=text;
}
function syncProfile(){
  byId("headerAvatar").textContent=state.avatar;
  byId("headerName").textContent=state.name;
  byId("avatarPicker").textContent=state.avatar;
  byId("profileNameDisplay").textContent=state.name;
  byId("profileName").value=state.name;
  byId("settingSound").checked=state.sound;
  byId("settingHaptics").checked=state.haptics;
  byId("settingAnimations").checked=state.animations;
  document.documentElement.classList.toggle("reduceExperimentMotion",!state.animations);
}
function setView(name){
  document.querySelectorAll(".view").forEach(function(view){
    view.classList.toggle("active",view.id==="view-"+name);
  });
  document.querySelectorAll(".tab").forEach(function(tab){
    tab.classList.toggle("active",tab.getAttribute("data-view")===name);
  });
  window.scrollTo({top:0,behavior:state.animations?"smooth":"auto"});
}
function openSheet(id){
  byId("sheetBackdrop").classList.remove("hidden");
  byId("sheetBackdrop").setAttribute("aria-hidden","false");
  byId(id).classList.remove("hidden");
}
function closeSheets(){
  byId("sheetBackdrop").classList.add("hidden");
  byId("sheetBackdrop").setAttribute("aria-hidden","true");
  document.querySelectorAll(".bottomSheet").forEach(function(sheet){sheet.classList.add("hidden");});
}
function renderAvatars(){
  var grid=byId("avatarGrid");
  grid.textContent="";
  avatars.forEach(function(avatar){
    var button=document.createElement("button");
    button.type="button";
    button.className="avatarChoice"+(avatar===state.avatar?" selected":"");
    button.textContent=avatar;
    button.setAttribute("aria-label","Avatar "+avatar+" auswählen");
    button.addEventListener("click",function(){
      state.avatar=avatar;
      renderAvatars();
    });
    grid.appendChild(button);
  });
}
function openProfileEditor(){
  byId("profileName").value=state.name;
  renderAvatars();
  openSheet("profileSheet");
}

load();
updateGreeting();
syncProfile();
renderAvatars();

document.querySelectorAll(".tab").forEach(function(tab){
  tab.addEventListener("click",function(){setView(tab.getAttribute("data-view"));});
});
byId("profileButton").addEventListener("click",function(){setView("profile");});
byId("settingsShortcut").addEventListener("click",function(){setView("settings");});
byId("editProfile").addEventListener("click",openProfileEditor);
byId("avatarPicker").addEventListener("click",openProfileEditor);

byId("saveProfile").addEventListener("click",function(){
  var value=byId("profileName").value.trim();
  state.name=value||"Spieler";
  save();
  syncProfile();
  closeSheets();
});

document.querySelectorAll(".closeSheet").forEach(function(button){button.addEventListener("click",closeSheets);});
byId("sheetBackdrop").addEventListener("click",closeSheets);

document.querySelectorAll(".presetCard").forEach(function(card){
  card.addEventListener("click",function(){
    byId("presetTitle").textContent=card.getAttribute("data-preset")||"Preset";
    byId("presetGame").textContent=card.getAttribute("data-game")||"";
    byId("presetDetail").textContent=card.getAttribute("data-detail")||"";
    var game=card.getAttribute("data-game")||"";
    byId("presetOpenGame").setAttribute("data-href",game.indexOf("Klassisch")===0?"../../games/classic-imposter/":"../../games/circa-imposter/");
    openSheet("presetSheet");
  });
});
byId("presetOpenGame").addEventListener("click",function(){
  var href=byId("presetOpenGame").getAttribute("data-href");
  if(href)window.location.href=href;
});

byId("openSession").addEventListener("click",function(){openSheet("sessionSheet");});
byId("sessionCard").addEventListener("click",function(){openSheet("sessionSheet");});

["Sound","Haptics","Animations"].forEach(function(key){
  var el=byId("setting"+key);
  el.addEventListener("change",function(){
    var prop=key.toLowerCase();
    state[prop]=el.checked;
    save();
    syncProfile();
  });
});

byId("resetExperiment").addEventListener("click",function(){
  if(!window.confirm("Nur die Testdaten dieses App-Shell-Prototyps zurücksetzen?"))return;
  try{
    Object.keys(localStorage).forEach(function(key){
      if(key.indexOf(PREFIX)===0)localStorage.removeItem(key);
    });
  }catch(e){}
  state={name:"Spieler",avatar:"😎",sound:true,haptics:true,animations:true};
  save();
  syncProfile();
  renderAvatars();
  setView("home");
});
})();
