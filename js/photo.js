"use strict";

let photoReference=null;
const JADE_PHOTO_SIDE_TOLERANCE=12, JADE_PHOTO_DEPTH_TOLERANCE=35;
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
function showPhotoReference(shot,guided=true){
  hidePhotoReference();
  photoReference={shot,guided,src:URL.createObjectURL(shot.blob)};
  $("photoReferenceImage").src=photoReference.src;
  $("photoReferenceGuidance").setAttribute("aria-pressed",String(guided));
  updatePhotoReference(null);
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
  const {shot,guided}=photoReference;
  const target=shot.jadePose;
  const passed=photoReferencePassed(pose,target);
  $("retryPhotoReference").hidden=guided&&!passed&&!(pose?.cleared&&(!target.cleared||Boolean(pose.waited)!==Boolean(target.waited)));
  const text=guided?(passed?"已滑过旧取景，可以重试。":photoReferenceHint(pose,target))
    :"对照旧图取景，拍下后查看结果。";
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
  const matched=compare&&photoReferenceMatches(jadePose,reference.shot.jadePose);
  const thumb=document.createElement("canvas"), tw=320;
  thumb.width=tw;thumb.height=Math.max(1,Math.round(tw*canvas.height/canvas.width));
  thumb.getContext("2d").drawImage(canvas,0,0,tw,thumb.height);
  const when=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  thumb.toBlob(blob=>{
    if(!blob){reportJournalFailure();return;}
    const shot={blob,name,when,...(comparison?{comparison}:{}),...(jadePose?{jadePose}:{})};
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
        announce(matched?"复拍已保存。你找回了旧取景。":"复拍已保存。与旧取景还有差别，可再试一次。",5);
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
