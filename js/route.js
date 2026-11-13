"use strict";

const viewingDialog = () => ["dreamDialog","helpDialog","journalDialog"].some(id=>$(id).open);
function storyLine(chapter, lineIndex) {
  const [,text,source,gesture,id]=chapter.lines[lineIndex];
  // New cues use explicit IDs so older entries retain their stored keys.
  const originalIndex=chapter.lines.slice(0,lineIndex).filter(line=>!line[4]).length;
  const key=chapter.name+"-"+(id??originalIndex);
  if (!journal.has(key)) {
    const entry = {name:chapter.name,text,source};
    journal.set(key, entry);
    journalTransaction("verses", "readwrite", tx => {
      const verses=tx.objectStore("verses");
      const existing=verses.getKey(key);
      existing.onsuccess=()=>{
        if(existing.result===undefined)verses.add({key, entry, readAt:Date.now()}, key);
      };
    }).catch(reportJournalFailure);
  }
  $("storyTitle").textContent=chapter.name;
  $("storyLine").textContent=text;
  $("story").classList.add("show");
  if(gesture==="wave") waveUntil=t+2.8;
  if(gesture==="petalShower") petalShowerAt=storyTime;
  if(gesture==="peachNight")changeDream({...current,...peachNight});
  if(gesture==="flight"){
    clearTimeout(whisperTimer);
    $("whisper").classList.remove("show");
    announcementUntil=t;
    flight={elapsed:0,duration:22,height:0,glide:0,mirrorLake:chapter.mirrorLake===true};
    note(4);
  }
  const characters=Array.from(text.replace(/\s/g,"")).length;
  storyUntil=storyTime+clamp(7+characters*.18,8,15);
  nextStoryAt=Math.max(storyUntil+2.8,gesture==="flight"?storyTime+flight.duration:0);
  if(chapter.redCliff&&lineIndex===chapter.lines.length-1)nextStoryAt+=5;
}
function travelStory(dt, sideStep=0) {
  storyTime+=dt;
  if(storyTime>=storyUntil) $("story").classList.remove("show");
  const chapter=chapters[chapterIndex], cue=chapter.lines[nextLine];
  const next=chapters[chapterIndex+1];
  const marker=cue?chapter.at+cue[0]:next?.at??Infinity;
  // Ease the chapter clock near a cue so faster skating cannot crowd out a verse.
  const step=dt*velocity*32;
  routePosition=storyTime<nextStoryAt?Math.min(marker,routePosition+step):routePosition+step;
  routeDistance=Math.max(routeDistance,routePosition);
  if(!cue&&!next&&storyTime>=nextStoryAt){
    // Keep travelling after the last verse without replaying the story.
    roamDistance+=Math.hypot(step,sideStep);
    if(roamDistance>=760){
      roamDistance-=760;
      const landscape=chapters[roamChapter%chapters.length];
      changeDream({...sceneForChapter(landscape),seed:landscape.seed+roamChapter*101});
      roamChapter++;
    }
    return;
  }
  if(routePosition<marker||storyTime<nextStoryAt)return;
  if(cue) storyLine(chapter,nextLine++);
  else if(next) enterChapter(chapterIndex+1);
}
let dreamTheme=null; // the dream the player picked; null while the story sets the sky
// A picked dream keeps tinting the sky when the story moves on: the chapter
// sets the scene, the dream is blended over it instead of being wiped.
const colorKeys=["sky","mid","line","cloud","shadow","hills","water","light"];
function sceneForChapter(chapter) {
  const scene={...palettes[chapter.index],...chapter,word:"",whale:false};
  if(chapter.grove&&chapterIndex===groveChapter&&chapter.lines.slice(0,nextLine).some(line=>line[3]==="peachNight")){
    Object.assign(scene,peachNight);
  }
  if(!dreamTheme||chapter.ink) return scene;
  for(const key of colorKeys) scene[key]=blend(scene[key],dreamTheme[key],.62);
  scene.name=dreamTheme.name;scene.icon=dreamTheme.icon;scene.weather=dreamTheme.weather;
  scene.index=dreamTheme.index;scene.seed=dreamTheme.seed;scene.whale=dreamTheme.whale;
  return scene;
}
function enterChapter(index, jump=false) {
  const chapter=chapters[index];
  if(jump) {
    routePosition=routeDistance=chapter.at;
    roamDistance=roamChapter=0;
    storyUntil=nextStoryAt=storyTime;waveUntil=0;flight=null;pendingWhisper=false;petalShowerAt=null;
    $("story").classList.remove("show");
  }
  routeMode=true;chapterIndex=index;nextLine=0;
  changeDream(sceneForChapter(chapter));
}
