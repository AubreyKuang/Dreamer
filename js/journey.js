"use strict";

function announce(message, seconds=3.7) {
  announcementUntil=t+seconds;
  $("whisper").textContent=message;
  $("whisper").classList.add("show");
  clearTimeout(whisperTimer);
  whisperTimer=setTimeout(()=>$("whisper").classList.remove("show"),seconds*1000);
}
function play(){
  if(start) return;
  start=true;
  document.body.classList.add("playing");
  if([$("start"),$("continueVoyage")].includes(document.activeElement)) canvas.focus({preventScroll:true});
}
function changeDream(next) {
  // Keep the visible composite when a second change interrupts the dissolve.
  if(transition<1 && oldCache) {
    const snapshot=document.createElement("canvas");
    snapshot.width=cache.width;snapshot.height=cache.height;
    const c=snapshot.getContext("2d");
    c.drawImage(oldCache,0,0);c.globalAlpha=smooth(transition);c.drawImage(cache,0,0);
    oldCache=snapshot;
    const mix=smooth(transition);
    previous={...current,light:blend(previous.light,current.light,mix),water:blend(previous.water,current.water,mix)};
  } else { previous=current; oldCache=cache; }
  current=next; cache=paintSky(current);
  transition=0; timeInDream=0;
  $("sceneName").textContent=next.name;
  $("sceneIcon").textContent=next.icon;
  $("weather").textContent=next.weather;
  setScore(next);
}
function setWord(word){
  $("dreamDialog").close();
  play();
  if(!freeRoam)toggleFreeRoam();
  const phrase=word.trim();
  const index=(current.index+1)%palettes.length;
  const next=phrase?dreamFor(phrase):{...palettes[index],index,seed:Math.floor(t*13)+19,word:""};
  changeDream(next);
  note(4);
}
