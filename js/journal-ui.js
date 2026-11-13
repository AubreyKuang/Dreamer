"use strict";

const photoComparisons=[
  {chapter:groveChapter,cue:"groveBanks",label:"左右两岸",views:[["stones","左岸石径"],["petals","右岸浮花"]]},
  {chapter:moonRiverChapter,cue:"moonReflection",label:"停船或顺流",views:[["flower","停船 · 花影"],["ribbon","顺流 · 银带"]]},
  {chapter:mirrorLakeChapter,cue:"flight",label:"云上月与水中月",views:[["sky","抬升 · 云上月"],["water","俯瞰 · 水中月"]]},
  {chapter:jadeChapter,cue:"jadeLight",label:"循光看山",views:[["jade-light","循光 · 玉色山脚"],["jade-wait","等雾 · 溪心双峰"]]},
];
const replayScenes=[
  {chapter:riverChapter,line:chapters[riverChapter].lines.findIndex(line=>line[3]==="passingBoat")-1,label:"不系之舟 · 江心船灯"},
  {chapter:harpChapter,line:chapters[harpChapter].lines.findIndex(line=>line[3]==="harpListen"),label:"李凭箜篌引 · 两岸弦声"},
  {chapter:fireflyChapter,line:chapters[fireflyChapter].lines.findIndex(line=>line[3]==="fireflyPause"),label:"天河星原 · 袖口萤火"},
  ...photoComparisons.map(({chapter,cue,label})=>({
    chapter,line:chapters[chapter].lines.findIndex(line=>line[3]===cue),
    label:chapters[chapter].name+" · "+label,
  })),
];
let replayPreviewUrls=[];
const replayGuesses=new WeakMap();
const replayDifferenceLabels={
  match:"接近旧取景",window:"错过取景时段",mist:"雾况或散雾方式",shoal:"浅滩倒影",side:"左右位置",depth:"快门早晚",
};
function journalPhoto(shot,label=shot.name){
  const figure=document.createElement("figure");
  const img=document.createElement("img");
  img.src=shot.src;img.alt=label;
  const caption=document.createElement("figcaption");
  caption.textContent=label+(shot.jadePose?.shoal===true?" · 浅滩倒影":"")+" · "+shot.when;
  figure.append(img,caption);
  const pose=shot.jadePose;
  if(shot.name===chapters[jadeChapter].name&&Number.isFinite(pose?.side)&&Number.isFinite(pose.depth)&&typeof pose.cleared==="boolean"){
    const compare=document.createElement("button");
    compare.type="button";compare.className="chip";compare.textContent="带上这张留影重访";
    compare.onclick=()=>startPhotoReplay(shot);
    figure.append(compare);
  }
  return figure;
}
function journalReplayComparison(shot){
  const details=document.createElement("details");
  details.className="replay-comparison";
  const summary=document.createElement("summary");
  summary.textContent="对照复拍 · "+shot.when;
  const pair=document.createElement("div");
  pair.className="photo-comparison";
  const reference={name:shot.name,...shot.replay};
  reference.src=URL.createObjectURL(reference.blob);
  replayPreviewUrls.push(reference.src);
  const old=journalPhoto(reference,"旧取景");
  old.querySelector("figcaption").textContent="旧取景";
  const retry=old.querySelector("button");
  retry.textContent="沿用旧图重试";
  retry.onclick=()=>startPhotoReplay(reference,false);
  const next=journalPhoto(shot,"本次复拍");
  const reuse=next.querySelector("button");
  if(reuse)reuse.textContent="用新角度重访";
  pair.append(old,next);
  const feedback=document.createElement("details");
  feedback.className="replay-feedback";
  const reveal=document.createElement("summary");
  reveal.textContent="查看取景反馈";
  const result=document.createElement("p");
  result.textContent=shot.replay.result;
  const check=document.createElement("p");
  check.hidden=true;
  feedback.append(reveal,check,result);
  const picker=document.createElement("label");
  picker.className="replay-guess";
  picker.textContent="你觉得主要差在哪？（可跳过）";
  const choice=document.createElement("select");
  choice.append(new Option("先看一看",""));
  for(const [key,label] of Object.entries(replayDifferenceLabels))choice.append(new Option(label,key));
  picker.append(choice);
  const guess=replayGuesses.get(shot)||{choice:"",revealed:false};
  choice.value=guess.choice;
  choice.disabled=guess.revealed;
  const showCheck=()=>{
    if(!guess.choice)return;
    const actual=photoReplayDifference(shot.jadePose,reference.jadePose);
    check.hidden=false;
    check.textContent=guess.choice===actual?`你的判断一致：${replayDifferenceLabels[actual]}。`
      :`你选了「${replayDifferenceLabels[guess.choice]}」。手记优先提示「${replayDifferenceLabels[actual]}」。`;
  };
  choice.addEventListener("change",()=>{
    guess.choice=choice.value;
    replayGuesses.set(shot,guess);
  });
  if(guess.revealed)showCheck();
  feedback.addEventListener("toggle",()=>{
    if(!feedback.open||guess.revealed)return;
    guess.revealed=true;
    choice.disabled=true;
    replayGuesses.set(shot,guess);
    showCheck();
  });
  details.append(summary,pair,picker,feedback);
  return details;
}
function renderPhotoComparisons(entries){
  const featured=new Set();
  for(const {chapter,views} of photoComparisons){
    const stage=chapters[chapter];
    const photos=views.map(([id])=>snapshots.find(shot=>shot.name===stage.name&&photoComparison(shot)===id));
    if(!photos.some(Boolean))continue;
    const heading=document.createElement("h3");
    heading.textContent=stage.name+" · 两种走法";
    const pair=document.createElement("div");
    pair.className="photo-comparison";
    for(const [i,[,label]] of views.entries()){
      const shot=photos[i];
      if(shot){featured.add(shot);pair.append(journalPhoto(shot,label));}
      else{
        const empty=document.createElement("p");
        empty.textContent=label+" · 尚未留影";
        pair.append(empty);
      }
    }
    const revisit=document.createElement("button");
    revisit.type="button";revisit.className="chip photo-revisit";
    const missing=photos.findIndex(shot=>!shot);
    revisit.textContent=chapter===jadeChapter&&missing!==-1
      ? "重访蓝田日暖 · 补拍"+(missing===0?"山脚":"双峰")
      : "重访"+stage.name+"的分岔";
    revisit.onclick=()=>startReplay(replayScenes.find(scene=>scene.chapter===chapter));
    entries.append(heading,pair,revisit);
  }
  return featured;
}
function renderJournal() {
  const entries=$("journalEntries");
  const previousFocus=entries.contains(document.activeElement)&&document.activeElement.textContent;
  entries.replaceChildren();
  for(const url of replayPreviewUrls)URL.revokeObjectURL(url);
  replayPreviewUrls=[];
  const featured=renderPhotoComparisons(entries);
  for(const shot of snapshots){
    if(shot.name===chapters[jadeChapter].name&&shot.replay?.blob instanceof Blob&&
      Number.isFinite(shot.replay.jadePose?.side)&&Number.isFinite(shot.replay.jadePose.depth)&&
      typeof shot.replay.jadePose.cleared==="boolean"&&typeof shot.replay.result==="string"){
      entries.append(journalReplayComparison(shot));
      featured.add(shot);
    }
  }
  if(snapshots.length>featured.size){
    const shots=document.createElement("h3");
    shots.textContent="留影";entries.append(shots);
    for(const shot of snapshots){
      if(featured.has(shot))continue;
      const comparison=photoComparisons.find(({chapter})=>chapters[chapter].name===shot.name);
      const label=comparison?.views.find(([id])=>id===photoComparison(shot))?.[1];
      entries.append(journalPhoto(shot,label?shot.name+" · "+label:shot.name));
    }
  }
  if(!journal.size && !snapshots.length) entries.textContent="启航后，旅途中读过的话会留在这里。";
  let lastChapter="";
  for(const {name,text,source} of journal.values()){
    if(name!==lastChapter){
      const title=document.createElement("h3");
      title.textContent=name;entries.append(title);lastChapter=name;
    }
    const line=document.createElement("p");
    line.textContent=text;
    if(source){
      const attribution=document.createElement("cite");
      attribution.textContent=source;line.append(attribution);
    }
    entries.append(line);
  }
  if(previousFocus){
    [...entries.querySelectorAll("button")].find(button=>button.textContent===previousFocus)?.focus({preventScroll:true});
  }
}
function showJournal() {
  const replayChoices=$("replayChoices");
  if(!replayChoices.childElementCount){
    for(const scene of replayScenes){
      const button=document.createElement("button");
      button.type="button";button.className="chip";button.textContent=scene.label;
      button.onclick=()=>startReplay(scene);
      replayChoices.append(button);
    }
  }
  const choices=$("chapterChoices");
  if(!choices.childElementCount){
    const add=(label,index,line=0)=>{
      const button=document.createElement("button");
      button.type="button";button.className="chip";button.textContent=label;
      button.onclick=()=>{
        $("journalDialog").close();play();
        endReplay();
        seekVoyage(index,line);
      };
      choices.append(button);
    };
    chapters.forEach((chapter,index)=>{
      add(chapter.name,index);
      if(index===cloudChapter)add("扶摇",index,flightVerse);
    });
  }
  renderJournal();
  $("journalDialog").showModal();
}
