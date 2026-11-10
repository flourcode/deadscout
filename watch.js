/* Driftnaut · NIGHT WATCH. The ship runs itself: a routine scheduler picks small storylets for the crew (a maintenance
   check, a break in the quarters, an EVA inspection), a micro-event stream keeps the screens and lamps alive, and in
   STRANGE a rare event library adds things nobody explains. Everything comes out as ordinary Director events on the
   shared timeline, from a seed, so a session is coherent and a recorded one is repeatable. Used by the game (index.html)
   and by the studio (a night-watch JSON becomes an episode to render).
   window.NW = {manifest(cfg), schedule(cfg,opts), title(cfg), VIEWS, ACTIVITY, MUSIC, DEFAULTS} */
(function(){
"use strict";
const DEFAULTS={view:'full-ship',activity:'routine',music:null,duration_minutes:30,seed:null,sound_mix:null,indicator:true,clock0:null,era:'2291',scene:'drift'}; /* r39: Night Watch is the crew again; NOW lives in the story */
/* the views come from the world map (world/deadscout-ship.json `views`); OUTER HULL is the exterior art when the ship has one */
const MV=(window.CUT&&CUT.MAP&&CUT.MAP.views)||{},HULL=window.CUT&&CUT.hasExterior&&CUT.hasExterior();
const VIEWS={'full-ship':{name:'FULL SHIP',cam:{camera:'cutaway'}},bridge:{name:'BRIDGE',cam:{camera:'rect',rect:MV.bridge||[40,20,740,190]}},engineering:{name:'ENGINEERING',cam:{camera:'rect',rect:MV.engineering||[20,310,440,510]}},
  'outer-hull':{name:'OUTER HULL',cam:HULL?{camera:'exterior'}:{camera:'rect',rect:MV['outer-hull']||[640,150,960,520]}},auto:{name:'AUTO WATCH'}};
/* r37: the five scenes (and the whole ship). Each is a room, a tape and a light; game/toys.js plays them */
/* r39: the scenes are moods of the whole ship (the camera never moves; the ant farm stays whole). Each lights its room,
   sets the bed and the tape, and sends someone there for a while. */
/* r42: five scenes, each a mood of the whole ship (the camera never moves: the ant farm stays whole) and its tape */
const SCENES={drift:{name:'QUIET DRIFT',music:'space-wave'},engine:{name:'ENGINE ROOM',room:'engineering',music:'engine-sleep',spot:'engineering.panel',pose:'repair',who:'systems',k9:'engineering.pump'},
  sleep:{name:'CABIN',room:'crew-quarters',music:'cabin-warmth',spot:'quarters.table',pose:'stand',who:'pilot',k9:'crew-quarters.bunk'},outer:{name:'OUTER DARK',music:'quiet-engines'},
  busy:{name:'BUSY SHIP',music:'soft-orbit',pace:'busy'}};
const ACTIVITY={quiet:{name:'QUIET',music:'quiet-engines',gap:[480,1200],micro:[180,480],strange:0,echo:0,power:.78,state:'quiet'},routine:{name:'ROUTINE',music:'soft-orbit',gap:[120,480],micro:[80,240],strange:0,echo:0,power:1,state:'normal'},
  busy:{name:'BUSY',music:'slow-current',gap:[25,70],micro:[50,140],strange:0,echo:0,power:1,state:'normal',busy:1,rest:[15,50]}, /* r33: busy town. Everyone has somewhere to be; drones and tubes run often; never an alarm */
  strange:{name:'SIGNALS',music:'space-wave',gap:[60,240],micro:[40,120],strange:1,echo:.04,power:.92,state:'strange'}};
/* r31: quiet and routine happen half as often: long stretches where a room just breathes, so what does happen matters. STRANGE keeps its pace. */
/* r40: the six tapes, one comfortable family (deep.js); the old ids still play their nearest new tape */
const MT=(name,tape)=>({name,style:'deadwave',tape,vibe:'calm',drums:'low',synth:'low',ambience:'mid'});
const MUSIC={'soft-orbit':MT('SOFT ORBIT','soft-orbit'),'space-wave':MT('SPACE WAVE','space-wave'),'warm-transit':MT('WARM TRANSIT','warm-transit'),'night-cruise':MT('NIGHT CRUISE','night-cruise'),'paper-moons':MT('PAPER MOONS','paper-moons'),'slow-dock':MT('SLOW DOCK','slow-dock'),'window-seat':MT('WINDOW SEAT','window-seat'),'blue-hours':MT('BLUE HOURS','blue-hours'),'cocoa-break':MT('COCOA BREAK','cocoa-break'),'far-lights':MT('FAR LIGHTS','far-lights')}; /* r61: the station's ten tracks */
for(const k of ['engine-sleep','engine-room','orbital-cruise'])MUSIC[k]=MUSIC['soft-orbit'];for(const k of ['cabin-warmth','slow-current','quiet-engines','night-shift'])MUSIC[k]=MUSIC['space-wave'];
Object.assign(MUSIC,{drift:MUSIC['soft-orbit'],sleep:MUSIC['space-wave'],'deep-signal':MUSIC['space-wave'],'empty-corridors':MUSIC['space-wave'],'outer-dark':MUSIC['space-wave'],spacewave:MUSIC['space-wave'],cruising:MUSIC['soft-orbit']}); /* old saved choices */
const HOME={pilot:'bridge.helm',systems:'sensor.console',commander:'bridge.command'};
/* the storylets: tiny non-canonical arcs, each ending back at a believable idle */
const STORYLETS=[
 {id:'helm-check',actors:['pilot'],modes:['quiet','routine','strange'],cooldown:600,weight:2,steps:[{actor:'pilot',action:'press-control',for:[16,30]},{actor:'pilot',action:'look-left',for:[4,8]}]},
 {id:'viewport',actors:['pilot'],modes:['quiet','routine','strange'],cooldown:900,weight:2,steps:[{actor:'pilot',move_to:'bridge.window'},{actor:'pilot',action:'look-right',for:[30,90]},{actor:'pilot',move_to:'bridge.helm'}]},
 {id:'nav-pass',actors:['pilot'],modes:['routine','strange'],cooldown:900,weight:1.5,steps:[{actor:'pilot',move_to:'bridge.nav'},{screen:'bridge.nav',mode:'waveform',for:[40,80]},{actor:'pilot',action:'press-control',for:[20,40]},{actor:'pilot',move_to:'bridge.helm'}]},
 {id:'coffee-break',actors:['pilot'],modes:['routine','strange'],cooldown:2400,weight:1,steps:[{actor:'pilot',move_to:'quarters.table'},{actor:'pilot',action:'stand',for:[90,180]},{actor:'pilot',move_to:'bridge.helm'}]},
 {id:'sensor-visit',actors:['pilot'],modes:['routine'],cooldown:1800,weight:.8,steps:[{actor:'pilot',move_to:'sensor.step'},{actor:'pilot',action:'stand',for:[30,60]},{actor:'pilot',move_to:'bridge.helm'}]},
 {id:'diagnostics',actors:['systems'],modes:['quiet','routine','strange'],cooldown:600,weight:2,steps:[{screen:'sensor.main',mode:'waveform',for:[50,90]},{screen:'sensor.wave',mode:'signal-bars',for:[50,90]},{actor:'systems',action:'lean-forward',for:[10,20]},{actor:'systems',action:'look-up',for:[5,9]}]},
 {id:'printer',actors:['systems'],modes:['quiet','routine','strange'],cooldown:900,weight:1.5,steps:[{actor:'systems',move_to:'sensor.printer'},{actor:'systems',action:'stand',for:[15,30]},{actor:'systems',move_to:'sensor.console'}]},
 {id:'archive',actors:['systems'],modes:['routine','strange'],cooldown:1200,weight:1,steps:[{actor:'systems',move_to:'sensor.rack'},{screen:'sensor.archive',mode:'text-terminal',for:[40,70]},{actor:'systems',action:'stand',for:[25,45]},{actor:'systems',move_to:'sensor.console'}]},
 {id:'maintenance-check',actors:['systems'],modes:['routine','strange'],cooldown:1500,weight:2.2,steps:[{actor:'systems',move_to:'engineering.panel'},{actor:'systems',action:'repair',for:[30,50]},{object:'engineering-terminal-03',state:'maintenance'},{actor:'systems',move_to:'engineering.pump'},{actor:'systems',action:'kneel',for:[25,45]},{actor:'systems',move_to:'sensor.console'}]},
 {id:'utility-run',actors:['systems'],modes:['routine','strange'],cooldown:1800,weight:1.2,steps:[{actor:'systems',move_to:'utility.bench'},{actor:'systems',action:'repair',for:[40,80]},{object:'utility-terminal',state:'maintenance'},{actor:'systems',move_to:'utility.shelf'},{actor:'systems',action:'stand',for:[10,20]},{actor:'systems',move_to:'sensor.console'}]},
 {id:'quiet-check',actors:['systems'],modes:['quiet'],cooldown:1500,weight:1,steps:[{actor:'systems',move_to:'utility.bench'},{actor:'systems',action:'repair',for:[60,120]},{actor:'systems',move_to:'sensor.console'}]},
 {id:'tunnel-check',actors:['systems'],modes:['routine','strange'],cooldown:3000,weight:.7,steps:[{actor:'systems',move_to:'tunnel.mid'},{actor:'systems',action:'kneel',for:[40,70]},{actor:'systems',move_to:'sensor.console'}]},
 {id:'bridge-observe',actors:['commander'],modes:['quiet','routine','strange'],cooldown:600,weight:2,steps:[{actor:'commander',move_to:'bridge.window'},{actor:'commander',action:'observe',for:[40,90]},{actor:'commander',move_to:'bridge.command'}]},
 {id:'walk-the-ship',actors:['commander'],modes:['routine','strange'],cooldown:1500,weight:2,steps:[{actor:'commander',move_to:'upper.mid'},{actor:'commander',action:'look-around',for:[15,30]},{actor:'commander',move_to:'quarters.locker'},{actor:'commander',action:'idle',for:[30,60]},{actor:'commander',move_to:'bridge.command'}]},
 {id:'airlock-check',actors:['commander'],modes:['routine','strange'],cooldown:2400,weight:1.2,steps:[{actor:'commander',move_to:'airlock.prep'},{actor:'commander',action:'idle',for:[20,40]},{screen:'airlock.status',mode:'text-terminal',for:[40,60]},{actor:'commander',move_to:'airlock.reel'},{actor:'commander',action:'inspect',for:[20,30]},{actor:'commander',move_to:'bridge.command'}]},
 {id:'eva-inspection',actors:['commander'],modes:['routine'],cooldown:3600,weight:.6,steps:[{actor:'commander',move_to:'airlock.outer'},{airlock:'cycle-out'},{wait:14},{actor:'commander',move_to:'eva.edge'},{actor:'commander',action:'observe',for:[90,150]},{actor:'commander',move_to:'airlock.outer'},{airlock:'cycle-in'},{wait:14},{actor:'commander',move_to:'bridge.command'}]},
 {id:'engineering-inspect',actors:['commander'],modes:['routine','strange'],cooldown:2400,weight:1.2,steps:[{actor:'commander',move_to:'engineering.reactor'},{actor:'commander',action:'inspect',for:[40,70]},{actor:'commander',move_to:'engineering.catwalk'},{actor:'commander',action:'observe',for:[30,50]},{actor:'commander',move_to:'bridge.command'}]},
 {id:'rest',actors:['commander'],modes:['quiet','routine','strange'],cooldown:2400,weight:.8,steps:[{actor:'commander',move_to:'quarters.table'},{actor:'commander',action:'idle',for:[120,240]},{actor:'commander',move_to:'bridge.command'}]},
 /* r33 · THE SHIP'S DAY. `when` follows your local clock: meals at breakfast, lunch and dinner, off-duty in the evening,
    and at night two of the crew sleep (the bunk shows them) while one keeps the watch. `par` runs its lanes at once. */
 {id:'breakfast',when:'meal',actors:['pilot','systems'],modes:['quiet','routine'],cooldown:3000,weight:2,steps:[{par:[[{actor:'pilot',move_to:'quarters.table'},{actor:'pilot',action:'stand',for:[110,200]}],[{actor:'systems',move_to:'quarters.terminal'},{actor:'systems',action:'stand',for:[40,70]},{actor:'systems',move_to:'quarters.locker'},{actor:'systems',action:'stand',for:[40,90]}]]},{par:[[{actor:'pilot',move_to:'bridge.helm'}],[{actor:'systems',move_to:'sensor.console'}]]}]},
 {id:'meal-commander',when:'meal',actors:['commander'],modes:['quiet','routine'],cooldown:3000,weight:1.6,steps:[{actor:'commander',move_to:'quarters.terminal'},{actor:'commander',action:'idle',for:[120,220]},{actor:'commander',move_to:'bridge.command'}]},
 {id:'cards',when:'off',actors:['pilot','commander'],modes:['routine'],cooldown:3600,weight:1.4,steps:[{par:[[{actor:'pilot',move_to:'quarters.table'},{actor:'pilot',action:'stand',for:[200,360]}],[{actor:'commander',move_to:'quarters.terminal'},{actor:'commander',action:'idle',for:[200,360]}]]},{par:[[{actor:'pilot',move_to:'bridge.helm'}],[{actor:'commander',move_to:'bridge.command'}]]}]},
 {id:'comms-shift',when:'day',actors:['pilot'],modes:['routine'],cooldown:1800,weight:1.4,steps:[{actor:'pilot',move_to:'comms.chair'},{actor:'pilot',action:'typing',for:[90,200]},{actor:'pilot',move_to:'bridge.helm'}]},
 {id:'coffee-run',when:'day',actors:['pilot'],modes:['quiet','routine'],cooldown:2000,weight:1.2,steps:[{actor:'pilot',move_to:'comms.right'},{actor:'pilot',action:'stand',for:[8,14]},{carry:'pilot',prop:'mug'},{actor:'pilot',move_to:'bridge.helm'},{actor:'pilot',action:'sit',for:[40,80]},{carry:'pilot',prop:null}]},
 {id:'supply-run',when:'day',actors:['systems'],modes:['routine'],cooldown:1800,weight:1.8,steps:[{actor:'systems',move_to:'service.end'},{actor:'systems',action:'kneel',for:[8,14]},{carry:'systems',prop:'crate'},{actor:'systems',move_to:'engineering.pump'},{carry:'systems',prop:null},{actor:'systems',action:'kneel',for:[30,60]},{actor:'systems',move_to:'sensor.console'}]},
 {id:'tablet-rounds',when:'day',actors:['commander'],modes:['routine'],cooldown:2400,weight:1.4,steps:[{carry:'commander',prop:'tablet'},{actor:'commander',move_to:'engineering.reactor'},{actor:'commander',action:'inspect',for:[30,50]},{actor:'commander',move_to:'airlock.console'},{actor:'commander',action:'idle',for:[20,40]},{carry:'commander',prop:null},{actor:'commander',move_to:'bridge.command'}]},
 {id:'window-break',when:'off',actors:['systems'],modes:['quiet','routine'],cooldown:2400,weight:1,steps:[{actor:'systems',move_to:'upper-access.window'},{actor:'systems',action:'look-up',for:[40,90]},{actor:'systems',move_to:'sensor.console'}]},
 {id:'quiet-round',actors:['commander'],modes:['quiet'],cooldown:1800,weight:1,steps:[{actor:'commander',move_to:'junction.mid'},{actor:'commander',action:'idle',for:[40,80]},{actor:'commander',move_to:'bridge.command'}]}];
/* the strange library: three to begin with, each unresolved */
const STRANGE=[
 {id:'empty-lift',weight:1,steps:[{mystery:'lift-ghost'}]},
 {id:'ghost-shift',weight:1,steps:[{echo:'bridge',preset:'scout',for:2.5}]},
 {id:'unregistered-signal',weight:1.2,steps:[{set:{signal_strength:.85},over:8},{screen:'sensor.main',mode:'signal',for:38},{wait:40},{set:{signal_strength:0},over:6},{screen:'sensor.main',mode:'noise',for:4}]},
 {id:'hatch-opens',weight:.7,steps:[{door:'maint-hatch',state:'open'},{wait:28},{door:'maint-hatch',state:'closed'}]},
 {id:'console-chirp',weight:.8,steps:[{screen:'sensor.main',mode:'signal-bars',for:20},{echo:'sensor',preset:'crew-routine',for:3}]},
 {id:'far-melody',weight:.7,steps:[{set:{signal_strength:.5},over:6},{screen:'quarters.monitor',mode:'waveform',for:30},{wait:30},{set:{signal_strength:0},over:8}]}];
const SCREENS_CALM=['bridge.left2','bridge.side','sensor.small','sensor.bank1','sensor.bank2','quarters.monitor','engineering.panel','engineering.load']; /* every id is a screen the map has (r22 named two that were not, and those beats were dropped) */
const MODES_CALM=['idle-grid','waveform','text-terminal','signal-bars'];
function rng(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const pick=(r,list,w)=>{const tot=list.reduce((s,x,i)=>s+(w?w(x,i):1),0);let u=r()*tot;for(const [i,x] of list.entries()){u-=w?w(x,i):1;if(u<=0)return x;}return list[list.length-1];};
const span=(r,v)=>Array.isArray(v)?v[0]+r()*(v[1]-v[0]):+v;
/* r33: the ship's day. A storylet's `when` against the local hour at that moment of the watch: how much more (or less) likely it is */
const BAND=h=>h>=23||h<6?'night':(h>=6.5&&h<8.5)||(h>=12&&h<13.5)||(h>=18&&h<19.5)?'meal':h>=19.5?'off':'day';
const WHEN={meal:{meal:5,day:.25,off:.5,night:.1},off:{off:2.6,day:.55,meal:.4,night:.3},day:{day:1.2,meal:.5,off:.5,night:.35},night:{night:14,day:0,meal:0,off:.08}};
/* ---------- the schedule ---------- */
function schedule(cfg,opts){cfg=Object.assign({},DEFAULTS,cfg||{});opts=opts||{};const A=ACTIVITY[cfg.activity]||ACTIVITY.routine,total=cfg.duration_minutes*60,from=opts.from||0,r=rng((cfg.seed|0)+(opts.from?Math.floor(opts.from)*7919:0)+(opts.only?13:0));
  const NOW=cfg.era!=='2291',actors=opts.only?[opts.only]:(NOW||cfg.solo)?[]:['pilot','systems','commander'],ev=[],at={},free={},last={};
  if(NOW&&!opts.from){for(const a of ['pilot','systems','commander'])ev.push({at:0,hide:a});ev.push({at:0,show:'deadscout'});}
  if(cfg.solo&&!NOW&&!opts.from)for(const a of ['pilot','systems','commander','deadscout'])ev.push({at:0,hide:a}); /* she is drawn by game/naut.js in her own suit */ /* r66: one keeper and a dog. The ship was built for more; nobody else is aboard */ /* r37 NOW: the ship as it is; only Driftnaut and K9 aboard (toys.js moves her) */
  for(const a of actors){at[a]=(opts.at&&opts.at[a])||HOME[a];free[a]=from+(opts.only?2:20+r()*60);}
  const travel=(a,to)=>window.CUT?CUT.travelTime(a,at[a],to):20;
  const clock0=cfg.clock0||Date.now(),hourAt=t=>{const d=new Date(clock0+t*1000);return d.getHours()+d.getMinutes()/60;},props=[],busyM=!!A.busy,MODE=busyM?'routine':cfg.activity;
  const quietEnd=total-300;   /* the last five minutes: nobody starts anything, the ship settles */
  const run=(st,t0,a0)=>{const busy=new Set(st.actors||[]);const t=seq(st.steps,t0);const rest=A.rest||[60,180];for(const a of busy)free[a]=t+span(r,rest);return t;};
  const seq=(steps,t)=>{
    for(const s of steps){if(s.wait){t+=span(r,s.wait);continue;}
      if(s.par){let e=t;for(const lane of s.par)e=Math.max(e,seq(lane,t));t=e;continue;}
      if(s.carry){props.push({at:t,carry:s.carry,prop:s.prop});continue;}
      if(s.bunk){const d=span(r,s.for||[120,240])*(busyM&&s.kind==='sleep'?.4:1);ev.push({at:t+1,hide:s.bunk});props.push({at:t+1,bunk:s.bunk,kind:s.kind||'sleep',until:t+1+d});ev.push({at:t+1+d,show:s.bunk});t+=d+3;continue;}
      if(s.move_to){const d=travel(s.actor,s.move_to);ev.push({at:t,actor:s.actor,move_to:s.move_to});t+=d+1;at[s.actor]=s.move_to;continue;}
      if(s.action){const d=span(r,s.for||[10,20]);ev.push({at:t,actor:s.actor,action:s.action,for:Math.round(d)});t+=d+.5;continue;}
      if(s.screen){ev.push({at:t,screen:s.screen,mode:s.mode,for:Math.round(span(r,s.for||30))});continue;}
      if(s.object){ev.push({at:t,object:s.object,state:s.state});continue;}
      if(s.airlock){ev.push({at:t,airlock:s.airlock});continue;}
      if(s.door){ev.push({at:t,door:s.door,state:s.state});continue;}
      if(s.room){ev.push({at:t,room:s.room,state:s.state});continue;}
      if(s.mystery){ev.push({at:t,mystery:s.mystery});continue;}
      if(s.echo){ev.push({at:t,echo:s.echo,preset:s.preset||'crew-routine',for:s.for||3});continue;}
      if(s.set){for(const [k,v] of Object.entries(s.set)){const val=typeof v==='string'&&v[0]==='+'?{inc:+v.slice(1)}:+v;ev.push({at:t,set:{[k]:val},over:s.over||0});}continue;}}
    return t;};
  /* storylets, one at a time across the ship, at the activity's pace */
  let t=from+(opts.only?1:30+r()*60);
  while(actors.length&&t<quietEnd){const ready=actors.filter(a=>free[a]<=t);if(!ready.length){t=Math.min(...actors.map(a=>free[a]));continue;}
    const band=BAND(hourAt(t)),wOf=s=>s.weight*(s.actors[0]==='systems'?1.3:1)*(s.when?WHEN[s.when][band]:(band==='night'?.6:1))*(busyM&&s.when==='night'?.25:1);
    const cands=STORYLETS.filter(s=>s.modes.includes(MODE)&&s.actors.every(a=>ready.includes(a))&&(last[s.id]==null||t-last[s.id]>s.cooldown)&&wOf(s)>0);
    if(!cands.length){t+=30;continue;}
    const st=pick(r,cands,wOf);last[st.id]=t;run(st,t);t+=span(r,A.gap)*(band==='night'&&!busyM?1.4:1);}
  if(!opts.only){
    /* micro-events: a screen changes, a lamp misses a beat */
    for(let m=from+40+r()*60;m<quietEnd;m+=span(r,A.micro)){const u=r();
      if(u<.75){const sc=pick(r,SCREENS_CALM);ev.push({at:m,screen:sc,mode:pick(r,MODES_CALM),for:Math.round(30+r()*60)});}
      else if(cfg.activity==='strange'){const room=pick(r,['upper','passage','junction','tunnel']);ev.push({at:m,room,state:'flicker'});ev.push({at:m+10+r()*15,room,state:'normal'});}}
    /* the strange library, rarely */
    if(A.strange)for(let m=from+360+r()*300;m<quietEnd;m+=400+r()*500){const st=pick(r,STRANGE,s=>s.weight);run(st,m,null);}
    if(A.echo)for(let m=from+600+r()*600;m<quietEnd;m+=900+r()*1800){if(r()<A.echo*20)ev.push({at:m,echo:pick(r,['bridge','sensor','quarters']),preset:'scout',for:2});}
    /* the watch: which part of the ship, and when it drifts elsewhere */
    const V=VIEWS[cfg.view]||VIEWS['full-ship'];if(!cfg.view)cfg.view='full-ship';
    if(cfg.view==='auto'){let m=from;const order=['full-ship','bridge','engineering','full-ship','outer-hull'];let i=0;while(m<total){const v=order[i++%order.length];ev.push(Object.assign({at:m},VIEWS[v].cam));m+=(v==='full-ship'?900:480)+r()*240;}}
    else ev.push(Object.assign({at:from},V.cam));
    if(!opts.from){ev.push({at:0,set:{ship_power:A.power},over:0});
      /* the gentle end: four minutes of settling, then dark */
      if(cfg.duration_minutes<300){ev.push({at:total-240,set:{ship_power:.32},over:200});ev.push({at:total-30,set:{ship_power:.1},over:28});}}}
  ev.sort((p,q)=>p.at-q.at);props.sort((p,q)=>p.at-q.at);ev.props=props;return ev;}
/* ---------- a manifest the studio and the game both read ---------- */
function manifest(cfg){cfg=Object.assign({},DEFAULTS,cfg||{});if(cfg.seed==null)cfg.seed=22910000+Math.floor(Math.random()*89999);if(cfg.clock0==null)cfg.clock0=Date.now();let EV;const A=ACTIVITY[cfg.activity]||ACTIVITY.routine,mu=MUSIC[cfg.music||(SCENES[cfg.scene]&&SCENES[cfg.scene].music)||A.music]||MUSIC.drift;
  const mins=Math.max(10,+cfg.duration_minutes||30),n=Math.max(3,Math.min(8,Math.round(mins/10))),per=mins/n;
  return {deadscout_plan:4,format:'cutaway',mode:'night-watch',night_watch:cfg,title:'NIGHT WATCH',year:'2291',length_minutes:mins,location:'research',
    cutaway:{ship:'deadscout-2',v3:true,era:cfg.era==='2291'?'past':'present',start:Object.assign({deadscout:(SCENES[cfg.scene]&&SCENES[cfg.scene].spot)||'quarters.table'},HOME),rooms:cfg.era==='2291'?undefined:{bridge:'powered',sensor:'powered','upper-access':'powered',comms:'powered','crew-quarters':'powered','central-shaft':'powered',engineering:'powered',service:'powered','lower-access':'powered',airlock:'powered'}},
    music:{mode:'generated',style:mu.style,tape:mu.tape,vibe:mu.vibe,drums:mu.drums,synth:mu.synth,ambience:mu.ambience},
    chapters:Array.from({length:n},(_,k)=>({title:'WATCH '+(k+1),role:'ROUTINE',energy:cfg.activity==='quiet'?.22:cfg.activity==='strange'?.4:cfg.activity==='busy'?.36:.32,beat:'The ship on its night watch.',story_mode:'EXPLORE',traffic:'off',nominal_minutes:per,beats:[]})),
    events:(EV=schedule(cfg)),props:EV.props,ending:{type:'resolved',outro:'fade'},publish:{title:title(cfg),subtitle:'DSV HALCYON • '+mu.name+' • Living Spaceship • Ambient',series:'Driftnaut Night Watch',ship:'DSV HALCYON',registry:'DSV-0417'}};}
function title(cfg){cfg=Object.assign({},DEFAULTS,cfg||{});const A=ACTIVITY[cfg.activity]||ACTIVITY.routine,mu=MUSIC[cfg.music||(SCENES[cfg.scene]&&SCENES[cfg.scene].music)||A.music]||MUSIC.drift,V=VIEWS[cfg.view]||VIEWS['full-ship'],mins=+cfg.duration_minutes||30;
  const dur=mins>=300?'ENDLESS':mins>=120?Math.round(mins/60)+' HOURS':mins>=60?'1 HOUR':mins+' MINUTES';
  const where='DRIFTNAUT // '+(SCENES[cfg.scene]?SCENES[cfg.scene].name:'NIGHT WATCH');
  const tail={quiet:'A SHIP AT REST · DEEP SPACE AMBIENT',busy:'BUSY TOWN ON A LIVING SPACESHIP',strange:'FAINT SIGNALS ON A QUIET SHIP'}[cfg.activity]||'SPACE CHILL FOR FOCUS & STUDY';
  return where+' · '+dur+' · '+mu.name+' TAPE · '+tail;}
window.NW={manifest,schedule,title,VIEWS,SCENES,ACTIVITY,MUSIC,DEFAULTS,STORYLETS,STRANGE};
})();
