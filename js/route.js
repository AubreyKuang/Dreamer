"use strict";

const viewingDialog = () => ["dreamDialog","helpDialog","journalDialog"].some(id=>$(id).open);
const MOON_REFLECTION_STOP=2, MOON_REFLECTION_HOLD=3.5, MOON_REFLECTION_FADE=1.8;
let moonStillTime=0, moonReflection=null, moonResultAt=null;
const GROVE_BANK_OFFSET=30, GROVE_BANK_EDGE=54;
const GROVE_SCENERY_LENGTH=370, GROVE_SCENERY_FADE=90;
const PIER_OFFSET=46, PIER_REACH=23, PIER_APPROACH=80;
const groveBankVerses={
  stones:"你贴着左岸滑行。\n桃枝遮住了石阶，只留几级在水边。",
  petals:"你滑到右侧浅湾。\n岸边的落花聚在一起，水纹从花瓣之间穿过。"
};
let groveBanks=null, groveBank=null;
let replaying=false;
function saveVoyageCheckpoint(checkpoint){
  if(!replaying)saveSetting("voyageCheckpoint",checkpoint);
}

function comparisonInView(){
  if(!routeMode)return null;
  if(chapterIndex===groveChapter&&groveBanks&&groveBank&&
      chapters[chapterIndex].lines[nextLine-1]?.[3]==="groveBanksResult"&&
      routeDistance-groveBanks.start<GROVE_SCENERY_LENGTH-GROVE_SCENERY_FADE/2){
    const offset=lateral*.61-groveBanks.x;
    if(groveBank==="stones"?offset<=-GROVE_BANK_OFFSET:offset>=GROVE_BANK_OFFSET)return groveBank;
  }
  if(chapterIndex===moonRiverChapter&&moonReflection&&
      (moonResultAt===null||storyTime-moonResultAt<MOON_REFLECTION_HOLD+MOON_REFLECTION_FADE/2))return moonReflection;
  return null;
}

function rememberVerse(chapter,lineIndex,near){
  const [,originalText,source,gesture,id]=chapter.lines[lineIndex];
  const moonResult=gesture==="moonReflectionResult";
  let text=originalText;
  if(near)text="你向那盏船灯靠了过去。\n对面举灯晃了晃。\n我自飘零，亦是行人。";
  if(gesture==="riverDawn"&&landedAtPier)text="天快亮了。你回头望去，\n渡口的灯还在远处。";
  if(moonResult&&moonReflection==="flower")text="桨停了，水里的碎光合成一朵花。\n岸上的细枝还在摇。";
  // New cues use explicit IDs so older entries retain their stored keys.
  const originalIndex=chapter.lines.slice(0,lineIndex).filter(line=>!line[4]).length;
  let entryId=id??originalIndex;
  if(near)entryId="passing-boat-near";
  if(gesture==="riverDawn"&&landedAtPier)entryId="pier-dawn";
  if(moonResult)entryId="reflection-"+(moonReflection??"ribbon");
  if(gesture==="groveBanks")entryId="grove-bank-invitation";
  const key=chapter.name+"-"+entryId;
  rememberJournalEntry(key,{name:chapter.name,text,source});
  return text;
}
function rememberJournalEntry(key,entry){
  if (!journal.has(key)) {
    journal.set(key, entry);
    journalTransaction("verses", "readwrite", tx => {
      const verses=tx.objectStore("verses");
      const existing=verses.getKey(key);
      existing.onsuccess=()=>{
        if(existing.result===undefined)verses.add({key, entry, readAt:Date.now()}, key);
      };
    }).catch(reportJournalFailure);
  }
}
function storyLine(chapter, lineIndex) {
  const gesture=chapter.lines[lineIndex][3];
  if(gesture==="groveBanks")groveBanks={x:lateral*.61,start:routeDistance};
  if(gesture==="riverPier"&&sailedTogether)riverPier={x:lateral*.61-PIER_OFFSET,start:routeDistance};
  if(gesture==="moonReflectionResult"){
    moonReflection ??= "ribbon";
    moonResultAt=storyTime;
  }
  const verse=rememberVerse(chapter,lineIndex,gesture==="passingBoat"&&metTraveller);
  if(gesture==="groveBanksResult"&&groveBank)rememberGroveBank(chapter);
  let text=gesture==="groveBanksResult"&&groveBank?verse+"\n"+groveBankVerses[groveBank]:verse;
  if(gesture==="riverPier"&&riverPier)text=landedAtPier?pierFarewell:"旅人把船灯转向左岸。\n可以靠向渡口的灯送他上岸，也可以继续顺流。";
  if(gesture==="riverPierResult"&&landedAtPier)text=verse+"\n"+pierFarewell;
  saveVoyageCheckpoint({chapter:chapter.name,line:lineIndex,metTraveller,
    ...(chapterIndex===riverChapter&&sailedTogether?{sailedTogether:true}:{}),
    ...(chapterIndex===riverChapter&&landedAtPier?{landedAtPier:true}:{}),
    ...(chapter.moonRiver&&moonReflection?{moonReflection}:{}),
    ...(chapter.grove&&groveBank?{groveBank}:{})});
  $("storyTitle").textContent=chapter.name;
  $("storyLine").textContent=text;
  $("story").classList.add("show");
  if(gesture==="wave") waveUntil=t+2.8;
  if(gesture==="petalShower"||gesture==="groveBanksResult") petalShowerAt=storyTime;
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
      saveVoyageCheckpoint({chapter:chapter.name,line:nextLine-1,moonReflection});
    }
  }
  if(chapterIndex===riverChapter){
    updatePassingBoat(chapter,dt);
    if(cue?.[3]==="riverPierResult")updateRiverPier(chapter);
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
  if(cue){
    if(cue[3]==="groveBanksResult"&&groveBanks){
      const x=lateral*.61-groveBanks.x;
      groveBank=x<=-GROVE_BANK_OFFSET?"stones":x>=GROVE_BANK_OFFSET?"petals":null;
    }
    storyLine(chapter,nextLine++);
  }
  else if(next) enterChapter(chapterIndex+1);
}
function rememberGroveBank(chapter){
  const key=chapter.name+"-bank-"+groveBank;
  rememberJournalEntry(key,{name:chapter.name,text:groveBankVerses[groveBank],source:""});
}
function groveSteeringStep(step){
  if(!routeMode||chapterIndex!==groveChapter||!groveBanks)return step;
  const remaining=GROVE_SCENERY_LENGTH-(routeDistance-groveBanks.start);
  const offset=lateral*.61-groveBanks.x;
  if(remaining<=0||Math.sign(offset)!==Math.sign(step))return step;
  const edge=smooth((GROVE_BANK_EDGE-Math.abs(offset))/(GROVE_BANK_EDGE-GROVE_BANK_OFFSET));
  return step*lerp(1,edge,smooth(remaining/80));
}
let travellerBank=null;
let metTraveller=false;
let travellerReplyUntil=0;
let sharedSailingTime=0, sailedTogether=false, sharedLightsUntil=0;
let riverPier=null, landedAtPier=false;
const pierFarewell="你陪旅人靠了岸。\n他把灯搁在木桩上，照着你重新入江。";
const SHARED_SAILING_SECONDS=2.4;
function updateRiverPier(chapter){
  if(!riverPier||landedAtPier)return;
  if(routeDistance-riverPier.start<PIER_APPROACH||Math.abs(lateral*.61-riverPier.x)>PIER_REACH)return;
  landedAtPier=true;
  rememberJournalEntry(chapter.name+"-pier-farewell",{name:chapter.name,text:pierFarewell,source:""});
  announce("旅人上了岸，渡口的灯还亮着。",4);
  saveVoyageCheckpoint({chapter:chapter.name,line:nextLine-1,metTraveller,sailedTogether,landedAtPier});
}
function updatePassingBoat(chapter,dt){
  if(sailedTogether)return;
  const boat=passingBoat();
  const gap=boat?Math.abs(boat.x-lateral*.61):Infinity;
  if(!metTraveller&&gap<18){
    metTraveller=true;
    travellerReplyUntil=t+2;
    announce("对面举灯晃了晃。松开转向，可在灯旁顺流一小段。",4);
    const verse=chapter.lines.findIndex(line=>line[3]==="passingBoat");
    if(nextLine>verse)rememberVerse(chapter,verse,true);
    saveVoyageCheckpoint({chapter:chapter.name,line:nextLine-1,metTraveller});
  }
  sharedSailingTime=metTraveller&&gap<18&&velocity>=.35&&velocity<=1.3?sharedSailingTime+dt:0;
  if(sharedSailingTime<SHARED_SAILING_SECONDS)return;
  sailedTogether=true;
  sharedLightsUntil=t+4;
  travellerReplyUntil=sharedLightsUntil;
  const text="两盏灯在江上并行。\n一段水路，有人与你同去。";
  rememberJournalEntry(chapter.name+"-shared-sailing",{name:chapter.name,text,source:""});
  announce("两盏灯在江上并行，一段水路有人同去。",4);
  saveVoyageCheckpoint({chapter:chapter.name,line:nextLine-1,metTraveller,sailedTogether});
}
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
  sharedSailingTime=0;sailedTogether=false;sharedLightsUntil=0;
  riverPier=null;landedAtPier=false;
  groveBanks=null;groveBank=null;
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

function seekVoyage(index,line=0,met=false,reflection=null,bank=null,shared=false,landed=false){
  leaveFreeRoam();
  enterChapter(index,true);
  const chapter=chapters[index];
  nextLine=line+1;
  distance=routePosition=routeDistance=chapter.at+chapter.lines[line][0];
  lateral=position=0;
  sailedTogether=index===riverChapter&&shared;
  landedAtPier=sailedTogether&&landed;
  metTraveller=met||sailedTogether;
  if(chapter.moonRiver){
    const resultLine=chapter.lines.findIndex(cue=>cue[3]==="moonReflectionResult");
    if(line<=resultLine&&(reflection==="flower"||reflection==="ribbon"))moonReflection=reflection;
  }
  if(chapter.grove){
    if(Object.hasOwn(groveBankVerses,bank))groveBank=bank;
    if(chapter.lines[line][3]==="groveBanksResult"){
      const side=groveBank==="stones"?-1:groveBank==="petals"?1:0;
      const invitation=chapter.lines.find(cue=>cue[3]==="groveBanks");
      groveBanks={x:0,start:chapter.at+invitation[0]};
      lateral=position=side*GROVE_BANK_OFFSET/.61;
    }
    changeDream(sceneForChapter(chapter));
  }
  storyLine(chapter,line);
}
