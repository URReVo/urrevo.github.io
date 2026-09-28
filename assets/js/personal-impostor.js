(async function(){
"use strict";
function byId(id){return document.getElementById(id);}
var PREFIX="imposterGames.v74.game.personal.";
var STORAGE_PLAYERS=PREFIX+"players.v1",STORAGE_DECK=PREFIX+"deck.v1";
var avatarPool=["😎","🕵️","🥷","🤠","👻","🤖","🦊","🐼","🐸","🦁","🐙","🦄"];
var appState=window.CIAppState||null;
async function validateProgressBeforeRound(){
  if(!appState||typeof appState.validateProgressIntegrity!=="function")return true;
  var result=await appState.validateProgressIntegrity();
  if(!result||result.ok!==false)return true;
  byId("error").textContent="Fortschritt konnte nicht sicher geprüft werden. Bitte App neu laden oder ein gültiges Backup wiederherstellen.";
  return false;
}
var launchPreset=appState&&appState.consumeLaunchPreset?appState.consumeLaunchPreset("personal"):null;
var preferences=appState&&appState.getPreferences?appState.getPreferences():{sound:true,haptics:true,animations:true};
var soundEnabled=preferences.sound!==false,audioCtx=null,bank=[];
var count=3,players=[],savedPlayerNames=[],savedPlayerProfileIds=[],avatarSelections=[];
var currentPair=null,impostorIndex=0,activeIndex=0,answers=[],round=0,impostorCounts=[],lastImpostor=-1,currentRoundKey=null;
var revealRunning=false,revealTimers=[],sharedQuestionRevealed=false,roundStartPending=false;
var sections=["setup","handoff","question","questionReveal","answers","result"];
var personalViewportSettleTimers=[];
function answerFieldActive(){
  var active=document.activeElement;
  return !!(active&&active.id==="answerInput");
}
function personalViewportHeight(){
  var vv=window.visualViewport;
  var height=vv&&Number.isFinite(vv.height)&&vv.height>0?vv.height:window.innerHeight;
  return Math.max(1,Math.round(Number(height)||0));
}
function syncPersonalViewportHeight(){
  var height=personalViewportHeight();
  if(height>0)document.documentElement.style.setProperty("--personal-viewport-height",height+"px");
}
function clearPersonalViewportSettleTimers(){
  personalViewportSettleTimers.forEach(function(timer){clearTimeout(timer);});
  personalViewportSettleTimers=[];
}
function settlePersonalViewport(){
  clearPersonalViewportSettleTimers();
  syncPersonalViewportHeight();
  try{requestAnimationFrame(syncPersonalViewportHeight);}catch(e){}
  [80,180,320,520,760].forEach(function(delay){
    personalViewportSettleTimers.push(setTimeout(syncPersonalViewportHeight,delay));
  });
}
function storageGet(key,fallback){try{var raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw);}catch(e){return fallback;}}
function storageSet(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}
function cleanName(v){return String(v==null?"":v).trim().slice(0,24);}
function cleanAnswer(v){return String(v==null?"":v).trim().replace(/\s+/g," ").slice(0,180);}
function answerSpec(item){
  var type=item&&item.answerType||"";
  if(type)return {type:type,min:item.min,max:item.max,step:item.step,unit:item.unit||""};
  var unit=String(item&&item.unit||"");
  if(unit==="Uhrzeit")return {type:"time",unit:""};
  if(unit==="1–10")return {type:"rating",min:1,max:10,step:1,unit:"1–10"};
  if(unit==="%")return {type:"percent",min:0,max:100,step:1,unit:"%"};
  if(unit==="€")return {type:"number",min:0,step:.01,unit:"€"};
  if(unit==="Stunden")return {type:"number",min:0,step:.5,unit:unit};
  return {type:"integer",min:0,step:1,unit:unit};
}
function renderAnswerControl(){
  var wrap=byId("answerControl"),spec=answerSpec(currentPair);wrap.innerHTML="";
  var control;
  if(spec.type==="text"){
    control=document.createElement("textarea");control.rows=2;control.maxLength=180;control.placeholder="Antwort frei eingeben";
  }else if(spec.type==="time"){
    control=document.createElement("input");control.type="time";control.step=300;
  }else{
    control=document.createElement("input");control.type="number";control.inputMode=spec.step&&spec.step<1?"decimal":"numeric";control.placeholder=spec.type==="rating"?"1 bis 10":"Zahl eingeben";
    if(spec.min!==undefined&&spec.min!==null)control.min=String(spec.min);
    if(spec.max!==undefined&&spec.max!==null)control.max=String(spec.max);
    if(spec.step!==undefined&&spec.step!==null)control.step=String(spec.step);
  }
  control.id="answerInput";control.autocomplete="off";wrap.appendChild(control);
  if(spec.unit&&spec.type!=="text"){var badge=document.createElement("span");badge.className="personalAnswerUnitBadge";badge.textContent=spec.unit;wrap.appendChild(badge);}
  byId("answerFormat").textContent=spec.type==="text"?"Freie Antwort":spec.type==="time"?"Uhrzeit eingeben":spec.type==="rating"?"Nur eine Zahl von 1 bis 10":spec.type==="percent"?"Nur eine Zahl von 0 bis 100":"Nur Zahlen · "+(spec.unit||"numerische Antwort");
}
function readAnswer(){
  var input=byId("answerInput"),spec=answerSpec(currentPair);if(!input)return {ok:false};
  var raw=String(input.value||"").trim();
  if(!raw)return {ok:false,message:"Bitte gib zuerst deine Antwort ein."};
  if(spec.type==="text")return {ok:true,value:cleanAnswer(raw)};
  if(spec.type==="time")return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw)?{ok:true,value:raw}:{ok:false,message:"Bitte gib eine gültige Uhrzeit ein."};
  if(!/^\d+(?:[.,]\d+)?$/.test(raw))return {ok:false,message:"Bitte gib nur eine Zahl ein."};
  var value=Number(raw.replace(",","."));
  if(!Number.isFinite(value))return {ok:false,message:"Bitte gib nur eine Zahl ein."};
  if(spec.min!==undefined&&spec.min!==null&&value<Number(spec.min))return {ok:false,message:"Der Wert muss mindestens "+spec.min+" sein."};
  if(spec.max!==undefined&&spec.max!==null&&value>Number(spec.max))return {ok:false,message:"Der Wert darf höchstens "+spec.max+" sein."};
  var step=Number(spec.step);
  if(Number.isFinite(step)&&step>0){
    var base=spec.min!==undefined&&spec.min!==null?Number(spec.min):0;
    var units=(value-base)/step;
    if(Math.abs(units-Math.round(units))>1e-8){
      if(step===1)return {ok:false,message:"Bitte gib eine ganze Zahl ein."};
      return {ok:false,message:"Bitte in "+String(step).replace(".",",")+"er-Schritten antworten."};
    }
  }
  return {ok:true,value:String(value)};
}
function formatAnswer(value){
  var spec=answerSpec(currentPair);
  if(spec.type==="text"||spec.type==="time")return String(value);
  var num=Number(value),text=Number.isFinite(num)?num.toLocaleString("de-DE",{maximumFractionDigits:2}):String(value);
  return text+(spec.unit?" "+spec.unit:"");
}
function motionEnabled(){return preferences.animations!==false&&!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);}
function clearRevealTimers(){while(revealTimers.length)clearTimeout(revealTimers.pop());revealRunning=false;var screen=byId("answers");if(screen)screen.classList.remove("revealRunning");var button=byId("reveal");if(button){button.disabled=false;button.textContent="Auflösung";}}
function randomUnit(){try{if(window.crypto&&window.crypto.getRandomValues){var a=new Uint32Array(1);window.crypto.getRandomValues(a);return a[0]/4294967296;}}catch(e){}return Math.random();}
function randomIndex(length){return Math.floor(randomUnit()*Math.max(1,length));}
function pulse(ms){if(preferences.haptics!==false&&navigator.vibrate)try{navigator.vibrate(ms||7);}catch(e){}}
function ensureAudio(){if(!soundEnabled)return null;try{var Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return null;if(!audioCtx||audioCtx.state==="closed")audioCtx=new Ctx();if(audioCtx.state==="suspended"){var resumed=audioCtx.resume();if(resumed&&resumed.catch)resumed.catch(function(){});}return audioCtx;}catch(e){return null;}}
function restoreExistingAudio(){if(!soundEnabled||!audioCtx||audioCtx.state==="closed")return;if(audioCtx.state!=="running")ensureAudio();}
function tone(freq,duration,delay){var ctx=ensureAudio();if(!ctx)return;try{var start=ctx.currentTime+(delay||0),o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.value=freq||520;g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(.032,start+.007);g.gain.exponentialRampToValueAtTime(.0001,start+(duration||.06));o.connect(g);g.connect(ctx.destination);o.start(start);o.stop(start+(duration||.06)+.02);}catch(e){}}
function sound(kind){if(kind==="start"){tone(420,.055,0);tone(650,.075,.055);}else if(kind==="save"){tone(560,.045,0);}else if(kind==="reveal"){tone(470,.065,0);tone(760,.095,.065);}else tone(520,.04,0);}
function syncSound(){byId("soundOnIcon").classList.toggle("hidden",!soundEnabled);byId("soundOffIcon").classList.toggle("hidden",soundEnabled);byId("soundToggle").setAttribute("aria-pressed",soundEnabled?"true":"false");byId("soundToggle").setAttribute("aria-label",soundEnabled?"Sound ausschalten":"Sound einschalten");}
function resetPersonalViewport(delayed){
  function resetScroll(){
    try{window.scrollTo(0,0);}catch(e){}
    try{document.documentElement.scrollTop=0;document.body.scrollTop=0;}catch(e){}
  }
  syncPersonalViewportHeight();
  resetScroll();
  try{requestAnimationFrame(function(){syncPersonalViewportHeight();resetScroll();});}catch(e){}
  if(delayed){
    [80,180,320,520,760].forEach(function(delay){
      setTimeout(function(){syncPersonalViewportHeight();resetScroll();},delay);
    });
  }
}
function dismissAnswerKeyboard(){
  var input=byId("answerInput");
  try{if(input&&input.blur)input.blur();}catch(e){}
  settlePersonalViewport();
}
function show(id){
  sections.forEach(function(name){byId(name).classList.toggle("hidden",name!==id);});
  var active=id!=="setup";
  document.body.classList.toggle("game-active",active);
  byId("gameTopbar").classList.toggle("hidden",!active);
  if(active)byId("topRound").textContent="R"+Math.max(1,round);
  resetPersonalViewport(id!=="question");
}
function renderLoadError(message){document.body.classList.remove("booting");document.body.removeAttribute("aria-busy");var app=byId("app");app.innerHTML="";var box=document.createElement("div");box.className="personalRevealCard";box.style.marginTop="24px";var h=document.createElement("h2");h.textContent="Spiel konnte nicht geladen werden";var p=document.createElement("p");p.textContent=String(message||"Unbekannter Fehler");var a=document.createElement("a");a.href="../../";a.className="gameHubBack";a.textContent="Zurück zu den Spielen";box.append(h,p,a);app.appendChild(box);}
try{var response=await fetch("../../data/personal-impostor.json",{cache:"no-cache"});if(!response.ok)throw new Error("Fragepaare konnten nicht geladen werden ("+response.status+").");var payload=await response.json();bank=Array.isArray(payload.items)?payload.items:[];if(bank.length<20)throw new Error("Zu wenige Fragepaare in der Datenbank.");}catch(error){renderLoadError(error&&error.message||error);return;}
function validProfileId(id,name){if(!appState||!id||!appState.getProfileById)return null;var p=appState.getProfileById(id);return p&&cleanName(p.name).toLocaleLowerCase("de-DE")===cleanName(name).toLocaleLowerCase("de-DE")?p.id:null;}
function loadSavedPlayers(){var stored=storageGet(STORAGE_PLAYERS,null);if(stored&&Array.isArray(stored.players)&&stored.players.length>=3){var list=stored.players.slice(0,12);count=Math.max(3,Math.min(12,list.length));savedPlayerNames=[];savedPlayerProfileIds=[];avatarSelections=[];list.forEach(function(item,i){item=item&&typeof item==="object"?item:{};var name=cleanName(item.name)||("Spieler "+(i+1));var avatar=avatarPool.indexOf(item.avatar)!==-1?item.avatar:avatarPool[i%avatarPool.length];savedPlayerNames.push(name);savedPlayerProfileIds.push(validProfileId(item.profileId,name));avatarSelections.push(avatar);});return true;}return false;}
function applyPreferredPlayers(){var presetProfiles=launchPreset&&Array.isArray(launchPreset.profileIds)?launchPreset.profileIds.map(function(id){return appState.getProfileById(id);}).filter(function(p){return p&&!p.deletedAt;}):[];if(launchPreset&&!presetProfiles.length)count=Math.max(3,Math.min(12,Number(launchPreset.playerCount)||count));var group=appState&&appState.consumeLaunchGroup?appState.consumeLaunchGroup():null;var preferred=presetProfiles.length?presetProfiles:(group&&group.length?group:(appState&&appState.getPreferredPlayers?appState.getPreferredPlayers(count):[]));if(presetProfiles.length)count=Math.max(3,Math.min(12,presetProfiles.length));else if(group&&group.length)count=Math.max(3,Math.min(12,group.length));if(!preferred||!preferred.length)return;savedPlayerNames=[];savedPlayerProfileIds=[];avatarSelections=[];for(var i=0;i<count;i++){var p=preferred[i]||{id:null,name:"Spieler "+(i+1),avatar:avatarPool[i%avatarPool.length]};savedPlayerNames.push(cleanName(p.name)||("Spieler "+(i+1)));savedPlayerProfileIds.push(p.id||null);avatarSelections.push(avatarPool.indexOf(p.avatar)!==-1?p.avatar:avatarPool[i%avatarPool.length]);}}
function savePlayersFromInputs(){var nodes=byId("names").querySelectorAll("input"),list=[];for(var i=0;i<count;i++){var name=cleanName(nodes[i]&&nodes[i].value)||("Spieler "+(i+1));var profileId=validProfileId(savedPlayerProfileIds[i],name);savedPlayerProfileIds[i]=profileId;list.push({name:name,avatar:avatarSelections[i]||avatarPool[i%avatarPool.length],profileId:profileId});}savedPlayerNames=list.map(function(p){return p.name;});storageSet(STORAGE_PLAYERS,{players:list});}
function renderNames(){var box=byId("names");box.innerHTML="";while(savedPlayerNames.length<count)savedPlayerNames.push("Spieler "+(savedPlayerNames.length+1));while(savedPlayerProfileIds.length<count)savedPlayerProfileIds.push(null);while(avatarSelections.length<count)avatarSelections.push(avatarPool[avatarSelections.length%avatarPool.length]);savedPlayerNames=savedPlayerNames.slice(0,count);savedPlayerProfileIds=savedPlayerProfileIds.slice(0,count);avatarSelections=avatarSelections.slice(0,count);for(let i=0;i<count;i++){var row=document.createElement("div");row.className="playerRow";var av=document.createElement("button");av.type="button";av.className="playerAvatarButton";av.textContent=avatarSelections[i];av.setAttribute("aria-label","Avatar für Spieler "+(i+1)+" ändern");av.addEventListener("click",function(){var cur=avatarPool.indexOf(avatarSelections[i]);avatarSelections[i]=avatarPool[(cur+1)%avatarPool.length];av.textContent=avatarSelections[i];savePlayersFromInputs();sound("tap");pulse(5);});var inp=document.createElement("input");inp.type="text";inp.className="playerInput";inp.autocomplete="off";inp.maxLength=24;inp.value=savedPlayerNames[i];inp.placeholder="Spieler "+(i+1);inp.addEventListener("input",function(){savedPlayerProfileIds[i]=validProfileId(savedPlayerProfileIds[i],inp.value);});inp.addEventListener("blur",savePlayersFromInputs);row.append(av,inp);box.appendChild(row);}byId("minus").disabled=count<=3;byId("plus").disabled=count>=12;}
function collectPlayers(){var nodes=byId("names").querySelectorAll("input"),names=[],seen={};if(nodes.length<count)return {ok:false,message:"Spielerliste konnte nicht vollständig geladen werden."};for(var i=0;i<count;i++){var name=cleanName(nodes[i].value);if(!name)return {ok:false,message:"Bitte für jeden Spieler einen Namen eintragen."};var key=name.toLocaleLowerCase("de-DE");if(seen[key])return {ok:false,message:"Jeder Spieler braucht einen anderen Namen."};seen[key]=true;names.push(name);}players=[];for(var j=0;j<count;j++){var profileId=validProfileId(savedPlayerProfileIds[j],names[j]);if(!profileId&&appState&&appState.ensureProfileForPlayer&&!/^spieler\s+\d+$/i.test(names[j]))profileId=appState.ensureProfileForPlayer({name:names[j],avatar:avatarSelections[j]});savedPlayerProfileIds[j]=profileId||null;players.push({name:names[j],avatar:avatarSelections[j]||avatarPool[j%avatarPool.length],profileId:profileId||null});}savePlayersFromInputs();return {ok:true};}
function drawPair(){var used=storageGet(STORAGE_DECK,[]);if(!Array.isArray(used))used=[];var available=bank.filter(function(item){return used.indexOf(String(item.id))===-1;});if(!available.length){used=[];available=bank.slice();}var picked=available[randomIndex(available.length)];if(!picked)return null;used.push(String(picked.id));storageSet(STORAGE_DECK,used);return picked;}
function resetFairness(){impostorCounts=Array(players.length).fill(0);lastImpostor=-1;}
function selectImpostor(){if(impostorCounts.length!==players.length)resetFairness();var min=Math.min.apply(null,impostorCounts),candidates=[];for(var i=0;i<impostorCounts.length;i++)if(impostorCounts[i]===min)candidates.push(i);if(candidates.length>1&&lastImpostor!==-1)candidates=candidates.filter(function(i){return i!==lastImpostor;});var chosen=candidates[randomIndex(candidates.length)];impostorCounts[chosen]++;lastImpostor=chosen;return chosen;}
function startParty(){var result=collectPlayers();if(!result.ok){byId("error").textContent=result.message;return;}byId("error").textContent="";resetFairness();round=0;startRound(true);}
async function startRound(useExisting){if(roundStartPending)return;roundStartPending=true;try{clearRevealTimers();if(!useExisting&&players.length<3){var setupResult=collectPlayers();if(!setupResult.ok){byId("error").textContent=setupResult.message;return;}byId("error").textContent="";resetFairness();round=0;}if(!(await validateProgressBeforeRound()))return;var pair=drawPair();if(!pair){byId("error").textContent="Keine Fragepaare verfügbar.";show("setup");return;}currentPair=pair;impostorIndex=selectImpostor();activeIndex=0;answers=Array(players.length).fill("");round++;currentRoundKey="personal_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);if(appState&&appState.beginSession){appState.beginSession(players);if(appState.setActiveSessionGame)appState.setActiveSessionGame("personal","Runde "+round,true);}showHandoff();sound("start");pulse(8);}finally{roundStartPending=false;}}
function showHandoff(){var p=players[activeIndex];byId("handoffAvatar").textContent=p.avatar;byId("handoffName").textContent=p.name;if(appState&&appState.setActiveSessionGame)appState.setActiveSessionGame("personal","Runde "+round+" · Spieler "+(activeIndex+1)+"/"+players.length,false);show("handoff");}
function showQuestion(){var p=players[activeIndex],isImpostor=activeIndex===impostorIndex;byId("questionAvatar").textContent=p.avatar;byId("questionName").textContent=p.name;byId("questionProgress").textContent=(activeIndex+1)+"/"+players.length;byId("questionText").textContent=isImpostor?currentPair.impostor:currentPair.normal;renderAnswerControl();byId("answerError").textContent="";show("question");sound("tap");pulse(6);setTimeout(function(){var input=byId("answerInput");try{input&&input.focus({preventScroll:true});}catch(e){try{input&&input.focus();}catch(e2){}}},180);}
function saveAnswer(){var parsed=readAnswer();if(!parsed.ok){byId("answerError").textContent=parsed.message||"Bitte gib zuerst deine Antwort ein.";pulse(12);return;}answers[activeIndex]=parsed.value;byId("answerError").textContent="";dismissAnswerKeyboard();sound("save");pulse(7);if(activeIndex<players.length-1){activeIndex++;showHandoff();}else showSharedQuestionReveal();}
function showSharedQuestionReveal(){
  clearRevealTimers();
  sharedQuestionRevealed=false;
  var card=byId("sharedQuestionCard"),text=byId("sharedQuestionText"),button=byId("revealSharedQuestion");
  card.classList.add("concealed");
  card.classList.remove("revealed");
  text.textContent="?";
  button.textContent="Richtige Frage aufdecken";
  show("questionReveal");sound("start");pulse(9);
}
function toggleSharedQuestionReveal(){
  var card=byId("sharedQuestionCard"),text=byId("sharedQuestionText"),button=byId("revealSharedQuestion");
  if(!sharedQuestionRevealed){
    sharedQuestionRevealed=true;
    text.textContent=currentPair.normal;
    card.classList.remove("concealed");
    card.classList.add("revealed");
    button.textContent="Antworten anzeigen";
    sound("reveal");pulse(12);
    return;
  }
  renderAnswers();
}
function renderAnswers(){clearRevealTimers();byId("answersSharedQuestion").textContent=currentPair.normal;var box=byId("answersList");box.innerHTML="";players.forEach(function(player,index){var row=document.createElement("div");row.className="personalAnswerRow";row.dataset.playerIndex=String(index);var av=document.createElement("div");av.className="personalAnswerAvatar";av.textContent=player.avatar;var info=document.createElement("div");info.className="personalAnswerInfo";var name=document.createElement("span");name.textContent=player.name;var value=document.createElement("strong");value.textContent=formatAnswer(answers[index]);info.append(name,value);var mark=document.createElement("div");mark.className="impostorX";mark.textContent="×";row.append(av,info,mark);box.appendChild(row);});show("answers");sound("start");pulse(9);}
function showResolution(){var impostor=players[impostorIndex],screen=byId("result");if(appState&&appState.recordRound&&currentRoundKey){appState.recordRound({game:"personal",roundKey:currentRoundKey,qid:currentPair.id,unit:currentPair.unit||"",players:players.map(function(player,index){return {profileId:player.profileId,name:player.name,avatar:player.avatar,role:index===impostorIndex?"impostor":"normal",answer:answers[index]};})});currentRoundKey=null;}byId("resultAvatar").textContent=impostor.avatar;byId("resultName").textContent=impostor.name+" war der Impostor";byId("normalQuestion").textContent=currentPair.normal;byId("impostorQuestion").textContent=currentPair.impostor;screen.classList.remove("revealSequence");screen.querySelectorAll(".personalRevealItem").forEach(function(el){el.classList.remove("revealed");});show("result");if(!motionEnabled()){screen.querySelectorAll(".personalRevealItem").forEach(function(el){el.classList.add("revealed");});revealRunning=false;return;}screen.classList.add("revealSequence");var items=screen.querySelectorAll(".personalRevealItem");for(var i=0;i<items.length;i++){(function(el,delay){revealTimers.push(setTimeout(function(){el.classList.add("revealed");sound("save");},delay));})(items[i],120+i*260);}revealTimers.push(setTimeout(function(){screen.classList.remove("revealSequence");revealRunning=false;},120+items.length*260+420));}
function reveal(){if(revealRunning)return;revealRunning=true;var screen=byId("answers"),button=byId("reveal"),rows=byId("answersList").querySelectorAll(".personalAnswerRow");screen.classList.add("revealRunning");button.disabled=true;button.textContent="Wer ist es…?";for(var i=0;i<rows.length;i++){rows[i].classList.add("dimmed");rows[i].classList.remove("focused","impostorCaught");}var impostorRow=byId("answersList").querySelector('[data-player-index="'+impostorIndex+'"]');if(!motionEnabled()){if(impostorRow){impostorRow.classList.remove("dimmed");impostorRow.classList.add("focused","impostorCaught");}sound("reveal");pulse(14);revealTimers.push(setTimeout(showResolution,520));return;}var order=[];for(var j=0;j<players.length;j++)if(j!==impostorIndex)order.push(j);for(var oi=order.length-1;oi>0;oi--){var oj=randomIndex(oi+1),tmp=order[oi];order[oi]=order[oj];order[oj]=tmp;}var steps=Math.min(3,order.length);for(var s=0;s<steps;s++){(function(idx,delay){revealTimers.push(setTimeout(function(){for(var z=0;z<rows.length;z++)rows[z].classList.remove("focused");var candidate=byId("answersList").querySelector('[data-player-index="'+idx+'"]');if(candidate){candidate.classList.remove("dimmed");candidate.classList.add("focused");}tone(250+delay*.25,.055,0);},delay));})(order[s],260+s*260);}var finalDelay=260+steps*260+140;revealTimers.push(setTimeout(function(){for(var z=0;z<rows.length;z++){rows[z].classList.add("dimmed");rows[z].classList.remove("focused");}if(impostorRow){impostorRow.classList.remove("dimmed");impostorRow.classList.add("focused","impostorCaught");}button.textContent="Auflösung…";sound("reveal");pulse(14);},finalDelay));revealTimers.push(setTimeout(showResolution,finalDelay+900));}
function backSetup(){clearRevealTimers();show("setup");window.scrollTo(0,0);}
function toggleSound(){soundEnabled=!soundEnabled;if(appState&&appState.setPreference)appState.setPreference("sound",soundEnabled);preferences.sound=soundEnabled;syncSound();if(soundEnabled)sound("tap");}
var hadSaved=loadSavedPlayers();if(!hadSaved||launchPreset)applyPreferredPlayers();else{var launchGroup=appState&&appState.consumeLaunchGroup?appState.consumeLaunchGroup():null;if(launchGroup&&launchGroup.length){count=Math.max(3,Math.min(12,launchGroup.length));savedPlayerNames=[];savedPlayerProfileIds=[];avatarSelections=[];for(var gi=0;gi<count;gi++){var gp=launchGroup[gi];savedPlayerNames.push(gp.name);savedPlayerProfileIds.push(gp.id);avatarSelections.push(avatarPool.indexOf(gp.avatar)!==-1?gp.avatar:avatarPool[gi%avatarPool.length]);}}}
renderNames();byId("poolCount").textContent=bank.length+" Fragepaare";syncSound();if(preferences.animations===false)document.body.classList.add("experimentReduceMotion");
byId("minus").addEventListener("click",function(){if(count>3){savePlayersFromInputs();count--;renderNames();sound("tap");pulse(5);}});
byId("plus").addEventListener("click",function(){if(count<12){savePlayersFromInputs();count++;renderNames();sound("tap");pulse(5);}});
byId("start").addEventListener("click",startParty);
byId("showQuestion").addEventListener("click",showQuestion);
byId("saveAnswer").addEventListener("click",saveAnswer);
byId("revealSharedQuestion").addEventListener("click",toggleSharedQuestionReveal);
byId("reveal").addEventListener("click",reveal);
byId("nextRound").addEventListener("click",function(){startRound(true);});
byId("backSetup").addEventListener("click",backSetup);
byId("freshRound").addEventListener("click",function(){if(players.length<3)return;if(currentRoundKey&&!window.confirm("Aktuelle Runde abbrechen und ein neues Fragepaar starten?"))return;startRound(true);});
byId("leaveGame").addEventListener("click",function(){if(currentRoundKey&&!window.confirm("Aktuelle Runde verlassen und zum Launcher zurück?"))return;clearRevealTimers();window.location.href="../../";});
byId("soundToggle").addEventListener("click",toggleSound);
if(window.PointerEvent)document.addEventListener("pointerdown",function(){if(soundEnabled)ensureAudio();},{passive:true,capture:true});
else document.addEventListener("touchstart",function(){if(soundEnabled)ensureAudio();},{passive:true,capture:true});
window.addEventListener("pageshow",restoreExistingAudio);
document.addEventListener("visibilitychange",function(){if(!document.hidden)restoreExistingAudio();});
if(window.visualViewport){
  window.visualViewport.addEventListener("resize",syncPersonalViewportHeight,{passive:true});
  window.visualViewport.addEventListener("scroll",syncPersonalViewportHeight,{passive:true});
}
window.addEventListener("resize",syncPersonalViewportHeight,{passive:true});
window.addEventListener("orientationchange",settlePersonalViewport,{passive:true});
document.addEventListener("focusin",function(event){
  if(event.target&&event.target.id==="answerInput"){
    document.body.classList.add("personalKeyboardOpen");
    syncPersonalViewportHeight();
  }
});
document.addEventListener("focusout",function(event){
  if(event.target&&event.target.id==="answerInput"){
    document.body.classList.remove("personalKeyboardOpen");
    settlePersonalViewport();
  }
});
if(appState&&appState.trackUsage){
  appState.trackUsage("personal");
  setInterval(function(){if(!document.hidden)appState.trackUsage("personal");},15000);
  window.addEventListener("pagehide",function(){if(appState.pauseUsage)appState.pauseUsage();});
  document.addEventListener("visibilitychange",function(){if(document.hidden){if(appState.pauseUsage)appState.pauseUsage();}else appState.trackUsage("personal");});
}
syncPersonalViewportHeight();show("setup");document.body.classList.remove("booting");document.body.removeAttribute("aria-busy");
})();
