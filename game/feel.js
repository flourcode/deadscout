/* r78 · HOW IT FEELS. Light, air, habit, and the sound of the rooms. Nothing here does anything; it is all atmosphere.
   - LIGHT WITH PURPOSE. Each room falls into shadow except where something actually gives light: a pool under each ceiling lamp, a glow
     in front of each screen, the tank. Fewer, stronger sources, and real dark between them. (The astronaut and Scout are drawn on top,
     so they always read.)
   - AIR. Dust motes hang and drift in the lamp light.
   - SIGNS OF HABIT. A photo taped up inside the lower bunk, a mug on the table, boots left by the bunk (nobody wears boots in freefall),
     a jacket over a bridge chair, Scout's cushion, a path worn into the deck. No words anywhere.
   - THE SOUND OF THE ROOMS. A soft ventilation tone that changes with the room the astronaut is in (low and full in engineering, airy on
     the bridge, nearly nothing outside), and now and then a tick of metal settling. Both very quiet, under everything else.
   Drawn under the astronaut through game/naut.js (G.under) */
(()=>{
const G=window.__naut;if(!G||!G.api||!window.CUT)return;const A=G.api,M=CUT.MAP,{RINFO,rnd,pick}=A,GP=()=>window.__gp;
/* ---- light ---- */
const Q=4,LW=Math.ceil(CUT.W/Q),LH=Math.ceil(CUT.H/Q);let LM=null;
const SROOM={quarters:'crew-quarters'};
function lightmap(){const c=document.createElement('canvas');c.width=LW;c.height=LH;const x=c.getContext('2d');x.scale(1/Q,1/Q);
  const hole=(cx,cy,rx,ry,k)=>{x.save();x.translate(cx,cy);x.scale(1,ry/rx);const g=x.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,'rgba(0,0,0,'+k+')');g.addColorStop(.55,'rgba(0,0,0,'+(k*.7)+')');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,rx,0,6.283);x.fill();x.restore();};
  for(const r in RINFO){if(r==='eva')continue;const R=RINFO[r];x.save();x.beginPath();x.rect(R.x0,R.top,R.x1-R.x0,R.floor+8-R.top);x.clip();
    x.globalCompositeOperation='source-over';x.fillStyle='rgba(6,8,12,.44)';x.fillRect(R.x0,R.top,R.x1-R.x0,R.floor+8-R.top);x.globalCompositeOperation='destination-out';
    for(const L of (M.lamps||[])){if(L.room!==r)continue;const h=R.floor-L.y;if(L.warn)hole(L.x,L.y+20,60,60,.6);else if(L.soft)hole(L.x,L.y+h*.45,120,h*.62,.8);else hole(L.x,L.y+h*.5,170,h*.72,1);}
    for(const k in (M.screens||{})){const rr=k.split('.')[0];if((SROOM[rr]||rr)!==r)continue;const s=M.screens[k],w=s[2]-s[0],hh=s[3]-s[1];hole((s[0]+s[2])/2,(s[1]+s[3])/2+10,Math.max(46,w*1.5),Math.max(46,hh*1.7),.62);}
    if(r==='service')hole(938,1056,150,120,.9); /* the tank */
    x.restore();}
  return c;}
let dimK=1,dimAt=0;
function lightDraw(x,pn){if(!LM)LM=lightmap();if(pn>dimAt){dimAt=pn+1200;try{const T=CUT.toy({});let s=0,n=0;for(const r in RINFO){s+=T.room[r]==null?1:T.room[r];n++;}dimK=Math.max(.25,Math.min(1,(s/n-.25)/.6));}catch(e){}} /* a scene that is already dim needs less added shadow */
  x.save();x.globalAlpha=dimK;x.imageSmoothingEnabled=false;x.drawImage(LM,0,0,LW*Q,LH*Q);x.restore();}
/* ---- air: dust in the lamp light ---- */
const MOTES=[];for(const L of (M.lamps||[])){if(L.warn||!RINFO[L.room]||L.room==='eva')continue;const fl=RINFO[L.room].floor,n=L.soft?3:5;for(let i=0;i<n;i++)MOTES.push({x:L.x+rnd(-80,80),y:rnd(L.y+26,fl-20),lx:L.x,y0:L.y+26,y1:fl-16,vx:rnd(-3,3),vy:rnd(-2.2,2.2),ph:rnd(0,6.28)});}
function motes(x,u,pn,dt){const q=u*2;for(const m of MOTES){m.x+=m.vx*dt+Math.sin(pn/2300+m.ph)*.05;m.y+=m.vy*dt;if(m.x<m.lx-90||m.x>m.lx+90)m.vx=-m.vx;if(m.y<m.y0||m.y>m.y1)m.vy=-m.vy;
    const a=.16+.3*(.5+.5*Math.sin(pn/1700+m.ph*3));x.globalAlpha=a;x.fillStyle='#f6efe4';x.fillRect(Math.round(m.x/q)*q,Math.round(m.y/q)*q,q,q);}x.globalAlpha=1;}
/* ---- signs of habit (a = one block; the whole ship is drawn small, so these are drawn in blocks of 3 world units) ---- */
const INK='#14181c';
function habit(x,u){const a=Math.round(u*1.5),R=(c,X,Y,w,h)=>{x.fillStyle=c;x.fillRect(X,Y,w*a,h*a);};
  /* a photo taped up inside the lower bunk, by the pillow */
  R(INK,548,738,7,6);R('#e9d7c2',551,741,5,4);R('#1fb4ce',551,741,5,2);R('#ff9a3c',557,747,1,1);R('#c6ab92',551,750,5,1);R('#f6efe4',557,738,1,1);
  /* the mug on the table, and the ring it leaves */
  R(INK,806,757,5,5);R('#e9d7c2',809,760,3,3);R('#ff9a3c',809,763,3,1);R('#907763',797,769,3,1);
  /* boots by the bunk: nobody wears them in freefall */
  R(INK,694,829,4,5);R('#c6ab92',697,832,2,4);R('#ff9a3c',697,835,2,1);R(INK,709,832,4,4);R('#c6ab92',712,835,2,3);R('#ff9a3c',712,838,2,1);
  /* a jacket over the back of a bridge chair */
  R(INK,523,474,10,7);R('#e9d7c2',526,477,8,5);R('#ff9a3c',526,480,8,1);R('#c6ab92',526,489,3,2);R('#c6ab92',541,489,3,2);
  /* Scout's cushion */
  R(INK,984,833,13,4);R('#2a5d63',987,836,11,3);R('#3d8f96',987,836,11,1);
  /* a path worn into the deck where the two of them go most */
  x.globalAlpha=.5;x.fillStyle='#c6ab92';for(let i=0;i<26;i++){const X=716+i*13+((i*7)%5),w=(i%3)+1;x.fillRect(X,850,w*a,a);}x.globalAlpha=1;}
let lastT=0;G.under.unshift((x,t,u,pn)=>{const dt=Math.min(.12,(pn-(lastT||pn))/1000);lastT=pn;try{lightDraw(x,pn);}catch(e){}try{habit(x,u);}catch(e){}try{motes(x,u,pn,dt);}catch(e){}});
/* ---- the sound of the rooms ---- */
const TONE={bridge:[720,.7,.010],sensor:[940,.9,.009],'upper-access':[520,.6,.008],comms:[1150,1,.008],'crew-quarters':[380,.6,.007],'central-shaft':[270,.7,.011],engineering:[150,.8,.016],service:[215,1,.012],'lower-access':[245,.7,.010],airlock:[330,1.3,.009],eva:[95,.5,.004],space:[70,.4,.0015]};
let AU=null,room='',tickAt=0;
function audio(){if(AU)return AU;let a=null;try{a=window.__game&&__game.audio&&__game.audio();}catch(e){}if(!a||!a.ctx)return null;const c=a.ctx,len=c.sampleRate*3,buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);let v=0;
  for(let i=0;i<len;i++){v=(v+(Math.random()*2-1)*.045)/1.045;d[i]=v*3.2;}for(let i=0;i<2000;i++){const k=i/2000;d[i]=d[i]*k+d[len-2000+i]*(1-k);} /* brown noise, looped without a seam */
  const src=c.createBufferSource();src.buffer=buf;src.loop=true;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=380;bp.Q.value=.6;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;const g=c.createGain();g.gain.value=0;
  src.connect(bp);bp.connect(lp);lp.connect(g);g.connect(a.out);src.start();AU={c,out:a.out,bp,g};return AU;}
function tick(c,out,near){const t=c.currentTime+.02,f=rnd(1700,2700),g=c.createGain(),o=c.createOscillator(),o2=c.createOscillator(),lv=(near?.02:.011)*rnd(.6,1);o.type='sine';o2.type='sine';o.frequency.value=f;o2.frequency.value=f*1.52;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(lv,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.09);o.connect(g);o2.connect(g);let dst=out;try{const p=c.createStereoPanner();p.pan.value=rnd(-.6,.6);g.connect(p);p.connect(out);}catch(e){g.connect(dst);}o.start(t);o2.start(t);o.stop(t+.12);o2.stop(t+.12);}
setInterval(()=>{const on=A.active()&&G.on&&!document.hidden;if(!on){if(AU){try{AU.g.gain.setTargetAtTime(0,AU.c.currentTime,.4);}catch(e){}room='';}return;}const a=audio();if(!a)return;
  const r=G.space?'space':(A.roomAt(G.x,G.y-40)||room||'crew-quarters');if(r!==room){room=r;const T=TONE[r]||TONE['crew-quarters'],t=a.c.currentTime;try{a.bp.frequency.setTargetAtTime(T[0],t,.5);a.bp.Q.setTargetAtTime(T[1],t,.5);a.g.gain.setTargetAtTime(T[2],t,.6);}catch(e){}}
  const pn=performance.now();if(!tickAt)tickAt=pn+rnd(14000,26000);if(pn>tickAt){tickAt=pn+rnd(9000,26000);if(!G.space)try{tick(a.c,a.out,room==='engineering'||room==='service');}catch(e){}}},400);
window.__feel={MOTES,relight:()=>{LM=null;},tone:()=>room};
})();
