// Persistent ISOLATED world content script that captures console output from page load.
// Injects a <script> tag into the page (MAIN world) at document_start to intercept
// console methods before any page scripts run.
// Stores output in window.__pagenab_console_buffer, read by collector.ts.

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  all_frames: false,
  // ISOLATED world (default) — Chrome injects via content_scripts manifest entry,
  // reliable across HMR reloads and existing tabs.
}

// Inline console patcher — executed in MAIN world via <script> tag
const PATCHER_CODE = `(function(){
  if(window.__pagenab_console_buffer)return;
  var buffer=[];
  var MAX=200;
  function fmt(args){
    return Array.prototype.slice.call(args).map(function(x){
      if(typeof x==='string')return x;
      try{return JSON.stringify(x)}catch(e){return String(x)}
    }).join(' ');
  }
  function push(e){if(buffer.length>=MAX)buffer.shift();buffer.push(e)}
  var origError=console.error;
  var origWarn=console.warn;
  var origLog=console.log;
  var origInfo=console.info;
  console.error=function(){push({level:'error',message:fmt(arguments),timestamp:new Date().toISOString()});origError.apply(console,arguments)};
  console.warn=function(){push({level:'warning',message:fmt(arguments),timestamp:new Date().toISOString()});origWarn.apply(console,arguments)};
  console.log=function(){push({level:'log',message:fmt(arguments),timestamp:new Date().toISOString()});origLog.apply(console,arguments)};
  console.info=function(){push({level:'info',message:fmt(arguments),timestamp:new Date().toISOString()});origInfo.apply(console,arguments)};
  window.addEventListener('error',function(e){
    push({level:'error',message:e.message||String(e.error),source:e.filename,line:e.lineno,column:e.colno,stack:e.error&&e.error.stack,timestamp:new Date().toISOString()});
  });
  window.addEventListener('unhandledrejection',function(e){
    var msg=e.reason instanceof Error?e.reason.message:String(e.reason);
    var stack=e.reason instanceof Error?e.reason.stack:undefined;
    push({level:'error',message:'Unhandled rejection: '+msg,stack:stack,timestamp:new Date().toISOString()});
  });
  window.__pagenab_console_buffer=buffer;
})();`

// Inject into MAIN world at document_start via <script> tag
const script = document.createElement("script")
script.textContent = PATCHER_CODE
;(document.head || document.documentElement).appendChild(script)
script.remove()
