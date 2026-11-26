#!/usr/bin/env node
/* Landscape gameplay video for the TapTap store page, recorded from the built package.

     python3 scripts/build-taptap.py
     node scripts/record-taptap-video.cjs     # docs/taptap/gameplay-1920x1080.mp4

   TapTap asks for at least 15 s, a short side of at least 540 px and core play within
   the first 5 s, with no voice-over, subtitles or picture-in-picture. The clip starts
   on the title, steps onto the ice within the first second, steers and pushes, then
   visits four chapters through the game's own chapter picker. The verses on screen
   are the game's. Needs ffmpeg with libx264 and Chrome. */
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {execFileSync}=require("node:child_process");
const {root,sleep,gameSession}=require("./lib/taptap-chrome.cjs");

// 960×540 CSS px at 2× → 1920×1080.
const VIEWPORT={width:960,height:540,deviceScaleFactor:2,mobile:true};
const output=path.join(root,"docs/taptap/gameplay-1920x1080.mp4");

async function main(){
  const frames=fs.mkdtempSync(path.join(os.tmpdir(),"reverie-video-"));
  const game=await gameSession(VIEWPORT),{send,on}=game;
  const recorded=[];let recording=false;
  on("Page.screencastFrame",({data,metadata,sessionId})=>{
    send("Page.screencastFrameAck",{sessionId}).catch(()=>{});
    if(!recording)return;
    const file=path.join(frames,`f${String(recorded.length).padStart(5,"0")}.jpg`);
    fs.writeFileSync(file,Buffer.from(data,"base64"));recorded.push({file,t:metadata.timestamp});
  });
  const skate=async(ms,pattern)=>{
    const until=Date.now()+ms;let i=0;
    while(Date.now()<until){const [code,hold]=pattern[i++%pattern.length];await game.key(code,code,hold);}
  };
  const chapter=async label=>{
    await game.click("#dream");await sleep(450);
    await game.evaluate(`[...document.querySelectorAll("#dreamChapterChoices .chip")].find(b=>b.textContent===${JSON.stringify(label)}).click()`);
  };
  try{
    await game.open();
    await send("Page.startScreencast",{format:"jpeg",quality:92,maxWidth:1920,maxHeight:1080,everyNthFrame:1});
    recording=true;await sleep(500);

    // Onto the ice: steer left and right, push off, speed up.
    await game.click("#start");await sleep(500);
    if(await game.evaluate(`return !document.getElementById("skateTip").hidden`))await game.click("#dismissSkateTip");
    await skate(7000,[["ArrowUp",500],["ArrowLeft",700],["Space",120],["ArrowUp",500],["ArrowRight",900],["ArrowUp",400]]);
    // The kun under the aurora.
    await chapter("北冥有鱼");
    await skate(7000,[["ArrowUp",600],["ArrowRight",600],["ArrowUp",600],["ArrowLeft",500]]);
    // Riding the wind with the roc.
    await chapter("扶摇");
    await skate(7000,[["ArrowUp",700],["ArrowLeft",600],["ArrowDown",400],["ArrowRight",700]]);
    // Peach blossoms along the stream.
    await chapter("桃源深处");
    await skate(7000,[["ArrowUp",600],["ArrowLeft",500],["Space",120],["ArrowUp",600]]);
    // Snow on the cold river.
    await chapter("寒江独钓");
    await skate(6500,[["ArrowUp",700],["ArrowDown",500],["ArrowUp",500]]);
    recording=false;await send("Page.stopScreencast");
    if(game.errors.length)throw new Error("page errors: "+game.errors.join("\n"));
  }finally{game.close();}

  if(recorded.length<100)throw new Error("too few frames recorded: "+recorded.length);
  const list=recorded.map((f,i)=>{
    const next=recorded[i+1]?.t??f.t+1/30;
    return `file '${f.file}'\nduration ${Math.max(next-f.t,1/60).toFixed(4)}`;
  }).join("\n")+`\nfile '${recorded.at(-1).file}'\n`;
  fs.writeFileSync(path.join(frames,"list.txt"),list);
  execFileSync("ffmpeg",["-y","-hide_banner","-loglevel","error","-f","concat","-safe","0","-i",path.join(frames,"list.txt"),
    "-vf","fps=30,scale=1920:1080:flags=lanczos,format=yuv420p","-c:v","libx264","-profile:v","high","-crf","20","-preset","slow",
    "-an","-movflags","+faststart",output],{stdio:"inherit"});
  fs.rmSync(frames,{recursive:true,force:true});
  const seconds=recorded.at(-1).t-recorded[0].t;
  console.log(`${path.relative(root,output)}  ${seconds.toFixed(1)}s  ${(fs.statSync(output).size/1048576).toFixed(1)}MB  ${recorded.length} frames (${(recorded.length/seconds).toFixed(0)} fps captured)`);
}
main().catch(e=>{console.error(e.message);process.exit(1);});
