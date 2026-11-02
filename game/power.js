/* HALCYON's power: five systems, not enough power for all of them. The model is small on purpose (§18): which systems
   are up, what each one turns on in the world, and the CRT schematic that shows it. Routing is done at panels in
   the ship (later acts); the vertical slice only lights the crew quarters and the bridge security terminal. */
(function(){
"use strict";
const SYS=['bridge','sensors','engineering','archives','airlock'],NAME={bridge:'BRIDGE',sensors:'SENSORS',engineering:'ENGINEERING',archives:'ARCHIVES',airlock:'AIRLOCK'};
const on={bridge:0,sensors:0,engineering:0,archives:0,airlock:0};let budget=2,local={'crew-quarters':0};
/* what a system does to the ship, as beats the game pushes on the timeline */
const EFFECT={
  bridge:{up:['room bridge low-power','screen bridge.left idle-grid','screen bridge.nav idle-grid'],down:['room bridge present-dark','screen bridge.left offline','screen bridge.nav offline']},
  sensors:{up:['room sensor low-power','screen sensor.main waveform','screen sensor.wave signal-bars','screen comms.main idle-grid'],down:['room sensor present-dark','screen sensor.main offline','screen sensor.wave offline','screen comms.main offline']},
  engineering:{up:['room engineering low-power','screen engineering.load signal-bars','set ship_power 0.6 over 8s'],down:['room engineering present-dark','screen engineering.load offline','set ship_power 0.3 over 8s']},
  archives:{up:['screen sensor.archive text-terminal','screen bridge.security idle-grid'],down:['screen sensor.archive offline']},
  airlock:{up:['room airlock low-power','screen airlock.status text-terminal','door airlock-inner closed'],down:['room airlock present-dark','screen airlock.status offline','door airlock-inner locked']}};
function set(sys,v,run){if(!(sys in on))return false;v=v?1:0;if(on[sys]===v)return true;if(v&&SYS.reduce((a,k)=>a+on[k],0)>=budget)return false;on[sys]=v;if(run)run(EFFECT[sys][v?'up':'down'].map(l=>'+0.3 '+l));return true;}
const used=()=>SYS.reduce((a,k)=>a+on[k],0);
/* the schematic: a CRT page with the status list and the ship's rooms as outlines, her position as a dot */
function schematic(c,M,me,roomStates,extra){const W=c.canvas.width,H=c.canvas.height;c.fillStyle='#07100f';c.fillRect(0,0,W,H);c.imageSmoothingEnabled=false;
  const F='400 12px Silk,monospace';c.font=F;c.textBaseline='top';c.fillStyle='#78d8b8';
  c.fillText('HALCYON // SYSTEM STATUS',12,10);c.fillStyle='#2f8a7c';c.fillRect(12,26,W-24,1);
  const rows=[['BRIDGE',on.bridge?'ONLINE':'DARK'],['SENSORS',on.sensors?'ONLINE':'DARK'],['ENGINEERING',on.engineering?'ONLINE':'DARK'],['ARCHIVES',on.archives?'ONLINE':'OFFLINE'],['AIRLOCK',on.airlock?'READY':'LOCKED'],['CREW',local['crew-quarters']?'LOCAL':'DARK']];
  rows.forEach(([k,v],i)=>{c.fillStyle='#78d8b8';c.fillText(k,12,36+i*17);c.fillStyle=v==='ONLINE'||v==='READY'||v==='LOCAL'?'#d8fff0':v==='LOCKED'?'#e8a33a':'#3f7a6c';c.fillText(v,130,36+i*17);});
  c.fillStyle='#78d8b8';c.fillText('POWER '+used()+'/'+budget,12,36+rows.length*17+6);(extra||[]).forEach((s,i)=>{c.fillStyle='#3f7a6c';c.fillText(s,12,36+rows.length*17+23+i*15);});
  if(!M)return;const bx=230,by=36,bw=W-bx-12,bh=H-by-12,k=Math.min(bw/M.w,bh/M.h);c.save();c.translate(bx,by);c.scale(k,k);c.lineWidth=2/k;
  for(const [id,r] of Object.entries(M.rooms)){const st=(roomStates||{})[id]||'',lit=!/present-dark|blackout/.test(st);c.beginPath();r.poly.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fillStyle=lit?'rgba(120,216,184,.22)':'rgba(120,216,184,.05)';c.fill();c.strokeStyle=lit?'#78d8b8':'#2f5a52';c.stroke();}
  for(const [a,b] of M.ladders){c.beginPath();c.moveTo(...M.nodes[a]);c.lineTo(...M.nodes[b]);c.strokeStyle='#2f8a7c';c.stroke();}
  if(me){c.fillStyle='#ffd27a';c.fillRect(me.x-14,me.y-40,28,28);}c.restore();
  c.fillStyle='rgba(0,0,0,.25)';for(let y=0;y<H;y+=3)c.fillRect(0,y,W,1);}
window.POWER={SYS,NAME,on,set,used,get budget(){return budget;},set budget(v){budget=v;},local,schematic,state(){return {on:Object.assign({},on),budget,local:Object.assign({},local)};},
  restore(s){if(!s)return;Object.assign(on,s.on||{});budget=s.budget||budget;Object.assign(local,s.local||{});},reset(){for(const k of SYS)on[k]=0;budget=2;local['crew-quarters']=0;}};
})();
