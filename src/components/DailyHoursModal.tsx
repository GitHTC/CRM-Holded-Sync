import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Briefcase, 
  CheckSquare, 
  User,
  Users,
  RefreshCw,
  ListFilter,
  CalendarDays,
  Trash2
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDateInputValue, parseSafeDate } from '../lib/dateUtils';
import { stripHtml, sanitizeHtml } from '../lib/format';
import { cn } from '../lib/utils';

interface DailyHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  times: any[];
  projects: any[];
  tasks: any[];
  employees?: any[];
  currentUserId: string | null;
  onRefresh?: () => Promise<void> | void;
  onDeleteTime?: (projectId: string, timeId: string) => Promise<void>;
}

export function DailyHoursModal({
  isOpen,
  onClose,
  times,
  projects,
  tasks,
  employees = [],
  currentUserId,
  onRefresh,
  onDeleteTime,
}: DailyHoursModalProps) {
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [userFilter, setUserFilter] = useState<'my' | 'all'>('all');
  const [viewTab, setViewTab] = useState<'day' | 'history'>('day');
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { projectMap, taskMap, employeeMap, currentUserIds, currentUserNames } = useMemo(() => {
    const pMap: Record<string, any> = {};
    const projectUsersByName: Record<string, string[]> = {};

    for (const p of projects) {
      if (p.id) pMap[p.id] = p;
      if (p.users && typeof p.users === 'object') {
        for (const [uid, uObj] of Object.entries<any>(p.users)) {
          if (uObj?.name) {
            const norm = uObj.name.toLowerCase().trim();
            if (!projectUsersByName[norm]) projectUsersByName[norm] = [];
            if (!projectUsersByName[norm].includes(uid)) projectUsersByName[norm].push(uid);
          }
        }
      }
    }

    const tMap: Record<string, any> = {};
    for (const t of tasks) {
      if (t.id) tMap[t.id] = t;
    }

    const eMap: Record<string, any> = {};
    const myIds = new Set<string>();
    const myNames = new Set<string>();

    if (currentUserId) {
      myIds.add(String(currentUserId));
    }

    for (const e of employees) {
      if (e.id) eMap[e.id] = e;
      if (e.holdedUserId) eMap[e.holdedUserId] = e;
      if (e.holded_user_id) eMap[e.holded_user_id] = e;

      const isCurrentEmp =
        currentUserId &&
        (e.id === currentUserId ||
          e.holdedUserId === currentUserId ||
          e.holded_user_id === currentUserId ||
          e.employeeId === currentUserId);

      if (isCurrentEmp) {
        if (e.id) myIds.add(String(e.id));
        if (e.holdedUserId) myIds.add(String(e.holdedUserId));
        if (e.holded_user_id) myIds.add(String(e.holded_user_id));
        if (e.rawHoldedUserId) myIds.add(String(e.rawHoldedUserId));

        const full = (e.fullName || e.full_name || '').toLowerCase().trim();
        const first = (e.name || e.firstName || '').toLowerCase().trim();
        if (full) {
          myNames.add(full);
          if (projectUsersByName[full]) {
            projectUsersByName[full].forEach(id => myIds.add(id));
          }
        }
        if (first) {
          myNames.add(first);
          for (const [pName, uids] of Object.entries(projectUsersByName)) {
            if (pName.includes(first) || first.includes(pName)) {
              uids.forEach(id => myIds.add(id));
            }
          }
        }
      }
    }

    // Also index users from project.users into employeeMap if not already present
    for (const p of projects) {
      if (p.users && typeof p.users === 'object') {
        for (const [uid, uObj] of Object.entries<any>(p.users)) {
          if (!eMap[uid] && uObj?.name) {
            eMap[uid] = { id: uid, name: uObj.name, fullName: uObj.name };
          }
        }
      }
    }

    return {
      projectMap: pMap,
      taskMap: tMap,
      employeeMap: eMap,
      currentUserIds: myIds,
      currentUserNames: myNames
    };
  }, [projects, tasks, employees, currentUserId]);

  const isEntryFromCurrentUser = (item: any): boolean => {
    if (!currentUserId) return true;
    const itemUser = String(item.userId || item.user_id || '');
    if (itemUser && currentUserIds.has(itemUser)) return true;

    const itemUserName = (item.userName || item.user_name || '').toLowerCase().trim();
    if (itemUserName && currentUserNames.size > 0) {
      for (const myName of currentUserNames) {
        if (myName && (itemUserName.includes(myName) || myName.includes(itemUserName))) {
          return true;
        }
      }
    }
    return false;
  };

  // Trigger a refresh when modal opens
  useEffect(() => {
    if (isOpen && onRefresh) {
      setRefreshing(true);
      Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
    }
  }, [isOpen]);

  // Normalize all time entries with resolved YYYY-MM-DD date, task, and project
  const normalizedTimes = useMemo(() => {
    return (Array.isArray(times) ? times : []).map((item) => {
      const rawDate = item.date || item.created_at || item.createdAt;
      const entryDate = toDateInputValue(rawDate) || todayStr;
      const taskId = item.taskId || item.task_id;
      const taskObj = taskId ? taskMap[taskId] : null;
      const resolvedProjectId =
        item.projectId ||
        item.project_id ||
        taskObj?.projectId ||
        taskObj?.project_id ||
        '';
      const projectObj = resolvedProjectId ? projectMap[resolvedProjectId] : null;

      return {
        ...item,
        entryDate,
        taskId,
        taskObj,
        resolvedProjectId,
        projectObj,
        isMine: isEntryFromCurrentUser(item)
      };
    });
  }, [times, taskMap, projectMap, todayStr, currentUserIds, currentUserNames, currentUserId]);

  // Filtered entries by user mode ('my' vs 'all') across all dates
  const userFilteredTimes = useMemo(() => {
    if (userFilter === 'my' && currentUserId) {
      return normalizedTimes.filter(t => t.isMine);
    }
    return normalizedTimes;
  }, [normalizedTimes, userFilter, currentUserId]);

  // Group all entries by date for quick-jump chips and 'Resumen por Días' tab
  const daysSummaryList = useMemo(() => {
    const map: Record<string, { date: string; totalSeconds: number; entries: any[] }> = {};
    for (const item of userFilteredTimes) {
      const d = item.entryDate;
      if (!map[d]) {
        map[d] = { date: d, totalSeconds: 0, entries: [] };
      }
      map[d].totalSeconds += Number(item.duration) || 0;
      map[d].entries.push(item);
    }
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [userFilteredTimes]);

  // Auto-pick the most recent day with entries if today has no entries on modal open
  useEffect(() => {
    if (isOpen && daysSummaryList.length > 0) {
      const hasToday = daysSummaryList.some(d => d.date === todayStr);
      if (!hasToday && selectedDate === todayStr) {
        setSelectedDate(daysSummaryList[0].date);
      }
    }
  }, [isOpen, daysSummaryList, todayStr, selectedDate]);

  // If "my" user filter has 0 entries across all days, automatically default to "all" so nothing is hidden
  useEffect(() => {
    if (isOpen && normalizedTimes.length > 0) {
      const myCount = normalizedTimes.filter(t => t.isMine).length;
      if (myCount === 0 && userFilter === 'my') {
        setUserFilter('all');
      }
    }
  }, [isOpen, normalizedTimes, userFilter]);

  // If the selectedDate has no entries on initial open, but there are entries on other dates,
  // keep selectedDate on today if today has entries, otherwise let user see recent days chips
  const dayEntries = useMemo(() => {
    return userFilteredTimes.filter(item => item.entryDate === selectedDate);
  }, [userFilteredTimes, selectedDate]);

  // Counts on selected date for both 'my' and 'all' to show in toggle buttons
  const selectedDateMyCount = useMemo(
    () => normalizedTimes.filter(item => item.entryDate === selectedDate && item.isMine).length,
    [normalizedTimes, selectedDate]
  );
  const selectedDateAllCount = useMemo(
    () => normalizedTimes.filter(item => item.entryDate === selectedDate).length,
    [normalizedTimes, selectedDate]
  );

  const totalSeconds = useMemo(
    () => dayEntries.reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0),
    [dayEntries]
  );

  // Group dayEntries by user
  const userSummaries = useMemo(() => {
    const userMap: Record<string, { userId: string; userName: string; totalSeconds: number }> = {};
    for (const entry of dayEntries) {
      const uid = entry.userId || entry.user_id || 'unknown';
      const emp = employeeMap[uid];
      const uName =
        entry.userName ||
        entry.user_name ||
        emp?.fullName ||
        emp?.name ||
        'Usuario Holded';

      if (!userMap[uid]) {
        userMap[uid] = { userId: uid, userName: uName, totalSeconds: 0 };
      }
      userMap[uid].totalSeconds += Number(entry.duration) || 0;
    }
    return Object.values(userMap).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [dayEntries, employeeMap]);

  // Group dayEntries by project
  const projectSummaries = useMemo(() => {
    const pSummaryMap: Record<string, { projectId: string; projectName: string; totalSeconds: number; count: number }> = {};
    for (const entry of dayEntries) {
      const pid = entry.resolvedProjectId || 'unassigned';
      const pName = entry.projectObj?.name || 'Proyecto General';
      if (!pSummaryMap[pid]) {
        pSummaryMap[pid] = { projectId: pid, projectName: pName, totalSeconds: 0, count: 0 };
      }
      pSummaryMap[pid].totalSeconds += Number(entry.duration) || 0;
      pSummaryMap[pid].count += 1;
    }
    return Object.values(pSummaryMap).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [dayEntries]);

  const handlePrevDay = () => {
    const current = parseSafeDate(selectedDate) || new Date();
    setSelectedDate(format(subDays(current, 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const current = parseSafeDate(selectedDate) || new Date();
    setSelectedDate(format(addDays(current, 1), 'yyyy-MM-dd'));
  };

  const handleToday = () => setSelectedDate(todayStr);

  const handleManualRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteEntry = async (entry: any) => {
    if (!onDeleteTime || !entry.id || String(entry.id).startsWith('local-')) return;
    const pid = entry.resolvedProjectId;
    if (!pid) return;
    if (!window.confirm('¿Deseas eliminar este registro de tiempo en Holded?')) return;

    setDeletingId(entry.id);
    try {
      await onDeleteTime(pid, entry.id);
    } finally {
      setDeletingId(null);
    }
  };

  const isToday = selectedDate === todayStr;

  const formatSecsToHhMm = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h === 0 && m === 0 && s > 0) return `${s}s`;
    if (h === 0 && m === 0) return '0h 00m';
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h 00m`;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const formattedDateTitle = useMemo(() => {
    const d = parseSafeDate(selectedDate);
    if (!d) return selectedDate;
    if (isToday) return `Hoy, ${format(d, "EEEE d 'de' MMMM yyyy", { locale: es })}`;
    return format(d, "EEEE d 'de' MMMM yyyy", { locale: es });
  }, [selectedDate, isToday]);

  const displayShortDate = useMemo(() => {
    const d = parseSafeDate(selectedDate);
    if (!d) return selectedDate;
    return format(d, 'd MMM yyyy', { locale: es });
  }, [selectedDate]);

  if (!isOpen) return null;

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
        <div className="bg-gray-50/80 px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-800 leading-tight">Horas Imputadas por Día</h3>
              <p className="text-xs text-gray-400 font-medium">
                Control diario e historial de tiempos en proyectos (Holded v2)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="w-8 h-8 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors disabled:opacity-50"
                title="Actualizar tiempos desde Holded"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : ''} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Top View Mode & User Filter Bar */}
        <div className="px-5 pt-3.5 pb-2.5 bg-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* View Tabs: Vista por Día vs Historial por Días */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewTab('day')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
                viewTab === 'day'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <CalendarIcon size={13} />
              Detalle por Día
            </button>
            <button
              type="button"
              onClick={() => setViewTab('history')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
                viewTab === 'history'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <CalendarDays size={13} />
              Resumen por Días
              {daysSummaryList.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded-full font-mono">
                  {daysSummaryList.length}
                </span>
              )}
            </button>
          </div>

          {/* User Filter: Todas vs Mis Horas */}
          {currentUserId && (
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setUserFilter('all')}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1',
                  userFilter === 'all'
                    ? 'bg-white text-gray-800 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                )}
              >
                <Users size={12} />
                Equipo ({viewTab === 'day' ? selectedDateAllCount : normalizedTimes.length})
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('my')}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1',
                  userFilter === 'my'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                )}
              >
                <User size={12} />
                Mis Horas ({viewTab === 'day' ? selectedDateMyCount : normalizedTimes.filter(t => t.isMine).length})
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {viewTab === 'day' ? (
            <>
              {/* Date Navigation Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-200/70">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={handlePrevDay}
                      className="p-1.5 hover:bg-gray-50 text-gray-600 rounded-md transition-colors"
                      title="Día anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="px-2.5 py-1 text-xs font-bold text-gray-800 min-w-[90px] text-center capitalize">
                      {displayShortDate}
                    </div>

                    <button
                      type="button"
                      onClick={handleNextDay}
                      className="p-1.5 hover:bg-gray-50 text-gray-600 rounded-md transition-colors"
                      title="Día siguiente"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {!isToday && (
                    <button
                      type="button"
                      onClick={handleToday}
                      className="px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg transition-colors"
                    >
                      Ir a Hoy
                    </button>
                  )}
                </div>

                {/* Direct visible date input so calendar opens reliably everywhere */}
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-gray-500">Fecha:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as any).showPicker?.();
                      } catch {}
                    }}
                    className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
                  />
                </div>
              </div>

              {/* Quick-jump pills for days with recorded hours */}
              {daysSummaryList.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 block">
                    Días recientes con tiempo imputado:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {daysSummaryList.slice(0, 8).map((dItem) => {
                      const parsed = parseSafeDate(dItem.date);
                      const label = parsed ? format(parsed, 'd MMM', { locale: es }) : dItem.date;
                      const isSelected = dItem.date === selectedDate;
                      return (
                        <button
                          key={dItem.date}
                          type="button"
                          onClick={() => setSelectedDate(dItem.date)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0',
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          )}
                        >
                          <span className="capitalize">{label}</span>
                          <span
                            className={cn(
                              'font-mono text-[10px] px-1.5 py-0.2 rounded',
                              isSelected ? 'bg-blue-700 text-blue-100' : 'bg-blue-50 text-blue-700'
                            )}
                          >
                            {formatSecsToHhMm(dItem.totalSeconds)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Date Header */}
              <div className="text-center">
                <span className="text-xs font-bold text-gray-700 capitalize bg-gray-100 px-3.5 py-1 rounded-full">
                  {formattedDateTitle}
                </span>
              </div>

              {/* Total KPI Card */}
              <div className="p-5 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-blue-50/20 border border-blue-100 rounded-2xl text-center">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                  Tiempo Total Imputado en el Día
                </span>
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono text-gray-900">
                    {formatSecsToHhMm(totalSeconds)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    ({(totalSeconds / 3600).toFixed(2)}h)
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                  {dayEntries.length}{' '}
                  {dayEntries.length === 1 ? 'imputación registrada' : 'imputaciones registradas'}
                </span>
              </div>

              {/* Notice if 'Mis Horas' is empty on this date but 'Equipo' has entries */}
              {userFilter === 'my' && dayEntries.length === 0 && selectedDateAllCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                  <span className="text-xs text-amber-800 font-medium">
                    Hay <strong>{selectedDateAllCount}</strong> imputaciones registradas en esta fecha bajo otros usuarios del equipo.
                  </span>
                  <button
                    type="button"
                    onClick={() => setUserFilter('all')}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shrink-0 transition-colors"
                  >
                    Ver todas
                  </button>
                </div>
              )}

              {/* Breakdown by Project & User */}
              {dayEntries.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projectSummaries.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">
                        Por Proyecto
                      </h4>
                      <div className="bg-white border border-gray-100 rounded-xl p-2 shadow-2xs divide-y divide-gray-50">
                        {projectSummaries.map((p) => (
                          <div
                            key={p.projectId}
                            className="flex justify-between items-center py-1.5 px-2 text-xs"
                          >
                            <span className="font-semibold text-gray-700 truncate pr-2 flex items-center gap-1.5">
                              <Briefcase size={12} className="text-blue-500 shrink-0" />
                              <span className="truncate">{p.projectName}</span>
                            </span>
                            <span className="font-bold font-mono text-gray-900 shrink-0">
                              {formatSecsToHhMm(p.totalSeconds)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {userSummaries.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">
                        Por Usuario
                      </h4>
                      <div className="bg-white border border-gray-100 rounded-xl p-2 shadow-2xs divide-y divide-gray-50">
                        {userSummaries.map((u) => (
                          <div
                            key={u.userId}
                            className="flex justify-between items-center py-1.5 px-2 text-xs"
                          >
                            <span className="font-semibold text-gray-700 truncate pr-2 flex items-center gap-1.5">
                              <div className="w-4.5 h-4.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {u.userName.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate">{u.userName}</span>
                            </span>
                            <span className="font-bold font-mono text-gray-900 shrink-0">
                              {formatSecsToHhMm(u.totalSeconds)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Detailed Day Entries */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">
                  Detalle de Imputaciones del Día
                </h4>

                {dayEntries.length === 0 ? (
                  <div className="p-6 bg-gray-50/60 rounded-xl text-center text-gray-400 border border-dashed border-gray-200">
                    <Clock size={28} className="mx-auto text-gray-300 mb-1.5" />
                    <p className="text-xs font-semibold text-gray-600">
                      No hay horas imputadas en esta fecha ({displayShortDate})
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
                      {daysSummaryList.length > 0
                        ? 'Selecciona uno de los días con registros arriba o cambia a la pestaña "Resumen por Días".'
                        : 'Usa el cronómetro o el botón de reloj en cualquier tarea para imputar tiempo.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden shadow-2xs">
                    {dayEntries.map((entry, idx) => {
                      const projectName = entry.projectObj?.name || 'Proyecto';
                      const cleanTaskName = stripHtml(
                        entry.taskObj?.name || entry.description || 'Tarea general'
                      );
                      const cleanDesc = stripHtml(entry.description || '');
                      const uid = entry.userId || entry.user_id;
                      const emp = employeeMap[uid];
                      const userName =
                        entry.userName ||
                        entry.user_name ||
                        emp?.fullName ||
                        emp?.name ||
                        'Usuario';

                      return (
                        <div
                          key={entry.id || idx}
                          className="p-3.5 flex items-center justify-between hover:bg-gray-50/80 transition-colors gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Briefcase size={10} />
                                {projectName}
                              </span>
                              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <User size={10} />
                                {userName}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-gray-800 truncate flex items-center gap-1.5">
                              <CheckSquare size={12} className="text-blue-500 shrink-0" />
                              {cleanTaskName}
                            </span>
                            {cleanDesc && cleanDesc !== cleanTaskName && (
                              <div
                                className="text-[11px] text-gray-500 mt-1 pl-4 line-clamp-2 italic [&_p]:inline"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(entry.description) }}
                              />
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50/70 px-2.5 py-1 rounded-lg border border-blue-100">
                              {formatSecsToHhMm(Number(entry.duration) || 0)}
                            </span>
                            {onDeleteTime && entry.resolvedProjectId && entry.id && !String(entry.id).startsWith('local-') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(entry)}
                                disabled={deletingId === entry.id}
                                className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                                title="Eliminar imputación"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* HISTORIAL / RESUMEN POR DÍAS */
            <div className="space-y-3">
              {daysSummaryList.length === 0 ? (
                <div className="p-8 bg-gray-50/60 rounded-xl text-center text-gray-400 border border-dashed border-gray-200">
                  <CalendarDays size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-semibold text-gray-600">
                    No se encontraron registros de tiempo imputados
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Cuando registres tiempos en tus tareas, verás aquí el desglose acumulado día por día.
                  </p>
                </div>
              ) : (
                daysSummaryList.map((dayGroup) => {
                  const parsed = parseSafeDate(dayGroup.date);
                  const dateLabel = parsed
                    ? format(parsed, "EEEE, d 'de' MMMM yyyy", { locale: es })
                    : dayGroup.date;

                  return (
                    <div
                      key={dayGroup.date}
                      className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(dayGroup.date);
                          setViewTab('day');
                        }}
                        className="w-full bg-gray-50/80 hover:bg-blue-50/50 px-4 py-3 border-b border-gray-100 flex items-center justify-between transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={14} className="text-blue-600" />
                          <span className="text-xs font-bold text-gray-800 capitalize">
                            {dateLabel}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            ({dayGroup.entries.length}{' '}
                            {dayGroup.entries.length === 1 ? 'entrada' : 'entradas'})
                          </span>
                        </div>
                        <span className="text-xs font-extrabold font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          {formatSecsToHhMm(dayGroup.totalSeconds)}
                        </span>
                      </button>

                      <div className="divide-y divide-gray-50">
                        {dayGroup.entries.map((entry, idx) => {
                          const projectName = entry.projectObj?.name || 'Proyecto';
                          const cleanTaskName = stripHtml(
                            entry.taskObj?.name || entry.description || 'Tarea general'
                          );
                          const cleanDesc = stripHtml(entry.description || '');
                          const uid = entry.userId || entry.user_id;
                          const emp = employeeMap[uid];
                          const userName =
                            entry.userName ||
                            entry.user_name ||
                            emp?.fullName ||
                            emp?.name ||
                            'Usuario';

                          return (
                            <div
                              key={entry.id || idx}
                              className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/60"
                            >
                              <div className="min-w-0 flex-1 pr-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                    {projectName}
                                  </span>
                                  <span className="font-semibold text-gray-800 truncate">
                                    {cleanTaskName}
                                  </span>
                                  <span className="text-[10px] text-gray-400">• {userName}</span>
                                </div>
                                {cleanDesc && cleanDesc !== cleanTaskName && (
                                  <div
                                    className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 italic [&_p]:inline"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(entry.description) }}
                                  />
                                )}
                              </div>
                              <span className="font-mono font-bold text-gray-700 shrink-0">
                                {formatSecsToHhMm(Number(entry.duration) || 0)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
