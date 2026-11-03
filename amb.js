/* DeadScout · the ship's own sound. Six procedural layers, each on a fader, meant to run for hours without a seam:
   ENGINE (a low hum that drifts), VENTILATION (slow air), MACHINERY (a pump cycling, relays, a distant motor),
   RADIO (channel noise, now and then a sweep), SIGNAL (rare tones, interference), HULL (a creak, a resonance).
   Nothing in it is sudden; the loudest thing it ever does is a relay click.
   window.AMB = {start(ctx,dest,mix,opts), set(mix), mood(name), stop(), MIX0} */
(function(){
"use strict";
const MIX0={music:.65,engine:.55,ventilation:.4,machinery:.25,radio:.1,signal:.08,hull:.2};
let ctx=null,out=null,L={},timers=[],alive=false,mood='routine',noiseBuf=null;
function noise(){if(noiseBuf)return noiseBuf;const n=ctx.sampleRate*4,b=ctx.createBuffer(2,n,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);let s=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;s=.98*s+.02*w;d[i]=(w*.6+s*4)*.35;}}noiseBuf=b;return b;}
function src(){const s=ctx.createBufferSource();s.buffer=noise();s.loop=true;s.start();return s;}
const g=v=>{const n=ctx.createGain();n.gain.value=v;return n;};
let lfos=[]; /* every modulator, so stop() can stop them: r22 left five oscillators running per start */
const lfo=(hz,amt,target)=>{const o=ctx.createOscillator(),k=ctx.createGain();o.frequency.value=hz;k.gain.value=amt;o.connect(k);k.connect(target);o.start();lfos.push(o);return o;};
function layer(name,build){const fader=g(0);fader.connect(out);const nodes=build(fader);L[name]={fader,nodes,level:0};}
function start(c,dest,mix,opts){stop();ctx=c;out=g(1);out.connect(dest);alive=true;mood=(opts&&opts.mood)||'routine';
  layer('engine',f=>{const s=src(),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=90;lp.Q.value=.7;const o=ctx.createOscillator();o.type='sine';o.frequency.value=48;const o2=ctx.createOscillator();o2.type='triangle';o2.frequency.value=96.4;
    const og=g(.5),o2g=g(.12),ng=g(.9);lfo(.05,6,o.frequency);lfo(.031,.18,og.gain);s.connect(lp);lp.connect(ng);ng.connect(f);o.connect(og);og.connect(f);o2.connect(o2g);o2g.connect(f);o.start();o2.start();return [s,o,o2];});
  layer('ventilation',f=>{const s=src(),bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=420;bp.Q.value=.5;const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=180;const k=g(.5);lfo(.023,.22,k.gain);lfo(.011,120,bp.frequency);s.connect(hp);hp.connect(bp);bp.connect(k);k.connect(f);return [s];});
  layer('machinery',f=>{const s=src(),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=160;const k=g(0);s.connect(lp);lp.connect(k);k.connect(f);
    /* the pump: 40-70 s on, 60-120 s off, eased both ways; relays and a motor as the world turns */
    const pump=()=>{if(!alive)return;const n=ctx.currentTime,on=40+Math.random()*30;k.gain.setTargetAtTime(.7,n,6);k.gain.setTargetAtTime(0,n+on,8);
      const next=on+(mood==='quiet'?120:60)+Math.random()*80;timers.push(setTimeout(pump,next*1000));};timers.push(setTimeout(pump,8000+Math.random()*20000));
    const relay=()=>{if(!alive)return;click(f,.18+Math.random()*.1);const next=(mood==='quiet'?45:18)+Math.random()*40;timers.push(setTimeout(relay,next*1000));};timers.push(setTimeout(relay,6000));
    const motor=()=>{if(!alive)return;const o=ctx.createOscillator(),og=g(0),bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=70+Math.random()*40;bp.Q.value=8;o.type='sawtooth';o.frequency.value=23+Math.random()*9;o.connect(bp);bp.connect(og);og.connect(f);const n=ctx.currentTime,d=10+Math.random()*16;og.gain.setTargetAtTime(.22,n,3);og.gain.setTargetAtTime(0,n+d,4);o.start(n);o.stop(n+d+16);
      timers.push(setTimeout(motor,(90+Math.random()*180)*1000));};timers.push(setTimeout(motor,30000+Math.random()*60000));return [s];});
  layer('radio',f=>{const s=src(),bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1800;bp.Q.value=1.2;const k=g(.25);lfo(.17,.1,k.gain);s.connect(bp);bp.connect(k);k.connect(f);
    const sweep=()=>{if(!alive)return;const o=ctx.createOscillator(),og=g(0),n=ctx.currentTime;o.type='sine';o.frequency.setValueAtTime(900+Math.random()*900,n);o.frequency.exponentialRampToValueAtTime(300+Math.random()*300,n+2.5);o.connect(og);og.connect(f);og.gain.setTargetAtTime(.12,n,.4);og.gain.setTargetAtTime(0,n+1.8,.5);o.start(n);o.stop(n+5);
      /* a voice that never resolves: a band of noise, gated like speech */
      const v=src(),vb=ctx.createBiquadFilter();vb.type='bandpass';vb.frequency.value=700;vb.Q.value=2.5;const vg=g(0);v.connect(vb);vb.connect(vg);vg.connect(f);let tt=n+3;for(let i=0;i<6+Math.random()*8;i++){const d=.08+Math.random()*.22;vg.gain.setTargetAtTime(.1,tt,.03);vg.gain.setTargetAtTime(0,tt+d,.04);tt+=d+.05+Math.random()*.2;}v.stop(tt+2);
      timers.push(setTimeout(sweep,((mood==='quiet'?240:90)+Math.random()*180)*1000));};timers.push(setTimeout(sweep,20000+Math.random()*40000));return [s];});
  layer('signal',f=>{const tone=()=>{if(!alive)return;const o=ctx.createOscillator(),og=g(0),n=ctx.currentTime,fq=[440,523,587,659,880][Math.floor(Math.random()*5)];o.type='sine';o.frequency.value=fq;o.connect(og);og.connect(f);
      const reps=1+Math.floor(Math.random()*3);for(let i=0;i<reps;i++){og.gain.setTargetAtTime(.14,n+i*.9,.05);og.gain.setTargetAtTime(0,n+i*.9+.35,.12);}o.start(n);o.stop(n+reps+2);
      timers.push(setTimeout(tone,((mood==='quiet'?400:mood==='strange'?60:150)+Math.random()*200)*1000));};timers.push(setTimeout(tone,40000+Math.random()*60000));return [];});
  layer('hull',f=>{const creak=()=>{if(!alive)return;const s=src(),bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=120+Math.random()*180;bp.Q.value=14;const k=g(0),n=ctx.currentTime,d=1.2+Math.random()*2.5;s.connect(bp);bp.connect(k);k.connect(f);k.gain.setTargetAtTime(.5,n,.5);bp.frequency.setTargetAtTime(bp.frequency.value*(.7+Math.random()*.6),n,d/2);k.gain.setTargetAtTime(0,n+d,.8);s.stop(n+d+4);
      timers.push(setTimeout(creak,((mood==='quiet'?180:70)+Math.random()*200)*1000));};timers.push(setTimeout(creak,30000+Math.random()*90000));return [];});
  set(mix||MIX0,2);}
function click(f,v){const s=src(),hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=1200;const k=g(0),n=ctx.currentTime;s.connect(hp);hp.connect(k);k.connect(f);k.gain.setValueAtTime(0,n);k.gain.linearRampToValueAtTime(v,n+.004);k.gain.setTargetAtTime(0,n+.01,.02);s.stop(n+.3);}
/* faders: 0..1 each, eased, with a curve so the lower half is usable */
function set(mix,secs){if(!ctx)return;for(const k in L){const v=Math.pow(Math.max(0,Math.min(1,mix[k]!=null?mix[k]:MIX0[k])),1.6)*({engine:.55,ventilation:.5,machinery:.7,radio:.5,signal:.6,hull:.7}[k]||.5);L[k].level=v;L[k].fader.gain.setTargetAtTime(v,ctx.currentTime,secs!=null?secs/3:.4);}}
function duck(amount,secs){if(!out)return;out.gain.setTargetAtTime(Math.max(0,1-amount),ctx.currentTime,(secs||10)/3);}
function stop(){alive=false;timers.forEach(clearTimeout);timers=[];for(const k in L){try{L[k].fader.gain.setTargetAtTime(0,ctx.currentTime,.3);const F=L[k];setTimeout(()=>{try{F.fader.disconnect();F.nodes.forEach(n=>{try{n.stop();}catch(e){}});}catch(e){}},1500);}catch(e){}}L={};
  {const old=lfos;lfos=[];setTimeout(()=>{for(const o of old){try{o.stop();o.disconnect();}catch(e){}}},1500);}}
window.AMB={start,set,stop,duck,setMood:m=>{mood=m;},MIX0};
})();
