/* Driftnaut · pixel helpers shared by the engine: the asset images (loaded as the bundles arrive), a 3x5 pixel font,
   procedural CRT content, the lamp palette and an irregular flicker. window.PX */
(function(){
"use strict";
const A=window.DS_ASSETS=window.DS_ASSETS||{sheets:{},images:{},world:null},IMG={};
function load(){for(const [k,u] of Object.entries(A.images)){if(IMG[k])continue;const im=new Image();im.src=u;IMG[k]=im;}}
load();
const ready=im=>im&&im.complete&&im.naturalWidth>0;
const hash=(a,b)=>{let h=Math.imul((a|0)^0x9e3779b9,0x85ebca6b)^Math.imul((b|0)+0x7f4a7c15|0,0xc2b2ae35);h^=h>>>15;h=Math.imul(h,0x2c1b3c6d);h^=h>>>12;return (h>>>0)/4294967296;};
const vn=(x,s)=>{const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return hash(i,s)*(1-u)+hash(i+1,s)*u;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const C={K0:'#0b0a10',C0:'#0c2226',C1:'#174a4a',C2:'#2f8a7c',C3:'#78d8b8',C4:'#d8fff0',R1:'#8e2620',R2:'#d0442e',R3:'#ff8a5c',A2:'#f0c068',P3:'#d2d0c6',B4:'#5a74a6'};
const FONT={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',J:'001001001101010',Q:'010101101111011',Z:'111001010100111',Y:'101101010010010',
  0:'111101101101111',1:'010110010010111',2:'110001010100111',3:'110001010001110',4:'101101111001001',5:'111100110001110',6:'011100111101111',7:'111001010010010',8:'111101111101111',9:'111101111001110','.':'000000000000010',':':'000010000010000','%':'101001010100101','-':'000000111000000','/':'001001010100100',' ':'000000000000000'};
function text(x,s,X,Y,col){x.fillStyle=col;for(const [i,ch] of [...String(s).toUpperCase()].entries()){const g=FONT[ch];if(!g)continue;for(let k=0;k<15;k++)if(g[k]==='1')x.fillRect(X+i*4+k%3,Y+(k/3|0),1,1);}}
/* ---------- procedural CRTs: idle-grid, waveform, signal, signal-bars, noise, text-terminal, warning, profile ---------- */
function crt(x,r,mode,t,sd,E){const [x0,y0,x1,y1]=r,w=x1-x0+1,h=y1-y0+1,amp=.5+.5*(E.energy||.5);x.save();x.beginPath();x.rect(x0,y0,w,h);x.clip();
  x.fillStyle=mode==='off'?C.K0:mode==='warning'&&Math.floor(t*2.2)%2?'#2a0c0a':C.C0;x.fillRect(x0,y0,w,h);const mid=y0+h/2|0,big=w>60;
  if(mode==='idle-grid'||mode==='waveform'||mode==='signal'){x.fillStyle=C.C1;for(let gx=x0+(big?6:4);gx<x1;gx+=big?12:8)for(let gy=y0+1;gy<y1;gy+=2)x.fillRect(gx,gy,1,1);for(let gy=y0+(big?6:4);gy<y1;gy+=big?12:8)for(let gx=x0+1;gx<x1;gx+=2)x.fillRect(gx,gy,1,1);}
  if(mode==='idle-grid'){const px=x0+((t*14+sd*7)%w|0);x.fillStyle=C.C3;x.fillRect(px,mid+Math.round(Math.sin(t*1.3+sd)*2),1,1);x.fillStyle=C.C2;x.fillRect(px-1,mid+Math.round(Math.sin(t*1.3+sd-.1)*2),1,1);}
  if(mode==='waveform'||mode==='signal'){const A=(mode==='signal'?.42:.16)*h*amp,sp=mode==='signal'?38:22,period=big?34:20;
    for(let i=0;i<w;i++){const u=i+t*sp,ph=(u%period)/period,burst=mode==='signal'?Math.exp(-Math.pow((ph-.5)*7,2)):0,v=Math.sin(u*.45+sd)*.35+Math.sin(u*.13)*.25+(vn(u*.6,sd)-.5)*.5,yy=Math.round(mid-(v*.4+burst*(hash(Math.floor(u/period),sd)>.15?1:.25)*Math.sin(u*1.7))*A);
      const age=(w-i)/w;x.fillStyle=age<.12?C.C4:age<.5?C.C3:C.C2;x.fillRect(x0+i,clamp(yy,y0,y1),1,mode==='signal'&&burst>.5?2:1);}
    if(big){text(x,mode==='signal'?'SIG REPEAT':'SCAN',x0+3,y0+3,C.C3);text(x,mode==='signal'?(0.2+0.03*Math.sin(t)).toFixed(2):'--',x1-18,y0+3,C.C3);if(mode==='signal'&&Math.floor(t*1.6)%2)text(x,'NOT NOISE',x0+3,y1-7,C.C4);}}
  if(mode==='signal-bars'){const n=big?14:6,bw=Math.max(2,Math.floor(w/n)-1);for(let i=0;i<n;i++){const v=vn(t*2.2+i*1.7,sd+i)*(.4+.6*amp),bh=Math.round(v*(h-4));x.fillStyle=i%5===2?C.C4:C.C3;x.fillRect(x0+1+i*(bw+1),y1-1-bh,bw,bh);}}
  if(mode==='noise'){for(let i=0;i<w*h/3;i++){const q=hash(i+Math.floor(t*30)*977,sd);x.fillStyle=q<.6?C.C1:q<.88?C.C2:C.C4;x.fillRect(x0+(hash(i,sd+1+Math.floor(t*30))*w|0),y0+(hash(i,sd+2+Math.floor(t*30))*h|0),1,1);}}
  if(mode==='text-terminal'){const rows=Math.floor((h-4)/(big?7:4)),shown=Math.floor(t*3)%(rows+6);for(let rI=0;rI<Math.min(rows,shown);rI++){const len=Math.floor((.3+.6*hash(rI,sd))*(w-6)/(big?4:2));
      if(big)text(x,['SYS OK','CH 4 1.420','FILTER ON','GAIN 0.82','REPEAT 11.3','TRACE','LOCK','DS-01'][(rI+sd)%8].slice(0,len),x0+3,y0+3+rI*7,C.C3);else{x.fillStyle=C.C2;x.fillRect(x0+2,y0+2+rI*4,len,1);}}
    if(Math.floor(t*2)%2){x.fillStyle=C.C3;x.fillRect(x0+3,y0+3+Math.min(rows,shown)*(big?7:4),big?3:2,big?5:1);}}
  if(mode==='profile'){const S=A.sheets['crt-tiles'],im=S&&IMG[S.path];if(ready(im)){const fi=S.animations.profile[0][0];x.drawImage(im,fi*S.frame_width+12,8,S.frame_width-24,S.frame_height-26,x0,y0,w,h);}}
  if(mode==='warning'){x.fillStyle=C.R2;x.fillRect(x0,y0,w,1);x.fillRect(x0,y1,w,1);if(big)text(x,'WARNING',x0+(w-28)/2|0,mid-2,Math.floor(t*2.2)%2?C.R3:C.R1);}
  /* scanlines and a slow roll band: part of the picture, not a page effect */
  x.fillStyle='rgba(0,0,0,.28)';for(let yy=y0+1;yy<=y1;yy+=2)x.fillRect(x0,yy,w,1);
  const rb=y0+((t*9+sd*13)%(h+12))-6;x.fillStyle='rgba(120,230,200,.07)';x.fillRect(x0,rb,w,4);x.restore();}
/* ---------- practical lights: the scene knows where they are ---------- */
const LCOL={amber:[255,190,90],red:[255,72,44],cyan:[120,240,210],orange:[255,140,60]};
function irr(t,cyc,sd){const n=Math.floor(t/cyc),w=t/cyc-n,pk=.25+.5*hash(n,sd+3),g=v=>Math.exp(-(v*v)/(2*.11*.11));return (hash(n,sd)<.2?.25:1)*Math.max(g(w-pk),g(w+1-pk))*.85+.15*vn(t*.7,sd+9);}
window.PX={IMG,load,crt,text,hash,vn,irr,C,LCOL,isReady:ready,ready:()=>Object.values(IMG).every(ready),have:k=>ready(IMG[k]),sheets:A.sheets};
})();
