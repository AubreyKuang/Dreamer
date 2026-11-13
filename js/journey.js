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
  if(document.activeElement===$("start")) $("start").blur();
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
  leaveFreeRoam();
  const phrase=word.trim();
  const newDream=/寒江|江雪|水墨|独钓/.test(phrase)?inkChapter:/镜湖|天姥|剡溪/.test(phrase)?mirrorLakeChapter:
    /箜篌|李凭/.test(phrase)?harpChapter:/春江花月夜/.test(phrase)?moonRiverChapter:-1;
  if(newDream>=0){
    dreamTheme=null;
    enterChapter(newDream,true);
    return;
  }
  if(/赤壁|水光接天|无尽藏/.test(phrase)){
    dreamTheme=null;
    enterChapter(redCliffChapter,true);
    return;
  }
  if(/不系|苏轼|东坡|黄州|惠州|儋州|逆旅/.test(phrase)){
    dreamTheme=null;
    enterChapter(riverChapter,true);
    return;
  }
  if(/归园|田居|南山|种豆|田园/.test(phrase)){
    dreamTheme=null;
    enterChapter(farmChapter,true);
    return;
  }
  if(/桃源|桃花/.test(phrase)){
    dreamTheme=null;
    enterChapter(groveChapter,true);
    return;
  }
  if(/蓝田|玉生烟/.test(phrase)){
    dreamTheme=null;
    enterChapter(jadeChapter,true);
    return;
  }
  if(/灯火|葳蕤|森林|平林|forest/i.test(phrase)){
    dreamTheme=null;
    enterChapter(forestChapter,true);
    return;
  }
  if(/扶摇|大鹏|仙鹤|九万里/.test(phrase)){
    enterChapter(cloudChapter,true);
    nextLine=flightVerse;
    routePosition=routeDistance=chapters[cloudChapter].at+chapters[cloudChapter].lines[flightVerse][0];
    travelStory(0);
    return;
  }
  if(/鲲|北冥/.test(phrase)){enterChapter(2,true);return;}
  if(/云海|云涛|天接/.test(phrase)){enterChapter(3,true);return;}
  if(/海棠/.test(phrase)){enterChapter(0,true);return;}
  routeMode=false;flight=null;pendingWhisper=false;petalShowerAt=null;
  $("story").classList.remove("show");
  const next=phrase?dreamFor(phrase):{...palettes[(current.index+1)%palettes.length],index:(current.index+1)%palettes.length,seed:Math.floor(t*13)+19,word:""};
  // A named dream stays picked until the trip is restarted; an empty word
  // just cycles to the next sky, which keeps drifting on its own.
  dreamTheme=phrase?next:null;
  changeDream(next);
  note(4);
}
