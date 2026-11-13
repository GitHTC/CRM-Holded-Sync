import React, { useState, useEffect, useMemo } from 'react';
import { projectsService, contactsService, teamService } from '../services/holded';
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
  FileText,
  TrendingUp,
  Edit2,
  CheckSquare,
  Check,
  Tag,
  Filter,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatSafeDate, isDateBefore, toDateInputValue } from '../lib/dateUtils';
import { stripHtml, sanitizeHtml } from '../lib/format';
import { ProjectSummaryModal } from './ProjectSummaryModal';
import { ProjectTimesModal } from './ProjectTimesModal';
import { EditProjectModal } from './EditProjectModal';
import { EditTaskModal } from './EditTaskModal';
import { DailyHoursModal } from './DailyHoursModal';

export function ProjectsView() {
  const { holdedApiKey, holdedUserId, setHoldedUserId, activeTask, setActiveTask, startTime, setStartTime } = useAppContext();
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [taskTimes, setTaskTimes] = useState<Record<string, number>>({});
  const [allTimesList, setAllTimesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Filter for Holded v2
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Time tracking state
  const [elapsed, setElapsed] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Search and View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');
  const [favoriteTaskIds, setFavoriteTaskIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('holdedSync_favoriteTasks') || '[]');
    } catch {
      return [];
    }
  });

  // Modal States
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    projectId: '',
    name: '',
    description: '',
    dueDate: '',
    priority: 0
  });

  // v2 Modal States
  const [summaryModalProject, setSummaryModalProject] = useState<{ id: string; name: string } | null>(null);
  const [timesModalProject, setTimesModalProject] = useState<{ id: string; name: string } | null>(null);
  const [editProjectData, setEditProjectData] = useState<any | null>(null);
  const [editTaskData, setEditTaskData] = useState<any | null>(null);
  const [isDailyHoursOpen, setIsDailyHoursOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('holdedSync_favoriteTasks', JSON.stringify(favoriteTaskIds));
  }, [favoriteTaskIds]);

  const toggleFavorite = (taskId: string) => {
    setFavoriteTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const todayStr = toDateInputValue(new Date());

  const [manualTimeData, setManualTimeData] = useState<{
    isOpen: boolean;
    taskId: string;
    projectId: string;
    desc: string;
    date: string;
    hours: number;
    minutes: number;
  }>({
    isOpen: false,
    taskId: '',
    projectId: '',
    desc: '',
    date: todayStr,
    hours: 0,
    minutes: 0
  });

  const processAndSetTimes = (timesArr: any[], tasksArr: any[]) => {
    const taskProjectLookup: Record<string, string> = {};
    for (const t of tasksArr) {
      if (t.id && (t.projectId || t.project_id)) {
        taskProjectLookup[t.id] = t.projectId || t.project_id;
      }
    }

    const rawTimesList: any[] = [];
    const seenIds = new Set<string>();
    const timeMap: Record<string, number> = {};

    for (const p of timesArr) {
      if (Array.isArray(p.timeTracking)) {
        for (const t of p.timeTracking) {
          if (t.id && seenIds.has(String(t.id))) continue;
          if (t.id) seenIds.add(String(t.id));

          const tid = t.taskId || t.task_id;
          const pid = t.projectId || t.project_id || (tid ? taskProjectLookup[tid] : undefined);
          const enriched = {
            ...t,
            taskId: tid,
            projectId: pid
          };
          rawTimesList.push(enriched);
          if (tid) {
            timeMap[tid] = (timeMap[tid] || 0) + (Number(t.duration) || 0);
          }
        }
      }
    }
    setTaskTimes(timeMap);
    setAllTimesList(rawTimesList);
  };

  const isInitialMount = React.useRef(true);

  const handleOpenEditProject = (project: any) => {
    setEditProjectData(project);
    if (contacts.length === 0 && holdedApiKey) {
      contactsService.getContacts(holdedApiKey, { limit: 100 }).then(c => {
        setContacts(Array.isArray(c) ? c : []);
      }).catch(e => {
        console.warn("Could not load contacts for edit modal:", e);
      });
    }
  };

  const refreshTimesOnly = async () => {
    if (!holdedApiKey) return;
    try {
      const timesData = await projectsService.getAllTimes(holdedApiKey);
      const timesArr = Array.isArray(timesData) ? timesData : [];
      processAndSetTimes(timesArr, tasks);
    } catch (e) {
      console.error("Error refreshing times:", e);
    }
  };

  const loadData = async (statusFilter = selectedStatus, isStatusFilterChange = false) => {
    if (!holdedApiKey) return;
    try {
      if (projects.length === 0) setLoading(true);
      setError(null);

      // Fast path: if only changing the project status filter and tasks are already loaded
      if (isStatusFilterChange && tasks.length > 0) {
        const projectsData = await projectsService.getProjects(
          holdedApiKey,
          statusFilter === 'all' ? undefined : statusFilter
        ).catch(() => []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setLoading(false);
        return;
      }

      // Step 1: Concurrently fetch core Projects and Tasks to unblock UI instantly
      const [projectsData, tasksData] = await Promise.all([
        projectsService.getProjects(
          holdedApiKey,
          statusFilter === 'all' ? undefined : statusFilter
        ).catch(err => {
          console.error("Error fetching projects:", err);
          return [];
        }),
        projectsService.getTasks(holdedApiKey).catch(err => {
          console.error("Error fetching tasks:", err);
          return [];
        })
      ]);

      const projectsArr = Array.isArray(projectsData) ? projectsData : [];
      const tasksArr = Array.isArray(tasksData) ? tasksData : [];

      setProjects(projectsArr);
      setTasks(tasksArr);
      setLoading(false); // Unblock UI immediately so user sees projects and tasks

      // Step 2: Fetch times and employees in the background (non-blocking)
      Promise.all([
        projectsService.getAllTimes(holdedApiKey).catch(err => {
          console.error("Error fetching times in background:", err);
          return [];
        }),
        teamService.getEmployees(holdedApiKey).catch(() => [])
      ]).then(([timesData, employeesData]) => {
        const timesArr = Array.isArray(timesData) ? timesData : [];
        const employeesArr = Array.isArray(employeesData) ? employeesData : [];

        setEmployees(employeesArr);

        if (holdedUserId && employeesArr.length > 0) {
          const matchedEmp = employeesArr.find(
            (e: any) => e.id === holdedUserId || e.employeeId === holdedUserId
          );
          if (matchedEmp && matchedEmp.rawHoldedUserId && matchedEmp.rawHoldedUserId !== holdedUserId) {
            setHoldedUserId(matchedEmp.rawHoldedUserId);
          }
        }

        processAndSetTimes(timesArr, tasksArr);
      }).catch(e => {
        console.warn("Background data load error:", e);
      });

    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos de Proyectos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadData(selectedStatus, false);
    } else {
      loadData(selectedStatus, true);
    }
  }, [holdedApiKey, selectedStatus]);

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
    setSaveSuccess(null);
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
      const currentDayStr = toDateInputValue(new Date());
      const res = await projectsService.addTimeTracking(holdedApiKey, projectId, {
        duration: durationSeconds,
        costHour: 0,
        desc: "Tiempo registrado desde Holded Sync v2",
        taskId: taskId,
        userId: holdedUserId,
        date: currentDayStr
      });
      
      setTaskTimes(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || 0) + durationSeconds
      }));
      setAllTimesList(prev => [{
        id: res?.id || ('local-' + Date.now()),
        duration: durationSeconds,
        taskId: taskId,
        projectId: projectId,
        userId: res?.resolvedUserId || holdedUserId,
        date: currentDayStr,
        description: "Tiempo registrado desde Holded Sync v2"
      }, ...prev]);
      setSaveSuccess("¡Tiempo registrado exitosamente en Holded v2!");
      setTimeout(() => setSaveSuccess(null), 4000);
      await refreshTimesOnly();
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
      date: toDateInputValue(new Date()),
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

    const entryDate = manualTimeData.date || toDateInputValue(new Date());

    setSaving(true);
    try {
      const res = await projectsService.addTimeTracking(holdedApiKey, manualTimeData.projectId, {
        duration: totalSeconds,
        costHour: 0,
        desc: manualTimeData.desc || "Añadido manualmente (Holded v2)",
        taskId: manualTimeData.taskId,
        userId: holdedUserId,
        date: entryDate
      });

      setTaskTimes(prev => ({
        ...prev,
        [manualTimeData.taskId]: (prev[manualTimeData.taskId] || 0) + totalSeconds
      }));
      setAllTimesList(prev => [{
        id: res?.id || ('local-' + Date.now()),
        duration: totalSeconds,
        taskId: manualTimeData.taskId,
        projectId: manualTimeData.projectId,
        userId: res?.resolvedUserId || holdedUserId,
        date: entryDate,
        description: manualTimeData.desc || "Añadido manualmente (Holded v2)"
      }, ...prev]);
      setManualTimeData(prev => ({ ...prev, isOpen: false }));
      setSaveSuccess("¡Tiempo manual registrado con éxito en Holded v2!");
      setTimeout(() => setSaveSuccess(null), 4000);
      await refreshTimesOnly();
    } catch (err: any) {
      alert("Error al registrar tiempo manual: " + err.message);
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
      setSaveSuccess("Tarea añadida con éxito a Holded v2");
      setTimeout(() => setSaveSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      alert("Error al crear la tarea: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickPriorityChange = async (task: any, newPriority: number) => {
    if (!holdedApiKey || !task.id) return;
    const oldPriority = task.priority !== undefined ? Number(task.priority) : 0;
    if (oldPriority === newPriority) return;

    // Optimistic local state update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority: newPriority } : t));

    try {
      await projectsService.updateTask(holdedApiKey, task.id, {
        name: task.name,
        description: task.description || '',
        due_date: task.dueDate || task.due_date || null,
        priority: newPriority,
        status: task.status || 'todo'
      });
      setSaveSuccess("Prioridad de la tarea actualizada");
      setTimeout(() => setSaveSuccess(null), 2500);
    } catch (err: any) {
      // Revert optimistic update
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority: oldPriority } : t));
      alert("Error al actualizar la prioridad: " + err.message);
    }
  };

  const handleCompleteTaskQuick = async (task: any) => {
    if (!holdedApiKey || !task.id) return;
    const isCompleted = task.status === 'completed' || task.status === 2;
    const newStatus = isCompleted ? 'todo' : 'completed';

    try {
      await projectsService.updateTask(holdedApiKey, task.id, {
        name: task.name,
        description: task.description || '',
        due_date: task.dueDate || task.due_date || null,
        priority: task.priority !== undefined ? Number(task.priority) : 0,
        status: newStatus,
        assigned_to: task.assignedTo || []
      });

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      setSaveSuccess(isCompleted ? "Tarea reabierta" : "¡Tarea marcada como completada en Holded!");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      alert("Error al actualizar estado de la tarea: " + err.message);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const todayUserSeconds = useMemo(() => {
    return allTimesList.reduce((acc, curr) => {
      const rawDate = curr.date || curr.created_at || curr.createdAt;
      const entryDate = toDateInputValue(rawDate) || todayStr;
      if (entryDate !== todayStr) return acc;
      return acc + (Number(curr.duration) || 0);
    }, 0);
  }, [allTimesList, todayStr]);

  const formatShortDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h === 0 && m === 0) return '0m';
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const statusOptions = [
    { id: 'all', label: 'Todos' },
    { id: 'active', label: 'Activos' },
    { id: 'in_progress', label: 'En progreso' },
    { id: 'waiting', label: 'En espera' },
    { id: 'budgeted', label: 'Presupuestados' },
    { id: 'completed', label: 'Completados' },
    { id: 'cancelled', label: 'Cancelados' }
  ];

  const today = startOfDay(new Date());

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) {
      if (p.id) map[p.id] = p.name;
    }
    return map;
  }, [projects]);

  // Tasks for 'all' mode
  const searchedTasks = (Array.isArray(tasks) ? tasks : []).filter(t => {
    if (searchQuery.trim()) {
      return t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
             t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Favorite tasks for 'favorites' mode
  const favoriteTasksList = useMemo(() => {
    return (Array.isArray(tasks) ? tasks : []).filter(t => {
      if (!favoriteTaskIds.includes(t.id)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return t.name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, favoriteTaskIds, searchQuery]);

  const projectsWithTasks = (Array.isArray(projects) ? projects : []).map(p => {
    return {
      ...p,
      myTasks: searchedTasks.filter(t => t.projectId === p.id)
    };
  });

  const filteredProjects = projectsWithTasks.filter(p => {
    if (!searchQuery.trim()) return true;
    const projectMatches = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const hasMatchingTasks = p.myTasks.length > 0;
    return projectMatches || hasMatchingTasks;
  });

  const renderTaskItem = (task: any, showProjectBadge = false) => {
    const isTracking = activeTask === task.id;
    const isDone = task.status === 'completed' || task.status === 2;
    const taskProjectId = task.projectId || task.project_id;
    const projectName = taskProjectId ? projectMap[taskProjectId] : null;

    return (
      <div 
        key={task.id} 
        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between transition-colors ${
          isTracking ? 'bg-blue-50/40' : isDone ? 'bg-gray-50/40 opacity-75' : 'hover:bg-gray-50/60'
        }`}
      >
        <div className="flex-1 pr-4 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* Checkbox Quick Done */}
            <button
              onClick={() => handleCompleteTaskQuick(task)}
              className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-colors ${
                isDone 
                  ? 'bg-green-500 border-green-600 text-white' 
                  : 'border-gray-300 hover:border-blue-500 text-transparent'
              }`}
              title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
            >
              <Check size={12} strokeWidth={3} />
            </button>

            {/* Favorite Star */}
            <button
              onClick={() => toggleFavorite(task.id)}
              className={`transition-colors flex-shrink-0 ${favoriteTaskIds.includes(task.id) ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-gray-400'}`}
              title={favoriteTaskIds.includes(task.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
              <Star size={15} fill={favoriteTaskIds.includes(task.id) ? "currentColor" : "none"} />
            </button>

            {/* Project Badge if in Favorites view */}
            {showProjectBadge && projectName && (
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                <FolderPlus size={11} className="text-blue-500" />
                {projectName}
              </span>
            )}

            {/* Priority Selector / Badge */}
            <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
              <select
                value={task.priority !== undefined ? Number(task.priority) : 0}
                onChange={(e) => handleQuickPriorityChange(task, Number(e.target.value))}
                className={`text-[10px] uppercase font-bold pl-2 pr-4 py-0.5 rounded-md tracking-wider border cursor-pointer appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  Number(task.priority) === 3 ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100/80' :
                  Number(task.priority) === 2 ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100/80' :
                  Number(task.priority) === 1 ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/80' :
                  'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100/80'
                }`}
                title="Cambiar prioridad de la tarea"
              >
                <option value={0}>BAJA</option>
                <option value={1}>MEDIA</option>
                <option value={2}>ALTA</option>
                <option value={3}>URGENTE</option>
              </select>
              <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
            </div>

            {isDone && (
              <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-md">
                COMPLETADA
              </span>
            )}
          </div>

          <h4 className={`font-bold text-sm leading-tight mb-1.5 ${
            isDone ? 'line-through text-gray-400' : isTracking ? 'text-blue-600' : 'text-gray-800'
          }`}>
            {stripHtml(task.name || '')}
          </h4>

          {task.description && stripHtml(task.description).length > 0 && (
            <div
              className="text-xs text-gray-600 mb-2 leading-relaxed [&_p]:mb-1 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1 [&_li]:mb-0.5 [&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-700"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.description) }}
            />
          )}

          <div className="flex items-center gap-4 text-xs">
            {task.dueDate ? (
              <span className={`flex items-center gap-1.5 font-medium ${
                isDateBefore(task.dueDate, today) && !isDone ? 'text-red-500 font-semibold' : 'text-gray-400'
              }`}>
                <Calendar size={13} />
                {formatSafeDate(task.dueDate, 'd MMM yyyy', { locale: es }, 'Sin fecha')}
              </span>
            ) : (
              <span className="text-gray-400 flex items-center gap-1.5">
                <Calendar size={13} /> Sin fecha
              </span>
            )}

            {isTracking ? (
              <div className="text-blue-600 font-mono font-bold flex items-center gap-1 animate-pulse">
                ⏱ {formatTime((taskTimes[task.id] || 0) + elapsed)}
              </div>
            ) : taskTimes[task.id] ? (
              <div className="text-gray-500 font-mono font-medium flex items-center gap-1">
                ⏱ {formatTime(taskTimes[task.id])}
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Task Control Buttons */}
        <div className="flex-shrink-0 mt-4 sm:mt-0 sm:pl-4 flex justify-end items-center sm:border-l sm:border-gray-100 gap-2">
          {/* Edit Task */}
          <button
            onClick={() => setEditTaskData(task)}
            className="w-8 h-8 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors shadow-2xs"
            title="Editar tarea v2"
          >
            <Edit2 size={13} />
          </button>

          {/* Manual Time */}
          <button
            onClick={() => openManualTimeModal(task.id, taskProjectId)}
            disabled={saving}
            className="w-8 h-8 rounded-xl bg-white border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-2xs disabled:opacity-50"
            title="Añadir tiempo manualmente"
          >
            <Clock size={14} />
          </button>

          {/* Timer Toggle */}
          {isTracking ? (
            <button
              onClick={() => handleStopTimer(task.id, taskProjectId)}
              disabled={saving}
              className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-xs disabled:opacity-50"
              title="Detener tiempo"
            >
              {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Square size={14} fill="currentColor" />}
            </button>
          ) : (
            <button
              onClick={() => handleStartTimer(task.id)}
              disabled={activeTask !== null || saving || isDone}
              className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-40 disabled:bg-gray-200 disabled:text-gray-400"
              title="Iniciar cronómetro"
            >
              <Play size={14} fill="currentColor" className="ml-0.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderProjectGroup = (project: any) => {
    const groupTasks = project.myTasks || [];
    const openTasks = groupTasks.filter((t: any) => t.status !== 'completed' && t.status !== 2);
    const completedTasks = groupTasks.filter((t: any) => t.status === 'completed' || t.status === 2);

    return (
      <div key={project.id} className="mb-6 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all">
        {/* Project Header */}
        <div className="bg-gray-50/70 border-b border-gray-100 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
              <h3 className="text-sm font-bold text-gray-800 truncate">
                {project.name}
              </h3>
              {project.billable && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                  Facturable
                </span>
              )}
              {Array.isArray(project.tags) && project.tags.map((tag: string, i: number) => (
                <span key={i} className="text-[10px] font-medium text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>
            {project.description && stripHtml(project.description).length > 0 && (
              <div
                className="text-xs text-gray-500 mt-1 pl-5 max-w-2xl line-clamp-2 [&_p]:inline [&_ul]:list-disc [&_ul]:pl-4"
                title={stripHtml(project.description)}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(project.description) }}
              />
            )}
          </div>

          {/* Project Action Bar */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* View Summary Modal Button */}
            <button
              onClick={() => setSummaryModalProject({ id: project.id, name: project.name })}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Ver métricas y resumen económico v2"
            >
              <TrendingUp size={14} className="text-blue-600" />
              <span className="hidden sm:inline">Resumen</span>
            </button>

            {/* View Project Times Button */}
            <button
              onClick={() => setTimesModalProject({ id: project.id, name: project.name })}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Ver registros de tiempo del proyecto"
            >
              <Clock size={14} className="text-indigo-600" />
              <span className="hidden sm:inline">Tiempos</span>
            </button>

            {/* Edit Project Button */}
            <button
              onClick={() => handleOpenEditProject(project)}
              className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Editar configuración del proyecto"
            >
              <Edit2 size={13} />
              <span className="hidden sm:inline">Editar</span>
            </button>

            {/* Add Task */}
            <button
              onClick={() => {
                setNewTask(prev => ({ ...prev, projectId: project.id }));
                setIsCreateTaskOpen(true);
              }}
              className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus size={14} />
              <span>Añadir Tarea</span>
            </button>
          </div>
        </div>
        
        {/* Task List */}
        {groupTasks.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/20">
            <FileText size={32} className="mx-auto text-gray-200 mb-2.5" />
            <p className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-1">No hay tareas en este proyecto</p>
            <p className="text-xs text-gray-400 mb-4 max-w-xs mx-auto">Crea una tarea para empezar a registrar y monitorizar tu tiempo de trabajo.</p>
            <button
              onClick={() => {
                setNewTask(prev => ({ ...prev, projectId: project.id }));
                setIsCreateTaskOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus size={14} />
              Crear primera tarea
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupTasks.map((task: any) => renderTaskItem(task, false))}
          </div>
        )}
      </div>
    );
  };

  if (loading && projects.length === 0) return <Spinner />;

  return (
    <div className="p-4 pb-2 bg-gray-50 min-h-full">
      {/* Header Toolbar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 tracking-tight flex items-center gap-2">
              Proyectos y Tareas
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                API v2
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Control económico, tiempos y tareas sincronizados</p>
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
            <button
              onClick={() => setIsDailyHoursOpen(true)}
              className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-2xs shrink-0"
              title="Consultar horas imputadas por día"
            >
              <Clock size={15} className="text-blue-600" />
              <span>Horas por día</span>
              {todayUserSeconds > 0 && (
                <span className="bg-blue-50 text-blue-700 text-[10px] font-mono px-1.5 py-0.5 rounded-md border border-blue-100 font-bold">
                  {formatShortDuration(todayUserSeconds)} hoy
                </span>
              )}
            </button>
            
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-2xs ml-auto sm:ml-0">
              <button 
                onClick={() => setViewMode('all')}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1", viewMode === 'all' ? "bg-blue-600 text-white shadow-xs" : "text-gray-500 hover:bg-gray-50")}
              >
                Todas
              </button>
              <button 
                onClick={() => setViewMode('favorites')}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1", viewMode === 'favorites' ? "bg-blue-600 text-white shadow-xs" : "text-gray-500 hover:bg-gray-50")}
              >
                <Star size={14} fill={viewMode === 'favorites' ? "currentColor" : "none"} />
                Favoritas
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Chips (Holded API v2) */}
        {viewMode === 'all' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Filter size={12} />
              Estado:
            </span>
            {statusOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedStatus(opt.id)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                  selectedStatus === opt.id
                    ? "bg-gray-800 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        
        {/* Search Bar */}
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder={viewMode === 'favorites' ? "Buscar en tareas favoritas..." : "Buscar proyectos o tareas..."} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 border border-green-100 text-green-800 px-4 py-3 rounded-xl flex items-center gap-2 mb-6 shadow-xs animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={18} className="text-green-500 shrink-0" />
          <span className="text-xs font-bold">{saveSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-3 shadow-xs">
          <AlertCircle className="shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-xs uppercase tracking-wider">Error de sincronización</h3>
            <p className="text-xs mt-0.5 text-red-600">{error}</p>
          </div>
          <button onClick={() => loadData(selectedStatus)} className="px-3 py-1 bg-red-600 hover:red-700 text-white rounded-lg text-xs font-semibold transition-colors">
            Reintentar
          </button>
        </div>
      )}
      
      {viewMode === 'favorites' ? (
        /* VISTA EXCLUSIVA DE TAREAS FAVORITAS (SIN AGRUPAR POR PROYECTO) */
        favoriteTasksList.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200 shadow-xs max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
              <Star size={24} fill="currentColor" />
            </div>
            <p className="font-bold text-sm text-gray-800">No tienes tareas favoritas</p>
            <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Marca las tareas que realizas habitualmente con la estrella para tenerlas reunidas en esta lista y poder imputar tiempo rápidamente sin navegar por proyectos.
            </p>
            <button 
              onClick={() => setViewMode('all')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Ver todas las tareas
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-gray-50/80 px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-500" fill="currentColor" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Tareas habituales y frecuentes ({favoriteTasksList.length})
                </h3>
              </div>
              <span className="text-[11px] text-gray-400">
                Acceso rápido para registrar tiempos sin proyectos
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {favoriteTasksList.map((task: any) => renderTaskItem(task, true))}
            </div>
          </div>
        )
      ) : (
        /* VISTA POR PROYECTOS */
        filteredProjects.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200 shadow-xs max-w-md mx-auto">
            <FolderPlus size={44} className="mx-auto text-gray-300 mb-3" />
            <p className="font-bold text-sm text-gray-700">No se encontraron proyectos</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              {selectedStatus !== 'all' 
                ? `No hay proyectos con el filtro "${selectedStatus}". Prueba seleccionando "Todos".` 
                : 'No hay proyectos disponibles en tu cuenta de Holded.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map(p => renderProjectGroup(p))}
          </div>
        )
      )}

      {/* Modal Crear Tarea */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in overflow-hidden">
            <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                <ListPlus size={18} className="text-blue-600" />
                Añadir Tarea en Proyecto (Holded v2)
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
                    <option value={3}>Urgente</option>
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
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition shadow-xs disabled:opacity-50 flex items-center justify-center"
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
            <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                Asignar tiempo manual (Holded v2)
              </h3>
              <button onClick={() => setManualTimeData(prev => ({...prev, isOpen: false}))} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={saveManualTime} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descripción del trabajo</label>
                <textarea 
                  required
                  value={manualTimeData.desc}
                  onChange={e => setManualTimeData({...manualTimeData, desc: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px] resize-none"
                  placeholder="Escribe en qué has estado trabajando..."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fecha de imputación</label>
                <input
                  type="date"
                  required
                  value={manualTimeData.date}
                  onChange={e => setManualTimeData({ ...manualTimeData, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
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
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition shadow-xs disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Guardar en Holded'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* v2 Project Summary Modal */}
      {summaryModalProject && (
        <ProjectSummaryModal
          projectId={summaryModalProject.id}
          projectName={summaryModalProject.name}
          onClose={() => setSummaryModalProject(null)}
        />
      )}

      {/* v2 Project Times Modal */}
      {timesModalProject && (
        <ProjectTimesModal
          projectId={timesModalProject.id}
          projectName={timesModalProject.name}
          tasks={tasks}
          onClose={() => setTimesModalProject(null)}
          onTimeChanged={() => loadData(selectedStatus)}
        />
      )}

      {/* v2 Edit Project Modal */}
      {editProjectData && (
        <EditProjectModal
          project={editProjectData}
          contacts={contacts}
          onClose={() => setEditProjectData(null)}
          onUpdated={() => {
            setSaveSuccess("Proyecto actualizado con éxito en Holded v2");
            setTimeout(() => setSaveSuccess(null), 4000);
            loadData(selectedStatus);
          }}
          onDeleted={() => {
            setSaveSuccess("Proyecto eliminado correctamente");
            setTimeout(() => setSaveSuccess(null), 4000);
            loadData(selectedStatus);
          }}
        />
      )}

      {/* v2 Edit Task Modal */}
      {editTaskData && (
        <EditTaskModal
          task={editTaskData}
          onClose={() => setEditTaskData(null)}
          onUpdated={(updatedTaskData?: any) => {
            if (updatedTaskData && updatedTaskData.id) {
              setTasks(prev => prev.map(t => t.id === updatedTaskData.id ? { ...t, ...updatedTaskData } : t));
            }
            setSaveSuccess("Tarea actualizada con éxito en Holded v2");
            setTimeout(() => setSaveSuccess(null), 4000);
            loadData(selectedStatus);
          }}
          onDeleted={() => {
            setSaveSuccess("Tarea eliminada correctamente");
            setTimeout(() => setSaveSuccess(null), 4000);
            loadData(selectedStatus);
          }}
        />
      )}

      {/* Modal de Horas Imputadas por Día */}
      <DailyHoursModal
        isOpen={isDailyHoursOpen}
        onClose={() => setIsDailyHoursOpen(false)}
        times={allTimesList}
        projects={projects}
        tasks={tasks}
        currentUserId={holdedUserId}
        employees={employees}
        onRefresh={refreshTimesOnly}
        onDeleteTime={async (projectId, timeId) => {
          if (!holdedApiKey) return;
          await projectsService.deleteTimeTracking(holdedApiKey, projectId, timeId);
          setAllTimesList(prev => prev.filter(t => t.id !== timeId));
          await refreshTimesOnly();
        }}
      />
    </div>
  );
}

