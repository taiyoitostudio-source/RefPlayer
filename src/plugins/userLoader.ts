import { createPluginAPI } from './api';

let loaded = false;

export async function loadUserPlugins(): Promise<void> {
  if (loaded) return;
  loaded = true;
  let records;
  try {
    records = await window.refplayer.loadPlugins();
  } catch (err) {
    console.error('[userLoader] failed to fetch plugin list', err);
    return;
  }

  for (const r of records) {
    const id = r.manifest?.id ?? '<unknown>';
    try {
      const api = createPluginAPI(id);
      const exports: Record<string, unknown> = {};
      const moduleObj: { exports: unknown } = { exports };
      const fn = new Function('module', 'exports', 'api', 'console', r.code);
      fn(moduleObj, exports, api, console);

      const register =
        typeof moduleObj.exports === 'function'
          ? (moduleObj.exports as (api: ReturnType<typeof createPluginAPI>) => void)
          : typeof (exports as { default?: unknown }).default === 'function'
            ? ((exports as { default: (api: ReturnType<typeof createPluginAPI>) => void }).default)
            : null;

      if (!register) {
        console.warn(`[plugin: ${id}] entry did not export a register function`);
        continue;
      }
      register(api);
      console.log(`[plugin: ${id}] loaded (${r.manifest.version ?? '?'})`);
    } catch (err) {
      console.error(`[plugin: ${id}] load failed`, err);
    }
  }
}
