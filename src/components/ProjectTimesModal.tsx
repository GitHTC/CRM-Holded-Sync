import React, { useState, useEffect, useMemo } from 'react';
import { projectsService } from '../services/holded';
import { useAppContext } from '../context/AppContext';
import { X, Clock, Trash2, Calendar, User, AlertCircle, Check, CheckSquare } from 'lucide-react';
import { Spinner } from './Spinner';
import { toDateInputValue, parseSafeDate } from '../lib/dateUtils';
import { stripHtml, sanitizeHtml } from '../lib/format';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectTimesModalProps {
  projectId: string;
  projectName: string;
  tasks?: any[];
  onClose: () => void;
  onTimeChanged?: () => void;
}

export function ProjectTimesModal({
  projectId,
  projectName,
  tasks = [],
  onClose,
  onTimeChanged
}: ProjectTimesModalProps) {
  const { holdedApiKey } = useAppContext();
  const [times, setTimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const taskMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const t of tasks) {
      if (t.id) map[t.id] = t;
    }
    return map;
  }, [tasks]);

  const loadTimes = async () => {
    if (!holdedApiKey || !projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await projectsService.getProjectTimes(holdedApiKey, projectId);
      setTimes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los registros de tiempo del proyecto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimes();
  }, [holdedApiKey, projectId]);

  const handleDeleteTime = async (timeId: string) => {
    if (!holdedApiKey || !projectId) return;
    const confirmDelete = window.confirm('¿Seguro que deseas eliminar este registro de tiempo de Holded?');
    if (!confirmDelete) return;

    setDeletingId(timeId);
    try {
      await projectsService.deleteTimeTracking(holdedApiKey, projectId, timeId);
      setTimes(prev => prev.filter(t => t.id !== timeId));
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
      if (onTimeChanged) onTimeChanged();
    } catch (err: any) {
      alert('Error al eliminar registro de tiempo: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h 00m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  const totalProjectSeconds = times.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0);

  // Group project time entries by day (YYYY-MM-DD)
  const groupedByDay = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dayMap: Record<string, { dateKey: string; totalSeconds: number; items: any[] }> = {};

    for (const item of times) {
      const rawDate = item.date || item.created_at || item.createdAt;
      const dateKey = toDateInputValue(rawDate) || todayStr;
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = { dateKey, totalSeconds: 0, items: [] };
      }
      dayMap[dateKey].totalSeconds += Number(item.duration) || 0;
      dayMap[dateKey].items.push(item);
    }

    return Object.values(dayMap).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [times]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-800 leading-tight">
                Tiempos Imputados por Día (v2)
              </h3>
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
        <div className="p-6 overflow-y-auto space-y-4">
          {deleteSuccess && (
            <div className="bg-green-50 border border-green-100 text-green-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 font-medium">
              <Check size={16} className="text-green-500" />
              Registro de tiempo eliminado con éxito de Holded.
            </div>
          )}

          {/* Total summary banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100/60 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 block">
                Tiempo Total del Proyecto
              </span>
              <span className="text-xl font-bold font-mono text-gray-800">
                {formatDuration(totalProjectSeconds)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">
                Días / Entradas
              </span>
              <span className="text-sm font-bold text-gray-600 font-mono">
                {groupedByDay.length} {groupedByDay.length === 1 ? 'día' : 'días'} ({times.length}{' '}
                {times.length === 1 ? 'registro' : 'registros'})
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-12">
              <Spinner />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-2.5 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : groupedByDay.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs font-semibold text-gray-500">
                No hay registros de tiempo en este proyecto
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Usa el cronómetro o añade tiempo manual desde las tareas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedByDay.map((dayGroup) => {
                const parsedDate = parseSafeDate(dayGroup.dateKey);
                const formattedDay = parsedDate
                  ? format(parsedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
                  : dayGroup.dateKey;

                return (
                  <div
                    key={dayGroup.dateKey}
                    className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                  >
                    <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 capitalize flex items-center gap-1.5">
                        <Calendar size={13} className="text-blue-600" />
                        {formattedDay}
                      </span>
                      <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        Total día: {formatDuration(dayGroup.totalSeconds)}
                      </span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {dayGroup.items.map((timeItem: any, idx: number) => {
                        const tid = timeItem.taskId || timeItem.task_id;
                        const taskObj = tid ? taskMap[tid] : null;
                        const taskName = taskObj?.name ? stripHtml(taskObj.name) : null;
                        const userName = timeItem.userName || timeItem.user_name;
                        const cleanDesc = stripHtml(timeItem.description || '');

                        return (
                          <div
                            key={timeItem.id || idx}
                            className="p-3.5 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
                          >
                            <div className="flex-1 pr-4 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-xs font-bold font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                                  {formatDuration(Number(timeItem.duration) || 0)}
                                </span>
                                {taskName && (
                                  <span className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                                    <CheckSquare size={12} className="text-blue-500 shrink-0" />
                                    {taskName}
                                  </span>
                                )}
                                {userName && (
                                  <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                                    <User size={12} />
                                    {userName}
                                  </span>
                                )}
                              </div>
                              {cleanDesc && (
                                <div
                                  className="text-xs text-gray-600 line-clamp-2 [&_p]:inline"
                                  dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(timeItem.description)
                                  }}
                                />
                              )}
                              {timeItem.cost_per_hour && Number(timeItem.cost_per_hour) > 0 && (
                                <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                                  Coste/h: {timeItem.cost_per_hour} €
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleDeleteTime(timeItem.id)}
                              disabled={deletingId === timeItem.id}
                              className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
                              title="Eliminar registro de tiempo"
                            >
                              {deletingId === timeItem.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
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
