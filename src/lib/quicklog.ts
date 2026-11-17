import { storageGet, storageSet } from './storage';

export const QL_KEYS = {
  enabled: 'quicklog_enabled',
  snooze: 'quicklog_snooze_until',
  recent: 'quicklog_recent',
  cache: 'quicklog_cache',
};

export interface QuickLogOption {
  taskId: string;
  projectId: string;
  taskName: string;
  projectName: string;
  /** texto normalizado para búsqueda */
  search: string;
}

export const normalize = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function isQuickLogEnabled(): Promise<boolean> {
  const s = await storageGet([QL_KEYS.enabled]);
  return s[QL_KEYS.enabled] !== false;
}

export const setQuickLogEnabled = (on: boolean) =>
  storageSet({ [QL_KEYS.enabled]: on, [QL_KEYS.snooze]: 0 });

export const snoozeQuickLog = (ms: number) =>
  storageSet({ [QL_KEYS.snooze]: Date.now() + ms });

export async function getRecentTaskIds(): Promise<string[]> {
  const s = await storageGet([QL_KEYS.recent]);
  return Array.isArray(s[QL_KEYS.recent]) ? s[QL_KEYS.recent] : [];
}

export async function pushRecentTask(taskId: string) {
  const cur = await getRecentTaskIds();
  storageSet({ [QL_KEYS.recent]: [taskId, ...cur.filter(id => id !== taskId)].slice(0, 6) });
}

export async function readOptionsCache(): Promise<{ at: number; options: QuickLogOption[] } | null> {
  const s = await storageGet([QL_KEYS.cache]);
  const c = s[QL_KEYS.cache];
  return c && Array.isArray(c.options) ? c : null;
}

export const writeOptionsCache = (options: QuickLogOption[]) =>
  storageSet({ [QL_KEYS.cache]: { at: Date.now(), options } });
