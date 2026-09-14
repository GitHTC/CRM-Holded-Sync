import React, { useState, useEffect } from 'react';
import { projectsService } from '../services/holded';
import { useAppContext } from '../context/AppContext';
import { X, TrendingUp, CheckCircle, Clock, DollarSign, AlertCircle, PieChart, Briefcase } from 'lucide-react';
import { Spinner } from './Spinner';

interface ProjectSummaryModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function ProjectSummaryModal({ projectId, projectName, onClose }: ProjectSummaryModalProps) {
  const { holdedApiKey } = useAppContext();
  const [summary, setSummary] = useState<any>(null);
  const [projectDetail, setProjectDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      if (!holdedApiKey || !projectId) return;
      try {
        setLoading(true);
        setError(null);
        const [sumData, detailData] = await Promise.all([
          projectsService.getProjectSummary(holdedApiKey, projectId).catch(err => {
            console.warn("Could not get summary", err);
            return null;
          }),
          projectsService.getProject(holdedApiKey, projectId).catch(err => {
            console.warn("Could not get project detail", err);
            return null;
          })
        ]);

        setSummary(sumData);
        setProjectDetail(detailData);
      } catch (err: any) {
        setError(err.message || 'Error al obtener resumen del proyecto');
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [holdedApiKey, projectId]);

  const tasksTotal = summary?.projectEvolution?.tasks?.total ?? projectDetail?.numberOfTasks ?? 0;
  const tasksCompleted = summary?.projectEvolution?.tasks?.completed ?? projectDetail?.completedTasks ?? 0;
  const taskProgress = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

  const profitability = summary?.profitability;
  const economic = summary?.economicStatus;

  const formatCurrency = (val: number | string | undefined | null) => {
    const num = typeof val === 'number' ? val : parseFloat(val || '0');
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(isNaN(num) ? 0 : num);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-800 leading-tight">Resumen y Evolución (v2)</h3>
              <p className="text-xs text-gray-400 font-medium truncate max-w-sm">{projectName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12">
              <Spinner />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-2.5 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Project Evolution / Progress */}
              <div className="bg-blue-50/40 border border-blue-100/80 rounded-2xl p-4.5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Evolución de Tareas</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-100 shadow-xs">
                    {taskProgress}% completado
                  </span>
                </div>

                <div className="w-full bg-blue-100/60 rounded-full h-2.5 mb-3 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${taskProgress}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-xl p-2.5 border border-blue-100/60 shadow-xs">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Tareas</span>
                    <span className="text-sm font-bold text-gray-800 font-mono">{tasksTotal}</span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-blue-100/60 shadow-xs">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Completadas</span>
                    <span className="text-sm font-bold text-green-600 font-mono">{tasksCompleted}</span>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-blue-100/60 shadow-xs col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Pendientes</span>
                    <span className="text-sm font-bold text-amber-600 font-mono">{Math.max(0, tasksTotal - tasksCompleted)}</span>
                  </div>
                </div>
              </div>

              {/* Economic Status Grid */}
              <div>
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-green-600" />
                  Estado Económico (Holded v2)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Presupuestado</span>
                    <span className="text-sm font-bold text-gray-800 font-mono">
                      {formatCurrency(economic?.estimatePrice ?? economic?.quoted ?? 0)}
                    </span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Facturado</span>
                    <span className="text-sm font-bold text-blue-600 font-mono">
                      {formatCurrency(economic?.billed ?? economic?.sales ?? 0)}
                    </span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Cobrado</span>
                    <span className="text-sm font-bold text-green-600 font-mono">
                      {formatCurrency(economic?.collected ?? 0)}
                    </span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Pendiente</span>
                    <span className="text-sm font-bold text-orange-500 font-mono">
                      {formatCurrency(economic?.remaining ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profitability */}
              <div>
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <PieChart size={14} className="text-indigo-600" />
                  Rentabilidad y Gastos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Ventas Totales</span>
                    <span className="text-sm font-bold text-gray-800 font-mono">
                      {formatCurrency(profitability?.sales ?? 0)}
                    </span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Gastos (Personal + Docs)</span>
                    <span className="text-sm font-bold text-red-500 font-mono">
                      {formatCurrency(profitability?.expenses?.total ?? 0)}
                    </span>
                    {profitability?.expenses?.personnel ? (
                      <span className="text-[9px] text-gray-400 block mt-0.5">
                        Personal: {formatCurrency(profitability.expenses.personnel)}
                      </span>
                    ) : null}
                  </div>
                  <div className="bg-green-50/50 border border-green-100 rounded-xl p-3">
                    <span className="text-[10px] text-green-700 font-semibold uppercase block mb-1">Beneficio Neto</span>
                    <span className="text-sm font-bold text-green-700 font-mono">
                      {formatCurrency(profitability?.profit ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Project Members Info */}
              {projectDetail?.users && Object.keys(projectDetail.users).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Briefcase size={14} className="text-blue-600" />
                    Equipo Asignado al Proyecto
                  </h4>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
                    {Object.entries(projectDetail.users).map(([userId, user]: [string, any]) => (
                      <div key={userId} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50 transition-colors">
                        <div>
                          <span className="font-semibold text-gray-800">{user.name || 'Miembro del equipo'}</span>
                          <span className="ml-2 text-[10px] uppercase font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                            {user.role || 'member'}
                          </span>
                        </div>
                        <div className="text-right text-[11px] text-gray-500 font-mono">
                          {user.hourlyrate > 0 && <span>Tarifa: {formatCurrency(user.hourlyrate)}/h</span>}
                          {user.hourlycost > 0 && <span className="ml-2">Coste: {formatCurrency(user.hourlycost)}/h</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50/80 px-6 py-3.5 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
