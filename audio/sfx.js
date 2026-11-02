/* HALCYON's small sound vocabulary, all synthesized (no samples): rungs, boots, latches, door motors, seals, pumps,
   breakers, switches, CRTs, keys, machinery, a knock in the hull, and the radio blips the text boxes speak with.
   window.SFX.start(ctx,dest); then SFX.play('clank', {pan, gain}) */
(function(){
"use strict";
let ctx=null,out=null,nz=null;
function start(c,dest){ctx=c;out=ctx.createGain();out.gain.value=.9;out.connect(dest);}
function noise(){if(nz)return nz;const n=ctx.sampleRate*2,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;nz=b;return b;}
const env=(g,a,d,peak,at)=>{const t=at||ctx.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setTargetAtTime(0,t+a,d/3);};
function chain(pan,gain){const p=ctx.createStereoPanner?ctx.createStereoPanner():null,g=ctx.createGain();g.gain.value=gain==null?1:gain;if(p){p.pan.value=Math.max(-1,Math.min(1,pan||0));g.connect(p);p.connect(out);}else g.connect(out);return g;}
function tone(type,f0,f1,a,d,peak,o,at){const t=at||ctx.currentTime,osc=ctx.createOscillator(),g=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(f0,t);if(f1!=null)osc.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+a+d);env(g,a,d,peak,t);osc.connect(g);g.connect(o);osc.start(t);osc.stop(t+a+d+.05);}
function hiss(f,q,a,d,peak,o,at,type){const t=at||ctx.currentTime,s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise();s.loop=true;fl.type=type||'bandpass';fl.frequency.value=f;fl.Q.value=q;env(g,a,d,peak,t);s.connect(fl);fl.connect(g);g.connect(o);s.start(t);s.stop(t+a+d+.1);}
const V={
  clank:o=>{tone('triangle',520,180,.004,.16,.22,o);hiss(2000,2,.002,.05,.1,o);},
  boot:o=>{tone('sine',110,50,.005,.14,.3,o);hiss(400,1,.003,.06,.1,o,null,'lowpass');},
  grate:o=>{tone('sine',120,60,.004,.12,.26,o);tone('triangle',640,420,.003,.14,.07,o);hiss(1800,2.5,.003,.09,.08,o);},
  latch:o=>{tone('square',900,300,.003,.05,.1,o);tone('triangle',240,120,.01,.09,.18,o,ctx.currentTime+.06);},
  motor:o=>{hiss(180,3,.08,1.1,.16,o,null,'lowpass');tone('sawtooth',46,52,.1,1.0,.07,o);},
  thud:o=>{tone('sine',70,34,.004,.28,.5,o);hiss(300,1,.004,.1,.14,o,null,'lowpass');},
  seal:o=>{hiss(2200,1,.02,.5,.14,o);tone('sine',140,90,.02,.4,.16,o,ctx.currentTime+.35);},
  pump:o=>{hiss(900,.7,.3,3.6,.12,o);for(let i=0;i<6;i++)tone('triangle',80+i*4,80,.05,.4,.05,o,ctx.currentTime+i*.6);},
  release:o=>{hiss(1400,.8,.01,.9,.22,o);tone('sine',60,30,.02,.6,.3,o,ctx.currentTime+.5);},
  breaker:o=>{tone('square',160,60,.003,.07,.22,o);tone('sine',55,40,.004,.3,.4,o,ctx.currentTime+.04);hiss(2200,3,.002,.04,.09,o);},
  click:o=>{tone('triangle',900,500,.002,.03,.12,o);tone('triangle',300,200,.003,.05,.08,o,ctx.currentTime+.03);},
  crt:o=>{tone('sine',700,950,.03,.25,.05,o);tone('sine',60,60,.01,.5,.05,o);hiss(2500,3,.02,.3,.03,o);},
  keys:o=>{for(let i=0;i<5;i++)tone('triangle',700+((i*179)%260),500,.002,.03,.05,o,ctx.currentTime+i*.09+Math.random()*.03);},
  machinery:o=>{tone('sawtooth',30,44,.9,3,.08,o);hiss(240,2,.6,2.8,.09,o,null,'lowpass');for(let i=0;i<4;i++)tone('square',110+i*13,110+i*13,.02,.12,.04,o,ctx.currentTime+.8+i*.5);},
  knock:o=>{tone('sine',48,30,.006,.9,.35,o);hiss(160,1.5,.004,.3,.08,o,null,'lowpass');},
  k9step:o=>{tone('triangle',700,300,.003,.05,.1,o);tone('sine',140,90,.004,.08,.12,o);},
  servo:o=>{tone('sawtooth',420,520,.03,.22,.035,o);hiss(1800,6,.02,.2,.03,o);},
  chirp:o=>boop(o),
  k9up:o=>{tone('sawtooth',60,180,.6,1.4,.06,o);for(let i=0;i<4;i++)tone('triangle',520+i*130,520+i*130,.01,.05,.04,o,ctx.currentTime+.9+i*.12);},
  k9down:o=>{tone('sawtooth',160,40,.1,1.6,.06,o);},
  blip:o=>{tone('triangle',760+Math.random()*120,700,.003,.03,.035,o);},
  ping:o=>{tone('triangle',660,660,.008,.2,.06,o);},
  alarm:o=>{for(let i=0;i<3;i++)tone('triangle',440,440,.01,.18,.06,o,ctx.currentTime+i*.4);},
  flash:o=>{hiss(2200,.5,.01,.4,.1,o);tone('sine',1000,150,.01,.6,.06,o);},
  valve:o=>{tone('triangle',320,90,.01,.3,.16,o);hiss(1200,1.2,.05,.9,.14,o,ctx.currentTime+.2);}};

/* ---- the toys (Nov 2026): filtered voices, a few held beds. Everything stays under ~1.5 kHz fundamentals: no shrill. ---- */
let brown=null;function brownBuf(){if(brown)return brown;const n=ctx.sampleRate*4,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<n;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5;}
  /* loop-safe: cross-fade the tail into the head */const f=ctx.sampleRate*.2;for(let i=0;i<f;i++){const a=i/f;d[i]=d[i]*a+d[n-f+i]*(1-a);}brown=b;return b;}
function ftone(type,f0,f1,a,d,peak,o,at,cut,q){const t=at||ctx.currentTime,osc=ctx.createOscillator(),fl=ctx.createBiquadFilter(),g=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(f0,t);if(f1!=null)osc.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+a+d);
  fl.type='lowpass';fl.frequency.value=cut||1200;fl.Q.value=q||.7;env(g,a,d,peak,t);osc.connect(fl);fl.connect(g);g.connect(o);osc.start(t);osc.stop(t+a+d+.1);}
function sweep(f0,f1,dur,q,peak,o,at,type){const t=at||ctx.currentTime,s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise();s.loop=true;fl.type=type||'bandpass';fl.Q.value=q;fl.frequency.setValueAtTime(f0,t);fl.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+Math.min(.06,dur*.2));g.gain.setTargetAtTime(0,t+dur*.55,dur*.18);s.connect(fl);fl.connect(g);g.connect(o);s.start(t);s.stop(t+dur*1.6+.2);}
const PENT=[220,261.6,293.7,329.6,392,440,523.3,587.3,659.3,784,880,1046.5];
function boop(o){const T=ctx.currentTime,v=Math.floor(Math.random()*4),N=[[0,1,-1],[0,-1,1,2],[0,2,1],[0,1,2,3]][v],b=[523.3,587.3,659.3,523.3][v];  /* a little "boo-wee-boop": round sines, bending */
  let at=T;for(let i=0;i<N.length;i++){const f=b*Math.pow(1.19,N[i]),up=Math.random()<.5;ftone('sine',f*(up?.85:1.12),f,.012,.07+Math.random()*.05,.12,o,at,1600);ftone('triangle',f*2,f*2,.01,.04,.012,o,at,2200);at+=.09+Math.random()*.05;}
  if(Math.random()<.35)ftone('sine',b*1.5,b*2,.02,.14,.08,o,at+.03,1800);}
function key(o,at,heavy){const g=.6+Math.random()*.5;hiss(1900+Math.random()*700,1.4,.001,heavy?.05:.022,.09*g*(heavy?1.3:1),o,at);ftone('sine',heavy?120:170+Math.random()*50,90,.001,heavy?.08:.035,.13*g,o,at,600);}
function typing(o,n){let at=ctx.currentTime;for(let i=0;i<n;i++){const sp=Math.random()<.13;key(o,at,sp);at+=sp?.18:.055+Math.random()*.07;if(Math.random()<.08)at+=.25;}return at-ctx.currentTime;}
function compute(o,at,n,lo){for(let i=0;i<n;i++){const f=PENT[(lo||2)+Math.floor(Math.random()*7)];ftone(Math.random()<.5?'square':'triangle',f,f,.004,.045,.035,o,at+i*.07,1300);}}
function chime(o,at){ftone('sine',523.3,523.3,.01,.25,.07,o,at,1500);ftone('sine',784,784,.01,.45,.06,o,at+.13,1500);}
const BEDS={};
function bed(name,gain,ramp){if(!ctx)return;let B=BEDS[name];if(!B){B=BEDS[name]={g:ctx.createGain()};B.g.gain.value=0;B.g.connect(out);
    if(name==='rumble'){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),f2=ctx.createBiquadFilter(),l=ctx.createOscillator(),lg=ctx.createGain();s.buffer=brownBuf();s.loop=true;f.type='lowpass';f.frequency.value=240;f2.type='peaking';f2.frequency.value=70;f2.gain.value=6;
      const am=ctx.createGain();am.gain.value=1;l.frequency.value=.23;lg.gain.value=.18;l.connect(lg);lg.connect(am.gain);s.connect(f);f.connect(f2);f2.connect(am);am.connect(B.g);s.start();l.start();
      const o=ctx.createOscillator(),og=ctx.createGain(),of=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.value=41;of.type='lowpass';of.frequency.value=160;og.gain.value=.18;o.connect(of);of.connect(og);og.connect(B.g);o.start();}
    if(name==='hum'){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;f.Q.value=.5;f.connect(B.g);
      [[120,'sine',.6],[240,'sine',.22],[120,'sawtooth',.09],[360,'triangle',.05]].forEach(([fr,ty,gn])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=ty;o.frequency.value=fr+Math.random()*.3;g.gain.value=gn;o.connect(g);g.connect(f);o.start();});
      const s=ctx.createBufferSource(),bf=ctx.createBiquadFilter(),bg=ctx.createGain();s.buffer=noise();s.loop=true;bf.type='bandpass';bf.frequency.value=480;bf.Q.value=6;bg.gain.value=.12;s.connect(bf);bf.connect(bg);bg.connect(B.g);s.start();}}
  const t=ctx.currentTime;B.g.gain.cancelScheduledValues(t);B.g.gain.setValueAtTime(B.g.gain.value,t);B.g.gain.linearRampToValueAtTime(gain,t+(ramp==null?.5:ramp));}
Object.assign(V,{
  spool:o=>{const T=ctx.currentTime;ftone('sawtooth',62,560,.3,2.4,.11,o,T,900,4);ftone('sawtooth',31,120,.3,2.4,.14,o,T,300);sweep(300,1400,2.6,3,.05,o,T);
    for(let i=0;i<7;i++)ftone('square',90+i*9,90+i*9,.004,.05,.03,o,T+.2+i*.32*(1-i*.06),500);},
  backfire:o=>{const T=ctx.currentTime;[0,.16,.27].forEach((d,i)=>{const k=i?.55-i*.15:1;hiss(700,.6,.002,.22,.55*k,o,T+d,'lowpass');ftone('sine',120,34,.002,.38,.7*k,o,T+d,400);hiss(2000,1,.001,.03,.08*k,o,T+d);});
    sweep(900,120,1.4,1,.12,o,T+.3,'lowpass');},
  spooldown:o=>{const T=ctx.currentTime;ftone('sawtooth',480,48,.05,3.4,.08,o,T,800,3);ftone('sine',90,30,.05,3,.12,o,T,300);sweep(1100,180,3.2,2,.05,o,T);
    for(let i=0;i<5;i++)ftone('triangle',1046.5-i*60,1046.5-i*60,.002,.25,.022,o,T+3.4+i*(.6+Math.random()*.7),1400);},
  idle:o=>{const T=ctx.currentTime;ftone('sawtooth',40,110,.4,1.6,.1,o,T,400);hiss(260,1,.3,1.4,.08,o,T,'lowpass');},
  tink:o=>{const T=ctx.currentTime;for(let i=0;i<2+Math.floor(Math.random()*2);i++){const at=T+i*(.08+Math.random()*.16);ftone('triangle',1046.5,880,.001,.035,.05,o,at,1500);hiss(1500,3,.001,.02,.05,o,at);}},
  switchon:o=>{const T=ctx.currentTime;ftone('square',300,120,.002,.03,.09,o,T,900);ftone('sine',150,90,.002,.06,.16,o,T+.01,500);hiss(1700,2,.001,.015,.06,o,T);},
  switchoff:o=>{const T=ctx.currentTime;ftone('square',240,90,.002,.03,.09,o,T,800);ftone('sine',120,70,.002,.08,.16,o,T+.01,500);ftone('sine',220,110,.01,.35,.025,o,T+.04,700);},
  chunk:o=>{const T=ctx.currentTime;ftone('square',140,50,.002,.09,.2,o,T,600);ftone('sine',60,32,.003,.6,.55,o,T+.03,300);hiss(900,.8,.002,.12,.22,o,T,'lowpass');hiss(1800,2,.001,.03,.08,o,T);},
  relay:o=>{const T=ctx.currentTime;ftone('square',420,200,.001,.02,.05,o,T,1100);ftone('sine',140,100,.002,.04,.08,o,T+.008,500);},
  airopen:o=>{const T=ctx.currentTime;ftone('square',180,70,.002,.06,.18,o,T,700);ftone('sine',55,40,.003,.3,.3,o,T+.05,300);
    sweep(2200,700,1.5,.9,.22,o,T+.2);sweep(500,220,1.8,.7,.16,o,T+.25,'lowpass');ftone('sawtooth',70,92,.2,1.6,.05,o,T+.35,260);ftone('sine',62,34,.004,.5,.35,o,T+1.95,300);hiss(600,1,.004,.15,.12,o,T+1.95,'lowpass');},
  airclose:o=>{const T=ctx.currentTime;ftone('sawtooth',92,70,.2,1.4,.05,o,T,260);sweep(900,300,1.2,.8,.1,o,T,'lowpass');ftone('sine',58,30,.003,.7,.5,o,T+1.45,280);hiss(500,.8,.003,.2,.2,o,T+1.45,'lowpass');
    sweep(2600,900,.9,1.2,.14,o,T+1.7);ftone('square',220,90,.002,.05,.12,o,T+2.7,700);},
  typing:o=>{typing(o,10+Math.floor(Math.random()*8));},
  navcomp:o=>{const d=typing(o,9+Math.floor(Math.random()*5)),T=ctx.currentTime+d+.15;ftone('sine',60,60,.02,.6,.05,o,T,300);for(let i=0;i<8;i++)ftone('triangle',PENT[2+i],PENT[2+i],.004,.06,.04,o,T+.1+i*.06,1300);compute(o,T+.7,10,1);chime(o,T+1.55);},
  sonar:o=>{const d=typing(o,6+Math.floor(Math.random()*4)),T=ctx.currentTime+d+.2;for(let k=0;k<2;k++){const at=T+k*2.2;ftone('sine',523.3,520,.004,1.6,.12,o,at,1400);ftone('sine',1046.5,1040,.004,.6,.02,o,at,1500);ftone('sine',523.3,518,.02,1.6,.035,o,at+.55,1100);ftone('sine',523.3,516,.03,1.6,.015,o,at+1.1,900);}},
  squelch:o=>{const d=typing(o,5+Math.floor(Math.random()*4)),T=ctx.currentTime+d+.1;ftone('square',400,180,.002,.03,.06,o,T,900);sweep(1600,900,.5,1.5,.12,o,T+.02);sweep(1200,1100,1.6,2.5,.04,o,T+.4);
    for(let i=0;i<14;i++){const f=PENT[3+(i*5+Math.floor(Math.random()*3))%6];ftone('square',f,f,.002,.03,.03,o,T+.6+i*.05,1200);}sweep(1500,600,.35,1.5,.1,o,T+1.45);ftone('square',300,140,.002,.03,.05,o,T+1.8,800);},
  teletype:o=>{const d=typing(o,6),T=ctx.currentTime+d+.1;let at=T;for(let l=0;l<3;l++){for(let i=0;i<14;i++){key(o,at,false);ftone('square',95,95,.001,.02,.04,o,at,400);at+=.045;}ftone('sawtooth',160,90,.02,.25,.05,o,at+.04,500);at+=.4;}ftone('triangle',659.3,659.3,.004,.6,.04,o,at,1300);},
  klaxon:o=>{const T=ctx.currentTime;for(let i=0;i<3;i++){ftone('sawtooth',196,262,.08,.75,.07,o,T+i*1.25,700,2);ftone('triangle',196,262,.08,.75,.06,o,T+i*1.25,900);}},
  pumps:o=>{const T=ctx.currentTime;ftone('triangle',320,90,.01,.3,.16,o,T,700);sweep(1200,500,1.4,1,.12,o,T+.2);for(let i=0;i<6;i++){ftone('sine',70,48,.05,.45,.22,o,T+.8+i*.62,300);hiss(380,1.2,.1,.4,.08,o,T+.8+i*.62+.15,'lowpass');}sweep(1300,500,1.1,.9,.16,o,T+4.8);}
});
function play(name,o){if(!ctx||!V[name])return;o=o||{};try{V[name](chain(o.pan,o.gain));}catch(e){}}
window.SFX={start,play,bed,boop:o=>{if(ctx)boop(chain(o&&o.pan,o&&o.gain));},names:Object.keys(V),get ctx(){return ctx;}};
})();
