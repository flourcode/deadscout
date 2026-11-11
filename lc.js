/* Driftnaut · the picture: the cutaway engine (cut.js) drawn to a canvas with the transmission on top — the slow analog
   life of an old signal (exposure breath, sync slips, tears, a chromatic split only during an event), the intro cards,
   the HALCYON open and the outro. window.LC.create(canvas) -> {setSize, setProject, render, chapterAt}. Design units
   are 1920x1080; the canvas can be any size. */
(function(){
"use strict";
let DW=1920,DH=1080;const INTRO=2.6,OUTRO=5,HAL=2.8,HAL_X=2.2,CAPS=5; /* r88: the hull opens after 2.8 s (it was 7) and is open by 5; the two captions run on over the open ship until 5, so the ship can be touched inside ten seconds of COME ABOARD */ /* r26: the open ends on CURRENT STATUS · LOST *//* HAL: the HALCYON open, over the hull outside, with the music already running; then HAL_X seconds dissolving in */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sm=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const hash=(a,b)=>{let h=Math.imul((a|0)^0x9e3779b9,0x85ebca6b)^Math.imul((b|0)+0x7f4a7c15|0,0xc2b2ae35);h^=h>>>15;h=Math.imul(h,0x2c1b3c6d);h^=h>>>12;return (h>>>0)/4294967296;};
const vn=(x,s)=>{const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return hash(i,s)*(1-u)+hash(i+1,s)*u;};
/* how much the transmission misbehaves, by chapter role and the project's energy */
const SETS={ambient:{scan:0,bump:0,vsync:0,tear:0,chroma:0,expo:1.2},low:{scan:.3,bump:.3,vsync:.3,tear:.2,chroma:.2,expo:1},synthwave:{scan:.6,bump:.6,vsync:.4,tear:.4,chroma:.4,expo:1.2},dark:{scan:.4,bump:.3,vsync:.6,tear:.6,chroma:.6,expo:1,dark:true}};
const ROLE_SET={ROUTINE:'low',SIGNAL:'synthwave',SEARCH:'synthwave',CONTACT:'dark',INTRUSION:'dark',ESCALATION:'dark',REALIZATION:'dark',AFTERMATH:'low'};
const FX_ENERGY={low:.6,mid:1,high:1.4};
const EVENTS={'signal-hit':'SIGNAL HIT','contact-pulse':'CONTACT PULSE','power-drop':'POWER DROP','intrusion':'INTRUSION','hard-sync':'HARD SYNC'};
function create(canvas){
  const ctx=canvas.getContext('2d');let P=null,times=[],scale=1;
  const tmp=document.createElement('canvas'),tx=tmp.getContext('2d'),tmp2=document.createElement('canvas'),tx2=tmp2.getContext('2d');
  function setSize(w,h,irw,irh){canvas.width=w;canvas.height=h;const tall=h>w*1.15; /* r82: an upright picture is laid out 1080 wide and as tall as it is */DW=tall?1080:1920;DH=tall?Math.round(1080*h/w):1080;scale=w/DW;try{if(irw&&irh)CUT.picture(irw,irh);else CUT.picture(640,360);}catch(e){}}
  function setProject(p,t){P=p;times=t||[];}
  const chapterAt=t=>{for(let k=times.length-1;k>=0;k--)if(t>=times[k].start)return k;return 0;};
  function cfgOf(ch,sd){const role=String(ch.role||ch.title||'').toUpperCase(),mk=ch.motion&&ch.motion!=='auto'?ch.motion:(ROLE_SET[role]||P.motion||'synthwave'),S=SETS[mk]||SETS.synthwave,e=FX_ENERGY[ch.fxEnergy||P.fxEnergy||'mid']||1;
    return {dark:!!S.dark,e,sd,scan:Math.min(S.scan,.6),bump:Math.min(S.bump,.6),vsync:Math.min(S.vsync,.4),tear:Math.min(S.tear,.4),chroma:Math.min(S.chroma,.4),expo:Math.min(S.expo,1.2),calm:/ESCALATION|REALIZATION/.test(role)?.8:1,stars:false};}
  const HAL_BLOCKS=[['2291 // DSV HALCYON',0,2.2],['DRIFTING PEACEFULLY','150 AU FROM SOL',2.2,5]];
  function halcyonOpen(c,t){c.save();c.setTransform(scale,0,0,scale,0,0);const openK=t<HAL?0:Math.min(1,(t-HAL)/HAL_X);c.fillStyle='rgba(2,3,8,'+(.38*(1-openK)).toFixed(3)+')';c.fillRect(0,0,DW,DH);c.globalAlpha=sm(t/.8);
    for(const b of HAL_BLOCKS){const two=b.length===4,t0=b[two?2:1],t1=b[two?3:2];if(t<t0||t>=t1)continue;const u=t-t0,a=Math.min(sm(u/.45),1-sm((u-(t1-t0-.5))/.5));c.globalAlpha=sm(t/.8)*a;c.textAlign='left';
      c.font='400 30px Silk,"LR Clean",monospace';try{c.letterSpacing='9px';}catch(e){}const TALL=DH>DW,X0=TALL?70:150,Y0=TALL?DH-470:DH-250,K=TALL?.8:1;if(TALL||openK>0){const ga=c.globalAlpha;c.globalAlpha=ga*.72*(TALL?1:openK);c.fillStyle='#0b0e11';c.fillRect(TALL?0:X0-50,Y0-70,TALL?DW:980,two?200:110);c.globalAlpha=ga;} /* upright: the words lie over the hull, so they get a dark band of their own */c.font='400 '+Math.round(30*K)+'px Silk,"LR Clean",monospace';c.fillStyle='#8fd8c0';c.fillText(b[0],X0,Y0);
      if(two){c.font='400 64px Silk,"LR Clean",monospace';try{c.letterSpacing='12px';}catch(e){}c.font='400 '+Math.round(64*K)+'px Silk,"LR Clean",monospace';c.fillStyle=b[1]==='INTERNAL'||b[1]==='LOST'?'#e8a33a':'#e7dbc0';c.fillText(b[1],X0,Y0+90*K);}}
    try{c.letterSpacing='0px';}catch(e){}c.restore();}
  function card(c,line,alpha){c.save();c.setTransform(scale,0,0,scale,0,0);c.globalAlpha=alpha;c.fillStyle='#0c0a09';c.fillRect(0,0,DW,DH);c.fillStyle='#e7dbc0';c.textAlign='center';c.font='400 58px Silk,monospace';try{c.letterSpacing='8px';}catch(e){}c.fillText('DRIFTNAUT',DW/2+4,DH/2+8);
    c.font='400 20px Silk,monospace';try{c.letterSpacing='5px';}catch(e){}c.globalAlpha=alpha*.7;c.fillText(line,DW/2+3,DH/2+56);try{c.letterSpacing='0px';}catch(e){}c.restore();}
  const evt=(t,period,dur,sd,skip)=>{const n=Math.floor(t/period);for(const m of [n,n-1]){if(m<0||hash(m,sd)<skip)continue;const st=m*period+(.1+.6*hash(m,sd+1))*period,u=(t-st)/dur;if(u>=0&&u<1)return {u,m};}return null;};
  const reg=b=>({X:Math.floor(b.x*scale),Y:Math.floor(b.y*scale),W:Math.max(2,Math.ceil(b.w*scale)),H:Math.max(2,Math.ceil(b.h*scale))});
  function grab(c,b){const R=reg(b);tmp.width=R.W;tmp.height=R.H;tx.drawImage(c.canvas,R.X,R.Y,R.W,R.H,0,0,R.W,R.H);return R;}
  function slice(c,R,y,h,dx){y=Math.max(0,Math.floor(y));h=Math.min(R.H-y,Math.ceil(h));if(h<1)return;c.drawImage(tmp,0,y,R.W,h,R.X+dx,R.Y+y,R.W,h);}
  /* a true channel split: red and blue shifted against green, no colour added */
  const tmp3=document.createElement('canvas'),tx3=tmp3.getContext('2d');
  function chroma(c,b,d,alpha){const R=grab(c,b);tmp2.width=tmp3.width=R.W;tmp2.height=tmp3.height=R.H;
    const only=(col)=>{tx3.globalCompositeOperation='source-over';tx3.clearRect(0,0,R.W,R.H);tx3.drawImage(tmp,0,0);tx3.globalCompositeOperation='multiply';tx3.fillStyle=col;tx3.fillRect(0,0,R.W,R.H);};
    tx2.globalCompositeOperation='source-over';tx2.drawImage(tmp,0,0);tx2.globalCompositeOperation='multiply';tx2.fillStyle='#00ff00';tx2.fillRect(0,0,R.W,R.H);tx2.globalCompositeOperation='lighter';
    only('#ff0000');tx2.drawImage(tmp3,d,0);only('#0000ff');tx2.drawImage(tmp3,-d,0);tx2.globalCompositeOperation='source-over';
    c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=Math.min(1,alpha);c.drawImage(tmp2,R.X,R.Y);c.restore();}
  function transmission(c,b,t,cf,evE){const sd=cf.sd,e=cf.e,fq=e*cf.calm;let glitch=0;
    /* exposure breath: 100 -> 103 -> 99 -> 100, slow and never in step with the next panel */
    if(cf.expo>0){let v=(vn(t/7.3,sd+21)-.5)*2*.6+(vn(t/17.1,sd+22)-.5)*2*.4;if(cf.dark)v-=.35;const A=.018*cf.expo*Math.abs(v);c.save();if(v>0){c.globalCompositeOperation='lighter';c.fillStyle=`rgba(255,240,220,${A})`;}else c.fillStyle=`rgba(0,0,0,${A*1.4})`;c.fillRect(b.x,b.y,b.w,b.h);c.restore();}
    if(cf.stars){c.save();c.globalCompositeOperation='lighter';const N=Math.round(b.w*b.h/9000);for(let k=0;k<N;k++){const u=hash(k,sd+40),v=hash(k,sd+41),tw=.55+.45*Math.sin(t*(.4+hash(k,sd+42))+k),x=b.x+((u+t/260*(.4+hash(k,sd+43)))%1)*b.w,y=b.y+v*b.h;
      c.fillStyle=`rgba(255,250,235,${.22*tw})`;c.fillRect(x,y,1.3,1.3);}c.restore();}
    const E=evE||{};let R=null;const need=()=>R||(R=grab(c,b));
    /* SIGNAL SCAN: a broad band of resync rolling down the panel */
    const sc=cf.scan>0?evt(t,(8+6*hash(sd,11))*(cf.scan>=2?1:1.45)/Math.sqrt(fq),2.1,sd+11,.15):null,scU=E.scan!=null?E.scan:sc?sc.u:null;
    if(scU!=null){const I=(E.scan!=null?2.6:cf.scan)*Math.sqrt(e),y=b.y-b.h*.2+scU*b.h*1.4,hh=b.h*.28;need();c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=.85;
      for(let j=0;j<5;j++){const yy=(y-hh/2+j*hh/5-b.y)*scale,dx=(Math.sin(j*2.1+t*30)*.9*I)*scale*.6;slice(c,R,yy,hh/5*scale,dx);}c.restore();
      c.save();c.globalCompositeOperation='lighter';const g=c.createLinearGradient(0,y-hh/2,0,y+hh/2);g.addColorStop(0,'rgba(235,245,235,0)');g.addColorStop(.5,`rgba(235,245,235,${.035*I})`);g.addColorStop(1,'rgba(235,245,235,0)');c.fillStyle=g;c.fillRect(b.x,y-hh/2,b.w,hh);c.restore();}
    /* SIGNAL BUMP: a quick bright line of energy passing through */
    const bu=cf.bump>0?evt(t,(8+12*hash(sd,12))/(cf.bump/2)/fq,.42,sd+12,.25):null,buU=E.bump!=null?E.bump:bu?bu.u:null;
    if(buU!=null){const I=(E.bump!=null?3:cf.bump)*Math.sqrt(e),y=b.y+buU*b.h,h=(6+4*I);need();c.save();c.setTransform(1,0,0,1,0,0);slice(c,R,(y-h-b.y)*scale,h*2*scale,(1.2+.9*I)*scale);c.restore();
      c.save();c.globalCompositeOperation='lighter';const g=c.createLinearGradient(0,y-h,0,y+h);g.addColorStop(0,'rgba(170,255,225,0)');g.addColorStop(.5,`rgba(200,255,235,${.07*I})`);g.addColorStop(1,'rgba(170,255,225,0)');c.fillStyle=g;c.fillRect(b.x,y-h,b.w,h*2);c.restore();if(bu&&hash(bu.m,sd+50)<cf.chroma*.35)glitch=Math.max(glitch,Math.sin(Math.PI*buU));}
    /* VERTICAL SYNC: the picture slips a few pixels and settles */
    const vs=cf.vsync>0?evt(t,(cf.vsync>=2?16:cf.vsync>=1?24:40)*(1+.7*hash(sd,13))/fq,.1+.2*hash(Math.floor(t/7),sd),sd+13,.2):null,vsU=E.vsync!=null?E.vsync:vs?vs.u:null;
    if(vsU!=null){const I=E.vsync!=null?3:cf.vsync,d=(3+2.4*I)*Math.sin(Math.PI*vsU)*scale;need();c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(tmp,R.X,R.Y+d);
      const s1=R.H*(.3+.3*hash(vs?vs.m:1,sd+60));c.drawImage(tmp,0,s1,R.W,R.H*.12,R.X+d*.8,R.Y+s1+d,R.W,R.H*.12);c.fillStyle='rgba(8,6,5,.85)';c.fillRect(R.X,R.Y,R.W,Math.max(0,d));c.restore();if(vs&&hash(vs.m,sd+51)<cf.chroma*.4)glitch=Math.max(glitch,Math.sin(Math.PI*vsU));}
    /* HORIZONTAL TEAR: one soft band pulled sideways */
    const te=cf.tear>0?evt(t,(cf.tear>=2?18:30)*(1+.8*hash(sd,14))/fq,.1+.3*hash(Math.floor(t/9),sd+3),sd+14,.25):null,teU=E.tear!=null?E.tear:te?te.u:null;
    if(teU!=null){const m=te?te.m:7,h=(20+60*hash(m,sd+70))*scale,y0=(.15+.7*hash(m,sd+71))*b.h*scale,dx=(5+20*hash(m,sd+72))*(hash(m,sd+73)<.5?-1:1)*Math.sin(Math.PI*teU)*scale*(E.tear!=null?1.4:1);need();c.save();c.setTransform(1,0,0,1,0,0);
      slice(c,R,y0,h*.25,dx*.45);slice(c,R,y0+h*.25,h*.5,dx);slice(c,R,y0+h*.75,h*.25,dx*.45);c.restore();if(te&&hash(te.m,sd+52)<cf.chroma*.5)glitch=Math.max(glitch,Math.sin(Math.PI*teU));}
    /* CHROMATIC SPLIT: only ever during an event */
    const cg=Math.max(glitch,E.chroma||0);if(cg>.05)chroma(c,b,Math.max(1,Math.round((1+2*cg)*scale)),.35+.65*cg);
    if(E.dip)c.save(),c.fillStyle=`rgba(0,0,0,${.45*E.dip})`,c.fillRect(b.x,b.y,b.w,b.h),c.restore();
    if(E.flare){c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(200,235,255,${.06*E.flare})`;c.fillRect(b.x,b.y,b.w,b.h);c.restore();}}
  /* the chapter's one major event, shared by every panel on the page (once, as the page arrives) */
  function eventAt(name,t){if(!name)return null;const u=(t-1.2)/2.4;if(u<0||u>1)return null;const env=(a,z)=>u>=a&&u<z?Math.sin(Math.PI*(u-a)/(z-a)):0,ph=(a,z)=>u>=a&&u<z?(u-a)/(z-a):null,o={};
    if(name==='power-drop'){o.dip=Math.max(env(0,.55),.6*env(.55,.7)*(Math.sin(u*90)>0?1:0));}
    else if(name==='contact-pulse'){o.flare=env(.05,.5);o.scan=ph(.2,.75);o.chroma=.6*env(.2,.4);}
    else if(name==='intrusion'){o.tear=ph(.15,.3);o.vsync=ph(.32,.42);o.chroma=env(.12,.45);o.bump=ph(.5,.65);}
    else if(name==='hard-sync'){o.dip=.6*env(0,.2);o.vsync=ph(.18,.3);o.tear=ph(.3,.42);o.chroma=env(.15,.45);o.scan=ph(.45,1);}
    else{o.dip=.5*env(0,.18);o.tear=ph(.18,.3);o.chroma=env(.15,.4);o.scan=ph(.35,.95);o.bump=ph(.2,.35);}
    return o;}
  function drawCut(c,t,opts){const k=chapterAt(t),ch=P.chapters[k]||{},b={x:0,y:0,w:DW,h:DH};c.save();c.setTransform(scale,0,0,scale,0,0);c.fillStyle='#070a16';c.fillRect(0,0,DW,DH);
    CUT.render(c,P,times,t,b,scale);const cf=cfgOf(ch,(P.seed||1)+7);
    const ev=CUT.eventAt(t);let evE=ev&&EVENTS[ev.type]?eventAt(ev.type,ev.local):null;for(const e of ch.one_shot_events||[]){const at=(times[k]?times[k].start:0)+e.at;if(!evE&&EVENTS[e.type]&&t>=at&&t<at+2.6)evE=eventAt(e.type,t-at+1.2);}
    if(!opts.plain)transmission(c,b,t,cf,evE);c.restore();}
  function render(t,opts){opts=opts||{};if(!P||!P.chapters||!P.chapters.length){ctx.fillStyle='#070a16';ctx.fillRect(0,0,canvas.width,canvas.height);return;}
    if(opts.page!=null){ctx.setTransform(1,0,0,1,0,0);drawCut(ctx,(times[opts.page]?times[opts.page].start:0)+(opts.local!=null?opts.local:0),opts);return;}
    const B=P.brand||{},total=times.length?times[times.length-1].end:0,hal=B.intro==='halcyon'&&CUT.hasExterior&&CUT.hasExterior();
    if(B.intro&&!hal&&t<INTRO){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);card(ctx,B.line||'RECOVERED TRANSMISSION · DSV HALCYON',sm(t/.6));return;}
    ctx.setTransform(1,0,0,1,0,0);
    if(hal&&t<HAL+HAL_X+3){const u=t<HAL+HAL_X?0:sm((t-HAL-HAL_X)/3),Vs=opts.view||CUT.view(P,times,t);CUT.force((opts.view||[0,0,CUT.W,CUT.H]).map((v,i)=>v+(Vs[i]-v)*u)); /* r82: a caller's own camera (the upright phone) holds through the open */CUT.exterior(t<HAL?1:clamp(1-(t-HAL)/HAL_X,0,1));drawCut(ctx,t,opts);CUT.force(null);CUT.exterior(null);if(t<CAPS)halcyonOpen(ctx,t);} /* the open holds the whole ship, then the script's camera takes over */
    else drawCut(ctx,t,opts);
    const os=B.outro===true?'card':B.outro;if(os==='card'&&total&&t>total-OUTRO)card(ctx,'END OF TRANSMISSION'+(P.code?' · '+P.code:''),sm((t-(total-OUTRO))/1.4));
    else if(os==='fade'&&total&&t>total-3){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=`rgba(0,0,0,${sm((t-(total-3))/2.6)})`;ctx.fillRect(0,0,canvas.width,canvas.height);}}
  return {setSize,setProject,render,chapterAt,get scale(){return scale;}};}
window.LC={create,EVENTS,INTRO,OUTRO,HAL,HAL_X,CAPS,get DW(){return DW;},get DH(){return DH;}};
})();
