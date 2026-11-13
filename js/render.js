"use strict";

function trail(x,y,scale,light){
  const speed=Math.max(0,velocity);
  if(speed<.035)return;
  const length=Math.min(H*.27,28+speed*69);
  const bend=(heading*.19+edgeLean*.24)*length;
  const g=ctx.createLinearGradient(0,y,0,y+length);
  g.addColorStop(0,rgba(light,.57));g.addColorStop(.28,rgba(light,.21));g.addColorStop(1,rgba(light,0));
  ctx.save();ctx.globalAlpha*=clamp(speed*.72,0,1);ctx.strokeStyle=g;
  for(const side of [-1,1]){
    const start=x+side*7*scale, end=start-bend+side*12;
    ctx.lineWidth=side===1?1.45:.85;
    ctx.beginPath();ctx.moveTo(start,y);ctx.bezierCurveTo(start,y+length*.26,end,y+length*.69,end,y+length);ctx.stroke();
  }
  const spray=clamp(Math.abs(edgeLean)*.6+kick*.72+brake*.68,0,1);
  for(let i=0;i<(reduced?9:30);i++){
    const life=wrap(hash(i+971)+t*(.75+hash(i+12)*.9),1);
    const side=i%2?1:-1, width=(8+hash(i+134)*42)*(1+spray);
    const sx=x+side*(5+life*width)*scale-life*bend*.45;
    const sy=y+life*(9+speed*18+hash(i+411)*17)*scale;
    const size=.4+hash(i+173)*1.5;
    ellipse(ctx,sx,sy,size,.6*size,rgba(light,(1-life)*(.12+spray*.76)),side*.6);
  }
  ctx.restore();
}
function traveler(c,x,y,scale,reflection,air=0){
  c.save();c.translate(x,y);c.scale(scale,reflection?-scale*.51:scale);
  c.lineJoin="round";c.lineCap="round";
  const stride=(reduced?0:Math.sin(stridePhase))*Math.min(1,velocity*1.8)*(.4+Math.min(velocity,2)*.29)*(1-air);
  const crouch=brake*10+kick*12+Math.min(velocity,2)*2;
  const lean=edgeLean*21;
  const hipX=lean*.39,hipY=-39+crouch*.44;
  const shoulderX=lean,shoulderY=-70+crouch;
  const line=(color,width,ax,ay,bx,by,cx,cy)=>{
    c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(ax,ay);
    c.quadraticCurveTo(bx,by,cx,cy);c.stroke();
  };
  const shape=(fill,draw)=>{
    c.beginPath();draw();c.closePath();c.fillStyle=fill;c.fill();
  };
  const foot=(side)=>{
    const extension=Math.max(0,side*stride);
    const fx=side*(9+extension*16)-edgeLean*4;
    const fy=side*stride*5+extension*9-air*(side===1?9:3);
    line(side===1?"#31445e":"#25304a",9,hipX+side*6,hipY,fx+lean*.28,-20+crouch*.21,fx,fy-7);
    line("#6d7b92",2.1,hipX+side*7,hipY,fx+lean*.24,-20+crouch*.21,fx,fy-7);
    c.save();c.translate(fx,fy);c.rotate(edgeLean*.38+side*extension*.46);
    shape(side===1?"#e6d2c2":"#b9b5c8",()=>{
      c.moveTo(-4,-12);c.quadraticCurveTo(3,-16,4,-8);
      c.lineTo(5,2);c.quadraticCurveTo(0,6,-5,2);c.lineTo(-5,-6);
    });
    line("#423852",2,-4,2,-2,5,4,3);
    line("#dbf7ff",1.15,-1,-2,-2,5,0,8);
    c.restore();
  };
  foot(stride>0?-1:1);foot(stride>0?1:-1);
  const farewell=routeMode&&!reduced?Math.sin(Math.PI*clamp((waveUntil-t)/2.8,0,1)):0;
  for(const side of [-1,1]){
    const spread=24+Math.abs(edgeLean)*8+brake*6+air*14;
    const handX=shoulderX+side*spread;
    const handY=shoulderY+17+side*edgeLean*13-side*stride*5-air*19-(side===1?farewell*32:0);
    line(side===-1?"#a34e65":"#db7f88",8,shoulderX+side*9,shoulderY+3,handX-side*8,handY+1,handX,handY);
    ellipse(c,handX,handY,3.7,3.3,"#ede1d5",side*.28);
  }
  const coat=c.createLinearGradient(hipX-15,0,shoulderX+14,0);
  coat.addColorStop(0,"#843e62");coat.addColorStop(.56,"#cc667c");coat.addColorStop(1,"#ffc2ac");
  shape(coat,()=>{
    c.moveTo(shoulderX-12,shoulderY-1);c.quadraticCurveTo(shoulderX,shoulderY-9,shoulderX+13,shoulderY);
    c.quadraticCurveTo(shoulderX+17,shoulderY+10,hipX+11,hipY-9);
    c.lineTo(hipX+16,hipY+4);c.quadraticCurveTo(hipX,hipY+10,hipX-16,hipY+4);
    c.lineTo(hipX-12,hipY-9);c.quadraticCurveTo(shoulderX-17,shoulderY+8,shoulderX-12,shoulderY-1);
  });
  line("#ffe0b6",1.15,shoulderX+2,shoulderY,shoulderX+3,hipY-9,hipX+1,hipY+5);
  line("#f4a69b",1.4,hipX-13,hipY+3,hipX,hipY+8,hipX+13,hipY+3);
  const wind=(reduced?0:Math.sin(t*5))*4-edgeLean*19+air*9;
  const scarf=c.createLinearGradient(0,shoulderY,0,shoulderY+49);
  scarf.addColorStop(0,"#fff2c5");scarf.addColorStop(.62,"#f9b96f");scarf.addColorStop(1,"#e98e89");
  shape(scarf,()=>{
    c.moveTo(shoulderX-5,shoulderY-3);
    c.bezierCurveTo(shoulderX-13,shoulderY+13,hipX+wind-11,hipY-3,hipX+wind-14,hipY+15+velocity*4);
    c.lineTo(hipX+wind-7,hipY+12+velocity*4);
    c.bezierCurveTo(hipX+wind-1,hipY-4,shoulderX-5,shoulderY+10,shoulderX+2,shoulderY-3);
  });
  ellipse(c,shoulderX,shoulderY-10,9,10,"#352b49",-.18);
  ellipse(c,shoulderX-1,shoulderY-8,6.5,8,"#52324f",-.28);
  ellipse(c,shoulderX-1,shoulderY-16,4.9,4.3,"#49304a");
  line("#ffdeb1",3,shoulderX-7,shoulderY-3,shoulderX,shoulderY+1,shoulderX+7,shoulderY-4);
  c.restore();
}
const iceRings=[];
function drawIceRings(light){
  for(let i=iceRings.length-1;i>=0;i--){
    const {x,z,at}=iceRings[i], age=(t-at)/1.5;
    if(age>=1){iceRings.splice(i,1);continue;}
    const depth=z-distance;
    if(cameraDepth(x,depth)<57)continue;
    const p=project(x,depth), r=(4+age*94)*p.scale;
    const fade=(1-age)**2;
    if(!reduced){
      ctx.beginPath();ctx.ellipse(p.x,p.y,r,r*.24,0,0,TAU);
      ctx.strokeStyle=rgba(light,fade*.34);ctx.lineWidth=.9;ctx.stroke();
    }
    bloom(ctx,p.x,p.y,7+age*22,light,fade*.30);
  }
}
function lights(light,px,py,world){
  for(const {object:{kind:i,id:key,x:worldX,z:worldZ},depth:z,point:p} of world){
    if(i!==7)continue;
    const x=p.x, y=p.y;
    const size=.9+p.scale*7, b=(.58+.25*Math.sin(t*2+worldZ*.031))*smooth((z-63)/17)*smooth((1240-z)/340);
    if(seen.has(key)) continue;
    bloom(ctx,x,y,size*6,light,b*.68);
    ellipse(ctx,x,y,size,size*.72,rgba(light,b));
    ellipse(ctx,x,y+size*3,size*.62,size*.27,rgba(light,b*.35));
    if(start&&!viewingDialog()&&Math.abs(x-px)<Math.max(32,W*.037)&&Math.abs(y-py)<20){
      seen.add(key);if(seen.size>60) seen.delete(seen.values().next().value);
      iceRings.push({x:worldX,z:worldZ,at:t});
      if(!clean&&t>=nextWhisperAt) pendingWhisper=true;
      found++;
      if($("iceSound").checked)note(found%5);
    }
  }
}
const seen=new Set();
function showIceWhisper(){
  if(!pendingWhisper||flight||clean||t<announcementUntil)return;
  if(routeMode&&storyTime<storyUntil+.8)return;
  if(routeMode&&chapters[chapterIndex].lines[nextLine]?.[3]==="flight"){
    pendingWhisper=false;
    return;
  }
  pendingWhisper=false;
  nextWhisperAt=t+32;
  const seconds=6;
  announce(iceWhispers[whisperIndex++%iceWhispers.length],seconds);
  // Leave time for the whisper to fade before showing the next verse.
  if(routeMode)nextStoryAt=Math.max(nextStoryAt,storyTime+seconds+.8);
}
let resizePending=false;
let practicedTurn=false;
const touchSkating=matchMedia("(pointer: coarse)");
function updateSkateTip(paused,target,throttle){
  const tip=$("skateTip");
  const visible=start&&!settings.skateTipDone&&!clean&&!paused&&!flight&&!freeRoam;
  if(visible&&practicedTurn&&throttle<0&&velocity===0){
    saveSetting("skateTipDone",true);
    if(tip.contains(document.activeElement)) canvas.focus({preventScroll:true});
    announce(storyTime<storyUntil?"诗句已留住 · 松开继续":"已停稳 · 松开继续",2.5);
  }
  if(visible&&Math.abs(target)>=.2&&Math.abs(heading)>=.1) practicedTurn=true;
  tip.hidden=!visible||settings.skateTipDone===true;
  if(tip.hidden)return;
  const text=practicedTurn
    ? (touchSkating.matches?"按住「刹停」，在冰面停下来":"按住 ↓ 刹停")
    : (touchSkating.matches?"在冰面上左右拖动，试着转向":"按 ← 或 →，试着转向");
  if($("skateTipText").textContent!==text) $("skateTipText").textContent=text;
}

function render(ms) {
  if(resizePending){
    resizePending=false;
    resize();
  }
  const dt=previousFrame?clamp((ms-previousFrame)/1000,0,.045):0;
  previousFrame=ms;t+=dt;timeInDream+=dt;
  const paused=viewingDialog();
  transition=Math.min(1,transition+dt/(reduced?1.2:5.8));
  const a=smooth(transition);
  const light=blend(previous.light,current.light,a), water=blend(previous.water,current.water,a);
  const turn=Number(keys.has("ArrowRight")||keys.has("KeyD"))-Number(keys.has("ArrowLeft")||keys.has("KeyA"));
  const target=start?clamp(turn+(drag?.steering??0),-1,1):0;
  heading=lerp(heading,target,1-Math.exp(-dt*(target?2.25:5.5)));
  const forward=keys.has("ArrowUp")||keys.has("KeyW")||[...touchControls.values()].includes(1);
  const slow=keys.has("ArrowDown")||keys.has("KeyS")||[...touchControls.values()].includes(-1);
  const throttle=clamp(Number(forward)-Number(slow)+(drag?.throttle??0),-1,1);
  if(flight&&!paused){
    flight.elapsed+=dt;
    const rise=smooth(flight.elapsed/4.1), fall=smooth((flight.duration-flight.elapsed)/5.4);
    flight.glide=lerp(flight.glide,throttle,1-Math.exp(-dt*1.8));
    flight.height=rise*fall*(.88+flight.glide*.12);
    if(flight.elapsed>=flight.duration){
      flight=null;
      skateBurst("edge");
    }
  }
  const air=flight?.height??0;
  const pace=flight?1.06+throttle*.48:start?Math.max(0,.86+throttle*(throttle<0?.86:1.52)+kick*.9*(1-Math.max(0,-throttle))):.28;
  if(!paused){
    brake=lerp(brake,flight?0:Math.max(0,-throttle),1-Math.exp(-dt*8));
    edgeLean=lerp(edgeLean,heading,1-Math.exp(-dt*6));
    velocity=lerp(velocity,pace*(1-brake*.27),1-Math.exp(-dt*(throttle<0?7:2.7)));
    if(velocity<.025&&brake>.9)velocity=0;
    stridePhase+=dt*velocity*3.8;
    kick=Math.max(0,kick-dt*1.1);
  }
  if(!paused){
    const sideSpeed=(reduced?9:17)*Math.min(1,velocity/.86);
    const lateralStep=heading*dt*sideSpeed;
    if(freeRoam){
      facing=wrap(facing+heading*dt*(reduced?1.2:1.9),TAU);
      viewSin=Math.sin(facing);viewCos=Math.cos(facing);
      const pace=throttle<0?throttle*55:36+throttle*105+kick*59;
      roamVelocity=lerp(roamVelocity,pace,1-Math.exp(-dt*(throttle<0?3.1:2)));
      lateral+=viewSin*roamVelocity*dt/.61;
      distance+=viewCos*roamVelocity*dt;
      velocity=Math.abs(roamVelocity)/44;
    }else{
      lateral+=groveSteeringStep(lateralStep);
      distance+=dt*velocity*(start?32:7);
    }
    position=lerp(position,lateral,1-Math.exp(-dt*1.5));
    if(start&&routeMode) travelStory(dt,lateralStep,!flight&&throttle<=-.9);
  }
  const airborne=Boolean(flight);
  updateSkateTip(paused,target,throttle);
  if($("flightHint").hidden===airborne||$("roamHint").hidden===freeRoam){
    $("flightHint").hidden=!airborne;
    $("hint").hidden=airborne||freeRoam;
    $("roamHint").hidden=!freeRoam;
    $("skateForward").textContent=airborne?"↑ 抬升":"↑ 加速";
    $("skateBrake").textContent=airborne?"↓ 俯瞰":freeRoam?"↓ 倒滑":"↓ 刹停";
    $("push").hidden=airborne;
    $("touch").setAttribute("aria-label",airborne?"乘风操作":"滑冰操作");
  }
  prepareWorld();
  const world=visibleWorld();
  drawSky(light);drawWater(light,water,world);
  drawRouteScenery(light,water,world);
  particles(current,light);
  const px=W*.54+heading*W*(reduced?.009:.022);
  const groundY=horizon+(H-horizon)*(.61-clamp((velocity-.84)*.047,-.09,.08));
  const py=groundY-air*H*(reduced?.13:.27);
  drawIceRings(light);
  if(!flight)lights(light,px,py,world);
  if(!paused&&$("skateTip").hidden)showIceWhisper();
  const scale=clamp(Math.min(W/1020,H/680),.64,1.32);
  const river=lerp(Number(Boolean(previous.river)),Number(Boolean(current.river)),a);
  const ink=lerp(Number(Boolean(previous.ink)),Number(Boolean(current.ink)),a);
  if(air<.08){
    ctx.save();ctx.globalAlpha=1-river*.58;
    trail(px,py,scale,light);ctx.restore();
  }
  ctx.save();ctx.globalAlpha=.20*(1-air)**2*(1-river*.85-ink*.15);
  traveler(ctx,px,groundY+4,scale,true);ctx.restore();
  if(river>0){
    const bearing=-heading*.12;
    if(river>ink){
      riverBoat(px,groundY+5*scale,scale*.91,(river-ink)*.29,true,true,bearing);
      riverBoat(px,groundY,scale*.91,river-ink,true,false,bearing);
    }
    if(ink>0){
      riverBoat(px,groundY+5*scale,scale*.91,ink*.25,false,true,bearing,true);
      riverBoat(px,groundY,scale*.91,ink,false,false,bearing,true);
    }
  }
  drawFlight(px,py,scale);
  bloom(ctx,px,py+2,28*scale,light,.25*(1-air));
  ctx.save();ctx.globalAlpha=1-river;
  traveler(ctx,px,py,scale,false,air);ctx.restore();
  if(!flight)drawCompanions(px,py,scale,light);
  drawPetalShower();
  if(t>0){
    const weather = flight?(flight.mirrorLake?"青云 · 飞渡":"乘风 · 鹤引"):current.weather;
    if($("weather").textContent!==weather) $("weather").textContent=weather;
  }
  updateSkateSound(paused,throttle);
  scoreTick();
  lastPose={name:current.name};
  requestAnimationFrame(render);
}
