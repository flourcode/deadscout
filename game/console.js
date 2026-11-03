/* DeadScout · the ship's computer (Nov 2026). The comms console takes typed commands and HOS answers in capitals: terse,
   literal, sometimes withholding. It never explains her; it only reports what its sensors do and don't see.
   And the crew's personal logs: short entries found at things they left behind, kept across playthroughs in this browser.
   window.SHIPCON = {LOGS, logFor(objectId), run(cmd, ctx) -> lines[]} */
(function(){
"use strict";
const LOGS=[
 {id:'p1',who:'PILOT',at:'quarters-photo',title:'PERSONAL · 1',text:"Day 412. I keep the photo where I can see it from the bunk. Commander says sentiment is mass. I told him it weighs four grams."},
 {id:'p2',who:'PILOT',at:'viewport',title:'PERSONAL · 2',text:"167 AU. The Sun is just the brightest star now. I stopped pointing it out to the others around day 300."},
 {id:'p3',who:'PILOT',at:'nav-chart',title:'NAV NOTE',text:"Holding course. Same heading for eleven weeks. The chart says we are moving. The window says we are not."},
 {id:'p4',who:'PILOT',at:'bunk',title:'PERSONAL · 3',text:"Couldn't sleep. K9 sat by the bunk all night, as if it was keeping watch for something I couldn't hear."},
 {id:'s1',who:'SYSTEMS',at:'sensor-sweep',title:'SENSOR LOG · 41',text:"Same interval again: 11.4 seconds, give or take nothing. Background doesn't keep time like that. I've logged it as instrument error. Third time."},
 {id:'s2',who:'SYSTEMS',at:'coolant-control',title:'MAINTENANCE',text:"Coolant loop B is running two degrees warm. No fault. No reason. I opened the panel and the warmth was on the inside of the glass."},
 {id:'s3',who:'SYSTEMS',at:'aux-breaker',title:'MAINTENANCE',text:"Aux breaker tripped at 0340 with nobody near it. I reset it. It tripped again when I turned my back. I am writing this down so I know I didn't imagine it."},
 {id:'s4',who:'SYSTEMS',at:'tunnel-trace',title:'SENSOR LOG · 44',text:"The signal is not out there. I triangulated it twice. The source is inside our hull, lower deck, aft of the tunnel. There is nothing aft of the tunnel."},
 {id:'c1',who:'COMMANDER',at:'mission-patch',title:'COMMAND LOG',text:"Mission patch came off my suit during EVA. Found it on the bench afterwards. I don't remember bringing it in."},
 {id:'c2',who:'COMMANDER',at:'pressure-valve',title:'COMMAND LOG',text:"Ordered the crew to stop logging the interval. Morale matters more than a number that won't change. I still hear it when the ship is quiet."},
 {id:'c3',who:'COMMANDER',at:'eva-look',title:'COMMAND LOG',text:"From the platform the hull looks smaller than it should. You could fit everything we are inside a breath. I came back in early."},
 {id:'c4',who:'COMMANDER',at:'quarters-locker',title:'LAST ENTRY',text:"If anyone reads this: we did everything right. Keep the lights on. Keep the dog charged. Whatever is listening, it is patient."}];
const logFor=id=>LOGS.find(l=>l.at===id)||null;
const pad=(s,n)=>String(s).padEnd(n,' ');
function run(raw,X){const c=raw.trim().toUpperCase().replace(/\s+/g,' ');if(!c)return [];const [w,...rest]=c.split(' '),arg=rest.join(' ');
  const found=X.found(),T=X.now();
  switch(w){
  case 'HELP':case '?':return ['AVAILABLE: STATUS  CREW  SCAN  DOORS  POWER  K9','           LOGS  LOG <N>  DATE  WHERE  CLEAR  EXIT'];
  case 'STATUS':return ['HOS 4.1 · DSV HALCYON · DSV-0417','HULL INTEGRITY ......... 97%','LIFE SUPPORT ........... NOMINAL','OCCUPANCY .............. 0','LAST CREW TRANSMISSION . UNKNOWN','SIGNAL ................. ACTIVE · SOURCE INTERNAL'];
  case 'CREW':return ['PILOT ........ STATUS UNKNOWN','SYSTEMS ...... STATUS UNKNOWN','COMMANDER .... STATUS UNKNOWN','SVC UNIT K9-4  ACTIVE','CREW ABOARD: 0'];
  case 'WHO':case 'WHOAMI':if(w==='WHO'&&arg!=='AM I')return ['SPECIFY QUERY.'];return ['NO OPERATOR REGISTERED AT THIS CONSOLE.','SUBJECT ID: NULL'];
  case 'HELLO':case 'HI':return ['HELLO.','NO CREW MEMBERS ARE ABOARD.'];
  case 'SCAN':{const r=X.scan();return r?['SIGNAL STRENGTH .. '+Math.round(r.s*100)+'%','STATE ............ '+r.state,'BEARING .......... '+(r.dir?r.dir.toUpperCase():'—'),'SOURCE ........... '+(r.state==='LOCKED'||r.state==='MEMORY'?'INTERNAL':'UNRESOLVED')]:['SCANNER NOT REGISTERED TO THIS UNIT.'];}
  case 'DOORS':return X.doors().map(([id,st])=>pad(id.toUpperCase(),20)+st.toUpperCase());
  case 'POWER':return X.power();
  case 'K9':case 'K9-4':return ['SVC UNIT K9-4 · ACTIVE','TASK ........ ESCORT','ESCORTING ... [NO RECORD]','UNIT REPORTS A COMPANION. COMPANION NOT FOUND IN MANIFEST.'];
  case 'DATE':case 'TIME':return ['LAST SYNC 2291.04','CURRENT ... 23## (CLOCK DRIFT · RESYNC FAILED)'];
  case 'WHERE':return ['167.2 AU FROM SOL · OUTER HELIOSPHERE','VELOCITY .... 0.4 KM/S · HEADING HELD','THIS CONSOLE: COMMS, UPPER DECK'];
  case 'LOGS':{if(!found.length)return ['NO PERSONAL LOGS RECOVERED.','CREW LEFT THINGS BEHIND. LOOK CLOSER.'];return ['RECOVERED: '+found.length+' / '+LOGS.length].concat(LOGS.map((l,i)=>found.includes(l.id)?pad(String(i+1).padStart(2,'0'),4)+pad(l.who,11)+l.title:pad(String(i+1).padStart(2,'0'),4)+'[NOT RECOVERED]'));}
  case 'LOG':case 'READ':{const n=parseInt(arg,10),l=LOGS[n-1];if(!l)return ['USAGE: LOG <N>   (SEE LOGS)'];if(!found.includes(l.id))return ['LOG '+String(n).padStart(2,'0')+' NOT RECOVERED.'];return [l.who+' · '+l.title,''].concat(wrap(l.text.toUpperCase(),54));}
  case 'OPEN':return ['DOOR CONTROL IS LOCAL. USE THE PANEL.'];
  case 'SHUTDOWN':case 'REBOOT':return ['REQUEST DENIED · CREW AUTHORITY REQUIRED.','NO CREW MEMBERS ARE ABOARD.'];
  case 'PLAY':case 'MUSIC':return ['THE DECK IS IN THE CREW QUARTERS.'];
  case 'SIGNAL':case 'SOURCE':return ['SOURCE: INTERNAL.','LOCATION WITHHELD.'];
  case 'WHY':return ['QUERY OUTSIDE OPERATIONAL SCOPE.'];
  case 'CLEAR':case 'CLS':return [null];
  case 'EXIT':case 'QUIT':case 'BYE':return [false];
  }
  return ['COMMAND NOT RECOGNIZED: '+w,'TYPE HELP.'];}
function wrap(s,n){const out=[];let line='';for(const w of s.split(' ')){if((line+' '+w).trim().length>n){out.push(line);line=w;}else line=(line+' '+w).trim();}if(line)out.push(line);return out;}
window.SHIPCON={LOGS,logFor,run,wrap};
})();
