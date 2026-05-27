import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  entry: string;
  panel?: { title: string; defaultOpen?: boolean };
};

export type LoadedPlugin = {
  manifest: PluginManifest;
  code: string;
  source: 'user';
};

export function userPluginsRoot(): string {
  return join(app.getPath('userData'), 'plugins');
}

async function scanDir(root: string): Promise<LoadedPlugin[]> {
  const result: LoadedPlugin[] = [];
  let entries: string[] = [];
  try {
    entries = await fs.readdir(root);
  } catch {
    return result;
  }
  for (const dir of entries) {
    const pluginDir = join(root, dir);
    const stat = await fs.stat(pluginDir).catch(() => null);
    if (!stat || !stat.isDirectory()) continue;
    try {
      const manifestRaw = await fs.readFile(join(pluginDir, 'manifest.json'), 'utf8');
      const manifest = JSON.parse(manifestRaw) as PluginManifest;
      const entryPath = join(pluginDir, manifest.entry);
      const code = await fs.readFile(entryPath, 'utf8');
      result.push({ manifest, code, source: 'user' });
    } catch (err) {
      console.warn('[plugin-loader] failed to load', pluginDir, err);
    }
  }
  return result;
}

export async function loadAllPlugins(): Promise<LoadedPlugin[]> {
  const root = userPluginsRoot();
  // Ensure the folder exists so users see it immediately on first launch.
  await fs.mkdir(root, { recursive: true }).catch((err) => {
    console.warn('[plugin-loader] failed to ensure plugins dir', err);
  });
  return scanDir(root);
}
