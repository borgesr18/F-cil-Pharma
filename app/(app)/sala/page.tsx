'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import type { Database, Priority } from '@/lib/supabase/types';

const supabase = createClientComponentClient<Database>();

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
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Novo pedido da Sala</h1>

      <div className="grid sm:grid-cols-3 gap-2">
        {kits.map(k => (
          <button key={k.key} onClick={() => setKitKey(k.key)} className={`border rounded p-3 text-left ${kitKey===k.key?'ring-2':''}`}>
            <div className="font-medium">{k.name}</div>
            <div className="text-xs opacity-70">{k.key}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <label className="flex items-center gap-2"><input type="radio" checked={priority==='normal'} onChange={()=>setPriority('normal')} /> Normal</label>
        <label className="flex items-center gap-2"><input type="radio" checked={priority==='urgente'} onChange={()=>setPriority('urgente')} /> Urgente</label>
      </div>

      <textarea className="w-full border rounded p-2" placeholder="Observações (ex.: dose de heparina do dia)" value={notes} onChange={e=>setNotes(e.target.value)} />

      <div className="space-y-2">
        <div className="font-medium">Itens extras</div>
        <div className="flex flex-wrap gap-2">
          {meds.map(m => (
            <button key={m.id} onClick={()=>addItem(m.id)} className="border rounded px-2 py-1 text-sm">+ {m.name}</button>
          ))}
        </div>
        <div className="space-y-1">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-48 truncate">{meds.find(m=>m.id===it.med_id)?.name}</span>
              <input type="number" min={0} step={0.5} value={it.qty} onChange={e=>{
                const v=Number(e.target.value); setItems(prev=>prev.map((p,i)=> i===idx?{...p,qty:v}:p));
              }} className="w-24 border rounded p-1"/>
              <input value={it.unit} onChange={e=>{const v=e.target.value; setItems(prev=>prev.map((p,i)=> i===idx?{...p,unit:v}:p));}} className="w-20 border rounded p-1"/>
              <button onClick={()=>setItems(prev=>prev.filter((_,i)=>i!==idx))} className="text-red-600 text-sm">remover</button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={submitOrder} className="rounded bg-black text-white px-4 py-2">Enviar pedido</button>
    </div>
  );
}
