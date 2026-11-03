/* Familiar, then wrong (§drift). HALCYON has three states — NORMAL, ALTERED, UNCANNY — and every room, every routine
   and HOS's own voice read differently in each. Nothing new is added; what she already knows changes under her.
   The level comes from what she has seen and how long she has been aboard, never from a quest flag. window.DRIFT */
(function(){
"use strict";
const MEM=['first_memory_seen','eng_memory_seen','signal_layer_seen','past_deadscout_seen','signal_arrives_seen','final_eva_seen','last_walk_seen','k9_memory_seen'];
const DISC=['found_photo','found_nav','found_patch','found_trace','found_eva'];
function level(F,playT){const m=MEM.filter(k=>F[k]).length,d=DISC.filter(k=>F[k]).length;
  if(F.camera_discrepancy_seen||F.past_deadscout_seen||F.identity_record_found||m>=3||playT>=1080)return 2;
  if(F.any_memory_seen||d>=2||playT>=420||F.deck_found&&F.power_restored&&playT>=240)return 1;return 0;}
/* HOS, on entering a room; one line per level */
const ROOM={bridge:['BRIDGE · PARTIAL POWER','BRIDGE · CAM 01 · OCCUPANCY: 0','BRIDGE · OCCUPANCY: 1 · RECOUNT: 0'],
  'crew-quarters':['CREW QUARTERS · OCCUPANCY: 0','CREW QUARTERS · BUNK: MADE · DENT: PRESENT','CREW QUARTERS · OCCUPANCY: 1 · RECOUNT: 0'],
  engineering:['ENGINEERING · REACTOR IDLE','ENGINEERING · MAINTENANCE LOG · LAST ENTRY: TODAY','ENGINEERING · EMERGENCY LIGHTING · CAUSE: NONE'],
  sensor:['SENSOR ROOM · ARRAY IDLE','SENSOR ROOM · ONE CONTACT · INSIDE THE HULL','SENSOR ROOM · CONTACT · THIS ROOM'],
  comms:['COMMS · CHANNEL OPEN · NO TRAFFIC','COMMS · OUTBOUND · ONE REPEATING MESSAGE','COMMS · OUTBOUND · ORIGIN: THIS CONSOLE'],
  airlock:['AIRLOCK · SEALED','AIRLOCK · LAST CYCLE: 2291 · LAST USER: 4','AIRLOCK · CYCLE LOG · ONE OUTBOUND · NO INBOUND'],
  service:['SERVICE TUNNEL · READINGS NOMINAL','SERVICE TUNNEL · READINGS UNSTABLE','SERVICE TUNNEL · K9-4 DECLINES'],
  'central-shaft':['CENTRAL SHAFT · LIFT: OFFLINE','CENTRAL SHAFT · MOTION: NONE','CENTRAL SHAFT · MOTION: ONE · UNLISTED'],
  'upper-access':['UPPER ACCESS · PRESSURE OK','UPPER ACCESS · DOOR LOG · OPENED FROM INSIDE','UPPER ACCESS · MOTION: ONE · UNLISTED'],
  'lower-access':['LOWER ACCESS · PRESSURE OK','LOWER ACCESS · NO FOOTFALL · DOOR CYCLED','LOWER ACCESS · MOTION: ONE · UNLISTED'],
  eva:['OUTSIDE · TETHER: OK','OUTSIDE · TETHER: OK · STARS: FIXED','OUTSIDE · TETHER: UNUSED']};
/* the ordinary things, by level: a routine first, then the same routine, wrong */
const TEXT={'meal-unit':['MEAL UNIT · READY · ONE CUP · HOT','MEAL UNIT · READY · NO CUP DISPENSED','MEAL UNIT · LAST USER: PILOT · 2291 · READY'],
  'sensor-sweep':['SENSOR SWEEP · 360° · CLEAR','SENSOR SWEEP · ONE CONTACT · INSIDE THE HULL','SENSOR SWEEP · ONE CONTACT · THIS ROOM · RANGE 0'],
  'k9-dock':['K9 DOCK · UNIT K9-4 · CHARGING','K9 DOCK · UNIT K9-4 · CHARGING · PRIOR SESSION: TODAY','K9 DOCK · UNIT ALREADY DOCKED'],
  viewport:[['167 AU · THE SUN IS ONE MORE STAR','NOTHING OUT THERE · NOTHING FOR YEARS'],['THE SAME STARS · THE SAME PLACES','HALCYON HAS NOT MOVED · THE STARS AGREE'],['A LIGHT · NO · THE SAME STAR','SOMETHING IN THE GLASS · BEHIND YOU · NO']],
  bunk:[['THE BUNK IS MADE','QUIET · THE HULL TICKS AS IT COOLS'],['THE BUNK IS MADE · IT HAS BEEN MADE FOR YEARS','THE DENT IS STILL IN THE PILLOW'],['THE BUNK IS WARM','SOMEONE SAT HERE · JUST NOW']],
  'quarters-photo':['A PHOTOGRAPH · THREE PEOPLE IN SUITS · THE PILOT\'S FACE IS WORN AWAY','A PHOTOGRAPH · THREE PEOPLE · THE PILOT IS LOOKING AT YOU','A PHOTOGRAPH · THREE PEOPLE · YOU KNOW THE PILOT\'S FACE'],
  lights:['LOCAL POWER · ON','LOCAL POWER · ON · PRIOR USER: NONE','LOCAL POWER · ON · ALREADY ON']};
const NAME=['NORMAL','ALTERED','UNCANNY'];
window.DRIFT={level,ROOM,TEXT,NAME,MEM,DISC,text(k,l,n){const T=TEXT[k];if(!T)return '';const v=T[Math.min(l,T.length-1)];return Array.isArray(v)?v[(n||0)%v.length]:v;}};
})();
