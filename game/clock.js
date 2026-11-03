/* Driftnaut · SHIP TIME (Nov 2026). Night Watch's clock, as ship instrumentation rather than a bedside appliance: a small
   seven-segment readout in the top-right status corner, beside the quick bar, labelled SHIP TIME, with the watch line
   (NIGHT WATCH // DSV HALCYON) under it. That line replaces the floating top-left label. Amber by default, matching the
   HUD; phosphor green, blue and white as options; red is kept for RED ALERT, when it takes the clock over. Click the clock
   (or CLOCK in the watch bar) to change it. Digits are drawn at whole-pixel dot sizes, so they stay crisp from laptop
   to TV. Hidden in photo and broadcast (a recording should not carry the time it was made). */
(function(){
"use strict";
const scr=document.getElementById('screen');if(!scr)return;
const COLS={amber:['#ffb04a','255,170,70'],green:['#9cffb4','140,255,170'],blue:['#86ccff','120,195,255'],white:['#e9eef5','225,232,245'],red:['#ff4632','255,60,40']};
const ORDER=['amber','green','blue','white','red','off'];
let P={c:'amber'};try{Object.assign(P,JSON.parse(localStorage.getItem('ds.clock2')||'{}'));}catch(e){}
const save=()=>{try{localStorage.setItem('ds.clock2',JSON.stringify(P));}catch(e){}};
const h12=(()=>{try{return new Intl.DateTimeFormat(undefined,{hour:'numeric'}).resolvedOptions().hour12!==false;}catch(e){return true;}})();
const SEG={a:[[1,0],[2,0],[3,0],[4,0]],b:[[5,1],[5,2],[5,3],[5,4]],c:[[5,6],[5,7],[5,8],[5,9]],d:[[1,10],[2,10],[3,10],[4,10]],e:[[0,6],[0,7],[0,8],[0,9]],f:[[0,1],[0,2],[0,3],[0,4]],g:[[1,5],[2,5],[3,5],[4,5]]};
const DIG=['abcdef','bc','abged','abgcd','fgbc','afgcd','afgedc','abc','abcdefg','abcdfg'];
const X0=[0,8,19,27],GW=33,GH=11;   /* 6×11 digits: H H : M M */
const box=document.createElement('div');box.className='shiptime';box.title='Ship time · click to change colour';box.setAttribute('role','button');
box.innerHTML='<div class="st-row"><span class="st-lab">SHIP TIME</span><canvas></canvas><span class="st-pm"></span></div><div class="st-sub" id="stSub"></div>';
const cv=box.querySelector('canvas'),x=cv.getContext('2d'),lab=box.querySelector('.st-lab'),pmEl=box.querySelector('.st-pm'),sub=box.querySelector('.st-sub');
const css=document.createElement('style');css.textContent=`
.shiptime{position:absolute;top:3%;right:12%;z-index:6;display:none;flex-direction:column;align-items:flex-end;gap:4px;cursor:pointer;pointer-events:auto;font-family:Silk,monospace}
body.watching.clk .shiptime{display:flex}
.shiptime .st-row{display:flex;align-items:center;gap:calc(8px*var(--ui,1))}
.shiptime .st-lab,.shiptime .st-pm{font-size:calc(8px*var(--ui,1));letter-spacing:3px;opacity:.75;white-space:nowrap}
.compact .shiptime .st-lab,.compact .shiptime .st-sub{display:none} /* a small screen: the digits only */
.shiptime .st-pm{min-width:2.2em;text-align:left}
.shiptime canvas{display:block;image-rendering:pixelated}
.shiptime .st-sub{font-size:calc(8px*var(--ui,1));letter-spacing:3px;color:var(--dim,#8d8676);opacity:.8;white-space:nowrap}
.shiptime.dimmed{opacity:.5}
body.photo .shiptime,body.bc .shiptime{display:none!important}
body.watching.clk:not(.bc) #wTag2{display:none!important}
body.watching .wui-top{right:auto;flex-direction:column;align-items:flex-start;gap:8px}
#wui.on~#wTag2{opacity:0}
body.watching.clk .wui-name{display:none}`;
document.head.appendChild(css);scr.appendChild(box);
let geo='';
function draw(){const alert=window.__toys&&window.__toys.S&&window.__toys.S.mood==='alert',c=COLS[alert?'red':P.c];if(!c)return;
  const sr=scr.getBoundingClientRect(),K=Math.max(1,Math.min(8,Math.round(sr.width/560))),dpr=Math.max(1,Math.round(window.devicePixelRatio||1)),D=K*dpr,gap=D>=4?Math.max(1,Math.round(D/4)):0,pad=3*D;
  const w=GW*D+pad*2,h=GH*D+pad*2,g=w+'x'+h;if(g!==geo){geo=g;cv.width=w;cv.height=h;cv.style.width=w/dpr+'px';cv.style.height=h/dpr+'px';cv.style.margin=(-pad/dpr)+'px';}
  const d=new Date();let H=d.getHours(),M=d.getMinutes();const pm=H>=12;if(h12)H=H%12||12;
  const digs=[H>=10||!h12?Math.floor(H/10):-1,H%10,Math.floor(M/10),M%10],colon=alert?(d.getMilliseconds()%500<250):d.getMilliseconds()<500;
  x.clearRect(0,0,w,h);const dot=(gx,gy,lit)=>{x.fillStyle=lit?c[0]:`rgba(${c[1]},.07)`;x.fillRect(pad+gx*D,pad+gy*D,D-gap,D-gap);};
  const pass=lit=>{for(let i=0;i<4;i++){const on=digs[i]<0?'':DIG[digs[i]];for(const s in SEG)if(on.includes(s)===lit)for(const [a,b] of SEG[s])dot(X0[i]+a,b,lit);}
    for(const [xx,yy] of [[15,3],[15,7]]){if(!lit)dot(xx,yy,false);else if(colon)dot(xx,yy,true);}};
  pass(false);x.save();x.shadowColor=`rgba(${c[1]},.7)`;x.shadowBlur=D*2.2;pass(true);x.restore();
  lab.style.color=pmEl.style.color=c[0];pmEl.textContent=h12?(pm?'PM':'AM'):'';
  const T=window.__toys,m=T&&T.MOODS&&T.MOODS.find(q=>q.id===T.S.mood);sub.textContent=(m?m.name:'NIGHT WATCH')+' // DSV HALCYON';}
function label(){const b=document.getElementById('wClock');if(b)b.textContent='CLOCK · '+P.c.toUpperCase();}
function set(c){P.c=c;save();label();tick();}
function cycle(withOff){let i=ORDER.indexOf(P.c);do{i=(i+1)%ORDER.length;}while(!withOff&&ORDER[i]==='off');set(ORDER[i]);}
box.addEventListener('pointerdown',e=>e.stopPropagation());
box.addEventListener('click',e=>{e.stopPropagation();cycle(false);});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#wClock');if(b){e.stopPropagation();cycle(true);}},true);
/* sits just left of the quick bar, on its row */
function place(){const q=document.querySelector('.qbar');const sr=scr.getBoundingClientRect();if(q&&q.offsetParent){const r=q.getBoundingClientRect();box.style.right=Math.round(sr.right-r.left+30)+'px';box.style.top=Math.round(r.top-sr.top)+'px';}else{box.style.right='2%';box.style.top='3%';}}
function tick(){const on=P.c!=='off'||(window.__toys&&window.__toys.S&&window.__toys.S.mood==='alert');document.body.classList.toggle('clk',on);if(!document.body.classList.contains('watching'))return;
  const dimEl=document.getElementById('dim');box.classList.toggle('dimmed',!!(dimEl&&!dimEl.hidden));place();if(on)draw();}
setInterval(tick,250);label();tick();
window.__clock={P,set,cycle};
})();
