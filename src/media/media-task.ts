/** Return to the browser event loop before opening a replacement decoder. */
export function waitForMediaTask(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('影片檢查已取消。'));
      return;
    }
    const aborted = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', aborted);
      reject(new Error('影片檢查已取消。'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', aborted);
      resolve();
    }, 0);
    signal.addEventListener('abort', aborted, {once: true});
  });
}
