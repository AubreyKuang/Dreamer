"use strict";

let photoReference=null;
function jadePhotoPose(){
  if(!routeMode||chapterIndex!==jadeChapter||!jadeLight||storyTime>=storyUntil)return null;
  const cue=chapters[jadeChapter].lines[nextLine-1]?.[3];
  if(cue!=="jadeLight"&&cue!=="jadeLightResult")return null;
  return {side:lateral*.61-jadeLight.x,depth:routeDistance-jadeLight.start,cleared:followedJadeLight};
}
function showPhotoReference(shot){
  hidePhotoReference();
  photoReference={pose:shot.jadePose,src:URL.createObjectURL(shot.blob)};
  $("photoReferenceImage").src=photoReference.src;
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
  const target=photoReference.pose;
  const close=pose&&pose.cleared===target.cleared&&Math.abs(pose.side-target.side)<=12&&Math.abs(pose.depth-target.depth)<=35;
  const text=close?"已接近旧取景":"对照旧留影找角度";
  const status=$("photoReferenceStatus");
  if(status.textContent!==text)status.textContent=text;
}

function savePhoto(){
  if(!lastPose)return;
  const {name,comparison,jadePose}=lastPose;
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
    })).then(()=>announce(comparison?"留影已收进手记的「两种走法」。":"留影已存入手记。"),reportJournalFailure);
  },"image/jpeg",.82);
  canvas.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob), link=document.createElement("a");
    link.href=url;link.download="浮梦之境-"+name.replace(/[\\/:*?"<>|]/g,"-")+".png";
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  },"image/png");
}
