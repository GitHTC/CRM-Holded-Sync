import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, X, User as UserIcon, Users, Phone, Mail, Globe, 
  MapPin, FileText, Check, AlertCircle, RefreshCw, Briefcase, ChevronRight 
} from 'lucide-react';
import { contactsService } from '../services/holded';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

interface ContactsDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContactForLead?: (contact: any) => void;
  onContactCreated?: (contact: any) => void;
}

export function ContactsDirectoryModal({
  isOpen,
  onClose,
  onSelectContactForLead,
  onContactCreated
}: ContactsDirectoryModalProps) {
  const { holdedApiKey } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'lead' | 'supplier' | 'creditor' | 'debtor'>('all');
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create contact modal state
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    name: '',
    trade_name: '',
    is_person: true,
    type: 'client',
    email: '',
    phone: '',
    mobile: '',
    code: '',
    vat_number: '',
    website: '',
    address: '',
    city: '',
    postal_code: '',
    province: ''
  });

  // Load initial contacts or search
  const fetchContacts = async (query: string) => {
    if (!holdedApiKey) return;
    setLoading(true);
    setError(null);
    try {
      if (query.trim()) {
        const results = await contactsService.searchContacts(holdedApiKey, {
          name: query.trim(),
          limit: 50
        });
        setContacts(results);
      } else {
        const results = await contactsService.getContacts(holdedApiKey, { limit: 50 });
        setContacts(results);
      }
    } catch (err: any) {
      console.error('Error fetching contacts from Holded v2:', err);
      setError(err.message || 'Error cargando contactos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchContacts(searchTerm);
    }, searchTerm ? 250 : 0);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, holdedApiKey]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdedApiKey || !newContact.name.trim()) return;

    setSavingContact(true);
    setCreateError(null);
    try {
      const payload: any = {
        name: newContact.name.trim(),
        is_person: newContact.is_person,
        type: newContact.type
      };

      if (newContact.trade_name.trim()) payload.trade_name = newContact.trade_name.trim();
      if (newContact.code.trim()) payload.code = newContact.code.trim();
      if (newContact.vat_number.trim()) payload.vat_number = newContact.vat_number.trim();
      if (newContact.email.trim()) payload.email = newContact.email.trim();
      if (newContact.phone.trim()) payload.phone = newContact.phone.trim();
      if (newContact.mobile.trim()) payload.mobile = newContact.mobile.trim();
      if (newContact.website.trim()) payload.website = newContact.website.trim();

      if (newContact.address || newContact.city || newContact.postal_code || newContact.province) {
        payload.bill_address = {
          address: newContact.address.trim() || null,
          city: newContact.city.trim() || null,
          postal_code: newContact.postal_code.trim() || null,
          province: newContact.province.trim() || null
        };
      }

      const res = await contactsService.createContact(holdedApiKey, payload);
      if (res && res.id) {
        const created = {
          id: res.id,
          name: newContact.name,
          tradeName: newContact.trade_name,
          email: newContact.email,
          phone: newContact.phone,
          mobile: newContact.mobile,
          code: newContact.code,
          isPerson: newContact.is_person,
          type: newContact.type,
          billAddress: payload.bill_address
        };

        setContacts(prev => [created, ...prev]);
        if (onContactCreated) onContactCreated(created);

        setIsCreatingContact(false);
        setNewContact({
          name: '',
          trade_name: '',
          is_person: true,
          type: 'client',
          email: '',
          phone: '',
          mobile: '',
          code: '',
          vat_number: '',
          website: '',
          address: '',
          city: '',
          postal_code: '',
          province: ''
        });
      } else {
        throw new Error('Respuesta inválida del servidor al crear contacto');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear contacto en Holded');
    } finally {
      setSavingContact(false);
    }
  };

  if (!isOpen) return null;

  const filteredContacts = contacts.filter(c => {
    if (typeFilter === 'all') return true;
    return c.type === typeFilter;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'client': return { text: 'Cliente', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'lead': return { text: 'Lead', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'supplier': return { text: 'Proveedor', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'creditor': return { text: 'Acreedor', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'debtor': return { text: 'Deudor', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default: return { text: type || 'Contacto', color: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[90vh] max-h-[780px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-800 font-google">Directorio de Contactos</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  Holded v2 Search
                </span>
              </div>
              <p className="text-xs text-gray-400">Búsqueda rápida por prefijo y gestión de clientes y leads</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setNewContact(prev => ({ ...prev, name: searchTerm }));
                setIsCreatingContact(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={15} />
              <span>Nuevo Contacto</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar & Type Filter */}
        <div className="p-4 border-b border-gray-100 bg-white space-y-3 shrink-0">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar contactos por nombre en Holded (autocompletado por prefijo v2)..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              autoFocus
            />
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
            {loading && (
              <RefreshCw className="absolute right-3.5 top-3 text-blue-600 animate-spin" size={16} />
            )}
            {!loading && searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Filtrar:</span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'client', label: 'Clientes' },
                { id: 'lead', label: 'Leads' },
                { id: 'supplier', label: 'Proveedores' },
                { id: 'debtor', label: 'Deudores' },
                { id: 'creditor', label: 'Acreedores' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-medium transition-all text-xs",
                    typeFilter === tab.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-gray-400 shrink-0">
              {filteredContacts.length} contactos
            </span>
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50/50">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {filteredContacts.length === 0 && !loading && (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users size={22} />
              </div>
              <h4 className="text-sm font-semibold text-gray-800">No se encontraron contactos</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? `No hay contactos que comiencen por "${searchTerm}". Puedes darlo de alta ahora mismo en Holded.`
                  : 'No hay contactos disponibles con los filtros actuales.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => {
                    setNewContact(prev => ({ ...prev, name: searchTerm }));
                    setIsCreatingContact(true);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus size={14} /> Crear "{searchTerm}" en Holded
                </button>
              )}
            </div>
          )}

          {filteredContacts.map((contact) => {
            const typeInfo = getTypeLabel(contact.type);
            const isPerson = contact.isPerson ?? contact.is_person ?? true;
            return (
              <div
                key={contact.id}
                className="bg-white p-3.5 rounded-xl border border-gray-200/80 hover:border-blue-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 mt-0.5",
                    isPerson ? "bg-blue-50 text-blue-600" : "bg-indigo-50 text-indigo-600"
                  )}>
                    {isPerson ? <UserIcon size={18} /> : <Users size={18} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {contact.name || '(Sin nombre)'}
                      </h3>
                      {contact.tradeName && contact.tradeName !== contact.name && (
                        <span className="text-[11px] text-gray-500 font-medium truncate">
                          ({contact.tradeName})
                        </span>
                      )}
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", typeInfo.color)}>
                        {typeInfo.text}
                      </span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                        {isPerson ? 'Persona' : 'Empresa'}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      {contact.code && (
                        <span className="font-mono text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                          {contact.code}
                        </span>
                      )}
                      {contact.email && (
                        <a 
                          href={`mailto:${contact.email}`} 
                          className="flex items-center gap-1 text-gray-600 hover:text-blue-600 truncate max-w-[200px]"
                          title={contact.email}
                        >
                          <Mail size={12} className="shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </a>
                      )}
                      {(contact.phone || contact.mobile) && (
                        <a 
                          href={`tel:${contact.mobile || contact.phone}`} 
                          className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
                        >
                          <Phone size={12} className="shrink-0" />
                          <span>{contact.mobile || contact.phone}</span>
                        </a>
                      )}
                      {contact.billAddress?.city && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <MapPin size={12} className="shrink-0" />
                          <span>{contact.billAddress.city}{contact.billAddress.province ? `, ${contact.billAddress.province}` : ''}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {onSelectContactForLead && (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => {
                        onSelectContactForLead(contact);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all border border-blue-200 hover:border-blue-600 shadow-xs"
                      title="Crear oportunidad asociada a este contacto"
                    >
                      <Briefcase size={13} />
                      <span>Crear Oportunidad</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL CREAR CONTACTO V2 */}
      {isCreatingContact && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-60 flex items-center justify-center p-3 sm:p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 shrink-0">
              <div>
                <h3 className="font-bold text-gray-800 text-base font-google">Nuevo Contacto (Holded API v2)</h3>
                <p className="text-xs text-gray-400">Crea el contacto directamente en tu cuenta de Holded</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingContact(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="p-6 overflow-y-auto space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Persona vs Empresa */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Naturaleza jurídica
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewContact({ ...newContact, is_person: true })}
                    className={cn(
                      'py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all',
                      newContact.is_person
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    )}
                  >
                    <UserIcon size={16} /> Persona física
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewContact({ ...newContact, is_person: false })}
                    className={cn(
                      'py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all',
                      !newContact.is_person
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    )}
                  >
                    <Users size={16} /> Empresa / Sociedad
                  </button>
                </div>
              </div>

              {/* Clasificación (type) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Tipo de Contacto (Holded)
                </label>
                <select
                  value={newContact.type}
                  onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="client">Cliente (client)</option>
                  <option value="lead">Lead / Prospecto (lead)</option>
                  <option value="supplier">Proveedor (supplier)</option>
                  <option value="creditor">Acreedor (creditor)</option>
                  <option value="debtor">Deudor (debtor)</option>
                </select>
              </div>

              {/* Nombre y Nombre Comercial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    {newContact.is_person ? 'Nombre completo *' : 'Razón Social *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder={newContact.is_person ? "Ej. Juan Pérez" : "Ej. Tech Solutions S.L."}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Nombre comercial
                  </label>
                  <input
                    type="text"
                    value={newContact.trade_name}
                    onChange={(e) => setNewContact({ ...newContact, trade_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="Marca comercial o fantasía"
                  />
                </div>
              </div>

              {/* CIF / NIF / Documento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    NIF / CIF / Código
                  </label>
                  <input
                    type="text"
                    value={newContact.code}
                    onChange={(e) => setNewContact({ ...newContact, code: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs uppercase text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="B12345678 o 12345678Z"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Email principal
                  </label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="contacto@empresa.com"
                  />
                </div>
              </div>

              {/* Teléfonos y Web */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Móvil
                  </label>
                  <input
                    type="tel"
                    value={newContact.mobile}
                    onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="612345678"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Teléfono fijo
                  </label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="912345678"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Sitio Web
                  </label>
                  <input
                    type="text"
                    value={newContact.website}
                    onChange={(e) => setNewContact({ ...newContact, website: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="https://empresa.com"
                  />
                </div>
              </div>

              {/* Dirección fiscal */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Dirección fiscal (opcional)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={newContact.address}
                      onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      placeholder="Calle, número, piso..."
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newContact.city}
                      onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      placeholder="Ciudad"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newContact.postal_code}
                      onChange={(e) => setNewContact({ ...newContact, postal_code: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      placeholder="C.P."
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newContact.province}
                      onChange={(e) => setNewContact({ ...newContact, province: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      placeholder="Provincia"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={savingContact || !newContact.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingContact ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Guardando en Holded...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Guardar Contacto en Holded
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingContact(false)}
                  disabled={savingContact}
                  className="px-5 bg-white border border-gray-200 text-gray-600 py-3 rounded-xl font-bold text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
