'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

type Room = {
  id: number;
  name: string;
  active: boolean;
};

type Med = {
  id: number;
  name: string;
  unit: string;
  high_alert: boolean;
  active: boolean;
};

type Kit = {
  id: number;
  key: string;
  name: string;
  active: boolean;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'rooms' | 'meds' | 'kits'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'rooms') {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .order('name');
        if (error) throw error;
        setRooms(data || []);
      } else if (activeTab === 'meds') {
        const { data, error } = await supabase
          .from('meds')
          .select('*')
          .order('name');
        if (error) throw error;
        setMeds(data || []);
      } else if (activeTab === 'kits') {
        const { data, error } = await supabase
          .from('kits')
          .select('*')
          .order('name');
        if (error) throw error;
        setKits(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (item: any, isNew: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      if (isNew) {
        const { error } = await supabase
          .from(activeTab)
          .insert([item]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(activeTab)
          .update(item)
          .eq('id', item.id);
        if (error) throw error;
      }
      
      setEditingId(null);
      setShowAddForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from(activeTab)
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  };

  const renderRoomsTable = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gerenciar Salas</h2>
            <p className="text-gray-600 text-sm mt-1">Configure as salas disponíveis no sistema</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            <Plus size={18} />
            Nova Sala
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                isEditing={editingId === room.id}
                onEdit={() => setEditingId(room.id)}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
                onDelete={() => handleDelete(room.id)}
                loading={loading}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {showAddForm && (
        <div className="p-8 border-t border-gray-200 bg-gray-50">
          <AddRoomForm
            onSave={handleSave}
            onCancel={() => setShowAddForm(false)}
            loading={loading}
          />
        </div>
      )}
    </div>
  );

  const renderMedsTable = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gerenciar Medicamentos</h2>
            <p className="text-gray-600 text-sm mt-1">Configure os medicamentos e MAVs do sistema</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            <Plus size={18} />
            Novo Medicamento
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unidade</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">MAV</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {meds.map((med) => (
              <MedRow
                key={med.id}
                med={med}
                isEditing={editingId === med.id}
                onEdit={() => setEditingId(med.id)}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
                onDelete={() => handleDelete(med.id)}
                loading={loading}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {showAddForm && (
        <div className="p-8 border-t border-gray-200 bg-gray-50">
          <AddMedForm
            onSave={handleSave}
            onCancel={() => setShowAddForm(false)}
            loading={loading}
          />
        </div>
      )}
    </div>
  );

  const renderKitsTable = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gerenciar Kits</h2>
            <p className="text-gray-600 text-sm mt-1">Configure os kits de medicamentos disponíveis</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            <Plus size={18} />
            Novo Kit
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Chave</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {kits.map((kit) => (
              <KitRow
                key={kit.id}
                kit={kit}
                isEditing={editingId === kit.id}
                onEdit={() => setEditingId(kit.id)}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
                onDelete={() => handleDelete(kit.id)}
                loading={loading}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {showAddForm && (
        <div className="p-8 border-t border-gray-200 bg-gray-50">
          <AddKitForm
            onSave={handleSave}
            onCancel={() => setShowAddForm(false)}
            loading={loading}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Administração do Sistema</h1>
              <p className="text-gray-600">Gerencie salas, medicamentos e kits do Fácil Pharma</p>
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-xl">
              <div className="text-white text-center">
                <div className="text-2xl font-bold">{activeTab === 'rooms' ? rooms.length : activeTab === 'meds' ? meds.length : kits.length}</div>
                <div className="text-sm opacity-90">
                  {activeTab === 'rooms' ? 'Salas' : activeTab === 'meds' ? 'Medicamentos' : 'Kits'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              {error}
            </div>
          </div>
        )}
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <nav className="flex">
            {(['rooms', 'meds', 'kits'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setEditingId(null);
                  setShowAddForm(false);
                }}
                className={`flex-1 py-4 px-6 font-semibold text-sm transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab === 'rooms' ? 'Salas' : tab === 'meds' ? 'Medicamentos' : 'Kits'}
              </button>
            ))}
          </nav>
        </div>
        
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 bg-white px-6 py-4 rounded-xl shadow-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-gray-700 font-medium">Carregando dados...</span>
            </div>
          </div>
        )}
        
        {!loading && (
          <div className="animate-fade-in">
            {activeTab === 'rooms' && renderRoomsTable()}
            {activeTab === 'meds' && renderMedsTable()}
            {activeTab === 'kits' && renderKitsTable()}
          </div>
        )}
      </div>
    </div>
  );
}

// Componentes auxiliares para as linhas das tabelas
function RoomRow({ room, isEditing, onEdit, onSave, onCancel, onDelete, loading }: any) {
  const [editData, setEditData] = useState(room);
  
  if (isEditing) {
    return (
      <tr className="bg-blue-50 border-l-4 border-blue-500">
        <td className="px-6 py-4 text-sm font-medium text-gray-900">{room.id}</td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="input-field w-full"
            placeholder="Nome da sala"
          />
        </td>
        <td className="px-6 py-4">
          <select
            value={editData.active ? 'true' : 'false'}
            onChange={(e) => setEditData({ ...editData, active: e.target.value === 'true' })}
            className="input-field"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </td>
        <td className="px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => onSave(editData)}
              disabled={loading}
              className="btn-success p-2 disabled:opacity-50"
              title="Salvar"
            >
              <Save size={16} />
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary p-2 disabled:opacity-50"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }
  
  return (
    <tr className="hover:bg-gray-50 transition-colors duration-200">
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{room.id}</td>
      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{room.name}</td>
      <td className="px-6 py-4">
        <span className={`status-badge ${
          room.active ? 'status-active' : 'status-inactive'
        }`}>
          {room.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={loading}
            className="btn-secondary p-2"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            disabled={loading}
            className="btn-danger p-2"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function MedRow({ med, isEditing, onEdit, onSave, onCancel, onDelete, loading }: any) {
  const [editData, setEditData] = useState(med);
  
  if (isEditing) {
    return (
      <tr className="bg-blue-50 border-l-4 border-blue-500">
        <td className="px-6 py-4 text-sm font-medium text-gray-900">{med.id}</td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="input-field w-full"
            placeholder="Nome do medicamento"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.unit}
            onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
            className="input-field w-full"
            placeholder="Unidade (mg, ml, etc.)"
          />
        </td>
        <td className="px-6 py-4">
          <select
            value={editData.high_alert ? 'true' : 'false'}
            onChange={(e) => setEditData({ ...editData, high_alert: e.target.value === 'true' })}
            className="input-field"
          >
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </td>
        <td className="px-6 py-4">
          <select
            value={editData.active ? 'true' : 'false'}
            onChange={(e) => setEditData({ ...editData, active: e.target.value === 'true' })}
            className="input-field"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </td>
        <td className="px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => onSave(editData)}
              disabled={loading}
              className="btn-success p-2 disabled:opacity-50"
              title="Salvar"
            >
              <Save size={16} />
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary p-2 disabled:opacity-50"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }
  
  return (
    <tr className="hover:bg-gray-50 transition-colors duration-200">
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{med.id}</td>
      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{med.name}</td>
      <td className="px-6 py-4 text-sm text-gray-600">{med.unit}</td>
      <td className="px-6 py-4">
        <span className={`status-badge ${
          med.high_alert ? 'status-warning' : 'status-neutral'
        }`}>
          {med.high_alert ? 'MAV' : 'Normal'}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`status-badge ${
          med.active ? 'status-active' : 'status-inactive'
        }`}>
          {med.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={loading}
            className="btn-secondary p-2"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            disabled={loading}
            className="btn-danger p-2"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function KitRow({ kit, isEditing, onEdit, onSave, onCancel, onDelete, loading }: any) {
  const [editData, setEditData] = useState(kit);
  
  if (isEditing) {
    return (
      <tr className="bg-blue-50 border-l-4 border-blue-500">
        <td className="px-6 py-4 text-sm font-medium text-gray-900">{kit.id}</td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.key}
            onChange={(e) => setEditData({ ...editData, key: e.target.value })}
            className="input-field w-full"
            placeholder="Chave do kit"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="input-field w-full"
            placeholder="Nome do kit"
          />
        </td>
        <td className="px-6 py-4">
          <select
            value={editData.active ? 'true' : 'false'}
            onChange={(e) => setEditData({ ...editData, active: e.target.value === 'true' })}
            className="input-field"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </td>
        <td className="px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => onSave(editData)}
              disabled={loading}
              className="btn-success p-2 disabled:opacity-50"
              title="Salvar"
            >
              <Save size={16} />
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="btn-secondary p-2 disabled:opacity-50"
              title="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }
  
  return (
    <tr className="hover:bg-gray-50 transition-colors duration-200">
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{kit.id}</td>
      <td className="px-6 py-4">
        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{kit.key}</code>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{kit.name}</td>
      <td className="px-6 py-4">
        <span className={`status-badge ${
          kit.active ? 'status-active' : 'status-inactive'
        }`}>
          {kit.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={loading}
            className="btn-secondary p-2"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            disabled={loading}
            className="btn-danger p-2"
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Formulários de adição
function AddRoomForm({ onSave, onCancel, loading }: any) {
  const [formData, setFormData] = useState({ name: '', active: true });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, true);
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Plus size={20} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Adicionar Nova Sala</h3>
          <p className="text-sm text-gray-600">Preencha os dados da nova sala</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Nome da Sala</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input-field w-full"
            placeholder="Ex: UTI 1, Enfermaria A, etc."
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
          <select
            value={formData.active ? 'true' : 'false'}
            onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
            className="input-field"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Sala'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary px-6"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function AddMedForm({ onSave, onCancel, loading }: any) {
  const [formData, setFormData] = useState({ name: '', unit: '', high_alert: false, active: true });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, true);
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <Plus size={20} className="text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Adicionar Novo Medicamento</h3>
          <p className="text-sm text-gray-600">Configure um novo medicamento no sistema</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Medicamento</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field w-full"
              placeholder="Ex: Dipirona, Paracetamol, etc."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Unidade</label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="input-field w-full"
              placeholder="Ex: mg, ml, comprimido, etc."
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo MAV</label>
            <select
              value={formData.high_alert ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, high_alert: e.target.value === 'true' })}
              className="input-field w-full"
            >
              <option value="false">Medicamento Normal</option>
              <option value="true">MAV (Medicamento de Alta Vigilância)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              value={formData.active ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
              className="input-field w-full"
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Medicamento'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary px-6"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function AddKitForm({ onSave, onCancel, loading }: any) {
  const [formData, setFormData] = useState({ key: '', name: '', active: true });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, true);
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Plus size={20} className="text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Adicionar Novo Kit</h3>
          <p className="text-sm text-gray-600">Configure um novo kit de medicamentos</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Chave do Kit</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
              className="input-field w-full font-mono"
              placeholder="EMERGENCIA, CIRURGIA, etc."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Kit</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field w-full"
              placeholder="Ex: Kit Emergência, Kit Cirúrgico, etc."
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
          <select
            value={formData.active ? 'true' : 'false'}
            onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
            className="input-field"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Kit'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary px-6"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}