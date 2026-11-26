"use strict";

/* TapTap H5 host. TapTap injects a global `tap` object; in a normal browser it is
   absent and this file does nothing. Reverie is a single-player game with no server
   and no account: it never calls tap.login and sends nothing anywhere. Inside the
   host it only marks the page and lets the photo button skip the PNG download. */
const TapTapHost=(()=>{
  const host=()=>{
    const tap=globalThis.tap;
    return !!tap&&typeof tap==="object"&&["setStorageSync","getSystemInfoSync","onShow","login"].some(name=>typeof tap[name]==="function");
  };
  let marked=false;
  function mark(){
    if(marked||!host())return;
    marked=true;
    globalThis.document?.documentElement?.classList?.add("taptap-host");
  }
  mark();
  // The host may inject `tap` after the first scripts run.
  globalThis.addEventListener?.("load",mark);
  return {get inHost(){return host();}};
})();
