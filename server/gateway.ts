/**
 * Gateway seguro Holded <-> extensión Chrome.
 *
 * - La clave API de Holded vive SOLO aquí (variable de entorno / Secret Manager).
 * - Cada petición debe llevar un access token de Google (chrome.identity) que
 *   se verifica contra Google: el usuario no puede "escribir" un correo ajeno.
 * - El correo verificado se cruza con los empleados de Holded; el cliente solo
 *   recibe SU propio registro (nunca el directorio completo).
 * - Solo se reenvían a Holded las rutas que usa la extensión (CRM y Proyectos).
 */
import { Router, json, type Request, type Response, type NextFunction } from 'express';
import { createHash } from 'crypto';
import compression from 'compression';

const HOLDED_BASE = 'https://api.holded.com/api';

const env = {
  holdedKey: () => (process.env.HOLDED_API_KEY || '').trim(),
  clientIds: () =>
    (process.env.GOOGLE_OAUTH_CLIENT_ID || '').split(',').map(s => s.trim()).filter(Boolean),
  domains: () =>
    (process.env.ALLOWED_DOMAINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  devEmail: () =>
    process.env.NODE_ENV !== 'production' ? (process.env.DEV_AUTH_EMAIL || '').trim().toLowerCase() : '',
};

// Rutas de Holded permitidas (todo lo demás -> 403).
const ALLOWED_PATHS: RegExp[] = [
  /^\/v2\/leads(\/[\w-]+(\/stage)?)?$/,
  /^\/v2\/funnels(\/[\w-]+)?$/,
  /^\/v2\/contacts(\/[\w-]+)?$/,
  /^\/v2\/events$/,
  /^\/v2\/tasks(\/[\w-]+)?$/,
  /^\/v2\/projects(\/[\w-]+(\/(summary|times(\/[\w-]+)?))?)?$/,
  /^\/v2\/employees$/,
  /^\/v2\/project-times$/,
];

interface Session {
  email: string;
  expiresAt: number;
}
const sessionCache = new Map<string, Session>();

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

async function verifyGoogleToken(token: string): Promise<string> {
  const dev = env.devEmail();
  if (dev && token === 'dev') return dev;

  const key = sha(token);
  const cached = sessionCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.email;

  const r = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`
  );
  if (!r.ok) throw new HttpError(401, 'Token de Google no válido o caducado');
  const info: any = await r.json();

  const clientIds = env.clientIds();
  if (clientIds.length === 0) throw new HttpError(500, 'GOOGLE_OAUTH_CLIENT_ID no configurado');
  if (!clientIds.includes(info.aud) && !clientIds.includes(info.azp)) {
    throw new HttpError(401, 'El token no fue emitido para esta aplicación');
  }
  if (String(info.email_verified) !== 'true' || !info.email) {
    throw new HttpError(401, 'Correo de Google no verificado');
  }
  const email = String(info.email).toLowerCase();
  const domains = env.domains();
  const domain = email.split('@')[1];
  if (domains.length === 0) throw new HttpError(500, 'ALLOWED_DOMAINS no configurado');
  if (!domains.includes(domain)) throw new HttpError(403, 'Tu dominio no tiene acceso');

  const ttl = Math.min(Number(info.expires_in) || 60, 300) * 1000;
  sessionCache.set(key, { email, expiresAt: Date.now() + ttl });
  if (sessionCache.size > 5000) sessionCache.clear();
  return email;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// --- Holded (con la clave del servidor) ---

function holdedHeaders(): Record<string, string> {
  const k = env.holdedKey();
  if (!k) throw new HttpError(500, 'HOLDED_API_KEY no configurada en el servidor');
  return {
    key: k,
    Authorization: `Bearer ${k}`,
    Accept: 'application/json',
    'User-Agent': 'SegurnubeHoldedSync/3.0',
  };
}

let employeesCache: { at: number; items: any[] } | null = null;

async function loadEmployees(): Promise<any[]> {
  if (employeesCache && Date.now() - employeesCache.at < 5 * 60_000) return employeesCache.items;
  const items: any[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 10; page++) {
    const url: string = `${HOLDED_BASE}/v2/employees?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const r = await fetch(url, { headers: holdedHeaders() });
    if (!r.ok) throw new HttpError(502, `Holded respondió ${r.status} al listar empleados`);
    const body: any = await r.json();
    const batch = Array.isArray(body) ? body : body.items || [];
    items.push(...batch);
    if (!body.has_more || !body.cursor || body.cursor === cursor) break;
    cursor = body.cursor;
  }
  employeesCache = { at: Date.now(), items };
  return items;
}

async function findEmployee(email: string): Promise<any | null> {
  const list = await loadEmployees();
  return (
    list.find(e => String(e.email || e.mainEmail || '').toLowerCase() === email) || null
  );
}

// --- Rate limit mínimo por usuario ---
const hits = new Map<string, { n: number; reset: number }>();
function rateLimit(email: string) {
  const now = Date.now();
  const h = hits.get(email);
  if (!h || h.reset < now) {
    hits.set(email, { n: 1, reset: now + 60_000 });
    return;
  }
  if (++h.n > 300) throw new HttpError(429, 'Demasiadas peticiones, espera un minuto');
}


// --- Listados completos (proyectos, tareas, tiempos) ---
// Holded pagina con cursor (máx. 100 por página). En vez de que el navegador pida
// páginas sueltas con un tope, el servidor recorre TODAS las páginas y devuelve el
// listado completo. Se cachea 60 s y se invalida con cualquier escritura.
const AGGREGATED = /^\/v2\/(tasks|projects|project-times)$/;
const MAX_PAGES: Record<string, number> = { '/v2/tasks': 300, '/v2/projects': 100, '/v2/project-times': 60 };
const AGG_TTL = 60_000;
const AGG_BUDGET_MS = 25_000;
const aggCache = new Map<string, { at: number; promise: Promise<any> }>();
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function holdedGet(url: string): Promise<globalThis.Response> {
  let r = await fetch(url, { headers: holdedHeaders() });
  if (r.status === 429) {
    await sleep(1000);
    r = await fetch(url, { headers: holdedHeaders() });
  }
  return r;
}

async function fetchAllPages(path: string, query: URLSearchParams) {
  const started = Date.now();
  const items: any[] = [];
  const seen = new Set<string>();
  const max = MAX_PAGES[path] || 50;
  let cursor: string | null = null;
  let truncated = false;
  for (let page = 0; page < max; page++) {
    const q = new URLSearchParams(query);
    q.delete('cursor');
    q.set('limit', '100');
    if (cursor) q.set('cursor', cursor);
    const r = await holdedGet(`${HOLDED_BASE}${path}?${q.toString()}`);
    if (!r.ok) {
      if (page === 0) throw new HttpError(502, `Holded respondió ${r.status}`);
      truncated = true;
      break;
    }
    const body: any = await r.json();
    const batch: any[] = Array.isArray(body) ? body : body.items || [];
    let added = 0;
    for (const it of batch) {
      const id = it && it.id;
      if (id === undefined || id === null) { items.push(it); added++; continue; }
      if (!seen.has(id)) { seen.add(id); items.push(it); added++; }
    }
    if (Array.isArray(body) || !added || !body.has_more || !body.cursor || body.cursor === cursor) break;
    cursor = body.cursor;
    if (page === max - 1 || Date.now() - started > AGG_BUDGET_MS) { truncated = true; break; }
  }
  if (truncated) console.warn(`[gateway] listado truncado ${path}: ${items.length} elementos`);
  return { items, has_more: false, cursor: null, total: items.length, truncated };
}

function getAllCached(path: string, query: URLSearchParams) {
  const q = new URLSearchParams(query);
  q.delete('cursor'); q.delete('limit');
  q.sort();
  const key = `${path}?${q.toString()}`;
  const hit = aggCache.get(key);
  if (hit && Date.now() - hit.at < AGG_TTL) return hit.promise;
  const promise = fetchAllPages(path, query);
  aggCache.set(key, { at: Date.now(), promise });
  promise.catch(() => aggCache.delete(key));
  if (aggCache.size > 200) aggCache.clear();
  return promise;
}

interface AuthedRequest extends Request {
  userEmail?: string;
  employee?: any;
}

async function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m) throw new HttpError(401, 'Falta autenticación');
    const email = await verifyGoogleToken(m[1]);
    rateLimit(email);
    const employee = await findEmployee(email);
    if (!employee) {
      throw new HttpError(403, 'Tu correo no está dado de alta como empleado en Holded');
    }
    req.userEmail = email;
    req.employee = employee;
    next();
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error('[gateway]', e);
    res.status(status).json({ message: status === 500 ? 'Error interno' : e.message });
  }
}

export function createGateway(): Router {
  const router = Router();
  router.use(compression());
  router.use(json({ limit: '1mb' }));

  // Perfil del propio usuario (único dato de empleados que sale del servidor).
  router.get('/me', requireUser, (req: AuthedRequest, res) => {
    const e = req.employee;
    res.json({
      email: req.userEmail,
      name: e.full_name || e.fullName || `${e.name || ''} ${e.last_name || ''}`.trim(),
      employeeId: e.id,
      holdedUserId: e.holded_user_id || e.holdedUserId || e.id,
    });
  });

  // Proxy a Holded con clave del servidor.
  router.use('/holded', requireUser, async (req: AuthedRequest, res) => {
    try {
      const path = req.path;
      if (!ALLOWED_PATHS.some(rx => rx.test(path))) {
        return res.status(403).json({ message: 'Ruta no permitida' });
      }

      // Empleados: solo el propio registro, nunca el directorio.
      if (path === '/v2/employees') {
        if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido' });
        return res.json({ items: [req.employee], has_more: false });
      }

      const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';

      // Listados completos: el servidor recorre todas las páginas de Holded
      const query = new URLSearchParams(qs.replace(/^\?/, ''));
      if (req.method === 'GET' && AGGREGATED.test(path) && !query.get('cursor')) {
        return res.json(await getAllCached(path, query));
      }
      const hasBody = !['GET', 'HEAD', 'DELETE'].includes(req.method);
      const upstream = await fetch(`${HOLDED_BASE}${path}${qs}`, {
        method: req.method,
        headers: {
          ...holdedHeaders(),
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        },
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      });
      if (hasBody || req.method === 'DELETE') aggCache.clear(); // una escritura invalida los listados
      const text = await upstream.text();
      res
        .status(upstream.status)
        .type(upstream.headers.get('content-type') || 'application/json')
        .send(text);
    } catch (e: any) {
      const status = e instanceof HttpError ? e.status : 502;
      console.error('[gateway] proxy error', e?.message);
      res.status(status).json({ message: 'Error al comunicar con Holded' });
    }
  });

  return router;
}
