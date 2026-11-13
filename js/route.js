"use strict";

const viewingDialog = () => ["dreamDialog","helpDialog","journalDialog"].some(id=>$(id).open);
const MOON_REFLECTION_STOP=2, MOON_REFLECTION_HOLD=3.5, MOON_REFLECTION_FADE=1.8;
let moonStillTime=0, moonReflection=null, moonResultAt=null;

function rememberVerse(chapter,lineIndex,near){
  const [,originalText,source,gesture,id]=chapter.lines[lineIndex];
  const moonResult=gesture==="moonReflectionResult";
  let text=originalText;
  if(near)text="你向那盏船灯靠了过去。\n对面举灯晃了晃。\n我自飘零，亦是行人。";
  if(moonResult&&moonReflection==="flower")text="桨停了，水里的碎光合成一朵花。\n岸上的细枝还在摇。";
  // New cues use explicit IDs so older entries retain their stored keys.
  const originalIndex=chapter.lines.slice(0,lineIndex).filter(line=>!line[4]).length;
  let entryId=id??originalIndex;
  if(near)entryId="passing-boat-near";
  if(moonResult)entryId="reflection-"+(moonReflection??"ribbon");
  const key=chapter.name+"-"+entryId;
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
  return text;
}
function storyLine(chapter, lineIndex) {
  const gesture=chapter.lines[lineIndex][3];
  if(gesture==="moonReflectionResult"){
    moonReflection ??= "ribbon";
    moonResultAt=storyTime;
  }
  const text=rememberVerse(chapter,lineIndex,gesture==="passingBoat"&&metTraveller);
  saveSetting("voyageCheckpoint",{chapter:chapter.name,line:lineIndex,metTraveller,
    ...(chapter.moonRiver&&moonReflection?{moonReflection}:{})});
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
function travelStory(dt, sideStep=0, holdingBrake=false) {
  if(!holdingBrake||storyTime>=storyUntil)storyTime+=dt;
  if(storyTime>=storyUntil) $("story").classList.remove("show");
  const chapter=chapters[chapterIndex], cue=chapter.lines[nextLine];
  const next=chapters[chapterIndex+1];
  const marker=cue?chapter.at+cue[0]:next?.at??Infinity;
  // Ease the chapter clock near a cue so faster skating cannot crowd out a verse.
  const step=dt*velocity*32;
  routePosition=storyTime<nextStoryAt?Math.min(marker,routePosition+step):routePosition+step;
  routeDistance=Math.max(routeDistance,routePosition);
  const moonResultNext=cue?.[3]==="moonReflectionResult";
  if(chapter.moonRiver&&!moonReflection&&(chapter.lines[nextLine-1]?.[3]==="moonReflection"||moonResultNext)){
    moonStillTime=holdingBrake&&velocity===0?moonStillTime+dt:0;
    if(moonStillTime>=MOON_REFLECTION_STOP){
      moonReflection="flower";
      saveSetting("voyageCheckpoint",{chapter:chapter.name,line:nextLine-1,moonReflection});
    }
  }
  if(chapterIndex===riverChapter&&!metTraveller){
    const boat=passingBoat();
    if(boat&&Math.abs(boat.x-lateral*.61)<18){
      metTraveller=true;
      travellerReplyUntil=t+2;
      announce("对面举灯晃了晃。",2);
      const verse=chapter.lines.findIndex(line=>line[3]==="passingBoat");
      if(nextLine>verse){
        rememberVerse(chapter,verse,true);
        saveSetting("voyageCheckpoint",{chapter:chapter.name,line:nextLine-1,metTraveller});
      }
    }
  }
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
  // Give a brake already in progress time to reach a complete stop at the cue.
  if(moonResultNext&&holdingBrake&&!moonReflection)return;
  if(cue) storyLine(chapter,nextLine++);
  else if(next) enterChapter(chapterIndex+1);
}
let travellerBank=null;
let metTraveller=false;
let travellerReplyUntil=0;
function passingBoat(){
  const pass=clamp((routeDistance-chapters[riverChapter].at-220)/380,0,1);
  if(!routeMode||chapterIndex!==riverChapter||pass<=0||pass>=1)return null;
  travellerBank ??= lateral*.61;
  return {pass,x:travellerBank+lerp(-76,-38,pass),z:134+138*pass};
}
function sceneForChapter(chapter) {
  const scene={...palettes[chapter.index],...chapter,word:"",whale:false};
  if(chapter.grove&&chapterIndex===groveChapter&&chapter.lines.slice(0,nextLine).some(line=>line[3]==="peachNight")){
    Object.assign(scene,peachNight);
  }
  return scene;
}
function enterChapter(index, jump=false) {
  const chapter=chapters[index];
  travellerBank=null;metTraveller=false;travellerReplyUntil=0;
  if(chapter.moonRiver){moonStillTime=0;moonReflection=null;moonResultAt=null;}
  if(jump) {
    routePosition=routeDistance=chapter.at;
    roamDistance=roamChapter=0;
    storyUntil=nextStoryAt=storyTime;waveUntil=0;flight=null;pendingWhisper=false;petalShowerAt=null;
    $("story").classList.remove("show");
  }
  routeMode=true;chapterIndex=index;nextLine=0;
  changeDream(sceneForChapter(chapter));
}

function seekVoyage(index,line=0,met=false,reflection=null){
  leaveFreeRoam();
  enterChapter(index,true);
  const chapter=chapters[index];
  nextLine=line+1;
  distance=routePosition=routeDistance=chapter.at+chapter.lines[line][0];
  lateral=position=0;
  metTraveller=met;
  if(chapter.moonRiver){
    const resultLine=chapter.lines.findIndex(cue=>cue[3]==="moonReflectionResult");
    if(line<=resultLine&&(reflection==="flower"||reflection==="ribbon"))moonReflection=reflection;
  }
  if(chapter.grove)changeDream(sceneForChapter(chapter));
  storyLine(chapter,line);
}
