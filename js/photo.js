"use strict";

function savePhoto(){
  if(!lastPose)return;
  const {name,comparison}=lastPose;
  const thumb=document.createElement("canvas"), tw=320;
  thumb.width=tw;thumb.height=Math.max(1,Math.round(tw*canvas.height/canvas.width));
  thumb.getContext("2d").drawImage(canvas,0,0,tw,thumb.height);
  const when=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  thumb.toBlob(blob=>{
    if(!blob){reportJournalFailure();return;}
    const shot={blob,name,when,...(comparison?{comparison}:{})};
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
