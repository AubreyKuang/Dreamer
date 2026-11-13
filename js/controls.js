"use strict";

function pushOff(){
  play();
  if(flight)return;
  if(kick>.22)return;
  kick=1;
  velocity=Math.min(3.15,Math.max(.85,velocity)+.8);
  skateBurst("push");
}
function toggleView(){
  clean=!clean;
  saveSetting("clean", clean);
  syncView();
}
function syncView(){
  document.body.classList.toggle("clean",clean);
  $("view").setAttribute("aria-pressed",String(clean));
  $("view").setAttribute("aria-label",clean?"退出观景模式":"开启观景模式");
}
