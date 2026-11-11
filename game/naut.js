/* r66 · THE KEEPER. One keeper, one dog, one old ship built for a bigger crew, a long way out. Nobody else is aboard.
   - Click or tap anywhere and she goes there by the ship's own ways: along the deck, through the doors, up and down the central shaft.
     She does not pass through walls. Inside a room she floats to the height you pointed at.
   - Outside is through the airlock: she crosses it by herself (inner door, a pause, outer door), then drifts free in front of the hull.
     Point back inside and she comes home the same way. No mode, nothing to exit.
   - Every click is a note: the major pentatonic of the track that is playing, higher up the ship is higher in pitch.
     The things she stops at answer with a short phrase of their own.
   - Left alone she keeps her own watch: a cup from the meal unit, a long look out of a window, a visit to K9, now and then the EVA deck.
     At night (your clock) the quarters go dim and she turns in; a click wakes her.
   - HALCYON, the ship's mind, looks after her: rooms warm as she enters, doors open, and very rarely it says one dry line.
   She is drawn through CUT.overlay in world pixels, in her own suit: orange, cream bands, a white helmet, a dark visor */
(()=>{
const GP=()=>window.__gp;if(!window.CUT||!document.getElementById('stage'))return;
const stage=document.getElementById('stage'),rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pick=L=>L[Math.floor(Math.random()*L.length)];
const M=CUT.MAP,NODES=M.nodes,HULL=[110,250,2080,1200],HOV=6;
const QN=(location.search.match(/[?&]night=(\d)/)||[])[1];
const G={x:736,y:846-HOV,vx:0,vy:0,path:[],face:1,last:0,wanderAt:0,slow:false,ext:0,on:false,t0:0,space:false,act:null,mug:0,k9At:0,night:null,asleep:false,acts:0,roll:0};
window.__naut=window.__ghost=G;/* r82: a visitor who has asked their device for less motion gets a calmer ship: no roll, no gas puffs, no shooting stars, still dust */G.calm=/[?&]calm=1/.test(location.search)||!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);try{CUT.hideHer(true);}catch(e){}G.isNight=()=>{if(G.forceNight!=null)return !!G.forceNight;return QN==='1';}; /* r74: the visitor's clock no longer changes anything; a nap is one of the routines */
/* strictly inside a room's outline, or nowhere (the engine's own roomOf answers with the nearest room even from open space) */
const roomAt=(x,y)=>{for(const r in M.rooms){const P=M.rooms[r].poly;let in_=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,yi]=P[i],[xj,yj]=P[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)in_=!in_;}if(in_)return r;}return null;};
/* the ship's ways: the same nodes the crew walk, and the two ladders */
const ADJ={},NROOM={},RINFO={};for(const k in NODES){ADJ[k]=[];NROOM[k]=roomAt(NODES[k][0],NODES[k][1]-40);}
for(const [a,b] of M.walk.concat(M.ladders)){if(NODES[a]&&NODES[b]){ADJ[a].push(b);ADJ[b].push(a);}}
for(const r in M.rooms){const P=M.rooms[r].poly,xs=P.map(p=>p[0]),ys=P.map(p=>p[1]);let fl=0;for(const k in NODES)if(NROOM[k]===r)fl=Math.max(fl,NODES[k][1]);RINFO[r]={x0:Math.min(...xs),x1:Math.max(...xs),top:Math.min(...ys),floor:fl||Math.max(...ys)-9};}
const pt=k=>({x:NODES[k][0],y:NODES[k][1]-HOV,n:k});
function nearestNode(x,y,room){let best=null,bd=1e9;for(const k in NODES){if(room&&NROOM[k]!==room)continue;const d=Math.hypot(NODES[k][0]-x,(NODES[k][1]-HOV-y)*1.5);if(d<bd){bd=d;best=k;}}return best||(room?nearestNode(x,y,null):'q-table');}
function route(a,b){const D={[a]:0},prev={},Q=[a],done={};while(Q.length){Q.sort((p,q)=>D[p]-D[q]);const u=Q.shift();if(done[u])continue;done[u]=1;if(u===b)break;for(const v of ADJ[u]){const w=D[u]+Math.hypot(NODES[u][0]-NODES[v][0],NODES[u][1]-NODES[v][1]);if(D[v]==null||w<D[v]){D[v]=w;prev[v]=u;Q.push(v);}}}
  if(D[b]==null)return [a];const L=[b];while(L[0]!==a)L.unshift(prev[L[0]]);return L;}
function nearRoom(x,y){let best=null,bd=1e9;for(const r in RINFO){const R=RINFO[r],d=Math.hypot(Math.max(R.x0-x,0,x-R.x1),Math.max(R.top-y,0,y-R.floor));if(d<bd){bd=d;best=r;}}return [best,bd];}
/* r73: THE ENGINE WASH. Astern of the nozzles the exhaust runs to the edge of the picture. Nobody drifts through that.
   A place picked inside it is moved to its nearest edge, and a path that would cross it goes round instead: in front of the stern,
   just forward of the nozzles (the wash reaches the right-hand edge, so there is no way round behind it) */
const WASH={x0:2100,y0:280,y1:880},STERNX=2034,MID=60; /* y0..y1 are for the middle of the suit; her feet are MID lower */
const inWash=(x,y)=>x>WASH.x0-24&&y-MID>WASH.y0-24&&y-MID<WASH.y1+24;
function clearOfWash(x,y){if(!inWash(x,y))return [x,y];const up=(y-MID)-(WASH.y0-40),dn=(WASH.y1+40)-(y-MID),lf=x-(WASH.x0-60),m=Math.min(up,dn,lf);return m===lf?[WASH.x0-60,y]:m===up?[x,WASH.y0-40+MID]:[x,WASH.y1+40+MID];}
function aroundStern(ax,ay,bx,by){let hit=false;for(let i=1;i<28;i++){const u=i/28;if(inWash(ax+(bx-ax)*u,ay+(by-ay)*u)){hit=true;break;}}if(!hit)return [];
  const side=y=>(y-MID)<(WASH.y0+WASH.y1)/2?WASH.y0-46+MID:WASH.y1+46+MID,V=[];
  if(ax>STERNX+40)V.push([STERNX,side(ay)]);if(bx>STERNX+40)V.push([STERNX,side(by)]);return V;}
/* where to, and how: (tx,ty) is where her feet should end up */
function plan(tx,ty,slow){const cur=G.space?null:roomAt(G.x,G.y-34);let room=roomAt(tx,ty-34);if(!room){const [r,d]=nearRoom(tx,ty-34);if(d<70)room=r;}
  const P=[];let N=[];G.slow=!!slow;
  if(!room){ /* out in the open */
    tx=clamp(tx,50,CUT.W-50);ty=clamp(ty,110,CUT.H-30);[tx,ty]=clearOfWash(tx,ty);
    let fx=G.x,fy=G.y;if(!G.space){N=route(nearestNode(G.x,G.y,cur),'eva-center');while(cur&&N.length>=2&&NROOM[N[1]]===cur)N.shift();for(const k of N)P.push(pt(k));fx=NODES['eva-center'][0];fy=NODES['eva-center'][1]-HOV;}
    for(const v of aroundStern(fx,fy,tx,ty))P.push({x:v[0],y:v[1],space:1});
    P.push({x:tx,y:ty,space:1});}
  else{const R=RINFO[room];tx=clamp(tx,R.x0+30,R.x1-30);ty=clamp(ty,R.top+122,R.floor-HOV);
    if(!G.space&&room===cur){G.path=[{x:tx,y:ty}];return;}
    const end=nearestNode(tx,ty,room);
    if(G.space){N=route('eva-center',end);}else{N=route(nearestNode(G.x,G.y,cur),end);while(cur&&N.length>=2&&NROOM[N[1]]===cur)N.shift();}
    while(N.length>=2&&NROOM[N[N.length-2]]===room)N.pop();
    if(G.space){const e=NODES['eva-center'];for(const v of aroundStern(G.x,G.y,e[0],e[1]-HOV))P.push({x:v[0],y:v[1],space:1});}
    const n0=P.length;for(const k of N)P.push(pt(k));if(G.space&&P[n0])P[n0].dock=1;P.push({x:tx,y:ty});}
  /* the airlock is crossed properly: one door at a time, with a pause between */
  const ids=P.map(p=>p.n);if(ids.includes('a-inner')&&ids.includes('a-outer')){const c=P.find(p=>p.n==='a-center');if(c)c.wait=2.4;}
  /* ease into the sharp turns (the shaft, a door at a height) so she never clips a corner */
  let px=G.x,py=G.y;for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],d1=Math.hypot(a.x-px,a.y-py)||1,d2=Math.hypot(b.x-a.x,b.y-a.y)||1;a.turn=((a.x-px)*(b.x-a.x)+(a.y-py)*(b.y-a.y))/(d1*d2)<.6;px=a.x;py=a.y;}
  G.path=P;}
G.go=(x,y,slow)=>plan(x,y,slow);G.api={NODES,NROOM,RINFO,route,roomAt,rnd,clamp,pick,active:()=>active(),pois:()=>pois(),mark:(a,kind)=>PR.marks.push({a,t:performance.now(),kind}),hold:ms=>{PR.at=performance.now()+ms;}};G.under=[];
let POI=null;function pois(){if(POI)return POI;POI=[];try{const O=M.objects;for(const k in O){const o=O[k];if(!o.spot)continue;let p=null;try{p=CUT.place(o.spot);}catch(e){}if(p&&p.x!=null&&!POI.some(q=>q.x===p.x&&q.y===p.y))POI.push({id:k,x:p.x,y:p.y});}}catch(e){}return POI;}
function active(){const g=GP();return !!(g&&g.state==='watch'&&g.watch);}
/* HALCYON speaks seldom: never twice in five minutes */
const HAL={at:-1e9,said:{}};function halcyon(text,key,pn){pn=pn||performance.now();if(pn-G.t0<40000||pn-HAL.at<600000||(key&&HAL.said[key]))return false;HAL.at=pn;if(key)HAL.said[key]=1;try{GP().toast('HALCYON · '+text,7);}catch(e){}return true;}
/* her own watch, when nobody is steering */
function wander(pn,g){const acts=[['poi',3],['window',4],['k9',2],['table',1],['out',G.space?0:1.2]];if(pn>(G.plantAt||0))acts.push(['plant',2.2]);if(pn>G.mug)acts.push(['cocoa',2.4]);if(G.acts>=3&&!G.night)acts.push(['bed',.9]);if(G.night&&G.acts>=2)acts.push(['bed',9]);G.acts++;let tot=acts.reduce((s,a)=>s+a[1],0),u=Math.random()*tot,kind='poi';for(const [k,w] of acts){u-=w;if(u<=0){kind=k;break;}}
  if(G.act&&G.act.next){kind=G.act.next;}
  let tx,ty,stay=rnd(14,30),face=0;
  if(kind==='window'){const w=pick([[227,552,-1],[1168,552,-1]]);tx=w[0]+18;ty=w[1]-rnd(6,40);face=w[2];stay=rnd(90,180);} /* a long look: nothing has to happen */
  else if(kind==='cocoa'){const p=CUT.place('comms.shelf');tx=p.x+34;ty=p.y-HOV;face=-1;stay=13;} /* made with care: steam, a wait, more steam, then the cup */
  else if(kind==='plant'){tx=PLANT[0]-46;ty=PLANT[1]+78;face=1;stay=11;}
  else if(kind==='k9'){let k=null;try{k=CUT.actorAt(g.P,g.TIMES,g.now(),'k9');}catch(e){}if(!k){kind='poi';}else{tx=k.x-54;ty=k.y-HOV;face=1;stay=rnd(30,50);}}
  else if(kind==='table'){tx=736+rnd(-20,40);ty=846-rnd(6,30);stay=rnd(30,60);}
  else if(kind==='bed'){tx=BUNK[0]+24;ty=BUNK[1]-HOV;face=-1;stay=1e7;}
  else if(kind==='out'){tx=2131;ty=1116-HOV;face=1;stay=rnd(40,75);}
  if(kind==='poi'){const L=pois();const p=L.length?pick(L):{x:rnd(300,1900),y:846};tx=p.x+rnd(-36,36);ty=p.y-rnd(6,60);}
  G.act={kind,stay,face};plan(tx,ty,true);}
function arrived(pn,g){const a=G.act;
  if(a){G.wanderAt=pn+a.stay*1000;G.last=pn-30000;if(a.face)G.face=a.face;
    if(a.kind==='cocoa'){PR.steam={x:G.x-34,y:G.y-54,t:pn};PR.steamAt=pn;try{g.sfx('valve',G.x,.4);}catch(e){}G.mugFrom=pn+7000;G.mug=pn+170000;setTimeout(()=>{if(G.on&&!G.path.length)PR.steam={x:G.x-34,y:G.y-54,t:performance.now()};},5200);G.act={next:'window'};return;}
    if(a.kind==='plant'){G.plantAt=pn+420000;PR.water=pn;try{g.hero('touch',{i:[4,2],v:.3,gap:.3});}catch(e){}}
    if(a.kind==='bed'){G.asleep=true;G.wakeAt=G.night?Infinity:pn+rnd(45,80)*1000;G.acts=0;try{__town.sleep('deadscout',true);}catch(e){}if(G.night)halcyon('SLEEP WELL · I HAVE THE SHIP','bed',pn);}
    if(a.kind==='k9'){PR.k9=pn;PR.marks.push({a:'k9',t:pn,kind:'heart'});G.heartAt=pn;} /* time together: the astronaut settles beside Scout for a while */
    G.act=null;return;}
  /* where you sent her: the thing she stops at answers with a short phrase of its own, three notes from the same scale */
  for(const p of pois()){if(Math.hypot(p.x-G.x,(p.y-40)-(G.y-36))<56){let h=0;for(const c of p.id)h=(h*31+c.charCodeAt(0))>>>0;const b=h%5,sh=[[0,2,4],[4,2,3],[0,3,2],[2,4,5],[1,3,5],[4,5,2]][(h>>3)%6];
      try{g.hero('touch',{i:sh.map(v=>b+v),v:.42,voice:'rhodes',gap:.17});}catch(e){}try{window.__town&&__town.ring(p.x,p.y-36,'#ff9a3c',1.2,30);}catch(e){}break;}}}
function tick(dt,pn){const g=GP();if(!active()){if(G.on){G.on=false;try{CUT.exterior(null);}catch(e){}}return;}
  if(!G.on){G.on=true;G.t0=pn;G.wanderAt=pn+26000;G.last=pn;hint();WK={t0:pn,st:0};PR.k9=pn-45000+17000;G.act={next:'cocoa'};G.star=pn+72000;try{CUT.toy({drive:.06,dv:.06});}catch(e){} /* r68: asleep from the very first frame, so the running engines never flash before the spool */try{g.P.script.push({at:g.now(),hide:'deadscout'});g.P.rev++;}catch(e){}}
  if(!G.path.length&&pn-G.last>24000&&pn>G.wanderAt){G.wanderAt=pn+20000;try{wander(pn,g);}catch(e){}}
  const wp=G.path[0];
  if(wp){if(wp.space&&!G.space){G.space=true;}
    const dx=wp.x-G.x,dy=wp.y-G.y,d=Math.hypot(dx,dy),fin=G.path.length===1,top=G.space?(G.slow?46:84):(G.slow?62:160),sp=Math.hypot(G.vx,G.vy);
    if(wp.t1){const f=Math.pow(.02,dt);G.vx*=f;G.vy*=f;if(pn>wp.t1)G.path.shift();}
    else if(!fin&&d<(wp.turn||wp.wait?9:18)){if(wp.dock&&G.space){G.space=false;halcyon('WELCOME BACK','back',pn);}if(wp.wait){wp.t1=pn+wp.wait*1000;try{g.sfx('valve',wp.x,.45);}catch(e){}}else G.path.shift();}
    else if(fin&&d<5&&sp<12){G.path.shift();G.vx=G.vy=0;G.last=pn;G.wanderAt=Math.max(G.wanderAt,pn+24000);try{arrived(pn,g);}catch(e){}}
    else{const want=fin?Math.min(top,d*1.5):(wp.turn||wp.wait)?Math.min(top,d*2.2+34):top,k=Math.min(1,dt*(G.space?1.8:4.2));G.vx+=((dx/(d||1))*want-G.vx)*k;G.vy+=((dy/(d||1))*want-G.vy)*k;}}
  else{const f=Math.pow(.05,dt);G.vx*=f;G.vy*=f;}
  /* r72: outside, the pack answers every change of speed or heading with a small puff of cold gas, pushed the opposite way. Coasting needs none.
     (A real suit's jet pack is cold nitrogen: no flame, no glow, a faint white puff.) Indoors there are no jets: you push off the walls */
  if(G.space&&dt>0&&!G.calm){const ax=(G.vx-(G.pvx||0))/dt,ay=(G.vy-(G.pvy||0))/dt,am=Math.hypot(ax,ay);if(am>26&&pn-(G.puffAt||0)>110){G.puffAt=pn;const px=G.x-ax/am*30,py=G.y-58-ay/am*40;
      for(let i=0;i<3;i++)PUFF.push({x:px+rnd(-3,3),y:py+rnd(-4,4),vx:-ax/am*rnd(60,110)+rnd(-14,14)+G.vx*.3,vy:-ay/am*rnd(60,110)+rnd(-14,14)+G.vy*.3,t:pn,life:rnd(650,1100)});if(PUFF.length>48)PUFF.splice(0,PUFF.length-48);}}
  G.pvx=G.vx;G.pvy=G.vy;
  G.x=clamp(G.x+G.vx*dt,40,CUT.W-40);G.y=clamp(G.y+G.vy*dt,90,CUT.H-20);if(Math.abs(G.vx)>6)G.face=G.vx>0?1:-1;
  /* out on the deck or beyond it, the ship is seen from outside; aboard, it opens */
  const out=G.y>880&&G.x>1640&&G.path.some(p=>p.space||p.x>1945); /* r81: on the way out, the hull is already closing as the astronaut crosses the airlock, so the wall is whole by the time the door is reached */
  const want=G.space||(G.x>1945&&G.y>880)||out?1:0;G.ext+=(want-G.ext)*Math.min(1,dt*1.6);if(Math.abs(want-G.ext)<.004)G.ext=want;
  try{if(G.ext>.004){CUT.exterior(G.ext);G.extOn=true;}else if(G.extOn){G.extOn=false;CUT.exterior(null);}}catch(e){}
  if(WK)try{waking(pn,g);}catch(e){WK=null;}
  presence(pn,g);
  if(pn>PR.bedAt){PR.bedAt=pn+4000;const n=G.isNight();if(n!==G.night){G.night=n;G.acts=0;if(!n&&G.asleep)wake();}}
  /* K9 keeps her company when it can reach her */
  if(pn>G.k9At){G.k9At=pn+6500;try{const k=CUT.actorAt(g.P,g.TIMES,g.now(),'k9');if(k&&!G.space&&!G.path.length&&!G.asleep){const r=roomAt(G.x,G.y-34),fl=r&&RINFO[r].floor;
        if(fl&&r!=='eva'&&Math.abs(k.y-fl)<30&&Math.abs(k.x-G.x)>150&&!k.walk&&window.K9NAV&&!K9NAV.busy()){const hit=CUT.pick(g.P,g.TIMES,g.now(),G.x-G.face*60,fl-40);if(hit&&hit.type==='place')K9NAV.go(hit.ref,{});}}}catch(e){}}}
/* HALCYON looks after her; it never asks anything of her.
   - a dim room warms while she is in it, and settles back a few seconds after she leaves (at night the quarters stay low for the sleepers)
   - doors slide open as she comes to them, and close behind her
   - K9 knows her: a chirp and a small heart
   - the meal unit lets off steam as she goes by */
/* THE SHIP WAKES. It was asleep, not dead: lamps low, the engines on a pilot glow, no music. A beat of quiet; then the drive spools
   and the music comes up with it; then, as the hull opens, the lamps warm outward from her room and K9 lifts its head.
   It happens by itself every time you come aboard. Nothing has to be switched on */
let WK=null,WK0=null;
/* r68: the moment COME ABOARD is pressed the drive drops to its pilot glow, under the veil, before the ship is shown */
addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('[data-b=listen]');if(!b)return;try{const T=CUT.toy({});if(WK0==null)WK0=T.drive==null?1:T.drive;CUT.toy({drive:.06,dv:.06});}catch(_){}} ,true);
function waking(pn,g){const el=pn-WK.t0,T=CUT.toy({}),sc=window.__toys&&__toys.S&&__toys.S.mood;
  if(WK.st===0){if(el<350)return;WK.sc=sc;WK.drive=WK0!=null?WK0:(T.drive==null||T.drive<.2)?1:T.drive;WK.lv={};for(const r in M.rooms){WK.lv[r]=T.room[r]==null?1:T.room[r];}
    const low={};for(const r in WK.lv)low[r]=Math.min(WK.lv[r],.12);CUT.toy({drive:.06,dv:.06,room:low});WK.st=1;PR.at=pn+1e9;return;}
  if(sc!==WK.sc){if(!WK.up)CUT.toy({drive:WK.drive||1});WK=null;PR.at=0;return;} /* a scene picked meanwhile sets its own lights */
  if(WK.st===1&&el>2600){WK.st=2;return;} /* r69: no one-shot engine effect; the ship's hum itself swells (game.js) */
  if(WK.st>=2&&!WK.up){const u=Math.min(1,(el-2600)/2800);CUT.toy({drive:.06+((WK.drive||1)-.06)*u*u});if(u>=1)WK.up=1;} /* the beams lengthen over about three seconds */
  if(WK.st===2){let ea=0;try{ea=CUT.extAt();}catch(e){}if(el<4200||(ea>.6&&el<14000))return;
    const R0=RINFO['crew-quarters'],cx=(R0.x0+R0.x1)/2,cy=R0.floor-100;WK.order=Object.keys(WK.lv).sort((a,b)=>{const d=r=>{const R=RINFO[r];return Math.hypot((R.x0+R.x1)/2-cx,(R.floor-100-cy)*1.4);};return d(a)-d(b);});WK.i=0;WK.next=pn;WK.st=3;return;}
  if(WK.st===3&&pn>=WK.next){const r=WK.order[WK.i++];if(r){CUT.toy({room:{[r]:WK.lv[r]}});WK.next=pn+380;if(WK.i===2)try{const k=CUT.actorAt(g.P,g.TIMES,g.now(),'k9');if(k&&!k.walk){g.P.script.push({at:g.now(),actor:'k9',do:'signal-detect',for:2.4});g.P.rev++;}g.sfx('chirp',k?k.x:null,.5);}catch(e){}}
    else if(WK.up){WK=null;PR.at=0;PR.scene=sc;}}}
const PR={room:null,prev:{},left:{},scene:null,doors:{},crew:{},k9:-1e9,marks:[],steamAt:-1e9,at:0,asleep:{},bedAt:0};G.pr=PR;
function presence(pn,g){if(pn<PR.at)return;PR.at=pn+350;const aboard=!G.space,t=g.now(),night=G.night||G.asleep;if(G.asleep&&pn>(G.wakeAt||Infinity)){wake();G.wanderAt=pn+3000;G.last=pn-30000;}
  try{const sc=window.__toys&&__toys.S&&__toys.S.mood;if(sc!==PR.scene){PR.scene=sc;PR.prev={};PR.left={};PR.room=null;PR.qPrev=undefined;} /* a new scene sets its own lights: forget what was borrowed */
    const T=CUT.toy({}),r=aboard?roomAt(G.x,G.y-40):null,lvl=k=>T.room[k]==null?1:T.room[k];
    if(night&&PR.qPrev===undefined&&lvl('crew-quarters')>.5){PR.qPrev=lvl('crew-quarters');CUT.toy({room:{'crew-quarters':.42}});}
    if(!night&&PR.qPrev!==undefined){CUT.toy({room:{'crew-quarters':PR.qPrev}});PR.qPrev=undefined;}
    if(r&&r!==PR.room&&!(night&&r==='crew-quarters')){const lv=lvl(r);if(lv<.98&&PR.prev[r]==null){PR.prev[r]=lv;CUT.toy({room:{[r]:Math.min(1,lv+.5)}});}}
    if(PR.room&&PR.room!==r)PR.left[PR.room]=pn;PR.room=r;
    for(const k in PR.prev){if(k!==r&&pn-(PR.left[k]||0)>6000){CUT.toy({room:{[k]:PR.prev[k]}});delete PR.prev[k];}}}catch(e){}
  try{for(const id in M.doors){if(/maint/.test(id))continue;const d=M.doors[id],near=(aboard&&!G.asleep&&Math.abs(G.x-d.x)<(d.big?96:76)&&G.y-36>d.y-d.h-30&&G.y-36<d.y+30)||(!d.big&&G.movers&&G.movers().some(m=>Math.abs(m.x-d.x)<54&&Math.abs(m.y-d.y)<26));
      if(near){if(!PR.doors[id]){CUT.toy({door:{[id]:1}});g.sfx('airopen',d.x,d.big?.45:.3);}PR.doors[id]=pn+(d.big?1500:2600);}else if(PR.doors[id]&&pn>PR.doors[id]){CUT.toy({door:{[id]:0}});delete PR.doors[id];}}}catch(e){}
  try{    const k=CUT.actorAt(g.P,g.TIMES,t,'k9');if(k&&aboard&&Math.hypot(k.x-G.x,(k.y-20)-(G.y-36))<95&&pn-PR.k9>45000){PR.k9=pn;PR.marks.push({a:'k9',t:pn,kind:'heart'});G.heartAt=pn;
      if(!k.walk){g.P.script.push({at:t,actor:'k9',do:'signal-detect',for:2.2});g.P.rev++;}}}catch(e){}
  try{const p=CUT.place('comms.shelf');if(p&&aboard&&Math.hypot(p.x-G.x,(p.y-40)-(G.y-36))<60&&pn-PR.steamAt>60000){PR.steamAt=pn;PR.steam={x:p.x,y:p.y-60,t:pn};g.sfx('valve',p.x,.3);}}catch(e){}}
const BUNK=[623,846],PLANT=[915,650]; /* the plant on the quarters locker: the one living thing aboard besides the two of them */
function wake(){if(!G.asleep)return;G.asleep=false;try{__town.sleep('deadscout',false);}catch(e){}G.act=null;}
const GLYPH={z:['111','001','010','100','111'],heart:['01010','11111','11111','01110','00100']};
function glyph(x,rows,cx,cy,u,col){const w=rows[0].length;x.fillStyle='#0b0e11';x.fillRect(cx-(w>>1)*u-u,cy-u,(w+2)*u,(rows.length+2)*u);x.fillStyle=col;rows.forEach((r,j)=>{for(let i=0;i<w;i++)if(r[i]==='1')x.fillRect(cx-(w>>1)*u+i*u,cy+j*u,u,u);});}
/* drawn in the ship's own pixels */
const DRIFT=[16,17,18,17];
/* the near railings of the back deck, lifted out of the outside art by their colour (rail orange), once */
const RAILS={x:1944,y:1036,w:392,h:96,c:null,tried:0};
function rails(){if(RAILS.c)return RAILS.c;if(RAILS.tried>40)return null;RAILS.tried++;const c=document.createElement('canvas');c.width=RAILS.w;c.height=RAILS.h;const g=c.getContext('2d');g.translate(-RAILS.x,-RAILS.y);
  let ok=false;try{ok=CUT.layer('exterior',g,RAILS.x,RAILS.y,RAILS.w,RAILS.h,1);}catch(e){}if(!ok)return null;let d;try{d=g.getImageData(0,0,RAILS.w,RAILS.h);}catch(e){return null;}const p=d.data;
  for(let y=0;y<RAILS.h;y++)for(let X=0;X<RAILS.w;X++){const i=(y*RAILS.w+X)*4,r=p[i],gg=p[i+1],b=p[i+2],wx=RAILS.x+X,near=(wx<2012)||(wx>2196&&wx<2326);if(!(near&&r>135&&r-b>64&&gg>55&&gg<r*.82))p[i+3]=0;}
  g.setTransform(1,0,0,1,0,0);g.putImageData(d,0,0);return RAILS.c=c;}const PUFF=[];G.puff=PUFF;
/* HER SUIT (r66). Orange, cream bands and pack, charcoal gloves and boots, a white helmet, a dark visor.
   The sheet she shares has one palette for the whole figure, so each of the four frames she uses is painted once by region
   (boxes in the frame's own art pixels, from its top-left corner) and kept */
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const SRC={'246,239,228':0,'233,215,194':1,'100,157,161':2,'68,109,117':3},GLASS={'46,49,52':1,'20,24,28':1,'41,42,49':1};
const PAL={body:['#ffb869','#ff9a3c','#e07b2a','#a8501e'],band:['#f6efe4','#e9d7c2','#c6ab92','#907763'],helm:['#fdfaf5','#f6efe4','#d9c8b4','#a89280'],dark:['#5c544c','#4a433d','#302b27','#201d1b']};for(const k in PAL)PAL[k]=PAL[k].map(hex);
const REG={0:{visor:[[13,6,24,15]],helm:[[9,0,25,15]],pack:[[2,8,8,14]],band:[[1,15,8,19],[21,16,27,19],[8,40,15,43],[17,40,25,43],[11,22,13,24]],dark:[[1,31,8,38],[23,30,29,37],[5,49,13,59],[18,49,29,57]]},
  16:{visor:[[22,7,30,15]],helm:[[16,0,30,15]],pack:[[7,6,14,13]],band:[[6,14,12,17],[22,15,28,18],[10,38,16,41],[18,38,24,41],[15,22,17,24]],dark:[[2,29,8,35],[27,29,36,35],[0,47,7,57],[10,47,17,56]]},
  17:{visor:[[25,7,35,15]],helm:[[21,0,36,15]],pack:[[12,5,20,13]],band:[[9,14,16,18],[26,17,33,20],[11,38,18,41],[20,38,27,41],[17,22,19,24]],dark:[[3,29,10,34],[31,29,43,35],[1,46,7,55],[11,47,17,57]]},
  18:{visor:[[33,8,43,16]],helm:[[28,0,44,16]],pack:[[17,4,27,13]],band:[[14,13,20,17],[30,17,37,20],[13,37,20,40],[22,37,29,40],[20,21,22,23]],dark:[[6,27,13,32],[32,31,40,40],[0,44,6,53],[11,48,17,57]]}};
const SUIT={},CW=240,CH=280,AX=120,AY=260;
function suit(fr){if(SUIT[fr])return SUIT[fr];const c=document.createElement('canvas');c.width=CW;c.height=CH;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  try{CUT.sprite('deadscout','idle',AX,AY,false,0,g,1,[[fr,1]]);}catch(e){return null;}
  let d;try{d=g.getImageData(0,0,CW,CH);}catch(e){return null;}const p=d.data;let x0=CW,y0=CH,any=false;
  for(let y=0;y<CH;y++)for(let x=0;x<CW;x++)if(p[(y*CW+x)*4+3]){any=true;if(x<x0)x0=x;if(y<y0)y0=y;}
  if(!any)return null;const R=REG[fr]||REG[0],inr=(L,x,y)=>L.some(b=>x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3]),VIS=[20,24,28];
  for(let y=y0;y<CH;y++)for(let x=x0;x<CW;x++){const i=(y*CW+x)*4;if(!p[i+3])continue;const ax=(x-x0)>>1,ay=(y-y0)>>1,key=p[i]+','+p[i+1]+','+p[i+2];let col=null;
    if(inr(R.visor,ax,ay)&&GLASS[key])col=VIS;
    else if(SRC[key]!=null){const pack=inr(R.pack,ax,ay);col=(inr(R.dark,ax,ay)?PAL.dark:pack||inr(R.band,ax,ay)?PAL.band:inr(R.helm,ax,ay)?PAL.helm:PAL.body)[SRC[key]];}
    if(col){p[i]=col[0];p[i+1]=col[1];p[i+2]=col[2];}}
  g.putImageData(d,0,0);return SUIT[fr]=c;}
CUT.overlay((x,t,SS)=>{const u=SS||2,pn=performance.now(),sp=Math.hypot(G.vx,G.vy);
  if(!G.on){ /* the start screen: she is already aboard, in her own suit, drifting a little by the bunks */
    const g=GP();if(!g||g.state!=='title')return;const im=suit(DRIFT[Math.floor(pn/900)%4]);if(!im)return;let ea=0;try{ea=clamp(CUT.extAt(),0,1);}catch(e){}if(ea>.97)return;
    const X=Math.round((822+Math.sin(pn/5200)*18)/u)*u,Y=Math.round((826+Math.sin(pn/1700)*7)/u)*u;x.save();x.globalAlpha=1-ea;x.imageSmoothingEnabled=false;x.drawImage(im,X-AX,Y-AY);x.restore();return;}
  let vin=1;try{vin=1-clamp(CUT.extAt(),0,1);}catch(e){}
  if(vin>.5)for(const f of G.under)try{f(x,t,u,pn,vin);}catch(e){}
  if(vin>.5)try{const g=GP();for(let i=PR.marks.length-1;i>=0;i--){const m=PR.marks[i],age=(pn-m.t)/1000;if(age>2.8){PR.marks.splice(i,1);continue;}const c=CUT.actorAt(g.P,g.TIMES,t,m.a);if(!c)continue;const X=Math.round(c.x/u)*u;
      const U=u*3; /* the whole ship is drawn at about half size, so a mark needs blocks of three art pixels to read */
      glyph(x,GLYPH.heart,X,Math.round((c.y-72-age*8)/U)*U,U,'#ff9a3c');}}catch(e){}
  if(PR.steam&&vin>.5){const sa=(pn-PR.steam.t)/1000;if(sa>3.4)PR.steam=null;else for(let i=0;i<6;i++){const w=sa-i*.32;if(w<0||w>1.8)continue;x.globalAlpha=.95*(1-w/1.8);x.fillStyle='#f6efe4';const q=u*4;x.fillRect(Math.round((PR.steam.x+Math.sin(w*3+i*2)*8+(i%3-1)*8)/q)*q,Math.round((PR.steam.y-w*34)/q)*q,q,q);}x.globalAlpha=1;}
  const amp=G.space?1.6:1,bob=(Math.sin(pn/900)*4+Math.sin(pn/2300)*3)*amp,Y=G.y+bob;
  for(let i=PUFF.length-1;i>=0;i--){const p=PUFF[i],age=pn-p.t;if(age>p.life){PUFF.splice(i,1);continue;}const k=age/p.life,q=k<.45?u*4:u*2,e=age/1000;x.globalAlpha=k<.35?1:1-(k-.35)/.65;x.fillStyle=k<.4?'#f6efe4':'#e9d7c2';x.fillRect(Math.round((p.x+p.vx*e*(1-k*.4))/q)*q,Math.round((p.y+p.vy*e*(1-k*.4))/q)*q,q,q);}x.globalAlpha=1;
  let vis=1;try{if(!G.space&&G.ext<.5)vis=1-clamp(CUT.extAt(),0,1);}catch(e){} /* while the ship is shown closed (the opening), she is inside it and out of sight */
  if(vis<.03)return;
  if(G.asleep)return; /* she is in the bunk; the blanket is drawn with the room */
  const fr=sp>10||G.space?DRIFT[Math.floor(pn/700)%4]:0,im=suit(fr);
  if(im){const X=Math.round(G.x/u)*u,Yr=Math.round(Y/u)*u;x.save();x.globalAlpha=vis;x.imageSmoothingEnabled=false;G.roll+=((G.space&&!G.calm?1:0)-G.roll)*.02;if(G.roll>.02){const cy=Yr-64,a=(Math.sin(pn/3700)*.24+Math.sin(pn/9100)*.12)*G.roll;x.translate(X,cy);x.rotate(a);x.translate(-X,-cy);} /* outside she turns a little as she drifts */
    if(G.face<0){x.translate(X,0);x.scale(-1,1);x.translate(-X,0);}x.drawImage(im,X-AX,Yr-AY);x.restore();}
  else try{CUT.sprite('deadscout','idle',G.x,Y,G.face<0,t,x,vis,[[fr,1]]);}catch(e){}
  if(PR.water){const wa=(pn-PR.water)/1000;if(wa>6)PR.water=0;else for(let i=0;i<5;i++){const w=(wa*1.3+i*.37)%1.6;if(w>1||wa<.8)continue;x.globalAlpha=.9*(1-w);x.fillStyle='#f6efe4';const q=u*2;x.fillRect(Math.round((G.x+G.face*30+w*10)/q)*q,Math.round((G.y-70+w*w*44)/q)*q,q,q);}x.globalAlpha=1;}
  /* r79: THE BACK DECK. Seen from outside, the door to the deck is in the stern wall, edge-on. Standing on the deck the astronaut is behind
     the deck's near railings, and coming through the door is behind the door housing until clear of it. So, while on the deck (not out in
     open space), the housing and the near railings are drawn again over the astronaut from the outside art */
  /* r80: the railings are there whether the hull is shown open or closed, so they are drawn at full strength either way. (They used to
     fade in with the outside view, which is still on its way in when the astronaut steps out: so going out passed in front of the rail,
     and coming back, with the outside view already up, passed behind it.) Only the door housing waits for the outside view */
  /* r81: everything of the astronaut that is still inside the stern wall (left of the door housing's outer edge) is behind that wall
     as far as the outside view is showing, going out as well as coming in */
  if(!G.space&&G.x>1540&&G.y>900){let ea=0;try{ea=clamp(CUT.extAt(),0,1);}catch(e){}if(ea>.02)try{CUT.layer('exterior',x,1500,860,484,290,ea);}catch(e){}
    if(G.x>1925){const R=rails();if(R){x.save();x.imageSmoothingEnabled=false;x.drawImage(R,RAILS.x,RAILS.y);x.restore();}}}
  if(pn<G.mug&&pn>(G.mugFrom||0)&&!G.space&&vis>.9){const q=u*3,mx=Math.round((G.x+G.face*30-q/2)/u)*u,my=Math.round((Y-62)/u)*u;x.fillStyle='#0b0e11';x.fillRect(mx-u,my-u,q+2*u,q+2*u);x.fillStyle='#ff9a3c';x.fillRect(mx,my,q,q);
    const s=(pn/1000)%2.6;if(s<1.6){x.globalAlpha=.8*(1-s/1.6);x.fillStyle='#f6efe4';x.fillRect(mx+(s>.8?u:0),Math.round((my-6-s*14)/u)*u,2*u,2*u);x.globalAlpha=1;}}});
/* the sky keeps to itself: stars, the planet, the comet and the far beacon the ship already had. Added here: a shooting star now and then,
   quick and small, behind the hull */
function streak(x,q,sx,sy,dx,len,u){const hx=sx+dx*len*u,hy=sy+len*.34*u;for(let k=0;k<9;k++){const a=(1-k/9)*(u<.8?1:(1-u)/.2);if(a<=.05)continue;x.globalAlpha=a;x.fillStyle=k<2?'#f6efe4':k<5?'#7ee3e5':'#1fb4ce';x.fillRect(Math.round((hx-dx*k*q*1.6)/q)*q,Math.round((hy-k*q*.55)/q)*q,q,q);}x.globalAlpha=1;}
CUT.behind&&CUT.behind((x,t,SS)=>{if(!active()||G.calm)return;const q=(SS||2)*2,pn=performance.now(),per=47,n=Math.floor(t/per),ph=t-n*per,h=k=>CUT._hash(n,7200+k);
  if(!(h(0)>.62||ph>1.1))streak(x,q,CUT.W*(.08+.84*h(1)),CUT.H*(h(2)<.5?.02+.1*h(3):.86+.1*h(3)),h(4)<.5?-1:1,220+260*h(5),ph/1.1);
  if(G.star&&pn>G.star){const u=(pn-G.star)/1400;if(u>1)G.star=0;else streak(x,q,CUT.W*.2,CUT.H*.03,1,520,u);} /* the one every visit gets, a little over a minute in */
  if(G.shower){const e=(pn-G.shower)/1000;if(e>9)G.shower=0;else for(let i=0;i<11;i++){const u=(e-i*.62-CUT._hash(i,7301)*.4)/1.2;if(u<0||u>1)continue;streak(x,q,CUT.W*(.05+.9*CUT._hash(i,7302)),CUT.H*(CUT._hash(i,7303)<.6?.01+.11*CUT._hash(i,7304):.87+.08*CUT._hash(i,7304)),-1,260+200*CUT._hash(i,7305),u);}}});
/* input: one verb. The arrow keys are the same verb in steps */
let noteAt=0;function send(tx,ty){const pn=performance.now();wake();G.act=null;G.last=pn;if(!G.found){G.found=true;try{localStorage.setItem('driftnaut.found','1');}catch(e){}}
  if(pn-noteAt>110){noteAt=pn;const i=Math.round(clamp(1-((ty-34)-230)/(1180-230),0,1)*9);try{GP().hero('touch',{i,v:.5});}catch(e){}} /* higher up the ship, higher in pitch */
  plan(tx,ty,false);const f=G.path[G.path.length-1];try{window.__town&&f&&__town.ring(f.x,f.y-34,'#e9d7c2',.8,22);}catch(_){}}
const DIR={ArrowLeft:[-230,0],ArrowRight:[230,0],ArrowUp:[0,-290],ArrowDown:[0,290]};
addEventListener('keydown',e=>{if(!active()||!DIR[e.code]||e.metaKey||e.ctrlKey||e.altKey)return;e.preventDefault();if(e.repeat)return;const f=G.path[G.path.length-1]||G,d=DIR[e.code];send(f.x+d[0],f.y+d[1]);},true);
addEventListener('pointerdown',e=>{if(!active())return;const t=e.target;if(t!==stage&&!(t.closest&&t.closest('.toy')))return;const g=GP(),r=stage.getBoundingClientRect(),V=g.vw();
  send(V[0]+(e.clientX-r.left)/r.width*V[2],V[1]+(e.clientY-r.top)/r.height*V[3]+34);G.lead=e.pointerType!=='touch'?performance.now():0;},true);
/* r78: hold and move. With the button held, the astronaut follows the pointer; let go and the astronaut stays. (Not following a pointer
   that is merely moving: this is a window left open on a desk, and the mouse has other places to be. Touch keeps to taps, because a
   finger dragged on a phone moves the camera) */
addEventListener('pointermove',e=>{if(!G.lead||!(e.buttons&1)||!active())return;const pn=performance.now();if(pn-G.lead<150)return;G.lead=pn;const g=GP(),r=stage.getBoundingClientRect(),V=g.vw();G.act=null;G.last=pn;plan(V[0]+(e.clientX-r.left)/r.width*V[2],V[1]+(e.clientY-r.top)/r.height*V[3]+34,false);},true);
addEventListener('pointerup',()=>{G.lead=0;},true);addEventListener('pointercancel',()=>{G.lead=0;},true);
/* r78: discovery first. The line is shown once, 24 seconds in, only to a visitor who has never clicked the ship */
function hint(){let done=false;try{done=!!localStorage.getItem('driftnaut.found');}catch(e){}if(done)return;setTimeout(()=>{if(!active()||G.found)return;
  GP().toast((window.matchMedia&&matchMedia('(pointer: coarse)').matches?'TAP ANYWHERE TO EXPLORE':'CLICK ANYWHERE TO EXPLORE'),8);},24000);}
let last=0;function loop(now){requestAnimationFrame(loop);const dt=Math.min(.12,(now-(last||now))/1000);last=now;if(document.hidden)return;try{tick(dt,now);}catch(e){}}
requestAnimationFrame(loop);
})();
