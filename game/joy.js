/* DeadScout · JOY (release 28). The small pleasures of a ship left running: everything you click answers back, close-up
   sounds made in the page, a sleep bed, the ship's day following your clock, weather outside, and things you'd miss.
   One transparent pixel layer over the picture (the ship's own renderer is untouched), one quiet bus into the master,
   so SOUND, the float window and recordings all hear it. Nothing is stored but a visit count for the plant.

   1  POKES     screens, keyboards, lamps, props, the ladder, the stars, the crew. Each has a sound and a little effect;
                some have a rare one on the Nth click; the bridge glass fogs if you hold it; double-tap a floor and K9 comes.
   2  SOUND     the poke sounds (typing, a page, a cassette, a ratchet, velcro, a pressure seal ...), a brown-noise sleep
                bed, the crew murmuring when the bridge is in frame, rain-like ticks on the hull, room tone by camera.
   3  RHYTHM    the light tint follows your local time; an ice field, an aurora; K9 chases a floating bolt; Zz over the
                crew at night; the plant in the quarters grows one leaf for every day you come back. */
(function(){
"use strict";
const G=window.__game;if(!G||!window.CUT)return;
const stage=document.getElementById('stage'),scr=document.getElementById('screen');if(!stage||!scr)return;
const M=CUT.MAP,SS=CUT.SS||2;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const hour=()=>{const d=new Date();return d.getHours()+d.getMinutes()/60;};
const night=()=>{const h=hour();return h>=22||h<6;};
const live=()=>G.state==='watch'||G.state==='play';
const watching=()=>document.body.classList.contains('watching');

/* ============================== the layer ============================== */
const cv=document.createElement('canvas');cv.className='joy';cv.setAttribute('aria-hidden','true');stage.after(cv);const x=cv.getContext('2d');
const tint=document.createElement('div');tint.className='daytint';tint.setAttribute('aria-hidden','true');cv.after(tint);
const css=document.createElement('style');css.textContent=`
.joy,.daytint{position:absolute;pointer-events:none;image-rendering:pixelated}
.joy{z-index:2}.daytint{z-index:1;mix-blend-mode:multiply}.daytint.eased{transition:background-color 60s linear}
body.photo .joy,body.photo .daytint,body.bc .daytint{display:none}
#stage.poke{cursor:pointer!important}`;
document.head.appendChild(css);
let VW=0,VH=0,DPR=1;
function size(){DPR=Math.max(1,Math.min(2,window.devicePixelRatio||1));const w=stage.clientWidth,h=stage.clientHeight;
  for(const e of [cv,tint]){e.style.left=stage.offsetLeft+'px';e.style.top=stage.offsetTop+'px';e.style.width=w+'px';e.style.height=h+'px';}
  if(cv.width!==Math.round(w*DPR)||cv.height!==Math.round(h*DPR)){cv.width=Math.round(w*DPR);cv.height=Math.round(h*DPR);}VW=w;VH=h;}
window.addEventListener('resize',()=>setTimeout(size,60));size();setInterval(size,2000);
const view=()=>{try{return G.view();}catch(e){return [0,0,M.w,M.h];}};
const toWorld=(cx,cy)=>{const r=stage.getBoundingClientRect(),V=view();return [V[0]+(cx-r.left)/r.width*V[2],V[1]+(cy-r.top)/r.height*V[3]];};
/* world → layer pixels, and the size of one world pixel there */
let V=[0,0,1,1],K=1;const sx=wx=>(wx-V[0])*K,sy=wy=>(wy-V[1])*K;
const dot=(wx,wy,s,col,a)=>{const p=Math.max(1,Math.round(Math.max(s*K,s*DPR*1.15))); /* never smaller than ~a screen pixel per unit, even in the whole-ship view */x.globalAlpha=a==null?1:a;x.fillStyle=col;x.fillRect(Math.round(sx(wx)),Math.round(sy(wy)),p,p);};

/* ============================== 2 · sound ============================== */
let ac=null,out=null,nb=null;
function audio(){if(ac)return ac;const A=G.audio&&G.audio();if(!A||!A.ctx)return null;ac=A.ctx;out=ac.createGain();out.gain.value=.9;
  const soft=ac.createBiquadFilter();soft.type='lowpass';soft.frequency.value=7200;soft.Q.value=.4;out.connect(soft);soft.connect(A.out);  /* nothing sharp, ever */
  nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return ac;}
const panOf=wx=>{const v=view();return Math.max(-.85,Math.min(.85,((wx-(v[0]+v[2]/2))/(v[2]/2))*.8));};
function chain(pan){const p=ac.createStereoPanner();p.pan.value=pan||0;p.connect(out);return p;}
function env(g,t,a,d,peak){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setTargetAtTime(0,t+a,d/3);}
function noise(t,{f=1000,q=1,type='bandpass',dur=.1,gain=.05,att=.004,to=null,pan=0}){const s=ac.createBufferSource();s.buffer=nb;const fl=ac.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);fl.Q.value=q;
  if(to)fl.frequency.exponentialRampToValueAtTime(Math.max(40,to),t+dur);const g=ac.createGain();env(g,t,att,dur,gain);s.connect(fl);fl.connect(g);g.connect(chain(pan));s.start(t,Math.random()*1.5);s.stop(t+dur*1.6+.1);}
function tone(t,{f=440,type='sine',dur=.3,gain=.04,att=.003,to=null,pan=0}){const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+dur);
  const g=ac.createGain();env(g,t,att,dur,gain);o.connect(g);g.connect(chain(pan));o.start(t);o.stop(t+dur*1.6+.1);}
const SND={
  tick:(p)=>{const t=ac.currentTime;noise(t,{f:rnd(2600,3600),q:5,dur:.012,gain:.05,pan:p});},
  crt:(p)=>{const t=ac.currentTime;tone(t,{f:62,to:34,dur:.28,gain:.07,pan:p});noise(t+.01,{f:1900,q:2,dur:.06,gain:.04,pan:p});tone(t+.02,{f:6100,dur:.5,gain:.006,att:.05,pan:p});},
  typing:(p,n)=>{const t=ac.currentTime;let u=0;for(let i=0;i<(n||rnd(5,9));i++){u+=rnd(.055,.13);noise(t+u,{f:rnd(2200,3800),q:3,dur:.018,gain:rnd(.035,.06),pan:p});noise(t+u,{f:300,q:1,type:'lowpass',dur:.02,gain:.03,pan:p});}},
  page:(p)=>{const t=ac.currentTime;noise(t,{f:700,to:3200,q:.7,dur:.32,gain:.06,att:.03,pan:p});noise(t+.18,{f:2400,to:900,q:.8,dur:.18,gain:.03,pan:p});},
  cassette:(p)=>{const t=ac.currentTime;noise(t,{f:1500,q:3,dur:.02,gain:.11,pan:p});noise(t+.08,{f:1100,q:3,dur:.025,gain:.09,pan:p});noise(t+.12,{f:380,q:.8,type:'lowpass',dur:.7,gain:.025,att:.05,pan:p});},
  ratchet:(p)=>{const t=ac.currentTime;let u=0,g=.11;for(let i=0;i<9;i++){u+=g;g*=.86;noise(t+u,{f:2300,q:6,dur:.012,gain:.06,pan:p});}},
  velcro:(p)=>{const t=ac.currentTime;for(let i=0;i<26;i++)noise(t+i*.018+rnd(0,.006),{f:rnd(2000,3400),q:1.4,dur:.012,gain:.035*(1-i/32),pan:p});},
  seal:(p)=>{const t=ac.currentTime;tone(t,{f:70,to:40,dur:.3,gain:.08,pan:p});noise(t+.05,{f:2200,q:.5,type:'highpass',dur:1.6,gain:.05,att:.03,pan:p});},
  rustle:(p)=>{const t=ac.currentTime;for(let i=0;i<12;i++)noise(t+rnd(0,.45),{f:rnd(3500,5500),q:2,dur:.02,gain:.02,pan:p});},
  creak:(p)=>{const t=ac.currentTime;tone(t,{f:rnd(85,110),to:rnd(130,170),type:'sawtooth',dur:.5,gain:.012,att:.06,pan:p});},
  thud:(p)=>{const t=ac.currentTime;tone(t,{f:85,to:42,dur:.26,gain:.16,pan:p});noise(t,{f:260,q:.8,type:'lowpass',dur:.1,gain:.06,pan:p});},
  clank:(p)=>{const t=ac.currentTime;for(const [f,g] of [[420,.05],[1130,.03],[1870,.018]])tone(t,{f:f*rnd(.97,1.03),dur:.7,gain:g,pan:p});},
  drip:(p)=>{const t=ac.currentTime;tone(t,{f:rnd(800,1000),to:rnd(1500,1900),dur:.06,gain:.05,pan:p});},
  chime:(p,f)=>{const t=ac.currentTime;tone(t,{f,dur:1.8,gain:.035,att:.004,pan:p});tone(t,{f:f*2.01,dur:.9,gain:.01,pan:p});},
  pour:(p)=>{const t=ac.currentTime;noise(t,{f:600,to:1500,q:1.2,dur:1.5,gain:.04,att:.12,pan:p});for(let i=0;i<7;i++)SND.dripAt(t+rnd(.2,1.4),p,.025);},
  dripAt:(t,p,g)=>tone(t,{f:rnd(700,1100),to:rnd(1300,1800),dur:.05,gain:g||.04,pan:p}),
  servo:(p)=>{const t=ac.currentTime;tone(t,{f:200,to:320,type:'sawtooth',dur:.7,gain:.01,att:.05,pan:p});tone(t+.8,{f:1320,dur:1.2,gain:.02,pan:p});},
  latch:(p)=>{const t=ac.currentTime;noise(t,{f:2000,q:4,dur:.02,gain:.08,pan:p});for(let i=1;i<4;i++)noise(t+i*.045,{f:1600,q:4,dur:.015,gain:.03,pan:p});},
  swish:(p)=>{const t=ac.currentTime;noise(t,{f:600,to:2000,q:.8,dur:.25,gain:.04,att:.08,pan:p});noise(t+.25,{f:2000,to:700,q:.8,dur:.3,gain:.025,pan:p});},
  puff:(p)=>{const t=ac.currentTime;noise(t,{f:900,q:.6,type:'lowpass',dur:.4,gain:.07,att:.02,pan:p});},
  hum:(p)=>{const t=ac.currentTime;tone(t,{f:55,dur:2.6,gain:.07,att:.6,pan:p});tone(t,{f:110.5,dur:2.4,gain:.03,att:.6,pan:p});},
  ting:(p,f)=>{const t=ac.currentTime;for(const [m,g] of [[1,.04],[2.42,.018],[3.9,.008]])tone(t,{f:f*m,dur:.9,gain:g,pan:p});},
  squeak:(p)=>{const t=ac.currentTime;tone(t,{f:1300,to:900,type:'triangle',dur:.12,gain:.04,pan:p});tone(t+.14,{f:1500,to:1100,type:'triangle',dur:.1,gain:.03,pan:p});},
  breath:(p)=>{const t=ac.currentTime;noise(t,{f:500,q:.5,type:'lowpass',dur:1.4,gain:.05,att:.5,pan:p});},
  snore:(p)=>{const t=ac.currentTime;for(const u of [0,2.4])noise(t+u,{f:240,q:2,dur:1,gain:.03,att:.4,pan:p});},
};
function play(name,wx,extra){if(!audio()||ac.state!=='running')return;try{SND[name](wx==null?0:panOf(wx),extra);}catch(e){}}

/* the beds: brown noise for sleep, the crew's murmur on the bridge, rain on the hull */
let brownG=null,murG=null;
function beds(){if(brownG||!audio())return;
  {const n=ac.sampleRate*4,b=ac.createBuffer(2,n,ac.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);let v=0;for(let i=0;i<n;i++){v=(v+.02*(Math.random()*2-1))/1.02;d[i]=v*3.2;}}
    const s=ac.createBufferSource();s.buffer=b;s.loop=true;const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=620;brownG=ac.createGain();brownG.gain.value=0;s.connect(lp);lp.connect(brownG);brownG.connect(out);s.start();}
  {const s=ac.createBufferSource();s.buffer=nb;s.loop=true;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=420;bp.Q.value=1.1;const am=ac.createGain();am.gain.value=.5;
    const l=ac.createOscillator();l.frequency.value=3.3;const lg=ac.createGain();lg.gain.value=.5;l.connect(lg);lg.connect(am.gain);l.start();
    const l2=ac.createOscillator();l2.frequency.value=.21;const lg2=ac.createGain();lg2.gain.value=.35;l2.connect(lg2);lg2.connect(am.gain);l2.start();
    murG=ac.createGain();murG.gain.value=0;s.connect(bp);bp.connect(am);am.connect(murG);murG.connect(out);s.start();}}
const fade=(g,v,secs)=>{if(g)g.gain.setTargetAtTime(v,ac.currentTime,Math.max(.05,secs/3));};

/* ============================== 1 · pokes ============================== */
const POKES=[];let lastOn=null;
const add=(o)=>POKES.push(Object.assign({n:0,r:26},o));
const spot=(ref,dy)=>()=>{const p=CUT.place(ref);return p?[p.x,p.y+(dy||0)]:null;};
const at=(X,Y)=>()=>[X,Y];
/* every monitor: a flicker and a new readout; every fifth, it reboots. The keyboard under a wide one types */
const MODES=['idle-grid','waveform','text-terminal','signal-bars'];
for(const [id,[x0,y0,x1,y1]] of Object.entries(M.screens||{})){const cx=(x0+x1)/2,cy=(y0+y1)/2;
  add({id:'scr:'+id,at:at(cx,cy),r:Math.max(14,(x1-x0)/2+4),hit:[x0-4,y0-4,x1+4,y1+4],act(p){play('crt',cx);const boot=p.n%5===0;
    G.run(boot?['+0 screen '+id+' boot for 3s','+3 screen '+id+' '+pick(MODES)+' for 12s']:['+0 screen '+id+' noise for 0.4s','+0.4 screen '+id+' '+pick(MODES)+' for 10s']);spark(cx,cy,'#7ee3e5',4);}});
  if(x1-x0>=28&&!/airlock|quarters/.test(id))add({id:'kb:'+id,at:at(cx,y1+11),r:14,hit:[x0,y1+3,x1,y1+20],act(){play('typing',cx);G.run(['+0 screen '+id+' text-terminal for 6s']);}});}
/* the lamps: a tube that blinks and settles */
for(const [i,L] of (M.lamps||[]).entries())if(!L.warn)add({id:'lamp:'+i,at:at(L.x,L.y),r:16,act(){play('tick',L.x);setTimeout(()=>play('tick',L.x),90);flash(L.x,L.y+4,'255,190,110');}});
/* the props, found by eye on the art */
add({id:'plant',at:at(912,652),r:24,act(p){play('rustle',912);for(let i=0;i<5;i++)drop(912+rnd(-10,10),640,'#7ec4d8');if(p.n%5===0){bloom=performance.now();play('chime',912,1046);}}});
add({id:'bunk-top',at:at(585,700),r:34,act(p){play('swish',585);sway(585,700);if(p.n%5===0){play('snore',585);zz(560,690,3);}}});
add({id:'bunk-low',at:at(585,790),r:30,act(){play('page',585);for(let i=0;i<3;i++)mote(585+rnd(-6,6),785,'#e9d7c2',1.2);}});
add({id:'desk',at:at(805,800),r:22,act(){play('cassette',805);note(805,770);}});
add({id:'lockers',at:at(928,760),r:46,act(p){play('latch',928);shake(928,760);if(p.n%4===0){setTimeout(()=>play('thud',928),300);fall(940,700,'#c37b43');try{G.beat({actor:'k9',do:'scan',for:2.5});}catch(e){}}}});
add({id:'vent-q',at:at(655,678),r:16,act(){play('puff',655);for(let i=0;i<10;i++)mote(655+rnd(-8,8),684,'#c6ab92',.9);}});
add({id:'window',at:at(500,415),r:150,hit:[250,365,770,465],act(p){play('chime',500,pick([784,880,988,1175]));glint(rnd(270,750),rnd(375,455));if(p.n%7===0)star();},hold(){fog=performance.now();play('breath',500);}});
add({id:'chair-b',at:at(520,492),r:18,act(){play('creak',520);}});
add({id:'cabinet-b',at:at(760,432),r:18,act(){play('latch',760);}});
add({id:'notes-c',at:at(1690,400),r:22,act(){play('rustle',1690);for(let i=0;i<2;i++)fall(1690+rnd(-10,10),395,'#e9d7c2',.6);}});
add({id:'mug',at:at(1780,468),r:28,act(p){const [X,Y]=p.at();if(p.n%3===0){play('pour',X);setTimeout(()=>{play('drip',X);for(let i=0;i<6;i++)fall(X+rnd(-6,6),Y+6,'#8d4012',1.3);},700);G.say('HOS','BEVERAGE INCIDENT · COMMS · NO INJURIES',3.2);}else{play('pour',X);steam(X,Y-10,9);}}});
add({id:'chair-c',at:at(1585,500),r:18,act(){play('creak',1585);}});
add({id:'reactor',at:at(1720,760),r:70,act(p){play('hum',1720);for(let i=0;i<8;i++)spark(1720+rnd(-40,40),760+rnd(-20,20),'#ffb04a',1);if(p.n%6===0){play('seal',1720);steam(1690,705,24);G.say('HOS','CORE TEMPERATURE · NOMINAL · PLEASE STOP THAT',3.4);}}});
add({id:'pipes-e',at:at(1470,630),r:30,act(){play('clank',1470);setTimeout(()=>{play('drip',1470);drop(1470,645,'#7ec4d8');},500);}});
add({id:'crates-s',at:at(795,1060),r:34,act(p){play('thud',795);shake(795,1060);if(p.n%5===0){duck=performance.now();play('squeak',795);}}});
add({id:'valve-s',at:at(945,985),r:20,act(){play('ratchet',945);spin=performance.now();}});
add({id:'hatch-a',at:at(1625,1018),r:46,act(){play('seal',1625);steam(1575,1060,10);steam(1675,1060,10);}});
add({id:'suit1',at:at(1760,1030),r:20,act(p){play('velcro',1760);sway(1760,1000);}});
add({id:'suit2',at:at(1806,1030),r:20,act(p){play('velcro',1806);sway(1806,1000);if(p.n%3===0)G.say('HOS','EVA SUIT 2 · OCCUPANT: NONE',2.8);}});
add({id:'lockers-a',at:at(1505,1010),r:30,act(){play('latch',1505);shake(1505,1010);}});
add({id:'dish',at:at(2170,965),r:30,act(){play('servo',2170);ring(2170,965);}});
add({id:'crates-e',at:at(2100,1080),r:22,act(){play('thud',2100);}});
/* the ladder in the shaft is an instrument: the higher you tap, the higher the note */
const PENTA=[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.5,1567.98];
add({id:'ladder',at:at(1290,850),r:20,hit:[1268,585,1312,1115],act(p,wx,wy){const u=1-(wy-585)/530,f=PENTA[Math.max(0,Math.min(8,Math.round(u*8)))];play('ting',1290,f);spark(1290,wy,'#ffb04a',2);}});

/* the crew: a glance, a line */
const CREW={pilot:'PILOT',systems:'SYSTEMS',commander:'COMMANDER'};
const LINES={pilot:["Couldn't sleep either?","Still here.","Heading's good.","Hm?","Coffee's on comms."],systems:["Readings are fine. Mostly.","Don't touch the reactor.","Shh. Listening.","Huh."],
  commander:["Go to sleep.","All quiet.","Carry on.","...","Log it."]};
const NIGHTL={pilot:["Late watch.","Stars look close tonight."],systems:["Third shift is the best shift."],commander:["Lights down, crew."]};
function crewAt(wx,wy){if(!G.P)return null;const t=G.now();let rep;try{rep=CUT.report(G.P,G.TIMES,t);}catch(e){return null;}
  for(const a of Object.keys(CREW)){if(!rep[a]||rep[a]==='GONE'||rep[a]==='—')continue;const s=CUT.actorAt(G.P,G.TIMES,t,a);if(!s)continue;if(Math.abs(wx-s.x)<15*SS&&wy<s.y+4&&wy>s.y-62*SS)return {a,s};}return null;}
const crewN={};
function poke_crew(c){const n=crewN[c.a]=(crewN[c.a]||0)+1,L=(night()&&Math.random()<.5?NIGHTL:LINES)[c.a];play('tick',c.s.x);
  if(!c.s.walk){try{G.beat({actor:c.a,do:c.a==='systems'?'look-up':'look-around',for:2});}catch(e){}}
  if(n%4!==0)G.say(CREW[c.a],L[(n-1)%L.length],2.6);else{G.say(CREW[c.a],c.a==='commander'?'...fine. Hello.':'Hi.',2.4);}}

/* ============================== effects ============================== */
const FX=[];const now=()=>performance.now()/1000;
const P_=o=>FX.push(Object.assign({t0:now()},o));
function spark(X,Y,col,n){for(let i=0;i<(n||5);i++)P_({k:'p',x:X,y:Y,vx:rnd(-40,40),vy:rnd(-70,-20),g:110,life:rnd(.6,1.1),col,s:2.6});}
function pop(X,Y,col){P_({k:'pop',x:X,y:Y,col:col||'#7ee3e5',life:.75});} /* every poke: a small pixel ring, so nothing is ever silent to the eye */
function mote(X,Y,col,life){P_({k:'p',x:X,y:Y,vx:rnd(-10,10),vy:rnd(-14,4),g:-2,life:(life||1)*rnd(2,3.5),col,s:2.2,a:.8});}
function drop(X,Y,col){P_({k:'p',x:X,y:Y,vx:rnd(-4,4),vy:rnd(0,10),g:160,life:1.1,col,s:2.6});}
function fall(X,Y,col,s){P_({k:'p',x:X,y:Y,vx:rnd(-12,12),vy:-20,g:120,life:1.2,col,s:(s||1)*2.4});}
function steam(X,Y,n){for(let i=0;i<n*2;i++)P_({k:'p',x:X+rnd(-6,6),y:Y,vx:rnd(-6,6),vy:rnd(-30,-14),g:-4,life:rnd(2.4,4),col:'#e9d7c2',s:rnd(2.6,4),a:.5,delay:i*.09});}
function flash(X,Y,col){P_({k:'glow',x:X,y:Y,col,life:.5,r:40});}
function glint(X,Y){P_({k:'glint',x:X,y:Y,life:.9});}
function ring(X,Y){P_({k:'ring',x:X,y:Y,life:1.4});}
function note(X,Y){P_({k:'note',x:X,y:Y,vx:rnd(-6,6),vy:-22,g:0,life:1.6});}
function zz(X,Y,n){for(let i=0;i<(n||1);i++)P_({k:'z',x:X+i*6,y:Y,vx:6,vy:-14,g:0,life:2.6,delay:i*.7});}
const SHK={};function shake(X,Y){SHK[X+','+Y]={t0:now(),x:X,y:Y};}
const SWY={};function sway(X,Y){SWY[X]={t0:now(),x:X,y:Y};}
let fog=0,bloom=0,duck=0,spin=0;
function star(){P_({k:'star',x:rnd(300,1900),y:rnd(20,130),vx:-rnd(420,600),vy:rnd(40,90),life:1.4});play('chime',1100,1568);setTimeout(()=>play('chime',900,1318.5),160);setTimeout(()=>play('chime',700,1046.5),320);}

/* ============================== 3 · rhythm ============================== */
/* the plant: one more leaf for every day you come back (kept here, in this browser) */
let leaves=0;try{const J=JSON.parse(localStorage.getItem('ds.joy')||'{}'),today=new Date().toDateString();if(J.last!==today){J.days=(J.days||0)+1;J.last=today;localStorage.setItem('ds.joy',JSON.stringify(J));}leaves=Math.min(16,J.days||1);}catch(e){leaves=1;}
const LEAF=[[0,-4],[-3,-7],[3,-8],[-5,-11],[5,-12],[-1,-14],[-6,-16],[4,-17],[0,-20],[-4,-22],[6,-22],[-7,-25],[2,-26],[-2,-29],[7,-28],[0,-32]];
/* weather and moments, scheduled loosely */
let wx_={k:null,t0:0,until:0},nextWx=now()+rnd(240,480),nextBolt=now()+rnd(420,900),bolt=null,nextZ=0,nextTick=now()+rnd(4,10),lastAmb='';
const ICE=Array.from({length:46},()=>({x:Math.random(),y:Math.random(),s:Math.random(),v:rnd(.6,1.4)}));
function rhythm(t){
  /* the ship's day, from your clock */
  const h=hour(),mix=(a,b,u)=>a.map((v,i)=>Math.round(v+(b[i]-v)*Math.max(0,Math.min(1,u))));
  const DAY=[238,244,255],EVE=[255,232,204],NIGHT=[240,222,214];
  const c=h<6?NIGHT:h<8?mix(NIGHT,DAY,(h-6)/2):h<17?DAY:h<20?mix(DAY,EVE,(h-17)/3):h<22?mix(EVE,NIGHT,(h-20)/2):NIGHT;
  tint.style.backgroundColor=`rgb(${c[0]},${c[1]},${c[2]})`;if(!tint.classList.contains('eased'))requestAnimationFrame(()=>tint.classList.add('eased')); /* right at once, then it eases with the hour */
  if(!live()||!watching())return;
  /* weather outside */
  if(!wx_.k&&t>nextWx&&!sleeping()){wx_={k:pick(['ice','aurora']),t0:t,until:t+rnd(80,140)};}
  if(wx_.k&&t>wx_.until){wx_.k=null;nextWx=t+rnd(600,1200);}
  /* K9 and the floating bolt */
  if(!bolt&&t>nextBolt&&!sleeping()&&G.state==='watch'){const k=CUT.actorAt(G.P,G.TIMES,G.now(),'k9');if(k){bolt={x:k.x+rnd(120,180)*(Math.random()<.5?-1:1),y:k.y-40,t0:t,hop:0};k9to(bolt.x,k.y);nextBolt=t+rnd(720,1200);}}
  if(bolt){const u=t-bolt.t0;if(u>5&&bolt.hop===0){bolt.hop=1;bolt.x+=rnd(60,100)*(Math.random()<.5?-1:1);const k=CUT.actorAt(G.P,G.TIMES,G.now(),'k9');if(k)k9to(bolt.x,k.y);}
    if(u>10&&bolt.hop===1){bolt.hop=2;try{G.beat({actor:'k9',do:'scan',for:3});}catch(e){}try{G.toyApi().chirp();}catch(e){}}if(u>13)bolt=null;}
  /* Zz over a crew member who isn't going anywhere, at night or while you sleep */
  if((night()||sleeping())&&t>nextZ){nextZ=t+rnd(5,9);for(const a of ['commander','pilot','systems']){try{const s=CUT.actorAt(G.P,G.TIMES,G.now(),a),r=CUT.report(G.P,G.TIMES,G.now())[a];if(s&&!s.walk&&r&&r!=='GONE'&&Math.random()<.5){zz(s.x+10,s.y-58*SS,1);break;}}catch(e){}}}
  /* sound by camera: the room in the middle of the frame sets the ambience; the crew murmur on the bridge; rain on the hull */
  if(audio()){beds();const v=view(),zoomed=v[2]<M.w*.72,cx=v[0]+v[2]/2,cy=v[1]+v[3]/2;let room=null;try{room=zoomed?CUT.roomOf(cx,cy):null;}catch(e){}
    const key=room||'*';if(key!==lastAmb){lastAmb=key;try{G.amb(room);}catch(e){}}
    let mur=0;if(!sleeping()&&(!zoomed||room==='bridge')){try{const r=CUT.report(G.P,G.TIMES,G.now());mur=['pilot','systems','commander'].filter(a=>r[a]&&r[a]!=='GONE'&&CUT.roomAt(G.P,G.TIMES,G.now(),a)==='bridge').length>=2?(zoomed?.022:.009):0;}catch(e){}}
    fade(murG,mur,3);
    if(t>nextTick){nextTick=t+(sleeping()?rnd(8,18):rnd(4,11));if(!zoomed||room==='eva'){const n=Math.floor(rnd(2,6)),X=rnd(v[0],v[0]+v[2]);for(let i=0;i<n;i++)setTimeout(()=>{if(audio())noise(ac.currentTime,{f:rnd(1800,3200),q:4,dur:.01,gain:.012,pan:panOf(X+rnd(-200,200))});},i*rnd(60,180));}}}}
function k9to(X,Y){try{const h=CUT.pick(G.P,G.TIMES,G.now(),X,Y-4);if(h&&h.type==='place')G.beat({move:'k9',to:h.ref,interrupt:true,fast:true});}catch(e){}}
let sleepOn=false;const sleeping=()=>sleepOn;

/* ============================== drawing ============================== */
const SPACE=M.space||[];
function draw(){requestAnimationFrame(draw);if(!VW)return;V=view();K=cv.width/V[2];x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cv.width,cv.height);x.imageSmoothingEnabled=false;if(!live()&&G.state!=='photo')return;
  const t=now();
  /* weather, clipped to open space */
  if(wx_.k){const u=(t-wx_.t0)/(wx_.until-wx_.t0),a=Math.min(1,u*4,(1-u)*4);x.save();x.beginPath();for(const [a0,b0,a1,b1] of SPACE)x.rect(sx(a0),sy(b0),(a1-a0)*K,(b1-b0)*K);x.clip();
    if(wx_.k==='ice')for(const q of ICE){const X=M.w*(1-((q.x+u*q.v*1.6)%1)),Y=q.y*M.h;dot(X,Y,1+q.s*2.4,q.s>.7?'#c8dce6':'#6f8796',.65*a);}
    if(wx_.k==='aurora'){x.globalCompositeOperation='lighter';for(let i=0;i<16;i++){const X=1560+i*52,h=90+60*Math.sin(t*.5+i*.9),A=.06*a*(.6+.4*Math.sin(t*1.3+i*1.7));
      const g=x.createLinearGradient(0,sy(0),0,sy(h+120));g.addColorStop(0,`rgba(120,255,200,0)`);g.addColorStop(.6,`rgba(120,255,200,${A})`);g.addColorStop(1,`rgba(90,190,255,0)`);x.fillStyle=g;x.fillRect(sx(X),sy(0),40*K,(h+140)*K);}x.globalCompositeOperation='source-over';}
    x.restore();}
  /* the plant's new leaves, and its flower */
  for(let i=0;i<leaves;i++){const [dx,dy]=LEAF[i],X=912+dx,Y=652+dy+Math.sin(t*1.1+i)*.4;dot(X-1,Y-1,4,'#0b0e11');dot(X,Y,2.2,i%3?'#7fa05a':'#a8c27a');}
  if(bloom&&t-bloom/1000<30){const Y=652-34;dot(911,Y-1,4.4,'#0b0e11');dot(912,Y,2.4,'#ff9aa8');}
  /* the bolt K9 is chasing */
  if(bolt){const u=t-bolt.t0,X=bolt.x+Math.sin(u*1.7)*6,Y=bolt.y+Math.sin(u*2.3)*5-u*1.5;dot(X-1,Y-1,5,'#0b0e11',.9);dot(X,Y,3,'#9a9897');dot(X,Y,1.4,'#e9eef5');}
  /* a duck in the crates */
  if(duck&&t-duck/1000<6){const u=t-duck/1000,Y=1032-Math.min(14,u*40);dot(793,Y-1,6,'#0b0e11');dot(794,Y,4,'#ffd24a');dot(798,Y+1,2,'#e47a1e');}
  /* the bridge glass, breathed on */
  if(fog){const u=(t-fog/1000)/6;if(u<1){const g=x.createRadialGradient(sx(500),sy(415),0,sx(500),sy(415),120*K);g.addColorStop(0,`rgba(210,225,230,${.28*(1-u)})`);g.addColorStop(1,'rgba(210,225,230,0)');x.fillStyle=g;x.fillRect(sx(380),sy(365),240*K,100*K);}else fog=0;}
  /* the valve in the service tunnel, still turning */
  if(spin&&t-spin/1000<1.5){const u=t-spin/1000,a=u*14;for(let i=0;i<4;i++){const ang=a+i*Math.PI/2;dot(945+Math.cos(ang)*8,985+Math.sin(ang)*8,2,'#c37b43',1-u/1.5);}}
  /* shakes and sways: small corner ticks where the thing moved */
  for(const k in SHK){const s=SHK[k],u=t-s.t0;if(u>.5){delete SHK[k];continue;}const o=Math.sin(u*60)*2*(1-u/.5);dot(s.x-26+o,s.y-30,2,'#c6ab92',.8);dot(s.x+24+o,s.y-30,2,'#c6ab92',.8);}
  for(const k in SWY){const s=SWY[k],u=t-s.t0;if(u>2.4){delete SWY[k];continue;}const o=Math.sin(u*5)*3*(1-u/2.4);for(let j=0;j<5;j++)dot(s.x+o*(j/4),s.y+j*5,1.6,'#e9d7c2',.35*(1-u/2.4));}
  /* particles */
  for(let i=FX.length-1;i>=0;i--){const p=FX[i],u0=t-p.t0-(p.delay||0);if(u0<0)continue;const u=u0/p.life;if(u>=1){FX.splice(i,1);continue;}
    if(p.k==='p'){const X=p.x+p.vx*u0,Y=p.y+p.vy*u0+.5*p.g*u0*u0;dot(X,Y,p.s,p.col,(p.a||1)*(1-u*u));}
    else if(p.k==='glow'){x.globalCompositeOperation='lighter';const g=x.createRadialGradient(sx(p.x),sy(p.y),0,sx(p.x),sy(p.y),p.r*K);const A=.3*(u<.2?u/.2:1-(u-.2)/.8)*(Math.floor(u0*14)%2?1:.5);g.addColorStop(0,`rgba(${p.col},${A})`);g.addColorStop(1,`rgba(${p.col},0)`);x.fillStyle=g;x.fillRect(sx(p.x-p.r),sy(p.y-p.r),2*p.r*K,2*p.r*K);x.globalCompositeOperation='source-over';}
    else if(p.k==='pop'){const R=6+u*20,A=1-u;for(let j=0;j<10;j++){const a=j/10*Math.PI*2;dot(p.x+Math.cos(a)*R,p.y+Math.sin(a)*R,1.8,p.col,A);}}
    else if(p.k==='glint'){const A=1-u,s=u<.5?u*2:1;for(const [dx,dy] of [[0,0],[-3*s,0],[3*s,0],[0,-3*s],[0,3*s]])dot(p.x+dx,p.y+dy,1.6,'#e9eef5',A);}
    else if(p.k==='ring'){x.globalAlpha=(1-u)*.7;x.strokeStyle='#7ee3e5';x.lineWidth=Math.max(1,Math.round(1.4*K));x.beginPath();x.arc(sx(p.x),sy(p.y),(10+u*70)*K,0,Math.PI*2);x.stroke();}
    else if(p.k==='note'){const X=p.x+p.vx*u0+Math.sin(u0*5)*3,Y=p.y+p.vy*u0;const A=1-u;dot(X,Y,2.4,'#ffb04a',A);dot(X+2,Y-6,1.4,'#ffb04a',A);dot(X+2,Y-3,1.4,'#ffb04a',A);}
    else if(p.k==='z'){const X=p.x+p.vx*u0+Math.sin(u0*2)*3,Y=p.y+p.vy*u0,A=Math.min(1,u*4)*(1-u),c='#c6ab92';for(const [a,b] of [[0,0],[2,0],[4,0],[2,2],[0,4],[2,4],[4,4]])dot(X+a,Y+b,1.6,c,A);}
    else if(p.k==='star'){const X=p.x+p.vx*u0,Y=p.y+p.vy*u0;for(let j=0;j<14;j++)dot(X-p.vx*j*.012,Y-p.vy*j*.012,j?1.6:2.6,j?'#c8dce6':'#ffffff',(1-j/14)*(1-u));}}
  /* the thing under the pointer: four corner ticks */
  if(hov&&live()){const p=hov,[X,Y]=p.at()||[0,0],R=Math.min(p.r,60),c=performance.now()%1000<500?'#7ee3e5':'#4fb7bb';for(const [ax,ay] of [[-1,-1],[1,-1],[-1,1],[1,1]]){dot(X+ax*R-(ax>0?4:0),Y+ay*R-(ay>0?1.6:0),1.6,c,.8);dot(X+ax*R-(ax>0?1.6:0),Y+ay*R-(ay>0?4:0),1.6,c,.8);dot(X+ax*R+(ax>0?-4:2),Y+ay*R-(ay>0?1.6:0),1.6,c,.8);}}
  x.globalAlpha=1;}
requestAnimationFrame(draw);setInterval(()=>rhythm(now()),1000);

/* ============================== input ============================== */
function hitAt(wx,wy){let best=null,bd=1e9;for(const p of POKES){const a=p.at();if(!a)continue;let d;
    if(p.hit){const [x0,y0,x1,y1]=p.hit;if(wx<x0||wx>x1||wy<y0||wy>y1)continue;d=Math.hypot(wx-a[0],wy-a[1])*.2;}else{d=Math.hypot(wx-a[0],wy-a[1]);if(d>p.r)continue;}
    if(d<bd){bd=d;best=p;}}return best;}
const inSpace=(wx,wy)=>SPACE.some(([a0,b0,a1,b1])=>wx>=a0&&wx<=a1&&wy>=b0&&wy<=b1);
let hov=null,lastHovT=0,holdT=null,lastFloor=0;
function k9Near(wx,wy){try{const k=CUT.actorAt(G.P,G.TIMES,G.now(),'k9');return k&&Math.abs(k.x-wx)<36&&wy<k.y+6&&wy>k.y-70;}catch(e){return false;}}
stage.addEventListener('pointermove',e=>{if(!live()||e.pointerType==='touch'){return;}const [wx,wy]=toWorld(e.clientX,e.clientY),c=crewAt(wx,wy),p=c?null:hitAt(wx,wy);
  const on=p||(c?{at:()=>[c.s.x,c.s.y-30*SS],r:34,id:'crew:'+c.a}:null);stage.classList.toggle('poke',!!on||k9Near(wx,wy));
  if((on&&on.id)!==(hov&&hov.id)){hov=on;const tt=performance.now();if(on&&tt-lastHovT>140){lastHovT=tt;audio();if(ac&&ac.state==='running')noise(ac.currentTime,{f:4200,q:6,dur:.006,gain:.012,pan:panOf(wx)});}}});
stage.addEventListener('pointerleave',()=>{hov=null;stage.classList.remove('poke');});
stage.addEventListener('pointerdown',e=>{if(!live())return;audio();const [wx,wy]=toWorld(e.clientX,e.clientY);if(k9Near(wx,wy))return; /* K9 is the game's: it chirps */
  const c=crewAt(wx,wy);if(c){poke_crew(c);pop(c.s.x,c.s.y-64*SS,'#e9d7c2');return;}
  const p=hitAt(wx,wy);
  if(p){p.n++;{const a=p.at();if(a)pop(p.id==='ladder'?1290:a[0],p.id==='ladder'?wy:a[1],/^(scr|kb|lamp)/.test(p.id)?'#7ee3e5':'#ffb04a');}if(p.hold){clearTimeout(holdT);holdT=setTimeout(()=>{holdT=null;p.hold(p);},650);}try{p.act(p,wx,wy);}catch(err){}lastOn=p;return;}
  if(inSpace(wx,wy)){play('chime',wx,PENTA[Math.max(0,Math.min(8,Math.floor(wx/M.w*9)))]);glint(wx,wy);return;}
  /* a floor, twice quickly, in a watch: K9 comes and sits */
  if(G.state==='watch'){const tt=performance.now();if(tt-lastFloor<450){try{const k=CUT.actorAt(G.P,G.TIMES,G.now(),'k9'),h=CUT.pick(G.P,G.TIMES,G.now(),wx,wy);
      if(k&&h&&h.type==='place'&&Math.abs(CUT.place(h.ref).y-k.y)<60){G.beat({move:'k9',to:h.ref,interrupt:true,fast:true});const tr=CUT.travelTime('k9',CUT.hereRef(G.P,G.TIMES,G.now(),'k9'),h.ref)||2;G.beat({at:tr+.4,actor:'k9',do:'wait',for:24});setTimeout(()=>{try{G.toyApi().chirp();}catch(e){}},(tr+.4)*1000);}}catch(err){}lastFloor=0;}else lastFloor=tt;}});
window.addEventListener('pointerup',()=>{clearTimeout(holdT);holdT=null;});

/* ============================== sleep, from the game ============================== */
window.__joy={sleep(on){sleepOn=!!on;audio();beds();if(brownG)fade(brownG,on?.055:0,on?30:6);if(on)fade(murG,0,4);},play,pokes:POKES,leaves:()=>leaves};
})();
