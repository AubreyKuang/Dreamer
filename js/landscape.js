"use strict";

function resize() {
  W=innerWidth; H=innerHeight; dpr=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  horizon=Math.round(H*(W<680?.58:.56));
  sky.width=Math.min(1700,Math.ceil(W*1.18)); sky.height=Math.max(1,Math.round(sky.width*horizon/W));
  cache=paintSky(current); if(transition<1) oldCache=paintSky(previous);
}
function ellipse(c,x,y,rx,ry,fill,rotation=0){
  c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,0,TAU);c.fillStyle=fill;c.fill();
}
function bloom(c,x,y,r,color,alpha){
  const g=c.createRadialGradient(x,y,0,x,y,Math.max(1,r));
  g.addColorStop(0,rgba(color,alpha));g.addColorStop(.28,rgba(color,alpha*.44));g.addColorStop(1,rgba(color,0));
  c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);
}
function ridge(c,w,h,p,layer) {
  const depth=[.23,.15,.085][layer], base=h*(1-depth*.25);
  const rough=p.index===0?.55:1;
  c.beginPath();c.moveTo(0,h);
  for(let x=0;x<=w+5;x+=5){
    const q=x/w, a=q*12+layer*2.4+p.seed*.2;
    const wide=Math.pow(Math.abs(q-.55)*1.8,1.15);
    const height=depth*h*(.34+wide*.64+Math.sin(a)*.25+Math.sin(a*2.05+2)*.14*rough+Math.sin(a*5.1)*.03*rough);
    c.lineTo(x,base-height);
  }
  c.lineTo(w,h);c.closePath();
  const gradient=c.createLinearGradient(0,h*(1-depth*1.4),0,h);
  gradient.addColorStop(0,rgba(blend(p.hills,p.line,.56-layer*.17),1));
  gradient.addColorStop(1,rgba(blend(p.hills,p.line,.78-layer*.19),1));
  c.globalAlpha=.57+layer*.06;
  c.fillStyle=gradient;c.fill();
  c.globalAlpha=1;
}
function paintForestHorizon(c,w,h,p){
  for(let layer=0;layer<3;layer++){
    const ground=h*(.94+layer*.04), color=blend(p.hills,p.water,.21+layer*.32);
    for(let i=0;i<100;i++){
      const seed=layer*311+i*13, u=(i+hash(seed)*.8)/100;
      const opening=smooth(Math.abs(u-.54)/.30);
      const height=h*(.018+opening*(.043+hash(seed+2)*.15));
      const width=Math.min(w,h*2)*(.005+hash(seed+4)*.008);
      const x=u*w;
      ellipse(c,x,ground-height*.42,width,height*.43,rgba(color,.52+layer*.16),.13*(hash(seed+8)-.5));
      ellipse(c,x+width*.22,ground-height*.75,width*.68,height*.26,rgba(color,.63+layer*.12),-.21);
      ellipse(c,x-width*.49,ground-height*.52,width*.69,height*.29,rgba(color,.55+layer*.14),.22);
    }
    pigmentGlow(c,w*.54,ground,w*.55,.063,0,layer===1?p.light:p.cloud,.27);
  }
}
function paintFarmHorizon(c,w,h,p){
  for(let layer=0;layer<3;layer++){
    const base=h*(.90+layer*.055), height=h*(.44-layer*.076);
    const color=blend(p.shadow,p.hills,.35+layer*.27);
    c.beginPath();c.moveTo(0,h);
    for(let i=0;i<=85;i++){
      const u=i/85, peak=Math.exp(-((u-.29-layer*.065)**2)/(.027+layer*.027));
      const profile=.14+.71*peak+.08*Math.sin(u*18+layer)+.036*Math.sin(u*47+layer*2);
      c.lineTo(u*w,base-height*profile);
    }
    c.lineTo(w,h);c.closePath();
    const wash=c.createLinearGradient(0,base-height,0,base);
    wash.addColorStop(0,rgba(color,.92));
    wash.addColorStop(1,rgba(blend(color,p.line,.54),.68));
    c.fillStyle=wash;c.fill();
    pigmentGlow(c,w*.61,base,w*.58,.092,0,p.light,.38);
  }
  for(let i=0;i<145;i++){
    const seed=p.seed+i*37;
    const x=hash(seed)*w,y=h*(.87+hash(seed+13)*.12);
    const color=i%3?[107,141,108]:[165,172,123];
    ellipse(c,x,y,Math.min(w,h)*(.003+hash(seed+29)*.012),
      h*(.004+hash(seed+47)*.018),rgba(color,.11+hash(seed+8)*.21),-.16);
  }
  pigmentGlow(c,w*.57,h*.96,w*.59,.065,0,p.light,.37);
}
function paintJadeValley(c,w,h,p){
  const x=w*.64,y=h*.53,r=Math.min(w,h)*.037;
  bloom(c,x,y,h*.39,p.light,.76);
  ellipse(c,x,y,r,r,rgba([255,239,196],.95));
  for(let layer=0;layer<3;layer++){
    const ridgeHeight=h*(.33+layer*.05), base=h*(.83+layer*.082);
    for(const side of [-1,1]){
      const edge=side===-1?0:w;
      const tip=w*(.52+side*(.028+layer*.032));
      const span=Math.abs(tip-edge);
      const g=c.createLinearGradient(0,base-ridgeHeight,0,base);
      g.addColorStop(0,rgba(blend(p.shadow,p.cloud,.38+layer*.12),.92));
      g.addColorStop(.58,rgba(blend(p.hills,[122,202,159],layer*.32),.94));
      g.addColorStop(1,rgba(blend(p.water,p.line,.57),.69));
      c.fillStyle=g;c.beginPath();c.moveTo(edge,h);
      for(let i=0;i<=66;i++){
        const u=i/66, broad=(1-u)**1.2;
        const shape=.64+.22*Math.sin(u*9+layer+side)+.083*Math.sin(u*22+layer*1.8)+.03*Math.sin(u*60+side);
        c.lineTo(lerp(edge,tip,u),base-ridgeHeight*broad*shape);
      }
      c.lineTo(edge,h);c.closePath();c.fill();
      c.save();c.clip();
      for(let i=0;i<120;i++){
        const seed=layer*239+i*37+(side+1)*173;
        const px=lerp(edge,tip,hash(seed)), py=base-hash(seed+5)*ridgeHeight;
        const color=pigments[p.painting][(layer+i)%6];
        pigmentGlow(c,px,py,span*(.02+hash(seed+7)*.075),.19,side*.34,color,.13+hash(seed+9)*.17);
      }
      c.restore();
    }
    pigmentGlow(c,w*.52,base,w*.54,.09,0,p.cloud,.54);
  }
}
function paintSky(p) {
  const b=document.createElement("canvas"), w=b.width=sky.width, h=b.height=sky.height, c=b.getContext("2d");
  const g=c.createLinearGradient(0,0,0,h);
  g.addColorStop(0,rgba(p.sky,1));g.addColorStop(.6,rgba(p.mid,1));g.addColorStop(1,rgba(p.line,1));
  c.fillStyle=g;c.fillRect(0,0,w,h);
  if(p.ink){
    paintInkMountains(c,w,h,p.seed);
    return b;
  }
  const useArt=!p.painting&&p.index===0&&art.complete&&art.naturalWidth>0;
  if(useArt){
    const width=Math.min(art.naturalWidth,art.naturalHeight*w/h);
    const height=Math.min(art.naturalHeight,Math.max(art.naturalHeight*.81,art.naturalWidth*h/w));
    const x=(art.naturalWidth-width)*clamp(.68+(p.seed%9-4)*.035,0,1);
    c.drawImage(art,x,(art.naturalHeight-height)*.95,width,height,0,0,w,h);
  } else {
    bloom(c,w*.68,h*.79,h*.86,p.light,.67);
    for(let bank=0;bank<9;bank++){
      const seed=p.seed+bank*63, x=hash(seed)*w, y=h*(.15+hash(seed+2)*.58);
      const rw=w*(.12+hash(seed+3)*.30), rh=h*(.06+hash(seed+4)*.14);
      for(let n=0;n<38;n++){
        const u=hash(seed+n*7), v=hash(seed+n*7+2), size=hash(seed+n*7+3);
        const xx=x+(u-.5)*rw, yy=y+(v-.5)*rh*Math.sin(u*Math.PI);
        const rx=rw*(.065+size*.14), ry=rh*(.16+size*.49);
        c.save();c.translate(xx,yy);c.scale(1,ry/rx);
        bloom(c,0,0,rx,blend(p.shadow,p.cloud,.24+v*.72),.12+size*.4);c.restore();
      }
    }
    if(p.painting) paintedClouds(c,w,h,p);
    if(p.moonRiver||p.harp||p.mirrorLake)paintColorStrokes(c,w,h,p);
    skyDetail(c,w,h,p);
    const landscape=p.grove?{...p,line:[135,159,175],hills:[65,99,116]}:p;
    for(let i=0;i<3;i++) ridge(c,w,h,landscape,i);
    if(p.forest) paintForestHorizon(c,w,h,p);
    if(p.jade) paintJadeValley(c,w,h,p);
    if(p.farmland) paintFarmHorizon(c,w,h,p);
    if(p.redCliff) paintRedCliffBank(c,w,h,p);
    if(p.mirrorLake) paintMirrorPass(c,w,h,p);
    for(let i=0;i<10;i++){
      const x=w*hash(i+320+p.seed), y=h*(.81+hash(i+621)*.20), r=w*(.12+hash(i+312)*.21);
      c.save();c.translate(x,y);c.scale(1,.10+hash(i+901)*.14);
      bloom(c,0,0,r,i%2?p.light:p.cloud,.19+hash(i+11)*.13);c.restore();
    }
  }
  paintAtmosphere(c,w,h,sceneAtmosphere(p));
  return b;
}
function paintColorStrokes(c,w,h,p){
  const colors=pigments[p.painting], span=Math.min(w,h*1.7);
  for(let i=0;i<215;i++){
    const key=p.seed+i*49;
    const u=hash(key+1), side=hash(key+5)-.5;
    const x=u*w, y=h*(.43+Math.sin(u*6.2+p.seed)*.16+side*.45);
    const radius=span*(.009+hash(key+7)**2*.13);
    const angle=(p.mirrorLake?-.34:-.15)+hash(key+9)*.31;
    pigmentGlow(c,x,y,radius,.22+hash(key+11)*.3,angle,colors[i%6],.10+hash(key+13)*.32);
    if(i%5===0)ellipse(c,x,y,radius*.39,Math.max(.42,radius*.035),rgba(colors[(i+2)%6],.22),angle);
  }
}
function paintInkMountains(c,w,h,seed){
  for(let layer=0;layer<4;layer++){
    const base=h*(.73+layer*.087), height=h*(.31+layer*.073);
    const shore=c.createLinearGradient(0,base-height,0,base);
    const ink=155-layer*33;
    shore.addColorStop(0,rgba([ink,ink,ink],.91));
    shore.addColorStop(1,rgba([174,174,174],.36));
    c.beginPath();c.moveTo(0,base);
    for(let i=0;i<=110;i++){
      const u=i/110;
      const open=Math.abs(u-.61);
      const peak=(.38+.21*Math.sin(u*13+layer*1.9)+.12*Math.sin(u*29-layer)+.085*Math.sin(u*59))*(.23+open);
      c.lineTo(w*u,base-height*peak*2.4);
    }
    c.lineTo(w,base);c.closePath();c.fillStyle=shore;c.fill();
    c.save();c.clip();
    for(let i=0;i<120;i++){
      const k=seed+layer*391+i*27;
      const x=hash(k+3)*w,y=base-hash(k+7)*height;
      pigmentGlow(c,x,y,Math.min(w,h)*(.016+hash(k+13)*.067),.15,-.68,
        [34,34,34],.05+hash(k+23)*.17);
    }
    c.restore();
    pigmentGlow(c,w*.55,base,w*.65,.082,0,[248,248,248],.64);
  }
  for(let i=0;i<4000;i++){
    const k=seed+i*17;
    c.fillStyle=hash(k+1)>.5?"#1c1c1c0a":"#ffffff21";
    c.fillRect(hash(k+3)*w,hash(k+7)*h,1+hash(k+9)*2,1);
  }
}
function paintMirrorPass(c,w,h,p){
  for(const side of [-1,1]){
    const edge=side===-1?0:w, inner=w*(.53+side*.11);
    c.beginPath();c.moveTo(edge,h);
    for(let i=0;i<=32;i++){
      const u=i/32;
      const peak=(1-u)**.74*(.69+.17*Math.sin(u*9+side)+.065*Math.sin(u*37));
      c.lineTo(lerp(edge,inner,u),h*(.98-peak*.64));
    }
    c.lineTo(inner,h);c.closePath();
    const stone=c.createLinearGradient(0,h*.38,0,h);
    stone.addColorStop(0,rgba(p.shadow,.94));stone.addColorStop(1,rgba(p.hills,.57));
    c.fillStyle=stone;c.fill();c.save();c.clip();
    for(let i=0;i<44;i++){
      const k=p.seed+side*77+i*17;
      pigmentGlow(c,lerp(edge,inner,hash(k)),h*(.40+hash(k+5)*.6),Math.min(w,h)*.11,
        .16,side*.61,p.light,.15+hash(k+8)*.19);
    }
    c.restore();
  }
  pigmentGlow(c,w*.53,h*.94,w*.39,.15,0,p.cloud,.44);
}
function paintRedCliffBank(c,w,h,p){
  const span=w*.59;
  for(let layer=0;layer<2;layer++){
    const base=h*(.94+layer*.055), height=h*(.44-layer*.06);
    c.beginPath();c.moveTo(0,h);c.lineTo(0,base-height*.79);
    for(let i=0;i<=44;i++){
      const u=i/44;
      const relief=(1-u)**.79*(.77+.095*Math.sin(u*24+layer)+.048*Math.sin(u*71));
      c.lineTo(span*u*(1-layer*.18),base-height*relief);
    }
    c.lineTo(span,h);c.closePath();
    const rock=c.createLinearGradient(0,base-height,0,base);
    rock.addColorStop(0,"#65516b");rock.addColorStop(.46,"#826573");
    rock.addColorStop(1,rgba(p.hills,.84));
    c.fillStyle=rock;c.fill();c.save();c.clip();
    for(let i=0;i<75;i++){
      const key=p.seed+i*59+layer*97;
      const x=hash(key)*span, y=base-hash(key+7)*height;
      const color=i%3===0?[187,135,124]:[53,62,86];
      pigmentGlow(c,x,y,Math.min(w,h)*(.017+hash(key+13)*.073),.14,-.47,color,.17+hash(key+3)*.27);
    }
    c.restore();
    pigmentGlow(c,span*.56,base,w*.46,.085,0,p.cloud,.29);
  }
}
const pigments = [
  [[252,151,182],[255,209,145],[114,144,224],[184,118,216],[100,200,214],[255,235,188]],
  [[251,155,135],[241,119,180],[116,142,226],[175,119,222],[106,218,195],[255,221,175]],
  [[151,255,206],[88,181,245],[172,111,246],[251,141,192],[70,230,213],[250,220,151]],
  [[255,184,120],[248,109,165],[113,153,250],[181,104,221],[124,224,222],[255,233,172]],
  [[127,158,250],[213,118,227],[85,180,233],[246,138,168],[104,224,213],[255,208,142]],
  [[114,176,155],[237,158,109],[93,137,165],[170,129,169],[109,184,173],[255,206,132]],
  [[117,222,189],[255,182,139],[93,155,201],[192,163,206],[113,206,207],[255,232,168]],
  [[253,132,177],[255,180,171],[134,141,218],[218,119,186],[114,198,188],[255,223,192]],
  [[179,198,124],[246,194,119],[119,163,175],[215,154,143],[143,185,126],[255,229,159]],
  [[109,135,191],[164,159,208],[79,131,160],[192,129,157],[116,173,182],[242,178,117]],
  [[106,170,182],[175,211,201],[96,134,166],[168,139,164],[121,195,178],[235,224,178]],
  [[161,196,228],[229,237,245],[113,162,211],[173,171,220],[135,199,195],[244,228,209]],
  [[121,163,216],[230,160,204],[114,199,179],[166,137,215],[225,183,124],[244,224,182]],
  [[158,190,234],[218,171,217],[132,152,226],[191,155,212],[150,219,212],[255,223,186]],
  [[181,181,181],[226,226,226],[143,143,143],[207,207,207],[166,166,166],[246,246,246]]
];
const skyLighting = [
  null,
  {point:[.72,.72], veil:[.27,.38], tilt:-.13},
  {point:[.76,.28], veil:[.31,.48], tilt:-.31},
  {point:[.59,.66], veil:[.28,.34], tilt:-.21},
  {point:[.81,.27], veil:[.36,.39], tilt:-.36},
  {point:[.72,.74], veil:[.30,.48], tilt:-.10},
  {point:[.62,.72], veil:[.33,.40], tilt:-.21},
  {point:[.59,.67], veil:[.36,.40], tilt:-.16},
  {point:[.73,.69], veil:[.32,.44], tilt:-.12},
  {point:[.74,.33], veil:[.42,.52], tilt:-.10},
  {point:[.75,.36], veil:[.38,.61], tilt:-.06},
  {point:[.78,.26], veil:[.35,.58], tilt:-.08},
  {point:[.53,.57], veil:[.31,.45], tilt:-.22},
  {point:[.71,.32], veil:[.44,.62], tilt:-.13}
];
const atmospheres = [
  {focus:[.29,.66], tones:[[255,190,161],[226,152,208],[137,182,240]], veil:.32, drift:"petal"},
  {focus:[.67,.79], tones:[[251,186,166],[188,156,211],[153,192,221]], veil:.66, drift:"mist"},
  {focus:[.59,.34], tones:[[153,248,200],[108,174,249],[183,142,237]], veil:.36, drift:"glint"},
  {focus:[.71,.67], tones:[[255,214,150],[255,158,181],[167,169,235]], veil:.58, drift:"petal"},
  {focus:[.76,.22], tones:[[165,180,255],[210,146,236],[116,200,222]], veil:.26, drift:"star"},
  {focus:[.51,.76], tones:[[255,189,110],[123,177,154],[174,156,191]], veil:.62, drift:"firefly"},
  {focus:[.66,.55], tones:[[255,230,173],[137,218,184],[225,171,190]], veil:.48, drift:"glint"},
  {focus:[.57,.66], tones:[[255,215,154],[244,135,190],[154,199,213]], veil:.49, drift:"petal"},
  {focus:[.73,.64], tones:[[255,220,154],[162,202,138],[156,191,203]], veil:.38, drift:"glint"},
  {focus:[.76,.30], tones:[[196,196,234],[122,158,191],[172,129,169]], veil:.47, drift:"mist"},
  {focus:[.76,.35], tones:[[221,235,208],[109,193,184],[156,176,211]], veil:.56, drift:"mist"},
  {focus:[.80,.28], tones:[[231,245,255],[159,207,231],[188,175,232]], veil:.49, drift:"petal"},
  {focus:[.53,.50], tones:[[244,213,168],[164,225,209],[212,158,231]], veil:.35, drift:"glint"},
  {focus:[.70,.29], tones:[[250,231,203],[170,193,244],[215,165,227]], veil:.50, drift:"mist"},
  {focus:[.69,.43], tones:[[249,249,249],[204,204,204],[232,232,232]], veil:.27, drift:"mist"}
];
function sceneAtmosphere(scene){
  return atmospheres[scene.painting ?? [0,2,3,4][scene.index]];
}
function pigmentGlow(c,x,y,r,flatten,angle,color,alpha){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(1,flatten);
  bloom(c,0,0,r,color,alpha);c.restore();
}
function paintAtmosphere(c,w,h,{focus,tones,veil,drift}){
  const [x,y]=focus, span=Math.min(w,h*2);
  for(let bank=0;bank<3;bank++){
    const angle=-.18+bank*.14, cy=h*(y+(bank-1)*.12);
    for(let i=0;i<44;i++){
      const seed=bank*127+i*17, u=hash(seed)*1.65-.825;
      const px=w*(x+u), py=cy+h*(u*angle+(hash(seed+11)-.5)*.14);
      const radius=span*(.026+hash(seed+18)**2*.105);
      pigmentGlow(c,px,py,radius,.19+hash(seed+38)*.31,angle,tones[bank],veil*(.10+hash(seed+6)*.28));
    }
  }
  if(drift==="star"){
    for(let i=0;i<240;i++){
      const u=hash(i+620), v=(hash(i+791)-.5)*.27;
      const px=w*u, py=h*(.62-u*.46+Math.sin(u*5)*.077+v);
      const size=.35+hash(i+6)**4*1.65;
      ellipse(c,px,py,size,size*.72,rgba(tones[i%3],.14+(.5-Math.abs(v)*3.4)*.60));
    }
  }
}
function paintedClouds(c,w,h,p){
  const colors=pigments[p.painting];
  // The same sky grain sits under each study, with its own colored cloud banks.
  if(art.complete&&art.naturalWidth){
    c.save();c.globalAlpha=p.painting===3?.52:.36;c.globalCompositeOperation="luminosity";
    const sw=Math.min(art.naturalWidth,art.naturalHeight*w/h);
    const sh=Math.min(art.naturalHeight,sw*h/w);
    c.drawImage(art,(art.naturalWidth-sw)*hash(p.seed),0,sw,sh,0,0,w,h);c.restore();
  }
  const {point,veil,tilt}=skyLighting[p.painting];
  pigmentGlow(c,w*veil[0],h*veil[1],w*.54,.56,tilt,colors[3],.46);
  pigmentGlow(c,w*(1-veil[0]*.54),h*.47,w*.42,.47,-tilt,colors[2],.39);
  pigmentGlow(c,w*point[0],h*point[1],w*.44,.43,tilt,colors[0],.48);
  const banks=p.painting===3?9:8;
  for(let bank=0;bank<banks;bank++){
    const seed=p.seed*29+bank*101;
    const x=w*(-.17+hash(seed)*1.26), y=h*(.14+hash(seed+7)*.68);
    const span=w*(.35+hash(seed+11)*.49), thick=h*(.11+hash(seed+16)*.18);
    const tone=colors[bank%colors.length], accent=colors[(bank+2)%colors.length];
    for(let i=0;i<112;i++){
      const q=seed+i*53, u=hash(q+1), v=hash(q+5), crest=Math.sin(u*Math.PI)**.7;
      const bend=Math.sin(u*5.8+bank)*.38+Math.sin(u*12+bank*3)*.13;
      const cx=x+(u-.5)*span, cy=y+(bend+(v-.50)*crest)*thick;
      const r=span*(.012+hash(q+9)**2*.063);
      const hue=blend(tone,accent,hash(q+12)*.46);
      c.save();c.translate(cx,cy);c.rotate(-.17+.33*Math.cos(u*6+bank));c.scale(1,.20+hash(q+2)*.51);
      bloom(c,0,0,r,hue,crest*(.19+hash(q+21)*.39));c.restore();
      if(i%3===0){
        const angle=tilt+hash(q+43)*.38;
        const warm=blend(hue,colors[5],.34+hash(q+34)*.43);
        const shade=blend(hue,colors[2],.48);
        pigmentGlow(c,cx-r*.09,cy-thick*.075,r*.85,.19+hash(q+8)*.31,angle,shade,crest*.29);
        pigmentGlow(c,cx+r*.14,cy+thick*.10,r*.66,.15+hash(q+8)*.31,angle,warm,crest*.56);
        for(let j=0;j<3;j++){
          const bit=q+j*201, dx=(hash(bit+67)-.5)*r, dy=(hash(bit+17)-.5)*r*.44;
          pigmentGlow(c,cx+dx,cy+dy,r*(.13+hash(bit+19)*.28),.32,angle,
            colors[(bank+j+4)%colors.length],crest*(.22+hash(bit+97)*.30));
        }
      }
    }
  }
  c.save();c.globalCompositeOperation="screen";
  pigmentGlow(c,w*point[0],h*point[1],w*.32,.37,tilt,colors[5],.38);
  pigmentGlow(c,w*(point[0]-.15),h*(point[1]+.13),w*.33,.18,tilt,colors[1],.23);
  c.restore();
}
function reflectedPigments(world){
  const deep=H-horizon, mix=smooth(transition);
  const strength=lerp(previous.painting?1:.33,current.painting?1:.33,mix);
  const before=pigments[previous.painting||0], after=pigments[current.painting||0];
  for(const {object:{kind:i,seed},depth:z,point:p} of world){
    if(i%2===0)continue;
    const width=(22+hash(seed+128)*108)*p.scale;
    if(p.x+width<0||p.x-width>W)continue;
    const amount=strength*smooth((z-66)/48)*smooth((930-z)/520);
    const color=blend(before[i%6],after[i%6],mix);
    const angle=-.15+hash(seed+9)*.24;
    pigmentGlow(ctx,p.x,p.y,width,.12+hash(seed+34)*.14,angle,color,amount*(.24+hash(seed+217)*.35));
    if(i%3===0){
      const tint=blend(before[(i+3)%6],after[(i+3)%6],mix);
      pigmentGlow(ctx,p.x+width*.18,p.y+deep*.011,width*.38,.15,-angle,tint,amount*.52);
      ellipse(ctx,p.x-width*.21,p.y+deep*.006,width*.11,.63+p.scale,rgba(color,amount*.46),angle);
    }
  }
}
const encounters = [
  {kind:"bird",at:560,end:762,count:3},
  {kind:"bird",at:1380,end:1675,count:2},
  {kind:"butterfly",at:2025,end:2245,count:4},
  {kind:"firefly",at:2540,end:2855,count:9}
];
function drawCompanions(px,py,scale,light){
  if(!routeMode)return;
  for(const {kind,at,end,count} of encounters){
    if(routeDistance<at-130||routeDistance>end+95+(count-1)*11)continue;
    for(let i=0;i<count;i++){
      const delay=i*11, arrival=smooth((routeDistance-at+115-delay)/135);
      const leave=smooth((routeDistance-end+58-delay)/153);
      const opacity=arrival*(1-leave);
      if(opacity<.004)continue;
      const seed=at+i*51, side=i%2?1:-1, phase=t*(.9+hash(seed)*.46)+i*2.39;
      const bird=kind==="bird", butterfly=kind==="butterfly";
      const reach=bird?95:butterfly?47:52;
      const follow=(12+hash(seed+9)*reach)*scale;
      const x=px+side*(follow+(1-arrival+leave)*W*.39)+Math.cos(phase)*scale*(bird?17:13);
      const flutter=reduced?.48:1;
      const y=py-(bird?120+hash(seed+7)*94:butterfly?53+hash(seed+7)*62:14+hash(seed+7)*49)*scale
        +Math.sin(phase*.83)*scale*11*flutter-leave*H*.32;
      const size=scale*(.68+hash(seed+12)*.58);
      ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.globalAlpha=opacity;
      if(bird){
        const wing=4+Math.sin(t*6+i)*5;
        ctx.fillStyle=rgba(blend(light,[234,227,255],.54),1);ctx.beginPath();
        ctx.moveTo(-18,2);ctx.quadraticCurveTo(-8,-wing,0,1);ctx.quadraticCurveTo(9,-wing-2,19,0);
        ctx.quadraticCurveTo(9,-1,1,5);ctx.quadraticCurveTo(-9,1,-18,2);ctx.fill();
        ellipse(ctx,0,3,2.2,2.1,"#fff1d7");
      }else if(butterfly){
        const spread=.32+.68*Math.abs(Math.sin(t*9+i));
        bloom(ctx,0,0,15,[255,167,174],.33);
        ellipse(ctx,-4*spread,0,6*spread,5,rgba([244,142,185],.91),-.32);
        ellipse(ctx,4*spread,0,6*spread,5,rgba([255,206,141],.91),.32);
        ellipse(ctx,-2,3,2.9*spread,2.3,"#ebafdf");ellipse(ctx,2,3,2.9*spread,2.3,"#ffe1ac");
      }else{
        const glow=.37+.57*(.5+.5*Math.sin(phase*1.6));
        const color=i%3?[255,224,148]:[163,247,211];
        bloom(ctx,0,0,10+glow*9,color,glow*.68);
        ellipse(ctx,0,0,1.5,1.5,rgba(color,glow));
      }
      ctx.restore();
    }
  }
}

function drawCached(b, alpha){
  if(!b||alpha<=0)return;
  sk.globalAlpha=alpha;
  const shift=-Math.sin(position*.0026+facing)*sky.width*.075;
  sk.drawImage(b,-sky.width*.12+shift,0,sky.width*1.24,sky.height);
  sk.globalAlpha=1;
}
let auroraTextures;
function nightElements(p,a){
  if(p.ink)return;
  if(a<=0 || p.forest || (p.index!==1 && p.index!==3)) return;
  const w=sky.width,h=sky.height;
  for(let i=0;i<120;i++){
    const x=wrap(hash(i*3+p.seed)*w-position*.027,w),y=hash(i*3+1)*h*.78;
    const light=(.27+.65*Math.pow(.5+.5*Math.sin(t*(.34+hash(i)*.75)+i),3))*a;
    ellipse(sk,x,y,.45+hash(i+10)*1.15,.45+hash(i+10)*1.15,rgba(p.light,light));
  }
  if(p.index===1){
    sk.globalCompositeOperation="screen";
    auroraTextures??=[[99,237,191],[171,116,246],[104,184,248]].map(color=>{
      const texture=document.createElement("canvas");
      texture.width=texture.height=128;
      bloom(texture.getContext("2d"),64,64,64,color,1);
      return texture;
    });
    for(let band=0;band<3;band++){
      const steps=34, height=h*(.103+band*.018);
      for(let i=0;i<=steps;i++){
        const u=i/steps, x=w*u;
        const phase=u*6.8+t*.15+band*1.5;
        const y=h*(.23+band*.055+.105*Math.sin(phase)+.043*Math.sin(u*13-t*.12+band));
        const shimmer=.57+.43*Math.sin(u*21+band+t*.21)**2;
        const radius=w*(.057+hash(i+band*13)*.019);
        sk.globalAlpha=a*shimmer*.24;
        sk.drawImage(auroraTextures[band],x-radius,y-height,radius*2,height*2);
      }
    }
    sk.globalAlpha=1;sk.globalCompositeOperation="source-over";
  }
}
function drawSky(light) {
  drawCached(transition<1?oldCache:cache,1);
  if(transition<1) drawCached(cache,smooth(transition));
  nightElements(previous,1-transition);
  nightElements(current,transition);
  const sw=sky.width,sh=sky.height;
  const lx=sw*(.72+.105*Math.sin(t*.028-position*.00018)), ly=sh*(.76+.085*Math.sin(t*.044));
  bloom(sk,lx,ly,sh*.72,light,.24+.14*Math.sin(t*.23));
  const airMass=position*.005+distance*.0017;
  const skyTone=.5+.26*Math.sin(airMass)+.24*Math.sin(airMass*.41+1.3);
  const oldTones=sceneAtmosphere(previous).tones, newTones=sceneAtmosphere(current).tones;
  const tint=blend(blend(oldTones[0],oldTones[2],skyTone),blend(newTones[0],newTones[2],skyTone),smooth(transition));
  pigmentGlow(sk,sw*(.52+.16*Math.sin(airMass*.64)),sh*.47,sw*.63,.41,-.18,tint,.17);
  if(!current.forest&&!current.peachNight&&((current.index===0 && !art.naturalWidth) || current.index===2)){
    bloom(sk,lx,ly,sh*.15,light,.53*transition);
    ellipse(sk,lx,ly,sh*.015,sh*.015,rgba(light,.58*transition));
  }
  if(!current.forest&&(current.index===0 || current.index===2)){
    const warm=transition*(.12+.04*Math.sin(t*.17));
    sk.save();sk.translate(lx,ly);sk.rotate(-.31);sk.scale(1,.42);
    bloom(sk,0,0,sh*.92,light,warm);sk.restore();
  }
  const fog=sk.createLinearGradient(0,sh*.81,0,sh);
  const forestMist=lerp(previous.forest ? .33 : 0,current.forest ? .33 : 0,smooth(transition));
  const mist=forestMist+(routeMode
    ? .38*smooth((routeDistance-290)/480)*(1-smooth((routeDistance-1430)/610))
    : current.index===0?smooth((timeInDream-19)/19)*.23:0);
  drawDistantRidges(sw,sh);
  drawSkyLife(light);
  cloudBanks(sk,sw,sh,light,mist);
  const mix=smooth(transition);
  driftVeils(sceneAtmosphere(previous),1-mix,sw,sh);
  driftVeils(sceneAtmosphere(current),mix,sw,sh);
  fog.addColorStop(0,rgba(light,0));fog.addColorStop(1,rgba(light,.15+mist+.08*Math.sin(t*.24)));
  sk.fillStyle=fog;sk.fillRect(0,sh*.81,sw,sh*.19);
  ctx.drawImage(sky,0,0,W,horizon);
}
function drawDistantRidges(w,h){
  const mix=smooth(transition), base=blend(previous.hills,current.hills,mix);
  const seed=lerp(previous.seed,current.seed,mix);
  for(let layer=0;layer<2;layer++){
    const center=position*(.30+layer*.20)+distance*(.045+layer*.019);
    const span=460+layer*80;
    const gradient=sk.createLinearGradient(0,h*.83,0,h);
    gradient.addColorStop(0,rgba(base,.48+layer*.08));
    gradient.addColorStop(1,rgba(base,0));
    sk.fillStyle=gradient;
    sk.beginPath();sk.moveTo(0,h);
    for(let i=0;i<=54;i++){
      const u=i/54, x=center+u*span;
      const hill=.51+.21*Math.sin(x*.015+seed*.014+layer)+.15*Math.sin(x*.032-layer)+.07*Math.sin(x*.061+layer);
      sk.lineTo(w*u,h*(.997-hill*(.096+layer*.049)));
    }
    sk.lineTo(w,h);sk.closePath();sk.fill();
  }
}
function driftVeils({focus,tones,veil},opacity,w,h){
  if(opacity<=0)return;
  const clock=reduced?0:t;
  for(let i=0;i<9;i++){
    const depth=hash(i+92), shift=wrap(hash(i+25)+clock*(.005+depth*.003),1);
    const x=w*(wrap(shift-position*(.028+depth*.09)/(w*1.58),1)*1.58-.29);
    const y=h*(.54+focus[1]*.28+depth*.21+.027*Math.sin(clock*.27+i));
    const radius=w*(.18+hash(i+49)*.23);
    pigmentGlow(sk,x,y,radius,.045+depth*.089,-.05+depth*.075,tones[i%3],opacity*veil*(.18+depth*.27));
  }
}
function drawWater(light,water,world) {
  const deep=H-horizon;
  ctx.fillStyle=rgba(water,1);ctx.fillRect(0,horizon,W,deep);
  ctx.save();ctx.beginPath();ctx.rect(0,horizon,W,deep);ctx.clip();
  ctx.globalAlpha=.59;
  ctx.save();ctx.translate(0,horizon);ctx.scale(1,-1);
  ctx.drawImage(sky,0,-deep,W,deep);
  ctx.restore();
  if(!reduced){
    const strips=27, sourceHeight=sky.height/strips, height=deep/strips;
    ctx.save();ctx.translate(0,horizon);ctx.scale(1,-1);
    for(let i=0;i<strips;i++){
      const u=1-i/strips;
      const offset=(Math.sin(t*.78+i*.47)+Math.sin(t*.31-i*.81)*.57)*u*u*W*.009;
      ctx.globalAlpha=.22+u*.11;
      ctx.drawImage(sky,0,i*sourceHeight,sky.width,sourceHeight,offset-W*.015,-deep+i*height,W*1.03,height+.5);
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;
  const veil=ctx.createLinearGradient(0,horizon,0,H);
  veil.addColorStop(0,rgba(light,.09));veil.addColorStop(.43,rgba(water,.19));veil.addColorStop(1,rgba(water,.46));
  ctx.fillStyle=veil;ctx.fillRect(0,horizon,W,deep);
  const mix=smooth(transition), before=sceneAtmosphere(previous), after=sceneAtmosphere(current);
  for(let i=0;i<14;i++){
    const u=(i+.5)/14, wave=reduced?0:Math.sin(t*.41+i*.92);
    const focus=lerp(before.focus[0],after.focus[0],mix);
    const x=W*(focus+wave*u*.032+(hash(i+82)-.5)*u*.24);
    const color=blend(before.tones[i%3],after.tones[i%3],mix);
    pigmentGlow(ctx,x,horizon+deep*u**1.25,W*(.05+u*.26),.043,0,color,.20*(1-u*.5));
  }
  reflectedPigments(world);
  const coolTint=[110,148,255], warmTint=[242,167,197];
  const pearl=blend(light,blend(
    previous.ink?[222,222,222]:previous.index%2?coolTint:warmTint,
    current.ink?[222,222,222]:current.index%2?coolTint:warmTint,smooth(transition)),.48);
  for(let i=0;i<6;i++){
    const x=W*(.04+i*.186+.06*Math.sin(t*.13+i)), y=horizon+deep*(.22+hash(i+86)*.64);
    const r=W*(.16+hash(i+442)*.10);
    ctx.save();ctx.translate(x,y);ctx.scale(1,.16+hash(i+49)*.17);
    bloom(ctx,0,0,r,i%2?pearl:light,.10+hash(i+341)*.12);ctx.restore();
  }
  const seam=ctx.createLinearGradient(0,horizon,0,horizon+deep*.095);
  seam.addColorStop(0,rgba(light,.14));seam.addColorStop(1,rgba(light,0));
  ctx.fillStyle=seam;ctx.fillRect(0,horizon,W,deep*.095);
  iceDetails(light,water,world);
  ctx.restore();
}
const iceTints=[[135,188,211],[115,185,189],[178,194,243],[103,124,216],[100,157,147],[138,207,181]];
function iceDetails(light,water,world){
  const tint=blend(previous.ink?[198,198,198]:iceTints[previous.index],
    current.ink?[198,198,198]:iceTints[current.index],smooth(transition));
  const lit=blend(tint,light,.45), shaded=blend(water,tint,.28);
  // Soft patches sit beneath the reflection and move with the ice.
  for(const {object:{kind:i,seed,x,z:worldZ},depth:z,point:p} of world){
    if(i%3!==0)continue;
    const radius=(42+hash(seed+514)*103)*p.scale;
    if(p.x+radius<0||p.x-radius>W)continue;
    const opacity=smooth((z-69)/41)*smooth((1130-z)/710);
    const color=[lit,tint,shaded][i/3];
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.13+hash(seed+604)*.13);
    bloom(ctx,0,0,radius,color,opacity*(.13+hash(seed+229)*.14));ctx.restore();
    if(i%6===0 && z<270){
      const left=project(x-16,worldZ-distance+13);
      const fork=project(x+5,worldZ-distance-5);
      const end=project(x+19,worldZ-distance-14);
      ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.quadraticCurveTo(p.x,p.y,fork.x,fork.y);ctx.lineTo(end.x,end.y);
      ctx.strokeStyle=rgba(lit,opacity*.22);ctx.lineWidth=.6+p.scale*.75;ctx.stroke();
    }
  }
  for(const {object:{kind:i,seed},depth:z,point:p} of world){
    const s=p.scale;
    if(p.x<0||p.x>W)continue;
    const fade=smooth((z-66)/33)*smooth((1220-z)/510);
    const a=fade*(.14+hash(seed+581)*.29);
    const width=(1.6+hash(seed+318)*11)*s;
    ellipse(ctx,p.x,p.y,width,.7+s*1.3,rgba(i%4?lit:light,a),-.25+hash(seed)*.45);
    if(i%7===0 && s>.16){
      bloom(ctx,p.x,p.y,6+s*18,lit,a*.62);
      for(let j=0;j<5;j++){
        const angle=hash(seed+j*19)*TAU, spread=(2+hash(seed+j+18)*19)*s;
        const glow=j%2?lit:light;
        ellipse(ctx,p.x+Math.cos(angle)*spread,p.y+Math.sin(angle)*spread*.43,
          .42+s*.65,.34+s*.48,rgba(glow,a*.91));
      }
    }
  }
}
function shoreDetail(width,tall,seed,light,water,petals,cloudSea){
  const rose=blend(light,[241,145,172],.67);
  const frost=blend(light,[153,221,237],.57);
  const shade=blend(water,[17,27,56],.32);
  for(let i=0;i<5;i++){
    const x=width*(-.7+i*.32), y=-tall*(.16+.40*Math.sin(i*Math.PI/5));
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+width*.28,y+tall*.19);
    ctx.lineTo(x+width*.41,y+tall*.19);ctx.lineTo(x+width*.23,y+tall*.31);
    ctx.strokeStyle=rgba(i%2?frost:shade,.28);ctx.lineWidth=.8;ctx.stroke();
  }
  if(petals>.06){
    const trunk=width*.14, top=-tall*1.66;
    ctx.strokeStyle=rgba(shade,.86);ctx.lineWidth=Math.max(.7,tall*.04);ctx.beginPath();
    ctx.moveTo(trunk,-tall*.65);ctx.bezierCurveTo(trunk-width*.17,-tall*.99,trunk+width*.15,-tall*1.15,trunk+width*.03,top);
    for(const side of [-1,1]){
      ctx.moveTo(trunk,-tall*1.06);ctx.quadraticCurveTo(trunk+side*width*.29,-tall*1.24,trunk+side*width*.49,-tall*1.46);
    }
    ctx.stroke();
    for(let i=0;i<24;i++){
      const x=trunk+(hash(seed+i*7)-.5)*width*1.23;
      const y=top+(hash(seed+i*7+1)-.42)*tall*.52;
      const radius=(.035+hash(seed+i*7+2)*.065)*width;
      ellipse(ctx,x,y,radius,radius*.72,rgba(i%4?rose:light,petals*(.42+hash(seed+i+51)*.46)),i*.8);
      if(i%4===0)ellipse(ctx,x,y,radius*.26,radius*.19,rgba(light,petals*.88));
    }
  }
  const crystal=(1-petals*.7)*(1-cloudSea*.5);
  for(let i=0;i<5;i++){
    const x=width*(-.64+hash(seed+i+362)*1.35);
    const y=-tall*(.13+hash(seed+i+863)*.24);
    const height=tall*(.16+hash(seed+i+651)*.46), w=width*(.04+hash(seed+i+612)*.09);
    ctx.beginPath();ctx.moveTo(x-w,y);ctx.lineTo(x-w*.55,y-height*.61);ctx.lineTo(x+w*.2,y-height);
    ctx.lineTo(x+w,y-height*.57);ctx.lineTo(x+w*.8,y);ctx.closePath();
    ctx.fillStyle=rgba(i%2?frost:blend(light,frost,.28),crystal*.55);ctx.fill();
    ctx.beginPath();ctx.moveTo(x+w*.2,y-height);ctx.lineTo(x+w*.33,y-height*.36);ctx.lineTo(x-w*.12,y);
    ctx.strokeStyle=rgba(light,crystal*.71);ctx.lineWidth=.6;ctx.stroke();
  }
}
function skyDetail(c,w,h,p){
  if(p.index===0)return;
  const cold=p.index!==2;
  for(let bank=0;bank<8;bank++){
    const seed=p.seed+bank*113, x=w*(.08+hash(seed)*.85), y=h*(.40+hash(seed+1)*.51);
    const span=w*(.16+hash(seed+2)*.32), height=h*(.046+hash(seed+3)*.13);
    for(let i=0;i<18;i++){
      const u=(i+hash(seed+i+19)*.65)/18, f=Math.sin(u*Math.PI);
      const r=span*(.07+hash(seed+i+33)*.10);
      const xx=x+(u-.5)*span, yy=y+Math.sin(u*8+bank)*height*.28;
      c.save();c.translate(xx,yy);c.scale(1,Math.max(.07,height/r*(.21+f*.59)));
      bloom(c,0,0,r,blend(p.shadow,p.cloud,.35+f*.38),(.13+f*.12)*(cold?.8:1));
      c.restore();
    }

  }
  if((cold&&!p.jade)||p.peachNight){
    const mx=w*.81,my=h*.24,r=h*.077;
    bloom(c,mx,my,r*2.9,p.light,.27);
    const moon=c.createLinearGradient(mx-r,my-r,mx+r,my+r);
    moon.addColorStop(0,rgba(p.light,.85));moon.addColorStop(1,rgba(p.mid,.44));
    ellipse(c,mx,my,r,r,moon);
    for(let i=0;i<10;i++){
      const xx=(hash(i+371)-.5)*r*1.18,yy=(hash(i+432)-.5)*r*1.18;
      ellipse(c,mx+xx,my+yy,r*(.06+hash(i+139)*.13),r*.073,rgba(p.mid,.20));
    }
  }
}

function cloudBanks(c,w,h,light,mist) {
  const cloudSea=routeMode?smooth((routeDistance-1450)/530)*(1-smooth((routeDistance-2300)/570)):0;
  for(let i=0;i<13;i++){
    const depth=hash(i+21);
    const x=wrap(hash(i+4)*w+t*(3+depth*4)-position*(.035+depth*.08),w*1.58)-w*.29;
    const y=h*(.62+depth*.45-cloudSea*hash(i+18)*.22);
    const radius=w*(.16+hash(i+8)*.17);
    c.save();c.translate(x,y);c.scale(1,.15+depth*.14);
    bloom(c,0,0,radius,light,.055+mist*.56+cloudSea*.26);
    c.restore();
  }
}
function kun(c,x,y,size,tilt,alpha,light,shadow){
  c.save();c.translate(x,y);c.rotate(tilt);c.scale(size,size);c.globalAlpha=alpha;
  const skin=c.createLinearGradient(-40,-46,0,62);
  skin.addColorStop(0,rgba(blend(shadow,light,.69),1));
  skin.addColorStop(.36,rgba(blend(shadow,light,.28),1));
  skin.addColorStop(1,rgba(blend(shadow,light,.64),1));
  c.beginPath();
  c.moveTo(-144,9);c.bezierCurveTo(-161,-17,-100,-50,-51,-48);
  c.bezierCurveTo(10,-48,65,-16,119,-5);c.bezierCurveTo(144,-2,148,-38,183,-33);
  c.bezierCurveTo(181,-10,164,3,148,7);c.bezierCurveTo(174,10,186,21,189,37);
  c.bezierCurveTo(152,42,140,21,117,17);c.bezierCurveTo(79,13,66,29,24,40);
  c.bezierCurveTo(-29,57,-118,46,-144,9);c.closePath();
  c.fillStyle=skin;c.fill();
  c.strokeStyle=rgba(light,.26);c.lineWidth=.85;c.stroke();
  c.beginPath();c.moveTo(-44,18);c.bezierCurveTo(-13,24,-11,45,-25,61);
  c.bezierCurveTo(-40,78,-58,84,-81,81);c.bezierCurveTo(-64,63,-67,47,-68,32);
  c.closePath();c.fillStyle=skin;c.fill();c.strokeStyle=rgba(light,.15);c.stroke();
  for(let j=0;j<4;j++){
    c.beginPath();c.moveTo(-139,13+j*3);c.bezierCurveTo(-113,23+j*5,-96,26+j*5,-71,25+j*4);
    c.strokeStyle=rgba(light,.23-j*.04);c.lineWidth=.85;c.stroke();
  }
  ellipse(c,-105,-1,3.6,2.8,rgba(shadow,.9));
  ellipse(c,-106,-2,1.4,1.1,rgba(light,.9));
  for(let i=0;i<27;i++){
    const xx=-127+hash(i+100)*190, yy=-26+hash(i+210)*34;
    ellipse(c,xx,yy,.6+hash(i+301)*1.05,.7,rgba(light,.23+hash(i)*.49));
  }
  c.restore();
}
function drawSkyLife(light) {
  const w=sky.width,h=sky.height,travel=routeDistance;
  const ascent=smooth((travel-1060)/540);
  const afterAscent=chapterIndex>cloudChapter||(chapterIndex===cloudChapter&&nextLine>flightVerse);
  const transformation=afterAscent?(flight?1-smooth(flight.elapsed/2.8):0):1;
  const alpha=routeMode?smooth((travel-1060)/280)*(1-smooth((travel-2270)/460))*transformation:0;
  const preset=(current.whale?smooth(transition):0)+(previous.whale?1-smooth(transition):0);
  const size=Math.min(w/770,h/380);
  if(alpha>.001){
    const x=w*(.73-.15*smooth((travel-1510)/700)) - Math.sin(position*.0026)*w*.09;
    const y=h*(.97-.55*ascent+.035*Math.sin(t*.7));
    kun(sk,x,y,size*(.62+.54*ascent),-.17+.14*ascent,alpha*.91,light,[29,36,74]);
    for(let i=0;i<38;i++){
      const amount=wrap(hash(i+520)+t*.24,1);
      const dx=(hash(i+620)-.5)*w*.29,dy=hash(i+720)*h*.34;
      const glow=alpha*Math.sin(amount*Math.PI);
      ellipse(sk,x+dx+amount*w*.13,y+dy*amount+h*.06,1+hash(i+5)*2,.7+hash(i+7)*1.6,rgba(light,glow*.79));
    }
  }
  if(preset>.001) kun(sk,w*(.68+.12*Math.sin(t*.22)),h*(.53+.05*Math.sin(t*.72)),size,.02,preset*.69,light,[48,48,85]);
  const shoal=routeMode?smooth((travel-1760)/320)*(1-smooth((travel-2370)/440)):0;
  if(shoal>.001){
    for(let i=0;i<11;i++){
      const f=wrap(hash(i+125)+t*(.033+hash(i+7)*.013),1);
      const x=w*(1.12-f*1.29),y=h*(.32+hash(i+224)*.35+Math.sin(f*7+i)*.05);
      const s=Math.max(.45,w/1250)*(.68+hash(i+617)*1.25);
      sk.save();sk.translate(x,y);sk.scale(s,s);sk.rotate(-.15);
      sk.globalAlpha=shoal*Math.sin(f*Math.PI)*.89;
      const wing=Math.sin(t*4+i)*6;
      sk.fillStyle=rgba(light,1);sk.beginPath();sk.moveTo(-13,0);
      sk.quadraticCurveTo(-4,-5,5,-2);sk.quadraticCurveTo(6,-10-wing,16,-12-wing);
      sk.quadraticCurveTo(11,-2,6,0);sk.lineTo(18,4);sk.lineTo(6,3);
      sk.quadraticCurveTo(-6,6,-13,0);sk.fill();
      ellipse(sk,-16,1,2.9,1.6,rgba([255,150,170],1),-.4);sk.restore();
    }
  }
}
const flightColors=[[255,234,191],[248,161,201],[164,207,253],[176,137,241],[128,223,215]];
function drawRoc(x,y,size,progress,alpha){
  if(alpha<.002)return;
  const flap=(reduced?0:Math.sin(t*2.35))*.12;
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.globalAlpha=alpha;
  for(const side of [-1,1]){
    ctx.save();ctx.scale(side,1);ctx.rotate(flap);
    const gold=ctx.createLinearGradient(0,-77,73,54);
    gold.addColorStop(0,"#fff1be");gold.addColorStop(.42,"#e6a4aa");
    gold.addColorStop(.82,"#766097");gold.addColorStop(1,"#54557e");
    ctx.beginPath();ctx.moveTo(-2,-11);
    ctx.bezierCurveTo(51,-67,125,-65,214,-101);
    ctx.bezierCurveTo(189,-51,154,-29,110,-7);
    for(let i=0;i<7;i++){
      const end=101-i*14, y=5+i*5;
      ctx.quadraticCurveTo(end+15,y-9,end,y+12);
      ctx.quadraticCurveTo(end-5,y+6,end-12,y+3);
    }
    ctx.quadraticCurveTo(5,42,0,19);ctx.closePath();ctx.fillStyle=gold;ctx.fill();
    ctx.lineWidth=1.15;
    for(let i=0;i<11;i++){
      const u=i/10, endX=33+u*157, endY=40-u*119;
      ctx.beginPath();ctx.moveTo(5+u*29,-7-u*24);
      ctx.bezierCurveTo(56+u*43,-28-u*14,29+u*126,11-u*47,endX,endY);
      ctx.strokeStyle=rgba(flightColors[i%flightColors.length],.25+u*.34);ctx.stroke();
    }
    ctx.restore();
  }
  const body=ctx.createLinearGradient(0,-25,0,48);
  body.addColorStop(0,"#fff3d1");body.addColorStop(.58,"#c78eaa");body.addColorStop(1,"#765d92");
  ctx.beginPath();ctx.moveTo(0,-35);ctx.bezierCurveTo(13,-26,16,-7,10,15);
  ctx.lineTo(19,44);ctx.lineTo(0,34);ctx.lineTo(-19,44);ctx.lineTo(-10,15);
  ctx.bezierCurveTo(-16,-7,-13,-26,0,-35);ctx.fillStyle=body;ctx.fill();
  bloom(ctx,0,-19,40,flightColors[0],.45*(1-progress*.35));
  ctx.restore();
}
function drawCrane(x,y,size,alpha,phase){
  if(alpha<.002)return;
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.globalAlpha=alpha;
  const flap=reduced?.3:Math.sin(phase);
  for(const side of [-1,1]){
    ctx.save();ctx.scale(side,1);
    const tip=-16-25*flap;
    const feather=ctx.createLinearGradient(0,-12,45,tip);
    feather.addColorStop(0,"#fff6e6");feather.addColorStop(.76,"#e7e9f4");feather.addColorStop(1,"#655e86");
    ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(12,-14,24,tip-1,45,tip);
    ctx.quadraticCurveTo(31,tip+13,22,5);ctx.quadraticCurveTo(13,10,1,7);ctx.closePath();
    ctx.fillStyle=feather;ctx.fill();ctx.restore();
  }
  ellipse(ctx,0,3,4.1,9,"#fff0dd");
  ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(1,-11,0,-16);
  ctx.lineWidth=2.7;ctx.strokeStyle="#f3e7dd";ctx.stroke();
  ellipse(ctx,0,-17,2.1,3.2,"#f9e9d5");ellipse(ctx,0,-18.8,1.1,1.3,"#ba586d");
  ctx.beginPath();ctx.moveTo(-1,9);ctx.lineTo(-2,17);ctx.moveTo(2,9);ctx.lineTo(3,17);
  ctx.strokeStyle="#6b5977";ctx.lineWidth=.85;ctx.stroke();ctx.restore();
}
function drawFlight(px,py,scale){
  if(!flight)return;
  const {elapsed,height}=flight, fade=smooth(height*2.6);
  const colors=flight.mirrorLake?pigments[13]:flightColors;
  const progress=elapsed/flight.duration, w=Math.min(W,H*1.55);
  const cloudTop=H*(.83-.32*height);
  const cloudDeck=ctx.createLinearGradient(0,cloudTop-H*.08,0,H);
  cloudDeck.addColorStop(0,rgba(colors[0],0));
  cloudDeck.addColorStop(.32,rgba(colors[0],fade*.35));
  cloudDeck.addColorStop(.62,rgba(colors[1],fade*.24));
  cloudDeck.addColorStop(1,rgba(colors[2],fade*.38));
  ctx.fillStyle=cloudDeck;ctx.fillRect(0,cloudTop-H*.08,W,H-cloudTop+H*.08);
  for(let i=0;i<31;i++){
    const depth=hash(i+773), drift=wrap(hash(i+7)+elapsed*(.025+depth*.043),1);
    const x=W*(-.15+hash(i+343)*1.30)-heading*w*.024*depth;
    const y=cloudTop+drift*H*.50+Math.sin(i*2.1)*H*.045;
    const width=w*(.14+hash(i+127)*.31);
    const alpha=fade*Math.sin(drift*Math.PI)*(.20+depth*.36);
    pigmentGlow(ctx,x,y,width,.17+depth*.12,-.09+depth*.22,colors[i%5],alpha);
    pigmentGlow(ctx,x+width*.11,y+12,width*.71,.12,0,colors[(i+1)%5],alpha*.77);
  }
  if(flight.mirrorLake)return;
  const rocAlpha=smooth(elapsed/2.6)*(1-smooth((elapsed-14)/7));
  const climb=smooth(progress*1.43);
  drawRoc(W*(.59+.14*climb)-heading*w*.029,
    H*(.30-.14*climb),w*(.00118-.00042*climb),progress,rocAlpha*.92);
  for(let i=0;i<(reduced?8:22);i++){
    const drift=wrap(hash(i+585)+elapsed*(.08+hash(i+723)*.035),1);
    const side=i%2===0?-1:1, radius=(.45+hash(i+921)*1.65)*scale;
    const x=px+side*w*(.04+hash(i+516)*.22)*(.6+drift*.4);
    const y=py-68*scale+drift*H*.46;
    const color=flightColors[i%flightColors.length];
    const alpha=fade*Math.sin(Math.PI*drift)*(.15+hash(i+300)*.38);
    ellipse(ctx,x,y,radius,radius*(1.3+drift),rgba(color,alpha),side*.32);
    if(i%5===0)bloom(ctx,x,y,7+radius*5,color,alpha*.42);
  }
  for(let i=0;i<7;i++){
    const side=i%2===0?-1:1, lane=19+hash(i+55)*105;
    const out=smooth((elapsed-15-i*.27)/5);
    const x=px+side*(lane*scale+(1-fade+out)*W*.21)+Math.sin(t*1.1+i)*7;
    const y=py-scale*(55+hash(i+177)*132)-out*H*.17;
    drawCrane(x,y,scale*(.37+hash(i+77)*.41),fade*(1-out)*.89,t*4+i*1.1);
  }
}
