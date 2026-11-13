"use strict";

let audio=null, ambient=null, windFilter=null, creekGain=null, audioOn=false, audioRequest=0, scoreLayer=null;
let skateAudio=null, skateCue="glide", nextSkateUpdate=0, nextSkateBurst=0;
const skateSounds={
  edge:{duration:.36,volume:.69,pan:.53},
  push:{duration:.33,volume:.81,pan:.17},
  rush:{duration:.94,volume:.73,pan:0},
  brake:{duration:.62,volume:.78,pan:.24}
};
function renderSkateSample(kind, sampleRate, data){
  const duration=data.length/sampleRate;
  const lowRate=1-Math.exp(-TAU*330/sampleRate), midRate=1-Math.exp(-TAU*1530/sampleRate);
  const windRate=1-Math.exp(-TAU*125/sampleRate);
  let seed=617, low=0, mid=0, wind=0, phase=0;
  const pulse=(time,at,decay)=>time<at?0:Math.exp(-(time-at)/decay)*Math.min(1,(time-at)*1800);
  for(let i=0;i<data.length;i++){
    const time=i/sampleRate, progress=time/duration;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=(noise-low)*lowRate;
    mid+=(noise-mid)*midRate;
    wind+=(low-wind)*windRate;
    const grain=mid-low, frost=noise-mid;
    let sample;
    switch(kind){
      case "edge": {
        phase+=TAU*(1880-570*progress+40*Math.sin(TAU*14*time))/sampleRate;
        const scrape=.60+.40*Math.sin(TAU*41*time)**2;
        sample=(grain*.40+Math.sin(phase)*.070+Math.sin(phase*1.47)*.021)*scrape*Math.sin(Math.PI*progress)**1.4;
        break;
      }
      case "push": {
        const chips=pulse(time,.006,.025)+.58*pulse(time,.061,.022)+.36*pulse(time,.119,.021);
        const crystal=Math.sin(TAU*3140*time)*.040+Math.sin(TAU*4930*time)*.020;
        sample=(frost*.44+grain*.10+crystal)*chips;
        break;
      }
      case "rush": {
        const swell=Math.sin(Math.PI*progress)**1.7;
        sample=(wind*1.65+low*.24)*swell*(.85+.15*Math.sin(TAU*7*time));
        break;
      }
      case "brake": {
        phase+=TAU*(195-108*progress)/sampleRate;
        const chatter=.38+.62*Math.sin(TAU*(19*time-10*time*time))**4;
        const grit=grain*(1-progress)*.53+low*.57+Math.sin(phase)*.067;
        sample=grit*chatter*Math.min(1,time*46)*(1-progress)**1.45;
        break;
      }
    }
    data[i]=sample*Math.min(1,(data.length-i-1)/(sampleRate*.018));
  }
}
function setupSkateAudio(){
  const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++){
    const seam=Math.min(1,i/160,(data.length-1-i)/160);
    data[i]=(Math.random()*2-1)*seam;
  }
  const samples={};
  for(const [kind,{duration}] of Object.entries(skateSounds)){
    const sample=audio.createBuffer(1,Math.round(audio.sampleRate*duration),audio.sampleRate);
    renderSkateSample(kind,audio.sampleRate,sample.getChannelData(0));
    samples[kind]=sample;
  }
  const source=audio.createBufferSource(), filter=audio.createBiquadFilter();
  const gain=audio.createGain(), bus=audio.createGain();
  const pan=audio.createStereoPanner?.();
  source.buffer=buffer;source.loop=true;
  filter.type="bandpass";filter.Q.value=.8;
  gain.gain.value=0;bus.gain.value=$("iceSound").checked?1:0;
  source.connect(filter).connect(gain);
  if(pan)gain.connect(pan).connect(bus);
  else gain.connect(bus);
  bus.connect(ambient);
  source.start();
  skateAudio={samples,filter,gain,pan,bus};
}
function skateBurst(kind){
  if(!audioOn||audio.state!=="running"||!skateAudio||!$("iceSound").checked)return;
  const now=audio.currentTime;
  if(now<nextSkateBurst&&kind!=="push")return;
  nextSkateBurst=now+.22;
  const {volume,pan}=skateSounds[kind];
  const source=audio.createBufferSource(), gain=audio.createGain();
  const direction=pan&&audio.createStereoPanner?.();
  source.buffer=skateAudio.samples[kind];
  gain.gain.value=volume;
  source.connect(gain);
  if(direction){
    direction.pan.value=edgeLean*pan;
    gain.connect(direction).connect(skateAudio.bus);
  }else gain.connect(skateAudio.bus);
  source.onended=()=>{source.disconnect();gain.disconnect();if(direction)direction.disconnect();};
  source.start(now);
}
function updateSkateSound(paused,throttle){
  if(!skateAudio||!audioOn||audio.state!=="running"||audio.currentTime<nextSkateUpdate)return;
  const now=audio.currentTime;
  nextSkateUpdate=now+.032;
  const mix=smooth(transition);
  const grove=lerp(Number(Boolean(previous.grove)),Number(Boolean(current.grove)),mix);
  if(creekGain){
    const x=lateral*.61, z=distance+100;
    const bankDistance=Math.abs(x-creekCenter(Math.round(x/creekSpacing),z));
    creekGain.gain.setTargetAtTime(paused?0:grove*(.045+.12*(1-smooth(bankDistance/170))),now,.19);
  }
  const wind=scoreLayer?.score.wind??410;
  if(flight||flightWind){
    flightWind=!paused?(flight?.height??0):0;
    windFilter.frequency.setTargetAtTime(wind+flightWind*570,now,.25);
  }
  const speed=start&&!paused&&!flight?clamp(velocity/2.4,0,1):0;
  const edge=Math.abs(edgeLean);
  const cue=speed<.06?"glide":brake>.33?"brake":throttle>.55?"rush":edge>(skateCue==="edge"?.34:.51)?"edge":"glide";
  if(cue!==skateCue && cue!=="glide")skateBurst(cue);
  skateCue=cue;
  const stroke=.84+.16*Math.sin(stridePhase*2)**2;
  const pressure=.023+speed*.038+edge*.055+brake*.034;
  skateAudio.gain.gain.setTargetAtTime(speed**.75*pressure*stroke,now,paused?.07:.11);
  skateAudio.filter.frequency.setTargetAtTime(510+speed*540+edge*470-brake*130,now,.13);
  skateAudio.pan?.pan.setTargetAtTime(edgeLean*.28,now,.14);
}
const scores = [
  {chord:[48,55,60,64], melody:[72,null,76,79,76,null,74,72], beat:1.48, wind:590, voice:"sine"},
  {chord:[45,52,57,59], melody:[69,null,71,null,64,67,null,64], beat:1.93, wind:220, voice:"sine"},
  {chord:[38,45,50,57], melody:[62,null,69,null,65,null,72,69], beat:2.32, wind:320, voice:"triangle"},
  {chord:[53,60,64,69], melody:[77,81,null,84,79,76,72,null], beat:1.31, wind:840, voice:"sine"},
  {chord:[43,50,55,62], melody:[79,null,74,83,null,86,null,81], beat:1.75, wind:430, voice:"sine"},
  {chord:[45,52,60,64], melody:[64,null,69,72,null,71,67,null,64,null], beat:1.84, wind:280, voice:"triangle"},
  {chord:[50,57,64,69], melody:[74,76,null,81,null,78,76,74,null,69], beat:1.65, wind:510, voice:"sine"},
  {chord:[53,60,67,69], melody:[72,77,null,81,79,null,77,74,null,72], beat:1.57, wind:620, voice:"sine"},
  {chord:[48,55,64,69], melody:[67,72,null,76,74,null,72,69,67,null], beat:1.79, wind:460, voice:"triangle"},
  {chord:[43,50,58,62], melody:[67,null,null,74,null,70,null,null,65,null], beat:2.24, wind:350, voice:"sine"},
  {chord:[45,52,57,64], melody:[69,null,76,null,74,72,null,67,null,69], beat:2.07, wind:400, voice:"sine"},
  {chord:[48,55,62,69], melody:[72,null,79,81,null,76,null,74], beat:2.18, wind:360, voice:"sine"},
  {chord:[50,57,65,69], melody:[null,74,null,77,null,81,null,69], beat:2.28, wind:310, voice:"sine"},
  {chord:[48,55,60,67], melody:[67,null,74,79,null,84,79,null], beat:1.81, wind:470, voice:"sine"},
  {chord:[45,52,57,64], melody:[null,64,null,null,69,null,67,null], beat:2.95, wind:275, voice:"sine"}
];
const frequencyFor = midi => 440*Math.pow(2,(midi-69)/12);
function scoreFor(scene){
  return scores[scene.lines?chapters.findIndex(chapter=>chapter.lines===scene.lines):[0,2,3,4][scene.index]];
}
function setScore(scene){
  if(!audio||!audioOn||audio.state!=="running")return;
  const score=scoreFor(scene);
  if(scoreLayer?.score===score)return;
  const now=audio.currentTime, fade=reduced?1.2:5.8;
  if(scoreLayer){
    const old=scoreLayer;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(clamp((now-old.started)/old.fade,0,1),now);
    old.gain.gain.linearRampToValueAtTime(0,now+fade);
    old.voices[0].onended=()=>old.gain.disconnect();
    for(const oscillator of old.voices) oscillator.stop(now+fade+.05);
  }
  const gain=audio.createGain();
  gain.gain.value=0;
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(1,now+fade);
  gain.connect(ambient);
  const voices=score.chord.map((midi,i)=>{
    const oscillator=audio.createOscillator(), level=audio.createGain();
    oscillator.frequency.value=frequencyFor(midi);
    oscillator.type=i===0?score.voice:"sine";
    level.gain.value=.12/(1+i*.49);
    oscillator.connect(level).connect(gain);oscillator.start(now);
    return oscillator;
  });
  windFilter.frequency.setTargetAtTime(score.wind,now,fade/3);
  scoreLayer={score,gain,voices,started:now,fade,next:now+.4,step:0};
}
function scoreTick(){
  if(!audioOn||audio.state!=="running"||!scoreLayer)return;
  const layer=scoreLayer, now=audio.currentTime;
  if(layer.next>now+.075)return;
  const time=Math.max(now+.015,layer.next);
  const step=layer.step++;
  const midi=layer.score.melody[step%layer.score.melody.length];
  if(midi!==null){
    if(layer.score===scores[harpChapter]){
      layer.pluckSide=harpSide(step);
      pluckHarp(midi,time,layer.gain,layer.pluckSide);
      layer.next=time+layer.score.beat;
      return;
    }
    const oscillator=audio.createOscillator(), envelope=audio.createGain();
    oscillator.frequency.value=frequencyFor(midi);oscillator.type="sine";
    envelope.gain.setValueAtTime(.0001,time);
    envelope.gain.exponentialRampToValueAtTime(.19,time+.13);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+2.7);
    oscillator.connect(envelope).connect(layer.gain);oscillator.start(time);oscillator.stop(time+2.75);
  }
  layer.next=time+layer.score.beat;
}
function pluckHarp(midi,time,destination,side){
  const pan=audio.createStereoPanner?.();
  if(pan){pan.pan.value=side*.73;pan.connect(destination);}
  for(const [partial,volume,decay] of [[1,.16,1.9],[2,.047,.7],[3,.022,.36]]){
    const string=audio.createOscillator(), envelope=audio.createGain();
    string.frequency.value=frequencyFor(midi)*partial;
    envelope.gain.setValueAtTime(.0001,time);
    envelope.gain.exponentialRampToValueAtTime(volume*(.79+.21*heading*side),time+.018);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+decay);
    string.connect(envelope).connect(pan??destination);
    string.onended=()=>{string.disconnect();envelope.disconnect();if(partial===1)pan?.disconnect();};
    string.start(time);string.stop(time+decay+.025);
  }
}
function note(index){
  if(!audioOn||!audio||audio.state!=="running")return;
  const osc=audio.createOscillator(), envelope=audio.createGain(), now=audio.currentTime;
  osc.type="sine";osc.frequency.value=[261.63,329.63,392,440,523.25][index];
  envelope.gain.setValueAtTime(.0001,now);envelope.gain.exponentialRampToValueAtTime(.15,now+.16);
  envelope.gain.exponentialRampToValueAtTime(.0001,now+1.9);
  osc.connect(envelope).connect(ambient);osc.start(now);osc.stop(now+2);
}
function syncSoundButton(){
  $("sound").setAttribute("aria-pressed",String(audioOn));
  $("sound").setAttribute("aria-label",audioOn?"关闭音乐和环境音":"开启音乐和环境音");
  $("soundIcon").setAttribute("d",audioOn?"M3 10v4h4l5 4V6l-5 4H3m12-2q5 4 0 8m2-11q8 7 0 14":"M3 10v4h4l5 4V6l-5 4H3m13 0 5 5m0-5-5 5");
}
async function startAudio(){
  const request=++audioRequest;
  try {
    if(!audio){
      audio=new (window.AudioContext||window.webkitAudioContext)();
      ambient=audio.createGain();ambient.gain.value=.0001;ambient.connect(audio.destination);
      const buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate), data=buffer.getChannelData(0);
      let last=0;
      for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.023)/1.023;data[i]=last*2.1;}
      for(let i=0;i<2048;i++){const n=i/2048;data[i]*=n;data[data.length-1-i]*=n;}
      const wind=audio.createBufferSource();
      windFilter=audio.createBiquadFilter();
      wind.buffer=buffer;wind.loop=true;windFilter.type="lowpass";windFilter.frequency.value=410;
      wind.connect(windFilter).connect(ambient);wind.start();
      const brook=audio.createBufferSource(), brookFilter=audio.createBiquadFilter();
      creekGain=audio.createGain();creekGain.gain.value=0;
      brook.buffer=buffer;brook.loop=true;
      brookFilter.type="bandpass";brookFilter.frequency.value=1220;brookFilter.Q.value=.53;
      brook.connect(brookFilter).connect(creekGain).connect(ambient);
      brook.start();
      setupSkateAudio();
    }
    await audio.resume();
    if(request!==audioRequest)return;
    audioOn=true;ambient.gain.setTargetAtTime(.28,audio.currentTime,.28);setScore(current);note(1);
  }catch{announce("这里暂时听不到环境音。");}
  syncSoundButton();
}
async function toggleSound(){
  audioPrimed=true;
  if(audioOn){
    ++audioRequest;
    audioOn=false;
    saveSetting("sound", false);
    ambient.gain.setTargetAtTime(.0001,audio.currentTime,.18);
    syncSoundButton();
  }else{
    await startAudio();
    if(audioOn)saveSetting("sound", true);
  }
}
// The first click or keypress starts the ambience (autoplay rules forbid
// starting it before any gesture); the speaker button itself is exempt so
// its own toggle is not undone.
let audioPrimed=false;
function primeAudio(event){
  if(audioPrimed||audioOn||settings.sound===false)return;
  if(event.target&&typeof event.target.closest==="function"&&event.target.closest("#sound"))return;
  audioPrimed=true;
  startAudio();
}
