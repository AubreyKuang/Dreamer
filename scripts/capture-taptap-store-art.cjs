#!/usr/bin/env node
/* TapTap store art rendered by the game itself (no outside images, no added fonts):

     python3 scripts/build-taptap.py
     node scripts/capture-taptap-store-art.cjs

   docs/taptap/icon-1024.png         1:1 icon: the roc and cranes over the cloud sea with
                                     the interface hidden, cut from a 1500px square
                                     frame (no scaling), square corners, opaque
   docs/taptap/banner-1920x1080.jpg  16:9 promo image: the title screen, with its
                                     「浮梦之境 · Reverie」 heading and no buttons
   docs/taptap/banner-1440x1440.jpg  1:1 promo image, the same title screen
*/
const fs=require("node:fs"),path=require("node:path");
const {execFileSync}=require("node:child_process");
const {root,sleep,gameSession}=require("./lib/taptap-chrome.cjs");
const out=path.join(root,"docs/taptap");
// The title screen without its tool buttons and start buttons.
const BARE_TITLE=`const style=document.createElement("style");
  style.textContent=".tools,#start,#continueVoyage,.brand{visibility:hidden!important}";document.head.append(style);`;

async function capture(viewport,file,format,prepare){
  const game=await gameSession(viewport);
  try{
    await game.open();
    await prepare(game);
    const {data}=await game.send("Page.captureScreenshot",format==="png"?{format}:{format,quality:92});
    fs.writeFileSync(path.join(out,file),Buffer.from(data,"base64"));
    if(game.errors.length)throw new Error("page errors: "+game.errors.join("\n"));
  }finally{game.close();}
}

async function main(){
  fs.mkdirSync(out,{recursive:true});
  const title=async game=>{await game.evaluate(BARE_TITLE);await sleep(2500);};
  await capture({width:960,height:540,deviceScaleFactor:2,mobile:false},"banner-1920x1080.jpg","jpeg",title);
  await capture({width:720,height:720,deviceScaleFactor:2,mobile:false},"banner-1440x1440.jpg","jpeg",title);
  // The canvas renders at most 1.5× device pixels: 1000 CSS px gives a 1500px frame.
  await capture({width:1000,height:1000,deviceScaleFactor:1.5,mobile:false},"icon-1024.png","png",async game=>{
    await game.click("#start");await sleep(600);
    await game.click("#dream");await sleep(400);
    await game.evaluate(`[...document.querySelectorAll("#dreamChapterChoices .chip")].find(b=>b.textContent==="扶摇").click()`);
    for(let i=0;i<14;i++)await game.key("ArrowUp","ArrowUp",300);
    await game.evaluate(`const style=document.createElement("style");style.textContent=".hud{visibility:hidden!important}";document.head.append(style);`);
    await sleep(900);
  });
  // Icons must be opaque: drop the alpha channel PNG screenshots carry.
  execFileSync("python3",["-c",`from PIL import Image
im=Image.open(${JSON.stringify(path.join(out,"icon-1024.png"))}).convert("RGB")
w,h=im.size;x=(w-1024)//2;y=round(h*.05)
im=im.crop((x,y,x+1024,y+1024))
im.save(${JSON.stringify(path.join(out,"icon-1024.png"))},optimize=True)
for f in ("icon-1024.png","banner-1920x1080.jpg","banner-1440x1440.jpg"):
    p=${JSON.stringify(out)}+"/"+f;i=Image.open(p);import os
    print(f,i.size,i.mode,str(os.path.getsize(p)//1024)+"KB")`],{stdio:"inherit"});
}
main().catch(e=>{console.error(e.message);process.exit(1);});
