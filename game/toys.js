/* DeadScout · the ship's toys (Nov 2026). Things aboard HALCYON you can just click: the drive, the lights, the radio, the
   tape deck, the bridge sweep, the viewport, the service pumps, the EVA beacon, K9. Toys, not chores: none of them is
   needed for the story and all of them can be played with forever. Unread crew logs show as amber discovery marks; a click
   walks her there. Marks are drawn as a small HALCYON reticle and only appear when wanted: near the pointer on desktop, for a
   few seconds after a tap on touch. The rule: if it physically exists aboard, control it in the scene. */
(function(){
"use strict";
const G=window.__game;if(!G||!window.CUT)return;const A=G.toyApi(),scr=document.getElementById('screen'),M=CUT.MAP;if(!scr)return;
const N=k=>M.nodes[k];
/* ---------- the toys: where they are (world px) and what they do ---------- */
const S={drive:true,light:0,radio:false,beacon:false};
const TOYS=[
 {id:'drive',at:()=>[N('e-reactor')[0],N('e-reactor')[1]-80],label:()=>S.drive?'DRIVE · ON':'DRIVE · OFF',act(){S.drive=!S.drive;A.sfx('breaker',.9);
   if(S.drive){setTimeout(()=>A.sfx('machinery',.8),250);setTimeout(()=>A.sfx('motor',.6),900);A.mix('engine',S.engMix||.55);}else{S.engMix=A.mix('engine')||.55;A.sfx('k9down',.7);A.mix('engine',.08);}
   CUT.toy({drive:S.drive?1:0});return S.drive?'DRIVE SPOOLING UP':'DRIVE · STANDBY';}},
 {id:'lights',at:()=>[N('q-door')[0]-24,N('q-door')[1]-96],label:()=>['LIGHTS · NORMAL','LIGHTS · LOW','LIGHTS · EMERGENCY'][S.light],act(){S.light=(S.light+1)%3;A.sfx('click',.8);setTimeout(()=>A.sfx('latch',.5),120);CUT.toy({light:S.light});return ['LIGHTING · NORMAL','LIGHTING · LOW','LIGHTING · EMERGENCY'][S.light];}},
 {id:'radio',at:()=>[N('c-right')[0],N('c-right')[1]-84],label:()=>S.radio?'RADIO · ON':'RADIO · OFF',act(){S.radio=!S.radio;A.sfx('click',.7);
   if(S.radio){S.radMix=A.mix('radio')||.1;A.mix('radio',.55);A.hero('comms');clearTimeout(S.rt);S.rt=setTimeout(function catchOne(){if(!S.radio)return;if(Math.random()<.45)A.note(['CARRIER · 1420 MHz · NO VOICE','…STATION SEVEN… …REPEAT…','NUMBERS · 4 · 1 · 7 · 4 · 1 · 7','BEACON · 2291 · NO REPLY','A VOICE · TOO FAINT · LOST'][Math.floor(Math.random()*5)],6);A.hero('comms');S.rt=setTimeout(catchOne,40000+Math.random()*50000);},14000);}
   else{A.mix('radio',S.radMix||.1);clearTimeout(S.rt);}return S.radio?'DEEP-SPACE RADIO · LISTENING':'RADIO · OFF';}},
 {id:'deck',at:()=>[N('q-term')[0]+6,N('q-term')[1]-74],label:()=>'TAPE DECK',hide:()=>A.watch(),act(){const r=G.music.next();if(!r)return null;if(!G.music.on())G.music.set(true);A.sfx('latch',.7);return '▶ TAPE '+String(r.n).padStart(2,'0')+' · '+r.name;}},
 {id:'sweep',at:()=>[N('b-nav')[0],N('b-nav')[1]-78],label:()=>'SENSOR SWEEP',act(){A.sfx('crt',.8);G.run(['+0 screen bridge.nav waveform for 6s','+0 screen bridge.left signal-bars for 6s','+0 screen bridge.security idle-grid for 6s','+0 screen sensor.main waveform for 6s','+2 screen bridge.nav signal for 3s']);setTimeout(()=>A.sfx('blip',.6),2000);return 'SWEEP · NOTHING OUT THERE';}},
 {id:'view',at:()=>[N('b-window')[0]-30,N('b-window')[1]-110],label:()=>'VIEWPORT',act(){A.sfx('servo',.6);G.toyApi().look(10);return 'LOOKING OUT';}},
 {id:'pumps',at:()=>[N('sv-mid')[0],N('sv-mid')[1]-70],label:()=>'SERVICE PUMPS',act(){A.sfx('valve',.8);setTimeout(()=>A.sfx('pump',.8),500);setTimeout(()=>A.sfx('release',.6),3600);return 'PUMPS CYCLING';}},
 {id:'beacon',at:()=>{const n=M.navlights&&M.navlights[M.navlights.length-1];return n?[n[0],n[1]+14]:[N('eva-antenna')[0],N('eva-antenna')[1]-120];},label:()=>S.beacon?'BEACON · ON':'BEACON · OFF',act(){S.beacon=!S.beacon;A.sfx('click',.7);if(S.beacon)setTimeout(()=>A.sfx('ping',.4),200);CUT.toy({beacon:S.beacon?1:0});return S.beacon?'EVA BEACON · STROBING':'EVA BEACON · OFF';}},
 {id:'k9',at:()=>{const k=CUT.actorAt(G.P,G.TIMES,G.now(),'k9');return k?[k.x,k.y-50]:null;},label:()=>'K9-4',hide:()=>{const r=CUT.report(G.P,G.TIMES,G.now()).k9;return !r||r==='GONE';},act(){A.chirp();return '♪';}}];
/* discovery: the crew logs still unread, at the things they left behind */
function discoveries(){if(A.watch()||!window.SHIPCON)return [];const f=A.logs(),here=CUT.roomAt?CUT.roomAt(G.P,G.TIMES,G.now(),A.me()):null;const used=[];return SHIPCON.LOGS.filter(l=>!f.includes(l.id)&&M.objects[l.at]).map(l=>{const O=M.objects[l.at],[room,spot]=O.spot.split('.'),sp=M.spots[room]&&M.spots[room][spot],n=sp&&M.nodes[sp[0]];
  if(!n||(here&&room!==here&&!(room==='crew-quarters'&&here==='quarters')))return null; /* only the room she is in: a few marks, not a hidden-object screen */
  let y=n[1]-70;for(const T of TOYS){if(T.id==='k9')continue;const w=T.at();if(w&&Math.abs(w[0]-n[0])<60&&Math.abs(w[1]-y)<50)y=w[1]-56;}
  let x=n[0];while(used.some(u=>Math.abs(u[0]-x)<64&&Math.abs(u[1]-y)<50))x+=68;used.push([x,y]);
  return n?{id:'log-'+l.id,disc:true,obj:l.at,at:()=>[x,y],label:()=>(O.name||'SOMETHING HERE'),act(){A.go(l.at);return null;}}:null;}).filter(Boolean);}
/* ---------- the reticle: four corner brackets and a dot, drawn in pixels ---------- */
function ret(col){const c=document.createElement('canvas');c.width=15;c.height=15;const x=c.getContext('2d');x.fillStyle=col;const p=(X,Y)=>x.fillRect(X,Y,1,1);
  for(let i=0;i<4;i++){p(1+i,1);p(1,1+i);p(13-i,1);p(13,1+i);p(1+i,13);p(1,13-i);p(13-i,13);p(13,13-i);}p(7,7);p(6,7);p(8,7);p(7,6);p(7,8);return c.toDataURL();}
const IMG={toy:ret('#7ee3e5'),disc:ret('#ffb04a')};
const css=document.createElement('style');css.textContent=`
.toys{position:absolute;inset:0;pointer-events:none;z-index:3}
.toys[hidden]{display:none}
.toy{position:absolute;width:calc(30px*var(--tz,1));height:calc(30px*var(--tz,1));margin:calc(-15px*var(--tz,1)) 0 0 calc(-15px*var(--tz,1));padding:0;border:0;background:none;cursor:pointer;opacity:0;transition:opacity .25s steps(3);pointer-events:none;-webkit-tap-highlight-color:transparent}
.toy img{width:100%;height:100%;image-rendering:pixelated;display:block;filter:drop-shadow(0 1px 0 #0b0e11)}
.toy.on{opacity:.9;pointer-events:auto}.toy.on:hover,.toy:focus-visible{opacity:1}
.toy.ping img{animation:tping .6s steps(4) 1}
@keyframes tping{0%{transform:scale(1.6)}100%{transform:scale(1)}}
.toy span{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:3px;font-family:Silk,monospace;font-size:calc(8px*var(--tz,1));letter-spacing:2px;color:#e9d7c2;background:rgba(11,14,17,.85);padding:2px 6px;white-space:nowrap;opacity:0;transition:opacity .2s steps(2)}
.toy.disc span{color:#ffb04a}
.toy:hover span,.toy:focus-visible span{opacity:1}
body.photo .toys,body.bc .toys{display:none!important}`;
document.head.appendChild(css);
const layer=document.createElement('div');layer.className='toys';layer.setAttribute('aria-label','Things aboard');scr.appendChild(layer);
const EL={};
function el(T){let e=EL[T.id];if(e)return e;e=document.createElement('button');e.type='button';e.className='toy'+(T.disc?' disc':'');e.innerHTML='<img alt=""><span></span>';e.querySelector('img').src=T.disc?IMG.disc:IMG.toy;
  e.addEventListener('pointerdown',ev=>{ev.stopPropagation();});
  e.addEventListener('click',ev=>{ev.stopPropagation();const r=T.act();if(r&&window.__padFlash)window.__padFlash(r);e.classList.remove('ping');void e.offsetWidth;e.classList.add('ping');e.querySelector('span').textContent=T.label();});
  layer.appendChild(e);EL[T.id]=e;return e;}
/* ---------- when they show ---------- */
let px=-1e4,py=-1e4,tapUntil=0;const seen=new Set();
document.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){px=e.clientX;py=e.clientY;}},{passive:true});
document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')tapUntil=performance.now()+4000;},{passive:true,capture:true});
function tick(){const st=G.state,on=(st==='play'||st==='watch')&&!document.body.classList.contains('photo')&&!document.body.classList.contains('bc');layer.hidden=!on;if(!on)return;
  const V=G.view(),r=scr.getBoundingClientRect(),list=TOYS.concat(discoveries()),live=new Set(),near=Math.max(110,r.width*.09),touchAll=performance.now()<tapUntil;
  for(const T of list){if(T.hide&&T.hide())continue;const w=T.at();if(!w)continue;const sx=(w[0]-V[0])/V[2]*r.width,sy=(w[1]-V[1])/V[3]*r.height;if(sx<8||sy<8||sx>r.width-8||sy>r.height-8)continue;
    const e=el(T);live.add(T.id);e.style.left=Math.round(sx)+'px';e.style.top=Math.round(sy)+'px';const d=Math.hypot(r.left+sx-px,r.top+sy-py),show=touchAll||d<near;
    if(show&&!e.classList.contains('on')){e.querySelector('span').textContent=T.label();if(!seen.has(T.id)){seen.add(T.id);e.classList.add('ping');}}e.classList.toggle('on',show);}
  for(const [id,e] of Object.entries(EL))if(!live.has(id))e.classList.remove('on');}
setInterval(tick,90);
window.__toys={S,TOYS,show:()=>{tapUntil=performance.now()+6000;}};
})();
