const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","js","taptap.js"),"utf8");
function run(globals){
  const classes=new Set(),listeners={};
  const context=vm.createContext({document:{documentElement:{classList:{add:c=>classes.add(c)}}},
    addEventListener:(name,fn)=>{listeners[name]=fn;},...globals});
  vm.runInContext(source,context);
  return {context,classes,listeners,host:vm.runInContext("TapTapHost",context)};
}

test("outside TapTap the module stays inert",()=>{
  const {host,classes}=run({});
  assert.equal(host.inHost,false);assert.equal(classes.size,0);
});

test("inside TapTap the page is marked, without logging in or sending anything",()=>{
  const calls=[];
  const tap={setStorageSync(){},getStorageSync(){},login(){calls.push("login");}};
  const {host,classes}=run({tap});
  assert.equal(host.inHost,true);assert.ok(classes.has("taptap-host"));
  assert.deepEqual(calls,[],"tap.login is never called");
  assert.doesNotMatch(source,/\.login\(|fetch\(|XMLHttpRequest|sendBeacon/);
});

test("a host injected after the scripts ran is picked up on load",()=>{
  const {context,host,classes,listeners}=run({});
  context.tap={getSystemInfoSync(){}};
  listeners.load();
  assert.equal(host.inHost,true);assert.ok(classes.has("taptap-host"));
});
