// Almacenamiento unificado: chrome.storage.local en la extensión, localStorage en desarrollo.
const chromeApi = () => (typeof window !== 'undefined' ? (window as any).chrome : undefined);

export function storageGet(keys: string[]): Promise<Record<string, any>> {
  const c = chromeApi();
  if (c?.storage?.local) return new Promise(res => c.storage.local.get(keys, res));
  const out: Record<string, any> = {};
  keys.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) { try { out[k] = JSON.parse(v); } catch { out[k] = v; } }
  });
  return Promise.resolve(out);
}

export function storageSet(obj: Record<string, any>) {
  const c = chromeApi();
  if (c?.storage?.local) c.storage.local.set(obj);
  else Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
}

export function storageRemove(keys: string[]) {
  const c = chromeApi();
  if (c?.storage?.local) c.storage.local.remove(keys);
  keys.forEach(k => localStorage.removeItem(k));
}
