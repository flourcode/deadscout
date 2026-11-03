/* DeadScout Studio · the ship. One persistent world, two ways in:
     DIRECTOR — beats (per chapter, on a 10:00 clock) or an absolute-time event list drive the actors, rooms and cameras;
     PLAY     — a visitor clicks where DeadScout should go and what she should use.
   Both become the same actor commands (moveTo, interact, climb, pose) on the same timeline, so a performed take and a
   scripted take behave identically. The ship has a PAST (lit, crewed) and a PRESENT (dark, aged, empty); memory echoes
   flash a room back into its past for a few seconds. Cameras: the full cutaway, a follow camera, or a room.
   Drawn at 960 x 540; the follow camera is a 480 x 270 window (x4 at 1080p).

   window.CUT = {render, compile, parse, format, eventAt, report, view, pick, play, command, neighbor, wakeAt, ...} */
(function(){
"use strict";
const A=window.DS_ASSETS||{sheets:{},images:{}},PX=window.PX;
/* the world: the canonical master cutaway with its map (world/deadscout-ship.json) */
function worldSC(Wd){const m=Wd.map;return Object.assign({},m,{layers:['world/frame','world/front','world/grime'],world:1,hoist_x:null,sprite_scale:m.sprite_scale||1,crt_scale:m.crt_scale||1,speed:m.speed||((m.sprite_scale||1)*1.3)});}
if(!(A.world&&A.world.map))throw new Error('DeadScout: the world map did not load (assets-core.js)');const SC=worldSC(A.world);
if(!SC||!PX){window.CUT=null;return;}
const SS=SC.sprite_scale||1,CS=SC.crt_scale||1,SPD=SC.speed||1;
const IMG=PX.IMG,ready=PX.isReady,hash=PX.hash,vn=PX.vn,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sm=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const W=SC.w,H=SC.h,NODES=SC.nodes,SPOTS=SC.spots,OBJ=SC.objects||{};
const ACTORS=['pilot','systems','commander','scout','k9','k9m','deadscout'],CREW=['pilot','systems','commander','scout','k9m','k9']; /* k9: HALCYON's service quadruped (present); k9m: the clean 2291 one, only in a memory */ /* scout: her living self in a memory. Canon (visual lock): DeadScout IS the pilot of 2291, so she wears the pilot's sheet, and a memory never shows two of her */
const NAMES={pilot:'PILOT',systems:'SYSTEMS TECH',commander:'COMMANDER',scout:'PILOT',k9:'K9-4',k9m:'K9-4',deadscout:'DEADSCOUT'};
const SHEET={pilot:'pilot',systems:'systems',commander:'commander',scout:'pilot',k9:'k9',k9m:'k9',deadscout:'commander'},FALLBACK={}; /* r23: she wears the commander's sheet, the one the night watch uses; the chibi production sheet is gone */
/* she is never drawn in the commander's body: an action her sheet lacks borrows her nearest own frame */
const ALIAS={run:'walk',turn:'look-around','climb-mount':'climb',operate:'interact',typing:'interact','terminal-idle':'interact',point:'reach',wave:'reach',hurt:'recoil',down:'crouch',jump:'idle','lie-down':'crouch',rest:'crouch','get-up':'crouch',wake:'idle',puzzled:'look-around',observe:'idle',kneel:'crouch',stand:'idle',breathe:'idle',comms:'interact'}; /* what a sheet lacks is played by its nearest pose (applied only when the sheet has no animation of that name) */
const WALK=22*SPD,SNEAK=13*SPD,CLIMB=11*SPD,HOIST=24*SPD,BOARD=2.2;
/* gait personality (§locomotion): she is deliberate, the pilot a touch quick, the commander heavy, K9 short-stepped with a trot to catch up */
const SPEEDF={deadscout:1,scout:1,pilot:1.08,systems:1,commander:.9,k9:.88,k9m:.88};const vWalk=(a,sneak,fast)=>(sneak?SNEAK:WALK)*(SPEEDF[a]||1)*(fast?1.4:1);
const ROOM_ALIAS={quarters:'crew-quarters',shaft:'central-shaft',atrium:'central-shaft',tunnel:'service','service-tunnel':'service',crawlspace:'service',passage:'lower-access','mid-passage':'lower-access',upper:'upper-access',junction:'upper-access','upper-junction':'upper-access',utility:'comms','sensor-loft':'sensor','eva-platform':'eva',reactor:'engineering'};
const ROOM_NAMES=Object.fromEntries(Object.entries(SC.rooms).map(([k,v])=>[k,v.name]).concat([['eva','EVA PLATFORM']]));
/* ---------- the route network ---------- */
const ADJ={},EDGE={};const link=(a,b,k)=>{(ADJ[a]=ADJ[a]||[]).push({to:b,k});(ADJ[b]=ADJ[b]||[]).push({to:a,k});EDGE[a+'|'+b]=EDGE[b+'|'+a]=k;};
SC.walk.forEach(([a,b])=>link(a,b,'walk'));SC.ladders.forEach(([a,b])=>link(a,b,'ladder'));SC.hoist.forEach(([a,b])=>link(a,b,'hoist'));
const NX=n=>NODES[n][0],NY=n=>NODES[n][1],dist=(a,b)=>Math.hypot(NX(a)-NX(b),NY(a)-NY(b));
const legTime=(k,len,sneak,a,fast)=>k==='walk'?len/vWalk(a,sneak,fast):k==='ladder'?len/CLIMB+1.2:len/HOIST+BOARD;
const HABIT={pilot:{hoist:1.6},systems:{hoist:.55,ladder:1.5},commander:{hoist:1.8,ladder:.75},scout:{hoist:3,ladder:.8},k9:{hoist:Infinity,ladder:Infinity},k9m:{hoist:Infinity,ladder:Infinity},deadscout:{hoist:3,ladder:.8}}; /* K9 never climbs a human ladder */
function dijkstra(a,from,sneak){const dst={[from]:0},prev={},Q=new Set([from]),h=HABIT[a]||{};
  while(Q.size){let u=null;for(const q of Q)if(u===null||dst[q]<dst[u])u=q;Q.delete(u);
    for(const e of ADJ[u]||[]){if(h[e.k]===Infinity)continue;const c=dst[u]+legTime(e.k,e.k==='walk'?dist(u,e.to):Math.abs(NY(u)-NY(e.to)),sneak,a)*(h[e.k]||1);if(dst[e.to]==null||c<dst[e.to]){dst[e.to]=c;prev[e.to]=u;Q.add(e.to);}}}
  return {dst,prev};}
/* a position is a node, or a point part-way along an edge: {a,b,f} */
const xyOf=p=>p.b?[NX(p.a)+(NX(p.b)-NX(p.a))*p.f,NY(p.a)+(NY(p.b)-NY(p.a))*p.f]:[NX(p.a),NY(p.a)];
const kindOf=p=>p.b?EDGE[p.a+'|'+p.b]:null;
function legsBetween(a,from,to,sneak){/* -> [{k,a,b,f0,f1}] geometric legs, each along one edge */
  const ends=p=>p.b&&p.f>0&&p.f<1?[{n:p.a,f:0,part:p.f},{n:p.b,f:1,part:1-p.f}]:[{n:p.b&&p.f>=1?p.b:p.a,f:null,part:0}];
  if(from.b&&to.b&&((from.a===to.a&&from.b===to.b)||(from.a===to.b&&from.b===to.a))){const tf=from.a===to.a?to.f:1-to.f;return [{k:kindOf(from),a:from.a,b:from.b,f0:from.f,f1:tf}];}
  let best=null;for(const s of ends(from)){const D=dijkstra(a,s.n,sneak),kf=kindOf(from);const sc=s.part*(from.b?legTime(kf,kf==='walk'?dist(from.a,from.b):Math.abs(NY(from.a)-NY(from.b)),sneak):0);
    for(const e of ends(to)){if(D.dst[e.n]==null)continue;const kt=kindOf(to),ec=e.part*(to.b?legTime(kt,kt==='walk'?dist(to.a,to.b):Math.abs(NY(to.a)-NY(to.b)),sneak):0),c=sc+D.dst[e.n]+ec;if(!best||c<best.c)best={c,s,e,D};}}
  if(!best)return [];const L=[];if(from.b&&best.s.f!=null&&from.f>0&&from.f<1)L.push({k:kindOf(from),a:from.a,b:from.b,f0:from.f,f1:best.s.f});
  const chain=[];let n=best.e.n;while(n!==best.s.n){chain.unshift(n);n=best.D.prev[n];}chain.unshift(best.s.n);
  for(let i=1;i<chain.length;i++)L.push({k:EDGE[chain[i-1]+'|'+chain[i]],a:chain[i-1],b:chain[i],f0:0,f1:1});
  if(to.b&&best.e.f!=null&&to.f>0&&to.f<1){const fromEnd=best.e.f;L.push({k:kindOf(to),a:to.a,b:to.b,f0:fromEnd,f1:to.f});}
  return L;}
/* ---------- the vocabulary ---------- */
const POSE={pilot:{'bridge.helm':'typing','bridge.nav':'press-control',_:'stand'},
  systems:{'bridge.nav':'repair','sensor.console':'typing','engineering.panel':'repair','utility.bench':'repair','engineering.pump':'kneel','tunnel':'kneel',_:'stand'},
  commander:{'eva':'observe','engineering.reactor':'inspect','tunnel':'flashlight',_:'idle'},scout:{'bridge.terminal':'terminal-idle',_:'idle'},k9:{_:'idle'},k9m:{_:'idle'},deadscout:{'eva':'observe',_:'idle'}};
const EXTRA={systems:{stand:[[8,9]]},commander:{stand:[[0,1.4],[1,1.4],[2,1.4],[3,1.4]],kneel:[[20,9]]}};
const CLIMBF={pilot:[[0,9]],systems:[[8,9]],commander:[[0,9]],deadscout:[[0,9]]};
const ACTION_ALIAS={wake:'crouch','climb':'climb-up',cautious:'cautious',kneel:'kneel','eva':'eva-float',float:'eva-float',terminal:'interact',use:'interact',open:'open-hatch'};
const HOME={pilot:['bridge.helm'],systems:['bridge.nav','sensor.console','utility.bench','engineering.panel'],commander:['bridge.command','quarters.table'],scout:['bridge.terminal'],k9:['engineering.pump'],k9m:['engineering.pump'],deadscout:[]};
const ERRANDS={pilot:['bridge.window','bridge.nav','sensor.step','junction.mid'],systems:['utility.shelf','sensor.printer','sensor.rack','engineering.console','engineering.pump','airlock.prep','quarters.locker'],
  commander:['upper.mid','quarters.locker','engineering.catwalk','airlock.prep','bridge.window','utility.bench','engineering.reactor','passage.mid'],deadscout:[],scout:[],k9:['engineering.pump','central-shaft.mid','lower-access.mid','airlock.center'],k9m:[],deadscout:[]};
const STORY_MODES={ROUTINE:{name:'ROUTINE',traffic:'normal',rooms:{},world:{}},SIGNAL:{name:'SIGNAL',traffic:'low',rooms:{sensor:'signal'},world:{}},
  INVESTIGATE:{name:'INVESTIGATE',traffic:'normal',rooms:{engineering:'load'},world:{}},EVA:{name:'EVA',traffic:'low',rooms:{},world:{}},
  INTRUSION:{name:'INTRUSION',traffic:'low',rooms:{engineering:'alert'},world:{alert_state:.4}},AFTERMATH:{name:'AFTERMATH',traffic:'off',rooms:{},world:{}},
  EXPLORE:{name:'EXPLORE',traffic:'off',rooms:{},world:{}}};
const MODE_OF={ROUTINE:'ROUTINE',SIGNAL:'SIGNAL',SEARCH:'INVESTIGATE',INVESTIGATION:'INVESTIGATE',INVESTIGATE:'INVESTIGATE',CONTACT:'EVA',EVA:'EVA',INTRUSION:'INTRUSION',ESCALATION:'INTRUSION',REALIZATION:'INTRUSION',CONSEQUENCE:'INTRUSION',AFTERMATH:'AFTERMATH',CLIFFHANGER:'INTRUSION',
  AWAKENING:'EXPLORE',DESCENT:'EXPLORE',ENGINEERING:'EXPLORE',MEMORY:'EXPLORE',REVEAL:'EXPLORE',RETURN:'EXPLORE',EXPLORE:'EXPLORE','NORMAL LIFE':'ROUTINE'};
const STATES={normal:{},dim:{light:.55},alert:{red:.1,warn:1,light:.9},blackout:{light:.12,lampsOff:1},alien:{light:.6,cyan:.12,pulse:1},
  flicker:{flicker:1},signal:{cyan:.06},corruption:{cyan:.05,glitch:1},'profile-reveal':{cyan:.06},load:{core:1.7},'load-spike':{core:2.4,flicker:1},
  cycling:{warn:1,amber:.07},'eva-active':{warn:1},'return':{warn:1,light:.9},'power-fluctuation':{light:.75,flicker:1},
  'alien-stage-1':{light:.65,cyan:.06,pulse:1},'alien-stage-2':{light:.55,cyan:.1,pulse:1},'alien-stage-3':{light:.45,cyan:.14,pulse:1},'alien-stage-4':{light:.35,cyan:.18,pulse:1},
  'present-dark':{light:.6,lampsOff:1,emergency:1,dead:1},'partial-power':{light:.72,emergency:1},'archive-active':{light:.7,cyan:.07},damaged:{light:.42,flicker:1,emergency:1,dead:1},
  'low-power':{light:.68,emergency:1},powered:{light:.95},memory:{light:1,cyan:.03},'anomaly-reactive':{light:.5,cyan:.09,pulse:1},open:{warn:1},idle:{}};
const STATE_ALIAS={dark:'blackout',warning:'alert',contaminated:'alien',wet:'dim','severe-spread':'alien-stage-4','severe-growth':'alien-stage-4',ready:'normal',corrupt:'corruption','past-normal':'normal'};
const BASE={bridge:{light:1},sensor:{light:.85,cyan:.04},'upper-access':{light:.85},'crew-quarters':{light:.8,warm:.05},'lower-access':{light:.8},comms:{light:.85},
  airlock:{light:.9},engineering:{light:.82,orange:.05},service:{light:.6},'central-shaft':{light:.85},eva:{light:1,outside:1}};
/* the lights wake where she is (§lighting): a room she stands in comes up over a second or two and settles back after she leaves */
const WAKE={};let wakeT=null;const FACET={},CAMS={};let DRIFTL=0;
const WORLD={signal_strength:0,ship_power:1,anomaly_proximity:0,contamination_level:0,alert_state:0,timeline_echoes:0,deadscout_awareness:0};
const WORLD_ALIAS={contamination:'contamination_level',echoes:'timeline_echoes',awareness:'deadscout_awareness',power:'ship_power',signal:'signal_strength'};
const SCREEN_MODES=['idle-grid','waveform','signal','signal-bars','noise','text-terminal','profile','profile-active','warning','off','offline','boot','manifest','maintenance','camera','archive','personnel','personnel-deceased','clock','corrupted','registry','hos','deck'];let TAPE='ORBITAL CRUISE';
const EVENTS=['signal-flash','signal-hit','power-drop','contact-pulse','intrusion','hard-sync'];
const ANOM=['dormant','drift','side','closed','pulse','active','respond','opening','open'];
const MYST={'locker-open':'a locker in the crew quarters is open','helmet-gone':'the helmet on the quarters table is gone','tool-moved':'a tool on the utility bench has moved',
  'hatch-blink':'the maintenance hatch light blinks','crt-dark':'one sensor CRT goes dark','chair-turn':'the empty command chair turns','lift-ghost':'the cargo hoist travels with no one on it'};
const ECHO_PRESETS=['crew-routine','crossing','self','scout'];
const DOORS=Object.keys(SC.doors);
/* ---------- time and places ---------- */
const secs=v=>{if(typeof v==='number')return v;const m=String(v||'').trim().match(/^(\d+):(\d{1,2})(?:\.(\d))?$/);return m?(+m[1])*60+(+m[2])+(m[3]?+m[3]/10:0):+v||0;};
const mmss=s=>{s=Math.max(0,Math.round(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
const roomId=r=>{r=String(r||'').toLowerCase();return SPOTS[r]||SC.rooms[r]?r:(ROOM_ALIAS[r]||r);};
function place(ref){ref=String(ref||'');if(ref[0]==='@'){const [a,b,f]=ref.slice(1).split('|');if(!NODES[a]||!NODES[b]||!EDGE[a+'|'+b])return null;const p={a,b,f:clamp(+f,0,1)},[x0,y0]=xyOf(p);return {pos:p,ref,x:x0,y:y0,face:null,room:null};}
  let [r,s]=ref.toLowerCase().split('.');r=roomId(r);const R=SPOTS[r];if(!R)return null;const k=s&&R[s]?s:Object.keys(R)[0],S=R[k];return {room:r,spot:k,ref:r+'.'+k,node:S[0],pos:{a:S[0],b:null,f:0},face:S[1],x:NX(S[0]),y:NY(S[0])};}
const stateId=s=>{s=String(s||'').toLowerCase();return STATE_ALIAS[s]||s;};
const worldId=k=>WORLD_ALIAS[k]||k;
/* ---------- beats: lines in, objects out ---------- */
const AN=id=>{const sid=SHEET[id]||id,S=A.sheets[sid],F=A.sheets[FALLBACK[sid]||''];return [...new Set(Object.keys((S&&S.animations)||{}).concat(Object.keys((F&&F.animations)||{})).filter(k=>!/^bust/.test(k)&&!(id==='systems'&&k==='radio')).concat(Object.keys(EXTRA[sid]||{}),Object.keys(EXTRA[FALLBACK[sid]]||{}),Object.keys(ALIAS)))];}; /* an aliased pose is a legal action too */
const ACTIONS=['wake','climb-up','climb-down','interact','open-hatch','cautious','normal-walk'];
function parseLine(line){const raw=line.trim();if(!raw||raw.startsWith('#'))return null;const m=raw.match(/^(\d+:\d{1,2}(?:\.\d)?)\s+(.*)$/);if(!m)return {err:'START WITH A TIME, LIKE 03:00'};
  const at=m[1],w=m[2].trim().split(/\s+/),lw=w.map(x=>x.toLowerCase()),dur=()=>{const i=lw.findIndex(x=>x==='for'||x==='over');return i>=0?secs(String(lw[i+1]||'').replace(/s$/,'')):null;};
  const v=lw[0],who='WHO? '+ACTORS.join(', ').toUpperCase();
  if(v==='note')return {at,note:w.slice(1).join(' ')};
  if(v==='move'||v==='teleport'||(ACTORS.includes(v)&&(lw[1]==='to'||lw[1]==='move_to'))){const a=v==='move'||v==='teleport'?lw[1]:v,ti=lw.indexOf('to')>=0?lw.indexOf('to'):lw.indexOf('move_to');if(!ACTORS.includes(a))return {err:who};const to=lw[ti+1];if(!place(to))return {err:'NO SUCH PLACE: '+(to||'')};
    const o={at,move:a,to:place(to).ref};if(v==='teleport')o.teleport=true;if(lw.includes('sneak')||lw.includes('cautious'))o.sneak=true;if(lw.includes('fast')||lw.includes('trot'))o.fast=true;const vi=lw.indexOf('via');if(vi>=0){if(!place(lw[vi+1]))return {err:'NO SUCH PLACE: '+(lw[vi+1]||'')};o.via=place(lw[vi+1]).ref;}return o;}
  if(ACTORS.includes(v)){let act=lw[1];if(!act)return {err:'WHAT DOES '+v.toUpperCase()+' DO?'};if(act==='interact'&&lw[2]&&(OBJ[lw[2]]||SC.doors[lw[2]]))return {at,actor:v,interact:lw[2]};
    if(!ACTIONS.includes(act)&&!AN(v).includes(act)&&A.sheets[SHEET[v]||v])return {err:v.toUpperCase()+' HAS NO ACTION '+act.toUpperCase()}; /* a sheet still on its way is given the benefit of the doubt */const o={at,actor:v,do:act};const d=dur();if(d)o.for=d;return o;}
  if(v==='room'){const r=roomId(lw[1]),st=stateId(lw[2]);if(!SC.rooms[r])return {err:'NO SUCH ROOM: '+(lw[1]||'')};if(!STATES[st])return {err:'NO ROOM STATE '+String(lw[2]||'').toUpperCase()};return {at,room:r,state:st};}
  if(v==='screen'||v==='object'){const id=lw[1],md=lw[2];if(OBJ[id]){if(md==='next')return {at,object:id,state:'next'};if(!SCREEN_MODES.includes(md)&&md!=='wake')return {err:'NO TERMINAL MODE '+String(md||'').toUpperCase()};return {at,object:id,state:md};}
    if(SC.doors[id]){if(!['open','closed','locked'].includes(md))return {err:'DOORS ARE OPEN, CLOSED OR LOCKED'};return {at,door:id,state:md};}
    if(!SC.screens[id])return {err:'NO SUCH SCREEN OR OBJECT: '+(id||'')};if(!SCREEN_MODES.includes(md))return {err:'NO SCREEN MODE '+String(md||'').toUpperCase()};const o={at,screen:id,mode:md};const d=dur();if(d)o.for=d;return o;}
  if(v==='door'){const id=lw[1],st=lw[2];if(!SC.doors[id])return {err:'NO SUCH DOOR: '+(id||'')};if(!['open','closed','locked'].includes(st))return {err:'DOORS ARE OPEN, CLOSED OR LOCKED'};return {at,door:id,state:st};}
  if(v==='airlock'){const c=lw[1]||'cycle';if(!['cycle','cycle-out','cycle-in'].includes(c))return {err:'AIRLOCK CYCLE, CYCLE-OUT OR CYCLE-IN'};return {at,airlock:c};}
  if(v==='world'){if(!['past','present'].includes(lw[1]))return {err:'WORLD PAST OR WORLD PRESENT'};return {at,world:lw[1]};}
  if(v==='echo'){const r=roomId(lw[1]);if(!SC.rooms[r])return {err:'NO SUCH ROOM: '+(lw[1]||'')};const pr=lw[2]&&!['for','over'].includes(lw[2])?lw[2]:'crew-routine';if(!ECHO_PRESETS.includes(pr))return {err:'ECHOES: '+ECHO_PRESETS.join(', ').toUpperCase()};return {at,echo:r,preset:pr,for:dur()||3};}
  if(v==='camera'){const md=lw[1],pace=lw.includes('cut')?'cut':lw.includes('scan')||lw.includes('xray')?'scan':lw.includes('quick')||lw.includes('fast')?'quick':null,P_=o=>{if(pace)o.pace=pace;return o;};if(md==='cutaway')return P_({at,camera:'cutaway'});if(md==='exterior'||md==='outside')return P_({at,camera:'exterior'});if(md==='follow'){const a=lw[2]||'deadscout';if(!ACTORS.includes(a))return {err:who};return P_({at,camera:'follow',actor:a});}
    if(md==='rect'){const r=lw.slice(2,6).map(Number);if(r.length<4||r.some(v=>!isFinite(v)))return {err:'CAMERA RECT X0 Y0 X1 Y1'};return P_({at,camera:'rect',rect:r});}
    if(md==='room'||SC.rooms[roomId(md)]){const r=roomId(md==='room'?lw[2]:md);if(!SC.rooms[r]&&r!=='eva')return {err:'NO SUCH ROOM: '+(lw[2]||'')};return P_({at,camera:'room',room:r});}return {err:'CAMERA CUTAWAY, EXTERIOR, FOLLOW DEADSCOUT, OR ROOM BRIDGE'};}
  if(v==='set'){const k=worldId(lw[1]),raw=String(lw[2]||''),val=+raw;if(!(k in WORLD))return {err:'NO WORLD VALUE '+String(lw[1]||'').toUpperCase()};if(!isFinite(val))return {err:'SET NEEDS A NUMBER'};const o={at,set:{[k]:val}};if(raw[0]==='+')o.inc=true;const d=dur();if(d)o.over=d;return o;}
  if(v==='event'){if(!EVENTS.includes(lw[1]))return {err:'EVENTS: '+EVENTS.join(', ').toUpperCase()};return {at,event:lw[1]};}
  if(v==='mystery'){if(!MYST[lw[1]])return {err:'MYSTERIES: '+Object.keys(MYST).join(', ').toUpperCase()};return {at,mystery:lw[1]};}
  if(v==='hide'||v==='show'){if(!ACTORS.includes(lw[1]))return {err:who};return {at,[v]:lw[1]};}
  if(v==='tether'){const o={at,tether:lw[1]==='off'?'off':'on'};const d=dur();if(d)o.over=d;return o;}
  if(v==='anomaly'){if(!ANOM.includes(lw[1]))return {err:'ANOMALY: '+ANOM.join(', ').toUpperCase()};return {at,anomaly:lw[1]};}
  return {err:'UNKNOWN BEAT: '+w[0].toUpperCase()};}
function parse(text){const beats=[],errs=[];String(text||'').split('\n').forEach((l,i)=>{const o=parseLine(l);if(!o)return;if(o.err)errs.push({line:i+1,text:l.trim(),err:o.err});else beats.push(o);});beats.sort((a,b)=>secs(a.at)-secs(b.at));return {beats,errs};}
function formatBeat(b){const T=typeof b.at==='number'?mmss(b.at):b.at,f=x=>x?' for '+x+'s':'',o=x=>x?' over '+x+'s':'';
  if(b.note!=null)return T+' note '+b.note;
  if(b.type==='signal-flash'||(b.type&&EVENTS.includes(b.type)))return T+' event '+b.type;
  if(b.type==='memory-echo')return T+' echo '+(b.room||'bridge')+' '+(b.preset||'crew-routine')+f(b.duration||b.for||3);
  if(b.world)return T+' world '+b.world;
  if(b.camera){const pc=b.pace?' '+b.pace:'';if(b.camera==='cutaway')return T+' camera cutaway'+pc;if(b.camera==='exterior')return T+' camera exterior';if(b.camera==='follow')return T+' camera follow '+(b.actor||'deadscout');if(b.camera==='rect'&&b.rect)return T+' camera rect '+b.rect.join(' ');return T+' camera room '+(b.room||b.camera);}
  if(b.object)return T+' object '+b.object+' '+(b.state||'next');
  if(b.move_to&&b.actor)return T+' move '+b.actor+' to '+b.move_to+(b.via?' via '+b.via:'')+(b.sneak?' sneak':'');
  if(b.move)return T+(b.teleport?' teleport ':' move ')+b.move+' to '+b.to+(b.via?' via '+b.via:'')+(b.sneak?' sneak':'')+(b.fast?' fast':'');
  if(b.actor&&b.interact)return T+' '+b.actor+' interact '+b.interact;
  if(b.actor&&(b.do||b.action))return T+' '+b.actor+' '+(b.do||b.action)+f(b.for||b.duration);
  if(b.echo)return T+' echo '+b.echo+' '+(b.preset||'crew-routine')+f(b.for||3);
  if(b.room)return T+' room '+b.room+' '+b.state;
  if(b.screen)return T+' screen '+b.screen+' '+b.mode+f(b.for);if(b.door)return T+' door '+b.door+' '+b.state;if(b.airlock)return T+' airlock '+b.airlock;
  if(b.set){const k=Object.keys(b.set)[0],v=b.set[k],inc=b.inc||(v&&typeof v==='object'&&v.inc!=null);return T+' set '+k+' '+(inc?'+':'')+(v&&typeof v==='object'?v.inc:v)+o(b.over);}
  if(b.event)return T+' event '+b.event;if(b.mystery)return T+' mystery '+b.mystery;if(b.hide)return T+' hide '+b.hide;if(b.show)return T+' show '+b.show;if(b.tether)return T+' tether '+b.tether+o(b.over);if(b.anomaly)return T+' anomaly '+b.anomaly;return '';}
const format=beats=>(beats||[]).map(formatBeat).filter(Boolean).join('\n');
/* ---------- PLAY: the live command list ---------- */
const PLAY={on:false,from:0,cmds:[],cams:[],notes:[]};
function command(c){PLAY.cmds.push(c);}
/* ---------- compiling the episode ---------- */
let CACHE={key:'',C:null};
function compile(P,times){const key=P.rev!=null?'r'+P.rev+'/'+(PLAY.rev||0)+'/'+PLAY.on+'/'+PLAY.from+'/'+times.length:JSON.stringify([P.cutaway,P.script,P.chapters.map(c=>[c.beats,c.storyMode,c.traffic,c.title,c.role,c.nominal]),times,PLAY.on,PLAY.from,PLAY.cmds,PLAY.cams]);if(CACHE.key===key)return CACHE.C;
  const CW=P.cutaway||{},start=CW.start||{},C={act:{},rooms:{},screens:{},doors:{},world:{},events:[],vis:{},tether:[],anom:[],chapters:[],myst:[],ghost:[],echoes:[],era:[{at:-1,era:CW.era||'past'}],cams:[{at:-1,mode:'cutaway'}],obj:{},uses:[]};
  for(const r in SC.rooms)C.rooms[r]=[{at:-1,state:stateId((CW.rooms&&CW.rooms[r])||'normal')}];C.rooms.eva=[{at:-1,state:'normal'}];
  for(const k in WORLD)C.world[k]=[{at:-1,v:CW.world&&CW.world[k]!=null?+CW.world[k]:WORLD[k],over:0}];
  for(const d of DOORS)C.doors[d]=[{at:-1,state:(CW.doors&&CW.doors[d])||(d==='airlock-outer'||d==='maint-hatch'?'closed':'open')}];
  for(const a of ACTORS)C.vis[a]=[{at:-1,on:a!=='deadscout'&&a!=='scout'&&a!=='k9m'}];
  const cmds={},acts={};ACTORS.forEach(a=>{cmds[a]=[];acts[a]=[];});
  const objSet=(id,state,t)=>{const O=OBJ[id];if(!O)return;if(state==='wake')state='boot';(C.screens[O.screen]=C.screens[O.screen]||[]).push({at:t,mode:state,cam:O.camera});};
  const add=(b,t,live)=>{
      if(b.move_to&&b.actor)b={move:b.actor,to:(place(b.move_to)||{}).ref,via:b.via,sneak:b.sneak};
      if(b.action&&b.actor&&!b.do)b=Object.assign({},b,{do:b.action});
      if(PLAY.on&&!live&&t>=PLAY.from&&(b.move==='deadscout'||(b.actor==='deadscout'&&!b.interact&&b.do!=='wake')||b.actor==='deadscout'&&b.interact||b.camera))return; /* in PLAY the visitor steers her (and the camera) */
      if(b.move&&cmds[b.move]&&b.to)cmds[b.move].push({at:t,kind:'move',to:b.to,via:b.via,sneak:!!b.sneak,fast:!!b.fast,coast:!!b.coast,interrupt:!!b.interrupt,teleport:!!b.teleport});
      else if(b.actor&&b.interact&&cmds[b.actor])cmds[b.actor].push({at:t,kind:'interact',obj:b.interact,interrupt:!!b.interrupt});
      else if(b.actor&&b.do&&acts[b.actor]){const d=b.do;
        if(d==='wake'){const n=+b.for||6;C.vis[b.actor].push({at:t,on:true});acts[b.actor].push({at:t,act:'sit',until:t+n*.6});acts[b.actor].push({at:t+n*.6,act:'crouch',until:t+n});}
        else if(d==='climb-up'||d==='climb-down'||d==='interact'||d==='open-hatch'||d==='cautious'||d==='normal-walk')cmds[b.actor].push({at:t,kind:d,interrupt:!!b.interrupt});
        else acts[b.actor].push({at:t,act:d==='recoil'?'recoil':d,until:b.for?t+ +b.for:(d==='recoil'?t+1.4:d==='inspect'?t+5:null),face:b.face});}
      else if(b.camera){if(t<=0&&C.cams.length===1)C.cams[0]={at:-1,mode:b.camera,actor:b.actor,room:b.room,rect:b.rect};C.cams.push({at:t,mode:b.camera,actor:b.actor,room:b.room,rect:b.rect,pace:b.pace});} /* a camera at 0:00 is where the transmission opens, not a move */
      else if(b.room&&C.rooms[roomId(b.room)]){const r=roomId(b.room),st=stateId(b.state);C.rooms[r].push({at:t,state:st});const m=st.match(/^alien-stage-(\d)/);if(m)C.world.contamination_level.push({at:t,v:+m[1],over:40});}
      else if(b.object&&b.count!=null)C.obj[b.object]=+b.count;
      else if(b.object)objSet(b.object,b.state,t);
      else if(b.screen)(C.screens[b.screen]=C.screens[b.screen]||[]).push({at:t,mode:b.mode,until:b.for?t+ +b.for:null});
      else if(b.door&&C.doors[b.door])C.doors[b.door].push({at:t,state:b.state});
      else if(b.airlock){let c=b.airlock;if(c==='cycle'){let st='closed';for(const e of C.doors['airlock-outer'])if(e.at<=t)st=e.state;c=st==='open'?'cycle-in':'cycle-out';}
        if(c==='cycle-out'){C.doors['airlock-inner'].push({at:t,state:'closed'});C.rooms.airlock.push({at:t,state:'cycling'});C.doors['airlock-outer'].push({at:t+12,state:'open'});C.rooms.airlock.push({at:t+12,state:'eva-active'});}
        else{C.doors['airlock-outer'].push({at:t,state:'closed'});C.rooms.airlock.push({at:t,state:'cycling'});C.doors['airlock-inner'].push({at:t+12,state:'open'});C.rooms.airlock.push({at:t+12,state:'return'});}}
      else if(b.world)C.era.push({at:t,era:b.world});
      else if(b.echo)C.echoes.push({at:t,room:roomId(b.echo),preset:b.preset||'crew-routine',dur:+b.for||3});
      else if(b.set)for(const [w,v] of Object.entries(b.set)){const k=worldId(w),inc=b.inc||(v&&typeof v==='object'&&v.inc!=null);if(C.world[k])C.world[k].push(inc?{at:t,inc:+(v&&typeof v==='object'?v.inc:v),over:+b.over||0}:{at:t,v:+v,over:+b.over||0});}
      else if(b.event)C.events.push({at:t,type:b.event});
      else if(b.mystery){C.myst.push({at:t,k:b.mystery});if(b.mystery==='lift-ghost')C.ghost.push(t);}
      else if(b.hide||b.show)C.vis[b.hide||b.show].push({at:t,on:!!b.show});
      else if(b.tether)C.tether.push({at:t,on:b.tether==='on',over:+b.over||6});
      else if(b.anomaly)C.anom.push({at:t,state:b.anomaly});};
  P.chapters.forEach((ch,k)=>{const T=times[k];if(!T)return;const len=T.end-T.start,nom=+ch.nominal||600,f=len/nom,mode=STORY_MODES[ch.storyMode]||STORY_MODES[MODE_OF[String(ch.role||ch.title||'').toUpperCase()]]||STORY_MODES.ROUTINE;
    C.chapters.push({start:T.start,end:T.end,mode,traffic:ch.traffic||mode.traffic,nom,f});
    for(const [r,st] of Object.entries(mode.rooms))C.rooms[r].push({at:T.start,state:st,soft:1});for(const [w,v] of Object.entries(mode.world))C.world[w].push({at:T.start,v,over:20,soft:1});
    for(const b of ch.beats||[])add(b,T.start+clamp(secs(b.at),0,nom*1.5)*f);});
  for(const b of P.script||[]){const s=secs(b.at);let acc=0,ch=C.chapters[C.chapters.length-1],off=0;for(const c of C.chapters){if(s<acc+c.nom){ch=c;off=s-acc;break;}acc+=c.nom;off=s-acc+c.nom;}if(ch)add(b,ch.start+off*ch.f);}
  if(PLAY.on){for(const c of PLAY.cmds)add(c,c.at,true);for(const c of PLAY.cams)C.cams.push(c);}
  const byAt=(a,b)=>a.at-b.at;for(const o of [C.rooms,C.world,C.doors,C.screens,C.vis])for(const k in o)o[k].sort(byAt);[C.events,C.tether,C.anom,C.myst,C.echoes,C.era,C.cams].forEach(L=>L.sort(byAt));C.ghost.sort((a,b)=>a-b);
  for(const k in C.world){let cur=C.world[k][0].v;for(const e of C.world[k]){if(e.inc!=null)e.v=cur+e.inc;cur=e.v;}}
  for(const r in C.rooms){const L=C.rooms[r],out=[];let cur=L[0].state;for(const e of L){if(e.soft&&cur!=='normal'&&e.at>0)continue;out.push(e);cur=e.state;}C.rooms[r]=out;}
  const total=times.length?times[times.length-1].end:3600,chapAt=t=>C.chapters.find(c=>t>=c.start&&t<c.end)||C.chapters[C.chapters.length-1];
  const travel=(a,p,q,sn)=>legsBetween(a,p,q,sn).reduce((s,L)=>s+legTime(L.k,L.k==='walk'?dist(L.a,L.b)*Math.abs(L.f1-L.f0):Math.abs(NY(L.a)-NY(L.b))*Math.abs(L.f1-L.f0),sn,a),0);
  const doorAt=(d,t)=>{let st='open',ta=-1e9;for(const e of C.doors[d])if(e.at<=t&&e.at>=ta){ta=e.at;st=e.state;}return st;}; /* latest in time, not last in the list: auto-opens are pushed after the sorted script */
  const busy=[];
  /* the crew first (their doors open for them); DeadScout last: doors don't sense her, she opens them by hand */
  for(const a of ACTORS){const p0=place(start[a])||place(HOME[a][0])||place('quarters.bunk'),L=cmds[a].sort(byAt),all=[];let here=p0,free=0,ci=0,n=0;
    const hidden=t=>{let h=false;for(const e of C.vis[a])if(e.at<=t)h=!e.on;return h;};
    for(;;){const next=ci<L.length?L[ci]:null,limit=next?next.at:total-30,ch=chapAt(free),tr=ch?ch.traffic:'normal',gap=tr==='normal'?150:tr==='low'?280:1e9;
      if(HOME[a].includes(here.ref)&&!hidden(free)&&tr!=='off'){const go=free+gap*(.55+.7*hash(n,a.length*17+3)),dest=place(ERRANDS[a][Math.floor(hash(n,a.length*31+5)*ERRANDS[a].length)]),stay=20+40*hash(n,a.length*7+11);
        const d1=dest?travel(a,here.pos,dest.pos):0,end=go+d1*2+stay;
        if(dest&&end+20<limit&&!hidden(go)&&chapAt(go)&&chapAt(go).traffic!=='off'&&!busy.some(b=>go<b[1]+20&&end>b[0]-20)){busy.push([go,end]);all.push({at:go,kind:'move',to:dest.ref});all.push({at:go+d1+stay,kind:'move',to:here.ref});free=end;n++;continue;}
        if(dest&&end+20<limit){free=go;n++;continue;}}
      if(!next)break;all.push(next);if(next.kind==='move'){const pv=here;here=place(next.to)||here;free=Math.max(free,next.at)+travel(a,pv.pos,here.pos,next.sneak);}else free=Math.max(free,next.at)+3;ci++;n++;}
    /* segments: walk / ladder / hoist / hold, each knowing the edge it is on so a new command can cut in anywhere */
    const S=[],oev=[],CUTS=[];let pos=p0.pos,face=p0.face,ref=p0.ref,tc=0,cautious=false;S.push({k:'hold',t0:-1e9,t1:0,pos,face,ref});
    const posAt=(s,t)=>{if(s.k==='hold')return s.pos;const u=clamp((t-s.t0)/(s.t1-s.t0),0,1);return {a:s.ea,b:s.eb,f:s.f0+(s.f1-s.f0)*u};};
    const cut=t=>{/* a new command at t: stop where she is (finish a hoist ride), drop what was planned after */
      let i=S.length-1;while(i>0&&S[i].t0>t)i--;const s=S[i];if(s.k!=='walk')S.length=i+1; /* a walk is cut on its eased run, which needs the plan it was part of */
      if(s.k==='walk'){let i0=i;while(i0>0&&S[i0-1].k==='walk'&&Math.abs(S[i0].t0-S[i0-1].t1)<1e-6)i0--;const {run:R}=mkRun(S,i0,CUTS),E=evalRun(R,t),q=E.lg.s,f=q.f0+(q.f1-q.f0)*E.fr;
        S.length=E.lg.i+1;q.t1=t;q.f1=f;CUTS.push({t,v:E.v,d:R.d0+E.d,dir:R.dir});pos=f>=1?{a:q.eb,b:null,f:0}:f<=0?{a:q.ea,b:null,f:0}:{a:q.ea,b:q.eb,f};}
      else if(s.k==='hoist'){t=s.t1;pos={a:s.eb,b:null,f:0};}else if(s.k==='hold'){s.t1=t;pos=s.pos;}else{const p=posAt(s,t);s.t1=t;s.f1=p.f;pos=p.f>=1?{a:s.eb,b:null,f:0}:p.f<=0?{a:s.ea,b:null,f:0}:p;}
      for(let j=oev.length-1;j>=0;j--)if(oev[j].at>=t){const e=oev[j];const L=e.list,idx=L.indexOf(e.ev);if(idx>=0)L.splice(idx,1);oev.splice(j,1);}
      ref=null;return t;};
    const hold=(t,d,extra)=>{S.push(Object.assign({k:'hold',t0:t,t1:t+d,pos,face:'right',ref:null},extra||{}));return t+d;};
    let goShort=false; /* set when a walk ends early at a locked door: the caller leaves her there, not at the target */
    const go=(t,target,sneak,viaPos,fast,coast)=>{const legs=viaPos?legsBetween(a,pos,viaPos,sneak).concat(legsBetween(a,viaPos,target.pos,sneak)):legsBetween(a,pos,target.pos,sneak);const V=vWalk(a,sneak,fast);
      for(const L of legs){const [x0,y0]=xyOf({a:L.a,b:L.b,f:L.f0}),[x1,y1]=xyOf({a:L.a,b:L.b,f:L.f1}),len=L.k==='walk'?Math.hypot(x1-x0,y1-y0):Math.abs(y1-y0);if(len<.01)continue;
        if(L.k==='walk'){/* doors on the way, in walking order: DeadScout opens closed ones herself; a locked one stops her with a hand on it (r22: a click-to-move walked straight through) */
          let f0=L.f0;if(a==='deadscout'){const dir=x1>x0?1:-1,lo=Math.min(x0,x1),hi=Math.max(x0,x1);
            const onWay=Object.entries(SC.doors).filter(([id,D])=>!D.floor&&!D.wall&&Math.abs(D.y-(y0+y1)/2)<=8*SS&&D.x>lo+1&&D.x<hi-1).sort((p,q)=>(p[1].x-q[1].x)*dir);
            for(const [id,D] of onWay){const fd=L.f0+(L.f1-L.f0)*((D.x-12*SS*dir)-x0)/(x1-x0),[xa,ya]=xyOf({a:L.a,b:L.b,f:f0}),[xb,yb]=xyOf({a:L.a,b:L.b,f:fd}),d=Math.hypot(xb-xa,yb-ya)/V,st=doorAt(id,t+d);if(st==='open')continue;
              if(d>0){S.push({k:'walk',t0:t,t1:t+d,ea:L.a,eb:L.b,f0,f1:fd,sneak,fast});t+=d;}pos={a:L.a,b:L.b,f:fd};
              if(st==='locked'){t=hold(t,1.2,{act:'reach',face:dir>0?'right':'left'});C.uses.push({id,at:t,locked:true});goShort=true;return t;}
              t=hold(t,1.6,{act:'open-hatch',face:dir>0?'right':'left'});const ev={at:t-.8,state:'open'};C.doors[id].push(ev);oev.push({at:ev.at,ev,list:C.doors[id]});f0=fd;}}
          const [xa,ya]=xyOf({a:L.a,b:L.b,f:f0}),d=Math.hypot(x1-xa,y1-ya)/V*(coast?2:1);if(d>0)S.push({k:'walk',t0:t,t1:t+d,ea:L.a,eb:L.b,f0,f1:L.f1,sneak,fast,coast});t+=d;}
        else if(L.k==='ladder'){t=hold(t,.5,{pause:1});const d=len/CLIMB;S.push({k:'ladder',t0:t,t1:t+d,ea:L.a,eb:L.b,f0:L.f0,f1:L.f1});t+=d;pos={a:L.a,b:L.b,f:L.f1};t=hold(t,.5,{pause:1});}
        else{t=hold(t,BOARD,{lift:1,call:1});const d=len/HOIST;S.push({k:'hoist',t0:t,t1:t+d,ea:L.a,eb:L.b,f0:L.f0,f1:L.f1});t+=d;}
        pos=L.f1>=1?{a:L.b,b:null,f:0}:L.f1<=0?{a:L.a,b:null,f:0}:{a:L.a,b:L.b,f:L.f1};}
      return t;};
    const nearObj=(maxD)=>{maxD*=SS;const [px0,py0]=xyOf(pos);let best=null;for(const [id,O] of Object.entries(OBJ)){const sp=place(O.spot);if(!sp)continue;const d=Math.hypot(sp.x-px0,(sp.y-py0)*2);if(d<maxD&&(!best||d<best.d))best={id,d,type:'terminal'};}
      for(const [id,D] of Object.entries(SC.doors)){if(D.floor||D.wall)continue;const d=Math.hypot(D.x-px0,(D.y-py0)*2);if(d<maxD&&(!best||d<best.d))best={id,d,type:'door'};}return best;};
    for(const c of all.sort(byAt)){let t=Math.max(c.at,tc);if(c.interrupt&&c.at<tc)t=cut(c.at);S[S.length-1].t1=t;
      if(c.kind==='cautious'){cautious=true;continue;}if(c.kind==='normal-walk'){cautious=false;continue;}
      if(c.kind==='move'&&c.teleport){const to=place(c.to);if(to){pos=to.pos;face=to.face||face;ref=to.ref;}}
      else if(c.kind==='move'){const to=place(c.to);if(!to)continue;if(a!=='deadscout'&&!c.via&&to.spot&&!to.pos.b){const nb=(ADJ[to.pos.a]||[]).filter(e=>e.k==='walk');if(nb.length){const e=nb[Math.floor(hash(Math.round(c.at*7),a.length*5)*nb.length)],len=dist(to.pos.a,e.to);if(len>30*SS)to.pos={a:to.pos.a,b:e.to,f:(3+7*hash(Math.round(c.at*3),a.length*9))*SS/len};}} /* arrival radius: a few px along a floor edge, seeded by the beat */
        t=go(t,to,c.sneak||cautious,c.via&&place(c.via)?place(c.via).pos:null,c.fast,c.coast);
        if(goShort){goShort=false;face=S[S.length-1].face||face;ref=null;} /* stopped at a locked door: pos is already there */
        else{pos=to.pos;face=to.face||(S.length&&S[S.length-1].k==='walk'?(S[S.length-1].f1>S[S.length-1].f0?'right':'left'):face);ref=to.ref;
        if(!to.face&&S.length&&S[S.length-1].k==='walk'){const s=S[S.length-1],[xa]=xyOf({a:s.ea,b:s.eb,f:s.f0}),[xb]=xyOf({a:s.ea,b:s.eb,f:s.f1});face=xb<xa?'left':'right';}}}
      else if(c.kind==='climb-up'||c.kind==='climb-down'){const [px0,py0]=xyOf(pos);let best=null;for(const e of SC.ladders.concat(SC.hoist)){for(const [top,bot] of [[e[0],e[1]],[e[1],e[0]]]){if(!(NY(top)<NY(bot)))continue;const from=c.kind==='climb-down'?top:bot,to=c.kind==='climb-down'?bot:top;const d=Math.hypot(NX(from)-px0,(NY(from)-py0)*3);if(!best||d<best.d)best={d,from,to};}}
        if(best){t=go(t,{pos:{a:best.from,b:null,f:0}},cautious);if(goShort){goShort=false;ref=null;}else{pos={a:best.from,b:null,f:0};t=go(t,{pos:{a:best.to,b:null,f:0}},cautious);pos={a:best.to,b:null,f:0};face='right';ref=null;}}}
      else if(c.kind==='interact'||c.kind==='open-hatch'){const id=c.obj||(nearObj(c.kind==='open-hatch'?60:90)||{}).id;
        if(id&&OBJ[id]&&!OBJ[id].screen){const O=OBJ[id],sp=place(O.spot);if(sp){t=go(t,sp,cautious);if(goShort){goShort=false;ref=null;S.push({k:'hold',t0:t,t1:1e9,pos,face,ref});tc=t;continue;}pos=sp.pos;face=sp.face;ref=sp.ref;}t=hold(t,.18,{act:'idle',face,ref});t=hold(t,O.hold||1.8,{act:O.act||'operate',face,ref});t=hold(t,.22,{act:'idle',face,ref}); /* settle, operate, recover */C.obj[id]=(C.obj[id]||0)+1;C.uses.push({id,at:t});} /* a switch, a locker, a lever: the game reads the count */
        else if(id&&OBJ[id]){const sp=place(OBJ[id].spot);if(sp){t=go(t,sp,cautious);if(goShort){goShort=false;ref=null;S.push({k:'hold',t0:t,t1:1e9,pos,face,ref});tc=t;continue;}pos=sp.pos;face=sp.face;ref=sp.ref;}t=hold(t,.18,{act:'idle',face,ref});t=hold(t,2.6,{act:'interact',face,ref});C.uses.push({id,at:t});
          const O=OBJ[id];C.obj[id]=C.obj[id]||0;let i=C.obj[id];const md=O.seq[i%O.seq.length];const list=(C.screens[O.screen]=C.screens[O.screen]||[]);
          const push=(at,mode)=>{const ev={at,mode,cam:O.camera};list.push(ev);oev.push({at,ev,list});};
          if(md==='boot'){push(t-1.8,'boot');push(t+2.6,O.seq[(i+1)%O.seq.length]);i+=2;}else{push(t-1.2,md);i+=1;}C.obj[id]=i;}
        else if(id&&SC.doors[id]){const D=SC.doors[id],[px0]=xyOf(pos),dir=D.x>px0?1:-1;const near=Object.entries(SPOTS).flatMap(([r,o])=>Object.keys(o).map(k=>place(r+'.'+k))).filter(p=>Math.abs(p.y-D.y)<8*SS).sort((p,q)=>Math.abs(p.x-(D.x-14*SS*dir))-Math.abs(q.x-(D.x-14*SS*dir)))[0];
          if(near&&Math.abs(near.x-px0)>16*SS){t=go(t,near,cautious);if(goShort){goShort=false;ref=null;S.push({k:'hold',t0:t,t1:1e9,pos,face,ref});tc=t;continue;}pos=near.pos;}const was=doorAt(id,t);if(was==='locked'){t=hold(t,1.2,{act:'reach',face:dir>0?'right':'left'});C.uses.push({id,at:t,locked:true});} /* a locked door only gets a hand on it */
          else{t=hold(t,1.6,{act:'open-hatch',face:dir>0?'right':'left'});const ev={at:t-.8,state:was==='open'?'closed':'open'};C.doors[id].push(ev);oev.push({at:ev.at,ev,list:C.doors[id]});C.uses.push({id,at:t});}}
        else t=hold(t,1.6,{act:'look-around',face});}
      S.push({k:'hold',t0:t,t1:1e9,pos,face,ref});tc=t;}
    for(const k in C.screens)C.screens[k].sort(byAt);for(const d in C.doors)C.doors[d].sort(byAt);
    for(let i=0;i<S.length;){if(S[i].k!=='walk'){i++;continue;}const {run,j}=mkRun(S,i,CUTS);for(const l of run.legs)l.s.run=run;i=j;}
    C.act[a]={segs:S,acts:acts[a].sort(byAt)};}
  C.hoist=[];for(const a of ACTORS)for(const s of C.act[a].segs)if(s.k==='hoist')C.hoist.push({t0:s.t0,t1:s.t1,y0:xyOf({a:s.ea,b:s.eb,f:s.f0})[1],y1:xyOf({a:s.ea,b:s.eb,f:s.f1})[1]});
  const levels=null;if(levels)C.ghost.forEach((t,i)=>{const y0=levels[i%3],y1=levels[(i+2)%3];C.hoist.push({t0:t,t1:t+Math.abs(y1-y0)/HOIST*1.4,y0,y1});});
  C.hoist.sort((p,q)=>p.t0-q.t0);
  CACHE={key,C};return C;}
/* ---------- state at a moment ---------- */
const lastOf=(L,t)=>{let o=L[0];for(const e of L){if(e.at<=t)o=e;else break;}return o;};
function worldAt(C,k,t){const L=C.world[k];let v=L[0].v,prev=v;for(const e of L){if(e.at>t)break;const u=e.over>0?clamp((t-e.at)/e.over,0,1):1;v=prev+(e.v-prev)*u;prev=u>=1?e.v:v;}return v;}
const eraAt=(C,t)=>lastOf(C.era,t).era;
const roomState=(C,r,t)=>{const s=lastOf(C.rooms[r]||[{state:'normal'}],t).state;return s==='normal'&&eraAt(C,t)==='present'?'present-dark':s;};
function doorOpen(C,d,t){const L=C.doors[d];let o=L[0].state==='open'?1:0,prev=o;for(const e of L){if(e.at>t)break;const tgt=e.state==='open'?1:0,u=clamp((t-e.at)/(SC.doors[d].big?3:1.2),0,1);o=prev+(tgt-prev)*sm(u);prev=u>=1?tgt:o;}return o;}
function actorAt(C,a,t){const S=C.act[a].segs;let s=S[0];for(const q of S){if(q.t0<=t)s=q;else break;}
  if(s.k==='hold'){const [X,Y]=xyOf(s.pos);return {x:X,y:Y,face:s.face,ref:s.ref,since:s.t0,lift:s.lift,pause:s.pause,act:s.act};}
  const u=clamp((t-s.t0)/(s.t1-s.t0),0,1),f=s.f0+(s.f1-s.f0)*(s.k==='hoist'?sm(u):u),[X,Y]=xyOf({a:s.ea,b:s.eb,f});
  if(s.k==='walk'){const [xa]=xyOf({a:s.ea,b:s.eb,f:s.f0}),[xb]=xyOf({a:s.ea,b:s.eb,f:s.f1});const R=s.run;if(!R)return {x:X,y:Y,walk:1,left:xb<xa,sneak:s.sneak};
    const E=evalRun(R,t),q=E.lg.s,[PX_,PY_]=xyOf({a:q.ea,b:q.eb,f:q.f0+(q.f1-q.f0)*E.fr}),[qa]=xyOf({a:q.ea,b:q.eb,f:q.f0}),[qb]=xyOf({a:q.ea,b:q.eb,f:q.f1}),d=E.d,v=E.v,tau=E.tau;
    return {x:PX_,y:PY_,walk:1,left:qb<qa,sneak:q.sneak,fast:q.fast,dist:R.d0+d,v,vc:R.vc,ending:R.D-tau<R.td,starting:tau<R.ta,coast:!!R.legs[0].s.coast};}
  if(s.k==='ladder'){const [,ya]=xyOf({a:s.ea,b:s.eb,f:s.f0}),[,yb]=xyOf({a:s.ea,b:s.eb,f:s.f1});return {x:X,y:Math.round(Y/(3*SS))*(3*SS),climb:1,down:yb>ya};}return {x:X,y:Y,lift:1};}
function actFace(C,a,st,t){let f=null;for(const e of C.act[a].acts){if(e.at>t)break;if(st.since!=null&&e.at<st.since-1)continue;if(e.until==null||t<e.until)f=e.face||null;}return f;}
function poseAt(C,a,st,t){if(st.act)return st.act;let act=null;for(const e of C.act[a].acts){if(e.at>t)break;if(st.since!=null&&e.at<st.since-1)continue;if(e.until==null||t<e.until)act=e.act;}
  if(act)return act;const P=POSE[a],ref=st.ref||'';let base=P[ref]||P[ref.split('.')[0]]||P._;
  const n=Math.floor((t+a.length*13)/23),u=(t+a.length*13)/23-n,h=hash(n,a.length*91);
  if(base==='typing'&&h<.35&&u>.55&&u<.75)base=a==='systems'?(h<.15?'look-up':'pause'):'idle';
  if(base==='stand'&&a==='pilot'&&h<.3&&u>.4&&u<.6)base=h<.15?'look-left':'look-right';
  if((base==='idle'||base==='stand')&&a!=='pilot'&&a!=='deadscout'&&a!=='scout'&&h<.36&&u>.45&&u<.58)base=h<.12?'look-around':h<.24?'observe':'breathe'; /* the crew live a little while they stand */
  if(a==='deadscout'&&base==='idle'&&h<.25&&u>.3&&u<.5)base='look-around';
  return base;}
const visible=(C,a,t)=>lastOf(C.vis[a],t).on;
const mystOn=(C,k,t)=>C.myst.some(e=>e.k===k&&e.at<=t);
function screenAt(C,id,t){let m=null,cam=null,at=null;for(const e of C.screens[id]||[]){if(e.at>t)break;if(e.until==null||t<e.until){m=e.mode;cam=e.cam;at=e.at;}else if(e.until!=null&&t>=e.until&&m===e.mode)m=null;}return {m,cam,at};}
function screenMode(C,id,t,W_){const s=screenAt(C,id,t);if(s.m)return s;if(id===SC.mysteries.crt&&mystOn(C,'crt-dark',t))return {m:'off'};const r=id.split('.')[0],st=roomState(C,r,t),sig=W_.signal_strength,F=STATES[st]||{};
  if(F.dead)return {m:'offline'};if(st==='blackout')return {m:'off'};if(st==='alert')return {m:/status|load|panel/.test(id)?'warning':(hash(id.length,3)<.5?'warning':'text-terminal')};
  if(st==='corruption')return {m:'noise'};if(st==='profile-reveal'&&id==='sensor.main')return {m:'profile'};
  if(r==='sensor'){if(id==='sensor.main')return {m:sig>.55?'signal':sig>.12?'waveform':'idle-grid'};if(id==='sensor.wave')return {m:sig>.3?'signal-bars':'waveform'};if(id==='sensor.archive')return {m:'text-terminal'};return {m:hash(id.length,9)<.5?'idle-grid':'signal-bars'};}
  if(id==='engineering.load')return {m:st==='load'||st==='load-spike'?'signal-bars':'idle-grid'};if(/status/.test(id))return {m:'text-terminal'};if(id==='bridge.nav')return {m:sig>.4?'waveform':'idle-grid'};if(id==='bridge.security')return {m:'idle-grid'};
  return {m:['idle-grid','text-terminal','signal-bars'][Math.floor(hash(id.length*7,id.charCodeAt(0))*3)]};}
const XR={},TOY={drive:1,dv:1,light:0,beacon:0,alert:0,room:{},door:{}},RLV={},RLT={},DOV={};let TIGHT=false,evNow=null,FORCE=null,EXTF=null,LIT=false,FOCUS=null;const FOCUS_SCREENS=['sensor.small','bridge.left']; /* the wide sensor glass has room for the digits; the bridge one shows the level */ /* the Night Watch focus timer, on the bridge */
/* ---------- the production lock: 384x216 internal frame, 2:1 world sampling in play, nearest both ways, one palette ---------- */
const IR={w:640,h:360}; /* the visual lock: 640 × 360 logical, 3× to 1080p; one master pixel = one logical pixel = one sprite pixel */let LOWRES=true,PALON=true;
const PALETTE=["#e9d7c2", "#c6ab92", "#3c3a40", "#c15c15", "#292a31", "#0b0e11", "#4d2613", "#8d4012", "#b6916a", "#2895a8", "#2e3134", "#14181c", "#3a2014", "#7b3f1c", "#907763", "#446d75", "#e39754", "#4e423c", "#224a5b", "#7ee3e5", "#e47a1e", "#147192", "#1fb4ce", "#eeb072", "#c37b43", "#649da1", "#99623b", "#ffb04a", "#d0442e", "#f6efe4", "#6b6a6e", "#9a9897"]; /* the visual lock (docs/palette-lock.json): 32 colours, all from the reference sheet */
const PRGB=PALETTE.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
const LUT=new Uint8Array(32768).fill(255);
function nearestPal(r,g,b){let bi=0,bd=1e9;for(let i=0;i<PRGB.length;i++){const p=PRGB[i],d=(p[0]-r)*(p[0]-r)+(p[1]-g)*(p[1]-g)*1.2+(p[2]-b)*(p[2]-b);if(d<bd){bd=d;bi=i;}}return bi;}
function quantize(d){for(let i=0;i<d.length;i+=4){const k=((d[i]>>3)<<10)|((d[i+1]>>3)<<5)|(d[i+2]>>3);let j=LUT[k];if(j===255){j=nearestPal(d[i],d[i+1],d[i+2]);LUT[k]=j;}const p=PRGB[j];d[i]=p[0];d[i+1]=p[1];d[i+2]=p[2];}}
const ic=document.createElement('canvas');ic.width=IR.w;ic.height=IR.h;const ix=ic.getContext('2d',{willReadFrequently:true});/* EXTF: the game or the studio holding the exterior up (0..1) regardless of the script */const eventAt=()=>evNow&&evNow.type!=='signal-flash'?evNow:evNow?{type:'hard-sync',local:evNow.local}:null;
/* ---------- cameras ---------- */
const smoothXY=(C,a,t)=>{let sx=0,sy=0,n=0;for(const d of [0,.35,.7,1.05,1.4]){const p=actorAt(C,a,t-d);sx+=p.x;sy+=p.y;n++;}return [sx/n,sy/n];};
/* ---------- locomotion runs: consecutive walk legs are one movement. A run may inherit a speed (v0) and a gait phase
   (d0) from the run it interrupted; a coast is all deceleration. Position along the run is eased; time stays the Director's. */
function mkRun(S,i0,CUTS){let j=i0;const legs=[];let L=0;while(j<S.length&&S[j].k==='walk'&&(j===i0||Math.abs(S[j].t0-S[j-1].t1)<1e-6&&!S[j].coast===!S[i0].coast&&!(CUTS&&CUTS.some(c=>Math.abs(c.t-S[j].t0)<1e-6)))){ /* a run ends where another command took over */const q=S[j],[x0,y0]=xyOf({a:q.ea,b:q.eb,f:q.f0}),[x1,y1]=xyOf({a:q.ea,b:q.eb,f:q.f1}),len=Math.hypot(x1-x0,y1-y0);legs.push({s:q,len,cum:L,i:j});L+=len;j++;}
  const T0=S[i0].t0,T1=S[j-1].t1,D=Math.max(1e-3,T1-T0),q0=S[i0],[ax]=xyOf({a:q0.ea,b:q0.eb,f:q0.f0}),[bx]=xyOf({a:q0.ea,b:q0.eb,f:q0.f1}),dir=Math.sign(bx-ax);
  let v0=0,d0=0;if(CUTS)for(const c of CUTS)if(Math.abs(c.t-T0)<1e-6&&c.dir===dir&&dir!==0){v0=c.v;d0=c.d;}
  const coast=!!q0.coast,vbar=L/D,ta=coast?0:Math.min(.16*(1-Math.min(1,v0/Math.max(vbar,1e-3))),D*.3),td=coast?D:Math.min(.14,D*.3),vc=Math.max(0,(L-v0*ta/2)/Math.max(1e-3,D-ta/2-td/2));
  return {run:{T0,T1,D,L,ta,td,vc,v0,d0,dir,legs},j};}
function evalRun(R,t){const tau=clamp(t-R.T0,0,R.D);let d,v;if(tau<R.ta){d=R.v0*tau+(R.vc-R.v0)*tau*tau/(2*R.ta);v=R.v0+(R.vc-R.v0)*tau/R.ta;}else if(tau<R.D-R.td){d=(R.v0+R.vc)*R.ta/2+R.vc*(tau-R.ta);v=R.vc;}else{d=R.L-R.vc*(R.D-tau)*(R.D-tau)/(2*R.td);v=R.vc*(R.D-tau)/R.td;}
  d=clamp(d,0,R.L);let lg=R.legs[0];for(const l of R.legs){if(l.cum<=d)lg=l;else break;}const fr=lg.len>0?clamp((d-lg.cum)/lg.len,0,1):0;return {d,v,lg,fr,tau};}
const SCAN_T=1.3;let SKY=null;function skyMask(){if(SKY)return SKY.f;if(!LX||!ready(LX))return null;try{const k=8,w=Math.ceil(W/k),h=Math.ceil(H/k),c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(LX,0,0,w,h);const d=g.getImageData(0,0,w,h).data,m=new Uint8Array(w*h);for(let i=0;i<w*h;i++){const r=d[i*4],gg=d[i*4+1],b=d[i*4+2];m[i]=(r+gg+b<120&&b>=r)?1:0;}
  const er=new Uint8Array(w*h);for(let y=1;y<h-1;y++)for(let x_=1;x_<w-1;x_++){let ok=1;for(let dy=-1;dy<=1&&ok;dy++)for(let dx=-1;dx<=1;dx++)if(!m[(y+dy)*w+x_+dx]){ok=0;break;}er[y*w+x_]=ok;}SKY={f:(X,Y)=>er[Math.floor(Y/k)*w+Math.floor(X/k)]===1};}catch(e){SKY={f:null};}return SKY.f;}
const NAVL=(SC.navlights||[]).map(n=>[n[0],n[1],n[2]==='green'?'90,255,140':'255,60,40']);function extRect(t){return [0,0,W,H];} /* the title shows the whole ship, nose to EVA deck; the life is in the engines, the stars and the lights, not a drifting crop */
function scanAt(C,t){const L=C.cams;let i=0;for(let k=0;k<L.length;k++)if(L[k].at<=t)i=k;const e=L[i],p=L[i-1];if(!p||e.pace!=='scan'||p.mode!=='exterior'||e.mode!=='cutaway')return null;const u=(t-e.at)/SCAN_T;return u>=0&&u<1?u:null;}
function rectFor(C,cam,t){if(cam&&cam.mode==='exterior')return extRect(t);if(!cam||cam.mode==='cutaway')return [0,0,W,H];if(cam.mode==='rect'&&cam.rect){const r=cam.rect;let w=Math.max(r[2]-r[0],(r[3]-r[1])*16/9),h=w*9/16;w=Math.min(w,W);h=Math.min(h,H);const cx=(r[0]+r[2])/2,cy=(r[1]+r[3])/2;return [clamp(cx-w/2,0,W-w),clamp(cy-h/2,0,H-h),w,h];}
  if(cam.mode==='follow'){/* a dead zone: she walks around the middle of the frame and the ship stays put; past the edge of the zone the camera eases after her */
    const a=cam.actor||'deadscout',p=actorAt(C,a,t),w=IR.w*2,h=IR.h*2,ty=p.y-36*SS;let K=CAMS[a];if(!K||Math.abs(t-K.t)>1.5)K=CAMS[a]={x:p.x,y:ty,t};
    const dt=clamp(t-K.t,0,.25);K.t=t;const dzx=w*(TIGHT?.015:.18),dzy=h*(TIGHT?.04:.1);let wx=K.x;if(p.x>K.x+dzx)wx=p.x-dzx;else if(p.x<K.x-dzx)wx=p.x+dzx;K.x+=(wx-K.x)*(1-Math.exp(-dt/.22));let wy=K.y;if(ty>K.y+dzy)wy=ty-dzy;else if(ty<K.y-dzy)wy=ty+dzy;K.y+=(wy-K.y)*(1-Math.exp(-dt/.28));
    return [TIGHT?K.x-w/2:clamp(K.x-w/2,0,W-w),clamp(K.y-h/2,0,H-h),w,h];} /* TIGHT (broadcast shorts): she stays dead centre, even if the frame runs past the ship's art */ /* the follow window is exactly two world pixels per internal pixel */
  const r=cam.room==='eva'?(SC.cameras&&SC.cameras.eva)||[2060,900,2502,1250]:(SC.cameras&&SC.cameras[roomId(cam.room)])||(()=>{const q=(SC.rooms[cam.room]||{}).poly||[[0,0],[W,H]];const xs=q.map(p=>p[0]),ys=q.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];})();
  let w=Math.max(r[2]-r[0]+24,(r[3]-r[1]+24)*16/9,IR.w*2),h=w*9/16;w=Math.min(w,W);h=Math.min(h,H);const cx=(r[0]+r[2])/2,cy=(r[1]+r[3])/2;return [clamp(cx-w/2,0,W-w),clamp(cy-h/2,0,H-h),w,h];} /* a room view is the follow window unless the room is bigger */
function view(P,times,t){const C=compile(P,times),L=C.cams;let i=0;for(let k=0;k<L.length;k++)if(L[k].at<=t)i=k;const e=L[i],p=L[i-1]||e,dur=e.pace==='cut'?.001:e.pace==='scan'?.9:e.pace==='quick'?1.1:e.mode==='follow'||p.mode==='follow'?2.8:4.2,u=sm((t-e.at)/dur);
  const A_=rectFor(C,p,t),B_=rectFor(C,e,t);return A_.map((v,j)=>v+(B_[j]-v)*u);}
/* ---------- PLAY helpers: what's under a click, the next step in a direction ---------- */
function pick(P,times,t,wx,wy){const C=compile(P,times);
  for(const [id,O] of Object.entries(OBJ)){const r=SC.screens[O.screen];if(r&&wx>=r[0]-6&&wx<=r[2]+6&&wy>=r[1]-6&&wy<=r[3]+30)return {type:'object',id};}
  for(const [id,D] of Object.entries(SC.doors)){if(D.floor||D.wall)continue;if(Math.abs(wx-D.x)<9*SS&&wy<=D.y+2&&wy>=D.y-D.h)return {type:'door',id};}
  let best=null;
  for(const [a,b] of SC.ladders){const x0=NX(a),ya=Math.min(NY(a),NY(b)),yb=Math.max(NY(a),NY(b));if(Math.abs(wx-x0)<9*SS&&wy>ya-40*SS&&wy<yb){const f=clamp((wy+30*SS-NY(a))/(NY(b)-NY(a)),0,1);return {type:'place',ref:'@'+a+'|'+b+'|'+f.toFixed(3)};}}
  for(const [a,b] of SC.walk){const xa=NX(a),xb=NX(b);if(wx<Math.min(xa,xb)-2||wx>Math.max(xa,xb)+2)continue;const f=xb===xa?0:clamp((wx-xa)/(xb-xa),0,1),fy=NY(a)+(NY(b)-NY(a))*f,dy=fy-wy;if(dy<-8*SS||dy>96*SS)continue;if(!best||dy<best.dy)best={dy,ref:'@'+a+'|'+b+'|'+f.toFixed(3)};}
  return best?{type:'place',ref:best.ref}:null;}
function neighbor(P,times,t,dir,a){const C=compile(P,times),s=actorAt(C,a||'deadscout',t);let best=null;
  for(const [n,[x0,y0]] of Object.entries(NODES)){const dx=x0-s.x,dy=y0-s.y;if(dir==='left'||dir==='right'){if(Math.abs(dy)>14*SS||(dir==='left'?dx>-6*SS:dx<6*SS))continue;const k=Math.abs(dx);if(!best||k<best.k)best={k,n};}
    else{const L=SC.ladders.concat(SC.hoist).find(([p,q])=>(Math.abs(NX(p)-s.x)<40*SS&&Math.abs(NY(p)-s.y)<8*SS&&q===n)||(Math.abs(NX(q)-s.x)<40*SS&&Math.abs(NY(q)-s.y)<8*SS&&p===n));if(!L)continue;if(dir==='up'?dy>=0:dy<=0)continue;best={k:0,n};}}
  if(!best)return null;const sp=Object.entries(SPOTS).flatMap(([r,o])=>Object.entries(o).map(([k,v])=>[r+'.'+k,v[0]])).find(q=>q[1]===best.n);return sp?sp[0]:'@'+best.n+'|'+((ADJ[best.n]||[])[0]||{}).to+'|0';}
function hereRef(P,times,t,a){const C=compile(P,times),S=C.act[a||'deadscout'].segs;let s=S[0];for(const q of S){if(q.t0<=t)s=q;else break;}let p;
  if(s.k==='hold')p=s.pos;else if(s.k==='hoist')p={a:s.eb,b:null,f:0};else{const u=clamp((t-s.t0)/(s.t1-s.t0),0,1);p={a:s.ea,b:s.eb,f:s.f0+(s.f1-s.f0)*u};}
  if(!p.b){const nb=(ADJ[p.a]||[])[0];return '@'+p.a+'|'+(nb?nb.to:p.a)+'|0';}return '@'+p.a+'|'+p.b+'|'+p.f.toFixed(4);}
function farTarget(P,times,t,dir,a){const C=compile(P,times),s=actorAt(C,a||'deadscout',t);
  if(dir==='up'||dir==='down'){for(const [a,b] of SC.ladders.concat(SC.hoist)){const top=NY(a)<NY(b)?a:b,bot=top===a?b:a;if(Math.abs(NX(a)-s.x)>40*SS||s.y<NY(top)-4*SS||s.y>NY(bot)+12*SS)continue;const end=dir==='up'?top:bot;if(Math.abs(NY(end)-s.y)<3)continue;return '@'+end+'|'+(end===a?b:a)+'|0';}return null;}
  let cur=null,bd=1e9;for(const [n,[x0,y0]] of Object.entries(NODES)){const d=Math.hypot(x0-s.x,(y0-s.y)*3);if(d<bd){bd=d;cur=n;}}if(!cur)return null;
  const sg=dir==='left'?-1:1,seen=new Set([cur]);let n=cur;for(let k=0;k<40;k++){let nx=null,bx=0;for(const e of ADJ[n]||[]){if(e.k!=='walk'||seen.has(e.to))continue;const dx=(NX(e.to)-NX(n))*sg;if(dx>bx){bx=dx;nx=e.to;}}if(!nx)break;seen.add(nx);n=nx;}
  if(n===cur&&(NX(cur)-s.x)*sg<=SS)return null;return '@'+n+'|'+((ADJ[n]||[])[0]||{}).to+'|0';}
/* for a game's HUD: what she could use from here, and everything a save needs to put the ship back */
function nearby(P,times,t,a,skip){const C=compile(P,times),s=actorAt(C,a||'deadscout',t);let best=null;skip=skip||[];
  for(const [id,O] of Object.entries(OBJ)){if(skip.includes(id))continue;if(O.once&&C.obj[id]>0)continue;const sp=place(O.spot);if(!sp)continue;const d=Math.hypot(sp.x-s.x,(sp.y-s.y)*2);if(d<(O.screen?48:40)*SS&&(!best||d<best.d))best={id,d,type:O.screen?'terminal':'switch',name:O.name||id.replace(/-?terminal(-\d+)?/,'').replace(/-/g,' ').toUpperCase()+' TERMINAL'};}
  for(const [id,D] of Object.entries(SC.doors)){if(D.floor||D.wall)continue;const d=Math.hypot(D.x-s.x,(D.y-s.y)*2);if(d<40*SS&&(!best||d<best.d)&&doorOpen(C,id,t)<.5)best={id,d,type:'door',name:lastOf(C.doors[id],t).state==='locked'?(D.big?'HATCH':'DOOR')+' · LOCKED':'OPEN '+(D.big?'HATCH':'DOOR')};}
  if(!best)for(const [a_,b_] of SC.ladders){const top=NY(a_)<NY(b_)?a_:b_,bot=top===a_?b_:a_;if(Math.abs(NX(a_)-s.x)>26*SS)continue;if(Math.abs(s.y-NY(bot))<6*SS)best={id:a_+'|'+b_,d:0,type:'ladder',key:'↑',name:'CLIMB'};else if(Math.abs(s.y-NY(top))<6*SS)best={id:a_+'|'+b_,d:0,type:'ladder',key:'↓',name:'CLIMB DOWN'};else if(s.y<NY(bot)&&s.y>NY(top))best={id:a_+'|'+b_,d:0,type:'ladder',key:'↑↓',name:'LADDER'};}
  return best;}
function snapshot(P,times,t,a){const C=compile(P,times),o={t,ref:hereRef(P,times,t,a),doors:{},obj:Object.assign({},C.obj),era:eraAt(C,t),rooms:{},world:{}};for(const d of DOORS)o.doors[d]=lastOf(C.doors[d],t).state;for(const r of Object.keys(SC.rooms))o.rooms[r]=lastOf(C.rooms[r]||[{state:'normal'}],t).state; /* the commanded state, not the derived one (r22: 'present-dark' came back as a hard state and silenced later soft ones) */for(const k in WORLD)o.world[k]=worldAt(C,k,t);return o;}
const roomAt=(P,times,t,a)=>{const C=compile(P,times),s=actorAt(C,a||'deadscout',t);return roomOf(s.x,s.y-20);};
function travelTime(a,fromRef,toRef,sneak){const f=place(fromRef),g=place(toRef);if(!f||!g)return 0;return legsBetween(a,f.pos,g.pos,sneak).reduce((s,L)=>s+legTime(L.k,(L.k==='walk'?dist(L.a,L.b):Math.abs(NY(L.a)-NY(L.b)))*Math.abs(L.f1-L.f0),sneak,a),0);}
function wakeAt(P,times){const C=compile(P,times);const e=C.vis.deadscout.find(v=>v.on&&v.at>=0);return e?e.at:(C.chapters[1]?C.chapters[1].start:0);}
/* ---------- drawing ---------- */
const cv=document.createElement('canvas');cv.width=W;cv.height=H;let x=cv.getContext('2d');x.imageSmoothingEnabled=false;const scv=document.createElement('canvas'),scx=scv.getContext('2d'),CAMCV={};
const gc=document.createElement('canvas'),gx=gc.getContext('2d');/* ghost sprite tinting */
/* the layers arrive in bundles (assets-world.js after assets-core.js), so they are looked up when drawing */
let L0,L2,LG,LX,LD,LFD;const LREV={}; /* LD/LFD: the artist's powered-down ship and its foreground (HALCYON v2); LREV: each room's light last frame */const LP=null,L1=null;function layers(){LD=IMG['world/frame-dark'];LFD=IMG['world/front-dark'];L0=IMG['world/frame'];L2=IMG['world/front'];LG=IMG['world/grime'];LX=IMG['world/exterior'];}layers();
/* how much of the outside we see: a scripted `camera exterior` dissolves over 4.2 s, the same clock as every other camera move */
function exteriorAt(C,t){if(EXTF!=null)return EXTF;const L=C.cams;let i=0;for(let k=0;k<L.length;k++)if(L[k].at<=t)i=k;const e=L[i],p=L[i-1]||e;if(e.mode!=='exterior'&&p.mode!=='exterior')return 0;if(e.pace==='scan'&&p.mode==='exterior')return t-e.at<SCAN_T?1:0;const u=sm((t-e.at)/(e.pace==='cut'?.001:e.pace==='quick'?1.1:4.2));return (p.mode==='exterior'?1:0)*(1-u)+(e.mode==='exterior'?1:0)*u;}
const PATHS={};for(const [r,o] of Object.entries(SC.rooms)){const p=new Path2D();o.poly.forEach((q,i)=>i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1]));p.closePath();PATHS[r]=p;}
const BBOX=Object.fromEntries(Object.entries(SC.rooms).map(([r,o])=>{const xs=o.poly.map(p=>p[0]),ys=o.poly.map(p=>p[1]);return [r,[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]];}));
const roomOf=(X,Y)=>{for(const [r,p] of Object.entries(PATHS))if(x.isPointInPath(p,X,Y))return r;let best=null,bd=1e9;for(const [r,[x0,y0,x1,y1]] of Object.entries(BBOX)){const d=Math.hypot(Math.max(x0-X,0,X-x1),Math.max(y0-Y,0,Y-y1)*2);if(d<bd){bd=d;best=r;}}return best;}; /* a doorway between rooms belongs to the nearer room */
function glow(cx,cy,r,col,a){if(a<=0)return;const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(.45,`rgba(${col},${a*.4})`);g.addColorStop(1,`rgba(${col},0)`);x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);}
function frameOf(id,anim,t,sd,an0){let sid=SHEET[id]||id,S=A.sheets[sid];if(FALLBACK[sid]&&(!S||(!an0&&!S.animations[anim]&&!(EXTRA[sid]&&EXTRA[sid][anim])))){sid=FALLBACK[sid];S=A.sheets[sid];}if(!S)return null;if(!an0&&!S.animations[anim]&&!(EXTRA[sid]&&EXTRA[sid][anim])&&ALIAS[anim])anim=ALIAS[anim];const an=an0||(EXTRA[sid]&&EXTRA[sid][anim])||S.animations[anim]||(anim==='operate'&&S.animations.interact)||S.animations.idle||Object.values(S.animations)[0];
  const tot=an.reduce((p,f)=>p+f[1],0);let u=((t+sd*1.37)%tot+tot)%tot,fi=an[0][0];for(const [f,d] of an){if(u<d){fi=f;break;}u-=d;}return {S,fi,im:IMG[S.path]};}
function drawSprite(id,anim,X,Y,flip,t,sd,alpha,an0,ctx){ctx=ctx||x;const F=frameOf(id,anim,t,sd,an0);if(!F||!ready(F.im))return null;const S=F.S,fw=S.frame_width,fh=S.frame_height,ax=S.anchor?S.anchor[0]:fw/2,ay=S.anchor?S.anchor[1]:fh-1;ctx.save();if(alpha!=null&&alpha<1)ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;
  if(flip){ctx.translate(Math.round(X)*2,0);ctx.scale(-1,1);}ctx.drawImage(F.im,F.fi*fw,0,fw,fh,Math.round(X-ax*SS),Math.round(Y-ay*SS),fw*SS,fh*SS);ctx.restore();return {w:fw*SS,h:fh*SS};}
function drawGhost(id,anim,X,Y,flip,t,sd,alpha){const F=frameOf(id,anim,t,sd);if(!F||!ready(F.im)||alpha<=0)return;const S=F.S,fw=S.frame_width,fh=S.frame_height,ax=S.anchor?S.anchor[0]:fw/2,ay=S.anchor?S.anchor[1]:fh-1;
  if(gc.width!==fw||gc.height!==fh){gc.width=fw;gc.height=fh;}gx.globalCompositeOperation='source-over';gx.clearRect(0,0,fw,fh);gx.drawImage(F.im,F.fi*fw,0,fw,fh,0,0,fw,fh);gx.globalCompositeOperation='source-atop';gx.fillStyle='rgba(200,240,230,.55)';gx.fillRect(0,0,fw,fh);
  const ph=Math.floor(t*9+sd)%2?1:0,jx=(hash(Math.floor(t*12),sd)<.12?2:0)+ph,brk=hash(Math.floor(t*7),sd+5)<.18;x.save();x.globalAlpha=Math.min(alpha,.6)*(brk?.75:1);x.imageSmoothingEnabled=false;
  if(brk){x.beginPath();const y0=Math.round(Y-ay*SS),hh=fh*SS;for(let yy=0;yy<hh;yy+=4*SS)x.rect(-1e5,y0+yy,2e5,2*SS);x.clip();} /* scanline breakup: every other pair of lines */
  if(flip){x.translate(Math.round(X)*2,0);x.scale(-1,1);}x.drawImage(gc,Math.round(X-ax*SS)+jx*SS,Math.round(Y-ay*SS),fw*SS,fh*SS);x.restore();}
const px=(X,Y,w,h,c)=>{x.fillStyle=c;x.fillRect(X,Y,w,h);};
const N=n=>NODES[n];
function echoCast(room,preset,C,t){/* who appears in a memory echo, by room */
  const at=(id,anim,ref,flip)=>{const p=place(ref);return p?{id,anim,x:p.x,y:p.y,flip:flip!=null?flip:p.face==='left'}:null;};
  const cross=(id,a,b)=>{const p=place(a),q=place(b);return p&&q?{id,anim:'walk',x0:p.x,x1:q.x,y:p.y}:null;};
  if(preset==='self'){const s=actorAt(C,'deadscout',t);return [{id:'commander',anim:'idle',x:s.x+(s.x>W/2?-26*SS:26*SS),y:s.y,flip:s.x>W/2}];}
  if(preset==='scout'){const R=SPOTS[room]||{},ks=Object.keys(R),k=ks[Math.floor(hash(Math.floor(t/60),room.length)*ks.length)],sp=place(room+'.'+k);return sp?[{id:'commander',anim:'idle',x:sp.x,y:sp.y,flip:sp.face==='left'}]:[];}
  if(preset==='crossing'){const ks=Object.keys(SPOTS[room]||{});if(ks.length<2)return [];const c=cross('commander',room+'.'+ks[0],room+'.'+ks[ks.length-1]);return c?[c]:[];}
  const R={bridge:[at('pilot','typing','bridge.helm'),at('systems','stand','bridge.nav'),cross('commander','bridge.command','bridge.door')],sensor:[at('systems','typing','sensor.console')],
    quarters:[at('pilot','stand','quarters.table'),at('commander','idle','quarters.locker')],engineering:[at('systems','repair','engineering.panel'),at('commander','inspect','engineering.reactor')],
    utility:[at('systems','repair','utility.bench')],airlock:[at('commander','idle','airlock.rack')],tunnel:[at('systems','kneel','tunnel.mid')],passage:[cross('pilot','passage.west','passage.east')||cross('pilot','passage.mid','passage.mid')],shaft:[at('systems','stand','shaft.mid')],
    upper:[at('commander','idle','upper.mid')]};
  const key=Object.keys(R).find(k=>roomId(k)===room)||room;return (R[key]||[]).filter(Boolean);}
function screenDraw(id,r,mode,t,W_,camSnap){r=[r[0]+2,r[1]+2,r[2]-2,r[3]-2]; /* the mapped rectangle is the glass; content keeps a one-CRT-pixel margin inside it and is always clipped to it */
  if(CS>1){const [x0,y0,x1,y1]=r,w=x1-x0+1,h=y1-y0+1,sw=Math.max(6,Math.round(w/CS)),sh=Math.max(4,Math.round(h/CS));if(scv.width<sw||scv.height<sh){scv.width=Math.max(scv.width,sw);scv.height=Math.max(scv.height,sh);} /* grows to the largest screen once; a resize per screen per frame reallocated the backing store ~20× a frame */
    const keep=x;x=scx;x.imageSmoothingEnabled=false;x.clearRect(0,0,sw,sh);screenDraw1(id,[0,0,sw-1,sh-1],mode,t,W_,camSnap);x=keep;x.save();x.beginPath();x.rect(x0,y0,w,h);x.clip();x.imageSmoothingEnabled=false;x.drawImage(scv,0,0,sw,sh,x0,y0,w,h);x.restore();return;}x.save();x.beginPath();x.rect(r[0],r[1],r[2]-r[0]+1,r[3]-r[1]+1);x.clip();screenDraw1(id,r,mode,t,W_,camSnap);x.restore();}
function screenDraw1(id,r,mode,t,W_,camSnap){const [x0,y0,x1,y1]=r,w=x1-x0+1,h=y1-y0+1,big=w>40,T=(s,X,Y,c)=>PX.text(x,s,X,Y,c);
  /* density follows the glass: a small monitor shows a trace, bars or a grid, never a page of text */
  if(w<18||h<10){if(['text-terminal','maintenance','boot','deck','signal-bars'].includes(mode))mode='signal-bars';else if(!['idle-grid','waveform','signal','noise','warning','off','offline','corrupted'].includes(mode))mode='waveform';}
  else if(w<30||h<15){if(['text-terminal','maintenance','boot','deck'].includes(mode))mode='signal-bars';else if(['registry','manifest','archive','clock'].includes(mode))mode='idle-grid';else if(mode==='hos')mode='signal';else if((mode==='camera'||mode==='personnel'||mode==='personnel-deceased')&&w<20)mode='waveform';}
  if(mode==='focus'){focusDraw(r,t);return;}
  const old=['idle-grid','waveform','signal','signal-bars','noise','text-terminal','profile','warning','off'];
  if(mode==='maintenance')mode='text-terminal';if(mode==='corrupted'){PX.crt(x,r,'noise',t,id.length*13,{energy:.6});if(Math.floor(t*3)%2)T('ERR',x0+2,y0+2,'#ff8a5c');return;}
  if(old.includes(mode)){PX.crt(x,r,mode,t,(id.length*13)|0,{energy:.4+.6*W_.signal_strength});return;}
  x.save();x.beginPath();x.rect(x0,y0,w,h);x.clip();
  if(mode==='offline'){px(x0,y0,w,h,'#0b0a10');x.fillStyle='rgba(120,130,150,.12)';for(let i=0;i<w;i++)x.fillRect(x0+i,y0+Math.round(i*.4)%h,1,1);x.restore();return;}
  px(x0,y0,w,h,'#0c2226');
  if(mode==='boot'){const lines=['DS-OS 4.1','MEM OK','LINK...','SYNC'],n=Math.floor((t*2.2)%8);for(let i=0;i<Math.min(n,lines.length);i++)if(y0+2+i*7<y1-4)T(lines[i].slice(0,Math.floor((w-4)/4)),x0+2,y0+2+i*7,'#78d8b8');px(x0+2,y1-4,Math.round((w-4)*((t*.4)%1)),2,'#d8fff0');}
  else if(mode==='manifest'){T('CREW',x0+2,y0+2,'#d8fff0');['PILOT','SYSTEMS','CMDR'].forEach((s,i)=>{if(y0+9+i*6<y1-4)T(s,x0+2,y0+9+i*6,i===0&&Math.floor(t*1.5)%2?'#ff8a5c':'#78d8b8');});}
  else if(mode==='registry'){/* the ship's card: pages on a screen wide enough, a ticker under the name on the small ones; it reads from the top when the screen wakes */
    const cols=Math.max(4,Math.floor((w-4)/4)),rows=Math.max(2,Math.floor((h-4)/7));
    if(cols>=14){const L=['DSV HALCYON','REG DSV-0417','CLASS: DEEP','SURVEY VESSEL','AO: OUTER','HELIOSPHERE','RANGE 167 AU','CREW: 03','STATUS: LOST','CREW STATUS:','PRESUMED','DECEASED','LAST CONTACT','2291','RECOVERY:','NONE','SIGNAL:','ACTIVE','SOURCE:','INTERNAL'],pages=Math.ceil(L.length/rows),pg=Math.floor(t/2.8)%pages,off=pg*rows;
      for(let i=0;i<rows&&off+i<L.length;i++){const s=L[off+i],last=off+i>=L.length-2;T(s.slice(0,cols),x0+2,y0+2+i*7,off+i<2?'#d8fff0':last&&Math.floor(t*1.5)%2?'#ff8a5c':'#78d8b8');}
      px(x0+2,y1-3,Math.round((w-4)*((t/2.8)%1)),1,'#2f8a7c');}
    else{const s='DSV-0417 / DEEP SURVEY VESSEL / OUTER HELIOSPHERE / 167 AU SOL / CREW 03 / STATUS LOST / CREW PRESUMED DECEASED / LAST CONTACT 2291 / RECOVERY NONE / SIGNAL ACTIVE / SOURCE INTERNAL / ',len=s.length*4,off=Math.floor(Math.max(0,t-1.2)*10)%len;
      T('HALCYON',x0+2,y0+2,'#d8fff0');T(s+s,x0+2-off,y0+9,'#78d8b8');if(rows>2)T('DSV-0417',x0+2,y0+16,'#78d8b8');px(x0+2,y1-3,w-4,1,'#174a4a');}}
  else if(mode==='hos'){/* HALCYON's own voice: terse, paged, and never once aware of her */
    const cols=Math.max(4,Math.floor((w-4)/4)),rows=Math.max(2,Math.floor((h-4)/7)),wr=DRIFTL>=2&&Math.floor(t*.6)%3===0,L=cols>=14?['HOS 4.1 READY',wr?'OCCUPANCY: 1':'OCCUPANCY: 0','CREW COMPL: 3',wr?'MOTION: ONE':'MOTION: NONE','SUBJECT ID:','NULL','SVC UNIT K9-4','ACTIVE','ARCHIVE:','DEGRADED','POWER: LOW']:['HOS 4.1',wr?'OCCUP 1':'OCCUP 0','CREW 3','MOTION',wr?'ONE':'NONE','SUBJECT','NULL','K9-4','ACTIVE','ARCHIVE','DEGRADED','POWER','LOW'];
    const pages=Math.ceil(L.length/rows),pg=Math.floor(t/2.6)%pages,off=pg*rows;for(let i=0;i<rows&&off+i<L.length;i++){const s=L[off+i];T(s.slice(0,cols),x0+2,y0+2+i*7,off+i===0?'#d8fff0':/NULL|NONE|^0$|OCCUP/.test(s)&&Math.floor(t*1.5)%2?'#ff8a5c':'#78d8b8');}
    if(Math.floor(t*2)%2)px(x1-4,y1-4,2,2,'#78d8b8');}
  else if(mode==='deck'){/* the crew's tape deck: what is playing, and a meter that pretends to listen */
    const cols=Math.max(4,Math.floor((w-4)/4)),s_=TAPE+' · ',len=s_.length*4,off=Math.floor(t*8)%len;T('DECK',x0+2,y0+2,'#d8fff0');if(Math.floor(t*2)%2)px(x1-4,y0+2,2,2,'#78d8b8');
    x.save();x.beginPath();x.rect(x0+2,y0+9,w-4,7);x.clip();T(s_+s_,x0+2-off,y0+9,'#78d8b8');x.restore();
    if(h>=24){const n=Math.min(cols,12);for(let i=0;i<n;i++){const v=Math.round((h-20)*(.3+.7*Math.abs(Math.sin(t*(2.1+i*.37)+i))));px(x0+2+i*3,y1-3-v,2,v,i>n*.7?'#ff8a5c':'#2f8a7c');}}}
  else if(mode==='clock'){T('LAST SYNC',x0+2,y0+2,'#78d8b8');T('2291.04',x0+2,y0+9,'#d8fff0');if(Math.floor(t*1.2)%3){T('NOW',x0+2,y0+16,'#78d8b8');T(hash(Math.floor(t*4),5)<.2?'2##8':'2338',x0+18,y0+16,'#ff8a5c');}}
  else if(mode==='personnel'||mode==='personnel-deceased'){PX.crt(x,[x0,y0,x0+Math.min(w,h)-1,y1],'profile',t,id.length,{energy:.5});T('PILOT',x0+Math.min(w,h)+1,y0+2,'#d8fff0');T('DS-01',x0+Math.min(w,h)+1,y0+9,'#78d8b8');
    if(mode==='personnel-deceased'&&Math.floor(t*1.3)%2){px(x0,y1-8,w,9,'rgba(60,8,6,.85)');T('DECEASED',x0+Math.max(1,(w-31)/2|0),y1-7,'#ff8a5c');}}
  else if(mode==='archive'){for(let i=0;i<w*h/5;i++){const q=hash(i+Math.floor(t*12)*911,7);x.fillStyle=q<.6?'#174a4a':'#2f8a7c';x.fillRect(x0+(hash(i,8+Math.floor(t*12))*w|0),y0+(hash(i,9+Math.floor(t*12))*h|0),1,1);}
    for(let k=0;k<3;k++){const X=x0+((k*w/3+t*3*(k%2?1:-1))%w+w)%w;px(Math.round(X),y1-12,3,9,'#78d8b8');px(Math.round(X)+1,y1-14,2,2,'#78d8b8');}T('ARC',x0+2,y0+2,'#d8fff0');}
  else if(mode==='camera'){const s=camSnap&&camSnap[id];if(s){x.save();x.imageSmoothingEnabled=true;x.globalAlpha=.9;x.drawImage(s,x0,y0,w,h);x.restore();x.globalCompositeOperation='multiply';px(x0,y0,w,h,'#9fe8cc');x.globalCompositeOperation='source-over';}
    x.fillStyle='rgba(0,0,0,.3)';for(let yy=y0+1;yy<=y1;yy+=2)x.fillRect(x0,yy,w,1);T('CAM 01',x0+2,y0+2,'#d8fff0');if(Math.floor(t*1.5)%2)px(x1-4,y0+2,2,2,'#d0442e');}
  x.restore();}
/* the focus timer: what's left in big digits, a bar that empties, the objective when the glass is wide enough; the moment a
   session or a break ends, the screen flashes for a few seconds */
function focusDraw(r,t){const [x0,y0,x1,y1]=r,w=x1-x0+1,h=y1-y0+1,F=FOCUS,T=(s,X,Y,c)=>PX.text(x,s,X,Y,c),brk=F.phase==='break',left=Math.max(0,F.end-t),u=clamp(left/Math.max(1,F.end-F.start),0,1),fresh=t-F.start<4&&Math.floor(t*3)%2;
  const ink=brk?'#ff8a5c':'#78d8b8',hi=brk?'#ffb04a':'#d8fff0';px(x0,y0,w,h,fresh?(brk?'#3a2014':'#174a4a'):'#0c2226');
  if(w<30||h<15){const fh=Math.round((h-4)*u),lv=brk?'#8d4012':'#2f8a7c';for(let yy=y1-2-fh;yy<=y1-2;yy+=2)px(x0+2,yy,w-4,1,lv);if(Math.floor(t)%2)px(x1-3,y1-2-fh,1,1,ink);return;} /* a small glass: only the level, in scanlines */
  const mm=Math.floor(left/60),ss=Math.floor(left%60),dg=String(mm).padStart(2,'0')+(Math.floor(t*2)%2||!brk?':':' ')+String(ss).padStart(2,'0');
  T(brk?'BREAK':'FOCUS '+(F.n||1),x0+2,y0+2,ink);T(dg,x0+2,y0+9,hi);
  if(F.label&&h>=30){const cols=Math.floor((w-4)/4),s_=F.label+' · ',len=s_.length*4;if(F.label.length<=cols)T(F.label,x0+2,y0+16,ink);else{x.save();x.beginPath();x.rect(x0+2,y0+16,w-4,7);x.clip();const off=Math.floor(t*6)%len;T(s_+s_,x0+2-off,y0+16,ink);x.restore();}}
  px(x0+2,y1-3,w-4,1,'#174a4a');px(x0+2,y1-3,Math.round((w-4)*u),1,ink);}
/* the view outside (Nov 2026): things pass in the dark, drawn only on open sky (skyMask), never over the hull.
   A comet's slow trail every few minutes, a dead satellite tumbling by, a beacon far off blinking its slow pattern, and very
   rarely the dim silhouette of another ship crossing the distance. All from the clock: the same time, the same sky. */
/* an ion beam (Nov 2026): straight out of the nozzle at its full height, no cone. Near the nozzle it is solid and white-hot;
   further out it breaks into pixels that thin away, flickering a little, like a stream of charged particles in the dark */
function ionBeam(ex,ey,eh,len,amp,t){if(amp<=.01)return;const c=2*SS,rows=Math.max(3,Math.round(eh/c)),y0=Math.round(ey-rows*c/2),cols=Math.round(len/c),fr=Math.floor(t*14);
  x.save();x.globalCompositeOperation='source-over';
  for(let k=0;k<cols;k++){const d=k/cols,keep=Math.pow(1-d,1.35),flow=Math.floor(t*40)-k;
    for(let j=0;j<rows;j++){const edge=Math.abs(j-(rows-1)/2)/((rows-1)/2||1),h=hash(k*131+j*17+fr*7,flow&1023);
      if(h>keep*(1-.35*edge*edge))continue;
      const a=amp*(d<.06?1:(.35+.65*(1-d)))*(edge>.8?.6:1),col=d<.05&&edge<.7?'230,255,250':d<.25?'126,227,229':d<.6?'31,180,206':'20,113,146';
      x.fillStyle=`rgba(${col},${Math.min(1,a*1.15)})`;x.fillRect(Math.round(ex+k*c),y0+j*c,c,c);}}
  x.restore();}
/* the toys (game/toys.js): the drive on/off (eased, so the beams spool), the lighting mode, the EVA beacon strobe */
function toysDraw(t){TOY.dv+=(TOY.drive-TOY.dv)*.04;if(TOY.beacon&&SC.navlights){const [bx,by]=SC.navlights[SC.navlights.length-1],ph=t%1.6;
  if(ph<.12||(ph>.3&&ph<.42)){x.save();x.globalCompositeOperation='lighter';glow(bx,by,40*SS,'255,240,220',.55);glow(bx,by,90*SS,'255,90,60',.2);x.restore();px(bx-SS,by-SS,3*SS,3*SS,'#f6efe4');}}}
function outside(t){const sky=skyMask();if(!sky)return;const ok=(X,Y)=>X>=0&&Y>=0&&X<W&&Y<H&&sky(X,Y);const O=outside;
  if(!O.mask){const k=8,mw=Math.ceil(W/k),mh=Math.ceil(H/k),mc=document.createElement('canvas');mc.width=mw;mc.height=mh;const g=mc.getContext('2d'),id=g.createImageData(mw,mh);
    for(let yy=0;yy<mh;yy++)for(let xx=0;xx<mw;xx++)if(ok(xx*k+k/2,yy*k+k/2))id.data[(yy*mw+xx)*4+3]=255;g.putImageData(id,0,0);O.mask=mc;
    const R=[];for(let yy=0;yy<H;yy+=8*SS){let c=0,n=0;for(let xx=0;xx<W;xx+=8*SS){n++;if(ok(xx,yy))c++;}R.push([yy,c/n]);}
    const best=(a,b2)=>R.filter(([y])=>y>=H*a&&y<=H*b2).sort((p,q)=>q[1]-p[1]).slice(0,4).map(r=>r[0]);O.top=best(0,.3);O.bot=best(.7,1);
    O.b=[0,0];for(let yy=.05;yy<.25&&!O.b[0];yy+=.01)for(let xx=.06;xx<.32;xx+=.01)if(ok(W*xx,H*yy)&&ok(W*xx+8*SS,H*yy+8*SS)&&ok(W*xx-8*SS,H*yy-8*SS)){O.b=[W*xx,H*yy];break;}}
  /* everything that moves is drawn on a scratch layer and cut by the sky, so it passes behind the hull */
  const occl=fn=>{if(!O.sc){O.sc=document.createElement('canvas');O.sc.width=W;O.sc.height=H;}const g=O.sc.getContext('2d');g.globalCompositeOperation='source-over';g.clearRect(0,0,W,H);
    const keep=x;x=g;try{fn();}finally{x=keep;}g.globalCompositeOperation='destination-in';g.imageSmoothingEnabled=false;g.drawImage(O.mask,0,0,W,H);x.drawImage(O.sc,0,0);};
  /* the beacon, far off, three slow blinks */
  {const [bx,by]=O.b;if(bx){const ph=t%9.6,on=ph<.15||(ph>.6&&ph<.75)||(ph>1.2&&ph<1.35);if(on){x.save();x.globalCompositeOperation='lighter';glow(bx,by,16*SS,'255,90,60',.45);x.restore();px(bx-SS,by-SS,2*SS,2*SS,'#ff8a5c');}}}
  /* a comet: a slow bright head and a long trail */
  {const P_=420,n=Math.floor(t/P_),u=(t-n*P_)/7.5;if(u>=0&&u<1&&hash(n,901)<.75){const y0=O.top.length?O.top[Math.floor(hash(n,902)*O.top.length)]:H*.04,dir=hash(n,903)<.5?1:-1,
    X=dir>0?-W*.05+W*1.1*u:W*1.05-W*1.1*u,Y=y0+H*.006*u;occl(()=>{for(let k=0;k<44;k++){const a=1-k/44,sz=k<3?2*SS:SS;px(Math.round(X-dir*k*5*SS-(dir>0?5*SS:0)),Math.round(Y-k*.22*SS),5*SS,sz,a>.8?'#f6efe4':a>.45?'#7ee3e5':'#446d75');}
      x.save();x.globalCompositeOperation='lighter';glow(X,Y,14*SS,'200,250,255',.25);x.restore();});}}
  /* a dead satellite, tumbling slowly across */
  {const P_=300,n=Math.floor(t/P_),u=(t-n*P_)/55;if(u>=0&&u<1&&hash(n,911)<.7){const pool=O.top.slice().reverse(),Y=pool.length?pool[Math.floor(hash(n,912)*pool.length)]:H*.05,X=W*(1.02-1.04*u),r=Math.floor(t*1.3)%4,q=2*SS;
    occl(()=>{px(X,Y,3*q,2*q,'#9a9897');px(X,Y,3*q,SS,'#c6ab92');if(r%2){px(X-4*q,Y+SS,4*q,SS,'#6b6a6e');px(X+3*q,Y+SS,4*q,SS,'#6b6a6e');}else{px(X+q,Y-3*q,SS,3*q,'#6b6a6e');px(X+q,Y+2*q,SS,3*q,'#6b6a6e');}if(Math.floor(t*2)%5===0)px(X+q,Y+SS,SS,SS,'#d0442e');});}}
  /* very rarely: another ship, far away, crossing in the dark */
  {const P_=1380,n=Math.floor(t/P_),u=(t-n*P_)/120;if(u>=0&&u<1&&hash(n,921)<.8&&LX&&ready(LX)){const w=W*.08,h=w*H/W,X=W*(1.02-1.1*u),Y=Math.max(4,(O.top.length?Math.min(...O.top):H*.03)-h*.45);
    occl(()=>{x.save();x.globalAlpha=.55*Math.sin(Math.PI*u);x.filter='brightness(.45) saturate(.5)';x.drawImage(LX,0,0,W,H,X,Y,w,h);x.restore();});}}}
function render(c,P,times,t,box,scale){layers();const C=compile(P,times);if(!ready(L0)){if(ready(LX)){c.save();c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.drawImage(LX,0,0,LX.naturalWidth,LX.naturalHeight,Math.round(box.x*scale),Math.round(box.y*scale),Math.round(box.w*scale),Math.round(box.h*scale));c.restore();}return false;}
  const Wv={};for(const k in WORLD)Wv[k]=worldAt(C,k,t);const pw=clamp(Wv.ship_power,0,1),total=times.length?times[times.length-1].end:3600,prog=clamp(t/total,0,1),era=eraAt(C,t),present=era==='present';
  evNow=null;for(const e of C.events){if(t>=e.at-1.2&&t<e.at+4)evNow={type:e.type,local:t-e.at+1.2};if(e.at>t+5)break;}
  const evE=evNow&&evNow.type!=='signal-flash'?Math.sin(Math.PI*clamp(evNow.local/3.8,0,1)):0;
  /* memory echoes: scripted ones, and faint random ones as timeline_echoes rises */
  const ech={};for(const e of C.echoes){if(t<e.at||t>e.at+e.dur+1.2)continue;const u=t-e.at,env=Math.min(sm(u/.5),1-sm((u-e.dur)/1.2))*(.75+.25*(hash(Math.floor(t*9),e.room.length)<.8?1:.2));ech[e.room]={e:Math.max(env,(ech[e.room]||{}).e||0),preset:e.preset};}
  if(present&&Wv.timeline_echoes>.01){const n=Math.floor(t/37),u=t/37-n;if(hash(n,555)<Wv.timeline_echoes&&u<.05){const rooms=Object.keys(SC.rooms).filter(r=>r!=='shaft'),r=rooms[Math.floor(hash(n,556)*rooms.length)];ech[r]={e:Math.max((ech[r]||{}).e||0,.5*Math.sin(Math.PI*u/.05)),preset:'crew-routine'};}}
  x.globalAlpha=1;x.globalCompositeOperation='source-over';x.imageSmoothingEnabled=false;x.drawImage(L0,0,0,W,H);
  /* the dead ship is the artist's dark drawing; a room's own light brings the lit drawing back inside its walls */
  const DARKART=present&&ready(LD);if(DARKART){x.drawImage(LD,0,0,W,H);for(const r in LREV){const a=clamp((LREV[r]-.55)/.45,0,1);if(a>.003&&PATHS[r]){x.save();x.clip(PATHS[r]);x.globalAlpha=a;x.drawImage(L0,0,0,W,H);x.restore();}}} /* the masters ship at half size (one px per internal px in play); the world canvas doubles them */
  if(SC.space){for(let i=0;i<70;i++){const R=SC.space[i%SC.space.length],sx=Math.floor(R[0]+hash(i,701)*(R[2]-R[0])),sy=Math.floor(R[1]+hash(i,702)*(R[3]-R[1])),tw=.5+.5*Math.sin(t*(.3+hash(i,703))+i*2);if(tw>.8)px(sx,sy,SS,SS,tw>.94?'#d2d0c6':'#5a74a6');}}
  else for(let i=0;i<50;i++){const sx=Math.floor(hash(i,701)*W),sy=Math.floor(hash(i,702)*H),tw=.5+.5*Math.sin(t*(.3+hash(i,703))+i*2);if(tw>.78)px(sx,sy,1,1,tw>.94?'#d2d0c6':'#5a74a6');}
  if(LP&&ready(LP))x.drawImage(LP,Math.round(-14*prog),Math.round(-6*prog));
  outside(t);toysDraw(t);
  const ap=Wv.anomaly_proximity,drawAnomaly=(m)=>{if(ap<=.01)return;const F=SC.anomaly,ax=F.from[0]+(F.to[0]-F.from[0])*sm(ap),ay=F.from[1]+(F.to[1]-F.from[1])*sm(ap)+3*Math.sin(t/5.3);let st=ap<.5?'drift':ap<.85?'closed':'pulse';const la=C.anom.length?lastOf([{at:-1,state:null}].concat(C.anom),t).state:null;if(la)st=la;if(evNow&&evNow.type!=='power-drop')st='respond';
    x.save();x.globalCompositeOperation='lighter';glow(ax,ay-55,80+12*Math.sin(t*.7),'170,160,255',(.08+.06*ap)*ap*(1+evE)*m);x.restore();drawSprite('anomaly',st,ax,ay,false,t,3,clamp(ap*1.6,0,1)*m);};drawAnomaly(1);
  if(L1)x.drawImage(L1,0,0);
  /* PRESENT: decades of dirt; an echo lifts it from its room for a moment */
  if(present&&(ready(LG)||DARKART)){if(!DARKART)x.drawImage(LG,0,0,W,H);for(const [r,o] of Object.entries(ech)){x.save();x.clip(PATHS[r]||new Path2D());x.globalAlpha=o.e;x.drawImage(L1||L0,0,0,W,H);x.restore();}}
  const rs={};for(const r of Object.keys(SC.rooms))rs[r]=roomState(C,r,t);
  const engineWash=(m)=>{/* the same four beams in every view: same size, length, brightness and flow. Each art has its nozzles in a slightly different place, so the beams sit at the exterior's nozzles while the hull is up and at the cutaway's once it's peeled away */
    const ext=clamp(exteriorAt(C,t),0,1),amp=(present&&FORCE!=='drift'?.3:1)*Math.max(pw,.6)*m*TOY.dv,X=SC.xnozzles||SC.engines,Cn=SC.engines;
    for(let i=0;i<Cn.length;i++){const c=Cn[i],e=X[i]||c,ex=(e[0]-14)*ext+(c[0]-4)*(1-ext),ey=e[1]*ext+c[1]*(1-ext);ionBeam(Math.round(ex),Math.round(ey),64,150*(1+Math.max(0,TOY.dv-1)*.9),Math.min(amp,1.25),t);}} /* one set of beams, all alike: same nozzle height, same length, same flow */;engineWash(1-clamp(exteriorAt(C,t),0,1));
  if(SC.core){const [x0,y0,x1,y1]=SC.core,st=rs.engineering,F=STATES[st]||{},sp=(F.core||1)*(F.dead?.25:1),cont=Wv.contamination_level,base=st==='blackout'?.15:F.dead?.3:1;x.save();x.beginPath();x.rect(x0,y0,x1-x0+1,y1-y0+1);x.clip();x.globalCompositeOperation='lighter';
    for(let i=0;i<14;i++){const yy=y1-(((t*16*sp+i*9)%((y1-y0)+10))),w=(x1-x0)*(.4+.5*hash(i,77)),col=cont>2&&i%3===0?'120,240,210':'255,140,60';x.fillStyle=`rgba(${col},${(.35+.3*hash(i,78))*base*pw})`;x.fillRect(Math.round(x0+(x1-x0-w)/2),Math.round(yy),Math.round(w),2);}
    x.restore();x.save();x.globalCompositeOperation='lighter';glow((x0+x1)/2,(y0+y1)/2,64,'255,140,60',(.12+.05*Math.sin(t*1.3*sp))*base*pw);x.restore();
    if(SC.pump){const [pcx,pcy,pr]=SC.pump,an=t*1.6*sp*pw;x.fillStyle='#6b6e78';for(let k=0;k<4;k++){const a=an+k*Math.PI/2;for(let r=3;r<pr;r++)x.fillRect(Math.round(pcx+Math.cos(a)*r),Math.round(pcy+Math.sin(a)*r),1,1);}px(pcx-2,pcy-2,5,5,'#8c8f96');}}
  if(Wv.contamination_level>.3&&SC.conduit){const [[cx0,cy],[cx1]]=SC.conduit,ph=((t%11)/11),a=clamp(Wv.contamination_level,0,1);x.save();x.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const p=cx1-(cx1-cx0)*((ph+i*.08)%1);x.fillStyle=`rgba(120,240,210,${.6*a*(1-i*.3)})`;x.fillRect(Math.round(p),cy,(6-i*2)*SS,2*SS);}x.restore();}
  /* screens (camera feeds are drawn last, from a picture of the room taken before DeadScout is drawn) */
  const camScreens=[];
  for(const [id,r] of Object.entries(SC.screens)){let s=screenMode(C,id,t,Wv),m=s.m;const room=id.split('.')[0];if(ech[room]&&ech[room].e>.4&&m==='offline')m='idle-grid';
    if(evNow&&evE>.3&&hash(id.length,Math.floor(t*6))<.7)m='noise';if(pw<.5&&m!=='offline'&&!screenAt(C,id,t).m&&hash(id.length*3,Math.floor(t*2))<.5)m='off'; /* low power: screens flicker off, except one that was just woken */
    if(FOCUS&&FOCUS_SCREENS.includes(id))m='focus';
    if(m==='camera'){camScreens.push([id,r,s.cam||'bridge']);continue;}
    const pa=m==='profile-active';screenDraw(id,r,pa?'profile':m,(m==='registry'||m==='hos')&&s.at!=null?t-s.at:t,Wv,null); /* the registry reads from its first line when the screen wakes */
    if(pa&&Math.floor(t*1.4)%2){const w=r[2]-r[0];px(r[0],r[3]-7,w+1,8,'rgba(12,34,38,.85)');PX.text(x,'ACTIVE',r[0]+((w-22)/2|0),r[3]-6,'#d8fff0');}}
  {const M=SC.mysteries;const [lx,ly,lw,lh]=M.locker;if(mystOn(C,'locker-open',t)){px(lx+1,ly+2,lw-2,lh-4,'#0b0a10');px(lx+lw-1,ly+2,5*SS,lh-4,'#50535f');px(lx+lw-1+5*SS,ly+2,SS,lh-4,'#8c8f96');}
    if(!mystOn(C,'helmet-gone',t)){const [hx,hy]=M.helmet;px(hx-5*SS,hy-9*SS,11*SS,9*SS,'#cbc1aa');px(hx-4*SS,hy-10*SS,9*SS,SS,'#e8dfc8');px(hx-3*SS,hy-7*SS,6*SS,4*SS,'#1e1a28');px(hx-2*SS,hy-6*SS,2*SS,SS,'#5a74a6');}
    const tp=M.tool[mystOn(C,'tool-moved',t)?1:0];drawSprite('tools','wrench-orange',tp[0],tp[1],false,0,0);
    if(mystOn(C,'hatch-blink',t)){const e=C.myst.find(q=>q.k==='hatch-blink');if(t-e.at<40&&Math.floor(t*2)%2){x.save();x.globalCompositeOperation='lighter';glow(M['hatch-blink'][0],M['hatch-blink'][1],10,'255,190,90',.5);x.restore();}}
    if(SC.chair){const [chx,chy]=SC.chair,cm=C.myst.find(q=>q.k==='chair-turn'),tu=cm&&t>=cm.at?sm((t-cm.at)/6):0,d=tu<.5?1:-1;
    px(chx-8,chy-14,17,3,'#3a3c49');px(chx-1,chy-11,3,11,'#2a2b37');px(chx-7,chy-2,15,2,'#2a2b37');const bw=Math.max(1,Math.round(Math.abs(1-2*tu)*3));px(chx+d*8-(d<0?bw-1:0),chy-34,bw,22,'#50535f');px(chx-8,chy-16,17,2,'#6b6e78');}}
  {const lvl=Wv.contamination_level,S=A.sheets.growth;if(S)for(const [i,g] of SC.growth.entries()){const a=clamp((lvl-g.stage+.3)/.5,0,1);if(a<=0)continue;const ceil=g.ceil!=null?g.ceil:(SC.world?g.y<1000&&g.y>880||g.y<600:g.y<420);drawSprite('growth',g.kind,g.x,ceil?g.y+(S.frame_height-16)*SS:g.y,i%2===1,t*.3,i,a*(.75+.25*Math.sin(t*.9+i)));}}
  /* the past, for a moment */
  const herHere=visible(C,'scout',t);for(const [r,o] of Object.entries(ech))for(const [k,g] of echoCast(r,o.preset,C,t).filter(g=>!(herHere&&g.id==='pilot')).entries()){if(g.x0!=null){const u=((t*.08+k*.3)%1),X=g.x0+(g.x1-g.x0)*u;drawGhost(g.id,'walk',X,g.y,false,t,k+3,o.e*.75);}else drawGhost(g.id,g.anim,g.x,g.y,!!g.flip,t,k+3,o.e*.75);}
  /* the crew, then a picture for any camera feed, then DeadScout */
  const AB={},drawActor=(a,i)=>{if(!visible(C,a,t))return;const st=actorAt(C,a,t);let anim,flip=false,an0=null;
    if(st.walk){anim=(a==='commander'||a==='deadscout'||a==='scout')&&st.sneak?'sneak':'walk';flip=st.left;} /* every sheet walks facing right and is mirrored to go left (r26: the pilot's 'walk-left' was the same frames unmirrored, so she walked backwards) */
    else if(st.climb){const S=A.sheets[SHEET[a]||a];anim=st.down?'climb-down':'climb';if(!(S&&S.animations[anim]))an0=CLIMBF[a];}
    else if(st.pause&&A.sheets[SHEET[a]||a]&&A.sheets[SHEET[a]||a].animations['climb-mount'])anim='climb-mount';
    else if(st.lift||st.pause)anim=a==='commander'||a==='deadscout'||a==='scout'||a==='k9'||a==='k9m'?'idle':'stand';
    else{anim=poseAt(C,a,st,t);flip=(actFace(C,a,st,t)||st.face)==='left';}
    const mem=a==='scout'||a==='k9m';if(mem){x.save();x.globalCompositeOperation='lighter';glow(st.x,st.y-(a==='k9m'?16:34)*SS,(a==='k9m'?30:46)*SS,'200,240,230',.07+.03*Math.sin(t*2.1));x.restore();}
    /* a turn: she keeps the old facing for a beat, shows her front for a beat, then faces the new way (no instant flip) */
    let tt=t;const S_=A.sheets[SHEET[a]||a];
    /* the gait is driven by distance, not time: phase = distance / stride, stride = cruise speed × one cycle; slowing slows the feet, stopping plants them */
    if(st.walk&&st.dist!=null&&S_){const an=S_.animations[anim]||S_.animations.walk;if(an){const tot=an.reduce((p,f)=>p+f[1],0),stride=Math.max(1,vWalk(a,st.sneak,false)*tot);tt=(st.dist/stride)*tot-(i*5+1)*1.37;}}
    if(!st.climb&&!st.lift){x.save();x.globalAlpha=.28;x.fillStyle='#06060a';x.fillRect(Math.round(st.x-6*SS),Math.round(st.y-1),12*SS,2);x.restore();} /* two dark pixels under the boots: contact, not a drop shadow */if(S_&&S_.animations.turn&&!an0){const F=FACET[a]||(FACET[a]={flip,t:-9});if(F.flip!==flip){F.flip=flip;F.t=t;}const u=t-F.t;if(u<.06)flip=!flip;else if(u<.13){anim='turn';flip=false;tt=u-(i*5+1)*1.37;}}
    const dimK9=(a==='k9'||a==='k9m')&&/^(off|power-down|power-up)$/.test(anim);if(dimK9){const k=anim==='off'?.32:.55+.35*Math.abs(Math.sin(t*3));x.filter=`brightness(${k})`;} /* one pose until the production sheet: the engine dims it */
    const r=drawSprite(a,anim,st.x,st.y,flip,tt,i*5+1,mem?.92:1,an0);if(dimK9)x.filter='none';if(r)AB[a]={x:st.x,y:st.y,h:r.h,flip,anim,ref:st.ref||''};};
  CREW.forEach((a,i)=>drawActor(a,i));
  const camSnap={};for(const [id,,room] of camScreens){const R=(SC.cameras&&SC.cameras[room])||[0,0,W,H],w=R[2]-R[0],h=R[3]-R[1];let cc=CAMCV[id];if(!cc){cc=CAMCV[id]=document.createElement('canvas');}if(cc.width!==w||cc.height!==h){cc.width=w;cc.height=h;}else cc.getContext('2d').clearRect(0,0,w,h);cc.getContext('2d').drawImage(cv,R[0],R[1],w,h,0,0,w,h);camSnap[id]=cc;}
  drawActor('deadscout',3);
  if(DARKART&&ready(LFD)){x.drawImage(LFD,0,0,W,H);if(ready(L2))for(const r in LREV){const a=clamp((LREV[r]-.55)/.45,0,1);if(a>.003&&PATHS[r]){x.save();x.clip(PATHS[r]);x.globalAlpha=a;x.drawImage(L2,0,0,W,H);x.restore();}}}
  else if(ready(L2))x.drawImage(L2,0,0,W,H);
  const drawTether=()=>{let on=null;for(const e of C.tether)if(e.at<=t)on=e;const cm=AB.commander||AB.deadscout;if(on&&on.on&&cm&&cm.x>SC.tether.from[0]){const u=clamp((t-on.at)/on.over,0,1),[tx,ty]=SC.tether.from,ex=tx+(cm.x-10*SS-tx)*u,ey=ty+(cm.y-34*SS-ty)*u;
      for(let i=0;i<=60;i++){const f=i/60,X=tx+(ex-tx)*f,Y=ty+(ey-ty)*f+Math.sin(Math.PI*f)*8*(1-u*.5)+Math.sin(t*1.3+f*6)*1.2;x.fillStyle='#e09a5a';x.fillRect(Math.round(X),Math.round(Y),1,1);x.fillStyle='#94502a';x.fillRect(Math.round(X),Math.round(Y)+1,1,1);}}};drawTether();
  for(const [id,D] of Object.entries(SC.doors)){let o=doorOpen(C,id,t);{const tg=TOY.door[id]||0;DOV[id]=(DOV[id]||0)+(tg-(DOV[id]||0))*.045;o=Math.max(o,DOV[id]);}const lockd=lastOf(C.doors[id],t).state==='locked';
    if(D.wall){if(o>.02){const [wx0,wy0,wx1,wy1]=D.wall,ww=(wx1-wx0)*o;x.fillStyle='rgba(6,5,9,.92)';x.fillRect(wx0+(wx1-wx0-ww)/2,wy0,ww,wy1-wy0);}continue;}
    if(D.floor){for(const a of ACTORS){const b=AB[a];if(b&&Math.abs(b.x-D.x)<8&&b.y>D.y-2)o=1;}const X=D.x-10;if(o<.5){px(X,D.y-2,21,3,'#50535f');px(X,D.y-2,21,1,'#8c8f96');}else px(X-2,D.y-22,3,21,'#50535f');continue;}
    if(!lockd&&!D.big)for(const a of CREW){const b=AB[a];if(b&&Math.abs(b.y-D.y)<6*SS&&Math.abs(b.x-D.x)<18*SS)o=1;} /* the doors know the crew; they do not know her */
    if(o>=.99)continue;const top=D.y-D.h,h=Math.round(D.h*(1-o)),k=SS;
    if(D.big){px(D.x-6*k,top,13*k,h,'#3a3c49');px(D.x-6*k,top,k,h,'#6b6e78');for(let yy=top+h-5*k;yy>top;yy-=9*k)px(D.x-5*k,yy,11*k,2*k,'#b07a26');if(h>20*k)px(D.x-2*k,top+h-16*k,5*k,5*k,'#1f1e2a');}
    else{px(D.x-4*k,top,9*k,h,'#3a3c49');px(D.x-4*k,top,9*k,k,'#6b6e78');px(D.x-4*k,top,k,h,'#6b6e78');if(h>8*k)for(let yy=top+h-6*k;yy>top;yy-=10*k)px(D.x-3*k,yy,7*k,2*k,'#b07a26');if(lockd)px(D.x-2*k,top+h-26*k,5*k,3*k,'#d0442e');}}
  /* light: base x state x power x event; the lights wake a little where she walks, an echo brings back the old light */
  const al=Math.max(Wv.alert_state||0,TOY.alert?.7:0),ds=AB.deadscout,dsRoom=ds?roomOf(ds.x,ds.y-20):null;
  const dt=wakeT==null?0:clamp(t-wakeT,0,.25);wakeT=t;
  for(const r of Object.keys(SC.rooms)){const st=rs[r],F=STATES[st]||{},B=BASE[r]||{},full=B.light!=null?B.light:1;let L=full*(F.light!=null?F.light:1)*(.7+.3*pw);
    if(B.outside&&present)L=Math.min(L,.3);   /* the EVA deck in the present: dead like the rest, starlight only, until she steps out */
    const want=present&&r===dsRoom?1:0,w0=WAKE[r]||0,w=w0+(want-w0)*(1-Math.exp(-dt/(want?.7:3.2)));WAKE[r]=w;
    if(w>.001){const s=C.act.deadscout.segs.find(q=>q.t0<=t&&q.t1>t),since=s?t-s.t0:9,stut=hash(Math.floor(t*10),3)<.1&&since<2?.6:1;L=L+(full-L)*.62*w*stut;}
    if(ech[r])L=L+((B.light!=null?B.light:1)-L)*ech[r].e;
    if(TOY.room[r]!=null)L=Math.max(L,.85*Math.max(full,.85)); /* once you've flipped a room's switch, its light is yours */
    {const tg=TOY.room[r]==null?1:TOY.room[r];let v=RLV[r]==null?1:RLV[r];const since=(performance.now()-(RLT[r]||-1e9))/1000;
     if(tg>=1&&since<1.1){v=hash(Math.floor(since*14),r.length*7+3)<(since<.5?.55:.25)?.12:(since<.5?.75:1);}else v+=(tg-v)*.35; /* a fluorescent tube finding itself */
     RLV[r]=v;L*=.28+.72*v;} /* lights off is not black: the utility floor strips stay on (r25; was .1) */
    if(F.flicker&&hash(Math.floor(t*7),r.length*11)<.12)L*=.45;if(evNow&&evNow.type!=='signal-flash')L*=1-.45*evE*(evNow.type==='power-drop'?1.6:1);
    LREV[r]=L;x.save();x.clip(PATHS[r]);const [bx0,by0,bx1,by1]=BBOX[r],bw=bx1-bx0+1,bh=by1-by0+1; /* fills under the clip cover the room's box, not the whole hull */const dk=DARKART?clamp(.5-L,0,.6):clamp(1-L,0,.92);if(dk>.001){x.fillStyle=`rgba(4,3,8,${dk})`;x.fillRect(bx0,by0,bw,bh);}
    x.globalCompositeOperation='lighter';const tint=(col,a)=>{if(a>0){x.fillStyle=`rgba(${col},${a})`;x.fillRect(bx0,by0,bw,bh);}};const ec=ech[r]?ech[r].e:0;
    tint('90,220,200',(F.cyan||0)*(F.pulse?.6+.4*Math.sin(t*.9+r.length):1)+(B.cyan||0)+.05*ec);tint('255,150,70',(B.orange||0)*(present?.3:1));tint('255,170,110',(B.warm||0)*(present?.3:1));
    tint('255,50,30',((F.red||0)+(al>0&&r!=='quarters'?.05*al:0))*(.5+.5*Math.sin(t*3.4)));tint('255,170,60',(F.amber||0)*(.5+.5*Math.sin(t*5)));if(TOY.alert&&!B.outside){const pu=.5+.5*Math.sin(performance.now()/1000*2.6);x.globalCompositeOperation='multiply';x.fillStyle=`rgba(255,${Math.round(70-30*pu)},${Math.round(60-30*pu)},${.6+.15*pu})`;x.fillRect(0,0,W,H);x.globalCompositeOperation='lighter';tint('255,30,20',.06+.1*pu);}x.restore();}
  x.save();x.globalCompositeOperation='lighter';for(const [i,Lp] of SC.lamps.entries()){const st=rs[Lp.room]||'normal',F=STATES[st]||{},col=PX.LCOL[Lp.type]||PX.LCOL.amber;let p=PX.irr(t,[4.7,7.3,11.1,5.9,9.4][i%5],i*31+7);
    const wk=TOY.room[Lp.room]!=null?1:(WAKE[Lp.room]||0);if(F.lampsOff&&!Lp.warn&&!(ech[Lp.room]&&ech[Lp.room].e>.3)&&wk<.05){if(F.emergency&&i%3===0){glow(Lp.x,Lp.y+4*SS,22*SS,'255,90,50',.05+.03*Math.sin(t*.7+i));}continue;}
    if(Lp.warn){const on=F.warn||al>.3;p=on?(Math.floor(t*1.6+i*.5)%2?1:.1):F.emergency?.35:.12;}
    if(Lp.flaky&&hash(Math.floor(t*3),i)<.06)p=0;let a=(.05+.1*p)*(.35+.65*pw)*(Lp.warn?1:(RLV[Lp.room]==null?1:RLV[Lp.room]));if(F.light!=null&&!Lp.warn)a*=F.light+(1-F.light)*.8*wk;if(F.lampsOff&&!Lp.warn)a*=wk;glow(Lp.x,Lp.y+4*SS,(Lp.warn?20+8*p:34+8*p)*SS*(Lp.soft?1.6:1),col.join(','),a*(Lp.soft?1.4:2.2));if(Lp.warn&&p>.5){x.fillStyle=`rgba(${col},${.6*p})`;x.fillRect(Lp.x-2*SS,Lp.y-SS,4*SS,3*SS);}}
  /* utility floor strips (r25): in a room whose lights are switched off, low grey-blue lamps along the deck keep the floor readable; they fade as the tubes come back */
  for(const [r,v] of Object.entries(RLV)){if(TOY.room[r]==null||v>.7||!BBOX[r])continue;const k=1-Math.max(0,(v-.1)/.6),[bx0,by0,bx1,by1]=BBOX[r],fy=by1-3*SS;if(k<=0)continue;
    for(let X=bx0+40*SS;X<bx1-20*SS;X+=110*SS){glow(X,fy,34*SS,'120,150,165',.07*k);x.fillStyle=`rgba(150,190,200,${.5*k})`;x.fillRect(Math.round(X-3*SS),Math.round(fy-SS),6*SS,SS);}}
  if(PLAY.on&&PLAY.notes.length&&dsRoom){for(const n of PLAY.notes){const u=t-n.at;if(u<0||u>1.4)continue;const e=1-u/1.4,col=['255,190,90','120,240,210','255,140,60','170,160,255','255,110,90','150,200,255','200,255,170','255,230,160'][n.i%8];
      for(const Lp of SC.lamps)if(Lp.room===dsRoom)glow(Lp.x,Lp.y+6,30+30*e,col,.22*e);if(ds)glow(ds.x,ds.y-60,26,col,.12*e);}}
  if(LIT&&ds){x.save();x.globalCompositeOperation='lighter';glow(ds.x,ds.y-30*SS,72*SS,'255,236,200',.16);const dir=ds.flip?-1:1,hx=ds.x+dir*10*SS,hy=ds.y-36*SS,L=70*SS,g=x.createLinearGradient(hx,0,hx+dir*L,0);g.addColorStop(0,'rgba(255,240,200,.22)');g.addColorStop(1,'rgba(255,240,200,0)');x.fillStyle=g;x.beginPath();x.moveTo(hx,hy);x.lineTo(hx+dir*L,hy-18*SS);x.lineTo(hx+dir*L,hy+20*SS);x.closePath();x.fill();x.restore();}
  for(const a of ACTORS){const b=AB[a];if(!b||b.anim!=='flashlight')continue;const dir=b.flip?-1:1,hx=b.x+dir*14*SS,hy=b.y-38*SS,L=96*SS,g=x.createLinearGradient(hx,0,hx+dir*L,0);g.addColorStop(0,'rgba(255,240,200,.34)');g.addColorStop(1,'rgba(255,240,200,0)');x.fillStyle=g;x.beginPath();x.moveTo(hx,hy-1);x.lineTo(hx+dir*L,hy-22*SS);x.lineTo(hx+dir*L,hy+24*SS);x.closePath();x.fill();}
  x.restore();
  for(const [id,r] of camScreens)screenDraw(id,r,'camera',t,Wv,camSnap);
  /* the flash: everything overexposed, then gone */
  if(evNow&&evNow.type==='signal-flash'){const u=evNow.local-1.2,a=u<0?sm((u+1.2)/1.2)*.35:u<.25?.35+.65*sm(u/.25):u<1.1?1:1-sm((u-1.1)/2.7);if(a>0){x.save();x.globalCompositeOperation='lighter';x.fillStyle=`rgba(200,245,255,${a})`;x.fillRect(0,0,W,H);x.restore();if(a>.6){x.fillStyle=`rgba(235,250,255,${(a-.6)*2})`;x.fillRect(0,0,W,H);}}}
  /* THE OUTSIDE: the same hull seen from space, dissolved over the cutaway. The art is a second fixed master (never redrawn); only what lives
     outside the hull is drawn again on top of it: the engine wash, the anomaly, whoever stands on the EVA platform, the tether, the platform lamps */
  const ea=clamp(exteriorAt(C,t),0,1);
  const sw=scanAt(C,t),TITLE=FORCE==='drift';let sweepX=null; /* the title card shows her as she was */
  if(ea>0&&LX&&ready(LX)){x.save();if(sw!=null){/* x-ray: the hull dissolves pixel by pixel only over the rooms, so we look into the ship; the plating, the stripes and the
      name stay whole and give way at the very end */
      const B=8*SS,nx=Math.ceil(W/B),ny=Math.ceil(H/B),u=sm(sw);if(!XR.m){XR.m=new Uint8Array(nx*ny);const g=document.createElement('canvas').getContext('2d');
        for(let by=0;by<ny;by++)for(let bx=0;bx<nx;bx++){const cx=bx*B+B/2,cy=by*B+B/2;for(const r in PATHS)if(r!=='eva'&&g.isPointInPath(PATHS[r],cx,cy)){XR.m[by*nx+bx]=1;break;}}}
      const pin=new Path2D(),pout=new Path2D(),ur=u/.78;for(let by=0;by<ny;by++)for(let bx=0;bx<nx;bx++){if(XR.m[by*nx+bx]){if(hash(bx*7+3,by*13+5)*.75+(bx/nx)*.25>ur)pin.rect(bx*B,by*B,B,B);}else pout.rect(bx*B,by*B,B,B);}
      x.save();x.clip(pin);x.globalAlpha=ea;x.drawImage(LX,0,0,W,H);x.restore();
      const ho=1-sm((u-.78)/.22);if(ho>0){x.save();x.clip(pout);x.globalAlpha=ea*ho;x.drawImage(LX,0,0,W,H);x.restore();}x.globalAlpha=1;}
    else{x.globalAlpha=ea;x.drawImage(LX,0,0,W,H);x.globalAlpha=1;}
    /* depth: three layers of stars drift past at three speeds, only where the art is open sky */
    const SK=skyMask();if(SK){for(let L_=0;L_<3;L_++){const n=[70,40,18][L_],v=[1.2,3.4,8][L_],a0=[.35,.55,.85][L_];for(let i=0;i<n;i++){const sx=((hash(i,800+L_)*W+t*v)%W+W)%W,sy=hash(i,820+L_)*H;if(!SK(sx,sy))continue;const tw=.6+.4*Math.sin(t*(.4+hash(i,840))+i);x.fillStyle=L_===2?`rgba(230,224,204,${a0*tw*ea})`:`rgba(120,140,190,${a0*tw*ea})`;x.fillRect(Math.round(sx),Math.round(sy),L_===2?SS:SS/2*2,SS);}}}
    if(!present||TITLE){/* alive: thin ion streams from the stern nozzles, dashes running aft, fading with distance *//* the beams are drawn once, by engineWash */
      /* running lights: a slow red/green pair on the hull */const nl=Math.floor(t*.9)%3===0;if(nl){x.save();x.globalCompositeOperation='lighter';for(const [nx,ny,c] of NAVL)glow(nx,ny,10*SS,c,.5*ea);x.restore();}}
    else{x.fillStyle=`rgba(6,10,22,${.22*ea})`;x.fillRect(0,0,W,H);} /* dead: no trails, no lights, the whole picture a shade colder */
    if(pw<.999&&!TITLE){x.fillStyle=`rgba(2,3,8,${clamp((1-pw)*.7,0,.7)*ea})`;x.fillRect(0,0,W,H);} /* the running lights go with the power */
    if(evNow&&evNow.type!=='signal-flash'){x.fillStyle=`rgba(2,3,8,${.4*evE*ea})`;x.fillRect(0,0,W,H);}
    engineWash(ea);drawAnomaly(ea);
    for(const a of ACTORS){const b=AB[a];if(!b||roomOf(b.x,b.y-20)!=='eva')continue;drawSprite(a,b.anim,b.x,b.y,b.flip,t,(ACTORS.indexOf(a))*5+1,ea);}
    x.globalAlpha=ea;drawTether();x.globalAlpha=1;x.globalCompositeOperation='lighter';for(const [i,Lp] of SC.lamps.entries()){if(Lp.room!=='eva')continue;const col=PX.LCOL[Lp.type]||PX.LCOL.amber,p=PX.irr(t,[4.7,7.3,11.1,5.9,9.4][i%5],i*31+7);glow(Lp.x,Lp.y+4*SS,(34+8*p)*SS,col.join(','),(.05+.1*p)*(.35+.65*pw)*2.2*ea);}
    x.restore();
    if(sweepX!=null){x.save();x.globalCompositeOperation='lighter';for(let k=0;k<18;k++){x.fillStyle=`rgba(120,216,184,${.05*(1-k/18)})`;x.fillRect(sweepX-k*6,0,6,H);}x.fillStyle='rgba(216,255,240,.85)';x.fillRect(sweepX,0,SS,H);x.restore();}}
  /* the camera: the whole ship, a room, or her */
  const V=FORCE==='drift'?extRect(performance.now()/1000):FORCE||(PLAY.on||C.cams.length>1?view(P,times,t):[0,0,W,H]);
  c.save();c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;
  if(LOWRES){let [sx,sy,sw,sh]=V;if(Math.abs(sw-IR.w*2)<1){sx=Math.round(sx/2)*2;sy=Math.round(sy/2)*2;} /* snapped: no pixel crawl while she walks */
    ix.imageSmoothingEnabled=false;if(TIGHT){ix.fillStyle='#0b0e11';ix.fillRect(0,0,IR.w,IR.h);}ix.drawImage(cv,sx,sy,sw,sh,0,0,IR.w,IR.h);if(PALON){const id=ix.getImageData(0,0,IR.w,IR.h);quantize(id.data);ix.putImageData(id,0,0);}
    c.drawImage(ic,0,0,IR.w,IR.h,Math.round(box.x*scale),Math.round(box.y*scale),Math.round(box.w*scale),Math.round(box.h*scale));}
  else c.drawImage(cv,V[0],V[1],V[2],V[3],Math.round(box.x*scale),Math.round(box.y*scale),Math.round(box.w*scale),Math.round(box.h*scale));c.restore();
  return {x:box.x,y:box.y,w:box.w,h:box.h};}
function report(P,times,t){const C=compile(P,times),o={};for(const a of ACTORS){if(!visible(C,a,t)){o[a]=a==='deadscout'?'—':'GONE';continue;}const s=actorAt(C,a,t);o[a]=s.walk?'WALKING':s.climb?'LADDER':s.lift?'HOIST':(ROOM_NAMES[(s.ref||'').split('.')[0]]||ROOM_NAMES[roomOf(s.x,s.y-20)]||'');}o.era=eraAt(C,t);return o;}
window.CUT={toy:o=>{o=Object.assign({},o||{});if(o.room){for(const [r,v] of Object.entries(o.room)){if((TOY.room[r]==null?1:TOY.room[r])!==v)RLT[r]=performance.now();TOY.room[r]=v;}delete o.room;}if(o.door){Object.assign(TOY.door,o.door);delete o.door;}Object.assign(TOY,o);return TOY;},_sky:()=>skyMask(),_hash:(a,b)=>hash(a,b),tight:v=>{TIGHT=!!v;},focus:f=>{FOCUS=f||null;},frame:()=>LOWRES&&ic?ic:null,_loc:{mkRun,evalRun,xyOf:p=>xyOf(p)},setTape:n=>{TAPE=n;},drift:v=>{DRIFTL=v;},roomOf,gait:(P,times,t,a)=>{const C=compile(P,times),st=actorAt(C,a||'deadscout',t);if(!st.walk||st.dist==null)return null;const S=A.sheets[SHEET[a]||a];if(!S||!S.animations.walk)return null;const an=S.animations.walk,tot=an.reduce((p,f)=>p+f[1],0),stride=Math.max(1,vWalk(a,st.sneak,false)*tot);let u=((st.dist/stride)%1+1)%1*tot,i=0;for(const [f,d] of an){if(u<d)break;u-=d;i++;}return {i:Math.min(i,an.length-1),n:an.length,fast:st.fast,v:st.v};},render,compile,parse,format,formatBeat,eventAt,report,view,pick,neighbor,wakeAt,hereRef,farTarget,roomAt,nearby,snapshot,travelTime,MAP:SC,SS,uses:(P,times)=>compile(P,times).uses,doorStates:(P,times,t)=>{const C=compile(P,times),o={};for(const d of DOORS)o[d]=lastOf(C.doors[d],t).state;return o;},roomStates:(P,times,t)=>{const C=compile(P,times),o={};for(const r of Object.keys(SC.rooms))o[r]=roomState(C,r,t);return o;},screenModeAt:(P,times,t,id)=>screenAt(compile(P,times),id,t).m,objCount:(P,times,id)=>compile(P,times).obj[id]||0,force:v=>{FORCE=v;},exterior:v=>{EXTF=v;},light:v=>{LIT=!!v;},lowres:v=>{LOWRES=!!v;},palette:v=>{PALON=!!v;},PALETTE,IR,hasExterior:()=>!!LX,actorAt:(P,times,t,a)=>actorAt(compile(P,times),a||'deadscout',t),command,play:PLAY,mmss,secs,
  ROOMS:Object.fromEntries(Object.keys(SPOTS).map(r=>[r,{name:ROOM_NAMES[r]||r.toUpperCase(),spots:SPOTS[r]}])),ACTORS,NAMES,STORY_MODES,MODE_OF,STATES,WORLD,SCREEN_MODES,EVENTS,DOORS,ANOM,MYSTERIES:MYST,OBJECTS:OBJ,ECHO_PRESETS,ACTIONS,
  SCREENS:Object.keys(SC.screens),place,poses:AN,W,H};
})();
