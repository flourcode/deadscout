/* DRIFTNAUT · SPACE CHILLHOP (r48). The old engine held slow pads for 10-40 s over a drone with long space reverbs and
   random sparse notes: that is how ambient horror works, and it read as eerie. This one is built the way chillhop/lo-fi
   study music is built, because that is what reads as safe and focused:
   - a short jazzy loop (maj9, m9, 13, sus9 chords) that changes every bar or two and repeats, so the ear can stop listening
   - a warm Rhodes comping on the beat, gently strummed, through a little tape wobble
   - a round bass on the root, under 125 Hz but never a rumble
   - a laid-back swung boom-bap beat (soft kick, rimshot or soft snare, quiet 16th hats), lowpassed, ducking the keys a touch
   - a two-bar pentatonic hook that comes back every so often, on a soft bell with a short echo
   - vinyl crackle, a small warm room (no cathedral), everything rolled off above ~7 kHz
   70-86 BPM. No drones, no swells, no stings. INTENSITY: REST (no drums) · FOCUS (default, soft beat) · CHILL (full).
   Band interface (unchanged): DEEP.make(ctx, dest, {seed, tape, startAt, fadeIn, sleep, intensity}) →
   {tick(horizon), ahead, skip(off), setState(state, secs), setIntensity(n), hero(kind), stop(fade)} */
(function(){
"use strict";
const PENT=[0,2,4,7,9];
/* chord shapes in semitones above the chord root (the bass plays the root, so the keys can leave it out) */
const Q={maj7:[0,4,7,11],maj9:[4,7,11,14],six9:[4,9,14,7],m7:[3,7,10,12],m9:[3,7,10,14],d13:[4,10,14,21],d9:[4,10,14,7],sus9:[5,10,14,7]};
/* the six tapes. key = semitones above C; prog = [degree above the key, shape, bars] */
const TAPES={
  'soft-orbit':   {name:'SOFT ORBIT',   key:0,bpm:82,swing:.6, prog:[[5,'maj9'],[4,'m7'],[2,'m9'],[0,'maj9']],                 kit:'full', comp:'push',bass:'walk', mel:.8, pad:.22,bright:3200},
  'cabin-warmth': {name:'CABIN WARMTH', key:5,bpm:76,swing:.62,prog:[[2,'m9'],[7,'d13'],[0,'maj9'],[9,'m9']],                  kit:'rim',  comp:'push',bass:'walk', mel:.7, pad:.25,bright:2900},
  'space-wave':   {name:'SPACE WAVE',   key:2,bpm:78,swing:.58,prog:[[0,'maj9'],[9,'m9'],[2,'m9'],[7,'sus9']],                 kit:'full', comp:'hold',bass:'soft', mel:.75,pad:.3, bright:3000},
  'slow-current': {name:'SLOW CURRENT', key:4,bpm:74,swing:.6, prog:[[0,'maj9',2],[5,'maj9',2]],                               kit:'rim',  comp:'hold',bass:'soft', mel:.6, pad:.3, bright:2800},
  'quiet-engines':{name:'QUIET ENGINES',key:9,bpm:70,swing:.58,prog:[[0,'maj9',2],[9,'m9',2],[5,'maj9',2],[7,'sus9',2]],       kit:'soft', comp:'hold',bass:'soft', mel:.45,pad:.34,bright:2600},
  'engine-sleep': {name:'ENGINE GLOW',  key:3,bpm:72,swing:.6, prog:[[0,'maj9'],[9,'m9'],[5,'maj9'],[7,'sus9']],                 kit:'warm', comp:'push',bass:'walk', mel:.55,pad:.2, bright:2800}};
const ALIAS={'orbital-cruise':'soft-orbit','night-shift':'cabin-warmth','deep-signal':'slow-current','empty-corridors':'space-wave','outer-dark':'quiet-engines','engine-room':'engine-sleep'};
const tapeOf=id=>TAPES[id]?id:ALIAS[id]||'soft-orbit';
/* drum patterns, 16 steps; digits are velocities (1-9) */
const KIT={
  full:{k:['9......6..7.....','9......6.8......'],s:['....8.......8...','....8.......8..2'],h:['5.3.5.3.5.3.5.3.','5.3.5.3.5.335.3.'],snare:'snare'},
  rim: {k:['8.........7.....','8......5..7.....'],s:['....7.......7...','....7.......7...'],h:['4.2.4.2.4.2.4.2.','4.2.4.2.4.224.2.'],snare:'soft'},
  warm:{k:['8......5..7.....','8.........7.....'],s:['....7.......7...','....7.......7...'],h:['4.2.4.2.4.2.4.2.','4.2.4.2.4.2.4.3.'],snare:'soft'},
  soft:{k:['7.........6.....','7.........5.....'],s:['....5.......5...','....5.......5...'],h:['3.2.3.2.3.2.3.2.','3.2.3.2.3.2.3.2.'],snare:'soft'},
  none:{k:['................'],s:['................'],h:['................'],snare:'brush'}};
function RNG(seed){let s=(seed>>>0)||1;return ()=>{s=(s+0x6D2B79F5)>>>0;let z=s;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296;};}
const hashStr=s=>String(s).split('').reduce((a,c)=>Math.imul(a^c.charCodeAt(0),16777619)>>>0,2166136261);
const mhz=m=>440*Math.pow(2,(m-69)/12);
function nearest(x){let best=null;for(let k=-2;k<6;k++)for(const p of PENT){const v=p+12*k,d=Math.abs(v-x);if(!best||d<best.d-1e-9)best={v,d};}return best.v;}
const NB=new WeakMap();
function noiseBuf(ctx){if(NB.has(ctx))return NB.get(ctx);const n=ctx.sampleRate,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;NB.set(ctx,b);return b;}
function vinylBuf(ctx,R){const sr=ctx.sampleRate,n=sr*5,b=ctx.createBuffer(2,n,sr);for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;
  for(let i=0;i<n;i++){const w=R()*2-1;lp+=.08*(w-lp);d[i]=lp*.05;}
  for(let i=0;i<n;i++){if(R()<.00035){const a=(R()*.6+.15)*(R()<.5?-1:1),L=2+Math.floor(R()*6);for(let k=0;k<L&&i+k<n;k++)d[i+k]+=a*Math.pow(.55,k);}}}return b;}
function roomIR(ctx){const sr=ctx.sampleRate,n=Math.floor(sr*1.5),b=ctx.createBuffer(2,n,sr);for(let c=0;c<2;c++){const d=b.getChannelData(c);let lp=0;
  for(let i=0;i<n;i++){const w=Math.random()*2-1;lp+=.25*(w-lp);d[i]=lp*Math.pow(1-i/n,3.2)*(i<sr*.012?i/(sr*.012):1);}}return b;}

/* each tape measured with loud.js (BS.1770, 4 minutes, seed 22910001) and trimmed to about -19.5 LUFS */
const TRIM={"soft-orbit": 0.507, "cabin-warmth": 0.531, "space-wave": 0.537, "slow-current": 0.582, "quiet-engines": 0.61, "engine-sleep": 0.531};

function make(ctx,dest,o){
  o=o||{};const TK=tapeOf(o.tape),T=TAPES[TK],seed=(o.seed>>>0)||22910001,SLEEP=!!o.sleep;
  const M={int:SLEEP?0:(o.intensity!=null?Math.max(0,Math.min(2,o.intensity|0)):1),lean:0};let state='normal',stopped=false;
  const beat=60/T.bpm,six=beat/4,barDur=beat*4,SW=(T.swing-.5)*2*six;
  const G=v=>{const g=ctx.createGain();g.gain.value=v;return g;},F=(type,f,q)=>{const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;if(q!=null)b.Q.value=q;return b;};
  /* ---- the mix ---- */
  const out=G(0);out.connect(dest);
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=2.5;comp.attack.value=.015;comp.release.value=.3;comp.knee.value=12;comp.connect(out);
  const sat=ctx.createWaveShaper();{const c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;c[i]=Math.tanh(x*1.4)/Math.tanh(1.4);}sat.curve=c;}sat.connect(comp);
  const warm=F('lowpass',7200,.5);warm.connect(sat);const hp=F('highpass',32,.6);hp.connect(warm);const sum=G(1);sum.connect(hp);
  const room=ctx.createConvolver();room.buffer=roomIR(ctx);const roomLP=F('lowpass',3800);const roomG=G(.55);room.connect(roomLP);roomLP.connect(roomG);roomG.connect(sum);
  /* tape wobble on the tonal parts: a slowly modulated short delay (a few cents of wow) */
  const wowD=ctx.createDelay(.05);wowD.delayTime.value=.014;const wowL=ctx.createOscillator(),wowA=G(.0011);wowL.frequency.value=.42;wowL.connect(wowA);wowA.connect(wowD.delayTime);
  const flut=ctx.createOscillator(),flA=G(.00012);flut.frequency.value=5.3;flut.connect(flA);flA.connect(wowD.delayTime);wowL.start();flut.start();
  const duck=G(1);duck.connect(wowD);wowD.connect(sum);
  const keysB=G(1),keysLP=F('lowpass',T.bright,.4),pan=ctx.createStereoPanner(),panL=ctx.createOscillator(),panA=G(.22);panL.frequency.value=.11;panL.connect(panA);panA.connect(pan.pan);panL.start();
  keysB.connect(keysLP);keysLP.connect(pan);pan.connect(duck);const keysSend=G(.28);keysLP.connect(keysSend);keysSend.connect(room);
  const padB=G(T.pad),padLP=F('lowpass',1100,.3);padB.connect(padLP);padLP.connect(duck);
  const melB=G(.9),melLP=F('lowpass',3600);melB.connect(melLP);melLP.connect(duck);const echo=ctx.createDelay(1.5);echo.delayTime.value=beat*.75;const fb=G(.32),eLP=F('lowpass',2200),eG=G(.35);
  melLP.connect(echo);echo.connect(eLP);eLP.connect(fb);fb.connect(echo);eLP.connect(eG);eG.connect(sum);const melSend=G(.35);melLP.connect(melSend);melSend.connect(room);
  const bassB=G(1),bassLP=F('lowpass',480,.5);bassB.connect(bassLP);bassLP.connect(sum);
  const drumB=G(1),drumLP=F('lowpass',6200,.4);drumB.connect(drumLP);drumLP.connect(sum);const drumSend=G(.12);drumLP.connect(drumSend);drumSend.connect(room);
  const vin=ctx.createBufferSource();vin.buffer=vinylBuf(ctx,RNG(seed^77));vin.loop=true;const vinHP=F('highpass',700),vinG=G(SLEEP?.35:.55);vin.connect(vinHP);vinHP.connect(vinG);vinG.connect(sum);vin.start();
  const L=[wowL,flut,panL,vin];
  if(o.solo){const S={keys:keysB,pad:padB,mel:melB,bass:bassB,drums:drumB,vin:vinG};for(const k in S)if(k!==o.solo)S[k].gain.value=0;if(o.solo!=='mel'){eG.gain.value=0;}} /* test hook: one stem at a time */
  /* ---- voices ---- */
  const NZ=noiseBuf(ctx);
  function nz(t,d){const s=ctx.createBufferSource();s.buffer=NZ;s.loopStart=0;s.loop=true;s.start(t,Math.random()*.5);s.stop(t+d);return s;}
  function osc(type,f,t,end){const x=ctx.createOscillator();x.type=type;x.frequency.value=f;x.start(t);x.stop(end);return x;}
  function rhodes(m,t,dur,vel,bus){const f=mhz(m),end=t+dur+1.6;const c=osc('sine',f,t,end),md=osc('sine',f,t,end),mg=G(0),a=G(0);
    const bark=Math.max(.4,1.6-(m-55)/24); /* lower notes bark a little more, like a real Rhodes */
    mg.gain.setValueAtTime(f*bark*vel,t);mg.gain.setTargetAtTime(f*.18,t+.005,.35);md.connect(mg);mg.connect(c.frequency);
    const tn=osc('sine',f*4.01,t,t+.4),tg=G(0);tg.gain.setValueAtTime(.018*vel,t);tg.gain.setTargetAtTime(0,t+.003,.05);tn.connect(tg);tg.connect(bus||keysB);
    a.gain.setValueAtTime(0,t);a.gain.linearRampToValueAtTime(.11*vel,t+.006);a.gain.setTargetAtTime(.04*vel,t+.02,.9);a.gain.setTargetAtTime(0,t+dur,.28);c.connect(a);a.connect(bus||keysB);}
  function bell(m,t,vel){const f=mhz(m),end=t+2.4;const a=osc('sine',f,t,end),b=osc('sine',f*2,t,end),g=G(0),g2=G(0);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.075*vel,t+.008);g.gain.setTargetAtTime(0,t+.02,.55);g2.gain.setValueAtTime(.02*vel,t);g2.gain.setTargetAtTime(0,t+.01,.18);
    a.connect(g);b.connect(g2);g.connect(melB);g2.connect(melB);}
  function bass(m,t,dur,vel){const f=mhz(m),end=t+dur+.5,a=osc('sine',f,t,end),b=osc('triangle',f,t,end),gb=G(.22),g=G(0);a.connect(g);b.connect(gb);gb.connect(g);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07*vel,t+.018);g.gain.setTargetAtTime(.045*vel,t+.04,.4);g.gain.setTargetAtTime(0,t+dur,.09);g.connect(bassB);}
  function pad(ms,t,dur){for(const m of ms){for(const dt of [-5,5]){const x=osc('triangle',mhz(m),t,t+dur+2.5);x.detune.value=dt;const g=G(0);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.03,t+.9);g.gain.setValueAtTime(.03,t+Math.max(.95,dur-.1));g.gain.linearRampToValueAtTime(0,t+dur+1.6);x.connect(g);g.connect(padB);}}}
  function kick(t,v){const x=osc('sine',110,t,t+.6),g=G(0);x.frequency.setValueAtTime(118,t);x.frequency.exponentialRampToValueAtTime(46,t+.09);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.62*v,t+.004);g.gain.setTargetAtTime(0,t+.02,.11);x.connect(g);g.connect(drumB);
    duck.gain.setValueAtTime(1,t);duck.gain.linearRampToValueAtTime(.8,t+.02);duck.gain.setTargetAtTime(1,t+.04,.13);}
  function snare(t,v){const s=nz(t,.3),bp=F('bandpass',1800,.7),g=G(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.2*v,t+.003);g.gain.setTargetAtTime(0,t+.01,.07);s.connect(bp);bp.connect(g);g.connect(drumB);
    const b=osc('triangle',190,t,t+.2),bg=G(0);bg.gain.setValueAtTime(.12*v,t);bg.gain.setTargetAtTime(0,t+.005,.04);b.connect(bg);bg.connect(drumB);}
  function rim(t,v){const s=nz(t,.08),bp=F('bandpass',2600,4),g=G(0);g.gain.setValueAtTime(.16*v,t);g.gain.setTargetAtTime(0,t+.002,.018);s.connect(bp);bp.connect(g);g.connect(drumB);
    const b=osc('triangle',880,t,t+.06),bg=G(0);bg.gain.setValueAtTime(.06*v,t);bg.gain.setTargetAtTime(0,t+.002,.012);b.connect(bg);bg.connect(drumB);}
  function soft(t,v){const s=nz(t,.25),bp=F('bandpass',1500,.6),lp=F('lowpass',3200),g=G(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.15*v,t+.003);g.gain.setTargetAtTime(0,t+.008,.055);s.connect(bp);bp.connect(lp);lp.connect(g);g.connect(drumB);
    const b=osc('sine',165,t,t+.15),bg=G(0);bg.gain.setValueAtTime(.06*v,t);bg.gain.setTargetAtTime(0,t+.004,.035);b.connect(bg);bg.connect(drumB);}
  function brush(t,v){const s=nz(t,.4),bp=F('bandpass',3000,.6),g=G(0);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06*v,t+.025);g.gain.setTargetAtTime(0,t+.04,.09);s.connect(bp);bp.connect(g);g.connect(drumB);}
  function hat(t,v){const s=nz(t,.12),hp_=F('highpass',7000),g=G(0);g.gain.setValueAtTime(.05*v,t);g.gain.setTargetAtTime(0,t+.002,.022);s.connect(hp_);hp_.connect(g);g.connect(drumB);}
  /* ---- the song: the progression as bars, a voice-led keys voicing per chord, the hook ---- */
  const BARS=[];for(const [deg,shape,n] of T.prog)for(let k=0;k<(n||1);k++)BARS.push({deg,shape,first:k===0,len:n||1});
  let prevC=61;
  const VOX=BARS.map(b=>{if(!b.first)return null;const root=T.key+b.deg,pcs=Q[b.shape].map(s=>(root+s)%12);
    /* place each tone in F3..A4 nearest the last chord's centre, so the hands barely move */
    const ms=pcs.map(pc=>{let best=null;for(let m=53;m<=70;m++)if(m%12===pc&&(best==null||Math.abs(m-prevC)<Math.abs(best-prevC)))best=m;return best;}).sort((a,b)=>a-b);
    const uniq=[...new Set(ms)];prevC=uniq.reduce((a,b)=>a+b,0)/uniq.length*.5+61*.5;let bm=36+((root%12)+12)%12;if(bm>44)bm-=12;return {keys:uniq,bass:bm,root};});
  for(let i=0;i<BARS.length;i++)if(!VOX[i])VOX[i]=VOX[i-1];
  const R0=RNG(seed^hashStr(T.name));
  /* the hook: two bars of a pentatonic line, 5-7 notes, C5-C6 */
  const PEN=[];for(let m=70;m<=86;m++)if(PENT.includes(((m-T.key)%12+12)%12))PEN.push(m);
  function hook(R){const steps=[0,3,6,8,11,14,16,19,22,24,27];const n=5+Math.floor(R()*3);const pos=[0];while(pos.length<n){const c=steps[1+Math.floor(R()*(steps.length-1))];if(!pos.includes(c))pos.push(c);}pos.sort((a,b)=>a-b);
    let ix=2+Math.floor(R()*3);return pos.map((p,i)=>{if(i){ix+=[-2,-1,-1,1,1,2][Math.floor(R()*6)];ix=Math.max(0,Math.min(PEN.length-1,ix));}return {step:p,m:PEN[ix],vel:.55+R()*.3};});}
  const HOOK=hook(R0),HOOK2=HOOK.map((n,i)=>i<HOOK.length-2?n:Object.assign({},n,{m:PEN[Math.max(0,Math.min(PEN.length-1,PEN.indexOf(n.m)+(i%2?-1:1)))]}));
  const at=(t0,step)=>t0+step*six+(step%2?SW:0);
  function bar(b,t0){
    const R=RNG(seed^Math.imul(b+1,2654435761)^hashStr(TK)),now=ctx.currentTime,ok=t=>t>=now-.01;
    const i=b%BARS.length,B=BARS[i],V=VOX[i],cyc=Math.floor(b/16),inC=b%16;
    const lite=SLEEP||M.int===0||(inC>=8&&RNG(seed^cyc*31)()<.3)||M.lean; /* a lighter half-cycle now and then */
    const intro=b<2;
    /* keys */
    const kv=SLEEP?.55:.85;
    const strum=(t,vel,len)=>{if(!ok(t))return;V.keys.forEach((m,k)=>rhodes(m,t+k*(.012+R()*.012),len,vel*(1-k*.06)*(.9+R()*.2)));};
    if(T.comp==='arp'){if(B.first)strum(t0,kv*.7,barDur*B.len*.9);const ord=[0,1,2,3,2,1];for(let s=4;s<16;s+=4){const m=V.keys[ord[(b*3+s/4)%ord.length]%V.keys.length];const t=at(t0,s);if(ok(t))rhodes(m+12,t,beat*1.5,.35+R()*.15);}}
    else if(T.comp==='push'){if(B.first||R()<.5)strum(t0,kv,beat*2.3);if(R()<.7)strum(at(t0,6),kv*.6,beat*1.2);if(R()<.55)strum(at(t0,10),kv*.7,beat*1.8);}
    else{if(B.first)strum(t0,kv,barDur*B.len*.85);else if(R()<.5)strum(at(t0,8),kv*.55,beat*3);if(R()<.35)strum(at(t0,14),kv*.45,beat*.9);}
    /* pad: the same chord, very quietly, under everything */
    if(B.first){const pt=Math.max(t0,now),pd=barDur*B.len-(pt-t0);if(pd>.5)pad(V.keys.map(m=>m+12>76?m:m+12).slice(0,3),pt,pd);}
    /* bass */
    if(!intro||T.kit==='none'){const bv=SLEEP?.7:1;
      if(T.bass==='hold'){if(B.first&&ok(t0))bass(V.bass,t0,barDur*B.len*.92,bv*.8);}
      else{if(ok(t0))bass(V.bass,t0,beat*1.6,bv);
        if(T.bass==='walk'){const t=at(t0,10);if(ok(t))bass(R()<.6?V.bass:V.bass+7,t,beat*.9,bv*.75);const nx=VOX[(i+1)%BARS.length];if(R()<.5&&nx.bass!==V.bass){const t2=at(t0,14);if(ok(t2))bass(nx.bass+(nx.bass>V.bass?-1:1)*(R()<.5?1:2),t2,beat*.4,bv*.5);}}
        else{const t=at(t0,8);if(R()<.6&&ok(t))bass(V.bass+(R()<.3?12:0),t,beat*1.4,bv*.6);}}}
    /* drums */
    if(!intro&&!SLEEP&&M.int>0&&T.kit!=='none'){const K=KIT[T.kit],var_=(b%4===3)?1:0,dv=M.int===1?.75:1;
      const run=(pat,fn,swing,hum)=>{for(let s=0;s<16;s++){const c=pat[s];if(c==='.')continue;const v=(+c)/9*dv;let t=swing?at(t0,s):t0+s*six;t+=(R()-.5)*hum;if(ok(t))fn(t,v);}};
      if(!lite)run(K.k[var_%K.k.length],kick,false,.004);
      if(!lite){const sn=K.snare==='snare'?snare:K.snare==='soft'?soft:K.snare==='rim'?rim:brush;run(K.s[var_%K.s.length],(t,v)=>sn(t+.012,v),false,.006);} /* the backbeat sits a hair late */
      run(K.h[var_%K.h.length],(t,v)=>hat(t,v*(lite?.7:1)*(.8+R()*.4)),true,.008);}
    /* the hook */
    const want=T.mel*[.0,.6,1][SLEEP?0:M.int];
    if(!intro&&want>0&&(inC===4||inC===6||(M.int===2&&(inC===12||inC===14)))&&RNG(seed^cyc*97^inC)()<want+.25){const H=(inC===6||inC===14)?HOOK2:HOOK;
      for(const n of H){const bOff=n.step>=16?barDur:0,s=n.step%16;const t=at(t0+bOff,s)+(R()-.5)*.01;if(ok(t))bell(n.m,t,n.vel);}}
  }
  /* ---- clock ---- */
  const t0=o.startAt!=null?o.startAt:ctx.currentTime+.05;let bN=Math.max(0,Math.floor((ctx.currentTime-t0)/barDur));
  function tick(h){if(stopped)return;while(t0+bN*barDur<h){bar(bN,t0+bN*barDur);bN++;}}
  function setState(s){state=s;M.lean=(s==='quiet'||s==='abandoned')?1:0;}
  function setIntensity(n){M.int=SLEEP?0:Math.max(0,Math.min(2,n|0));}
  function hero(kind){if(stopped||!/^(relay|scanner|chime)$/.test(kind))return;const t=ctx.currentTime+.05,V=VOX[bN%BARS.length];rhodes(V.keys[V.keys.length-1]+12,t,1.2,.35);rhodes(V.keys[V.keys.length-2]+12,t+.18,1.2,.28);}
  function stop(f){if(stopped)return;stopped=true;const t=ctx.currentTime;out.gain.cancelScheduledValues(t);out.gain.setTargetAtTime(0,t,Math.max(.05,(f||.5)/3));
    setTimeout(()=>{for(const x of L){try{x.stop();}catch(e){}}try{out.disconnect();}catch(e){}},((f||.5)+.8)*1000);}
  const LV=TRIM[TK]||1;out.gain.setValueAtTime(0,ctx.currentTime);out.gain.linearRampToValueAtTime(LV,ctx.currentTime+Math.max(.3,Math.min(o.fadeIn||1.5,15)));
  return {tick,ahead:2,skip(){},setState,setIntensity,hero,stop,get state(){return state;},tape:T.name,plan:{ev:[]},bpm:T.bpm};}
const LUFS={"soft-orbit": -19.5, "soft-orbit:sleep": -22.9, "cabin-warmth": -19.5, "cabin-warmth:sleep": -22.6, "space-wave": -19.5, "space-wave:sleep": -22.9, "slow-current": -19.5, "slow-current:sleep": -22.7, "quiet-engines": -19.5, "quiet-engines:sleep": -22.4, "engine-sleep": -19.5, "engine-sleep:sleep": -22.4, "orbital-cruise": -19.5, "orbital-cruise:sleep": -22.9, "night-shift": -19.5, "night-shift:sleep": -22.6, "deep-signal": -19.5, "deep-signal:sleep": -22.7, "empty-corridors": -19.5, "empty-corridors:sleep": -22.9, "outer-dark": -19.5, "outer-dark:sleep": -22.4, "engine-room": -19.5, "engine-room:sleep": -22.4};
window.DEEP={make,TAPES,ALIAS,tapeOf,PENT,nearest,LUFS,TRIM};
})();
