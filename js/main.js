"use strict";

const savedJournal = loadJournal();

window.addEventListener("pointerdown",primeAudio);
window.addEventListener("keydown",primeAudio);
function openDream(){
  if(clean)toggleView();
  $("word").value="";
  $("dreamDialog").showModal();
  $("word").focus();
}
function leaveFreeRoam(){
  if(!freeRoam)return;
  freeRoam=false;facing=0;viewCos=1;viewSin=0;
  suspendedVoyage=null;
  $("resumeRoute").hidden=true;
  $("dream").hidden=false;
}
function toggleFreeRoam(){
  $("dreamDialog").close();
  play();
  if(freeRoam){
    const previous=suspendedVoyage;
    routeMode=true;
    leaveFreeRoam();
    ({flight,distance,lateral,position}=previous);
    changeDream(previous.scene);
    canvas.focus({preventScroll:true});
    if(routeMode&&storyTime<storyUntil)$("story").classList.add("show");
    return;
  }
  freeRoam=true;routeMode=false;
  $("resumeRoute").hidden=false;
  $("dream").hidden=true;
  suspendedVoyage={flight,distance,lateral,position,scene:current};flight=null;
  roamVelocity=velocity*32;
  $("story").classList.remove("show");
}
const checkpoint=settings.voyageCheckpoint;
const checkpointChapter=chapters.findIndex(chapter=>chapter.name===checkpoint?.chapter);
const canContinue=checkpointChapter>=0 && Number.isInteger(checkpoint.line)
  && checkpoint.line>=0 && checkpoint.line<chapters[checkpointChapter].lines.length;
if(canContinue){
  $("continueVoyage").hidden=false;
  $("continueVoyage").textContent="继续上次航程 · "+checkpoint.chapter;
}
function startReplay(scene){
  hidePhotoReference();
  $("journalDialog").close();
  play();
  replaying=true;
  $("returnFromReplay").hidden=false;
  seekVoyage(scene.chapter,scene.line);
}
function startPhotoReplay(shot,guided=true,focus=null,focusGuided=false,plan=""){
  startReplay(replayScenes.find(scene=>scene.chapter===jadeChapter));
  showPhotoReference(shot,guided,focus,focusGuided,plan);
  canvas.focus({preventScroll:true});
}
function startJadePairRun(){
  startReplay(replayScenes.find(scene=>scene.chapter===jadeChapter));
  jadePairRun={};
  $("jadePairPreview").alt="当前用于配对的溪心双峰";
  updateJadePairRun(null);
  canvas.focus({preventScroll:true});
}
function startJadePairReplacement(shot,shoal){
  startReplay(replayScenes.find(scene=>scene.chapter===jadeChapter));
  const preview=URL.createObjectURL(shoal?shot.blob:shot.jadePair.blob);
  jadePairRun={replacement:shot,shoal,preview};
  $("jadePairPreview").alt=shoal?"补拍前的浅滩倒影":"补拍前的溪心双峰";
  $("jadePairPreview").src=preview;
  updateJadePairRun(null);
  canvas.focus({preventScroll:true});
}
function endReplay(){
  hidePhotoReference();
  replaying=false;
  $("returnFromReplay").hidden=true;
}
$("returnFromReplay").onclick=()=>{
  const saved=settings.voyageCheckpoint;
  const index=chapters.findIndex(chapter=>chapter.name===saved?.chapter);
  endReplay();
  if(index>=0&&Number.isInteger(saved.line)&&chapters[index].lines[saved.line]){
    resumeCheckpoint(index,saved);
  }else{
    leaveFreeRoam();
    lateral=position=distance=0;
    enterChapter(0,true);
  }
  canvas.focus({preventScroll:true});
};
$("continueVoyage").onclick=()=>{
  if(!canContinue)return;
  play();
  resumeCheckpoint(checkpointChapter,checkpoint);
};
function resumeCheckpoint(index,saved){
  seekVoyage(index,saved.line,saved.metTraveller===true,saved.moonReflection,saved.groveBank,
    saved.sailedTogether===true,saved.landedAtPier===true,saved.harpBank,saved.harpDuet===true,saved.mirrorView,
    saved.fireflyTrail===true,saved.followedJadeLight===true,saved.waitedForJadeMist===true);
}
$("start").onclick=play;
$("quickJournal").onclick=showJournal;
$("retryPhotoReference").onclick=()=>{
  if(!photoReference)return;
  const {shot,guided,focus,focusGuided,plan}=photoReference;
  startPhotoReplay(shot,guided,focus,focusGuided,plan);
};
$("photoReferenceGuidance").onclick=()=>{
  if(!photoReference||$("photoReferenceGuidance").hidden)return;
  photoReference.guided=!photoReference.guided;
  photoReference.focusGuided=false;
  syncPhotoGuidance();
  updatePhotoReference(jadePhotoPose());
};
$("photoFocusGuidance").onclick=()=>{
  if(!photoReference?.focus||$("photoFocusGuidance").hidden)return;
  photoReference.focusGuided=!photoReference.focusGuided;
  photoReference.guided=false;
  syncPhotoGuidance();
  updatePhotoReference(jadePhotoPose());
};
$("photoSingleHint").onclick=()=>{
  if(!photoReference?.focus?.singleHint||photoReference.singleHintText)return;
  const pose=jadePhotoPose();
  if(!pose)return;
  photoReference.singleHintText="已用本趟提示："+photoFocusHint(pose,photoReference.shot.jadePose,photoReference.focus.area);
  updatePhotoReference(pose);
  canvas.focus({preventScroll:true});
};
$("closePhotoReference").onclick=()=>{
  hidePhotoReference();
  canvas.focus({preventScroll:true});
};
$("journal").onclick=()=>{ $("helpDialog").close();showJournal(); };
// Return to the ice so gameplay shortcuts work immediately after a dialog.
for(const id of ["dreamDialog","journalDialog","helpDialog"]){
  $(id).addEventListener("close",()=>{
    if(start&&!viewingDialog()) canvas.focus({preventScroll:true});
  });
}
$("restartRoute").onclick=()=>{
  $("journalDialog").close();play();
  leaveFreeRoam();
  endReplay();
  lateral=position=distance=0;
  seen.clear();iceRings.length=0;
  enterChapter(0,true);
  saveSetting("voyageCheckpoint",null);
};
$("resumeRoute").onclick=toggleFreeRoam;
$("dream").onclick=openDream;
$("freeRoam").onclick=toggleFreeRoam;
$("help").onclick=()=>$("helpDialog").showModal();
$("sound").onclick=toggleSound;
$("iceSound").checked=settings.iceSound!==false;
clean=settings.clean===true;
syncView();
$("iceSound").onchange=()=>{
  saveSetting("iceSound", $("iceSound").checked);
  if(skateAudio) skateAudio.bus.gain.setTargetAtTime($("iceSound").checked?1:0,audio.currentTime,.06);
};
$("view").onclick=toggleView;
$("photo").onclick=()=>savePhoto();
$("jadePairRetake").onclick=()=>{
  savePhoto(true);
  canvas.focus({preventScroll:true});
};
$("push").onclick=pushOff;
$("dismissSkateTip").onclick=()=>{
  saveSetting("skateTipDone",true);
  canvas.focus({preventScroll:true});
  $("skateTip").hidden=true;
};
document.querySelectorAll("[data-word]").forEach(button=>button.onclick=()=>setWord(button.dataset.word));
$("dreamForm").onsubmit=event=>{event.preventDefault();setWord($("word").value);};
window.addEventListener("keydown",event=>{
  if(event.isComposing||event.altKey||event.ctrlKey||event.metaKey||viewingDialog())return;
  if(event.target instanceof Element&&event.target.closest("button, summary")&&["Enter","Space"].includes(event.code))return;
  if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"].includes(event.code)){
    event.preventDefault();keys.add(event.code);play();
  } else if(event.code==="Space"){
    event.preventDefault();if(!event.repeat)pushOff();
  } else if(!event.repeat&&event.code==="Enter"){
    event.preventDefault();openDream();
  } else if(!event.repeat&&event.code==="KeyG")toggleFreeRoam();
  else if(!event.repeat&&event.code==="KeyH")toggleView();
  else if(!event.repeat&&event.code==="KeyP")savePhoto();
});
window.addEventListener("keyup",event=>keys.delete(event.code));
window.addEventListener("blur",()=>{
  keys.clear();drag=null;previousFrame=0;touchControls.clear();
  $("skateBrake").classList.remove("active");$("skateForward").classList.remove("active");
});
for(const [id,direction] of [["skateBrake",-1],["skateForward",1]]){
  const button=$(id);
  button.addEventListener("pointerdown",event=>{
    if(event.button!==0)return;
    event.preventDefault();play();button.setPointerCapture(event.pointerId);
    touchControls.set(event.pointerId,direction);button.classList.add("active");
  });
  for(const type of ["pointerup","pointercancel","lostpointercapture"]){
    button.addEventListener(type,event=>{
      touchControls.delete(event.pointerId);
      if(![...touchControls.values()].includes(direction)) button.classList.remove("active");
    });
  }
}
canvas.addEventListener("pointerdown",event=>{
  if(drag||event.button!==0)return;
  drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,steering:0,throttle:0};canvas.setPointerCapture(event.pointerId);play();
});
canvas.addEventListener("pointermove",event=>{
  if(drag?.id!==event.pointerId)return;
  drag.steering=clamp((event.clientX-drag.startX)/Math.max(125,W*.20),-1,1);
  drag.throttle=clamp((drag.startY-event.clientY)/65,-1,1);
});
for(const type of ["pointerup","pointercancel","lostpointercapture"]){
  canvas.addEventListener(type,event=>{if(drag?.id===event.pointerId)drag=null;});
}
art.onload = () => {
  cache=paintSky(current);
  if(transition<1) oldCache=paintSky(previous);
};
art.src = skyAtlas;
window.addEventListener("resize",()=>{resizePending=true;});
resize();
requestAnimationFrame(render);
