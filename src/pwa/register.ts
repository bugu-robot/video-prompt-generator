export async function registerPwa(
  onStatus: (s: string) => void,
  onUpdate: (apply: () => void) => void,
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
    const offer = () => {
      if (registration.waiting && navigator.serviceWorker.controller)
        onUpdate(() =>
          registration.waiting?.postMessage({ type: 'APPLY_UPDATE' }),
        );
    };
    offer();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') setTimeout(offer, 0);
      });
    });
    await navigator.serviceWorker.ready;
    onStatus('離線已就緒 · 本機處理');
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Initial installation claims clients without an unexpected page reload.
      if (document.querySelector('[data-applying-update]') && !reloading) {
        reloading = true;
        location.reload();
      }
    });
    window.addEventListener('online', () => {
      onStatus('離線已就緒 · 本機處理');
      void registration.update().catch(() => undefined);
    });
    window.addEventListener('offline', () =>
      onStatus('目前離線 · 功能可繼續使用'),
    );
  } catch {
    onStatus('離線安裝未完成 · 可重載再試');
  }
}
