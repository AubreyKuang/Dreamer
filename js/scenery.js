"use strict";

const worldCellWidth=280, worldCellDepth=260;
const worldCells=new Map();
function prepareWorld(){
  // World coordinates determine placement, so revisiting a cell restores the same scenery.
  const sideSpan=freeRoam?1420:1220;
  const left=Math.floor((lateral*.61-sideSpan)/worldCellWidth), right=Math.floor((lateral*.61+sideSpan)/worldCellWidth);
  const front=Math.floor((distance+(freeRoam?-1420:60))/worldCellDepth);
  const back=Math.floor((distance+(freeRoam?1420:1240))/worldCellDepth);
  for(const [key,{column,row}] of worldCells){
    if(column<left||column>right||row<front||row>back)worldCells.delete(key);
  }
  for(let row=front;row<=back;row++){
    for(let column=left;column<=right;column++){
      const key=column+","+row;
      if(worldCells.has(key))continue;
      const objects=[];
      for(let i=0;i<8;i++){
        const seed=column*71317+row*25391+i*149;
        objects.push({
          id:key+","+i, seed, kind:i,
          x:(column+hash(seed+5))*worldCellWidth,
          z:(row+(i+hash(seed+9))/8)*worldCellDepth
        });
      }
      worldCells.set(key,{column,row,objects});
    }
  }
}
function visibleWorld(){
  const visible=[];
  for(const {objects} of worldCells.values()){
    for(const object of objects){
      const depth=cameraDepth(object.x,object.z-distance);
      if(depth<63||depth>1240)continue;
      const point=project(object.x,object.z-distance);
      const margin=Math.max(32,220*point.scale);
      if(point.x < -margin || point.x > W+margin)continue;
      visible.push({object,depth,point});
    }
  }
  return visible.sort((a,b)=>b.depth-a.depth);
}
function cameraDepth(x,z){
  return (x-lateral*.61)*viewSin+z*viewCos;
}
function project(x,z) {
  const localX=x-lateral*.61;
  const near=62/Math.max(62,cameraDepth(x,z)), deep=H-horizon;
  return {x:W*.54+(localX*viewCos-z*viewSin)*near*W*.018,
    y:horizon+near*deep, scale:near*clamp(Math.min(W/850,H/580),.6,1.65)};
}
function drawRouteScenery(light,water,world){
  const deep=H-horizon,travel=routeDistance;
  const mix=smooth(transition), forest=lerp(Number(Boolean(previous.forest)),Number(Boolean(current.forest)),mix);
  const jade=lerp(Number(Boolean(previous.jade)),Number(Boolean(current.jade)),mix);
  const grove=lerp(Number(Boolean(previous.grove)),Number(Boolean(current.grove)),mix);
  const farm=lerp(Number(Boolean(previous.farmland)),Number(Boolean(current.farmland)),mix);
  const river=lerp(Number(Boolean(previous.river)),Number(Boolean(current.river)),mix);
  const ink=lerp(Number(Boolean(previous.ink)),Number(Boolean(current.ink)),mix);
  if(forest>0) drawForest(forest,world);
  if(jade>0) drawJadeBanks(jade,world);
  if(grove>0) drawPeachGrove(grove,world);
  if(farm>0) drawFarmland(farm,world);
  const cliff=lerp(Number(Boolean(previous.redCliff)),Number(Boolean(current.redCliff)),mix);
  const moonRiver=lerp(Number(Boolean(previous.moonRiver)),Number(Boolean(current.moonRiver)),mix);
  const harp=lerp(Number(Boolean(previous.harp)),Number(Boolean(current.harp)),mix);
  const mirror=lerp(Number(Boolean(previous.mirrorLake)),Number(Boolean(current.mirrorLake)),mix);
  const openRiver=river-cliff-moonRiver-ink;
  if(openRiver>0) drawRiver(openRiver,world);
  if(cliff>0) drawRedCliff(cliff,world);
  if(moonRiver>0) drawMoonRiver(moonRiver,world);
  if(ink>0)drawInkRiver(ink,world);
  if(harp>0) drawHarpBanks(harp,world);
  if(mirror>0){
    const view=routeMode&&chapterIndex===mirrorLakeChapter?mirrorView:null;
    const air=flight?.height??0;
    drawMirrorMoon(mirror*(view==="water"?1:1-air),view==="water");
    if(view==="sky"){
      const radius=Math.min(W,H)*.045, x=W*.69, y=horizon*.57;
      bloom(ctx,x,y,radius*2.8,[253,227,188],mirror*.7);
      ellipse(ctx,x,y,radius,radius,rgba([253,239,211],mirror*.94));
    }
  }
  if(moonRiver+harp+mirror>0)drawColorReflections(moonRiver,harp,mirror);
  const base=Math.max(0,1-forest-jade-grove-farm-river-harp);
  if(base===0)return;
  ctx.save();ctx.globalAlpha=base;
  const shadow=routeMode?smooth((travel-665)/265)*(1-smooth((travel-980)/440)):0;
  if(shadow>.001){
    kun(ctx,W*(.6+Math.sin(t*.46)*.06)-Math.sin(position*.003)*W*.12,
      horizon+deep*.46,Math.min(W/590,H/445),.07,shadow*.69,
      blend(water,light,.24),blend(water,[12,16,49],.75));
  }
  const cloudSea=routeMode?smooth((travel-1430)/520)*(1-smooth((travel-2310)/600)):0;
  const petals=routeMode?1-smooth((travel-280)/530):.42;
  const reedBank=routeMode?smooth((travel-448)/96)*(1-smooth((travel-840)/230)):0;
  for(const {object:{kind:i,seed:key},depth:z,point:p} of world){
    const s=p.scale, alpha=smooth((z-63)/65)*smooth((1240-z)/490);
    if(reedBank>0&&i===5){
      for(let stem=0;stem<5;stem++){
        const x=p.x+(hash(key+stem*7)-.5)*31*s, height=(17+hash(key+stem*3+17)*49)*s;
        const bend=(reduced?3:5+Math.sin(t*.87+key+stem)*4)*s;
        ctx.beginPath();ctx.moveTo(x,p.y);ctx.quadraticCurveTo(x,p.y-height*.63,x+bend,p.y-height);
        ctx.lineWidth=Math.max(.6,s*1.7);ctx.strokeStyle=rgba([99,134,133],reedBank*alpha*.79);ctx.stroke();
        ellipse(ctx,x+bend,p.y-height,2.6*s,7.2*s,rgba([219,209,194],reedBank*alpha*.89),.26);
      }
    }
    if(i<2){
      const width=(49+hash(key+7)*133)*s, tall=(29+hash(key+9)*97)*s;
      ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha*=alpha*(1-cloudSea*.88);
      ellipse(ctx,0,tall*.09,width*1.27,tall*.21,rgba(light,.22));
      const g=ctx.createLinearGradient(0,-tall,0,0);
      g.addColorStop(0,rgba(blend(water,light,.53),1));g.addColorStop(1,rgba(blend(water,light,.13),1));
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-width,0);
      ctx.bezierCurveTo(-width*.67,-tall*.1,-width*.46,-tall*.82,-width*.3,-tall*.73);
      ctx.bezierCurveTo(-width*.03,-tall*.64,width*.05,-tall*1.21,width*.21,-tall*.92);
      ctx.bezierCurveTo(width*.42,-tall*.86,width*.45,-tall*.37,width,0);
      ctx.quadraticCurveTo(0,tall*.21,-width,0);ctx.fill();
      shoreDetail(width,tall,key,light,water,petals,cloudSea);
      ctx.restore();
      if(cloudSea>.01){
        ctx.save();ctx.translate(p.x,p.y-tall*.7);ctx.scale(1,.26);
        bloom(ctx,0,0,width*2,light,alpha*cloudSea*.59);ctx.restore();
      }
    }else{
      const radius=(4+hash(key+8)*13)*s;
      ellipse(ctx,p.x,p.y,radius*2.3,radius*.42,rgba(light,alpha*.32));
      ellipse(ctx,p.x,p.y-radius*.37,radius,radius*.41,
        rgba(blend(light,[237,134,169],petals*.61),alpha*(.37+petals*.49)),Math.sin(t*.8+i)*.31);
    }
  }
  ctx.restore();
}
function drawColorReflections(moonRiver,harp,mirror){
  const opacity=moonRiver+harp+mirror;
  const clock=reduced?0:t;
  for(let i=0;i<38;i++){
    const seed=i*61+7, depth=hash(seed+3);
    const x=W*(hash(seed)+Math.sin(clock*.41+i)*.018);
    const y=horizon+(H-horizon)*depth**1.55;
    const color=blend(blend(pigments[11][i%6],pigments[12][i%6],harp/Math.max(.001,moonRiver+harp)),
      pigments[13][i%6],mirror/opacity);
    const gleam=opacity*(.18+hash(seed+21)*.24)*(.76+.24*Math.sin(clock*.9+i));
    const width=W*(.007+depth*.077)*(.4+hash(seed+14)*.6);
    pigmentGlow(ctx,x,y,width,.12,-.06,color,gleam);
    if(i%4===0)ellipse(ctx,x,y,width*.22,Math.max(.5,depth*1.25),rgba(color,gleam*.67),-.07);
  }
}
function drawRedCliff(opacity,world){
  const moonlight=[222,239,215];
  const clock=reduced?0:t;
  for(let i=0;i<36;i++){
    const u=(i+.5)/36, y=horizon+(H-horizon)*u;
    const x=W*(.81+Math.sin(clock*.58+i*.68)*(.007+u*.043));
    pigmentGlow(ctx,x,y,W*(.012+u*.091),.10,0,moonlight,opacity*(.23-u*.095));
  }
  for(const {object:{kind,seed,x},depth:z,point:p} of world){
    if(kind!==0||Math.abs(x-lateral*.61)<65)continue;
    const alpha=opacity*smooth((z-63)/100)*smooth((1240-z)/620);
    const width=(42+hash(seed+27)*99)*p.scale, height=(27+hash(seed+31)*105)*p.scale;
    if(p.x+width<0||p.x-width>W)continue;
    const rock=ctx.createLinearGradient(p.x,p.y-height,p.x,p.y);
    rock.addColorStop(0,rgba([156,124,123],alpha*.80));
    rock.addColorStop(.52,rgba([106,87,106],alpha*.88));
    rock.addColorStop(1,rgba([37,63,86],alpha*.84));
    ctx.fillStyle=rock;ctx.beginPath();ctx.moveTo(p.x-width,p.y);
    ctx.lineTo(p.x-width*.63,p.y-height*.47);ctx.lineTo(p.x-width*.44,p.y-height*.89);
    ctx.lineTo(p.x+width*.04,p.y-height);ctx.lineTo(p.x+width*.32,p.y-height*.72);
    ctx.lineTo(p.x+width,p.y);ctx.closePath();ctx.fill();
    pigmentGlow(ctx,p.x,p.y+height*.16,width,.16,0,[156,128,135],alpha*.31);
  }
}
const moonFlowers=["#c5d8eb","#e5e9f7","#fff0d8","#d4c8ee"];
function drawMoonRiver(opacity,world){
  for(let i=0;i<18;i++){
    const depth=(i+.5)/18, ripple=Math.sin((reduced?0:t)*.61+i*.77);
    const x=W*(.81+(ripple*.016+Math.sin(position*.0026)*-.093)*depth);
    pigmentGlow(ctx,x,horizon+(H-horizon)*depth,W*(.018+depth*.067),.11,0,
      [216,238,255],opacity*(.32-depth*.11));
  }
  if(routeMode&&chapterIndex===moonRiverChapter&&moonReflection){
    const age=moonResultAt===null?0:storyTime-moonResultAt;
    const fade=opacity*(1-smooth((age-MOON_REFLECTION_HOLD)/MOON_REFLECTION_FADE));
    const deep=H-horizon;
    if(fade>0&&moonReflection==="flower"){
      const x=W*.71, y=horizon+deep*.63, size=Math.min(W,deep)*.16;
      pigmentGlow(ctx,x,y,size*1.35,.33,0,[181,207,247],fade*.43);
      for(let i=0;i<5;i++){
        const angle=i*TAU/5;
        ellipse(ctx,x+Math.cos(angle)*size*.43,y+Math.sin(angle)*size*.23,
          size*.38,size*.15,rgba([228,239,255],fade*.61),Math.sin(angle)*.42);
      }
      ellipse(ctx,x,y,size*.15,size*.07,rgba([255,240,219],fade*.80));
    }
    if(fade>0&&moonReflection==="ribbon"){
      for(let i=0;i<12;i++){
        const depth=i/11;
        const x=W*lerp(.65,.86,depth), y=horizon+deep*lerp(.28,.90,depth);
        pigmentGlow(ctx,x,y,W*lerp(.014,.105,depth),.17,0,[210,233,255],fade*.54);
      }
    }
  }
  for(const {object:{kind,seed},depth:z,point:p} of world){
    if(kind>4)continue;
    const bank=smooth((Math.abs(p.x/W-.54)-.10)/.085);
    if(bank===0)continue;
    const fade=opacity*bank*smooth((z-63)/85)*smooth((1240-z)/520);
    const height=(66+hash(seed+41)*128)*p.scale;
    const wind=reduced?0:Math.sin(t*.82+seed)*height*.085;
    ctx.strokeStyle=rgba([90,114,153],fade*.82);
    ctx.lineWidth=Math.max(.6,height*.028);
    ctx.beginPath();ctx.moveTo(p.x,p.y);
    ctx.quadraticCurveTo(p.x-height*.12,p.y-height*.63,p.x+wind,p.y-height);ctx.stroke();
    for(let i=0;i<7;i++){
      const spread=(hash(seed+i*21+17)-.5)*height*1.12;
      const y=p.y-height*(.73+hash(seed+i*29+3)*.34), x=p.x+wind+spread;
      ctx.beginPath();ctx.moveTo(p.x,p.y-height*.50);
      ctx.quadraticCurveTo(p.x+spread*.34,y+height*.12,x,y);ctx.stroke();
      const radius=Math.max(.55,height*(.055+hash(seed+i*13)*.055));
      if(i%3===0)pigmentGlow(ctx,x,y,radius*3.4,.75,0,[214,229,251],fade*.36);
      ctx.save();ctx.globalAlpha=fade*.89;
      for(let petal=0;petal<5;petal++){
        const angle=petal*TAU/5+i;
        ellipse(ctx,x+Math.cos(angle)*radius*.64,y+Math.sin(angle)*radius*.59,
          radius*.78,radius*.45,moonFlowers[(i+petal)%4],angle);
      }
      ctx.restore();
      pigmentGlow(ctx,x,p.y+(p.y-y)*.36,radius*2.4,.37,0,[212,232,250],fade*.23);
    }
  }
}
function harpSide(step){return Math.floor(step/3)%2?-1:1;}
function drawHarpBanks(opacity,world){
  const listeningSide=listeningHarpSide();
  const active=listeningSide??(scoreLayer?.score===scores[harpChapter]&&audioOn?(scoreLayer.pluckSide??1):harpSide(Math.floor(timeInDream/2.28)));
  const glowX=W*(.54+active*.26);
  const bankColor=listeningSide&&active<0?[127,218,184]:[211,168,244];
  pigmentGlow(ctx,glowX,horizon+(H-horizon)*.20,W*.25,.28,0,bankColor,opacity*(listeningSide?.76:.42));
  const duet=listeningSide&&harpDuet;
  if(duet){
    const otherColor=active<0?[211,168,244]:[127,218,184];
    pigmentGlow(ctx,W*(.54-active*.26),horizon+(H-horizon)*.20,W*.25,.28,0,otherColor,opacity*.76);
  }
  for(let i=0;i<12;i++){
    const depth=(i+.5)/12, x=lerp(glowX,W*(.54+active*.43),depth);
    const y=horizon+(H-horizon)*depth**1.4;
    const shimmer=reduced?.8:.76+.24*Math.sin(t*.93-i*.81);
    pigmentGlow(ctx,x,y,W*(.021+depth*.10),.095,-active*.10,
      pigments[12][i%6],opacity*shimmer*(.12+depth*.18));
  }
  for(const {object:{kind,seed},depth:z,point:p} of world){
    if(kind<2||kind>6)continue;
    const side=p.x<W*.54?-1:1;
    const pulse=reduced?.55:.52+.43*Math.sin(t*1.1+seed*.018);
    const fade=opacity*smooth((z-63)/90)*smooth((1240-z)/480);
    const power=duet||side===active?(.55+pulse*.45):.25;
    const r=(20+hash(seed+29)*44)*p.scale;
    const color=kind%2?[244,151,197]:[151,219,193];
    pigmentGlow(ctx,p.x,p.y,r*2.8,.25,0,color,fade*power*.55);
    if(kind%2){
      ellipse(ctx,p.x-r*.57,p.y+r*.14,r*.93,r*.29,rgba([89,167,147],fade*.77),-.18);
      ellipse(ctx,p.x+r*.54,p.y+r*.23,r*.73,r*.23,rgba([146,205,161],fade*.49),.16);
    }
    for(let i=0;i<6;i++){
      const angle=i*TAU/6;
      ellipse(ctx,p.x+Math.cos(angle)*r*.33,p.y-r*.21+Math.sin(angle)*r*.19,
        r*.41,r*.18,rgba(color,fade*power*.87),angle);
    }
    ellipse(ctx,p.x,p.y-r*.21,r*.19,r*.12,rgba([255,228,156],fade*power));
    ellipse(ctx,p.x+r*.14,p.y-r*.43,r*.13,r*.06,rgba([255,237,217],fade*power*.85),-.21);
  }
}
function drawInkRiver(opacity,world){
  const snowDistance=routeDistance-chapters[inkChapter].at;
  if(routeMode&&chapterIndex===inkChapter){
    const pavilion=smooth((snowDistance-470)/140)*(1-smooth((snowDistance-745)/120))*opacity;
    const x=W*.65-Math.sin(position*.003)*W*.035,y=horizon+(H-horizon)*.105;
    const size=Math.min(W,H)*.023;
    ellipse(ctx,x-size*.58,y+size*.13,size*4.2,size*.095,rgba([99,99,99],pavilion*.40),-.015);
    ctx.fillStyle=rgba([53,53,53],pavilion*.8);
    ctx.beginPath();ctx.moveTo(x-size,y-size*.42);ctx.quadraticCurveTo(x-size*.22,y-size*.53,x,y-size*.94);
    ctx.quadraticCurveTo(x+size*.32,y-size*.56,x+size,y-size*.42);
    ctx.quadraticCurveTo(x,y-size*.34,x-size,y-size*.42);ctx.fill();
    ctx.fillRect(x-size*.49,y-size*.39,size*.085,size*.48);
    ctx.fillRect(x+size*.40,y-size*.39,size*.085,size*.48);
    pigmentGlow(ctx,x,y+size*.45,size,.22,0,[95,95,95],pavilion*.25);
  }
  for(const {object:{kind,seed},depth:z,point:p} of world){
    if(kind!==1||Math.abs(p.x/W-.54)<.19)continue;
    const fade=opacity*smooth((z-63)/96)*smooth((1240-z)/610);
    const width=(30+hash(seed+5)*69)*p.scale;
    pigmentGlow(ctx,p.x,p.y,width,.12,-.06,[54,54,54],fade*.46);
    const height=(25+hash(seed+9)*52)*p.scale;
    ctx.strokeStyle=rgba([40,40,40],fade*.74);
    ctx.lineWidth=Math.max(.55,p.scale*2.5);
    for(let i=0;i<6;i++){
      const base=p.x+(i-2.5)*width*.19;
      const lean=(hash(seed+i*17)-.25)*height*.41;
      ctx.beginPath();ctx.moveTo(base,p.y);ctx.quadraticCurveTo(base,p.y-height*.63,base+lean,p.y-height*(.61+i*.062));ctx.stroke();
    }
  }
  const clock=reduced?0:t;
  for(let i=0;i<(reduced?22:81);i++){
    const depth=hash(i*21+9);
    const x=wrap(hash(i*7+1)*W+clock*(3+depth*9),W);
    const y=wrap(hash(i*13+5)*H+clock*(7+depth*21),H);
    const radius=.46+depth*1.6;
    ellipse(ctx,x,y,radius,radius,rgba([252,252,252],opacity*(.35+depth*.55)));
    if(depth>.77)ellipse(ctx,x+.6,y+.8,radius*.63,radius*.61,rgba([115,115,115],opacity*.15));
  }
}
function drawMirrorMoon(opacity,focused=false){
  const x=W*.54+heading*W*.028, deep=H-horizon;
  const clock=reduced?0:t;
  const color=[250,231,199];
  for(let i=0;i<21;i++){
    const u=(i+1)/22, y=horizon+deep*(.12+u*.83);
    const ripple=Math.sin(clock*.62+i*.97);
    pigmentGlow(ctx,x+ripple*W*(.003+u*.011),y,
      W*(.012+u*.056),.105,0,color,opacity*(.13+u*.12));
  }
  const y=horizon+deep*.53, radius=Math.min(W,H)*(focused?.059:.029);
  pigmentGlow(ctx,x,y,radius*2.4,.54,0,color,opacity*.46);
  ellipse(ctx,x,y,radius,radius*.64,rgba(color,opacity*.72));
}
const riverLamp=[255,188,114];
function riverBoat(x,y,size,opacity,lantern,reflection=false,bearing=0,ink=false){
  ctx.save();ctx.translate(x,y);
  ctx.rotate(reflection?-bearing:bearing);
  ctx.scale(size,reflection?-size*.52:size);
  ctx.globalAlpha=opacity;
  if(ink){
    ctx.beginPath();ctx.moveTo(-53,-9);ctx.quadraticCurveTo(-2,0,53,-14);
    ctx.quadraticCurveTo(43,4,19,8);ctx.quadraticCurveTo(-25,10,-53,-9);
    ctx.fillStyle="#303030";ctx.fill();
    ctx.beginPath();ctx.moveTo(-43,-5);ctx.quadraticCurveTo(4,4,44,-9);
    ctx.strokeStyle="#b8b8b8";ctx.lineWidth=1.2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-19,-9);ctx.quadraticCurveTo(-18,-23,-10,-26);
    ctx.quadraticCurveTo(-5,-23,0,-9);ctx.fillStyle="#414141";ctx.fill();
    ctx.beginPath();ctx.moveTo(-23,-24);ctx.lineTo(-12,-34);ctx.lineTo(-1,-25);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(-3,-17);ctx.quadraticCurveTo(18,-29,52,-31);
    ctx.quadraticCurveTo(57,-25,59,-7);ctx.strokeStyle="#4e4e4e";ctx.lineWidth=.9;ctx.stroke();
    ctx.restore();return;
  }
  const hull=ctx.createLinearGradient(0,-10,0,12);
  hull.addColorStop(0,"#a07868");hull.addColorStop(.45,"#59414a");hull.addColorStop(1,"#283047");
  ctx.beginPath();ctx.moveTo(-52,-9);ctx.quadraticCurveTo(-17,-15,22,-13);
  ctx.quadraticCurveTo(42,-12,57,-20);ctx.quadraticCurveTo(47,-1,29,6);
  ctx.quadraticCurveTo(1,16,-34,8);ctx.quadraticCurveTo(-46,4,-52,-9);
  ctx.fillStyle=hull;ctx.fill();
  ctx.beginPath();ctx.moveTo(-51,-9);ctx.quadraticCurveTo(-15,-9,20,-8);
  ctx.quadraticCurveTo(46,-10,57,-20);ctx.quadraticCurveTo(47,-23,22,-17);
  ctx.quadraticCurveTo(-21,-18,-51,-9);ctx.fillStyle="#413443";ctx.fill();
  ctx.lineWidth=1.25;ctx.strokeStyle="#c09983";ctx.stroke();
  ctx.beginPath();ctx.moveTo(-43,-1);ctx.quadraticCurveTo(-5,12,36,0);
  ctx.moveTo(-36,4);ctx.quadraticCurveTo(-4,13,25,6);
  ctx.strokeStyle="#886366";ctx.lineWidth=.8;ctx.stroke();
  ctx.beginPath();ctx.moveTo(26,-16);ctx.lineTo(33,-10);
  ctx.moveTo(38,-17);ctx.lineTo(44,-14);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-26,-10);ctx.lineTo(-22,-23);
  ctx.quadraticCurveTo(-20,-27,-14,-27);ctx.lineTo(7,-29);
  ctx.quadraticCurveTo(14,-29,17,-24);ctx.lineTo(23,-11);ctx.closePath();
  ctx.fillStyle="#554353";ctx.fill();ctx.strokeStyle="#96717a";ctx.stroke();
  ctx.fillStyle="#282e43";ctx.fillRect(8,-22,8,9);
  ctx.beginPath();ctx.moveTo(-13,-26);ctx.lineTo(-16,-11);
  ctx.moveTo(-4,-27);ctx.lineTo(-6,-11);ctx.stroke();
  if(lantern){
    ctx.beginPath();ctx.moveTo(30,-13);ctx.lineTo(30,-29);ctx.lineTo(35,-29);
    ctx.strokeStyle="#bd9381";ctx.lineWidth=1;ctx.stroke();
    bloom(ctx,35,-24,18,riverLamp,.65);
    ctx.fillStyle="#ffe0a6";ctx.fillRect(33,-27,4,6);
  }
  ctx.restore();
}
function drawRiver(opacity,world){
  const stage=Math.max(0,routeDistance-chapters[riverChapter].at);
  const harbor=smooth((stage-350)/185)*(1-smooth((stage-655)/145));
  for(let i=0;i<9;i++){
    const depth=hash(i+217);
    const x=W*(wrap(hash(i+41)+t*.004-lateral*.0017,1.3)-.15);
    const y=horizon+(H-horizon)*(.025+depth*.38);
    pigmentGlow(ctx,x,y,W*(.15+depth*.12),.052,-.037,blend([149,150,194],[119,172,179],harbor),opacity*(.11+depth*.14));
  }
  for(const {object:{kind,seed,x,z:worldZ},depth:z,point:p} of world){
    if(kind!==0)continue;
    const fade=opacity*smooth((z-63)/140)*smooth((1240-z)/590);
    if(hash(seed+14)>.37){
      const width=(29+hash(seed+73)*74)*p.scale, rise=width*(.15+hash(seed+9)*.36);
      ellipse(ctx,p.x,p.y,width,rise,rgba([38,48,83],fade*.77),-.10);
      pigmentGlow(ctx,p.x,p.y+rise*.6,width*.91,.18,.02,[104,112,161],fade*.33);
      if(hash(seed+40)>.69&&stage<735){
        const y=p.y-rise*.7, house=width*.23;
        const wall=rgba([84,88,110],fade*harbor);
        ctx.fillStyle=wall;ctx.fillRect(p.x-house,y-house*.78,house*2,house*.96);
        ctx.beginPath();ctx.moveTo(p.x-house*1.22,y-house*.7);ctx.lineTo(p.x,y-house*1.64);
        ctx.lineTo(p.x+house*1.22,y-house*.7);ctx.fill();
        bloom(ctx,p.x,y,6+14*p.scale,riverLamp,fade*.73);
        ellipse(ctx,p.x,y,1.4+p.scale,1+p.scale,rgba(riverLamp,fade*.96));
      }
      continue;
    }
    const drift=reduced?0:Math.sin(t*.23+seed*.09)*14;
    const boat=project(x+drift,worldZ-distance);
    const size=(.64+hash(seed+51)*.56)*p.scale;
    riverBoat(boat.x,boat.y+3*size,size,fade*.27,true,true);
    riverBoat(boat.x,boat.y,size,fade,true);
  }
  // Let another traveller pass close enough to see their light, then drift away.
  const traveller=passingBoat();
  if(traveller){
    const {pass,x,z}=traveller, fade=opacity*smooth(pass*6)*smooth((1-pass)*5);
    const p=project(x,z);
    const reply=t<travellerReplyUntil;
    if(t<sharedLightsUntil){
      const own=project(lateral*.61,z);
      const light=fade*smooth((sharedLightsUntil-t)/.7);
      for(const lamp of [p,own]){
        pigmentGlow(ctx,lamp.x,lamp.y+10*lamp.scale,27*lamp.scale,1.9,0,riverLamp,light*.7);
      }
    }
    if(!metTraveller||reply){
      const sway=reply&&!reduced?Math.sin(t*12)*3:0;
      bloom(ctx,p.x+12*p.scale+sway,p.y-27*p.scale,(reply?36:26)*p.scale,riverLamp,fade*(reply?1:.86));
    }
    riverBoat(p.x,p.y+3*p.scale,p.scale*1.06,fade*.29,true,true);
    riverBoat(p.x,p.y,p.scale*1.06,fade,true);
  }
  if(routeMode&&chapterIndex===riverChapter&&riverPier)drawRiverPier(opacity);
}
function drawRiverPier(opacity){
  const approach=routeDistance-riverPier.start;
  const fade=opacity*smooth((405-approach)/108);
  if(fade<=0)return;
  const z=Math.max(110,286-approach*.67);
  const p=project(riverPier.x,z);
  const s=p.scale*1.8;
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.scale(s,s);
  ctx.globalAlpha*=fade;
  ellipse(ctx,-29,4,55,13,"#27344e",-.08);
  ctx.fillStyle="#7b645d";
  ctx.fillRect(-26,-6,44,7);
  ctx.fillStyle="#ae8571";
  for(const x of [-23,-8,7,16])ctx.fillRect(x,-8,2,17);
  ctx.fillRect(14,-28,3,23);
  bloom(ctx,17,-30,landedAtPier?28:19,riverLamp,.86);
  ctx.fillStyle="#ffe0a6";
  ctx.fillRect(14,-34,7,9);
  ctx.restore();
  if(!landedAtPier){
    const boat=project(riverPier.x+lerp(25,7,smooth(approach/190)),z-10);
    riverBoat(boat.x,boat.y,boat.scale,fade,true);
  }
}
const jadeColors=[[73,151,139],[102,172,151],[166,211,170],[255,222,164]];
function drawJadeBanks(opacity,world){
  for(const {object:{kind:i,seed},depth:z,point:p} of world){
    if(i>3)continue;
    const side=i%2?1:-1;
    const width=(22+hash(seed+39)*64)*p.scale, height=(13+hash(seed+54)*44)*p.scale;
    if(p.x+width<0||p.x-width>W)continue;
    const fade=opacity*smooth((z-64)/64)*smooth((1152-z)/450);
    const jade=jadeColors[i%3];
    pigmentGlow(ctx,p.x,p.y+height*.20,width*1.54,.19,0,jade,fade*.51);
    ellipse(ctx,p.x,p.y-height*.08,width,height*.59,rgba(jade,fade*.94),side*.12);
    ellipse(ctx,p.x-width*.18,p.y-height*.38,width*.54,height*.24,rgba(jadeColors[2],fade*.64),side*.17);
    pigmentGlow(ctx,p.x-width*.22,p.y-height*.47,width*.60,.23,side*.15,jadeColors[3],fade*.59);
  }
  const cue=chapters[chapterIndex].lines[nextLine-1]?.[3];
  const onJadePath=routeMode&&chapterIndex===jadeChapter&&(cue==="jadeLight"||cue==="jadeLightResult");
  const waitingView=onJadePath&&waitedForJadeMist;
  const revealed=onJadePath&&(followedJadeLight||waitingView);
  const mistTime=reduced?0:t;
  for(let i=0;i<9;i++){
    const x=W*(.09+i*.103+.036*Math.sin(mistTime*.23+i)), y=horizon+(H-horizon)*(.04+hash(i+31)*.39);
    pigmentGlow(ctx,x,y,W*(.13+hash(i+54)*.12),.075,-.042,jadeColors[3],opacity*(.14+hash(i+78)*.12)*(revealed?.18:1));
  }
  if(onJadePath&&jadeLight&&!revealed&&cue==="jadeLight"){
    for(let i=8;i>=0;i--){
      const ahead=i*18;
      const point=project(lateral*.61+jadeLightOffset(ahead),100+ahead);
      const glow=opacity*(1-i*.065);
      pigmentGlow(ctx,point.x,point.y,W*.064,.19,-.2,jadeColors[3],glow*.82);
      ellipse(ctx,point.x,point.y,4+point.scale*12,1+point.scale*3,rgba([255,239,183],glow*.9),-.16);
    }
  }
  if(revealed){
    const y=horizon+(H-horizon)*.17;
    if(waitingView){
      pigmentGlow(ctx,W*.36,y,W*.24,.18,-.16,jadeColors[2],opacity*.85);
      pigmentGlow(ctx,W*.65,y-7,W*.22,.17,.16,jadeColors[2],opacity*.82);
    }else{
      pigmentGlow(ctx,W*.72,y,W*.26,.22,-.15,jadeColors[2],opacity*.8);
      pigmentGlow(ctx,W*.79,y-9,W*.18,.15,-.15,jadeColors[3],opacity*.72);
    }
  }
  if(waitingView&&jadeLight){
    const depth=routeDistance-jadeLight.start;
    if(depth<=JADE_SHOAL.end){
      const z=100+(JADE_SHOAL.start+JADE_SHOAL.end)/2-depth;
      const shore=project(jadeLight.x+JADE_SHOAL.side,z);
      ellipse(ctx,shore.x,shore.y,W*.072,3+shore.scale*6,rgba(jadeColors[3],opacity*.72),-.05);
    }
    if(jadeShoalInView())drawJadeShoalReflection(opacity,jadeShoalCalm());
  }
}
function drawJadeShoalReflection(opacity,calm){
  const y=horizon+(H-horizon)*.33;
  ctx.save();
  ctx.globalAlpha=opacity*lerp(.64,.84,calm);
  ctx.fillStyle="#b3d5b6";
  ctx.beginPath();
  ctx.moveTo(W*.21,y);ctx.lineTo(W*.78,y);
  ctx.lineTo(W*.66,y+(H-horizon)*.12);ctx.lineTo(W*.54,y+4);
  ctx.lineTo(W*.37,y+(H-horizon)*.17);ctx.closePath();ctx.fill();
  ctx.globalAlpha=opacity*.64*(1-calm);
  for(const [x,width,offset] of [[.25,.24,6],[.44,.29,15],[.31,.25,24]]){
    ellipse(ctx,W*x+W*width/2,y+offset,W*width/2,1.1,"#e5e3bd");
  }
  ctx.restore();
}
const forestLeaves=[[49,97,91],[81,121,107],[70,100,119],[122,105,130],[168,131,104]];
const lanternGlow=[255,177,93];
const peachPetals=[[151,66,130],[201,80,145],[239,120,169],[255,159,188],[255,209,210],[255,233,202]];
const peachTrees=[];
function peachTreeImage(seed){
  const variant=Math.floor(hash(seed+57)*24);
  if(peachTrees[variant])return peachTrees[variant];
  const image=document.createElement("canvas");
  image.width=320;image.height=282;
  const c=image.getContext("2d"), key=variant*997;
  c.translate(160,266);
  const lean=(hash(key+2)-.5)*52;
  const wood=c.createLinearGradient(-15,0,19,-17);
  wood.addColorStop(0,"#3e344e");wood.addColorStop(.57,"#664759");wood.addColorStop(1,"#aa776d");
  c.fillStyle=wood;
  c.beginPath();c.moveTo(-12,0);c.bezierCurveTo(1,-37,-21,-93,lean-5,-141);
  c.lineTo(lean+4,-144);c.bezierCurveTo(-3,-88,16,-41,10,0);c.closePath();c.fill();
  const crowns=[];
  c.lineCap="round";
  for(let i=0;i<7;i++){
    const k=key+i*67, side=i%2?1:-1;
    const x=lean+side*(26+hash(k+7)*99);
    const y=-124-hash(k+19)*80;
    const jointY=-48-i*12, splitX=x*.61, splitY=lerp(jointY,y,.69);
    c.strokeStyle=i%3===0?"#9f6669":"#664359";
    c.lineWidth=8-i*.65;
    c.beginPath();c.moveTo(lean*.36,jointY);
    c.quadraticCurveTo(x*.15,splitY+14,splitX,splitY);c.stroke();
    for(let j=0;j<3;j++){
      const tipX=x+(j-1)*(13+hash(k+j*9)*14);
      const tipY=y+(j===1?-20:hash(k+j*11)*17);
      c.lineWidth=2.3-j*.35;c.strokeStyle=j===1?"#ac6e74":"#69455e";
      c.beginPath();c.moveTo(splitX,splitY);c.quadraticCurveTo(x*.82,tipY+15,tipX,tipY);c.stroke();
      crowns.push({x:tipX,y:tipY,key:k+j*113});
    }
  }
  for(const {x,y,key:k} of crowns){
    const radius=20+hash(k+31)*15;
    pigmentGlow(c,x,y,radius*1.37,.73,-.18,peachPetals[Math.floor(hash(k+27)*4)],.62);
    for(let i=0;i<15;i++){
      const q=k+i*19, angle=hash(q+7)*TAU, spread=Math.sqrt(hash(q+19))*radius;
      const px=x+Math.cos(angle)*spread, py=y+Math.sin(angle)*spread*.70;
      const r=2.6+hash(q+13)*6.5;
      const color=peachPetals[Math.floor(hash(q+15)*peachPetals.length)];
      if(i%4===0)ellipse(c,px+r,py+r*.5,r*1.22,r*.39,rgba([113,159,112],.79),angle);
      if(i%3!==0){
        ellipse(c,px,py,r,r*.73,rgba(color,.80),angle);
        continue;
      }
      for(let petal=0;petal<5;petal++){
        const turn=angle+petal*TAU/5;
        ellipse(c,px+Math.cos(turn)*r*.46,py+Math.sin(turn)*r*.46,r*.53,r*.37,rgba(color,.94),turn);
      }
      ellipse(c,px,py,r*.22,r*.19,"#ffe0a5");
    }
  }
  peachTrees[variant]=image;
  return image;
}
const fieldColors=[[119,147,89],[151,171,94],[183,171,103],[102,144,106]];
function drawFarmland(opacity,world){
  drawCreeks(opacity*.56,false);
  for(const {object:{kind,seed,x,z:worldZ},depth:z,point:p} of world){
    if(kind>6)continue;
    const fade=opacity*smooth((z-63)/78)*smooth((1240-z)/520);
    const s=p.scale, width=(22+hash(seed+9)*27)*s;
    if(kind===0&&hash(seed+22)>.29){
      drawThatchHouse(p.x,p.y,width*1.26,fade,seed);
      if(hash(seed+91)>.42)drawThatchHouse(p.x+width*1.48,p.y-width*.12,width*.62,fade*.91,seed+29);
      continue;
    }
    if(kind===5){
      const drift=reduced?0:Math.sin(t*.17+seed*.03)*14;
      const animal=project(x+drift,worldZ-distance);
      drawFarmOx(animal.x,animal.y,animal.scale*1.86,fade,seed);
      continue;
    }
    if(kind===6){
      const r=(16+hash(seed+79)*31)*s;
      ellipse(ctx,p.x,p.y,r*1.65,r*.24,rgba([138,171,94],fade*.55),-.12);
      for(let i=0;i<9;i++){
        const lean=(hash(seed+i*9)-.5)*r;
        ellipse(ctx,p.x+lean,p.y-hash(seed+i*31)*r*.61,r*.26,r*.10,
          rgba(i%3?[122,160,91]:[218,201,104],fade*.65),-.72);
      }
      continue;
    }
    const length=45+hash(seed+31)*38;
    if(freeRoam&&z<140)continue;
    const localZ=worldZ-distance;
    const near=freeRoam?localZ-length*.42:Math.max(62,localZ-length*.42), far=localZ+length*.58;
    const half=34+hash(seed+42)*25, angle=(hash(seed+57)-.5)*22;
    const a=project(x-half,near), b=project(x+half,near);
    const c=project(x+half+angle,far), d=project(x-half+angle,far);
    ctx.beginPath();ctx.moveTo(a.x,a.y);
    ctx.quadraticCurveTo((a.x+b.x)*.5,(a.y+b.y)*.5+6*s,b.x,b.y);
    ctx.quadraticCurveTo((b.x+c.x)*.5+8*s,(b.y+c.y)*.5,c.x,c.y);
    ctx.quadraticCurveTo((c.x+d.x)*.5,(c.y+d.y)*.5-5*s,d.x,d.y);
    ctx.quadraticCurveTo((d.x+a.x)*.5-6*s,(d.y+a.y)*.5,a.x,a.y);ctx.closePath();
    const soil=fieldColors[kind%4], wash=ctx.createLinearGradient(p.x,p.y-13*s,p.x,p.y+16*s);
    wash.addColorStop(0,rgba(blend(soil,[220,216,147],.22),fade*.72));
    wash.addColorStop(1,rgba(blend(soil,[92,111,76],.28),fade*.88));
    ctx.fillStyle=wash;ctx.fill();
    ctx.strokeStyle=rgba([240,206,143],fade*.32);ctx.lineWidth=Math.max(.5,2.3*s);ctx.stroke();
    for(let row=1;row<=5;row++){
      const rowZ=lerp(near,far,row/6), left=project(x-half*.84+angle*row/6,rowZ), right=project(x+half*.84+angle*row/6,rowZ);
      ctx.beginPath();ctx.moveTo(left.x,left.y);
      ctx.quadraticCurveTo((left.x+right.x)*.5,(left.y+right.y)*.5+3*s,right.x,right.y);
      ctx.strokeStyle=rgba(row%2?[211,202,132]:[75,124,77],fade*.65);
      ctx.lineWidth=Math.max(.43,left.scale*2.1);ctx.stroke();
      if(z>480)continue;
      for(let i=0;i<7;i++){
        const u=(i+.4)/7, plantX=lerp(left.x,right.x,u), plantY=lerp(left.y,right.y,u)+6*s*u*(1-u);
        const sway=reduced?0:Math.sin(t*1.2+i+row)*s*1.7;
        ellipse(ctx,plantX+sway,plantY-1.6*s,1.9*s,3.2*s,rgba([165,196,116],fade*.80),-.47);
        if(kind===4&&i%3===0)ellipse(ctx,plantX+sway,plantY-4*s,2.1*s,1.35*s,rgba([255,215,97],fade*.92));
      }
    }
    if(kind===2||kind===4)drawFarmWorker(p.x,p.y,Math.max(.09,s)*1.38,fade,seed);
  }
}
function drawThatchHouse(x,y,width,fade,seed){
  ctx.save();ctx.translate(x,y);ctx.scale(width,width);ctx.globalAlpha=fade;
  ellipse(ctx,0,.03,1.22,.16,"#62675168");
  ctx.fillStyle="#d4ae78";ctx.fillRect(-.75,-.69,1.50,.69);
  ctx.fillStyle="#a47b59";ctx.fillRect(.35,-.69,.40,.69);
  ctx.fillStyle="#675144";ctx.fillRect(-.16,-.48,.26,.48);
  ctx.fillStyle="#f5d799";ctx.fillRect(-.59,-.47,.23,.23);
  const roof=ctx.createLinearGradient(0,-1.28,0,-.55);
  roof.addColorStop(0,"#d0a36a");roof.addColorStop(1,"#8f694f");
  ctx.beginPath();ctx.moveTo(-1.08,-.56);ctx.quadraticCurveTo(-.62,-.78,-.38,-1.20);
  ctx.quadraticCurveTo(.07,-1.31,.40,-1.19);ctx.quadraticCurveTo(.64,-.84,1.04,-.59);
  ctx.quadraticCurveTo(.12,-.70,-1.08,-.56);ctx.fillStyle=roof;ctx.fill();
  ctx.lineWidth=.025;
  for(let i=0;i<19;i++){
    const u=i/18, bend=hash(seed+i*31);
    ctx.strokeStyle=i%3?"#dfb47c9c":"#775a477f";
    ctx.beginPath();ctx.moveTo(lerp(-.36,.38,u),-1.19+.06*bend);
    ctx.quadraticCurveTo(lerp(-.62,.68,u),-.85,lerp(-1,1,u),-.62-.04*bend);ctx.stroke();
  }
  for(let i=0;i<5;i++){
    const clock=reduced?0:t, rise=i/5;
    const drift=rise*.79+Math.sin(clock*.66+i*.6+seed)*.09;
    pigmentGlow(ctx,.29+drift,-1.19-rise*1.12,.19+rise*.29,.64,-.23,[246,224,190],.31-rise*.22);
  }
  ctx.restore();
}
function drawFarmOx(x,y,size,fade,seed){
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.globalAlpha=fade;
  const sway=reduced?0:Math.sin(t*2.1+seed*.13);
  const rider=hash(seed+11)>.49;
  ellipse(ctx,0,1,21,4,"#525d485c");
  ctx.strokeStyle="#4b463d";ctx.lineWidth=2.4;ctx.lineCap="round";
  for(let i=0;i<4;i++){
    const leg=-11+i*7;
    ctx.beginPath();ctx.moveTo(leg,-8);ctx.lineTo(leg+sway*(i%2?1.5:-1.5),0);ctx.stroke();
  }
  ellipse(ctx,-2,-13,16,8,"#786650",-.07);
  ellipse(ctx,-5,-15,11,4,"#a58a65",-.14);
  const head=-12+(rider?0:sway*2);
  ellipse(ctx,14,head,6.6,5.6,"#665444",.20);
  ctx.lineWidth=1.45;ctx.strokeStyle="#dbbd91";
  ctx.beginPath();ctx.moveTo(13,head-3);ctx.quadraticCurveTo(16,head-9,20,head-7);
  ctx.moveTo(10,head-3);ctx.quadraticCurveTo(7,head-8,5,head-6);ctx.stroke();
  ctx.strokeStyle="#5f5142";ctx.beginPath();ctx.moveTo(-17,-15);ctx.quadraticCurveTo(-22,-11,-20+sway,-5);ctx.stroke();
  if(rider){
    ctx.strokeStyle="#534c4a";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-3,-20);ctx.lineTo(2,-12);ctx.stroke();
    ellipse(ctx,-5,-25,3.7,6.4,"#557284",-.14);
    ellipse(ctx,-5,-33,3.1,3.3,"#c3a27a");
    ellipse(ctx,-5,-35,6.8,1.9,"#b68e59");
  }
  ctx.restore();
}
function drawFarmWorker(x,y,size,fade,seed){
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.globalAlpha=fade;
  const bend=reduced?0:Math.sin(t*1.46+seed*.12)*.16;
  ellipse(ctx,0,0,9,2.3,"#53624859");
  ctx.rotate(bend);
  ctx.strokeStyle="#5f5647";ctx.lineWidth=2.3;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-3,-1);ctx.lineTo(0,-12);ctx.lineTo(5,-2);ctx.stroke();
  ellipse(ctx,2,-14,4.1,7.4,"#6d8291",.84);
  ellipse(ctx,8,-17,3.3,3.4,"#bd9871");
  ellipse(ctx,8,-19,6.0,1.8,"#c7a46e",.21);
  ctx.beginPath();ctx.moveTo(7,-13);ctx.lineTo(12,-8);ctx.lineTo(18,0);
  ctx.strokeStyle="#94704c";ctx.lineWidth=1.35;ctx.stroke();
  ctx.restore();
}
const creekSpacing=430;
function creekCenter(column,z){
  return column*creekSpacing+52*Math.sin(z*.005+column*.91)+30*Math.sin(z*.011-column*.57);
}
function drawCreeks(opacity,petals){
  const center=lateral*.61;
  const surface=ctx.createLinearGradient(0,horizon,0,H);
  surface.addColorStop(0,rgba([252,177,207],opacity*.15));
  surface.addColorStop(.31,rgba([108,149,187],opacity*.52));
  surface.addColorStop(.76,rgba([80,122,157],opacity*.69));
  surface.addColorStop(1,rgba([60,92,137],opacity*.76));
  for(let column=Math.floor(center/creekSpacing)-3;column<=Math.ceil(center/creekSpacing)+3;column++){
    const steps=freeRoam?64:32;
    const banks=[[],[]];
    for(let i=0;i<=steps;i++){
      const z=freeRoam?lerp(-1420,1420,i/steps):62*(1170/62)**(i/steps);
      const worldZ=distance+z, x=creekCenter(column,worldZ);
      const width=(petals?18:8)+(petals?8:3)*Math.sin(worldZ*.007+column);
      if(freeRoam&&Math.min(cameraDepth(x-width,z),cameraDepth(x+width,z))<62){
        banks[0].push(null);banks[1].push(null);continue;
      }
      banks[0].push(project(x-width,z));banks[1].push(project(x+width,z));
    }
    for(let from=0;from<=steps;from++){
      if(!banks[0][from])continue;
      let to=from;
      while(to<steps&&banks[0][to+1])to++;
      if(to===from)continue;
      ctx.beginPath();ctx.moveTo(banks[0][from].x,banks[0][from].y);
      for(let i=from+1;i<=to;i++)ctx.lineTo(banks[0][i].x,banks[0][i].y);
      for(let i=to;i>=from;i--)ctx.lineTo(banks[1][i].x,banks[1][i].y);
      ctx.closePath();ctx.fillStyle=surface;ctx.fill();
      from=to;
    }
    for(let i=1;i<steps;i+=2){
      const a=banks[0][i], b=banks[1][i];
      if(!a||!b)continue;
      const width=Math.abs(b.x-a.x);
      const shimmer=.5+.5*Math.sin((reduced?0:t*1.35)+i*.72+column);
      if(a.x>W+50||b.x< -50)continue;
      ellipse(ctx,(a.x+b.x)*.5+width*.12*shimmer,a.y,width*.28,.5+shimmer*.85,rgba([255,212,231],opacity*shimmer*.45));
      const radius=Math.min(38,width*.21), fade=opacity*smooth((steps-i)/12);
      const bankColor=petals?[255,166,193]:[229,206,135];
      pigmentGlow(ctx,a.x,a.y,radius,.14,0,bankColor,fade*.28);
      pigmentGlow(ctx,b.x,b.y,radius,.14,0,bankColor,fade*.32);
      if(petals){
        const colors=[[255,211,130],[136,226,196],[213,171,249]];
        const tint=colors[(i+Math.abs(column))%3];
        const cx=lerp(a.x,b.x,.27+shimmer*.45);
        pigmentGlow(ctx,cx,a.y,Math.min(56,width*.44),.085,-.03,tint,fade*(.24+shimmer*.40));
      }
    }
    if(!petals)continue;
    for(let i=0;i<15;i++){
      const seed=column*503+i*73, offset=i*77-distance+(reduced?0:t*7.4);
      const z=freeRoam?wrap(offset,2500)-1250:64+wrap(offset,1155);
      const x=creekCenter(column,distance+z)+(hash(seed+9)-.5)*19;
      const depth=cameraDepth(x,z);
      if(depth<63||depth>1240)continue;
      const p=project(x,z);
      if(p.x< -12||p.x>W+12)continue;
      const fade=opacity*smooth((depth-64)/64)*smooth((1220-depth)/420);
      ellipse(ctx,p.x,p.y,1+p.scale*5,.6+p.scale*1.7,rgba(peachPetals[3+i%3],fade*.82),hash(seed+4)-.5);
    }
  }
}
function drawPeachGrove(opacity,world){
  drawCreeks(opacity,true);
  const trees=[];
  for(const {object:{kind,seed,x,z:worldZ},depth:z,point:p} of world){
    if(kind>4)continue;
    const bankDistance=Math.abs(x-creekCenter(Math.round(x/creekSpacing),worldZ));
    if(bankDistance<31)continue;
    trees.push({seed,z,p});
  }
  const center=Math.round(lateral*.61/creekSpacing);
  const firstRow=Math.floor((distance+(freeRoam?-1000:63))/96), lastRow=Math.floor((distance+1000)/96);
  for(let column=center-2;column<=center+2;column++){
    for(let row=firstRow;row<=lastRow;row++){
      for(const side of [-1,1]){
        const seed=column*12097+row*871+side*47;
        const worldZ=(row+hash(seed+39))*96, z=worldZ-distance;
        const x=creekCenter(column,worldZ)+side*(42+hash(seed+43)*43);
        const depth=cameraDepth(x,z);
        if(depth<63||depth>920)continue;
        const p=project(x,z);
        if(p.x< -115||p.x>W+115)continue;
        trees.push({seed,z:depth,p});
      }
    }
  }
  trees.sort((a,b)=>b.z-a.z);
  for(const {seed,z,p} of trees){
    const fade=opacity*smooth((z-63)/78)*smooth((1240-z)/530);
    const size=(134+hash(seed+25)*180)*p.scale;
    const sway=reduced?0:Math.sin(t*.73+seed*.023)*.026;
    const tree=peachTreeImage(seed), width=size*1.21;
    ctx.save();ctx.translate(p.x,p.y);
    pigmentGlow(ctx,0,size*.11,size*.48,.20,0,[98,175,161],fade*.44);
    pigmentGlow(ctx,0,size*.15,size*.53,.17,-.07,[253,152,192],fade*.34);
    ctx.save();ctx.beginPath();ctx.rect(-size,0,size*2,H-p.y);ctx.clip();
    ctx.scale(.93,-.46);ctx.rotate(sway);
    ctx.globalAlpha=fade*.32;ctx.drawImage(tree,-width/2,-size,width,size*1.06);ctx.restore();
    ctx.rotate(sway);
    ctx.globalAlpha=fade;ctx.drawImage(tree,-width/2,-size,width,size*1.06);ctx.restore();
  }
  if(routeMode&&chapterIndex===groveChapter&&groveBanks)drawGroveBanks(opacity);
}
function drawGroveBanks(opacity){
  const travelled=routeDistance-groveBanks.start;
  const fade=opacity*smooth((GROVE_SCENERY_LENGTH-travelled)/GROVE_SCENERY_FADE);
  if(fade<=0)return;
  for(let i=8;i>=0;i--){
    const z=248+i*18-travelled;
    if(z<64)continue;
    const left=project(groveBanks.x-48-i*2,z);
    const right=project(groveBanks.x+48+i*2,z);
    const alpha=fade*smooth((z-64)/48);
    ctx.save();ctx.translate(left.x,left.y);ctx.rotate(-.13);
    ctx.fillStyle=rgba([57,55,78],alpha*.9);ctx.fillRect(-24*left.scale,-2*left.scale,48*left.scale,11*left.scale);
    ctx.fillStyle=rgba([201,176,164],alpha*.96);ctx.fillRect(-24*left.scale,-5*left.scale,48*left.scale,8*left.scale);
    ctx.restore();
    if(i%2!==0)continue;
    ellipse(ctx,right.x,right.y,60*right.scale,17*right.scale,rgba([96,162,162],alpha*.28),.15);
    for(let j=0;j<7;j++){
      const x=right.x+(hash(i*53+j*17)-.5)*74*right.scale;
      const y=right.y+(hash(i*61+j*23)-.5)*16*right.scale;
      ellipse(ctx,x,y,6*right.scale,3*right.scale,rgba(peachPetals[2+j%4],alpha*.98),hash(j+5)-.5);
    }
  }
}
function forestTree(size,seed,sway){
  const lean=sway+(hash(seed+1)-.5)*size*.16;
  const spread=size*(.18+hash(seed+2)*.11);
  ctx.fillStyle="#283d49";
  ctx.beginPath();ctx.moveTo(-size*.045,0);
  ctx.bezierCurveTo(-size*.033,-size*.34,lean-size*.06,-size*.69,lean,-size);
  ctx.bezierCurveTo(lean+size*.015,-size*.62,size*.031,-size*.26,size*.048,0);
  ctx.fill();
  for(let i=0;i<4;i++){
    const side=i%2?1:-1, y=-size*(.39+i*.125);
    ctx.beginPath();ctx.moveTo(lean*.46,y+size*.14);
    ctx.quadraticCurveTo(side*spread*.49,y+size*.07,lean+side*spread,y-size*.14);
    ctx.lineWidth=Math.max(.5,size*(.017-i*.002));ctx.strokeStyle=ctx.fillStyle;ctx.stroke();
  }
  for(let i=0;i<27;i++){
    const k=seed+i*17, x=lean+(hash(k+5)-.5)*spread*2.45;
    const y=-size*(.52+hash(k+7)*.5)+Math.abs(x-lean)*.20;
    const r=size*(.033+hash(k+11)*.095);
    const color=forestLeaves[Math.floor(hash(k+3)*forestLeaves.length)];
    const tilt=.65*(hash(k+4)-.5);
    ellipse(ctx,x,y,r,r*(.42+hash(k+2)*.33),rgba(color,.48+hash(k+9)*.31),tilt);
    ellipse(ctx,x-r*.24,y-r*.29,r*.52,r*.21,rgba(blend(color,lanternGlow,.28),.36),tilt-.14);
  }
}
function drawForest(opacity,world){
  for(const {object:{kind,seed,x,z:worldZ},depth:z,point:p} of world){
    if(kind>3)continue;
    const size=(135+hash(seed+26)*205)*p.scale;
    if(p.x+size<0||p.x-size>W)continue;
    const fade=opacity*smooth((z-64)/75)*smooth((1240-z)/520);
    const sway=reduced?0:Math.sin(t*.87+seed*.38)*size*.046;
    ctx.save();ctx.translate(p.x,p.y);
    pigmentGlow(ctx,0,0,size*.82,.13,0,[90,143,135],fade*.30);
    ctx.save();ctx.beginPath();ctx.rect(-size,0,size*2,H-p.y);ctx.clip();
    ctx.scale(.89,-.48);ctx.globalAlpha=fade*.23;forestTree(size,seed,sway);ctx.restore();
    ctx.globalAlpha=fade*.89;forestTree(size,seed,sway);
    ctx.restore();
    if(kind>1)continue;
    const lamp=project(x+(hash(seed+14)-.5)*36,worldZ-distance), height=clamp((48+hash(seed+32)*25)*p.scale,2,85);
    const y=lamp.y-height, r=Math.max(.7,height*.093);
    const flicker=fade*(reduced?.76:.76+.12*Math.sin(t*1.24+seed)+.08*Math.sin(t*2.5+seed));
    ctx.fillStyle=rgba([48,61,66],fade*.86);ctx.fillRect(lamp.x-r*.20,y,r*.4,height);
    pigmentGlow(ctx,lamp.x,lamp.y+height*.32,height*.47,.36,0,lanternGlow,flicker*.50);
    pigmentGlow(ctx,lamp.x,lamp.y+height*.55,height*.61,.28,1.48,lanternGlow,flicker*.24);
    bloom(ctx,lamp.x,y,r*10,lanternGlow,flicker*.86);
    ctx.fillStyle=rgba([49,48,59],fade);ctx.fillRect(lamp.x-r*1.32,y-r*1.57,r*2.64,r*2.92);
    ctx.fillStyle=rgba([255,232,163],fade);ctx.fillRect(lamp.x-r*.82,y-r,r*1.64,r*1.96);
  }
}
function particles(p,light){
  const mix=smooth(transition);
  const before=sceneAtmosphere(previous), after=sceneAtmosphere(p);
  drawDriftingDetails(before,before===after?1:1-mix);
  if(before!==after)drawDriftingDetails(after,mix);
  if(p.index===3&&!p.ink&&!reduced){
    const phase=fract(t*.19);
    if(phase<.27){
      const x=W*(.38+.5*hash(Math.floor(t*.19))) - phase*W*.43,y=H*.12+phase*H*.59;
      const g=ctx.createLinearGradient(x,y,x+W*.055,y-H*.065);
      g.addColorStop(0,rgba(light,Math.sin(phase/.27*Math.PI)*.85));g.addColorStop(1,rgba(light,0));
      ctx.strokeStyle=g;ctx.lineWidth=1.35;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+W*.055,y-H*.065);ctx.stroke();
    }
  }
}
const showerColors=[[255,211,218],[246,138,183],[255,174,164],[255,233,191],[216,158,223]];
function drawPetalShower(){
  if(petalShowerAt===null)return;
  const age=storyTime-petalShowerAt;
  if(age>=12){petalShowerAt=null;return;}
  const opacity=smooth(age/.65)*(1-smooth((age-8.2)/3.8));
  const count=reduced?36:170;
  for(let i=0;i<count;i++){
    const seed=i*37+121, depth=hash(seed+2);
    const elapsed=age-hash(seed+3)**1.5*6.1;
    if(elapsed<0)continue;
    const phase=hash(seed+7)*TAU;
    const y=-H*(.022+hash(seed+4)*.095)+elapsed*H*(reduced?.09:.13+depth*.15);
    if(y< -14||y>H+14)continue;
    const breeze=reduced?0:Math.sin(phase+elapsed*.85)*W*(.016+depth*.031)+elapsed*W*.013;
    const x=wrap(hash(seed)*W+breeze+20,W+40)-20;
    const r=1.8+depth**2.2*7.2, angle=phase+(reduced?0:elapsed*(.47+depth*.57));
    const width=r*(reduced?.64:.25+.65*Math.abs(Math.cos(angle)));
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    ctx.globalAlpha=opacity*(.45+depth*.48);
    ctx.fillStyle=rgba(showerColors[i%showerColors.length],1);
    ctx.beginPath();ctx.moveTo(0,r);
    ctx.bezierCurveTo(-width,r*.34,-width*1.25,-r*.88,-width*.39,-r*.9);
    ctx.quadraticCurveTo(0,-r*.66,width*.25,-r);
    ctx.bezierCurveTo(width*1.24,-r*.87,width*.97,r*.36,0,r);
    ctx.fill();
    if(depth>.74)ellipse(ctx,-width*.24,-r*.22,width*.30,r*.49,"#fff2df",-.12);
    ctx.restore();
  }
}
function drawDriftingDetails({drift,tones},opacity){
  if(opacity<=0)return;
  const n=reduced?18:54, clock=reduced?0:t;
  const petals=drift==="petal", fireflies=drift==="firefly", mist=drift==="mist";
  for(let i=0;i<n;i++){
    const z=hash(i*9+2), color=tones[i%3], wave=Math.sin(clock*(.4+z*.41)+i*4);
    const x=wrap(hash(i*9)*W+clock*(3+z*8)+wave*z*13-position*z*.13,W+38)-19;
    const y=fireflies ? horizon+H*(hash(i*9+1)*.47-.21)+wave*12*z
      : wrap(hash(i*9+1)*H+clock*(petals?3+z*8:-1-z*4),H+38)-19;
    const flicker=opacity*(.16+.55*(.5+.5*wave)**2);
    if(petals&&i%3===0){
      const r=1.5+z*4.2, tilt=clock*.65+i;
      ellipse(ctx,x,y,r,r*(.22+.36*Math.abs(wave)),rgba(color,flicker*.82),tilt);
      ellipse(ctx,x+r*.16,y-r*.12,r*.49,r*.15,rgba([255,236,222],flicker*.45),tilt);
    } else {
      const radius=.45+z*1.05;
      if(i%5===0||fireflies) bloom(ctx,x,y,5+z*(mist?21:11),color,flicker*(fireflies?.76:.35));
      ellipse(ctx,x,y,radius,radius,rgba(color,flicker*(mist?.46:1)));
    }
  }
}
