/* DeadScout · TOWN (release 33). HALCYON remembers her crew, and she keeps herself: the little residents that make a
   watch look like a busy town on a derelict research ship. Everything here is drawn in the ship's own art pixels (one
   pixel = SS world units) on a transparent layer, and every sound is made in the page, panned to where it happens and
   quieter when the camera is far away.

   RESIDENTS  ceiling crawlers that service the light tubes · a floor scrubber in engineering (K9 has opinions about it)
              · a welding arm over the engine · pneumatic capsules in the shaft tube · a cargo trolley in the service
              tunnel · coolant pulses in the pipes · the recycler's thump · the crew's footsteps and the ladder rungs
   CREW PROPS from the watch schedule (watch.js `props`): a crate, a mug, a tablet carried; sleepers and readers in the
              bunks, breathing.
   The pace follows the watch's mood: QUIET parks most of them, BUSY runs them all. In SLEEP they settle. */
(function(){
"use strict";
const G=window.__game;if(!G||!window.CUT)return;
const stage=document.getElementById('stage');if(!stage)return;
const M=CUT.MAP,SS=CUT.SS||2;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const watching=()=>G.state==='watch'&&document.body.classList.contains('watching');
const live=()=>G.state==='watch'||G.state==='play';
const W=()=>{try{return G.watch&&G.watch();}catch(e){return null;}};
const mood=()=>{const w=W();return w&&w.cfg?w.cfg.activity:'routine';};
const pace=()=>({quiet:.35,routine:1,strange:.7,busy:2.4})[mood()]||1;          /* how often things happen */
const asleep=()=>!!(window.__joy&&__joy.sleeping&&__joy.sleeping());
const now=()=>{try{return G.now();}catch(e){return 0;}};

/* ============================== the layer ============================== */
const cv=document.createElement('canvas');cv.className='town';cv.setAttribute('aria-hidden','true');stage.after(cv);const x=cv.getContext('2d');
const css=document.createElement('style');css.textContent=`.town{position:absolute;pointer-events:none;image-rendering:pixelated;z-index:2}body.photo .town{display:none}
body.layered .joy,body.layered .daytint,body.layered .town{opacity:0}`;document.head.appendChild(css);
(window.__layers=window.__layers||[]).unshift(cv);   /* recordings composite the layers (game.js): residents are in the take */
function size(){const D=Math.max(1,Math.min(2,window.devicePixelRatio||1)),w=stage.clientWidth,h=stage.clientHeight;cv.style.left=stage.offsetLeft+'px';cv.style.top=stage.offsetTop+'px';cv.style.width=w+'px';cv.style.height=h+'px';
  if(cv.width!==Math.round(w*D)||cv.height!==Math.round(h*D)){cv.width=Math.round(w*D);cv.height=Math.round(h*D);}}
window.addEventListener('resize',()=>setTimeout(size,60));size();setInterval(size,2000);
let V=[0,0,M.w,M.h],K=1;const view=()=>{try{return G.view();}catch(e){return [0,0,M.w,M.h];}};
const snap=(v,u)=>Math.round(v/(u||SS))*(u||SS);
const U=SS*3;   /* residents are drawn in double art pixels: they have to read on the full ship, at YouTube size */
/* one art pixel at a world point */
function px(wx,wy,col,a,u){const X=Math.round((wx-V[0])*K),Y=Math.round((wy-V[1])*K),s=Math.max(1,Math.round((u||SS)*K));if(X<-s||Y<-s||X>cv.width||Y>cv.height)return;x.globalAlpha=a==null?1:a;x.fillStyle=col;x.fillRect(X,Y,s,s);}
/* a little sprite: rows of characters, bottom-centre at (wx,wy), mirrored when flip */
function blit(rows,pal,wx,wy,flip,a,u){u=u||U;const h=rows.length,w=rows[0].length,X0=snap(wx,SS)-Math.floor(w/2)*u,Y0=snap(wy,SS)-h*u;
  for(let j=0;j<h;j++){const r=rows[j];for(let i=0;i<w;i++){const c=r[flip?w-1-i:i];if(c==='.'||c===' ')continue;px(X0+i*u,Y0+j*u,pal[c]||c,a,u);}}}
const inView=(wx,wy,m)=>{m=m||40;return wx>V[0]-m&&wx<V[0]+V[2]+m&&wy>V[1]-m&&wy<V[1]+V[3]+m;};
const zoom=()=>M.w/V[2];
/* how loud a thing is from where the camera is: nothing off-screen, a little on the full ship, full when close */
const aud=(wx,wy)=>inView(wx,wy,0)?Math.min(1,.28*zoom()):0;

/* ============================== sound ============================== */
let ac=null,out=null,nb=null;
function audio(){if(ac)return ac;const A=G.audio&&G.audio();if(!A||!A.ctx)return null;ac=A.ctx;out=ac.createGain();out.gain.value=.85;
  const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=6400;out.connect(lp);lp.connect(A.out);
  nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return ac;}
const ok=()=>audio()&&ac.state==='running'&&(G.state==='watch'||G.state==='play');
const panOf=wx=>Math.max(-.85,Math.min(.85,((wx-(V[0]+V[2]/2))/(V[2]/2))*.8));
function env(g,t,a,d,peak){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setTargetAtTime(0,t+a,d/3);}
function chain(pan){const p=ac.createStereoPanner();p.pan.value=pan||0;p.connect(out);return p;}
function noise(t,{f=1000,q=1,type='bandpass',dur=.1,gain=.05,att=.004,to=null,pan=0}){if(gain<.0005)return;const s=ac.createBufferSource();s.buffer=nb;const fl=ac.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);fl.Q.value=q;
  if(to)fl.frequency.exponentialRampToValueAtTime(Math.max(40,to),t+dur);const g=ac.createGain();env(g,t,att,dur,gain);s.connect(fl);fl.connect(g);g.connect(chain(pan));s.start(t,Math.random()*1.5);s.stop(t+dur*1.6+.1);}
function tone(t,{f=440,type='sine',dur=.3,gain=.04,att=.003,to=null,pan=0}){if(gain<.0005)return;const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+dur);
  const g=ac.createGain();env(g,t,att,dur,gain);o.connect(g);g.connect(chain(pan));o.start(t);o.stop(t+dur*1.6+.1);}
const S={
  servo:(X,v)=>{const t=ac.currentTime;tone(t,{f:rnd(380,460),to:rnd(520,600),type:'triangle',dur:.35,gain:.012*v,att:.04,pan:panOf(X)});},
  chirp2:(X,v)=>{const t=ac.currentTime;tone(t,{f:1480,dur:.08,gain:.022*v,pan:panOf(X)});tone(t+.13,{f:1900,dur:.1,gain:.02*v,pan:panOf(X)});},
  brush:(X,v)=>{noise(ac.currentTime,{f:rnd(700,1100),q:.7,dur:.18,gain:.012*v,att:.05,pan:panOf(X)});},
  step:(X,v,soft)=>{const t=ac.currentTime;noise(t,{f:rnd(150,220),q:.9,type:'lowpass',dur:.05,gain:(soft?.02:.034)*v,pan:panOf(X)});noise(t+.004,{f:rnd(1100,1500),q:2.5,dur:.01,gain:.006*v,pan:panOf(X)});},
  rung:(X,v)=>{const t=ac.currentTime;tone(t,{f:rnd(620,700),dur:.16,gain:.009*v,pan:panOf(X)});noise(t,{f:900,q:3,dur:.015,gain:.012*v,pan:panOf(X)});},
  weld:(X,v)=>{const t=ac.currentTime;for(let i=0;i<5;i++)noise(t+rnd(0,.25),{f:rnd(2600,5200),q:.8,type:'highpass',dur:rnd(.015,.05),gain:rnd(.01,.026)*v,pan:panOf(X)});noise(t,{f:3800,q:.4,dur:.3,gain:.006*v,att:.05,pan:panOf(X)});},
  whoosh:(X,v,up)=>{const t=ac.currentTime;noise(t,{f:up?500:1800,to:up?1800:500,q:1.1,dur:2.2,gain:.03*v,att:.6,pan:panOf(X)});},
  thunk:(X,v)=>{const t=ac.currentTime;tone(t,{f:96,to:52,dur:.22,gain:.06*v,pan:panOf(X)});noise(t,{f:1300,q:3,dur:.02,gain:.03*v,pan:panOf(X)});noise(t+.05,{f:700,q:.6,type:'lowpass',dur:.5,gain:.02*v,att:.04,pan:panOf(X)});},
  rumble:(X,v)=>{noise(ac.currentTime,{f:rnd(110,150),q:.7,type:'lowpass',dur:.34,gain:.02*v,att:.08,pan:panOf(X)});},
  squeak:(X,v)=>{const t=ac.currentTime;tone(t,{f:rnd(1700,2100),to:rnd(1300,1500),type:'triangle',dur:.09,gain:.008*v,pan:panOf(X)});},
  recycler:(X,v)=>{const t=ac.currentTime;for(const u of [0,.42]){tone(t+u,{f:58,to:36,dur:.4,gain:.07*v,pan:panOf(X)});noise(t+u,{f:240,q:.7,type:'lowpass',dur:.16,gain:.03*v,pan:panOf(X)});}noise(t+.9,{f:600,q:.5,type:'lowpass',dur:1.2,gain:.012*v,att:.3,pan:panOf(X)});},
  page:(X,v)=>{const t=ac.currentTime;noise(t,{f:700,to:3000,q:.7,dur:.3,gain:.02*v,att:.03,pan:panOf(X)});},
  snore:(X,v)=>{noise(ac.currentTime,{f:230,q:2,dur:1.1,gain:.016*v,att:.45,pan:panOf(X)});},
  sip:(X,v)=>{const t=ac.currentTime;noise(t,{f:900,to:1600,q:1.4,dur:.25,gain:.012*v,att:.06,pan:panOf(X)});}};
const play=(k,X,Y,...a)=>{if(!ok())return;const v=aud(X,Y);if(v<=0)return;try{S[k](X,v,...a);}catch(e){}};

/* ============================== palette and sprites ============================== */
const P={'#':'#0b0e11',g:'#4a4f56',G:'#7d838a',h:'#b4b8bb',a:'#ffb04a',A:'#c15c15',c:'#7ee3e5',C:'#2f7f86',r:'#ff5a4a',o:'#c37b43',O:'#e47a1e',b:'#8d4012',w:'#e9d7c2',s:'#c6ab92',n:'#2e3134',y:'#ffd24a',k:'#14181c'};
const CRAWL=[["#.#.#.#","#ggggg#","gGGhGGg","#gagGg#",".#####."],["##.#.##","#ggggg#","gGGhGGg","#gagGg#",".#####."]];   /* hangs from the ceiling; legs on the rail */
const SCRUB=["..#####..",".#GhhhG#.","#gggcggg#","#########"];
const TROLLEY=["..#######...","..#ooOoo#...","..#obbbo#...","..#ooOoo#.##","############","#GGGGGGGGGG#",".#k#....#k#."];
const CAPS=["#y#","yay","yay","yAy","#y#"];
const CRATE=["########","#oOoooO#","#obbbbo#","#oOoooO#","########"],MUG=["##","w#","ww"],TAB=["####","#cc#","####"];

/* ============================== residents ============================== */
const R=[];
/* the ceiling crawlers: along a room's ceiling, stopping under each light tube to service it */
const lampsIn=room=>(M.lamps||[]).filter(l=>l.room===room&&!l.warn).map(l=>l.x);
function crawler(room,y,x0,x1,need){const L=lampsIn(room);return {k:'crawl',room,y,x0,x1,need:need||0,x:rnd(x0,x1),to:null,wait:rnd(2,8),dir:1,svc:0,lamps:L};}
R.push(crawler('comms',306,1452,1828),crawler('crew-quarters',600,492,1030),crawler('sensor',306,826,1124,1),crawler('bridge',306,330,792,2));
/* the floor scrubber in engineering, and in BUSY a second one in the airlock bay */
R.push({k:'scrub',y:846,x0:1440,x1:1990,x:1520,to:null,wait:4,dir:1,trail:[],nextK9:0,need:0},{k:'scrub',y:1119,x0:1486,x1:1850,x:1700,to:null,wait:9,dir:-1,trail:[],nextK9:0,need:2});
/* the cargo trolley in the service tunnel */
R.push({k:'trolley',y:1119,x0:842,x1:1150,x:1100,to:null,wait:20,dir:-1,need:0,rum:0});
const ARM={ax:1668,ay:598,u:0,state:'idle',next:now()+rnd(40,90),until:0,sparks:[]};               /* the welding arm over the engine */
const TUBE={x:1376,top:318,bot:1098,cap:null,next:now()+rnd(25,60)};                               /* the pneumatic capsule line in the shaft */
const PIPES=[{x0:1410,x1:1680,y:648,col:'126,227,229',v:46,next:0,list:[]},{x0:860,x1:1094,y:933,col:'255,160,80',v:30,next:0,list:[]}]; /* coolant, warm water */
let nextRecy=now()+rnd(40,80);
const FX=[];
const fx=o=>{if(FX.length<240)FX.push(Object.assign({t0:now()},o));};

function moveWalker(o,t,dt,speed){
  if(o.need>(mood()==='busy'?2:mood()==='quiet'||mood()==='strange'?0:1)){o.parked=true;return;}o.parked=false;
  if(asleep()&&o.k!=='crawl'){return;}
  if(o.to==null){o.wait-=dt*pace();if(o.wait<=0){o.to=o.lamps&&o.lamps.length&&Math.random()<.6?pick(o.lamps):rnd(o.x0,o.x1);if(Math.abs(o.to-o.x)<8)o.to=o.x+(o.x>(o.x0+o.x1)/2?-40:40);
      o.dir=o.to>o.x?1:-1;if(o.k==='crawl')play('servo',o.x,o.y);if(o.k==='trolley')play('squeak',o.x,o.y);}return;}
  const d=o.to-o.x,st=Math.sign(d)*Math.min(Math.abs(d),speed*dt);o.x+=st;o.moved=(o.moved||0)+Math.abs(st);
  if(Math.abs(o.to-o.x)<.5){o.x=o.to;o.to=null;
    if(o.k==='crawl'){const lamp=o.lamps.some(l=>Math.abs(l-o.x)<2);o.wait=lamp?rnd(7,14):rnd(3,9);if(lamp){o.svc=t+o.wait-1;}}
    else o.wait=o.k==='trolley'?rnd(25,60):rnd(4,12);}}

function tick(dt){const t=now();if(!live()||!watching()){return;}
  const busy=mood()==='busy';
  for(const o of R){
    if(o.k==='crawl'){moveWalker(o,t,dt,7);if(o.svc&&t<o.svc&&Math.random()<dt*3)fx({k:'spark',x:o.x+rnd(-3,3),y:o.y+34,vx:rnd(-12,12),vy:rnd(5,25),g:40,life:rnd(.4,.8),col:pick(['#7ee3e5','#c8ffff'])});
      if(o.svc&&t<o.svc&&Math.random()<dt*.8)play('servo',o.x,o.y);if(o.svc&&t>=o.svc){o.svc=0;fx({k:'flash',x:o.x,y:o.y+36,life:.6});}}
    else if(o.k==='scrub'){
      /* K9 and the scrubber: when they meet, the scrubber stops and beeps, K9 looks it over and chirps back */
      let k=null;try{k=CUT.actorAt(G.P,G.TIMES,t,'k9');}catch(e){}
      if(k&&!k.walk&&Math.abs(k.y-o.y)<4&&Math.abs(k.x-o.x)<34&&o.to!=null){o.to=o.x-o.dir*rnd(40,90);o.dir=-o.dir;}   /* it goes around K9 rather than through */
      if(k&&!k.walk&&!o.parked&&Math.abs(k.y-o.y)<4&&Math.abs(k.x-o.x)<80&&t>o.nextK9&&!asleep()&&!(window.K9NAV&&K9NAV.busy())){o.nextK9=t+(busy?120:260);o.to=null;o.wait=7;o.beep=t;play('chirp2',o.x,o.y);
        setTimeout(()=>{try{G.beat({actor:'k9',do:'scan',for:2.6});}catch(e){}},700);setTimeout(()=>{try{G.toyApi().chirp();}catch(e){}},2200);setTimeout(()=>play('chirp2',o.x,o.y),3300);}
      const x0=o.x;moveWalker(o,t,dt,13);if(o.x!==x0){if(!o.lastT||Math.abs(o.x-o.lastT)>U){o.trail.push({x:snap(o.x-o.dir*16,U),t});o.lastT=o.x;if(o.trail.length>120)o.trail.shift();}
        o.br=(o.br||0)+dt;if(o.br>.3){o.br=0;play('brush',o.x,o.y);}}}
    else if(o.k==='trolley'){const x0=o.x;moveWalker(o,t,dt,10);if(o.x!==x0){o.rum+=dt;if(o.rum>.36){o.rum=0;play('rumble',o.x,o.y);if(Math.random()<.08)play('squeak',o.x,o.y);}}}}
  /* the welding arm */
  if(ARM.state==='idle'&&t>ARM.next&&!asleep()){ARM.state='out';}
  if(ARM.state==='out'){ARM.u=Math.min(1,ARM.u+dt/2.2);if(ARM.u>=1){ARM.state='weld';ARM.until=t+rnd(6,12);}}
  if(ARM.state==='weld'){if(Math.random()<dt*7){const n=Math.floor(rnd(2,5));for(let i=0;i<n;i++)fx({k:'spark',x:1694,y:700,vx:rnd(-40,40),vy:rnd(-50,-10),g:150,life:rnd(.5,1.1),col:pick(['#ffd24a','#ffb04a','#ffffff']),bounce:712});}
    if(Math.random()<dt*4)play('weld',1694,700);if(t>ARM.until)ARM.state='in';}
  if(ARM.state==='in'){ARM.u=Math.max(0,ARM.u-dt/2.6);if(ARM.u<=0){ARM.state='idle';ARM.next=t+rnd(60,150)/pace();}}
  /* the capsule line */
  if(!TUBE.cap&&t>TUBE.next&&!asleep()){const up=Math.random()<.5;TUBE.cap={t0:t,up,dur:2.4};play('whoosh',TUBE.x,up?TUBE.bot:TUBE.top,up);play('thunk',TUBE.x,up?TUBE.bot:TUBE.top);}
  if(TUBE.cap&&t-TUBE.cap.t0>TUBE.cap.dur){const c=TUBE.cap;TUBE.cap=null;const Y=c.up?TUBE.top:TUBE.bot;play('thunk',TUBE.x,Y);for(let i=0;i<5;i++)fx({k:'puff',x:TUBE.x+rnd(-6,6),y:Y+(c.up?6:-6),vx:rnd(-10,10),vy:rnd(-6,6),life:rnd(.6,1.2)});TUBE.next=t+rnd(70,180)/pace();}
  /* the pipes: a pulse every few seconds */
  for(const p of PIPES){if(t>p.next){p.list.push({t0:t,len:rnd(3,6)});p.next=t+rnd(2.5,7)/Math.min(2,pace());}p.list=p.list.filter(q=>(t-q.t0)*p.v<(p.x1-p.x0)+20);}
  /* the recycler, under the floor of the service tunnel */
  if(t>nextRecy){nextRecy=t+rnd(55,130)/Math.min(1.6,pace());play('recycler',960,1060);for(let i=0;i<4;i++)fx({k:'dust',x:rnd(760,1170),y:884,vx:rnd(-2,2),vy:rnd(10,20),life:rnd(2,3.5)});}
  crewSounds(t,dt);}

/* footsteps on the decking, rungs on the ladder */
const STEP={};
function crewSounds(t,dt){if(asleep())return;for(const a of ['pilot','systems','commander','deadscout']){let s=null;try{s=CUT.actorAt(G.P,G.TIMES,t,a);}catch(e){}if(!s){continue;}
  const st=STEP[a]||(STEP[a]={x:s.x,y:s.y,d:0});const dx=Math.abs(s.x-st.x),dy=Math.abs(s.y-st.y);st.x=s.x;st.y=s.y;if(dx+dy>80){st.d=0;continue;}
  if(s.walk){st.d+=dx;if(st.d>(s.sneak?26:34)){st.d=0;play('step',s.x,s.y,!!s.sneak);}}
  else if(s.climb){st.d+=dy;if(st.d>18){st.d=0;play('rung',s.x,s.y);}}else st.d=0;}}

/* ============================== crew props from the schedule ============================== */
const BUNK={pilot:{hx:575,y:705,col:'#4d2613'},systems:{hx:575,y:788,col:'#14181c'}};
function propsNow(t){const w=W(),L=(w&&w.man&&w.man.props)||[];const carry={},bunk={};for(const p of L){if(p.at>t)break;if(p.carry)carry[p.carry]=p.prop;if(p.bunk){if(t<p.until)bunk[p.bunk]=p;else delete bunk[p.bunk];}}return {carry,bunk};}
let lastBunkSnd=0;
function drawProps(t){if(!watching())return;const {carry,bunk}=propsNow(t);let rep={};try{rep=CUT.report(G.P,G.TIMES,t);}catch(e){}
  for(const a in carry){const pr=carry[a];if(!pr||rep[a]==='GONE')continue;let s=null;try{s=CUT.actorAt(G.P,G.TIMES,t,a);}catch(e){}if(!s)continue;
    const f=s.walk?(s.left?-1:1):(s.face==='left'?-1:1);
    if(s.climb){if(pr==='crate')blit(CRATE,P,s.x,s.y-62,false,1,SS*1.5);continue;}                                       /* on her back up the ladder */
    if(pr==='crate')blit(CRATE,P,s.x+f*12,s.y-42,f<0,1,SS*1.5);
    else if(pr==='mug'){blit(MUG,P,s.x+f*14,s.y-50,f<0,1,SS*1.5);if(Math.random()<.04)fx({k:'steam',x:s.x+f*13,y:s.y-60,vx:rnd(-2,2),vy:rnd(-10,-6),life:rnd(1,1.8)});if(!s.walk&&Math.random()<.002)play('sip',s.x,s.y);}
    else if(pr==='tablet'){blit(TAB,P,s.x+f*14,s.y-54,f<0,1,SS*1.5);px(snap(s.x+f*12),snap(s.y-60),'#c8ffff',.6+.3*Math.sin(t*3));}}
  /* the bunks: who's asleep or reading, under a blanket that breathes */
  for(const a in bunk){const B=BUNK[a],p=bunk[a];if(!B)continue;const br=Math.sin(t*1.5+(a==='pilot'?0:2))>.55?1:0;
    const Y=B.y,hx=B.hx,u=SS*2;
    /* the blanket: a long low shape with a shoulder and a knee, outlined so it reads on the full ship; it rises as they breathe */
    for(let X=hx+8;X<hx+112;X+=u){const rel=(X-hx-8)/104,top=rel<.06?3:rel<.4?5+br:rel<.6?4:rel<.84?4:3;
      px(X,Y+u-u*(top+1),'#0b0e11',1,u);for(let k=top;k>=1;k--)px(X,Y+u-u*k,k===top?'#6f93b5':(X/u+k)%4===0?'#2e4a66':'#3b5a78',1,u);}
    px(hx+8-u,Y-u*2,'#0b0e11',1,u);px(hx+8-u,Y-u*3,'#0b0e11',1,u);px(hx+112,Y-u*2,'#0b0e11',1,u);px(hx+112,Y-u,'#0b0e11',1,u);
    /* the head on the pillow */
    blit([".###.","#HHH#","#HHs#","#Hss#",".###."],Object.assign({},P,{H:a==='pilot'?'#7b3f1c':'#292a31',s:a==='pilot'?'#e39754':'#99623b'}),hx,Y-(p.kind==='read'?u*2:0),false,1,u);
    if(p.kind==='read'){blit(['####','#cc#','#cC#','####'],P,hx+22,Y-u*3,false,1,SS*1.5);
      x.globalCompositeOperation='lighter';const X=(hx+22-V[0])*K,YY=(Y-u*4-V[1])*K,g=x.createRadialGradient(X,YY,0,X,YY,22*K);g.addColorStop(0,'rgba(126,227,229,.22)');g.addColorStop(1,'rgba(126,227,229,0)');x.globalAlpha=1;x.fillStyle=g;x.fillRect(X-22*K,YY-22*K,44*K,44*K);x.globalCompositeOperation='source-over';
      if(t-lastBunkSnd>rnd(14,30)){lastBunkSnd=t;play('page',hx,Y);}}
    else{if(Math.random()<.006)fx({k:'z',x:hx+6,y:Y-26,vx:rnd(2,5),vy:rnd(-7,-4),life:3});if(t-lastBunkSnd>rnd(9,16)){lastBunkSnd=t;play('snore',hx,Y);}}}}

/* ============================== drawing ============================== */
let lastT=0;
function draw(){requestAnimationFrame(draw);const t=now(),dt=Math.max(0,Math.min(.1,t-lastT||0));lastT=t;
  V=view();K=cv.width/V[2];x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cv.width,cv.height);x.imageSmoothingEnabled=false;
  if(!live()||!watching())return;
  try{tick(dt);}catch(e){}
  /* the pipes, first: they are behind everything */
  x.globalCompositeOperation='lighter';
  for(const p of PIPES)for(const q of p.list){const X0=p.x0+(t-q.t0)*p.v;for(let i=0;i<q.len;i++){const X=X0-i*SS;if(X<p.x0||X>p.x1)continue;px(snap(X),p.y,`rgb(${p.col})`,.38*(1-i/q.len));}}
  x.globalCompositeOperation='source-over';
  /* the trolley, the scrubbers and their wet trails */
  for(const o of R){if(o.parked)continue;
    if(o.k==='scrub'){for(const s of o.trail){const u=(t-s.t)/22;if(u>=1)continue;px(s.x,o.y-SS,'#8fb3c2',.32*(1-u),U);}
      const led=o.beep&&t-o.beep<7?(Math.floor(t*6)%2?'#7ee3e5':'#ff5a4a'):(Math.floor(t*1.2)%2?'#7ee3e5':'#2f7f86');blit(SCRUB,Object.assign({},P,{c:led}),o.x,o.y,o.dir<0);
      if(o.to!=null&&Math.floor(t*8)%2)px(snap(o.x+(o.dir>0?-5*U:4*U),U),o.y-U,'#b4b8bb',.7,U);}
    else if(o.k==='trolley'){blit(TROLLEY,P,o.x,o.y,o.dir<0);if(o.to!=null){const w=Math.floor(t*6)%2;px(snap(o.x-4*U,U),o.y-U,w?'#4a4f56':'#7d838a',1,U);px(snap(o.x+3*U,U),o.y-U,w?'#7d838a':'#4a4f56',1,U);}px(snap(o.x+(o.dir<0?-5:4)*U,U),o.y-U*5,Math.floor(t*1.5)%2?'#ffb04a':'#c15c15',1,U);}
    else if(o.k==='crawl'){const fr=o.to!=null?Math.floor(t*5)%2:0;blit(CRAWL[fr],P,o.x,o.y+5*U,o.dir<0);
      if(o.svc&&t<o.svc){x.globalCompositeOperation='lighter';px(snap(o.x),o.y+6*U,'#c8ffff',.5+.5*Math.sin(t*20),U);x.globalCompositeOperation='source-over';}}}
  /* the capsule */
  if(TUBE.cap){const c=TUBE.cap,u=Math.min(1,(t-c.t0)/c.dur),e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2,Y=c.up?TUBE.bot-(TUBE.bot-TUBE.top)*e:TUBE.top+(TUBE.bot-TUBE.top)*e;blit(CAPS,P,TUBE.x,Y+5,false);
    for(let i=1;i<4;i++)px(snap(TUBE.x,U)-U/2,snap(Y+(c.up?1:-1)*i*U*3),'#ffd24a',.25/i,U);}
  /* the welding arm: a shoulder at the ceiling, an elbow, a torch */
  {const u=ARM.u,ex=ARM.ax-6+u*4,ey=ARM.ay+20+u*34,tx_=ex+12+u*14,ty=ey+8+u*40;
    const seg=(x0,y0,x1,y1,c)=>{const n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)/SS));for(let i=0;i<=n;i++){const X=snap(x0+(x1-x0)*i/n),Y=snap(y0+(y1-y0)*i/n);px(X-SS*3,Y,'#0b0e11');px(X+SS*3,Y,'#0b0e11');px(X-SS*2,Y,c);px(X-SS,Y,c);px(X,Y,c);px(X+SS,Y,'#4a4f56');px(X+SS*2,Y,'#4a4f56');}};
    blit(["#####","#GhG#","##g##"],P,ARM.ax,ARM.ay+6,false);seg(ARM.ax,ARM.ay+6,ex,ey,'#7d838a');seg(ex,ey,tx_,ty,'#b4b8bb');px(snap(ex,U)-SS,snap(ey,U)-SS,'#ffb04a',1,U);
    if(ARM.state==='weld'){x.globalCompositeOperation='lighter';const f=.5+.5*Math.random(),X=(tx_-V[0])*K,Y=(ty-V[1])*K,R2=(30+20*f)*K,g=x.createRadialGradient(X,Y,0,X,Y,R2);g.addColorStop(0,`rgba(200,240,255,${.55*f})`);g.addColorStop(.3,`rgba(126,227,229,${.2*f})`);g.addColorStop(1,'rgba(126,227,229,0)');x.globalAlpha=1;x.fillStyle=g;x.fillRect(X-R2,Y-R2,R2*2,R2*2);x.globalCompositeOperation='source-over';px(snap(tx_,U)-SS,snap(ty,U)-SS,'#ffffff',1,U);}}
  drawProps(t);
  /* sparks, puffs, dust, steam, Zz */
  for(let i=FX.length-1;i>=0;i--){const p=FX[i],u0=t-p.t0,u=u0/p.life;if(u>=1||u0<0){FX.splice(i,1);continue;}
    let X=p.x+(p.vx||0)*u0,Y=p.y+(p.vy||0)*u0+.5*(p.g||0)*u0*u0;if(p.bounce&&Y>p.bounce)Y=p.bounce-(Y-p.bounce)*.3;
    if(p.k==='spark'){x.globalCompositeOperation='lighter';px(snap(X),snap(Y),p.col,1-u);x.globalCompositeOperation='source-over';}
    else if(p.k==='puff'||p.k==='steam')px(snap(X),snap(Y),'#c6ab92',.45*(1-u));
    else if(p.k==='dust')px(snap(X),snap(Y),'#8a7a6a',.6*(1-u));
    else if(p.k==='flash'){x.globalCompositeOperation='lighter';const XX=(p.x-V[0])*K,YY=(p.y-V[1])*K,R2=26*K,g=x.createRadialGradient(XX,YY,0,XX,YY,R2);g.addColorStop(0,`rgba(255,220,170,${.4*(1-u)})`);g.addColorStop(1,'rgba(255,220,170,0)');x.globalAlpha=1;x.fillStyle=g;x.fillRect(XX-R2,YY-R2,R2*2,R2*2);x.globalCompositeOperation='source-over';}
    else if(p.k==='z'){const A=Math.min(1,u*4)*(1-u);for(const [a,b] of [[0,0],[1,0],[2,0],[1,1],[0,2],[1,2],[2,2]])px(snap(X,U)+a*U,snap(Y,U)+b*U,'#e9d7c2',A,U);}}
  x.globalAlpha=1;}
requestAnimationFrame(draw);
window.__town={R,ARM,TUBE,PIPES,props:propsNow,fire:{arm(){ARM.next=0;},tube(){TUBE.next=0;},recycler(){nextRecy=0;}}};
})();
