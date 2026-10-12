const PREFIX = 'video-prompts-' + __SCOPE_ID__ + '-';
const CACHE = PREFIX + '__BUILD_ID__';
const PRECACHE = __PRECACHE__;
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        await Promise.all(
          PRECACHE.map(async (path) => {
            const url = new URL(path, self.registration.scope);
            const response = await fetch(url, { cache: 'reload' });
            if (!response.ok)
              throw new Error('Application shell caching failed');
            await cache.put(url, response);
          }),
        );
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
    })(),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all(
        (await caches.keys())
          .filter((k) => k.startsWith(PREFIX) && k !== CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'APPLY_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url),
    scope = new URL(self.registration.scope);
  if (
    request.method !== 'GET' ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // Precached same-origin static files are invariant; dev/preview CORS Vary headers
      // must not force a network fetch for module requests while offline.
      // Online navigations must not be trapped on a previously deployed HTML shell.
      // Keep the installed, version-matched shell intact for offline fallback.
      if (request.mode === 'navigate') {
        try {
          const fresh = await fetch(request, { cache: 'no-store' });
          if (fresh.ok) return fresh;
          return (await cache.match(scope)) ?? fresh;
        } catch {
          return (await cache.match(scope)) ?? Response.error();
        }
      }
      // Immutable fingerprinted JS/CSS and the installed offline shell stay
      // cache-first. Do not silently cache newer HTML into an older shell cache:
      // it could reference JS that the previous worker has not precached.
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached) return cached;
      return fetch(request);
    })(),
  );
});
