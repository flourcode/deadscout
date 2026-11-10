/* r62 · THINGS TO DO ON A BREAK. All of it lives in GAME; LISTEN never sees any of it.
   - COME ABOARD: when the focus timer reaches a break, one quiet line offers the ship; the break's end takes you back to LISTEN
   - K9: a pat and it follows you for a minute; when it is near, CALL K9 becomes THROW BALL and it fetches
   - three station games (20-40 s, no clocks on screen, no way to lose): TUNE THE ANTENNA (comms), ROUTE THE POWER (engineering), STOW THE CARGO (airlock)
   - a SPACEWALK from the EVA edge: straighten the dish, look at the planet, come home
   World things (the ball, the walker, the tether, the markers) are drawn through CUT.overlay in world pixels, so they sit on the ship's own pixel grid */
(()=>{
const GP=()=>window.__gp;if(!window.CUT||!document.getElementById('stage'))return;
const stage=document.getElementById('stage'),host=stage.parentElement||document.body;
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const S={mode:null,done:{},breakGame:false,follow:0,fetch:null,fetches:0,eva:null};
const css=document.createElement('style');css.textContent=`
.invite{all:unset;position:absolute;left:50%;bottom:calc(3.5% + 84px);transform:translateX(-50%);z-index:8;cursor:pointer;white-space:nowrap;font:400 var(--f2,16px)/1 Silk,monospace;letter-spacing:.18em;color:#8fd6cf;
  padding:.8em 1.2em;background:rgba(11,14,17,.9);box-shadow:inset 0 0 0 2px #8fd6cf,0 3px 0 #0b0e11;opacity:0;transition:opacity .8s;pointer-events:none;-webkit-font-smoothing:none}
.invite.on{opacity:1;pointer-events:auto}body.portrait .invite{bottom:auto;top:calc(100% + 118px);font-size:var(--f3,12px)}
.mg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9;background:#0b0e11;box-shadow:inset 0 0 0 2px rgba(231,219,192,.38),0 0 0 4px #0b0e11,0 6px 0 4px rgba(0,0,0,.5);padding:10px;font:400 var(--f1,8px)/1.6 Silk,monospace;letter-spacing:.18em;color:#e9d7c2;-webkit-font-smoothing:none;user-select:none;touch-action:none}
.mg header{display:flex;justify-content:space-between;align-items:center;gap:2em;font-size:var(--f2,16px);color:#ffb45a;margin-bottom:8px}
.mg header button{all:unset;cursor:pointer;color:#e9d7c2;font-size:var(--f1,8px);padding:.8em 1em;box-shadow:inset 0 0 0 2px rgba(231,219,192,.38)}
.mg canvas{display:block;image-rendering:pixelated;background:#14181c;cursor:pointer}
.mg footer{margin-top:8px;color:#c6ab92;font-size:var(--f3,var(--f2,16px));text-align:center;max-width:100%;white-space:normal}
.mg header button{font-size:var(--f2,16px)}body.phone .mg header{font-size:var(--f3,12px)}body.phone .mg header button{font-size:var(--f1,8px)}
body.portrait .mg{top:8px;transform:translateX(-50%)}
body.eva #hPrompt,body.eva .chores,body.mgopen #hPrompt{display:none!important}`;document.head.appendChild(css);

/* ================= 1 · the break invitation ================= */
let inv=null,invT=0;
function invite(){const G=GP();if(!G||G.state!=='watch')return;if(!inv){inv=document.createElement('button');inv.type='button';inv.className='invite';host.appendChild(inv);
    inv.addEventListener('pointerdown',e=>e.stopPropagation());inv.addEventListener('click',e=>{e.stopPropagation();inv.classList.remove('on');S.breakGame=true;GP().enterPlay();});}
  inv.textContent='BREAK · '+G.breakLen()+' MIN · COME ABOARD? ▸';inv.classList.add('on');clearTimeout(invT);invT=setTimeout(()=>inv&&inv.classList.remove('on'),30000);}
function focus(kind){const G=GP();if(kind==='break'){S.breakGame=false;setTimeout(invite,2500);return;}
  if(inv)inv.classList.remove('on');if(S.breakGame&&G.state==='play'){S.breakGame=false;closeGame(false);if(S.eva)evaEnd(false);G.toast('BREAK OVER · BACK TO WORK · SEE YOU NEXT BREAK',4);setTimeout(()=>{try{if(GP().state==='play')GP().exitPlay();}catch(e){}},2600);}S.breakGame=false;}

/* ================= 3 · K9: follow after a pat, fetch ================= */
const act=a=>{const G=GP();try{return CUT.actorAt(G.P,G.TIMES,G.now(),a);}catch(e){return null;}};
function pet(){const G=GP();if(G.state!=='play')return;const first=!S.follow;S.follow=performance.now()+60000;if(first||performance.now()-S.followSaid>60000){S.followSaid=performance.now();G.toast('K9 WILL FOLLOW YOU FOR A WHILE',3.5);}
  try{const k=act('k9');window.__town&&__town.burst('spark',k.x,k.y-40,6);}catch(e){}}
function k9Near(){const G=GP();if(!G||G.state!=='play'||S.eva||S.mode)return false;const h=act(G.me),k=act('k9');return !!(h&&k&&Math.abs(h.y-k.y)<30&&Math.abs(h.x-k.x)<460);}
function refAt(x,y){const G=GP();try{const hit=CUT.pick(G.P,G.TIMES,G.now(),x,y-40);return hit&&hit.type==='place'?hit.ref:null;}catch(e){return null;}}
function throwBall(){const G=GP(),h=act(G.me),k=act('k9');if(!h||!k||S.fetch)return true;let land=null;
  for(const dir of (k.x>=h.x?[1,-1]:[-1,1])){for(const d of [560,480,400,320,240]){const x=h.x+dir*d,ref=refAt(x,h.y);if(!ref)continue;let p=null;try{p=CUT.place(ref);}catch(e){}if(!p||Math.abs(p.y-h.y)>30||Math.abs(p.x-h.x)<180)continue;
      land={ref,x:p.x,y:p.y,dir};break;}if(land)break;}
  if(!land){G.toast('NOT ENOUGH ROOM TO THROW HERE',3);return true;}
  S.fetch={x0:h.x,y:h.y,x1:land.x,ref:land.ref,t0:performance.now(),phase:'fly'};G.sfx('tink',h.x,.7);S.follow=0;
  const r=window.K9NAV&&K9NAV.go(land.ref,{fast:true});const secs=r?r.secs:3;
  setTimeout(()=>{if(!S.fetch)return;S.fetch.phase='carry';G.sfx('chirp',null,.9);const hr=CUT.hereRef(G.P,G.TIMES,G.now(),G.me);const r2=window.K9NAV&&K9NAV.go(hr,{fast:true});
    setTimeout(()=>{if(!S.fetch)return;S.fetch=null;S.fetches++;G.sfx('chirp',null,1.2);G.toast(S.fetches===1?'GOOD DOG · K9 BROUGHT IT BACK':'GOOD DOG · FETCH '+S.fetches,3);try{const k2=act('k9');__town.burst('spark',k2.x,k2.y-40,10);}catch(e){}S.follow=performance.now()+30000;},((r2?r2.secs:3)+.6)*1000);
  },(Math.max(secs,2.4)+.5)*1000);return true;}
function k9Button(){if(!k9Near())return false;return throwBall();}
setInterval(()=>{const G=GP();if(!G)return;const b=document.getElementById('wK9');if(b){const want=k9Near()?'THROW BALL':'CALL K9';if(b.textContent!==want)b.textContent=want;}
  if(G.state!=='play'||!S.follow||S.fetch||S.eva||S.mode)return;if(performance.now()>S.follow){S.follow=0;return;}
  const h=act(G.me),k=act('k9');if(!h||!k||(Math.abs(h.x-k.x)<150&&Math.abs(h.y-k.y)<30))return;try{window.K9NAV&&K9NAV.go(CUT.hereRef(G.P,G.TIMES,G.now(),G.me),{fast:true});}catch(e){}},2500);

/* ================= 4 · station games ================= */
const GAMES={tune:{title:'TUNE THE ANTENNA',ids:['comms-terminal','utility-terminal'],hint:'DRAG, OR ← → · MAKE THE TWO WAVES ONE',done:'ANTENNA TUNED'},
  power:{title:'ROUTE THE POWER',ids:['engineering-terminal-03'],hint:'TAP A PIPE TO TURN IT · JOIN LEFT TO RIGHT',done:'POWER ROUTED'},
  cargo:{title:'STOW THE CARGO',ids:['airlock-terminal'],hint:'POKE A CRATE TO PUSH IT · EACH TO ITS OWN SLOT',done:'CARGO STOWED'}};
let M=null; /* the open game */
const LW=240,LH=135;
function openGame(kind){const G=GP();if(M||S.eva)return;const def=GAMES[kind],el=document.createElement('div');el.className='mg';el.innerHTML='<header><span>'+def.title+'</span><button type="button">LEAVE</button></header><canvas width="'+LW+'" height="'+LH+'"></canvas><footer>'+def.hint+'</footer>';
  host.appendChild(el);const cv=el.querySelector('canvas'),k=Math.max(1,Math.floor(Math.min(host.clientWidth*.72/LW,host.clientHeight*.62/LH)));cv.style.width=LW*k+'px';cv.style.height=LH*k+'px';
  el.querySelector('button').addEventListener('click',e=>{e.stopPropagation();closeGame(false);});el.addEventListener('pointerdown',e=>e.stopPropagation());
  M={kind,el,cv,x:cv.getContext('2d'),k,t0:performance.now(),won:false,st:{}};S.mode=kind;document.body.classList.add('mgopen');
  const pos=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width*LW,(e.clientY-r.top)/r.height*LH];};
  cv.addEventListener('pointerdown',e=>{e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch(_){}M&&IMPL[M.kind].down&&IMPL[M.kind].down(...pos(e));});
  cv.addEventListener('pointermove',e=>{if(M&&e.buttons&&IMPL[M.kind].move)IMPL[M.kind].move(...pos(e));});
  cv.addEventListener('pointerup',()=>{if(M&&IMPL[M.kind].up)IMPL[M.kind].up();});
  IMPL[kind].init();}
function closeGame(won){if(!M)return;const m=M;M=null;S.mode=null;document.body.classList.remove('mgopen');try{IMPL[m.kind].end&&IMPL[m.kind].end(m);}catch(e){}m.el.remove();
  if(won){const s=(performance.now()-m.t0)/1000,stars=s<25?3:s<50?2:1;S.done[m.kind]=Math.max(S.done[m.kind]||0,stars);try{const D=JSON.parse(localStorage.getItem('driftnaut.games')||'{}');D[m.kind]=Math.max(D[m.kind]||0,stars);localStorage.setItem('driftnaut.games',JSON.stringify(D));}catch(e){}
    GP().toast(GAMES[m.kind].done+' · '+'★'.repeat(stars)+'☆'.repeat(3-stars),4.5);GP().sfx('ping',null,.9);GP().hero('chime');}}
function win(delay){if(!M||M.won)return;M.won=true;setTimeout(()=>closeGame(true),delay||1200);}
const C={bg:'#14181c',dim:'#3c3a40',line:'#6b6a6e',ink:'#e9d7c2',amber:'#ffb04a',orange:'#e47a1e',teal:'#7ee3e5',teal2:'#2895a8',dark:'#0b0e11',rust:'#8d4012'};
const R=(x,a,b,w,h,c)=>{x.fillStyle=c;x.fillRect(Math.round(a),Math.round(b),Math.round(w),Math.round(h));};
const IMPL={
  /* ---- TUNE: two tones a little apart; turn yours until the beating stops. The reference note is the key of the track that is playing ---- */
  tune:{init(){const G=GP(),st=M.st;let key=0;try{key=DEEP.TAPES[DEEP.tapeOf(G.tape())].key;}catch(e){}st.f=261.63*Math.pow(2,key/12)*(key>6?.5:1)*1.5; /* the fifth of the key: sits inside every chord of the loop */
      st.off=(Math.random()<.5?-1:1)*rnd(90,220);st.d=0;st.hold=0;st.drag=null;
      try{const a=G.actx,o1=a.createOscillator(),o2=a.createOscillator(),g1=a.createGain(),g2=a.createGain(),p1=a.createStereoPanner(),p2=a.createStereoPanner();o1.frequency.value=st.f;o2.frequency.value=st.f;o2.detune.value=st.off;o1.type='sine';o2.type='triangle';
        g1.gain.value=0;g2.gain.value=0;g1.gain.setTargetAtTime(.05,a.currentTime,.3);g2.gain.setTargetAtTime(.04,a.currentTime,.3);p1.pan.value=-.4;p2.pan.value=.4;o1.connect(g1);g1.connect(p1);p1.connect(G.bus);o2.connect(g2);g2.connect(p2);p2.connect(G.bus);o1.start();o2.start();st.au={o1,o2,g1,g2};}catch(e){}},
    cents(){return M.st.off+M.st.d;},
    set(d){const st=M.st;st.d=clamp(d,-320,320);try{st.au.o2.detune.setTargetAtTime(this.cents(),GP().actx.currentTime,.03);}catch(e){}},
    down(px){M.st.drag={px,d:M.st.d};},move(px){const g=M.st.drag;if(g)this.set(g.d+(px-g.px)*3.2);},up(){M.st.drag=null;},
    key(k,rep){if(k==='ArrowLeft'||k==='KeyA')this.set(M.st.d-(rep?6:2));else if(k==='ArrowRight'||k==='KeyD')this.set(M.st.d+(rep?6:2));else return false;return true;},
    draw(dt,now){const x=M.x,st=M.st,c=this.cents(),ok=Math.abs(c)<5;R(x,0,0,LW,LH,C.bg);for(let gx=0;gx<LW;gx+=20)R(x,gx,0,1,96,'#1c2126');for(let gy=0;gy<96;gy+=16)R(x,0,gy,LW,1,'#1c2126');
      const ph=now/260,wave=(col,ratio,yo)=>{x.fillStyle=col;for(let i=0;i<LW;i++){const y=48+yo+Math.sin(i/9*ratio+ph*ratio)*26;x.fillRect(i,Math.round(y),1,2);}};
      wave(C.teal2,1,0);wave(ok?C.ink:C.amber,Math.pow(2,c/1200*6),0); /* the difference is drawn six times larger than it is, so it can be seen */
      R(x,20,108,200,3,C.dim);R(x,119,104,2,11,C.teal);const nx=clamp(120+c*.3,20,220);R(x,nx-2,102,5,15,ok?C.ink:C.amber);R(x,nx-1,103,3,13,C.dark);R(x,nx,104,1,11,ok?C.ink:C.amber);
      if(ok&&!M.won){st.hold+=dt;R(x,20,124,Math.min(200,st.hold/1.1*200),3,C.teal);if(st.hold>=1.1){this.set(-st.off);win(1500);}}else if(!M.won)st.hold=0;if(M.won)R(x,20,124,200,3,C.teal);},
    end(m){try{const a=GP().actx,u=m.st.au;u.g1.gain.setTargetAtTime(0,a.currentTime,.25);u.g2.gain.setTargetAtTime(0,a.currentTime,.25);u.o1.stop(a.currentTime+1.5);u.o2.stop(a.currentTime+1.5);}catch(e){}}},
  /* ---- POWER: a 3 x 3 board of pipes; turn them until the left feed reaches the right ---- */
  power:{init(){const st=M.st,N=3;let path;for(;;){const rs=Math.floor(Math.random()*N);path=[[0,rs]];const seen={['0,'+rs]:1};let cx=0,cy=rs,guard=0;
        while(cx<N-1&&guard++<40){const opts=[[1,0],[1,0],[0,-1],[0,1]].filter(([dx,dy])=>{const nx=cx+dx,ny=cy+dy;return nx<N&&ny>=0&&ny<N&&!seen[nx+','+ny];});if(!opts.length)break;const [dx,dy]=opts[Math.floor(Math.random()*opts.length)];cx+=dx;cy+=dy;seen[cx+','+cy]=1;path.push([cx,cy]);}
        if(cx===N-1&&path.length>=4)break;}
      st.rs=path[0][1];st.re=path[path.length-1][1];st.g=[];for(let y=0;y<N;y++){st.g.push([]);for(let xx=0;xx<N;xx++)st.g[y].push({t:Math.random()<.5?'I':'L',r:Math.floor(Math.random()*4)});}
      const dirOf=(a,b)=>b[0]>a[0]?1:b[0]<a[0]?3:b[1]>a[1]?2:0;
      path.forEach((p,i)=>{const inD=i?(dirOf(path[i-1],p)+2)%4:3,outD=i<path.length-1?dirOf(p,path[i+1]):1,T=st.g[p[1]][p[0]];T.t=(inD+2)%4===outD?'I':'L';});
      for(let y=0;y<N;y++)for(let xx=0;xx<N;xx++){const T=st.g[y][xx];T.r=Math.floor(Math.random()*4);}if(this.trace().ok){const T=st.g[st.rs][0];T.r=(T.r+1)%4;}st.cur=[0,st.rs];},
    ends(T){return T.t==='I'?[(1+T.r)%4,(3+T.r)%4]:[(0+T.r)%4,(1+T.r)%4];},
    trace(){const st=M.st,lit={};let x=0,y=st.rs,from=3,ok=false;for(let n=0;n<12;n++){if(x<0||y<0||x>2||y>2)break;const e=this.ends(st.g[y][x]);if(!e.includes(from))break;lit[x+','+y]=1;const out=e[0]===from?e[1]:e[0];
        if(x===2&&out===1){ok=y===st.re;break;}x+=[0,1,0,-1][out];y+=[-1,0,1,0][out];from=(out+2)%4;}return {lit,ok};},
    turn(cx,cy){if(M.won)return;const T=M.st.g[cy][cx];T.r=(T.r+1)%4;GP().sfx('click',null,.5);M.st.cur=[cx,cy];if(this.trace().ok){GP().sfx('switchon',null,.8);win(1300);}},
    cell(px,py){const cx=Math.floor((px-66)/36),cy=Math.floor((py-13)/36);return cx>=0&&cx<3&&cy>=0&&cy<3?[cx,cy]:null;},
    down(px,py){const c=this.cell(px,py);if(c)this.turn(c[0],c[1]);},
    key(k){const c=M.st.cur,mv={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]}[k];if(mv){c[0]=clamp(c[0]+mv[0],0,2);c[1]=clamp(c[1]+mv[1],0,2);return true;}if(k==='KeyE'||k==='Space'||k==='Enter'){this.turn(c[0],c[1]);return true;}return false;},
    draw(){const x=M.x,st=M.st,tr=this.trace();R(x,0,0,LW,LH,C.bg);R(x,40,13+st.rs*36+14,26,8,C.amber);R(x,174,13+st.re*36+14,26,8,tr.ok?C.teal:C.dim);R(x,30,13+st.rs*36+10,10,16,C.orange);R(x,200,13+st.re*36+10,10,16,tr.ok?C.teal:C.line);
      for(let y=0;y<3;y++)for(let xx=0;xx<3;xx++){const ox=66+xx*36,oy=13+y*36,T=st.g[y][xx],on=tr.lit[xx+','+y],col=tr.ok&&on?C.teal:on?C.amber:C.line;R(x,ox+1,oy+1,34,34,'#1c2126');
        if(st.cur[0]===xx&&st.cur[1]===y){R(x,ox,oy,36,1,C.ink);R(x,ox,oy+35,36,1,C.ink);R(x,ox,oy,1,36,C.ink);R(x,ox+35,oy,1,36,C.ink);}
        R(x,ox+14,oy+14,8,8,col);for(const d of this.ends(T)){if(d===0)R(x,ox+14,oy+1,8,14,col);if(d===1)R(x,ox+22,oy+14,13,8,col);if(d===2)R(x,ox+14,oy+22,8,13,col);if(d===3)R(x,ox+1,oy+14,14,8,col);}}}},
  /* ---- CARGO: three crates adrift; a poke pushes one away from your finger; each has a slot of its own colour ---- */
  cargo:{init(){const st=M.st,cols=[C.amber,C.teal,C.ink];st.c=cols.map((col,i)=>({col,x:rnd(30,120),y:rnd(24,110),vx:rnd(-5,5),vy:rnd(-4,4),slot:[212,28+i*38],in:false}));st.sel=0;},
    poke(c,dx,dy){if(c.in||M.won)return;const m=Math.hypot(dx,dy)||1;c.vx+=dx/m*34;c.vy+=dy/m*34;GP().sfx('click',null,.4);},
    down(px,py){const st=M.st;let best=null;for(const c of st.c){if(c.in)continue;const d=Math.hypot(c.x-px,c.y-py);if(d<34&&(!best||d<best.d))best={c,d};}if(!best)return;st.sel=st.c.indexOf(best.c);
      if(best.d<5)this.poke(best.c,best.c.slot[0]-best.c.x,best.c.slot[1]-best.c.y);else this.poke(best.c,best.c.x-px,best.c.y-py);},
    key(k){const st=M.st,mv={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]}[k];if(mv){let c=st.c[st.sel];if(c.in){st.sel=st.c.findIndex(q=>!q.in);c=st.c[st.sel];}if(c)this.poke(c,mv[0],mv[1]);return true;}
      if(k==='KeyE'||k==='Space'||k==='Tab'){for(let i=1;i<=3;i++){const j=(st.sel+i)%3;if(!st.c[j].in){st.sel=j;break;}}return true;}return false;},
    draw(dt){const x=M.x,st=M.st;R(x,0,0,LW,LH,C.bg);R(x,196,6,38,123,'#1c2126');for(let i=0;i<LW;i+=24)R(x,i,131,12,2,C.rust);
      for(const c of st.c){R(x,c.slot[0]-10,c.slot[1]-10,20,20,C.dark);R(x,c.slot[0]-10,c.slot[1]-10,20,1,c.col);R(x,c.slot[0]-10,c.slot[1]+9,20,1,c.col);R(x,c.slot[0]-10,c.slot[1]-10,1,20,c.col);R(x,c.slot[0]+9,c.slot[1]-10,1,20,c.col);}
      for(const c of st.c){if(!c.in){c.x+=c.vx*dt;c.y+=c.vy*dt;const f=Math.pow(.55,dt);c.vx*=f;c.vy*=f;if(c.x<9){c.x=9;c.vx=Math.abs(c.vx);}if(c.x>231){c.x=231;c.vx=-Math.abs(c.vx);}if(c.y<9){c.y=9;c.vy=Math.abs(c.vy);}if(c.y>122){c.y=122;c.vy=-Math.abs(c.vy);}
          if(Math.hypot(c.x-c.slot[0],c.y-c.slot[1])<9){c.in=true;c.x=c.slot[0];c.y=c.slot[1];GP().sfx('seal',null,.6);if(st.c.every(q=>q.in))win(1200);}}
        R(x,c.x-8,c.y-8,16,16,C.dark);R(x,c.x-7,c.y-7,14,14,c.col);R(x,c.x-7,c.y-1,14,2,C.dark);R(x,c.x-1,c.y-7,2,14,C.dark);
        if(!c.in&&st.c[st.sel]===c){R(x,c.x-10,c.y-10,4,1,C.ink);R(x,c.x-10,c.y-10,1,4,C.ink);R(x,c.x+6,c.y+9,4,1,C.ink);R(x,c.x+9,c.y+6,1,4,C.ink);}}}}};

/* ================= 6 · the spacewalk ================= */
const EVA_PTS={dish:[2176,1000],view:[2150,300]};
function evaStart(){const G=GP();if(S.eva||M)return;let home={x:2131,y:1116};try{const p=CUT.place('eva.edge');if(p)home={x:p.x,y:p.y};}catch(e){}
  S.eva={x:home.x,y:home.y-50,vx:0,vy:-20,home:[home.x,home.y-50],step:0,hold:0,tgt:null,t0:performance.now(),face:1};S.mode='eva';window.__eva=S.eva;document.body.classList.add('eva');
  try{G.P.script.push({at:G.now(),hide:G.me});G.P.rev++;}catch(e){}G.sfx('seal',null,.7);G.toast('SPACEWALK · DRIFT TO THE DISH (ARROWS, OR TAP WHERE TO GO)',6);}
function evaEnd(done){const G=GP(),E=S.eva;if(!E)return;S.eva=null;S.mode=null;window.__eva=null;document.body.classList.remove('eva');try{CUT.exterior(null);G.P.script.push({at:G.now(),show:G.me});G.P.rev++;}catch(e){}
  if(done){S.done.eva=3;G.sfx('seal',null,.7);G.hero('chime');G.toast('BACK INSIDE · SPACEWALK COMPLETE · ★★★',5);}else G.toast('BACK INSIDE',2.5);}
const held={};
function evaTick(dt){const E=S.eva,G=GP();if(!E)return;if(G.state!=='play'){evaEnd(false);return;}try{CUT.exterior(1);}catch(e){}
  let ax=(held.right?1:0)-(held.left?1:0),ay=(held.down?1:0)-(held.up?1:0);if(ax||ay)E.tgt=null;
  if(E.tgt){ /* a tap: glide there and settle (she slows as she arrives, so she does not sail past) */
    const dx=E.tgt[0]-E.x,dy=E.tgt[1]-E.y,d=Math.hypot(dx,dy);if(d<5&&Math.hypot(E.vx,E.vy)<12)E.tgt=null;else{const want=Math.min(130,d*1.5),k=Math.min(1,dt*3);E.vx+=((dx/(d||1))*want-E.vx)*k;E.vy+=((dy/(d||1))*want-E.vy)*k;}ax=0;ay=0;}
  E.vx+=ax*150*dt;E.vy+=ay*150*dt;const f=Math.pow(E.tgt?1:.45,dt);E.vx*=f;E.vy*=f;const sp=Math.hypot(E.vx,E.vy);if(sp>130){E.vx*=130/sp;E.vy*=130/sp;}
  E.x=clamp(E.x+E.vx*dt,60,CUT.W-40);E.y=clamp(E.y+E.vy*dt,70,CUT.H-30);if(Math.abs(E.vx)>6)E.face=E.vx>0?1:-1;
  const goal=E.step===0?EVA_PTS.dish:E.step===1?EVA_PTS.view:E.home,near=Math.hypot(E.x-goal[0],E.y-goal[1])<64;
  if(near){E.hold+=dt;if(E.step===0&&E.hold>2.2){E.step=1;E.hold=0;G.sfx('click',goal[0],.7);setTimeout(()=>GP().sfx('click',null,.5),260);try{__town.burst('spark',goal[0],goal[1]-10,12);}catch(e){}G.toast('DISH STRAIGHTENED · NOW DRIFT UP AND LOOK AT THE PLANET',6);}
    else if(E.step===1&&E.hold>4){E.step=2;E.hold=0;G.hero('chime');G.toast('BLUE RINGS, AS FAR AS YOU CAN SEE · HEAD HOME WHEN YOU ARE READY',7);}
    else if(E.step===2&&E.hold>.8)evaEnd(true);}else E.hold=Math.max(0,E.hold-dt*2);}
function line(x,a,b,c,d,col,u){x.fillStyle=col;const n=Math.max(Math.abs(c-a),Math.abs(d-b))/u|0;for(let i=0;i<=n;i+=2){const q=n?i/n:0;x.fillRect(Math.round((a+(c-a)*q)/u)*u,Math.round((b+(d-b)*q+Math.sin(q*Math.PI)*18)/u)*u,u,u);}}
function diamond(x,cx,cy,r,col,u){for(let d=-r;d<=r;d++){const w=(r-Math.abs(d))*2+1;x.fillStyle=d===-r||d===r?'#0b0e11':col;x.fillRect(Math.round(cx/u)*u-(w>>1)*u,Math.round(cy/u)*u+d*u,w*u,u);}}
/* everything of ours that lives in the world, drawn on the ship's pixel grid (u = one art pixel) */
CUT.overlay((x,t,SS)=>{const u=SS||2,pn=performance.now();
  if(S.fetch){const F=S.fetch;let bx,by;if(F.phase==='fly'){const q=clamp((pn-F.t0)/2300,0,1),e=1-Math.pow(1-q,2.2);bx=F.x0+(F.x1-F.x0)*e;by=F.y-64-Math.sin(q*Math.PI)*46+q*34+Math.sin(pn/400)*4*q;}else{const k=act('k9');if(k){bx=k.x+(k.face==='left'?-22:22);by=k.y-30;}}
    if(bx!=null){const X=Math.round(bx/u)*u,Y=Math.round(by/u)*u;x.fillStyle='#0b0e11';x.fillRect(X-2*u,Y-2*u,5*u,5*u);x.fillStyle='#ffb04a';x.fillRect(X-u,Y-u,3*u,3*u);x.fillStyle='#f6efe4';x.fillRect(X-u,Y-u,u,u);}}
  if(S.eva){const E=S.eva;line(x,E.home[0],E.home[1]+40,E.x,E.y-30,'#c6ab92',u);
    const goal=E.step===0?EVA_PTS.dish:E.step===1?EVA_PTS.view:E.home,bob=Math.round(Math.sin(pn/420))*u;diamond(x,goal[0],goal[1]-78+bob,4,E.step===2?'#7ee3e5':'#ffb04a',u);
    if(E.hold>0&&E.step<2){const need=E.step===0?2.2:4,w=Math.round(24*Math.min(1,E.hold/need))*u;x.fillStyle='#0b0e11';x.fillRect(Math.round((goal[0]-26)/u)*u,Math.round((goal[1]-52)/u)*u,26*u,3*u);x.fillStyle='#7ee3e5';x.fillRect(Math.round((goal[0]-24)/u)*u,Math.round((goal[1]-50)/u)*u,w,u);}
    try{CUT.sprite('deadscout','idle',E.x,E.y+Math.round(Math.sin(pn/700)*3),E.face<0,t,x);}catch(e){}}});
function glows(){const G=GP();if(!G||G.state!=='play'||S.eva)return [];const L=[];const O=CUT.MAP.objects;for(const k in GAMES){if(S.done[k])continue;const o=O[GAMES[k].ids[0]];if(o&&o.spot)L.push({ref:o.spot,kind:'game'});}
  if(!S.done.eva&&O['eva-look']&&O['eva-look'].spot)L.push({ref:O['eva-look'].spot,kind:'game'});return L;}
function arrive(id){for(const k in GAMES)if(GAMES[k].ids.includes(id)){openGame(k);return true;}if(id==='eva-look'){evaStart();return true;}return false;}

/* ---- the loop, and input while a game or the walk has the floor ---- */
let last=0;function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(document.hidden)return;
  if(M){if(GP().state!=='play'){closeGame(false);return;}try{IMPL[M.kind].draw(dt,now);}catch(e){}}if(S.eva)evaTick(dt);}
requestAnimationFrame(loop);
const DIR={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down'};
addEventListener('keydown',e=>{if(!S.mode||e.metaKey||e.ctrlKey||e.altKey)return;const k=e.code;
  if(k==='Escape'){if(M)closeGame(false);else if(S.eva)evaEnd(false);e.preventDefault();e.stopImmediatePropagation();return;}
  if(M){const used=IMPL[M.kind].key&&IMPL[M.kind].key(k,e.repeat);if(used||DIR[k]||k==='KeyE'||k==='Space'||k==='Tab'){e.preventDefault();e.stopImmediatePropagation();}return;}
  if(S.eva&&(DIR[k]||k==='KeyE'||k==='Space'||k==='KeyK')){if(DIR[k])held[DIR[k]]=true;e.preventDefault();e.stopImmediatePropagation();}},true);
addEventListener('keyup',e=>{if(DIR[e.code])held[DIR[e.code]]=false;if(S.mode&&DIR[e.code])e.stopImmediatePropagation();},true);
addEventListener('pointerdown',e=>{if(!S.eva||e.target!==stage)return;const G=GP(),r=stage.getBoundingClientRect(),V=G.vw();S.eva.tgt=[V[0]+(e.clientX-r.left)/r.width*V[2],V[1]+(e.clientY-r.top)/r.height*V[3]];
  try{__town.ring(S.eva.tgt[0],S.eva.tgt[1],'#7ee3e5',.8,24);}catch(_){}e.stopPropagation();e.preventDefault();},true);
window.__play={arrive,pet,k9Button,glows,focus,S,open:openGame,eva:evaStart,dbg:{M:()=>M,IMPL}};
})();
