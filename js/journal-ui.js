"use strict";

function renderJournal() {
  const entries=$("journalEntries");
  entries.replaceChildren();
  if(snapshots.length){
    const shots=document.createElement("h3");
    shots.textContent="留影";entries.append(shots);
    for(const shot of snapshots){
      const figure=document.createElement("figure");
      const img=document.createElement("img");img.src=shot.src;img.alt="留影 · "+shot.name;
      const caption=document.createElement("figcaption");caption.textContent=shot.name+" · "+shot.when;
      figure.append(img,caption);entries.append(figure);
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
}
function showJournal() {
  const choices=$("chapterChoices");
  if(!choices.childElementCount){
    const add=(label,index,line=0)=>{
      const button=document.createElement("button");
      button.type="button";button.className="chip";button.textContent=label;
      button.onclick=()=>{
        $("journalDialog").close();play();seekVoyage(index,line);
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
