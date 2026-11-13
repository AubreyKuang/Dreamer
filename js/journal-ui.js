"use strict";

const photoComparisons=[
  {chapter:groveChapter,cue:"groveBanks",views:[["stones","左岸石径"],["petals","右岸浮花"]]},
  {chapter:moonRiverChapter,cue:"moonReflection",views:[["flower","停船 · 花影"],["ribbon","顺流 · 银带"]]},
];
const replayScenes=[
  {chapter:riverChapter,line:chapters[riverChapter].lines.findIndex(line=>line[3]==="passingBoat")-1,label:"不系之舟 · 江心船灯"},
  ...photoComparisons.map(({chapter,cue})=>({
    chapter,line:chapters[chapter].lines.findIndex(line=>line[3]===cue),
    label:chapters[chapter].name+(chapter===groveChapter?" · 左右两岸":" · 停船或顺流"),
  })),
];
function journalPhoto(shot,label=shot.name){
  const figure=document.createElement("figure");
  const img=document.createElement("img");
  img.src=shot.src;img.alt=label;
  const caption=document.createElement("figcaption");
  caption.textContent=label+" · "+shot.when;
  figure.append(img,caption);
  return figure;
}
function renderPhotoComparisons(entries){
  const featured=new Set();
  for(const {chapter,views} of photoComparisons){
    const stage=chapters[chapter];
    const photos=views.map(([id])=>snapshots.find(shot=>shot.name===stage.name&&shot.comparison===id));
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
    revisit.textContent="重访"+stage.name+"的分岔";
    revisit.onclick=()=>startReplay(replayScenes.find(scene=>scene.chapter===chapter));
    entries.append(heading,pair,revisit);
  }
  return featured;
}
function renderJournal() {
  const entries=$("journalEntries");
  const previousFocus=entries.contains(document.activeElement)&&document.activeElement.textContent;
  entries.replaceChildren();
  const featured=renderPhotoComparisons(entries);
  if(snapshots.length>featured.size){
    const shots=document.createElement("h3");
    shots.textContent="留影";entries.append(shots);
    for(const shot of snapshots){
      if(featured.has(shot))continue;
      const comparison=photoComparisons.find(({chapter})=>chapters[chapter].name===shot.name);
      const label=comparison?.views.find(([id])=>id===shot.comparison)?.[1];
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
