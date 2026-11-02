/* DeadScout · MIX: the music engine. Synthwave, spacewave, chillwave and darksynth, generated as it plays.
   Every sound is synthesized here (oscillators, noise, filters, a generated reverb): no samples, no loops, no AI, nothing
   copied from any record. A mix is a run of original tracks, each with its own key, tempo, chord progression, motif and form,
   with the location's own machinery breathing in the gaps between them.

   LMXM.plan(dna, seed, until) -> the tracklist (start, length, name, tempo, key), the same every time for the same seed.
   The engine is a mix.js layer (PRIM.mixtape) that schedules notes on a 16th-note grid, a couple of seconds ahead. */
(function(){
"use strict";
const X=LMX._,{RNG,bq,db,clamp,PRIM}=X;
const lerp=(a,b,k)=>a+(b-a)*k;
const STYLES={
  synthwave:{name:'SYNTHWAVE',bpm:[96,112],bars:[64,80],cb:1,kick:'four',bass:'eighths',drive:.15,arp:16,lead:'saw',pad:'sawtooth',padLp:[1500,2600],rev:2.6,wow:0,trim:0,
    genres:'Synthwave • Spacewave • Dark Electronic • Retro-Future Mix',tags:'#synthwave #retrowave #spacewave #chillwave #scifimusic #codingmusic #nightdrive'},
  spacewave:{name:'SPACEWAVE',bpm:[72,86],bars:[48,60],cb:2,kick:'half',bass:'long',drive:0,arp:8,lead:'tri',pad:'sawtooth',padLp:[900,1700],rev:4.6,wow:6,trim:-2.2,
    genres:'Spacewave • Synthwave • Dark Electronic • Sci-Fi Mix',tags:'#spacewave #synthwave #darkambient #scifimusic #spacemusic #focusmusic #deepfocus'},
  chillwave:{name:'CHILLWAVE',bpm:[80,92],bars:[56,72],cb:1,kick:'chill',bass:'offbeat',drive:0,arp:8,lead:'square',pad:'triangle',padLp:[1100,2000],rev:3,wow:10,trim:0.1,
    genres:'Chillwave • Synthwave • Spacewave • Late-Night Mix',tags:'#chillwave #synthwave #vaporwave #spacewave #studymusic #latenight #scifimusic'},
  darksynth:{name:'DARKSYNTH',bpm:[104,118],bars:[64,80],cb:1,kick:'four',bass:'sixteenths',drive:.85,arp:16,lead:'saw',pad:'sawtooth',padLp:[700,1400],rev:2.2,wow:0,trim:-3.2,
    genres:'Dark Synthwave • Darksynth • Cyberpunk • Electronic',tags:'#darksynth #darksynthwave #cyberpunk #synthwave #gamingmusic #electronicmusic #scifimusic'}};
const STYLE_IDS=Object.keys(STYLES);
const MX0={tempo:.5,energy:.5,drums:1,bass:1,arp:1,lead:1,pads:1,amb:.7};
const ARC_DEF=[.35,.45,.55,.75,.85,.45];
/* minor progressions, in scale degrees (0 = i, 5 = VI, 2 = III, 6 = VII, 3 = iv, 4 = v) */
/* chord roots in semitones above the key: every one of them in the minor pentatonic (0 3 5 7 10) */
const PROGS=[[0,10,3,5],[0,3,10,5],[3,10,0,0],[0,0,10,3],[0,10,3,10],[0,5,10,3],[0,10,5,7],[0,7,3,10],[5,3,0,10],[5,10,0,7]]; /* calm first, tense last */
const PENTA=[0,3,5,7,10];
const KEYS=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
/* the tracks' names: the universe's own words, never a story */
const PLACES={mining:['Kessler-9','Themis IV','Talus'],maintenance:['Bay C','Halvard-2','Deck 9'],quarters:['Module 4','Halvard-2','the Night Cycle'],refinery:['Talus 2','Themis IV','the Press Line'],
  greenhouse:['Dome 3','New Hale','the Grow Lights'],relay:['Relay 6','the Outer Belt','Meridian'],elevator:['Cargo 7','Mare Frigoris','the Anchor'],radar:['Vesk','Station 4','the Highlands'],
  research:['the Halcyon','Deck 7','Airlock 2'],powerplant:['Kraken Shore','Titan','Plant 1'],docking:['Europa','Bay 2','the Jupiter Window'],corridor:['Deck 41','Corridor 12-C','Halvard-2']};
const NOUNS=['Signal','Orbit','Coolant','Night Shift','Reactor','Static','Beacon','Horizon','Drift','Hull','Lights','Transit','Engine','Echo','Glass','Garden','Silence','Frequency','Machine','Dust','Gravity','Terminal','Pulse','Heat','Ice','Lantern','Antenna','Current','Tide','Relay','Furnace','Window','Satellite','Shift Bell','Pressure','Landing'];
const ADJS=['Silent','Distant','Hollow','Pale','Electric','Frozen','Quiet','Lost','Midnight','Orbital','Mechanical','Slow','Low','Copper','Amber','Last','Long','Cold','Sleeping','Endless'];
const TEMPL=[r=>r.pick(ADJS)+' '+r.pick(NOUNS),r=>'Last '+r.pick(NOUNS)+' on '+r.pick(r.P),r=>'The '+r.pick(NOUNS)+' Never Sleeps',r=>r.pick(NOUNS)+' After Midnight',r=>'Nobody on '+r.pick(r.P),
  r=>'Somewhere Past '+r.pick(r.P),r=>r.pick(r.P)+' '+r.pick(['Is Still Listening','Never Answered','After the Crew','Goes Dark','Keeps Running','at Night','Wakes Up','Remembers'])+'',r=>r.pick(ADJS)+' '+r.pick(NOUNS)+'s',r=>'Leaving '+r.pick(r.P),r=>r.pick(NOUNS)+' Over '+r.pick(r.P)];
/* ---------- the plan: tracks one after another, a little of the place in between ---------- */
function plan(dna,seed,until){const St=STYLES[dna.style]||STYLES.synthwave,mx=Object.assign({},MX0,dna.mx||{}),r=RNG(seed||1,'mix:'+(dna.style||'synthwave'));r.P=PLACES[dna.scene]||PLACES.mining;
  const out=[],used=new Set();let t=.4,i=0; /* the first beat lands straight away: listeners decide in seconds */
  const al=Object.assign({tlen:'mid',gap:3},dna.al||{});
  while(t<(until||3600)&&i<300){const bpm=Math.round(lerp(St.bpm[0],St.bpm[1],clamp(mx.tempo*.8+r()*.4-.2,0,1))),first=i===0,cold=first?8:0,intro=first?0:(St.cb>1?4:2),rl=r(),aLen=al.tlen==='short'?8:al.tlen==='long'?24:16,chL=al.tlen==='short'?16:al.tlen==='long'?32:30,bars=cold+intro+aLen+24+2*chL,dur=bars*240/bpm;
    let name='';for(let k=0;k<12&&(!name||used.has(name));k++)name=r.pick(TEMPL)(r);used.add(name);
    out.push({i,start:t,dur,bpm,bars,aLen,chL,cold,intro,name,root:r.int(0,11),prog:r.pick(PROGS),seed:(r()*1e9)|0});t+=dur+Math.max(0,(al.gap!=null?al.gap:3)*r.range(.8,1.2));i++;}
  return out;}
/* ---------- a generated reverb: decaying noise, a little darker as it fades ---------- */
function irBuf(c,secs,gate){const n=Math.floor(c.sampleRate*secs),b=c.createBuffer(2,n,c.sampleRate),r=RNG(7,'ir'+secs);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let lp=0;for(let i=0;i<n;i++){const k=i/n,a=gate?(k<.85?1:(1-k)/.15):Math.pow(1-k,3.2),w=r()*2-1;lp+=(w-lp)*(gate?.6:lerp(.7,.12,k));d[i]=lp*a*(gate?.6:1);}}return b;}
function shaper(c,k){const w=c.createWaveShaper(),cv=new Float32Array(1025);for(let i=0;i<1025;i++){const x=(i-512)/512;cv[i]=Math.tanh(x*(1+k*6))/Math.tanh(1+k*6);}w.curve=cv;return w;}
/* ---------- the engine ---------- */
function pMix(E,L,r0){const c=E.ctx,St=STYLES[L.style]||STYLES.synthwave,mx=Object.assign({},MX0,L.mx||{}),dna={style:L.style,scene:L.scene,mx,al:L.al,arc:L.arc};
  const silent=c.createGain();silent.gain.value=0;
  const master=c.createGain();master.gain.value=db(-17+(St.trim||0));const tone=bq(c,'lowpass',18000,.6);const gateM=c.createGain();master.connect(tone).connect(gateM).connect(E.bus||silent); /* tone: the filter swell; gateM: the stop before the drop */
  const rev=c.createConvolver();rev.buffer=irBuf(c,St.rev,false);const revG=c.createGain();revG.gain.value=.55;rev.connect(revG).connect(master);
  const gate=c.createConvolver();gate.buffer=irBuf(c,.32,true);const gateG=c.createGain();gateG.gain.value=.5;gate.connect(gateG).connect(master);
  const dl=c.createDelay(2),dr=c.createDelay(2),fb=c.createGain(),dlp=bq(c,'lowpass',2800,.5),pL=c.createStereoPanner(),pR=c.createStereoPanner(),dG=c.createGain();fb.gain.value=.38;dG.gain.value=.45;pL.pan.value=-.7;pR.pan.value=.7;
  dl.connect(dlp).connect(dr).connect(fb).connect(dl);dl.connect(pL).connect(dG);dr.connect(pR).connect(dG);dG.connect(master);dG.connect(rev);
  /* the sidechain: everything melodic breathes with the kick */
  const duck=c.createGain();duck.connect(master);
  const bus={};for(const k of ['drums','bass','arp','lead','pads']){const g=c.createGain();g.gain.value=mx[k];bus[k]=g;g.connect(k==='drums'?master:duck);}
  /* chorus for the pads: two slowly moving short delays, left and right */
  const ch=c.createGain();for(const [pan,ms,rate] of [[-1,.015,.31],[1,.022,.23]]){const d=c.createDelay(.1);d.delayTime.value=ms;const lfo=c.createOscillator();lfo.frequency.value=rate;const lg=c.createGain();lg.gain.value=.005;lfo.connect(lg).connect(d.delayTime);lfo.start(E.t0);E.srcs.push(lfo);
    const p=c.createStereoPanner();p.pan.value=pan;ch.connect(d).connect(p).connect(bus.pads);}ch.connect(bus.pads);
  /* tape wobble for spacewave and chillwave: every oscillator drifts together */
  let wow=null;if(St.wow){const o=c.createOscillator();o.frequency.value=.35;wow=c.createGain();wow.gain.value=St.wow;o.connect(wow);o.start(E.t0);E.srcs.push(o);}
  const N=E.N;
  function osc(type,f,t,end){const o=c.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(wow)wow.connect(o.detune);o.start(t);o.stop(end);return o;}
  function done(src,nodes){src.onended=()=>{for(const n of nodes)try{n.disconnect();}catch(e){}if(wow)try{wow.disconnect(src.detune);}catch(e){}};}
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  /* drums */
  function kick(t,a){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.12);o.frequency.exponentialRampToValueAtTime(36,t+.5);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.7);
    o.connect(g).connect(bus.drums);o.start(t);o.stop(t+.75);done(o,[g]);
    const d=mx.drums>0?.55:0;duck.gain.setValueAtTime(1-d*.6,t);duck.gain.linearRampToValueAtTime(1,t+.22);}
  function noiseHit(t,dur,type,f,q,a,dest,att){const s=c.createBufferSource();s.buffer=N.white;s.loop=true;const fl=bq(c,type,f,q),g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+(att||.002));g.gain.exponentialRampToValueAtTime(.001,t+dur);
    s.connect(fl).connect(g);for(const d of dest)g.connect(d);s.start(t,(t*7.31)%10);s.stop(t+dur+.05);done(s,[fl,g]);}
  function snare(t,a){noiseHit(t,.22,'bandpass',1900,.8,a,[bus.drums,gate]);const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(210,t);o.frequency.exponentialRampToValueAtTime(160,t+.08);g.gain.setValueAtTime(a*.5,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);o.connect(g).connect(bus.drums);o.start(t);o.stop(t+.15);done(o,[g]);}
  const hat=(t,a,open)=>noiseHit(t,open?.22:.045,'highpass',open?6500:8000,.7,a,[bus.drums]);
  const clap=(t,a)=>{for(let k=0;k<3;k++)noiseHit(t+k*.011,.12,'bandpass',1300,1.2,a*(k===2?1:.6),[bus.drums,gate]);};
  function tom(t,f,a){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(f*1.6,t);o.frequency.exponentialRampToValueAtTime(f,t+.08);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.003);g.gain.exponentialRampToValueAtTime(.001,t+.38);
    o.connect(g);g.connect(bus.drums);g.connect(gate);o.start(t);o.stop(t+.42);done(o,[g]);noiseHit(t,.06,'bandpass',f*4,1,a*.25,[bus.drums]);}
  const crash=(t,a)=>{noiseHit(t,2.2,'highpass',3800,.5,a,[bus.drums,rev],.004);noiseHit(t,1.2,'bandpass',7000,2,a*.5,[bus.drums]);};
  function riser(t,dur,a){const s=c.createBufferSource();s.buffer=N.white;s.loop=true;const bp=bq(c,'bandpass',300,1.4),g=c.createGain();bp.frequency.setValueAtTime(300,t);bp.frequency.exponentialRampToValueAtTime(7000,t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.05);s.connect(bp).connect(g);g.connect(master);g.connect(rev);s.start(t,(t*3.1)%10);s.stop(t+dur+.1);done(s,[bp,g]);}
  /* bass */
  const shp=St.drive?shaper(c,St.drive):null;if(shp)shp.connect(bus.bass);
  function bassNote(t,m,dur,a){const f=mtof(m),g=c.createGain(),lp=bq(c,'lowpass',lerp(360,1100,curE),St.drive?2:.9);const o1=osc('sawtooth',f,t,t+dur+.1),o2=osc(St.drive?'square':'sine',f/(St.drive?1:2)*(St.drive?1.003:1),t,t+dur+.1);
    lp.frequency.setValueAtTime(lp.frequency.value*2.2,t);lp.frequency.exponentialRampToValueAtTime(lp.frequency.value,t+.12);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a*.6,t+.006);g.gain.setValueAtTime(a*.5,t+dur*.6);g.gain.linearRampToValueAtTime(0,t+dur);o1.connect(lp);o2.connect(lp);lp.connect(g).connect(shp||bus.bass);done(o1,[lp,g]);
    const sf=f>70?f/2:f,so=osc('sine',sf,t,t+dur+.15),sg=c.createGain();sg.gain.setValueAtTime(0,t);sg.gain.linearRampToValueAtTime(a*2.4,t+.015);sg.gain.setValueAtTime(a*2.4,t+dur*.8);sg.gain.linearRampToValueAtTime(0,t+dur+.1);so.connect(sg).connect(bus.bass);done(so,[sg]);}
  let curE=mx.energy; /* the playing track's energy */
  /* pads: a detuned stack per chord tone */
  function pad(t,ms,dur,a){const g=c.createGain(),lp=bq(c,'lowpass',r0.range(St.padLp[0],St.padLp[1])*(.65+.7*curE),.7);const att=Math.min(1.2,dur*.3),rel=1.6;let last=null;
    const pl=c.createStereoPanner(),pr=c.createStereoPanner();pl.pan.value=-.85;pr.pan.value=.85;pl.connect(lp);pr.connect(lp);
    for(const m of ms)for(const det of [-11,10]){const o=osc(St.pad,mtof(m),t,t+dur+rel);o.detune.value=det;o.connect(det<0?pl:pr);last=o;}
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a/Math.sqrt(ms.length),t+att);g.gain.setValueAtTime(a/Math.sqrt(ms.length),t+dur);g.gain.linearRampToValueAtTime(0,t+dur+rel);
    lp.connect(g);g.connect(ch);g.connect(rev);done(last,[lp,g,pl,pr]);}
  let side=1;function pluck(t,m,dur,a,type,cut,dest){const g=c.createGain(),lp=bq(c,'lowpass',cut,2);const pn=c.createStereoPanner();side=-side;pn.pan.value=.4*side;const o=osc(type,mtof(m),t,t+dur+.3);lp.frequency.setValueAtTime(cut*2.5,t);lp.frequency.exponentialRampToValueAtTime(cut,t+.09);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+dur+.25);o.connect(lp).connect(g).connect(pn);for(const d of dest)pn.connect(d);done(o,[lp,g,pn]);}
  function leadNote(t,m,prev,dur,a){const g=c.createGain(),lp=bq(c,'lowpass',2600,1);const type=St.lead==='tri'?'triangle':St.lead==='square'?'square':'sawtooth';const o=osc(type,mtof(prev!=null?prev:m),t,t+dur+.4);
    if(prev!=null&&prev!==m)o.frequency.exponentialRampToValueAtTime(mtof(m),t+.06);const v=c.createOscillator();v.frequency.value=5.2;const vg=c.createGain();vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(12,t+Math.min(dur,.5));v.connect(vg).connect(o.detune);v.start(t);v.stop(t+dur+.4);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(a,t+.02);g.gain.setValueAtTime(a,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.35);o.connect(lp).connect(g).connect(bus.lead);g.connect(dl);g.connect(rev);done(o,[lp,g,vg]);}
  /* ---------- one track: its form, its key, its hook. Every note is snapped to the key's minor pentatonic ---------- */
  const TR={};
  function track(T){if(TR[T.i])return TR[T.i];const r=RNG(T.seed,'track'),K=T.root;
    const isP=m=>PENTA.includes((((m-K)%12)+12)%12);
    const q=m=>{for(let d=0;d<7;d++){if(isP(m-d))return m-d;if(isP(m+d))return m+d;}return m;}; /* the nearest pentatonic note, downward on a tie */
    const intro=T.intro!=null?T.intro:2,form=[];const add=(sec,n)=>{for(let k=0;k<n;k++)form.push({sec,sb:k,sl:n});};
    if(T.cold)add('chorus',T.cold); /* the first track opens cold, on its chorus */
    if(intro)add('intro',intro);add('verse',T.aLen||8);add('build',4);add('chorus',T.chL||16);add('break',8);add('build2',4);add('chorus2',T.chL||16);add('outro',8);
    /* the chord on each bar: the progression's root, then the nearest scale notes above it (open, sus-flavoured voicings) */
    const chordAt=bar=>{const rt=T.prog[Math.floor(bar/St.cb)%4],third=[3,4,2,5].find(x=>isP(K+rt+x)),fifth=[7,5,8].find(x=>isP(K+rt+x)),top=[10,12,14].find(x=>isP(K+rt+x));return {rt,iv:[0,third,fifth,top]};};
    /* the hook: a two-bar phrase on an 8th-note grid, in pentatonic steps; phrased A, A', A, then home */
    const pidx=n=>{const o=Math.floor(n/5),k=((n%5)+5)%5;return 12*o+PENTA[k];}; /* scale step -> semitones above the key */
    const rhythms=[[0,2,3,4,6,8,10,12,14],[0,3,6,8,10,12],[0,2,4,6,8,11,12],[0,4,6,8,12,14],[0,2,3,6,8,10,11,14],[0,1,2,4,8,9,10,12]];
    const E0=T.energy!=null?T.energy:mx.energy,byLen=rhythms.slice().sort((a,b)=>a.length-b.length),rh=byLen[Math.min(byLen.length-1,Math.floor(clamp(E0+r.pm(.25),0,.999)*byLen.length))]; /* busier hooks when the story is tense */let cur=r.int(4,7);const hook=rh.map((sl,k)=>{if(k)cur=clamp(cur+r.pick([-1,1,-2,2,1,-1,0,3,-3]),2,10);return [sl,cur];});
    for(let k=0;k<hook.length;k++)hook[k][2]=(k+1<hook.length?hook[k+1][0]:16)-hook[k][0];
    const hookB=hook.map(x=>x.slice());hookB[hookB.length-1][1]=clamp(hookB[hookB.length-1][1]+r.pick([1,2,-1]),2,10);
    const hookEnd=hook.map(x=>x.slice());hookEnd[hookEnd.length-1][1]=5;if(hookEnd.length>1)hookEnd[hookEnd.length-2][1]=r.pick([6,7,4]); /* step 5 = the key, an octave up: home */
    const arpPat=r.pick([[0,1,2,3,2,1],[0,1,2,3],[0,2,1,3],[3,2,1,0],[0,1,2,1,3,1]]);
    return (TR[T.i]={T,r,K,q,isP,chordAt,pidx,form,intro,hook,hookB,hookEnd,arpPat,last:null});}
  /* ---------- one 16th-note step of the song ---------- */
  function play(T,s,t){const P=track(T),bar=Math.floor(s/16),st=s%16,F=P.form[bar]||{sec:'outro',sb:7,sl:8},sec=F.sec,sb=F.sb,E2=T.energy!=null?T.energy:mx.energy,beat=60/T.bpm;
    const ch=P.chordAt(bar),K=P.K,q=P.q;curE=E2;
    if(s===0){for(const g in E.grp)if(E.grp[g].gap)E.grp[g].gap.gain.setTargetAtTime(1,t,.6);}
    if(sec==='outro'&&sb===4&&st===0){for(const g in E.grp)if(E.grp[g].gap)E.grp[g].gap.gain.setTargetAtTime(1.7,t,2.5);} /* the place comes up as the track winds down */
    const chorus=sec==='chorus'||sec==='chorus2',build=sec==='build'||sec==='build2',fadeIn=sec==='intro'?Math.min(1,.5+(sb+1)/P.intro/2):1,fadeOut=sec==='outro'?Math.max(0,1-sb/8):1;
    const stopNow=(sec==='intro'||build)&&sb===F.sl-1&&st>=12&&E2>.3;
    /* the filter swell at the start, a one-beat stop before every drop, the filter closing at the end */
    if(st===0&&bar===0){P.last=null;tone.frequency.cancelScheduledValues(t);if(P.intro){const iEnd=t+P.intro*4*beat;tone.frequency.setValueAtTime(500,t);tone.frequency.exponentialRampToValueAtTime(18000,iEnd-beat*.5);}else tone.frequency.setValueAtTime(18000,t);}
    if(stopNow&&st===12){gateM.gain.setValueAtTime(1,t);gateM.gain.linearRampToValueAtTime(.04,t+.03);gateM.gain.setValueAtTime(.04,t+beat-.02);gateM.gain.linearRampToValueAtTime(1,t+beat);}
    if(sec==='outro'&&sb===0&&st===0){tone.frequency.setValueAtTime(18000,t);tone.frequency.exponentialRampToValueAtTime(700,t+8*4*beat);}
    if(build&&sb===0&&st===0)riser(t,4*4*beat-beat,db(-24));
    /* PADS: one chord per chord-length, wide; under the verse, lifted in the chorus */
    if(st===0&&bar%St.cb===0&&!(sec==='outro'&&fadeOut<.2)){const ms=ch.iv.map(x=>q(48+K+ch.rt+x));pad(t,ms,St.cb*4*beat,db(chorus?-10:sec==='break'?-9:-12)*fadeIn*fadeOut);}
    /* DRUMS */
    const drums=mx.drums>0&&(sec==='verse'||chorus||build||sec==='outro'&&sb<4);
    if(mx.drums>0&&sec==='intro'&&!stopNow){if(st%2===0)hat(t,db(st%4===2?-20:-26),false);if(sb===P.intro-1&&st%4===0&&st<12&&St.kick!=='half')kick(t,db(-7));}
    if(drums&&!stopNow){const Kp=St.kick;
      const kAt=build&&sb>=2?[0,4,8,12]:Kp==='four'?[0,4,8,12]:Kp==='half'?[0,10]:[0,7,10];if(kAt.includes(st))kick(t,db(-5));
      if(build){const div=sb<2?4:sb<3?2:1;if(st%div===0)snare(t,db(-22+12*((sb*16+st)/64)));} /* the roll: quarters, 8ths, 16ths, louder and louder */
      else{const sAt=Kp==='half'?[8]:[4,12];if(sAt.includes(st)){(Kp==='chill'?clap:snare)(t,db(-9));if(chorus&&Kp!=='chill')clap(t,db(-17));}}
      if(E2>.75&&(chorus||sec==='verse')&&st===14&&St.kick==='four'&&P.r()<.5)kick(t,db(-11));
      const hd=(chorus&&St.arp===16)||E2>.6?1:2;if(st%hd===0&&!build)hat(t,db(st%4===2?-19:-25)*(.85+.15*P.r()),false);
      if(chorus&&st%4===2&&Kp!=='half'&&E2>.35)hat(t,db(-24),true);
      if(chorus&&sb%8===7&&st>=12)tom(t,[220,170,130,100][st-12],db(-11)); /* a tom fill at the end of every phrase */
      if((chorus||sec==='verse')&&sb===0&&st===0)crash(t,db(chorus?-17:-22));}
    /* BASS: 8ths in the verse, the outrun gallop in the chorus; the root, and the fifth for movement */
    if(mx.bass>0&&sec!=='intro'&&!(sec==='outro'&&sb>=6)&&!stopNow){let pat,len;
      if(sec==='break'){pat=[0];len=4*beat*.95;}
      else if(St.bass==='long'){pat=[0];len=St.cb*4*beat*.95;}
      else if(St.bass==='offbeat'){pat=[0,3,6,10,12];len=beat*.45;}
      else if(chorus){pat=St.bass==='sixteenths'?[...Array(16).keys()]:[0,2,3,4,6,7,8,10,11,12,14,15];len=beat/4*.9;}
      else{pat=St.bass==='sixteenths'?[0,2,3,4,6,7,8,10,11,12,14,15]:[0,2,4,6,8,10,12,14];len=beat/2*.85;}
      if(pat.includes(st)){const fifth=(st===6||st===14)&&P.r()<.35,oct=St.bass==='eighths'&&!chorus&&st===14?12:0,base=36+K>43?24+K:36+K;bassNote(t,q(base+ch.rt+(fifth?7:0)+oct),len,db(sec==='break'?-12:-9));}}
    /* ARPEGGIO: chord tones over two octaves, opening up through the song */
    if(mx.arp>0&&sec!=='break'&&!stopNow){const g=St.arp===16?1:2;if(st%g===0){const k=(s/g)|0,pat=P.arpPat,iv=ch.iv[pat[k%pat.length]%ch.iv.length]+12*Math.floor((k%(pat.length*2))/pat.length);
      const cut=lerp(900,3400,sec==='intro'?(sb+st/16)/P.intro:sec==='outro'?fadeOut:build?.5+.5*(sb/4):chorus?.65+.35*E2:.45);pluck(t,q(60+K+ch.rt+iv),beat/(g===1?4:2)*.9,db(-23)*fadeIn*fadeOut,St.arp===16?'square':'triangle',cut,[bus.arp,dl]);}}
    /* LEAD: the hook in the chorus (A, A', A, home), doubled an octave up in the last chorus; long chord tones in the verse and the break */
    if(mx.lead>0&&st%2===0&&!stopNow){
      if(chorus){const ph=Math.floor(sb/2)%4,mot=ph===1?P.hookB:ph===3?P.hookEnd:P.hook,slot=(sb%2)*8+st/2;
        for(const [ms,n,len] of mot)if(ms===slot){const m=q(60+K+P.pidx(n));leadNote(t,m,P.last,len*beat/2*.92,db(-14));if(sec==='chorus2')leadNote(t,m+12,P.last!=null?P.last+12:null,len*beat/2*.92,db(-22));P.last=m;}}
      else if(sec==='verse'&&sb%2===0&&st===0&&E2>.4){leadNote(t,q(72+K+ch.rt+ch.iv[1]),null,8*beat*.9,db(-22));P.last=null;}
      else if(sec==='break'&&sb%4===0&&st===0){leadNote(t,q(72+K+ch.rt+ch.iv[2]),null,12*beat,db(-20));P.last=null;}}}
  /* ---------- the scheduler ---------- */
  const ALB=L.trackList?{tracks:L.trackList.slice().sort((a,b)=>a.start-b.start)}:album(dna,L.seed,L.total||3600); /* a given list: the synth fills only its own windows */let tracks=ALB.tracks.slice(),ti=0,step=0;const STEPS_AHEAD=2.2;
  function stepAt(T,s){return T.start+s*60/T.bpm/4;}
  function tick(up){const until=E.t0+up+STEPS_AHEAD;let guard=0;
    while(guard++<400000){let T=tracks[ti];if(!T)return; /* the album is over */
      const total=T.bars*16;if(step>=total){ti++;step=0;continue;}const t=E.t0+stepAt(T,step);if(t>until)return;
      if(t>=c.currentTime-.02)play(T,step,Math.max(t,c.currentTime+.005));step++;}}
  E.music={set(v){const n=c.currentTime;for(const k in v)if(bus[k])bus[k].gain.setTargetAtTime(Math.max(0,v[k]),n,.1);},tracks:()=>tracks};
  return {out:silent,tick};}
PRIM.mixtape=pMix;
/* ---------- the album: tracks to fill the length, chapters on track boundaries, the story's energy on every track ---------- */
function chapters(tracks,n,total,weights){n=Math.max(1,Math.min(n,tracks.length));const W=Array.from({length:n},(_,k)=>Math.max(.05,+(weights&&weights[k])||1)),WS=W.reduce((a,b)=>a+b,0),goal=[0];let acc=0;
  for(let k=1;k<n;k++){acc+=W[k-1];goal.push(acc/WS*total);} /* pacing targets, not timestamps: page turns land on track boundaries, as close to the targets as the album allows */
  const T=tracks.length,INF=1e18,C=Array.from({length:n},()=>new Float64Array(T).fill(INF)),B=Array.from({length:n},()=>new Int32Array(T).fill(-1));C[0][0]=0;
  for(let k=1;k<n;k++)for(let j=k;j<=T-(n-k);j++){const d=tracks[j].start-goal[k],c0=d*d;for(let q=k-1;q<j;q++){const v=C[k-1][q]+c0;if(v<C[k][j]){C[k][j]=v;B[k][j]=q;}}}
  let j=n>1?-1:0;if(n>1){let best=INF;for(let x=n-1;x<T;x++)if(C[n-1][x]<best){best=C[n-1][x];j=x;}}const idx=new Array(n);for(let k=n-1;k>=0;k--){idx[k]=j;j=k?B[k][j]:0;}idx[0]=0;
  return idx.map((i0,k)=>{const i1=k+1<n?idx[k+1]:T;return {k,start:k?tracks[i0].start-.5:0,end:k+1<n?tracks[idx[k+1]].start-.5:total,tracks:tracks.slice(i0,i1).map(T=>T.i)};});}
function album(dna,seed,target){const all=plan(dna,seed,(target||3600)+1800),tracks=[];for(const T of all){if(tracks.length&&T.start>(target||3600)-100)break;tracks.push(T);}
  const total=Math.ceil(tracks[tracks.length-1].start+tracks[tracks.length-1].dur+5),arc=dna.arc||{},curve=arc.curve&&arc.curve.length?arc.curve:ARC_DEF,mx=Object.assign({},MX0,dna.mx||{});
  const ch=chapters(tracks,arc.n||curve.length,total,arc.weights);
  for(const T of tracks){const k=ch.findIndex(c=>c.tracks.includes(T.i)),e=arc.on===false?mx.energy:clamp(curve[Math.min(k,curve.length-1)]*(.6+.8*mx.energy),0,1),r=RNG(T.seed,'arc');
    T.chapter=k;T.energy=e;T.prog=PROGS[Math.min(PROGS.length-1,Math.floor(clamp(e+r.pm(.18),0,.999)*PROGS.length))];}
  return {tracks,chapters:ch,total};}
window.LMXM={STYLES,STYLE_IDS,MX0,ARC_DEF,plan,album,chapters,KEYS};
})();
