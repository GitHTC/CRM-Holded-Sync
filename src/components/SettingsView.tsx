import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { teamService } from '../services/holded';
import { User, CheckCircle2, LogIn, LogOut, Mail, RefreshCw } from 'lucide-react';

export function SettingsView() {
  const { holdedApiKey, holdedUserId, setHoldedUserId, activeTab, setActiveTab } = useAppContext();
  const [employees, setEmployees] = useState<any[]>([]);
  const [emailInput, setEmailInput] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);

  useEffect(() => {
    if (holdedApiKey) {
      loadEmployees(holdedApiKey);
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
      const data = await teamService.getEmployees(key);
      const employeesList = Array.isArray(data) ? data : (data.employees || []);
      setEmployees(employeesList);
    } catch (e) {
      console.error("Error loading employees", e);
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
                  disabled={loading || employees.length === 0}
                  placeholder="ejemplo@tu-dominio.com"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] shadow-sm text-gray-800"
                  required
                />
                <Mail size={18} className="absolute left-3 top-3.5 text-gray-500" />
              </div>
              {employees.length === 0 && loading && (
                <p className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin" /> Cargando directorio...
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || employees.length === 0 || !emailInput}
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
          </div>
        )}
      </div>
    </div>
  );
}
