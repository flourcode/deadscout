/* DeadScout offline: network first (so an update always wins), the last good copy when there's no network. Everything the
   game loads is local and same-origin, so one full visit is enough to play offline. Nothing is sent anywhere.
   One cache per release (C): installing a new release precaches its own file list and the activate step deletes the old
   caches, so what's offline is always one coherent set (r22 kept one cache for ever and could mix two versions).
   KEEP THE LIST BELOW IN STEP WITH index.html: the ?v= strings must match exactly, the cache is keyed by full URL. */
const C='deadscout-v26';
const FILES=['./','index.html','game.css?v=24','manifest.webmanifest','favicon.png','icon-192.png','icon-512.png','apple-touch-icon.png',
  'fonts/silkscreen-400.woff2','fonts/plexmono-400.woff2','fonts/plexmono-500.woff2',
  'mix.js?v=17','space.js?v=5','music.js?v=11','deep.js?v=5','assets-core.js?v=26','pix.js?v=11','cut.js?v=51','episode.js?v=3','story/halcyon.js?v=11','watch.js?v=8','amb.js?v=2','audio/sfx.js?v=6','lc.js?v=12','rec.js?v=9',
  'game/scanner.js?v=5','game/power.js?v=4','game/drift.js?v=2','game/k9.js?v=3','game/events.js?v=2','game/story.js?v=15','game/console.js?v=2','game.js?v=38','game/pad.js?v=12','game/toys.js?v=9','game/clock.js?v=5',
  'assets-world.js?v=10','assets-cast.js?v=9','mp4-muxer.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.allSettled(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res&&res.ok){const cp=res.clone();e.waitUntil(caches.open(C).then(c=>c.put(r,cp)));}return res;})
    .catch(async()=>{const c=await caches.open(C);const m=await c.match(r);if(m)return m;
      if(r.mode==='navigate'){return (await c.match('index.html'))||(await c.match('./'))||Response.error();} /* an installed app opens index.html; a visit cached ./ */
      return Response.error();}));});
