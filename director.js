/* Driftnaut Director · the authoring desk (§35). A manifest in, the ship on screen, beats typed per chapter or on the
   absolute script, the band playing the same album the game would, a Night Watch generated on demand, a video recorded
   in real time. Everything is the same engine the game runs; the Director only writes the JSON. */
(function(){
"use strict";
const $=id=>document.getElementById(id),E=window.LMX,X=window.LMXS,M=window.LMXM,LR=window.LSR,DSE=window.DSE,STORE='deadScoutDirector';
const mmss=s=>{s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=String(s%60).padStart(2,'0');return h?h+':'+String(m).padStart(2,'0')+':'+x:m+':'+x;};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(!window.CUT||!window.DS_DEFAULT_EPISODE){document.body.innerHTML='<p style="padding:40px;font:14px monospace;color:#e7dbc0">The ship did not load. Open director.html from the Adrift FM folder.</p>';return;}
/* ---------- the project ---------- */
let P,AL,TIMES,TOTAL,selCh=0,man=null;
const stage=$('stage'),LCV=LC.create(stage);
function load(D){man=JSON.parse(JSON.stringify(D));P=DSE.project(man);replan();selCh=0;paintAll();}
function replan(){const a=DSE.album(P);AL=a.AL;TIMES=a.TIMES;TOTAL=a.TOTAL;LCV.setProject(P,TIMES);P.rev++;}
function say(t){$('vfdName').textContent=t;clearTimeout(say.t);say.t=setTimeout(()=>{$('vfdName').textContent=P.name;},2600);}
/* ---------- sound: the band on a fader, started at an offset so any chapter can be previewed ---------- */
let actx=null,master=null,band=null,t0=0,sched=null,curCh=-1,lastHero=0,mode='idle',idle0=performance.now()/1000;
function ensureAudio(){if(actx)return actx;actx=new (window.AudioContext||window.webkitAudioContext)();master=actx.createGain();trimG=actx.createGain();lim=actx.createDynamicsCompressor();
  lim.threshold.value=-3;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.002;lim.release.value=.25; /* a safety limiter: the trim lifts the quiet tapes toward the target, this catches the rare peak */
  master.connect(trimG);trimG.connect(lim);lim.connect(actx.destination);if(window.LOUD)LOUD.meter(actx,lim).then(m=>{meterL=m;}).catch(()=>{});return actx;}
/* ---------- broadcast: the long videos (profile, loudness target, files in parts, title and chapter cards) ---------- */
const BKEY='deadScoutBroadcast',BC=(()=>{try{return Object.assign({profile:'focus',loud:'-14',parts:'0',cards:'all'},JSON.parse(localStorage.getItem(BKEY)||'{}'));}catch(e){return {profile:'focus',loud:'-14',parts:'0',cards:'all'};}})();
let trimG=null,lim=null,meterL=null;
const LIM_MAKEUP=1.5; /* the browser's limiter adds about 1.5 dB of its own makeup gain (measured offline: the chain landed 1.5 dB hot without this) */
const sleepy=()=>BC.profile==='sleep';
function measured(){/* where the music sits as mixed (calibrated offline, BS.1770): deadwave per tape, the synthwave band about -21 */
  if(P.style==='deadwave'&&window.DEEP&&DEEP.LUFS){const k=((P.music&&P.music.tape)||'soft-orbit')+(sleepy()?':sleep':'');return DEEP.LUFS[k]!=null?DEEP.LUFS[k]:-22;}return -21;}
function setTrim(){if(!trimG)return;const g=BC.loud==='off'?1:Math.pow(10,Math.max(-12,Math.min(12,(+BC.loud)-measured()-LIM_MAKEUP))/20);trimG.gain.setTargetAtTime(g,actx.currentTime,.3);if(meterL)meterL.reset();paintBroadcast();}
function paintBroadcast(){$('bProfile').value=BC.profile;$('bLoud').value=BC.loud;$('bParts').value=BC.parts;$('bCards').value=BC.cards;
  const g=BC.loud==='off'?0:(+BC.loud)-measured()-LIM_MAKEUP;$('bHint').textContent=(sleepy()?'SLEEP: no impacts, radio, drums or dropouts; the picture calm and dimmed. ':'')+(BC.loud==='off'?'Loudness as mixed (about '+Math.round(measured())+' LUFS).':'Music lifted '+(g>=0?'+':'')+g.toFixed(1)+' dB to about '+BC.loud+' LUFS, with a safety limiter. The meter above the picture shows what it actually measures.')+(+BC.parts?' Long videos save as '+(+BC.parts/60)+'-hour parts as they go.':'');}
for(const [id,k] of [['bProfile','profile'],['bLoud','loud'],['bParts','parts'],['bCards','cards']])$(id).addEventListener('change',e=>{BC[k]=e.target.value;try{localStorage.setItem(BKEY,JSON.stringify(BC));}catch(_){}if(k==='profile'&&band&&!REC)startBand(now());setTrim();});
/* what goes over the picture: the sleep dim, a title card, a small card at each chapter. Drawn in the design units of LC */
function cardAt(){const B=P.brand||{};return B.intro==='halcyon'?LC.HAL+LC.HAL_X+1.5:B.intro?LC.INTRO+1.5:3;}
function overlay(t){const c=stage.getContext('2d'),k=stage.width/LC.DW;c.save();c.setTransform(k,0,0,k,0,0);
  if(sleepy()){c.fillStyle='rgba(0,0,0,.34)';c.fillRect(0,0,LC.DW,LC.DH);}
  const a0=cardAt(),fade=(u,d)=>Math.max(0,Math.min(1,u/1.5,(d-u)/1.5));c.textBaseline='top';try{c.letterSpacing='6px';}catch(e){}
  if(BC.cards!=='none'&&t>=a0&&t<a0+10){const a=fade(t-a0,10);c.globalAlpha=a*.92;c.fillStyle='rgba(6,6,10,.55)';c.fillRect(72,72,980,150);c.globalAlpha=a;c.fillStyle='#e7dbc0';c.font='400 44px Silk,monospace';c.fillText((P.name||'ADRIFT FM').slice(0,34),100,96);
    c.fillStyle='#8f8878';c.font='400 20px Silk,monospace';c.fillText(((P.watch?'NIGHT WATCH':'TRANSMISSION')+' // DSV HALCYON · DSV-0417 // '+(P.len>=60?(P.len/60)+(P.len>=120?' HOURS':' HOUR'):P.len+' MIN')).toUpperCase(),100,166);}
  if(BC.cards==='all'){for(let i=1;i<TIMES.length;i++){const s0=TIMES[i].start+1;if(t>=s0&&t<s0+6){const a=fade(t-s0,6);c.globalAlpha=a*.9;c.fillStyle='rgba(6,6,10,.55)';c.fillRect(72,LC.DH-150,720,70);c.globalAlpha=a;c.fillStyle='#e7dbc0';c.font='400 22px Silk,monospace';c.fillText(String(i+1).padStart(2,'0')+' · '+String(P.chapters[i].title||'').toUpperCase().slice(0,40),96,LC.DH-128);}}}
  c.restore();}
const lufs=v=>isFinite(v)?v.toFixed(1):'—';
function startBand(off){ensureAudio();if(actx.state!=='running')actx.resume();if(band){band.stop(.5);band=null;}
  t0=actx.currentTime+.08-off;if(P.style==='deadwave'&&window.DEEP){band=DEEP.make(actx,master,{seed:P.seed,tape:(P.music&&P.music.tape)||'soft-orbit',startAt:t0,fadeIn:off+1.2,sleep:sleepy()});curCh=-1;}else{const d=DSE.dna(P,AL.synthList&&AL.synthList.length?{trackList:AL.synthList}:null),o=X.opts(d);band=E.make(actx,master,Object.assign(o,{startAt:t0,fadeIn:off+1.2}));X.attach(band,d,0);if(off>0&&band.skip)band.skip(off);curCh=-1;}
  setTrim();clearInterval(sched);sched=setInterval(tick,200);tick();mode='play';}
function stopBand(){if(band){band.stop(.6);band=null;}clearInterval(sched);sched=null;mode='idle';idle0=performance.now()/1000;}
function tick(){if(!band)return;band.tick(actx.currentTime+band.ahead);const t=now(),k=LCV.chapterAt(t);
  if(P.watch){if(curCh<0){curCh=0;try{band.setState('quiet',10);}catch(e){}}return;}
  if(k!==curCh){curCh=k;const env=DSE.ENV[P.chapters[k].role]||['normal'];try{band.setState(env[0],8);if(env[1])band.hero(env[1],env[2]||{});}catch(e){}lastHero=t;}
  else{const env=DSE.ENV[P.chapters[k].role];if(env&&env[1]&&t-lastHero>150){try{band.hero(env[1],Object.assign({dist:'far'},env[2]||{}));}catch(e){}lastHero=t;}}}
const now=()=>actx&&band?actx.currentTime-t0:0;
/* ---------- the loop ---------- */
let REC=null,liveN=0;
function frame(){requestAnimationFrame(frame);if(REC){recTick();return;}const t=mode==='play'?now():(TIMES[selCh]?TIMES[selCh].start:0)+((performance.now()/1000-idle0)%60);
  LCV.render(t,{plain:sleepy()});if(mode==='play')overlay(t);$('vfdTime').textContent=mmss(t)+' / '+mmss(TOTAL);if(!(liveN++%12)){paintMeter();const o=CUT.report(P,TIMES,t);$('live').textContent=Object.entries(o).map(([k,v])=>k.toUpperCase()+' '+v).join(' · ');}
  if(mode==='play'&&t>=TOTAL){stopBand();}}
function sizeStage(){if(REC)return;const d=Math.min(2,window.devicePixelRatio||1),w=Math.round($('vscreen').clientWidth*d);LCV.setSize(w,Math.round(w*9/16));}
window.addEventListener('resize',sizeStage);
/* ---------- make video: real time, one frame after another, the sound off the same bus ---------- */
async function makeVideo(){if(REC){stopRec();return;}if(!LR){say('THIS BROWSER CAN\'T RECORD');return;}ensureAudio();const quick=$('tPreset').value==='quick',off=quick?(TIMES[selCh]||{start:0}).start:0,len=quick?Math.min(60,TOTAL-off):TOTAL-off,w=quick?1280:1920,h=quick?720:1080;
  const partLen=quick?0:(window.__partSecs||(+BC.parts)*60),vbr=quick?4.5e6:sleepy()?4.5e6:8e6,opts=()=>({canvas:stage,ctx:actx,source:lim,fps:30,vbr,keep:!!partLen,expectBytes:(vbr+192000)/8*(partLen&&partLen<len?partLen:len)*1.02});
  LCV.setSize(w,h);stage.style.width='100%';let R;try{R=await LR.record(opts());}catch(e){say(e&&e.message==='NO ROOM'?'NOT ENOUGH DISK SPACE FOR THIS VIDEO':'THE RECORDING DID NOT START');sizeStage();return;}
  $('parts').innerHTML='';REC_PARTS=[];REC={R,off,len,t:0,last:-1,p0:0,n:1,partLen:partLen&&partLen<len?partLen:0,opts};startBand(off);R.start();$('tMake').textContent='■ STOP AND SAVE';$('tMake').classList.add('on');$('takeLink').hidden=true;window.onbeforeunload=()=>'A video is recording.';}
function paintMeter(){if(!meterL||mode!=='play'){$('vfdLoud').textContent='';return;}const m=meterL.read();$('vfdLoud').textContent='LUFS '+lufs(m.s)+' · INTEGRATED '+lufs(m.i);}
function recTick(){const R=REC,t=now(),rel=t-R.off;if(rel<0)return;LCV.render(t,{plain:sleepy()});overlay(t);if(rel>R.last){R.R.frame(rel-R.p0);R.last=rel;}if(!(liveN++%15))paintMeter();
  $('vfdTime').textContent='REC '+mmss(rel)+' / '+mmss(R.len)+(R.partLen?' · PART '+R.n:'');
  if(R.partLen&&!R.next&&!R.prep&&rel>=R.p0+R.partLen-15&&R.len-rel>60){R.prep=true;LR.record(R.opts()).then(n=>{R.next=n;}).catch(()=>{R.prep=false;R.p0+=600;});} /* the next part is ready before this one ends */
  if(R.partLen&&R.next&&rel>=R.p0+R.partLen){const old=R.R,n=R.n;R.next.start();R.R=R.next;R.next=null;R.prep=false;R.p0=rel;R.n++;old.stop().then(b=>savePart(b,n,old.ext)).catch(()=>{});}
  if(rel>=R.len)stopRec();}
const base=()=>(P.name||'deadscout').toLowerCase().replace(/[^a-z0-9]+/g,'-');
function savePart(blob,n,ext){if(!blob||!blob.size)return;const nm=base()+'-part'+String(n).padStart(2,'0')+'.'+(ext||'mp4'),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=nm;a.textContent='⤓ PART '+n+' · '+LR.fmtBytes(blob.size);$('parts').appendChild(a);a.click(); /* saved as it finishes: hours already made are safe on disk */
  REC_PARTS.push(nm);let j=$('joinList');if(!j){j=document.createElement('a');j.id='joinList';j.title='a list for ffmpeg: ffmpeg -f concat -safe 0 -i parts.txt -c copy full.mp4';$('parts').appendChild(j);}
  if(j.href)URL.revokeObjectURL(j.href);j.href=URL.createObjectURL(new Blob([REC_PARTS.map(x=>"file '"+x+"'").join('\n')+'\n'],{type:'text/plain'}));j.download='parts.txt';j.textContent='⤓ JOIN LIST (ffmpeg -f concat -safe 0 -i parts.txt -c copy full.'+(ext||'mp4')+')';$('parts').appendChild(j);}
let REC_PARTS=[];
async function stopRec(){const R=REC;if(!R||R.stopping)return;R.stopping=true;stopBand();let blob=null;try{blob=await R.R.stop();}catch(e){}if(R.next)R.next.stop().catch(()=>{});REC=null;
  if(R.partLen){savePart(blob,R.n,R.R.ext);blob=null;window.onbeforeunload=null;$('tMake').textContent='● MAKE VIDEO';$('tMake').classList.remove('on');sizeStage();return;}window.onbeforeunload=null;$('tMake').textContent='● MAKE VIDEO';$('tMake').classList.remove('on');sizeStage();
  if(blob&&blob.size){const u=URL.createObjectURL(blob),a=$('takeLink');a.href=u;a.download=(P.name||'deadscout').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.'+(R.R.ext||'webm');a.textContent='⤓ SAVE · '+LR.fmtBytes(blob.size);a.hidden=false;}}
/* ---------- the story pane ---------- */
function paintChapters(){$('chList').innerHTML=P.chapters.map((c,k)=>`<button type="button" data-k="${k}" class="${k===selCh?'cur':''}">${k+1} · ${esc(c.title)} · ${mmss(TIMES[k].start)}</button>`).join('');
  $('tChapters').innerHTML=P.chapters.map((c,k)=>`<button type="button" data-k="${k}" class="${k===selCh?'cur':''}">${k+1}</button>`).join('');
  const c=P.chapters[selCh];$('cTitle').value=c.title;$('cRole').value=c.role;$('cEnergy').value=c.energy;$('cMin').value=c.nominal?+(c.nominal/60).toFixed(1):'';if(document.activeElement!==$('cBeats'))$('cBeats').value=c.text||'';
  if(document.activeElement!==$('sScript'))$('sScript').value=P.scriptText||'';$('sErr').textContent=P.errs.slice(0,2).join(' · ');}
function applyBeats(){const c=P.chapters[selCh],r=DSE.beatsIn($('cBeats').value);c.beats=r.beats;c.text=r.text;const rs=DSE.beatsIn($('sScript').value);P.script=rs.beats;P.scriptText=rs.text;
  P.errs=r.errs.map(e=>'CHAPTER '+(selCh+1)+' LINE '+e.line+': '+e.err).concat(rs.errs.map(e=>'SCRIPT LINE '+e.line+': '+e.err));$('sErr').textContent=P.errs.slice(0,2).join(' · ');P.rev++;}
$('cBeats').addEventListener('input',applyBeats);$('sScript').addEventListener('input',applyBeats);
$('chList').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b){selCh=+b.dataset.k;idle0=performance.now()/1000;paintChapters();}});
$('tChapters').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b||REC)return;selCh=+b.dataset.k;idle0=performance.now()/1000;paintChapters();if(mode==='play')startBand(TIMES[selCh].start);});
$('cTitle').addEventListener('input',e=>{P.chapters[selCh].title=e.target.value.toUpperCase().slice(0,40)||'CHAPTER';paintChapters();});
$('cRole').addEventListener('change',e=>{const c=P.chapters[selCh];c.role=e.target.value;c.energy=DSE.ENERGY[c.role];replan();paintAll();});
$('cEnergy').addEventListener('change',e=>{P.chapters[selCh].energy=+e.target.value;replan();paintAll();});
$('cMin').addEventListener('change',e=>{const v=parseFloat(e.target.value);P.chapters[selCh].nominal=v>0?v*60:undefined;replan();paintAll();});
$('cAdd').addEventListener('click',()=>{if(P.chapters.length>=8)return;P.chapters.splice(selCh+1,0,{title:'CHAPTER '+(P.chapters.length+1),role:'ROUTINE',energy:.35,beat:'',motion:'auto',beats:[],text:''});selCh++;replan();paintAll();});
$('cDel').addEventListener('click',()=>{if(P.chapters.length<=1)return;P.chapters.splice(selCh,1);selCh=Math.max(0,selCh-1);replan();paintAll();});
/* ---------- the project pane ---------- */
const DW={name:'Deadwave',genres:'#ambient #deadwave #spaceambient #darkambient #sleepmusic #focusmusic',tags:'#ambient #spaceambient #sleep #focus'};
const STY=id=>id==='deadwave'?DW:(M.STYLES[id]||M.STYLES.synthwave);
$('pStyle').innerHTML='<option value="deadwave">DEADWAVE</option>'+M.STYLE_IDS.map(id=>`<option value="${id}">${esc(M.STYLES[id].name)}</option>`).join('');
if(window.DEEP)$('pTape').innerHTML=Object.entries(DEEP.TAPES).map(([id,T])=>`<option value="${id}">${esc(T.name)}</option>`).join('');
$('pTape').addEventListener('change',e=>{P.music.tape=e.target.value;remusic();if(mode==='play')startBand(now());});$('cRole').innerHTML=DSE.ROLES.map(r=>`<option>${r}</option>`).join('');
function paintProject(){$('pName').value=P.name;$('pYear').value=P.year;$('pLen').value=P.len;$('pSeed').value=P.seed;$('pStyle').value=P.style;$('pTape').value=(P.music&&P.music.tape)||'soft-orbit';$('pTape').disabled=P.style!=='deadwave';$('pVibe').value=P.vibe;$('pDrums').value=P.music.drums;$('pSynth').value=P.music.synth;$('pAmb').value=P.music.ambience;
  $('pIntro').value=P.brand.intro==='halcyon'?'halcyon':P.brand.intro?'1':'0';$('pOutro').value=P.brand.outro===true||P.brand.outro==='card'?'card':P.brand.outro||'0';$('vfdName').textContent=P.name;}
const remusic=()=>{man=DSE.manifest(P);const keep=P.rev;P=DSE.project(man);P.rev=keep+1;replan();paintAll();};
$('pName').addEventListener('change',e=>{P.name=e.target.value.toUpperCase().slice(0,60)||'UNTITLED';paintAll();});
$('pYear').addEventListener('change',e=>{P.year=e.target.value.slice(0,6);paintAll();});
$('pLen').addEventListener('change',e=>{P.len=+e.target.value;replan();paintAll();});
$('pSeed').addEventListener('change',e=>{P.seed=Math.max(1,parseInt(e.target.value,10)||1);replan();paintAll();});
$('pReseed').addEventListener('click',()=>{P.seed=1+Math.floor(Math.random()*999999);replan();paintAll();});
for(const [id,k] of [['pStyle','style'],['pVibe','vibe']])$(id).addEventListener('change',e=>{P[k]=e.target.value;remusic();});
for(const [id,k] of [['pDrums','drums'],['pSynth','synth'],['pAmb','ambience']])$(id).addEventListener('change',e=>{P.music[k]=e.target.value;remusic();});
$('pIntro').addEventListener('change',e=>{P.brand.intro=e.target.value==='halcyon'?'halcyon':e.target.value==='1';});
$('pOutro').addEventListener('change',e=>{P.brand.outro=e.target.value==='0'?false:e.target.value;});
$('bGame').addEventListener('click',()=>{if(window.DS_GAME)load(DS_GAME);});
$('bEpisode').addEventListener('click',()=>load(DS_DEFAULT_EPISODE));
$('bOpen').addEventListener('change',async e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;try{const D=JSON.parse(await f.text());if(D.mode==='night-watch'&&window.NW)load(NW.manifest(D.night_watch||D));else load(D);say('MANIFEST LOADED');}catch(err){say('NOT A MANIFEST');}});
$('bExport').addEventListener('click',()=>{const m=DSE.manifest(P),u=URL.createObjectURL(new Blob([JSON.stringify(m,null,1)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=(P.name||'deadscout').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);});
$('nwMake').addEventListener('click',()=>{if(!window.NW)return;load(NW.manifest({view:$('nwView').value,activity:$('nwAct').value,duration_minutes:+$('nwLen').value}));say('NIGHT WATCH · '+P.name);});
/* saved projects: manifests in this browser */
const saved=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'[]');}catch(e){return [];}};
function paintSaved(){const S=saved();$('pSaved').innerHTML=S.map((m,i)=>`<option value="${i}">${esc(m.title||'UNTITLED')} · ${m.length_minutes||''} MIN</option>`).join('')||'<option value="">—</option>';}
$('pSave').addEventListener('click',()=>{const S=saved(),m=DSE.manifest(P),i=S.findIndex(x=>x.title===m.title);if(i>=0)S[i]=m;else S.push(m);try{localStorage.setItem(STORE,JSON.stringify(S));say('SAVED');}catch(e){say('NO ROOM TO SAVE');}paintSaved();});
$('pLoad').addEventListener('click',()=>{const S=saved(),m=S[+$('pSaved').value];if(m){load(m);say('OPENED');}});
$('pDel').addEventListener('click',()=>{const S=saved(),i=+$('pSaved').value;if(!(i>=0))return;S.splice(i,1);localStorage.setItem(STORE,JSON.stringify(S));paintSaved();say('DELETED');});
/* ---------- publish ---------- */
const ytTitle=()=>{const pb=P.publish||{};return (pb.title||((P.year?P.year+': ':'')+P.name))+' // '+(P.len>=120?Math.round(P.len/60)+' HOURS':P.len>=60?'1 HOUR':P.len+' MIN')+' '+STY(P.style).name.toUpperCase()+(pb.subtitle?' · '+pb.subtitle.split(' • ')[0]:'');};
function ytDesc(){const St=STY(P.style),pb=P.publish||{};const tl=AL.tracks.map(T=>mmss(T.start<1?0:T.start)+' Track '+String(T.i+1).padStart(2,'0')+' — '+T.name).join('\n'),cl=P.chapters.map((c,k)=>mmss(TIMES[k]?TIMES[k].start:0)+' '+c.title).join('\n');
  return ytTitle().split(' // ')[0]+'\n'+(pb.episode?(pb.series||'Adrift FM')+' · Episode '+pb.episode+'\n':'')+'DSV HALCYON · DSV-0417\n\nAn Adrift FM transmission: '+AL.tracks.length+' original '+St.name.toLowerCase()+' tracks, and the deep survey vessel HALCYON — presumed lost with all hands in the outer heliosphere, 167 AU from Sol, until something aboard began transmitting. Told without a word across '+P.chapters.length+' chapters. Leave it on for coding, gaming, driving or focus, and look up now and then: something is happening.\n\nTRACKLIST\n'+tl+'\n\nVISUAL TRANSMISSION\n'+cl+'\n\n'+St.genres+'\nMusic synthesized live in the Driftnaut engine: no samples, no loops. Royalty-free.\nPlay Driftnaut: the ship is a game.\n\n'+St.tags+' #deadscout #halcyon';}
function paintPublish(){$('yTitle').value=ytTitle();$('yDesc').value=ytDesc();}
const copy=async(v,ok)=>{try{await navigator.clipboard.writeText(v);say(ok);}catch(e){say('SELECT AND COPY IT');}};
$('cTitleBtn').addEventListener('click',()=>copy(ytTitle(),'TITLE COPIED'));$('cDescBtn').addEventListener('click',()=>copy(ytDesc(),'DESCRIPTION COPIED'));
/* ---------- transport ---------- */
$('tPlay').addEventListener('click',()=>{if(REC)return;if(mode==='play'){stopBand();$('tPlay').textContent='▶ PLAY';}else{startBand(TIMES[selCh]?TIMES[selCh].start:0);$('tPlay').textContent='❚❚ PAUSE';}});
$('tStop').addEventListener('click',()=>{if(REC)return;stopBand();$('tPlay').textContent='▶ PLAY';});
$('tMake').addEventListener('click',makeVideo);
/* ---------- the beat language, from the engine's own lists ---------- */
function paintHelp(){const C=CUT;$('help').innerHTML=[
  '<b>mm:ss move ACTOR to ROOM.SPOT [via SPOT] [sneak]</b> · actors: '+C.ACTORS.join(', '),
  '<b>mm:ss ACTOR ACTION [for Ns]</b> · '+C.ACTIONS.join(', ')+' and each sheet\'s own animations',
  '<b>mm:ss ACTOR interact OBJECT</b> · '+Object.keys(C.OBJECTS).join(', '),
  '<b>mm:ss room ROOM STATE</b> · rooms: '+Object.keys(C.ROOMS).join(', ')+' · states: '+Object.keys(C.STATES).join(', '),
  '<b>mm:ss screen SCREEN MODE [for Ns]</b> · '+C.SCREEN_MODES.join(', '),
  '<b>mm:ss door DOOR open|closed|locked</b> · '+C.DOORS.join(', ')+' · <b>airlock cycle|cycle-out|cycle-in</b>',
  '<b>mm:ss camera cutaway|exterior|follow ACTOR|room ROOM|rect x0 y0 x1 y1</b>',
  '<b>mm:ss world past|present</b> · <b>echo ROOM PRESET for Ns</b> · '+C.ECHO_PRESETS.join(', '),
  '<b>mm:ss set VALUE N [over Ns]</b> · '+Object.keys(C.WORLD).join(', ')+' · <b>event</b> '+C.EVENTS.join(', ')+' · <b>mystery</b> '+Object.keys(C.MYSTERIES).join(', ')+' · <b>anomaly</b> '+C.ANOM.join(', ')+' · <b>tether on|off</b> · <b>hide|show ACTOR</b>',
  'spots: '+Object.entries(C.ROOMS).map(([r,o])=>r+' · '+Object.keys(o.spots).join(' ')).join(' | ')].map(l=>'<p>'+l+'</p>').join('');}
function paintAll(){paintProject();paintChapters();paintPublish();}
/* ---------- start ---------- */
/* ---------- the broadcast link (Nov 2026): the Director no longer renders video. It builds a link to the real game in a
   clean window (index.html?broadcast=1...) for OBS: a browser source, or a window capture with the sound. ---------- */
$('lMusic').innerHTML='<option value="auto">AUTO (THE SCENE\'S OWN)</option>'+Object.entries(NW.MUSIC).map(([k,m])=>`<option value="${k}">${esc(m.name)}</option>`).join('');
$('lScene').innerHTML=Object.entries(NW.SCENES).map(([k,m])=>`<option value="${k}">${esc(m.name)}</option>`).join('');
/* r87: the link is for the ship as it is now: the astronaut, Scout, the bots, the jelly. LONG is the whole ship; SHORT is an upright window that stays with the astronaut */
function bcUrl(){const q=new URLSearchParams({broadcast:'1'}),f=$('lFormat').value;q.set('format',f);q.set('scene',$('lScene').value);if($('lMusic').value!=='auto')q.set('music',$('lMusic').value);
  if($('lPace').value==='lively')q.set('pace','lively');if($('lIntro').value==='0')q.set('intro','0');const sd=parseInt($('lSeed').value,10);if(sd)q.set('seed',sd);if($('lSleep').checked)q.set('sleep','1');if($('lLabel').checked)q.set('label','1');
  return new URL('index.html?'+q.toString(),location.href).href;}
function paintLink(){const sh=$('lFormat').value==='short';$('lUrl').value=bcUrl();
  $('lHint').innerHTML=(sh?'<b>SHORT.</b> In OBS set the canvas to 1080 × 1920 (Settings → Video, both resolutions). Add a Browser Source with this link, width 1080, height 1920. The camera stays with the astronaut. LIVELY and STRAIGHT IN suit a Short: more happens in the first minute.'
    :'<b>LONG.</b> In OBS, with a 1920 × 1080 canvas, add a Browser Source with this link, width 1920, height 1080. The whole ship, running by itself for as long as you record.')
   +' Tick “Control audio via OBS” on the source so the music is recorded. It runs with no controls and no hints. To touch things while recording (send the astronaut somewhere, tap the jelly, the reactor, a lamp), right-click the source and choose Interact. Stop the recording when you have enough; the ship does not end.';}
for(const id of ['lFormat','lScene','lMusic','lPace','lIntro','lSeed','lSleep','lLabel'])$(id).addEventListener('input',paintLink);
$('lFormat').addEventListener('input',()=>{const sh=$('lFormat').value==='short';$('lPace').value=sh?'lively':'calm';$('lIntro').value=sh?'0':'1';paintLink();});
$('lOpen').addEventListener('click',()=>{const sh=$('lFormat').value==='short';window.open(bcUrl(),'_blank',sh?'noopener,width=540,height=960':'noopener,width=1280,height=720');});
$('lCopy').addEventListener('click',()=>copy(bcUrl(),'LINK COPIED'));
paintLink();
if(LR&&LR.cleanup)LR.cleanup(); /* last session's recording parts go, as the game already does */
load(window.NW?NW.manifest({view:'full-ship',activity:'quiet',duration_minutes:60}):DS_DEFAULT_EPISODE);paintHelp();paintSaved();paintBroadcast();sizeStage();requestAnimationFrame(frame);
window.__director={get BC(){return BC;},meter:()=>meterL&&meterL.read(),get trim(){return trimG&&trimG.gain.value;},get P(){return P;},get TIMES(){return TIMES;},get AL(){return AL;},load};
})();
