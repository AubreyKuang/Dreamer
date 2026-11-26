#!/usr/bin/env node
/* Landscape store screenshots of the built TapTap package, played in headless
   Chrome with phone touch input (DevTools protocol; Node 22+).

     python3 scripts/build-taptap.py
     node scripts/capture-taptap-screenshots.cjs      # docs/taptap/screenshots/*.jpg

   Each shot jumps to a chapter through the game's own 「换一个梦 → 直达航段」 picker,
   skates forward with held keys and is taken while that chapter's verse is on
   screen. Nothing is drawn over the game. */
const fs=require("node:fs"),path=require("node:path");
const {root,sleep,gameSession}=require("./lib/taptap-chrome.cjs");

const out=path.join(root,"docs/taptap/screenshots");
// 960×540 CSS px at 2× → 1920×1080.
const VIEWPORT={width:960,height:540,deviceScaleFactor:2,mobile:true};
// [file, chapter picker label, seconds of skating before the shot]
const SHOTS=[
  ["01-begonia","海棠渡",11],
  ["02-kun","北冥有鱼",6],
  ["03-flight","扶摇",6],
  ["04-stars","天河星原",6],
  ["05-forest","灯火葳蕤",11],
  ["06-peach","桃源深处",6],
  ["07-moon-river","春江花月夜",6],
  ["08-snow-river","寒江独钓",6],
];

async function main(){
  const game=await gameSession(VIEWPORT);
  try{
    fs.mkdirSync(out,{recursive:true});
    await game.open();
    await game.click("#start");await sleep(800);
    if(await game.evaluate(`return !document.getElementById("skateTip").hidden`))await game.click("#dismissSkateTip");
    for(const [name,label,seconds] of SHOTS){
      await game.click("#dream");await sleep(500);
      await game.evaluate(`const chip=[...document.querySelectorAll("#dreamChapterChoices .chip")].find(b=>b.textContent===${JSON.stringify(label)});
        if(!chip)throw new Error("no chapter ${label}");chip.click();`);
      const until=Date.now()+seconds*1000;
      while(Date.now()<until)await game.key("ArrowUp","ArrowUp",300);
      // Wait for a verse to be fully shown.
      for(let i=0;i<60;i++){
        if(await game.evaluate(`const s=document.getElementById("story");return s.classList.contains("show")&&getComputedStyle(s).opacity==="1"`))break;
        await sleep(200);
      }
      await sleep(400);
      const check=await game.evaluate(`return {scene:document.getElementById("sceneName").textContent,dialog:!!document.querySelector("dialog[open]"),text:document.body.innerText}`);
      if(check.dialog||/无法保存/.test(check.text))throw new Error(name+": dialog or save warning on screen");
      const {data}=await game.send("Page.captureScreenshot",{format:"jpeg",quality:92});
      fs.writeFileSync(path.join(out,name+".jpg"),Buffer.from(data,"base64"));
      console.log("captured",name,check.scene);
    }
    if(game.errors.length)throw new Error("page errors: "+game.errors.join("\n"));
  }finally{game.close();}
}
main().catch(e=>{console.error(e.message);process.exit(1);});
