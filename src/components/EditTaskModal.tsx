import React, { useState } from 'react';
import { projectsService } from '../services/holded';
import { useAppContext } from '../context/AppContext';
import { X, CheckSquare, Trash2, Calendar, AlertCircle, Check } from 'lucide-react';

interface EditTaskModalProps {
  task: any;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function EditTaskModal({ task, onClose, onUpdated, onDeleted }: EditTaskModalProps) {
  const { holdedApiKey } = useAppContext();
  const [formData, setFormData] = useState({
    name: task.name || '',
    description: task.description || '',
    dueDate: task.dueDate || task.due_date || '',
    priority: task.priority !== undefined ? Number(task.priority) : 0,
    status: task.status || 'todo'
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdedApiKey || !task.id) return;
    if (!formData.name.trim()) {
      setError("El nombre de la tarea es obligatorio");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await projectsService.updateTask(holdedApiKey, task.id, {
        project_id: task.projectId || task.project_id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        due_date: formData.dueDate || null,
        priority: formData.priority,
        status: formData.status,
        assigned_to: task.assignedTo || []
      });

      onUpdated();
      onClose();
    } catch (err: any) {
      setError("Error al actualizar la tarea: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!holdedApiKey || !task.id) return;
    setDeleting(true);
    setError(null);
    try {
      await projectsService.deleteTask(holdedApiKey, task.id);
      onDeleted();
      onClose();
    } catch (err: any) {
      setError("Error al eliminar la tarea: " + err.message);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <CheckSquare size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-800 leading-tight">Editar Tarea (v2)</h3>
              <p className="text-xs text-gray-400 font-medium truncate max-w-xs">{task.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Título de la Tarea <span className="text-red-500">*</span>
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
              Descripción / Notas
            </label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[60px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="todo">Por hacer</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                Prioridad
              </label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value={0}>Baja</option>
                <option value={1}>Media</option>
                <option value={2}>Alta</option>
                <option value={3}>Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Fecha Límite
            </label>
            <input 
              type="date"
              value={formData.dueDate}
              onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Delete Task */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            {confirmDelete ? (
              <div className="flex items-center gap-2 w-full bg-red-50 p-2.5 rounded-xl border border-red-100">
                <span className="text-xs font-bold text-red-700 flex-1">¿Eliminar tarea?</span>
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
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                Eliminar Tarea
              </button>
            )}
          </div>

          {/* Action buttons */}
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
