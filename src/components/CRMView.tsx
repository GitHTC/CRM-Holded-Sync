import React, { useState, useEffect } from 'react';
import { crmService, contactsService } from '../services/holded';
import { useAppContext } from '../context/AppContext';
import { Spinner } from './Spinner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LayoutGrid, List, Plus, Trash2, Edit2, ChevronDown, Check, X, Search, User as UserIcon, Phone, Users, Mail, Plane, Utensils, FileText, StickyNote, Clock, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';

const ACTIVITY_TYPES = [
  { id: 'llamada', name: 'Llamada', icon: Phone, color: 'bg-blue-500' },
  { id: 'reunion', name: 'Reunión', icon: Users, color: 'bg-indigo-500' },
  { id: 'email', name: 'Email sent', icon: Mail, color: 'bg-slate-700' },
  { id: 'vuelo', name: 'Vuelo', icon: Plane, color: 'bg-sky-400' },
  { id: 'comida', name: 'Comida', icon: Utensils, color: 'bg-orange-400' },
  { id: 'tarea', name: 'Tarea', icon: Check, color: 'bg-green-500' },
  { id: 'nota', name: 'Nota', icon: StickyNote, color: 'bg-yellow-500' },
];

export function CRMView() {
  const { holdedApiKey } = useAppContext();
  const [funnels, setFunnels] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedFunnel, setSelectedFunnel] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'won' | 'lost'>('all');

  const [isCreating, setIsCreating] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', value: '', contactId: '', contactName: '' });
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [newContact, setNewContact] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    code: '', 
    isperson: true,
    type: 'client' 
  });

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editLeadData, setEditLeadData] = useState({ name: '', value: 0 });
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({ 
    title: '', 
    type: 'llamada', 
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: format(new Date(), 'HH:mm'),
    endTime: format(new Date(Date.now() + 3600000), 'HH:mm'),
    notes: '',
    completed: false
  });

  const loadData = async () => {
    if (!holdedApiKey) return;
    try {
      setLoading(true);
      setError(null);
      const [funnelsData, leadsData, contactsData] = await Promise.all([
        crmService.getFunnels(holdedApiKey),
        crmService.getLeads(holdedApiKey),
        contactsService.getContacts(holdedApiKey)
      ]);
      const funnelsArray = Array.isArray(funnelsData) ? funnelsData : [];
      setFunnels(funnelsArray);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setContacts(Array.isArray(contactsData) ? contactsData : []);
      if (funnelsArray.length > 0 && !selectedFunnel) {
        setSelectedFunnel(funnelsArray[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos del CRM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [holdedApiKey]);

  useEffect(() => {
    if (selectedLead && holdedApiKey) {
      const fetchActivities = async () => {
        setLoadingActivities(true);
        try {
          const res = await crmService.getActivities(holdedApiKey, selectedLead.id);
          setActivities(Array.isArray(res) ? res : []);
        } catch (e) {
          setActivities([]);
        } finally {
          setLoadingActivities(false);
        }
      };
      fetchActivities();
    }
  }, [selectedLead, holdedApiKey]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdedApiKey || !selectedLead) return;
    try {
      const startDateTime = new Date(`${newActivity.date}T${newActivity.startTime}`);
      const endDateTime = new Date(`${newActivity.date}T${newActivity.endTime}`);
      
      await crmService.createActivity(holdedApiKey, {
        name: newActivity.title || ACTIVITY_TYPES.find(t => t.id === newActivity.type)?.name,
        kind: newActivity.type,
        startDate: Math.floor(startDateTime.getTime() / 1000),
        duration: Math.max(0, Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000)),
        desc: newActivity.notes,
        leadId: selectedLead.id,
        status: newActivity.completed ? 1 : 0
      });
      const res = await crmService.getActivities(holdedApiKey, selectedLead.id);
      setActivities(Array.isArray(res) ? res : []);
      setIsAddingActivity(false);
      setNewActivity({ 
        title: '', 
        type: 'llamada', 
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: format(new Date(), 'HH:mm'),
        endTime: format(new Date(Date.now() + 3600000), 'HH:mm'),
        notes: '',
        completed: false
      });
    } catch(e: any) {
      alert("Error creando actividad: " + (e?.message || String(e)));
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
     if (!holdedApiKey || !selectedLead) return;
     try {
       // Note: holdedService needs deleteActivity, but we can call it directly if available or use generic
       // For now, let's just alert that it's a future enhancement if not in service
       alert("Función de eliminar actividad se integrará próximamente");
     } catch(e) {}
  };

  const handleUpdateStage = async (leadId: string, stageId: string) => {
    if (!holdedApiKey) return;
    try {
      await crmService.updateLeadStage(holdedApiKey, leadId, stageId);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stageId } : l));
      if (selectedLead?.id === leadId) setSelectedLead(prev => ({...prev, stageId}));
    } catch(e) {
      alert("Error actualizando etapa");
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!holdedApiKey || !window.confirm('¿Seguro que deseas eliminar esta oportunidad?')) return;
    try {
      await crmService.deleteLead(holdedApiKey, leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      if (selectedLead?.id === leadId) setSelectedLead(null);
    } catch(e) {
      alert("Error eliminando lead");
    }
  };

  const handleSaveLeadEdit = async () => {
    if (!holdedApiKey || !selectedLead) return;
    try {
      await crmService.updateLead(holdedApiKey, selectedLead.id, editLeadData);
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, ...editLeadData } : l));
      setSelectedLead({ ...selectedLead, ...editLeadData });
      setIsEditingLead(false);
    } catch (e) {
      alert("Error actualizando oportunidad");
    }
  };

  const handleUpdateLeadStatus = async (status: number) => {
    if (!holdedApiKey || !selectedLead) return;
    try {
      setStatusUpdating(status);
      await crmService.updateLead(holdedApiKey, selectedLead.id, { status });
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status } : l));
      setSelectedLead({ ...selectedLead, status });
    } catch (e) {
      alert("Error actualizando estado de la oportunidad");
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdedApiKey) return;
    try {
      const payload = {
        name: newContact.name,
        email: newContact.email || undefined,
        phone: newContact.phone || undefined,
        code: newContact.code || undefined,
        isperson: newContact.isperson,
        type: newContact.type
      };
      const res = await contactsService.createContact(holdedApiKey, payload);
      if (res && res.id) {
        const createdContact = { 
          id: res.id, 
          name: newContact.name, 
          email: newContact.email,
          phone: newContact.phone,
          code: newContact.code,
          isperson: newContact.isperson
        };
        setContacts(prev => [createdContact, ...prev]);
        setNewLead(prev => ({ ...prev, contactId: res.id, contactName: newContact.name }));
        setContactSearch(newContact.name);
        setIsCreatingContact(false);
        setShowContactDropdown(false);
      } else {
        alert("Error al guardar el contacto en Holded.");
      }
    } catch(err: any) {
      alert("Error al crear el contacto en Holded: " + (err.message || String(err)));
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdedApiKey || !selectedFunnel) return;
    const firstStage = currentFunnelInfo?.stages?.[0]?.stageId || '';
    try {
      await crmService.createLead(holdedApiKey, {
        name: newLead.name || newLead.contactName,
        contactId: newLead.contactId,
        value: Number(newLead.value),
        funnelId: selectedFunnel,
        stageId: firstStage
      });
      await loadData();
      setIsCreating(false);
      setNewLead({ name: '', value: '', contactId: '', contactName: '' });
      setContactSearch('');
    } catch(e) {
      alert("Error creando oportunidad");
    }
  };

  const currentFunnelInfo = funnels.find(f => f.id === selectedFunnel);
  const currentLeads = leads.filter(l => {
    if (l.funnelId !== selectedFunnel) return false;
    if (statusFilter === 'open') return l.status === 0;
    if (statusFilter === 'won') return l.status === 1;
    if (statusFilter === 'lost') return l.status === 2 || l.status === -1;
    return true; // 'all'
  });
  const filteredContacts = contacts.filter(c => c.name?.toLowerCase().includes(contactSearch.toLowerCase()));

  if (loading && leads.length === 0) return <Spinner />;

  return (
    <div className="p-4 space-y-4 h-full flex flex-col bg-gray-50/50">
      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative z-10">
        <div className="flex-1 max-w-[240px]">
          <select 
            value={selectedFunnel}
            onChange={e => setSelectedFunnel(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
             {funnels.map(f => (
               <option key={f.id} value={f.id}>{f.name}</option>
             ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-md border border-gray-200/50">
            <span className="text-[10px] font-bold text-gray-400 uppercase px-1.5">Filtro:</span>
            {(['all', 'open', 'won', 'lost'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded transition-all uppercase tracking-tight",
                  statusFilter === s 
                    ? "bg-white shadow-sm text-blue-600 scale-105" 
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {s === 'all' ? 'Todos' : s === 'open' ? 'En curso' : s === 'won' ? 'Ganadas' : 'Perdidas'}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md border border-gray-200/50">
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn("p-1.5 rounded transition-all", viewMode === 'kanban' ? "bg-white shadow-sm text-blue-600 scale-105" : "text-gray-500 hover:text-gray-700")}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded transition-all", viewMode === 'list' ? "bg-white shadow-sm text-blue-600 scale-105" : "text-gray-500 hover:text-gray-700")}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto -mx-4 px-4 pb-20">
        {viewMode === 'list' ? (
          <div className="space-y-2">
            {currentLeads.map(lead => {
              const stageName = currentFunnelInfo?.stages?.find((s:any) => s.stageId === lead.stageId)?.name || 'Desconocido';
              return (
                <div key={lead.id} onClick={() => { setSelectedLead(lead); setEditLeadData({ name: lead.name, value: lead.value }); }} className={`bg-white p-3 rounded-xl border-l-4 border-y border-r border-gray-200 flex justify-between items-center group cursor-pointer hover:shadow-md transition-all ${lead.status === 1 ? 'border-l-green-500' : (lead.status === 2 || lead.status === -1 ? 'border-l-red-500 opacity-70' : 'border-l-blue-400')}`}>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800 truncate">{lead.name || lead.contactName || '(Sin nombre)'}</h4>
                    <div className="flex items-center text-[10px] text-gray-500 mt-1 gap-2">
                       <span className="bg-gray-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{stageName}</span>
                       <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">{lead.value > 0 ? `€${lead.value}` : ''}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id) }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex gap-4 h-full pb-4 overflow-x-auto snap-x snap-mandatory pr-4">
            {currentFunnelInfo?.stages?.map((stage: any) => {
              const stageLeads = currentLeads.filter(l => l.stageId === stage.stageId);
              return (
                <div 
                  key={stage.stageId} 
                  className="w-80 min-w-[320px] shrink-0 bg-gray-100/50 rounded-2xl flex flex-col snap-start border border-gray-200/60"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const leadId = e.dataTransfer.getData('text/plain');
                    if (leadId && leadId.startsWith('lead-')) {
                      handleUpdateStage(leadId.replace('lead-', ''), stage.stageId);
                    }
                  }}
                >
                  <div className="p-4 border-b border-gray-200/50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stage.name}</h3>
                    <span className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full font-bold shadow-sm">{stageLeads.length}</span>
                  </div>
                  <div className="p-2 flex-1 overflow-y-auto space-y-2">
                    {stageLeads.map(lead => (
                      <div 
                        key={lead.id} 
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', `lead-${lead.id}`);
                        }}
                        onClick={() => { setSelectedLead(lead); setEditLeadData({ name: lead.name, value: lead.value }); }} 
                        className={`bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95 border-2 ${lead.status === 1 ? 'border-green-400 bg-green-50/10' : (lead.status === 2 || lead.status === -1 ? 'border-red-200 opacity-60' : 'border-gray-200 hover:border-blue-400')}`}
                      >
                        <h4 className="text-sm font-semibold text-gray-800 leading-tight mb-3">{lead.name || lead.contactName || '(Sin nombre)'}</h4>
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                            {lead.value > 0 ? `€${lead.value}` : '-'}
                          </span>
                          <div className="text-[10px] text-gray-400 font-mono tracking-tighter">LEAD: {lead.id.substring(0, 6)}</div>
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="h-24 border-2 border-dashed border-gray-200/60 rounded-xl flex items-center justify-center text-gray-400 text-xs font-medium">
                        Sin oportunidades
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button 
        onClick={() => setIsCreating(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-700 hover:scale-110 transition-all z-30"
      >
        <Plus size={28} />
      </button>

      {/* MODAL CREAR LEAD (SIMPLIFICADO) */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h3 className="font-bold text-gray-800">Nueva oportunidad</h3>
               <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200">
                 <X size={20} />
               </button>
             </div>
             <form onSubmit={handleCreateLead} className="p-6 space-y-4">
               <div>
                 <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nombre oportunidad</label>
                 <input 
                   type="text" required autoFocus
                   value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})}
                   className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                   placeholder="Ej. Implantación Jota Jota"
                 />
               </div>
               <div className="relative">
                 <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Contacto</label>
                 <div className="relative">
                   <input 
                     type="text" required
                     value={contactSearch}
                     onChange={e => { setContactSearch(e.target.value); setShowContactDropdown(true); }}
                     onFocus={() => setShowContactDropdown(true)}
                     className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                     placeholder="Buscar contacto..."
                   />
                   <Search className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
                 </div>
                 {showContactDropdown && contactSearch && (
                    <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto">
                        {filteredContacts.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setNewContact({
                                name: contactSearch,
                                email: '',
                                phone: '',
                                code: '',
                                isperson: true,
                                type: 'client'
                              });
                              setIsCreatingContact(true);
                              setShowContactDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-[#1a73e8] hover:bg-blue-50/50 font-semibold flex items-center gap-2"
                          >
                            <Plus size={16} /> Crear nuevo contacto "{contactSearch}"
                          </button>
                        ) : (
                          <>
                            {filteredContacts.map(c => (
                              <div key={c.id} onClick={() => { setNewLead({...newLead, contactId: c.id, contactName: c.name}); setContactSearch(c.name); setShowContactDropdown(false); }} className="px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-50 flex justify-between">
                                <span className="font-semibold text-gray-700">{c.name}</span>
                                <span className="text-[10px] text-gray-400">{c.email}</span>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setNewContact({
                                  name: contactSearch,
                                  email: '',
                                  phone: '',
                                  code: '',
                                  isperson: true,
                                  type: 'client'
                                });
                                setIsCreatingContact(true);
                                setShowContactDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-[#1a73e8] hover:bg-blue-50/50 font-semibold border-t border-gray-100 flex items-center gap-1.5"
                            >
                              <Plus size={16} /> Crear nuevo contacto...
                            </button>
                          </>
                        )}
                    </div>
                 )}
               </div>
               <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Valor (€)</label>
                  <input 
                    type="number" step="0.01" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20"
                    placeholder="0.00"
                  />
               </div>
               <button type="submit" disabled={!newLead.contactId} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50">
                 Crear Oportunidad
               </button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR CONTACTO */}
      {isCreatingContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-800">Crear nuevo contacto</h3>
              <button 
                type="button"
                onClick={() => setIsCreatingContact(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="p-6 space-y-4">
              {/* Tipo de Contacto (Persona / Empresa) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Tipo de Contacto
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewContact({ ...newContact, isperson: true })}
                    className={cn(
                      'py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                      newContact.isperson
                        ? 'border-[#1a73e8] bg-blue-50 text-[#1a73e8]'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    )}
                  >
                    <UserIcon size={16} /> Persona
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewContact({ ...newContact, isperson: false })}
                    className={cn(
                      'py-2.5 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all',
                      !newContact.isperson
                        ? 'border-[#1a73e8] bg-blue-50 text-[#1a73e8]'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    )}
                  >
                    <Users size={16} /> Empresa
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  {newContact.isperson ? 'Nombre completo' : 'Nombre de Empresa / Razón Social'}
                </label>
                <input
                  type="text"
                  required
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder={newContact.isperson ? "Nombre y apellidos" : "Nombre de la empresa S.L."}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="ejemplo@correo.com"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="+34 600 000 000"
                />
              </div>

              {/* CIF / NIF */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  CIF / NIF
                </label>
                <input
                  type="text"
                  value={newContact.code}
                  onChange={(e) => setNewContact({ ...newContact, code: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all uppercase"
                  placeholder="Ej. B12345678 o 12345678Z"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={!newContact.name}
                  className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  Guardar Contacto
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingContact(false)}
                  className="px-6 bg-white border border-gray-200 text-gray-500 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETALLE DEL LEAD Y ACTIVIDADES */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-white w-full sm:w-[500px] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/80">
               <div>
                 <h2 className="text-xl font-bold text-gray-800 leading-tight">{selectedLead.name || selectedLead.contactName}</h2>
                 <p className="text-xs text-blue-600 font-semibold mt-1">Socio: {selectedLead.contactName}</p>
               </div>
               <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200">
                 <X size={20} />
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
                {/* Detalles Card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Información General</h3>
                    <button onClick={() => setIsEditingLead(!isEditingLead)} className="text-blue-600 text-xs font-bold hover:underline">
                      {isEditingLead ? 'Cerrar' : 'Editar'}
                    </button>
                  </div>
                  {isEditingLead ? (
                    <div className="space-y-4">
                        <input className="w-full border border-gray-200 rounded-lg p-2 text-sm" value={editLeadData.name} onChange={e => setEditLeadData({...editLeadData, name: e.target.value})} />
                        <input className="w-full border border-gray-200 rounded-lg p-2 text-sm" type="number" value={editLeadData.value} onChange={e => setEditLeadData({...editLeadData, value: Number(e.target.value)})} />
                        <button onClick={handleSaveLeadEdit} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-bold">Guardar</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">Etapa</p>
                        <p className="text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded inline-block">
                          {currentFunnelInfo?.stages?.find((s:any) => s.stageId === selectedLead.stageId)?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">Valoración</p>
                        <p className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                          €{selectedLead.value}
                        </p>
                      </div>
                      <div className="col-span-2 pt-3 mt-1 border-t border-gray-100 flex gap-3">
                        {selectedLead.status === 1 ? (
                          <div className="flex-1 bg-green-100 text-green-700 font-bold py-2 rounded-lg text-center text-sm flex items-center justify-center border border-green-200 shadow-sm transition-all animate-in zoom-in-95">
                            🏆 ¡Ganada!
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleUpdateLeadStatus(1)} 
                            disabled={statusUpdating !== null}
                            className={cn(
                              "flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition-all shadow-sm text-sm active:scale-95 disabled:opacity-50",
                              statusUpdating === 1 && "animate-pulse"
                            )}
                          >
                            {statusUpdating === 1 ? 'Actualizando...' : 'Ganada'}
                          </button>
                        )}
                        {selectedLead.status === 2 || selectedLead.status === -1 ? (
                          <div className="flex-1 bg-red-100 text-red-700 font-bold py-2 rounded-lg text-center text-sm flex items-center justify-center border border-red-200 shadow-sm transition-all animate-in zoom-in-95">
                            🚫 Perdida
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleUpdateLeadStatus(2)} 
                            disabled={statusUpdating !== null}
                            className={cn(
                              "flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition-all shadow-sm text-sm active:scale-95 disabled:opacity-50",
                              statusUpdating === 2 && "animate-pulse"
                            )}
                          >
                            {statusUpdating === 2 ? 'Actualizando...' : 'Perdida'}
                          </button>
                        )}
                        {(selectedLead.status === 1 || selectedLead.status === 2 || selectedLead.status === -1) && (
                          <button 
                            onClick={() => handleUpdateLeadStatus(0)} 
                            disabled={statusUpdating !== null}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-4 rounded-lg transition-all shadow-sm text-sm active:scale-95 disabled:opacity-50"
                          >
                            {statusUpdating === 0 ? '...' : 'Reabrir'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actividades Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <List size={18} className="text-blue-500" />
                        Actividades
                     </h3>
                     <button onClick={() => setIsAddingActivity(true)} className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                        <Plus size={14} /> Nueva
                     </button>
                  </div>

                  {isAddingActivity && (
                    <form onSubmit={handleCreateActivity} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-5 animate-in slide-in-from-top-4 duration-300">
                      <input 
                        type="text" required placeholder="Título de la actividad..."
                        value={newActivity.title} onChange={e => setNewActivity({...newActivity, title: e.target.value})}
                        className="w-full text-base font-semibold bg-transparent border-b border-gray-200 py-1 focus:border-blue-500 outline-none placeholder:text-gray-400"
                      />
                      
                      <div className="flex flex-wrap gap-2.5">
                        {ACTIVITY_TYPES.map((type) => (
                          <button
                            key={type.id} type="button"
                            onClick={() => setNewActivity({...newActivity, type: type.id})}
                            className={cn(
                              "flex flex-col items-center justify-center w-[68px] h-[68px] rounded-2xl transition-all border shadow-sm",
                              newActivity.type === type.id 
                                ? "bg-blue-600 text-white border-blue-600 scale-105" 
                                : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
                            )}
                          >
                            <type.icon size={20} className={newActivity.type === type.id ? 'text-white' : 'text-gray-400'} />
                            <span className="text-[9px] mt-1.5 font-bold uppercase tracking-tighter">{type.name}</span>
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                           <Calendar size={18} className="text-gray-400" />
                           <input type="date" value={newActivity.date} onChange={e => setNewActivity({...newActivity, date: e.target.value})} className="text-sm font-semibold border-none bg-transparent focus:ring-0 p-0 flex-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2">
                             <Clock size={16} className="text-gray-400" />
                             <span className="text-[10px] text-gray-400 font-bold uppercase">De</span>
                             <input type="time" value={newActivity.startTime} onChange={e => setNewActivity({...newActivity, startTime: e.target.value})} className="text-sm font-semibold border-none bg-transparent focus:ring-0 p-0 flex-1" />
                           </div>
                           <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2">
                             <Clock size={16} className="text-gray-400" />
                             <span className="text-[10px] text-gray-400 font-bold uppercase">A</span>
                             <input type="time" value={newActivity.endTime} onChange={e => setNewActivity({...newActivity, endTime: e.target.value})} className="text-sm font-semibold border-none bg-transparent focus:ring-0 p-0 flex-1" />
                           </div>
                        </div>
                      </div>

                      <textarea 
                        placeholder="Añadir notas internas..."
                        value={newActivity.notes} onChange={e => setNewActivity({...newActivity, notes: e.target.value})}
                        className="w-full text-sm bg-white border border-gray-100 rounded-xl p-4 min-h-[100px] outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                      />

                      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
                        <input type="checkbox" id="comp" checked={newActivity.completed} onChange={e => setNewActivity({...newActivity, completed: e.target.checked})} className="w-5 h-5 rounded-lg border-gray-200 text-blue-600 focus:ring-blue-500" />
                        <label htmlFor="comp" className="text-sm font-bold text-gray-600">Marcar como completada</label>
                      </div>

                      <div className="flex gap-3">
                        <button type="submit" className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl hover:bg-blue-700 transition-all">Crear Actividad</button>
                        <button type="button" onClick={() => setIsAddingActivity(false)} className="px-6 bg-white border border-gray-200 text-gray-500 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-50">Cancelar</button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {loadingActivities ? (
                      <div className="text-center py-8 text-gray-400 text-xs animate-pulse">Sincronizando historial...</div>
                    ) : activities.length > 0 ? (
                      activities.map((act: any) => {
                        const typeInfo = ACTIVITY_TYPES.find(t => t.id === (act.kind || act.type)) || ACTIVITY_TYPES[0];
                        const actName = act.name || act.title || 'Actividad sin título';
                        const actNotes = act.desc || act.notes;
                        const actDate = act.startDate || act.date;
                        const isCompleted = act.status === 1 || act.completed;

                        return (
                          <div key={act.id} className="p-4 bg-white border border-gray-50 rounded-2xl flex gap-4 hover:shadow-lg transition-all group">
                             <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110", typeInfo.color)}>
                               <typeInfo.icon size={20} className="text-white" />
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-start">
                                 <h4 className="text-sm font-bold text-gray-800 truncate">{actName}</h4>
                                 {isCompleted && <div className="bg-green-100 p-1 rounded-full"><Check size={12} className="text-green-600" /></div>}
                               </div>
                               <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                                 {typeInfo.name} • {actDate ? format(new Date(actDate * 1000), 'd MMM yyyy, HH:mm', { locale: es }) : ''}
                               </p>
                               {actNotes && (
                                 <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed border-l-2 border-gray-100 pl-3 italic">
                                   {actNotes}
                                 </p>
                               )}
                             </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                        <FileText size={40} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sin actividad reciente</p>
                      </div>
                    )}
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
