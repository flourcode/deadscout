/* DeadScout · one reading of a Director manifest for the game and the Director: the project the engine renders,
   the music DNA the band plays, the album that sets the chapter clock. window.DSE */
(function(){
"use strict";
const X=window.LMXS,M=window.LMXM;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const VIBES={calm:{tempo:.15,energy:.25},cruising:{tempo:.5,energy:.5},driving:{tempo:.85,energy:.8},dark:{tempo:.35,energy:.7}},LVL={low:.6,mid:1,high:1.3},AMBL={low:.45,mid:.7,high:1};
const ENERGY={ROUTINE:.35,SIGNAL:.45,SEARCH:.5,CONTACT:.55,INTRUSION:.75,ESCALATION:.8,REALIZATION:.85,AFTERMATH:.45};
/* what the band does per chapter role: a state, and a hero sound now and then */
const ENV={ROUTINE:['normal'],SIGNAL:['normal','comms',{kind:'static'}],SEARCH:['busy','scanner',{}],CONTACT:['normal','discharge',{}],INTRUSION:['failing'],ESCALATION:['failing','stress',{}],REALIZATION:['alert'],AFTERMATH:['abandoned']};
const ROLES=Object.keys(ENERGY);
const beatsIn=list=>{const text=(Array.isArray(list)?list:String(list||'').split('\n')).map(b=>typeof b==='string'?b:CUT.formatBeat(b)).join('\n'),r=CUT.parse(text);r.text=text;return r;};
function project(D){const mu=D.music||{},seed=D.night_watch&&D.night_watch.seed?D.night_watch.seed|0:D.seed?D.seed|0:1+((String(D.title||'').split('').reduce((a,c)=>a*31+c.charCodeAt(0)|0,7)>>>0)%999999);
  const errs=[],p={v:5,rev:1,format:'cutaway',name:String(D.title||'THE SIGNAL').toUpperCase(),year:String(D.year||'2291'),len:Math.max(10,+D.length_minutes||60),location:D.location||'research',seed,style:mu.style||'synthwave',mode:'mix',vibe:mu.vibe||'cruising',
    music:{drums:mu.drums||'mid',synth:mu.synth||'mid',ambience:mu.ambience||'mid',tape:mu.tape||null},al:{tlen:'mid',gap:3},arc:true,brand:Object.assign({intro:D.game?false:'halcyon',outro:D.game?false:'card',line:''},D.brand||{}),motion:D.mode==='night-watch'?'ambient':'low',fxEnergy:'low',cutaway:Object.assign({ship:'deadscout-2',v3:true},D.cutaway||{}),
    game:!!D.game,watch:D.mode==='night-watch',publish:Object.assign({},D.publish||{}),ending:D.ending||null,errs,
    chapters:(D.chapters||[]).slice(0,8).map((c,k)=>{const role=String(c.role||c.title||'').toUpperCase(),r=beatsIn(c.beats);r.errs.forEach(e=>errs.push('CHAPTER '+(k+1)+' LINE '+e.line+': '+e.err));
      return {title:c.title||'CHAPTER '+(k+1),role:ENERGY[role]!=null?role:'ROUTINE',energy:c.energy!=null?clamp(+c.energy,0,1):(ENERGY[role]||.5),beat:c.beat||'',motion:D.mode==='night-watch'?'ambient':'auto',storyMode:c.story_mode,traffic:c.traffic,nominal:c.nominal_minutes?+c.nominal_minutes*60:undefined,beats:r.beats,text:r.text};})};
  if(D.script||D.events){const r=beatsIn(D.script||D.events);p.script=r.beats;p.scriptText=r.text;r.errs.forEach(e=>errs.push('SCRIPT LINE '+e.line+': '+e.err));}
  p.mx=Object.assign({},M.MX0,VIBES[p.vibe]||VIBES.cruising);p.mx.drums=LVL[p.music.drums]||1;['bass','arp','lead','pads'].forEach(k=>p.mx[k]=LVL[p.music.synth]||1);p.mx.amb=p.watch?0:(AMBL[p.music.ambience]||.7);return p;}
function dna(P,extra){const d=X.dnaOf(P.location,P.seed,P.mode);d.style=P.style;d.mx=Object.assign({},M.MX0,P.mx);d.al=Object.assign({},P.al);d.arc={on:true,curve:P.chapters.map(c=>c.energy),n:P.chapters.length,weights:P.chapters.map(c=>c.nominal?c.nominal:1)};d.total=P.len*60;if(extra)Object.assign(d,extra);return d;}
function album(P){const AL=M.album(dna(P),P.seed,P.len*60),TIMES=AL.chapters.map(c=>({start:c.start,end:c.end}));
  if(P.watch||P.game)P.chapters.forEach((c,k)=>{c.nominal=TIMES[k].end-TIMES[k].start;}); /* the game's and the watch's clock is the ship's clock: script times are real seconds */
  return {AL,TIMES,TOTAL:AL.total};}
/* back to a manifest file (what the Director saves and the game can load) */
function manifest(P){return {deadscout_plan:4,title:P.name,year:P.year,length_minutes:P.len,location:P.location,seed:P.seed,game:P.game||undefined,mode:P.watch?'night-watch':undefined,
  music:Object.assign({style:P.style,vibe:P.vibe},P.music),brand:P.brand,format:'cutaway',cutaway:P.cutaway,events:P.script?P.script.map(b=>CUT.formatBeat(b)):undefined,
  chapters:P.chapters.map(c=>({title:c.title,role:c.role,energy:c.energy,beat:c.beat,story_mode:c.storyMode,traffic:c.traffic,nominal_minutes:c.nominal?+(c.nominal/60).toFixed(2):undefined,beats:c.beats.map(b=>CUT.formatBeat(b))})),ending:P.ending||undefined,publish:P.publish};}
window.DSE={project,dna,album,manifest,ENERGY,ENV,ROLES,VIBES,beatsIn};
})();
