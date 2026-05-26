import { createPluginAPI, type PluginAPI } from './api';
import { registerOnionSkin } from './builtin/onion-skin';
import { registerDrawingTimer } from './builtin/drawing-timer';

type BuiltinDef = {
  id: string;
  init: (api: PluginAPI) => void;
};

const BUILTINS: BuiltinDef[] = [
  { id: 'onion-skin', init: registerOnionSkin },
  { id: 'drawing-timer', init: registerDrawingTimer },
];

let initialised = false;

export function initPluginHost() {
  if (initialised) return;
  initialised = true;
  for (const p of BUILTINS) {
    try {
      const api = createPluginAPI(p.id);
      p.init(api);
    } catch (err) {
      console.error(`[plugin: ${p.id}] init failed`, err);
    }
  }
}
