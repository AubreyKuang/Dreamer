// In-app WebViews (TapTap H5 among them) may lack IndexedDB or abort its writes.
// The journal then moves to the host's key-value storage, or localStorage, after a
// probe; with neither, the game is still playable for the visit.
const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const {IDBFactory,IDBObjectStore}=require("fake-indexeddb");
const read=name=>fs.readFileSync(path.join(__dirname,"..","js",name),"utf8");
const source=read("dream-storage.js"),gameStorage=read("storage.js");
// Values made inside a vm context have that context's prototypes.
const same=(actual,expected,message)=>assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected,message);

// TapTap documents 1MB per key and 10MB in total for tap.setStorageSync.
function fakeTap({perKey=1024*1024,total=10*1024*1024}={}){
  const data=new Map(),bytes=v=>Buffer.byteLength(String(v));
  const used=()=>{let n=0;for(const [k,v] of data)n+=bytes(k)+bytes(v);return n;};
  return {data,
    getStorageSync:key=>data.has(key)?data.get(key):"",
    setStorageSync(key,value){
      if(bytes(value)>perKey)throw Object.assign(new Error("setStorageSync:fail exceed max size"),{errMsg:"setStorageSync:fail exceed max size"});
      const old=data.has(key)?bytes(key)+bytes(data.get(key)):0;
      if(used()-old+bytes(key)+bytes(value)>total)throw Object.assign(new Error("setStorageSync:fail storage full"),{errMsg:"setStorageSync:fail storage full"});
      data.set(key,value);
    },
    removeStorageSync:key=>{data.delete(key);}};
}
function memoryLocal(initial=[]){
  const data=new Map(initial);
  return {data,getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>{data.set(k,String(v));},removeItem:k=>{data.delete(k);}};
}
function load(globals){
  const context=vm.createContext({setTimeout,clearTimeout,Blob,console:{...console,warn(){}},...globals});
  vm.runInContext(source,context);
  const storage=vm.runInContext("DreamStorage",context);
  return {storage,context,journal:()=>storage.openJournal()};
}
async function withAbortingWrites(fn){
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(){throw new DOMException("write refused","UnknownError");};
  try{return await fn();}finally{IDBObjectStore.prototype.put=put;}
}
const entry={name:"海棠渡",text:"迟日江山丽，春风花草香。",source:"杜甫《绝句》"};

test("in a browser the journal and its photos stay in IndexedDB across visits",async()=>{
  const indexedDB=new IDBFactory(),localStorage=memoryLocal();
  const journal=await load({indexedDB,localStorage}).journal();
  assert.equal(journal.kind,"indexeddb");assert.equal(journal.keepsPhotos,true);
  await journal.addVerse("海棠渡-0",entry);
  await journal.addVerse("海棠渡-0",{...entry,text:"changed"});
  const key=await journal.addPhoto({name:"海棠渡",when:1,blob:new Blob(["jpeg"]),jadePair:{when:0}},12);
  await journal.updatePhoto(key,saved=>({...saved,jadePairShoalFirst:true}));
  await assert.rejects(journal.updatePhoto(key,()=>null),"an update that declines leaves the record as it was");
  const again=await (await load({indexedDB,localStorage}).journal()).load();
  same(again.verses.map(v=>[v.key,v.entry.text]),[["海棠渡-0",entry.text]],"the first reading is kept and the probe is gone");
  assert.equal(again.photos.length,1);assert.equal(again.photos[0].storageKey,key);assert.equal(again.photos[0].jadePairShoalFirst,true);
  assert.equal(await again.photos[0].blob.text(),"jpeg");
  same([...localStorage.data.keys()],[],"probes leave nothing behind");
});

test("only the newest photos are kept",async()=>{
  const journal=await load({indexedDB:new IDBFactory()}).journal();
  for(let i=0;i<14;i++)await journal.addPhoto({name:"云海",when:i,blob:new Blob([String(i)])},12);
  const {photos}=await journal.load();
  same(photos.map(p=>p.when),[2,3,4,5,6,7,8,9,10,11,12,13]);
});

test("an IndexedDB that opens but refuses writes hands the journal to TapTap storage before play starts",async()=>{
  const tap=fakeTap();
  const journal=await withAbortingWrites(()=>load({indexedDB:new IDBFactory(),tap,localStorage:memoryLocal()}).journal());
  assert.equal(journal.kind,"tap");assert.equal(journal.keepsPhotos,false);
  await journal.addVerse("北冥有鱼-0",entry);
  const again=await load({tap}).journal();
  assert.equal(again.kind,"tap");
  same((await again.load()).verses.map(v=>v.key),["北冥有鱼-0"]);
});

test("a long journal larger than one TapTap key is chunked and read back exactly",async()=>{
  const tap=fakeTap(),journal=await load({tap}).journal();
  const long={...entry,text:"江流宛转绕芳甸，月照花林皆似霰。".repeat(40000)};
  await journal.addVerse("春江花月夜-0",long);
  const chunks=()=>[...tap.data.keys()].filter(k=>k.startsWith("dreamer-journal-v1#"));
  assert.ok(chunks().length>1,"the journal should span several keys");
  for(const value of tap.data.values())assert.ok(Buffer.byteLength(value)<=1024*1024);
  await journal.addVerse("春江花月夜-1",entry);
  const verses=(await (await load({tap}).journal()).load()).verses;
  assert.equal(verses[0].entry.text,long.text);assert.equal(verses[1].key,"春江花月夜-1");
  assert.equal(chunks().length,Math.ceil(JSON.stringify({verses}).length/200000),"chunks of the replaced copy are released");
});

test("a full TapTap store keeps the journal it had and reports the failure",async()=>{
  const tap=fakeTap({total:400000}),journal=await load({tap}).journal();
  await journal.addVerse("海棠渡-0",entry);
  await assert.rejects(journal.addVerse("海棠渡-1",{...entry,text:"x".repeat(500000)}),/storage full/);
  same((await (await load({tap}).journal()).load()).verses.map(v=>v.key),["海棠渡-0"]);
  assert.equal([...tap.data.keys()].filter(k=>k.startsWith("dreamer-journal-v1#")).length,1,"no half-written copy is left");
});

test("a TapTap store that refuses writes falls through to localStorage",async()=>{
  const tap=fakeTap();tap.setStorageSync=()=>{throw new Error("setStorageSync:fail");};
  const localStorage=memoryLocal();
  const {storage,journal}=load({tap,localStorage});
  assert.equal((await journal()).kind,"local");assert.equal(storage.settingsKind,"local");
});

test("photos taken where only key-value storage works stay in the journal for this visit",async()=>{
  const journal=await load({tap:fakeTap()}).journal();
  const first=await journal.addPhoto({name:"蓝田日暖",blob:new Blob(["a"]),jadePair:{when:1}},2);
  await journal.updatePhoto(first,saved=>({...saved,jadePairShoalFirst:true}));
  await journal.addPhoto({name:"蓝田日暖",blob:new Blob(["b"])},2);
  await journal.addPhoto({name:"蓝田日暖",blob:new Blob(["c"])},2);
  await assert.rejects(journal.updatePhoto(first,saved=>saved),"the oldest photo was trimmed");
  same((await journal.load()).photos,[]);
});

test("with no store that reads back, the game is playable for the visit",async()=>{
  const localStorage=memoryLocal();localStorage.getItem=()=>null;
  const {storage,journal}=load({localStorage});
  const store=await journal();
  assert.equal(store.kind,"memory");assert.equal(storage.settingsKind,"memory");
  await store.addVerse("海棠渡-0",entry);
  assert.equal((await store.load()).verses.length,1);
  storage.writeSettings({sound:true});same(storage.readSettings(),{sound:true});
  assert.equal((await load({localStorage}).journal().then(j=>j.load())).verses.length,0);
});

test("another tab blocking the database does not start a second journal elsewhere",async()=>{
  const tap=fakeTap();
  const blocked={open(){const request={};setTimeout(()=>request.onblocked(),0);return request;}};
  const journal=await load({indexedDB:blocked,tap}).journal();
  assert.equal(journal.kind,"memory");
  assert.equal([...tap.data.keys()].some(k=>k.startsWith("dreamer-journal")),false);
});

test("inside TapTap, settings use the host store and bring browser settings along once",()=>{
  const tap=fakeTap(),localStorage=memoryLocal([["dreamer-settings-v1",JSON.stringify({iceSound:false})]]);
  const {storage}=load({tap,localStorage});
  assert.equal(storage.settingsKind,"tap");
  same(storage.readSettings(),{iceSound:false});
  storage.writeSettings({iceSound:false,voyageCheckpoint:{chapter:"北冥有鱼",line:2}});
  assert.equal(JSON.parse(localStorage.data.get("dreamer-settings-v1")).voyageCheckpoint,undefined,"the browser copy is left alone");
  same(load({tap,localStorage:memoryLocal()}).storage.readSettings().voyageCheckpoint,{chapter:"北冥有鱼",line:2});
  tap.setStorageSync("dreamer-settings-v1","[broken");
  same(load({tap}).storage.readSettings(),{});
});

// storage.js with the game's own helpers stubbed: the voyage checkpoint and the
// journal survive a restart inside a host that has only tap storage.
function game(tap){
  const notes=[],context=vm.createContext({setTimeout,clearTimeout,Blob,console:{...console,warn(){}},tap,
    chapters:[{name:"海棠渡",lines:[]}],groveChapter:0,peachFeastSource:"陶渊明",
    $:()=>({open:false}),announce:message=>notes.push(message),renderJournal(){},
    URL:{createObjectURL:()=>"blob:",revokeObjectURL(){}}});
  vm.runInContext(source,context);vm.runInContext(gameStorage,context);
  return {notes,run:code=>vm.runInContext(code,context)};
}
test("the game's journal and voyage checkpoint come back after restarting inside the host",async()=>{
  const tap=fakeTap(),first=game(tap);
  first.run(`saveSetting("voyageCheckpoint",{chapter:"海棠渡",line:3})`);
  await first.run(`addJournalVerse("海棠渡-3",{name:"海棠渡",text:"迟日江山丽",source:"杜甫"})`);
  await first.run(`loadJournal()`);
  same(first.notes,[],"no warning when the journal is kept");
  const second=game(tap);
  await second.run(`loadJournal()`);
  same(second.run(`settings.voyageCheckpoint`),{chapter:"海棠渡",line:3});
  same(second.run(`[...journal.keys()]`),["海棠渡-3"]);
});
test("with nowhere to save, the game says so once and keeps going",async()=>{
  const g=game(undefined);
  await g.run(`addJournalVerse("海棠渡-0",{name:"海棠渡",text:"a",source:"b"})`);
  await g.run(`addJournalVerse("海棠渡-1",{name:"海棠渡",text:"a",source:"b"})`);
  same(g.notes,["当前环境无法保存手记和航程，本次游玩中仍可查看。"]);
});
