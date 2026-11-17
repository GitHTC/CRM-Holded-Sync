import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Clock, Search, Sparkles, X, BellOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { projectsService } from '../services/holded';
import {
  QuickLogOption, normalize, getRecentTaskIds, pushRecentTask,
  readOptionsCache, writeOptionsCache, setQuickLogEnabled, snoozeQuickLog,
} from '../lib/quicklog';

const CACHE_TTL = 2 * 60 * 1000;
const DONE_PROJECT = /^(completed|cancelled|canceled|closed|finished)$/i;

const isDone = (s: any) => s === 'completed' || s === 2 || s === 'done';
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function closeAviso() {
  window.parent.postMessage({ action: 'quicklogClose' }, '*');
}

function readParams() {
  const raw = window.location.hash.replace(/^#quicklog\??/, '');
  const p = new URLSearchParams(raw);
  const mins = Math.max(1, Math.min(600, parseInt(p.get('mins') || '15', 10) || 15));
  return { subject: p.get('subject') || '', to: p.get('to') || '', mins };
}

async function fetchOptions(key: string): Promise<QuickLogOption[]> {
  const [projects, tasks] = await Promise.all([
    projectsService.getProjects(key).catch(() => []),
    projectsService.getTasks(key).catch(() => []),
  ]);
  const projName: Record<string, string> = {};
  const activeProjects = new Set<string>();
  (Array.isArray(projects) ? projects : []).forEach((p: any) => {
    projName[p.id] = p.name || p.title || 'Proyecto';
    if (!DONE_PROJECT.test(String(p.status ?? ''))) activeProjects.add(p.id);
  });
  const out: QuickLogOption[] = [];
  (Array.isArray(tasks) ? tasks : []).forEach((t: any) => {
    const projectId = t.projectId || t.project_id;
    if (!t.id || !projectId || isDone(t.status)) return;
    if (activeProjects.size > 0 && !activeProjects.has(projectId)) return;
    const taskName = t.name || t.title || 'Tarea';
    const projectName = projName[projectId] || 'Proyecto';
    out.push({
      taskId: t.id, projectId, taskName, projectName,
      search: normalize(`${projectName} ${taskName}`),
    });
  });
  return out.sort((a, b) =>
    a.projectName.localeCompare(b.projectName, 'es') || a.taskName.localeCompare(b.taskName, 'es'));
}

export function QuickLogView() {
  const { holdedApiKey, holdedUserId, profile } = useAppContext();
  const params = useMemo(readParams, []);
  const [options, setOptions] = useState<QuickLogOption[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<QuickLogOption | null>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [minutes, setMinutes] = useState(params.mins);
  const [desc, setDesc] = useState(params.subject ? `Email: ${params.subject}` : 'Email enviado');
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Carga: primero la caché (aparece al instante) y se refresca en segundo plano
  useEffect(() => {
    if (!holdedUserId) return;
    let cancelled = false;
    (async () => {
      setRecent(await getRecentTaskIds());
      const cache = await readOptionsCache();
      if (cache && !cancelled) { setOptions(cache.options); setLoading(false); }
      if (cache && Date.now() - cache.at < CACHE_TTL) return;
      try {
        const fresh = await fetchOptions(holdedApiKey);
        if (cancelled) return;
        setOptions(fresh);
        setLoadError(false);
        if (fresh.length) writeOptionsCache(fresh);
      } catch {
        if (!cache && !cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [holdedUserId, holdedApiKey]);

  useEffect(() => { searchRef.current?.focus(); }, [loading]);

  // Sugerencia: tareas cuyo nombre comparte palabras con el asunto del correo
  const scored = useMemo(() => {
    const words = normalize(params.subject).split(/[^a-z0-9]+/).filter(w => w.length >= 4);
    return options.map(o => ({
      o, score: words.reduce((n, w) => n + (o.search.includes(w) ? 1 : 0), 0),
    }));
  }, [options, params.subject]);

  const matches = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (words.length) {
      return scored.filter(s => words.every(w => s.o.search.includes(w))).slice(0, 8)
        .map(s => ({ ...s.o, suggested: false }));
    }
    const rank = (s: { o: QuickLogOption; score: number }) => {
      const r = recent.indexOf(s.o.taskId);
      return s.score * 100 + (r >= 0 ? 50 - r : 0);
    };
    return [...scored].sort((a, b) => rank(b) - rank(a)).slice(0, 8)
      .map(s => ({ ...s.o, suggested: s.score > 0 }));
  }, [scored, query, recent]);

  const recentOptions = useMemo(
    () => recent.map(id => options.find(o => o.taskId === id)).filter(Boolean).slice(0, 3) as QuickLogOption[],
    [recent, options]);

  const choose = (o: QuickLogOption) => {
    setSelected(o); setQuery(''); setOpen(false); setError('');
  };

  const save = async () => {
    if (saving || done) return;
    if (!selected) { setError('Elige la tarea en la que imputar el tiempo.'); setOpen(true); return; }
    if (!minutes || minutes <= 0) { setError('Indica un tiempo mayor que 0.'); return; }
    setSaving(true); setError('');
    try {
      await projectsService.addTimeTracking(holdedApiKey, selected.projectId, {
        duration: Math.round(minutes * 60),
        costHour: 0,
        desc: desc.trim() || 'Email enviado',
        taskId: selected.taskId,
        userId: holdedUserId,
        date,
      });
      await pushRecentTask(selected.taskId);
      setDone(true);
      setTimeout(closeAviso, 1100);
    } catch (e: any) {
      setError(e?.message || 'No se pudo registrar el tiempo.');
      setSaving(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); closeAviso(); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void save(); }
  };

  const onSearchKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi(h => Math.min(h + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && open && matches[hi]) { e.preventDefault(); choose(matches[hi]); }
  };

  const silence = async (kind: 'hour' | 'off') => {
    if (kind === 'hour') await snoozeQuickLog(60 * 60 * 1000);
    else await setQuickLogEnabled(false);
    closeAviso();
  };

  // ---- Sin sesión ----
  if (!holdedUserId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white">
        <img src="assets/brand/segurnube-isotipo.svg" alt="" className="h-8 mb-4" />
        <p className="font-display font-semibold text-tech text-lg mb-1">Inicia sesión para imputar tiempo</p>
        <p className="text-sm text-tech/60 mb-5">Abre el panel de la extensión e inicia sesión con tu cuenta de Google.</p>
        <button onClick={closeAviso} className="px-4 py-2 rounded-xl bg-digital text-white text-sm font-medium">Entendido</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white">
        <div className="w-14 h-14 rounded-2xl bg-human/40 text-tech flex items-center justify-center mb-3"><Check size={30} /></div>
        <p className="font-display font-semibold text-tech text-lg">Tiempo registrado</p>
        <p className="text-sm text-tech/60 mt-1 px-6 text-center truncate max-w-full">{selected?.projectName} › {selected?.taskName}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white text-tech" onKeyDown={onKeyDown}>
      <header className="flex items-center justify-between px-4 py-3 border-b-2 border-b-digital/10">
        <div className="flex items-center gap-2.5">
          <img src="assets/brand/segurnube-isotipo.svg" alt="" className="h-5" />
          <h2 className="font-display font-semibold text-base">¿A qué dedicaste este correo?</h2>
        </div>
        <button onClick={closeAviso} title="Omitir (Esc)" className="p-1.5 rounded-full text-tech/50 hover:bg-blue-50"><X size={18} /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {(params.subject || params.to) && (
          <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-tech/70 leading-relaxed">
            {params.subject && <p className="font-medium text-tech truncate">✉ {params.subject}</p>}
            {params.to && <p className="truncate">Para: {params.to}</p>}
          </div>
        )}

        {/* Tarea */}
        <div className="relative">
          <label className="block text-xs font-medium text-tech/70 mb-1.5">Proyecto y tarea</label>
          {selected ? (
            <button
              onClick={() => { setSelected(null); setTimeout(() => searchRef.current?.focus(), 0); }}
              className="w-full text-left px-3 py-2.5 rounded-xl border-2 border-digital bg-blue-50/60 flex items-center justify-between gap-2"
              title="Cambiar tarea"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{selected.taskName}</span>
                <span className="block text-xs text-tech/60 truncate">{selected.projectName}</span>
              </span>
              <span className="text-xs text-digital shrink-0">Cambiar</span>
            </button>
          ) : (
            <>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tech/40" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setOpen(true); setHi(0); }}
                  onFocus={() => setOpen(true)}
                  onKeyDown={onSearchKey}
                  role="combobox" aria-expanded={open} aria-controls="ql-list"
                  placeholder={loading ? 'Cargando tareas…' : 'Busca por proyecto o tarea'}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-blue-200 focus:border-digital focus:ring-2 focus:ring-digital/20 outline-none text-sm"
                />
              </div>
              {recentOptions.length > 0 && !query && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {recentOptions.map(o => (
                    <button key={o.taskId} onClick={() => choose(o)}
                      className="px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-xs text-digital max-w-full truncate"
                      title={`${o.projectName} › ${o.taskName}`}>
                      ↺ {o.taskName}
                    </button>
                  ))}
                </div>
              )}
              {open && (
                <ul id="ql-list" role="listbox"
                  className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-xl border border-blue-100 shadow-lg py-1">
                  {matches.length === 0 && (
                    <li className="px-3 py-3 text-sm text-tech/50">
                      {loadError ? 'No se pudieron cargar las tareas.' : loading ? 'Cargando…' : 'Sin resultados.'}
                    </li>
                  )}
                  {matches.map((o, i) => (
                    <li key={o.taskId} role="option" aria-selected={i === hi}
                      onMouseEnter={() => setHi(i)} onMouseDown={e => { e.preventDefault(); choose(o); }}
                      className={`px-3 py-2 cursor-pointer ${i === hi ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{o.taskName}</span>
                        {o.suggested && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-tech bg-human/40 rounded-full px-1.5 py-0.5">
                            <Sparkles size={10} /> Sugerida
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-tech/55 truncate">{o.projectName}</div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Tiempo y fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-tech/70 mb-1.5">Tiempo (minutos)</label>
            <div className="relative">
              <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tech/40" />
              <input type="number" min={1} max={600} value={minutes}
                onChange={e => setMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-blue-200 focus:border-digital focus:ring-2 focus:ring-digital/20 outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-tech/70 mb-1.5">Fecha</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-blue-200 focus:border-digital focus:ring-2 focus:ring-digital/20 outline-none text-sm" />
          </div>
        </div>
        <div className="flex gap-1.5 -mt-2">
          {[5, 15, 30, 45, 60].map(m => (
            <button key={m} onClick={() => setMinutes(m)}
              className={`px-2.5 py-1 rounded-full text-xs ${minutes === m ? 'bg-digital text-white' : 'bg-blue-50 text-digital hover:bg-blue-100'}`}>
              {m < 60 ? `${m} min` : '1 h'}
            </button>
          ))}
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-xs font-medium text-tech/70 mb-1.5">Descripción</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-blue-200 focus:border-digital focus:ring-2 focus:ring-digital/20 outline-none text-sm resize-none" />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      </div>

      <footer className="px-4 pt-3 pb-3 border-t border-blue-100 bg-white">
        <div className="flex gap-2">
          <button onClick={closeAviso}
            className="px-4 py-2.5 rounded-xl border border-blue-100 text-sm font-medium text-tech/70 hover:bg-blue-50">Omitir</button>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-digital hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60">
            {saving ? 'Guardando…' : 'Registrar tiempo'}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2.5 text-[11px] text-tech/50">
          <span>Ctrl+Enter registra · Esc omite</span>
          <span className="flex items-center gap-1">
            <BellOff size={11} />
            <button onClick={() => silence('hour')} className="hover:text-digital underline-offset-2 hover:underline">Silenciar 1 h</button>
            <span>·</span>
            <button onClick={() => silence('off')} className="hover:text-digital underline-offset-2 hover:underline">No volver a mostrar</button>
          </span>
        </div>
        {profile && <span className="sr-only">{profile.email}</span>}
      </footer>
    </div>
  );
}
