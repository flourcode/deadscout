/* The ship happens by itself (§33 F). A small library of things HALCYON does when nobody asks: a door shuts somewhere,
   a screen wakes, the lights fail, K9 hears something, a crew echo crosses the bridge. Rare, weighted, cooled down,
   seeded, and coherent with the room she is in. Nothing here attacks her, blocks her, or explains itself.
   window.EVENTS.create(api) → {update(t), reset(seed), state(), restore(s)} */
(function(){
"use strict";
const SCREEN_ROOM={bridge:'bridge',sensor:'sensor',comms:'comms',quarters:'crew-quarters',engineering:'engineering',airlock:'airlock'};
const screensIn=(a,room)=>Object.keys(a.map().screens).filter(id=>SCREEN_ROOM[id.split('.')[0]]===room);
const quiet=a=>!a.tuning()&&a.playing()&&a.flags().awakened&&!a.flags().second_dark;
const E=[
 {id:'door-closes',w:3,cd:240,ok:a=>{const D=a.doors(),M=a.map().doors,r=a.room();return Object.keys(D).some(k=>D[k]==='open'&&!M[k].big&&!M[k].wall&&!a.roomsOf(k).includes(r));},
  fire:a=>{const D=a.doors(),M=a.map().doors,r=a.room(),k=a.pick(Object.keys(D).filter(k=>D[k]==='open'&&!M[k].big&&!M[k].wall&&!a.roomsOf(k).includes(r)));a.run(['+0 door '+k+' closed']);a.later(3,()=>{if(a.rng()<.5)a.say('HOS','DOOR · '+k.replace(/-/g,' ').toUpperCase()+' · SECURED');});}},
 {id:'crt-on',w:3,cd:200,ok:a=>screensIn(a,a.room()).some(id=>['off','offline',null,undefined].includes(a.screen(id))),
  fire:a=>{const id=a.pick(screensIn(a,a.room()).filter(id=>['off','offline',null,undefined].includes(a.screen(id)))),m=a.pick(['idle-grid','text-terminal','waveform','hos']);a.run(['+0 screen '+id+' boot for 2s','+2 screen '+id+' '+m+' for 24s','+26 screen '+id+' off']);a.sfxAt('crt',a.map().screens[id][0],.7);}},
 {id:'k9-finds',w:4,cd:180,ok:a=>{const k=a.k9();if(!k||k.state!=='follow')return false;const m=a.pos('k9');return !m.walk&&a.roomOf('k9')===a.room();},
  fire:a=>{const m=a.pos('k9'),her=a.pos();a.act('k9','signal-detect',2.4,her.x<m.x?'right':'left');a.sfxAt('chirp',m.x,.5);a.later(2.6,()=>{a.act('k9','scan',3.2,her.x<m.x?'right':'left');a.sfxAt('servo',m.x,.4);});a.later(6.5,()=>a.say('K9-4',a.pick(['LOCAL SENSOR · TRACE · LOST','LOCAL SENSOR · NOTHING','MOTION · BEHIND THE PANEL · NONE'])));}},
 {id:'light-fails',w:2,cd:420,ok:a=>['powered','low-power','normal','dim'].includes(a.roomState(a.room()))&&a.room()!=='eva',
  fire:a=>{const r=a.room(),was=a.roomState(r),d=5+a.rng()*6;a.run(['+0 room '+r+' low-power','+'+d.toFixed(1)+' room '+r+' '+was]);a.sfxAt('breaker',null,.3);a.later(d+.5,()=>a.sfxAt('breaker',null,.25));a.later(1,()=>a.say('HOS',a.pick(['LIGHTS · SAVING POWER','POWER BUS · RESEATING'])));}},
 {id:'signal-appears',lvl:1,w:2,cd:400,ok:a=>a.flags().scanner_found&&!a.scan().sources.some(s=>s.id==='transient'),
  fire:a=>{const r=a.room(),p=a.pos(),dir=a.rng()<.5?-1:1;a.scan().add({id:'transient',kind:'signal',x:p.x+dir*420,y:p.y,r:700,memory:{room:r,preset:'crew-routine',dur:12}});a.say('HOS','TRANSIENT SOURCE · '+r.replace(/-/g,' ').toUpperCase());a.later(45,()=>{const s=a.scan().sources.find(q=>q.id==='transient');if(s&&!s.off&&!a.tuning()){a.scan().remove('transient');a.say('HOS','TRANSIENT SOURCE · LOST');}else if(s)a.later(40,()=>a.scan().remove('transient'));});}},
 {id:'crew-echo',lvl:1,w:3,cd:300,ok:a=>['bridge','sensor','comms','crew-quarters','engineering','airlock'].includes(a.room())&&a.era()==='present',
  fire:a=>{const r=a.room();a.run(['+0 echo '+r+' crew-routine for 5s']);a.sfxAt('blip',null,.3);}},
 {id:'airlock-cycles',lvl:1,w:1,cd:600,ok:a=>!['airlock','eva'].includes(a.room())&&!a.flags().cycled,
  fire:a=>{a.run(['+0 room airlock cycling','+9 room airlock low-power']);a.sfxAt('pump',a.map().doors['airlock-inner'].x,.6);a.later(2,()=>a.say('HOS','AIRLOCK · PRESSURE TEST · NOMINAL'));}},
 {id:'hull-knock',w:3,cd:240,ok:a=>true,
  fire:a=>{const p=a.pos(),side=a.rng()<.5?-1:1;a.sfxAt('knock',p.x+side*500,.3);a.later(3,()=>{if(a.rng()<.5)a.say('HOS','HULL · COOLING');});}},
 {id:'sensor-movement',lvl:1,w:2,cd:300,ok:a=>true,
  fire:a=>{const s=a.pick(['SECTOR 3','LOWER DECK','SERVICE TUNNEL','OUTER PLATFORM','CREW QUARTERS']);a.say('HOS','MOTION DETECTED: '+s);a.later(5,()=>a.say('HOS','RECOUNT: NONE'));}},
 {id:'locker-opens',w:1,cd:900,ok:a=>!a.flags().scanner_found&&a.room()==='crew-quarters',
  fire:a=>{a.run(['+0 mystery locker-open']);a.sfxAt('latch',a.at('crew-quarters.locker').x,.8);}},
 {id:'maintenance-wakes',w:2,cd:500,ok:a=>a.room()!=='engineering',
  fire:a=>{a.sfxAt('machinery',a.at('engineering.panel').x,.6);a.run(['+0 screen engineering.panel maintenance for 15s','+0 screen engineering.load signal-bars for 15s']);a.later(2.5,()=>a.say('HOS','AUTONOMOUS MAINTENANCE · CYCLE '+(4100+Math.floor(a.rng()*800))+' · COMPLETE'));}},
 {id:'exterior-beacon',lvl:1,w:2,cd:500,ok:a=>a.room()==='eva'||a.room()==='bridge',
  fire:a=>{a.run(['+0 set signal_strength 0.5 over 3s','+6 set signal_strength 0 over 4s']);a.sfxAt('ping',null,.4);a.later(2,()=>a.say('HOS',a.pick(['BEACON · 0.4 AU · NO REGISTRY','A LIGHT · BEARING 212 · GONE','EXTERNAL SOURCE · ONE PULSE · NONE'])));}},
 /* ---- UNCANNY (§drift level 2): the familiar ship, counting wrong ---- */
 {id:'occupancy',lvl:2,w:3,cd:300,ok:a=>true,fire:a=>{a.say('HOS','OCCUPANCY: 1');a.later(4,()=>a.say('HOS','RECOUNT: 0'));a.sfxAt('blip',null,.3);}},
 {id:'lights-elsewhere',lvl:1,w:2,cd:400,ok:a=>true,fire:a=>{const rooms=['bridge','sensor','comms','crew-quarters','engineering','airlock'].filter(r=>r!==a.room());const r=a.pick(rooms),was=a.roomState(r)||'present-dark';a.run(['+0 room '+r+' powered','+'+(8+a.rng()*8).toFixed(0)+' room '+r+' '+was]);a.sfxAt('breaker',a.at(r+'.door').x,.35);a.later(1.5,()=>{if(a.rng()<.5)a.say('HOS','LIGHTING · '+r.replace(/-/g,' ').toUpperCase()+' · REQUESTED BY: NONE');});}},
 {id:'k9-stares',lvl:2,w:2,cd:300,ok:a=>{const k=a.k9();return !!k&&k.state==='follow'&&a.roomOf('k9')===a.room()&&!a.pos('k9').walk;},fire:a=>{const m=a.pos('k9'),her=a.pos();a.act('k9','signal-detect',4.5,her.x<m.x?'left':'right');a.sfxAt('chirp',m.x,.4);a.later(5,()=>a.act('k9','wait',3,her.x<m.x?'left':'right'));}},
 {id:'name-on-screen',lvl:2,w:1,cd:600,ok:a=>a.room()==='bridge',fire:a=>{a.run(['+0 screen bridge.security personnel for 2.5s','+2.5 screen bridge.security noise for 1s','+3.5 screen bridge.security off']);a.sfxAt('crt',a.map().screens['bridge.security'][0],.6);}},
 {id:'deck-plays',lvl:2,w:1,cd:600,ok:a=>a.room()!=='crew-quarters'&&a.flags().deck_found,fire:a=>{a.say('HOS','AUDIO DECK · TRACK 07 · PLAYING');a.run(['+0 screen quarters.monitor deck for 20s']);a.later(6,()=>a.say('HOS','AUDIO DECK · TRACK 07 · NO SUCH TRACK'));}}
];
function mulberry(seed){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let z=s;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296;};}
function create(api){let rng=mulberry(1),seed=1,next=0,last={};const timers=[];
  const a=Object.assign({},api,{rng:()=>rng(),pick:L=>L[Math.floor(rng()*L.length)],later:(d,fn)=>timers.push({at:api.now()+d,fn})});
  function reset(s){seed=s||((Date.now()/1000)|0);rng=mulberry(seed);last={};next=api.now()+100+rng()*60;timers.length=0;}
  function update(t){for(const T of timers.slice()){if(t>=T.at){timers.splice(timers.indexOf(T),1);try{T.fn();}catch(e){console.error(e);}}}
    if(t<next)return;if(t-next>200){next=t+60+rng()*80;return;}if(!quiet(a)){next=t+8;return;}
    const lv=a.drift?a.drift():0,wt=e=>e.w*(lv>=2&&e.lvl>=1?1.6:1);const el=E.filter(e=>(e.lvl||0)<=lv&&t-(last[e.id]||-1e9)>=e.cd).filter(e=>{try{return e.ok(a);}catch(x){return false;}});next=t+(lv>=2?50+rng()*80:70+rng()*110);if(!el.length)return;
    let r=rng()*el.reduce((s,e)=>s+wt(e),0),ev=el[el.length-1];for(const e of el){if(r<wt(e)){ev=e;break;}r-=wt(e);}last[ev.id]=t;try{ev.fire(a);}catch(x){console.error('event',ev.id,x);}}
  return {update,reset,get seed(){return seed;},state(){return {seed,last:Object.assign({},last)};},restore(s){if(!s)return;reset(s.seed);Object.assign(last,s.last||{});}};}
window.EVENTS={create,LIST:E};
})();
