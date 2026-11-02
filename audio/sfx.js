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
  chirp:o=>{tone('triangle',620,930,.015,.1,.07,o);tone('triangle',930,780,.015,.1,.06,o,ctx.currentTime+.12);},
  k9up:o=>{tone('sawtooth',60,180,.6,1.4,.06,o);for(let i=0;i<4;i++)tone('triangle',520+i*130,520+i*130,.01,.05,.04,o,ctx.currentTime+.9+i*.12);},
  k9down:o=>{tone('sawtooth',160,40,.1,1.6,.06,o);},
  blip:o=>{tone('triangle',760+Math.random()*120,700,.003,.03,.035,o);},
  ping:o=>{tone('triangle',660,660,.008,.2,.06,o);},
  alarm:o=>{for(let i=0;i<3;i++)tone('triangle',440,440,.01,.18,.06,o,ctx.currentTime+i*.4);},
  flash:o=>{hiss(2200,.5,.01,.4,.1,o);tone('sine',1000,150,.01,.6,.06,o);},
  valve:o=>{tone('triangle',320,90,.01,.3,.16,o);hiss(1200,1.2,.05,.9,.14,o,ctx.currentTime+.2);}};
function play(name,o){if(!ctx||!V[name])return;o=o||{};try{V[name](chain(o.pan,o.gain));}catch(e){}}
window.SFX={start,play,names:Object.keys(V)};
})();
