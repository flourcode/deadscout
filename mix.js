/* Driftnaut · the environment engine (LiminalMix). A place that happens to be running: realistic, ordinary, mostly boring.
   The picture is the degraded transmission; the sound is the believable building. No tape hiss, no retro audio, no horror.
   Every sound here is made live with the Web Audio API: oscillators + noise + filters + slow modulation + probability.
   No recordings, no samples, no impulse responses, no music.

   Signal chain:
     source -> source filters -> source gain -> position (pan, distance) -> group (HVAC, ROOM, MACHINE, ELECTRIC, PEOPLE, EVENTS)
       -> room bus -> room EQ -----------------------------\
       -> reverb send -> algorithmic reverb (combs + allpasses) -> sum -> subtle saturation -> limiter (about -1 dBFS) -> out

   LMX.make(ctx, destination, {env, seed, lv, startAt}) -> place
     place.tick(untilCtxTime)   schedule ahead (call every ~200 ms with currentTime + place.ahead)
     place.set(lv)              change the dials live (levels, event rate, echo, drift, strangeness)
     place.lightAt(t)           the fluorescent tubes' brightness at piece time t (1 = steady), so the picture can flicker with the sound
     place.stop(fade)
   lv = {hvac, room, machine, elec, people, events, echo, drift, strange}: level-type dials are multipliers (1 = as designed),
   events is a rate multiplier, strange is 0..1 (0 realistic, 0.05-0.18 the house style, 1 surreal).

   The seed decides everything: the room's resonances, the motor's pitch, when each event happens and what it sounds like.
   Same environment + same seed = the same hour. */
(function(){
"use strict";
/* starting partway into a piece puts its start before time zero: Web Audio refuses negative times, so every start and
   automation call is clamped to now-or-later (offline renders never ask for one) */
(function(){if(window.__lmxClamp)return;window.__lmxClamp=1;const C=t=>Math.max(0,+t||0);
  for(const S of [AudioScheduledSourceNode.prototype,AudioBufferSourceNode.prototype,OscillatorNode.prototype]){if(Object.prototype.hasOwnProperty.call(S,'start')){const st=S.start;S.start=function(w,...r){return st.call(this,C(w),...r);};}if(Object.prototype.hasOwnProperty.call(S,'stop')){const sp=S.stop;S.stop=function(w){return sp.call(this,C(w));};}}
  const A=AudioParam.prototype;for(const k of ['setValueAtTime','linearRampToValueAtTime','exponentialRampToValueAtTime','cancelScheduledValues'])((f)=>{A[k]=function(v,t){return k==='cancelScheduledValues'?f.call(this,C(v)):f.call(this,v,C(t));};})(A[k]);
  const tg=A.setTargetAtTime;A.setTargetAtTime=function(v,t,c){return tg.call(this,v,C(t),c);};const vc=A.setValueCurveAtTime;A.setValueCurveAtTime=function(v,t,d){return vc.call(this,v,C(t),d);};})();
const db=x=>Math.pow(10,x/20),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* ---------- seeded randomness: one stream per part, so parts don't disturb each other ---------- */
function prng(a){a>>>=0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function RNG(seed,name){let h=2166136261^(seed>>>0);for(let i=0;i<name.length;i++)h=Math.imul(h^name.charCodeAt(i),16777619);const r=prng(h>>>0);
  r.range=(a,b)=>a+(b-a)*r();r.int=(a,b)=>Math.floor(a+(b-a+1)*r());r.pick=a=>a[Math.floor(r()*a.length)];r.pm=x=>(r()*2-1)*x;r.v=x=>Array.isArray(x)?r.range(x[0],x[1]):x;return r;}
/* ---------- shared noise: made once per audio context, long and seamless so the loop never shows ---------- */
const BUF=new WeakMap();
function noises(ctx){let n=BUF.get(ctx);if(n)return n;const sr=ctx.sampleRate,r=prng(90210);
  const mk=(sec,gen,rate)=>{rate=rate||sr;const len=Math.floor(rate*sec),X=Math.floor(rate*.5),raw=new Float32Array(len+X);gen(raw);
    const b=ctx.createBuffer(1,len,rate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=i<X?raw[i]*(i/X)+raw[len+i]*(1-i/X):raw[i]; /* crossfaded seam */
    if(rate===sr){let s=0;for(let i=0;i<len;i++)s+=d[i]*d[i];const k=.25/Math.sqrt(s/len);for(let i=0;i<len;i++)d[i]*=k;}return b;};
  const white=d=>{for(let i=0;i<d.length;i++)d[i]=r()*2-1;};
  const pink=d=>{let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;for(let i=0;i<d.length;i++){const w=r()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=b0+b1+b2+b3+b4+b5+b6+w*.5362;b6=w*.115926;}};
  const brown=d=>{let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(r()*2-1))/1.02;d[i]=l;}};
  /* control curves: smooth random wandering, one new value a second (playbackRate sets the speed) */
  const CR=3000,ctrl=pw=>d=>{const pts=[];for(let i=0;i<=Math.ceil(d.length/CR)+1;i++)pts.push(r()*2-1);for(let i=0;i<d.length;i++){const k=i/CR,j=Math.floor(k),f=k-j,s=(1-Math.cos(f*Math.PI))/2,v=pts[j]*(1-s)+pts[j+1]*s;d[i]=pw?Math.pow((v+1)/2,pw):v;}};
  n={white:mk(19.37,white),pink:mk(27.13,pink),brown:mk(31.71,brown),ctrl:mk(240,ctrl(0),CR),ctrlp:mk(240,ctrl(2),CR),ctrls:mk(240,ctrl(6),CR)};
  BUF.set(ctx,n);return n;}
/* predicted power of a noise through a chain of biquads, so every layer can be set straight to its level in dB */
function noisePSD(type,f,sr){const ny=sr/2;if(type==='white')return .0625/ny;
  if(type==='pink'){const C=.0625/(1+Math.log(ny/8.7));return C/Math.max(f,8.7);}
  const a=1/1.02,w=2*Math.PI*f/sr;return .0625*(1-a*a)/(1-2*a*Math.cos(w)+a*a)*2/sr;}
const GRID=(()=>{const f=[];for(let i=0;i<240;i++)f.push(5*Math.pow(24000/5,i/239));return new Float32Array(f);})();
function predictPower(ctx,type,filters){const n=GRID.length,mag=new Float32Array(n),ph=new Float32Array(n),acc=new Float32Array(n).fill(1);
  for(const F of filters){F.getFrequencyResponse(GRID,mag,ph);for(let i=0;i<n;i++)acc[i]*=mag[i]*mag[i];}
  let P=0;const ratio=GRID[1]/GRID[0];for(let i=0;i<n;i++){if(GRID[i]>ctx.sampleRate/2)break;P+=noisePSD(type,GRID[i],ctx.sampleRate)*acc[i]*GRID[i]*(ratio-1);}return P;}
/* ---------- little helpers ---------- */
function bq(c,type,f,Q,g){const b=c.createBiquadFilter();b.type=type;b.frequency.value=f;if(Q!=null)b.Q.value=Q;if(g!=null)b.gain.value=g;return b;}
function perc(p,t,peak,att,dec){p.setValueAtTime(1e-4,t);p.exponentialRampToValueAtTime(Math.max(2e-4,peak),t+att);p.exponentialRampToValueAtTime(1e-4,t+att+dec);}
function nsrc(E,type,r,rate){const s=E.ctx.createBufferSource();s.buffer=E.N[type];s.loop=true;if(rate)s.playbackRate.value=rate;s.start(E.t0,r()*s.buffer.duration*.95);E.srcs.push(s);return s;}
/* wander: a smooth random curve added to an AudioParam (depth in the param's units, speed ~ changes per second) */
function wander(E,param,depth,speed,r,kind){const c=E.ctx,s=c.createBufferSource();s.buffer=E.N[kind||'ctrl'];s.loop=true;s.playbackRate.value=Math.max(.001,speed);s.start(E.t0,r()*s.buffer.duration*.95);
  const g=c.createGain();g.gain.value=depth;s.connect(g).connect(param);E.srcs.push(s);return g;}

/* ======================================================================================================
   CONTINUOUS PRIMITIVES. Each returns {out (mono or stereo node), fx (a gain the events may touch), tick?}
   and is routed by layer(): out -> level/drift gain -> fx -> group dry + reverb send.
   ====================================================================================================== */
/* noise beds: HVAC rumble, air in the ducts, room tone, wind, water, crackle, phone line. Levels in dB RMS per channel. */
function pNoise(E,L,r){const c=E.ctx,n=L.width?2:1,sum=c.createGain();let P=0;const lps=[],bps=[],moves=[];
  const peaks=[];if(L.peaks){const pool=L.peaks.f.slice(),k=r.int(L.peaks.n[0],L.peaks.n[1]);for(let i=0;i<k&&pool.length;i++){const f=pool.splice(Math.floor(r()*pool.length),1)[0];peaks.push([r.v(f),r.v(L.peaks.db||[4,8]),r.v(L.peaks.q||[5,9])]);}}
  const hp=L.hp?r.v(L.hp):0,lp=L.lp?r.v(L.lp):0,bpf=L.bp?r.v(L.bp[0]):0;
  for(let i=0;i<n;i++){const s=nsrc(E,L.noise||'pink',r,L.rate);let x=s;const fl=[];
    const add=f=>{fl.push(f);x.connect(f);x=f;return f;};
    if(hp){add(bq(c,'highpass',hp,.707));if(L.steep)add(bq(c,'highpass',hp,.707));}
    if(lp){lps.push(add(bq(c,'lowpass',lp,.707)));if(L.steep)lps.push(add(bq(c,'lowpass',lp,.707)));}
    if(bpf)bps.push(add(bq(c,'bandpass',bpf,L.bp[1])));
    for(const [f,g,q] of peaks)E.peaks.push(add(bq(c,'peaking',f,q,g)));
    if(L.eqMove)moves.push(add(bq(c,'peaking',r.range(250,1800),1.1,0)));
    const pn=c.createStereoPanner();pn.pan.value=n===2?(i?1:-1)*L.width:(L.pan!=null?r.v(L.pan):0);x.connect(pn).connect(sum);
    if(i===0)P=predictPower(c,L.noise||'pink',fl);}
  sum.gain.value=db(L.db)/Math.sqrt(Math.max(1e-12,P*.5*n));
  const out=c.createGain();sum.connect(out);
  if(L.amp){const d=db(r.v(L.amp.db))-1;out.gain.value=1;wander(E,out.gain,d,r.v(L.amp.rate),r);wander(E,out.gain,d*.5,r.v(L.amp.rate)*2.7,r);}
  if(L.pulse){out.gain.value=L.pulse.base;wander(E,out.gain,L.pulse.depth,r.v(L.pulse.rate),r,L.pulse.kind||'ctrlp');}
  if(L.flt&&lps.length){const pct=r.v(L.flt.pct),sp=r.v(L.flt.rate);for(const f of lps)wander(E,f.frequency,f.frequency.value*pct,sp,r);}
  if(L.bpMod&&bps.length){const pct=r.v(L.bpMod.pct),sp=r.v(L.bpMod.rate);for(const f of bps)wander(E,f.frequency,f.frequency.value*pct,sp,r);}
  for(const m of moves){wander(E,m.gain,3+E.lv0.strange*6,.004,r);wander(E,m.frequency,m.frequency.value*.4,.003,r);E.moves.push(m);}
  return {out};}
/* mains hum: a fundamental and quickly falling harmonics, each a hair off and slowly breathing. Levels in dB RMS per channel. */
function pHum(E,L,r){const c=E.ctx,out=c.createGain(),f0=L.f0?r.v(L.f0):E.mains,H=L.harm||[-40,-45,-52,-59,-64],det=L.det||[.05,.3];
  H.forEach((d,i)=>{if(d==null)return;const o=c.createOscillator();o.frequency.value=f0*(i+1)+r.pm(r.range(det[0],det[1]));const g=c.createGain();g.gain.value=2*db(d);
    wander(E,g.gain,g.gain.value*.12,r.range(.01,.04),r);o.connect(g).connect(out);o.start(E.t0);E.srcs.push(o);E.humOsc.push(o);});
  if(L.buzz!=null){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f0*2+r.pm(.1);const f=bq(c,'lowpass',L.buzzLp||900,.9),g=c.createGain();g.gain.value=2*db(L.buzz);
    o.connect(f).connect(g).connect(out);o.start(E.t0);E.srcs.push(o);}
  return {out};}
/* fluorescent tubes: 2x mains, the tube buzz, and a ballast whine or two that drift. Flicker events dip these (and the picture). */
function pFluor(E,L,r){const c=E.ctx,out=c.createGain(),f0=E.mains;
  const s=c.createOscillator();s.frequency.value=f0*2+r.pm(.15);const sg=c.createGain();sg.gain.value=2*db(L.hum2||-50);s.connect(sg).connect(out);s.start(E.t0);E.srcs.push(s);
  const z=c.createOscillator();z.type='sawtooth';z.frequency.value=f0*2+r.pm(.1);const zh=bq(c,'highpass',350,.7),zl=bq(c,'lowpass',2600,.7),zg=c.createGain();zg.gain.value=2*db(L.buzz||-56);
  z.connect(zh).connect(zl).connect(zg).connect(out);z.start(E.t0);E.srcs.push(z);wander(E,zg.gain,zg.gain.value*.3,.02,r);
  (L.whines||[[2200,4800,-51],[6000,9500,-57]]).forEach((w,i)=>{if(i&&r()<.4)return;const o=c.createOscillator(),f=r.range(w[0],w[1]);o.frequency.value=f;const g=c.createGain();g.gain.value=2*db(w[2]+r.pm(3));
    o.connect(g).connect(out);o.start(E.t0);E.srcs.push(o);E.drift.push({param:o.frequency,base:f,abs:[5,30],per:[5,30],tc:4,r:RNG(E.seed,'whine'+i+L.key)});});
  return {out,fluor:true};}
/* a motor: escalator, moving walkway, pool pump, a refrigerator compressor, a fan's blade tone. */
function pMotor(E,L,r){const c=E.ctx,out=c.createGain(),f0=L.f0d&&r()<.4?L.f0d:r.v(L.f0||56);
  const tone=c.createGain(),tl=bq(c,'lowpass',L.toneLp||700,.7);tone.connect(tl).connect(out);const oscs=[];
  for(const [m,d] of (L.harm||[[1,-34],[2,-37],[3,-44],[4,-49],[6,-55]])){const o=c.createOscillator();o.frequency.value=f0*m+r.pm(.08);const g=c.createGain();g.gain.value=2*db(d);
    wander(E,g.gain,g.gain.value*.1,r.range(.02,.06),r);o.connect(g).connect(tone);o.start(E.t0);E.srcs.push(o);oscs.push([o,f0*m]);}
  if(L.noise){const s=nsrc(E,'pink',r);const fl=[bq(c,'highpass',L.noise[0],.7),bq(c,'lowpass',L.noise[1],.7)];const pool=(L.res||[]).slice(),k=pool.length?r.int(2,Math.min(3,pool.length)):0;
    for(let i=0;i<k;i++){const f=pool.splice(Math.floor(r()*pool.length),1)[0];fl.push(bq(c,'peaking',f*(1+r.pm(.04)),r.range(6,10),r.range(5,9)));}
    let x=s;for(const f of fl){x.connect(f);x=f;}const g=c.createGain();g.gain.value=db(L.ndb||-40)/Math.sqrt(Math.max(1e-12,predictPower(c,'pink',fl)*.5));x.connect(g).connect(out);
    wander(E,g.gain,g.gain.value*.15,.03,r);}
  const M={out,oscs,f0,r,pitch:1,blip:0,nextDrift:r.range(60,240),nextBlip:r.range(30,180)};
  /* step / chain rhythm: tiny filtered-noise ticks at about 1.3 per second, never quite on the grid */
  let pulseBus=null,P=null;if(L.pulse){P=L.pulse;pulseBus=c.createGain();pulseBus.connect(out);const bp=bq(c,'bandpass',800,3);M.pk=db(P.db||-32)/(3*Math.sqrt(predictPower(c,'white',[bp])*.5));
    M.rate=P.rated&&r()<.5?P.rated:r.v(P.rate);M.next=r.range(0,1/M.rate);M.gnext=M.next+.37/M.rate;M.pulseR=RNG(E.seed,'pulse'+L.key);M.acc=r.int(3,7);M.step=0;}
  function thump(t,amp){const pr=M.pulseR,o=c.createOscillator(),g=c.createGain(),f=pr.range(55,85);o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.8,t+.12);perc(g.gain,t,db(P.db||-30)*amp,.006,pr.range(.08,.16));
    const z=c.createBufferSource();z.buffer=E.N.pink;z.start(t,pr()*25,.2);const zl=bq(c,'lowpass',pr.range(350,700),.7),zg=c.createGain();perc(zg.gain,t,db((P.db||-30)-4)*amp*pr.range(.3,1),.01,pr.range(.08,.18));
    o.connect(g).connect(pulseBus);z.connect(zl).connect(zg).connect(pulseBus);o.start(t);o.stop(t+.25);o.onended=()=>{o.disconnect();g.disconnect();z.disconnect();zl.disconnect();zg.disconnect();};}
  function click(t,amp){if(P.kind==='thump')return thump(t,amp);const s=c.createBufferSource();s.buffer=E.N.white;const pr=M.pulseR,len=pr.v(P.len||[.02,.06]);s.start(t,pr()*18,len+.02);
    const f=bq(c,'bandpass',pr.v(P.fc||[450,1100]),3),g=c.createGain();perc(g.gain,t,M.pk*amp,.002,len);s.connect(f).connect(g).connect(pulseBus);
    s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
  /* cycling machines (a fridge compressor) switch on and off with a clunk */
  if(L.cycle){M.on=L.cycle.startOn||r()<.5;M.nextCycle=r.range(20,L.cycle.on[1]);out.gain.value=M.on?1:0;}
  M.tick=(up)=>{const st=E.lv.strange,dr=E.lv.drift;
    {/* the past is not scheduled: after a skip, a long stall or a resume, every counter is moved past the clock without creating a node
        (r22 fired every missed pulse at once). The same draws are made from the same RNGs, so the seed stays honest. */
      const lo=ctx.currentTime-E.t0-.1;while(M.nextDrift<lo){r.pm(r.range(.0015,.006));if(st>.15)r.pm(.01*st);M.nextDrift+=r.range(120,420);}
      while(M.nextBlip<lo){if(dr>0){r.pm(r.range(.004,.015));r.range(.5,3);}M.nextBlip+=r.range(60,240)/Math.max(.5,dr||1);}
      if(P){const jit=r.v(P.jit||[.01,.04])*(1+st*8);while(M.next<lo){if(!L.cycle||M.on){M.step++;M.pulseR.pm(.25);}M.next+=(1/M.rate)*(1+M.pulseR.pm(jit));}
        if(st>.15)while(M.gnext<lo)M.gnext+=(1/(M.rate*(1+.01+st*.03)))*(1+M.pulseR.pm(jit));else M.gnext=M.next;}
      if(L.cycle)while(M.nextCycle<lo){M.on=!M.on;out.gain.setTargetAtTime(M.on?1:0,ctx.currentTime,.01);M.nextCycle+=M.on?r.v(L.cycle.on):r.v(L.cycle.off);}}
    while(M.nextDrift<up){const t=E.t0+M.nextDrift;M.pitch=1+r.pm(r.range(.0015,.006))*dr+(st>.15?r.pm(.01*st):0);for(const [o,f] of oscs)o.frequency.setTargetAtTime(f*M.pitch,t,30);M.nextDrift+=r.range(120,420);}
    while(M.nextBlip<up){const t=E.t0+M.nextBlip;if(dr>0){const k=1+r.pm(r.range(.004,.015)),d=r.range(.5,3);for(const [o,f] of oscs){o.frequency.setTargetAtTime(f*M.pitch*k,t,.15);o.frequency.setTargetAtTime(f*M.pitch,t+d,.4);}}
      M.nextBlip+=r.range(60,240)/Math.max(.5,dr||1);} /* occasional: a small mechanical shift every 1-4 minutes */
    if(P){const jit=r.v(P.jit||[.01,.04])*(1+st*8);
      while(M.next<up){if(!L.cycle||M.on){M.step++;const a=(M.step%M.acc===0?1.25:1)*(1+M.pulseR.pm(.25));click(E.t0+M.next,a);}M.next+=(1/M.rate)*(1+M.pulseR.pm(jit));}
      if(st>.15)while(M.gnext<up){click(E.t0+M.gnext,.45);M.gnext+=(1/(M.rate*(1+.01+st*.03)))*(1+M.pulseR.pm(jit));}else M.gnext=M.next;}
    if(L.cycle)while(M.nextCycle<up){const t=E.t0+M.nextCycle;M.on=!M.on;out.gain.setTargetAtTime(M.on?1:0,t,M.on?.6:.9);EV.clunk(E,t,{args:{d:[.35,.6]}},r);
      M.nextCycle+=M.on?r.v(L.cycle.on):r.v(L.cycle.off);}};
  return M;}
/* far-off people: a murmur you can't make out */
function pCrowd(E,L,r){const c=E.ctx,s=nsrc(E,'pink',r),sum=c.createGain(),lp=bq(c,'lowpass',L.lp||1600,.7);let P=0;
  [[300,1.4,1],[900,1.6,.7],[2000,2,.35]].forEach(([f,q,a])=>{const b=bq(c,'bandpass',f*(1+r.pm(.1)),q),g=c.createGain();g.gain.value=a;s.connect(b).connect(g).connect(sum);wander(E,b.frequency,f*.25,r.range(1.5,3),r);P+=a*a*predictPower(c,'pink',[b,lp]);});
  sum.connect(lp);const out=c.createGain();out.gain.value=db(L.db)/Math.sqrt(P*.5);lp.connect(out);const o2=c.createGain();out.connect(o2);wander(E,o2.gain,.3,r.range(3,5),r);wander(E,out.gain,out.gain.value*.4,.01,r);return {out:o2};}
/* crickets outside: a few of them, each chirping at its own pace, sometimes resting */
function pCrickets(E,L,r){const c=E.ctx,out=c.createGain(),n=r.int((L.n||[2,4])[0],(L.n||[2,4])[1]);
  const C=[...Array(n)].map((_,i)=>{const p=c.createStereoPanner();p.pan.value=r.pm(.8);const lp=bq(c,'lowpass',r.range(5000,8000),.7);p.connect(lp).connect(out);
    return {p,f:r.range(3900,5200),k:r.int(2,5),pr:r.range(24,36),iv:r.range(.55,1.5),a:db(L.db+r.pm(4)),next:r.range(0,2),rest:0};});
  return {out,tick(up){for(const k of C)while(k.next<up){const t=E.t0+k.next;
    if(k.next<k.rest){k.next=k.rest;continue;}if(r()<.01){k.rest=k.next+r.range(5,40);k.next=k.rest;continue;}
    const o=c.createOscillator(),g=c.createGain();o.frequency.value=k.f*(1+r.pm(.004));g.gain.setValueAtTime(0,t);
    for(let j=0;j<k.k;j++){const a=t+j/k.pr;g.gain.setTargetAtTime(k.a,a,.002);g.gain.setTargetAtTime(0,a+.45/k.pr,.003);}
    o.connect(g).connect(k.p);o.start(t);o.stop(t+k.k/k.pr+.05);o.onended=()=>{o.disconnect();g.disconnect();};k.next+=k.iv*(1+r.pm(.08));}}};}
const PRIM={noise:pNoise,hum:pHum,fluor:pFluor,motor:pMotor,crowd:pCrowd,crickets:pCrickets};

/* ======================================================================================================
   EVENTS. One-shots built from oscillators and noise, placed in the room: distance = less level, less top,
   more reverb, softer attack. Each returns its length in seconds and cleans up after itself.
   ====================================================================================================== */
function place(E,t,o,r){const c=E.ctx,st=E.lv.strange,K=E.cur||{};let d=K.d?r.v(K.d):r.v(o.d||[.6,.9]),pan=r.pm(o.panR!=null?o.panR:.7);if(K.side!=null)pan=clamp(K.side*r.range(.35,.9)+r.pm(.15),-1,1);d=clamp(d+(E.distBias||0),0,.97);pan*=1-.35*d; /* far sounds sit narrower */
  const dLevel=d;if(st>0&&r()<st*.5){d=r.range(0,.25);pan=r.pm(.95);} /* strangeness: a sound turns up somewhere a room wouldn't put it: close and dry, but never louder */
  const lp=bq(c,'lowpass',(o.lp||5000)*Math.pow(700/5000,d),.5),g=c.createGain(),p=c.createStereoPanner(),s=c.createGain(),G=E.grp[o.grp||'events'];
  g.gain.value=db(-16*dLevel)*(d<dLevel?db(-6*(dLevel-d)):1);p.pan.value=clamp(pan,-1,1);s.gain.value=Math.min(1.4,(.15+.85*d)*(o.send||1));lp.connect(g).connect(p);p.connect(G.dry);p.connect(s).connect(G.wet);
  const b={c,t,d,r,n:[lp,g,p,s],end:t,last:null,in:lp,pan:p,
    reg(x,stop){b.n.push(x);if(stop>=b.end){b.end=stop;b.last=x;}return x;},
    osc(type,f,a,z){const x=c.createOscillator();x.type=type;x.frequency.setValueAtTime(f,a);x.start(a);x.stop(z);return b.reg(x,z);},
    noise(type,a,z){const x=c.createBufferSource();x.buffer=E.N[type];x.loop=true;x.start(a,r()*x.buffer.duration*.9);x.stop(z);return b.reg(x,z);},
    gain(v){const x=c.createGain();x.gain.value=v||0;b.n.push(x);return x;},
    filt(type,f,Q,gn){const x=bq(c,type,f,Q,gn);b.n.push(x);return x;},
    done(){const n=b.n;if(b.last)b.last.onended=()=>{for(const x of n)try{x.disconnect();}catch(e){}};return b.end-t;}};
  return b;}
const A=s=>s.args||{};
const EV={
  /* an elevator or store ding: two partials, the upper one quieter; airport and station chimes play a short sequence */
  ding(E,t,s,r){const P=A(s),st=E.lv.strange,b=place(E,t,{d:P.d||[.45,.8],send:1.3},r);
    let seq=P.seqs?r.pick(P.seqs):[r.pick(P.f||[880,740,660])];const det=Math.pow(2,r.pm(st*.6)/12)*(st>.5&&r()<st*.5?Math.pow(2,-r.range(1,5)*st/12):1),ratio=(P.ratio||1.5)*(1+r.pm(.02*st));
    seq.forEach((f0,i)=>{const ti=t+i*(P.gap||.55),att=r.range(.005,.015),dec=r.range(.7,1.8)*(P.long||1),a=db(r.range(-24,-18)),f=f0*det;
      const o1=b.osc('sine',f,ti,ti+att+dec+.05),g1=b.gain();perc(g1.gain,ti,a,att,dec);o1.connect(g1).connect(b.in);
      const o2=b.osc(r()<.5?'sine':'triangle',f*ratio,ti,ti+att+dec*.8+.05),g2=b.gain();perc(g2.gain,ti,a*db(-r.range(5,10)),att,dec*.8);o2.connect(g2).connect(b.in);});
    return b.done();},
  /* a door somewhere: a low body, a noise crack, maybe a metal latch, and the room */
  slam(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.62,.92],send:1.3},r),soft=P.soft?.5:1;
    const f=r.range(70,110),dur=r.range(.08,.18),o=b.osc('sine',f,t,t+dur+.05),g=b.gain();o.frequency.exponentialRampToValueAtTime(f*.65,t+dur);perc(g.gain,t,db(-6)*soft,.003,dur);o.connect(g).connect(b.in);
    const n=b.noise('white',t,t+.2),h=b.filt('highpass',180,.7),l=b.filt('lowpass',1400*soft,.7),ng=b.gain();perc(ng.gain,t,db(-12)*soft,.002,r.range(.05,.14));n.connect(h).connect(l).connect(ng).connect(b.in);
    if(r()<.5){const m=r.range(700,1800);for(const k of [1,1.47]){const x=b.osc('sine',m*k,t+.005,t+.4),xg=b.gain();perc(xg.gain,t+.005,db(-30)*soft,.002,r.range(.1,.35));x.connect(xg).connect(b.in);}}
    if(r()<.35){const t2=t+r.range(.06,.12),o2=b.osc('sine',f*.9,t2,t2+.12),g2=b.gain();perc(g2.gain,t2,db(-16)*soft,.003,.07);o2.connect(g2).connect(b.in);}
    return b.done();},
  /* something dropped, far away */
  impact(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.7,.95],lp:r.range(800,2500)*2},r),dur=r.range(.08,.45);
    const lo=b.osc('sine',r.range(50,130),t,t+dur+.05),lg=b.gain();perc(lg.gain,t,db(-8),.003,dur);lo.connect(lg).connect(b.in);
    const mi=b.osc('triangle',r.range(180,700),t,t+dur*.6+.05),mg=b.gain();perc(mg.gain,t,db(-18),.002,dur*.5);mi.connect(mg).connect(b.in);
    const n=b.noise('pink',t,t+dur+.1),h=b.filt('highpass',150,.7),l=b.filt('lowpass',2500,.7),ng=b.gain();perc(ng.gain,t,db(-10),.002,dur*.6);n.connect(h).connect(l).connect(ng).connect(b.in);
    if(r()<.4){const t2=t+r.range(.12,.3),o=b.osc('sine',r.range(60,140),t2,t2+.15),g=b.gain();perc(g.gain,t2,db(-17),.003,.09);o.connect(g).connect(b.in);}
    return b.done();},
  /* someone walking, a long way off */
  steps(E,t,s,r){const P=A(s),n=r.int(2,12),pace=r.range(1.4,2.2),b=place(E,t,{d:P.d||[.78,.95],lp:P.soft?1400:2600,send:1.1,grp:'people'},r);
    const p0=b.pan.pan.value,p1=clamp(p0+r.pm(.5),-.8,.8);b.pan.pan.setValueAtTime(p0,t);b.pan.pan.linearRampToValueAtTime(p1,t+n/pace);
    for(let i=0;i<n;i++){const ti=t+i/pace*(1+r.pm(.05)),a=db(r.range(-14,-9))*(.5+.5*Math.sin(Math.PI*(i+.5)/n)),du=r.range(.03,.09);
      const o=b.osc('sine',r.range(70,160),ti,ti+du+.03),g=b.gain();perc(g.gain,ti,a,.004,du);o.connect(g).connect(b.in);
      const z=b.noise('pink',ti,ti+.1),f=b.filt('bandpass',r.range(250,1400),1.2),zg=b.gain();perc(zg.gain,ti,a*(P.soft?.3:.8),.002,r.range(.02,.08));z.connect(f).connect(zg).connect(b.in);}
    return b.done();},
  /* the PA: speech-shaped, never speech. A voice-like buzz and breath through moving formants, in syllable-sized puffs */
  pa(E,t,s,r){const P=A(s),st=E.lv.strange,dur=r.range(3,12)*(1+st*r.range(0,1.5)),b=place(E,t,{d:P.d||[.65,.9],panR:.5,lp:3200,send:1.35,grp:'people'},r);let tv=t;
    if(P.chime&&r()<.5){const f=r.pick([523,587,659]);[[f,0],[f*.8,.45]].forEach(([q,dt])=>{const o=b.osc('sine',q,t+dt,t+dt+1.3),g=b.gain();perc(g.gain,t+dt,db(-22),.008,1.1);o.connect(g).connect(b.in);});tv=t+1.3;}
    const end=tv+dur,slow=st>.5?.7:1,f0=r.range(105,190)*slow,v=b.osc('sawtooth',f0,tv,end+.3),z=b.noise('pink',tv,end+.3),mix=b.gain(1),vg=b.gain(.35),zg=b.gain(P.radio?1.2:.8);
    v.connect(vg).connect(mix);z.connect(zg).connect(mix);const sum=b.gain(1),syl=b.gain(0),h=b.filt('highpass',P.radio?400:250,.7),l=b.filt('lowpass',P.radio?2600:3200,.7);
    const F=[[250,500,4,1],[700,1200,6,.7],[1500,2500,7,.4]].map(([a,z2,q,k])=>{const f=b.filt('bandpass',(a+z2)/2,q),g=b.gain(k);mix.connect(f).connect(g).connect(sum);return [f,a,z2];});
    sum.connect(syl).connect(h).connect(l).connect(b.in);
    for(let tt=tv;tt<end;tt+=r.range(.07,.15)/slow)for(const [f,a,z2] of F)f.frequency.setTargetAtTime(r.range(a,z2),tt,.03);
    for(let tt=tv;tt<end;tt+=r.range(.25,.6))v.frequency.setTargetAtTime(f0*Math.pow(2,r.pm(3)/12),tt,.08);
    const amp=db(-6);syl.gain.setValueAtTime(0,tv);let tt=tv+.05;
    while(tt<end){if(r()<.12){tt+=r.range(.2,.5);continue;}const len=1/(r.range(3,7)*slow),pk=r.range(.5,1)*amp;syl.gain.setTargetAtTime(pk,tt,.025);syl.gain.setTargetAtTime(pk*.12,tt+len*.55,.04);tt+=len;}
    syl.gain.setTargetAtTime(0,end,.06);return b.done();},
  /* the building settling: a slow bending tone that sticks and slips. With low f it's a metal hull groaning */
  creak(E,t,s,r){const P=A(s),dur=r.v(P.dur||[.4,2.2]),fr=P.f||[180,900],f0=r.v(fr),f1=clamp(f0*r.range(.6,1.5),fr[0],fr[1]),b=place(E,t,{d:P.d||[.55,.9],send:1.2},r);
    const o=b.osc('triangle',f0,t,t+dur+.1);o.frequency.exponentialRampToValueAtTime(f1,t+dur);const bp=b.filt('bandpass',f0*2,4),g=b.gain(0),ss=b.gain(1);
    const a=db(P.f?-10:-16);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+dur*.2);g.gain.setValueAtTime(a,t+dur*.75);g.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(bp);o.connect(g);bp.connect(g);g.connect(ss).connect(b.in);
    const cs=E.ctx.createBufferSource();cs.buffer=E.N.ctrlp;cs.loop=true;cs.playbackRate.value=r.range(15,40);cs.start(t,r()*200);cs.stop(t+dur+.1);b.reg(cs,t+dur+.1);const cg=b.gain(-.8);ss.gain.value=.6;cs.connect(cg).connect(ss.gain);
    const z=b.noise('pink',t,t+dur+.1),zf=b.filt('bandpass',f0,8),zg=b.gain(a*.5);zf.frequency.exponentialRampToValueAtTime(f1,t+dur);z.connect(zf).connect(zg).connect(ss);
    return b.done();},
  drip(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.4,.85],send:1.3},r),f=r.range(700,1900),dec=r.range(.06,.16);
    const o=b.osc('sine',f,t,t+dec+.05),g=b.gain();o.frequency.exponentialRampToValueAtTime(f*r.range(1.3,1.9),t+.025);perc(g.gain,t,db(-16),.002,dec);o.connect(g).connect(b.in);return b.done();},
  beep(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.3,.6],send:.9},r),k=r.int(1,3),f=r.pick(P.f||[1200,1600,2000,880]);
    for(let i=0;i<k;i++){const ti=t+i*.24,o=b.osc('sine',f*(i&&P.two?1.25:1),ti,ti+.16),g=b.gain();g.gain.setValueAtTime(0,ti);g.gain.linearRampToValueAtTime(db(-22),ti+.006);g.gain.setValueAtTime(db(-22),ti+.11);g.gain.linearRampToValueAtTime(0,ti+.13);o.connect(g).connect(b.in);}
    return b.done();},
  click(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.4,.8],send:.8},r),k=r()<.6?2:1;
    for(let i=0;i<k;i++){const ti=t+i*r.range(.1,.6),z=b.noise('white',ti,ti+.02),h=b.filt('highpass',2000,.7),g=b.gain();perc(g.gain,ti,db(-12),.0008,.006);z.connect(h).connect(g).connect(b.in);
      const o=b.osc('sine',r.range(2000,3200),ti,ti+.03),og=b.gain();perc(og.gain,ti,db(-26),.001,.012);o.connect(og).connect(b.in);}
    return b.done();},
  /* a burst of electrical or radio static */
  static(E,t,s,r){const P=A(s),dur=r.range(.3,2),b=place(E,t,{d:P.d||[.4,.8],send:.8},r),z=b.noise('white',t,t+dur+.05),f=b.filt('bandpass',r.range(1200,3000),.8),g=b.gain(0);
    for(let tt=t;tt<t+dur;tt+=r.range(.02,.06))g.gain.setValueAtTime(r()<.55?db(-22)*r():0,tt);g.gain.setValueAtTime(0,t+dur);z.connect(f).connect(g).connect(b.in);return b.done();},
  /* a printer somewhere down the hall */
  printer(E,t,s,r){const dur=r.range(3,8),b=place(E,t,{d:[.55,.85],send:1},r),rate=r.range(8,14);
    const m=b.osc('sawtooth',r.range(180,320),t,t+dur),ml=b.filt('lowpass',900,.7),mg=b.gain(0);mg.gain.setValueAtTime(0,t);mg.gain.linearRampToValueAtTime(db(-28),t+.3);mg.gain.setValueAtTime(db(-28),t+dur-.4);mg.gain.linearRampToValueAtTime(0,t+dur);m.connect(ml).connect(mg).connect(b.in);
    for(let tt=t+.3;tt<t+dur-.4;tt+=1/rate){if(r()<.15)continue;const z=b.noise('white',tt,tt+.02),f=b.filt('bandpass',r.range(1500,2600),2),g=b.gain();perc(g.gain,tt,db(-16),.001,.012);z.connect(f).connect(g).connect(b.in);}
    return b.done();},
  /* a phone ringing in another office: an electronic trill */
  ring(E,t,s,r){const b=place(E,t,{d:[.78,.93],send:1.1},r),n=r.int(1,3),fa=r.range(1000,1150),fb=fa*1.25;
    for(let i=0;i<n;i++){const ti=t+i*3,o=b.osc('triangle',fa,ti,ti+1.25),g=b.gain(0);for(let k=0;k<20;k++)o.frequency.setValueAtTime(k%2?fb:fa,ti+k/16);
      g.gain.setValueAtTime(0,ti);g.gain.linearRampToValueAtTime(db(-20),ti+.01);g.gain.setValueAtTime(db(-20),ti+1.2);g.gain.linearRampToValueAtTime(0,ti+1.23);o.connect(g).connect(b.in);}
    return b.done();},
  /* a suitcase rolling past, wheels ticking over the tile joints */
  roll(E,t,s,r){const dur=r.range(4,9),b=place(E,t,{d:[.65,.9],send:1,grp:'people'},r),p0=r.pm(.6),p1=-p0*r.range(.5,1);b.pan.pan.setValueAtTime(p0,t);b.pan.pan.linearRampToValueAtTime(p1,t+dur);
    const z=b.noise('brown',t,t+dur),f=b.filt('bandpass',r.range(250,600),1),g=b.gain(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-6),t+dur*.4);g.gain.linearRampToValueAtTime(0,t+dur);z.connect(f).connect(g).connect(b.in);
    const rate=r.range(1.5,3.5);for(let tt=t+.3;tt<t+dur-.3;tt+=1/rate*(1+r.pm(.05))){const a=db(-16)*Math.sin(Math.PI*(tt-t)/dur),o=b.osc('sine',90,tt,tt+.06),og=b.gain();perc(og.gain,tt,a,.002,.03);o.connect(og).connect(b.in);
      if(A(s).rattle)for(let j=0;j<r.int(1,3);j++){const tj=tt+r.range(0,.12),z=b.noise('white',tj,tj+.03),f=b.filt('bandpass',r.range(1200,3200),6),zg=b.gain();perc(zg.gain,tj,a*1.4,.001,r.range(.01,.03));z.connect(f).connect(zg).connect(b.in);}}
    return b.done();},
  /* an aircraft far off, through the glass */
  jet(E,t,s,r){const dur=r.range(20,45),b=place(E,t,{d:[.85,.95],lp:8000,send:.7},r),pk=t+dur*r.range(.35,.5);
    const z=b.noise('brown',t,t+dur),f=b.filt('lowpass',200,.7),g=b.gain(0);f.frequency.setValueAtTime(200,t);f.frequency.linearRampToValueAtTime(600,pk);f.frequency.linearRampToValueAtTime(220,t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-2),pk);g.gain.linearRampToValueAtTime(0,t+dur);z.connect(f).connect(g).connect(b.in);
    const w=b.osc('sine',r.range(2000,3000),t,t+dur),wg=b.gain(0);w.frequency.linearRampToValueAtTime(w.frequency.value*.96,t+dur);wg.gain.setValueAtTime(0,t);wg.gain.linearRampToValueAtTime(db(-36),pk);wg.gain.linearRampToValueAtTime(0,t+dur);w.connect(wg).connect(b.in);
    return b.done();},
  /* air moving: an elevator door, an airlock */
  whoosh(E,t,s,r){const dur=r.range(1,3),b=place(E,t,{d:[.4,.8],send:1},r),z=b.noise('pink',t,t+dur+.05),f=b.filt('bandpass',400,1.5),g=b.gain(0);
    f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(r.range(1400,2200),t+dur*.4);f.frequency.exponentialRampToValueAtTime(300,t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-12),t+dur*.4);g.gain.linearRampToValueAtTime(0,t+dur);z.connect(f).connect(g).connect(b.in);return b.done();},
  clunk(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.4,.7],send:.8},r),o=b.osc('sine',r.range(55,80),t,t+.2),g=b.gain();perc(g.gain,t,db(-12),.003,.15);o.connect(g).connect(b.in);
    const z=b.noise('pink',t,t+.1),f=b.filt('lowpass',400,.7),zg=b.gain();perc(zg.gain,t,db(-18),.002,.08);z.connect(f).connect(zg).connect(b.in);return b.done();},
  /* elevator: a ding, then the doors */
  elevator(E,t,s,r){const a=EV.ding(E,t,{args:{f:[660,740,880],d:[.5,.75]}},r),b=EV.whoosh(E,t+r.range(1,1.8),s,r);return Math.max(a,b+1.4);},
  ice(E,t,s,r){const b=place(E,t,{d:[.55,.8],send:1},r),n=r.int(6,15),span=r.range(.5,1.2);
    for(let i=0;i<n;i++){const ti=t+span*Math.pow(i/n,.7),o=b.osc('sine',r.range(1800,3500),ti,ti+.05),g=b.gain();perc(g.gain,ti,db(-20)*r.range(.4,1),.001,r.range(.015,.04));o.connect(g).connect(b.in);}
    const tt=t+span+.05,o=b.osc('sine',r.range(90,140),tt,tt+.15),g=b.gain();perc(g.gain,tt,db(-14),.003,.1);o.connect(g).connect(b.in);return b.done();},
  /* the on-hold tone, close: it's the line, not the room */
  holdbeep(E,t,s,r){const b=place(E,t,{d:[.02,.08],send:.1,panR:0},r),f=r.pick([480,440,620]),k=r()<.5?2:1;
    for(let i=0;i<k;i++){const ti=t+i*.45,du=r.range(.2,.35),o=b.osc('sine',f,ti,ti+du+.02),g=b.gain(0);g.gain.setValueAtTime(0,ti);g.gain.linearRampToValueAtTime(db(-34),ti+.01);g.gain.setValueAtTime(db(-34),ti+du-.01);g.gain.linearRampToValueAtTime(0,ti+du);o.connect(g).connect(b.in);}
    return b.done();},
  /* a tram going by outside: rumble, rail joints, sometimes a wheel squeal */
  tram(E,t,s,r){const dur=r.range(15,30),b=place(E,t,{d:[.8,.92],lp:6000,send:.8},r),pk=t+dur*r.range(.4,.6),p0=r.pm(.7);b.pan.pan.setValueAtTime(p0,t);b.pan.pan.linearRampToValueAtTime(-p0,t+dur);
    const z=b.noise('brown',t,t+dur),f=b.filt('lowpass',250,.7),g=b.gain(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-4),pk);g.gain.linearRampToValueAtTime(0,t+dur);z.connect(f).connect(g).connect(b.in);
    const bell=tt=>Math.max(0,1-Math.abs(tt-pk)/(dur*.5));for(let tt=t+1;tt<t+dur-1;tt+=1/r.range(.6,1.2))for(const dt of [0,.18]){const a=db(-12)*bell(tt),o=b.osc('sine',r.range(70,100),tt+dt,tt+dt+.08),og=b.gain();perc(og.gain,tt+dt,Math.max(3e-4,a),.003,.05);o.connect(og).connect(b.in);}
    if(r()<.4){const w=b.osc('sine',r.range(2200,3800),pk-2,pk+3),wg=b.gain(0);wg.gain.setValueAtTime(0,pk-2);wg.gain.linearRampToValueAtTime(db(-32),pk);wg.gain.linearRampToValueAtTime(0,pk+3);w.connect(wg).connect(b.in);}
    return b.done();},
  /* fluorescent flicker: a few quick dips in the tubes' hum, and the picture dims with them */
  flicker(E,t,s,r){if(!E.fluor.length)return 0;const k=r.int(2,5);let tt=t;const P=E.t0;
    for(let i=0;i<k;i++){const du=r.range(.04,.18);for(const F of E.fluor){F.fx.gain.setTargetAtTime(.2,tt,.008);F.fx.gain.setTargetAtTime(1,tt+du,.015);}
      E.flicks.push([tt-P,tt-P+du]);EV.tink(E,tt,s,r);tt+=du+r.range(.06,.16);}
    if(E.flicks.length>80)E.flicks.splice(0,E.flicks.length-80);return tt-t;},
  tink(E,t,s,r){const z=E.ctx.createBufferSource();z.buffer=E.N.white;z.start(t,r()*18,.01);const h=bq(E.ctx,'highpass',3000,.7),g=E.ctx.createGain();perc(g.gain,t,db(-44),.0005,.006);
    z.connect(h).connect(g).connect(E.grp.elec.dry);z.onended=()=>{z.disconnect();h.disconnect();g.disconnect();};return .02;},
  /* metal: a short knock and a few inharmonic partials ringing out */
  clank(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.6,.9],send:1.2},r),f=r.range(400,2000),dec=r.range(.2,1.2);
    const z=b.noise('white',t,t+.02),zh=b.filt('highpass',800,.7),zg=b.gain();perc(zg.gain,t,db(-12),.0008,.008);z.connect(zh).connect(zg).connect(b.in);
    [1,2.76,5.4,8.93].forEach((k,i)=>{if(f*k>9000)return;const o=b.osc('sine',f*k*(1+r.pm(.01)),t,t+dec+.05),g=b.gain();perc(g.gain,t,db(-18-i*5),.001,dec/(1+i*.6));o.connect(g).connect(b.in);});
    return b.done();},
  /* an automatic door: the servo sweeps, air hisses, the doors meet */
  autodoor(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.5,.8],send:1},r),dur=r.range(1.5,2.5);
    const m=b.osc('sawtooth',80,t,t+dur),ml=b.filt('lowpass',420,.7),mg=b.gain(0);m.frequency.linearRampToValueAtTime(r.range(130,160),t+dur*.4);m.frequency.linearRampToValueAtTime(90,t+dur);
    mg.gain.setValueAtTime(0,t);mg.gain.linearRampToValueAtTime(db(-26),t+.2);mg.gain.setValueAtTime(db(-26),t+dur-.3);mg.gain.linearRampToValueAtTime(0,t+dur);m.connect(ml).connect(mg).connect(b.in);
    const z=b.noise('pink',t,t+dur),zh=b.filt('highpass',1500,.7),zg=b.gain(0);zg.gain.setValueAtTime(0,t);zg.gain.linearRampToValueAtTime(db(-24),t+dur*.3);zg.gain.linearRampToValueAtTime(0,t+dur);z.connect(zh).connect(zg).connect(b.in);
    const tl=t+dur,o=b.osc('sine',r.range(90,130),tl,tl+.15),og=b.gain();perc(og.gain,tl,db(-16),.003,.08);o.connect(og).connect(b.in);
    return b.done();},
  /* a car or truck going by: a band of road noise sweeping past, the engine dropping in pitch as it passes */
  vehicle(E,t,s,r){const P=A(s),truck=r()<(P.truck||.25),dur=r.range(8,20)*(truck?1.4:1),b=place(E,t,{d:P.d||[.8,.95],lp:7000,send:P.send||.6},r),pk=t+dur*r.range(.4,.6),p0=r.pm(.9);
    b.pan.pan.setValueAtTime(p0,t);b.pan.pan.linearRampToValueAtTime(-p0,t+dur);
    const z=b.noise('brown',t,t+dur),f=b.filt('bandpass',150,.8),g=b.gain(0);f.frequency.setValueAtTime(150,t);f.frequency.exponentialRampToValueAtTime(truck?320:450,pk);f.frequency.exponentialRampToValueAtTime(150,t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(truck?-1:-4),pk);g.gain.linearRampToValueAtTime(0,t+dur);z.connect(f).connect(g).connect(b.in);
    const ef=r.range(45,90)*(truck?.7:1),e=b.osc('sawtooth',ef*1.03,t,t+dur),el=b.filt('lowpass',300,.7),eg=b.gain(0);e.frequency.setTargetAtTime(ef*.97,pk,dur*.05);
    eg.gain.setValueAtTime(0,t);eg.gain.linearRampToValueAtTime(db(truck?-20:-26),pk);eg.gain.linearRampToValueAtTime(0,t+dur);e.connect(el).connect(eg).connect(b.in);
    return b.done();},
  /* plumbing: a knock in the pipes, sometimes two or three */
  plumbing(E,t,s,r){const b=place(E,t,{d:[.5,.85],send:1},r),k=r.int(1,3);let tt=t;
    for(let i=0;i<k;i++){const o=b.osc('sine',r.range(60,140),tt,tt+.2),g=b.gain();perc(g.gain,tt,db(-10-i*3),.003,r.range(.08,.15));o.connect(g).connect(b.in);
      const m=b.osc('sine',r.range(300,700),tt,tt+.2),mg=b.gain();perc(mg.gain,tt,db(-26-i*3),.002,r.range(.05,.12));m.connect(mg).connect(b.in);tt+=r.range(.15,.3);}
    return b.done();},
  /* a gate or a sign rattling: an irregular, decaying cluster of metal ticks */
  rattle(E,t,s,r){const P=A(s),b=place(E,t,{d:P.d||[.5,.85],send:.9},r),n=r.int(5,20),span=r.range(.5,2);
    for(let i=0;i<n;i++){const tt=t+span*Math.pow(r(),.8),a=db(0)*Math.pow(1-(tt-t)/span,1.5)+1e-4,z=b.noise('white',tt,tt+.03),f=b.filt('bandpass',r.range(600,2500),8),g=b.gain();perc(g.gain,tt,a,.001,r.range(.01,.04));z.connect(f).connect(g).connect(b.in);}
    return b.done();},
  /* a tire squeaking on a painted concrete floor */
  squeak(E,t,s,r){const b=place(E,t,{d:[.7,.9],send:1.2},r),dur=r.range(.3,.8),f=r.range(1500,3000),o=b.osc('sine',f,t,t+dur+.05),g=b.gain(0);
    o.frequency.linearRampToValueAtTime(f*r.range(.85,1.1),t+dur);const vb=b.osc('sine',r.range(25,45),t,t+dur),vg=b.gain(f*.015);vb.connect(vg).connect(o.frequency);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-10),t+.04);g.gain.linearRampToValueAtTime(0,t+dur);o.connect(g).connect(b.in);return b.done();},
  /* cicadas swelling up in the dark, then fading */
  insect(E,t,s,r){const b=place(E,t,{d:[.5,.8],send:.4,lp:9000},r),dur=r.range(5,12),z=b.noise('white',t,t+dur),f=b.filt('bandpass',r.range(4000,6000),4),am=b.gain(0),g=b.gain(0);
    const lfo=b.osc('square',r.range(40,70),t,t+dur),lg=b.gain(.5);lfo.connect(lg).connect(am.gain);am.gain.value=.5;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-12),t+dur*.45);g.gain.linearRampToValueAtTime(0,t+dur);z.connect(f).connect(am).connect(g).connect(b.in);return b.done();},
  /* a washer spinning off balance: heavy thumps speeding up, then it settles */
  imbalance(E,t,s,r){const b=place(E,t,{d:[.5,.8],send:.8},r),n=r.int(6,16),r0=r.range(1.3,1.8),r1=r.range(3,4.5);let tt=t;
    for(let i=0;i<n;i++){const k=i/n,o=b.osc('sine',r.range(50,80),tt,tt+.2),g=b.gain();perc(g.gain,tt,db(-14)*(.6+.4*k),.005,.12);o.connect(g).connect(b.in);
      const z=b.noise('pink',tt,tt+.1),zl=b.filt('lowpass',600,.7),zg=b.gain();perc(zg.gain,tt,db(-22),.003,.06);z.connect(zl).connect(zg).connect(b.in);tt+=1/(r0+(r1-r0)*k);}
    return b.done();},
  /* a dryer finishing: a flat buzzer across the room */
  buzzer(E,t,s,r){const b=place(E,t,{d:[.6,.85],send:1},r),dur=r.range(.8,1.5),o=b.osc('square',r.range(300,420),t,t+dur),l=b.filt('lowpass',1500,.7),g=b.gain(0);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(db(-24),t+.02);g.gain.setValueAtTime(db(-24),t+dur-.03);g.gain.linearRampToValueAtTime(0,t+dur);o.connect(l).connect(g).connect(b.in);return b.done();},
  /* something landing in water */
  splash(E,t,s,r){const b=place(E,t,{d:[.6,.85],send:.6},r),z=b.noise('pink',t,t+.6),f=b.filt('bandpass',r.range(800,2500),1),g=b.gain();perc(g.gain,t,db(-10),.005,r.range(.25,.5));z.connect(f).connect(g).connect(b.in);
    const o=b.osc('sine',r.range(120,200),t,t+.15),og=b.gain();o.frequency.exponentialRampToValueAtTime(400,t+.08);perc(og.gain,t,db(-16),.003,.08);o.connect(og).connect(b.in);return b.done();},
  /* occasional: the air handling changes pressure, a damper shifts, and the HVAC settles at a slightly different level */
  pressure(E,t,s,r){const G=E.grp.hvac.press,v=1+r.pm(r.range(.08,.25))*Math.min(2,E.lv.drift||1);G.gain.setTargetAtTime(v,t,r.range(1.5,4));
    if(r()<.5)EV.clunk(E,t,{args:{d:[.75,.9]}},r);return 2;},
  /* uncanny, but it could just be the building: a bank of lights drops out for a second with a relay click, then restrikes */
  lightsOut(E,t,s,r){if(!E.fluor.length&&!E.humOsc.length)return 0;const d=r.range(.6,1.6),M=E.grp.elec.mute.gain,P=E.t0;
    M.setTargetAtTime(0,t,.01);M.setTargetAtTime(1,t+d,.04);EV.click(E,t,{args:{d:[.4,.7]}},r);
    E.dark.push([t-P,t+d-P,r.range(.25,.4)]);if(E.dark.length>20)E.dark.shift();
    let tt=t+d;for(let i=0;i<r.int(1,2);i++){const du=r.range(.04,.1);for(const F of E.fluor){F.fx.gain.setTargetAtTime(.2,tt,.008);F.fx.gain.setTargetAtTime(1,tt+du,.015);}E.flicks.push([tt-P,tt-P+du]);EV.tink(E,tt,s,r);tt+=du+r.range(.06,.14);}
    return d+1;},
  /* strangeness: the hum simply stops, for a few seconds */
  hush(E,t,s,r){const d=r.range(1,3)*(1+E.lv.strange);E.grp.elec.mute.gain.setTargetAtTime(0,t,.05);E.grp.elec.mute.gain.setTargetAtTime(1,t+d,.3);return d+1;}};
/* when things happen: intervals in seconds. Most of the time, nothing does. */
const EVDEF={
  /* rare: far rarer than you'd think. Never guaranteed, never clustered */
  ding:{min:720,max:2100,p:.8,cool:300},
  slam:{min:1080,max:3000,p:.72,cool:360},
  impact:{min:1200,max:3600,p:.7,cool:300},
  steps:{min:1500,max:3600,p:.7,cool:300,human:1},
  pa:{min:2100,max:5400,p:.8,cool:900,human:1,args:{chime:1}},
  creak:{min:1200,max:3600,p:.7,cool:300},
  clank:{min:900,max:2700,p:.7},autodoor:{min:900,max:2700,p:.7,human:1},vehicle:{min:300,max:1200,p:.8},plumbing:{min:900,max:2700,p:.7},
  rattle:{min:300,max:1500,p:.7},squeak:{min:1200,max:3600,p:.6,human:1},insect:{min:240,max:900,p:.7},imbalance:{min:600,max:1800,p:.7},
  buzzer:{min:1200,max:3600,p:.6},splash:{min:1800,max:5400,p:.5},
  /* occasional: things the place does by itself now and then */
  flicker:{min:180,max:720,p:.9,quiet:1},
  pressure:{min:240,max:720,p:.8,quiet:1},
  hush:{min:1200,max:3600,quiet:1,pf:E=>clamp(E.lv.strange*2.5,0,1)},
  lightsOut:{min:2400,max:6000,p:.8,cool:1800},
  drip:{min:6,max:45,p:.9,quiet:1},
  beep:{min:60,max:400,p:.8},
  click:{min:90,max:600,p:.8,quiet:1},
  static:{min:300,max:1500,p:.7},
  printer:{min:600,max:1800,p:.7,human:1},
  ring:{min:900,max:2700,p:.6,human:1},
  roll:{min:180,max:900,p:.7,human:1},
  jet:{min:480,max:1500,p:.8},
  whoosh:{min:900,max:2400,p:.7},
  elevator:{min:300,max:1200,p:.8,cool:240},
  ice:{min:600,max:1800,p:.8},
  holdbeep:{min:25,max:70,p:.95,quiet:1},
  tram:{min:300,max:1200,p:.8}};

/* ======================================================================================================
   THE PLACES. EMPTY MALL is the reference; the others are first sketches built from the same parts.
   Layer levels are dB RMS (per channel, before the place's trim).
   ====================================================================================================== */
const HVAC=(o)=>Object.assign({t:'noise',g:'hvac',noise:'brown',hp:[22,30],lp:[140,220],steep:1,peaks:{f:[[47,52],[58,63],[94,105],[118,125]],n:[1,3]},amp:{rate:[.015,.07],db:[1,4]},flt:{rate:[.005,.025],pct:[.1,.25]},db:-24,drift:[.03,.08,120,720],pan:[-.1,.1],send:.15},o||{});
const AIR=(o)=>Object.assign({t:'noise',g:'hvac',noise:'pink',hp:250,lp:3000,peaks:{f:[[500,900]],n:[1,1],db:[2,4],q:[.7,1]},amp:{rate:[.01,.08],db:[1,3]},db:-38,width:.25,send:.3},o||{});
const ROOM=(o)=>Object.assign({t:'noise',g:'room',noise:'pink',hp:[80,150],lp:[5000,9000],width:.85,eqMove:1,db:-40,drift:[.02,.06,240,900],send:.5},o||{});
const HUM=(o)=>Object.assign({t:'hum',g:'elec',drift:[.01,.03,300,1200]},o||{});
const FLUOR=(o)=>Object.assign({t:'fluor',g:'elec'},o||{});
const ENVS={
  mall:{name:'DEAD MALL',bed:'HVAC, Fountain, Fluorescent Hum',blurb:'A whole mall after closing: big air, the fountain still running, the tubes, an escalator a long way off.',mains:60,trim:-3,
    rev:{decay:3.4,pre:.034,damp:5000,wet:.2,size:1.35},
    layers:{hvac:HVAC(),roomTone:ROOM({db:-38}),hum:HUM(),fluorescent:FLUOR({whines:[[2200,4800,-54]]}),
      fountain:{t:'noise',g:'room',noise:'pink',hp:300,lp:4200,db:-40,width:.5,amp:{rate:[.2,.5],db:[1,2]},send:.9},
      farEscalator:{t:'motor',g:'machine',f0:[50,62],harm:[[1,-44],[2,-47],[3,-54]],noise:[180,700],res:[310,470],ndb:-50,pulse:{rate:[1,1.6],len:[.02,.05],fc:[400,900],db:-46,jit:[.01,.04]},send:.7}},
    events:[{type:'ding'},{type:'slam'},{type:'impact'},{type:'steps'},{type:'pa'},{type:'flicker'},{type:'pressure'},{type:'creak'},{type:'hush'},
      {type:'lightsOut',uncanny:1},{type:'autodoor',uncanny:1,min:3600,max:9000},{type:'roll',uncanny:1,min:3600,max:9000,args:{rattle:1}}]},
  escalator:{name:'DEAD ESCALATOR',bed:'HVAC, Escalator Motor, Fluorescent Hum',blurb:'An escalator still running in an empty mall: the motor, the steps, the air, the tubes. Far off, now and then, a ding.',mains:60,trim:-3.5,
    rev:{decay:2.8,pre:.028,damp:5200,wet:.17,size:1.15},
    layers:{hvac:HVAC(),air:AIR(),roomTone:ROOM(),hum:HUM(),fluorescent:FLUOR(),
      escalator:{t:'motor',g:'machine',f0:[48,68],f0d:56,noise:[180,850],res:[310,470,620,930],ndb:-38,pulse:{rate:[.8,1.8],rated:1.32,len:[.02,.06],fc:[450,1100],db:-34,jit:[.01,.04]},pan:[-.15,.15],send:.35,drift:[.01,.03,180,600]},
      friction:{t:'noise',g:'machine',noise:'pink',bp:[[900,1800],1.4],db:-50,amp:{rate:[.05,.15],db:[2,4]},send:.3},
      distantActivity:{t:'crowd',g:'people',db:-62,send:.9}},
    events:[{type:'ding'},{type:'slam'},{type:'impact'},{type:'steps'},{type:'pa'},{type:'flicker'},{type:'pressure'},{type:'creak'},{type:'hush'},
      {type:'lightsOut',uncanny:1},{type:'ding',uncanny:1,min:3600,max:9000},{type:'roll',uncanny:1,min:3600,max:9000,args:{rattle:1}}]},
  airport:{name:'DEAD AIRPORT',title:'Airport Terminal After the Last Flight',bed:'Ventilation, Distant PA, Moving Walkway',blurb:'A big terminal after the last flight: a walkway still moving, a jet idling somewhere, chimes, the PA.',mains:60,trim:-3.2,
    rev:{decay:4.2,pre:.04,damp:4500,wet:.24,size:1.5},
    layers:{hvac:HVAC(),air:AIR({db:-35}),roomTone:ROOM({db:-37}),hum:HUM({harm:[-44,-49,-56,-63,-68]}),fluorescent:FLUOR({whines:[[2200,4800,-55]]}),
      jetIdle:{t:'noise',g:'machine',noise:'brown',hp:20,lp:130,db:-33,pulse:{base:.6,depth:.6,rate:[.01,.03]},width:.4,send:.3},
      crowd:{t:'crowd',g:'people',db:-52,send:1},
      walkway:{t:'motor',g:'machine',f0:[40,50],harm:[[1,-38],[2,-41],[3,-48],[4,-54]],noise:[150,700],res:[260,410,580],ndb:-42,pulse:{rate:[.7,1.1],len:[.02,.05],fc:[350,800],db:-40,jit:[.01,.03]},send:.5}},
    events:[{type:'ding',args:{seqs:[[523,659,784],[784,659,523],[587,740,880,740]],gap:.5,long:1.2}},{type:'pa',min:1200,max:3000},{type:'roll',min:600,max:1800},{type:'autodoor',min:900,max:2400},{type:'steps'},{type:'flicker'},{type:'pressure'},{type:'hush'},
      {type:'lightsOut',uncanny:1},{type:'autodoor',uncanny:1,min:3600,max:9000},{type:'roll',uncanny:1,min:3600,max:9000}]},
  hotel:{name:'DEAD HOTEL',title:'Hotel Hallway',time:'3:07 AM',bed:'Air Conditioner, Distant Elevator',blurb:'A long carpeted corridor: the air conditioning, a transformer somewhere, an ice machine, an elevator now and then.',mains:60,trim:1.9,
    rev:{decay:1,pre:.014,damp:2800,wet:.1,size:.7},
    layers:{hvac:HVAC({db:-28,lp:[120,180]}),roomTone:ROOM({db:-45,lp:[3500,5000],width:.4}),hum:HUM({harm:[-46,-46,-55,-60,null],buzz:-60}),
      iceMachine:{t:'motor',g:'machine',f0:[58,62],harm:[[1,-42],[2,-44],[3,-52]],noise:[200,700],ndb:-46,cycle:{on:[120,300],off:[400,900]},send:.3},
      elevatorRoom:{t:'motor',g:'machine',f0:[38,46],harm:[[1,-48],[2,-50],[3,-58]],noise:[80,300],ndb:-54,toneLp:250,send:.5}},
    events:[{type:'elevator',min:600,max:1800},{type:'slam',args:{d:[.5,.85,
      {type:'elevator',uncanny:1,min:3600,max:9000},{type:'lightsOut',uncanny:1}]}},{type:'plumbing'},{type:'steps',args:{soft:1}},{type:'ice',min:900,max:2700},{type:'pressure'},{type:'hush'}]},
  office:{name:'DEAD OFFICE',title:'Office Building After Everyone Went Home',bed:'HVAC, Fluorescent Hum, Server Fans',blurb:'Ceiling tiles and carpet: air, tubes, a server closet. An elevator, a chair, one door.',mains:60,trim:-.8,
    rev:{decay:1.1,pre:.018,damp:3800,wet:.12,size:.8},
    layers:{hvac:HVAC({db:-26}),air:AIR({db:-37}),roomTone:ROOM({db:-42,lp:[4000,6000]}),hum:HUM({harm:[-43,-48,-55,-62,-66]}),fluorescent:FLUOR({buzz:-54}),
      servers:{t:'noise',g:'machine',noise:'pink',bp:[[500,1100],.8],db:-42,width:.4,amp:{rate:[.02,.05],db:[1,2]}},fanTone:{t:'hum',g:'machine',f0:[95,135],harm:[-52,-58,-63]},
      cooler:{t:'motor',g:'machine',f0:[55,62],harm:[[1,-44],[2,-46],[3,-54]],noise:[150,500],ndb:-50,cycle:{on:[180,420],off:[300,900]}}},
    events:[{type:'elevator',min:900,max:2700},{type:'creak',args:{f:[250,700],dur:[.3,.9],d:[.6,.85,
      {type:'elevator',uncanny:1,min:3600,max:9000},{type:'lightsOut',uncanny:1},{type:'roll',uncanny:1,min:5400,max:10800,args:{rattle:1}}]}},{type:'slam',args:{soft:1}},{type:'printer'},{type:'ring',min:1800,max:4800},{type:'steps',args:{soft:1}},{type:'flicker'},{type:'pressure'},{type:'hush'}]},
  garage:{name:'DEAD PARKING GARAGE',title:'Underground Parking Garage',bed:'Ventilation, Fluorescent Hum',blurb:'Concrete, three levels down: the big vent fans, the tubes, a car somewhere on another level.',mains:60,trim:0.9,
    rev:{decay:3.2,pre:.03,damp:4000,wet:.22,size:1.3},
    layers:{ventFans:{t:'noise',g:'hvac',noise:'pink',bp:[[250,600],1],db:-31,amp:{rate:[.02,.06],db:[1,3]},width:.4,send:.4},fanTone:{t:'hum',g:'machine',f0:[38,48],harm:[-40,-46,-54]},
      concrete:{t:'noise',g:'room',noise:'brown',hp:20,lp:100,db:-29,amp:{rate:[.01,.04],db:[1,3]}},roomTone:ROOM({db:-44,width:.6}),hum:HUM(),fluorescent:FLUOR({buzz:-53})},
    events:[{type:'vehicle',min:600,max:1800,args:{d:[.6,.85],send:1.3,truck:.1}},{type:'clank'},{type:'slam',min:900,max:2400},{type:'squeak'},{type:'steps'},{type:'flicker'},{type:'pressure'},{type:'hush'},
      {type:'lightsOut',uncanny:1},{type:'elevator',uncanny:1,min:3600,max:9000},{type:'autodoor',uncanny:1,min:5400,max:10800}]},
  motel:{name:'DEAD MOTEL POOL',title:'Motel Pool After Midnight',bed:'Pool Pump, Crickets, Distant Highway',blurb:'Outside, after midnight: the pool pump, a transformer on a pole, crickets, the highway washing past.',mains:60,trim:3.4,
    rev:{decay:.8,pre:.04,damp:3000,wet:.07,size:.9},
    layers:{pump:{t:'motor',g:'machine',f0:[57,60],harm:[[1,-38],[2,-40],[3,-48],[4,-54]],noise:[200,900],res:[340,520],ndb:-44,send:.2},
      transformer:HUM({harm:[-46,-40,-52,-55,-62],buzz:-58}),highway:{t:'noise',g:'room',noise:'brown',hp:40,lp:900,db:-31,width:.9,pulse:{base:.5,depth:.7,rate:[.02,.08]},send:.1},
      water:{t:'noise',g:'room',noise:'brown',hp:120,lp:900,db:-44,width:.5,pulse:{base:.1,depth:1.4,rate:[.3,.7]},send:.2},crickets:{t:'crickets',g:'room',db:-40,n:[2,4],send:.1}},
    events:[{type:'vehicle',min:300,max:900,args:{d:[.85,.97],truck:.35}},{type:'rattle',args:{d:[.6,.85,
      {type:'lightsOut',uncanny:1},{type:'ice',uncanny:1,min:3600,max:9000},{type:'rattle',uncanny:1,min:3600,max:9000}]}},{type:'slam',args:{d:[.7,.9]}},{type:'insect'},{type:'ice',min:1200,max:3600},{type:'splash'},{type:'hush'}]},
  convenience:{name:'DEAD CONVENIENCE STORE',bed:'Refrigeration, Fluorescent Hum',blurb:'Open all night and nobody in: the coolers, the compressors cycling, the tubes, a transformer outside.',mains:60,trim:2,
    rev:{decay:1.1,pre:.014,damp:4200,wet:.11,size:.75},
    layers:{compressor:{t:'motor',g:'machine',f0:[52,60],harm:[[1,-37],[2,-39],[3,-46],[4,-52]],noise:[100,600],ndb:-44,cycle:{on:[300,700],off:[180,420]},send:.25},
      coolerFans:{t:'noise',g:'machine',noise:'pink',bp:[[700,1500],1],db:-44,width:.5},hvac:HVAC({db:-29}),fluorescent:FLUOR({buzz:-50,hum2:-47}),
      transformer:HUM({harm:[-46,-41,-52,-56,-62],buzz:-58})},
    events:[{type:'ding',min:1200,max:3600,human:1,args:{seqs:[[659,523],[784,659]],gap:.45,long:.5,d:[.3,.6,
      {type:'ding',uncanny:1,min:3600,max:9000,args:{seqs:[[659,523],[784,659]],gap:.45,long:.5,d:[.3,.6]}},{type:'lightsOut',uncanny:1}]}},{type:'click',min:240,max:900,args:{d:[.3,.6]}},{type:'vehicle',min:600,max:2400,args:{d:[.85,.97],truck:.2}},
      {type:'clank',min:1200,max:3600,args:{d:[.3,.6]}},{type:'flicker'},{type:'pressure'},{type:'hush'}]},
  laundromat:{name:'DEAD LAUNDROMAT',title:'Laundromat',time:'1:42 AM',bed:'Dryers, Fluorescent Buzz',blurb:'Two dryers going, nobody here: the tumble, the exhaust fan, the tubes. A washer thumps off balance.',mains:60,trim:3,
    rev:{decay:.9,pre:.012,damp:4500,wet:.1,size:.7},
    layers:{dryer1:{t:'motor',g:'machine',f0:[45,55],harm:[[1,-38],[2,-40],[3,-48]],noise:[120,700],ndb:-40,pulse:{kind:'thump',rate:[.75,.95],db:-32,jit:[.02,.05]},cycle:{on:[1200,2700],off:[300,900],startOn:1},pan:[-.5,-.2]},
      dryer2:{t:'motor',g:'machine',f0:[45,55],harm:[[1,-40],[2,-42],[3,-50]],noise:[120,700],ndb:-42,pulse:{kind:'thump',rate:[.75,.95],db:-34,jit:[.02,.05]},cycle:{on:[1200,2700],off:[300,900]},pan:[.2,.5]},
      exhaust:{t:'noise',g:'hvac',noise:'pink',bp:[[300,800],.9],db:-38,width:.3},fluorescent:FLUOR({buzz:-49,hum2:-46}),hum:HUM(),roomTone:ROOM({db:-46,width:.4})},
    events:[{type:'imbalance'},{type:'ding',min:900,max:2700,args:{f:[1568,1760,2093],long:.35,d:[.5,.8,
      {type:'lightsOut',uncanny:1},{type:'buzzer',uncanny:1,min:3600,max:9000},{type:'ding',uncanny:1,min:5400,max:10800,args:{f:[1568,1760,2093],long:.35,d:[.5,.8]}}]}},{type:'buzzer'},{type:'slam',args:{d:[.6,.8]}},{type:'steps',min:1800,max:3600},{type:'flicker'},{type:'hush'}]},
  hospital:{name:'DEAD HOSPITAL',title:'Hospital Corridor at Night',bed:'HVAC, Distant Doors',blurb:'A long corridor at night: clean air, cool tubes, machinery behind a wall, a cart, a door.',mains:60,trim:-0.4,
    rev:{decay:1.6,pre:.02,damp:5000,wet:.16,size:1},
    layers:{hvac:HVAC({db:-26}),air:AIR({db:-36}),roomTone:ROOM({db:-44,width:.5}),hum:HUM(),fluorescent:FLUOR(),
      machinery:{t:'motor',g:'machine',f0:[60,75],harm:[[1,-46],[2,-48],[3,-55]],noise:[100,500],ndb:-50,send:.3}},
    events:[{type:'elevator'},{type:'roll',min:900,max:2700,args:{rattle:1}},{type:'slam',args:{soft:1}},{type:'pa',min:1800,max:4800},{type:'steps',args:{soft:1}},{type:'beep',min:600,max:1800,args:{f:[880,960],d:[.8,.95,
      {type:'elevator',uncanny:1,min:3600,max:9000},{type:'roll',uncanny:1,min:3600,max:9000,args:{rattle:1}},{type:'lightsOut',uncanny:1}]}},{type:'flicker'},{type:'pressure'},{type:'hush'}]},
  grocery:{name:'GROCERY STORE',title:'Empty Grocery Store Before Opening',bed:'Refrigeration Hum, Fluorescent Buzz',blurb:'Before opening: the coolers humming and cycling, the tubes, a cart somewhere, one beep from a register.',mains:60,trim:0.9,
    rev:{decay:2.4,pre:.026,damp:4800,wet:.17,size:1.1},
    layers:{coolers:{t:'motor',g:'machine',f0:[52,60],harm:[[1,-38],[2,-40],[3,-47],[4,-53]],noise:[100,600],ndb:-44,cycle:{on:[300,700],off:[180,420]},send:.3},
      freezers:{t:'motor',g:'machine',f0:[58,66],harm:[[1,-42],[2,-44],[3,-52]],noise:[120,600],ndb:-48,cycle:{on:[400,900],off:[200,500]},pan:[.2,.5]},
      caseFans:{t:'noise',g:'machine',noise:'pink',bp:[[800,1600],1],db:-44,width:.6},fluorescent:FLUOR({buzz:-50,hum2:-47}),hum:HUM(),hvac:HVAC({db:-29}),roomTone:ROOM({db:-43})},
    events:[{type:'roll',min:900,max:2700,args:{rattle:1}},{type:'beep',min:1200,max:3600,args:{f:[1850,2350],d:[.75,.9]},human:1},{type:'impact'},{type:'steps'},{type:'pa',min:2400,max:5400},{type:'flicker'},{type:'pressure'},{type:'hush'}]},
  gas:{name:'GAS STATION',title:'Desert Gas Station',time:'2:48 AM',bed:'Transformer Hum, Wind, Distant Highway',blurb:'Under the canopy at night: the transformer, desert wind, coolers through the glass, a truck on the highway.',mains:60,trim:5.3,
    rev:{decay:.9,pre:.05,damp:3200,wet:.08,size:1},
    layers:{transformer:HUM({harm:[-44,-38,-50,-53,-60],buzz:-54}),wind:{t:'noise',g:'room',noise:'pink',bp:[[250,700],.7],bpMod:{rate:[.05,.15],pct:.4},pulse:{base:.3,depth:1,rate:[.04,.15]},db:-34,width:.7,send:.2},
      highway:{t:'noise',g:'room',noise:'brown',hp:40,lp:700,db:-38,width:.9,pulse:{base:.4,depth:.8,rate:[.02,.06]}},
      coolers:{t:'motor',g:'machine',f0:[52,60],harm:[[1,-44],[2,-46],[3,-54]],noise:[100,400],ndb:-52,toneLp:300,cycle:{on:[300,700],off:[180,420]}},
      canopy:FLUOR({buzz:-50,whines:[[2200,4800,-53]]})},
    events:[{type:'vehicle',min:240,max:900,args:{d:[.75,.95],truck:.4}},{type:'ding',min:1200,max:3600,human:1,args:{seqs:[[659,523],[784,659]],gap:.45,long:.5,d:[.4,.7]}},{type:'rattle',min:300,max:1200},{type:'slam',min:1200,max:3600,human:1},{type:'insect'},{type:'clank'},{type:'flicker'},{type:'hush'}]},
  hold:{name:'ON HOLD',blurb:'Down a phone line: line hiss, the hold tone, a call centre far behind it.',mains:60,trim:15.2,line:1,
    rev:{decay:.7,pre:.012,damp:3000,wet:.06,size:.6},
    layers:{line:{t:'noise',g:'room',noise:'white',hp:300,lp:3400,db:-50,amp:{rate:[.05,.2],db:[1,2]}},lineHum:HUM({harm:[-52,-58,-66]}),hvac:HVAC({db:-36}),
      callCentre:{t:'crowd',g:'people',db:-52,lp:2400,send:.6}},
    events:[{type:'holdbeep'},{type:'click',args:{d:[.02,.1]}},{type:'pa',min:300,max:900,args:{d:[.6,.8]}},{type:'hush'}]},
  after:{name:'AFTER HOURS',blurb:'A shop after closing: the coolers cycling, the tubes buzzing louder than they did all day.',mains:60,trim:2.4,
    rev:{decay:2,pre:.022,damp:4500,wet:.15,size:1},
    layers:{fridge:{t:'motor',g:'machine',f0:[50,60],harm:[[1,-36],[2,-38],[3,-46],[4,-52]],noise:[100,600],ndb:-44,cycle:{on:[240,600],off:[180,480]},send:.3},
      freezerFan:{t:'noise',g:'machine',noise:'pink',bp:[[700,1400],1],db:-46,width:.3},fluorescent:FLUOR({buzz:-50,hum2:-46,whines:[[2200,4800,-49],[6000,9500,-55]]}),hum:HUM({harm:[-39,-44,-51,-58,-63]}),
      hvac:HVAC({db:-30}),roomTone:ROOM({db:-44})},
    events:[{type:'flicker',min:30,max:150},{type:'impact'},{type:'creak'},{type:'pa',min:1800,max:3600},{type:'steps',min:1200,max:3000},{type:'hush'}]},
  pool:{name:'LIMINAL POOL',blurb:'Tiles and still water: the pump, the water lapping at the edges, a drip, a lot of echo.',mains:60,trim:-0.8,
    rev:{decay:4.5,pre:.035,damp:7000,wet:.3,size:1.4},
    layers:{pump:{t:'motor',g:'machine',f0:[55,60],harm:[[1,-36],[2,-39],[3,-46],[4,-52]],noise:[200,900],res:[340,520,760],ndb:-40,send:.4},
      water:{t:'noise',g:'room',noise:'brown',hp:80,lp:700,db:-34,width:.5,pulse:{base:.15,depth:1.6,rate:[.4,.9]},send:.8},
      trickle:{t:'noise',g:'room',noise:'pink',hp:1800,lp:6000,db:-48,width:.6,pulse:{base:.2,depth:1,rate:[1.5,3]},send:.8},
      hvac:HVAC({db:-28}),hum:HUM({harm:[-45,-50,-57,-64,null]}),fluorescent:FLUOR({whines:[[2200,4800,-56]]})},
    events:[{type:'drip'},{type:'slam',args:{d:[.75,.95]}},{type:'impact',min:900,max:2700},{type:'steps',min:1200,max:3000},{type:'hush'}]},
  space:{name:'DEEP SPACE',blurb:'A station on a long orbit: life support, a fan, the 400-cycle power, consoles, the hull ticking.',mains:400,trim:1.8,
    rev:{decay:1.4,pre:.012,damp:6000,wet:.12,size:.8},
    layers:{lifeSupport:{t:'noise',g:'hvac',noise:'pink',bp:[[300,700],.9],db:-34,amp:{rate:[.02,.06],db:[1,3]},width:.3},recycler:{t:'noise',g:'hvac',noise:'white',hp:2000,lp:7000,db:-48,width:.5},
      fanTone:{t:'hum',g:'machine',f0:[110,150],harm:[-44,-50,-58]},power:HUM({f0:400,harm:[-50,-58,-63],buzz:-58,buzzLp:2500}),rumble:{t:'noise',g:'room',noise:'brown',hp:20,lp:90,db:-30,amp:{rate:[.01,.03],db:[1,3]}}},
    events:[{type:'beep',args:{two:1}},{type:'click'},{type:'creak',min:300,max:1500,args:{f:[60,220],dur:[1.2,4]}},{type:'pa',min:900,max:2700,args:{radio:1}},{type:'whoosh'},{type:'static'},{type:'hush'}]},
  derelict:{name:'DERELICT SHIP',blurb:'Most of the power is gone: wind through a breach, metal groaning, a failing tube, dripping.',mains:60,trim:1.8,
    rev:{decay:3.6,pre:.03,damp:4000,wet:.25,size:1.3},
    layers:{wind:{t:'noise',g:'room',noise:'pink',bp:[[250,550],.7],bpMod:{rate:[.05,.15],pct:.4},pulse:{base:.25,depth:1.2,rate:[.05,.2]},db:-30,width:.7,send:.6},
      whistle:{t:'noise',g:'room',noise:'pink',bp:[[700,1500],25],bpMod:{rate:.05,pct:.08},pulse:{base:0,depth:1.5,rate:[.03,.1]},db:-44},
      hvacDying:HVAC({db:-32,peaks:null}),crackle:{t:'noise',g:'elec',noise:'white',hp:2500,lp:8000,pulse:{base:0,depth:1,rate:[8,20],kind:'ctrls'},db:-52},fluorescent:FLUOR({whines:[[2200,4800,-53]],buzz:-55})},
    events:[{type:'creak',min:120,max:600,args:{f:[60,200],dur:[1.5,5]}},{type:'drip',min:10,max:60},{type:'impact',min:300,max:1200},{type:'flicker',min:20,max:120},{type:'static'},{type:'click'},{type:'hush'}]},
  soviet:{name:'SOVIET RETROFUTURE',blurb:'A big hall on 50-cycle power: the transformer, old relays, a station chime, a tram outside.',mains:50,trim:-2.1,
    rev:{decay:3,pre:.03,damp:4800,wet:.2,size:1.2},
    layers:{transformer:HUM({f0:50,harm:[-34,-30,-41,-43,-51],buzz:-48}),hvac:HVAC({db:-27,peaks:{f:[[45,52],[96,104]],n:[1,2]}}),roomTone:ROOM({db:-42}),fluorescent:FLUOR({whines:[[2200,4800,-53]]}),
      ventFan:{t:'hum',g:'machine',f0:[70,90],harm:[-46,-50,-58]}},
    events:[{type:'tram'},{type:'click',min:60,max:400},{type:'ding',min:600,max:2000,args:{seqs:[[784,659,523],[659,784,988]],gap:.6,long:1.3}},{type:'pa',min:900,max:2700},{type:'static'},{type:'impact'},{type:'steps'},{type:'hush'}]}};
const ENV_IDS=Object.keys(ENVS);
/* the ten on the keys: places people already know. The rest still play, for tapes made before */
const SLATE=['mall','escalator','airport','hotel','office','convenience','laundromat','garage','hospital','motel'];
const LV0={hvac:1,room:1,machine:1,elec:1,people:1,events:1,echo:1,drift:1,strange:.08};

/* ---------- the room: an algorithmic reverb (no impulse files). Parallel damped combs, then Schroeder allpasses, per side ---------- */
function reverb(c,R){const inp=c.createGain(),pre=c.createDelay(.2);pre.delayTime.value=R.pre||.025;const hp=bq(c,'highpass',140,.7),lp=bq(c,'lowpass',R.damp||5000,.7);inp.connect(pre).connect(hp).connect(lp);
  const merger=c.createChannelMerger(2),out=c.createGain(),nodes=[inp,pre,hp,lp,merger];const size=R.size||1;
  [0,1].forEach(side=>{const sum=c.createGain();sum.gain.value=.12;nodes.push(sum);
    for(const ms of [25.3,26.9,28.9,30.7,32.2,33.8,35.3,36.7]){const d=c.createDelay(1),dt=(ms+side*.52)*size/1000;d.delayTime.value=dt;const damp=bq(c,'lowpass',(R.damp||5000)*1.1,-3),fb=c.createGain();
      fb.gain.value=Math.pow(10,-3*dt/(R.decay||2.5));lp.connect(d);d.connect(damp).connect(fb).connect(d);damp.connect(sum);nodes.push(d,damp,fb);}
    let x=sum;for(const ms of [12.6,10,7.7,5.1]){const g=.5,v=c.createGain(),d=c.createDelay(.1),fb=c.createGain(),inv=c.createGain(),o=c.createGain();d.delayTime.value=(ms+side*.3)/1000;fb.gain.value=g;inv.gain.value=-g;
      x.connect(v);v.connect(d);d.connect(fb).connect(v);v.connect(inv).connect(o);d.connect(o);nodes.push(v,d,fb,inv,o);x=o;}
    x.connect(merger,0,side);});
  if(R.er){const n=R.er|0;for(let i=0;i<n;i++){const d=c.createDelay(.2),g=c.createGain(),p=c.createStereoPanner();d.delayTime.value=(.006+i*.011*(R.size||1))*(1+.13*Math.sin(i*2.3));g.gain.value=.22*Math.pow(.72,i)*(R.erGain||1);p.pan.value=i%2?-.6:.6;
    pre.connect(d);d.connect(g).connect(p).connect(out);nodes.push(d,g,p);}} /* early reflections: the walls, before the tail */
  merger.connect(out);return {inp,out,nodes};}

/* ---------- tape character: optional, subtle. Off (CLEAN) unless chosen ---------- */
const TAPES={clean:null,
  cassette:{hp:40,lp:12000,hiss:-58,hum:-70,wow:.0009,wowHz:.55,flut:.00012,flutHz:7,drop:0},
  vhs_sp:{hp:60,lp:10000,hiss:-56,hum:-66,wow:.0012,wowHz:.4,flut:.00018,flutHz:9,drop:.002},
  vhs_lp:{hp:80,lp:7500,hiss:-52,hum:-62,wow:.0018,wowHz:.45,flut:.00025,flutHz:10,drop:.004},
  vhs_slp:{hp:100,lp:5500,hiss:-48,hum:-60,wow:.0026,wowHz:.5,flut:.00035,flutHz:11,drop:.008},
  broadcast:{hp:120,lp:6000,hiss:-54,hum:-56,wow:.0004,wowHz:.3,flut:.00008,flutHz:6,drop:0,mono:1},
  damaged:{hp:110,lp:5000,hiss:-46,hum:-58,wow:.0035,wowHz:.6,flut:.0005,flutHz:12,drop:.02}};
const TAPE_N={clean:'CLEAN',cassette:'CASSETTE',vhs_sp:'VHS SP',vhs_lp:'VHS LP',vhs_slp:'VHS SLP',broadcast:'OLD BROADCAST',damaged:'DAMAGED TAPE'};
function tapeStage(E,T){const c=E.ctx,inp=c.createGain(),r=RNG(E.seed,'tape');if(!T)return {inp,out:inp};
  const d=c.createDelay(.1);d.delayTime.value=.012;wander(E,d.delayTime,T.wow,T.wowHz,r);const fl=c.createOscillator();fl.frequency.value=T.flutHz;const fg=c.createGain();fg.gain.value=T.flut;fl.connect(fg).connect(d.delayTime);fl.start(E.t0);E.srcs.push(fl);
  const hp=bq(c,'highpass',T.hp,.7),lp=bq(c,'lowpass',T.lp,.7),lp2=bq(c,'lowpass',T.lp*1.2,.7),out=c.createGain();inp.connect(d).connect(hp).connect(lp).connect(lp2).connect(out);
  if(T.drop){wander(E,out.gain,-T.drop*30,2.5,r,'ctrls');} /* dropouts: brief dips */
  const h=nsrc(E,'pink',r),hh=bq(c,'highpass',3000,.7),hg=c.createGain();hg.gain.value=db(T.hiss)*4;h.connect(hh).connect(hg).connect(out);
  const m=c.createOscillator();m.frequency.value=E.mains||60;const mg=c.createGain();mg.gain.value=2*db(T.hum);m.connect(mg).connect(out);m.start(E.t0);E.srcs.push(m);
  if(T.mono){const mono=c.createGain();mono.channelCount=1;mono.channelCountMode='explicit';out.connect(mono);return {inp,out:mono};}
  return {inp,out};}

/* ======================================================================================================
   THE PLACE, RUNNING
   ====================================================================================================== */
function make(ctx,dest,o){o=o||{};const env=o.envObj||ENVS[o.env]||ENVS.mall,seed=(o.seed>>>0)||1,t0=o.startAt||ctx.currentTime+.08;
  const E={ctx,seed,t0,env,N:noises(ctx),mains:env.mains||60,srcs:[],drift:[],peaks:[],moves:[],humOsc:[],fluor:[],flicks:[],dark:[],fired:[],lctl:{},evMul:{},evDist:{},state:'normal',layers:[],lv:Object.assign({},LV0,o.lv||{}),era:env.era||'analog',distBias:env.distBias||0};E.lv0=E.lv;
  /* buses */
  const out=ctx.createGain();out.gain.value=0;out.gain.setValueAtTime(0,t0);out.gain.linearRampToValueAtTime(1,t0+(o.fadeIn!=null?o.fadeIn:1.5));
  const sat=ctx.createWaveShaper(),curve=new Float32Array(2049);for(let i=0;i<2049;i++){const x=(i-1024)/1024*1.5;curve[i]=Math.tanh(1.2*x)/1.2;}sat.curve=curve;sat.oversample='2x';
  const lim=ctx.createDynamicsCompressor();lim.threshold.value=-3;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.002;lim.release.value=.25;
  const trim=ctx.createGain();trim.gain.value=db(env.trim||0)*(o.trim||1);E.bus=trim; /* the master, after the room: music goes straight here */
  const roomBus=ctx.createGain(),lowS=bq(ctx,'lowshelf',120,null,env.eqLow||0),highS=bq(ctx,'highshelf',6000,null,env.eqHigh||-1.5);roomBus.connect(lowS).connect(highS).connect(trim);
  const rv=reverb(ctx,env.rev||{}),wet=ctx.createGain(),wetMod=ctx.createGain();rv.out.connect(wet).connect(wetMod).connect(trim);const wetBase=(env.rev&&env.rev.wet||.17)*2.2;
  const TP=tapeStage(E,TAPES[o.tape||'clean']);trim.connect(TP.inp);let last=TP.out;if(env.line){const h=bq(ctx,'highpass',300,.9),l=bq(ctx,'lowpass',3400,.9),m=ctx.createGain();m.channelCount=1;m.channelCountMode='explicit';TP.out.connect(h).connect(l).connect(m);last=m;}
  last.connect(sat).connect(lim).connect(out).connect(dest);
  E.grp={};for(const g of ['hvac','room','machine','elec','people','events']){const dry=ctx.createGain(),wt=ctx.createGain(),lvG=ctx.createGain(),mute=ctx.createGain(),press=ctx.createGain(),stG=ctx.createGain();
    const gapG=ctx.createGain();dry.connect(mute);wt.connect(rv.inp);mute.connect(press).connect(stG).connect(lvG).connect(gapG).connect(roomBus);E.grp[g]={dry,wet:wt,lvl:lvG,mute,press,st:stG,gap:gapG};} /* gap: the place rises between an album's tracks */
  function setLv(lv,now){Object.assign(E.lv,lv||{});const T=now?0:.4,at=Math.max(ctx.currentTime,t0-.05);
    for(const g of ['hvac','room','machine','elec','people']){const v=Math.max(0,E.lv[g]);E.grp[g].lvl.gain.setTargetAtTime(v,at,T||.001);E.grp[g].wet.gain.setTargetAtTime(v,at,T||.001);}
    wet.gain.setTargetAtTime(wetBase*Math.max(0,E.lv.echo),at,T||.001);}
  setLv(null,true);
  /* layers */
  const lr=RNG(seed,'layers');
  for(const key of Object.keys(env.layers)){if(o.only&&o.only!==key)continue;const L=Object.assign({key},env.layers[key]),r=RNG(seed,'L:'+key),P=PRIM[L.t](E,L,r);
    const lg=ctx.createGain(),fx=ctx.createGain(),sendG=ctx.createGain();sendG.gain.value=L.send!=null?L.send:.4;
    let x=P.out;if(!L.width&&L.t!=='noise'){const pn=ctx.createStereoPanner();pn.pan.value=L.pan!=null?r.v(L.pan):0;x.connect(pn);x=pn;}
    const tone=bq(ctx,'lowpass',20000,-3),lpan=ctx.createStereoPanner(),lo=(o.layerOv||{})[key]||{};E.lctl[key]={lg,tone,pan:lpan,user:ctx.createGain(),g:L.g,label:L.label||key};const U=E.lctl[key].user;
    U.gain.value=lo.lv!=null?lo.lv:1;tone.frequency.value=lo.cut||20000;lpan.pan.value=lo.pan||0;
    x.connect(lg).connect(U).connect(tone).connect(lpan).connect(fx);const G=E.grp[L.g];fx.connect(G.dry);fx.connect(sendG).connect(G.wet);
    if(L.drift){const [a,b,p1,p2]=L.drift;E.drift.push({param:lg.gain,base:1,pct:[a,b],per:[p1,p2],tc:Math.max(5,p1/3),r:RNG(seed,'D:'+key)});}
    P.fx=fx;if(P.fluor)E.fluor.push(P);E.layers.push(P);}
  E.drift.push({param:wetMod.gain,base:1,pct:[.02,.05],strange:.6,per:[300,900],tc:40,r:RNG(seed,'wet')}); /* strangeness: the room's tail grows and shrinks a little */
  /* strangeness: the HVAC's resonances wander off pitch, slowly */
  E.peaks.forEach((p,i)=>E.drift.push({param:p.frequency,base:p.frequency.value,pct:[.005,.02],strange:.12,per:[240,900],tc:60,r:RNG(seed,'pk'+i)}));
  for(const d of E.drift)d.next=d.r.range(5,d.per[0]);
  /* events */
  const specs=(env.events||[]).map((e,i)=>{const s=Object.assign({},EVDEF[e.type],e,{args:Object.assign({},(EVDEF[e.type]||{}).args||{},e.args||{})});s.id=e.type+i;s.r=RNG(seed,'E:'+e.type+i);s.last=-1e9;const ov=(o.eventOv||{})[s.id]||{};if(ov.rate!=null)E.evMul[s.id]=ov.rate;if(ov.dist)E.evDist[s.id]=ov.dist;s.first=s.r.range(Math.min(s.min*.15,30),s.max*(env.firstMul||1));s.next=null;return s;});
  const G=RNG(seed,'gap');let busyUntil=-1e9,gap=G.range(120,240)*(env.gapMul||1)*(env.gapStart!=null?env.gapStart:1),done=0;
  const stRate=s=>{const S=env.states&&env.states[E.state];if(!S)return 1;if(s.only&&!s.only.includes(E.state))return 0;return (S.rate&&S.rate[s.cls||'other']!=null?S.rate[s.cls||'other']:1)*(S.events!=null?S.events:1);};
  const rateOf=s=>Math.pow(Math.max(0,E.lv.events),s.actPow!=null?s.actPow:1)*(s.human?Math.max(0,E.lv.people):1)*(s.uncanny?clamp(E.lv.strange/.08,0,4):1)*(E.evMul[s.id]!=null?E.evMul[s.id]:1)*(s.only||env.states?stRate(s):1); /* UNCANNY at NONE: purely a dead building */
  for(const s of specs)s.next=s.first/Math.max(.25,rateOf(s)||1);
  function schedule(up){for(let guard=0;guard<500;guard++){let s=null;for(const x of specs)if(!s||x.next<s.next)s=x;if(!s||s.next>up)break;const tp=s.next,m=rateOf(s);
      if(m<=0||!EV[s.type]){s.next=tp+60;continue;}
      if(!s.quiet&&tp<busyUntil+gap){s.next=busyUntil+gap+s.r.range(5,45);continue;}
      if(s.cool&&tp-s.last<s.cool){s.next=s.last+s.cool+s.r.range(0,60);continue;}
      const p=s.pf?s.pf(E):s.p;
      if(s.r()<p){const at=Math.max(t0+tp,ctx.currentTime+.03),DR={near:[0,.25],mid:[.35,.6],far:[.7,.95]};let dk=E.evDist[s.id];
        if(!dk&&s.dist){const x=s.r(),D=s.dist;dk=x<(D.near||0)?'near':x<(D.near||0)+(D.mid||0)?'mid':'far';}
        E.cur={d:dk?DR[dk]:null,side:s.side!=null?(s.r()<Math.abs(s.side)?Math.sign(s.side):-Math.sign(s.side)||null):null};
        let len=EV[s.type](E,at,s,s.r)||0;
        if(s.cluster&&s.r()<s.cluster){const n=s.r.int((s.reps||[2,3])[0],(s.reps||[2,3])[1])-1;let tt=at;for(let k=0;k<n;k++){tt+=len+s.r.v(s.cgap||[.6,4]);len=EV[s.type](E,tt,s,s.r)||0;}len=tt+len-at;}
        E.cur=null;s.last=tp;E.fired.push([Math.round(tp),s.type]);if(E.fired.length>200)E.fired.shift();if(!s.quiet){busyUntil=tp+len;gap=(G.range(120,240)+Math.pow(G(),2)*900)*(env.gapMul||1)/Math.sqrt(Math.max(.25,m)); /* at least 2-4 minutes, often more, unevenly */if(G()<(env.lull!=null?env.lull:.25))gap+=G.range(1200,2400)*(env.lullMul||1)/Math.max(.25,m);}} /* 2-4 minutes at least between noticeable things; sometimes 20-40 minutes of nothing */
      let iv=Math.max(1,s.r.range(s.min,s.max)/m);s.next=tp+iv;}}
  function driftTick(up){const dl=E.lv.drift,st=E.lv.strange;for(const d of E.drift)while(d.next<up){let v=d.base;
      if(d.abs)v=d.base+d.r.pm(d.r.range(d.abs[0],d.abs[1]))*Math.min(2,dl);
      else{const amt=d.r.range(d.pct[0],d.pct[1])*Math.min(2,dl)+(d.strange?st*d.strange:0);v=d.base*(1+d.r.pm(amt));}
      d.param.setTargetAtTime(v,Math.max(t0+d.next,ctx.currentTime),d.tc||10);d.next+=d.r.range(d.per[0],d.per[1]);}}
  let stopped=false;
  return {env:o.env in ENVS?o.env:'mall',name:env.name,seed,tStart:t0,ahead:2.5,
    tick(until){if(stopped)return;const up=until-t0;if(up<=done)return;for(const L of E.layers)if(L.tick)L.tick(up);driftTick(up);schedule(up);done=up;},
    set(lv){setLv(lv,false);},
    /* live controls for the ADVANCED view, the scene states and the hero pads */
    layers(){return Object.keys(E.lctl).map(k=>({key:k,label:E.lctl[k].label,group:E.lctl[k].g}));},
    events(){return specs.map(s=>({id:s.id,type:s.type,cls:s.cls||'',label:s.label||s.type,min:s.min,max:s.max}));},
    setLayer(k,v){const L=E.lctl[k];if(!L)return;const n=ctx.currentTime;if(v.lv!=null)L.user.gain.setTargetAtTime(Math.max(0,v.lv),n,.15);if(v.cut!=null)L.tone.frequency.setTargetAtTime(clamp(v.cut,60,20000),n,.15);if(v.pan!=null)L.pan.pan.setTargetAtTime(clamp(v.pan,-1,1),n,.15);},
    setEvent(id,v){if(v.rate!=null)E.evMul[id]=Math.max(0,v.rate);if(v.dist!==undefined){if(v.dist)E.evDist[id]=v.dist;else delete E.evDist[id];}},
    setState(name,secs){const S=env.states&&env.states[name];if(!S)return;E.state=name;const n=ctx.currentTime,tc=Math.max(.02,(secs==null?6:secs)/3);
      for(const g of ['hvac','room','machine','elec','people','events'])E.grp[g].st.gain.setTargetAtTime(S.g&&S.g[g]!=null?S.g[g]:1,n,tc);if(S.enter&&EV[S.enter])EV[S.enter](E,n+.05,{args:S.enterArgs||{}},RNG(seed^((n*1000)|0),'enter'));},
    hero(type,args){if(!EV[type])return 0;const n=ctx.currentTime+.03;E.cur=args&&args.dist?{d:{near:[0,.25],mid:[.35,.6],far:[.7,.95]}[args.dist]}:null;const len=EV[type](E,n,{args:args||{}},RNG(seed^((n*997)|0),'hero:'+type));E.cur=null;return len;},
    states(){return env.states?Object.keys(env.states):[];},
    skip(sec){for(const x of specs){let g=0;while(x.next<sec&&g++<100000)x.next+=Math.max(1,x.r.range(x.min,x.max)/Math.max(.25,rateOf(x)||1));}busyUntil=sec;done=Math.max(done,sec-1);}, /* start partway in: nothing the place 'missed' fires at once */
    lightAt(t,flicker){let v=1;const D=E.dark;for(let i=D.length-1;i>=0&&i>=D.length-4;i--){const [a,b,amt]=D[i];if(t>=a-.02&&t<=b+.15){const k=t<a?0:t<a+.03?(t-a)/.03:t<b?1:Math.max(0,1-(t-b)/.08);v*=1-amt*k;}}
      if(flicker===false)return v;const F=E.flicks;for(let i=F.length-1;i>=0&&i>=F.length-12;i--){const [a,b]=F[i];if(t>=a-.01&&t<=b+.03){const k=t<a?(t-a+.01)/.01:t>b?1-(t-b)/.03:1;return v*(1-.07*clamp(k,0,1));}}return v;},
    stop(fade){if(stopped)return;stopped=true;fade=fade==null?.5:fade;const n=ctx.currentTime;out.gain.cancelScheduledValues(n);out.gain.setValueAtTime(out.gain.value,n);out.gain.linearRampToValueAtTime(0,n+fade);
      setTimeout(()=>{for(const s of E.srcs)try{s.stop();}catch(e){}try{out.disconnect();}catch(e){}for(const x of rv.nodes)try{x.disconnect();}catch(e){}},fade*1000+150);},
    _E:E};}
/* the primitives under their plain names, for building new places */
const lib={createRumble:L=>HVAC(L),createAirNoise:L=>AIR(L),createRoomTone:L=>ROOM(L),createHum:L=>HUM(L),createTransformerHum:L=>HUM(Object.assign({buzz:-48},L)),createFluorescentLight:L=>FLUOR(L),
  createBuzz:L=>FLUOR(L),createMotor:L=>Object.assign({t:'motor',g:'machine'},L),createFan:L=>Object.assign({t:'noise',g:'machine',noise:'pink',bp:[[500,1100],.8],db:-43},L),
  createWind:L=>Object.assign({},ENVS.derelict.layers.wind,L),createElectricalNoise:L=>Object.assign({},ENVS.derelict.layers.crackle,L),
  createMechanicalPulse:'motor pulse',createDistantImpact:EV.impact,createDoorSlam:EV.slam,createDing:EV.ding,createDistantFootstep:EV.steps,createPAMumble:EV.pa,createBuildingCreak:EV.creak};
window.LMX={make,RNG,ENVS,ENV_IDS,SLATE,LV0,EV,EVDEF,lib,noises,TAPES,TAPE_N,
  _:{prng,RNG,noises,bq,perc,nsrc,wander,place,predictPower,PRIM,EV,EVDEF,db,clamp,HVAC,AIR,ROOM,HUM,FLUOR}}; /* the toolkit, for the scene engine (space.js) */
})();
