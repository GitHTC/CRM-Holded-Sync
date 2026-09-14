import React, { useState } from 'react';
import { projectsService } from '../services/holded';
import { useAppContext } from '../context/AppContext';
import { X, Edit2, Trash2, Calendar, Tag, Check, AlertTriangle } from 'lucide-react';

interface EditProjectModalProps {
  project: any;
  contacts: any[];
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function EditProjectModal({ project, contacts, onClose, onUpdated, onDeleted }: EditProjectModalProps) {
  const { holdedApiKey } = useAppContext();
  const [formData, setFormData] = useState({
    name: project.name || '',
    description: project.description || '',
    dueDate: project.dueDate || project.due_date || '',
    startDate: project.startDate || project.start_date || '',
    contactId: project.contactId || project.contact_id || '',
    status: project.status !== undefined ? Number(project.status) : 0,
    billable: Boolean(project.billable),
    tagsString: Array.isArray(project.tags) ? project.tags.join(', ') : ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdedApiKey || !project.id) return;
    if (!formData.name.trim()) {
      setError("El nombre del proyecto es obligatorio");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const tags = formData.tagsString
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await projectsService.updateProject(holdedApiKey, project.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        dueDate: formData.dueDate || null,
        startDate: formData.startDate || null,
        contactId: formData.contactId || null,
        status: formData.status,
        billable: formData.billable,
        tags
      });

      onUpdated();
      onClose();
    } catch (err: any) {
      setError("Error al actualizar el proyecto: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!holdedApiKey || !project.id) return;
    setDeleting(true);
    setError(null);
    try {
      await projectsService.deleteProject(holdedApiKey, project.id);
      onDeleted();
      onClose();
    } catch (err: any) {
      setError("Error al eliminar el proyecto: " + err.message);
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Edit2 size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-800 leading-tight">Editar Proyecto (v2)</h3>
              <p className="text-xs text-gray-400 font-medium truncate max-w-xs">{project.name}</p>
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Nombre del Proyecto <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Descripción
            </label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[60px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Fecha Inicio
              </label>
              <input 
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Fecha Entrega
              </label>
              <input 
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value={0}>Abierto / En progreso</option>
                <option value={1}>En espera</option>
                <option value={2}>Completado</option>
                <option value={3}>Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Cliente Asociado
              </label>
              <select
                value={formData.contactId}
                onChange={e => setFormData({ ...formData, contactId: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">-- Ninguno --</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Etiquetas (separadas por comas)
            </label>
            <div className="relative">
              <Tag size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text"
                placeholder="ej: Web, Frontend, Urgente"
                value={formData.tagsString}
                onChange={e => setFormData({ ...formData, tagsString: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input 
              type="checkbox" 
              id="billableCheck"
              checked={formData.billable}
              onChange={e => setFormData({ ...formData, billable: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="billableCheck" className="text-xs font-semibold text-gray-700 cursor-pointer">
              Proyecto Facturable
            </label>
          </div>

          {/* Delete Project Action */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            {confirmDeleteOpen ? (
              <div className="flex items-center gap-2 w-full bg-red-50 p-2.5 rounded-xl border border-red-100">
                <span className="text-xs font-bold text-red-700 flex-1">¿Eliminar proyecto y tiempos?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                Eliminar Proyecto
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-white border border-gray-200 text-gray-500 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={saving || !formData.name.trim()}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
