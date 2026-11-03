/* DEADWAVE · the spaceship has been dreaming for 230 years.
   DeadScout's primary soundtrack style: slow, nocturnal, ambient, synthesized live from a seed (royalty-free, unlimited,
   reproducible for a recording). Not a song engine. A state engine: harmony that holds for 8–32 s (sometimes a minute),
   layers that come and go over minutes, a few remembered notes, and HALCYON's own machinery woven through it.

   Every pitch is minor pentatonic (1 ♭3 4 5 ♭7). The colour comes from the bass moving under it: over the root the set
   is a m7, over ♭3 the 4th becomes an add9, over ♭7 a sus with the 9th on top, over the 4th a minor 9.

   Layers: PAD A body (saw + detuned triangle, low-passed, 2–8 s attack, 6–20 s release) · PAD B air (high partials +
   filtered noise) · PAD C ghost (unstable, drifting, sometimes not there for minutes) · SUB drone (sine, holds, sometimes
   gone) · KEYS (a dark FM electric piano, one to four notes, remembered rather than performed) · PERC (rare: a soft
   kick, a brush, a machinery pulse for ENGINE ROOM) · TEXTURE (relay clicks, a signal tone, radio static, coolant, a
   distant impact) · the BED (ventilation hiss: HALCYON's rain). All through a dark synthesized reverb (5–12 s), a long
   filtered delay, and a restrained tape stage (wow, flutter, a little saturation, bandwidth, noise floor, rare dropouts).

   Band interface (same as the synthwave engine): DEEP.make(ctx, dest, {seed, tape, startAt, fadeIn}) →
   {tick(horizon), ahead, skip(off), setState(state, secs), hero(kind, opts), stop(fade)} */
(function(){
"use strict";
const PENT=[0,3,5,7,10];
const ROOTS={A:55,F:43.65,D:36.71,E:41.2,C:32.7,G:49,B:61.74};
/* the tapes: one atmospheric core, six temperaments */
const TAPES={
  'orbital-cruise': {name:'ORBITAL CRUISE', root:'A',bpm:80,cutoff:1250,pad:1,  sub:.85,air:.55,ghost:.3, motifGap:[24,70], motifP:.8, perc:'rare',   hold:[10,28],stay:.35,reverb:7, wow:1,  interf:.15,strange:0, quiet:0},
  'night-shift':    {name:'NIGHT SHIFT',    root:'F',bpm:76,cutoff:950, pad:.85,sub:.7, air:.6, ghost:.25,motifGap:[40,100],motifP:.75,perc:'none',   hold:[14,32],stay:.5, reverb:9, wow:.9, interf:.1, strange:0, quiet:.2},
  'deep-signal':    {name:'DEEP SIGNAL',    root:'D',bpm:78,cutoff:720, pad:.9, sub:.75,air:.4, ghost:.75,motifGap:[40,100],motifP:.45,perc:'none',   hold:[12,32],stay:.4, reverb:10,wow:1.3,interf:.6, strange:.55,quiet:.1},
  'empty-corridors':{name:'EMPTY CORRIDORS',root:'E',bpm:72,cutoff:880, pad:.6, sub:.45,air:.7, ghost:.35,motifGap:[60,150],motifP:.6, perc:'none',   hold:[16,32],stay:.55,reverb:12,wow:1,  interf:.15,strange:.1, quiet:.35},
  'outer-dark':     {name:'OUTER DARK',     root:'C',bpm:72,cutoff:620, pad:1.1,sub:1,  air:.45,ghost:.4, motifGap:[80,180],motifP:.2, perc:'none',   hold:[20,40],stay:.6, reverb:11,wow:.8, interf:.2, strange:.15,quiet:.15},
  'engine-room':    {name:'ENGINE ROOM',    root:'G',bpm:84,cutoff:1050,pad:.9, sub:.85,air:.35,ghost:.25,motifGap:[30,80], motifP:.65,perc:'machine',hold:[8,20], stay:.3, reverb:6, wow:1,  interf:.25,strange:0, quiet:0}};
function RNG(seed){let s=(seed>>>0)||1;return ()=>{s=(s+0x6D2B79F5)>>>0;let z=s;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296;};}
const hashStr=s=>String(s).split('').reduce((a,c)=>Math.imul(a^c.charCodeAt(0),16777619)>>>0,2166136261);
const lerp=(a,b,u)=>a+(b-a)*u,rr=(R,a,b)=>a+(b-a)*R(),pick=(R,L)=>L[Math.floor(R()*L.length)];
function nearest(x){/* the pentatonic pitch (semitones from the root) closest to x; ties go down */let best=null;for(let k=-2;k<6;k++)for(const p of PENT){const v=p+12*k,d=Math.abs(v-x);if(!best||d<best.d-1e-9)best={v,d};}return best.v;}
const hz=(root,semi)=>root*Math.pow(2,semi/12);
/* the comfort ceiling (Nov 2026): no voice above about C6. A note that would go higher drops by octaves, so the harmony stays and nothing whistles */
const cap=(f,mx)=>{while(f>mx)f/=2;return f;};

/* ---------------- the composer: a deterministic plan of events in music time (seconds) ---------------- */
function composer(seed,T){
  const R=RNG(seed^hashStr(T.name)),ev=[];let tau=0,phaseEnd=0,ph=null,deg=0,lastMotifAt=0,nextMotif=rr(R,12,30),nextTex=rr(R,20,60),motifs=[],beat=60/T.bpm,nextPerc=0;
  const MOVE={0:{3:.25,5:.3,7:.2,10:.25},3:{0:.35,5:.25,10:.4},5:{0:.4,3:.3,7:.3},7:{0:.35,5:.35,10:.3},10:{0:.3,3:.35,7:.35}};
  function newPhase(at){/* a layer state for 2–6 minutes: which layers are present, how dense, how bright */
    const quiet=at>0&&R()<.18+T.quiet;ph={at,end:at+rr(R,120,360)*(T.quiet>.25?1.3:1),pad:quiet?rr(R,.15,.35):rr(R,.55,1),sub:R()<T.sub&&!(quiet&&R()<.5),air:rr(R,.4,1)*T.air,ghost:R()<T.ghost,motif:quiet?rr(R,.2,.6):rr(R,.7,1.2),
      perc:T.perc==='machine'?R()<.75:T.perc==='rare'?R()<.45:false,bright:rr(R,.75,1.25),wet:rr(R,.75,1.1),wow:rr(R,.7,1.3),quiet};
    ev.push({type:'phase',at,ph});const drops=R()<.5?1:0;for(let i=0;i<drops;i++)ev.push({type:'dropout',at:at+rr(R,20,ph.end-at-20),dur:rr(R,.03,.07)});return ph;}
  function voicing(d){/* sub root · low fifth · mid third-or-suspension · upper seventh/ninth · a high colour tone, all pentatonic */
    const b=d>7?d-12:d;return {sub:b,low:nearest(b+19),mid:nearest(b+27),up:nearest(b+34),top:R()<.55?nearest(b+43+(R()<.5?0:5)):null};}
  function extend(until){
    while(tau<until){
      if(tau>=phaseEnd){ph=newPhase(tau);phaseEnd=ph.end;}
      const dur=rr(R,T.hold[0],T.hold[1])*(R()<.12?2:1); /* sometimes a full minute on one centre */
      if(tau>0){const st=R()<T.stay;if(!st){const W=MOVE[deg];let u=R(),acc=0;for(const [k,w] of Object.entries(W)){acc+=w;if(u<=acc){deg=+k;break;}}}}
      const v=voicing(deg);ev.push({type:'chord',at:tau,dur,deg,v,ph,att:rr(R,2,8),rel:rr(R,6,20),cut:T.cutoff*ph.bright*rr(R,.85,1.15)});
      if(ph.sub&&R()<.9)ev.push({type:'sub',at:tau+rr(R,0,3),dur:Math.max(6,dur-rr(R,0,4)),semi:v.sub,ph});
      if(ph.ghost&&R()<.55)ev.push({type:'ghost',at:tau+rr(R,2,dur*.5),dur:rr(R,10,26),semi:pick(R,[v.up,v.mid+12,v.top||v.up+12]),ph});
      if(R()<.7)ev.push({type:'air',at:tau+rr(R,0,4),dur:dur+rr(R,2,8),semi:(v.top!=null?v.top:v.up+12),ph});
      /* motifs: an opportunity every 20–90 s; a few notes, sometimes one remembered from earlier */
      while(nextMotif<tau+dur){if(nextMotif>=tau&&R()<T.motifP*ph.motif){let notes;
          if(motifs.length&&R()<.35)notes=pick(R,motifs).map(n=>Object.assign({},n));
          else{const pool=[v.mid,v.up,v.low+12,v.mid+12].map(nearest) /* keys sit around 260–520 Hz */,n=pick(R,[1,1,2,2,3,3,4]);let p=pick(R,pool),dt=0;notes=[];
            for(let i=0;i<n;i++){notes.push({dt,semi:p,vel:rr(R,.35,.7)});dt+=rr(R,.7,2.6);const step=pick(R,[-2,-1,-1,1,1,2]),idx=PENT.indexOf(((p%12)+12)%12),k=(idx+step+5)%5,oct=Math.floor((idx+step)/5);p=Math.floor(p/12)*12+12*oct+PENT[k];}
            if(motifs.length<3)motifs.push(notes);}
          ev.push({type:'motif',at:nextMotif,notes,ph});lastMotifAt=nextMotif;}
        nextMotif+=rr(R,T.motifGap[0],T.motifGap[1])/Math.max(.4,ph.motif);}
      /* texture: the ship, on a musically useful interval without being in time */
      while(nextTex<tau+dur){if(nextTex>=tau){const k=R()<T.interf?pick(R,['radio','signal','radio']):pick(R,['relay','coolant','impact','relay','signal']);ev.push({type:'tex',at:nextTex,kind:k,semi:nearest(v.up+24),beat});}nextTex+=rr(R,30,180);}
      /* percussion: rare, soft, felt more than heard */
      if(ph.perc){if(nextPerc<tau)nextPerc=tau;while(nextPerc<tau+dur){if(T.perc==='machine'){const bar=beat*4;ev.push({type:'thud',at:nextPerc});if(R()<.8)ev.push({type:'tick',at:nextPerc+beat*1.5});if(R()<.6)ev.push({type:'tick',at:nextPerc+beat*3});if(R()<.18)ev.push({type:'clank',at:nextPerc+beat*2.5});nextPerc+=bar*(R()<.15?2:1);}
          else{ev.push({type:'kick',at:nextPerc});if(R()<.5)ev.push({type:'brush',at:nextPerc+beat*2});nextPerc+=beat*8*pick(R,[1,1,2,3]);}}}
      tau+=dur;}
    ev.sort((a,b)=>a.at-b.at);}
  return {ev,extend,T};}

/* ---------------- the instrument ---------------- */
function make(ctx,dest,o){o=o||{};const SLEEP=!!o.sleep; /* the sleep profile: no impacts, no radio, no drums, no dropouts, half the piano */const T=TAPES[o.tape]||TAPES['orbital-cruise'],seed=(o.seed|0)||22910001,C=composer(seed,T),R=RNG(seed*7+3);
  const t0=o.startAt!=null?o.startAt:ctx.currentTime,live=[],G=(v)=>{const g=ctx.createGain();g.gain.value=v;return g;};let done=0,stopped=false,state='normal';
  const M={pad:1,ghost:1,motif:1,tex:1,strange:T.strange,perc:1};
  /* noise */
  const nb=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),nd=nb.getChannelData(0);{let b=0;for(let i=0;i<nd.length;i++){const w=R()*2-1;b=.97*b+.03*w;nd[i]=w*.6+b*2.2;}}
  const noise=(t,dur)=>{const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;s.start(t,R()*2.5);s.stop(t+dur+.05);live.push({s,end:t+dur+.1});return s;};
  /* the tape stage: wow + flutter (a modulated delay), soft saturation, bandwidth, a little stereo wander, the noise floor */
  const tapeIn=G(1),wow=ctx.createDelay(.05);wow.delayTime.value=.012;
  const lw=ctx.createOscillator(),lwg=G(.0011*T.wow),lf=ctx.createOscillator(),lfg=G(.00007*T.wow);lw.frequency.value=.31;lf.frequency.value=5.7;lw.connect(lwg);lwg.connect(wow.delayTime);lf.connect(lfg);lfg.connect(wow.delayTime);lw.start();lf.start();
  const sat=ctx.createWaveShaper();{const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.tanh(x*1.35)/Math.tanh(1.35);}sat.curve=c;}
  const bw=ctx.createBiquadFilter();bw.type='lowpass';bw.frequency.value=7000;bw.Q.value=.4;const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=24;
  const pan=ctx.createStereoPanner?ctx.createStereoPanner():null,pl=ctx.createOscillator(),plg=G(.035);pl.frequency.value=.023;
  const out=G(0),comp=ctx.createDynamicsCompressor();comp.threshold.value=-8;comp.ratio.value=2.5;comp.attack.value=.05;comp.release.value=.6;comp.knee.value=12; /* a safety, not a limiter */
  tapeIn.connect(wow);wow.connect(sat);sat.connect(bw);bw.connect(hp);if(pan){hp.connect(pan);pl.connect(plg);plg.connect(pan.pan);pl.start();pan.connect(out);}else hp.connect(out);out.connect(comp);comp.connect(dest);
  {const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=2500;const g=G(.0022);s.connect(f);f.connect(g);g.connect(out);s.start();live.push({s,end:1e12});} /* noise floor */
  /* the room: a synthesized dark space, 5–12 s, pre-delay, strong damping */
  const rv=ctx.createConvolver();{const len=Math.floor(ctx.sampleRate*T.reverb),ir=ctx.createBuffer(2,len,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);let y=0;for(let i=0;i<len;i++){const u=i/len,k=lerp(.42,.035,Math.pow(u,.6));y+=k*((R()*2-1)-y);d[i]=y*Math.exp(-6.9*u)*(u<.002?u/.002:1);}}rv.buffer=ir;rv.normalize=true;}
  const pre=ctx.createDelay(.2);pre.delayTime.value=.02+R()*.06;const rvIn=G(1),rvOut=G(.9);rvIn.connect(pre);pre.connect(rv);rv.connect(rvOut);rvOut.connect(tapeIn);
  /* the distance: a long stereo delay, low feedback, repeats filtered hard */
  const dIn=G(1),dl=ctx.createDelay(5),dr=ctx.createDelay(5);dl.delayTime.value=60/T.bpm*3;dr.delayTime.value=60/T.bpm*4.5;const fb=G(.24),dlp=ctx.createBiquadFilter();dlp.type='lowpass';dlp.frequency.value=1600;const dhp=ctx.createBiquadFilter();dhp.type='highpass';dhp.frequency.value=320;
  const mg=ctx.createChannelMerger(2),dOut=G(.5);dIn.connect(dl);dIn.connect(dr);dl.connect(dlp);dlp.connect(dhp);dhp.connect(fb);fb.connect(dl);fb.connect(dr);dl.connect(mg,0,0);dr.connect(mg,0,1);mg.connect(dOut);dOut.connect(rvIn);dOut.connect(tapeIn);
  /* buses: each with a dry level and its sends */
  const bus=(dry,rev,dly)=>{const b=G(1),d=G(dry),r=G(rev),e=G(dly);b.connect(d);d.connect(tapeIn);b.connect(r);r.connect(rvIn);b.connect(e);e.connect(dIn);return {b,d,r,e};};
  const B={pad:bus(.55,.55,.04),air:bus(.25,.9,.1),ghost:bus(.2,1,.25),sub:bus(.8,.08,0),keys:bus(.35,.75,.32),perc:bus(.5,.35,.05),tex:bus(.45,.7,.2),bed:bus(.6,.25,0)};
  /* the bed: ventilation hiss, HALCYON's rain, always there, breathing very slowly */
  {const s=noise(ctx.currentTime,1e6),f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1300;f.Q.value=.45;const l=ctx.createBiquadFilter();l.type='lowpass';l.frequency.value=3200;const g=G(.05),m=ctx.createOscillator(),mg_=G(.016);m.frequency.value=.041;m.connect(mg_);mg_.connect(g.gain);m.start();live.push({s:m,end:1e12}); /* stopped with the band, or it kept the whole graph (and the reverb IR) alive after every pause and tape change */s.connect(f);f.connect(l);l.connect(g);g.connect(B.bed.b);}
  const root=ROOTS[T.root]||55;
  function env(g,t,att,hold,rel,lvl){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(lvl,t+att);g.gain.setValueAtTime(lvl,t+att+Math.max(0,hold));g.gain.setTargetAtTime(0,t+att+Math.max(0,hold),rel/4);}
  function osc(type,f,t,end,det){const s=ctx.createOscillator();s.type=type;s.frequency.value=f;if(det)s.detune.value=det;s.start(t);s.stop(end);live.push({s,end});return s;}
  /* PAD A: the body */
  function pad(f,t,dur,att,rel,lvl,cut,p){f=cap(f,1050);const end=t+dur+rel*1.2,a=osc('sawtooth',f,t,end,-5),b=osc('triangle',f,t,end,6),bl=G(.55),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.Q.value=.6;
    lp.frequency.setValueAtTime(cut*.7,t);lp.frequency.linearRampToValueAtTime(cut,t+dur*.5);lp.frequency.linearRampToValueAtTime(cut*.8,t+dur+rel);
    const g=G(0),pn=ctx.createStereoPanner?ctx.createStereoPanner():null;a.connect(lp);b.connect(bl);bl.connect(lp);lp.connect(g);env(g,t,att,dur-att,rel,lvl);if(pn){pn.pan.value=p;g.connect(pn);pn.connect(B.pad.b);}else g.connect(B.pad.b);}
  /* PAD B: air */
  function air(f,t,dur,lvl){f=cap(f,700);const end=t+dur+8,a=osc('sine',f,t,end,0),b=osc('sine',f*1.0005,t,end,9),c=osc('triangle',f*2,t,end,-7),cg=G(.15),g=G(0);a.connect(g);b.connect(g);c.connect(cg);cg.connect(g);env(g,t,4,dur-4,6,lvl*.03);g.connect(B.air.b);
    const s=noise(t,dur+8),bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1800+R()*700;bp.Q.value=.8;const ng=G(0);s.connect(bp);bp.connect(ng);env(ng,t,5,dur-5,6,lvl*.012);ng.connect(B.air.b);}
  /* PAD C: the ghost, unstable, half music and half ship */
  function ghost(f,t,dur,lvl){f=cap(f,660);const end=t+dur+10,o_=osc('triangle',f,t,end,0),g=G(0),n=Math.max(4,Math.floor(dur/2)),cv=new Float32Array(n);let d=0;const span=12+40*M.strange;for(let i=0;i<n;i++){d=Math.max(-span,Math.min(span,d+(R()-.5)*span*.6));cv[i]=d+(M.strange>.3&&i%3===0?28:0);}
    try{o_.detune.setValueCurveAtTime(cv,t,dur+9);}catch(e){}const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;o_.connect(lp);lp.connect(g);
    if(M.strange>.3){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(lvl*.05,t+dur*.85);g.gain.linearRampToValueAtTime(0,t+dur*.85+.25);} /* reversed-feeling: swells in, cuts off */
    else env(g,t,rr(R,6,12),dur-8,10,lvl*.04);g.connect(B.ghost.b);}
  /* SUB: the drone */
  function sub(f,t,dur,lvl){const end=t+dur+8,a=osc('sine',f,t,end,0),b=osc('triangle',f,t,end,3),bg=G(.12),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=170;const g=G(0);a.connect(g);b.connect(bg);bg.connect(lp);lp.connect(g);env(g,t,3,dur-3,6,lvl*.045);g.connect(B.sub.b);}
  /* KEYS: a dark electric piano, FM, low velocity, rolled-off, a little unsteady */
  function key(f,t,vel){f=cap(f,1050);const det=(R()-.5)*9,end=t+6,c=osc('sine',f,t,end,det),m=osc('sine',f,t,end,det),mg2=G(0);mg2.gain.setValueAtTime(f*2.2*vel,t);mg2.gain.setTargetAtTime(f*.25*vel,t,.25);m.connect(mg2);mg2.connect(c.frequency);
    const t2=osc('sine',f*2,t,end,det+3),tg=G(.12*vel);tg.gain.setTargetAtTime(0,t,.4);t2.connect(tg);const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2100;lp.Q.value=.3;const g=G(0);
    c.connect(lp);tg.connect(lp);lp.connect(g);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.16*vel,t+.018);g.gain.setTargetAtTime(0,t+.02,rr(R,.9,1.4));g.connect(B.keys.b);}
  /* PERC: soft and rare */
  function kick(t,l){const o_=osc('sine',70,t,t+.6,0);o_.frequency.setValueAtTime(70,t);o_.frequency.exponentialRampToValueAtTime(40,t+.18);const g=G(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09*l,t+.008);g.gain.setTargetAtTime(0,t+.01,.1);const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=260;o_.connect(lp);lp.connect(g);g.connect(B.perc.b);}
  function hiss(t,f,q,dur,l,type){const s=noise(t,dur+.1),bp=ctx.createBiquadFilter();bp.type=type||'bandpass';bp.frequency.value=f;bp.Q.value=q;const g=G(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(l,t+.006);g.gain.setTargetAtTime(0,t+.008,dur/3);s.connect(bp);bp.connect(g);return g;}
  function thud(t){const o_=osc('sine',55,t,t+.9,0);o_.frequency.exponentialRampToValueAtTime(34,t+.4);const g=G(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.14,t+.02);g.gain.setTargetAtTime(0,t+.03,.18);o_.connect(g);g.connect(B.perc.b);hiss(t,180,.7,.4,.05,'lowpass').connect(B.perc.b);}
  /* TEXTURE: the ship */
  function tex(e,t){const k=e.kind;
    if(k==='relay'){const n=2+Math.floor(R()*2);for(let i=0;i<n;i++){const tt=t+i*e.beat*(R()<.7?1:1.5)+(R()-.5)*.04;hiss(tt,1700,3,.025,.025).connect(B.tex.b);const o_=osc('triangle',1000,tt,tt+.03,0),g=G(0);g.gain.setValueAtTime(.003,tt);g.gain.setTargetAtTime(0,tt+.003,.004);o_.connect(g);g.connect(B.tex.b);}}
    else if(k==='signal'){const f=cap(hz(root,e.semi),600);for(let i=0;i<2;i++){const tt=t+i*.7,o_=osc('sine',i?f*1.5:f,tt,tt+2,0),g=G(0);g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(.005,tt+.09);g.gain.setTargetAtTime(0,tt+.12,.35); /* a soft sonar call, two notes a fifth apart, never a beep-beep-beep */o_.connect(g);g.connect(B.tex.b);}}
    else if(k==='radio'){const s=noise(t,7),bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=4;bp.frequency.setValueAtTime(500,t);bp.frequency.exponentialRampToValueAtTime(1400,t+5);const g=G(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.04*M.tex,t+1.5);g.gain.linearRampToValueAtTime(0,t+6.5);s.connect(bp);bp.connect(g);g.connect(B.tex.b);}
    else if(k==='coolant'){const s=noise(t,10),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=480;const g=G(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+3);g.gain.linearRampToValueAtTime(0,t+9.5);s.connect(lp);lp.connect(g);g.connect(B.tex.b);}
    else if(k==='impact'){const g=hiss(t,120,.6,1.4,.12,'lowpass');g.connect(B.tex.b);const o_=osc('sine',41,t,t+2,0),og=G(0);og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.08,t+.03);og.gain.setTargetAtTime(0,t+.05,.5);o_.connect(og);og.connect(B.tex.b);}}
  /* scheduling: the plan in music time, rendered a little ahead of the clock; anything already under way starts where it is */
  let i=0,phase=null;C.extend(60);
  function play(e,t,late){const ph=e.ph||phase||{pad:1,air:.5,wet:1};
    if(e.type==='phase'){phase=e.ph;for(const k of ['pad','air','ghost','keys','tex']){B[k].r.gain.setTargetAtTime((k==='pad'?.55:k==='air'?.9:k==='keys'?.75:.8)*e.ph.wet,Math.max(t,ctx.currentTime),8);}lwg.gain.setTargetAtTime(.0011*T.wow*e.ph.wow,Math.max(t,ctx.currentTime),20);return;}
    if(SLEEP&&(e.type==='dropout'||(e.type==='tex'&&(e.kind==='impact'||e.kind==='radio'))||(e.type==='motif'&&R()<.5)||/^(kick|brush|thud|tick|clank)$/.test(e.type)))return;
    if(e.type==='dropout'){out.gain.setTargetAtTime(.55,t,.01);out.gain.setTargetAtTime(1,t+e.dur,.02);return;}
    if(e.type==='chord'){const v=e.v,lv=T.pad*ph.pad*M.pad,att=late?Math.min(1.5,e.att):e.att,dur=Math.max(2,e.dur-late); /* a chord rescued late still has a positive length */
      [[v.low,.30,-.35],[v.mid,.24,.25],[v.up,.17,-.1]].forEach(([s,l,p])=>pad(hz(root,s),t,dur,att,e.rel,l*lv*.30,e.cut,p+(R()-.5)*.2)); /* low fifth ~E3, mid ~C4, upper ~G4 for A */
      if(v.top!=null&&R()<.6)pad(hz(root,v.top),t+rr(R,1,4),Math.max(2,dur-4),att+2,e.rel,.08*lv*.30,e.cut*1.4,(R()-.5)*.8);return;}
    if(e.type==='sub'){sub(hz(root,e.semi),t,e.dur-late,ph.quiet?.6:1);return;}
    if(e.type==='air'){air(hz(root,e.semi+12),t,e.dur-late,ph.air);return;}
    if(e.type==='ghost'){ghost(hz(root,e.semi+12),t,e.dur-late,M.ghost);return;}
    if(late)return; /* the short things are not rescued */
    if(e.type==='motif'){if(R()>M.motif)return;for(const n of e.notes)key(hz(root,n.semi),t+n.dt,n.vel);return;}
    if(e.type==='tex'){tex(e,t);return;}
    if(M.perc<.5)return;if(e.type==='kick')kick(t,1);else if(e.type==='brush')hiss(t,3200,.7,.22,.018).connect(B.perc.b);else if(e.type==='thud')thud(t);else if(e.type==='tick')hiss(t,4200,2,.05,.02,'highpass').connect(B.perc.b);else if(e.type==='clank'){hiss(t,900,9,.5,.03).connect(B.perc.b);}}
  const SPAN={chord:1,sub:1,air:1,ghost:1};
  function tick(h){if(stopped)return;const now=ctx.currentTime;C.extend(h-t0+120);
    while(i<C.ev.length&&t0+C.ev[i].at<=h){const e=C.ev[i++],t=t0+e.at;
      if(t<now-.05){const end=t+(e.dur||0)+(e.rel||0);if(e.type==='phase'){play(e,now,0);continue;}if(SPAN[e.type]&&end>now+2){play(e,now,now-t);}continue;}
      play(e,t,0);}
    if(++done%40===0){for(let k=live.length-1;k>=0;k--)if(live[k].end<now-1)live.splice(k,1);}}
  /* states: how the ship feels right now (the game: chapter roles, memories, Night Watch activity) */
  function setState(s,secs){state=s;const q=s==='quiet'||s==='abandoned',st=s==='strange'||s==='failing'||s==='alert'||s==='stress',busy=s==='busy';
    M.pad=busy?1.2:q?.8:1;M.motif=q?.55:busy?1.25:1;M.ghost=busy||st?1.4:1;M.tex=st?2:1;M.perc=q?0:1;M.strange=st?Math.max(.6,T.strange):T.strange;
    const tt=ctx.currentTime;B.pad.d.gain.setTargetAtTime(.55*M.pad,tt,(secs||6)/3);B.ghost.d.gain.setTargetAtTime(.2*M.ghost,tt,(secs||6)/3);B.tex.d.gain.setTargetAtTime(.45*M.tex,tt,(secs||6)/3);if(pan)plg.gain.setTargetAtTime(st?.14:.035,tt,4);}
  function hero(kind){if(stopped||SLEEP&&(kind==='discharge'||kind==='comms'||kind==='stress'))return;const t=ctx.currentTime+.05;tex({kind:kind==='comms'?'radio':kind==='scanner'?'signal':kind==='discharge'?'impact':kind==='stress'?'radio':'relay',semi:nearest(36),beat:60/T.bpm},t);}
  function stop(f){if(stopped)return;stopped=true;const t=ctx.currentTime;out.gain.cancelScheduledValues(t);out.gain.setTargetAtTime(0,t,Math.max(.05,(f||.5)/3));setTimeout(()=>{for(const l of live){try{l.s.stop();}catch(e){}}try{lw.stop();lf.stop();pl.stop();}catch(e){}try{comp.disconnect();}catch(e){}},((f||.5)+.6)*1000);}
  out.gain.setValueAtTime(0,ctx.currentTime);out.gain.linearRampToValueAtTime(1,ctx.currentTime+Math.max(.3,Math.min(o.fadeIn||1.5,6)));
  return {tick,ahead:2,skip(){},setState,hero,stop,get state(){return state;},tape:T.name,plan:C};}
/* each tape's integrated loudness as mixed (BS.1770, 8 minutes from the start, seed 22910001; loud.js measured them offline).
   The Director lifts a broadcast toward its target from these; the game plays them as they are. */
const LUFS={'orbital-cruise':-19.4,'orbital-cruise:sleep':-19.5,'night-shift':-20.1,'night-shift:sleep':-20.1,'deep-signal':-20,'deep-signal:sleep':-19.9,
  'empty-corridors':-21.6,'empty-corridors:sleep':-21.6,'outer-dark':-19.8,'outer-dark:sleep':-19.9,'engine-room':-19.4,'engine-room:sleep':-19.6};
window.DEEP={make,TAPES,PENT,composer,nearest,LUFS};
})();
