import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { teamService } from '../services/holded';
import { User, CheckCircle2, LogIn, LogOut, Mail, RefreshCw, Key, AlertTriangle } from 'lucide-react';

export function SettingsView() {
  const { holdedApiKey, setHoldedApiKey, holdedUserId, setHoldedUserId, activeTab, setActiveTab } = useAppContext();
  const [employees, setEmployees] = useState<any[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState<string>(holdedApiKey || '');
  const [emailInput, setEmailInput] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  useEffect(() => {
    if (holdedApiKey) {
      loadEmployees(holdedApiKey);
      setApiKeyInput(holdedApiKey);
    }
  }, [holdedApiKey]);

  useEffect(() => {
    // Attempt to auto-fill email from Chrome Extension Identity if available
    const chrome = (window as any).chrome;
    if (chrome && chrome.identity && chrome.identity.getProfileUserInfo) {
      chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (userInfo: any) => {
        if (userInfo && userInfo.email && !emailInput) {
          setEmailInput(userInfo.email);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (holdedUserId && employees.length > 0) {
      const current = employees.find(emp => emp.holdedUserId === holdedUserId || emp.id === holdedUserId);
      if (current) setCurrentUserInfo(current);
    } else {
      setCurrentUserInfo(null);
    }
  }, [holdedUserId, employees]);

  const loadEmployees = async (key: string) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await teamService.getEmployees(key);
      const employeesList = Array.isArray(data) ? data : (data.employees || []);
      setEmployees(employeesList);
      if (employeesList.length === 0) {
        setErrorMsg('No se recuperaron empleados de Holded. Esto suele ocurrir si el Token API es incorrecto.');
      }
    } catch (e: any) {
      console.error("Error loading employees", e);
      setErrorMsg('Error de conexión con Holded. Por favor, revisa tu Token API.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await setHoldedApiKey(apiKeyInput.trim());
      setKeySavedMessage(true);
      setTimeout(() => setKeySavedMessage(false), 3000);
      await loadEmployees(apiKeyInput.trim());
    } catch (e) {
      setErrorMsg('Error al guardar el Token API.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetApiKey = async () => {
    const defaultKey = "pat_6a3d3cb6ecaffe5188010904_1e032953fc5fe909a4ccf27e84ccb53620142721b4d58c0595e7cf17757f1d9e";
    setApiKeyInput(defaultKey);
    setLoading(true);
    setErrorMsg('');
    try {
      await setHoldedApiKey(defaultKey);
      setKeySavedMessage(true);
      setTimeout(() => setKeySavedMessage(false), 3000);
      await loadEmployees(defaultKey);
    } catch (e) {
      setErrorMsg('Error al restablecer el Token API.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMsg('Por favor, introduce tu correo electrónico corporativo.');
      return;
    }

    if (employees.length === 0) {
      setErrorMsg('No se puede iniciar sesión porque el directorio de empleados está vacío. Por favor, asegúrate de que el Token API de Holded es correcto.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const emailLower = emailInput.toLowerCase().trim();
      
      const match = employees.find(emp => 
        (emp.email && emp.email.toLowerCase() === emailLower) || 
        (emp.mainEmail && emp.mainEmail.toLowerCase() === emailLower)
      );

      if (match) {
        // En Holded API, algunos endpoints usan id y otros holdedUserId. Preferimos holdedUserId pero caemos de vuelta al id nativo.
        const idToSave = match.holdedUserId || match.id;
        await setHoldedUserId(idToSave);
        setCurrentUserInfo(match);
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          if (activeTab === 'settings') {
            setActiveTab('crm');
          }
        }, 1000);
      } else {
        setErrorMsg('No se encontró ningún empleado en Holded con ese correo.');
      }
    } catch(err) {
      setErrorMsg('Error validando el usuario.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await setHoldedUserId(null);
    setEmailInput('');
    setCurrentUserInfo(null);
  };

  return (
    <div className="p-6 h-full bg-white flex flex-col pt-12 items-center overflow-y-auto">
      <div className="text-center mb-10">
        {currentUserInfo ? (
          <div className="mx-auto w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={32} />
          </div>
        ) : (
          <div className="mx-auto w-16 h-16 bg-blue-50 text-[#1a73e8] rounded-full flex items-center justify-center mb-6">
            <User size={32} />
          </div>
        )}
        
        <h2 className="text-2xl font-google text-[#202124] mb-2">
          {currentUserInfo ? `¡Hola, ${currentUserInfo.name}!` : 'Acceso a Holded Sync'}
        </h2>
        <p className="text-[#5f6368] text-sm">
          {currentUserInfo 
            ? 'Has sincronizado tu cuenta correctamente.'
            : 'Introduce tu correo electrónico de Google Workspace asociado a Holded.'}
        </p>
      </div>

      <div className="space-y-6 w-full max-w-sm">
        {!holdedUserId ? (
          <div className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3c4043] mb-2 font-google">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    disabled={loading}
                    placeholder="ejemplo@tu-dominio.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] shadow-sm text-gray-800 disabled:opacity-50"
                    required
                  />
                  <Mail size={18} className="absolute left-3 top-3.5 text-gray-500" />
                </div>
                {employees.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 font-medium mb-1.5 flex justify-between">
                      <span>Empleados detectados en Holded:</span>
                      <span className="text-blue-600 font-normal">Haz clic para auto-rellenar</span>
                    </p>
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-md border border-gray-200">
                      {employees.map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => setEmailInput(emp.email || emp.mainEmail || '')}
                          className="text-left text-xs px-2 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-gray-700 hover:text-[#1a73e8] rounded transition-colors flex justify-between items-center"
                        >
                          <span className="font-medium truncate">{emp.fullName || emp.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono truncate">{emp.email || emp.mainEmail}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {employees.length === 0 && loading && (
                  <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                    <RefreshCw size={12} className="animate-spin" /> Cargando directorio...
                  </p>
                )}
                {employees.length === 0 && !loading && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-bold">Directorio de empleados vacío</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed">
                        No se ha podido conectar con Holded o el directorio está vacío. Por favor, <strong>configura tu Token API de Holded abajo</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !emailInput}
                className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium py-3 px-4 rounded-md transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading && employees.length > 0 ? (
                  <><RefreshCw size={18} className="animate-spin" /> Verificando...</>
                ) : saved ? (
                  <><CheckCircle2 size={18} /> Validado</>
                ) : (
                  <><LogIn size={18} /> Iniciar Sesión Segura</>
                )}
              </button>
              <p className="text-center text-xs text-gray-500 pt-2">
                El correo debe coincidir con tu perfil de Holded. Esto evita suplantaciones.
              </p>
            </form>

            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditingKey(!isEditingKey)}
                className="text-xs text-[#1a73e8] hover:underline font-medium flex items-center justify-center w-full gap-1"
              >
                <Key size={14} />
                {isEditingKey ? 'Ocultar ajustes del Token API' : 'Configurar Token API de Holded'}
              </button>
              
              {isEditingKey && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Si tu información no aparece, puedes introducir o cambiar el Token API de tu cuenta de Holded aquí:
                  </p>
                  <div>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Introduce tu Token API de Holded..."
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] text-xs font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      disabled={loading || !apiKeyInput.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded text-xs transition"
                    >
                      Guardar Token
                    </button>
                    <button
                      type="button"
                      onClick={handleResetApiKey}
                      disabled={loading}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1.5 px-3 rounded text-xs transition"
                    >
                      Restablecer
                    </button>
                  </div>
                  {keySavedMessage && (
                    <p className="text-[10px] text-green-600 font-bold">¡Token API actualizado con éxito!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              <p className="text-sm text-gray-500 mb-1">Sesión activa como:</p>
              <p className="font-medium text-gray-900">{currentUserInfo?.mainEmail || currentUserInfo?.email || 'Usuario de Holded'}</p>
            </div>
            
            <button
              onClick={handleClear}
              className="w-full px-4 py-3 text-[#ea4335] bg-red-50 hover:bg-red-100 font-medium rounded-md transition-colors flex justify-center items-center gap-2"
            >
              <LogOut size={16} />
              Cerrar Sesión Local
            </button>

            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditingKey(!isEditingKey)}
                className="text-xs text-[#1a73e8] hover:underline font-medium flex items-center justify-center w-full gap-1"
              >
                <Key size={14} />
                {isEditingKey ? 'Ocultar ajustes del Token API' : 'Ver / Editar Token API'}
              </button>
              
              {isEditingKey && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Introduce tu Token API de Holded..."
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] text-xs font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      disabled={loading || !apiKeyInput.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded text-xs transition"
                    >
                      Guardar Token
                    </button>
                    <button
                      type="button"
                      onClick={handleResetApiKey}
                      disabled={loading}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1.5 px-3 rounded text-xs transition"
                    >
                      Restablecer
                    </button>
                  </div>
                  {keySavedMessage && (
                    <p className="text-[10px] text-green-600 font-bold">¡Token API actualizado con éxito!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
