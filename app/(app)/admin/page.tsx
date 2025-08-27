'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Save, X, Settings, AlertCircle, Building, Pill, Package, Users } from 'lucide-react';

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

type User = {
  id: string;
  email: string;
  display_name: string | null;
  role: 'nurse' | 'pharmacy' | 'admin' | 'auditor';
  room_id: number | null;
  room_name?: string;
  created_at: string;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'rooms' | 'meds' | 'kits' | 'users'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  
  const supabase = useMemo(() => createClient(), []);

  // Verificar sessão do usuário e seu perfil
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Erro ao verificar usuário:', error);
        } else if (user) {
          setUser(user);
          
          // Buscar perfil do usuário para verificar role
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, display_name, room_id')
            .eq('user_id', user.id)
            .single();
            
          if (profileError) {
            console.error('Erro ao buscar perfil:', profileError);
          } else {
            setUserProfile(profile);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        setUserLoading(false);
      }
    };
    
    checkUser();
  }, [supabase]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?page=1&perPage=200', { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao buscar usuários');
      const authUsers = await res.json();

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          role,
          room_id,
          display_name,
          created_at,
          rooms(name)
        `);
      if (profilesError) throw profilesError;

      const usersWithProfiles = (authUsers?.users || []).map((authUser: any) => {
        const profile = profiles?.find((p: any) => p.user_id === authUser.id);
        // Extrair nome da sala com segurança independente do formato retornado (objeto ou array)
        let roomName: string | null = null;
        const embeddedRooms = (profile as any)?.rooms;
        if (Array.isArray(embeddedRooms)) {
          roomName = embeddedRooms[0]?.name ?? null;
        } else if (embeddedRooms && typeof embeddedRooms === 'object') {
          roomName = (embeddedRooms as any)?.name ?? null;
        }

        return {
          id: authUser.id,
          email: authUser.email || '',
          display_name: profile?.display_name || null,
          role: profile?.role || 'nurse',
          room_id: profile?.room_id || null,
          room_name: roomName,
          created_at: authUser.created_at
        };
      });

      setUsers(usersWithProfiles);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    }
  }, [supabase]);

  const loadData = useCallback(async () => {
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
      } else if (activeTab === 'users') {
        // Carregar salas também para o formulário de usuário
        const [usersResult, roomsResult] = await Promise.all([
          loadUsers(),
          supabase.from('rooms').select('*').order('name')
        ]);
        if (roomsResult.error) throw roomsResult.error;
        setRooms(roomsResult.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [activeTab, supabase, loadUsers]);

  useEffect(() => {
    if (!userLoading && user) {
      loadData();
    }
  }, [loadData, userLoading, user]);

  const handleSave = async (item: any, isNew: boolean = false) => {
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'users') {
        if (isNew) {
          await handleSaveUser(item, true);
          // Mostrar notificação de sucesso
          alert('Usuário criado com sucesso!');
        } else {
          await handleSaveUser(item, false);
          // Mostrar notificação de sucesso
          alert('Usuário atualizado com sucesso!');
        }
      } else {
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
      }
      
      setEditingId(null);
      setShowAddForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'users') {
        await handleDeleteUser(id as string);
      } else {
        const { error } = await supabase
          .from(activeTab)
          .delete()
          .eq('id', id);
        if (error) throw error;
      }
      
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (userData: any, isNew: boolean) => {
    try {
      if (isNew) {
        // Criar usuário no auth
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            email_confirm: true
          })
        });
        if (!res.ok) throw new Error('Falha ao criar usuário');
        const authData = await res.json();

        // Criar perfil do usuário
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            display_name: userData.display_name,
            role: userData.role,
            room_id: userData.room_id || null
          });
        if (profileError) throw profileError;
      } else {
        // Atualizar apenas o perfil (não podemos alterar email no auth facilmente)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            display_name: userData.display_name,
            role: userData.role,
            room_id: userData.room_id || null
          })
          .eq('user_id', userData.id);
        if (profileError) throw profileError;
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Excluir perfil primeiro
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      if (profileError) throw profileError;

      // Excluir usuário do auth
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Falha ao excluir usuário');
    } catch (err) {
      throw err;
    }
  };

  // Tela de carregamento enquanto verifica usuário
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Verificando autenticação...</p>
          </div>
        </div>
      </div>
    );
  }

  // Verificar se usuário está autenticado
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-200">
          <div className="text-center space-y-4">
            <div className="text-red-600 text-6xl">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900">Acesso Negado</h2>
            <p className="text-gray-600">Você precisa estar logado para acessar esta página.</p>
            <button 
              onClick={() => window.location.href = '/signin'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Fazer Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verificar se usuário tem role de admin
  if (userProfile && userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-200">
          <div className="text-center space-y-4">
            <div className="text-red-600 text-6xl">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900">Acesso Restrito</h2>
            <p className="text-gray-600">Apenas administradores podem acessar esta página.</p>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  const renderUsersTable = () => {
    const filteredUsers = users.filter(user => {
      const matchesSearch = userSearchTerm === '' || 
        user.display_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchTerm.toLowerCase());
      const matchesRole = userRoleFilter === '' || user.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });

    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gerenciar Usuários</h2>
              <p className="text-gray-600 text-sm mt-1">Configure os usuários do sistema</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
            >
              <Plus size={18} />
              Novo Usuário
            </button>
          </div>
          
          {/* Filtros */}
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div className="w-48">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="input-field w-full"
              >
                <option value="">Todos os roles</option>
                <option value="admin">Admin</option>
                <option value="nurse">Enfermeiro</option>
                <option value="pharmacy">Farmácia</option>
                <option value="auditor">Auditor</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sala</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <UserRow
                   key={user.id}
                   user={user}
                   rooms={rooms}
                   isEditing={editingId === user.id}
                   onEdit={() => setEditingId(user.id)}
                   onSave={handleSave}
                   onCancel={() => setEditingId(null)}
                   onDelete={() => handleDeleteUser(user.id)}
                   loading={loading}
                 />
              ))}
            </tbody>
          </table>
        </div>
        
        {showAddForm && (
          <div className="p-8 border-t border-gray-200 bg-gray-50">
            <AddUserForm
               rooms={rooms}
               onSave={handleSave}
               onCancel={() => setShowAddForm(false)}
               loading={loading}
             />
          </div>
        )}
      </div>
    );
  };

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
                <div className="text-2xl font-bold">
                  {activeTab === 'rooms' ? rooms.length : 
                   activeTab === 'meds' ? meds.length : 
                   activeTab === 'kits' ? kits.length : 
                   users.length}
                </div>
                <div className="text-sm opacity-90">
                  {activeTab === 'rooms' ? 'Salas' : 
                   activeTab === 'meds' ? 'Medicamentos' : 
                   activeTab === 'kits' ? 'Kits' : 
                   'Usuários'}
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
            {(['rooms', 'meds', 'kits', 'users'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setEditingId(null);
                  setShowAddForm(false);
                }}
                className={`flex-1 py-4 px-6 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab === 'rooms' && <Building size={18} />}
                {tab === 'meds' && <Pill size={18} />}
                {tab === 'kits' && <Package size={18} />}
                {tab === 'users' && <Users size={18} />}
                {tab === 'rooms' ? 'Salas' : 
                 tab === 'meds' ? 'Medicamentos' : 
                 tab === 'kits' ? 'Kits' : 
                 'Usuários'}
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
            {activeTab === 'users' && renderUsersTable()}
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
              onClick={async () => {
                await onSave(editData);
                onCancel(); // Fechar modo de edição após salvar
              }}
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
              className="input-field w-full"
              placeholder="Ex: KIT_EMERGENCIA, KIT_CIRURGICO"
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

function UserRow({ user, rooms, isEditing, onEdit, onSave, onCancel, onDelete, loading }: any) {
  const [editData, setEditData] = useState(user);
  
  if (isEditing) {
    return (
      <tr className="bg-blue-50 border-l-4 border-blue-500">
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.display_name || ''}
            onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
            className="input-field w-full"
            placeholder="Nome de exibição"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="email"
            value={editData.email}
            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
            className="input-field w-full"
            placeholder="Email"
            disabled
          />
        </td>
        <td className="px-6 py-4">
          <select
            value={editData.role}
            onChange={(e) => setEditData({ ...editData, role: e.target.value })}
            className="input-field"
          >
            <option value="nurse">Enfermeiro</option>
            <option value="pharmacy">Farmácia</option>
            <option value="admin">Admin</option>
            <option value="auditor">Auditor</option>
          </select>
        </td>
        <td className="px-6 py-4">
          <select
            value={editData.room_id || ''}
            onChange={(e) => setEditData({ ...editData, room_id: e.target.value ? parseInt(e.target.value) : null })}
            className="input-field"
          >
            <option value="">Nenhuma sala</option>
            {rooms.map((room: any) => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
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
      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{user.display_name || 'Sem nome'}</td>
      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
      <td className="px-6 py-4">
        <span className={`status-badge ${
          user.role === 'admin' ? 'status-warning' :
          user.role === 'pharmacy' ? 'status-active' :
          user.role === 'auditor' ? 'status-neutral' :
          'status-inactive'
        }`}>
          {user.role === 'admin' ? 'Admin' :
           user.role === 'pharmacy' ? 'Farmácia' :
           user.role === 'auditor' ? 'Auditor' :
           'Enfermeiro'}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">{user.room_name || 'Nenhuma'}</td>
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
            onClick={async () => {
              const newPassword = prompt('Digite a nova senha para este usuário:');
              if (!newPassword) return;
              if (newPassword.length < 6) { alert('A senha deve ter pelo menos 6 caracteres.'); return; }
              try {
                const res = await fetch('/api/admin/users', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id, password: newPassword })
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error || 'Falha ao atualizar senha');
                }
                alert('Senha atualizada com sucesso.');
              } catch (err: any) {
                alert('Erro ao atualizar senha: ' + (err?.message || 'Erro desconhecido'));
              }
            }}
            disabled={loading}
            className="btn-secondary p-2"
            title="Resetar senha"
          >
            <Settings size={16} />
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

function AddUserForm({ rooms, onSave, onCancel, loading }: any) {
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    display_name: string;
    role: string;
    room_id: number | null;
  }>({ 
    email: '', 
    password: '', 
    display_name: '', 
    role: 'nurse', 
    room_id: null 
  });

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
          <h3 className="text-lg font-bold text-gray-900">Adicionar Novo Usuário</h3>
          <p className="text-sm text-gray-600">Configure um novo usuário no sistema</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field w-full"
              placeholder="usuario@exemplo.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-field w-full"
              placeholder="Senha temporária"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome de Exibição</label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="input-field w-full"
              placeholder="Nome completo"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input-field w-full"
            >
              <option value="nurse">Enfermeiro</option>
              <option value="pharmacy">Farmácia</option>
              <option value="admin">Admin</option>
              <option value="auditor">Auditor</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Sala</label>
          <select
            value={formData.room_id || ''}
            onChange={(e) => setFormData({ ...formData, room_id: e.target.value ? parseInt(e.target.value) : null })}
            className="input-field"
          >
            <option value="">Nenhuma sala</option>
            {rooms.map((room: any) => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Usuário'}
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