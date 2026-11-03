/* Driftnaut · SPACE: the scene engine. Synthesizes a place out of the LiminalMix toolkit (mix.js).
   Original sounds in the general vocabulary of retro-futurist science fiction: no samples, no recordings, nothing copied
   from any film or series. An ERA and a LANGUAGE of sound design, never somebody's specific sound.

   Four layers, as in the brief:
     BED     continuous foundation: ship engine, reactor, ventilation, electrical, structural resonance, room
     MOTION  what keeps it alive: slow drift, cycling, power fluctuation, beating, stereo movement
     EVENTS  probabilistic: computer chirps, relays, servos, doors in the distance, comms tones, metal stress
     HERO    triggered by hand (or by a scene state): teleport, doors, lift, comms, scanner, power, alerts, failure

   A scene is described by its Sound DNA (plain JSON): scene, seed, room, era, state, macros, layer and event overrides, tape.
   LMXS.compile(dna) turns DNA into an environment that LMX.make runs; LMXS.opts(dna) gives the matching make() options.
   The same DNA always makes the same place. */
(function(){
"use strict";
const X=LMX._,{RNG,bq,perc,nsrc,wander,place,predictPower,PRIM,EV,EVDEF,db,clamp,HVAC,AIR,ROOM,HUM,FLUOR}=X;
const A=s=>s.args||{};
const lerp=(a,b,k)=>a+(b-a)*k;

/* ======================================================================================================
   WAVEFORMS: the Web Audio four, plus pulse waves with a chosen width (built once per context)
   ====================================================================================================== */
const PW=new WeakMap();
function pulseWave(c,duty){let m=PW.get(c);if(!m){m={};PW.set(c,m);}const k=Math.round(duty*100);if(m[k])return m[k];
  const n=48,re=new Float32Array(n),im=new Float32Array(n);for(let i=1;i<n;i++){re[i]=2*Math.sin(Math.PI*i*duty)/(Math.PI*i)*Math.cos(Math.PI*i*duty);im[i]=2*Math.sin(Math.PI*i*duty)/(Math.PI*i)*Math.sin(Math.PI*i*duty);}
  return (m[k]=c.createPeriodicWave(re,im));}
function setWave(c,o,w){if(w==='pulse25')o.setPeriodicWave(pulseWave(c,.25));else if(w==='pulse12')o.setPeriodicWave(pulseWave(c,.125));else if(w==='pulse40')o.setPeriodicWave(pulseWave(c,.4));else o.type=w||'sine';}

/* ======================================================================================================
   ERAS: the same machine, imagined in a different decade
   ====================================================================================================== */
const ERAS={
  '60s':{name:'1960s RETRO',wave:'sine',alt:'triangle',lo:500,hi:1900,glide:[.92,1.35],dur:[.07,.17],gap:[.03,.09],att:.006,filt:null,vib:6.5,send:1.25},
  analog:{name:'ANALOG FUTURE',wave:'pulse25',alt:'square',lo:380,hi:2400,glide:[.97,1.08],dur:[.05,.12],gap:[.02,.06],att:.003,filt:['lowpass',2900,1.6],vib:0,send:1},
  digital:{name:'80s DIGITAL',wave:'square',alt:'pulse12',lo:600,hi:3200,steps:[880,988,1175,1319,1568,1760,2093,2349,2637],glide:[1,1],dur:[.035,.08],gap:[.008,.03],att:.001,filt:['lowpass',6500,.7],vib:0,send:.8},
  modern:{name:'MODERN',wave:'sine',alt:'triangle',lo:700,hi:2600,glide:[.985,1.02],dur:[.04,.1],gap:[.03,.08],att:.004,filt:['lowpass',8000,.7],vib:0,send:1.1},
  alien:{name:'ALIEN',wave:'sine',alt:'triangle',lo:300,hi:2200,glide:[.7,1.6],dur:[.08,.28],gap:[.05,.18],att:.012,filt:null,fm:[1.414,1.3],vib:3,send:1.4},
  industrial:{name:'INDUSTRIAL',wave:'sawtooth',alt:'square',lo:300,hi:1600,glide:[.95,1.05],dur:[.06,.14],gap:[.04,.1],att:.002,filt:['bandpass',1500,2.2],vib:0,send:.9}};
const ERA_IDS=Object.keys(ERAS);
const eraOf=E=>ERAS[E.era]||ERAS.analog;

/* ======================================================================================================
   THE RETRO ELECTRONICS GENERATOR: a short sequence of tones, shaped by era, never quite the same twice
   P: {seq (Hz), wave, dur, gap, att, glide, filt, fm, vib, gain (dB), rand}
   ====================================================================================================== */
function tones(E,b,t,P,r){const c=E.ctx,R=eraOf(E);let tt=t;const seq=P.seq||[1000];
  for(let i=0;i<seq.length;i++){const f=seq[i]*(1+r.pm(P.rand!=null?P.rand:.02)),du=r.v(P.dur||R.dur),att=P.att!=null?P.att:R.att,end=tt+du;
    const o=b.osc('sine',f,tt,end+.06);setWave(c,o,P.wave||R.wave);
    const gl=P.glide!=null?r.v(P.glide):r.v(R.glide);if(gl!==1)o.frequency.exponentialRampToValueAtTime(Math.max(30,f*gl),end);
    const fm=P.fm||R.fm;if(fm){const m=b.osc('sine',f*fm[0],tt,end+.06),mg=b.gain(f*fm[1]);m.connect(mg).connect(o.frequency);}
    const vib=P.vib!=null?P.vib:R.vib;if(vib){const v=b.osc('sine',vib,tt,end+.06),vg=b.gain(f*.012);v.connect(vg).connect(o.frequency);}
    const g=b.gain(0),a=db(P.gain!=null?P.gain:-14)*(1+r.pm(.15));g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(a,tt+att);g.gain.setValueAtTime(a,Math.max(tt+att,end-.012));g.gain.linearRampToValueAtTime(0,end);
    let x=o;const F=P.filt!==undefined?P.filt:R.filt;if(F){const f2=b.filt(F[0],F[1],F[2]);x.connect(f2);x=f2;}x.connect(g).connect(b.in);
    tt=end+r.v(P.gap||R.gap);}
  return tt-t;}
function pool(E,r,n){const R=eraOf(E);return [...Array(n)].map(()=>R.steps?r.pick(R.steps)*(r()<.2?.5:1):Math.round(r.range(R.lo,R.hi)/25)*25);}
const UI_KINDS=['bleep','bloop','chirp','double','triple','ack','error','scan','commsOpen','commsClose','warning','activity','failing'];
EV.ui=function(E,t,s,r){const P=A(s),R=eraOf(E),kind=P.kind==='any'||!P.kind?r.pick(['bleep','chirp','double','activity','ack','bloop','chirp','activity']):P.kind;
  const b=place(E,t,{d:P.d||[.2,.55],send:R.send,grp:'people',panR:.6},r),f=pool(E,r,1)[0];let seq,o={};
  switch(kind){
    case 'bleep':seq=[f];o={dur:[.05,.09]};break;
    case 'bloop':seq=[f*.55];o={glide:[.6,.75],dur:[.09,.16]};break;
    case 'chirp':seq=[f];o={glide:[1.25,1.6],dur:[.04,.08]};break;
    case 'double':seq=[f,f*r.pick([1.25,1.5,1.33])];o={glide:[1.1,1.3]};break;
    case 'triple':seq=[f,f*1.26,f*1.5];o={glide:[1.05,1.2],dur:[.04,.07]};break;
    case 'ack':seq=[f,f*1.5];o={dur:[.07,.11],gap:[.02,.04]};break;
    case 'error':seq=[f*.8,f*.6];o={wave:R.alt==='triangle'?'square':R.alt,dur:[.14,.22],gap:[.04,.06],glide:[1,1]};break;
    case 'scan':seq=[...Array(r.int(8,14))].map((_,i)=>f*(i%2?1.5:1));o={dur:[.03,.05],gap:[.01,.02],glide:[1,1]};break;
    case 'commsOpen':seq=[f*.75,f,f*1.33];o={dur:[.05,.08]};break;
    case 'commsClose':seq=[f*1.33,f,f*.75];o={dur:[.05,.08]};break;
    case 'warning':seq=[f,f*.84,f,f*.84];o={dur:[.16,.22],gap:[.05,.08],glide:[1,1],wave:R.alt};break;
    case 'failing':{seq=pool(E,r,r.int(4,10));o={glide:[.7,1.1],dur:[.03,.12],gap:[.02,.25],rand:.08};const len=tones(E,b,t,Object.assign({seq,gain:-16},o),r);
      if(r()<.6){const z=b.noise('white',t,t+len),zf=b.filt('bandpass',r.range(1500,3500),1),zg=b.gain(0);for(let tt=t;tt<t+len;tt+=r.range(.02,.06))zg.gain.setValueAtTime(r()<.5?db(-30)*r():0,tt);z.connect(zf).connect(zg).connect(b.in);}
      b.done();return len;}
    default:seq=pool(E,r,r.int(6,16));o={dur:[R.dur[0]*.6,R.dur[1]*.7],gap:[R.gap[0]*.5,R.gap[1]*.6],gain:-17};}
  tones(E,b,t,Object.assign({seq},o),r);return b.done();};

/* ======================================================================================================
   CONTINUOUS GENERATORS (the BED and its MOTION)
   ====================================================================================================== */
/* the ship's engine: sub, body, mechanical, air, high electrical. Never one oscillator: a machine behind walls */
function pEngine(E,L,r){const c=E.ctx,out=c.createGain(),pw=clamp(L.power!=null?L.power:.6,0,1.2),mass=clamp(L.mass!=null?L.mass:.6,0,1),smooth=clamp(L.smooth!=null?L.smooth:.7,0,1),
    ins=clamp(L.instab||0,0,1),el=clamp(L.elec!=null?L.elec:.3,0,1),dist=clamp(L.dist!=null?L.dist:.5,0,1),rpm=L.rpm!=null?L.rpm:1.4,f0=lerp(62,31,mass)*(1+r.pm(.04));
  const body=c.createGain(),tone=bq(c,'lowpass',lerp(9000,850,dist),.5),res=bq(c,'peaking',r.range(55,140),3,(L.res||.4)*8);body.connect(res).connect(tone).connect(out);
  /* sub: sine and the lowest noise */
  const sub=c.createOscillator();sub.frequency.value=f0*.5;const sg=c.createGain();sg.gain.value=2*db(-27)*pw;sub.connect(sg).connect(body);sub.start(E.t0);E.srcs.push(sub);
  const sn=nsrc(E,'brown',r),snl=bq(c,'lowpass',85,.7),snh=bq(c,'highpass',20,.7),sng=c.createGain();sng.gain.value=db(-30)*pw/Math.sqrt(predictPower(c,'brown',[snl,snh])*.5+1e-9)*.05;sn.connect(snh).connect(snl).connect(sng).connect(body);
  /* body: three detuned saws through a low filter (smoothness opens or closes it) */
  const bl=bq(c,'lowpass',lerp(380,160,smooth),.8),bg=c.createGain();bg.gain.value=2*db(-33)*pw;bl.connect(bg).connect(body);const oscs=[sub];
  [[1,0],[2.003,-4],[3.01,-9]].forEach(([m,d])=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f0*m;const g=c.createGain();g.gain.value=db(d);o.connect(g).connect(bl);o.start(E.t0);E.srcs.push(o);oscs.push(o);});
  /* mechanical: band noise with the engine's own rhythm in it */
  const mn=nsrc(E,'pink',r),mf=bq(c,'bandpass',r.range(260,700),1.1),mg=c.createGain(),am=c.createGain();mg.gain.value=db(-28)*pw/Math.sqrt(predictPower(c,'pink',[mf])*.5+1e-9)*.04;
  mn.connect(mf).connect(mg).connect(am).connect(body);am.gain.value=1-(1-smooth)*.5;const lfo=c.createOscillator();lfo.type=smooth>.6?'sine':'triangle';lfo.frequency.value=rpm*(1+r.pm(.03));const lg=c.createGain();lg.gain.value=(1-smooth)*.5+.12;lfo.connect(lg).connect(am.gain);lfo.start(E.t0);E.srcs.push(lfo);
  wander(E,lfo.frequency,rpm*.04*(1+ins*3),r.range(.01,.04),r);
  /* air around it */
  const an=nsrc(E,'pink',r),af=bq(c,'lowpass',lerp(900,400,dist),.7),ah=bq(c,'highpass',120,.7),ag=c.createGain();ag.gain.value=db(-38)*pw/Math.sqrt(predictPower(c,'pink',[af,ah])*.5+1e-9)*.06;an.connect(ah).connect(af).connect(ag).connect(body);
  /* high electrical: barely there */
  if(el>0){const h=c.createOscillator();h.frequency.value=r.range(1800,4200);const hg=c.createGain();hg.gain.value=2*db(-56)*el;h.connect(hg).connect(out);h.start(E.t0);E.srcs.push(h);wander(E,hg.gain,hg.gain.value*.5,.05,r);
    const hn=nsrc(E,'white',r),hh=bq(c,'highpass',5500,.7),hng=c.createGain();hng.gain.value=db(-62)*el*4;hn.connect(hh).connect(hng).connect(out);}
  /* motion: the engine breathes over minutes; instability makes the pitch and the power wander */
  wander(E,out.gain,.12+ins*.25,r.range(.003,.012),r);
  const pd=wander(E,oscs[0].detune,6+ins*60,r.range(.02,.08)*(1+ins*4),r);for(const o of oscs.slice(1))pd.connect(o.detune);
  if(ins>.3){const dip=c.createGain();out.connect(dip);wander(E,dip.gain,-ins*.7,r.range(.15,.5),r,'ctrls');const o2=c.createGain();dip.connect(o2);return {out:o2};} /* power dips */
  return {out};}
/* a reactor: a slow throb under everything */
function pReactor(E,L,r){const c=E.ctx,out=c.createGain(),f=r.range(38,52),pw=L.power!=null?L.power:.6;
  const o=c.createOscillator();o.frequency.value=f;const o2=c.createOscillator();o2.type='triangle';o2.frequency.value=f*2.01;const g=c.createGain();g.gain.value=2*db(-30)*pw;const g2=c.createGain();g2.gain.value=2*db(-40)*pw;
  o.connect(g).connect(out);o2.connect(g2).connect(out);o.start(E.t0);o2.start(E.t0);E.srcs.push(o,o2);
  const n=nsrc(E,'brown',r),nf=bq(c,'bandpass',r.range(90,150),2),ng=c.createGain();ng.gain.value=db(-40)*pw/Math.sqrt(predictPower(c,'brown',[nf])*.5+1e-9)*.06;n.connect(nf).connect(ng).connect(out);
  const th=c.createGain();out.connect(th);const l=c.createOscillator();l.frequency.value=L.pulse||r.range(.35,.9);const lg=c.createGain();lg.gain.value=.35;th.gain.value=.75;l.connect(lg).connect(th.gain);l.start(E.t0);E.srcs.push(l);
  wander(E,l.frequency,l.frequency.value*.06,.02,r);const o3=c.createGain();th.connect(o3);return {out:o3};}
/* computers thinking: a faint bed of stepping tones, gated */
function pCompute(E,L,r){const c=E.ctx,out=c.createGain(),R=eraOf(E);out.gain.value=0;
  for(let i=0;i<2;i++){const o=c.createOscillator();setWave(c,o,R.wave==='sine'?'triangle':R.wave);o.frequency.value=r.range(R.lo,R.hi);wander(E,o.frequency,o.frequency.value*.35,r.range(4,9),r,'ctrl');
    const g=c.createGain();g.gain.value=0;wander(E,g.gain,2*db(L.db||-50),r.range(1.2,3.5),r,'ctrls');const f=bq(c,'lowpass',3500,.7);o.connect(f).connect(g).connect(out);o.start(E.t0);E.srcs.push(o);}
  out.gain.value=1;return {out};}
/* force field / containment: a hum with a shimmer riding on it */
function pField(E,L,r){const c=E.ctx,out=c.createGain(),f=r.range(110,170);
  const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;const lp=bq(c,'lowpass',900,1),g=c.createGain();g.gain.value=2*db(L.db||-42);o.connect(lp).connect(g).connect(out);o.start(E.t0);E.srcs.push(o);
  const am=c.createOscillator();am.frequency.value=r.range(4,7);const ag=c.createGain();ag.gain.value=g.gain.value*.4;am.connect(ag).connect(g.gain);am.start(E.t0);E.srcs.push(am);
  for(let i=0;i<3;i++){const s=c.createOscillator();s.frequency.value=r.range(2200,4800);const sg=c.createGain();sg.gain.value=0;wander(E,sg.gain,2*db((L.db||-42)-16),r.range(.3,1.2),r,'ctrlp');s.connect(sg).connect(out);s.start(E.t0);E.srcs.push(s);}
  return {out};}
/* UNEASE: very slow beating between two low partials, and movement below hearing */
function pBeat(E,L,r){const c=E.ctx,out=c.createGain(),f=r.range(48,82),bt=r.range(.15,.9),u=clamp(L.u||0,0,1);
  for(const ff of [f,f+bt,f*1.414]){const o=c.createOscillator();o.frequency.value=ff;const g=c.createGain();g.gain.value=2*db(ff===f*1.414?-50:-40)*u;o.connect(g).connect(out);o.start(E.t0);E.srcs.push(o);}
  const s=c.createOscillator();s.frequency.value=r.range(16,21);const sg=c.createGain();sg.gain.value=2*db(-30)*u;wander(E,sg.gain,sg.gain.value*.9,.05,r);s.connect(sg).connect(out);s.start(E.t0);E.srcs.push(s);
  return {out};}
/* MUSIC, sparse: long soft notes from one mode, a few at a time, with long rests. The place stays the subject. */
function pAtmos(E,L,r){const c=E.ctx,out=c.createGain(),amt=clamp(L.amt!=null?L.amt:.4,0,1);
  const root=r.pick([41.2,43.65,46.25,49,51.91,55]),mode=r.pick([[0,3,7,10,14],[0,2,7,10,15],[0,5,7,12,15],[0,3,7,12,19],[0,7,10,14,17]]);
  let next=r.range(10,40);
  function note(t){const iv=r.pick(mode)+12*r.int(1,3),f=root*Math.pow(2,iv/12),att=r.range(6,15),sus=r.range(6,24),rel=r.range(12,24),T=E.t0+t,end=T+att+sus+rel;
    const g=c.createGain();g.gain.value=0;const lp=bq(c,'lowpass',r.range(500,1500),.5);
    let last=null;for(const [type,det,lv] of [['sine',0,1],['triangle',r.range(-7,7),.45]]){const o=c.createOscillator();o.type=type;o.frequency.value=f;o.detune.value=det;const og=c.createGain();og.gain.value=lv;o.connect(og).connect(lp);o.start(T);o.stop(end+.2);last=o;}
    lp.connect(g).connect(out);const pk=db(L.db||-34)*r.range(.55,1);g.gain.setValueAtTime(0,T);g.gain.linearRampToValueAtTime(pk,T+att);g.gain.setValueAtTime(pk,T+att+sus);g.gain.linearRampToValueAtTime(0,end);
    last.onended=()=>{try{lp.disconnect();g.disconnect();}catch(e){}};}
  return {out,tick(up){if(next<up-20)next=up+r.range(3,15);let guard=0;while(next<up+5&&guard++<50){note(next);if(r()<.3+.3*amt)note(next+r.range(2,9));const gap=lerp(80,16,amt);next+=r.range(gap*.5,gap*1.5);if(r()<.25*(1-amt))next+=r.range(60,200);}}};}
PRIM.atmos=pAtmos;
PRIM.engine=pEngine;PRIM.reactor=pReactor;PRIM.compute=pCompute;PRIM.field=pField;PRIM.beat=pBeat;

/* ======================================================================================================
   EVENTS AND HERO EFFECTS
   ====================================================================================================== */
/* a relay or two clicking over */
EV.relay=function(E,t,s,r){const b=place(E,t,{d:A(s).d||[.3,.7],send:.8},r),n=r.int(1,4);let tt=t;
  for(let i=0;i<n;i++){const z=b.noise('white',tt,tt+.02),h=b.filt('bandpass',r.range(1800,3600),2),g=b.gain();perc(g.gain,tt,db(-10),.0005,.008);z.connect(h).connect(g).connect(b.in);
    const o=b.osc('sine',r.range(140,260),tt,tt+.05),og=b.gain();perc(og.gain,tt,db(-20),.001,.03);o.connect(og).connect(b.in);tt+=r.range(.04,.35);}return b.done();};
/* a servo moving something */
EV.servo=function(E,t,s,r){const b=place(E,t,{d:A(s).d||[.3,.7],send:.9},r),du=r.range(.25,1),f=r.range(140,320),up=r()<.5;
  const o=b.osc('sawtooth',f,t,t+du),l=b.filt('lowpass',1100,1),g=b.gain(0);o.frequency.linearRampToValueAtTime(f*(up?1.4:.72),t+du);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-24),t+.04);g.gain.setValueAtTime(db(-24),t+du-.05);g.gain.linearRampToValueAtTime(0,t+du);o.connect(l).connect(g).connect(b.in);
  const z=b.noise('white',t+du,t+du+.02),zg=b.gain();perc(zg.gain,t+du,db(-18),.0005,.01);z.connect(zg).connect(b.in);return b.done();};
/* pressure let go */
EV.hydraulic=function(E,t,s,r){const b=place(E,t,{d:A(s).d||[.35,.75],send:1},r),du=r.range(.6,1.6),z=b.noise('white',t,t+du+.05),h=b.filt('highpass',1200,.7),bp=b.filt('bandpass',r.range(2500,5000),.8),g=b.gain();
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-14),t+.015);g.gain.exponentialRampToValueAtTime(1e-4,t+du);bp.frequency.exponentialRampToValueAtTime(900,t+du);z.connect(h).connect(bp).connect(g).connect(b.in);
  const o=b.osc('sine',r.range(60,90),t,t+.2),og=b.gain();perc(og.gain,t,db(-14),.003,.12);o.connect(og).connect(b.in);return b.done();};
/* electrical discharge: a crackle and a zap falling away */
EV.discharge=function(E,t,s,r){const b=place(E,t,{d:A(s).d||[.3,.75],send:1},r),du=r.range(.2,.9),z=b.noise('white',t,t+du),h=b.filt('highpass',1500,.7),g=b.gain(0);
  for(let tt=t;tt<t+du;tt+=r.range(.006,.03))g.gain.setValueAtTime(r()<.6?db(-12)*r():0,tt);g.gain.setValueAtTime(0,t+du);z.connect(h).connect(g).connect(b.in);
  const o=b.osc('sawtooth',r.range(2000,3500),t,t+du*.8),og=b.gain(),ol=b.filt('lowpass',4000,1);o.frequency.exponentialRampToValueAtTime(r.range(120,300),t+du*.8);perc(og.gain,t,db(-22),.002,du*.7);o.connect(ol).connect(og).connect(b.in);
  const bz=b.osc('square',(E.mains||60)*2,t,t+du),bg=b.gain(),bl=b.filt('lowpass',900,1);perc(bg.gain,t,db(-24),.005,du);bz.connect(bl).connect(bg).connect(b.in);return b.done();};
/* weather outside: thunder a long way off, felt more than heard */
EV.thunder=function(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.7,.95],send:1.5},r),g=b.gain(0),pk=db(-13)*r.range(.5,1);let tt=t+r.range(.3,1.2);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk*.25,tt);for(let i=0,n=r.int(2,5);i<n;i++){g.gain.setTargetAtTime(pk*r.range(.5,1),tt,.1);tt+=r.range(.3,1.4);g.gain.setTargetAtTime(pk*r.range(.12,.35),tt,.4);tt+=r.range(.2,.8);}
  const du=tt-t+r.range(4,8);g.gain.setTargetAtTime(0,tt,(du-(tt-t))/4);const z=b.noise('brown',t,t+du),lp=b.filt('lowpass',r.range(110,300),.7);z.connect(lp).connect(g).connect(b.in);return b.done();};
/* a relay's beacon: the same tone, again and again, for nobody */
EV.beacon=function(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.5,.75],send:1.5},r),f=E._bf||(E._bf=r.range(640,980));
  const o=b.osc('sine',f,t,t+1.8),g=b.gain();perc(g.gain,t,db(-21),.004,1.6);o.connect(g).connect(b.in);const o2=b.osc('sine',f*2.003,t,t+.9),g2=b.gain();perc(g2.gain,t,db(-33),.003,.7);o2.connect(g2).connect(b.in);
  if(r()<.12){const o3=b.osc('sine',f*1.5,t+.25,t+1.6),g3=b.gain();perc(g3.gain,t+.25,db(-27),.004,1.2);o3.connect(g3).connect(b.in);}return b.done();};
/* the hull under stress: a groan, sometimes a ping */
EV.stress=function(E,t,s,r){const a=EV.creak(E,t,{args:{f:[45,180],dur:[1.5,5],d:A(s).d||[.55,.9]}},r);if(r()<.4)EV.clank(E,t+r.range(.2,a),{args:{d:A(s).d||[.6,.9]}},r);return a+1;};
/* something far off, nobody knows what */
EV.ambiguous=function(E,t,s,r){const k=r.pick(['impact','servo','creak','relay','hydraulic']);const o={args:{d:[.85,.97]}};if(k==='creak')o.args.f=[80,300];return EV[k](E,t,o,r);};
/* a short power sag across the ship: the beds dip and come back */
EV.shutdown=function(E,t,s,r){const d=r.range(3,12),G=E.grp;for(const g of ['machine','hvac','people']){G[g].mute.gain.setTargetAtTime(.08,t,.6);G[g].mute.gain.setTargetAtTime(1,t+d,1.5);}
  EV.relay(E,t,{args:{d:[.3,.6]}},r);EV.power(E,t+.05,{args:{dir:'down',d:[.4,.7],short:1}},r);if(r()<.7)EV.power(E,t+d,{args:{dir:'up',d:[.4,.7],short:1}},r);return d+3;};
/* UNEASE: the whole place goes quiet for a moment */
EV.silence=function(E,t,s,r){const d=r.range(3,8),G=E.grp;for(const g of ['machine','hvac','room','elec'])G[g].mute.gain.setTargetAtTime(.12,t,.4),G[g].mute.gain.setTargetAtTime(1,t+d,1.2);return d+2;};

/* ---------- doors ---------- */
const DOORS={light:{name:'LIGHT SLIDING DOOR',dur:[.55,.8],press:.35,motor:200,weight:.2,d:[.25,.5]},starship:{name:'STARSHIP DOOR',dur:[.7,1],press:.9,motor:150,weight:.5,d:[.3,.55]},
  bulkhead:{name:'HEAVY BULKHEAD',dur:[2.2,3.2],press:.6,motor:70,weight:1,d:[.3,.6]},pneumatic:{name:'PNEUMATIC DOOR',dur:[.45,.65],press:1.2,motor:0,weight:.3,d:[.3,.55]},
  broken:{name:'BROKEN DOOR',dur:[1.6,2.6],press:.4,motor:130,weight:.6,broken:1,d:[.3,.6]},distant:{name:'DISTANT DOOR',dur:[.7,1],press:.8,motor:150,weight:.5,d:[.82,.95]}};
EV.door=function(E,t,s,r){const P=A(s),D=DOORS[P.preset]||DOORS.starship,open=P.dir!=='close',du=r.v(D.dur)*(P.speed?1/P.speed:1),b=place(E,t,{d:P.d||D.d,send:1.1},r),w=D.weight*(P.weight||1);
  /* the click of the lock */const z=b.noise('white',t,t+.02),zh=b.filt('highpass',1500,.7),zg=b.gain();perc(zg.gain,t,db(-12),.0005,.01);z.connect(zh).connect(zg).connect(b.in);
  /* air: a hiss sweeping as the door moves */const pr=D.press*(P.pressure||1);if(pr>0){const n=b.noise('pink',t,t+du+.1),bp=b.filt('bandpass',open?2600:900,1.3),g=b.gain(0);
    bp.frequency.exponentialRampToValueAtTime(open?700:2600,t+du);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-10)*pr,t+.04);g.gain.exponentialRampToValueAtTime(1e-4,t+du);n.connect(bp).connect(g).connect(b.in);}
  /* the servo */const mp=(P.motor||D.motor);if(mp){const o=b.osc('sawtooth',mp,t+.02,t+du),l=b.filt('lowpass',800,1),g=b.gain(0);o.frequency.linearRampToValueAtTime(mp*(open?1.25:.85),t+du);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-26),t+.08);g.gain.setValueAtTime(db(-26),t+du-.1);g.gain.linearRampToValueAtTime(0,t+du);o.connect(l).connect(g).connect(b.in);
    if(D.broken){for(let tt=t+.1;tt<t+du;tt+=r.range(.08,.25))g.gain.setValueAtTime(r()<.35?0:db(-24),tt);const gr=b.noise('brown',t,t+du),gf=b.filt('bandpass',r.range(200,500),3),gg=b.gain(0);gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(db(-14),t+.2);gg.gain.linearRampToValueAtTime(0,t+du);gr.connect(gf).connect(gg).connect(b.in);}}
  /* weight: low movement, then the thump at the end */const mv=b.noise('brown',t,t+du),ml=b.filt('lowpass',220,.7),mg=b.gain(0);mg.gain.setValueAtTime(0,t);mg.gain.linearRampToValueAtTime(db(-12)*w,t+du*.4);mg.gain.linearRampToValueAtTime(0,t+du);mv.connect(ml).connect(mg).connect(b.in);
  const te=t+du,o2=b.osc('sine',lerp(140,60,clamp(w,0,1)),te,te+.3),g2=b.gain();perc(g2.gain,te,db(-8)*clamp(.4+w,0,1.2),.003,.18);o2.connect(g2).connect(b.in);
  return b.done();};
/* ---------- the lift: doors, motor, travel, arrival, doors ---------- */
EV.lift=function(E,t,s,r){const P=A(s),age=P.age!=null?P.age:.3,travel=P.duration||r.range(4,9),d=P.d||[.3,.55];
  EV.door(E,t,{args:{preset:'light',dir:'close',d}},r);const t1=t+1.1,b=place(E,t1,{d,send:.9},r),f0=r.range(48,62),end=t1+travel;
  const o=b.osc('sawtooth',f0*.6,t1,end+1.2),l=b.filt('lowpass',380,1),g=b.gain(0);o.frequency.linearRampToValueAtTime(f0,t1+1.2);o.frequency.setValueAtTime(f0,end-1);o.frequency.linearRampToValueAtTime(f0*.6,end+.8);
  g.gain.setValueAtTime(0,t1);g.gain.linearRampToValueAtTime(db(-16),t1+1);g.gain.setValueAtTime(db(-16),end-.6);g.gain.linearRampToValueAtTime(0,end+1);o.connect(l).connect(g).connect(b.in);
  const wh=b.osc('sine',260,t1,end+1),wg=b.gain(0);wh.frequency.linearRampToValueAtTime(r.range(480,620),t1+1.4);wh.frequency.setValueAtTime(wh.frequency.value,end-1);wh.frequency.linearRampToValueAtTime(260,end+.8);
  wg.gain.setValueAtTime(0,t1);wg.gain.linearRampToValueAtTime(db(-34),t1+1);wg.gain.setValueAtTime(db(-34),end-.5);wg.gain.linearRampToValueAtTime(0,end+1);wh.connect(wg).connect(b.in);
  const v=b.noise('brown',t1,end+1),vf=b.filt('bandpass',r.range(90,180),1.5),vg=b.gain(0),vam=b.osc('sine',r.range(6,11),t1,end+1),vamg=b.gain(db(-20)*.5);vam.connect(vamg).connect(vg.gain);
  vg.gain.setValueAtTime(0,t1);vg.gain.linearRampToValueAtTime(db(-20),t1+1.2);vg.gain.setValueAtTime(db(-20),end-.6);vg.gain.linearRampToValueAtTime(0,end+1);v.connect(vf).connect(vg).connect(b.in);
  if(age>.3)for(let tt=t1+.8;tt<end;tt+=r.range(.6,2.5)/age){const z=b.noise('white',tt,tt+.03),zf=b.filt('bandpass',r.range(800,2500),5),zg=b.gain();perc(zg.gain,tt,db(-24)*age,.001,.02);z.connect(zf).connect(zg).connect(b.in);}
  b.done();EV.ui(E,end+1.1,{args:{kind:'ack',d}},r);EV.door(E,end+1.5,{args:{preset:'light',dir:'open',d}},r);return end+2.6-t;};
/* ---------- communications ---------- */
EV.comms=function(E,t,s,r){const P=A(s),kind=P.kind||'open',bw=clamp(P.bw!=null?P.bw:.5,0,1),R=eraOf(E),b=place(E,t,{d:P.d||[.2,.5],send:.7,grp:'people'},r);
  const bp=b.filt('bandpass',1500,lerp(.4,4,bw)),hp=b.filt('highpass',lerp(150,600,bw),.7),mix=b.gain(1);mix.connect(hp).connect(bp).connect(b.in);
  const sub={in:mix,osc:b.osc,gain:b.gain,filt:b.filt,noise:b.noise};const f=pool(E,r,1)[0];let len=.3;
  const click=tt=>{const z=b.noise('white',tt,tt+.015),g=b.gain();perc(g.gain,tt,db(-10),.0004,.006);z.connect(g).connect(mix);};
  const stat=(tt,du,lvl)=>{const z=b.noise('white',tt,tt+du),g=b.gain(0);for(let x=tt;x<tt+du;x+=r.range(.01,.04))g.gain.setValueAtTime(db(lvl)*r(),x);g.gain.setValueAtTime(0,tt+du);z.connect(g).connect(mix);};
  switch(kind){
    case 'open':click(t);stat(t+.01,.12,-20);len=.15+tones(E,sub,t+.15,{seq:[f*.75,f,f*1.33],dur:[.05,.08],gain:-13},r);break;
    case 'close':len=tones(E,sub,t,{seq:[f*1.33,f,f*.75],dur:[.05,.08],gain:-13},r);click(t+len);stat(t+len,.08,-24);len+=.1;break;
    case 'incoming':{let tt=t;for(let i=0;i<3;i++){tones(E,sub,tt,{seq:[f,f*1.26],dur:[.11,.13],gap:[.03,.04],gain:-14,vib:9},r);tt+=.9;}len=tt-t;break;}
    case 'intercom':click(t);{const z=b.noise('pink',t,t+1.1),g=b.gain(db(-28));z.connect(g).connect(mix);}tones(E,sub,t+.15,{seq:[f],dur:[.25,.3],gain:-14,glide:[1,1]},r);click(t+1.1);len=1.2;break;
    case 'distress':{let tt=t;for(let i=0;i<3;i++){tones(E,sub,tt,{seq:[f*.8,f*.8,f*.8,f*.6],dur:[.14,.16],gap:[.08,.1],gain:-15,vib:5},r);tt+=1.4;}stat(t,tt-t,-26);len=tt-t;break;}
    case 'static':stat(t,len=r.range(.8,2.5),-14);break;
    case 'data':{let tt=t;const n=r.int(14,40);for(let i=0;i<n;i++){const ff=r.range(900,3200),du=r.range(.012,.04),o=b.osc(R.wave==='sine'?'square':'sine',ff,tt,tt+du+.01),g=b.gain();perc(g.gain,tt,db(-18),.001,du);o.connect(g).connect(mix);tt+=du+r.range(0,.01);}stat(t,tt-t,-30);len=tt-t;break;}}
  b.done();return len;};
/* ---------- the scanner ---------- */
EV.scanner=function(E,t,s,r){const P=A(s),R=eraOf(E),du=P.dur||r.range(1.5,3),b=place(E,t,{d:P.d||[.15,.45],send:1},r),f=r.range(500,800),up=r.range(1800,2800);
  const o=b.osc('sine',f,t,t+du);setWave(E.ctx,o,R.wave==='square'?'pulse25':R.wave);o.frequency.exponentialRampToValueAtTime(up,t+du*.5);o.frequency.exponentialRampToValueAtTime(f,t+du);
  const g=b.gain(0),am=b.osc('square',r.range(8,14),t,t+du),ag=b.gain(db(-20)*.5),l=b.filt('lowpass',4000,1);am.connect(ag).connect(g.gain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-20),t+.1);g.gain.setValueAtTime(db(-20),t+du-.1);g.gain.linearRampToValueAtTime(0,t+du);
  o.connect(l).connect(g).connect(b.in);const z=b.noise('pink',t,t+du),zf=b.filt('bandpass',f*2,3),zg=b.gain(0);zf.frequency.exponentialRampToValueAtTime(up*1.5,t+du*.5);zf.frequency.exponentialRampToValueAtTime(f*2,t+du);
  zg.gain.setValueAtTime(0,t);zg.gain.linearRampToValueAtTime(db(-26),t+du*.5);zg.gain.linearRampToValueAtTime(0,t+du);z.connect(zf).connect(zg).connect(b.in);return b.done();};
/* ---------- power up / down ---------- */
EV.power=function(E,t,s,r){const P=A(s),upw=P.dir!=='down',du=(P.short?.6:1)*r.range(2,4),b=place(E,t,{d:P.d||[.3,.6],send:1},r),f0=r.range(30,45),f1=f0*r.range(2.4,3.2);
  const o=b.osc('sawtooth',upw?f0:f1,t,t+du+.1),l=b.filt('lowpass',upw?200:1400,1.5),g=b.gain(0);o.frequency.exponentialRampToValueAtTime(upw?f1:f0,t+du);l.frequency.exponentialRampToValueAtTime(upw?1400:180,t+du);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-14),t+(upw?du*.7:.1));g.gain.linearRampToValueAtTime(upw?db(-20):0,t+du);if(upw)g.gain.linearRampToValueAtTime(0,t+du+.1);o.connect(l).connect(g).connect(b.in);
  const w=b.osc('sine',upw?200:1800,t,t+du+.1),wg=b.gain(0);w.frequency.exponentialRampToValueAtTime(upw?1800:150,t+du);wg.gain.setValueAtTime(0,t);wg.gain.linearRampToValueAtTime(db(-30),t+du*.6);wg.gain.linearRampToValueAtTime(0,t+du);w.connect(wg).connect(b.in);
  b.done();EV.relay(E,upw?t:t+du,{args:{d:P.d||[.3,.6]}},r);return du+.4;};
/* ---------- alerts ---------- */
EV.alert=function(E,t,s,r){const P=A(s),R=eraOf(E),n=P.cycles||r.int(3,5),kind=P.kind||({'60s':'whoop',analog:'twotone',digital:'beeps',modern:'twotone',alien:'whoop',industrial:'klaxon'}[E.era]||'twotone'),b=place(E,t,{d:P.d||[.35,.65],send:1.2,panR:.3},r);let tt=t;
  for(let i=0;i<n;i++){if(kind==='whoop'){const o=b.osc(R.wave==='sine'?'sine':'triangle',380,tt,tt+.7),g=b.gain(0);o.frequency.exponentialRampToValueAtTime(1150,tt+.6);g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(db(-14),tt+.05);g.gain.setValueAtTime(db(-14),tt+.55);g.gain.linearRampToValueAtTime(0,tt+.65);o.connect(g).connect(b.in);tt+=.85;}
    else if(kind==='klaxon'){const o=b.osc('sawtooth',r.range(340,420),tt,tt+.9),l=b.filt('lowpass',1600,2),g=b.gain(0),am=b.osc('square',30,tt,tt+.9),ag=b.gain(db(-14)*.4);am.connect(ag).connect(g.gain);g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(db(-14),tt+.03);g.gain.setValueAtTime(db(-14),tt+.8);g.gain.linearRampToValueAtTime(0,tt+.85);o.connect(l).connect(g).connect(b.in);tt+=1.3;}
    else if(kind==='beeps'){tones(E,b,tt,{seq:[1760,1760,1760],dur:[.07,.07],gap:[.06,.06],gain:-14,glide:[1,1]},r);tt+=.85;}
    else{tones(E,b,tt,{seq:[880,660],dur:[.28,.3],gap:[.02,.03],gain:-14,glide:[1,1],wave:R.alt},r);tt+=.75;}}
  return b.done(),tt-t;};
/* ---------- reactor startup: a thunk, a rising rumble, harmonics building, then a settled pulse ---------- */
EV.reactorStart=function(E,t,s,r){const P=A(s),du=r.range(6,10),b=place(E,t,{d:P.d||[.35,.6],send:1.2},r);EV.clunk(E,t,{args:{d:[.3,.5]}},r);
  const n=b.noise('brown',t,t+du+2),l=b.filt('lowpass',60,.7),g=b.gain(0);l.frequency.exponentialRampToValueAtTime(400,t+du*.8);l.frequency.exponentialRampToValueAtTime(140,t+du+2);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-6),t+du*.8);g.gain.linearRampToValueAtTime(0,t+du+2);n.connect(l).connect(g).connect(b.in);
  const f0=r.range(28,36);[1,2.01,3.02,4.03].forEach((m,i)=>{const o=b.osc('sawtooth',f0*m*.5,t+i*.6,t+du+2),ol=b.filt('lowpass',120,1),og=b.gain(0);o.frequency.exponentialRampToValueAtTime(f0*m,t+du*.7);ol.frequency.exponentialRampToValueAtTime(700,t+du);
    og.gain.setValueAtTime(0,t+i*.6);og.gain.linearRampToValueAtTime(db(-20-i*4),t+du);og.gain.linearRampToValueAtTime(0,t+du+2);o.connect(ol).connect(og).connect(b.in);});
  const pu=b.osc('sine',f0*2,t+du*.8,t+du+2),pg=b.gain(0),pl=b.osc('sine',1.5,t+du*.8,t+du+2),plg=b.gain(db(-14)*.5);pl.connect(plg).connect(pg.gain);pg.gain.setValueAtTime(0,t+du*.8);pg.gain.linearRampToValueAtTime(db(-14),t+du);pg.gain.linearRampToValueAtTime(0,t+du+2);pu.connect(pg).connect(b.in);
  return b.done()+.5;};
/* ---------- system failure: an alarm chirp, relays chattering, power falling away, crackle, a last thunk ---------- */
EV.failure=function(E,t,s,r){const P=A(s);EV.ui(E,t,{args:{kind:'error',d:P.d||[.25,.5]}},r);const b=place(E,t+.4,{d:P.d||[.3,.55],send:1.1},r);
  for(let i=0;i<r.int(6,12);i++){const tt=t+.4+i*r.range(.04,.12),z=b.noise('white',tt,tt+.02),zg=b.gain();perc(zg.gain,tt,db(-12),.0005,.008);z.connect(zg).connect(b.in);}b.done();
  const pd=EV.power(E,t+.9,{args:{dir:'down',d:P.d||[.3,.55]}},r);EV.discharge(E,t+1.2,{args:{d:P.d||[.3,.6]}},r);EV.clunk(E,t+.9+pd,{args:{d:[.3,.5]}},r);return pd+1.5;};

/* ---------- teleport / materialization: activation, a rising tone, shimmering partials, bells, noise, sweeps, movement, a long tail ---------- */
const TP_STYLES=['60s','analog','digital','modern','alien','industrial','broken'];
EV.teleport=function(E,t,s,r){const P=A(s),mode=P.mode||'materialize',st=P.style||({'60s':'60s',analog:'analog',digital:'digital',modern:'modern',alien:'alien',industrial:'industrial'}[E.era]||'analog'),
    on=Object.assign({act:1,rise:1,shimmer:1,bells:1,noise:1,sweep:1},P.layers||{}),du=P.dur||r.range(4,6.5)*(mode==='unstable'?1.4:1),b=place(E,t,{d:P.d||[.1,.3],send:1.6,panR:.2},r),c=E.ctx;
  const T=t,mid=t+du*(mode==='dematerialize'?.25:.7),END=t+du;const out=b.in;const env=(g,a,peak,z,shape)=>{g.gain.setValueAtTime(0,a);if(shape==='down'){g.gain.linearRampToValueAtTime(peak,a+.15);g.gain.linearRampToValueAtTime(0,z);}else{g.gain.linearRampToValueAtTime(peak,(a+z)/2);g.gain.linearRampToValueAtTime(0,z);}};
  const dem=mode==='dematerialize',fail=mode==='fail',uns=mode==='unstable',broken=st==='broken';
  /* stereo movement */b.pan.pan.setValueAtTime(-.5,T);b.pan.pan.linearRampToValueAtTime(.5,T+du*.5);b.pan.pan.linearRampToValueAtTime(0,END);
  /* 1. low machine activation */if(on.act){const o=b.osc('sine',dem?60:40,T,END+.5),g=b.gain(0);o.frequency.linearRampToValueAtTime(dem?38:62,END);env(g,T,db(-14),END,dem?'down':0);o.connect(g).connect(out);
    const s2=b.osc('sawtooth',dem?120:80,T,END+.5),l=b.filt('lowpass',160,1),g2=b.gain(0);s2.frequency.linearRampToValueAtTime(dem?80:124,END);env(g2,T,db(-22),END,dem?'down':0);s2.connect(l).connect(g2).connect(out);}
  /* 2. the rising (or falling) tone */if(on.rise){const w={'60s':'sine',analog:'sawtooth',digital:'square',modern:'sine',alien:'sine',industrial:'sawtooth',broken:'sawtooth'}[st];
    const o=b.osc('sine',dem?1800:180,T,END);setWave(c,o,w);o.frequency.exponentialRampToValueAtTime(dem?180:(fail?900:1800),fail?T+du*.55:END);if(fail)o.frequency.exponentialRampToValueAtTime(60,END);
    if(st==='alien'){const m=b.osc('sine',300,T,END),mg=b.gain(260);m.frequency.exponentialRampToValueAtTime(dem?200:900,END);m.connect(mg).connect(o.frequency);}
    const l=b.filt(st==='analog'||st==='industrial'?'lowpass':'bandpass',dem?3000:400,st==='analog'?6:1.2),g=b.gain(0);l.frequency.exponentialRampToValueAtTime(dem?300:4000,END);env(g,T,db(-24),END,dem?'down':0);o.connect(l).connect(g).connect(out);
    if(uns){const v=b.osc('sine',r.range(3,7),T,END),vg=b.gain(120);v.connect(vg).connect(o.frequency);}}
  /* 3. shimmering high partials, each trembling */if(on.shimmer){const n=st==='digital'?6:r.int(9,14),base=st==='industrial'?r.range(1500,2500):r.range(2200,3200);
    for(let i=0;i<n;i++){const f=st==='alien'?base*Math.pow(1.17,i)*(1+r.pm(.03)):base*(1+i*.31+r.pm(.04)),a=T+(dem?0:du*r.range(.15,.45)),z=dem?T+du*r.range(.5,.8):END;
      const o=b.osc(st==='60s'?'sine':st==='analog'?'triangle':'sine',f,a,z+.1),g=b.gain(0),tr=b.osc(st==='digital'?'square':'sine',r.range(14,40),a,z+.1),tg=b.gain(0);
      if(st==='digital'){for(let tt=a;tt<z;tt+=.045)o.frequency.setValueAtTime(f*r.pick([1,1.25,1.5,2]),tt);}
      tr.connect(tg).connect(g.gain);const pk=db(-34)*(uns?1.3:1);g.gain.setValueAtTime(0,a);g.gain.linearRampToValueAtTime(pk*.5,dem?a+.2:(a+z)/2);g.gain.linearRampToValueAtTime(0,z);tg.gain.setValueAtTime(pk*.5,a);
      if(uns){const w=b.osc('sine',r.range(.8,2.5),a,z+.1),wg=b.gain(f*.06);w.connect(wg).connect(o.frequency);}o.connect(g).connect(out);}}
  /* 4. bell-like tones as it resolves */if(on.bells&&!fail){const at=dem?T+.05:mid,root=r.pick([523,587,659,698,784]),ch=[1,1.26,1.5];
    ch.forEach((k,i)=>{for(const [m,lv] of [[1,0],[2.76,-9],[5.4,-16]]){const o=b.osc('sine',root*k*m*(st==='alien'?1.03:1),at+i*.06,at+3.5),g=b.gain();perc(g.gain,at+i*.06,db(-22+lv),.004,r.range(2,3.2));o.connect(g).connect(out);}});}
  /* 5. filtered noise, 6. sweeping */if(on.noise){const z=b.noise(st==='modern'?'white':'pink',T,END+.3),bp=b.filt('bandpass',dem?4000:500,on.sweep?2:1),g=b.gain(0);if(on.sweep)bp.frequency.exponentialRampToValueAtTime(dem?400:5000,END);
    env(g,T,db(st==='modern'?-18:-24),END,dem?'down':0);z.connect(bp).connect(g).connect(out);if(st==='industrial'){const cmb=b.filt('peaking',r.range(800,1400),12,14);bp.disconnect();bp.connect(cmb).connect(g);}}
  /* failure and brokenness: stutter, crackle, collapse */if(fail||broken||uns){const gate=b.gain(1);const sx=fail?T+du*.55:T+du*.2;for(let tt=sx;tt<END;tt+=r.range(.03,.09))gate.gain.setValueAtTime(r()<(fail?.5:.25)?.05:1,tt);gate.gain.setValueAtTime(1,END);
    b.in.disconnect();b.in.connect(gate);gate.connect(b.n[1]);}
  b.done();if(fail){EV.discharge(E,T+du*.6,{args:{d:[.1,.3]}},r);EV.clunk(E,END,{args:{d:[.1,.3]}},r);}if(broken&&r()<.6)EV.discharge(E,T+du*r.range(.3,.8),{args:{d:[.1,.3]}},r);
  return du+3;};
const TP_MODES=['energize','materialize','dematerialize','fail','unstable'];

/* defaults for the scheduler (scenes override) */
Object.assign(EVDEF,{ui:{min:20,max:90,p:.85,quiet:1,cls:'ui'},relay:{min:60,max:300,p:.7,quiet:1,cls:'mech'},servo:{min:90,max:600,p:.6,quiet:1,cls:'mech'},hydraulic:{min:300,max:1200,p:.6,cls:'mech'},
  discharge:{min:600,max:2400,p:.6,cls:'decay'},stress:{min:300,max:1500,p:.6,cls:'decay'},ambiguous:{min:900,max:3600,p:.6,cls:'decay'},shutdown:{min:1800,max:5400,p:.5,cls:'decay'},
  silence:{min:900,max:2700,p:.6,quiet:1,cls:'unease'},door:{min:120,max:900,p:.6,cls:'mech'},lift:{min:900,max:2700,p:.5,cls:'mech'},comms:{min:300,max:1500,p:.6,cls:'comms'},
  scanner:{min:600,max:2400,p:.5,cls:'ui'},alert:{min:25,max:70,p:.9,quiet:1,cls:'alarm',only:['alert','emergency','failing']},teleport:{min:600,max:1800,p:.7,cls:'mech'},thunder:{min:180,max:900,p:.7,cls:'decay'},beacon:{min:28,max:34,p:1,quiet:1,cls:'comms'},power:{min:1800,max:5400,p:.5,cls:'mech'}});

/* ======================================================================================================
   ROOMS
   ====================================================================================================== */
const ROOMS={
  cabin:{name:'SMALL CABIN',decay:.55,pre:.006,damp:3500,wet:.08,size:.5,er:3,width:.35,dist:-.12,eqLow:1,eqHigh:-2},
  corridor:{name:'CORRIDOR',decay:1.3,pre:.012,damp:5000,wet:.14,size:.8,er:5,width:.6,dist:0},
  largeCorridor:{name:'LARGE CORRIDOR',decay:2.2,pre:.02,damp:4800,wet:.18,size:1.1,er:5,width:.75,dist:.05},
  bridge:{name:'BRIDGE',decay:1.1,pre:.014,damp:6000,wet:.12,size:.9,er:4,width:.8,dist:-.05},
  engineering:{name:'ENGINEERING',decay:2,pre:.018,damp:4200,wet:.17,size:1.1,er:5,width:.8,dist:0,eqLow:2},
  cargo:{name:'CARGO BAY',decay:3.2,pre:.03,damp:4000,wet:.22,size:1.35,er:6,width:.9,dist:.1},
  hangar:{name:'HANGAR',decay:4.8,pre:.045,damp:3800,wet:.26,size:1.6,er:6,width:1,dist:.15},
  chamber:{name:'LARGE CHAMBER',decay:5.5,pre:.05,damp:5200,wet:.3,size:1.6,er:4,width:1,dist:.2},
  underground:{name:'UNDERGROUND FACILITY',decay:2.6,pre:.022,damp:3200,wet:.2,size:1.1,er:6,width:.6,dist:.05,eqLow:2,eqHigh:-3},
  station:{name:'SPACE STATION',decay:1.8,pre:.016,damp:5500,wet:.16,size:1,er:5,width:.85,dist:0},
  abandoned:{name:'ABANDONED SHIP',decay:3.6,pre:.03,damp:3600,wet:.25,size:1.3,er:5,width:.85,dist:.1,eqHigh:-3}};
const ROOM_IDS=Object.keys(ROOMS);

/* ======================================================================================================
   SCENE STATES: change many things at once, smoothly
   g: group levels · events: overall event rate · rate: per class (ui, mech, comms, alarm, decay, unease) · enter: a hero on arrival
   ====================================================================================================== */
const STATES={
  normal:{name:'NORMAL',g:{},rate:{}},
  quiet:{name:'QUIET',g:{machine:.75,elec:.85,people:.6},events:.5,rate:{ui:.35,comms:.4}},
  busy:{name:'BUSY',g:{people:1.25,machine:1.05},events:1.6,rate:{ui:2.2,mech:1.5,comms:1.8}},
  alert:{name:'ALERT',g:{machine:1.1},rate:{ui:1.6,comms:1.4,alarm:1},enter:'alert',enterArgs:{cycles:4}},
  emergency:{name:'EMERGENCY',g:{machine:1.25,elec:1.2,people:1.2},events:1.5,rate:{ui:2.4,mech:1.8,alarm:2.5,comms:1.6,decay:1.5},enter:'alert',enterArgs:{cycles:6}},
  lowpower:{name:'LOW POWER',g:{machine:.45,hvac:.55,elec:1.2,people:.4},events:.6,rate:{ui:.3,comms:.4,mech:.6},enter:'power',enterArgs:{dir:'down'}},
  derelict:{name:'DERELICT',g:{machine:.25,hvac:.35,elec:.8,people:.15},events:.6,rate:{ui:.1,comms:.1,decay:2.2,mech:.4}},
  failing:{name:'FAILING',g:{machine:.65,elec:1.15},events:1.2,rate:{decay:2.5,alarm:.5,ui:.5},enter:'failure'},
  abandoned:{name:'ABANDONED',g:{machine:.12,hvac:.2,elec:.5,people:0},events:.35,rate:{ui:0,comms:0,mech:.3,decay:1.4}}};
const STATE_IDS=Object.keys(STATES);

/* ======================================================================================================
   SCENES: assembled from generators. Generic names only: an era and a language, nobody's ship.
   ====================================================================================================== */
const M0={music:0,activity:.5,machinery:.5,electronics:.5,air:.5,roomSize:.5,distance:.5,age:.2,condition:0,instability:.15,unease:0,liminal:.1,retro:.6,space:.5,events:.5};
const ev=(type,args,o)=>Object.assign({type,args:args||{}},o||{});
const WIND=o=>Object.assign({t:'noise',g:'hvac',label:'WIND',noise:'pink',hp:70,lp:[600,1000],peaks:{f:[[300,520],[700,1100]],n:[1,2],db:[3,7],q:[2,5]},amp:{rate:[.03,.1],db:[6,10]},flt:{rate:[.02,.07],pct:[.3,.5]},db:-33,width:.85,send:.35},o||{});
const RAIN=o=>Object.assign({t:'noise',g:'hvac',label:'RAIN',noise:'white',hp:1800,lp:[7000,9000],amp:{rate:[.02,.06],db:[2,4]},db:-46,width:.9,send:.25},o||{});
const HISS=o=>Object.assign({t:'noise',g:'elec',label:'RADIO HISS',noise:'white',hp:900,lp:4800,amp:{rate:[.05,.2],db:[2,5]},db:-48,width:.4,send:.4},o||{});
const MOTOR=o=>Object.assign({t:'motor',g:'machine',f0:[40,52],harm:[[1,-42],[2,-46],[3,-52]],noise:[150,650],res:[240,380,520],ndb:-46,send:.5},o||{});
const SCENES={
  mining:{trim:-1.2,style:'synthwave',name:'MINING STATION',room:'engineering',era:'industrial',m:{machinery:.7,activity:.35,condition:.25,liminal:.3},
    engine:{power:.8,rpm:1.8,mass:.9,smooth:.5,dist:.55,elec:.35,res:.6},reactor:{power:.55},vent:-34,hum:[-44,-50,-58],
    extra:{conveyor:MOTOR({label:'ORE CONVEYOR',f0:[36,44],pulse:{rate:[.45,.7],len:[.04,.08],fc:[250,600],db:-40,jit:[.01,.03]},send:.6})},
    events:[ev('relay',{},{min:60,max:240}),ev('hydraulic',{},{min:240,max:900}),ev('clank',{},{min:120,max:600}),ev('stress',{},{min:300,max:1200}),ev('servo',{},{min:120,max:500}),
      ev('comms',{kind:'static'},{min:600,max:1800}),ev('impact',{d:[.8,.95]},{min:900,max:2400}),ev('ui',{kind:'error',d:[.5,.8]},{min:900,max:2400})]},
  maintenance:{trim:0.8,style:'darksynth',name:'MAINTENANCE BAY',room:'cargo',era:'analog',m:{machinery:.55,activity:.4,condition:.3},
    engine:{power:.55,rpm:1.4,mass:.75,smooth:.65,dist:.65},vent:-33,hum:[-46,-52,-60],
    extra:{compressor:MOTOR({label:'COMPRESSOR',f0:[55,62],ndb:-48,cycle:{on:[60,180],off:[240,600]},send:.4})},
    events:[ev('servo',{},{min:60,max:300}),ev('hydraulic',{},{min:180,max:700}),ev('clank',{},{min:90,max:400}),ev('relay',{},{min:60,max:300}),ev('ui',{kind:'bleep'},{min:120,max:400}),
      ev('door',{preset:'bulkhead'},{min:600,max:1800}),ev('discharge',{},{min:900,max:2700})]},
  quarters:{trim:0.1,style:'chillwave',name:'CREW QUARTERS',room:'cabin',era:'analog',m:{activity:.15,machinery:.3,liminal:.2,music:.3},
    engine:{power:.35,rpm:1,mass:.7,smooth:.85,dist:.9},vent:-38,hum:[-50,-56,null],
    events:[ev('ui',{kind:'bleep',d:[.6,.9]},{min:300,max:1200}),ev('relay',{d:[.6,.9]},{min:600,max:1800}),ev('stress',{d:[.7,.9]},{min:900,max:2700}),ev('comms',{kind:'intercom',d:[.75,.9]},{min:1200,max:3600})]},
  refinery:{trim:-1.6,style:'darksynth',name:'REFINERY',room:'hangar',era:'industrial',m:{machinery:.85,activity:.45,condition:.35},
    engine:{power:1,rpm:2.4,mass:.95,smooth:.4,dist:.45,elec:.5,res:.7},reactor:{power:.5},vent:-32,hum:[-40,-46,-54],
    extra:{pump:MOTOR({label:'TRANSFER PUMP',f0:[46,52],pulse:{rate:[.7,1.1],len:[.03,.06],fc:[300,700],db:-38,jit:[.01,.02]},send:.5}),
      press:MOTOR({label:'PRESS',f0:[30,36],ndb:-50,pulse:{rate:[.08,.14],len:[.12,.25],fc:[120,300],db:-34,jit:[.02,.05]},send:.8})},
    events:[ev('hydraulic',{},{min:120,max:600}),ev('clank',{},{min:60,max:300}),ev('relay',{},{min:45,max:200}),ev('stress',{},{min:300,max:900}),
      ev('alert',{cycles:2,d:[.82,.95]},{min:2400,max:5400,cls:'decay',only:false,quiet:0})]},
  greenhouse:{trim:-0.4,style:'chillwave',name:'GREENHOUSE',room:'chamber',era:'modern',m:{activity:.2,machinery:.35,condition:.3,liminal:.35,air:.6,music:.4},
    vent:-36,hum:[-50,-56,null],
    extra:{fans:MOTOR({g:'hvac',label:'GROW FANS',f0:[90,118],harm:[[1,-50],[2,-54]],noise:[300,2500],res:[600,900,1300],ndb:-46,send:.4}),
      pump:MOTOR({label:'IRRIGATION PUMP',f0:[58,64],ndb:-50,cycle:{on:[40,120],off:[200,600]},send:.4}),rain:RAIN({label:'MISTERS',db:-50,amp:{rate:[.01,.03],db:[4,8]}})},
    events:[ev('drip',{},{min:20,max:90}),ev('plumbing',{},{min:300,max:900}),ev('relay',{d:[.5,.8]},{min:300,max:900}),ev('ui',{kind:'bleep',d:[.6,.85]},{min:600,max:1800}),
      ev('power',{dir:'down',short:1,d:[.5,.8]},{min:1800,max:3600})]},
  relay:{trim:1.2,style:'spacewave',name:'COMMUNICATIONS RELAY',room:'station',era:'analog',m:{activity:.2,electronics:.7,liminal:.6,machinery:.3,condition:.3},
    reactor:{power:.3},vent:-35,hum:[-44,-50,-58],compute:-44,extra:{hiss:HISS()},
    events:[ev('beacon',{},{min:28,max:34,p:1,quiet:1,cls:'comms',actPow:0,fixed:1}),ev('comms',{kind:'data'},{min:120,max:600}),ev('comms',{kind:'static'},{min:120,max:500}),
      ev('comms',{kind:'incoming'},{min:600,max:1800}),ev('ui',{kind:'scan'},{min:600,max:1500}),ev('stress',{},{min:900,max:2400})]},
  elevator:{trim:1.2,style:'spacewave',name:'ELEVATOR TERMINAL',room:'hangar',era:'analog',m:{activity:.25,condition:.4,liminal:.55,machinery:.45},
    engine:{power:.35,rpm:.8,mass:.85,smooth:.85,dist:.9},vent:-33,hum:[-44,-50,-58],
    extra:{cable:MOTOR({label:'CABLE DRIVE',f0:[26,32],harm:[[1,-44],[2,-50]],noise:[90,400],ndb:-50,send:.7})},
    events:[ev('lift',{},{min:600,max:1500}),ev('stress',{},{min:180,max:900}),ev('door',{preset:'bulkhead'},{min:900,max:2400}),ev('pa',{radio:1},{min:1200,max:3600,cls:'comms'}),
      ev('clank',{d:[.7,.95]},{min:300,max:900}),ev('servo',{d:[.6,.9]},{min:300,max:900})]},
  radar:{trim:-3.2,style:'darksynth',name:'RADAR STATION',room:'underground',era:'analog',m:{air:.7,activity:.2,liminal:.45,condition:.35,machinery:.35},
    hum:[-46,-52,-60],vent:-38,
    extra:{wind:WIND(),rain:RAIN({db:-48}),dish:MOTOR({label:'DISH DRIVE',f0:[24,30],harm:[[1,-46],[2,-52]],noise:[120,500],ndb:-48,pulse:{rate:[.12,.2],len:[.15,.3],fc:[200,500],db:-42,jit:[.02,.05]},send:.6})},
    events:[ev('thunder',{},{min:120,max:600,cls:'decay'}),ev('ui',{kind:'scan',d:[.4,.7]},{min:180,max:600}),ev('comms',{kind:'static'},{min:600,max:1800}),ev('stress',{},{min:300,max:1200})]},
  research:{trim:3.2,style:'spacewave',name:'RESEARCH SHIP',room:'largeCorridor',era:'analog',m:{condition:.85,liminal:.7,activity:.15,machinery:.4},
    engine:{power:.5,rpm:1.2,mass:.75,smooth:.7,dist:.8},vent:-34,hum:[-44,-50,-56],
    events:[ev('stress',{},{min:90,max:360}),ev('discharge',{},{min:240,max:900}),ev('ui',{kind:'failing',d:[.5,.85]},{min:180,max:720}),ev('door',{preset:'distant'},{min:600,max:2400}),ev('ambiguous',{},{min:900,max:3000}),ev('impact',{},{min:900,max:2700})]},
  powerplant:{trim:-2,style:'synthwave',name:'COLONY POWER PLANT',room:'hangar',era:'industrial',m:{machinery:.8,activity:.3,condition:.2},
    engine:{power:.6,rpm:3,mass:.7,smooth:.85,dist:.6,elec:.6},reactor:{power:.9},vent:-32,hum:[-38,-44,-50,-56],
    extra:{coolant:MOTOR({label:'COOLANT PUMPS',f0:[50,56],ndb:-46,pulse:{rate:[.5,.8],len:[.04,.07],fc:[250,500],db:-44,jit:[.01,.02]},send:.5})},
    events:[ev('relay',{},{min:60,max:300}),ev('hydraulic',{},{min:300,max:900}),ev('ui',{kind:'warning',d:[.6,.85]},{min:900,max:2400}),ev('discharge',{},{min:1200,max:3600}),ev('clank',{},{min:300,max:900})]},
  docking:{trim:0.2,style:'spacewave',name:'DOCKING BAY',room:'hangar',era:'modern',m:{activity:.25,liminal:.5,condition:.2,music:.35},
    engine:{power:.3,rpm:.8,mass:.6,smooth:.9,dist:.9},vent:-34,hum:[-46,-52,-58],
    events:[ev('door',{preset:'bulkhead',d:[.75,.95]},{min:600,max:1800}),ev('hydraulic',{d:[.6,.9]},{min:600,max:1800}),ev('comms',{kind:'incoming',d:[.6,.85]},{min:1200,max:3600}),
      ev('ui',{kind:'bleep'},{min:300,max:1200}),ev('stress',{},{min:600,max:1800}),ev('pa',{radio:1},{min:1800,max:3600,cls:'comms'})]},
  corridor:{trim:0.9,style:'synthwave',name:'SERVICE CORRIDOR',room:'corridor',era:'analog',m:{activity:.3,condition:.35,machinery:.5},
    engine:{power:.6,rpm:1.5,mass:.8,smooth:.65,dist:.45},vent:-32,hum:[-44,-50,-58],
    events:[ev('relay',{},{min:45,max:240}),ev('door',{preset:'distant'},{min:300,max:1200}),ev('stress',{},{min:300,max:1200}),ev('servo',{},{min:300,max:900}),ev('plumbing',{},{min:300,max:900}),
      ev('ui',{kind:'chirp'},{min:120,max:600}),ev('lift',{d:[.7,.9]},{min:1200,max:3600})]}};
const SCENE_IDS=Object.keys(SCENES);
const KEYN={mining:'MINING STATION',maintenance:'MAINTENANCE BAY',quarters:'CREW QUARTERS',refinery:'REFINERY',greenhouse:'GREENHOUSE',relay:'RELAY',elevator:'CARGO ELEVATOR',radar:'RADAR STATION',research:'RESEARCH SHIP',powerplant:'POWER PLANT',docking:'DOCKING BAY',corridor:'SERVICE CORRIDOR'};

/* ======================================================================================================
   DNA -> an environment
   ====================================================================================================== */
const MX0={tempo:.5,energy:.5,drums:1,bass:1,arp:1,lead:1,pads:1,amb:.7};
function dnaOf(scene,seed,mode){const S=SCENES[scene]||SCENES.mining;return {v:1,scene:S===SCENES[scene]?scene:'mining',seed:seed||1,mode:mode||'mix',style:S.style||'synthwave',mx:Object.assign({},MX0),room:S.room,era:S.era,state:S.state||'normal',m:Object.assign({},M0,S.m||{}),layers:{},events:{},tape:'clean',lock:{}};}
function compile(dna){const S=SCENES[dna.scene]||SCENES.mining,m=Object.assign({},M0,dna.m||{},dna.mode==='strange'?{unease:Math.max(dna.m.unease||0,.4),liminal:Math.max(dna.m.liminal||0,.7),music:Math.max(dna.m.music||0,.3)}:{},dna.mode==='mix'?{music:0}:{}),r=RNG(dna.seed||1,'compile'),Rm=Object.assign({},ROOMS[dna.room]||ROOMS[S.room]||ROOMS.corridor);
  const c=clamp(m.condition,0,1),age=clamp(m.age,0,1),wear=clamp(c+age*.35,0,1),L=clamp(m.liminal,0,1),U=clamp(m.unease,0,1),ins=clamp(m.instability+c*.6+L*.15,0,1);
  /* the room: size, liminal (longer, a little unnatural), space (width) */
  const sz=lerp(.7,1.35,m.roomSize);const rev={decay:Rm.decay*sz*(1+1.2*L),pre:Rm.pre*(1+2.5*L)*sz,damp:Rm.damp*(1-.25*c),wet:Rm.wet*(1+.8*L)*lerp(.8,1.25,m.space),size:Rm.size*sz,er:Rm.er,erGain:1-.4*L};
  const width=clamp(Rm.width*lerp(.6,1.3,m.space),0,1);
  const layers={};
  /* BED: the engine (condition: less power, slower, unsteady; abandoned: barely there) */
  if(S.engine&&!(c>.95&&r()<.6)){const e=Object.assign({},S.engine);e.power*=(1-.65*c);e.rpm*=(1-.45*c);e.smooth=clamp(e.smooth-.4*c,0,1);e.instab=ins;e.elec=(e.elec!=null?e.elec:.3)*(1-c)*lerp(.4,1.4,m.electronics);
    e.dist=clamp(e.dist+(m.distance-.5)*.5+Rm.dist,0,1);e.mass=clamp(e.mass,0,1);Object.assign(e,dna.engine||{});layers.engine=Object.assign({t:'engine',g:'machine',label:'ENGINE',send:.35,drift:[.03,.08,120,600]},e);}
  if(S.reactor)layers.reactor=Object.assign({t:'reactor',g:'machine',label:'REACTOR',send:.4},S.reactor,{power:S.reactor.power*(1-.6*c)});
  /* ventilation: weaker as things fail; broken ventilation stutters */
  const vdb=(S.vent||-35)-10*c;layers.vent=c>.5?{t:'noise',g:'hvac',label:'VENTILATION',noise:'pink',hp:150,lp:2600,peaks:{f:[[400,900]],n:[1,1],db:[2,4],q:[.7,1]},db:vdb,width:width*.5,pulse:{base:.35,depth:.9,rate:[.05,.3]},send:.3}
    :Object.assign(AIR({db:vdb,width:width*.5,label:'VENTILATION'}),{hp:150,lp:3200});
  layers.air=Object.assign(HVAC({db:-30-6*c,label:'AIR HANDLING'}),{lp:[120,180]});
  /* electrical: a hum, unstable with age, sometimes missing */
  if(S.hum&&!(c>.7&&r()<c-.55)){layers.electrical=HUM({harm:S.hum.concat([]).map(v=>v==null?null:v+(c>.4?-2:0)),label:'ELECTRICAL',buzz:c>.4?-58+10*(c-.4):undefined,det:[.05+.6*ins,.3+1.2*ins]});}
  if(c>.3)layers.crackle={t:'noise',g:'elec',label:'CRACKLE',noise:'white',hp:2500,lp:8000,pulse:{base:0,depth:1,rate:[8,20],kind:'ctrls'},db:-56+14*(c-.3)};
  /* computers thinking (gone when the power is) */
  if(S.compute&&c<.6)layers.computers={t:'compute',g:'people',label:'COMPUTERS',db:S.compute-8*c};
  if(S.field)layers.field={t:'field',g:'elec',label:'FIELD',db:S.field-6*c};
  /* structure: low resonance you feel more than hear; the room's own tone */
  layers.structure={t:'noise',g:'room',label:'STRUCTURE',noise:'brown',hp:22,lp:110,peaks:{f:[[38,48],[60,72],[95,110]],n:[1,2],db:[6,10],q:[6,10]},db:-40+8*wear,amp:{rate:[.01,.04],db:[1,4]},width:width*.4};
  layers.room=ROOM({db:-44,width,label:'ROOM TONE',lp:[4000,7000]});
  /* the location's own beds: wind, rain, radio hiss, pumps, conveyors, a turning dish */
  for(const k in S.extra||{}){const x=JSON.parse(JSON.stringify(S.extra[k]));if(x.db!=null)x.db-=(x.wear||0)*c;layers[k]=x;}
  /* MUSIC: sparse, and only when asked for */
  if(m.music>.03)layers.music={t:'atmos',g:'room',label:'MUSIC',amt:m.music,db:-37+7*m.music,send:1.3};
  /* UNEASE: beating partials, movement below hearing */
  if(U>.05)layers.unease={t:'beat',g:'room',label:'UNEASE',u:U,send:.6};
  /* EVENTS: the scene's own, then condition / liminal / unease reshape them */
  const evs=[];const evRate=lerp(1,.85,L);
  for(const e of S.events||[]){const x=JSON.parse(JSON.stringify(e));const D=EVDEF[x.type]||{};x.min=(x.min||D.min||300)*(1-.5*L)/evRate;x.max=(x.max||D.max||1200)*(1+.25*L)/evRate;
    if(x.fixed){evs.push(x);continue;}const cls=x.cls||D.cls;if(x.actPow==null)x.actPow={decay:.1,unease:.1,mech:.6}[cls]||1;if(cls==='ui'&&x.args.kind==='failing')x.actPow=.15;if(cls==='ui'&&x.args.kind!=='failing'){x.min/=Math.max(.15,Math.pow(1-c,1.5));x.max/=Math.max(.15,Math.pow(1-c,1.5));if(c>.6&&r()<c){x.args.kind='failing';x.actPow=.15;}}
    if(x.type==='door'&&c>.5&&r()<c)x.args.preset=r()<.5?'broken':'distant';
    if(L>.3)x.dist=x.dist?{near:(x.dist.near||0)*(1-L),mid:x.dist.mid||0,far:(x.dist.far||0)+L}:{mid:1-L,far:L};
    evs.push(x);}
  if(c>.25){evs.push(ev('stress',{},{min:lerp(1800,300,c),max:lerp(3600,1200,c),actPow:.1}),ev('discharge',{},{min:lerp(3600,600,c),max:lerp(7200,2400,c),actPow:.1}),ev('impact',{},{min:1200,max:3600,actPow:.1}));}
  if(c>.5)evs.push(ev('shutdown',{},{min:lerp(5400,1800,c),max:lerp(9000,4000,c),actPow:.1}),ev('alert',{cycles:2,d:[.75,.92]},{min:2400,max:7200,cls:'decay',only:null,quiet:0,actPow:.1}));
  if(L>.2||U>.3)evs.push(ev('ambiguous',{},{min:lerp(3600,900,Math.max(L,U)),max:lerp(7200,2400,Math.max(L,U)),cls:'unease',actPow:.1}));
  if(U>.3)evs.push(ev('silence',{},{min:lerp(3600,900,U),max:lerp(7200,2400,U),actPow:.1}));
  evs.push(ev('alert',{},{})); /* only sounds in ALERT, EMERGENCY and FAILING */
  for(const x of evs){if(x.only===null)x.only=false;}
  if(dna.mode==='mix'&&PRIM.mixtape)layers.mixtape={t:'mixtape',g:'events',label:'MIX',send:0,style:dna.style||S.style||'synthwave',mx:Object.assign({},MX0,dna.mx||{}),scene:dna.scene,seed:dna.seed||1,al:dna.al,arc:dna.arc,total:dna.total,trackList:dna.trackList||null};
  return {name:S.name,mains:dna.era==='60s'?400:60,trim:dna.mode==='mix'?0:S.trim||0,rev,eqLow:Rm.eqLow||0,eqHigh:(Rm.eqHigh||-1.5)-3*c,layers,events:evs,states:STATES,
    gapMul:.3*(1+.3*c)*(1+.5*L),lull:.08+.1*L,lullMul:.5,firstMul:.3,era:dna.era,distBias:Rm.dist+(m.distance-.5)*.4+L*.25};}
/* make() options for a DNA: the macros that change live go in lv */
function opts(dna){const m=Object.assign({},M0,dna.m||{}),act=Math.pow(clamp(m.activity,0,1)/.5,1.3)*(clamp(m.events,0,1)/.5),a=dna.mode==='mix'?clamp((dna.mx||MX0).amb!=null?(dna.mx||MX0).amb:.7,0,1):1; /* MIX: the place sits 8 to 12 dB under the music */ /* MIX: the place sits under the music */
  return {envObj:compile(dna),seed:dna.seed||1,tape:dna.tape||'clean',layerOv:dna.layers||{},eventOv:dna.events||{},
    lv:{hvac:2*m.air*a,machine:2*m.machinery*a,elec:2*m.electronics*a,people:2*m.electronics*a,room:a,events:act*(dna.mode==='mix'?a:1),echo:1,drift:.5+m.age,strange:.05+.4*m.unease}};}
/* after make(): the environment needs to know its era, distance bias and state */
function attach(band,dna,secs){band.setState(dna.state||'normal',secs==null?0:secs);return band;}
const LIVE=['activity','machinery','electronics','air','events'];
/* MUTATE: related variations; LOCK keeps a part as it is */
const LOCKS={engine:['machinery'],air:['air'],electronics:['electronics'],computers:['activity'],events:['events','activity'],room:['roomSize','space','distance'],era:['retro'],condition:['condition','age','instability'],mood:['liminal','unease']};
function mutate(dna,amt,seedFn){const d=JSON.parse(JSON.stringify(dna)),r=RNG((dna.seed||1)^Math.floor(Math.random()*1e9),'mutate'),k=amt==='subtle'?.06:amt==='strong'?.22:amt==='random'?1:.12,lock=d.lock||{};
  const locked=new Set();for(const g in lock)if(lock[g])(LOCKS[g]||[]).forEach(x=>locked.add(x));
  for(const key in M0){if(locked.has(key))continue;d.m[key]=amt==='random'?r():clamp((d.m[key]!=null?d.m[key]:M0[key])+r.pm(k),0,1);}
  if(amt!=='subtle'&&!lock.events&&!lock.computers)d.seed=1+Math.floor(r()*999999);
  if((amt==='strong'||amt==='random')&&!lock.room&&r()<.35)d.room=r.pick(ROOM_IDS);
  if((amt==='strong'||amt==='random')&&!lock.era&&r()<.35)d.era=r.pick(ERA_IDS);
  if(amt==='random'){if(!lock.condition)d.m.condition=Math.pow(r(),1.5);d.m.unease=Math.min(d.m.unease,.6);}
  return d;}
window.LMXS={MX0,SCENES,SCENE_IDS,KEYN,ROOMS,ROOM_IDS,ERAS,ERA_IDS,STATES,STATE_IDS,DOORS,TP_STYLES,TP_MODES,UI_KINDS,M0,LIVE,LOCKS,dnaOf,compile,opts,attach,mutate};
})();
