"use strict";

const $ = id => document.getElementById(id);
const canvas = $("world"), ctx = canvas.getContext("2d", {alpha:false});
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const lerp = (a,b,t) => a+(b-a)*t;
const smooth = x => (x=clamp(x,0,1),x*x*(3-2*x));
const fract = x => x-Math.floor(x);
const hash = n => fract(Math.sin(n*127.1+311.7)*43758.5453);
const textHash = s => Array.from(s).reduce((n,c)=>Math.imul(n^c.codePointAt(0),16777619)>>>0,2166136261);
const wrap = (x,n) => ((x%n)+n)%n;
const rgba = (color,a) => "rgba("+color.join(",")+","+clamp(a,0,1)+")";
const blend = (a,b,t) => a.map((v,i)=>Math.round(lerp(v,b[i],t)));
