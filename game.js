/* Driftnaut · the game and the night watch. One ship, two ways in:
     ENTER SHIP   HALCYON alive, a signal, black, the same ship later. She wakes; the keyboard is hers. The story
                  (game/story.js) answers what she does with changes to the ship, on the same timeline the studio scripts.
     NIGHT WATCH  the ship runs itself (watch.js): crew routines, screens, lamps, rarely something strange; for sleep,
                  focus, or an hour of music. TAKE CONTROL hands you the commander mid-watch; RELEASE gives him back.
   Everything anyone does is an actor command on the same timeline the studio scripts (cut.js), so a performance or a
   watch can be recorded as a take. The HUD is three things: the room, the track that just started, one prompt. */
(function(){
"use strict";
const $=id=>document.getElementById(id),E=window.LMX,X=window.LMXS,LR=window.LSR,NW=window.NW,AMB=window.AMB,SFX=window.SFX,DSE=window.DSE,ENV=DSE.ENV;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mmss=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');},hhmm=s=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600);return (h?h+':':'')+String(Math.floor(s%3600/60)).padStart(h?2:1,'0')+':'+String(s%60).padStart(2,'0');};
const SAVE='deadScoutGame',PREF='deadScoutGamePrefs';
window.DS_DEFAULT_EPISODE=window.DS_GAME||window.DS_DEFAULT_EPISODE;if(!window.CUT||!window.DS_DEFAULT_EPISODE){document.body.innerHTML='<p style="padding:40px;font:14px monospace;color:#e7dbc0">The ship did not load. Open index.html from the Driftnaut folder.</p>';return;}
/* ---------- the project: one reading of a manifest, shared with the Director (episode.js) ---------- */
let P,AL,TIMES,TOTAL,watch=null,events=null;
/* the tapes (§38): six named mixes of the same engine; the player picks one from the pause menu, the story may duck it */
const TAPES=[['SOFT ORBIT',{style:'deadwave',tape:'soft-orbit'}],['SPACE WAVE',{style:'deadwave',tape:'space-wave'}],['WARM TRANSIT',{style:'deadwave',tape:'warm-transit'}],['NIGHT CRUISE',{style:'deadwave',tape:'night-cruise'}]]; /* r52: the station's four tracks (deep.js) */
/* r37: in a watch the TAPE key (or a scene) swaps the band without reloading the ship; the new tape fades in */
/* r40 · THE BEDS. Brown noise (warm, low, enveloping) and pink noise (soft air moving through the ship), each on its own,
   breathing very slowly; they run under everything and never stop when the tape changes. OFF / LOW / MID / HIGH. */
const BEDV={brown:{off:0,low:.03,mid:.055,high:.085},pink:{off:0,low:.008,mid:.016,high:.026}};let BED=null;
function beds(){if(BED||!actx||!ambBus)return BED;const sr=actx.sampleRate,n=sr*6,mk=(fn)=>{const b=actx.createBuffer(2,n,sr);for(let c=0;c<2;c++){const d=b.getChannelData(c);fn(d);}return b;};
  const brown=mk(d=>{let v=0;for(let i=0;i<d.length;i++){v=(v+.02*(Math.random()*2-1))/1.02;d[i]=v*3.4;}}),
    pink=mk(d=>{let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;for(let i=0;i<d.length;i++){const w=Math.random()*2-1;b0=.99886*b0+w*.0555179;b1=.99332*b1+w*.0750759;b2=.969*b2+w*.153852;b3=.8665*b3+w*.3104856;b4=.55*b4+w*.5329522;b5=-.7616*b5-w*.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11;b6=w*.115926;}});
  /* seamless: each loop is long and crossfaded at its ends, so there is no seam to hear */
  for(const b of [brown,pink])for(let c=0;c<2;c++){const d=b.getChannelData(c),f=Math.floor(sr*.5);for(let i=0;i<f;i++){const u=i/f;d[i]=d[i]*u+d[d.length-f+i]*(1-u);}}
  const mkBed=(buf,lp,hp)=>{const s=actx.createBufferSource();s.buffer=buf;s.loop=true;s.loopStart=0;s.loopEnd=buf.duration-.5;const l=actx.createBiquadFilter();l.type='lowpass';l.frequency.value=lp;const h=actx.createBiquadFilter();h.type='highpass';h.frequency.value=hp;
    const g=actx.createGain();g.gain.value=0;const m=actx.createOscillator(),mg=actx.createGain();m.frequency.value=.031+Math.random()*.01;mg.gain.value=0;m.connect(mg);mg.connect(g.gain);s.connect(l);l.connect(h);h.connect(g);g.connect(ambBus);s.start();m.start();return {g,mg};};
  BED={brown:mkBed(brown,520,30),pink:mkBed(pink,2600,180)};paintBeds();return BED;}
function paintBeds(){const B=beds();if(!B)return;const T=actx.currentTime;for(const k of ['brown','pink']){const v=BEDV[k][prefs.nw[k]||'low']||0;B[k].g.gain.setTargetAtTime(v,T,2);B[k].mg.gain.setTargetAtTime(v*.1,T,2);}} /* ±10%, over half a minute */
/* r40 · INTENSITY: REST · FOCUS · CHILL, live on the band (the mood never changes, only how much is playing) */
const INTS=['rest','focus','chill'],INTN={rest:'DEEP REST',focus:'FOCUS',chill:'SPACE CHILL'};const INT_N=()=>Math.max(0,INTS.indexOf(prefs.nw.intensity||'focus'));
function setIntensity(v){prefs.nw.intensity=INTS.includes(v)?v:'focus';savePrefs();if(band&&band.setIntensity)band.setIntensity(INT_N());paintWatch();}
const curTapeId=()=>{if(!watch)return 'drift';const c=watch.cfg;return c.music||NW.ACTIVITY[c.activity].music;};
/* r51 · THE STATION: SOFT ORBIT and SPACE WAVE take turns, about ten minutes each, with the usual ten-second crossfade. Scenes never change it;
   each new pass of a tape gets a fresh hook (deep.js pass), so it does not come round exactly the same */
/* r52: four tracks of one album, starting on SOFT ORBIT (Busy Ship), about eight minutes each; ⏭ (or N) skips with a short fade */
const STN={pass:0,next:0,mins:8,order:['soft-orbit','space-wave','warm-transit','night-cruise']};window.__station=STN;
function stationNext(xf,dir){if(!watch)return;const cur=watch.tape||curTapeId(),L=STN.order,i=L.indexOf(cur);STN.pass++;watchTape(L[(i+(dir||1)+L.length)%L.length],xf);}
/* r54 · MEDIA SESSION: the track on the lock screen and in the system media overlay; play/pause and next/previous keys work.
   Browsers only show it while an <audio> element plays, so a silent one loops alongside the Web Audio music */
const MS={a:null};
function msStart(){if(!('mediaSession' in navigator))return;try{if(!MS.a){const sr=8000,n=sr,b=new ArrayBuffer(44+n*2),v=new DataView(b),W=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
      W(0,'RIFF');v.setUint32(4,36+n*2,true);W(8,'WAVE');W(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);W(36,'data');v.setUint32(40,n*2,true);
      MS.a=new Audio(URL.createObjectURL(new Blob([b],{type:'audio/wav'})));MS.a.loop=true;MS.a.setAttribute('playsinline','');
      const M=navigator.mediaSession,H=(k,f)=>{try{M.setActionHandler(k,f);}catch(e){}};
      H('play',()=>{ensureAudio();setSound(true);paintWatch();MS.a.play().catch(()=>{});M.playbackState='playing';});
      H('pause',()=>{setSound(false);paintWatch();M.playbackState='paused';});
      H('nexttrack',()=>stationNext(3));H('previoustrack',()=>stationNext(3,-1));}
    MS.a.play().catch(()=>{});navigator.mediaSession.playbackState=prefs.sound?'playing':'paused';msMeta();}catch(e){}}
function msMeta(id){if(!('mediaSession' in navigator)||!window.MediaMetadata)return;try{const T=DEEP.TAPES[DEEP.tapeOf(id||(watch&&(watch.tape||curTapeId()))||'soft-orbit')];
  navigator.mediaSession.metadata=new MediaMetadata({title:T.name.charAt(0)+T.name.slice(1).toLowerCase(),artist:'Driftnaut',album:'HALCYON · space chill',artwork:[{src:'icon-512.png',sizes:'512x512',type:'image/png'},{src:'icon-192.png',sizes:'192x192',type:'image/png'}]});}catch(e){}}
setInterval(()=>{try{if(!watch){STN.next=0;STN.t0=0;return;}if(!STN.t0)STN.t0=performance.now();
  if(state==='watch'&&!prefs.tipGame&&performance.now()-STN.t0>15*60000){prefs.tipGame=1;savePrefs();toast('LIKE IT HERE? PRESS GAME ▸ TO DRIFT THROUGH THE SHIP YOURSELF',8);}
  if(!band||!actx||SLP)return;const t=actx.currentTime;if(!STN.next){STN.next=t+STN.mins*60;return;}if(t<STN.next)return;stationNext(10);}catch(e){}},5000);
/* now playing: the track's name, a few seconds, top left of the ship */
let npEl=null,npT=0;function nowPlaying(id){const T=window.DEEP&&DEEP.TAPES[DEEP.tapeOf(id)];if(!T)return;if(!npEl){npEl=document.createElement('div');npEl.className='np';npEl.setAttribute('aria-live','polite');(stage.parentElement||document.body).appendChild(npEl);}
  npEl.innerHTML='<i>NOW PLAYING</i>'+T.name;msMeta(id);npEl.classList.add('on');clearTimeout(npT);npT=setTimeout(()=>npEl.classList.remove('on'),4200);}
function watchTape(id,xf){const mu=NW.MUSIC[id];if(!mu||!watch||!P)return;if(actx)STN.next=actx.currentTime+STN.mins*60*(.85+Math.random()*.3);P.style=mu.style;P.music=Object.assign({},P.music||{},{mode:'generated',style:mu.style,tape:mu.tape,vibe:mu.vibe,drums:mu.drums,synth:mu.synth,ambience:mu.ambience});watch.tape=id;try{if(band)startBand(now(),xf||10);}catch(e){}nowPlaying(id); /* r40: a crossfade, no restart */
  const tr=$('wTrack');if(tr)tr.textContent='▶ '+mu.name;paintWatch();}
/* AMBIENCE: one stepped key for the whole room bed (the r27 sliders stay gone) */
const AMBV={low:.45,mid:1,high:1.5};let ambTrim=null;const ambT=()=>{if(!ambTrim&&actx&&ambBus){ambTrim=actx.createGain();ambTrim.connect(ambBus);}return ambTrim;};function setAmbience(v){prefs.nw.ambience=AMBV[v]?v:'mid';savePrefs();const T=ambT();if(T)T.gain.setTargetAtTime(watch?AMBV[prefs.nw.ambience]:1,actx.currentTime,.4);paintWatch();}
function setTape(i,restart){const T=TAPES[((i%TAPES.length)+TAPES.length)%TAPES.length];prefs.tape=TAPES.indexOf(T);savePrefs();CUT.setTape(T[0]);if(!P||watch)return;const m=DSE.manifest(P),t=now();m.music=Object.assign({},m.music,T[1]);loadWorld(m);if(restart&&band)startBand(t);paintMenus();}
const dna=extra=>DSE.dna(P,extra);
function loadWorld(D){P=DSE.project(D);const a=DSE.album(P);AL=a.AL;TIMES=a.TIMES;TOTAL=a.TOTAL;if(P.errs.length)console.warn('manifest',P.errs);
  LCV.setProject(P,TIMES);SP.rev=(SP.rev||0)+1;window.__game.P=P;window.__game.TIMES=TIMES;window.__game.AL=AL;}
/* ---------- the picture ---------- */
const stage=$('stage'),LCV=LC.create(stage);const SP=CUT.play;let recording=null;
let musicMute=null;const padMode=()=>prefs.pad===true||prefs.pad==='on'?'on':prefs.pad===false||prefs.pad==='off'?'off':'auto'; /* the player's music switch: its own stage after every duck and fade the story makes */
/* quick keys: N next tape, M music on/off, K on-screen keys; the quick bar shows what changed */
function quickKey(k){const fl=window.__padFlash||(()=>{});ensureAudio();if(k==='KeyM'){setMusicOn(prefs.musicOn===false);fl(prefs.musicOn===false?'♪ MUSIC OFF':'♪ MUSIC ON');}
  else if(k==='KeyN'){if(watch){stationNext(3);return;}if(prefs.musicOn===false)setMusicOn(true);setTape((prefs.tape||0)+1,true);fl('▶ TAPE '+String((prefs.tape||0)+1).padStart(2,'0')+' · '+TAPES[prefs.tape||0][0]);}
  else if(k==='KeyK'){const m=prefs.pad==='on'||prefs.pad===true?'off':'on';prefs.pad=m;savePrefs();fl(m==='on'?'ON-SCREEN KEYS · ON':'ON-SCREEN KEYS · OFF');}}
function setMusicOn(on){prefs.musicOn=!!on;savePrefs();if(musicMute)musicMute.gain.setTargetAtTime(on?1:0,actx.currentTime,.25);}
const BCQ=new URLSearchParams(location.search),BC=BCQ.get('broadcast')==='1';let watchSeed=0,sleepReq=false;
window.__game={audio:()=>{ensureAudio();return {ctx:actx,out:master};},amb:room=>{if(AMB&&actx)AMB.set(room?roomMix(room):Object.assign({},AMB.MIX0,prefs.mix),3);},
  focus:(secs)=>{if(!actx||!focusM)return;const t=actx.currentTime,d=secs||1.2;for(const [g,v] of [[focusM,.84],[focusA,.9]]){g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(v,t,.06);g.gain.setTargetAtTime(1,t+d,.35);}}, /* r31: duck music 15% and the room 10%, then swell back */
  watch:()=>watch, /* r33: town.js reads the watch's props (who carries what, who's in the bunk) */
  quickWatch:()=>{if(state==='title')beginWatch();},quickPlay:()=>{if(state==='title')beginWatch({play:true});},
  quickSleep:()=>{if(state==='title'){sleepReq=true;beginWatch().then(()=>{sleepReq=false;});}}, /* r34: the boot screen's SLEEP */ /* the boot screen's PRESS START: straight into the watch, last settings */
  beat:b=>{b.at=now()+(+b.at||0);if(watch){P.script.push(b);P.rev++;}else{SP.cmds.push(b);SP.rev=(SP.rev||0)+1;}}, /* joy.js: a command on the shared timeline */
  toyApi:()=>({sfx:(n,g)=>sfx(n,null,g),mix:(k,v)=>{if(v==null)return prefs.mix[k];ensureAudio();setMix(k,v);},hero:k=>{try{band&&band.hero(k);}catch(e){}},note:(t,s)=>note(t,s),say:(w,l,s,o)=>say(w,l,s,o),
  watch:()=>!!watch,cfg:()=>watch&&watch.cfg,nw:()=>prefs.nw,save:()=>savePrefs(),tape:id=>watchTape(id),autoTape:()=>curTapeId(),pace:a=>setPace(a),ambience:v=>setAmbience(v),here:a=>CUT.hereRef(P,TIMES,now(),a),travel:(a,to)=>CUT.travelTime(a,CUT.hereRef(P,TIMES,now(),a),to)||0,steering:()=>state==='play',
  soundOn:()=>!!prefs.sound,dim:on=>setDim(!!on,true),k9rest:()=>{try{k9Rest(now(),true);}catch(e){}},me:()=>me,logs:()=>prefs.logs||[],chirp:()=>{sfx('chirp',null,1.6);},
  go:id=>{const O=CUT.MAP.objects[id];if(!O||state!=='play')return;cmd({move:me,to:O.spot,interrupt:true});const t0=now(),tt=CUT.travelTime(me,CUT.hereRef(P,TIMES,t0,me),O.spot)||0;setTimeout(()=>{if(state==='play'){cmd({actor:me,interact:id,interrupt:true});findLog(id);}},(tt+.4)*1000);},
  look:secs=>{const t=now();runLines(['+0 camera exterior','+'+secs+' camera '+(watch?'cutaway':(prefs.camera==='follow'?'follow deadscout':'cutaway'))]);}}),padSet:m=>{prefs.pad=m;savePrefs();paintMenus();},say:(w,l,secs,o)=>say(w,l,secs,o),music:{on:()=>prefs.musicOn!==false,set:v=>{ensureAudio();setMusicOn(v);},prev(){if(watch)return null;setTape((prefs.tape||0)-1,true);return {n:(prefs.tape||0)+1,name:TAPES[prefs.tape||0][0]};},next(){if(watch)return null;setTape((prefs.tape||0)+1,true);return {n:(prefs.tape||0)+1,name:TAPES[prefs.tape||0][0]};},tape:()=>({n:(prefs.tape||0)+1,name:TAPES[prefs.tape||0][0],watch:!!watch})},get state(){return state;},now:()=>now(),SP,eventsApi:()=>eventsApi(),events:()=>events,hint:()=>hintRef,endNow:()=>end(),run:l=>runLines(l),view:()=>vw(now()),story:()=>story,map(v){showMap=v;},shot(t,V){const c=document.createElement('canvas');c.width=V[2];c.height=V[3];CUT.force(V);CUT.render(c.getContext('2d'),P,TIMES,t,{x:0,y:0,w:V[2],h:V[3]},1);CUT.force(null);drawMap(t,c.getContext('2d'),V);return c.toDataURL('image/png');}};
/* the display takes what the housing leaves: whole multiples of the 640 × 360 frame when that wastes little, otherwise the closest fit */
/* a phone held upright: the picture at the top, menus and controls in the room below it (r27) */
const portrait=()=>!BC&&window.innerHeight>window.innerWidth*1.15;
const isPhone=()=>!BC&&!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches)&&Math.min(window.innerWidth,window.innerHeight)<=540; /* r55: a phone: touch, and a short side under ~540 px */
function fit1(){const u=document.getElementById('unit');const cw0=stage.offsetWidth,ch0=stage.offsetHeight,cx=u.offsetWidth-cw0,cy=u.offsetHeight-ch0;
  const P_=portrait();document.body.classList.toggle('portrait',P_);const PH=isPhone();document.body.classList.toggle('phone',PH);
  const mg=BC||PH?0:P_?8:20;let k=Math.min((window.innerWidth-cx-mg)/640,(P_?window.innerHeight*.5:window.innerHeight-cy-mg)/360);k=Math.max(k,P_?.4:.6); /* an upright phone: as small as the width needs */
  /* r56: the canvas is drawn in device pixels, and each of the 640 x 360 picture pixels is a whole number of them when it can be */
  const D=BC?1:Math.max(1,Math.min(3,window.devicePixelRatio||1));let kd=k*D;const ki=Math.floor(kd+1e-6);if(ki>=1&&ki>=(BC?.97:.8)*kd)kd=ki;
  const bw=Math.round(640*kd/2)*2,bh=Math.round(bw*9/16);if(bw!==stage.width||bh!==stage.height)LCV.setSize(bw,bh);stage.style.width=(bw/D)+'px';stage.style.height=(bh/D)+'px';}
function fit(){if(recording)return;fit1();fit1();
  /* the scale for the instrument chrome (clock, quick keys, reticles), from the picture's width: not the text size */
  const scr=$('screen'),r=scr.getBoundingClientRect(),coarse=window.matchMedia&&matchMedia('(pointer: coarse)').matches;
  scr.style.setProperty('--ui',String(Math.max(coarse?.8:.6,Math.min(2,r.width/1280))));scr.classList.toggle('compact',r.width<820);
  {const D=window.devicePixelRatio||1,narrow=r.width<700;document.documentElement.style.setProperty('--f1','8px');document.documentElement.style.setProperty('--f2',(narrow?8:16)+'px');document.documentElement.style.setProperty('--f3',(D>=2&&narrow?12:narrow?8:16)+'px');} /* r56: Silk is an 8 px face: 8 and 16 (12 on dense phone screens, where it is still whole pixels) */
  document.documentElement.style.setProperty('--sl',Math.round(r.left+window.scrollX)+'px');document.documentElement.style.setProperty('--sb',Math.round(r.bottom+window.scrollY)+'px');}
window.addEventListener('resize',fit);fit();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
loadWorld(window.DS_DEFAULT_EPISODE);
/* ---------- the sound: the band on its own fader, the ship's ambience on six more ---------- */
let actx=null,master=null,musicBus=null,band=null,t0=0,sched=null,curCh=-1,lastHero=0;
const prefs=(()=>{try{return Object.assign({sound:true,camera:'ship',text:'large',mix:Object.assign({},AMB?AMB.MIX0:{}),nw:{era:'now',scene:'watch',view:'full-ship',activity:'routine',music:'auto',duration:360,focus:0,objective:'',light:'warm',ambience:'mid',intensity:'focus',brown:'low',pink:'off'},tag:true,dim:false,photo:4},JSON.parse(localStorage.getItem(PREF)||'{}'));}catch(e){return {sound:true,camera:'ship',text:'large',mix:Object.assign({},AMB?AMB.MIX0:{}),nw:{view:'full-ship',activity:'routine',music:'auto',duration:360,focus:0,objective:''},tag:true,dim:false,photo:4};} /* r26: large print is the default for every message */})();
const savePrefs=()=>{try{localStorage.setItem(PREF,JSON.stringify(prefs));}catch(e){}};
if(!prefs.r52){prefs.r52=1;prefs.r51=1;prefs.nw=prefs.nw||{};prefs.nw.music='soft-orbit';savePrefs();}
if(!prefs.r51){prefs.r51=1;prefs.nw=prefs.nw||{};prefs.nw.music='soft-orbit';savePrefs();}
if(!prefs.r48){prefs.r48=1;prefs.nw=prefs.nw||{};Object.assign(prefs.nw,{sound:'balanced',brown:'low',pink:'off',intensity:'focus'});savePrefs();} /* r48: the new chillhop tapes start from the calm default mix */
let ambBus=null,focusM=null,focusA=null;
function ensureAudio(){if(actx)return actx;actx=new (window.AudioContext||window.webkitAudioContext)();master=actx.createGain();master.gain.value=prefs.sound?1:0;master.connect(actx.destination);
  focusM=actx.createGain();focusM.connect(master);focusA=actx.createGain();focusA.connect(master);ambBus=focusA; /* r31: music and ambience each pass a duck stage; a touch pulls them back so the object is close */musicBus=actx.createGain();musicMute=actx.createGain();musicMute.gain.value=prefs.musicOn===false?0:1;{const soft=actx.createBiquadFilter();soft.type='lowpass';soft.frequency.value=6200;soft.Q.value=.5;musicBus.connect(soft);soft.connect(musicMute);} /* r28: the band without its sharpest edge */musicMute.connect(focusM);if(SFX)SFX.start(actx,master);return actx;}
function startBand(off,xf){ensureAudio();if(actx.state!=='running')actx.resume();if(band){band.stop(xf||.5);band=null;}
  t0=actx.currentTime+.08-off;
  if(P.style==='deadwave'&&window.DEEP){band=DEEP.make(actx,musicBus,{seed:P.seed,pass:STN.pass,tape:(P.music&&P.music.tape)||'soft-orbit',startAt:t0,fadeIn:xf||off+1.2,intensity:INT_N()});curCh=-1;} /* the default: HALCYON dreaming */
  else{const d=dna(null),o=X.opts(d);band=E.make(actx,musicBus,Object.assign(o,{startAt:t0,fadeIn:off+1.2}));X.attach(band,d,0);if(off>0&&band.skip)band.skip(off);curCh=-1;}
  clearInterval(sched);sched=setInterval(tick,200);tick();}
function stopBand(){if(band){band.stop(.6);band=null;}clearInterval(sched);sched=null;}
function tick(){if(!band)return;band.tick(actx.currentTime+band.ahead);const t=now(),k=LCV.chapterAt(t);
  if(watch){if(curCh<0){curCh=0;try{band.setState(NW.ACTIVITY[watch.cfg.activity].state,10);}catch(e){}}return;}
  if(k!==curCh){curCh=k;const ch=P.chapters[k],name=String(ch.role||ch.title||'').toUpperCase(),env=ENV[name]||['normal'];try{band.setState(env[0],8);if(env[1])band.hero(env[1],env[2]||{});}catch(e){}lastHero=t;}
  else{const ch=P.chapters[k],name=String(ch.role||ch.title||'').toUpperCase(),env=ENV[name];if(env&&env[1]&&t-lastHero>150){try{band.hero(env[1],Object.assign({dist:'far'},env[2]||{}));}catch(e){}lastHero=t;}}}
const now=()=>held!=null?held:(actx&&band?actx.currentTime-t0:0);
let held=null,idle0=0;
let scanN=null,scanG=null;
function scanSound(R){if(!actx||!master)return;if(!scanN){const len=actx.sampleRate*2,buf=actx.createBuffer(1,len,actx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;scanN=actx.createBufferSource();scanN.buffer=buf;scanN.loop=true;const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=1400;f.Q.value=.8;scanG=actx.createGain();scanG.gain.value=0;scanN.connect(f);f.connect(scanG);scanG.connect(master);scanN.start();}
  const s=R?R.s:0,v=!R||R.state==='MEMORY'?0:(.012+.11*s*s)*(SCAN.dial?1.5*(1-.6*R.aligned):1)*(prefs.mix.scanner!=null?prefs.mix.scanner:1);scanG.gain.setTargetAtTime(v,actx.currentTime,.08);}
function ping(){if(!actx)return;const o=actx.createOscillator(),g=actx.createGain();o.type='triangle';o.frequency.value=660;g.gain.value=0;o.connect(g);g.connect(master);o.start();g.gain.setTargetAtTime(.05,actx.currentTime,.01);g.gain.setTargetAtTime(0,actx.currentTime+.14,.03);o.stop(actx.currentTime+.5);}
function setMix(k,v){prefs.mix[k]=v;savePrefs();if(k==='music'){if(musicBus)musicBus.gain.setTargetAtTime(Math.pow(v,1.4),actx.currentTime,.15);}else if(AMB)AMB.set(prefs.mix,.5);}
/* ---------- states ---------- */
let session=0; /* bumped on every title, game and watch start: a timer from an earlier session does nothing */
const later=(secs,fn)=>{const g=session;setTimeout(()=>{if(session===g)fn();},secs*1000);};
let state='title',sel=0,me='deadscout',story=null,tuneReq=false,disabled=[],CHK='',lightForced=false,playT=0,second=false,k9=null,hintRef=null,lastProgress=0,lastRoom=null;const K9=window.K9;const SCAN=window.SCAN,PW=window.POWER,STORY=window.STORY;
const show=(id,on)=>{$(id).hidden=!on;};
function enter(s){state=s;if(s==='title')document.body.classList.remove('opening');['title','pause','controls','setup','registry','route','deck','chart','opts','con'].forEach(id=>show(id,false));show('hud',s==='play'||s==='pause'||s==='route'||s==='deck'||s==='chart');
  if(s==='route'){show('route',true);paintRoute();focusMenu('rMenu');}if(s==='deck'){show('deck',true);paintDeck();sel=prefs.tape||0;paintSel('kMenu');}if(s==='chart'){show('chart',true);CH.px=0;CH.py=0;paintChart();} /* the ship keeps running under its own panel */
  if(s==='registry'){show('registry',true);paintLogbook();}
  if(s==='console'){show('con',true);stopHere&&stopHere();for(const d in keys)keys[d]=false;if(!$('conOut').childElementCount)conPrint(['HOS 4.1 · COMMS CONSOLE · DSV-0417','TYPE HELP.','']);setTimeout(()=>$('conIn').focus(),30);}
  if(s==='title'){session++;show('title',true);extT0=0;CUT.exterior(1);SP.on=false;stopBand();if(AMB)AMB.stop();if(watch){watch=null;loadWorld(window.DS_DEFAULT_EPISODE);}document.body.classList.remove('watching','ui','photo','playing','aonly');setTimeout(fit,0);if(CUT.solid)CUT.solid(false);const ao=$('aonly');if(ao)ao.hidden=true;show('wui',false);show('photo',false);FOC.phase=null;CUT.focus(null);paintFocus();show('dim',false);show('wTag2',false);idle0=performance.now()/1000;setTimeout(()=>{if(state==='title')$('veil').classList.add('clear');},400);{const sv=load();$('mContinue').hidden=!sv;$('mContinue').textContent='CONTINUE'+(sv&&sv.checkpoint?' · '+sv.checkpoint:'');$('mSecond').hidden=!prefs.second;}paintMenus();focusMenu('tMenu');if(!$('mContinue').hidden){sel=[...$('tMenu').querySelectorAll('button')].filter(b=>!b.hidden).indexOf($('mContinue'));paintSel('tMenu');} /* a returning player's first choice is to carry on */}
  if(s==='pause'){show('pause',true);if($('pNote')){$('pNote').textContent=lastNote;$('pNote').hidden=!lastNote;}$('hPrompt').hidden=true;held=now();stopBand();paintMenus();focusMenu('pMenu');save();if(!watch){const c=$('schem').getContext('2d');PW.schematic(c,CUT.MAP,CUT.actorAt(P,TIMES,now(),me),CUT.roomStates(P,TIMES,now()),['SVC UNIT K9-4  '+(k9&&k9.power==='full'?'ACTIVE · FULL':'ACTIVE · RESERVE'),(story?['found_photo','found_nav','found_patch','found_trace','found_eva'].filter(k=>story.flags[k]).length:0)+' / 5 FOUND',CHK?'LAST · '+CHK:'']);$('schem').hidden=false;}else $('schem').hidden=true;}
  if(s==='controls')show('controls',true);
  if(s==='options'){show('opts',true);paintMenus();focusMenu('oMenu');}
  if(s==='setup'){show('setup',true);nwSel=0;paintSetup();const ws=prefs.watchSecs||0;$('nwHours').textContent=ws>=60?'ON WATCH · '+(ws>=3600?Math.floor(ws/3600)+' H ':'')+Math.floor(ws%3600/60)+' MIN IN ALL':'';}
  if(s==='play')document.activeElement&&document.activeElement.blur();}
let menuFrom='title';
function focusMenu(id){sel=0;paintSel(id);}
function paintSel(id){const bs=[...$(id).querySelectorAll('button')].filter(b=>!b.hidden);bs.forEach((b,i)=>b.classList.toggle('sel',i===sel));}
function menuMove(id,d){const bs=[...$(id).querySelectorAll('button')].filter(b=>!b.hidden);sel=(sel+d+bs.length)%bs.length;paintSel(id);}
function menuPick(id){const bs=[...$(id).querySelectorAll('button')].filter(b=>!b.hidden);const b=bs[sel];if(b)b.click();}
function paintMenus(){{const f=document.querySelector('#oMenu [data-o=full]');if(f)f.hidden=!document.fullscreenEnabled;}if($('mText'))$('mText').textContent='TEXT SIZE · '+({large:'LARGE',xl:'TV'}[prefs.text]||'NORMAL');if($('mMusic'))$('mMusic').textContent='MUSIC · '+(prefs.musicOn===false?'OFF':'ON');{const fromT=menuFrom==='title';if($('mPhoto'))$('mPhoto').hidden=fromT;if($('mRecord'))$('mRecord').hidden=fromT;}if($('mPad'))$('mPad').textContent='ON-SCREEN KEYS · '+padMode().toUpperCase();$('mSound').textContent='SOUND · '+(prefs.sound?'ON':'OFF');$('mCamera').textContent='CAMERA · '+(prefs.camera==='follow'?'FOLLOW':'SHIP');$('mRecord').textContent=recording?'STOP THE TAKE':'RECORD A TAKE';$('mTape').textContent='TAPE · '+TAPES[prefs.tape||0][0];}
/* ---------- whoever you are: every key becomes a command on the shared timeline ---------- */
function cmd(c){c.at=now();if(watch){P.script.push(c);P.rev++;}else{SP.cmds.push(c);SP.rev=(SP.rev||0)+1;trim();}}
function trim(){if(SP.cmds.length<60)return;const t=now(),s=CUT.snapshot(P,TIMES,t,me);
  /* what still matters: anything in the future, anything with a duration still running, and the last few moves */
  const live=SP.cmds.filter(c=>c.at>t-.5||c.at+(+c.for||+c.over||0)>t||(c.echo&&c.at+(+c.for||3)>t)),mv=SP.cmds.filter(c=>c.move&&!c.teleport).slice(-1);for(const c of mv)if(c.at<=t-.5)c.at=t; /* the walk in progress carries on from where the snapshot puts her; finished interactions live in the snapshot's counts */
  const keep=[...new Set(live.concat(mv))].filter(c=>!(c.interact&&c.at<=t-.5)).sort((a,b)=>a.at-b.at);SP.cmds.length=0;
  SP.cmds.push({at:t-.01,move:me,to:s.ref,teleport:true,interrupt:true});for(const [d,st] of Object.entries(s.doors))SP.cmds.push({at:t-.01,door:d,state:st});for(const [o,n] of Object.entries(s.obj))SP.cmds.push({at:t-.01,object:o,count:n});
  for(const [r,st] of Object.entries(s.rooms||{}))SP.cmds.push({at:t-.01,room:r,state:st});for(const [k,v] of Object.entries(s.world||{}))SP.cmds.push({at:t-.01,set:{[k]:v}});SP.cmds.push(...keep);}
const keys={};let careful=false,lit=false,crouched=false;
function moveDir(dir){const t=now();let ref=CUT.farTarget(P,TIMES,t,dir,me);if(ref&&(dir==='left'||dir==='right')&&!watch)ref=doorStop(ref,dir)||ref;if(!ref){if(dir==='left'||dir==='right')stopHere();return;}
  /* reversing: settle the old way first, then turn, then go (the turn frames play on the facing change) */
  const s=CUT.actorAt(P,TIMES,t,me),rev=(dir==='left'&&s.walk&&!s.left)||(dir==='right'&&s.walk&&s.left),c=rev?coastRef(s,t):null;
  if(c){cmd({move:me,to:c,interrupt:true,coast:true});cmd({move:me,to:ref,sneak:careful});}else cmd({move:me,to:ref,interrupt:true,sneak:careful});}
/* a closed door is a wall to her: the walk ends a step short of it (the crew's doors open for the crew; hers she opens with E) */
function doorStop(ref,dir){const t=now(),s=CUT.actorAt(P,TIMES,t,me),g=CUT.place(ref);if(!g)return null;const D=CUT.doorStates(P,TIMES,t),sg=dir==='left'?-1:1;let hit=null;
  for(const [id,d] of Object.entries(CUT.MAP.doors)){if(d.wall||d.floor||D[id]!=='locked')continue; /* a closed door she opens on the way (hatch, weight, motor); only a locked one stops her */if(Math.abs(d.y-s.y)>30)continue;const dx=(d.x-s.x)*sg;if(dx<=10*CUT.SS||(d.x-g.x)*sg<=0)continue;if(!hit||dx<hit.dx)hit={id,dx,d};}
  if(!hit)return null;const h=CUT.pick(P,TIMES,t,hit.d.x-sg*14*CUT.SS,s.y-4);return h&&h.type==='place'?h.ref:null;}
/* letting go: she does not stop dead. A short coast to rest, about three internal pixels at walking speed */
function coastRef(s,t){if(!s.walk||!(s.v>8)||watch)return null;const dir=s.left?-1:1,h=CUT.pick(P,TIMES,t,s.x+dir*s.v*.09,s.y-4);return h&&h.type==='place'?h.ref:null;}
function stopHere(){const t=now(),s=CUT.actorAt(P,TIMES,t,me),r=coastRef(s,t);if(r){cmd({move:me,to:r,interrupt:true,coast:true});return;}cmd({move:me,to:CUT.hereRef(P,TIMES,t,me),interrupt:true});}
function dirOf(k){return k==='ArrowLeft'||k==='KeyA'?'left':k==='ArrowRight'||k==='KeyD'?'right':k==='ArrowUp'||k==='KeyW'?'up':k==='ArrowDown'||k==='KeyS'?'down':null;}
function use(){const n=CUT.nearby(P,TIMES,now(),me,disabled);if(n&&n.type==='ladder')return;if(n){useObject(n);}else{cmd({actor:me,do:'look-around',for:2.5});if(state==='play')toast('NOTHING TO USE HERE · DRIFT CLOSER TO SOMETHING');}}
/* r53 · every action in GAME answers in words, fully formed, long enough to read */
const ANSWER={'quarters-locker':'A SPARE SUIT AND A DENTED THERMOS','quarters-photo':'THE CREW, SMILING, THE DAY BEFORE LAUNCH','nav-log':'ON COURSE · 150 AU FROM SOL · ALL WELL',
  'mission-patch':'DSV-0417 · HALCYON · 2291','tunnel-trace':'AN OLD REPAIR, LONG COOLED','eva-look':'STARS, AND THE PLANET\'S BLUE RINGS','viewport':'STARS, AND THE PLANET\'S BLUE RINGS',
  'bunk':'A WARM BLANKET, NEATLY FOLDED','meal-unit':'HOT COCOA · DISPENSED','sensor-sweep':'SWEEP COMPLETE · ALL CLEAR','k9-dock':'CHARGING PAD READY FOR K9','nav-chart':'NEXT WAYPOINT IN 41 DAYS',
  'sensor-terminal':'CAMERAS ON · EVERY DECK QUIET','engineering-terminal-03':'POWER ROUTING · BALANCED','bridge-terminal':'AUTOPILOT HOLDING COURSE','comms-terminal':'NO NEW MESSAGES · CHANNEL CLEAR',
  'utility-terminal':'WATER, AIR, HEAT · ALL GREEN','quarters-terminal':'PERSONAL LOG · NOTHING NEW TODAY','airlock-terminal':'AIRLOCK SEALED · PRESSURE NORMAL',
  'quarters-breaker':'BREAKER RESET · LOCAL POWER ON','coolant-control':'COOLANT FLOW STEADY','aux-breaker':'AUXILIARY POWER ON','reactor-bypass':'BYPASS CHECKED · NO CHANGE NEEDED','pressure-valve':'VALVE TURNED · PRESSURE EVEN'};
function answer(n){const O=CUT.MAP.objects[n.id]||{},nm=(n.name||O.name||'').split('·')[0].trim()||(n.type==='terminal'?'TERMINAL':'');
  if(n.type==='door')return /LOCKED/.test(n.name||'')?'LOCKED · THIS ONE STAYS SHUT':(/HATCH/.test(n.name||'')?'HATCH':'DOOR')+' · OPEN';
  const a=ANSWER[n.id]||(n.type==='terminal'?'SCREEN ON · ALL SYSTEMS NORMAL':/inspect|observe/.test(O.act||'')?'NOTHING UNUSUAL':'DONE');return (nm&&!a.startsWith(nm)?nm+' · ':'')+a;}
/* r54: the switches, machines and things to look at have no hit box of their own; a tap near one (same deck, within reach) means it */
const OBJXY={};function objAt(wx,wy){let best=null;for(const id in CUT.MAP.objects){const O=CUT.MAP.objects[id];if(!O.kind||!O.spot)continue;let p=OBJXY[id];if(p===undefined){try{p=CUT.place(O.spot);}catch(e){p=null;}OBJXY[id]=p;}if(!p)continue;
    const dx=Math.abs(wx-p.x),dy=p.y-wy;if(dx<56&&dy>-24&&dy<170){const d=dx+Math.abs(dy-60)*.3;if(!best||d<best.d)best={d,id,O};}}
  return best?{type:'switch',id:best.id,name:best.O.name}:null;}
function useObject(n){const id=n.id;cmd({actor:me,interact:id,interrupt:true});findLog(id);if(state!=='play')return;
  let d=0;try{const O=CUT.MAP.objects[id];d=O&&O.spot?(CUT.travelTime(me,CUT.hereRef(P,TIMES,now(),me),O.spot)||0):0;}catch(e){}
  setTimeout(()=>{if(state!=='play')return;toast(answer(n));feel(id);choreDone(id);},(Math.min(d,20)+.45)*1000);}
/* r54 · each thing responds in a way you can see and hear, not only in words */
function feel(id){const O=CUT.MAP.objects[id];if(!O||!O.spot||!window.__town)return;let p=null;try{p=CUT.place(O.spot);}catch(e){}if(!p)return;const T=__town;
  if(id==='meal-unit'){sfx('valve',p.x,.8);T.burst('steam',p.x,p.y-54,16);setTimeout(()=>T.burst('steam',p.x,p.y-54,10),700);}
  else if(/breaker/.test(id)){sfx('breaker',p.x,.9);const room=p.room;if(room){CUT.toy({room:{[room]:0}});setTimeout(()=>{CUT.toy({room:{[room]:1}});sfx('switchon',p.x,.8);T.burst('spark',p.x,p.y-60,12);},800);}}
  else if(id==='sensor-sweep'){sfx('sonar',p.x,.8);T.ring(p.x,p.y-30,'#8fd6cf',2.2,260);setTimeout(()=>T.ring(p.x,p.y-30,'#8fd6cf',2.2,260),600);}
  else if(id==='nav-log'){sfx('teletype',p.x,.7);T.burst('flash',p.x,p.y-50);}
  else if(id==='viewport'||id==='eva-look'){sfx('tink',p.x,.7);T.burst('spark',p.x,p.y-80,8);}
  else if(/terminal/.test(id)){sfx('blip',p.x,.7);T.burst('flash',p.x,p.y-50);}
  else{sfx('click',p.x,.7);T.ring(p.x,p.y,'#ffd08a',.9,30);}}
/* r54 · SHIP CHORES: five cozy jobs, a few minutes of clear play. Their spots glow; each one ticks off with a chime; all five and the ship lights up */
const CHORES=[{ids:['meal-unit'],label:'MAKE COCOA'},{ids:['nav-log'],label:'READ THE NAV LOG'},{ids:['quarters-breaker'],label:'RESET THE BREAKER'},{ids:['sensor-sweep'],label:'RUN A SENSOR SWEEP'},{ids:['viewport','eva-look'],label:'LOOK OUT THE WINDOW'}];
const CHR={done:new Set(),el:null,open:null,finished:false,near:null};
function choresPaint(){if(!CHR.el){CHR.el=document.createElement('div');CHR.el.className='chores';(stage.parentElement||document.body).appendChild(CHR.el);
    CHR.el.addEventListener('click',e=>{e.stopPropagation();CHR.open=!CHR.open;choresPaint();});CHR.el.addEventListener('pointerdown',e=>e.stopPropagation());}
  if(CHR.open==null)CHR.open=false; /* r56: one line by default: the count and the next job; tap for the whole list */
  const n=CHR.done.size,all=n===CHORES.length;CHR.el.classList.toggle('open',CHR.open);CHR.el.classList.toggle('all',all);
  const nx=CHORES.find((c,i)=>!CHR.done.has(i));CHR.el.innerHTML='<b>'+(all?'★ CHORES DONE':'CHORES')+' <i>'+n+'/'+CHORES.length+'</i>'+(!CHR.open&&nx?'<em>'+nx.label+'</em>':'')+'<u>'+(CHR.open?'–':'+')+'</u></b>'+(CHR.open?'<ol>'+CHORES.map((c,i)=>'<li class="'+(CHR.done.has(i)?'ok':'')+'">'+(CHR.done.has(i)?'✓':'·')+' '+c.label+'</li>').join('')+'</ol>':'');
  CHR.el.setAttribute('aria-label','Ship chores, '+n+' of '+CHORES.length+' done');}
function choreDone(id){const i=CHORES.findIndex(c=>c.ids.includes(id));if(i<0||CHR.done.has(i))return;CHR.done.add(i);sfx('ping',null,.9);choresPaint();
  const li=CHR.el&&CHR.el.querySelectorAll('li')[i];if(li){li.classList.add('pop');}
  if(CHR.done.size===CHORES.length&&!CHR.finished){CHR.finished=true;setTimeout(choresFinish,1600);}}
function choresFinish(){if(state!=='play')return;toast('ALL CHORES DONE · HALCYON HUMS HAPPILY',5.5);sfx('chirp',null,1.2);
  try{(CUT.ROOMS||[]).forEach((r,k)=>setTimeout(()=>{CUT.toy({room:{[r]:1}});sfx('relay',null,.4);},k*140));}catch(e){}
  try{const s=CUT.actorAt(P,TIMES,now(),me);__town.burst('spark',s.x,s.y-70,40);__town.mark(me,'★ WELL DONE',4.5);}catch(e){}
  try{P.script.push({at:now()+.3,actor:'k9',do:'scan',for:3});P.rev++;}catch(e){}}
window.__glowFn=()=>{if(state!=='play')return [];const L=[];CHORES.forEach((c,i)=>{if(CHR.done.has(i))return;const O=CUT.MAP.objects[c.ids[0]];if(O&&O.spot)L.push({ref:O.spot,kind:'chore'});});
  if(CHR.near){const O=CUT.MAP.objects[CHR.near];if(O&&O.spot)L.push({ref:O.spot,kind:'near'});}return L;};
let toastEl=null,toastT=0;function toast(text,secs){if(!toastEl){toastEl=document.createElement('div');toastEl.className='toast';toastEl.setAttribute('role','status');(stage.parentElement||document.body).appendChild(toastEl);}
  toastEl.textContent=text;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>toastEl.classList.remove('on'),(secs||3.4)*1000);}
/* r37 · REST. From anywhere in the story: SIT / LISTEN. Driftnaut settles, the HUD withdraws, the camera holds her room,
   the ship's little happenings pause; any key, a tap or RETURN and she carries on, with no loading. */
let resting=null;
function restOn(){if(state!=='play'||watch||resting||SCAN.dial)return;const t=now();for(const d in keys)keys[d]=false;stopHere();const room=CUT.roomAt(P,TIMES,t,me)||'crew-quarters';
  resting={room,t};cmd({actor:me,do:'idle',for:3600}); /* r42: she stays upright, drifting; no sitting on the floor */runLines(['+0 camera room '+room]);document.body.classList.add('resting');$('restChip').hidden=false;
  if(AMB)AMB.set(roomMix(room),4);sfx('click',null,.5);}
function restOff(){if(!resting)return;resting=null;document.body.classList.remove('resting');$('restChip').hidden=true;cmd({actor:me,do:'idle',for:.4});setCam(prefs.camera);}
setInterval(()=>{const b=$('restBtn');if(b)b.style.display=state==='play'&&!watch&&!resting?'block':'none';},300);
$('restBtn').addEventListener('click',e=>{e.stopPropagation();restOn();});$('restBack').addEventListener('click',e=>{e.stopPropagation();restOff();});
document.getElementById('stage').addEventListener('pointerdown',()=>{if(resting)restOff();});
function setCam(mode){prefs.camera=mode;savePrefs();if(watch){P.script.push({at:now(),camera:mode==='follow'?'follow':'cutaway',actor:me});P.rev++;}else{SP.cams.push({at:now(),mode:mode==='follow'?'follow':'cutaway',actor:me});SP.rev=(SP.rev||0)+1;}paintMenus();}
function setSound(on){prefs.sound=on;savePrefs();try{if(MS.a)navigator.mediaSession.playbackState=on?'playing':'paused';}catch(e){}if(master)master.gain.setTargetAtTime(on?1:0,actx.currentTime,.05);if(typeof pipV!=='undefined'&&pipV&&pipV.muted===on)pipV.muted=!on;paintMenus();}
const controlling=()=>state==='play';
document.addEventListener('keydown',e=>{if(document.body.classList.contains('watching')&&/^(Arrow(Up|Down|Left|Right)|Space|PageUp|PageDown|Home|End)$/.test(e.code)&&!(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)))e.preventDefault();},true); /* r53 */
addEventListener('keydown',e=>{const k=e.code;if(e.metaKey||e.ctrlKey||e.altKey)return;
  const tx=e.target&&e.target.tagName==='INPUT'&&e.target.type==='text'?e.target:null; /* the objective line: typing is typing */
  if(tx&&tx.id==='conIn'){if(k==='Enter'){e.preventDefault();conRun(tx.value);tx.value='';}else if(k==='Escape'){e.preventDefault();tx.blur();enter('play');}return;}
  if(state==='console'&&k==='Escape'){e.preventDefault();enter('play');return;}
  if(tx){if(k==='Enter'||k==='Escape'){tx.blur();e.preventDefault();if(k==='Enter'&&state==='setup')beginWatch();}else if(state==='setup'&&(k==='ArrowUp'||k==='ArrowDown')){tx.blur();nwSel=(nwSel+(k==='ArrowUp'?6:1))%7;paintSetup();e.preventDefault();}return;}
  if(state==='photo'){if(k==='ArrowLeft'||k==='KeyA')photoScale(-1);else if(k==='ArrowRight'||k==='KeyD')photoScale(1);else if(k==='Enter'||k==='Space'||k==='KeyP')savePhoto();else if(k==='Escape')photoOff();e.preventDefault();return;}if(DEV&&k==='KeyV'){showMap=!showMap;return;}
  if(state==='opening'){if(!e.repeat&&k!=='Escape')skip=true;e.preventDefault();return;}
  if(state==='chart'){if(k==='Escape'||k==='KeyE'||k==='Enter'){e.preventDefault();closeRoute();return;}const d={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]}[k];if(d){CH.px+=d[0]*24;CH.py+=d[1]*24;paintChart();}e.preventDefault();return;}
  if(state==='route'||state==='deck'){const id=state==='route'?'rMenu':'kMenu';if(k==='Escape'){e.preventDefault();closeRoute();return;}if(k==='ArrowUp'||k==='KeyW'){menuMove(id,-1);}else if(k==='ArrowDown'||k==='KeyS'){menuMove(id,1);}else if(k==='Enter'||k==='Space'||k==='KeyE'){menuPick(id);}e.preventDefault();return;}
  if(state==='options'){if(k==='Escape'){e.preventDefault();enter(menuFrom);return;}if(k==='ArrowUp'||k==='KeyW')menuMove('oMenu',-1);else if(k==='ArrowDown'||k==='KeyS')menuMove('oMenu',1);else if(k==='Enter'||k==='Space')menuPick('oMenu');e.preventDefault();return;}
  if(state==='title'||state==='pause'||state==='controls'||state==='registry'){const id=state==='title'?'tMenu':'pMenu';
    if(state==='controls'||state==='registry'){if(k==='Escape'||k==='Enter'||k==='Space'){e.preventDefault();enter(menuFrom);}return;}
    if(k==='ArrowUp'||k==='KeyW'){menuMove(id,-1);e.preventDefault();}else if(k==='ArrowDown'||k==='KeyS'){menuMove(id,1);e.preventDefault();}
    else if(k==='Enter'||k==='Space'){menuPick(id);e.preventDefault();}else if(k==='Escape'&&state==='pause'){resume();e.preventDefault();}return;}
  if(state==='setup'){const skip=d=>{if(nwSel===5&&!prefs.nw.focus)nwSel=(nwSel+d+7)%7;};if(k==='ArrowUp'||k==='KeyW'){nwSel=(nwSel+6)%7;skip(-1);paintSetup();}else if(k==='ArrowDown'||k==='KeyS'){nwSel=(nwSel+1)%7;skip(1);paintSetup();}else if(k==='ArrowLeft'||k==='KeyA'){nwChange(-1);}else if(k==='ArrowRight'||k==='KeyD'){nwChange(1);}
    else if(k==='Enter'||k==='Space'){beginWatch();}else if(k==='Escape')enter('title');e.preventDefault();return;}
  if(state==='watch'&&k==='KeyS'&&e.shiftKey){document.body.classList.toggle('studio');wake(true);e.preventDefault();return;}
  if(state==='watch'){if(k==='Escape'){if(uiKeep){uiKeep=false;$('wui').classList.remove('on');document.body.classList.remove('ui');}else{uiKeep=true;wake(true);}e.preventDefault();}else if(k==='KeyC'||k==='KeyP'){enterPlay();}else if(k==='KeyM'||k==='KeyN')quickKey(k);else if(k==='KeyD')setDim(!prefs.dim);else if(k==='KeyP')photoOn();else if(k==='KeyF')toggleFull();else wake();return;}
  if(state!=='play')return;
  if(resting){if(!/^(Shift|Control|Alt|Meta)/.test(k)){restOff();e.preventDefault();}return;}
  if(k==='KeyR'&&!watch){restOn();e.preventDefault();return;}
  if(k==='Escape'||(watch&&k==='KeyL')){if(watch)exitPlay();else enter('pause');e.preventDefault();return;}
  if(watch&&k==='KeyK'){callK9();return;}
  if(SCAN.dial){if(k==='ArrowLeft'||k==='KeyA')SCAN.turn(-.015);else if(k==='ArrowRight'||k==='KeyD')SCAN.turn(.015);else if(k==='KeyQ'||k==='Escape'||k==='KeyE')SCAN.close();e.preventDefault();return;} /* the dial has the arrows while it is open */
  if(e.repeat)return;
  const d=dirOf(k);if(d){keys[d]=true;moveDir(d);e.preventDefault();return;}
  if(k==='ShiftLeft'||k==='ShiftRight'){careful=true;const d2=['left','right','up','down'].find(x=>keys[x]);if(d2)moveDir(d2);return;}
  if(k==='KeyE'||k==='Space'||k==='Enter'){use();e.preventDefault();hinted();return;}
  if(k==='KeyF'){lit=!lit;CUT.light(lit||lightForced);sfx('click',null,.7);cmd({actor:me,do:lit?'flashlight':(crouched?'crouch':'idle'),for:lit?900:1});return;}
  if(k==='KeyC'){if(watch){exitPlay();return;}return;}
  if(k==='KeyQ'){if(watch)return;if(!SCAN.found){tuneReq=true;scanUntil=now()+5;return;}scanUntil=now()+5;const p=CUT.actorAt(P,TIMES,now(),me),R=SCAN.read(p.x,p.y);if(R.canTune&&R.state!=='LOCKED'){SCAN.open(now());for(const d in keys)keys[d]=false;stopHere();}else tuneReq=true;return;}
  if(k==='Tab'){setCam(prefs.camera==='follow'?'ship':'follow');e.preventDefault();return;}
  if(k==='KeyM'||k==='KeyN'||k==='KeyK'){quickKey(k);return;}});
document.addEventListener('keyup',e=>{const k=e.code;if(state!=='play')return;const d=dirOf(k);
  if(d){keys[d]=false;const other=['left','right','up','down'].find(x=>keys[x]);if(other)moveDir(other);else stopHere();hinted();}
  if(k==='ShiftLeft'||k==='ShiftRight'){careful=false;const d2=['left','right','up','down'].find(x=>keys[x]);if(d2)moveDir(d2);}});
window.addEventListener('blur',()=>{for(const d in keys)keys[d]=false;if(state==='play')stopHere();});
stage.addEventListener('pointerdown',e=>{if(petK9(e))return;if(state!=='play')return;const r=stage.getBoundingClientRect(),dx=(e.clientX-r.left)/r.width*LC.DW,dy=(e.clientY-r.top)/r.height*LC.DH,t=now(),V=vw(t),wx=V[0]+dx/LC.DW*V[2],wy=V[1]+dy/LC.DH*V[3];let hit=CUT.pick(P,TIMES,t,wx,wy);if(!hit||hit.type==='place'){const o=objAt(wx,wy);if(o)hit=o;}for(const d of [-30,30,-60,60]){if(hit)break;hit=CUT.pick(P,TIMES,t,wx,wy+d);}if(!hit)return;
  if(hit.type==='place'){cmd({move:me,to:hit.ref,interrupt:true,sneak:careful});try{const pl=CUT.place(hit.ref);__town.ring(pl.x,pl.y,'#ffb45a',.8,24);}catch(_){}}else useObject(hit);hinted();});
$('hPrompt').addEventListener('pointerdown',e=>{if(state!=='play')return;e.stopPropagation();e.preventDefault();use();});
let hints=0;const hinted=()=>{if(++hints>=4)$('hHint').hidden=true;};
/* the prompt, old-console style: [ WHAT ]  KEY : VERB */
function promptOf(n){let name=n.name,verb='OPERATE';const O=CUT.MAP.objects[n.id];if(n.type==='door'){const locked=/LOCKED/.test(name);name=/HATCH/.test(name)?'HATCH':'DOOR';verb=locked?'LOCKED':'OPEN';}
  else if(n.type==='ladder'){name='LADDER';verb=n.name;}else if(n.type==='switch'){verb=O&&/inspect|observe/.test(O.act||'')?'INSPECT':'OPERATE';}else if(n.type==='terminal')verb='OPERATE';
  let key=n.key||'E';const gp=navigator.getGamepads&&[...navigator.getGamepads()].some(g=>g);if(gp)key={E:'A',Q:'B',F:'X'}[key]||key;
  return '<kbd>'+key+'</kbd><i>'+verb+'</i><b>'+name+'</b>';}
/* the transmission box (§text): one short line at a time, typed, with the radio blips of an old console */
const sayQ=[];let sayT=null;
function say(who,line,secs,opt){sayQ.push({who,line,secs:secs||(2.2+line.length*.06),opt:opt||{}});if(!sayT)sayNext();}
/* where a line is shown (the UI pass, Nov 2026): a crew member we can see, close enough to read, gets a small bubble over
   their head; the ship (HOS) speaks in a thin strip at the top of the picture, never from a place; anything long, important,
   offscreen or seen from the whole-ship camera goes in the dialogue panel at the bottom of the picture. The COMMS deck below
   the screen only echoes the last line, as the console that received it. */
const TALK_ACT={PILOT:'pilot',SYSTEMS:'systems',COMMANDER:'commander'};let talkWho=null,mirrorT=null;
function actorOnScreen(a){if(!P||!TIMES)return null;const t=now(),rep=CUT.report(P,TIMES,t)[a];if(!rep||rep==='GONE'||rep==='—')return null;const p=CUT.actorAt(P,TIMES,t,a),V=vw(t);if(!p||!V)return null;
  const x=(p.x-V[0])/V[2],y=(p.y-136-V[1])/V[3],zoom=V[2]<CUT.W*.72;return {x,y,zoom,on:x>.03&&x<.97&&y>.02&&y<.98};}
function talkMode(q){if(q.opt.panel)return 'panel';if(q.who==='HOS')return q.line.length<=46&&!q.opt.panel?'strip':'panel';
  const a=TALK_ACT[q.who];if(a&&q.line.length<=70){const o=actorOnScreen(a);if(o&&o.on&&o.zoom)return 'bubble';}return 'panel';}
function talkHide(){$('tBub').hidden=true;$('tPanel').hidden=true;$('tStrip').hidden=true;$('tStrip').dataset.note='';talkWho=null;}
function sayNext(){const q=sayQ.shift();talkHide();if(!q){sayT=null;return;}const mode=talkMode(q),hos=q.who==='HOS';let T;
  if(mode==='strip'){const el=$('tStrip');el.className='strip '+(/FAIL|BREACH|CRITICAL/.test(q.line)?'red':/ANOMAL|WARN|ALERT|DETECT|UNKNOWN|ERROR|LOW|OFFLINE|DEGRADED|NULL|LOST|DECEASED/.test(q.line)?'amber':'cyan');el.textContent='';el.hidden=false;
    const pre='HOS // ';T={set:v=>{el.textContent=pre+v;}};}
  else{const el=mode==='bubble'?$('tBub'):$('tPanel'),W=el.querySelector('b'),S=el.querySelector('span');W.textContent=q.who;W.className=hos?'hos':q.who==='K9'?'k9':'';S.textContent='';el.hidden=false;T={set:v=>{S.textContent=v;}};
    if(mode==='bubble'){talkWho=TALK_ACT[q.who];placeBubble();}}
  let i=0;const type=()=>{if(i<q.line.length){T.set(q.line.slice(0,++i));if(talkWho)placeBubble();if(i%2)sfx('blip',null,hos?.5:.8);sayT=setTimeout(type,34);}
    else{mirror(q);sayT=setTimeout(sayNext,q.secs*1000);}};type();}
function mirror(q){const W=$('sayWho'),S=$('sayText');W.textContent=q.who;W.className=q.who==='HOS'?'hos':'';S.textContent=q.line;$('hSay').hidden=false;clearTimeout(mirrorT);mirrorT=setTimeout(()=>{$('hSay').hidden=true;},13000);}
function placeBubble(){const el=$('tBub');if(el.hidden||!talkWho)return;const o=actorOnScreen(talkWho);if(!o)return;const box=$('talk'),sw=box.clientWidth,sh=box.clientHeight,bw=el.offsetWidth,bh=el.offsetHeight;
  const ax=Math.max(0,Math.min(1,o.x))*sw,ay=Math.max(0,Math.min(1,o.y))*sh;let bx=Math.round(ax-bw/2),by=Math.round(ay-bh-14);bx=Math.max(6,Math.min(sw-bw-6,bx));const below=by<6;if(below)by=Math.round(ay+70);by=Math.max(6,Math.min(sh-bh-6,by));
  el.style.left=bx+'px';el.style.top=by+'px';el.style.setProperty('--tx',Math.max(10,Math.min(bw-14,ax-bx))+'px');el.classList.toggle('below',below);}
function sayClear(){sayQ.length=0;clearTimeout(sayT);sayT=null;talkHide();}
/* ---------- the menus ---------- */
$('tMenu').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;const m=b.dataset.m;
  if(m==='new')begin(null);else if(m==='second')begin(null,{second:true});else if(m==='continue')begin(load());else if(m==='watch')beginWatch();else if(m==='play')beginWatch({play:true});else if(m==='setup')enter('setup');else if(m==='options'){menuFrom='title';enter('options');}else if(m==='controls'){menuFrom='title';enter('controls');}else if(m==='registry'){menuFrom='title';enter('registry');}else if(m==='sound'){ensureAudio();setSound(!prefs.sound);}});
$('pMenu').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;const m=b.dataset.m;
  if(m==='resume')resume();else if(m==='camera')setCam(prefs.camera==='follow'?'ship':'follow');else if(m==='psound')setSound(!prefs.sound);else if(m==='tape'){setTape((prefs.tape||0)+1,false);held=now();}else if(m==='controls'){menuFrom='pause';enter('controls');}
  else if(m==='record')toggleRecord();else if(m==='options'){menuFrom='pause';enter('options');}else if(m==='quit'){save();if(recording)toggleRecord();enter('title');}});
for(const id of ['tMenu','pMenu','oMenu'])$(id).addEventListener('pointermove',e=>{const b=e.target.closest('button');if(!b)return;const bs=[...$(id).querySelectorAll('button')].filter(x=>!x.hidden);sel=bs.indexOf(b);paintSel(id);});
$('oMenu').addEventListener('click',e=>{const b=e.target.closest('[data-o]');if(!b)return;const o=b.dataset.o;
  if(o==='sound'){ensureAudio();setSound(!prefs.sound);}else if(o==='music'){ensureAudio();setMusicOn(prefs.musicOn===false);paintMenus();}
  else if(o==='pad'){const m=padMode();prefs.pad=m==='auto'?'on':m==='on'?'off':'auto';savePrefs();paintMenus();}
  else if(o==='photo'){if(menuFrom==='pause'){enter('pause');photoOn();}}else if(o==='record'){if(menuFrom==='pause'){enter('pause');toggleRecord();}}else if(o==='full')toggleFull();else if(o==='text'){prefs.text=prefs.text==='large'?'xl':prefs.text==='xl'?'normal':'large';savePrefs();applyText();paintMenus();}else if(o==='back')enter(menuFrom);});
/* ---------- NIGHT WATCH: setup ---------- */
const NWOPT={view:['full-ship','bridge','engineering','outer-hull','auto'],activity:['quiet','routine','busy','strange'],music:['auto','soft-orbit','space-wave','warm-transit','night-cruise'] /* r40: the six tapes */,duration:[30,60,120,360],focus:[0,25,45,60,90]};const NWK=['view','activity','music','duration','focus']; /* r39: back to release 35's five rows (VIEW only if you want one room; the default is the whole ship) */
let nwSel=0;
function paintSetup(){const rows=[...$('nwRows').querySelectorAll('.row')];rows.forEach((r,i)=>{r.classList.toggle('sel',i===nwSel);const k=r.dataset.k,v=prefs.nw[k];
  if(k==='objective'){r.hidden=!prefs.nw.focus;const I=$('nwObj');if(document.activeElement!==I)I.value=prefs.nw.objective||'';if(i===nwSel&&state==='setup')I.focus();else if(document.activeElement===I)I.blur();return;}
  if(k==='focus'){r.querySelector('b').textContent=v?v+' MIN · BREAK '+breakOf(v)+' MIN':'OFF';return;}
  r.querySelector('b').textContent=k==='view'?(NW.VIEWS[v]||NW.VIEWS['full-ship']).name:k==='activity'?NW.ACTIVITY[v].name:k==='music'?(v==='auto'?'AUTO · '+NW.MUSIC[NW.ACTIVITY[prefs.nw.activity].music].name:NW.MUSIC[v].name):(v>=300?'ENDLESS':v>=60?(v/60)+' HOUR'+(v>60?'S':''):v+' MIN');});
  $('nwMenu').querySelector('[data-m=begin]').classList.toggle('sel',nwSel===6);$('nwMenu').querySelector('[data-m=back]').classList.remove('sel');}
function nwChange(d){if(nwSel>4)return;const k=NWK[nwSel],L=NWOPT[k],i=Math.max(0,L.indexOf(prefs.nw[k]||0));prefs.nw[k]=L[(i+d+L.length)%L.length];savePrefs();paintSetup();}
$('nwRows').addEventListener('click',e=>{const r=e.target.closest('.row');if(!r)return;nwSel=[...$('nwRows').querySelectorAll('.row')].indexOf(r);if(r.dataset.k==='objective'){paintSetup();return;}nwChange(1);});
$('nwObj').addEventListener('input',e=>{prefs.nw.objective=e.target.value.slice(0,40);savePrefs();});
$('nwMenu').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;if(b.dataset.m==='begin')beginWatch();else enter('title');});
/* ---------- FOCUS: a work session on the bridge (Night Watch). The countdown is on the bridge security CRT and in one
   faint line on screen; when it runs out a relay clicks and the music settles for the break, then the next session starts.
   Nothing leaves this browser: the length and the objective are remembered here, nothing is counted anywhere. ---------- */
const FOC={phase:null,len:0,start:0,end:0,n:0};
const breakOf=m=>m<=25?5:m<=60?10:15;
function focusInfo(){return {phase:FOC.phase,start:FOC.start,end:FOC.end,n:FOC.n,label:(prefs.nw.objective||'').toUpperCase()};}
function focusStart(min,brk){const t=now();if(!min){FOC.phase=null;FOC.len=0;CUT.focus(null);paintFocus(t);return;}FOC.len=min;
  if(brk){FOC.phase='break';FOC.start=t;FOC.end=t+breakOf(min)*60;}else{FOC.phase='focus';FOC.n++;FOC.start=t;FOC.end=t+min*60;}CUT.focus(focusInfo());paintFocus(t);}
/* ---------- SLEEP (Night Watch): over 20 or 40 minutes the music goes, the picture dims to almost nothing, one last relay
   click; then only the ventilation. The hours spent on watch are counted here, in this browser, and nowhere else. ---------- */
let SLP=null,wsT=0;
/* SLEEP (r28): over 20 or 40 minutes the ship settles for the night. Nothing strange happens any more, the lights go down to
   the quarters' lamp, a brown-noise bed comes up under the vents, the band drops to a drone and then away, the picture dims
   to black. The ship keeps breathing in the dark. A tap lifts the dark for a few seconds; SLEEP again wakes it all. */
let sleeper=null;
function wakeCommander(){if(!sleeper||!watch)return;const t=now();sleeper=null;if(window.__town)__town.sleep('commander',false);P.script=P.script.filter(b=>!(b.actor==='commander'||b.move==='commander')||CUT.secs(b.at)<=t);P.script.push({at:t,show:'commander'});
  const back=NW.schedule(watch.cfg,{from:t+4,only:'commander',at:{commander:'quarters.bunk'}});P.script.push(...DSE.beatsIn(back).beats.map(b=>Object.assign(b,{at:CUT.secs(b.at)})));P.rev++;}
function sleepStart(min){const t=now(),mv=musicLevel();if(band&&band.setIntensity)band.setIntensity(min?0:INT_N()); /* r40: SLEEP plays the tape at DEEP REST */
  if(!min){wakeCommander();SLP=null;setDim(prefs.dim,true);$('dim').style.opacity='';if(musicBus)musicBus.gain.setTargetAtTime(mv,actx.currentTime,2);try{band&&band.setState(NW.ACTIVITY[watch.cfg.activity].state,20);}catch(e){}
    if(AMB){AMB.setMood(watch?watch.cfg.activity:'routine');AMB.duck(1,6);}if(window.__joy)__joy.sleep(false);if(window.__toys&&__toys.sleepLights)__toys.sleepLights(false);paintWatch();return;}
  SLP={min,t0:t,t1:t+min*60,done:false};$('dim').hidden=false;
  if(watch){P.script=P.script.filter(b=>{const at=CUT.secs(b.at);return !(at>t&&(b.event||b.mystery||b.anomaly||b.echo||b.door||(b.room&&!/^(normal|low-power|powered)$/.test(String(b.state)))));});P.rev++;} /* nothing strange tonight */
  if(musicBus)musicBus.gain.setTargetAtTime(mv*.45,actx.currentTime,60);try{band&&band.setState('quiet',60);}catch(e){}if(AMB){AMB.setMood('quiet');AMB.duck(.8,20);}
  if(window.__joy)__joy.sleep(true);if(window.__toys&&__toys.sleepLights)__toys.sleepLights(true);paintWatch();}
let sleepPeek=0;document.addEventListener('pointerdown',()=>{if(SLP&&SLP.done)sleepPeek=performance.now();},true);
function sleepTick(t){if(!SLP)return;const u=Math.max(0,Math.min(1,(t-SLP.t0)/(SLP.t1-SLP.t0))),peek=performance.now()-sleepPeek<8000;
  $('dim').style.opacity=String(SLP.done?(peek?.55:.985):.1+.8*u*u); /* the end of sleep is black; a tap lifts it a little */
  if(u>=1&&!SLP.done){SLP.done=true;relay();if(musicBus)musicBus.gain.setTargetAtTime(0,actx.currentTime,60);if(AMB)AMB.duck(.55,30);}}
function relay(){sfx('click',null,.55);setTimeout(()=>sfx('click',null,.35),180);try{if(band&&band.hero)band.hero('relay');}catch(e){}}
function focusTick(t){if(FOC.phase==='focus'&&!FOC.k9&&t-FOC.start>480){FOC.k9=true;try{k9Rest(t,true);}catch(e){}}
  if(!FOC.phase||t<FOC.end)return;if(FOC.k9){FOC.k9=false;try{k9Rest(t,false);}catch(e){}}relay();
  if(FOC.phase==='focus'){try{band.setState('quiet',20);}catch(e){}focusStart(FOC.len,true);}
  else{try{band.setState(NW.ACTIVITY[watch.cfg.activity].state,20);}catch(e){}focusStart(FOC.len);}}
function paintFocus(t){const el=$('wFocus');if(!FOC.phase||!watch){el.hidden=true;return;}t=t==null?now():t;const left=Math.max(0,FOC.end-t),lab=prefs.nw.objective?' · '+prefs.nw.objective.toUpperCase():'';
  el.hidden=false;el.classList.toggle('brk',FOC.phase==='break');el.textContent=FOC.phase==='focus'?'FOCUS '+FOC.n+' · '+mmss(left)+lab:'BREAK · '+mmss(left)+' · SESSION '+FOC.n+' DONE';}
/* ---------- PHOTO: the frame exactly as the ship draws it (640 × 360), scaled by whole pixels, with nothing on top ---------- */
const PHOTO_K=[1,2,3,4,6];let photoFrom=null;
function photoOn(){if(!['pause','watch','play'].includes(state))return;if(state==='play'&&!watch){enter('pause');}photoFrom=state;
  if(photoFrom==='pause')show('pause',false);state='photo';document.body.classList.add('photo');show('photo',true);paintPhoto();}
function photoOff(){document.body.classList.remove('photo');show('photo',false);const f=photoFrom;photoFrom=null;if(f==='pause'){state='pause';show('pause',true);focusMenu('pMenu');}else{state=f||'watch';if(watch)wake();}}
function photoScale(d){const i=PHOTO_K.indexOf(prefs.photo||4);prefs.photo=PHOTO_K[clamp((i<0?3:i)+d,0,PHOTO_K.length-1)];savePrefs();paintPhoto();}
function paintPhoto(){const k=prefs.photo||4,n={1:'',2:'',3:' · 1080P',4:' · 1440P',6:' · 4K'}[k];$('phScale').textContent=k+'× · '+640*k+' × '+360*k+n;}
function savePhoto(){const src=CUT.frame&&CUT.frame();if(!src)return;const k=prefs.photo||4,c=document.createElement('canvas');c.width=640*k;c.height=360*k;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(src,0,0,640,360,0,0,c.width,c.height);
  const d=new Date(),st=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'-'+String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0')+String(d.getSeconds()).padStart(2,'0');
  c.toBlob(b=>{if(!b)return;const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='halcyon-'+c.width+'x'+c.height+'-'+st+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    sfx('click',null,.6);const f=$('phFlash');f.classList.remove('on');void f.offsetWidth;f.classList.add('on');},'image/png');}
$('photo').addEventListener('click',e=>{const b=e.target.closest('[data-p]');if(!b)return;const p=b.dataset.p;if(p==='save')savePhoto();else if(p==='less')photoScale(-1);else if(p==='more')photoScale(1);else photoOff();});
/* ---------- NIGHT WATCH: the watch itself ---------- */
let uiT=null,wStart=0,endingSoon=false,uiKeep=false;
async function beginWatch(o){o=o||{};ensureAudio();try{await Promise.race([actx.resume(),new Promise(r=>setTimeout(r,400))]);}catch(e){} /* r54: a deep link (?game) has no tap yet: don't wait for the sound, start it on the first touch */
  if(actx.state!=='running'){const go=()=>{try{actx.resume();if(MS.a)MS.a.play().catch(()=>{});}catch(e){}removeEventListener('pointerdown',go,true);removeEventListener('keydown',go,true);};addEventListener('pointerdown',go,true);addEventListener('keydown',go,true);}await untilLoaded();const nw=prefs.nw;if(!NW.SCENES[nw.scene])nw.scene='drift';nw.view='full-ship';const SCN=NW.SCENES[nw.scene];
  const cfg={era:'2291',scene:nw.scene,view:'full-ship',activity:SCN.pace||'routine',music:'soft-orbit',duration_minutes:360, /* r42: no setup: the whole ship, endless, the last scene and tape */seed:watchSeed||22910000+Math.floor(Math.random()*89999)};
  const man=NW.manifest(cfg);watch={cfg,man,seed:cfg.seed};session++;show('setup',false);show('title',false);show('opts',false); /* r28: a watch can start straight from the title */$('veil').classList.remove('clear');await wait(700);
  loadWorld(man);if(o.play&&P.brand){P.brand.intro=false;extT0=0;CUT.exterior(null);} /* PLAY: no hull opening, straight in (r53: and the hull really opens: it was left closed) */SP.on=false;SP.cmds.length=0;SP.cams.length=0;me='commander';held=null;endingSoon=false;
  $('wName').textContent='DRIFTNAUT · '+SCN.name;document.body.classList.add('watching');state='watch';show('hud',false);fit();
  startBand(0);msStart();setTimeout(()=>{if(watch)nowPlaying(watch.tape||curTapeId());},2500);if(AMB){AMB.setMood(cfg.activity);AMB.start(actx,ambT(),prefs.mix,{mood:cfg.activity});ambT().gain.value=AMBV[prefs.nw.ambience]||1;}paintBeds();musicBus.gain.value=musicLevel();ambT().gain.value=SOUNDP[prefs.nw.sound||'balanced'].amb;
  keepAwake(true);setDim(prefs.dim&&cfg.activity==='quiet',true);SLP=null;sleeper=null;if(window.__town)__town.sleep('commander',false);$('dim').style.opacity='';if(sleepReq)setTimeout(()=>sleepStart(30),50);FOC.n=0;focusStart(0);paintWatch();wStart=performance.now();$('veil').classList.add('clear');wake();if(o.play)setTimeout(()=>enterPlay(),400);}
function paintWatch(){/* full labels on a big screen; on a small one the words in <em> drop and an active button just turns amber */
  $('wControl').innerHTML=(state==='play'?'<em>RELEASE </em>':'<em>TAKE </em>')+'CONTROL';$('wControl').classList.toggle('on',state==='play');$('wSleep').innerHTML='SLEEP<em> · '+(SLP?SLP.min+' MIN':'OFF')+'</em>';$('wSleep').classList.toggle('on',!!SLP);$('wFocusBtn').innerHTML='FOCUS<em> · '+(FOC.phase?FOC.len+' MIN':'OFF')+'</em>';$('wFocusBtn').classList.toggle('on',!!FOC.phase);if(document.activeElement!==$('wObj'))$('wObj').value=prefs.nw.objective||'';$('wObj').hidden=!FOC.phase;$('wName').style.opacity=prefs.tag?1:0;$('wTag2').hidden=!(prefs.tag&&watch);$('wTag2').textContent=$('wName').textContent;
  {const sd=$('wSound');if(sd)sd.textContent=prefs.sound?'MUTE':'UNMUTE';sd.classList.toggle('off',!prefs.sound);const fd=$('wFade');if(fd){fd.innerHTML='FADE OUT<em> · '+(SLP?SLP.min+' MIN':'OFF')+'</em>';fd.classList.toggle('on',!!SLP);}}{const t=$('wTape');if(t&&watch){const id=watch.tape||curTapeId();t.innerHTML='TAPE<em> · '+((NW.MUSIC[id]||{}).name||'')+'</em>';}const am=$('wAmb');if(am)am.innerHTML='AMBIENCE<em> · '+String(prefs.nw.ambience||'mid').toUpperCase()+'</em>';const wi=$('wInt');if(wi)wi.innerHTML='INTENSITY<em> · '+INTN[prefs.nw.intensity||'focus']+'</em>';for(const k of ['brown','pink']){const b=$('w'+k);if(b)b.innerHTML=k.toUpperCase()+' NOISE<em> · '+String(prefs.nw[k]||'low').toUpperCase()+'</em>';}}{const r=$('wRec');if(r){r.innerHTML=recording?'● REC<em> · STOP</em>':'REC<em> · LONG TAKE</em>';r.classList.toggle('on',!!recording);}}$('wFloat').innerHTML=document.pictureInPictureElement?'FLOAT<em> · ON</em>':'FLOAT';$('wFloat').classList.toggle('on',!!document.pictureInPictureElement);$('wFloat').hidden=!document.pictureInPictureEnabled;{const f=document.querySelector('[data-w=full]');if(f)f.hidden=!document.fullscreenEnabled;}} /* only what this browser can do */ /* r27: the seven per-sound sliders are gone; MUSIC on the quick bar turns the music off */
function wake(keep){if(BC)return;/* the mouse moved: show the few controls, then hide them again */
  if(!watch)return;$('wui').hidden=false;$('wui').classList.add('on');document.body.classList.add('ui');clearTimeout(uiT);if(!keep&&!uiKeep)uiT=setTimeout(()=>{if(document.activeElement===$('wObj')){wake();return;}$('wui').classList.remove('on');document.body.classList.remove('ui');},4000);}
document.addEventListener('pointermove',()=>{if(watch&&(state==='watch'||state==='play'))wake();});
$('wui').addEventListener('click',e=>{const b=e.target.closest('[data-w]');if(!b)return;const w=b.dataset.w;
  if(w==='next'){stationNext(3);wake();return;} /* r52 ⏭ */
  if(w==='more'){const m=$('wMore'),open=m.hidden;m.hidden=!open;$('wMoreBtn').setAttribute('aria-expanded',String(open));$('wMoreBtn').classList.toggle('on',open);wake();return;} /* r31: the rest, out of the way */
  if(w==='play'){enterPlay();return;}if(w==='listen'){exitPlay();return;}if(w==='k9'){callK9();wake();return;}if(w==='sound'){ensureAudio();setSound(!prefs.sound);paintWatch();wake();return;} /* r47: SOUND is simply on/off */if(w==='aud'){audioOnly(true);return;}
  if(w==='fade'){const L=[0,30,60],i=L.indexOf(SLP?SLP.min:0);sleepStart(L[(i+1)%3]);wake();return;}if(w==='menu'){endWatch();return;}
  if(w==='control'){if(state==='play')exitPlay();else enterPlay();}else if(w==='dim')setDim(!prefs.dim);else if(w==='tag'){prefs.tag=!prefs.tag;savePrefs();paintWatch();}else if(w==='end')endWatch();else if(w==='focus'){const L=NWOPT.focus,i=L.indexOf(FOC.phase?FOC.len:0),v=L[(i+1)%L.length];prefs.nw.focus=v;savePrefs();FOC.n=0;focusStart(v);paintWatch();wake();}else if(w==='photo')photoOn();else if(w==='full')toggleFull();else if(w==='sleep'){const L=[0,20,40],i=L.indexOf(SLP?SLP.min:0);sleepStart(L[(i+1)%L.length]);wake();}else if(w==='float')floatWindow();else if(w==='tape'){const L=NWOPT.music.filter(k=>k!=='auto'),cur=watch&&watch.tape||curTapeId(),i=L.indexOf(cur);const id=L[(i+1)%L.length];prefs.nw.music=id;savePrefs();watchTape(id);wake();}else if(w==='int'){const i=INT_N();setIntensity(INTS[(i+1)%3]);wake();}else if(w==='brown'||w==='pink'){const L=['off','low','mid','high'],i=L.indexOf(prefs.nw[w]||'low');prefs.nw[w]=L[(i+1)%4];savePrefs();paintBeds();paintWatch();wake();}else if(w==='amb'){const L=['low','mid','high'],i=L.indexOf(prefs.nw.ambience||'mid');setAmbience(L[(i+1)%3]);wake();}else if(w==='rec'){const was=!!recording;toggleRecord(was?null:{vbr:4e6,secs:3600}).then(()=>{if(was&&!$('takeLink').hidden)$('takeLink').click();paintWatch();});wake();} /* r33: a long take from the watch: 1080p at a size an hour can hold; stop it and the file saves */});
$('wObj').addEventListener('input',e=>{prefs.nw.objective=e.target.value.slice(0,40);savePrefs();CUT.focus(FOC.phase?focusInfo():null);paintFocus();});
function setDim(on,quiet){prefs.dim=!!on;if(!quiet)savePrefs();$('dim').hidden=!on;paintWatch();}
/* ================= r42 · LISTEN and PLAY: one ship, two ways in ================= */
/* SOUND: three mixes. MUSIC (the tape forward, the noise low) · BALANCED · NOISE (brown and pink forward, the band back) */
const SOUNDP={music:{f:1,brown:'low',pink:'off',amb:.8,name:'MUSIC'},balanced:{f:1,brown:'low',pink:'off',amb:.7,name:'BALANCED'},noise:{f:.35,brown:'high',pink:'mid',amb:1.1,name:'NOISE'}};
const musicLevel=()=>Math.pow(prefs.mix.music!=null?prefs.mix.music:.65,1.4)*(SOUNDP[prefs.nw.sound||'balanced']||SOUNDP.balanced).f;
function setSoundPreset(k){const S=SOUNDP[k]?k:'balanced';prefs.nw.sound=S;prefs.nw.brown=SOUNDP[S].brown;prefs.nw.pink=SOUNDP[S].pink;savePrefs();if(actx){if(musicBus&&!SLP)musicBus.gain.setTargetAtTime(musicLevel(),actx.currentTime,1.5);const T=ambT();if(T)T.gain.setTargetAtTime(SOUNDP[S].amb,actx.currentTime,1.5);}paintBeds();paintWatch();}
/* AUDIO ONLY: the screen goes black, the sound carries on; any tap or key brings the ship back */
document.addEventListener('pointerdown',e=>{if(document.body.classList.contains('aonly')){e.stopPropagation();e.preventDefault();audioOnly(false);wake();}},true);
document.addEventListener('keydown',e=>{if(document.body.classList.contains('aonly')){e.stopPropagation();e.preventDefault();audioOnly(false);wake();}},true);
function audioOnly(on){const a=$('aonly');if(!a)return;a.hidden=!on;document.body.classList.toggle('aonly',!!on);if(on){a.classList.remove('hint');void a.offsetWidth;a.classList.add('hint');}}
/* PLAY: you are Driftnaut, drifting through the same ship, the crew going about their day around you; LISTEN gives the ship back */
const PLAY_AT='quarters.locker',CREW3=['pilot','systems','commander'];
function enterPlay(){if(!watch){beginWatch({play:true});return;}if(state==='play')return;audioOnly(false);const t=now(),p=CUT.place(PLAY_AT);if(!p)return;
  P.script.push({at:t,move:'deadscout',to:p.ref,teleport:true,interrupt:true},{at:t+.05,show:'deadscout'});P.rev++;if(CUT.solid)CUT.solid(true); /* r57: the crew stay aboard in GAME: Driftnaut has her own white-and-teal suit now, so nobody is mistaken for her */
  extT0=0;if(P.brand)P.brand.intro=false;CUT.exterior(null);me='deadscout';lit=false;crouched=false;careful=false;state='play';show('hud',false);document.body.classList.add('playing');paintWatch();wake();setTimeout(()=>{try{__town.mark('deadscout','YOU',5);}catch(e){}},250);
  if((prefs.playHints||0)<3){prefs.playHints=(prefs.playHints||0)+1;savePrefs();const touch=window.matchMedia&&matchMedia('(pointer: coarse)').matches;setTimeout(()=>toast(touch?'TAP ANYWHERE TO DRIFT THERE · TAP THINGS TO USE THEM':'CLICK TO DRIFT THERE · ARROWS WORK TOO · E USES THINGS',6),900);}
  choresPaint();rotateHint();CAM.wide=false;}
function exitPlay(){if(!watch||state!=='play')return;for(const d in keys)keys[d]=false;const t=now();P.script.push({at:t+.4,hide:'deadscout'},...CREW3.map(c=>({at:t+.4,show:c})));P.rev++;if(CUT.solid)setTimeout(()=>CUT.solid(false),500);
  if(prefs.camera==='follow')setCam('ship');state='watch';me='commander';$('hPrompt').hidden=true;document.body.classList.remove('playing');paintWatch();wake();}
/* CALL K9: it comes by its own routes; it never climbs a ladder, so from another deck it says so and waits */
let k9Call=0;
function callK9(){if(!watch)return;const pn=performance.now();if(pn<k9Call){toast('K9 IS ALREADY ON THE WAY');try{__town.mark('k9','K9',2.5,'#8fd6cf');}catch(e){}return;}
  const t=now(),ref=CUT.hereRef(P,TIMES,t,me);const r=window.K9NAV&&K9NAV.go(ref,{fast:true});
  if(r){sfx('chirp',null,1.2);P.script.push({at:t+r.secs+.4,actor:'k9',do:'wait',for:20});P.rev++;k9Call=pn+r.secs*1000+600;toast(r.secs<1.5?'K9 IS RIGHT HERE':'K9 IS COMING');try{__town.mark('k9','K9',r.secs+1.5,'#8fd6cf');}catch(e){}
    if(r.secs>=1.5)setTimeout(()=>{if(state==='play')toast('K9 IS HERE');},r.secs*1000+500);}
  else{P.script.push({at:t,actor:'k9',do:'signal-detect',for:2.4});P.rev++;sfx('chirp',null,1);toast('K9 CAN\'T CLIMB LADDERS · IT WAITS ON THE LOWER DECKS',4);try{__town.mark('k9','K9',3,'#8fd6cf');}catch(e){}}}
/* a scene's pace: BUSY SHIP gives the crew more to do; the others the ordinary day. The crew's plan is redrawn from now */
function setPace(act){if(!watch||watch.cfg.activity===act)return;const t=now(),CR=['pilot','systems','commander'];watch.cfg.activity=act;
  P.script=P.script.filter(b=>CUT.secs(b.at)<=t||!(CR.includes(b.actor)||CR.includes(b.move)||CR.includes(b.hide)||CR.includes(b.show)||b.screen||b.room));
  const at={};for(const a of CR)at[a]=CUT.hereRef(P,TIMES,t,a);const ev=NW.schedule(watch.cfg,{from:t+2,at});P.script.push(...DSE.beatsIn(ev.filter(e=>!e.camera)).beats.map(b=>Object.assign(b,{at:CUT.secs(b.at)})));P.rev++;
  watch.man.props=(watch.man.props||[]).filter(q=>q.at<=t).concat(ev.props||[]).sort((a,b)=>a.at-b.at);try{band&&band.setState(NW.ACTIVITY[act].state,20);}catch(e){}}
const steerer=()=>watch&&watch.cfg.era==='2291'?'commander':'deadscout'; /* r37: in NOW you take Driftnaut; in 2291, the commander */
function takeControl(){if(!watch||state!=='watch')return;wakeCommander();const t=now(),W=steerer();P.script=P.script.filter(b=>!(b.actor===W||b.move===W)||CUT.secs(b.at)<=t);P.script.push({at:t,move:W,to:CUT.hereRef(P,TIMES,t,W),interrupt:true});P.rev++;
  me=W;lit=false;crouched=false;careful=false;state='play';show('hud',true);$('hHint').hidden=true;paintWatch();wake();}
function releaseControl(){if(!watch||state!=='play')return;const t=now();for(const d in keys)keys[d]=false;stopHere();
  if(me==='commander'){const back=NW.schedule(watch.cfg,{from:t+3,only:'commander',at:{commander:CUT.hereRef(P,TIMES,t,'commander')}});P.script.push(...DSE.beatsIn(back).beats.map(b=>Object.assign(b,{at:CUT.secs(b.at)})));P.rev++;}else if(window.__toys&&__toys.resume)__toys.resume();
  state='watch';show('hud',false);$('hPrompt').hidden=true;paintWatch();wake();fadeExterior(4000);}
async function endWatch(){if(!watch)return;if(window.__joy&&__joy.endShift&&state==='watch'){try{__joy.endShift();}catch(e){}await wait(2600);} /* r29: the lights go out room by room first */keepAwake(false);if(document.pictureInPictureElement)document.exitPictureInPicture().catch(()=>{});SLP=null;$('dim').style.opacity='';savePrefs();state='end';$('veil').classList.remove('clear');if(musicBus)musicBus.gain.setTargetAtTime(0,actx.currentTime,.6);if(AMB)AMB.duck(1,2);await wait(1800);if(recording)await toggleRecord();enter('title');$('veil').classList.add('clear');}
/* ---------- the episode: beginning, resuming, ending ---------- */
const loaded=()=>!!window.DS_ALL&&PX.ready();
async function untilLoaded(){if(loaded())return;show('cards',true);$('cards').innerHTML='<p class="year" style="animation:none;opacity:.7;font-size:14px;letter-spacing:6px">RECOVERING HALCYON</p>';while(!loaded())await wait(120);show('cards',false);}
async function begin(saved,opts){ensureAudio();try{await actx.resume();}catch(e){}await untilLoaded();second=!!(opts&&opts.second)||!!(saved&&saved.second);lightForced=false;CUT.light(false);playT=saved&&saved.playT||0;if(watch||P.name!=='DRIFTNAUT'){watch=null;loadWorld(window.DS_DEFAULT_EPISODE);}me='deadscout';const from=CUT.wakeAt(P,TIMES);session++;CUT.drift(0);playPn=0; /* a new transmission starts undrifted (r22 carried UNCANNY into the next game) */
  state='opening';SP.on=true;SP.from=from;SP.cmds.length=0;SP.cams.length=0;SP.notes.length=0;SP.rev=(SP.rev||0)+1;lit=false;crouched=false;careful=false;for(const d in keys)keys[d]=false;disabled=['pressure-valve'];SCAN.clear();PW.reset();notes.length=0;
  let start=from;if(saved&&saved.t>from&&saved.t<TOTAL-60){start=saved.t;SP.cmds.push({at:start-.02,show:'deadscout'},{at:start-.01,move:'deadscout',to:saved.ref,teleport:true,interrupt:true});for(const [d,st] of Object.entries(saved.doors||{}))SP.cmds.push({at:start-.01,door:d,state:st});for(const [o,n] of Object.entries(saved.obj||{}))SP.cmds.push({at:start-.01,object:o,count:n});
    for(const [r,st] of Object.entries(saved.rooms||{}))SP.cmds.push({at:start-.01,room:r,state:st});for(const [k,v] of Object.entries(saved.world||{}))SP.cmds.push({at:start-.01,set:{[k]:v}});}
  if(prefs.tape)setTape(prefs.tape,false);story=STORY.create(storyApi());if(saved)story.restore(saved.story);if(second)story.flags.second=true;k9=K9.create(k9Api());k9.reset();events=EVENTS.create(eventsApi());if(saved&&saved.events)events.restore(saved.events);else events.reset();k9.state=saved?'follow':'off';k9.power=saved&&saved.story&&saved.story.flags&&saved.story.flags.engineering_restored?'full':'reserve';hintRef=null;lastProgress=now();CHK=saved&&saved.checkpoint||'';
  SP.cams.push({at:saved?start-.1:from+2,mode:prefs.camera==='follow'?'follow':'cutaway',actor:'deadscout'});if(second&&!saved)SP.cmds.push({at:.5,show:'scout'},{at:.6,actor:'scout',do:'terminal-idle',for:30},{at:31.9,hide:'scout'}); /* a second transmission: she was on the bridge all along */ /* new game: the script's cameras run the opening, then the camera finds her */
  show('title',false);$('veil').classList.remove('clear');extT0=0;await wait(saved?500:900);
  held=null;if(musicBus)musicBus.gain.value=1;startBand(saved?start:0);if(AMB){AMB.setMood('routine');AMB.start(actx,ambT(),roomMix('crew-quarters'),{mood:'routine'});ambT().gain.value=1;paintBeds();}SX.room=null;SX.doors=null;SX.uses=0;SX.knock=now()+60;CUT.exterior(null);state=saved?'play':'opening';show('hud',true);document.body.classList.toggle('opening',!saved);$('hHint').hidden=!!saved;hints=0;$('veil').classList.add('clear');lastTrack=-1;}
/* the opening (§44) runs on the script until she wakes; any key skips to that moment */
const OPEN=(window.DS_GAME&&DS_GAME.opening)||{black:[5,6.4]};let skip=false,extT0=0,extDur=0,playFrom=0,wasBlack=false;
function openingTick(t){if(state!=='opening')return;const from=SP.from;
  if(skip&&t<from-.8){skip=false;startBand(from-.6);$('veil').classList.remove('clear');setTimeout(()=>$('veil').classList.add('clear'),250);return;}
  const black=t>=OPEN.black[0]&&t<OPEN.black[1];$('veil').classList.toggle('clear',!black);
  if(black!==wasBlack){wasBlack=black;if(musicBus&&actx){if(black){musicBus.gain.setTargetAtTime(0,actx.currentTime,.04);if(AMB)AMB.duck(.05,.1);}else{musicBus.gain.setTargetAtTime(.35,actx.currentTime,2.5);if(AMB)AMB.duck(.6,3);setTimeout(()=>{if(musicBus&&state!=='title')musicBus.gain.setTargetAtTime(1,actx.currentTime,4);if(AMB)AMB.duck(1,4);},9000);}}} /* a hard audio drop into the black; the dead ship comes back quiet */
  if(t>=from){state='play';document.body.classList.remove('opening');show('hud',true);$('hHint').hidden=false;setTimeout(()=>{$('hHint').hidden=true;},14000);$('veil').classList.add('clear');if(events)events.reset(events.seed);}}
function fadeExterior(ms){extT0=performance.now();extDur=ms;}
function tickExterior(){if(!extT0)return;const u=(performance.now()-extT0)/extDur;if(u>=1){extT0=0;CUT.exterior(null);return;}CUT.exterior(1-u*u*(3-2*u));}
/* ---------- the ship's sound (§39–40): each room its own bed, and a small vocabulary of things she touches ---------- */
const ROOM_MIX={bridge:{engine:.35,ventilation:.4,machinery:.08,radio:.25,signal:.15,hull:.12},sensor:{engine:.3,ventilation:.35,machinery:.1,radio:.45,signal:.3,hull:.1},comms:{engine:.3,ventilation:.35,machinery:.1,radio:.45,signal:.3,hull:.1},
  'crew-quarters':{engine:.25,ventilation:.3,machinery:.03,radio:.03,signal:.03,hull:.15},'central-shaft':{engine:.5,ventilation:.5,machinery:.3,radio:.05,signal:.05,hull:.35},'upper-access':{engine:.45,ventilation:.5,machinery:.25,radio:.05,signal:.05,hull:.3},'lower-access':{engine:.5,ventilation:.45,machinery:.3,radio:.05,signal:.05,hull:.35},
  engineering:{engine:.85,ventilation:.3,machinery:.7,radio:.05,signal:.05,hull:.3},service:{engine:.45,ventilation:.2,machinery:.25,radio:.12,signal:.2,hull:.6},airlock:{engine:.4,ventilation:.7,machinery:.4,radio:.1,signal:.05,hull:.3},eva:{engine:.05,ventilation:0,machinery:0,radio:.35,signal:.3,hull:.05}};
const SX={room:null,climb:0,walk:0,doors:null,uses:0,knock:0,was:null,wi:-1,k9i:-1};const CONTACTS={deadscout:[0,4],crew:[0,4],k9:[0,1]}; /* her walk is the commander's eight frames now */
function roomMix(room){const m=Object.assign({},AMB?AMB.MIX0:{},ROOM_MIX[room]||{});m.music=prefs.mix.music!=null?prefs.mix.music:.65;return m;}
function sfx(name,x,gain){if(!SFX||!prefs.sound)return;const V=vw(now()),pan=x==null?0:((x-(V[0]+V[2]/2))/(V[2]/2))*.8;SFX.play(name,{pan,gain});}
let DT=null;function driftTone(v,x){if(!actx||!master)return;if(!DT){const o=actx.createOscillator(),o2=actx.createOscillator(),lp=actx.createBiquadFilter(),g=actx.createGain(),pn=actx.createStereoPanner();
    o.type='sine';o.frequency.value=78;o2.type='triangle';o2.frequency.value=156.6;lp.type='lowpass';lp.frequency.value=520;g.gain.value=0;o.connect(lp);o2.connect(lp);lp.connect(g);g.connect(pn);pn.connect(master);o.start();o2.start();DT={o,o2,lp,g,pn};}
  const T=actx.currentTime,on=prefs.sound&&(state==='play'||state==='opening'||state==='route'||state==='deck');DT.g.gain.setTargetAtTime(on?v*.032:0,T,v>0?.12:.22);DT.o.frequency.setTargetAtTime(74+v*10,T,.3);DT.o2.frequency.setTargetAtTime(148+v*21,T,.3);DT.lp.frequency.setTargetAtTime(380+v*420,T,.3);
  try{const V=vw(now());DT.pn.pan.setTargetAtTime(Math.max(-.7,Math.min(.7,((x-(V[0]+V[2]/2))/(V[2]/2))*.6)),T,.2);}catch(e){}}
function sfxTick(t){if(!SFX||!actx||state!=='play'&&state!=='opening'&&state!=='route'&&state!=='deck')return;const s=CUT.actorAt(P,TIMES,t,me),room=CUT.roomAt(P,TIMES,t,me);
  if(room!==SX.room){SX.room=room;if(AMB)AMB.set(roomMix(room),2.5);}
  /* footsteps come from the gait's contact frames, not a timer; the floor picks the sound */
  const kd=CUT.actorAt(P,TIMES,t,'k9');if(kd.walk&&Math.abs(kd.x-s.x)<1400){const g=CUT.gait(P,TIMES,t,'k9');if(g&&g.i!==SX.k9i&&CONTACTS.k9.includes(g.i))sfx('k9step',kd.x,g.fast?.42:.3);SX.k9i=g?g.i:-1;}else SX.k9i=-1;
  if(me==='deadscout'&&DRV>=.85){driftTone(s.walk?Math.min(1,(s.v||60)/90):s.climb?.7:0,s.x);SX.was=s.walk?'walk':s.climb?'climb':'still';SX.wi=-1;} /* r39: once she drifts: a low soft tone that follows her speed, no footsteps, no rungs */
  else if(s.climb){if(t-SX.climb>.42){SX.climb=t;sfx('clank',s.x,.5);}SX.was='climb';}else{if(SX.was==='climb')sfx('boot',s.x,.6);
    if(s.walk){const g=CUT.gait(P,TIMES,t,me);if(g&&g.i!==SX.wi&&CONTACTS[me==='deadscout'?'deadscout':'crew'].includes(g.i)){const surf=room==='service'?'grate':room==='eva'?'eva':'deck';sfx(surf==='grate'?'grate':'boot',s.x,(surf==='eva'?.06:s.sneak?.07:.14)*(me==='deadscout'?1-DRV*.85:1));}SX.wi=g?g.i:-1;}else SX.wi=-1;SX.was=s.walk?'walk':'still';}
  const D=CUT.doorStates(P,TIMES,t);if(SX.doors){for(const k in D){if(D[k]===SX.doors[k])continue;const d=CUT.MAP.doors[k];if(!d||d.wall)continue;const big=!!d.big;
    if(D[k]==='open'){sfx(big?'release':'motor',d.x,1);setTimeout(()=>sfx(big?'thud':'thud',d.x,big?.9:.5),big?500:900);}else if(SX.doors[k]==='open'){sfx(big?'seal':'motor',d.x,.9);}}}SX.doors=D;
  const U=CUT.uses(P,TIMES).filter(u=>u.at<=t);if(U.length!==SX.uses){for(const u of U.slice(SX.uses)){const O=CUT.MAP.objects[u.id];if(u.locked){sfx('latch',s.x,.8);continue;}
      if(!O){sfx('latch',s.x,.8);continue;}if(O.screen){sfx('keys',s.x,.8);setTimeout(()=>sfx('crt',s.x,.9),700);}else if(/breaker|bypass|coolant/.test(u.id))sfx('breaker',s.x,1);else if(/valve/.test(u.id))sfx('valve',s.x,1);else if(/locker|photo|patch|log|trace|look/.test(u.id))sfx('latch',s.x,.7);else sfx('click',s.x,.9);}SX.uses=U.length;}
  if(t>SX.knock){SX.knock=t+40+Math.random()*90;if(CUT.report(P,TIMES,t).era==='present')sfx('knock',s.x+(Math.random()<.5?-900:900),.5);}}
/* ---------- POWER ROUTING: the engineering terminal's page. Two (later three) systems at once; each switch is a beat on the ship ---------- */
function paintRoute(){const used=PW.used();$('rMenu').innerHTML=PW.SYS.map(k=>`<button type="button" data-s="${k}"><span>${PW.NAME[k]}</span><b class="${PW.on[k]?'on':''}">${PW.on[k]?'ONLINE':'OFF'}</b></button>`).join('')+'<button type="button" data-s="close">CLOSE</button>';
  $('routeBudget').textContent='POWER '+used+' / '+PW.budget+(used>=PW.budget?' · AT CAPACITY':'');}
$('rMenu').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;const k=b.dataset.s;if(k==='close'){closeRoute();return;}
  const was=sel,ok=PW.set(k,!PW.on[k],runLines);if(!ok)note('NOT ENOUGH POWER · SWITCH SOMETHING OFF',4);else{note(PW.NAME[k]+(PW.on[k]?' · ONLINE':' · OFF'),4);if(story)story.flags['routed_'+k]=PW.on[k];}paintRoute();sel=was;paintSel('rMenu');save();});
function closeRoute(){state='play';show('route',false);show('deck',false);show('chart',false);show('hud',true);}
/* ---------- NAV CHART (§drift, the optional thing): a star chart nobody needs. Pan it. HALCYON is the dot that does not move ---------- */
const CH={px:0,py:0,stars:null};
function paintChart(){const c=$('chartC'),x=c.getContext('2d'),W=c.width,H=c.height,l=story?DRIFT.level(story.flags,playT):0;if(!CH.stars){CH.stars=[];for(let i=0;i<420;i++)CH.stars.push([PX.hash(i,11)*2400-1200,PX.hash(i,12)*1400-700,PX.hash(i,13)]);}
  x.fillStyle='#06060a';x.fillRect(0,0,W,H);x.fillStyle='rgba(47,138,124,.18)';for(let gx=((-CH.px)%48+48)%48;gx<W;gx+=48)x.fillRect(gx,0,1,H);for(let gy=((-CH.py)%48+48)%48;gy<H;gy+=48)x.fillRect(0,gy,W,1);
  for(const [sx,sy,b] of CH.stars){const X=Math.round(W/2+sx-CH.px),Y=Math.round(H/2+sy-CH.py);if(X<0||Y<0||X>=W||Y>=H)continue;x.fillStyle=b>.85?'#e6e0cc':b>.5?'#8c8f96':'#4c4a56';x.fillRect(X,Y,b>.9?2:1,b>.9?2:1);}
  const T=(s,X,Y,col)=>{x.fillStyle=col||'#78d8b8';x.font='10px Silk';x.fillText(s,X,Y);};
  const mark=(sx,sy,name,col)=>{const X=Math.round(W/2+sx-CH.px),Y=Math.round(H/2+sy-CH.py);x.fillStyle=col;x.fillRect(X-3,Y,7,1);x.fillRect(X,Y-3,1,7);T(name,X+6,Y-4,col);};
  mark(-520,300,'SOL · 167 AU','#e8a33a');mark(640,-220,'PROXIMA','#8c8f96');mark(-300,-410,'BARNARD','#8c8f96');mark(880,330,'WOLF 359','#8c8f96');mark(260,520,'LALANDE','#8c8f96');
  const on=Math.floor(performance.now()/500)%2;mark(0,0,on?'DSV HALCYON · HOLDING':'DSV HALCYON','#78d8b8');if(l>=2&&on)mark(0,0,'CONTACT · 0.0 AU · UNLISTED','#ff8a5c');
  T('HEADING HELD · 41 DAYS · NO COURSE CHANGE ORDERED',8,H-8,'#4c4a56');T('← → ↑ ↓ PAN · ESC CLOSE',W-150,H-8,'#4c4a56');if(state==='chart')setTimeout(()=>{if(state==='chart')paintChart();},500);}
/* ---------- HALCYON AUDIO DECK (§33 E): the crew's own tape console, in their quarters. Old console, six tapes, one playing ---------- */
function paintDeck(){const l=story?DRIFT.level(story.flags,playT):0;$('kMenu').innerHTML=TAPES.map((T,i)=>`<button type="button" data-t="${i}"><span>${String(i+1).padStart(2,'0')} · ${T[0]}</span><b class="${(prefs.tape||0)===i?'on':''}">${(prefs.tape||0)===i?'PLAYING':'    '}</b></button>`).join('')+(l>=2?'<button type="button" data-t="x"><span>'+String(TAPES.length+1).padStart(2,'0')+' · (NO LABEL) · 2291</span><b></b></button>':'')+'<button type="button" data-t="close">CLOSE</button>';}
$('kMenu').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;const k=b.dataset.t;if(k==='close'){closeRoute();return;}const was=sel;if(k==='x'){sfx('latch',null,.8);note('TAPE '+String(TAPES.length+1).padStart(2,'0')+' · SPOOL EMPTY · LABEL IN HER HAND',6);if(story)story.flags.tape7=true;sel=was;paintSel('kMenu');return;}setTape(+k,true);sfx('click',null,.8);note('AUDIO DECK · '+TAPES[+k][0],4);if(story)story.flags.tape_changed=true;paintDeck();sel=was;paintSel('kMenu');save();});
/* ---------- K9-4's senses and legs: the same commands she uses, pushed by its controller ---------- */
function k9Api(){const pushCmd=c=>{if(watch||(state!=='play'&&state!=='route'&&state!=='deck'&&state!=='chart'&&state!=='console'))return;c.at=now();SP.cmds.push(c);SP.rev=(SP.rev||0)+1;};
  return {map:()=>CUT.MAP,on:()=>state==='play'&&!watch&&story&&story.flags.awakened,pos:a=>CUT.actorAt(P,TIMES,now(),a),view:()=>vw(now()),ss:()=>CUT.SS,tuning:()=>!!SCAN.tuning,
    nearestSource:(x,y)=>{const R=SCAN.read(x,y);return R.src?{id:R.src.id,s:R.s,x:R.src.x,y:R.src.y}:null;},
    act:(a,anim,secs,face)=>pushCmd({actor:a,do:anim,for:secs,face}),move:(a,ref,fast)=>pushCmd({move:a,to:ref,interrupt:true,fast:!!fast}),stop:a=>pushCmd({move:a,to:CUT.hereRef(P,TIMES,now(),a),interrupt:true}),
    teleport:(a,ref)=>pushCmd({move:a,to:ref,teleport:true,interrupt:true}),placeNear:(x,y)=>{const h=CUT.pick(P,TIMES,now(),x,y-4);return h&&h.type==='place'?h.ref:null;},place:ref=>CUT.place(ref),
    offscreenOn:(deck,V)=>{const M=CUT.MAP,[a,b]=M.k9.decks[deck];for(const [n,[x,y]] of Object.entries(M.nodes)){if(y<a||y>=b)continue;if(x<V[0]-60||x>V[0]+V[2]+60){const h=CUT.pick(P,TIMES,now(),x,y-4);if(h&&h.type==='place')return h.ref;}}return null;},
    hint:()=>hintRef,idleFor:()=>now()-lastProgress,later,sfx:(n,x,gn)=>sfx(n,x,gn),room:a=>CUT.roomAt(P,TIMES,now(),a),drift:()=>story?DRIFT.level(story.flags,playT):0};}
/* standing still, she is still someone: every so often a glance at K9, or over her shoulder, then back */
let glanceT=0;function idleGlance(t){if(watch||SCAN.dial||SCAN.tuning||Object.values(keys).some(v=>v))return;const s=CUT.actorAt(P,TIMES,t,me);if(s.walk||s.climb||s.lift||s.act||t-glanceT<7+((t*7)%9))return;glanceT=t;
  const k=CUT.actorAt(P,TIMES,t,'k9'),near=Math.abs(k.x-s.x)<520&&Math.abs(k.y-s.y)<60,face=near?(k.x<s.x?'left':'right'):(s.face==='left'?'right':'left');if(face===s.face&&near)return;cmd({actor:me,do:'idle',for:1.2+Math.random()*.8,face});}
/* ---------- what the ship does by itself (game/events.js) reads and pushes through the same hands ---------- */
function eventsApi(){const pushCmd=c=>{c.at=now();SP.cmds.push(c);SP.rev=(SP.rev||0)+1;};
  return {now:()=>now(),playing:()=>state==='play'&&!watch,tuning:()=>!!SCAN.tuning,flags:()=>story?story.flags:{},map:()=>CUT.MAP,doors:()=>CUT.doorStates(P,TIMES,now()),roomsOf:k=>{const d=CUT.MAP.doors[k];return [CUT.roomOf(d.x-40,d.y-20),CUT.roomOf(d.x+40,d.y-20)];},
    run:runLines,say,note,sfxAt:(n,x,g)=>sfx(n,x,g),k9:()=>k9,pos:a=>CUT.actorAt(P,TIMES,now(),a||me),room:()=>CUT.roomAt(P,TIMES,now(),me),roomOf:a=>CUT.roomAt(P,TIMES,now(),a),roomState:r=>CUT.roomStates(P,TIMES,now())[r],
    screen:id=>CUT.screenModeAt(P,TIMES,now(),id),scan:()=>SCAN,era:()=>CUT.report(P,TIMES,now()).era,at:ref=>CUT.place(ref)||{x:0,y:0},act:(a,anim,secs,face)=>pushCmd({actor:a,do:anim,for:secs,face}),drift:()=>story?DRIFT.level(story.flags,playT):0};}
/* ---------- what the story can do: read the ship, push beats, speak through the HUD ---------- */
const notes=[];
async function chapterCard(kicker,title){if(state!=='play')return;$('veil').classList.remove('clear');await wait(700);show('cards',true);$('cards').innerHTML='<p class="chapter disc"><span>'+kicker+'</span>'+title+'</p>';sfx('crt',null,.5);await wait(2200);show('cards',false);$('veil').classList.add('clear');}
function note(text,secs){notes.push({text,until:now()+(secs||6)});paintNotes();}
/* the signal monitor (Nov 2026): on screen only while it means something: the dial is open, a source is close, the reading
   just changed, or she just pressed Q. Otherwise it fades away and the picture is the ship. */
let scanUntil=0,scanLastState=null,scanA=0,scanFirst=true;
function scanVisible(t,R){if(scanFirst){scanFirst=false;scanUntil=t+6;}if(R.state!==scanLastState){scanLastState=R.state;scanUntil=Math.max(scanUntil,t+4);}
  const want=SCAN.dial||t<scanUntil;scanA=Math.max(0,Math.min(1,scanA+(want?.08:-.04)));return scanA>.01;}
let lastNote='';/* ---------- the ship's computer and the crew's logs (game/console.js) ---------- */
function conPrint(lines){const o=$('conOut');for(const l of lines){const d=document.createElement('div');d.textContent=l||' ';o.appendChild(d);}while(o.childElementCount>60)o.firstChild.remove();o.scrollTop=o.scrollHeight;}
function conRun(v){if(!window.SHIPCON)return;conQ.push('> '+v.toUpperCase());if(!conBusy)conStep();const r=SHIPCON.run(v,{found:()=>prefs.logs||[],now,scan:()=>{if(!SCAN.found)return null;const p=CUT.actorAt(P,TIMES,now(),me);return SCAN.read(p.x,p.y);},
  doors:()=>Object.entries(CUT.doorStates(P,TIMES,now())).filter(([d])=>d!=='maint-hatch'),power:()=>PW.SYS.map(k=>(PW.NAME[k]+' ').padEnd(22,'.')+' '+(PW.on[k]?'ONLINE':'OFFLINE'))});
  if(r[0]===false){enter('play');return;}if(r[0]===null){conQ.length=0;setTimeout(()=>{$('conOut').innerHTML='';},60);return;}sfx('keys',null,.5);conQ.push(...r,'');if(!conBusy)conStep();}
let conQ=[],conBusy=false;function conStep(){if(!conQ.length){conBusy=false;return;}conBusy=true;conPrint([conQ.shift()]);setTimeout(conStep,40);}
/* ---------- K9 (Nov 2026): click it and it chirps back; during a long focus session it goes and curls up by the bunk ---------- */
let petT=0;
function petK9(e){if(state!=='play'&&state!=='watch')return false;const t=now(),k=CUT.actorAt(P,TIMES,t,'k9');if(!k)return false;const rep=CUT.report(P,TIMES,t).k9;if(!rep||rep==='GONE')return false;
  const r=stage.getBoundingClientRect(),V=vw(t),sx=r.left+(k.x-V[0])/V[2]*r.width,sy=r.top+(k.y-V[1])/V[3]*r.height,s=r.width/V[2]*CUT.W/1184/2;
  if(Math.abs(e.clientX-sx)>Math.max(18,34*s)||e.clientY>sy+6||e.clientY<sy-Math.max(26,46*s))return false;
  if(performance.now()-petT<700)return true;petT=performance.now();sfx('chirp',null,1.6);
  const m=document.createElement('span');m.className='k9mark';m.textContent=Math.random()<.5?'♪':'!';const tr=$('talk').getBoundingClientRect();m.style.left=(sx-tr.left)+'px';m.style.top=(sy-tr.top-Math.max(30,52*s))+'px';$('talk').appendChild(m);setTimeout(()=>m.remove(),1400);return true;}
function k9Rest(t,on){if(!watch)return;if(on){/* r31: to the bunk by K9's own routes; from the upper deck it can't, so it curls up where it is */const r=window.K9NAV?K9NAV.go('crew-quarters.bunk',{fast:true,force:true}):null;const b=CUT.parse('00:00 k9 off for 3600s').beats[0];if(b){b.at=t+(r?r.secs+2:1.5);P.script.push(b);P.rev++;}}
  else{const b=CUT.parse('00:00 k9 power-up for 3s').beats[0];if(b){b.at=t;P.script.push(b);}}P.rev++;}
function findLog(id){if(!window.SHIPCON||watch)return;const L=SHIPCON.logFor(id);if(!L)return;prefs.logs=prefs.logs||[];const fresh=!prefs.logs.includes(L.id);if(fresh){prefs.logs.push(L.id);savePrefs();}
  setTimeout(()=>say('LOG · '+L.who,L.text,Math.min(12,4+L.text.length*.045),{panel:true}),900);if(fresh)setTimeout(()=>note('LOG RECOVERED · '+prefs.logs.length+' / '+SHIPCON.LOGS.length+' · REGISTRY',6),1200);}
function paintLogbook(){const el=$('logbook');if(!el||!window.SHIPCON)return;const f=prefs.logs||[];
  el.innerHTML=(prefs.best?'<p class="lb-h">BEST TRANSMISSION · '+prefs.best+' / 14 FOUND</p>':'')+'<p class="lb-h">CREW LOGS · '+f.length+' / '+SHIPCON.LOGS.length+' RECOVERED</p>'+ /* the score the end card keeps was never shown anywhere */SHIPCON.LOGS.map((l,i)=>f.includes(l.id)?'<details><summary>'+String(i+1).padStart(2,'0')+' · '+l.who+' · '+l.title+'</summary><p>'+l.text.replace(/</g,'&lt;')+'</p></details>':'<p class="lb-x">'+String(i+1).padStart(2,'0')+' · NOT RECOVERED</p>').join('');}
function paintNotes(){const t=now();while(notes.length&&notes[0].until<t)notes.shift();const n=notes[notes.length-1];$('hNote').textContent=n?n.text:'';$('hNote').hidden=!n;if(n)lastNote=n.text;
  const st=$('tStrip');if(n&&!sayT&&state==='play'){if(st.dataset.note!==n.text){st.dataset.note=n.text;st.className='strip cyan';st.textContent=n.text;st.hidden=false;}}else if(st.dataset.note&&!sayT){st.dataset.note='';st.hidden=true;}}
function runLines(lines){const t=now();for(const L of lines){const m=/^\+?([\d.]+)\s+(.*)$/.exec(L.trim());if(!m)continue;const tp=/^teleport (\w+) to (\S+)$/.exec(m[2]);if(tp){SP.cmds.push({at:t+(+m[1]),move:tp[1],to:tp[2],teleport:true,interrupt:true});SP.rev=(SP.rev||0)+1;continue;}const r=CUT.parse('00:00 '+m[2]);if(!r.beats.length){console.warn('story beat',L,r.errs);continue;}const b=r.beats[0];b.at=t+(+m[1]);if(b.camera==='follow'&&!watch&&prefs.camera!=='follow')b.camera='cutaway';if(watch){P.script.push(b);P.rev++;}else if(b.camera){SP.cams.push({at:b.at,mode:b.camera,actor:b.actor,room:b.room,rect:b.rect});SP.rev=(SP.rev||0)+1;}else{SP.cmds.push(b);SP.rev=(SP.rev||0)+1;}}}
function storyApi(){let usedIds=null;const uses=()=>{if(!usedIds){usedIds=CUT.uses(P,TIMES).filter(u=>u.at<=now());}return usedIds;};
  return {now:()=>now(),run:runLines,note,say,sayClear,hint:ref=>{hintRef=ref;},k9:()=>k9,opening:()=>state==='opening',card:async lines=>{show('cards',true);for(const l of lines){const p=document.createElement('p');p.textContent=l;$('cards').innerHTML='';$('cards').appendChild(p);await wait(4200);}show('cards',false);},
    room:()=>CUT.roomAt(P,TIMES,now(),me),at:ref=>CUT.place(ref)||{x:0,y:0},pos:()=>CUT.actorAt(P,TIMES,now(),me),playing:()=>state==='play',lit:()=>lit,
    used:id=>uses().some(u=>u.id===id&&!u.locked),usedAt:id=>{let m=-1;for(const u of uses())if(u.id===id&&!u.locked&&u.at>m)m=u.at;return m;},usedDoor:id=>uses().some(u=>u.id===id&&u.locked&&now()-u.at<1.2),screen:id=>CUT.screenModeAt(P,TIMES,now(),id),
    read:()=>{const p=CUT.actorAt(P,TIMES,now(),me);return SCAN.read(p.x,p.y);},tuneRequested:()=>tuneReq,consume:()=>{tuneReq=false;usedIds=null;},
    progress:()=>{lastProgress=now();},enable:id=>{disabled=disabled.filter(x=>x!==id);},count:(id,n)=>{SP.cmds.push({at:now(),object:id,count:n});SP.rev=(SP.rev||0)+1;},disable:id=>{if(!disabled.includes(id))disabled.push(id);},checkpoint:name=>{CHK=name;save();if(name!=='AWAKENING')chapterCard('DISCOVERY',name);},
    music:(kind,secs)=>{try{if(!band)return;if(kind==='memory'){const b=band;b.hero('comms',{kind:'static'});b.setState('busy',4);setTimeout(()=>{if(band===b)b.setState('abandoned',6);},(secs||18)*1000);}
      else if(kind==='drop'){musicBus.gain.setTargetAtTime(.12,actx.currentTime,2.5);if(AMB)AMB.duck(.7,4);band.setState('abandoned',6);} else if(kind==='return'){musicBus.gain.setTargetAtTime(Math.pow(prefs.mix.music!=null?prefs.mix.music:1,1.4),actx.currentTime,3);if(AMB)AMB.duck(1,6);}}catch(e){}},
    route:()=>{if(state==='play')enter('route');},deck:()=>{if(state==='play')enter('deck');},console:()=>{if(state==='play')enter('console');},chart:()=>{if(state==='play')enter('chart');},playT:()=>playT,drifted:l=>{CUT.drift(l);},power:PW,finish:()=>{if(state==='play')end();},light:v=>{lightForced=!!v;CUT.light(lit||lightForced);},sfx:(n,gn)=>sfx(n,null,gn)};}
function resume(){if(state!=='pause')return;const t=held;held=null;['pause','controls'].forEach(id=>show(id,false));startBand(t);state='play';}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function save(){if(!SP.on||watch||state==='opening')return;try{const o=CUT.snapshot(P,TIMES,now(),me);for(const r in o.rooms)if(o.rooms[r]==='memory'||o.rooms[r]==='blackout')o.rooms[r]='low-power'; /* a memory or a lighting fault in progress ends with the session; its stage replays from the save (r22 pinned the room) */o.story=story?story.state():null;o.events=events?events.state():null;o.checkpoint=CHK;o.playT=playT;o.second=second;localStorage.setItem(SAVE,JSON.stringify(o));}catch(e){}}
function load(){try{const s=JSON.parse(localStorage.getItem(SAVE)||'null');return s&&s.ref?s:null;}catch(e){return null;}}
async function end(){state='end';for(const d in keys)keys[d]=false;sayClear();$('veil').classList.remove('clear');await wait(1800);stopBand();if(AMB)AMB.stop();
  const F=story?story.flags:{},mem=['first_memory_seen','eng_memory_seen','signal_layer_seen','past_deadscout_seen','signal_arrives_seen','final_eva_seen','k9_memory_seen','last_walk_seen','signal_source_known'].filter(k=>F[k]).length,disc=['found_photo','found_nav','found_patch','found_trace','found_eva'].filter(k=>F[k]).length;
  const first=!prefs.second;prefs.second=true;prefs.best=Math.max(prefs.best||0,mem+disc);savePrefs();
  show('cards',true);for(const [l,ms,cls] of [['DRIFTNAUT',3200,'year'],['TRANSMISSION COMPLETE',3000,''],[hhmm(playT),3000,'alt'],['MEMORIES FOUND   '+mem+' / 9',3200,''],['DISCOVERIES   '+disc+' / 5',3200,''],[first?'SECOND TRANSMISSION UNLOCKED':'THE SIGNAL REPEATS',3600,'alt']]){$('cards').innerHTML='';const p=document.createElement('p');p.textContent=l;p.className=cls;p.style.animationDuration=(ms/1000)+'s';$('cards').appendChild(p);await wait(ms-150);}
  show('cards',false);try{localStorage.removeItem(SAVE);}catch(e){}if(recording)await toggleRecord();enter('title');$('veil').classList.add('clear');}
/* a watch ends the way a night does: four minutes of settling, the music away, the ship dark, then the title */
async function endOfWatch(){state='end';const endless=watch.cfg.duration_minutes>=300;$('veil').classList.remove('clear');await wait(endless?1200:3000);
  if(endless){const cfg=Object.assign({},watch.cfg,{seed:watch.seed+1});watch=null;loadWorld(NW.manifest(cfg));watch={cfg,man:null,seed:cfg.seed};startBand(0);state='watch';$('veil').classList.add('clear');return;}
  if(recording)await toggleRecord();enter('title');$('veil').classList.add('clear');}
/* ---------- recording a take ---------- */
async function toggleRecord(o){o=o||{};if(recording){const R=recording;recording=null;fit();let blob=null;try{blob=await R.stop();}catch(e){}$('hRec').hidden=true;$('tRec').hidden=true;paintMenus();
    if(blob&&blob.size){const u=URL.createObjectURL(blob),a=$('takeLink');a.href=u;a.download='driftnaut-take.'+(R.ext||'webm');a.textContent='⤓ SAVE THE TAKE · '+LR.fmtBytes(blob.size);a.hidden=false;}return;}
  if(!LR||(!window.VideoEncoder&&!(stage.captureStream&&window.MediaRecorder))){$('mRecord').textContent='THIS BROWSER CAN\'T RECORD';return;}
  ensureAudio();LCV.setSize(1920,1080); /* the take records 1080p; the display keeps its size in the housing */
  try{const vbr=o.vbr||8e6;recording=await LR.record({canvas:stage,ctx:actx,source:master,fps:30,vbr,expectBytes:(vbr+192000)/8*Math.min(TOTAL-now(),o.secs||1e9)*1.02});recording.long=!!o.vbr;}catch(e){recording=null;fit();$('mRecord').textContent='THE RECORDING DIDN\'T START';return;}
  recording.t0=now();recording.start();$('takeLink').hidden=true;$('hRec').hidden=false;$('tRec').hidden=false;paintMenus();resume();}
/* ---------- SHOW WORLD MAP: a developer overlay (index.html?dev, then V) for mapping the master art ---------- */
const DEV=/[?&]dev/.test(location.search);let showMap=false;
function drawMap(t,c0,V0){const M=CUT.MAP;if(!M)return;const c=c0||stage.getContext('2d'),V=V0||vw(t),k=c.canvas.width/V[2];c.save();c.setTransform(k,0,0,k,-V[0]*k,-V[1]*k);c.lineWidth=2/k;c.font=(14/k)+'px monospace';c.textBaseline='top';
  for(const [id,r] of Object.entries(M.rooms)){c.strokeStyle='rgba(255,0,255,.8)';c.beginPath();r.poly.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.stroke();c.fillStyle='rgba(255,0,255,.9)';c.fillText(id,r.poly[0][0]+4,r.poly[0][1]+4);}
  c.strokeStyle='rgba(0,255,120,.9)';for(const [a,b] of M.walk){c.beginPath();c.moveTo(...M.nodes[a]);c.lineTo(...M.nodes[b]);c.stroke();}
  c.strokeStyle='rgba(255,220,0,.9)';for(const [a,b] of M.ladders.concat(M.hoist||[])){c.beginPath();c.moveTo(...M.nodes[a]);c.lineTo(...M.nodes[b]);c.stroke();}
  for(const [n,[X,Y]] of Object.entries(M.nodes)){c.fillStyle='#0f0';c.fillRect(X-3/k,Y-3/k,6/k,6/k);c.fillStyle='rgba(0,255,120,.9)';c.fillText(n,X+4/k,Y+2/k);}
  c.strokeStyle='rgba(0,200,255,.9)';for(const [id,r] of Object.entries(M.screens)){c.strokeRect(r[0],r[1],r[2]-r[0],r[3]-r[1]);c.fillStyle='rgba(0,200,255,.9)';c.fillText(id,r[0],r[1]-16/k);}
  for(const [id,D] of Object.entries(M.doors)){c.strokeStyle='rgba(255,120,0,.9)';if(D.wall)c.strokeRect(D.wall[0],D.wall[1],D.wall[2]-D.wall[0],D.wall[3]-D.wall[1]);else{c.beginPath();c.moveTo(D.x,D.y);c.lineTo(D.x,D.y-D.h);c.stroke();}c.fillStyle='rgba(255,120,0,.9)';c.fillText(id,D.x+3/k,(D.wall?D.wall[1]:D.y-D.h)-16/k);}
  for(const L of M.lamps){c.strokeStyle='rgba(255,255,255,.8)';c.beginPath();c.arc(L.x,L.y,8/k,0,Math.PI*2);c.stroke();}
  for(const f of M.front||[]){c.strokeStyle='rgba(255,255,0,.6)';c.setLineDash([6/k,4/k]);c.strokeRect(f.rect[0],f.rect[1],f.rect[2]-f.rect[0],f.rect[3]-f.rect[1]);c.setLineDash([]);}
  c.restore();}
/* ---------- a controller (§12): d-pad / stick move, A interact, B TUNE, X flashlight, Y camera, START schematic. Same handlers as the keys ---------- */
const PAD={prev:{}};
function pollPad(){const gps=navigator.getGamepads?navigator.getGamepads():null;if(!gps)return;let gp=null;for(const g of gps)if(g){gp=g;break;}if(!gp)return;
  const B=i=>!!(gp.buttons[i]&&gp.buttons[i].pressed),ax=gp.axes[0]||0,ay=gp.axes[1]||0,inPlay=state==='play'||state==='watch';
  if(SCAN.dial){if(B(14)||ax<-.4)SCAN.turn(-.006);if(B(15)||ax>.4)SCAN.turn(.006);}
  const map={ArrowLeft:B(14)||ax<-.5,ArrowRight:B(15)||ax>.5,ArrowUp:B(12)||ay<-.5,ArrowDown:B(13)||ay>.5,KeyE:B(0)&&inPlay,Enter:B(0)&&!inPlay,KeyQ:B(1),KeyF:B(2),Tab:B(3),Escape:B(9)};
  for(const [code,on] of Object.entries(map)){if(on&&!PAD.prev[code])document.dispatchEvent(new KeyboardEvent('keydown',{code}));else if(!on&&PAD.prev[code])document.dispatchEvent(new KeyboardEvent('keyup',{code}));PAD.prev[code]=on;}}
/* r33: the pixel layers over the picture (the day tint, the residents, the pokes) are drawn onto the picture itself while it
   is being recorded or floated, so a take on YouTube has what you saw; the page's own copies hide meanwhile (body.layered) */
function layersOnto(){const c=stage.getContext('2d');document.body.classList.add('layered');layeredT=performance.now();c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;
  const tn=document.querySelector('.daytint');if(tn&&getComputedStyle(tn).display!=='none'){c.globalCompositeOperation='multiply';c.fillStyle=getComputedStyle(tn).backgroundColor;c.fillRect(0,0,stage.width,stage.height);}
  c.globalCompositeOperation='source-over';c.imageSmoothingEnabled=false;for(const L of (window.__layers||[]))if(L.width&&L.style.display!=='none'){c.globalAlpha=L.style.opacity===''?1:+L.style.opacity;if(c.globalAlpha>0)c.drawImage(L,0,0,stage.width,stage.height);}c.globalAlpha=1;c.restore();}
let layeredT=0;setInterval(()=>{if(layeredT&&performance.now()-layeredT>500){layeredT=0;document.body.classList.remove('layered');}},500);
/* ---------- the loop ---------- */
let lastTrack=-1,hudN=0,saveN=0,playPn=0;
/* r39: how far she has drifted from walking: nothing at first, a little once the ship starts counting wrong, all the way
   after the camera that can't see her (drift.js level 0 / 1 / 2). It eases over about half a minute, so nobody sees it change */
let DRV=0,drvT=0;function driftTick(){const pn=performance.now(),dt=Math.min(1,(pn-(drvT||pn))/1000);drvT=pn;
  const tgt=watch||(story&&story.flags&&story.flags.second)?1:story?[0,.35,1][Math.min(2,DRIFT.level(story.flags,playT))]:0;DRV+=(tgt-DRV)*Math.min(1,dt/12);if(Math.abs(tgt-DRV)<.002)DRV=tgt;if(CUT.float)CUT.float(DRV);}
/* r55 · THE PHONE CAMERA. Tablets and computers keep the whole ship. On a phone the camera glides, never cuts:
   GAME follows Driftnaut about 2x closer (pinch out or double-tap for the whole ship, and back);
   LISTEN on an upright phone pans slowly along the whole ship, bow to stern and back, about two minutes a pass */
let CAMV=null,camT=0;const CAM={wide:false,tip:false};window.__cam=CAM;
const vw=t=>CAMV||CUT.view(P,TIMES,t);
function camTarget(t){if(!document.body.classList.contains('phone')||!watch||BC||recording)return null;const W=CUT.W,H=CUT.H,por=document.body.classList.contains('portrait'),asp=stage.height/stage.width||9/16;
  if(state==='play'&&!CAM.wide){let s=null;try{s=CUT.actorAt(P,TIMES,t,me);}catch(e){}if(!s)return null;const w=W/(por?2.3:1.8),h=w*asp;
    return [Math.max(0,Math.min(W-w,s.x-w/2)),Math.max(0,Math.min(H-h,s.y-40-h/2)),w,h];}
  if(state==='watch'&&por){const w=W/1.7,h=w*asp,u=.5-.5*Math.cos(performance.now()/1000*2*Math.PI/240);return [(W-w)*u,Math.max(0,Math.min(H-h,H*.5-h/2)),w,h];}
  return null;}
function camTick(t){const pn=performance.now(),dt=Math.min(.1,(pn-(camT||pn))/1000);camT=pn;const tg=camTarget(t);
  if(!tg){if(!CAMV)return;const B=CUT.view(P,TIMES,t);CAMV=CAMV.map((v,i)=>v+(B[i]-v)*Math.min(1,dt*3));if(CAMV.every((v,i)=>Math.abs(v-B[i])<1))CAMV=null;return;}
  if(!CAMV)CAMV=CUT.view(P,TIMES,t).slice();const k=Math.min(1,dt*(state==='play'?3:1.2));CAMV=CAMV.map((v,i)=>v+(tg[i]-v)*k);
  if(state==='play'&&!CAM.tip&&!(prefs.camTip>1)){CAM.tip=true;prefs.camTip=(prefs.camTip||0)+1;savePrefs();setTimeout(()=>{if(state==='play')toast('PINCH OR DOUBLE-TAP TO SEE THE WHOLE SHIP',5);},7500);}}
/* pinch and double-tap */
{const pts=new Map();let d0=0,lastTap=0;
  stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2){const [a,b]=[...pts.values()];d0=Math.hypot(a[0]-b[0],a[1]-b[1]);}
    const pn=e.timeStamp;if(pts.size===1&&pn-lastTap<380&&state==='play'&&document.body.classList.contains('phone')){CAM.wide=!CAM.wide;lastTap=0;}else lastTap=pn;},true);
  stage.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2&&d0){const [a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);
    if(d<d0*.72){CAM.wide=true;d0=d;}else if(d>d0*1.35){CAM.wide=false;d0=d;}}},true);
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)d0=0;};stage.addEventListener('pointerup',up,true);stage.addEventListener('pointercancel',up,true);
  stage.style.touchAction='none';}
/* turn the phone: a one-time hint when GAME starts on an upright phone */
function rotateHint(){if(!document.body.classList.contains('phone')||!document.body.classList.contains('portrait')||prefs.rotTip)return;prefs.rotTip=1;savePrefs();setTimeout(()=>{if(state==='play'&&document.body.classList.contains('portrait'))toast('⟲ TURN YOUR PHONE SIDEWAYS FOR A BIGGER SHIP',5);},1200);}
function frame(){requestAnimationFrame(frame);driftTick();if(DT&&state!=='play'&&state!=='opening'&&state!=='route'&&state!=='deck')driftTone(0,0);pollPad();tickExterior();if(state==='opening')openingTick(now());const t=state==='title'||state==='registry'||(state==='controls'||state==='options')&&menuFrom==='title'||state==='setup'?(TIMES[1]?TIMES[1].start:0)+5+((performance.now()/1000-idle0)%24):now();
  if(state==='title'||state==='registry'||state==='setup'||(state==='controls'||state==='options')&&menuFrom==='title'){CUT.force('drift');LCV.render(t,{});CUT.force(null);if(DEV&&showMap)drawMap(t);return;}
  camTick(t);if(CAMV)CUT.force(CAMV);LCV.render(t,{});if(CAMV)CUT.force(null);if(DEV&&showMap)drawMap(t);
  if(story&&!watch&&(state==='play'||state==='opening'||state==='route'||state==='deck')){sfxTick(t);story.update();if(k9&&state==='play'){k9.update(t);if(events&&!resting)events.update(t);idleGlance(t);const r=CUT.roomAt(P,TIMES,t,me);if(r!==lastRoom){lastRoom=r;lastProgress=t;}}if(!(hudN%6))paintNotes();if(SCAN.found&&state==='play'){const p=CUT.actorAt(P,TIMES,t,me),k=Math.max(2,Math.round(stage.width/384)),R=SCAN.read(p.x,p.y);if(SCAN.tick(t,R)==='lock'){tuneReq=true;ping();}scanSound(R);if(scanVisible(t,R)){const c2=stage.getContext('2d');c2.save();c2.globalAlpha=scanA;SCAN.draw(c2,t,R,k,1);c2.restore();}}else scanSound(null);}else{tuneReq=false;scanSound(null);}
  if(recording&&(state==='play'||state==='watch')){layersOnto();recording.frame(Math.max(0,t-recording.t0));}
  else if(document.pictureInPictureElement&&watch)layersOnto();
  if(watch&&(state==='watch'||state==='play'||state==='photo')){focusTick(t);sleepTick(t);{const pn=performance.now();if(wsT&&pn-wsT<2000)prefs.watchSecs=(prefs.watchSecs||0)+(pn-wsT)/1000;wsT=pn;if(!(hudN%1800))savePrefs();}}
  if(watch&&(state==='watch'||state==='play')){if(!(hudN%30)){paintFocus(t);$('wTime').textContent=watch.cfg.duration_minutes>=300?'':hhmm(Math.max(0,TOTAL-t));$('wTrack').textContent='♪ '+((window.DEEP&&DEEP.TAPES[DEEP.tapeOf(watch.tape||curTapeId())])||{name:''}).name; /* r53: one source of truth: the station's track */}
    if(!endingSoon&&watch.cfg.duration_minutes<300&&t>TOTAL-240){endingSoon=true;musicBus.gain.setTargetAtTime(0,actx.currentTime,70);if(AMB)AMB.duck(.6,200);}
    if(t>=TOTAL-3){endOfWatch();return;}}
  if(state==='play'){if(!watch&&t>=TOTAL-3){end();return;}if(!watch){const pn=performance.now();if(playPn&&pn-playPn<2000)playT+=(pn-playPn)/1000;playPn=pn;} /* seconds, not frames: r22 counted 2× fast on a 120 Hz display */
    if(!(hudN%8)){const o=CUT.report(P,TIMES,t);$('hRoom').textContent=o[me]||'';const T=AL.tracks.find(x=>t>=x.start&&t<x.start+x.dur);
      if(T&&T.i!==lastTrack&&!watch){lastTrack=T.i;$('hTrack').textContent='♪ '+String(T.i+1).padStart(2,'0')+' · '+T.name.toUpperCase();$('hTrack').classList.add('on');clearTimeout($('hTrack')._t);$('hTrack')._t=setTimeout(()=>$('hTrack').classList.remove('on'),5000);}
      const n=CUT.nearby(P,TIMES,t,me,disabled);CHR.near=n&&CUT.MAP.objects[n.id]?n.id:null;if(n){$('hPrompt').innerHTML=promptOf(n);$('hPrompt').hidden=false;}else $('hPrompt').hidden=true;}
    if(!(saveN++%1800))save();
    if(!watch&&!prefs.hint1&&t>22){prefs.hint1=true;savePrefs();const touch=window.matchMedia&&matchMedia('(pointer: coarse)').matches;note(touch?'TAP THE KEYS TO MOVE · ♪ TOP RIGHT':'← → MOVE · E USE · N NEXT TAPE · M MUSIC',11);}}
  if(talkWho&&!(hudN%2))placeBubble();hudN++;}
$('hHint').textContent='← →  MOVE   ·   E  USE   ·   ESC  MENU';
/* ---------- BROADCAST (?broadcast=1): the real game in a clean window, for OBS. The Director builds these links.
   mode=watch  view, mood, music (a tape), mins, seed, sleep=1, label=0|1
   mode=play   cam=follow|ship   (follow keeps her centred, so a 9:16 crop in OBS always holds her)
   No frame, no controls, the picture fills the window; nothing is drawn over it but the game's own dialogue. ---------- */
async function broadcast(){const Q=BCQ;document.body.classList.add('bc');show('title',false);fit();
  const go=async()=>{$('bcGo').hidden=true;ensureAudio();try{await actx.resume();}catch(e){}
    if((Q.get('mode')||'watch')==='play'){await begin(null);const fl=Q.get('cam')!=='ship';setCam(fl?'follow':'ship');CUT.tight(fl);return;}
    const nw=prefs.nw;nw.view=Q.get('view')||'full-ship';nw.activity=Q.get('mood')||'quiet';nw.music=Q.get('music')||'auto';nw.duration=+Q.get('mins')||60;nw.focus=0;
    prefs.tag=Q.get('label')==='1';prefs.dim=false;watchSeed=+Q.get('seed')||0;sleepReq=Q.get('sleep')==='1';await beginWatch();};
  /* OBS's browser source may start sound by itself; an ordinary browser needs one click */
  ensureAudio();try{await Promise.race([actx.resume(),wait(400)]);}catch(e){}
  if(actx.state==='running')go();else{const b=$('bcGo');b.hidden=false;b.onclick=go;}}
/* ---------- the app (Nov 2026): installable and offline, fullscreen, the screen kept awake during a watch, the ship in a
   floating window while you work. All local; nothing leaves this browser. ---------- */
if('serviceWorker' in navigator&&location.protocol!=='file:')try{navigator.serviceWorker.register('sw.js').catch(()=>{});}catch(e){}
function applyText(){document.body.dataset.text=prefs.text||'large';}applyText();
function toggleFull(){try{if(document.fullscreenElement)document.exitFullscreen();else (document.getElementById('g')||document.documentElement).requestFullscreen({navigationUI:'hide'});}catch(e){}}
let wakeLk=null;async function keepAwake(on){try{if(on&&!wakeLk&&navigator.wakeLock){wakeLk=await navigator.wakeLock.request('screen');wakeLk.addEventListener('release',()=>{wakeLk=null;});}else if(!on&&wakeLk){await wakeLk.release();wakeLk=null;}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&watch)keepAwake(true);if(document.visibilityState==='hidden'&&!watch&&(state==='play'||state==='pause'))try{save();}catch(e){}}); /* a lunch break ends without warning: save the moment the tab goes away */
window.addEventListener('pagehide',()=>{if(!watch&&(state==='play'||state==='pause'))try{save();}catch(e){}});
/* FLOAT (r27): the ship in a picture-in-picture window. Its sound goes through that window's video while it floats, so the
   window's own mute and pause buttons work (r26's video had no audio track: mute did nothing). Muting there is SOUND OFF. */
let pipV=null,pipDest=null;const inPip=()=>!!pipV&&document.pictureInPictureElement===pipV;
function pipRoute(on){if(!actx||!master||!pipDest)return;try{master.disconnect(on?actx.destination:pipDest);}catch(e){}master.connect(on?pipDest:actx.destination);} /* only that one edge: a recording's tap on master is left alone */
async function floatWindow(){try{if(document.pictureInPictureElement){await document.exitPictureInPicture();return;}ensureAudio();
  if(!pipV){pipV=document.createElement('video');pipV.playsInline=true;const st=stage.captureStream(30);pipDest=actx.createMediaStreamDestination();for(const tr of pipDest.stream.getAudioTracks())st.addTrack(tr);pipV.srcObject=st;
    pipV.addEventListener('enterpictureinpicture',()=>{pipRoute(true);pipV.muted=!prefs.sound;paintWatch();});
    pipV.addEventListener('leavepictureinpicture',()=>{pipRoute(false);paintWatch();});
    pipV.addEventListener('volumechange',()=>{if(!inPip())return;const on=!pipV.muted&&pipV.volume>0;if(on!==!!prefs.sound)setSound(on);});
    pipV.addEventListener('pause',()=>{if(!inPip())return;setSound(!prefs.sound);pipV.muted=!prefs.sound;pipV.play().catch(()=>{});}); /* the window's play/pause toggles the sound; the picture keeps running */
    if(navigator.mediaSession){try{navigator.mediaSession.metadata=new MediaMetadata({title:'NIGHT WATCH',artist:'DSV HALCYON'});}catch(e){}}}
  pipV.muted=!prefs.sound;await pipV.play();await pipV.requestPictureInPicture();}catch(e){note('FLOATING WINDOW · NOT AVAILABLE IN THIS BROWSER',4);}}
window.addEventListener('dblclick',e=>{if(state==='watch'&&e.target===stage)toggleFull();});
if(BC)broadcast();else{enter('title');}idle0=performance.now()/1000;requestAnimationFrame(frame);
if(LR&&LR.cleanup)LR.cleanup();
})();
