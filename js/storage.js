"use strict";

const journal = new Map();
const snapshots = [];
const PHOTO_LIMIT = 12;
function readSettings() {
  return DreamStorage.readSettings();
}
const settings = readSettings();
function saveSetting(key, value) {
  settings[key] = value;
  try { DreamStorage.writeSettings({...readSettings(), [key]:value}); }
  catch { /* Settings still apply for this visit. */ }
}
const journalStore = DreamStorage.openJournal();
let journalKeepsPhotos = true;
journalStore.then(store => { journalKeepsPhotos = store.keepsPhotos; });
let journalWarning = false;
function reportJournalFailure() {
  if (journalWarning) return;
  journalWarning = true;
  announce("无法保存手记和留影，本次游玩中仍可查看。");
}
// Nowhere to keep anything: play on, and say so once at the first saved moment.
let journalNoticeShown = false;
function noteJournalStore(store) {
  if (journalNoticeShown || store.kind !== "memory") return;
  journalNoticeShown = true;
  announce("当前环境无法保存手记和航程，本次游玩中仍可查看。", 5);
}
function loadJournal() {
  return journalStore.then(store => store.load()).then(({verses, photos}) => {
    const current = [...journal];
    journal.clear();
    const peachFeastKeys=new Set(chapters[groveChapter].lines.filter(line=>line[2]===peachFeastSource)
      .map(line=>chapters[groveChapter].name+"-"+line[4]));
    for (const {key, entry} of verses.sort((a,b)=>a.readAt-b.readAt)){
      if(key==="不系之舟-6"||key==="赤壁赋-3"||(entry.source===peachFeastSource&&!peachFeastKeys.has(key)))continue;
      journal.set(key, entry);
    }
    for (const [key, entry] of current) journal.set(key, entry);
    const older = photos.slice(-PHOTO_LIMIT).reverse().map(shot => ({
      ...shot, src: URL.createObjectURL(shot.blob),
    }));
    snapshots.push(...older);
    trimJournalPhotos();
    if ($("journalDialog").open) renderJournal();
  }).catch(reportJournalFailure);
}
function addJournalVerse(key, entry) {
  return journalStore.then(store => {
    noteJournalStore(store);
    return store.addVerse(key, entry);
  });
}
// Resolves to the photo's storage key once it is in the journal.
function addJournalPhoto(shot) {
  return journalStore.then(store => store.addPhoto(shot, PHOTO_LIMIT));
}
async function updateJadePair(shot, update) {
  const store = await journalStore;
  await store.updatePhoto(shot.storageKey, saved => saved?.jadePair ? update(saved) : null);
}
async function saveJadePairOrder(shot, shoalFirst) {
  await updateJadePair(shot, saved => ({...saved, jadePairShoalFirst: shoalFirst}));
  shot.jadePairShoalFirst = shoalFirst;
}
async function replaceJadePairPhoto(shot, photo, shoal) {
  const {blob,when,jadePose}=photo;
  if(shoal){
    await updateJadePair(shot, saved => ({...saved,blob,when,jadePose}));
    URL.revokeObjectURL(shot.src);
    Object.assign(shot,{blob,when,jadePose,src:URL.createObjectURL(blob)});
    if(!snapshots.includes(shot))URL.revokeObjectURL(shot.src);
  }else{
    const jadePair={blob,when};
    await updateJadePair(shot, saved => ({...saved,jadePair}));
    shot.jadePair=jadePair;
  }
}
function trimJournalPhotos() {
  for (const old of snapshots.splice(PHOTO_LIMIT)) URL.revokeObjectURL(old.src);
}
