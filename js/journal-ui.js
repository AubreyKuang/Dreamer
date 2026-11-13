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
const pendingJadePairOrders=new WeakSet();
function journalPhoto(shot,label=shot.name){
  const figure=document.createElement("figure");
  const img=document.createElement("img");
  img.src=shot.src;img.alt=label;
  const caption=document.createElement("figcaption");
  const shoal=shot.jadePose?.shoal===true;
  caption.textContent=label+(shoal&&label!=="浅滩倒影"?" · 浅滩倒影":"")+
    (shoal&&typeof shot.jadePose.shoalCalm==="boolean"?(shot.jadePose.shoalCalm?" · 静影":" · 水纹"):"")+" · "+shot.when;
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
  const differenceLabels={match:"接近旧取景",window:"错过取景时段",...JADE_REPLAY_FOCUS};
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
  const next=journalPhoto(shot,"本次复拍");
  const reuse=next.querySelector("button");
  if(reuse)reuse.textContent="用新角度重访";
  pair.append(old,next);
  const feedback=document.createElement("details");
  feedback.className="replay-feedback";
  const reveal=document.createElement("summary");
  reveal.textContent="查看取景反馈";
  feedback.append(reveal);
  const result=document.createElement("p");
  result.textContent=shot.replay.result;
  if(typeof shot.replay.planResult==="string"){
    const planResult=document.createElement("p");
    planResult.textContent=shot.replay.planResult;
    feedback.append(planResult);
  }
  if(typeof shot.replay.focusResult==="string"){
    const practice=document.createElement("p");
    practice.textContent=(shot.replay.practiceHint?"拍摄前用过单次提示。":shot.replay.practiceGuided?"拍摄时开启了专项提示。":"")+shot.replay.focusResult;
    feedback.append(practice);
  }
  if(shot.replay.practiceSeries){
    const recent=snapshots.filter(({replay})=>replay?.practiceSeries===shot.replay.practiceSeries&&
      typeof replay.focusResult==="string").slice(0,4).reverse();
    if(recent.length>1){
      const heading=document.createElement("p");
      heading.textContent="这组最近的练习（由早到晚）";
      const history=document.createElement("ol");
      for(const entry of recent){
        const item=document.createElement("li");
        const help=entry.replay.practiceHint?"用过单次提示 · ":entry.replay.practiceGuided?"有专项提示 · ":"";
        item.textContent=entry.when+" · "+help+entry.replay.focusResult;
        history.append(item);
      }
      feedback.append(heading,history);
    }
  }
  const check=document.createElement("p");
  check.hidden=true;
  feedback.append(check,result);
  const picker=document.createElement("label");
  picker.className="replay-guess";
  picker.textContent="你觉得主要差在哪？（可跳过）";
  const choice=document.createElement("select");
  choice.append(new Option("先看一看",""));
  for(const [key,label] of Object.entries(differenceLabels))choice.append(new Option(label,key));
  picker.append(choice);
  const guess=replayGuesses.get(shot)||{choice:"",revealed:false};
  choice.value=guess.choice;
  choice.disabled=guess.revealed;
  const showCheck=()=>{
    if(!guess.choice)return;
    const actual=photoReplayDifference(shot.jadePose,reference.jadePose);
    check.hidden=false;
    check.textContent=guess.choice===actual?`你的判断一致：${differenceLabels[actual]}。`
      :`你选了「${differenceLabels[guess.choice]}」。手记优先提示「${differenceLabels[actual]}」。`;
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
  const focusPicker=document.createElement("label");
  focusPicker.className="replay-guess";
  focusPicker.textContent="下一趟专练";
  const area=document.createElement("select");
  area.append(new Option("不限",""));
  for(const [key,label] of Object.entries(JADE_REPLAY_FOCUS))area.append(new Option(label,key));
  if(Object.hasOwn(JADE_REPLAY_FOCUS,shot.replay.practiceArea))area.value=shot.replay.practiceArea;
  focusPicker.append(area);
  const planPicker=document.createElement("label");
  planPicker.className="replay-guess";
  planPicker.textContent="这趟打算怎么拍";
  const plans=document.createElement("select");
  plans.append(new Option("不设计划",""));
  for(const [key,{label}] of Object.entries(JADE_REPLAY_PLANS))plans.append(new Option(label,key));
  planPicker.append(plans);
  retry.addEventListener("click",()=>startPhotoReplay(reference,false,area.value?startJadePractice(shot,area.value):null,false,plans.value));
  const single=document.createElement("button");
  single.type="button";single.className="chip";single.textContent="带一次提示重试";
  single.disabled=!area.value;
  area.addEventListener("change",()=>{single.disabled=!area.value;});
  single.onclick=()=>startPhotoReplay(reference,false,{...startJadePractice(shot,area.value),singleHint:true},false,plans.value);
  details.append(summary,pair,picker,feedback,focusPicker,planPicker,retry,single);
  const {practiceArea,practiceGuided,practiceHint}=shot.replay;
  if((practiceGuided||practiceHint)&&shot.jadePose&&Object.hasOwn(JADE_REPLAY_FOCUS,practiceArea)){
    const verify=document.createElement("button");
    verify.type="button";verify.className="chip";
    verify.textContent=`盲拍验证 · ${JADE_REPLAY_FOCUS[practiceArea]}`;
    verify.onclick=()=>startPhotoReplay(reference,false,{
      ...startJadePractice(shot,practiceArea),checkAgainst:shot.jadePose,
    });
    details.append(verify);
  }
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
  const pairFocus=document.activeElement?.dataset.jadePairOrder;
  const verses=$("journalVerses"), photos=$("journalPhotoEntries");
  verses.replaceChildren();
  photos.replaceChildren();
  $("journalPhotos").hidden=!snapshots.length;
  for(const url of replayPreviewUrls)URL.revokeObjectURL(url);
  replayPreviewUrls=[];
  const featured=renderPhotoComparisons(photos);
  for(const shot of snapshots){
    if(shot.jadeWaterPair?.blob instanceof Blob){
      const heading=document.createElement("h3");
      heading.textContent=shot.jadeWaterFixed===true?"浅滩 · 定点对照":"浅滩 · 水纹与静影";
      const pair=document.createElement("div");
      pair.className="photo-comparison";
      const src=URL.createObjectURL(shot.jadeWaterPair.blob);
      replayPreviewUrls.push(src);
      const {when}=shot.jadeWaterPair;
      pair.append(journalPhoto({when,src},"水纹"),journalPhoto(shot,"浅滩倒影"));
      photos.append(heading,pair);
      featured.add(shot);
    }
    if(shot.name===chapters[jadeChapter].name&&shot.jadePair?.blob instanceof Blob){
      const heading=document.createElement("h3");
      heading.textContent="玉谷双景";
      const pair=document.createElement("div");
      pair.className="photo-comparison";
      const src=URL.createObjectURL(shot.jadePair.blob);
      replayPreviewUrls.push(src);
      const peaks=journalPhoto({...shot.jadePair,src},"溪心双峰");
      const shoal=journalPhoto(shot,"浅滩倒影");
      for(const [figure,isShoal,label] of [[peaks,false,"溪心双峰"],[shoal,true,"浅滩倒影"]]){
        const replace=document.createElement("button");
        replace.type="button";replace.className="chip";
        replace.textContent=`补拍${label}并替换`;
        replace.disabled=shot.storageKey===undefined;
        replace.onclick=()=>startJadePairReplacement(shot,isShoal);
        figure.append(replace);
      }
      const order=document.createElement("button");
      order.type="button";order.className="chip photo-revisit";
      order.textContent="浅滩倒影放在前面";
      order.disabled=shot.storageKey===undefined;
      if(!order.disabled)order.dataset.jadePairOrder=shot.storageKey;
      const status=document.createElement("p");
      status.setAttribute("role","status");
      status.className="jade-pair-order-status";
      const applyOrder=()=>{
        const shoalFirst=shot.jadePairShoalFirst===true;
        const last=shoalFirst?peaks:shoal;
        if(typeof pair.moveBefore==="function")pair.moveBefore(last,null);
        else pair.append(last);
        order.setAttribute("aria-pressed",String(shoalFirst));
      };
      pair.append(peaks,shoal);
      applyOrder();
      order.onclick=async()=>{
        if(pendingJadePairOrders.has(shot))return;
        pendingJadePairOrders.add(shot);
        try{
          await saveJadePairOrder(shot,shot.jadePairShoalFirst!==true);
          if(!order.isConnected&&$("journalDialog").open)renderJournal();
          else applyOrder();
          const current=entries.querySelector(`[data-jade-pair-order="${shot.storageKey}"]`);
          if(current)current.nextElementSibling.textContent=shot.jadePairShoalFirst?"浅滩倒影在前。":"溪心双峰在前。";
        }catch{
          const current=entries.querySelector(`[data-jade-pair-order="${shot.storageKey}"]`);
          if(current)current.nextElementSibling.textContent="未能保存顺序，请再试一次。";
        }finally{
          pendingJadePairOrders.delete(shot);
        }
      };
      photos.append(heading,pair,order,status);
      featured.add(shot);
    }
    if(shot.name===chapters[jadeChapter].name&&shot.replay?.blob instanceof Blob&&
      Number.isFinite(shot.replay.jadePose?.side)&&Number.isFinite(shot.replay.jadePose.depth)&&
      typeof shot.replay.jadePose.cleared==="boolean"&&typeof shot.replay.result==="string"){
      photos.append(journalReplayComparison(shot));
      featured.add(shot);
    }
  }
  if(snapshots.length>featured.size){
    const shots=document.createElement("h3");
    shots.textContent="旅途留影";photos.append(shots);
    for(const shot of snapshots){
      if(featured.has(shot))continue;
      const comparison=photoComparisons.find(({chapter})=>chapters[chapter].name===shot.name);
      const label=comparison?.views.find(([id])=>id===photoComparison(shot))?.[1];
      photos.append(journalPhoto(shot,label?shot.name+" · "+label:shot.name));
    }
  }
  if(!journal.size && !snapshots.length) verses.textContent="启航后，旅途中读过的话会留在这里。";
  let lastChapter="";
  for(const {name,text,source} of journal.values()){
    if(name!==lastChapter){
      const title=document.createElement("h3");
      title.textContent=name;verses.append(title);lastChapter=name;
    }
    const line=document.createElement("p");
    line.textContent=text;
    if(source){
      const attribution=document.createElement("cite");
      attribution.textContent=source;line.append(attribution);
    }
    verses.append(line);
  }
  if(pairFocus){
    entries.querySelector(`[data-jade-pair-order="${pairFocus}"]`)?.focus({preventScroll:true});
  }else if(previousFocus){
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
    const pair=document.createElement("button");
    pair.type="button";pair.className="chip";pair.textContent="玉谷 · 同一趟拍双景";
    pair.onclick=()=>startJadePairRun();
    const water=document.createElement("button");
    water.type="button";water.className="chip";water.textContent="玉谷 · 同一趟拍水纹与静影";
    water.onclick=()=>startJadePairRun(true);
    const fixed=document.createElement("button");
    fixed.type="button";fixed.className="chip";fixed.textContent="玉谷 · 定点对照水纹与静影";
    fixed.onclick=()=>startJadePairRun(true,true);
    replayChoices.append(pair,water,fixed);
  }
  populateChapterChoices("chapterChoices","journalDialog");
  renderJournal();
  $("journalDialog").showModal();
}

function populateChapterChoices(containerId,dialogId){
  const choices=$(containerId);
  if(choices.childElementCount)return;
  const add=(label,index,line=0)=>{
    const button=document.createElement("button");
    button.type="button";button.className="chip";button.textContent=label;
    button.onclick=()=>{
      $(dialogId).close();play();
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
