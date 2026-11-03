/* DeadScout · K9 ROUTES (release 31). K9-4 is a ship resident with its own ways round the ship, not a follower.
     HUMAN ROUTES  doors · ladders · the airlock · EVA                     (cut.js's walk graph)
     K9 ROUTES     doors · the deck it is on · ONE maintenance chute
   The chute joins the middle deck (a hatch low in engineering's west wall, by the shaft) to the lower deck (a hatch at
   the east end of the service tunnel). The upper deck (bridge, sensor, comms) has no K9 route at all.
   One rule is absolute: K9 never climbs a human ladder. If there is no K9 route, K9 waits. Nothing teleports in view:
   in the chute K9 is out of sight behind the wall, and you hear it (servo steps, a hatch) before it crawls out.
   window.K9NAV.go(target, opts) -> {secs} | null (unreachable). target: a place ref ('crew-quarters.bunk') or {x,y}. */
(function(){
"use strict";
const M=window.CUT&&CUT.MAP;if(!M)return;
const DECKS=(M.k9&&M.k9.decks)||{upper:[0,572],mid:[572,864],lower:[864,1332]};
const CHUTE={mid:{x:1456,y:846,hatch:[1445,828,1467,844]},lower:{x:1128,y:1119,hatch:[1117,1101,1139,1117]},secs:6.5};
const deck=y=>{for(const [k,[a,b]] of Object.entries(DECKS))if(y>=a&&y<b)return k;return 'mid';};
const route=(a,b)=>a===b?'walk':((a==='mid'&&b==='lower')||(a==='lower'&&b==='mid'))?'chute':null;
const G=()=>window.__game;
const ref=(x,y)=>{try{const g=G(),h=CUT.pick(g.P,g.TIMES,g.now(),x,y-4);return h&&h.type==='place'?h.ref:null;}catch(e){return null;}};
const posOf=t=>typeof t==='string'?(CUT.place(t)||null):t;
let busyUntil=0;const busy=()=>performance.now()<busyUntil;
const N={CHUTE,deck,route,busy,open:{mid:0,lower:0},
  /* can K9 get from where it is to this place? */
  reach(target){const g=G(),k=CUT.actorAt(g.P,g.TIMES,g.now(),'k9'),p=posOf(target);return !!(k&&p&&route(deck(k.y),deck(p.y)));},
  go(target,opts){opts=opts||{};const g=G();if(!g||!g.P)return null;if(busy()&&!opts.force)return null;
    const k=CUT.actorAt(g.P,g.TIMES,g.now(),'k9'),p=posOf(target);if(!k||!p)return null;
    const to=typeof target==='string'?target:ref(p.x,p.y);if(!to)return null;
    const dk=deck(k.y),dt=deck(p.y),how=route(dk,dt);if(!how)return null;   /* no K9 route: it waits */
    const here=CUT.hereRef(g.P,g.TIMES,g.now(),'k9');
    if(how==='walk'){g.beat({move:'k9',to,interrupt:true,fast:!!opts.fast});return {secs:(CUT.travelTime('k9',here,to)||0)/(opts.fast?1.4:1)};}
    /* the chute: walk to the hatch, the hatch opens, K9 goes in; out of sight it crosses (heard, not seen); the far hatch opens, it crawls out, walks on */
    const h0=CHUTE[dk],h1=CHUTE[dt],r0=ref(h0.x,h0.y),r1=ref(h1.x,h1.y);if(!r0||!r1)return null;
    const t1=(CUT.travelTime('k9',here,r0)||0)/1.4,tIn=t1+.5,tOut=tIn+.4+CHUTE.secs,tOn=tOut+.9;
    g.beat({move:'k9',to:r0,interrupt:true,fast:true});
    g.beat({at:t1,actor:'k9',do:'scan',for:.6});
    g.beat({at:tIn+.3,hide:'k9'});
    g.beat({at:tOut,move:'k9',to:r1,teleport:true,interrupt:true});g.beat({at:tOut+.25,show:'k9'});
    g.beat({at:tOn,move:'k9',to,interrupt:true,fast:!!opts.fast});
    const T=(s,f)=>setTimeout(f,s*1000),J=()=>window.__joy;
    T(tIn-.1,()=>{N.open[dk]=performance.now()+1600;J()&&J().hatch(h0.x,h0.y);});
    T(tIn+.5,()=>{J()&&J().chute(h0,h1,CHUTE.secs);});
    T(tOut-.2,()=>{N.open[dt]=performance.now()+1700;J()&&J().hatch(h1.x,h1.y);});
    const total=tOn+(CUT.travelTime('k9',r1,to)||0)/(opts.fast?1.4:1);busyUntil=performance.now()+(tOn+.5)*1000;
    return {secs:total,chute:true};}};
window.K9NAV=N;
})();
