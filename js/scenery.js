"use strict";

const worldCellWidth=280, worldCellDepth=260;
const worldCells=new Map();
function prepareWorld(){
  // World coordinates determine placement, so revisiting a cell restores the same scenery.
  const left=Math.floor((lateral*.61-1220)/worldCellWidth), right=Math.floor((lateral*.61+1220)/worldCellWidth);
  const front=Math.floor((distance+60)/worldCellDepth), back=Math.floor((distance+1240)/worldCellDepth);
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
      const depth=object.z-distance;
      if(depth<63||depth>1240)continue;
      const point=project(object.x,depth);
      const margin=Math.max(32,220*point.scale);
      if(point.x < -margin || point.x > W+margin)continue;
      visible.push({object,depth,point});
    }
  }
  return visible.sort((a,b)=>b.depth-a.depth);
}
function project(x,z) {
  const near=62/z, deep=H-horizon;
  return {x:W*.54+(x-lateral*.61)*near*W*.018,
    y:horizon+near*deep, scale:near*clamp(Math.min(W/850,H/580),.6,1.65)};
}
function drawRouteScenery(light,water,world){
  const deep=H-horizon,travel=routeDistance;
  const mix=smooth(transition), forest=lerp(Number(Boolean(previous.forest)),Number(Boolean(current.forest)),mix);
  const jade=lerp(Number(Boolean(previous.jade)),Number(Boolean(current.jade)),mix);
  const grove=lerp(Number(Boolean(previous.grove)),Number(Boolean(current.grove)),mix);
  const farm=lerp(Number(Boolean(previous.farmland)),Number(Boolean(current.farmland)),mix);
  const river=lerp(Number(Boolean(previous.river)),Number(Boolean(current.river)),mix);
  if(forest>0) drawForest(forest,world);
  if(jade>0) drawJadeBanks(jade,world);
  if(grove>0) drawPeachGrove(grove,world);
  if(farm>0) drawFarmland(farm,world);
  if(river>0) drawRiver(river,world);
  if(forest+jade+grove+farm+river>=1) return;
  ctx.save();ctx.globalAlpha=1-forest-jade-grove-farm-river;
  const shadow=routeMode?smooth((travel-665)/265)*(1-smooth((travel-980)/440)):0;
  if(shadow>.001){
    kun(ctx,W*(.6+Math.sin(t*.46)*.06)-Math.sin(position*.003)*W*.12,
      horizon+deep*.46,Math.min(W/590,H/445),.07,shadow*.69,
      blend(water,light,.24),blend(water,[12,16,49],.75));
  }
  const cloudSea=routeMode?smooth((travel-1430)/520)*(1-smooth((travel-2310)/600)):0;
  const petals=routeMode?1-smooth((travel-280)/530):.42;
  for(const {object:{kind:i,seed:key},depth:z,point:p} of world){
    const s=p.scale, alpha=smooth((z-63)/65)*smooth((1240-z)/490);
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
const riverLamp=[255,188,114];
function riverBoat(x,y,size,opacity,lantern,reflection=false,bearing=0){
  ctx.save();ctx.translate(x,y);
  ctx.rotate(reflection?-bearing:bearing);
  ctx.scale(size,reflection?-size*.52:size);
  ctx.globalAlpha=opacity;
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
  for(const {object:{kind,seed,x},depth:z,point:p} of world){
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
    const boat=project(x+drift,z);
    const size=(.64+hash(seed+51)*.56)*p.scale;
    riverBoat(boat.x,boat.y+3*size,size,fade*.27,true,true);
    riverBoat(boat.x,boat.y,size,fade,true);
  }
  // Let another traveller pass close enough to see their light, then drift away.
  const pass=clamp((stage-220)/380,0,1);
  const fade=opacity*smooth(pass*6)*smooth((1-pass)*5);
  if(fade>0){
    const p=project(lateral*.61+lerp(-125,160,pass),134+138*pass);
    riverBoat(p.x,p.y+3*p.scale,p.scale*1.06,fade*.29,true,true);
    riverBoat(p.x,p.y,p.scale*1.06,fade,true);
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
  const mistTime=reduced?0:t;
  for(let i=0;i<9;i++){
    const x=W*(.09+i*.103+.036*Math.sin(mistTime*.23+i)), y=horizon+(H-horizon)*(.04+hash(i+31)*.39);
    pigmentGlow(ctx,x,y,W*(.13+hash(i+54)*.12),.075,-.042,jadeColors[3],opacity*(.14+hash(i+78)*.12));
  }
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
  for(const {object:{kind,seed,x},depth:z,point:p} of world){
    if(kind>4)continue;
    const fade=opacity*smooth((z-63)/78)*smooth((1240-z)/520);
    const s=p.scale, width=(22+hash(seed+9)*27)*s;
    if(kind===0&&hash(seed+22)>.29){
      const h=width*.74, y=p.y;
      pigmentGlow(ctx,p.x,y+h*.07,width*1.58,.26,0,[234,179,100],fade*.38);
      ctx.fillStyle=rgba([218,188,134],fade*.94);
      ctx.fillRect(p.x-width*.73,y-h,width*1.47,h);
      ctx.beginPath();ctx.moveTo(p.x-width,y-h*.93);ctx.lineTo(p.x-width*.28,y-h*1.57);
      ctx.lineTo(p.x+width*.54,y-h*1.42);ctx.lineTo(p.x+width,y-h*.91);
      ctx.closePath();ctx.fillStyle=rgba([85,84,97],fade*.97);ctx.fill();
      ctx.fillStyle=rgba([143,110,91],fade*.87);
      ctx.fillRect(p.x+width*.09,y-h*.52,width*.23,h*.52);
      ctx.fillStyle=rgba([255,227,147],fade*.91);
      ctx.fillRect(p.x-width*.52,y-h*.62,width*.27,h*.29);
      for(let i=0;i<5;i++){
        const clock=reduced?0:t, rise=i/5;
        const drift=(rise*.79+Math.sin(clock*.66+i*.6+seed)*.09)*width;
        pigmentGlow(ctx,p.x+width*.29+drift,y-h*(1.42+rise*1.58),width*(.20+rise*.27),.69,-.23,
          [246,220,177],fade*(.31-rise*.22));
      }
      continue;
    }
    const length=45+hash(seed+31)*38;
    const near=Math.max(62,z-length*.42), far=z+length*.58;
    const half=34+hash(seed+42)*25, angle=(hash(seed+57)-.5)*22;
    const a=project(x-half,near), b=project(x+half,near);
    const c=project(x+half+angle,far), d=project(x-half+angle,far);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();
    ctx.fillStyle=rgba(fieldColors[kind%4],fade*.75);ctx.fill();
    ctx.strokeStyle=rgba([240,206,143],fade*.49);ctx.lineWidth=Math.max(.45,2*s);ctx.stroke();
    for(let row=1;row<=5;row++){
      const rowZ=lerp(near,far,row/6), left=project(x-half*.84+angle*row/6,rowZ), right=project(x+half*.84+angle*row/6,rowZ);
      ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.lineTo(right.x,right.y);
      ctx.strokeStyle=rgba(row%2?[211,202,132]:[75,124,77],fade*.65);
      ctx.lineWidth=Math.max(.43,left.scale*2.1);ctx.stroke();
      if(z>480)continue;
      for(let i=0;i<7;i++){
        const plantX=lerp(left.x,right.x,(i+.4)/7), sway=reduced?0:Math.sin(t*1.2+i+row)*s*1.7;
        ellipse(ctx,plantX+sway,left.y-1.6*s,1.9*s,3.2*s,rgba([165,196,116],fade*.80),-.47);
        if(kind===4&&i%3===0)ellipse(ctx,plantX+sway,left.y-4*s,2.1*s,1.35*s,rgba([255,215,97],fade*.92));
      }
    }
  }
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
    const steps=32;
    const banks=[[],[]];
    for(let i=0;i<=steps;i++){
      const z=62*(1170/62)**(i/steps), worldZ=distance+z, x=creekCenter(column,worldZ);
      const width=(petals?18:8)+(petals?8:3)*Math.sin(worldZ*.007+column);
      banks[0].push(project(x-width,z));banks[1].push(project(x+width,z));
    }
    ctx.beginPath();ctx.moveTo(banks[0][0].x,banks[0][0].y);
    for(const p of banks[0])ctx.lineTo(p.x,p.y);
    for(let i=steps;i>=0;i--)ctx.lineTo(banks[1][i].x,banks[1][i].y);
    ctx.closePath();ctx.fillStyle=surface;ctx.fill();
    for(let i=1;i<steps;i+=2){
      const a=banks[0][i], b=banks[1][i], width=b.x-a.x;
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
      const z=64+wrap(offset,1155);
      const x=creekCenter(column,distance+z)+(hash(seed+9)-.5)*19;
      const p=project(x,z);
      if(p.x< -12||p.x>W+12)continue;
      const fade=opacity*smooth((z-64)/64)*smooth((1220-z)/420);
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
  const firstRow=Math.floor((distance+63)/96), lastRow=Math.floor((distance+920)/96);
  for(let column=center-2;column<=center+2;column++){
    for(let row=firstRow;row<=lastRow;row++){
      for(const side of [-1,1]){
        const seed=column*12097+row*871+side*47;
        const worldZ=(row+hash(seed+39))*96, z=worldZ-distance;
        if(z<63||z>920)continue;
        const x=creekCenter(column,worldZ)+side*(42+hash(seed+43)*43);
        const p=project(x,z);
        if(p.x< -115||p.x>W+115)continue;
        trees.push({seed,z,p});
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
  for(const {object:{kind,seed,x},depth:z,point:p} of world){
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
    const lamp=project(x+(hash(seed+14)-.5)*36,z), height=clamp((48+hash(seed+32)*25)*p.scale,2,85);
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
  if(p.index===3&&!reduced){
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
