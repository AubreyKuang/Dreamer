"use strict";

let current=original, previous=original, cache=null, oldCache=null, transition=1;
let W=1,H=1,dpr=1,horizon=1, start=false, t=0, timeInDream=0, previousFrame=0, whisperTimer;
let position=0, heading=0, velocity=0, distance=0, found=0, roamDistance=0, roamChapter=0;
let whisperIndex=0, pendingWhisper=false, nextWhisperAt=0, announcementUntil=0;
let drag=null, clean=false, lastPose=null, lateral=0;
let stridePhase=0, edgeLean=0, kick=0, brake=0;
const touchControls=new Map();
const keys = new Set();
const sky = document.createElement("canvas"), sk = sky.getContext("2d",{alpha:false});
const art = new Image();
