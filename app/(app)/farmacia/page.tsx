'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useRef, useState } from 'react';
import type { Database, OrderStatus } from '@/lib/supabase/types';

const supabase = createClientComponentClient<Database>();
const ORDERED: OrderStatus[] = ['submitted','picking','checking','ready','delivered'];

export default function FarmaciaPage() {
  const [orders, setOrders] = useState<Database['public']['Tables']['orders']['Row'][]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function load() {
    const { data } = await supabase.from('orders').select('*').in('status', ORDERED).order('created_at', { ascending: true });
    setOrders(data ?? []);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase.channel('orders_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        load();
        if (payload.eventType === 'INSERT') audioRef.current?.play();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function advance(id:number, current:OrderStatus) {
    const flow: Record<OrderStatus, OrderStatus> = {
      draft:'submitted', submitted:'picking', picking:'checking', checking:'ready', ready:'delivered', delivered:'received', received:'received', cancelled:'cancelled'
    };
    const next = flow[current] ?? current;
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', id);
    if (error) alert(error.message);
  }

  return (
    <div className="space-y-4">
      <audio ref={audioRef} src="/notify.wav" preload="auto" />
      <h1 className="text-xl font-semibold">Fila da Farmácia</h1>
      <div className="grid md:grid-cols-3 gap-3">
        {ORDERED.map(st => (
          <div key={st} className="border rounded p-2">
            <div className="font-medium mb-2 uppercase text-xs">{st}</div>
            <div className="space-y-2">
              {orders.filter(o=>o.status===st).map(o => (
                <div key={o.id} className="border rounded p-2">
                  <div className="flex justify-between text-sm">
                    <span>#{o.id} · Sala {o.room_id}</span>
                    <span className={o.priority==='urgente'?'text-red-600 font-semibold':''}>{o.priority}</span>
                  </div>
                  {o.notes && <div className="text-xs mt-1 opacity-80">{o.notes}</div>}
                  <button onClick={()=>advance(o.id,o.status)} className="mt-2 text-xs rounded bg-black text-white px-2 py-1">avançar</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
