/* r63 · THE GHOST. The whole site is one thing now: a lofi radio you can haunt. There are no modes, goals, lists or scores.
   The crew live their day and the music plays; you are the ghost aboard. Click or tap anywhere and she drifts there, straight through walls
   and floors. Leave her alone and she wanders by herself. Past the hull the ship closes into its outside view; drift back and it opens.
   K9 is the only one who can sense her: it follows when it can reach. Things she passes through answer with a soft note from the track.
   She is drawn through CUT.overlay in world pixels (translucent, in the floating pose, with a faint trail), not as one of the engine's actors */
(()=>{
const GP=()=>window.__gp;if(!window.CUT||!document.getElementById('stage'))return;
const stage=document.getElementById('stage'),rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const FLOORS=[552,846,1119],HULL=[110,250,2080,1200]; /* inside this box she is aboard; outside it, outside */
const G={x:760,y:800,vx:0,vy:0,tgt:null,face:1,last:0,wanderAt:0,slow:false,ext:0,trail:[],on:false,t0:0,chimeAt:0,touched:{},k9At:0};
window.__ghost=G;const held={};
const inside=(x,y)=>x>HULL[0]&&x<HULL[2]&&y>HULL[1]&&y<HULL[3];
let POI=null;function pois(){if(POI)return POI;POI=[];try{const O=CUT.MAP.objects;for(const k in O){const o=O[k];if(!o.spot)continue;let p=null;try{p=CUT.place(o.spot);}catch(e){}if(p&&p.x!=null&&!POI.some(q=>q.x===p.x&&q.y===p.y))POI.push({id:k,x:p.x,y:p.y});}}catch(e){}return POI;}
function active(){const g=GP();return !!(g&&g.state==='watch'&&g.watch);}
function tick(dt,pn){const g=GP();if(!active()){if(G.on){G.on=false;try{CUT.exterior(null);}catch(e){}}return;}
  if(!G.on){G.on=true;G.t0=pn;G.wanderAt=pn+9000;G.last=0;hint();}
  /* steering: the arrow keys push; a tap is somewhere to glide to; left alone she wanders */
  let ax=(held.right?1:0)-(held.left?1:0),ay=(held.down?1:0)-(held.up?1:0);if(ax||ay){G.tgt=null;G.last=pn;G.slow=false;}
  if(!G.tgt&&!ax&&!ay&&pn-G.last>22000&&pn>G.wanderAt){const L=pois(),out=Math.random()<.1;G.wanderAt=pn+rnd(16000,42000);G.slow=true;
    G.tgt=out?[rnd(2100,2290),rnd(320,1000)]:(L.length?(()=>{const p=L[Math.floor(Math.random()*L.length)];return [p.x+rnd(-30,30),p.y-rnd(10,60)];})():[rnd(300,1900),rnd(400,1100)]);}
  if(G.tgt){const dx=G.tgt[0]-G.x,dy=G.tgt[1]-G.y,d=Math.hypot(dx,dy),top=G.slow?52:125;if(d<5&&Math.hypot(G.vx,G.vy)<10)G.tgt=null;else{const want=Math.min(top,d*1.4),k=Math.min(1,dt*2.6);G.vx+=((dx/(d||1))*want-G.vx)*k;G.vy+=((dy/(d||1))*want-G.vy)*k;}}
  else{G.vx+=ax*150*dt;G.vy+=ay*150*dt;const f=Math.pow(.42,dt);G.vx*=f;G.vy*=f;const sp=Math.hypot(G.vx,G.vy);if(sp>125){G.vx*=125/sp;G.vy*=125/sp;}}
  G.x=clamp(G.x+G.vx*dt,40,CUT.W-40);G.y=clamp(G.y+G.vy*dt,90,CUT.H-20);if(Math.abs(G.vx)>5)G.face=G.vx>0?1:-1;
  /* outside the hull the ship closes up; inside it opens. Only while she is the one deciding (the opening sequence and the windows keep their own say) */
  const want=inside(G.x,G.y-30)?0:1;G.ext+=(want-G.ext)*Math.min(1,dt*1.6);if(Math.abs(want-G.ext)<.004)G.ext=want;
  try{if(G.ext>.004){CUT.exterior(G.ext);G.extOn=true;}else if(G.extOn){G.extOn=false;CUT.exterior(null);}}catch(e){}
  /* the trail */
  const sp=Math.hypot(G.vx,G.vy);if(sp>8&&pn-(G.trailAt||0)>110){G.trailAt=pn;G.trail.push({x:G.x+rnd(-8,8),y:G.y-rnd(14,62),t:pn});}while(G.trail.length&&pn-G.trail[0].t>1700)G.trail.shift();
  /* things she passes through answer: one soft note from the chord that is playing, and a ring where she touched */
  if(G.ext<.3&&pn>G.chimeAt){for(const p of pois()){if(Math.hypot(p.x-G.x,(p.y-40)-(G.y-36))<44&&pn-(G.touched[p.id]||-1e9)>25000){G.touched[p.id]=pn;G.chimeAt=pn+3200;try{g.hero('chime');}catch(e){}try{window.__town&&__town.ring(p.x,p.y-36,'#7ee3e5',1.4,34);}catch(e){}break;}}}
  presence(pn,g);
  /* K9 senses her, and comes when it can */
  if(pn>G.k9At){G.k9At=pn+5200;try{const k=CUT.actorAt(g.P,g.TIMES,g.now(),'k9');if(k&&G.ext<.3){const fl=FLOORS.reduce((a,b)=>Math.abs(b-G.y)<Math.abs(a-G.y)?b:a);
        if(Math.abs(k.y-fl)<30&&Math.abs(k.x-G.x)>170&&Math.abs(G.y-fl)<170){const hit=CUT.pick(g.P,g.TIMES,g.now(),G.x,fl-40);if(hit&&hit.type==='place'&&window.K9NAV)K9NAV.go(hit.ref,{});}}}catch(e){}}}
/* r64 · PRESENCE. The ship notices her; it never asks anything of her.
   - a dim room warms while she is in it, and settles back a few seconds after she leaves
   - doors slide open as she comes to them, and close behind her
   - a crew member she passes close to senses something ("…?") and carries on; never more than once in a while each
   - K9 knows it is her: a chirp, a look, a small heart
   - the cocoa machine lets off steam as she goes by
   - she carries a faint warm light of her own */
const PR={room:null,prev:{},left:{},scene:null,doors:{},crew:{},k9:-1e9,marks:[],steamAt:-1e9,at:0};G.pr=PR;
function presence(pn,g){if(pn<PR.at)return;PR.at=pn+350;const aboard=G.ext<.3,t=g.now();
  try{const sc=window.__toys&&__toys.S&&__toys.S.mood;if(sc!==PR.scene){PR.scene=sc;PR.prev={};PR.left={};PR.room=null;} /* a new scene sets its own lights: forget what was borrowed */
    const T=CUT.toy({}),r=aboard?CUT.roomOf(G.x,G.y-40):null;
    if(r&&r!==PR.room){const lv=T.room[r]==null?1:T.room[r];if(lv<.98&&PR.prev[r]==null){PR.prev[r]=lv;CUT.toy({room:{[r]:Math.min(1,lv+.5)}});}}
    if(PR.room&&PR.room!==r)PR.left[PR.room]=pn;PR.room=r;
    for(const k in PR.prev){if(k!==r&&pn-(PR.left[k]||0)>6000){CUT.toy({room:{[k]:PR.prev[k]}});delete PR.prev[k];}}}catch(e){}
  try{for(const id in CUT.MAP.doors){if(/outer|maint/.test(id))continue;const d=CUT.MAP.doors[id],near=aboard&&Math.abs(G.x-d.x)<72&&G.y-36>d.y-d.h-30&&G.y-36<d.y+30;
      if(near){if(!PR.doors[id]){CUT.toy({door:{[id]:1}});g.sfx('airopen',d.x,.3);}PR.doors[id]=pn+2600;}else if(PR.doors[id]&&pn>PR.doors[id]){CUT.toy({door:{[id]:0}});delete PR.doors[id];}}}catch(e){}
  try{for(const a of ['pilot','systems','commander']){const c=CUT.actorAt(g.P,g.TIMES,t,a);if(c&&aboard&&Math.hypot(c.x-G.x,(c.y-40)-(G.y-36))<78&&pn-(PR.crew[a]||-1e9)>45000){PR.crew[a]=pn;PR.marks.push({a,t:pn,kind:'q'});}}
    const k=CUT.actorAt(g.P,g.TIMES,t,'k9');if(k&&aboard&&Math.hypot(k.x-G.x,(k.y-20)-(G.y-36))<95&&pn-PR.k9>30000){PR.k9=pn;PR.marks.push({a:'k9',t:pn,kind:'heart'});g.sfx('chirp',k.x,.6);
      if(!k.walk){g.P.script.push({at:t,actor:'k9',do:'signal-detect',for:2.2});g.P.rev++;}}}catch(e){}
  try{const o=CUT.MAP.objects['meal-unit'],p=o&&CUT.place(o.spot);if(p&&aboard&&Math.hypot(p.x-G.x,(p.y-40)-(G.y-36))<60&&pn-PR.steamAt>40000){PR.steamAt=pn;PR.steam={x:p.x,y:p.y-60,t:pn};g.sfx('valve',p.x,.4);}}catch(e){}}
const GLYPH={q:['111','001','011','000','010'],dots:['000','000','000','000','101'],heart:['01010','11111','11111','01110','00100']};
function glyph(x,rows,cx,cy,u,col){const w=rows[0].length;x.fillStyle='#0b0e11';x.fillRect(cx-(w>>1)*u-u,cy-u,(w+2)*u,(rows.length+2)*u);x.fillStyle=col;rows.forEach((r,j)=>{for(let i=0;i<w;i++)if(r[i]==='1')x.fillRect(cx-(w>>1)*u+i*u,cy+j*u,u,u);});}
/* drawn in the ship's own pixels */
const DRIFT=[[16,.7],[17,.7],[18,.7],[17,.7]],REST=[[0,1]];
CUT.overlay((x,t,SS)=>{if(!G.on)return;const u=SS||2,pn=performance.now(),sp=Math.hypot(G.vx,G.vy);
  for(const m of G.trail){const a=1-(pn-m.t)/1700;x.globalAlpha=a*.55;x.fillStyle=a>.6?'#f6efe4':'#7ee3e5';x.fillRect(Math.round(m.x/u)*u,Math.round((m.y-(1-a)*10)/u)*u,2*u,2*u);}x.globalAlpha=1;
  if(G.ext<.5){x.save();x.globalCompositeOperation='lighter';const cx=G.x,cy=G.y-36,rg=x.createRadialGradient(cx,cy,0,cx,cy,140);rg.addColorStop(0,'rgba(255,176,74,'+(.11*(1-G.ext*2)).toFixed(3)+')');rg.addColorStop(1,'rgba(255,176,74,0)');x.fillStyle=rg;x.fillRect(cx-140,cy-140,280,280);x.restore();}
  try{const g=GP();for(let i=PR.marks.length-1;i>=0;i--){const m=PR.marks[i],age=(pn-m.t)/1000;if(age>2.8){PR.marks.splice(i,1);continue;}const c=CUT.actorAt(g.P,g.TIMES,t,m.a);if(!c)continue;const X=Math.round(c.x/u)*u;
      const U=u*3; /* the whole ship is drawn at about half size, so a mark needs blocks of three art pixels to read */
      if(m.kind==='q')glyph(x,age<.7?GLYPH.dots:GLYPH.q,X,Math.round((c.y-150)/U)*U,U,'#e9d7c2');else glyph(x,GLYPH.heart,X,Math.round((c.y-72-age*8)/U)*U,U,'#7ee3e5');}}catch(e){}
  if(PR.steam){const sa=(pn-PR.steam.t)/1000;if(sa>3.4)PR.steam=null;else for(let i=0;i<6;i++){const w=sa-i*.32;if(w<0||w>1.8)continue;x.globalAlpha=.95*(1-w/1.8);x.fillStyle='#f6efe4';const q=u*4;x.fillRect(Math.round((PR.steam.x+Math.sin(w*3+i*2)*8+(i%3-1)*8)/q)*q,Math.round((PR.steam.y-w*34)/q)*q,q,q);}x.globalAlpha=1;} /* a little curl of steam off the meal unit as she passes */
  const bob=Math.sin(pn/900)*5+Math.sin(pn/2300)*3,breath=.56+Math.sin(pn/1600)*.08,Y=G.y+bob;
  try{CUT.sprite('deadscout','idle',G.x,Y,G.face<0,t,x,breath,sp>10?DRIFT:REST);x.save();x.globalCompositeOperation='lighter';CUT.sprite('deadscout','idle',G.x,Y,G.face<0,t,x,.2,sp>10?DRIFT:REST);x.restore();}catch(e){}});
/* input */
const DIR={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
addEventListener('keydown',e=>{if(!active()||!DIR[e.code]||e.metaKey||e.ctrlKey||e.altKey)return;held[DIR[e.code]]=true;e.preventDefault();},true);
addEventListener('keyup',e=>{if(DIR[e.code])held[DIR[e.code]]=false;},true);addEventListener('blur',()=>{for(const k in held)held[k]=false;});
addEventListener('pointerdown',e=>{if(!active())return;const t=e.target;if(t!==stage&&!(t.closest&&t.closest('.toy')))return;const g=GP(),r=stage.getBoundingClientRect(),V=g.vw();
  G.tgt=[V[0]+(e.clientX-r.left)/r.width*V[2],V[1]+(e.clientY-r.top)/r.height*V[3]+34];G.slow=false;G.last=performance.now();try{window.__town&&__town.ring(G.tgt[0],G.tgt[1]-34,'#7ee3e5',.8,22);}catch(_){}},true);
/* said once or twice, then never again */
function hint(){let n=0;try{n=+localStorage.getItem('driftnaut.ghosthint')||0;}catch(e){}if(n>=2)return;setTimeout(()=>{if(!active())return;try{localStorage.setItem('driftnaut.ghosthint',String(n+1));}catch(e){}
  GP().toast((window.matchMedia&&matchMedia('(pointer: coarse)').matches?'YOU ARE THE GHOST ABOARD · TAP ANYWHERE TO DRIFT THERE':'YOU ARE THE GHOST ABOARD · CLICK ANYWHERE TO DRIFT THERE'),8);},16000);}
let last=0;function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(document.hidden)return;try{tick(dt,now);}catch(e){}}
requestAnimationFrame(loop);
})();
