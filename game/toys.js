/* Driftnaut · the ship's toys (Nov 2026, second cut). Not mysteries: switches. Every one makes a good sound and changes the
   mood of the ship. Each room has its light switch and at most a couple of things to play with: the drive (idle, full burn
   with a backfire and a heavy rumble, shutdown), the airlock hatches (they hiss), the computers (keys, then the machine
   talks back), the service pumps, the EVA beacon, the main lighting bus (the whole ship, bay by bay), and K9 (boop).
   Marks are a small HALCYON reticle and only show for the room under the pointer, or the room you tap.
   The rule: if it physically exists aboard, control it in the scene. */
(function(){
"use strict";
const G=window.__game;if(!G||!window.CUT)return;const A=G.toyApi(),scr=document.getElementById('screen'),M=CUT.MAP;if(!scr)return;
const N=k=>M.nodes[k],up=(k,dy)=>()=>[N(k)[0],N(k)[1]-dy];
const ROOMS=Object.keys(M.rooms).filter(r=>r!=='eva').sort((a,b)=>M.rooms[a].poly[0][0]-M.rooms[b].poly[0][0]);
const LROOMS=ROOMS.concat(M.rooms.eva?['eva']:[]); /* the main bus feeds the EVA dock as well; its own switch is the beacon */
const S={drive:1,lit:Object.fromEntries(LROOMS.map(r=>[r,1])),beacon:false,busy:{}};
const SFX=window.SFX,BED={},bed=(n,g,r)=>{BED[n]=g;try{SFX&&SFX.bed&&SFX.bed(n,A.soundOn()?g:0,r);}catch(e){}};
const later=(ms,f)=>setTimeout(()=>{if(G.state==='title'||G.state==='end'||G.state==='setup'){S.busy={};return;}f();},ms); /* a toy's follow-through dies with the session it started in */
/* ---------- moods ---------- */
function hum(n){bed('hum',Math.min(.07,.03+.006*n),.12);clearTimeout(S.ht);S.ht=later(1600,()=>bed('hum',0,5));}
function setRoom(r,on,quiet){if(S.lit[r]===on)return;S.lit[r]=on;CUT.toy({room:{[r]:on}});if(quiet)return;
  if(on){A.sfx('switchon',1.8);later(60,()=>A.sfx('tink',1.8));later(420,()=>A.sfx('tink',1.2));hum(1);}else{A.sfx('switchoff',1.7);bed('hum',0,.25);}}
function allLights(on){A.sfx('chunk',1);bed('hum',0,.2);LROOMS.forEach((r,i)=>later(260+i*170,()=>{if(on){S.lit[r]=0;setRoom(r,1,true);A.sfx('tink',1.2);A.sfx('relay',1);}else{setRoom(r,0,true);A.sfx('relay',1.3);}}));
  if(on)later(400,()=>{bed('hum',.075,1.2);clearTimeout(S.ht);S.ht=later(LROOMS.length*170+1400,()=>bed('hum',0,6));});}
const DRIVE=['OFF','IDLE','FULL BURN'];
function driveTo(n){if(S.drive===n)return;S.drive=n;clearTimeout(S.dt);
  if(n===2){A.sfx('breaker',.8);A.sfx('spool',1);CUT.toy({drive:1.35});S.dt=later(2650,()=>{if(S.drive!==2)return;A.sfx('backfire',1);CUT.toy({drive:1.9});bed('rumble',.55,.35);});}
  else if(n===0){bed('rumble',0,2.5);A.sfx('spooldown',1);CUT.toy({drive:0});S.engMix=A.mix('engine')||.55;S.dt=later(800,()=>{if(S.drive===0)A.mix('engine',.06);});}
  else{bed('rumble',0,2);A.sfx('breaker',.8);A.sfx('idle',1);CUT.toy({drive:1});A.mix('engine',S.engMix||.55);}}
function drive(){driveTo(S.drive===1?2:S.drive===2?0:1);return S.drive===2?'DRIVE · SPOOLING TO FULL BURN':S.drive===0?'DRIVE · SHUTDOWN':'DRIVE · IDLE';}
function hatch(id){if(S.busy[id])return null;S.busy[id]=1;A.sfx('airopen',1);later(250,()=>CUT.toy({door:{[id]:1}}));
  later(6500,()=>{A.sfx('airclose',1);later(200,()=>CUT.toy({door:{[id]:0}}));later(3200,()=>{S.busy[id]=0;});});return 'HATCH CYCLING';}
function comp(id,snd,screens,msg){if(S.busy[id])return null;S.busy[id]=1;A.sfx(snd,1.4);try{G.run(screens);}catch(e){}later(4500,()=>{S.busy[id]=0;});return msg;}
/* ---------- the toys ---------- */
const lamp=r=>{const L=M.lamps.find(l=>l.room===r&&!l.warn);if(L)return [L.x,L.y+30];const p=M.rooms[r].poly;return [(p[0][0]+p[1][0])/2,p[0][1]+40];};
const TOYS=ROOMS.map(r=>({id:'light-'+r,room:r,light:1,at:()=>lamp(r),label:()=>'LIGHTS · '+(S.lit[r]?'ON':'OFF'),off:()=>!S.lit[r],act(){setRoom(r,S.lit[r]?0:1);return null;}})).concat([
 {id:'bus',room:'central-shaft',at:()=>[1104,700],label:()=>'ALL LIGHTS · '+(LROOMS.every(r=>S.lit[r])?'ON':'OFF'),act(){const on=!LROOMS.every(r=>S.lit[r]);allLights(on);return on?'MAIN LIGHTING BUS · ON':'MAIN LIGHTING BUS · OFF';}},
 {id:'view',room:'bridge',at:up('b-window',70),label:()=>'VIEWPORT',act(){if(S.busy.v)return null;S.busy.v=1;A.look(8);A.sfx('click',.6);later(9500,()=>{S.busy.v=0;});return 'VIEWPORT · LOOKING OUT';}},
 {id:'drive',room:'engineering',at:up('e-reactor',80),label:()=>'DRIVE · '+DRIVE[S.drive],off:()=>!S.drive,act:drive},
 {id:'inner',room:'airlock',at:()=>[1506,1010],label:()=>'INNER HATCH',act:()=>hatch('airlock-inner')},
 {id:'outer',room:'airlock',at:()=>[1872,1010],label:()=>'OUTER HATCH',act:()=>hatch('airlock-outer')},
 {id:'nav',room:'bridge',at:up('b-nav',78),label:()=>'NAV COMPUTER',act:()=>comp('nav','navcomp',['+0 screen bridge.nav waveform for 4s','+0 screen bridge.left signal-bars for 5s','+0 screen bridge.left2 idle-grid for 5s','+3 screen bridge.nav signal for 3s'],'NAV · COURSE HELD')},
 {id:'sensor',room:'sensor',at:up('s-main',78),label:()=>'SENSOR ARRAY',act:()=>comp('sensor','sonar',['+0 screen sensor.main waveform for 6s','+0 screen sensor.wave signal for 6s','+0 screen sensor.small signal-bars for 6s'],'ACTIVE PING · NO RETURN')},
 {id:'comms',room:'comms',at:up('c-console',78),label:()=>'COMMS',act:()=>comp('comms','squelch',['+0 screen comms.main waveform for 5s','+0 screen comms.wave signal for 5s','+0 screen comms.small signal-bars for 5s'],'HAILING · OPEN CHANNEL')},
 {id:'term',room:'crew-quarters',at:up('q-term',74),label:()=>'TERMINAL',act:()=>comp('term','teletype',['+0 screen quarters.terminal waveform for 5s','+0 screen quarters.monitor signal-bars for 5s'],null)},
 {id:'eterm',room:'engineering',at:up('e-term',74),label:()=>'ENGINEERING PANEL',act:()=>comp('eterm','typing',['+0 screen engineering.panel signal-bars for 4s','+0 screen engineering.load waveform for 4s'],null)},
 {id:'pumps',room:'service',at:()=>[1115,1066], /* r86: the pump housing east of the tank (the old spot is the tank's now) */label:()=>'SERVICE PUMPS',act(){if(S.busy.p)return null;S.busy.p=1;A.sfx('pumps',1);later(5500,()=>{S.busy.p=0;});return 'PUMPS CYCLING';}},
 {id:'beacon',room:'eva',at:()=>{const n=M.navlights&&M.navlights[M.navlights.length-1];return n?[n[0],n[1]+14]:up('eva-antenna',120)();},label:()=>'BEACON · '+(S.beacon?'ON':'OFF'),off:()=>!S.beacon,act(){S.beacon=!S.beacon;A.sfx(S.beacon?'switchon':'switchoff',1.6);if(S.beacon)later(200,()=>A.sfx('ping',.4));CUT.toy({beacon:S.beacon?1:0});return null;}},
 {id:'k9',room:'*',at:()=>{const k=CUT.actorAt(G.P,G.TIMES,G.now(),'k9');return k?[k.x,k.y-50]:null;},label:()=>'SCOUT',hide:()=>{const r=CUT.report(G.P,G.TIMES,G.now()).k9;return !r||r==='GONE';},act(){A.chirp();return null;}}]);
/* ---------- the reticle: four corner brackets and a dot, drawn in pixels ---------- */
function ret(col){const c=document.createElement('canvas');c.width=15;c.height=15;const x=c.getContext('2d');x.fillStyle=col;const p=(X,Y)=>x.fillRect(X,Y,1,1);
  for(let i=0;i<4;i++){p(1+i,1);p(1,1+i);p(13-i,1);p(13,1+i);p(1+i,13);p(1,13-i);p(13-i,13);p(13,13-i);}p(7,7);p(6,7);p(8,7);p(7,6);p(7,8);return c.toDataURL();}
const IMG={toy:ret('#e9d7c2'),off:ret('#8a6f58')};
const css=document.createElement('style');css.textContent=`
.toys{position:absolute;inset:0;pointer-events:none;z-index:3}
.toys[hidden]{display:none}
.toy{position:absolute;width:calc(30px*var(--ui,1));height:calc(30px*var(--ui,1));margin:calc(-15px*var(--ui,1)) 0 0 calc(-15px*var(--ui,1));padding:0;border:0;background:none;cursor:pointer;opacity:0;transition:opacity .25s steps(3);pointer-events:none;-webkit-tap-highlight-color:transparent}
.toy img{width:100%;height:100%;image-rendering:pixelated;display:block;filter:drop-shadow(0 1px 0 #0b0e11)}
.toy.on{opacity:.85;pointer-events:auto}.toy.on:hover,.toy:focus-visible{opacity:1}
.toy.ping img{animation:tping .6s steps(4) 1}
@keyframes tping{0%{transform:scale(1.6)}100%{transform:scale(1)}}
.toy span{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:3px;font-family:Silk,monospace;font-size:calc(8px*var(--ui,1));letter-spacing:2px;color:#e9d7c2;background:rgba(11,14,17,.85);padding:2px 6px;white-space:nowrap;opacity:0;transition:opacity .2s steps(2)}
.toy:hover span,.toy:focus-visible span,.toy.lbl span{opacity:1}
body.photo .toys,body.bc .toys{display:none!important}`;
document.head.appendChild(css);
const layer=document.createElement('div');layer.className='toys';layer.setAttribute('aria-label','Things aboard');scr.appendChild(layer);
const EL={};
function el(T){let e=EL[T.id];if(e)return e;e=document.createElement('button');e.type='button';e.className='toy';e.innerHTML='<img alt=""><span></span>';try{const lb=T.label();e.setAttribute('aria-label',lb);e.querySelector('span').textContent=lb;}catch(_){}
  e.addEventListener('pointerdown',ev=>{ev.stopPropagation();});
  e.addEventListener('click',ev=>{ev.stopPropagation();const r=T.act();if(r&&window.__padFlash)window.__padFlash(r);e.classList.remove('ping');void e.offsetWidth;e.classList.add('ping');paint(T,e);
    if(ev.pointerType!=='mouse'){e.classList.add('lbl');clearTimeout(e._l);e._l=setTimeout(()=>e.classList.remove('lbl'),1600);}tapUntil=Math.max(tapUntil,performance.now()+4000);});
  layer.appendChild(e);EL[T.id]=e;return e;}
function paint(T,e){const lb=T.label();e.querySelector('span').textContent=lb;e.setAttribute('aria-label',lb);const off=!!(T.off&&T.off());if(e._off!==off){e._off=off;e.querySelector('img').src=off?IMG.off:IMG.toy;}}
/* ---------- which room: under the pointer, or the last one tapped ---------- */
function inPoly(p,x,y){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;}
function roomAtScreen(cx,cy){const V=G.view(),r=scr.getBoundingClientRect(),wx=V[0]+(cx-r.left)/r.width*V[2],wy=V[1]+(cy-r.top)/r.height*V[3];for(const [id,R] of Object.entries(M.rooms))if(inPoly(R.poly,wx,wy))return id;return null;}
let hoverRoom=null,tapRoom=null,tapUntil=0,allUntil=0;const seen=new Set();
let ptr=null,ptrT=0;const NEAR=80; /* r30: a reticle shows only near the pointer (or a recent tap), never all at once */
document.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){hoverRoom=roomAtScreen(e.clientX,e.clientY);ptr=[e.clientX,e.clientY];ptrT=performance.now();}},{passive:true});
scr.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){hoverRoom=null;ptr=null;}});
document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&!e.target.closest('.toy')){tapRoom=roomAtScreen(e.clientX,e.clientY);tapUntil=performance.now()+5000;ptr=[e.clientX,e.clientY];ptrT=performance.now();}},{passive:true,capture:true});
/* r86 · NO MARKS, SAME SWITCHES. The reticles are gone (r77) and they were the buttons, so nothing could be switched. Now the thing itself
   is the target: tap a lamp, the reactor, a console, the pumps, a hatch, the beacon, the bridge window, and it answers at once (the astronaut
   still drifts over, but nothing waits on that). Scout, the bots, the loose objects and the tank answer for themselves (game/life.js). */
const REACH={drive:120,bus:54,inner:60,outer:60,beacon:70};let dn=null;
function toyAt(wx,wy){let best=null;for(const T of TOYS){if(T.id==='k9'||(T.hide&&T.hide()))continue;let w=null;try{w=T.at();}catch(e){}if(!w)continue;const d=Math.hypot(w[0]-wx,(w[1]-wy)*(T.light?1.5:1)),R=REACH[T.id]||(T.light?60:74);if(d<R&&(!best||d/R<best.k))best={T,k:d/R};}return best&&best.T;}
function taken(wx,wy){try{const L=window.__life;if(L){const K=L.TANK;if(Math.abs(wx-K.x)<K.w/2+10&&wy>K.y-K.h-10&&wy<K.y+6)return true;for(const b of L.BOTS)if(Math.abs(wx-b.x)<44&&Math.abs(wy-(b.y-14))<40)return true;for(const f of L.FL)if(Math.hypot(f.x-wx,f.y-wy)<40)return true;}
  const k=CUT.actorAt(G.P,G.TIMES,G.now(),'k9');if(k&&Math.abs(wx-k.x)<46&&Math.abs(wy-(k.y-26))<44)return true;}catch(e){}return false;}
document.addEventListener('pointerdown',e=>{dn=[e.clientX,e.clientY,performance.now()];},{passive:true,capture:true});
document.addEventListener('click',e=>{const d=dn;dn=null;if(G.state!=='watch'||G.now()<11.4||document.body.classList.contains('photo')||document.body.classList.contains('bc'))return;
  const t=e.target;if(!t||!scr.contains(t)||(t.closest&&t.closest('button,a,.wui,.np,.about')))return;if(d&&(Math.hypot(e.clientX-d[0],e.clientY-d[1])>12||performance.now()-d[2]>600))return; /* a drag or a hold is leading the astronaut, not a tap */
  const V=G.view(),r=scr.getBoundingClientRect(),wx=V[0]+(e.clientX-r.left)/r.width*V[2],wy=V[1]+(e.clientY-r.top)/r.height*V[3];if(taken(wx,wy))return;const T=toyAt(wx,wy);if(!T)return;
  let m=null;try{m=T.act();}catch(_){}if(m){try{const el=document.querySelector('.toast');el&&el.classList.remove('jk');window.__gp&&__gp.toast(m,2.4);}catch(_){}}},true);
/* held sounds stop when you leave the ship (title, pause, options) and come back when you return */
let wasOn=false;
function tick(){const st=G.state,on=(st==='play'||st==='watch')&&!document.body.classList.contains('photo')&&!document.body.classList.contains('bc');layer.hidden=!on;
  if(on!==wasOn){wasOn=on;bed('rumble',on&&S.drive===2?.55:0,.6);if(!on)bed('hum',0,.3);}
  if(!on)return;
  const snd=A.soundOn();if(snd!==S.snd){S.snd=snd;bed('rumble',BED.rumble||0,.4);}
  const opening=st==='watch'&&G.now()<11.4; /* the hull is still closed: nothing inside to point at yet */
  const V=G.view(),r=scr.getBoundingClientRect(),now=performance.now(),room=now<tapUntil&&tapRoom?tapRoom:hoverRoom,all=!opening&&now<allUntil,live=new Set();
  const k9=CUT.actorAt(G.P,G.TIMES,G.now(),'k9'),k9Room=k9?CUT.roomOf(k9.x,k9.y-20):null;
  for(const T of TOYS){if(T.hide&&T.hide())continue;const w=T.at();if(!w)continue;const sx=(w[0]-V[0])/V[2]*r.width,sy=(w[1]-V[1])/V[3]*r.height;if(sx<8||sy<8||sx>r.width-8||sy>r.height-8)continue;
    const near=ptr&&(now-ptrT<(ptr&&now<tapUntil?5000:4000))&&Math.hypot(r.left+sx-ptr[0],r.top+sy-ptr[1])<NEAR*Math.max(.8,r.width/1280),show=all||(near&&!opening);const e=el(T);live.add(T.id);e.style.left=Math.round(sx)+'px';e.style.top=Math.round(sy)+'px';
    if(show){paint(T,e);if(!e.classList.contains('on')&&!seen.has(T.id)){seen.add(T.id);e.classList.add('ping');}}e.classList.toggle('on',show);}
  for(const [id,e] of Object.entries(EL))if(!live.has(id))e.classList.remove('on');}
setInterval(tick,90);
/* ---------- r39 · SCENES (Night Watch). One key; the camera never moves (the ant farm stays whole). A scene lights its room,
   sets the bed, changes the tape (when MUSIC is AUTO) and sends a crew member and K9 there for a while. RED ALERT is back:
   every lamp, the klaxon, the red wash. LIGHT steps WARM / LOW / OFF over whatever the scene lit. ---------- */
const SC=window.NW&&NW.SCENES||{watch:{name:'NIGHT WATCH'}};
const MOODS=Object.entries(SC).map(([id,v])=>({id,name:v.name}));
const LOOK={drift:{lights:{},def:null,drive:1,mix:{machinery:.7,ventilation:.9,radio:.8}},
  engine:{lights:{engineering:1,'central-shaft':.85},def:.45,drive:2,mix:{machinery:.7,ventilation:.8,radio:0}},
  sleep:{lights:{'crew-quarters':.8},def:.3,drive:1,mix:{machinery:.5,ventilation:.8,radio:.4}},
  outer:{lights:{eva:.5},def:.2,drive:1,mix:{machinery:.3,ventilation:.5,radio:.6}},
  busy:{lights:{},def:null,drive:1,mix:null}};
S.mood='drift';S.light='warm';
function lightsTo(map,def){ROOMS.forEach((r,i)=>{const v=map[r]!==undefined?map[r]:def;later(80+i*110,()=>{CUT.toy({room:{[r]:v}});S.lit[r]=v===null||v>0?1:0;A.sfx('relay',v===0?.9:.6);});});}
const MIXK=['machinery','ventilation','radio'];
function mixTo(o){if(!S.mix0){S.mix0={};for(const k of MIXK)S.mix0[k]=A.mix(k);}for(const k of MIXK){const v0=S.mix0[k]==null?.5:S.mix0[k];A.mix(k,o&&o[k]!=null?Math.min(1,v0*o[k]):v0);}if(!o)S.mix0=null;}
function applyLights(){const L=LOOK[S.mood]||LOOK.drift,f=S.light==='off'?0:S.light==='low'?.4:1;
  if(S.light==='warm'){lightsTo(L.lights,L.def);return;}
  const m={};for(const r of ROOMS){const v=L.lights[r]!==undefined?L.lights[r]:L.def;m[r]=f===0?0:(v===null?1:v)*f;}lightsTo(m,f===0?0:.4*f);}
/* someone wanders over: a crew member (not the one you're steering) and K9, by their own routes */
function visit(id){const sc=SC[id]||{};try{if(sc.who&&!(A.steering()&&A.me()===sc.who)){G.beat({actor:sc.who,move_to:sc.spot,interrupt:true});const tt=A.travel(sc.who,sc.spot);G.beat({at:tt+1,actor:sc.who,action:sc.pose,for:90+Math.random()*90});}
  if(sc.k9&&window.K9NAV&&!K9NAV.busy())K9NAV.go(sc.k9);}catch(e){}}
function mood(id,quiet){const was=S.mood;if(was===id)return;S.mood=id;CUT.toy({alert:0});
  if(!quiet)A.sfx('chunk',.7);const L=LOOK[id]||LOOK.drift;applyLights();driveTo(L.drive);mixTo(L.mix);
  if(A.watch()&&!quiet){const sc=SC[id]||{}; /* r51: a scene is lights and pace only; the music station plays on untouched */
    if(A.pace)A.pace(sc.pace||'routine');visit(id);if(A.nw){A.nw().scene=id;A.save();}}
  paintMood();}
function paintMood(){{const n=document.getElementById('wName');if(n&&document.body.classList.contains('watching'))n.textContent='DRIFTNAUT · '+(SC[S.mood]||SC.drift).name;}const b=document.getElementById('wMood');if(b){b.innerHTML='<s>SCENE<u> · </u></s>'+(SC[S.mood]||SC.drift).name;b.setAttribute('aria-label','Scene: '+(SC[S.mood]||SC.drift).name+' (tap for the next)');b.classList.toggle('on',S.mood!=='drift');}
  const l=document.getElementById('wLight');if(l){l.innerHTML='LIGHT<em> · '+S.light.toUpperCase()+'</em>';l.classList.toggle('on',S.light!=='warm');}}
function light(){const L=['warm','low','off'];S.light=L[(L.indexOf(S.light)+1)%3];A.sfx('chunk',.6);applyLights();paintMood();}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wMood,#wLight');if(!b)return;e.stopPropagation();
  if(b.id==='wLight'){light();return;}const i=MOODS.findIndex(m=>m.id===S.mood);mood(MOODS[(i+1)%MOODS.length].id);},true);
/* a new watch starts on NIGHT WATCH with warm light, so the ship's own start of shift (the rooms lighting one by one) plays untouched */
/* a new watch opens on its remembered scene: the ship's own start of shift plays first (rooms lighting one by one), then that scene's lights settle in */
let wasWatch=false;setInterval(()=>{const w=document.body.classList.contains('watching');if(w!==wasWatch){wasWatch=w;S.k9slept=0;
    if(w){const id=(A.nw&&A.nw().scene)||'drift';S.mood=id;S.light='warm';if(id!=='drift')setTimeout(()=>{if(document.body.classList.contains('watching')){const L=LOOK[id]||LOOK.drift;applyLights();driveTo(L.drive);mixTo(L.mix);}},13000);}
    else{mixTo(null);S.mood='drift';S.light='warm';}paintMood();}},400);
/* r39 · SOMEONE ELSE ABOARD. Very rarely in a Night Watch, Driftnaut is there: faint, somewhere the crew aren't, for a few
   seconds. The crew never notice. K9 does. The security monitor shows one more person than the roster, the ship's count is
   off by one, and then she isn't there. First after 8-20 minutes, then every 25-60. */
const HAUNT=['upper-access.window','quarters.locker','airlock.prep','engineering.end','lower-access.east','sensor.rack','comms.right','quarters.terminal'];
let nextHaunt=0,haunting=false;
function haunt(){if(window.__ghost)return; /* r63: she is always aboard now, not an apparition */
  const t=G.now();if(!A.watch()||G.state!=='watch'||haunting||(window.__joy&&__joy.sleeping&&__joy.sleeping()))return;
  try{const busy=new Set(['pilot','systems','commander'].map(a=>CUT.roomAt(G.P,G.TIMES,t,a)));const ok=HAUNT.filter(sp=>{const p=CUT.place(sp);return p&&!busy.has(CUT.roomOf(p.x,p.y-20));});
    const sp=ok.length?ok[Math.floor(Math.random()*ok.length)]:null,P=sp&&CUT.place(sp);if(!P)return;haunting=true;const D=14+Math.random()*12;
    G.beat({move:'deadscout',to:P.ref,teleport:true,interrupt:true});G.beat({at:.4,show:'deadscout'});G.beat({at:.6,actor:'deadscout',action:Math.random()<.5?'look-around':'observe',for:D});
    const k=CUT.actorAt(G.P,G.TIMES,t,'k9');if(k&&Math.abs(k.y-P.y)<40){G.beat({at:2.5,actor:'k9',do:'signal-detect',for:3.2,face:P.x<k.x?'left':'right'});setTimeout(()=>{try{A.chirp();}catch(e){}},3200);}
    G.beat({at:4,screen:'bridge.security',mode:'personnel',for:3});
    if(Math.random()<.6)setTimeout(()=>{if(A.watch())G.say('HOS',Math.random()<.5?'CREW: 3 · COUNT: 4':'OCCUPANCY: 4 · RECOUNT: 3',3);},6500);
    G.beat({at:D,hide:'deadscout'});setTimeout(()=>{haunting=false;},(D+1)*1000);}catch(e){haunting=false;}}
setInterval(()=>{if(!A.watch()){nextHaunt=0;return;}const t=G.now();if(!nextHaunt){nextHaunt=t+480+Math.random()*720;return;}if(t>nextHaunt){nextHaunt=t+1500+Math.random()*2100;haunt();}},5000);
window.__toys={mood,MOODS,S,TOYS,toyAt,light,haunt,resume:()=>{},shift:on=>{if(on==='dark'){LROOMS.forEach(r=>{S.lit[r]=0;CUT.toy({room:{[r]:0}});});return;}if(on){LROOMS.forEach(r=>{S.lit[r]=0;});allLights(true);}else allLights(false);}, /* r29: the start and end of a shift */
  sleepLights:on=>{if(on){lightsTo({'crew-quarters':.45},.12);mixTo({machinery:.4,ventilation:.85,radio:.3});}else{applyLights();mixTo((LOOK[S.mood]||LOOK.drift).mix);}},show:()=>{allUntil=performance.now()+6000;},room:r=>{tapRoom=r;tapUntil=performance.now()+6000;}};
})();
