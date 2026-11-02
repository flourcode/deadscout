/* DeadScout · NIGHT WATCH. The ship runs itself: a routine scheduler picks small storylets for the crew (a maintenance
   check, a break in the quarters, an EVA inspection), a micro-event stream keeps the screens and lamps alive, and in
   STRANGE a rare event library adds things nobody explains. Everything comes out as ordinary Director events on the
   shared timeline, from a seed, so a session is coherent and a recorded one is repeatable. Used by the game (play.html)
   and by the studio (a night-watch JSON becomes an episode to render).
   window.NW = {manifest(cfg), schedule(cfg,opts), title(cfg), VIEWS, ACTIVITY, MUSIC, DEFAULTS} */
(function(){
"use strict";
const DEFAULTS={view:'full-ship',activity:'routine',music:null,duration_minutes:30,seed:null,sound_mix:null,indicator:true};
/* the views come from the world map (world/deadscout-ship.json `views`); OUTER HULL is the exterior art when the ship has one */
const MV=(window.CUT&&CUT.MAP&&CUT.MAP.views)||{},HULL=window.CUT&&CUT.hasExterior&&CUT.hasExterior();
const VIEWS={'full-ship':{name:'FULL SHIP',cam:{camera:'cutaway'}},bridge:{name:'BRIDGE',cam:{camera:'rect',rect:MV.bridge||[40,20,740,190]}},engineering:{name:'ENGINEERING',cam:{camera:'rect',rect:MV.engineering||[20,310,440,510]}},
  'outer-hull':{name:'OUTER HULL',cam:HULL?{camera:'exterior'}:{camera:'rect',rect:MV['outer-hull']||[640,150,960,520]}},auto:{name:'AUTO WATCH'}};
const ACTIVITY={quiet:{name:'QUIET',music:'sleep',gap:[240,600],micro:[90,240],strange:0,echo:0,power:.78,state:'quiet'},routine:{name:'ROUTINE',music:'drift',gap:[60,240],micro:[40,120],strange:0,echo:.004,power:1,state:'normal'},
  strange:{name:'STRANGE',music:'deep-signal',gap:[60,240],micro:[40,120],strange:1,echo:.04,power:.92,state:'strange'}};
const MUSIC={drift:{name:'DRIFT',style:'deadwave',tape:'orbital-cruise',vibe:'calm',drums:'low',synth:'low',ambience:'mid'},sleep:{name:'SLEEP',style:'deadwave',tape:'night-shift',vibe:'calm',drums:'low',synth:'low',ambience:'low'},spacewave:{name:'SPACEWAVE',style:'spacewave',vibe:'cruising',drums:'mid',synth:'mid',ambience:'low'},
  'deep-signal':{name:'DEEP SIGNAL',style:'deadwave',tape:'deep-signal',vibe:'dark',drums:'low',synth:'mid',ambience:'low'},'outer-dark':{name:'OUTER DARK',style:'deadwave',tape:'outer-dark',vibe:'dark',drums:'low',synth:'low',ambience:'low'},'empty-corridors':{name:'EMPTY CORRIDORS',style:'deadwave',tape:'empty-corridors',vibe:'calm',drums:'low',synth:'low',ambience:'low'},cruising:{name:'CRUISING',style:'synthwave',vibe:'cruising',drums:'mid',synth:'mid',ambience:'low'}};
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
 {id:'rest',actors:['commander'],modes:['quiet','routine','strange'],cooldown:2400,weight:.8,steps:[{actor:'commander',move_to:'quarters.table'},{actor:'commander',action:'sit',for:[120,240]},{actor:'commander',move_to:'bridge.command'}]},
 {id:'quiet-round',actors:['commander'],modes:['quiet'],cooldown:1800,weight:1,steps:[{actor:'commander',move_to:'junction.mid'},{actor:'commander',action:'idle',for:[40,80]},{actor:'commander',move_to:'bridge.command'}]}];
/* the strange library: three to begin with, each unresolved */
const STRANGE=[
 {id:'empty-lift',weight:1,steps:[{mystery:'lift-ghost'}]},
 {id:'ghost-shift',weight:1,steps:[{echo:'bridge',preset:'scout',for:2.5}]},
 {id:'unregistered-signal',weight:1.2,steps:[{set:{signal_strength:.85},over:8},{screen:'sensor.main',mode:'signal',for:38},{wait:40},{set:{signal_strength:0},over:6},{screen:'sensor.main',mode:'noise',for:4}]},
 {id:'hatch-opens',weight:.7,steps:[{door:'maint-hatch',state:'open'},{wait:28},{door:'maint-hatch',state:'closed'}]},
 {id:'lower-deck-dark',weight:.6,steps:[{room:'engineering',state:'blackout'},{wait:22},{room:'engineering',state:'normal'}]},
 {id:'slight-growth',weight:.4,steps:[{set:{contamination_level:'+.35'},over:60}]}];
const SCREENS_CALM=['bridge.left2','bridge.side','sensor.small','sensor.bank1','sensor.bank2','utility.diag','engineering.flow','engineering.load'];
const MODES_CALM=['idle-grid','waveform','text-terminal','signal-bars'];
function rng(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const pick=(r,list,w)=>{const tot=list.reduce((s,x,i)=>s+(w?w(x,i):1),0);let u=r()*tot;for(const [i,x] of list.entries()){u-=w?w(x,i):1;if(u<=0)return x;}return list[list.length-1];};
const span=(r,v)=>Array.isArray(v)?v[0]+r()*(v[1]-v[0]):+v;
/* ---------- the schedule ---------- */
function schedule(cfg,opts){cfg=Object.assign({},DEFAULTS,cfg||{});opts=opts||{};const A=ACTIVITY[cfg.activity]||ACTIVITY.routine,total=cfg.duration_minutes*60,from=opts.from||0,r=rng((cfg.seed|0)+(opts.from?Math.floor(opts.from)*7919:0)+(opts.only?13:0));
  const actors=opts.only?[opts.only]:['pilot','systems','commander'],ev=[],at={},free={},last={};
  for(const a of actors){at[a]=(opts.at&&opts.at[a])||HOME[a];free[a]=from+(opts.only?2:20+r()*60);}
  const travel=(a,to)=>window.CUT?CUT.travelTime(a,at[a],to):20;
  const quietEnd=total-300;   /* the last five minutes: nobody starts anything, the ship settles */
  const run=(st,t0,a0)=>{let t=t0;const busy=new Set(st.actors);
    for(const s of st.steps){if(s.wait){t+=span(r,s.wait);continue;}
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
    for(const a of busy)free[a]=t+60+r()*120;return t;};
  /* storylets, one at a time across the ship, at the activity's pace */
  let t=from+(opts.only?1:30+r()*60);
  while(t<quietEnd){const ready=actors.filter(a=>free[a]<=t);if(!ready.length){t=Math.min(...actors.map(a=>free[a]));continue;}
    const cands=STORYLETS.filter(s=>s.modes.includes(cfg.activity)&&s.actors.every(a=>ready.includes(a))&&(last[s.id]==null||t-last[s.id]>s.cooldown));
    if(!cands.length){t+=30;continue;}
    const st=pick(r,cands,s=>s.weight*(s.actors[0]==='systems'?1.3:1));last[st.id]=t;run(st,t);t+=span(r,A.gap);}
  if(!opts.only){
    /* micro-events: a screen changes, a lamp misses a beat */
    for(let m=from+40+r()*60;m<quietEnd;m+=span(r,A.micro)){const u=r();
      if(u<.75){const sc=pick(r,SCREENS_CALM);ev.push({at:m,screen:sc,mode:pick(r,MODES_CALM),for:Math.round(30+r()*60)});}
      else if(cfg.activity!=='quiet'){const room=pick(r,['upper','passage','junction','tunnel']);ev.push({at:m,room,state:'flicker'});ev.push({at:m+10+r()*15,room,state:'normal'});}}
    /* the strange library, rarely */
    if(A.strange)for(let m=from+360+r()*300;m<quietEnd;m+=400+r()*500){const st=pick(r,STRANGE,s=>s.weight);run(st,m,null);}
    if(A.echo)for(let m=from+600+r()*600;m<quietEnd;m+=900+r()*1800){if(r()<A.echo*20)ev.push({at:m,echo:pick(r,['bridge','sensor','quarters']),preset:'scout',for:2});}
    /* the watch: which part of the ship, and when it drifts elsewhere */
    const V=VIEWS[cfg.view]||VIEWS['full-ship'];
    if(cfg.view==='auto'){let m=from;const order=['full-ship','bridge','engineering','full-ship','outer-hull'];let i=0;while(m<total){const v=order[i++%order.length];ev.push(Object.assign({at:m},VIEWS[v].cam));m+=(v==='full-ship'?900:480)+r()*240;}}
    else ev.push(Object.assign({at:from},V.cam));
    if(!opts.from){ev.push({at:0,set:{ship_power:A.power},over:0});
      /* the gentle end: four minutes of settling, then dark */
      if(cfg.duration_minutes<300){ev.push({at:total-240,set:{ship_power:.32},over:200});ev.push({at:total-30,set:{ship_power:.1},over:28});}}}
  ev.sort((p,q)=>p.at-q.at);return ev;}
/* ---------- a manifest the studio and the game both read ---------- */
function manifest(cfg){cfg=Object.assign({},DEFAULTS,cfg||{});if(cfg.seed==null)cfg.seed=22910000+Math.floor(Math.random()*89999);const A=ACTIVITY[cfg.activity]||ACTIVITY.routine,mu=MUSIC[cfg.music||A.music]||MUSIC.spacewave;
  const mins=Math.max(10,+cfg.duration_minutes||30),n=Math.max(3,Math.min(8,Math.round(mins/10))),per=mins/n;
  return {deadscout_plan:4,format:'cutaway',mode:'night-watch',night_watch:cfg,title:'NIGHT WATCH',year:'2291',length_minutes:mins,location:'research',
    cutaway:{ship:'deadscout-2',v3:true,era:'past',start:Object.assign({},HOME)},
    music:{mode:'generated',style:mu.style,tape:mu.tape,vibe:mu.vibe,drums:mu.drums,synth:mu.synth,ambience:mu.ambience},
    chapters:Array.from({length:n},(_,k)=>({title:'WATCH '+(k+1),role:'ROUTINE',energy:cfg.activity==='quiet'?.22:cfg.activity==='strange'?.4:.32,beat:'The ship on its night watch.',story_mode:'EXPLORE',traffic:'off',nominal_minutes:per,beats:[]})),
    events:schedule(cfg),ending:{type:'resolved',outro:'fade'},publish:{title:title(cfg),subtitle:'DSV HALCYON • '+mu.name+' • Living Spaceship • Ambient',series:'DeadScout Night Watch',ship:'DSV HALCYON',registry:'DSV-0417'}};}
function title(cfg){cfg=Object.assign({},DEFAULTS,cfg||{});const A=ACTIVITY[cfg.activity]||ACTIVITY.routine,mu=MUSIC[cfg.music||A.music]||MUSIC.spacewave,V=VIEWS[cfg.view]||VIEWS['full-ship'],mins=+cfg.duration_minutes||30;
  const dur=mins>=300?'ENDLESS':mins>=120?Math.round(mins/60)+' HOURS':mins>=60?'1 HOUR':mins+' MINUTES';
  const where=cfg.view==='full-ship'||cfg.view==='auto'?'DEADSCOUT NIGHT WATCH':V.name+' WATCH';
  const tail=cfg.activity==='quiet'?'A SHIP AT REST':cfg.activity==='strange'?'SOMETHING IS WRONG WITH THE SHIP':'A LIVING SPACESHIP';
  return where+' // '+dur+' '+mu.name+' + '+tail;}
window.NW={manifest,schedule,title,VIEWS,ACTIVITY,MUSIC,DEFAULTS,STORYLETS,STRANGE};
})();
