#!/usr/bin/env node
/* Plays the built TapTap package in headless Chrome and checks where the journal,
   photos and voyage checkpoint go, then that they come back after a reload:

     python3 scripts/build-taptap.py && node tests/storage-browser.cjs

   1. a plain browser: IndexedDB + localStorage
   2. a TapTap-like host: no IndexedDB, a `tap` object with setStorageSync
   3. nowhere to save: no IndexedDB, no tap, localStorage throws
   Needs Node 22+ and Chrome. */
const assert=require("node:assert/strict");
const {sleep,gameSession}=require("../scripts/lib/taptap-chrome.cjs");
const VIEWPORT={width:844,height:390,deviceScaleFactor:1,mobile:true};

const TAP_HOST=`Object.defineProperty(window,"indexedDB",{value:undefined,configurable:true});
  const backing=window.localStorage;
  window.__downloads=0;
  window.tap={getSystemInfoSync:()=>({platform:"android"}),
    getStorageSync:key=>backing.getItem("tap:"+key)??"",
    setStorageSync(key,value){if(new Blob([String(value)]).size>1048576)throw new Error("setStorageSync:fail exceed max size");backing.setItem("tap:"+key,String(value));},
    removeStorageSync:key=>backing.removeItem("tap:"+key)};`;
const NOWHERE=`Object.defineProperty(window,"indexedDB",{value:undefined,configurable:true});
  Object.defineProperty(window,"localStorage",{configurable:true,get(){throw new DOMException("denied","SecurityError");}});`;
const COUNT_DOWNLOADS=`window.__downloads=0;const nativeClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){if(this.download)window.__downloads++;else nativeClick.call(this);};`;

async function playUntilVerse(game){
  await game.click("#start");
  for(let i=0;i<90;i++){
    await game.key("ArrowUp","ArrowUp",400);
    if(await game.evaluate(`return journal.size>0&&!!settings.voyageCheckpoint`))return;
  }
  throw new Error("no verse reached the journal");
}
async function takePhoto(game){
  await game.key("KeyP","p",60);
  for(let i=0;i<40;i++){await sleep(150);if(await game.evaluate(`return snapshots[0]?.storageKey!==undefined`))return;}
  throw new Error("the photo did not reach the journal");
}
const state=game=>game.evaluate(`const store=await journalStore;await savedJournal;
  return {journal:store.kind,photosKept:store.keepsPhotos,settings:DreamStorage.settingsKind,verses:journal.size,photos:snapshots.length,
    checkpoint:settings.voyageCheckpoint?.chapter||null,canContinue:!document.getElementById("continueVoyage").hidden,
    whisper:document.getElementById("whisper").textContent,downloads:window.__downloads,host:TapTapHost.inHost}`);

async function scenario(name,preload,check){
  const game=await gameSession(VIEWPORT,{preload:COUNT_DOWNLOADS+preload});
  try{
    await game.open();
    await check(game);
    assert.deepEqual(game.errors,[],"no uncaught errors");
    console.log("ok -",name);
  }finally{game.close();}
}

async function main(){
  await scenario("a plain browser keeps verses and photos in IndexedDB",``,async game=>{
    await playUntilVerse(game);await takePhoto(game);
    const before=await state(game);
    assert.equal(before.journal,"indexeddb");assert.equal(before.settings,"local");assert.equal(before.downloads,1);
    await game.open();
    const after=await state(game);
    assert.equal(after.canContinue,true);assert.ok(after.verses>=before.verses);assert.equal(after.photos,1);
    assert.equal(after.checkpoint,before.checkpoint);
    console.log("   ",JSON.stringify(after));
  });
  await scenario("a TapTap-like host keeps verses and the checkpoint in tap storage",TAP_HOST,async game=>{
    await playUntilVerse(game);await takePhoto(game);
    const before=await state(game);
    assert.equal(before.host,true);assert.equal(before.journal,"tap");assert.equal(before.settings,"tap");
    assert.equal(before.downloads,0,"no PNG download inside the host");
    assert.match(before.whisper,/只保留本次游玩的留影/);
    const keys=await game.evaluate(`return Object.keys(localStorage)`);
    assert.ok(keys.length&&keys.every(k=>k.startsWith("tap:")),"everything went through tap.setStorageSync: "+keys);
    await game.open();
    const after=await state(game);
    assert.equal(after.canContinue,true);assert.ok(after.verses>=before.verses);assert.equal(after.photos,0);
    await game.click("#continueVoyage");await sleep(1500);
    assert.equal(await game.evaluate(`return document.body.classList.contains("playing")`),true);
    console.log("   ",JSON.stringify(after));
  });
  await scenario("with nowhere to save, the voyage still plays and says so once",NOWHERE,async game=>{
    await playUntilVerse(game);
    const now=await state(game);
    assert.equal(now.journal,"memory");assert.equal(now.settings,"memory");
    assert.match(now.whisper,/无法保存手记和航程/);
    await game.open();
    assert.equal((await state(game)).canContinue,false);
    console.log("   ",JSON.stringify(now));
  });
}
main().catch(e=>{console.error(e);process.exit(1);});
