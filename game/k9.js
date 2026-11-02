/* K9-4 after the wake: follows, waits, catches up, scans, looks toward what matters, sometimes shows the way. It never
   talks, never blocks her, never climbs a human ladder: when she changes deck it waits at the shaft, and rejoins by a
   service route only while nobody is looking. Its personality is movement. window.K9.create(api) */
(function(){
"use strict";
const K={state:'off',power:'reserve',last:0,reacted:{},guideT:0,waitRef:null,lastDeck:null,scanT:0,curT:0,wander:false,refuse:false};
function deckOf(M,y){for(const [k,[a,b]] of Object.entries(M.decks))if(y>=a&&y<b)return k;return 'mid';}
function create(api){const M=api.map().k9;
  function update(t){if(K.state!=='follow'||!api.on())return;if(t-K.last<.7)return;K.last=t;
    const her=api.pos('deadscout'),me=api.pos('k9'),V=api.view(),on=x=>x>V[0]-40&&x<V[0]+V[2]+40;
    const dHer=deckOf(M,her.y),dMe=deckOf(M,me.y);
    /* at UNCANNY it will not go into the service tunnel: it waits at the mouth, looking in, and will not say why */
    if(api.drift()>=2&&api.room('deadscout')==='service'){if(!K.refuse){K.refuse=true;const w=api.place('lower-access.west')?'lower-access.west':M.wait.lower;api.move('k9',w);api.later(2.5,()=>api.act('k9','wait',40,'left'));api.sfx('chirp',me.x,.4);}return;}K.refuse=false;
    /* a signal nearby: stop, raise the head, one chirp (it sees residual activity before she does) */
    const src=api.nearestSource(me.x,me.y);if(src&&src.s>.35&&!K.reacted[src.id]&&!me.walk){K.reacted[src.id]=t;api.act('k9','signal-detect',2.4,src.x<me.x?'left':'right');api.sfx('chirp',me.x,.5);return;}
    if(api.tuning()&&t-K.scanT>14){K.scanT=t;api.act('k9','scan',3,her.x<me.x?'left':'right');return;}
    if(dHer===dMe){K.waitRef=null;const dx=her.x-me.x,far=Math.abs(dx)>190*api.ss()/2;
      if(far&&!me.walk){const side=dx>0?-1:1,ref=api.placeNear(her.x+side*80,her.y);if(ref)api.move('k9',ref,Math.abs(dx)>420);K.curT=t;}
      else if(!far&&me.walk&&Math.abs(dx)<120&&!K.wander){api.stop('k9');}
      /* curiosity: with nothing asked of it, it lives here. A few steps to a machine, a sniff, a look at her, a rest */
      else if(!far&&!me.walk&&!her.walk&&t-K.curT>12+Math.random()*16){K.curT=t;const r=Math.random();
        if(r<.4){const dir=Math.random()<.5?-1:1,ref=api.placeNear(me.x+dir*(60+Math.random()*90),me.y);if(ref){K.wander=true;api.move('k9',ref);api.later(2.2,()=>{api.act('k9','scan',2.6,dir>0?'right':'left');K.wander=false;});}}
        else if(r<.65)api.act('k9','wait',3+Math.random()*3,her.x<me.x?'left':'right');
        else if(r<.85){api.act('k9','signal-detect',1.8,Math.random()<.5?'left':'right');api.sfx('servo',me.x,.25);}
        else api.act('k9','idle',5,her.x<me.x?'left':'right');return;}
      /* guidance: she has not moved on for a while; walk a few steps toward the way, stop, look back, wait */
      const hint=api.hint();if(hint&&!me.walk&&!her.walk&&api.idleFor()>75&&t-K.guideT>60){K.guideT=t;const g=api.place(hint);if(g&&deckOf(M,g.y)===dMe){const dir=g.x>me.x?1:-1,ref=api.placeNear(me.x+dir*150,me.y);if(ref){api.move('k9',ref);api.later(2.6,()=>api.act('k9','wait',6,dir>0?'left':'right'));api.sfx('servo',me.x,.4);}}}
      return;}
    /* different decks: wait at the shaft on its own deck; rejoin off-camera */
    if(!on(me.x)&&!on(her.x-400)||!on(me.x)&&Math.abs(her.x-me.x)>900){const w=M.wait[dHer],p=api.place(w);if(p&&!on(p.x)){api.teleport('k9',w);return;}
      const alt=api.offscreenOn(dHer,V);if(alt){api.teleport('k9',alt);return;}}
    if(!K.waitRef){K.waitRef=M.wait[dMe];api.move('k9',K.waitRef);api.later(3,()=>{if(K.waitRef)api.act('k9','wait',40,her.x<me.x?'left':'right');});}}
  return {update,get state(){return K.state;},set state(v){K.state=v;},get power(){return K.power;},set power(v){K.power=v;},reset(){Object.assign(K,{state:'off',power:'reserve',last:0,reacted:{},guideT:0,waitRef:null,scanT:0,curT:0,wander:false});}};}
window.K9={create,deckOf};
})();
