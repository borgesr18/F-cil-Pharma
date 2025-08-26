'use client';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { Database, Priority } from '@/lib/supabase/types';
import { Plus, Minus, Package, AlertTriangle, Clock, Send, Trash2, Stethoscope } from 'lucide-react';

const supabase = createClient();

export default function SalaPage() {
  const [kits, setKits] = useState<Database['public']['Tables']['kits']['Row'][]>([]);
  const [meds, setMeds] = useState<Database['public']['Tables']['meds']['Row'][]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [kitKey, setKitKey] = useState<string | null>(null);
  const [items, setItems] = useState<{med_id:number; qty:number; unit:string}[]>([]);

  useEffect(() => {
    (async () => {
      const me = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('room_id').eq('user_id', me.data.user?.id!).single();
      setRoomId(profile?.room_id ?? null);
      const { data: k } = await supabase.from('kits').select('*').eq('active', true);
      setKits(k ?? []);
      const { data: m } = await supabase.from('meds').select('*').eq('active', true).order('name');
      setMeds(m ?? []);
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

  async function submitOrder() {
    if (!roomId) return alert('Perfil sem sala vinculada.');
    const { data: order, error } = await supabase.from('orders').insert({ room_id: roomId, priority, kit_key: kitKey, notes }).select('*').single();
    if (error) return alert(error.message);
    if (items.length) {
      const payload = items.map(it => ({ ...it, order_id: order.id }));
      const { error: e2 } = await supabase.from('order_items').insert(payload);
      if (e2) return alert(e2.message);
    }
    setNotes(''); setItems([]); setKitKey(null); setPriority('normal');
    alert('Pedido enviado!');
  }

  function addItem(med_id: number) {
    const med = meds.find(m => m.id === med_id)!;
    setItems(prev => [...prev, { med_id, qty: 1, unit: med.unit }]);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Stethoscope size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Novo Pedido da Sala</h1>
              <p className="text-gray-600">Solicite medicamentos e kits para sua sala</p>
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
                    <div className="text-xs text-gray-500 font-mono">{k.key}</div>
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
            className="btn-primary w-full py-4 text-lg font-semibold flex items-center justify-center gap-3 hover:scale-105 transition-transform"
          >
            <Send size={20} />
            Enviar Pedido
          </button>
        </div>
      </div>
    </div>
  );
}
