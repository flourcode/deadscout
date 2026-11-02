/* DeadScout · loudness (ITU-R BS.1770 / EBU R128, the measure YouTube normalises by). K-weighting, 400 ms gated blocks,
   the -70 LUFS absolute and -10 LU relative gates. Two uses:
     LOUD.measure(audioBuffer) -> integrated LUFS of a rendered buffer (how the tapes were calibrated: DEEP.LUFS)
     LOUD.meter(ctx, node)     -> {read() -> {m, s, i} (momentary, short-term, integrated LUFS), reset(), stop()}
   Nothing is sent anywhere; the meter only reads the sound that is already playing. */
(function(){
"use strict";
function kw(fs){/* the two K-weighting biquads, for any sample rate (the standard's 48 kHz values, re-derived) */
  let K=Math.tan(Math.PI*1681.974450955533/fs),Vh=Math.pow(10,3.999843853973347/20),Vb=Math.pow(Vh,.4996667741545416),Q=.7071752369554196,a0=1+K/Q+K*K;
  const s1={b:[(Vh+Vb*K/Q+K*K)/a0,2*(K*K-Vh)/a0,(Vh-Vb*K/Q+K*K)/a0],a:[2*(K*K-1)/a0,(1-K/Q+K*K)/a0]};
  K=Math.tan(Math.PI*38.13547087602444/fs);Q=.5003270373238773;a0=1+K/Q+K*K;
  const s2={b:[1,-2,1],a:[2*(K*K-1)/a0,(1-K/Q+K*K)/a0]};return [s1,s2];}
const LU=z=>z>0?-.691+10*Math.log10(z):-Infinity;
/* integrated loudness from the mean square of each 400 ms block (blocks overlap 75%) */
function gated(blocks){const abs=blocks.filter(z=>LU(z)>-70);if(!abs.length)return -Infinity;const m=abs.reduce((a,b)=>a+b,0)/abs.length,rel=LU(m)-10,g=abs.filter(z=>LU(z)>rel);return g.length?LU(g.reduce((a,b)=>a+b,0)/g.length):-Infinity;}
/* the K-weighted energy of each 100 ms step, channel by channel */
function steps(chs,fs){const F=kw(fs),n=Math.floor(fs/10),N=chs[0].length,out=new Float64Array(Math.floor(N/n));
  for(const d of chs){const st=F.map(()=>[0,0,0,0]);let acc=0,k=0,j=0;
    for(let i=0;i<N;i++){let x=d[i];for(let f=0;f<2;f++){const c=F[f],s=st[f],y=c.b[0]*x+c.b[1]*s[0]+c.b[2]*s[1]-c.a[0]*s[2]-c.a[1]*s[3];s[1]=s[0];s[0]=x;s[3]=s[2];s[2]=y;x=y;}
      acc+=x*x;if(++j===n){if(k<out.length)out[k++]+=acc/n;acc=0;j=0;}}}
  return out;}
const blocksOf=st=>{const b=[];for(let k=3;k<st.length;k++)b.push((st[k]+st[k-1]+st[k-2]+st[k-3])/4);return b;};
function measure(buf,skip){const chs=[];for(let c=0;c<Math.min(2,buf.numberOfChannels);c++)chs.push(buf.getChannelData(c));const st=steps(chs,buf.sampleRate),s0=Math.floor((skip||0)*10);
  let pk=0;for(const d of chs)for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);if(a>pk)pk=a;}
  return {i:gated(blocksOf(st.slice(s0))),peak:20*Math.log10(pk||1e-9)};}
/* the live meter: the K-weighting runs in a worklet (or the older script node), 100 ms steps come back here */
let nWl=0;
async function meter(ctx,node){const fs=ctx.sampleRate,F=kw(fs),st=[];let tap=null,stopped=false;const sink=ctx.createGain();sink.gain.value=0;sink.connect(ctx.destination);
  const name='ds-loud-'+(++nWl),code='const F='+JSON.stringify(F)+',N='+Math.floor(fs/10)+';class L extends AudioWorkletProcessor{constructor(){super();this.s=[0,1].map(()=>F.map(()=>[0,0,0,0]));this.a=0;this.j=0;}process(i){const ch=i[0];if(!ch||!ch.length)return true;const n=ch[0].length;for(let k=0;k<n;k++){let e=0;for(let c=0;c<2;c++){let x=(ch[c]||ch[0])[k];const S=this.s[c];for(let f=0;f<2;f++){const q=F[f],s=S[f],y=q.b[0]*x+q.b[1]*s[0]+q.b[2]*s[1]-q.a[0]*s[2]-q.a[1]*s[3];s[1]=s[0];s[0]=x;s[3]=s[2];s[2]=y;x=y;}e+=x*x;}this.a+=e;if(++this.j===N){this.port.postMessage(this.a/N);this.a=0;this.j=0;}}return true;}}registerProcessor("'+name+'",L);';
  try{await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));tap=new AudioWorkletNode(ctx,name,{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});tap.port.onmessage=e=>{if(!stopped)st.push(e.data);};}
  catch(e){/* the older script node: same arithmetic on the main thread */const S=[0,1].map(()=>F.map(()=>[0,0,0,0])),N=Math.floor(fs/10);let a=0,j=0;tap=ctx.createScriptProcessor(4096,2,1);
    tap.onaudioprocess=ev=>{const ib=ev.inputBuffer,L=ib.getChannelData(0),R=ib.numberOfChannels>1?ib.getChannelData(1):L;for(let k=0;k<L.length;k++){let e2=0;for(let c=0;c<2;c++){let x=(c?R:L)[k];for(let f=0;f<2;f++){const q=F[f],s=S[c][f],y=q.b[0]*x+q.b[1]*s[0]+q.b[2]*s[1]-q.a[0]*s[2]-q.a[1]*s[3];s[1]=s[0];s[0]=x;s[3]=s[2];s[2]=y;x=y;}e2+=x*x;}a+=e2;if(++j===N){if(!stopped)st.push(a/N);a=0;j=0;}}};}
  node.connect(tap);tap.connect(sink);
  const avg=(k)=>{const n=Math.min(k,st.length);if(!n)return -Infinity;let s=0;for(let i=st.length-n;i<st.length;i++)s+=st[i];return LU(s/n);};
  let cache={at:-1,i:-Infinity};
  return {read(){if(st.length-cache.at>=20){cache={at:st.length,i:gated(blocksOf(st))};}return {m:avg(4),s:avg(30),i:cache.i,secs:st.length/10};},
    reset(){st.length=0;cache={at:-1,i:-Infinity};},stop(){stopped=true;try{node.disconnect(tap);tap.disconnect();sink.disconnect();}catch(e){}}};}
window.LOUD={kw,measure,meter,gated,LU};
})();
