/* DEADSCOUT · the game's own manifest. Same Director JSON the studio reads (cut.js beats), used here as the authored
   opening and the music arc. Everything after she wakes is the player's, with story/slice.js putting the ship's changes
   on the same timeline. Times in `events` are absolute from the start of the transmission. */
window.DS_GAME={
 deadscout_plan:4,game:true,title:'DEADSCOUT',year:'2291',length_minutes:110,location:'research',
 ship:'DSV HALCYON',registry:'DSV-2291',
 music:{style:'deadwave',tape:'orbital-cruise',vibe:'dark',drums:'low',synth:'mid',ambience:'high'}, /* deep.js: the ship dreaming */
 format:'cutaway',
 cutaway:{era:'past',start:{pilot:'bridge.helm',systems:'bridge.nav',commander:'bridge.command',deadscout:'quarters.bunk'},
   rooms:{bridge:'normal',sensor:'normal','crew-quarters':'normal','central-shaft':'normal',engineering:'normal',service:'dim','lower-access':'normal','upper-access':'normal',comms:'normal',airlock:'normal'}},
 opening:{black:[5.3,6.7],alert_at:2.8,crew_at:3.6,hos_at:13.4,k9_at:15.8},
 /* the signature, in five seconds: the ship alive in space · the x-ray (the hull peels away bow to stern) · a push into the
    bridge, three at their stations · alert · flash. Then silence, the dead ship, K9, her. Control at about eighteen seconds. */
 events:[
  '00:00 camera exterior',
  '00:00 door quarters-door open','00:00 door bridge-hatch open','00:00 door engineering-door open',
  '00:00 screen bridge.left text-terminal for 7s','00:00 screen bridge.left2 signal-bars for 7s','00:00 screen bridge.nav idle-grid for 7s','00:00 screen bridge.side waveform for 7s','00:00 screen sensor.main waveform for 7s','00:00 screen bridge.security idle-grid for 7s',
  '00:00.8 camera cutaway scan',
  '00:01.7 camera room bridge quick',
  '00:00 pilot typing for 7s','00:00 systems typing for 7s','00:00 commander sit for 7s',
  '00:02.8 set signal_strength 0.8 over 1.4s','00:02.8 screen bridge.nav signal for 3s','00:02.8 screen sensor.main signal for 3s','00:03 screen bridge.left noise for 2s',
  '00:03.6 pilot alarm for 1.6s','00:03.6 systems alarm for 1.6s','00:03.8 commander recoil for 1.4s',
  '00:04.2 event signal-flash',
  '00:05.2 hide pilot','00:05.2 hide systems','00:05.2 hide commander','00:05.2 set signal_strength 0',
  '00:05.2 world present','00:05.2 set ship_power 0.3',
  '00:05.2 room bridge present-dark','00:05.2 room sensor present-dark','00:05.2 room crew-quarters present-dark','00:05.2 room central-shaft present-dark','00:05.2 room engineering present-dark','00:05.2 room service present-dark','00:05.2 room lower-access present-dark','00:05.2 room upper-access present-dark','00:05.2 room comms present-dark','00:05.2 room airlock present-dark',
  '00:05.2 door bridge-hatch closed','00:05.2 door quarters-door closed','00:05.2 door engineering-door closed','00:05.2 door tunnel-hatch closed','00:05.2 door airlock-inner closed','00:05.2 door airlock-outer closed',
  '00:00 k9 off for 7.4s',
  '00:06.7 camera cutaway cut','00:06.7 room engineering low-power',
  '00:07.4 k9 power-up for 3s',
  '00:10.4 move k9 to engineering.entry fast',
  '00:12.4 teleport k9 to crew-quarters.table','00:12.4 camera room crew-quarters cut','00:12.5 move k9 to crew-quarters.bunk fast',
  '00:14.8 k9 scan for 1.8s',
  '00:16.8 k9 panel for 2s',
  '00:17.8 room crew-quarters partial-power',
  '00:18.2 deadscout wake for 4s',
  '00:18.8 move k9 to crew-quarters.table','00:21.2 k9 idle for 20s',
  '00:19.2 camera follow deadscout'
 ],
 chapters:[
  {title:'Awakening',role:'AFTERMATH',energy:.25,beat:'HALCYON alive, then not. One room lights. She wakes.',story_mode:'EXPLORE',traffic:'off'},
  {title:'First Echo',role:'SIGNAL',energy:.4,beat:'The scanner. The shaft. The bridge remembers.',story_mode:'EXPLORE',traffic:'off'},
  {title:'Contradiction',role:'SEARCH',energy:.5,beat:'The camera does not see her.',story_mode:'EXPLORE',traffic:'off'},
  {title:'Final Mission',role:'CONTACT',energy:.55,beat:'What HALCYON did last.',story_mode:'EXPLORE',traffic:'off'},
  {title:'Return',role:'REALIZATION',energy:.6,beat:'The archive.',story_mode:'EXPLORE',traffic:'off'},
  {title:'The Signal',role:'AFTERMATH',energy:.35,beat:'Source: internal.',story_mode:'EXPLORE',traffic:'off'}
 ],
 ending:{type:'hard-cut'},
 publish:{title:'DEADSCOUT',subtitle:'DSV HALCYON • 2291',series:'DeadScout'}
};
