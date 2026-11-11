/* r88 · ADRIFT FM · the listener's bar. What a radio needs and nothing else:
     NOW PLAYING · SKIP · SOUND (a small panel: volume, mute, ship sounds, tap sounds) · SCENE · and one more button (mini window, full screen, about).
   On an upright screen there is also VIEW: the room, or the whole ship.
   The bar fades when nothing is happening, but the track name and the speaker stay, dimmer, so the sound is always one tap or one Tab away.
   The first-visit line ("Tap a room to explore") is shown the moment the ship can be touched and goes at the first touch.
   The old bar's buttons are still in the page, hidden; SCENE, MINI, FULL and ABOUT press them, so there is one implementation of each */
(()=>{
const G=window.__naut,GM=window.__game;if(!G||!GM||!GM.snd)return;const $=id=>document.getElementById(id),B=document.body.classList,BC=!!(window.__bc&&__bc.on);
const css=document.createElement('style');css.textContent=`
body.watching:not(.studio) .wui-bar,body.watching:not(.studio) .np,body.watching:not(.studio) #wTrack,body.watching:not(.studio) #wTime{display:none!important}
.fm{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:40;display:none;align-items:stretch;gap:8px;font:400 11px/1 Silk,monospace;letter-spacing:.2em;color:#e9d7c2;-webkit-font-smoothing:none;user-select:none;-webkit-user-select:none}
body.watching:not(.studio):not(.bc):not(.photo):not(.about):not(.aonly) .fm{display:flex}
.fm button{all:unset;box-sizing:border-box;cursor:pointer;min-height:46px;min-width:46px;padding:0 14px;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(11,14,17,.8);box-shadow:inset 0 0 0 2px rgba(231,219,192,.38),0 3px 0 #0b0e11;white-space:nowrap;transition:opacity .6s;-webkit-tap-highlight-color:transparent}
.fm button i,.fm-now i{font-style:normal;font-size:8px;letter-spacing:.24em;color:#907763}
.fm button:hover{color:#f6efe4;box-shadow:inset 0 0 0 2px rgba(231,219,192,.75),0 3px 0 #0b0e11}
.fm button:focus-visible,.fm input:focus-visible{outline:2px solid #ff9a3c;outline-offset:2px}
.fm button[aria-expanded=true],.fm button[aria-pressed=true]{color:#ff9a3c;box-shadow:inset 0 0 0 2px #ff9a3c,0 3px 0 #0b0e11}
.fm button[hidden]{display:none}
.fm svg{width:20px;height:20px;display:block}
.fm-now{display:flex;flex-direction:column;justify-content:center;gap:6px;padding:0 10px 0 2px;text-shadow:2px 2px 0 #0a0c10;transition:opacity .6s;max-width:42vw;overflow:hidden}
.fm-now i{color:#8fd6cf}.fm-now b{font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body:not(.ui):not(.fmk) .fm>button:not(#fmSnd){opacity:0;pointer-events:none}
body:not(.ui):not(.fmk) .fm>#fmSnd,body:not(.ui):not(.fmk) .fm-now{opacity:.62}
.fm-pop{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;padding:12px;min-width:236px;box-sizing:border-box;background:rgba(11,14,17,.96);box-shadow:inset 0 0 0 2px rgba(231,219,192,.38),0 4px 0 #000}
.fm-pop[hidden]{display:none}
.fm-pop button{flex-direction:row;justify-content:space-between;gap:14px;width:100%;min-height:44px;background:rgba(246,239,228,.04)}
.fm-pop button em{font-style:normal;color:#907763}.fm-pop button[aria-checked=true] em,.fm-pop button[aria-pressed=true] em{color:#ff9a3c}
.fm-vol{display:flex;align-items:center;gap:12px;min-height:44px;padding:0 4px}.fm-vol span{flex:none}.fm-vol output{flex:none;width:3.2em;text-align:right;color:#c6ab92}
.fm-vol input{flex:1;min-width:0;height:28px;margin:0;accent-color:#ff9a3c;cursor:pointer}
#fmMoreP{left:auto;right:0;transform:none;min-width:200px}
.fm-hint{position:fixed;left:50%;bottom:calc(86px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:39;pointer-events:none;font:400 12px/1.4 Silk,monospace;letter-spacing:.2em;color:#f6efe4;text-shadow:2px 2px 0 #0a0c10;background:rgba(11,14,17,.72);padding:10px 14px;white-space:nowrap;opacity:0;transition:opacity .5s;-webkit-font-smoothing:none}
.fm-hint.on{opacity:1}.fm-hint[hidden]{display:none}
body.tall #fmView{display:inline-flex}#fmView{display:none}
@media (max-width:620px){.fm{left:0;right:0;transform:none;justify-content:center;flex-wrap:wrap;gap:6px;padding:0 8px;bottom:calc(10px + env(safe-area-inset-bottom));font-size:12px;letter-spacing:.1em}
  .fm-now{flex:1 0 100%;flex-direction:row;align-items:baseline;justify-content:center;gap:10px;padding:0 0 6px;max-width:none}.fm-now i{font-size:10px;letter-spacing:.16em}.fm button{min-height:48px;padding:0 11px}
  .fm-pop{left:8px;right:8px;transform:none;min-width:0}#fmMoreP{left:auto;right:8px;min-width:210px}.fm-hint{bottom:calc(104px + env(safe-area-inset-bottom));font-size:12px;letter-spacing:.12em}
  body.tall.watching:not(.studio) .toast{bottom:calc(112px + env(safe-area-inset-bottom))!important}}
@media (max-height:460px){.fm{bottom:calc(6px + env(safe-area-inset-bottom))}.fm button{min-height:44px}.fm-hint{bottom:calc(64px + env(safe-area-inset-bottom))}}
@media (prefers-reduced-motion: reduce){.fm button,.fm-now,.fm-hint{transition:none}}`;document.head.appendChild(css);
const SPK=m=>'<svg viewBox="0 0 20 20" aria-hidden="true" shape-rendering="crispEdges" fill="currentColor"><path d="M2 7h4l4-4h2v14h-2l-4-4H2z"/>'+(m?'<path d="M14 7h2v2h-2zM18 7h-2v2h2zM16 9h-2v2h2zM14 11h2v2h-2zM16 11h2v2h-2z" opacity=".9"/>':'<path d="M14 7h2v6h-2zM17 5h2v10h-2z"/>')+'</svg>';
const el=document.createElement('div');el.className='fm';el.id='fm';el.setAttribute('role','toolbar');el.setAttribute('aria-label','Adrift FM controls');
el.innerHTML=`<div class="fm-now" id="fmNow" aria-live="polite"><i>NOW PLAYING</i><b id="fmTrack">ADRIFT FM</b></div>
<button type="button" id="fmSkip" aria-label="Skip to the next track" title="Next track (N)">SKIP</button>
<button type="button" id="fmSnd" aria-label="Sound" aria-expanded="false" aria-controls="fmSndP" title="Sound (M mutes)"></button>
<button type="button" id="fmScene" title="Change the ship's lights and mood. The music carries on"><i>SCENE</i><b id="fmSceneN" style="font-weight:400">QUIET DRIFT</b></button>
<button type="button" id="fmView"><i>VIEW</i><b id="fmViewN" style="font-weight:400">ROOM</b></button>
<button type="button" id="fmMore" aria-label="More" aria-expanded="false" aria-controls="fmMoreP">···</button>
<div class="fm-pop" id="fmSndP" role="group" aria-label="Sound" hidden>
 <label class="fm-vol"><span>VOLUME</span><input type="range" id="fmVol" min="0" max="100" step="1" aria-label="Volume"><output id="fmVolN">80</output></label>
 <button type="button" id="fmMute" aria-pressed="false"><span>MUTE</span><em>OFF</em></button>
 <button type="button" id="fmShip" role="switch" aria-checked="true"><span>SHIP SOUNDS</span><em>ON</em></button>
 <button type="button" id="fmTap" role="switch" aria-checked="true"><span>TAP SOUNDS</span><em>ON</em></button>
</div>
<div class="fm-pop" id="fmMoreP" role="group" aria-label="More" hidden>
 <button type="button" id="fmMini"><span>MINI WINDOW</span></button>
 <button type="button" id="fmFull"><span>FULL SCREEN</span></button>
 <button type="button" id="fmAbout"><span>ABOUT</span></button>
</div>`;document.body.appendChild(el);
const hint=document.createElement('div');hint.className='fm-hint';hint.id='fmHint';hint.hidden=true;hint.setAttribute('role','status');document.body.appendChild(hint);
/* ---- paint ---- */
function paintSound(){const s=GM.snd.get();$('fmSnd').innerHTML=SPK(s.mute||s.vol<=0);$('fmSnd').setAttribute('aria-label','Sound: '+(s.mute?'muted':'volume '+Math.round(s.vol*100)+' percent')+'. Open sound settings');
  if(document.activeElement!==$('fmVol'))$('fmVol').value=Math.round(s.vol*100);$('fmVolN').textContent=Math.round(s.vol*100);
  const sw=(id,on,attr)=>{const b=$(id);b.setAttribute(attr,on?'true':'false');b.querySelector('em').textContent=on?'ON':'OFF';};sw('fmMute',s.mute,'aria-pressed');sw('fmShip',s.ship,'aria-checked');sw('fmTap',s.tap,'aria-checked');}
function paintScene(){try{const T=window.__toys,m=T.MOODS.find(x=>x.id===T.S.mood);const n=m?m.name:'';if($('fmSceneN').textContent!==n){$('fmSceneN').textContent=n;$('fmScene').setAttribute('aria-label','Scene: '+n+'. Change scene');}}catch(e){}}
function paintTrack(n){n=n||GM.trackName();if(n&&$('fmTrack').textContent!==n)$('fmTrack').textContent=n;}
function paintView(){const w=GM.camWide();$('fmViewN').textContent=w?'SHIP':'ROOM'; /* one short word each: five buttons fit one row on a 390 px phone */$('fmView').setAttribute('aria-label','View: '+(w?'whole ship':'room')+'. Switch to '+(w?'room view':'the whole ship'));}
function paintMore(){$('fmMini').hidden=!document.pictureInPictureEnabled;$('fmFull').hidden=!document.fullscreenEnabled;$('fmFull').querySelector('span').textContent=document.fullscreenElement?'LEAVE FULL SCREEN':'FULL SCREEN';}
addEventListener('fm:sound',paintSound);addEventListener('fm:track',e=>paintTrack(e.detail));addEventListener('fm:view',paintView);
setInterval(()=>{if(!B.contains('watching'))return;paintScene();paintTrack();paintView();},700);
/* ---- the two panels ---- */
function pop(id,on){for(const [p,b] of [['fmSndP','fmSnd'],['fmMoreP','fmMore']]){const open=p===id&&on;$(p).hidden=!open;$(b).setAttribute('aria-expanded',open?'true':'false');}keep();if(id==='fmMoreP'&&on)paintMore();if(id==='fmSndP'&&on)paintSound();}
const anyPop=()=>!$('fmSndP').hidden||!$('fmMoreP').hidden;
function keep(){B.toggle('fmk',anyPop()||el.contains(document.activeElement));}
el.addEventListener('focusin',keep);el.addEventListener('focusout',()=>setTimeout(keep,0));
$('fmSnd').addEventListener('click',()=>pop('fmSndP',$('fmSndP').hidden));$('fmMore').addEventListener('click',()=>pop('fmMoreP',$('fmMoreP').hidden));
addEventListener('pointerdown',e=>{if(anyPop()&&!el.contains(e.target))pop('',false);},true);
addEventListener('keydown',e=>{if(e.code==='Escape'&&anyPop()){const b=!$('fmSndP').hidden?'fmSnd':'fmMore';pop('',false);try{$(b).focus();}catch(_){}e.stopPropagation();e.preventDefault();}},true);
/* ---- what the buttons do ---- */
$('fmVol').addEventListener('input',e=>{GM.snd.set({vol:+e.target.value/100});});
$('fmMute').addEventListener('click',()=>{GM.snd.set({mute:!GM.snd.get().mute});});
$('fmShip').addEventListener('click',()=>{GM.snd.set({ship:!GM.snd.get().ship});});
$('fmTap').addEventListener('click',()=>{GM.snd.set({tap:!GM.snd.get().tap});});
$('fmSkip').addEventListener('click',()=>{GM.skip();setTimeout(paintTrack,60);});
const press=id=>{const b=$(id);if(b)b.click();};
$('fmScene').addEventListener('click',()=>{press('wMood');setTimeout(paintScene,30);});
$('fmView').addEventListener('click',()=>{GM.camWide(!GM.camWide());});
$('fmMini').addEventListener('click',()=>{pop('',false);press('wMini');});$('fmFull').addEventListener('click',()=>{pop('',false);press('wFull');});$('fmAbout').addEventListener('click',()=>{pop('',false);press('wAbout');});
paintSound();
/* ---- the first-visit line: there the moment the ship can be touched, gone at the first touch ---- */
let hinted=false,hintT=0;function hideHint(){if(hint.hidden)return;hint.classList.remove('on');clearTimeout(hintT);setTimeout(()=>{hint.hidden=true;},600);}
addEventListener('fm:used',hideHint);
setInterval(()=>{if(hinted||BC||!window.__tap||!__tap.ready())return;try{if(CUT.extAt()>.08||__gp.now()<((window.LC&&LC.CAPS)||5))return;}catch(e){} /* after the hull has opened and the two captions have gone */hinted=true;let seen=false;try{seen=!!localStorage.getItem('driftnaut.found');}catch(e){}if(seen||G.found)return;
  hint.textContent=(window.matchMedia&&matchMedia('(pointer: coarse)').matches)?'TAP A ROOM TO EXPLORE':'CLICK A ROOM TO EXPLORE';hint.hidden=false;requestAnimationFrame(()=>hint.classList.add('on'));hintT=setTimeout(hideHint,45000);},200);
setInterval(()=>{if(!hint.hidden&&G.found)hideHint();if(!B.contains('watching')&&!hint.hidden)hint.hidden=true;},400);
window.__fm={paintSound,paintScene,paintTrack,pop};
})();
