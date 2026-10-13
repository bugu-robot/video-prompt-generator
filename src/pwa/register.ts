/**
 * Install and maintain the local-first PWA without touching localStorage or
 * user presets. The worker stays user-controlled until the user accepts it.
 */
export async function registerPwa(
  onStatus: (s: string) => void,
  onUpdate: (apply: (() => void) | null, worker: ServiceWorker | null) => void,
): Promise<void> {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
    onStatus('開發模式 · 離線快取未啟用');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      import.meta.env.BASE_URL + 'sw.js',
      { scope: import.meta.env.BASE_URL, updateViaCache: 'none' },
    );
    let applying = false;
    let reloading = false;
    const reloadAfterUpdate = () => {
      // Never reload for the first installation or an unrelated controller swap.
      // A closure-owned flag cannot be accidentally discarded by UI rerendering.
      if (applying && !reloading) {
        reloading = true;
        location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', reloadAfterUpdate);
    const offer = () => {
      const offered = registration.waiting;
      if (!offered || !navigator.serviceWorker.controller) {
        onUpdate(null, null);
        return;
      }
      onUpdate(() => {
        const waiting = registration.waiting;
        if (!waiting) {
          // Waiting worker changed while the banner was visible: recheck,
          // rather than leaving an inert button.
          void registration.update().then(offer).catch(() => {
            onStatus('無法檢查更新 · 請稍後重試');
          });
          onStatus('正在重新檢查更新');
          return;
        }
        applying = true;
        onStatus('正在切換至新版本…');
        waiting.postMessage({ type: 'APPLY_UPDATE' });
        // An activation failure must not silently strand the user. The
        // waiting worker remains available for a later click/retry.
        setTimeout(() => {
          if (applying && !reloading) {
            if (navigator.serviceWorker.controller === registration.active &&
                registration.waiting === null) {
              reloadAfterUpdate();
            } else {
              applying = false;
              onStatus('更新仍未完成 · 可再按一次更新');
            }
          }
        }, 12000);
      }, offered);
    };
    offer();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') queueMicrotask(offer);
      });
    });

    await navigator.serviceWorker.ready;
    onStatus(navigator.onLine ? '離線已就緒 · 本機處理' : '目前離線 · 功能可繼續使用');
    // register() is not a sufficient freshness guarantee for cached/revisited
    // PWAs. Explicitly check on each app launch, foreground return and online
    // transition. This does not delete data or activate a waiting worker.
    const check = () => {
      if (!navigator.onLine) return;
      void registration.update().then(offer).catch(() => undefined);
    };
    check();
    window.addEventListener('pageshow', check);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    window.addEventListener('online', () => {
      onStatus('離線已就緒 · 本機處理');
      check();
    });
    window.addEventListener('offline', () =>
      onStatus('目前離線 · 功能可繼續使用'),
    );
  } catch {
    onStatus('離線安裝未完成 · 可重載再試');
  }
}
