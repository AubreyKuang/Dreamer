"use strict";

const journal = new Map();
const snapshots = [];
const PHOTO_LIMIT = 12;
const SETTINGS_KEY = "dreamer-settings-v1";
function readSettings() {
  try {
    const value=JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return value && typeof value==="object" && !Array.isArray(value) ? value : {};
  }
  catch { return {}; }
}
const settings = readSettings();
function saveSetting(key, value) {
  settings[key] = value;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({...readSettings(), [key]:value})); }
  catch { /* Settings still apply for this visit. */ }
}
const journalDatabase = new Promise((resolve, reject) => {
  const open = indexedDB.open("dreamer-journal", 1);
  open.onupgradeneeded = () => {
    open.result.createObjectStore("verses");
    open.result.createObjectStore("photos", {autoIncrement:true});
  };
  open.onsuccess = () => {
    open.result.onversionchange = () => open.result.close();
    resolve(open.result);
  };
  open.onerror = () => reject(open.error);
  open.onblocked = () => reject(new Error("Journal database is busy"));
});
async function journalTransaction(stores, mode, run) {
  const db = await journalDatabase;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, mode);
    const result = run(transaction);
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error);
  });
}
let journalWarning = false;
function reportJournalFailure() {
  if (journalWarning) return;
  journalWarning = true;
  announce("无法保存手记和留影，本次游玩中仍可查看。");
}
function loadJournal() {
  return journalTransaction(["verses", "photos"], "readonly", tx => ({
    verses: tx.objectStore("verses").getAll(),
    photos: tx.objectStore("photos").getAll(),
  })).then(({verses, photos}) => {
    const current = [...journal];
    journal.clear();
    const peachFeastKeys=new Set(chapters[groveChapter].lines.filter(line=>line[2]===peachFeastSource)
      .map(line=>chapters[groveChapter].name+"-"+line[4]));
    for (const {key, entry} of verses.result.sort((a,b)=>a.readAt-b.readAt)){
      if(key==="不系之舟-6"||key==="赤壁赋-3"||(entry.source===peachFeastSource&&!peachFeastKeys.has(key)))continue;
      journal.set(key, entry);
    }
    for (const [key, entry] of current) journal.set(key, entry);
    const older = photos.result.slice(-PHOTO_LIMIT).reverse().map(shot => ({
      ...shot, src: URL.createObjectURL(shot.blob),
    }));
    snapshots.push(...older);
    trimJournalPhotos();
    if ($("journalDialog").open) renderJournal();
  }).catch(reportJournalFailure);
}
function trimJournalPhotos() {
  for (const old of snapshots.splice(PHOTO_LIMIT)) URL.revokeObjectURL(old.src);
}
