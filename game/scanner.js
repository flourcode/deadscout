/* The signal scanner: a chunky handheld with a tiny CRT, a frequency dial and an antenna. It reads residual signals the
   story places in the ship (localized: she has to find where a memory is strongest), and when the signal is strong
   she TUNES: turn the dial until the trace aligns with the source's frequency, hold it, and it locks. A SIGNAL-kind
   source reads ANOMALOUS. Pure model + a drawing routine; game.js owns input, sound and the timeline. */
(function(){
"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=s=>{let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return ((h>>>0)%1000)/1000;};
const SRC=[];let found=false,sweepT=-9,tuning=null,dial=null,freq=.5,lockSrc=null;
const TOL=.045,HOLD=.7;
const STATE=(s,S)=>s>=.6&&S&&S.kind==='signal'?'ANOMALOUS':s>=.6?'HIGH':s>=.3?'MEDIUM':s>=.08?'LOW':'OFF';
function read(x,y){let best=null;for(const S of SRC){if(S.off)continue;const dx=S.x-x,dy=S.y-y,d=Math.hypot(dx,dy*2.2),s=clamp(1-d/S.r,0,1);if(!best||s>best.s)best={s,S,dx,dy};}
  if(!best)return {s:0,state:'OFF',dir:0,src:null,aligned:0};
  const S=best.S,locked=lockSrc===S&&best.s>=.6,aligned=1-clamp(Math.abs(freq-S.f)/TOL,0,1);
  return {s:best.s,state:tuning?'MEMORY':locked?'LOCKED':STATE(best.s,S),dir:Math.abs(best.dy)>70&&best.s<.5?(best.dy<0?'up':'down'):Math.abs(best.dx)<40?'here':best.dx<0?'left':'right',src:S,aligned,canTune:best.s>=.6&&!tuning};}
/* the dial: open it on a strong signal, turn it, hold the alignment, and it locks */
function open(t){const R=dial;if(R)return;dial={t0:t,held:0,last:t};}
function close(){dial=null;}
function turn(d){freq=clamp(freq+d,0,1);}
function tick(t,R){if(!dial)return null;const dt=Math.max(0,t-dial.last);dial.last=t;if(!R.src||R.s<.6||tuning){close();return null;}
  if(R.aligned>.35)dial.held+=dt;else dial.held=Math.max(0,dial.held-dt*2);
  if(dial.held>=HOLD){lockSrc=R.src;close();return 'lock';}return null;}
/* the device, authored at 72x40 internal pixels and drawn at the world's own pixel size (x5 at 1080p; x8 while the dial is open) */
const dc=document.createElement('canvas');dc.width=72;dc.height=40;const dx=dc.getContext('2d');dx.imageSmoothingEnabled=false;
const px=(x,y,w,h,c)=>{dx.fillStyle=c;dx.fillRect(x,y,w,h);};
const C={case0:'#2a241f',case1:'#574a3d',case2:'#746652',edge:'#827a67',dark:'#1b1815',crt0:'#0c0d0d',crt1:'#174a4a',crt2:'#2f8a7c',g:'#78d8b8',g2:'#d8fff0',amber:'#e8a33a',amber2:'#ffd27a',red:'#d0442e',anom:'#aaa0ff',steel:'#8c8f96'};
function draw(c,t,R,k,anim){const sw=Math.max(0,1-(t-sweepT)/2.4),s=R.s,lock=R.state==='LOCKED'||R.state==='MEMORY',anom=R.state==='ANOMALOUS',open_=!!dial;
  dx.clearRect(0,0,72,40);
  px(1,5,70,34,C.case0);px(2,6,68,32,C.case1);px(3,7,66,30,C.case2);px(4,8,64,1,C.edge);px(4,36,64,1,C.dark); /* casing, one dark contour, one light edge */
  for(const [rx,ry] of [[4,9],[66,9],[4,34],[66,34]])px(rx,ry,1,1,C.dark);
  px(6,10,40,20,C.dark);px(7,11,38,18,anom?'#131d27':C.crt0); /* the CRT */
  const n=38,tr=anom?C.anom:lock?C.g2:C.g;
  if(open_&&R.src){const al=R.aligned,ph=(freq-R.src.f)*40;for(let i=0;i<n;i++){const y1=20+Math.round(Math.sin(t*5+i*.6)*4*s),y2=20+Math.round(Math.sin(t*5+i*.6+ph)*4*s*(1-.5*al));px(7+i,clamp(y1,11,28),1,1,C.crt2);px(7+i,clamp(y2,11,28),1,1,al>.9?C.g2:C.amber2);}
    text('F '+freq.toFixed(2),8,12,C.g2);text(al>.9?'HOLD':al>.35?'CLOSE':'TUNE <>',8,23,al>.9?(Math.floor(t*4)%2?C.amber2:C.g2):C.g);px(8,28,Math.round(36*clamp(dial.held/HOLD,0,1)),1,C.amber2);}
  else{for(let i=0;i<n;i++){const ph=t*(2+s*9)+i*.6,a=lock?Math.sin(ph)*5:(Math.sin(ph)*3*s+((Math.sin(i*7.3+t*31)*0.5+0.5)*(1+4*(1-s))*((t*17+i)%1)));const y=20+Math.round(a*(sw>0?1.6:1));px(7+i,clamp(y,11,28),1,1,tr);}
    text('SIG '+String(Math.round(s*100)).padStart(2,' ')+'%',8,12,lock?C.g2:C.g);text(R.state==='HIGH'?'HIGH Q':R.state==='ANOMALOUS'?'ANOMAL':R.state,8,23,R.state==='LOCKED'?(Math.floor(t*3)%2?C.amber2:C.g2):R.state==='MEMORY'?C.g2:anom?C.anom:C.g);}
  /* the dial: the needle is the frequency, a tick marks the source once the signal can be read */
  px(49,10,18,18,C.dark);px(50,11,16,16,C.case0);const A=f=>Math.PI*(1.15-f*1.3),ang=A(freq)+(sw>0?Math.sin(t*40)*.08*sw:0),cx=58,cy=19;
  for(let i=0;i<=6;i++){const a=A(i/6);px(Math.round(cx+Math.cos(a)*7),Math.round(cy-Math.sin(a)*7),1,1,C.steel);}
  if(R.src&&s>=.3){const a=A(R.src.f);px(Math.round(cx+Math.cos(a)*8),Math.round(cy-Math.sin(a)*8),1,1,anom?C.anom:C.amber2);}
  for(let r=0;r<6;r++)px(Math.round(cx+Math.cos(ang)*r),Math.round(cy-Math.sin(ang)*r),1,1,'#ff8a5c');px(cx-1,cy-1,3,3,C.steel);
  /* direction, antenna, lamp, strength bar */
  const d=R.dir;text(d==='left'?'<':d==='right'?'>':d==='up'?'^':d==='down'?'V':d==='here'?'*':'-',8,31,C.amber);
  px(67,0,1,6,C.steel);px(66,0,3,1,C.edge);if(lock||(s>.3&&Math.floor(t*(2+s*6))%2))px(66,0,3,1,anom?C.anom:C.amber2);
  px(49,31,18,4,C.dark);px(50,32,s>.08?6:0,2,C.g);px(56,32,s>.6?10:0,2,C.amber2);
  const kk=open_?Math.round(k*1.6):k,W=dc.width*kk,H=dc.height*kk,X=open_?Math.round((c.canvas.width-W)/2):c.canvas.width-W-3*k,Y=c.canvas.height-H-3*k;
  c.save();c.imageSmoothingEnabled=false;c.globalAlpha=anim;c.drawImage(dc,X,Y,W,H);c.restore();}
function text(s,X,Y,col){if(window.PX&&PX.text)PX.text(dx,s,X,Y,col);}
window.SCAN={sources:SRC,read,draw,open,close,turn,tick,get dial(){return !!dial;},get freq(){return freq;},get found(){return found;},set found(v){found=!!v;},sweep(t){sweepT=t;},get tuning(){return tuning;},set tuning(v){tuning=v;if(v)lockSrc=null;},
  add(S){if(!SRC.find(q=>q.id===S.id)){S.f=S.f!=null?S.f:.12+.76*hash(S.id);SRC.push(S);}return S;},remove(id){const i=SRC.findIndex(q=>q.id===id);if(i>=0)SRC.splice(i,1);},unlock(){lockSrc=null;},clear(){SRC.length=0;found=false;tuning=null;dial=null;lockSrc=null;},
  state(){return {found,freq,sources:SRC.map(s=>({id:s.id,off:!!s.off}))};}};
})();
