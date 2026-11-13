import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const USER_ID_KEY = 'holded_user_id';
const PROFILE_KEY = 'segurnube_profile';
// Claves heredadas de versiones <3.0 (guardaban la API key de Holded en el navegador)
const LEGACY_KEYS = ['holded_api_key'];

export interface UserProfile {
  email: string;
  name: string;
  holdedUserId: string;
}

interface AppContextType {
  /**
   * Compatibilidad con los servicios existentes: ya NO es una clave de Holded.
   * Vale 'session' cuando hay sesión iniciada y '' si no. La autenticación real
   * la hace el service worker con el token de Google (ver background.js).
   */
  holdedApiKey: string;
  holdedUserId: string | null;
  profile: UserProfile | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  activeTab: 'crm' | 'projects' | 'settings';
  setActiveTab: (tab: 'crm' | 'projects' | 'settings') => void;
  activeTask: string | null;
  setActiveTask: (taskId: string | null) => void;
  startTime: number | null;
  setStartTime: (time: number | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const chromeApi = () => (typeof window !== 'undefined' ? (window as any).chrome : undefined);
const inExtension = () => Boolean(chromeApi()?.runtime?.id);

function storageGet(keys: string[]): Promise<Record<string, any>> {
  const c = chromeApi();
  if (c?.storage?.local) return new Promise(res => c.storage.local.get(keys, res));
  const out: Record<string, any> = {};
  keys.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) { try { out[k] = JSON.parse(v); } catch { out[k] = v; } }
  });
  return Promise.resolve(out);
}

function storageSet(obj: Record<string, any>) {
  const c = chromeApi();
  if (c?.storage?.local) c.storage.local.set(obj);
  else Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
}

function storageRemove(keys: string[]) {
  const c = chromeApi();
  if (c?.storage?.local) c.storage.local.remove(keys);
  keys.forEach(k => localStorage.removeItem(k));
}

function sendToBackground(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chromeApi().runtime.sendMessage(message, (res: any) => {
      const err = chromeApi().runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(res);
    });
  });
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'crm' | 'projects' | 'settings'>('settings');
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      // Migración: eliminar cualquier API key que versiones anteriores dejaron en el navegador
      storageRemove(LEGACY_KEYS);
      const saved = await storageGet([PROFILE_KEY]);
      const p = saved[PROFILE_KEY] as UserProfile | undefined;
      if (p?.holdedUserId) {
        setProfile(p);
        setActiveTab('crm');
      }
      setIsLoaded(true);
    })();
  }, []);

  const doSignOut = useCallback(async () => {
    try {
      if (inExtension()) await sendToBackground({ action: 'signOut' });
    } catch { /* noop */ }
    storageRemove([USER_ID_KEY, PROFILE_KEY]);
    setProfile(null);
    setActiveTab('settings');
  }, []);

  // El gateway devolvió 401/403: la sesión ya no es válida
  useEffect(() => {
    const onExpired = () => { void doSignOut(); };
    window.addEventListener('segurnube:auth-expired', onExpired);
    return () => window.removeEventListener('segurnube:auth-expired', onExpired);
  }, [doSignOut]);

  const signIn = useCallback(async () => {
    let res: { ok: boolean; status: number; text: string; error?: string };
    if (inExtension()) {
      res = await sendToBackground({ action: 'signIn' });
    } else {
      // Modo desarrollo local (servidor con DEV_AUTH_EMAIL)
      const r = await fetch('/api/me', { headers: { Authorization: 'Bearer dev' } });
      res = { ok: r.ok, status: r.status, text: await r.text() };
    }
    if (!res?.ok) {
      let msg = res?.error || '';
      try { msg = JSON.parse(res.text).message || msg; } catch { /* noop */ }
      throw new Error(msg || `No se pudo iniciar sesión (${res?.status ?? 'sin respuesta'})`);
    }
    const data = JSON.parse(res.text) as UserProfile;
    const p: UserProfile = { email: data.email, name: data.name, holdedUserId: String(data.holdedUserId) };
    storageSet({ [PROFILE_KEY]: p, [USER_ID_KEY]: p.holdedUserId });
    setProfile(p);
    setActiveTab('crm');
  }, []);

  if (!isLoaded) return null;

  return (
    <AppContext.Provider value={{
      holdedApiKey: profile ? 'session' : '',
      holdedUserId: profile?.holdedUserId ?? null,
      profile,
      signIn,
      signOut: doSignOut,
      activeTab, setActiveTab,
      activeTask, setActiveTask,
      startTime, setStartTime
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
