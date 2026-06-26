import React, { useState, useEffect } from 'react';
import { projectsService, contactsService } from '../services/holded';
import { useAppContext } from '../context/AppContext';
import { Spinner } from './Spinner';
import { 
  Play, 
  Square, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Search, 
  X, 
  Star, 
  Plus, 
  FolderPlus, 
  ListPlus, 
  AlertCircle, 
  FileText 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export function ProjectsView() {
  const { holdedApiKey, holdedUserId, activeTask, setActiveTask, startTime, setStartTime } = useAppContext();
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
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

  // Modal Creation States
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    dueDate: '',
    contactId: ''
  });

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    projectId: '',
    name: '',
    description: '',
    dueDate: '',
    priority: 0
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

  const loadData = async () => {
    if (!holdedApiKey) return;
    try {
      setLoading(true);
      setError(null);
      const [projectsData, tasksData, timesData, contactsData] = await Promise.all([
        projectsService.getProjects(holdedApiKey).catch(() => []),
        projectsService.getTasks(holdedApiKey).catch(() => []),
        projectsService.getAllTimes(holdedApiKey).catch(e => {
          console.error("Error fetching times:", e);
          return [];
        }),
        contactsService.getContacts(holdedApiKey).catch(() => [])
      ]);
      
      const projectsArr = Array.isArray(projectsData) ? projectsData : [];
      const tasksArr = Array.isArray(tasksData) ? tasksData : [];
      const timesArr = Array.isArray(timesData) ? timesData : [];
      const contactsArr = Array.isArray(contactsData) ? contactsData : [];

      setProjects(projectsArr);
      setTasks(tasksArr);
      setContacts(contactsArr);

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

      // Initialize default status map if needed
      const statusesMap: Record<string, any[]> = {};
      setProjectStatuses(statusesMap);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos de Proyectos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      setTimeout(() => setSaveSuccess(false), 5000);
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
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      alert("Error al registrar tiempo manual: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdedApiKey) return;
    setSaving(true);
    try {
      await projectsService.createProject(holdedApiKey, {
        name: newProject.name,
        description: newProject.description || null,
        dueDate: newProject.dueDate || null,
        contactId: newProject.contactId || null
      });
      setIsCreateProjectOpen(false);
      setNewProject({ name: '', description: '', dueDate: '', contactId: '' });
      await loadData();
    } catch (err: any) {
      alert("Error al crear el proyecto: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdedApiKey) return;
    setSaving(true);
    try {
      await projectsService.createTask(holdedApiKey, {
        projectId: newTask.projectId,
        name: newTask.name,
        description: newTask.description || null,
        dueDate: newTask.dueDate || null,
        priority: Number(newTask.priority),
        status: 'todo'
      });
      setIsCreateTaskOpen(false);
      setNewTask({ projectId: '', name: '', description: '', dueDate: '', priority: 0 });
      await loadData();
    } catch (err: any) {
      alert("Error al crear la tarea: " + err.message);
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
      <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-3 shadow-sm">
        <AlertCircle className="shrink-0 text-red-500 mt-0.5" />
        <div>
          <h3 className="font-bold text-sm">Error de sincronización</h3>
          <p className="text-xs mt-1 text-red-600">{error}</p>
          <button onClick={loadData} className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const today = startOfDay(new Date());

  const searchedTasks = (Array.isArray(tasks) ? tasks : []).filter(t => {
    // Exclude completed tasks (index 2 or string 'completed')
    if (t.status === 2 || t.status === 'completed' || t.status === 'done') return false;

    // Filter favorites
    if (viewMode === 'favorites' && !favoriteTaskIds.includes(t.id)) {
      return false;
    }

    if (searchQuery.trim()) {
      return t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
             t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Project groups
  const projectsWithTasks = (Array.isArray(projects) ? projects : []).map(p => {
    return {
      ...p,
      myTasks: searchedTasks.filter(t => t.projectId === p.id)
    };
  });

  // Filter project groups if searching
  const filteredProjects = projectsWithTasks.filter(p => {
    if (!searchQuery.trim()) return true;
    const projectMatches = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const hasMatchingTasks = p.myTasks.length > 0;
    return projectMatches || hasMatchingTasks;
  });

  const renderProjectGroup = (project: any) => {
    const groupTasks = project.myTasks || [];
    return (
      <div key={project.id} className="mb-6 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
        <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {project.name}
            </h3>
            {project.description && (
              <p className="text-xs text-gray-400 mt-1 pl-4 max-w-xl truncate" title={project.description}>
                {project.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 sm:justify-end">
            <button
              onClick={() => {
                setNewTask(prev => ({ ...prev, projectId: project.id }));
                setIsCreateTaskOpen(true);
              }}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus size={14} />
              Añadir Tarea
            </button>
            <span className="bg-white border border-gray-200 text-gray-500 px-3 py-1 rounded-lg text-xs font-semibold shadow-sm">
              {groupTasks.length} {groupTasks.length === 1 ? 'Tarea' : 'Tareas'}
            </span>
          </div>
        </div>
        
        {groupTasks.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/10">
            <FileText size={32} className="mx-auto text-gray-200 mb-2.5" />
            <p className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-1">No hay tareas pendientes</p>
            <p className="text-xs text-gray-400 mb-4 max-w-xs mx-auto">Crea una nueva tarea en este proyecto para empezar a trackear tu tiempo de trabajo.</p>
            <button
              onClick={() => {
                setNewTask(prev => ({ ...prev, projectId: project.id }));
                setIsCreateTaskOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus size={14} />
              Crear primera tarea
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {groupTasks.map((task: any) => {
              const isTracking = activeTask === task.id;
              
              return (
                <div key={task.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between transition-colors ${isTracking ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                  <div className="flex-1 pr-4 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => toggleFavorite(task.id)}
                        className={`transition-colors flex-shrink-0 ${favoriteTaskIds.includes(task.id) ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-300 hover:text-gray-400'}`}
                        title={favoriteTaskIds.includes(task.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                      >
                        <Star size={16} fill={favoriteTaskIds.includes(task.id) ? "currentColor" : "none"} />
                      </button>
                      <span className="text-[10px] uppercase font-bold bg-blue-50/50 text-blue-700 border border-blue-100/50 px-2 py-0.5 rounded-md tracking-wider">
                        {task.priority === 2 ? 'ALTA' : task.priority === 1 ? 'MEDIA' : 'BAJA'}
                      </span>
                    </div>
                    <h4 className={`font-bold text-sm leading-tight mb-2 ${isTracking ? 'text-blue-600' : 'text-gray-800'}`}>
                      {task.name}
                    </h4>
                    {task.description && (
                      <p className="text-xs text-gray-500 mb-2.5 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4">
                      {task.dueDate ? (
                        <span className={`text-xs flex items-center gap-1.5 font-medium ${isBefore(new Date(task.dueDate * 1000), today) ? 'text-red-500' : 'text-gray-400'}`}>
                          <Calendar size={13} />
                          {format(new Date(task.dueDate * 1000), 'd MMM yyyy', { locale: es })}
                        </span>
                      ) : <span className="text-xs text-gray-400 flex items-center gap-1.5"><Calendar size={13} /> Sin fecha limite</span>}
                      {isTracking ? (
                        <div className="text-blue-600 text-xs font-mono font-bold flex items-center gap-1 animate-pulse">
                          ⏱ {formatTime((taskTimes[task.id] || 0) + elapsed)}
                        </div>
                      ) : taskTimes[task.id] ? (
                        <div className="text-gray-500 text-xs font-mono font-medium flex items-center gap-1">
                          ⏱ {formatTime(taskTimes[task.id])}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 mt-4 sm:mt-0 sm:pl-4 flex justify-end items-center sm:border-l sm:border-gray-100 gap-2">
                    <button
                      onClick={() => openManualTimeModal(task.id, task.projectId || task.project_id)}
                      disabled={saving}
                      className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm disabled:opacity-50"
                      title="Añadir tiempo manualmente"
                    >
                      <Clock size={15} />
                    </button>
                    {isTracking ? (
                      <button
                        onClick={() => handleStopTimer(task.id, task.projectId || task.project_id)}
                        disabled={saving}
                        className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-md disabled:opacity-50"
                        title="Detener tiempo"
                      >
                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Square size={15} fill="currentColor" />}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartTimer(task.id)}
                        disabled={activeTask !== null || saving}
                        className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                        title="Iniciar tiempo"
                      >
                        <Play size={15} fill="currentColor" className="ml-0.5" />
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
           <div>
             <h2 className="text-lg font-bold text-gray-800 tracking-tight">Proyectos y Tareas</h2>
             <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-wider">V2 API Sincronizada</p>
           </div>
           
           <div className="flex items-center gap-3 w-full sm:w-auto">
             <button
               onClick={() => setIsCreateProjectOpen(true)}
               className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg shrink-0"
             >
               <Plus size={15} />
               Nuevo Proyecto
             </button>
             
             <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm ml-auto sm:ml-0">
               <button 
                 onClick={() => setViewMode('all')}
                 className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1", viewMode === 'all' ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50")}
               >
                 Todas
               </button>
               <button 
                 onClick={() => setViewMode('favorites')}
                 className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1", viewMode === 'favorites' ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50")}
               >
                 <Star size={14} fill={viewMode === 'favorites' ? "currentColor" : "none"} />
                 Favoritas
               </button>
             </div>
           </div>
         </div>
         
         <div className="relative w-full">
           <Search size={16} className="absolute left-3 top-3 text-gray-400" />
           <input 
             type="text" 
             placeholder="Buscar proyectos o tareas..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
           />
         </div>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 border border-green-100 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 mb-6 shadow-sm animate-in slide-in-from-top-3 duration-300">
           <CheckCircle2 size={18} className="text-green-500 shrink-0" />
           <span className="text-xs font-bold">¡Tiempo registrado exitosamente en Holded v2!</span>
        </div>
      )}
      
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm max-w-md mx-auto">
          <FolderPlus size={44} className="mx-auto text-gray-300 mb-3" />
          <p className="font-bold text-sm text-gray-700">No se encontraron proyectos</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Crea un proyecto para empezar a gestionar tus tareas y registrar tus tiempos.</p>
          <button 
            onClick={() => setIsCreateProjectOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Plus size={14} />
            Crear Proyecto
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map(p => renderProjectGroup(p))}
        </div>
      )}

      {/* Modal Crear Proyecto */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in overflow-hidden">
            <div className="bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                <FolderPlus size={18} className="text-blue-600" />
                Crear Nuevo Proyecto en Holded
              </h3>
              <button onClick={() => setIsCreateProjectOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre del Proyecto <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={newProject.name}
                  onChange={e => setNewProject({...newProject, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Ej: Desarrollo de Web App"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descripción</label>
                <textarea 
                  value={newProject.description}
                  onChange={e => setNewProject({...newProject, description: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[70px] resize-none"
                  placeholder="Detalles sobre el alcance del proyecto..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fecha de Entrega</label>
                  <input 
                    type="date"
                    value={newProject.dueDate}
                    onChange={e => setNewProject({...newProject, dueDate: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cliente Asociado (Contacto)</label>
                <select
                  value={newProject.contactId}
                  onChange={e => setNewProject({...newProject, contactId: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- Ninguno --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreateProjectOpen(false)} 
                  className="flex-1 bg-white border border-gray-200 text-gray-500 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving || !newProject.name.trim()}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition shadow-md disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Tarea */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in overflow-hidden">
            <div className="bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                <ListPlus size={18} className="text-blue-600" />
                Añadir Tarea en Proyecto
              </h3>
              <button onClick={() => setIsCreateTaskOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre de la Tarea <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  value={newTask.name}
                  onChange={e => setNewTask({...newTask, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Ej: Diseñar Dashboard UI"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descripción</label>
                <textarea 
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[70px] resize-none"
                  placeholder="Detalles sobre los requisitos de la tarea..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fecha Límite</label>
                  <input 
                    type="date"
                    value={newTask.dueDate}
                    onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Prioridad</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: Number(e.target.value)})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value={0}>Baja</option>
                    <option value={1}>Media</option>
                    <option value={2}>Alta</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreateTaskOpen(false)} 
                  className="flex-1 bg-white border border-gray-200 text-gray-500 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving || !newTask.name.trim()}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition shadow-md disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Añadir Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal añadir tiempo manual */}
      {manualTimeData.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in overflow-hidden">
            <div className="bg-gray-50/50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                Asignar tiempo manual
              </h3>
              <button onClick={() => setManualTimeData(prev => ({...prev, isOpen: false}))} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={saveManualTime} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descripción de la tarea</label>
                <textarea 
                  required
                  value={manualTimeData.desc}
                  onChange={e => setManualTimeData({...manualTimeData, desc: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px] resize-none"
                  placeholder="Escribe en qué has estado trabajando..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Horas</label>
                  <input 
                    type="number" min="0" max="24"
                    value={manualTimeData.hours}
                    onChange={e => setManualTimeData({...manualTimeData, hours: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Minutos</label>
                  <input 
                    type="number" min="0" max="59"
                    value={manualTimeData.minutes}
                    onChange={e => setManualTimeData({...manualTimeData, minutes: parseInt(e.target.value) || 0})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setManualTimeData(prev => ({...prev, isOpen: false}))} 
                  className="flex-1 bg-white border border-gray-200 text-gray-500 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving || (!manualTimeData.hours && !manualTimeData.minutes)}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition shadow-md disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
