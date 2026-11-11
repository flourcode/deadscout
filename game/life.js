/* r74 · THE ANT FARM. The ship is home, and a home is never quite still. None of this asks anything of the visitor; it is there to be watched.
   Always running:
   - two small service bots, one on the upper deck and one on the lower, trundling from room to room, stopping to clean. Doors open for them
   - a tank in the service bay with something alive in it: a small glowing jelly that pulses and wanders (it is a research vessel)
   - three loose things drifting in the air: a cup in comms, a wrench in engineering, Scout's ball in quarters
   - Scout has a life of its own: now and then it goes after the ball
   Every one of them answers a click with notes from the track's own scale (deep.js touch), like everything else aboard.
   Once in a while, a surprise, drawn from a pool so no two visits are alike:
   - a meteor shower   - Scout chasing its ball across the room   - a bot stuck, blinking, until someone comes
   - the lights dipping and coming back room by room   - the jelly blooming into three
   Drawn under the astronaut through the hook game/naut.js gives (G.under), in the ship's own pixels */
(()=>{
const G=window.__naut;if(!G||!G.api||!window.CUT)return;const A=G.api,GP=()=>window.__gp,{NODES,RINFO,route,rnd,clamp,pick}=A,stage=document.getElementById('stage');
const note=o=>{try{GP().hero('touch',o);}catch(e){}},INK='#14181c';
/* ---- SCOUT'S VOICE (r78). Chirps and whistles that slide between notes of the track's own scale, so Scout always sounds in tune with
   the music and always sounds like Scout. A handful of moods; what happens aboard picks one */
const VOX={hello:[[4,7,.1],[7,5,.1],[5,9,.17]],happy:[[5,7,.09],[7,9,.09],[9,10,.15]],excited:[[7,9,.06],[7,9,.06],[9,12,.13]],curious:[[5,6,.12],[6,9,.22]],
  worried:[[7,5,.16],[5,4,.24]],whine:[[8,5,.42]],alert:[[9,9,.07],[9,9,.07]],sleepy:[[4,2,.3],[2,1,.42]],muffled:[[2,3,.12],[3,2,.14],[2,4,.16]],small:[[6,7,.1]]};
const PENT=[0,2,4,7,9];let voxAt=0;
function scoutSay(mood,quiet){const pn=performance.now();if(pn-voxAt<900)return;voxAt=pn;let a=null;try{a=window.__game.audio();}catch(e){}if(!a||!a.ctx||!A.active())return;const c=a.ctx,seq=VOX[mood]||VOX.small;
  let key=0;try{key=GP().tapeKey()||0;}catch(e){}key=((key%12)+12)%12;const base=(mood==='muffled'?64:76)+(key>6?key-12:key),hz=i=>440*Math.pow(2,(base+PENT[((i%5)+5)%5]+12*Math.floor(i/5)-69)/12);
  const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=mood==='muffled'?900:3400;const out=c.createGain();out.gain.value=(quiet?.5:1)*.05;lp.connect(out);out.connect(a.out);let t=c.currentTime+.03;
  for(const [i0,i1,d] of seq){const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(hz(i0),t);o.frequency.exponentialRampToValueAtTime(hz(i1),t+d*.85);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+.012);g.gain.setValueAtTime(1,t+d*.7);g.gain.linearRampToValueAtTime(0,t+d);o.connect(g);g.connect(lp);o.start(t);o.stop(t+d+.02);t+=d+.035;}}
/* ---- the service bots ---- */
const DECK={mid:Object.keys(NODES).filter(k=>NODES[k][1]===846),up:Object.keys(NODES).filter(k=>NODES[k][1]===552),low:Object.keys(NODES).filter(k=>NODES[k][1]===1119&&NODES[k][0]<1440&&!/^a-|^eva/.test(k))};
const mkBot=(deck,start)=>({deck,x:NODES[start][0],y:NODES[start][1],path:[],wait:0,face:1,stuck:0,spin:0,clean:0});
const BOTS=[];try{if(DECK.up.length>2)BOTS.push(mkBot('up',DECK.up[Math.floor(DECK.up.length*.6)]));if(DECK.low.length>2)BOTS.push(mkBot('low',DECK.low[0]));if(DECK.mid.length>2)BOTS.push(mkBot('mid',DECK.mid[DECK.mid.length-1]));}catch(e){}
G.movers=()=>BOTS;
function nearest(deck,x){let b=DECK[deck][0],bd=1e9;for(const k of DECK[deck]){const d=Math.abs(NODES[k][0]-x);if(d<bd){bd=d;b=k;}}return b;}
function botTick(b,dt,pn){if(pn<(b.hold||0))return;if(b.stuck){if(pn-b.stuck>16000)free(b,pn);return;}if(pn<b.spin)return;
  if(!b.path.length){if(pn<b.wait){b.clean=1;return;}b.clean=0;const from=nearest(b.deck,b.x);let to=from,n=0;while(n++<12&&Math.abs(NODES[to][0]-b.x)<170)to=pick(DECK[b.deck]);
    b.path=route(from,to).filter(k=>DECK[b.deck].includes(k)).map(k=>NODES[k][0]);if(!b.path.length)b.wait=pn+2000;return;}
  const tx=b.path[0],dx=tx-b.x;if(Math.abs(dx)<3){b.path.shift();if(!b.path.length)b.wait=pn+rnd(3000,9000);return;}b.face=dx>0?1:-1;b.x+=b.face*Math.min(Math.abs(dx),38*dt);}
function free(b,pn){b.stuck=0;b.spin=pn+900;note({i:[0,2,4,7],v:.34,gap:.11});}
function botDraw(x,b,u,pn){const a=Math.round(u*1.5),X=Math.round(b.x/a)*a,Y=Math.round(b.y/u)*u,spin=pn<b.spin,f=spin?(Math.floor(pn/90)%2?1:-1):b.face;
  x.fillStyle=INK;x.fillRect(X-7*a,Y-8*a,14*a,8*a);x.fillStyle='#e9d7c2';x.fillRect(X-6*a,Y-7*a,12*a,5*a);x.fillStyle='#f6efe4';x.fillRect(X-6*a,Y-7*a,12*a,a);x.fillStyle='#907763';x.fillRect(X-6*a,Y-3*a,12*a,a);
  x.fillStyle=INK;x.fillRect(X-5*a,Y-2*a,3*a,2*a);x.fillRect(X+2*a,Y-2*a,3*a,2*a);
  x.fillStyle=INK;x.fillRect(X+f*4*a-a,Y-6*a,3*a,3*a);x.fillStyle=b.stuck?(Math.floor(pn/160)%2?'#ff9a3c':'#a8501e'):(Math.floor(pn/700)%3?'#7ee3e5':'#3d8f96');x.fillRect(X+f*4*a,Y-5*a,a,a); /* its eye: teal like every machine aboard; amber when it needs help */
  if(b.clean||b.stuck){const w=Math.floor(pn/140)%2;x.fillStyle='#907763';x.fillRect(X+f*7*a-(f<0?2*a:0),Y-(1+w)*a,2*a,a);} /* the brush */
  x.fillStyle=INK;x.fillRect(X-2*a,Y-11*a,4*a,3*a);x.fillStyle=(Math.floor(pn/500)%2||b.stuck)?'#ff9a3c':'#a8501e';x.fillRect(X-a,Y-10*a,2*a,2*a);
  if(b.stuck){const U=u*3,gx=Math.round(b.x/U)*U,gy=Math.round((b.y-70)/U)*U;x.fillStyle=INK;x.fillRect(gx-U,gy-U,3*U,7*U);x.fillStyle='#e9d7c2';x.fillRect(gx,gy,U,3*U);x.fillRect(gx,gy+4*U,U,U);}}
/* ---- the tank ---- */
const TANK={x:938,y:1112,w:96,h:112,bloom:0,dart:0},JEL=[{a:0,b:1.3},{a:2.1,b:.2},{a:4.2,b:2.6}];
function jelly(x,cx,cy,u,pn,ph,small){const a=u*2,p=(Math.sin(pn/520+ph)+1)/2,w=small?(p>.5?3:5):(p>.5?5:7),X=Math.round(cx/a)*a,Y=Math.round(cy/a)*a;
  x.fillStyle='#3d8f96';for(let i=0;i<(small?2:3);i++){const tx=X+(i-(small?.5:1))*2*a,len=(p>.5?5:3)+(i%2);for(let j=0;j<len;j++)x.fillRect(Math.round((tx+Math.sin(pn/300+j*.9+i+ph)*a*.9)/a)*a,Y+(2+j)*a,a,a);}
  x.fillStyle='#7ee3e5';x.fillRect(X-((w-2)>>1)*a,Y-2*a,(w-2)*a,a);x.fillRect(X-(w>>1)*a,Y-a,w*a,2*a);x.fillStyle='#d8fff0';x.fillRect(X-a,Y-2*a,2*a,a);x.fillStyle='#1fb4ce';x.fillRect(X-(w>>1)*a,Y+a,w*a,a);}
function tankDraw(x,u,pn){const T=TANK,a=u,x0=T.x-T.w/2,y0=T.y-T.h,bl=pn<T.bloom;
  x.save();x.globalCompositeOperation='lighter';const R=bl?230:160,g=x.createRadialGradient(T.x,T.y-T.h/2,6,T.x,T.y-T.h/2,R);g.addColorStop(0,'rgba(126,227,229,'+(bl?.5:.3)+')');g.addColorStop(1,'rgba(126,227,229,0)');x.fillStyle=g;x.fillRect(T.x-R,T.y-T.h/2-R,R*2,R*2);x.restore();
  x.fillStyle=INK;x.fillRect(x0-2*a,y0-3*a,T.w+4*a,T.h+5*a);x.fillStyle='#907763';x.fillRect(x0-a,y0-2*a,T.w+2*a,2*a);x.fillRect(x0-a,T.y,T.w+2*a,a);x.fillStyle='#c6ab92';x.fillRect(x0-a,y0-2*a,T.w+2*a,a);
  x.fillStyle='#123c4a';x.fillRect(x0,y0,T.w,T.h);x.fillStyle='#1b5566';x.fillRect(x0,y0,T.w,3*a);x.fillStyle='#2a7183';x.fillRect(x0+2*a,y0+4*a,2*a,T.h-8*a);
  for(let i=0;i<3;i++){const s=((pn/1000)*(.22+i*.07)+i*.37)%1;x.fillStyle='#3d8f96';x.fillRect(Math.round((x0+T.w*(.25+.25*i)+Math.sin(pn/700+i)*3)/a)*a,Math.round((T.y-4-s*(T.h-10))/a)*a,2*a,2*a);}
  const n=bl?3:1,dart=pn<T.dart?1.9:1;for(let i=0;i<n;i++){const J=JEL[i],tt=pn/1000*dart;jelly(x,T.x+Math.sin(tt*.31+J.a)*(T.w/2-22),T.y-T.h/2-4+Math.sin(tt*.23+J.b)*(T.h/2-34),u,pn,J.a,n>1);}}
/* ---- loose things ---- */
const FL=[];for(const [kind,room] of [['cup','comms'],['wrench','engineering'],['ball','crew-quarters']]){const R=RINFO[room];if(!R)continue;FL.push({kind,room,x:rnd(R.x0+80,R.x1-80),y:rnd(R.top+90,R.floor-70),vx:rnd(-7,7),vy:rnd(-5,5)});}
function flTick(f,dt,g){const R=RINFO[f.room],x0=R.x0+34,x1=R.x1-34,y0=R.top+70,y1=R.floor-(f.kind==='ball'?16:44);f.x+=f.vx*dt;f.y+=f.vy*dt;
  if(f.x<x0){f.x=x0;f.vx=Math.abs(f.vx);}if(f.x>x1){f.x=x1;f.vx=-Math.abs(f.vx);}if(f.y<y0){f.y=y0;f.vy=Math.abs(f.vy);}if(f.y>y1){f.y=y1;f.vy=-Math.abs(f.vy);}
  const sp=Math.hypot(f.vx,f.vy);if(sp>9){const k=Math.pow(.45,dt);f.vx*=k;f.vy*=k;}else if(sp<4){f.vx+=rnd(-1,1)*dt*6;f.vy+=rnd(-1,1)*dt*6;}
  /* the astronaut brushing past sends it on its way; Scout does more than brush */
  if(!G.space&&!G.asleep){const dx=f.x-G.x,dy=f.y-(G.y-50),d=Math.hypot(dx,dy);if(d<34&&performance.now()-(f.hit||0)>2500){f.hit=performance.now();f.vx=dx/(d||1)*46;f.vy=dy/(d||1)*46-8;note({i:f.kind==='cup'?6:f.kind==='ball'?8:3,v:.3});}}
  if(f.kind==='ball'){let k=null;try{k=CUT.actorAt(g.P,g.TIMES,g.now(),'k9');}catch(e){}if(k){const dx=f.x-k.x,dy=f.y-(k.y-24),d=Math.hypot(dx,dy);if(d<52&&performance.now()-(f.kick||0)>1800){f.kick=performance.now();f.vx=(dx>=0?1:-1)*rnd(70,110);f.vy=-rnd(30,70);scoutSay('excited');A.mark('k9','heart');}}}}
function flDraw(x,f,u,pn){const a=Math.round(u*1.5),X=Math.round(f.x/a)*a,Y=Math.round(f.y/a)*a;
  if(f.kind==='cup'){x.fillStyle=INK;x.fillRect(X-3*a,Y-3*a,7*a,6*a);x.fillStyle='#e9d7c2';x.fillRect(X-2*a,Y-2*a,4*a,4*a);x.fillStyle='#f6efe4';x.fillRect(X-2*a,Y-2*a,4*a,a);x.fillStyle='#e9d7c2';x.fillRect(X+2*a,Y-a,a,2*a);}
  else if(f.kind==='ball'){x.fillStyle=INK;x.fillRect(X-3*a,Y-2*a,6*a,4*a);x.fillRect(X-2*a,Y-3*a,4*a,6*a);x.fillStyle='#7ee3e5';x.fillRect(X-2*a,Y-2*a,4*a,4*a);x.fillStyle='#d8fff0';x.fillRect(X-a,Y-2*a,a,a);x.fillStyle='#1fb4ce';x.fillRect(X-2*a,Y+a,4*a,a);}
  else{const v=Math.floor(pn/2600+f.x*.01)%2;x.fillStyle=INK;if(v){x.fillRect(X-2*a,Y-5*a,4*a,10*a);x.fillStyle='#9aa0a6';x.fillRect(X-a,Y-4*a,2*a,8*a);x.fillStyle=INK;x.fillRect(X-a+ (a>>1),Y-4*a,a,2*a);}else{x.fillRect(X-5*a,Y-2*a,10*a,4*a);x.fillStyle='#9aa0a6';x.fillRect(X-4*a,Y-a,8*a,2*a);x.fillStyle=INK;x.fillRect(X+2*a,Y-a+(a>>1),2*a,a);}}}
/* ---- Scout's own life: now and then, the ball ---- */
let scoutAt=0;function scout(pn,g){if(pn<scoutAt)return;scoutAt=pn+rnd(38000,70000);fetch(g);}
function fetch(g){const b=FL.find(f=>f.kind==='ball');if(!b||!window.K9NAV)return false;try{if(K9NAV.busy())return false;const fl=RINFO[b.room].floor,hit=CUT.pick(g.P,g.TIMES,g.now(),b.x,fl-40);if(hit&&hit.type==='place'){K9NAV.go(hit.ref,{});return true;}}catch(e){}return false;}
/* ---- surprises ---- */
function dip(){const T=CUT.toy({}),lv={},low={};for(const r in RINFO){lv[r]=T.room[r]==null?1:T.room[r];low[r]=Math.min(lv[r],.18);}CUT.toy({room:low});A.hold(8000);
  const order=Object.keys(lv).sort((a,b)=>RINFO[a].x0-RINFO[b].x0);order.forEach((r,i)=>setTimeout(()=>{try{CUT.toy({room:{[r]:lv[r]}});}catch(e){}note({i:i%10,v:.3});},1500+i*240));setTimeout(()=>A.hold(0),1500+order.length*240+300);}
const scoutPos=()=>{try{const g=GP();return CUT.actorAt(g.P,g.TIMES,g.now(),'k9');}catch(e){return null;}};
let BLANKET=0,CUP=null,STAND=null;
const POOL={
  /* Scout and the little bot on its deck: a standoff, and the bot backs down */
  standoff:()=>{const b=BOTS.find(q=>q.deck==='mid'),k=scoutPos(),g=GP();if(!b||!k||b.stuck||!window.K9NAV||K9NAV.busy())return false;const hit=CUT.pick(g.P,g.TIMES,g.now(),b.x+(k.x>b.x?70:-70),846-40);if(!hit||hit.type!=='place')return false;
    K9NAV.go(hit.ref,{});b.path=[];b.hold=performance.now()+13000;STAND={b,t:performance.now(),st:0};return true;},
  /* a blanket has drifted off a bunk and Scout is under it */
  blanket:()=>{if(!scoutPos())return false;BLANKET=performance.now();scoutSay('muffled');return true;},
  /* the cup gets away */
  cup:()=>{const pn=performance.now();if(!(pn<G.mug&&pn>(G.mugFrom||0))||G.space||G.asleep)return false;const room=A.roomAt(G.x,G.y-40);if(!room)return false;G.mug=0;
    CUP={kind:'cup',room,x:G.x+G.face*30,y:G.y-62,vx:G.face*30,vy:-24,until:pn+26000,chase:0};FL.push(CUP);scoutSay('curious');return true;},
  shower:()=>{G.shower=performance.now();note({i:[9,7,5,4,2],v:.26,gap:.55});setTimeout(()=>scoutSay('curious'),1800);return true;},
  fetch:()=>{const b=FL.find(f=>f.kind==='ball');if(!b)return false;b.vx=rnd(-1,1)>0?90:-90;b.vy=-50;note({i:[5,7,9],v:.3,gap:.12});return fetch(GP())||true;},
  stuck:()=>{const b=pick(BOTS);if(!b||b.stuck)return false;b.stuck=performance.now();b.path=[];note({i:[2,2],v:.3,gap:.25});setTimeout(()=>scoutSay('curious'),1200);
    /* if nobody is steering, the astronaut goes to it */
    if(!G.path.length&&!G.asleep&&!G.space&&performance.now()-G.last>12000){G.act={kind:'poi',stay:5,face:0};G.go(b.x-44,b.y-6,true);}return true;},
  dip:()=>{dip();setTimeout(()=>scoutSay('worried'),500);setTimeout(()=>scoutSay('happy'),5200);return true;},
  bloom:()=>{setTimeout(()=>scoutSay('curious'),1500);TANK.bloom=performance.now()+26000;note({i:[0,2,4,5,7],v:.34,voice:'rhodes',gap:.2});return true;}};
let nextAt=0,lastKind='',wasOn=false;
function surprise(pn){if(pn<nextAt)return;const inside=!G.space&&!G.asleep,kinds=Object.keys(POOL).filter(k=>k!==lastKind&&(inside||k==='shower')&&!(G.calm&&k==='shower'));const k=pick(kinds);let ok=false;try{ok=POOL[k]();}catch(e){}if(ok)lastKind=k;nextAt=pn+rnd(140000,240000);}
function tick(dt,pn){const g=GP();if(!A.active()||!G.on){wasOn=false;return;}if(!wasOn){wasOn=true;nextAt=pn+108000;scoutAt=pn+52000;}
  for(const b of BOTS){botTick(b,dt,pn);if(b.stuck&&!G.space&&Math.hypot(b.x-G.x,b.y-G.y)<80&&pn-b.stuck>1500)free(b,pn);}
  for(const f of FL)try{flTick(f,dt,g);}catch(e){}
  try{scout(pn,g);}catch(e){}surprise(pn);try{comedy(pn,g);}catch(e){}}
let wasSpace=false,wasAsleep=false,heartSeen=0,idleVox=0;
function comedy(pn,g){const k=scoutPos();
  if(G.heartAt&&G.heartAt!==heartSeen){heartSeen=G.heartAt;scoutSay('hello');}
  if(G.space!==wasSpace){wasSpace=G.space;scoutSay(G.space?'whine':'happy');}
  if(G.asleep!==wasAsleep){wasAsleep=G.asleep;if(G.asleep)scoutSay('sleepy',true);}
  if(!idleVox)idleVox=pn+rnd(50000,90000);if(pn>idleVox){idleVox=pn+rnd(60000,120000);scoutSay('small',true);}
  if(STAND){const S=STAND,e=pn-S.t,b=S.b;if(k)b.face=k.x>b.x?1:-1;
    if(S.st===0&&(e>9000||(k&&Math.abs(k.x-b.x)<120&&!k.walk&&e>1500))){S.st=1;S.t2=pn;scoutSay('alert');}
    else if(S.st===1&&pn-S.t2>1300){S.st=2;note({i:[2,2,1],v:.3,gap:.16});}
    else if(S.st===2&&pn-S.t2>2600){S.st=3;scoutSay('alert');}
    else if(S.st===3&&pn-S.t2>3700){b.spin=pn+900;b.hold=0;const away=k&&k.x>b.x?-1:1;b.path=[A.clamp(b.x+away*220,RINFO['crew-quarters'].x0+60,RINFO.engineering.x1-60)];STAND=null;setTimeout(()=>{scoutSay('happy');A.mark('k9','heart');},700);}
    if(STAND&&e>16000){b.hold=0;STAND=null;}}
  if(BLANKET){const e=pn-BLANKET;if(e>9500){BLANKET=0;scoutSay('happy');}else if(e>4200&&e<4300)scoutSay('muffled');}
  if(CUP){const c=CUP;if(pn>c.until||G.space){FL.splice(FL.indexOf(c),1);CUP=null;G.mugFrom=0;G.mug=pn+60000;}
    else{const d=Math.hypot(c.x-G.x,c.y-(G.y-56));if(d<30&&pn-(c.born||(c.born=pn))>2500){FL.splice(FL.indexOf(c),1);CUP=null;G.mugFrom=0;G.mug=pn+90000;note({i:[4,7,9],v:.34,gap:.1});scoutSay('happy');}
      else if(pn>c.chase&&!G.asleep&&pn-G.last>6000){c.chase=pn+1800;G.act={kind:'poi',stay:4,face:0};G.go(c.x,c.y+56,false);G.last=pn-7000;}}}}
function blanketDraw(x,u,pn){if(!BLANKET)return;const k=scoutPos();if(!k)return;const e=pn-BLANKET,a=Math.round(u*1.5),lift=e>8000?(e-8000)/1500:0,X=Math.round((k.x+Math.sin(pn/260)*3)/a)*a,Y=Math.round((k.y-52-lift*90)/a)*a,w=Math.floor(pn/300)%2;
  x.globalAlpha=Math.max(0,1-lift);x.fillStyle=INK;x.fillRect(X-11*a,Y-a,22*a,13*a);x.fillStyle='#c6ab92';x.fillRect(X-10*a,Y,20*a,11*a);x.fillStyle='#e9d7c2';x.fillRect(X-10*a,Y,20*a,2*a);x.fillStyle='#ff9a3c';x.fillRect(X-10*a,Y+4*a,20*a,a);
  /* it hangs: the middle rides on Scout's back, the corners droop and sway */x.fillStyle=INK;x.fillRect(X-13*a,Y+2*a,4*a,(13+w)*a);x.fillRect(X+9*a,Y+2*a,4*a,(14-w)*a);x.fillStyle='#c6ab92';x.fillRect(X-12*a,Y+3*a,3*a,(11+w)*a);x.fillRect(X+10*a,Y+3*a,3*a,(12-w)*a);x.fillStyle='#ff9a3c';x.fillRect(X-12*a,Y+6*a,3*a,a);x.fillRect(X+10*a,Y+6*a,3*a,a);x.fillStyle='#907763';x.fillRect(X-6*a,Y+10*a,3*a,a);x.fillRect(X+2*a,Y+10*a,4*a,a);x.globalAlpha=1;}
G.under.push((x,t,u,pn)=>{try{blanketDraw(x,u,pn);}catch(e){}});
G.under.unshift((x,t,u,pn)=>{try{tankDraw(x,u,pn);}catch(e){}for(const b of BOTS)try{botDraw(x,b,u,pn);}catch(e){}for(const f of FL)try{flDraw(x,f,u,pn);}catch(e){}});
/* a click on any of them is answered */
addEventListener('pointerdown',e=>{if(!A.active())return;const t=e.target;if(t!==stage&&!(t.closest&&t.closest('.toy')))return;const g=GP(),r=stage.getBoundingClientRect(),V=g.vw(),wx=V[0]+(e.clientX-r.left)/r.width*V[2],wy=V[1]+(e.clientY-r.top)/r.height*V[3],pn=performance.now();
  {const k=scoutPos();if(k&&Math.abs(wx-k.x)<46&&Math.abs(wy-(k.y-26))<44){scoutSay('happy');A.mark('k9','heart');return;}}
  for(const b of BOTS)if(Math.abs(wx-b.x)<44&&Math.abs(wy-(b.y-14))<40){if(b.stuck)free(b,pn);else{b.spin=pn+700;note({i:[5,7],v:.36,gap:.1});}return;}
  for(const f of FL){const dx=f.x-wx,dy=f.y-wy,d=Math.hypot(dx,dy);if(d<40){f.vx=dx/(d||1)*60+rnd(-10,10);f.vy=dy/(d||1)*60-10;note({i:[4,6],v:.34,gap:.1});return;}}
  if(Math.abs(wx-TANK.x)<TANK.w/2+10&&wy>TANK.y-TANK.h-10&&wy<TANK.y+6){TANK.dart=pn+2600;note({i:[2,4,7],v:.36,voice:'rhodes',gap:.14});}},true);
window.__life={BOTS,TANK,FL,say:scoutSay,fire:k=>{try{return POOL[k]();}catch(e){return String(e);}},kinds:Object.keys(POOL)};
let last=0;(function loop(now){requestAnimationFrame(loop);const dt=Math.min(.12,(now-(last||now))/1000);last=now;if(document.hidden)return;try{tick(dt,now);}catch(e){}})(performance.now());
})();
