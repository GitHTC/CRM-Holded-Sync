import React, { useState, useEffect } from 'react';
import { projectsService } from '../services/holded';
import { useAppContext } from '../context/AppContext';
import { Spinner } from './Spinner';
import { Play, Square, CheckCircle2, Calendar, Clock, Search, X, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isBefore, isAfter, addDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export function ProjectsView() {
  const { holdedApiKey, holdedUserId, activeTask, setActiveTask, startTime, setStartTime } = useAppContext();
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<Record<string, any[]>>({});
  const [taskTimes, setTaskTimes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time tracking state
  const [elapsed, setElapsed] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Search and Manual Time State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');
  const [favoriteTaskIds, setFavoriteTaskIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('holdedSync_favoriteTasks') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('holdedSync_favoriteTasks', JSON.stringify(favoriteTaskIds));
  }, [favoriteTaskIds]);

  const toggleFavorite = (taskId: string) => {
    setFavoriteTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const [manualTimeData, setManualTimeData] = useState<{
    isOpen: boolean;
    taskId: string;
    projectId: string;
    desc: string;
    hours: number;
    minutes: number;
  }>({
    isOpen: false,
    taskId: '',
    projectId: '',
    desc: '',
    hours: 0,
    minutes: 0
  });

  useEffect(() => {
    if (!holdedApiKey) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [projectsData, tasksData, timesData] = await Promise.all([
          projectsService.getProjects(holdedApiKey).catch(() => []),
          projectsService.getTasks(holdedApiKey).catch(() => []),
          projectsService.getAllTimes(holdedApiKey).catch(e => {
            console.error("Error fetching times:", e);
            return [];
          })
        ]);
        
        const projectsArr = Array.isArray(projectsData) ? projectsData : [];
        const tasksArr = Array.isArray(tasksData) ? tasksData : [];
        const timesArr = Array.isArray(timesData) ? timesData : [];

        setProjects(projectsArr);
        setTasks(tasksArr);

        // Calculate total time per task
        const timeMap: Record<string, number> = {};
        for (const p of timesArr) {
          if (Array.isArray(p.timeTracking)) {
            for (const t of p.timeTracking) {
              if (t.taskId) {
                timeMap[t.taskId] = (timeMap[t.taskId] || 0) + (t.duration || 0);
              }
            }
          }
        }
        setTaskTimes(timeMap);

        // Fetch statuses for each project to identify "Progress" tasks
        const statusesMap: Record<string, any[]> = {};
        setProjectStatuses(statusesMap);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos de Proyectos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [holdedApiKey]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeTask && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTask, startTime]);

  const handleStartTimer = (taskId: string) => {
    if (activeTask && activeTask !== taskId) {
      alert("Por favor detén el temporizador actual primero.");
      return;
    }
    setActiveTask(taskId);
    setStartTime(Date.now());
    setElapsed(0);
    setSaveSuccess(false);
  };

  const handleStopTimer = async (taskId: string, projectId: string) => {
    // Some holded endpoints return project_id instead of projectId
    if (!projectId) {
      alert("Error: No se encontró el proyecto de esta tarea.");
      return;
    }
    if (!holdedApiKey || !startTime || !holdedUserId) return;
    
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    if (durationSeconds < 60) {
      const confirmSave = window.confirm("Has registrado muy poco tiempo (menos de 1 minuto). ¿Deseas guardarlo de todos modos?");
      if (!confirmSave) {
        setActiveTask(null);
        setStartTime(null);
        return;
      }
    }

    setSaving(true);
    try {
      await projectsService.addTimeTracking(holdedApiKey, projectId, {
        duration: durationSeconds,
        costHour: 0,
        desc: "Tiempo registrado desde Holded Sync",
        taskId: taskId,
        userId: holdedUserId
      });
      
      setTaskTimes(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || 0) + durationSeconds
      }));
      setSaveSuccess(true);
      window.alert("✅ ¡Tiempo registrado exitosamente!");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Error al guardar el tiempo: " + err.message);
    } finally {
      setActiveTask(null);
      setStartTime(null);
      setSaving(false);
    }
  };

  const openManualTimeModal = (taskId: string, projectId: string) => {
    setManualTimeData({
      isOpen: true,
      taskId,
      projectId,
      desc: '',
      hours: 0,
      minutes: 0
    });
  };

  const saveManualTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdedApiKey || !holdedUserId) return;

    const totalSeconds = (manualTimeData.hours * 3600) + (manualTimeData.minutes * 60);
    if (totalSeconds <= 0) {
      alert('Introduce un tiempo válido mayor a 0.');
      return;
    }

    setSaving(true);
    try {
      await projectsService.addTimeTracking(holdedApiKey, manualTimeData.projectId, {
        duration: totalSeconds,
        costHour: 0,
        desc: manualTimeData.desc || "Añadido manualmente",
        taskId: manualTimeData.taskId,
        userId: holdedUserId
      });

      setTaskTimes(prev => ({
        ...prev,
        [manualTimeData.taskId]: (prev[manualTimeData.taskId] || 0) + totalSeconds
      }));
      setManualTimeData(prev => ({ ...prev, isOpen: false }));
      setSaveSuccess(true);
      window.alert("✅ ¡Tiempo manual registrado exitosamente!");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Error al registrar tiempo manual: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        <h3 className="font-semibold">Error</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  const today = startOfDay(new Date());

  // Function to determine if a status is in "Progress" (group 1 in Holded)
  // Group types in Holded: 0 = To Do, 1 = In Progress, 2 = Done
  const isProgressTask = (task: any) => {
    const taskProjectId = task.projectId || task.projectid || task.project_id;
    const statuses = projectStatuses[taskProjectId];
    if (!statuses) return task.status === 1; // Fallback to basic status check
    
    const taskStatus = statuses.find(s => 
      String(s.id) === String(task.status) ||
      String(s.statusId) === String(task.statusId) || 
      String(s.id) === String(task.statusId) ||
      String(s.status_id) === String(task.status) ||
      String(s.status_id) === String(task.statusId)
    );
    if (!taskStatus) return task.status === 1;

    // Holded API: status group/type
    // 0: Todo, 1: Progress, 2: Done
    return taskStatus.type === 1 || taskStatus.group === 1 || taskStatus.column === 1;
  };

  const searchedTasks = (Array.isArray(tasks) ? tasks : []).filter(t => {
    // Excluir tareas terminadas (opcional, pero normalmente deseado)
    if (t.status === 2) return false;

    // Filtro de favoritos
    if (viewMode === 'favorites' && !favoriteTaskIds.includes(t.id)) {
      return false;
    }

    if (searchQuery.trim()) {
      return t.name?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Agrupaciones por Proyecto
  const projectsWithTasks = (Array.isArray(projects) ? projects : []).map(p => {
    return {
      ...p,
      myTasks: searchedTasks.filter(t => t.projectId === p.id)
    };
  }).filter(p => p.myTasks.length > 0);

  const renderProjectGroup = (project: any) => {
    const groupTasks = project.myTasks || [];
    return (
      <div key={project.id} className="mb-6 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <h3 className="text-[15px] font-semibold text-gray-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              {project.name}
            </span>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
              {groupTasks.length} Tareas
            </span>
          </h3>
        </div>
        
        {groupTasks.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 italic">No hay tareas pendientes en este proyecto.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupTasks.map((task: any) => {
              const isTracking = activeTask === task.id;
              
              return (
                <div key={task.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between transition-colors ${isTracking ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                  <div className="flex-1 pr-3 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <button
                        onClick={() => toggleFavorite(task.id)}
                        className={`transition-colors flex-shrink-0 ${favoriteTaskIds.includes(task.id) ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-300 hover:text-gray-400'}`}
                        title={favoriteTaskIds.includes(task.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                      >
                        <Star size={16} fill={favoriteTaskIds.includes(task.id) ? "currentColor" : "none"} />
                      </button>
                      {(() => {
                        const taskProjectId = task.projectId || task.projectid || task.project_id;
                        const statuses = projectStatuses[taskProjectId] || [];
                        // Attempt to find matching status ID by checking different common property names
                        const statusInfo = statuses.find(s => 
                          String(s.id) === String(task.status) ||
                          String(s.statusId) === String(task.statusId) || 
                          String(s.id) === String(task.statusId) || 
                          String(s.status_id) === String(task.statusId) || 
                          String(s.status_id) === String(task.status) ||
                          s.name?.toLowerCase() === task.statusName?.toLowerCase() ||
                          s.name?.toLowerCase() === task.status?.toLowerCase() ||
                          String(s.status) === String(task.status)
                        );
                        return (
                          <span className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded tracking-wider">
                            {statusInfo ? statusInfo.name : (task.statusName || (task.status === 0 ? 'PENDIENTE' : task.status === 1 ? 'EN PROGRESO' : 'TAREA'))}
                          </span>
                        );
                      })()}
                    </div>
                    <h4 className={`font-medium text-sm leading-tight mb-2 ${isTracking ? 'text-[#1a73e8]' : 'text-[#202124]'}`}>
                      {task.name}
                    </h4>
                    <div className="flex items-center justify-between">
                      {task.dueDate > 0 ? (
                        <span className={`text-xs flex items-center gap-1 ${isBefore(new Date(task.dueDate * 1000), today) ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          <Calendar size={12} />
                          {format(new Date(task.dueDate * 1000), 'd MMM yyyy', { locale: es })}
                        </span>
                      ) : <span className="text-xs text-gray-400">Sin fecha limite</span>}
                      {isTracking ? (
                        <div className="text-[#1a73e8] text-xs font-mono font-medium flex items-center gap-1">
                          ⏱ {formatTime((taskTimes[task.id] || 0) + elapsed)}
                        </div>
                      ) : taskTimes[task.id] ? (
                        <div className="text-gray-500 text-xs font-mono font-medium flex items-center gap-1">
                          ⏱ {formatTime(taskTimes[task.id])}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 mt-3 sm:mt-0 sm:pl-4 flex justify-end items-center sm:border-l sm:border-gray-100 gap-2">
                    <button
                      onClick={() => openManualTimeModal(task.id, task.projectId || task.projectid || task.project_id)}
                      disabled={saving}
                      className="w-10 h-10 rounded-full bg-white border border-gray-300 text-gray-600 flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm disabled:opacity-50"
                      title="Añadir tiempo manualmente"
                    >
                      <Clock size={16} />
                    </button>
                    {isTracking ? (
                      <button
                        onClick={() => handleStopTimer(task.id, task.projectId || task.projectid || task.project_id)}
                        disabled={saving}
                        className="w-10 h-10 rounded-full bg-[#ea4335] text-white flex items-center justify-center hover:bg-[#d93025] transition-colors shadow-sm disabled:opacity-50"
                        title="Detener tiempo"
                      >
                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Square size={16} fill="currentColor" />}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartTimer(task.id)}
                        disabled={activeTask !== null || saving}
                        className="w-10 h-10 rounded-full bg-[#1a73e8] text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-100"
                        title="Iniciar tiempo"
                      >
                        <Play size={16} fill="currentColor" className="ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-50 min-h-full pb-20">
      <div className="mb-6 space-y-4">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <h2 className="text-xl font-google text-[#202124]">Proyectos en curso</h2>
           <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
             <button 
               onClick={() => setViewMode('all')}
               className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1", viewMode === 'all' ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100")}
             >
               Todas
             </button>
             <button 
               onClick={() => setViewMode('favorites')}
               className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1", viewMode === 'favorites' ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100")}
             >
               <Star size={14} fill={viewMode === 'favorites' ? "currentColor" : "none"} />
               Favoritas
             </button>
           </div>
         </div>
         <div className="relative w-full">
           <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
           <input 
             type="text" 
             placeholder="Buscar tareas en tus proyectos..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
           />
         </div>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center gap-2 mb-6 shadow-sm">
           <CheckCircle2 size={18} className="text-green-600" />
           <span className="text-sm font-medium">¡Tiempo registrado exitosamente!</span>
        </div>
      )}
      
      {projectsWithTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300 shadow-sm">
          <p>{searchQuery ? 'No se encontraron tareas con esa búsqueda' : 'No hay proyectos en curso'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {projectsWithTasks.map(p => renderProjectGroup(p))}
        </div>
      )}

      {/* Modal añadir tiempo manual */}
      {manualTimeData.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in overflow-hidden">
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-google font-medium text-lg text-gray-800 flex items-center gap-2">
                <Clock size={20} className="text-[#1a73e8]" />
                Asignar tiempo manual
              </h3>
              <button onClick={() => setManualTimeData(prev => ({...prev, isOpen: false}))} className="text-gray-400 hover:text-gray-600 rounded">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={saveManualTime} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3c4043] mb-1.5">Descripción de la tarea</label>
                <textarea 
                  required
                  value={manualTimeData.desc}
                  onChange={e => setManualTimeData({...manualTimeData, desc: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px] resize-none"
                  placeholder="Añadir una descripción..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#3c4043] mb-1.5">Horas</label>
                  <input 
                    type="number" min="0" max="24"
                    value={manualTimeData.hours}
                    onChange={e => setManualTimeData({...manualTimeData, hours: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3c4043] mb-1.5">Minutos</label>
                  <input 
                    type="number" min="0" max="59"
                    value={manualTimeData.minutes}
                    onChange={e => setManualTimeData({...manualTimeData, minutes: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setManualTimeData(prev => ({...prev, isOpen: false}))} 
                  className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving || (!manualTimeData.hours && !manualTimeData.minutes)}
                  className="flex-1 bg-[#1a73e8] text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

