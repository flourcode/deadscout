/* Dead Scout · making the video file (from Small Beats' recorder). It records in real time: an hour takes an hour.
   LSR.record({canvas, ctx, source, fps, vbr}) -> {kind, mime, ext, start(), frame(t), bytes(), stop() -> Promise<Blob>} */
(function(){
"use strict";
const mmss=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),ss=s%60;return h?h+':'+String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0'):m+':'+String(ss).padStart(2,'0');};
const VBR={'1080':{small:2.5e6,bal:4.5e6,best:8e6}};
const fmtBytes=b=>b>1e9?(b/1e9).toFixed(1)+' GB':Math.max(1,Math.round(b/1e6))+' MB';
/* ---------- making the file ----------
   LSR.record({canvas, ctx, source, fps, vbr}) records the canvas and the sound coming out of `source` (an AudioNode).
   1. WebCodecs with H.264 + AAC: every frame and the sound are encoded here and packed into a fragmented MP4 as they come
      (written in pieces, so an hour never sits in memory at once). This is the MP4 every player opens, QuickTime included.
   2. Otherwise the browser's own recorder, when it can make H.264 MP4.
   3. Otherwise the browser's own recorder as WebM (VP9). Never VP9 or Opus inside an .mp4: Macs and Windows open those as
      sound only, which looks like a broken video.
   The WebCodecs path writes the file straight to the browser's own private disk space (the origin private file system) as it
   records, so an eight- or ten-hour video never has to fit in memory; the finished file is then downloaded from there.
   The sound goes in as it is: LiminalMix already sits near -21 LUFS, quiet background ambience. The caller passes each
   drawn frame's time to rec.frame(t) (the WebCodecs path needs it; the others ignore it). rec.stop() resolves to a Blob,
   or rejects with an Error('NO PICTURE') when the picture didn't record, so a sound-only file is never handed over. */
const REC_TRIM=1; /* LiminalMix is levelled at the source (about -21 LUFS, peaks under -1 dBFS) */
let muxLoad=null;const loadMux=()=>muxLoad||(muxLoad=new Promise((ok,no)=>{if(window.Mp4Muxer)return ok();const sc=document.createElement('script');sc.src='mp4-muxer.js';sc.onload=ok;sc.onerror=no;document.head.appendChild(sc);}));
const supported=async(Enc,cfg)=>{try{return !!(window[Enc]&&(await window[Enc].isConfigSupported(cfg)).supported);}catch(e){return false;}};
let nTap=0;
async function record(o){const {canvas,ctx,source}=o,fps=o.fps||30,vbr=o.vbr||4.5e6,W=canvas.width,H=canvas.height;
  /* a canvas that has drawn something the browser treats as foreign can't be recorded at all: say so before starting */
  try{const t=document.createElement('canvas');t.width=t.height=1;t.getContext('2d').drawImage(canvas,0,0,1,1);t.getContext('2d').getImageData(0,0,1,1);}catch(e){if(e&&e.name==='SecurityError')throw new Error('LOCKED');}
  const trim=ctx.createGain();trim.gain.value=REC_TRIM;source.connect(trim);
  const mrOK=m=>{try{return !!window.MediaRecorder&&MediaRecorder.isTypeSupported(m);}catch(e){return false;}};
  const mrMime=['video/mp4;codecs="avc1.640028,mp4a.40.2"','video/mp4;codecs=avc1,mp4a.40.2','video/mp4;codecs=avc1,mp4a','video/mp4;codecs=avc1'].find(mrOK);
  const useMR=async mime=>{const dest=ctx.createMediaStreamDestination();trim.connect(dest);const stream=canvas.captureStream(fps);dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
    let mr;try{mr=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:vbr,audioBitsPerSecond:192000}:{videoBitsPerSecond:vbr});}catch(e){mr=new MediaRecorder(stream);}
    const chunks=[];let bytes=0;mr.ondataavailable=e=>{if(e.data&&e.data.size){chunks.push(e.data);bytes+=e.data.size;}};const type=(mr.mimeType||mime||'video/webm').split(';')[0];
    return {kind:'mr',mime:type,ext:/mp4/.test(type)?'mp4':'webm',start(){mr.start(1000);},frame(){},bytes:()=>bytes,
      stop(){return new Promise(ok=>{mr.onstop=()=>{try{trim.disconnect();}catch(e){}ok(new Blob(chunks,{type}));};try{mr.state!=='inactive'?mr.stop():mr.onstop();}catch(e){mr.onstop();}});}};};
  /* WebCodecs, H.264 + AAC only (several H.264 levels and profiles: the biggest frame needs level 4 or more) */
  const sr=ctx.sampleRate;let V=null,Au=null;
  if(window.VideoEncoder&&window.AudioEncoder&&window.VideoFrame&&window.AudioData&&window.AudioWorkletNode&&ctx.audioWorklet){
    for(const codec of ['avc1.640033','avc1.640028','avc1.4d0033','avc1.4d0028','avc1.42e033','avc1.42e028']){
      if(await supported('VideoEncoder',{codec,width:W,height:H,bitrate:vbr,framerate:fps,avc:{format:'avc'}})){V={mc:'avc',codec};break;}}
    if(V&&await supported('AudioEncoder',{codec:'mp4a.40.2',sampleRate:sr,numberOfChannels:2,bitrate:192000}))Au={mc:'aac',codec:'mp4a.40.2'};
    if(V&&Au){try{await loadMux();}catch(e){V=null;}}}
  /* the browser's own recorder: the fallback whenever the WebCodecs route can't start on this page */
  const fallback=why=>{if(why)console.warn('recorder: WebCodecs route unavailable, using MediaRecorder:',why);if(!window.MediaRecorder||!canvas.captureStream)throw new Error('NO RECORDER'+(why?' ('+(why.message||why)+')':''));
    try{return useMR(mrMime||['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(mrOK)||null);}catch(e){throw new Error('NO RECORDER ('+(e.message||e)+')');}};
  if(!(V&&Au&&window.Mp4Muxer))return fallback();
  try{
  const parts=[];let size=0,tail=null,tailPos=0; /* the file, in pieces: the newest piece stays editable until the next one starts */
  let disk=null;try{if(navigator.storage&&navigator.storage.getDirectory){const dir=await navigator.storage.getDirectory();if(!o.keep)await cleanup(dir); /* a broadcast in parts keeps the parts already made */
    if(o.expectBytes&&navigator.storage.estimate){const e=await navigator.storage.estimate();if(e.quota&&e.quota-(e.usage||0)<o.expectBytes*1.05)throw new Error('NO ROOM');}
    const fh=await dir.getFileHandle('lr-rec-'+Date.now()+'.mp4',{create:true}),w=await fh.createWritable();disk={fh,w,chain:Promise.resolve(),err:null};}}
  catch(e){if(e&&e.message==='NO ROOM')throw e;disk=null;}
  const write=(data,pos)=>{if(disk){const d=data.slice();disk.chain=disk.chain.then(()=>disk.w.write({type:'write',position:pos,data:d})).catch(e=>{disk.err=e;});size=Math.max(size,pos+data.length);return;}if(tail&&pos>=tailPos&&pos+data.length<=tailPos+tail.length){tail.set(data,pos-tailPos);return;}
    if(tail){parts.push(new Blob([tail]));}tail=new Uint8Array(data);tailPos=pos;size=Math.max(size,pos+data.length);};
  const mux=new Mp4Muxer.Muxer({target:new Mp4Muxer.StreamTarget({onData:write,chunked:true,chunkSize:8*1024*1024}),fastStart:'fragmented',firstTimestampBehavior:'offset',
    video:{codec:V.mc,width:W,height:H,frameRate:fps},audio:{codec:Au.mc,numberOfChannels:2,sampleRate:sr}});
  let failed=null;let vChunks=0;const venc=new VideoEncoder({output:(c,m)=>{vChunks++;mux.addVideoChunk(c,m);},error:e=>{failed=e;}});venc.configure({codec:V.codec,width:W,height:H,bitrate:vbr,framerate:fps,avc:{format:'avc'}});
  const aenc=new AudioEncoder({output:(c,m)=>mux.addAudioChunk(c,m),error:e=>{failed=e;}});aenc.configure({codec:Au.codec,sampleRate:sr,numberOfChannels:2,bitrate:192000});
  const tapName='sb-tap-'+(++nTap),wl='class T extends AudioWorkletProcessor{process(i){const c=i[0];if(c&&c.length){this.port.postMessage([c[0].slice(),(c[1]||c[0]).slice()]);}return true;}}registerProcessor("'+tapName+'",T);'; /* a new name each time: two recorders overlap at a part boundary */
  let tap=null;const mute=ctx.createGain();mute.gain.value=0;
  try{await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([wl],{type:'text/javascript'})));tap=new AudioWorkletNode(ctx,tapName,{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});tap.port.onmessage=e=>push(e.data[0],e.data[1]);}
  catch(e){/* pages that refuse worklet code: the older audio tap does the same job */tap=ctx.createScriptProcessor(4096,2,2);tap.onaudioprocess=ev=>{const ib=ev.inputBuffer,L=ib.getChannelData(0);push(L.slice(),(ib.numberOfChannels>1?ib.getChannelData(1):L).slice());};}
  tap.connect(mute).connect(ctx.destination);
  let on=false,samples=0,bufL=[],bufR=[],bufN=0,frames=0,lastF=-1;
  const flushAudio=()=>{if(!bufN)return;const data=new Float32Array(bufN*2);let o2=0;for(const b of bufL){data.set(b,o2);o2+=b.length;}for(const b of bufR){data.set(b,o2);o2+=b.length;}
    const ad=new AudioData({format:'f32-planar',sampleRate:sr,numberOfFrames:bufN,numberOfChannels:2,timestamp:Math.round(samples/sr*1e6),data});aenc.encode(ad);ad.close();samples+=bufN;bufL=[];bufR=[];bufN=0;};
  function push(l,r){if(!on)return;bufL.push(l);bufR.push(r);bufN+=l.length;if(bufN>=4096)flushAudio();}
  return {kind:'wc',mime:'video/mp4',ext:'mp4',codec:V.codec+' + '+Au.codec,bytes:()=>size,
    start(){trim.connect(tap);on=true;},
    frame(t){const f=Math.round(t*fps);if(!on||failed||f<=lastF)return;if(venc.encodeQueueSize>6)return; /* a slow computer drops a frame rather than falling behind */
      lastF=f;let vf;try{vf=new VideoFrame(canvas,{timestamp:Math.round(f/fps*1e6)});}catch(e){failed=e;console.error('recorder: the picture stopped recording',e);return;}venc.encode(vf,{keyFrame:frames%(fps*2)===0});vf.close();frames++;},
    async stop(){on=false;flushAudio();try{trim.disconnect();tap.disconnect();}catch(e){}try{await venc.flush();await aenc.flush();}catch(e){}if(!vChunks)throw new Error('NO PICTURE');mux.finalize();
      if(disk){await disk.chain;try{await disk.w.close();}catch(e){disk.err=disk.err||e;}if(disk.err)throw new Error('DISK');return await disk.fh.getFile();}
      if(tail){parts.push(new Blob([tail]));tail=null;}
      return new Blob(parts,{type:'video/mp4'});}};
  }catch(e){if(e&&e.message==='NO ROOM')throw e;return fallback(e);}}
/* the last video's file is cleared out when the next one starts (or the page loads): by then it has long been downloaded */
async function cleanup(dir){try{dir=dir||await navigator.storage.getDirectory();const old=[];for await (const [n] of dir.entries())if(/^lr-rec-/.test(n))old.push(n);for(const n of old)try{await dir.removeEntry(n);}catch(e){}}catch(e){}}

/* what the next video will be saved as, worked out once (the same checks record() makes) */
let EXT=window.VideoEncoder||(window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported('video/mp4;codecs=avc1'))?'MP4':'WEBM';
(async()=>{const h=await supported('VideoEncoder',{codec:'avc1.640028',width:1920,height:1080,bitrate:4.5e6,framerate:30})&&await supported('AudioEncoder',{codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:192000});
  let m=false;try{m=!!window.MediaRecorder&&['video/mp4;codecs=avc1,mp4a.40.2','video/mp4;codecs=avc1'].some(x=>MediaRecorder.isTypeSupported(x));}catch(e){}EXT=h||m?'MP4':'WEBM';if(LSR.onDirty)LSR.onDirty();})();
const LSR=window.LSR={record,cleanup,REC_TRIM,VBR,fmtBytes,mmss,ext:()=>EXT,onDirty:null};
})();
