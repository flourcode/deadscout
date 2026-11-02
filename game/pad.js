/* DeadScout · touch controls and the deck's own keys (UI pass, Nov 2026).
   In the picture, only on touch: one cross-shaped D-pad (lower left) and an action cluster around a large USE
   (lower right): LIGHT above, TUNE left, USE right. Hidden for keyboard/mouse and when a gamepad is connected; Options
   can force them ON or OFF (prefs.pad: auto | on | off). Every key sends the same keydown/keyup as the keyboard.
   On the hardware, always: tape-deck keys in the AUDIO DECK (previous tape · next tape · music on/off) and a MENU soft
   key on the bezel. Everything is drawn as worn pixel hardware in the locked palette. */
(function(){
"use strict";
const G=window.__game;if(!G)return;
const scr=document.getElementById('screen');if(!scr)return;
const INK='#0b0e11',FACE='#c6ab92',FACE_HI='#e9d7c2',FACE_LO='#b6916a',EDGE='#907763',SKIRT='#4e423c',SKIRT_LO='#3a2014',LEG='#292a31',RUST='#7b3f1c',RUST2='#99623b',RED='#d0442e',CYAN='#1fb4ce',HUB='#3c3a40',HUB_LO='#2e3134';
const MENU=["11111",".....","11111",".....","11111"];
const UP=["...1...","..111..",".11111.","1111111","..111..","..111..","..111.."];
const rot=g=>g[0].split('').map((_,c)=>g.map(r=>r[c]).reverse().join(''));
const GL={up:UP,right:rot(UP),down:rot(rot(UP)),left:rot(rot(rot(UP))),
  E:["11111","1....","1111.","1....","11111"],Q:[".111.","1...1","1.1.1","1..1.",".11.1"],F:["11111","1....","1111.","1....","1...."],
  menu:MENU,note:["..111","..1.1","..1..","111..","111.."],next:["1...1","11..1","111.1","11..1","1...1"],prev:["1...1","1..11","1.111","1..11","1...1"]};
function rnd(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');return [c,x,(X,Y,W,H,col)=>{x.fillStyle=col;x.fillRect(X,Y,W,H);}];}
function wear(p,R,fx,fy,fw,fh){for(let i=0;i<Math.round(fw*fh*.08);i++)p(fx+1+Math.floor(R()*(fw-2)),fy+1+Math.floor(R()*(fh-2)),1,1,R()<.75?EDGE:FACE_LO);
  if(R()<.7){const Y=fy+2+Math.floor(R()*(fh-4)),X=fx+1+Math.floor(R()*Math.max(1,fw-6)),L=2+Math.floor(R()*4);for(let i=0;i<L;i++)p(X+i,Y+(i>L/2&&R()<.5?1:0),1,1,EDGE);}
  if(R()<.8){const X=fx+1+Math.floor(R()*(fw-3)),Y=fy+fh-2;p(X,Y,1,1,RUST);p(X+1,Y,1,1,RUST2);}}
function glyph(p,g,ox,oy,col){for(let r=0;r<g.length;r++)for(let k=0;k<g[r].length;k++)if(g[r][k]==='1')p(ox+k,oy+r,1,1,col);}
/* one keycap: outline, cream face, dark skirt, wear; pressed sinks 2 px */
function cap(w,h,legend,pressed,seed,mark){const [c,x,p]=canvas(w,h),R=rnd(seed),sk=pressed?1:3,top=pressed?2:0;
  p(1,1+top,w-2,h-2-top,INK);p(2,h-2-sk,w-4,sk,SKIRT);p(2,h-2,w-4,1,SKIRT_LO);const fx=2,fy=2+top,fw=w-4,fh=h-4-sk-top;
  p(fx,fy,fw,fh,pressed?FACE_LO:FACE);p(fx,fy,fw,1,pressed?FACE:FACE_HI);p(fx,fy,1,fh,pressed?FACE:FACE_HI);p(fx,fy+fh-1,fw,1,EDGE);p(fx+fw-1,fy,1,fh,EDGE);
  for(const [X,Y] of [[1,1+top],[w-2,1+top],[1,h-2],[w-2,h-2]])x.clearRect(X,Y,1,1);wear(p,R,fx,fy,fw,fh);
  const g=GL[legend];if(g){const ox=fx+Math.floor((fw-g[0].length)/2),oy=fy+Math.floor((fh-g.length)/2);glyph(p,g,ox,oy,LEG);
    if(mark==='off')for(let i=0;i<Math.min(g[0].length,g.length)+2;i++)p(ox-1+i,oy+g.length-i,1,1,RED);if(mark==='on')p(fx+fw-3,fy+1,2,1,CYAN);}
  return c.toDataURL();}
/* the D-pad: one cross-shaped part with a recessed hub; the pressed arm rocks down */
const CELL=13,PW=CELL*3+2;
function cross(pressed){const [c,x,p]=canvas(PW,PW+2),R=rnd(4242),o=1;
  const arms={up:[CELL,0],left:[0,CELL],right:[CELL*2,CELL],down:[CELL,CELL*2]};
  /* the outline and skirt of the whole cross */
  for(const [X,Y] of [[CELL,0,],[0,CELL],[CELL,CELL],[CELL*2,CELL],[CELL,CELL*2]])p(o+X-1,o+Y-1,CELL+2,CELL+2,INK);
  for(const [X,Y] of [[0,CELL],[CELL*2,CELL],[CELL,CELL*2]])p(o+X,o+Y+CELL-2,CELL,3,SKIRT);p(o+CELL,o+CELL*3,CELL,1,SKIRT_LO);
  for(const [k,[X,Y]] of Object.entries(arms)){const pr=pressed===k,dy=pr?1:0;p(o+X,o+Y+dy,CELL,CELL-(pr?1:2),pr?FACE_LO:FACE);
    p(o+X,o+Y+dy,CELL,1,pr?FACE:FACE_HI);if(k!=='right')p(o+X,o+Y+dy,1,CELL-2,pr?FACE:FACE_HI);
    glyph(p,GL[k],o+X+3,o+Y+3+dy,pr?'#3c3a40':LEG);}
  {const pr=pressed==='use',dy=pr?1:0;p(o+CELL,o+CELL,CELL,CELL,HUB_LO);p(o+CELL+1,o+CELL+1+dy,CELL-2,CELL-2-(pr?1:2),pr?FACE_LO:FACE_HI);p(o+CELL+1,o+CELL+CELL-3,CELL-2,pr?1:2,SKIRT);
    p(o+CELL+2,o+CELL+2+dy,CELL-4,CELL-6,pr?FACE_LO:FACE);glyph(p,GL.E,o+CELL+4,o+CELL+3+dy,LEG);} /* the hub is USE: walk and act under one thumb */
  wear(p,R,o+CELL,o,CELL,CELL);wear(p,R,o,o+CELL,CELL,CELL);wear(p,R,o+CELL*2,o+CELL,CELL,CELL);wear(p,R,o+CELL,o+CELL*2,CELL,CELL);
  return c.toDataURL();}
/* ---------- styles ---------- */
const css=document.createElement('style');css.textContent=`
.pad{position:absolute;inset:0;pointer-events:none;z-index:4;--k:clamp(44px,5.4vw,66px)}
.pad[hidden],.pad [hidden]{display:none!important}
.pad .grp{position:absolute;opacity:.72}
.pad .grp.act{opacity:1}
.pad .dp{right:3%;bottom:calc(6% + var(--lift,0px));transition:bottom .3s steps(4);width:calc(var(--k)*2.5);height:calc(var(--k)*2.5)}
.pad .dp img{width:100%;height:100%;image-rendering:pixelated;display:block;filter:drop-shadow(0 2px 0 rgba(0,0,0,.6))}
.pad .dp button{position:absolute;width:33.3%;height:33.3%;pointer-events:auto;background:none;border:0;padding:0;touch-action:none;-webkit-tap-highlight-color:transparent;cursor:pointer}
.pad .dp .hub{left:33.3%;top:33.3%}.pad .dp .up{left:33.3%;top:0}.pad .dp .down{left:33.3%;top:66.6%}.pad .dp .left{left:0;top:33.3%}.pad .dp .right{left:66.6%;top:33.3%}
.pad .ac{right:calc(3% + var(--k)*2.5 + 12px);bottom:calc(6% + var(--lift,0px));transition:bottom .3s steps(4);display:flex;flex-direction:column;gap:calc(var(--k)*.12);width:calc(var(--k)*.82)}
.pad .k{position:relative;width:100%;pointer-events:auto;background:none;border:0;padding:0;touch-action:none;-webkit-tap-highlight-color:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center}
.pad .k img{width:100%;height:auto;image-rendering:pixelated;display:block;filter:drop-shadow(0 2px 0 rgba(0,0,0,.6))}
.pad .k span{font-family:Silk,monospace;letter-spacing:2px;color:#c6ab92;text-shadow:0 1px 0 #0b0e11,1px 0 0 #0b0e11;margin-top:2px;white-space:nowrap}
.pad .ac .k span{font-size:clamp(6px,.5vw,8px)}
.deckkeys{display:inline-flex;gap:6px;align-items:flex-start;margin-top:2px}
.deckkeys button{background:none;border:0;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;-webkit-tap-highlight-color:transparent}
.deckkeys img{width:30px;height:26px;image-rendering:pixelated;display:block}
.deckkeys button:focus-visible,.pad button:focus-visible,.softkey:focus-visible{outline:2px solid #1fb4ce;outline-offset:2px}
.softkey{position:absolute;left:16px;bottom:-1px;transform:translateY(100%);margin-top:3px;font-family:Silk,monospace;font-size:8px;letter-spacing:3px;color:#c6ab92;background:#2e3134;border:0;box-shadow:0 0 0 2px #0b0e11,inset 0 -2px 0 #14181c,inset 0 1px 0 #4e423c;padding:4px 10px 6px;cursor:pointer}
.softkey:active{box-shadow:0 0 0 2px #0b0e11,inset 0 1px 0 #14181c;padding:5px 10px 5px}
.softkey[hidden]{display:none}
body.photo .pad{display:none!important}`;
document.head.appendChild(css);
/* ---------- the touch layer ---------- */
const pad=document.createElement('div');pad.className='pad';pad.hidden=true;pad.setAttribute('aria-label','Touch controls');
pad.innerHTML='<div class="grp dp" role="group" aria-label="Move"><img alt=""><button class="up" aria-label="Up"></button><button class="left" aria-label="Left"></button><button class="down" aria-label="Down"></button><button class="right" aria-label="Right"></button><button class="hub" aria-label="Use"></button></div><div class="grp ac" role="group" aria-label="Actions"></div>';
scr.appendChild(pad);
const send=(type,code)=>document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
const dp=pad.querySelector('.dp'),dImg=dp.querySelector('img'),ac=pad.querySelector('.ac');let dPressed=null;
const paintCross=()=>{dImg.src=cross(dPressed);};paintCross();
function bindHold(b,onDown,onUp){let id=null;const up=e=>{if(id===null||(e&&e.pointerId!==id))return;id=null;onUp();};
  b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(id!==null)return;id=e.pointerId;try{b.setPointerCapture(id);}catch(_){}onDown();});
  b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);b.addEventListener('contextmenu',e=>e.preventDefault());}
for(const [dir,code] of [['up','ArrowUp'],['left','ArrowLeft'],['down','ArrowDown'],['right','ArrowRight'],['hub','KeyE']]){const b=dp.querySelector('.'+dir);
  bindHold(b,()=>{dPressed=dir==='hub'?'use':dir;paintCross();dp.classList.add('act');send('keydown',code);},()=>{if(dPressed===(dir==='hub'?'use':dir)){dPressed=null;paintCross();}dp.classList.remove('act');send('keyup',code);});}
const KEYS=[];
function act(cls,legend,code,label,w,h,seed){const b=document.createElement('button');b.className='k '+cls;b.setAttribute('aria-label',label);b.innerHTML='<img alt=""><span>'+label+'</span>';ac.appendChild(b);
  const K={b,img:b.querySelector('img'),legend,w,h,seed,down:false,code};const paint=()=>{K.img.src=cap(w,h,legend,K.down,seed);};paint();
  bindHold(b,()=>{K.down=true;paint();ac.classList.add('act');send('keydown',code);},()=>{K.down=false;paint();ac.classList.remove('act');send('keyup',code);});KEYS.push(K);return K;}
act('tune','Q','KeyQ','TUNE',15,15,53);act('light','F','KeyF','LIGHT',15,15,31);act('mk','menu','Escape','MENU',15,15,71);
/* ---------- the deck keys (always, on the hardware) ---------- */
const deck=document.getElementById('deckKeys'),hTrack=document.getElementById('hTrack');
function dkey(id,legend,label,tap){const b=document.createElement('button');b.type='button';b.dataset.id=id;b.setAttribute('aria-label',label);b.innerHTML='<img alt=""><span>'+label+'</span>';deck.appendChild(b);
  const K={b,img:b.querySelector('img'),legend,down:false,mark:null,seed:id.length*977};K.paint=()=>{K.img.src=cap(15,13,K.legend,K.down,K.seed,K.mark);};K.paint();
  b.addEventListener('pointerdown',e=>{e.preventDefault();K.down=true;K.paint();});const rel=()=>{if(K.down){K.down=false;K.paint();}};b.addEventListener('pointerup',rel);b.addEventListener('pointerleave',rel);
  b.addEventListener('click',()=>tap(K));return K;}
let trackT=null;const flash=t=>{if(!hTrack)return;hTrack.textContent=t;hTrack.classList.add('on');clearTimeout(trackT);trackT=setTimeout(()=>hTrack.classList.remove('on'),5000);};
const tapeLine=r=>'▶ TAPE '+String(r.n).padStart(2,'0')+' · '+r.name;
let mus=null;
if(deck){dkey('prev','prev','PREV',()=>{const r=G.music.prev();if(r){if(!G.music.on()){G.music.set(true);paintMus();}flash(tapeLine(r));}});
  dkey('next','next','NEXT',()=>{const r=G.music.next();if(r){if(!G.music.on()){G.music.set(true);paintMus();}flash(tapeLine(r));}});
  mus=dkey('music','note','MUSIC',()=>{const on=!G.music.on();G.music.set(on);paintMus();flash(on?'♪ MUSIC ON':'♪ MUSIC OFF');});}
function paintMus(){if(!mus)return;const on=G.music.on();mus.mark=on?'on':'off';mus.paint();mus.b.querySelector('span').textContent=on?'MUSIC':'OFF';mus.b.setAttribute('aria-pressed',String(on));}
paintMus();
/* ---------- the MENU soft key on the bezel ---------- */
const sk=document.getElementById('skMenu');
if(sk)sk.addEventListener('click',()=>{send('keydown','Escape');setTimeout(()=>send('keyup','Escape'),60);});
/* ---------- when the touch layer shows ---------- */
let touchSeen=window.matchMedia&&matchMedia('(pointer: coarse)').matches;
document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')touchSeen=true;},{passive:true,capture:true});
const gamepad=()=>{try{return [...(navigator.getGamepads?navigator.getGamepads():[])].some(g=>g);}catch(e){return false;}};
const mode=()=>{try{const p=JSON.parse(localStorage.getItem('deadScoutGamePrefs')||'{}').pad;return p===true||p==='on'?'on':p===false||p==='off'?'off':'auto';}catch(e){return 'auto';}};
let wasOn=false;
setInterval(()=>{const st=G.state,m=mode(),want=m==='on'||(m==='auto'&&touchSeen&&!gamepad());const on=want&&st==='play'&&!document.body.classList.contains('photo');
  if(wasOn&&!on){if(dPressed){dPressed=null;paintCross();}for(const K of KEYS)if(K.down){K.down=false;K.img.src=cap(K.w,K.h,K.legend,false,K.seed);send('keyup',K.code);}}
  pad.hidden=!on;wasOn=on;
  /* the rear deck stays visible: if the EVA platform is on screen under the keys, the keys step up above it */
  if(on){try{const ev=CUT.MAP.rooms.eva,V=G.view(),r=scr.getBoundingClientRect();let lift=0;
    if(ev&&V){const xs=ev.poly.map(q=>q[0]),ys=ev.poly.map(q=>q[1]),sx=v=>(v-V[0])/V[2]*r.width,sy=v=>(v-V[1])/V[3]*r.height;
      const ex0=sx(Math.min(...xs)),ex1=sx(Math.max(...xs)),ey0=sy(Math.min(...ys)-40),ey1=sy(Math.max(...ys)+30); /* the antenna above, the rail and tether below */
      const prev=pad.style.getPropertyValue('--lift');pad.style.setProperty('--lift','0px');const a=dp.getBoundingClientRect(),b=ac.getBoundingClientRect();pad.style.setProperty('--lift',prev);
      const cx0=Math.min(a.left,b.left)-r.left,cx1=Math.max(a.right,b.right)-r.left,cy0=Math.min(a.top,b.top)-r.top,cy1=Math.max(a.bottom,b.bottom)-r.top;
      if(ex1>cx0&&ex0<cx1&&ey1>cy0&&ey0<cy1)lift=Math.max(0,cy1-ey0+10);}
    pad.style.setProperty('--lift',Math.round(lift)+'px');}catch(e){}}scr.classList.toggle('touchpad',on);
  if(sk)sk.hidden=!(st==='play');
  if(deck){const t=G.music.tape();for(const b of deck.querySelectorAll('[data-id=prev],[data-id=next]'))b.hidden=t.watch;}
  if(mus&&mus.mark!==(G.music.on()?'on':'off'))paintMus();},250);
})();
