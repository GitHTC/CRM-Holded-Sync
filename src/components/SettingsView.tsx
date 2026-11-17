import { useEffect, useState } from 'react';
import { isQuickLogEnabled, setQuickLogEnabled } from '../lib/quicklog';
import { useAppContext } from '../context/AppContext';
import { LogIn, LogOut, RefreshCw, ShieldCheck, AlertTriangle, UserRound } from 'lucide-react';

/** Bloques de píxel de la marca: decoración de la pantalla de acceso. */
function PixelDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 overflow-hidden">
      <div className="absolute right-6 bottom-4 grid grid-cols-3 gap-1.5 opacity-90">
        {[0, 1, 0, 0, 1, 1, 1, 0, 0].map((on, i) => (
          <span
            key={i}
            className={`w-7 h-7 rounded-[5px] ${on ? (i % 2 ? 'bg-soul' : 'bg-digital') : 'bg-transparent'}`}
          />
        ))}
      </div>
      <span className="absolute left-8 bottom-8 w-5 h-5 rounded-[4px] bg-human" />
      <span className="absolute left-16 bottom-3 w-3 h-3 rounded-[3px] bg-soul" />
    </div>
  );
}

export function SettingsView() {
  const { profile, signIn, signOut, setActiveTab } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [quickLog, setQuickLog] = useState(true);

  useEffect(() => { isQuickLogEnabled().then(setQuickLog); }, []);

  const toggleQuickLog = () => {
    const next = !quickLog;
    setQuickLog(next);
    setQuickLogEnabled(next);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await signIn();
    } catch (e: any) {
      setErrorMsg(e?.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-full bg-blue-50/60 overflow-y-auto">
      <div className="relative z-10 flex flex-col items-center px-6 pt-10 pb-44">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,87,255,0.10)] border border-blue-100 p-7">
          {profile ? (
            <>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-human/30 text-tech flex items-center justify-center mb-5">
                <ShieldCheck size={28} />
              </div>
              <h2 className="text-2xl font-display font-semibold text-tech text-center mb-1">
                ¡Hola, {profile.name.split(' ')[0] || 'equipo'}!
              </h2>
              <p className="text-sm text-tech/60 text-center mb-6">Sesión iniciada con tu cuenta de Google Workspace.</p>

              <div className="bg-blue-50 rounded-xl p-4 mb-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-digital text-white flex items-center justify-center shrink-0">
                  <UserRound size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-tech truncate">{profile.name}</p>
                  <p className="text-xs text-tech/60 truncate">{profile.email}</p>
                </div>
              </div>

              <div className="bg-white border border-blue-100 rounded-xl p-4 mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-tech">Aviso al enviar un correo</p>
                  <p className="text-xs text-tech/60 mt-0.5 leading-relaxed">
                    Al enviar un correo en Gmail, te propone imputar el tiempo a una tarea.
                  </p>
                </div>
                <button
                  role="switch" aria-checked={quickLog} onClick={toggleQuickLog}
                  className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${quickLog ? 'bg-digital' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${quickLog ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <button
                onClick={() => setActiveTab('crm')}
                className="w-full bg-digital hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors mb-3"
              >
                Ir a mi panel
              </button>
              <button
                onClick={signOut}
                className="w-full px-4 py-3 text-tech/70 hover:text-tech bg-white hover:bg-blue-50 border border-blue-100 font-medium rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-display font-semibold text-tech text-center mb-2">
                Accede a tu cuenta
              </h2>
              <p className="text-sm text-tech/60 text-center mb-7 leading-relaxed">
                Usa tu cuenta de Google Workspace. Verificaremos que eres empleado en Holded y solo verás tus datos.
              </p>

              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-digital hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-60 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <><RefreshCw size={18} className="animate-spin" /> Verificando…</>
                ) : (
                  <><LogIn size={18} /> Iniciar sesión con Google</>
                )}
              </button>

              {errorMsg && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                  <p className="leading-relaxed">{errorMsg}</p>
                </div>
              )}

              <p className="text-center text-xs text-tech/50 mt-5 leading-relaxed">
                No necesitas ninguna clave API. Tu administrador la gestiona de forma segura en el servidor.
              </p>
            </>
          )}
        </div>
      </div>
      <PixelDecor />
    </div>
  );
}
