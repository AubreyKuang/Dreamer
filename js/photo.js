"use strict";

let photoReference=null;
const JADE_PHOTO_SIDE_TOLERANCE=12, JADE_PHOTO_DEPTH_TOLERANCE=35;
const JADE_REPLAY_FOCUS={mist:"雾况或散雾方式",shoal:"浅滩倒影",side:"左右位置",depth:"快门早晚"};
function startJadePractice(shot,area){
  const series=shot.replay.practiceArea===area&&shot.replay.practiceSeries;
  const latest=series&&snapshots.find(entry=>entry.replay?.practiceSeries===series&&entry.jadePose);
  return {area,previous:latest?.jadePose??shot.jadePose,
    series:series||Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)};
}
function jadeComparison(pose){
  if(pose?.cleared!==true||!Number.isFinite(pose.side)||!Number.isFinite(pose.depth))return null;
  return pose.waited===true?"jade-wait":"jade-light";
}
function photoComparison(shot){
  return shot.name===chapters[jadeChapter].name?jadeComparison(shot.jadePose):shot.comparison;
}
function jadePhotoPose(){
  if(!routeMode||chapterIndex!==jadeChapter||!jadeLight)return null;
  const cue=chapters[jadeChapter].lines[nextLine-1]?.[3];
  if(cue!=="jadeLight"&&cue!=="jadeLightResult")return null;
  const shoal=jadeShoalInView();
  if(storyTime>=storyUntil&&!shoal)return null;
  return {side:lateral*.61-jadeLight.x,depth:routeDistance-jadeLight.start,cleared:followedJadeLight||waitedForJadeMist,
    ...(waitedForJadeMist?{waited:true}:{}),...(shoal?{shoal:true}:{})};
}
function showPhotoReference(shot,guided=true,focus=null,focusGuided=false){
  hidePhotoReference();
  photoReference={shot,guided,focus,focusGuided,src:URL.createObjectURL(shot.blob)};
  $("photoReferenceFocus").hidden=!focus;
  $("photoReferenceFocus").textContent=focus
    ?`${focus.checkAgainst?"盲拍验证":focus.singleHint?"单次提示练习":"本趟专练"}：${JADE_REPLAY_FOCUS[focus.area]}`:"";
  $("photoReferenceFeedback").open=false;
  $("photoReferenceImage").src=photoReference.src;
  const limited=Boolean(focus?.checkAgainst||focus?.singleHint);
  $("photoReferenceGuidance").hidden=limited;
  $("photoFocusGuidance").hidden=!focus||limited;
  $("photoSingleHint").hidden=!focus?.singleHint;
  syncPhotoGuidance();
  updatePhotoReference(null);
}
function syncPhotoGuidance(){
  $("photoReferenceGuidance").setAttribute("aria-pressed",String(photoReference.guided));
  $("photoFocusGuidance").setAttribute("aria-pressed",String(photoReference.focusGuided));
}
function hidePhotoReference(){
  if(!photoReference)return;
  URL.revokeObjectURL(photoReference.src);
  photoReference=null;
  $("photoReferenceImage").removeAttribute("src");
  $("photoReference").hidden=true;
}
function updatePhotoReference(pose){
  if(!photoReference)return;
  $("photoReference").hidden=!routeMode||chapterIndex!==jadeChapter;
  if($("photoReference").hidden)return;
  const {shot,guided,focus,focusGuided,result,singleHintText}=photoReference;
  const target=shot.jadePose;
  const passed=photoReferencePassed(pose,target);
  $("retryPhotoReference").hidden=guided&&!passed&&!(pose?.cleared&&(!target.cleared||Boolean(pose.waited)!==Boolean(target.waited)));
  if(focus?.singleHint)$("photoSingleHint").disabled=!pose||Boolean(singleHintText);
  const text=guided?(passed?"已滑过旧取景，可以重试。":photoReferenceHint(pose,target))
    :focusGuided?photoFocusHint(pose,target,focus.area)
    :singleHintText|| (result?"复拍已保存，可在手记对照两张图。"
    :focus?.singleHint?"进入取景时段后，可查看一次专项提示。"
    :"对照旧图取景，拍下后可查看反馈。");
  const feedback=$("photoReferenceFeedback");
  feedback.hidden=guided||!result;
  const resultLine=$("photoReferenceResult");
  if(resultLine.textContent!==(result||""))resultLine.textContent=result||"";
  const status=$("photoReferenceStatus");
  if(status.textContent!==text)status.textContent=text;
}
function photoReferencePassed(pose,target){
  const lastDepth=target.shoal===true?Math.min(JADE_SHOAL.end,target.depth+JADE_PHOTO_DEPTH_TOLERANCE)
    :target.depth+JADE_PHOTO_DEPTH_TOLERANCE;
  return (jadeLight&&routeDistance-jadeLight.start>lastDepth)||
    (!pose&&chapters[jadeChapter].lines[nextLine-1]?.[3]!=="jadeLight");
}
function photoReferenceMatches(pose,target){
  return !!pose&&pose.cleared===target.cleared&&Boolean(pose.waited)===(target.waited===true)&&
    Boolean(pose.shoal)===(target.shoal===true)&&Math.abs(pose.side-target.side)<=JADE_PHOTO_SIDE_TOLERANCE&&
    Math.abs(pose.depth-target.depth)<=JADE_PHOTO_DEPTH_TOLERANCE;
}
function photoReplayDifference(pose,target){
  if(photoReferenceMatches(pose,target))return "match";
  if(!pose)return "window";
  if(pose.cleared!==target.cleared||Boolean(pose.waited)!==(target.waited===true))return "mist";
  if(Boolean(pose.shoal)!==(target.shoal===true))return "shoal";
  if(Math.abs(pose.side-target.side)>JADE_PHOTO_SIDE_TOLERANCE)return "side";
  return "depth";
}
function photoFocusDistance(pose,target,area){
  switch(area){
    case "mist": return Number(pose.cleared!==target.cleared||Boolean(pose.waited)!==Boolean(target.waited));
    case "shoal": return Number(Boolean(pose.shoal)!==Boolean(target.shoal));
    case "side": return Math.max(0,Math.abs(pose.side-target.side)-JADE_PHOTO_SIDE_TOLERANCE);
    case "depth": return Math.max(0,Math.abs(pose.depth-target.depth)-JADE_PHOTO_DEPTH_TOLERANCE);
  }
}
function photoFocusHint(pose,target,area){
  if(!pose)return "进入取景时段后显示专项提示。";
  if(photoFocusDistance(pose,target,area)===0)return `${JADE_REPLAY_FOCUS[area]}已接近旧取景。`;
  switch(area){
    case "mist": return target.waited?"旧图是在溪心等雾散后拍的。"
      :target.cleared?"旧图是在循光拨雾后拍的。":"旧图拍下时，雾还没散。";
    case "shoal": return target.shoal?"留意浅滩倒影入画。":"旧取景里没有浅滩倒影。";
    case "side": return pose.side<target.side?"旧取景在右侧。":"旧取景在左侧。";
    case "depth": return pose.depth<target.depth?"再往前滑一点。":"已超过旧图的快门位置。";
  }
}
function photoFocusResult(pose,target,focus){
  const {area,previous,checkAgainst}=focus;
  const label=JADE_REPLAY_FOCUS[area];
  if(checkAgainst){
    if(!pose)return `盲拍验证${label}：快门落在取景时段之外，可重试。`;
    const distance=photoFocusDistance(pose,target,area);
    const assisted=photoFocusDistance(checkAgainst,target,area);
    const change=distance<assisted?"比有提示时更接近旧取景"
      :distance>assisted?"比有提示时离旧取景更远"
      :distance===0?"关掉提示后仍接近旧取景":"与有提示时偏差相同";
    return `盲拍验证${label}：${change}。`;
  }
  if(!pose)return `专练${label}：快门落在取景时段之外，本次无法比较。`;
  const distance=photoFocusDistance(pose,target,area);
  if(distance===0)return `专练${label}：已接近旧取景。`;
  if(!previous)return `专练${label}：仍与旧取景有差别。`;
  const before=photoFocusDistance(previous,target,area);
  const change=distance<before?"比上次更接近旧取景":distance>before?"比上次离旧取景更远":"与上次的偏差相同";
  return `专练${label}：${change}。`;
}
function photoReplayResult(pose,target){
  let clue;
  switch(photoReplayDifference(pose,target)){
    case "match": clue="你找回了旧取景。";break;
    case "window": clue="快门落在取景时段之外。";break;
    case "mist": clue=target.waited===true?"旧图是在溪心等雾散后拍的。"
      :target.cleared?"旧图是在循光拨雾后拍的。":"旧图拍下时，雾还没散。";break;
    case "shoal": clue=target.shoal===true?"旧图里有浅滩倒影。":"这次拍进了浅滩倒影，旧图里没有。";break;
    case "side": clue=pose.side<target.side?"这次的位置比旧图偏左。":"这次的位置比旧图偏右。";break;
    case "depth": clue=pose.depth<target.depth?"这次比旧图更早按下快门。":"这次比旧图更晚按下快门。";break;
  }
  return "复拍已保存。"+clue;
}
function photoReferenceHint(pose,target){
  if(!pose)return "对照旧留影找角度";
  const side=target.side-pose.side;
  const depth=target.depth-pose.depth;
  if(target.waited&&!pose.waited)return "旧图是在溪心等雾散后拍的。";
  if(pose.waited&&target.cleared&&!target.waited)return "旧图是循光后拍的，可以重试。";
  if(pose.cleared!==target.cleared)return target.cleared?"旧图的雾已散开，先向右循光。":"旧图仍有雾，这次已拨雾。";
  if(side>JADE_PHOTO_SIDE_TOLERANCE)return "旧取景在右侧。";
  if(side< -JADE_PHOTO_SIDE_TOLERANCE)return "旧取景在左侧。";
  if(depth>JADE_PHOTO_DEPTH_TOLERANCE||(target.shoal===true&&!pose.shoal&&pose.depth<JADE_SHOAL.start))return "横向已接近，再往前滑。";
  if((target.shoal===true)!==Boolean(pose.shoal))return target.shoal===true?"旧图是在左侧浅滩拍的。":"旧图里没有浅滩的倒影。";
  return photoReferenceMatches(pose,target)?"已接近旧取景":"已滑过旧取景，可以重试。";
}

function savePhoto(){
  if(!lastPose)return;
  const {name,comparison,jadePose}=lastPose;
  const reference=photoReference;
  const compare=reference&&!reference.guided&&routeMode&&chapterIndex===jadeChapter&&name===chapters[jadeChapter].name;
  const focusGuided=compare&&reference.focusGuided;
  const singleHintUsed=compare&&Boolean(reference.singleHintText);
  const result=compare&&photoReplayResult(jadePose,reference.shot.jadePose);
  const focusResult=compare&&reference.focus&&photoFocusResult(jadePose,reference.shot.jadePose,reference.focus);
  const attempt=compare&&(reference.attempt=(reference.attempt||0)+1);
  if(compare){
    reference.result=null;
    $("photoReferenceFeedback").open=false;
    updatePhotoReference(jadePose);
  }
  const thumb=document.createElement("canvas"), tw=320;
  thumb.width=tw;thumb.height=Math.max(1,Math.round(tw*canvas.height/canvas.width));
  thumb.getContext("2d").drawImage(canvas,0,0,tw,thumb.height);
  const when=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  thumb.toBlob(blob=>{
    if(!blob){reportJournalFailure();return;}
    const shot={blob,name,when,...(comparison?{comparison}:{}),...(jadePose?{jadePose}:{})};
    if(compare){
      const {blob,jadePose}=reference.shot;
      shot.replay={blob,jadePose,result,...(focusResult?{
        focusResult,practiceArea:reference.focus.area,practiceSeries:reference.focus.series,
        ...(focusGuided?{practiceGuided:true}:singleHintUsed?{practiceHint:true}:{})
      }:{})};
    }
    snapshots.unshift({...shot,src:URL.createObjectURL(blob)});
    trimJournalPhotos();
    if ($("journalDialog").open) renderJournal();
    savedJournal.then(() => journalTransaction("photos", "readwrite", tx => {
      const photos=tx.objectStore("photos");
      photos.add(shot);
      const keys=photos.getAllKeys();
      keys.onsuccess=()=>keys.result.slice(0,-PHOTO_LIMIT).forEach(key=>photos.delete(key));
    })).then(()=>{
      if(compare&&photoReference===reference){
        if(attempt===reference.attempt){
          reference.result=focusResult?`${focusResult}\n${result}`:result;
          if(reference.focus&&jadePose)reference.focus={...reference.focus,previous:jadePose};
          updatePhotoReference(jadePhotoPose());
        }
      }else announce(comparison?"留影已收进手记的「两种走法」。":"留影已存入手记。");
    },reportJournalFailure);
  },"image/jpeg",.82);
  canvas.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob), link=document.createElement("a");
    link.href=url;link.download="浮梦之境-"+name.replace(/[\\/:*?"<>|]/g,"-")+".png";
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  },"image/png");
}
