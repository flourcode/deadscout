/* Driftnaut offline: network first (so an update always wins), the last good copy when there's no network. Everything the
   game loads is local and same-origin, so one full visit is enough to play offline. Nothing is sent anywhere.
   One cache per release (C): installing a new release precaches its own file list and the activate step deletes the old
   caches, so what's offline is always one coherent set (r22 kept one cache for ever and could mix two versions).
   KEEP THE LIST BELOW IN STEP WITH index.html: the ?v= strings must match exactly, the cache is keyed by full URL. */
const C='driftnaut-v60';
const FILES=['./','index.html','game.css?v=49','manifest.webmanifest','favicon.png','icon-192.png','icon-512.png','apple-touch-icon.png','boot-helmet.png?v=2','boot-helmet-skull.png?v=2','boot-ship.png?v=1',
  'fonts/silkscreen-400.woff2','fonts/plexmono-400.woff2','fonts/plexmono-500.woff2',
  'mix.js?v=17','space.js?v=5','music.js?v=11','deep.js?v=13','assets-core.js?v=27','pix.js?v=11','cut.js?v=59','episode.js?v=3','story/halcyon.js?v=13','watch.js?v=18','amb.js?v=6','audio/sfx.js?v=6','lc.js?v=12','rec.js?v=9',
  'game/scanner.js?v=5','game/power.js?v=4','game/drift.js?v=3','game/k9.js?v=4','game/events.js?v=3','game/story.js?v=17','game/console.js?v=2','game.js?v=65','game/pad.js?v=14','game/toys.js?v=19','game/clock.js?v=6','game/k9nav.js?v=1','game/joy.js?v=7','game/town.js?v=7',
  'assets-world.js?v=10','assets-cast.js?v=10','mp4-muxer.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.allSettled(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res&&res.ok){const cp=res.clone();e.waitUntil(caches.open(C).then(c=>c.put(r,cp)));}return res;})
    .catch(async()=>{const c=await caches.open(C);const m=await c.match(r);if(m)return m;
      if(r.mode==='navigate'){return (await c.match('index.html'))||(await c.match('./'))||Response.error();} /* an installed app opens index.html; a visit cached ./ */
      return Response.error();}));});
