'use client';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Database, Priority } from '@/lib/supabase/types';
import { Plus, Minus, Package, AlertTriangle, Clock, Send, Trash2, Stethoscope, MapPin, User, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const supabase = createClient();

type Room = {
  id: number;
  name: string;
  created_at: string;
};

export default function SalaPage() {
  const [kits, setKits] = useState<Database['public']['Tables']['kits']['Row'][]>([]);
  const [meds, setMeds] = useState<Database['public']['Tables']['meds']['Row'][]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [kitKey, setKitKey] = useState<string | null>(null);
  const [items, setItems] = useState<{med_id:number; qty:number; unit:string}[]>([]);
  const [showRoomSelection, setShowRoomSelection] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setProfileLoading(true);
      const me = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('room_id, display_name').eq('user_id', me.data.user?.id!).single();
      
      if (profile?.room_id) {
        setRoomId(profile.room_id);
        setDisplayName(profile.display_name || '');
      } else {
        // Usuário não tem sala vinculada, mostrar seleção de sala
        setShowRoomSelection(true);
        // Carregar salas disponíveis
        const { data: rooms } = await supabase.rpc('get_active_rooms');
        setAvailableRooms(rooms || []);
      }
      
      const { data: k } = await supabase.from('kits').select('*').eq('active', true);
      setKits(k ?? []);
      const { data: m } = await supabase.from('meds').select('*').eq('active', true).order('name');
      setMeds(m ?? []);
      setProfileLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!kitKey) return;
      const { data: kit } = await supabase.from('kits').select('id').eq('key', kitKey).single();
      if (!kit) return;
      const { data } = await supabase.from('kit_items').select('med_id, qty, unit').eq('kit_id', kit.id);
      setItems((data ?? []).map(d => ({ med_id: d.med_id, qty: Number(d.qty), unit: d.unit })));
    })();
  }, [kitKey]);

  async function createProfile() {
    if (!selectedRoom || !displayName.trim()) {
      toast.error('Por favor, selecione uma sala e informe seu nome.');
      return;
    }

    if (displayName.trim().length < 2) {
      toast.error('O nome deve ter pelo menos 2 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_or_update_user_profile', {
        p_room_id: selectedRoom,
        p_display_name: displayName.trim(),
        p_role: 'nurse'
      });

      if (error) throw error;

      if (data.success) {
        setRoomId(selectedRoom);
        setShowRoomSelection(false);
        toast.success('Perfil criado com sucesso! Agora você pode fazer pedidos.');
      } else {
        toast.error(data.error || 'Erro ao criar perfil.');
      }
    } catch (error: any) {
      console.error('Erro ao criar perfil:', error);
      toast.error('Erro ao criar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function submitOrder() {
    if (!roomId) {
      toast.error('Perfil sem sala vinculada.');
      return;
    }

    if (!kitKey && items.length === 0) {
      toast.error('Selecione pelo menos um kit ou adicione medicamentos ao pedido.');
      return;
    }

    setLoading(true);
    try {
      const { data: order, error } = await supabase.from('orders').insert({ 
        room_id: roomId, 
        priority, 
        kit_key: kitKey, 
        notes: notes.trim() || null 
      }).select('*').single();
      
      if (error) throw error;
      
      if (items.length) {
        const payload = items.map(it => ({ ...it, order_id: order.id }));
        const { error: e2 } = await supabase.from('order_items').insert(payload);
        if (e2) throw e2;
      }
      
      // Limpar formulário
      setNotes('');
      setItems([]);
      setKitKey(null);
      setPriority('normal');
      
      toast.success('Pedido enviado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao enviar pedido:', error);
      toast.error('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function addItem(med_id: number) {
    const med = meds.find(m => m.id === med_id)!;
    setItems(prev => [...prev, { med_id, qty: 1, unit: med.unit }]);
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Carregando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Modal de Seleção de Sala */}
        {showRoomSelection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-6 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Selecione sua Sala</h2>
                    <p className="text-blue-100 text-sm">Configure seu perfil para continuar</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     <User className="w-4 h-4 inline mr-1" />
                     Seu Nome
                   </label>
                   <input
                     type="text"
                     value={displayName}
                     onChange={(e) => setDisplayName(e.target.value)}
                     placeholder="Digite seu nome"
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                       displayName.trim().length > 0 && displayName.trim().length < 2
                         ? 'border-red-300 bg-red-50'
                         : 'border-gray-300'
                     }`}
                   />
                   {displayName.trim().length > 0 && displayName.trim().length < 2 && (
                     <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                       <AlertCircle className="w-3 h-3" />
                       Nome deve ter pelo menos 2 caracteres
                     </p>
                   )}
                 </div>
                
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     <MapPin className="w-4 h-4 inline mr-1" />
                     Sala
                   </label>
                   {availableRooms.length === 0 ? (
                     <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
                       <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                       <p className="text-gray-600 text-sm">Nenhuma sala disponível</p>
                     </div>
                   ) : (
                     <div className="space-y-2 max-h-48 overflow-y-auto">
                       {availableRooms.map((room) => (
                         <div
                           key={room.id}
                           onClick={() => setSelectedRoom(room.id)}
                           className={`p-3 border rounded-lg cursor-pointer transition-all ${
                             selectedRoom === room.id
                               ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                               : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                           }`}
                         >
                           <div className="flex items-center justify-between">
                             <span className="font-medium text-gray-900">{room.name}</span>
                             {selectedRoom === room.id && (
                               <CheckCircle className="w-5 h-5 text-blue-600" />
                             )}
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={createProfile}
                    disabled={loading || !selectedRoom || !displayName.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {loading ? 'Criando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-green-600 p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Sala de Enfermagem</h1>
                <p className="text-blue-100">Solicite medicamentos e kits para sua sala</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Novo Pedido</h2>
                  <p className="text-gray-600 text-sm">Selecione os itens necessários para sua sala</p>
                </div>
              </div>
            </div>

        {/* Kits Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package size={20} className="text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Kits Disponíveis</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {kits.map(k => (
              <button 
                key={k.key} 
                onClick={() => setKitKey(k.key)} 
                className={`card p-4 text-left transition-all duration-200 hover:scale-105 ${
                  kitKey === k.key 
                    ? 'ring-2 ring-purple-500 bg-purple-50 border-purple-200' 
                    : 'hover:border-purple-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    kitKey === k.key ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <Package size={16} className={kitKey === k.key ? 'text-purple-600' : 'text-gray-600'} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{k.name}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Priority Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-orange-600" />
            <h2 className="text-lg font-bold text-gray-900">Prioridade do Pedido</h2>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="radio" 
                checked={priority === 'normal'} 
                onChange={() => setPriority('normal')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                <span className="font-medium text-gray-700">Normal</span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="radio" 
                checked={priority === 'urgente'} 
                onChange={() => setPriority('urgente')}
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" />
                <span className="font-medium text-gray-700">Urgente</span>
              </div>
            </label>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Observações</h2>
          <textarea 
            className="input-field w-full h-24 resize-none" 
            placeholder="Observações adicionais (ex.: dose de heparina do dia, instruções especiais...)" 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
          />
        </div>

        {/* Extra Items Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={20} className="text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">Medicamentos Extras</h2>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Adicionar Medicamentos</h3>
            <div className="flex flex-wrap gap-2">
              {meds.map(m => (
                <button 
                  key={m.id} 
                  onClick={() => addItem(m.id)} 
                  className="btn-secondary text-sm py-2 px-3 hover:scale-105 transition-transform"
                >
                  <Plus size={14} className="mr-1" />
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Itens Selecionados</h3>
              <div className="space-y-3">
                {items.map((it, idx) => {
                  const med = meds.find(m => m.id === it.med_id);
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{med?.name}</div>
                        {med?.high_alert && (
                          <div className="text-xs text-red-600 font-medium">⚠️ MAV</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min={0} 
                          step={0.5} 
                          value={it.qty} 
                          onChange={e => {
                            const v = Number(e.target.value);
                            setItems(prev => prev.map((p, i) => i === idx ? { ...p, qty: v } : p));
                          }} 
                          className="input-field w-20 text-center"
                        />
                        <input 
                          value={it.unit} 
                          onChange={e => {
                            const v = e.target.value;
                            setItems(prev => prev.map((p, i) => i === idx ? { ...p, unit: v } : p));
                          }} 
                          className="input-field w-16 text-center"
                        />
                        <button 
                          onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} 
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

            {/* Submit Button */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <button 
                 onClick={submitOrder}
                 disabled={loading || (!kitKey && items.length === 0)}
                 className="btn-primary w-full py-4 text-lg font-semibold flex items-center justify-center gap-3 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
               >
                 {loading ? (
                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                 ) : (
                   <Send size={20} />
                 )}
                 {loading ? 'Enviando...' : 'Enviar Pedido'}
               </button>
               {!kitKey && items.length === 0 && (
                 <p className="text-amber-600 text-sm mt-2 flex items-center gap-1 justify-center">
                   <AlertTriangle className="w-4 h-4" />
                   Selecione um kit ou adicione medicamentos
                 </p>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
