/* r88 · ONE DECISION PER TAP. The pointer is read here and nowhere else. A tap is for exactly one thing:
     Scout, a bot, a loose object, the tank   → that thing answers (game/life.js hit)
     a lamp, the reactor, a console, a hatch  → that switch works (game/toys.js toyAt, fire)
     anything else                            → the astronaut goes there (game/naut.js send)
   An object tap never also moves the astronaut. A mouse acts on the press and can then drag to lead the astronaut; a finger acts on a
   clean tap (a pinch or a slide is the camera's). Letting go of a drag does nothing more.
   THREE THINGS ARE MADE EASY: Scout, the tank and the cabin lamp each have a real button over them. That gives them a generous target,
   a hover and keyboard-focus cue (corner marks), a name for a screen reader, and a short first-visit cue on touch. Everything else aboard
   is still there to find, unmarked. */
(()=>{
const G=window.__naut;if(!G||!G.api||!window.CUT)return;const A=G.api,GP=()=>window.__gp,stage=document.getElementById('stage'),BC=!!(window.__bc&&__bc.on);
const coarse=()=>!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches);
const B=document.body.classList,ready=()=>A.active()&&G.on&&!B.contains('about')&&!B.contains('photo')&&performance.now()-G.t0>900;
function world(cx,cy){const r=stage.getBoundingClientRect(),V=GP().vw();return [V[0]+(cx-r.left)/r.width*V[2],V[1]+(cy-r.top)/r.height*V[3]];}
function used(kind){if(!G.found){G.found=true;try{localStorage.setItem('driftnaut.found','1');}catch(e){}}try{dispatchEvent(new CustomEvent('fm:used',{detail:kind}));}catch(e){}}
function decide(wx,wy,pad){const L=window.__life,T=window.__toys;let h=null;try{h=L&&L.hit(wx,wy,pad);}catch(e){}if(h)return h;let t=null;try{t=T&&T.toyAt(wx,wy,pad);}catch(e){}if(t)return {kind:'toy',toy:t,act:()=>T.fire(t)};return null;}
/* r92 · OUTSIDE, YOU TAP WHAT YOU SEE. While the hull is closed (a spacewalk, or standing on the back deck) the rooms are hidden, so a tap on the hull
   is a tap on the hull: the astronaut flies there and stays outside. The way home is where it looks like it is: tap the back deck to land on it, and
   tap the airlock door (or the deck again once standing on it) to go in. Nothing hidden under the hull answers a tap. */
const hullShut=()=>{try{return (CUT.extAt()||0)>.5;}catch(e){return false;}};
function outsideTap(wx,wy){const r=A.roomAt(wx,wy-0)||A.roomAt(wx,wy+34),door=Math.abs(wx-DOOR[0])<DOOR[2]/2&&Math.abs(wy-DOOR[1])<DOOR[3]/2;
  if(door||(r==='eva'&&!G.space&&A.roomAt(G.x,G.y-34)==='eva'&&!G.path.length)){G.goIn();used('floor');return 'in';}
  if(r==='eva'){G.send(wx,wy+34);used('floor');return 'deck';}
  try{const T=window.__toys,t=T&&T.toyAt(wx,wy,0);if(t&&t.id==='beacon'){T.fire(t);used('toy');return 'toy';}}catch(e){}
  G.send(wx,wy+34,true);used('floor');return 'floor';}
const DOOR=[1900,1010,130,170];
function tapAt(wx,wy,pad){if(hullShut())return outsideTap(wx,wy);const d=decide(wx,wy,pad);
  if(d){if(d.kind==='toy'&&!window.__toys.ready(d.toy))return 'wait'; /* its room is still waking: not this, and not a walk either */
    try{d.act();}catch(e){}G.last=performance.now();G.intro=2;used(d.kind);return d.kind;}
  G.send(wx,wy+34);used('floor');return 'floor';}
/* ---- the pointer ---- */
const pts=new Map();let down=null,leadAt=0;
stage.addEventListener('pointerdown',e=>{pts.set(e.pointerId,1);if(!ready()||e.button>0){down=null;return;}const [wx,wy]=world(e.clientX,e.clientY);
  if(e.pointerType==='touch'){down=pts.size===1?{id:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),touch:true}:null;return;}
  const k=tapAt(wx,wy,0);down={id:e.pointerId,lead:k==='floor'};leadAt=performance.now();});
addEventListener('pointermove',e=>{if(!down)return;if(down.touch){if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>14)down=null;return;}
  if(!down.lead||!(e.buttons&1)||!ready())return;const pn=performance.now();if(pn-leadAt<150)return;leadAt=pn;const [wx,wy]=world(e.clientX,e.clientY);G.leadTo(wx,wy+34);},true);
const up=e=>{pts.delete(e.pointerId);const d=down;if(d&&d.id===e.pointerId)down=null;if(e.type==='pointercancel'||!d||!d.touch||d.id!==e.pointerId||!ready())return;
  if(performance.now()-d.t>700||Math.hypot(e.clientX-d.x,e.clientY-d.y)>14)return;const [wx,wy]=world(e.clientX,e.clientY);tapAt(wx,wy,22);};
addEventListener('pointerup',up,true);addEventListener('pointercancel',up,true);
/* ---- a longer walk shows where it ends ---- */
G.under.push((x,t,u,pn)=>{const d=G.dest;if(!d)return;if(!G.path.length||pn-d.t>30000){G.dest=null;return;}const a=u,s=14,k=.55+.35*Math.sin(pn/260);x.globalAlpha=k;x.fillStyle='#f6efe4';
  for(const sx of [-1,1])for(const sy of [-1,1]){const cx=Math.round((d.x+sx*s)/a)*a,cy=Math.round((d.y+sy*s)/a)*a;x.fillRect(cx-(sx>0?3*a:0),cy,4*a,a);x.fillRect(cx,cy-(sy>0?3*a:0),a,4*a);}x.globalAlpha=1;});
/* ---- Scout, the tank, the cabin lamp: real buttons ---- */
const css=document.createElement('style');css.textContent=`
.hot{all:unset;position:fixed;z-index:5;box-sizing:border-box;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;--c:transparent;
  background:linear-gradient(var(--c),var(--c)) left top/12px 2px no-repeat,linear-gradient(var(--c),var(--c)) left top/2px 12px no-repeat,linear-gradient(var(--c),var(--c)) right top/12px 2px no-repeat,linear-gradient(var(--c),var(--c)) right top/2px 12px no-repeat,
  linear-gradient(var(--c),var(--c)) left bottom/12px 2px no-repeat,linear-gradient(var(--c),var(--c)) left bottom/2px 12px no-repeat,linear-gradient(var(--c),var(--c)) right bottom/12px 2px no-repeat,linear-gradient(var(--c),var(--c)) right bottom/2px 12px no-repeat}
.hot[hidden]{display:none}
@media (hover:hover){.hot:hover{--c:rgba(246,239,228,.75)}}
.hot:focus-visible{--c:#ff9a3c;outline:none}
.hot.cue{animation:hotcue 1.3s ease-in-out 2}
@keyframes hotcue{0%,100%{--c:rgba(246,239,228,0)}50%{--c:rgba(246,239,228,.85)}}
@media (prefers-reduced-motion: reduce){.hot.cue{animation:none;--c:rgba(246,239,228,.6)}}
body.bc .hot{--c:transparent!important;animation:none!important}body.about .hot,body.photo .hot{display:none}`;document.head.appendChild(css);
try{CSS.registerProperty({name:'--c',syntax:'<color>',inherits:false,initialValue:'transparent'});}catch(e){}
const lampToy=()=>{try{return __toys.TOYS.find(t=>t.id==='light-crew-quarters');}catch(e){return null;}};
const HOT=[
 {id:'hotScout',name:()=>'Pet Scout',box:()=>{const k=__life.scoutPos();return k&&[k.x,k.y-26,104,92];},act:()=>__life.pet(),kind:'scout'},
 {id:'hotTank',name:()=>'Check on the tank',box:()=>{const T=__life.TANK;return [T.x,T.y-T.h/2,T.w+24,T.h+20];},act:()=>__life.tankTap(),kind:'tank'},
 {id:'hotDoor',out:true,name:()=>'Go back inside',box:()=>DOOR,act:()=>G.goIn(),kind:'floor'},
 {id:'hotLamp',name:()=>{let on=true;try{on=!!__toys.S.lit['crew-quarters'];}catch(e){}return 'Cabin lamp, '+(on?'on':'off');},box:()=>{const T=lampToy(),w=T&&T.at();return w&&[w[0],w[1]+6,170,84];},act:()=>{const T=lampToy();return T&&__toys.fire(T);},ok:()=>{const T=lampToy();return !!T&&__toys.ready(T);},kind:'toy'}];
for(const h of HOT){const b=document.createElement('button');b.type='button';b.id=h.id;b.className='hot';b.hidden=true;b.setAttribute('aria-label',h.name());h.el=b;document.body.appendChild(b);
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!ready()||(h.ok&&!h.ok()))return;try{h.act();}catch(_){}G.last=performance.now();G.intro=2;used(h.kind);b.setAttribute('aria-label',h.name());});
  b.addEventListener('pointerdown',e=>e.stopPropagation());}
let cueDone=false;function cue(){if(cueDone||BC)return;cueDone=true;if(!coarse())return; /* r89: a mouse has hover; only a finger gets the brief first-visit marks */let seen=false;try{seen=!!localStorage.getItem('driftnaut.found');}catch(e){}if(seen)return;for(const h of HOT)h.el.classList.add('cue');setTimeout(uncue,2800);}
function uncue(){for(const h of HOT)h.el.classList.remove('cue');}addEventListener('fm:used',uncue);
(function place(){requestAnimationFrame(place);const on=ready();let ext=0;try{ext=CUT.extAt()||0;}catch(e){}
  const shut=ext>.5;if(!on||(ext>.2&&ext<=.5)){for(const h of HOT)if(!h.el.hidden)h.el.hidden=true;return;}
  const r=stage.getBoundingClientRect(),V=GP().vw(),sx=r.width/V[2],sy=r.height/V[3],min=coarse()?48:28;
  for(const h of HOT){let bx=null;try{bx=(!!h.out===shut)?h.box():null;}catch(e){}if(!bx||(h.ok&&!h.ok())){if(!h.el.hidden)h.el.hidden=true;continue;}
    const w=Math.max(min,bx[2]*sx),hh=Math.max(min,bx[3]*sy),cx=r.left+(bx[0]-V[0])*sx,cy=r.top+(bx[1]-V[1])*sy;
    if(cx<r.left+8||cx>r.right-8||cy<r.top+8||cy>r.bottom-8){if(!h.el.hidden)h.el.hidden=true;continue;}
    const st=h.el.style;st.left=Math.round(cx-w/2)+'px';st.top=Math.round(cy-hh/2)+'px';st.width=Math.round(w)+'px';st.height=Math.round(hh)+'px';if(h.el.hidden)h.el.hidden=false;const nm=h.name();if(h.nm!==nm){h.nm=nm;h.el.setAttribute('aria-label',nm);}}
  if(performance.now()-G.t0>2500)cue();})();
window.__tap={tapAt,decide,world,HOT,ready};
})();
