declare const __APP_VERSION__: string;

// Detect that this client is older than the deployed build.
//
// The client is a static SPA served from GitHub Pages: a tab that stays open keeps executing the
// bundle it loaded on its first visit, however many times the site is redeployed since. A player can
// therefore keep playing on outdated game logic — and outdated goal/check logic can silently corrupt
// a seed for a whole multiworld. nuxt.config.ts publishes the build version as a static file; we
// poll it and let the player reload.

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function useVersionCheck() {
  const outdated = useState('version_outdated', () => false);
  const deployedVersion = useState<string | null>('version_deployed', () => null);
  const currentVersion = __APP_VERSION__;

  async function checkVersion(): Promise<void> {
    // Once outdated, stay outdated: the verdict can only be cleared by actually reloading.
    if (import.meta.server || outdated.value) return;
    try {
      const base = useRuntimeConfig().app.baseURL || '/';
      const url = `${base.endsWith('/') ? base : `${base}/`}version.json?t=${Date.now()}`;
      // no-store is the point: bypass every cache layer between this tab and the deployment.
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data?.version === 'string' && data.version !== currentVersion) {
        deployedVersion.value = data.version;
        outdated.value = true;
      }
    } catch {
      // Offline, blocked, or deployed without the file (older build): never nag about it.
    }
  }

  // Check on mount, on a timer, and whenever the tab is brought back to the foreground — a phone
  // that froze the tab for a week then restores it gets the banner as soon as it is looked at.
  function startVersionWatch(): void {
    onMounted(() => {
      void checkVersion();
      const timer = window.setInterval(() => void checkVersion(), CHECK_INTERVAL_MS);
      const onVisible = () => {
        if (document.visibilityState === 'visible') void checkVersion();
      };
      document.addEventListener('visibilitychange', onVisible);
      onBeforeUnmount(() => {
        window.clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisible);
      });
    });
  }

  // A plain reload can still be served the cached index.html, which would hand back the very same
  // stale bundle, so cache-bust the document itself.
  function reloadForUpdate(): void {
    const url = new URL(window.location.href);
    url.searchParams.set('v', Date.now().toString());
    window.location.replace(url.toString());
  }

  return { outdated, deployedVersion, currentVersion, checkVersion, startVersionWatch, reloadForUpdate };
}
