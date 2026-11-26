"use strict";

/* Where the journal, photos and settings live.
   In-app WebViews (the TapTap H5 host among them) may lack IndexedDB, or open it
   and then abort every write. Each store is trusted only after a probe value is
   written and read back unchanged:

     journal   IndexedDB → tap.setStorageSync → localStorage → this visit only
     settings  tap.setStorageSync → localStorage → this visit only

   Settings (including the voyage checkpoint) are read synchronously at startup, so
   they skip IndexedDB. Photos are blobs: only IndexedDB keeps them across visits;
   the key-value stores keep the journal's verses and hold photos for this visit. */
const DreamStorage=(()=>{
  const DB="dreamer-journal", PROBE="dreamer-probe", JOURNAL_KEY="dreamer-journal-v1";
  const SETTINGS_KEY="dreamer-settings-v1";
  // TapTap allows 1MB per key and 10MB in all; long journals span several keys.
  const CHUNK=200000;
  const quiet=fn=>{try{return fn();}catch{return null;}};
  const probeValue=()=>"梦"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

  function tapKV(){
    const tap=globalThis.tap;
    if(typeof tap?.setStorageSync!=="function"||typeof tap.getStorageSync!=="function")return null;
    return {kind:"tap",
      get(key){const value=tap.getStorageSync(key);return value===""||value===undefined||value===null?null:String(value);},
      set:(key,value)=>{tap.setStorageSync(key,value);},
      remove(key){if(typeof tap.removeStorageSync==="function")tap.removeStorageSync(key);else tap.setStorageSync(key,"");}};
  }
  function localKV(){
    const ls=quiet(()=>globalThis.localStorage);
    if(!ls||typeof ls.setItem!=="function")return null;
    return {kind:"local",get:key=>ls.getItem(key),set:(key,value)=>{ls.setItem(key,value);},remove:key=>{ls.removeItem(key);}};
  }
  function memoryKV(){
    const data=new Map();
    return {kind:"memory",get:key=>data.has(key)?data.get(key):null,set:(key,value)=>{data.set(key,String(value));},remove:key=>{data.delete(key);}};
  }
  function works(kv){
    if(!kv)return false;
    try{
      const value=probeValue();
      kv.set(PROBE,value);const back=kv.get(PROBE);kv.remove(PROBE);
      return back===value;
    }catch{return false;}
  }

  // A new copy's chunks land before its manifest, so a torn write keeps the old copy.
  function chunked(kv){
    const drop=(key,head)=>{
      const meta=quiet(()=>JSON.parse(head));
      if(meta?.rev)for(let i=0;i<meta.n;i++)kv.remove(key+"#"+meta.rev+":"+i);
    };
    return {
      read(key){
        const head=kv.get(key);if(head===null)return null;
        const {rev,n}=JSON.parse(head);let raw="";
        for(let i=0;i<n;i++){
          const part=kv.get(key+"#"+rev+":"+i);
          if(typeof part!=="string")throw new Error("Journal chunk missing");
          raw+=part;
        }
        return raw;
      },
      write(key,value){
        const prior=kv.get(key);
        const rev=probeValue().slice(1),n=Math.max(1,Math.ceil(value.length/CHUNK));
        try{
          for(let i=0;i<n;i++)kv.set(key+"#"+rev+":"+i,value.slice(i*CHUNK,(i+1)*CHUNK));
          kv.set(key,JSON.stringify({rev,n}));
        }catch(error){drop(key,JSON.stringify({rev,n}));throw error;}
        if(prior!==null)quiet(()=>drop(key,prior));
      }
    };
  }

  function pickSettings(){
    const tap=quiet(tapKV),local=quiet(localKV);
    if(works(tap)){
      // Settings a browser visit left behind come along once.
      if(tap.get(SETTINGS_KEY)===null){
        const old=quiet(()=>local?.get(SETTINGS_KEY));
        if(old)quiet(()=>tap.set(SETTINGS_KEY,old));
      }
      return tap;
    }
    return works(local)?local:memoryKV();
  }

  function openDatabase(factory){
    return new Promise((resolve,reject)=>{
      let settled=false;
      const timer=setTimeout(()=>{settled=true;reject(new Error("Journal database did not open"));},8000);
      const fail=error=>{clearTimeout(timer);if(!settled){settled=true;reject(error);}};
      const open=factory.open(DB,1);
      open.onupgradeneeded=()=>{
        open.result.createObjectStore("verses");
        open.result.createObjectStore("photos",{autoIncrement:true});
      };
      open.onsuccess=()=>{
        clearTimeout(timer);
        if(settled){open.result.close();return;}
        settled=true;
        open.result.onversionchange=()=>open.result.close();
        resolve(open.result);
      };
      open.onerror=()=>fail(open.error);
      open.onblocked=()=>fail(Object.assign(new Error("Journal database is busy"),{name:"JournalBusyError"}));
    });
  }
  function idbJournal(db){
    const run=(stores,mode,body)=>new Promise((resolve,reject)=>{
      let transaction,result;
      try{transaction=db.transaction(stores,mode);result=body(transaction);}
      catch(error){quiet(()=>transaction?.abort());reject(error);return;}
      transaction.oncomplete=()=>resolve(result);
      transaction.onabort=()=>reject(transaction.error||new Error("Journal write aborted"));
    });
    return {kind:"indexeddb",keepsPhotos:true,run,
      async load(){
        const {verses,photos,keys}=await run(["verses","photos"],"readonly",tx=>({
          verses:tx.objectStore("verses").getAll(),
          photos:tx.objectStore("photos").getAll(),
          keys:tx.objectStore("photos").getAllKeys(),
        }));
        return {
          verses:verses.result.filter(verse=>verse?.key!==PROBE),
          photos:photos.result.map((shot,index)=>({...shot,storageKey:keys.result[index]})),
        };
      },
      addVerse:(key,entry)=>run("verses","readwrite",tx=>{
        const verses=tx.objectStore("verses");
        const existing=verses.getKey(key);
        existing.onsuccess=()=>{
          if(existing.result===undefined)verses.add({key,entry,readAt:Date.now()},key);
        };
      }),
      addPhoto:(shot,limit)=>run("photos","readwrite",tx=>{
        const photos=tx.objectStore("photos");
        const added=photos.add(shot);
        const keys=photos.getAllKeys();
        keys.onsuccess=()=>keys.result.slice(0,-limit).forEach(key=>photos.delete(key));
        return added;
      }).then(added=>added.result),
      // update(saved) returns the new record, or nothing to leave it untouched.
      updatePhoto:(storageKey,update)=>run("photos","readwrite",tx=>{
        const photos=tx.objectStore("photos");
        const request=photos.get(storageKey);
        request.onsuccess=()=>{
          const next=request.result===undefined?null:update(request.result);
          if(!next){tx.abort();return;}
          photos.put(next,storageKey);
        };
      }),
    };
  }
  async function openIndexedDB(factory){
    const db=await openDatabase(factory),journal=idbJournal(db),value=probeValue();
    // Some WebViews open the database and then abort every write: find out first.
    await journal.run("verses","readwrite",tx=>{tx.objectStore("verses").put({key:PROBE,value},PROBE);});
    const back=await journal.run("verses","readonly",tx=>tx.objectStore("verses").get(PROBE));
    if(back.result?.value!==value)throw new Error("Journal probe did not read back");
    await journal.run("verses","readwrite",tx=>{tx.objectStore("verses").delete(PROBE);});
    return journal;
  }

  function kvJournal(kv){
    const records=chunked(kv);
    const verses=()=>{
      const raw=records.read(JOURNAL_KEY);
      const saved=raw===null?null:JSON.parse(raw);
      return Array.isArray(saved?.verses)?saved.verses:[];
    };
    let photos=[],nextKey=1;
    return {kind:kv.kind,keepsPhotos:false,
      load:async()=>({verses:verses(),photos:[]}),
      async addVerse(key,entry){
        const list=verses();
        if(list.some(verse=>verse.key===key))return;
        list.push({key,entry,readAt:Date.now()});
        records.write(JOURNAL_KEY,JSON.stringify({verses:list}));
      },
      async addPhoto(shot,limit){
        const storageKey=nextKey++;
        photos=[...photos,{storageKey,shot}].slice(-limit);
        return storageKey;
      },
      async updatePhoto(storageKey,update){
        const photo=photos.find(item=>item.storageKey===storageKey);
        const next=photo&&update(photo.shot);
        if(!next)throw new Error("Photo is no longer in the journal");
        photo.shot=next;
      },
    };
  }

  let journalStore=null;
  function openJournal(){
    if(journalStore)return journalStore;
    journalStore=(async()=>{
      if(globalThis.indexedDB){
        try{return await openIndexedDB(globalThis.indexedDB);}
        catch(error){
          console.warn("Journal store unavailable: indexeddb",error);
          // Another tab holds the database: the saved journal is there, so do not
          // start a second, empty one elsewhere.
          if(error?.name==="JournalBusyError")return kvJournal(memoryKV());
        }
      }
      for(const make of [tapKV,localKV]){
        const kv=quiet(make);
        if(works(kv))return kvJournal(kv);
      }
      return kvJournal(memoryKV());
    })();
    return journalStore;
  }

  const settingsStore=pickSettings();
  return {
    SETTINGS_KEY,
    get settingsKind(){return settingsStore.kind;},
    readSettings(){
      try{
        const value=JSON.parse(settingsStore.get(SETTINGS_KEY));
        return value&&typeof value==="object"&&!Array.isArray(value)?value:{};
      }catch{return {};}
    },
    writeSettings(value){settingsStore.set(SETTINGS_KEY,JSON.stringify(value));},
    openJournal,
  };
})();
