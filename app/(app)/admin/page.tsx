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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Salas</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <Plus size={16} />
          Adicionar Sala
        </button>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">Ativo</th>
              <th className="px-4 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
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
        <AddRoomForm
          onSave={handleSave}
          onCancel={() => setShowAddForm(false)}
          loading={loading}
        />
      )}
    </div>
  );

  const renderMedsTable = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Medicamentos</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <Plus size={16} />
          Adicionar Medicamento
        </button>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">Unidade</th>
              <th className="px-4 py-2 text-left">MAV</th>
              <th className="px-4 py-2 text-left">Ativo</th>
              <th className="px-4 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
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
        <AddMedForm
          onSave={handleSave}
          onCancel={() => setShowAddForm(false)}
          loading={loading}
        />
      )}
    </div>
  );

  const renderKitsTable = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Kits</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <Plus size={16} />
          Adicionar Kit
        </button>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Chave</th>
              <th className="px-4 py-2 text-left">Nome</th>
              <th className="px-4 py-2 text-left">Ativo</th>
              <th className="px-4 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
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
        <AddKitForm
          onSave={handleSave}
          onCancel={() => setShowAddForm(false)}
          loading={loading}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Administração</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div className="border-b">
        <nav className="flex space-x-8">
          {(['rooms', 'meds', 'kits'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setEditingId(null);
                setShowAddForm(false);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'rooms' ? 'Salas' : tab === 'meds' ? 'Medicamentos' : 'Kits'}
            </button>
          ))}
        </nav>
      </div>
      
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {!loading && (
        <div>
          {activeTab === 'rooms' && renderRoomsTable()}
          {activeTab === 'meds' && renderMedsTable()}
          {activeTab === 'kits' && renderKitsTable()}
        </div>
      )}
    </div>
  );
}

// Componentes auxiliares para as linhas das tabelas
function RoomRow({ room, isEditing, onEdit, onSave, onCancel, onDelete, loading }: any) {
  const [editData, setEditData] = useState(room);
  
  if (isEditing) {
    return (
      <tr>
        <td className="px-4 py-2">{room.id}</td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="border rounded px-2 py-1 w-full"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="checkbox"
            checked={editData.active}
            onChange={(e) => setEditData({ ...editData, active: e.target.checked })}
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <button
              onClick={() => onSave(editData)}
              disabled={loading}
              className="text-green-600 hover:text-green-800 disabled:opacity-50"
            >
              <Save size={16} />
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }
  
  return (
    <tr>
      <td className="px-4 py-2">{room.id}</td>
      <td className="px-4 py-2">{room.name}</td>
      <td className="px-4 py-2">
        <span className={`px-2 py-1 rounded text-xs ${
          room.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {room.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            disabled={loading}
            className="text-red-600 hover:text-red-800 disabled:opacity-50"
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
      <tr>
        <td className="px-4 py-2">{med.id}</td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="border rounded px-2 py-1 w-full"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={editData.unit}
            onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
            className="border rounded px-2 py-1 w-full"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="checkbox"
            checked={editData.high_alert}
            onChange={(e) => setEditData({ ...editData, high_alert: e.target.checked })}
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="checkbox"
            checked={editData.active}
            onChange={(e) => setEditData({ ...editData, active: e.target.checked })}
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <button
              onClick={() => onSave(editData)}
              disabled={loading}
              className="text-green-600 hover:text-green-800 disabled:opacity-50"
            >
              <Save size={16} />
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }
  
  return (
    <tr>
      <td className="px-4 py-2">{med.id}</td>
      <td className="px-4 py-2">{med.name}</td>
      <td className="px-4 py-2">{med.unit}</td>
      <td className="px-4 py-2">
        {med.high_alert && (
          <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
            MAV
          </span>
        )}
      </td>
      <td className="px-4 py-2">
        <span className={`px-2 py-1 rounded text-xs ${
          med.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {med.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            disabled={loading}
            className="text-red-600 hover:text-red-800 disabled:opacity-50"
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
      <tr>
        <td className="px-4 py-2">{kit.id}</td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={editData.key}
            onChange={(e) => setEditData({ ...editData, key: e.target.value })}
            className="border rounded px-2 py-1 w-full"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="border rounded px-2 py-1 w-full"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="checkbox"
            checked={editData.active}
            onChange={(e) => setEditData({ ...editData, active: e.target.checked })}
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <button
              onClick={() => onSave(editData)}
              disabled={loading}
              className="text-green-600 hover:text-green-800 disabled:opacity-50"
            >
              <Save size={16} />
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }
  
  return (
    <tr>
      <td className="px-4 py-2">{kit.id}</td>
      <td className="px-4 py-2">
        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{kit.key}</code>
      </td>
      <td className="px-4 py-2">{kit.name}</td>
      <td className="px-4 py-2">
        <span className={`px-2 py-1 rounded text-xs ${
          kit.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {kit.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            disabled={loading}
            className="text-red-600 hover:text-red-800 disabled:opacity-50"
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
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium mb-4">Adicionar Nova Sala</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="Nome da sala"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            Ativo
          </label>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSave(formData, true)}
          disabled={loading || !formData.name}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function AddMedForm({ onSave, onCancel, loading }: any) {
  const [formData, setFormData] = useState({ name: '', unit: '', high_alert: false, active: true });
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium mb-4">Adicionar Novo Medicamento</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="Nome do medicamento"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Unidade</label>
          <input
            type="text"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="mg, ml, cp, etc."
          />
        </div>
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.high_alert}
              onChange={(e) => setFormData({ ...formData, high_alert: e.target.checked })}
              className="mr-2"
            />
            Medicamento de Alta Vigilância (MAV)
          </label>
        </div>
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            Ativo
          </label>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSave(formData, true)}
          disabled={loading || !formData.name || !formData.unit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function AddKitForm({ onSave, onCancel, loading }: any) {
  const [formData, setFormData] = useState({ key: '', name: '', active: true });
  
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium mb-4">Adicionar Novo Kit</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Chave</label>
          <input
            type="text"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
            className="border rounded px-3 py-2 w-full font-mono"
            placeholder="EMERGENCIA, CIRURGIA, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="Nome do kit"
          />
        </div>
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            Ativo
          </label>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSave(formData, true)}
          disabled={loading || !formData.key || !formData.name}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}