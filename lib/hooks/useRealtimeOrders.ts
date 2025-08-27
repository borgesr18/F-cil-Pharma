'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OrderStatus } from '@/lib/supabase/types';

type OrderWithItems = {
  id: number;
  status: OrderStatus;
  priority: string;
  room_id: number;
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  notes: string | null;
  order_items?: Array<{
    id: number;
    med_id: number;
    qty: number;
    unit: string;
    high_alert: boolean;
    meds?: { name: string; };
  }>;
  high_alert_checks?: Array<{
    id: number;
    checker_id: string;
    checked_at: string;
    notes: string | null;
    profiles?: { display_name: string | null; };
  }>;
  profiles?: { display_name: string | null; };
};

interface UseRealtimeOrdersOptions {
  statusFilter?: OrderStatus[];
  pollingInterval?: number; // em ms, padrão 30s
  enableFallback?: boolean;
}

export function useRealtimeOrders(options: UseRealtimeOrdersOptions = {}) {
  const {
    statusFilter = ['submitted', 'picking', 'checking', 'ready', 'delivered'],
    pollingInterval = 30000,
    enableFallback = true
  } = options;

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'fallback'>('disconnected');
  
  const supabase = createClient();
  const channelRef = useRef<any>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Função para carregar pedidos
  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const { data: rawOrders, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id, med_id, qty, unit, high_alert,
            meds(name)
          ),
          high_alert_checks(
            id, checker_id, checked_at, notes
          )
        `)
        .in('status', statusFilter)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const userIds = new Set<string>();
      (rawOrders || []).forEach((order: any) => {
        if (order.assigned_to) userIds.add(order.assigned_to);
        (order.high_alert_checks || []).forEach((check: any) => {
          if (check.checker_id) userIds.add(check.checker_id);
        });
      });

      let profileMap = new Map<string, string | null>();
      if (userIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', Array.from(userIds));
        if (profilesError) throw profilesError;
        (profilesData || []).forEach((p: any) => {
          profileMap.set(p.user_id, p.display_name);
        });
      }

      const enrichedOrders: OrderWithItems[] = (rawOrders || []).map((order: any) => {
        const enrichedChecks = (order.high_alert_checks || []).map((check: any) => ({
          ...check,
          profiles: { display_name: profileMap.get(check.checker_id) ?? null }
        }));
        const assignedProfile = order.assigned_to
          ? { display_name: profileMap.get(order.assigned_to) ?? null }
          : undefined;
        return { ...order, high_alert_checks: enrichedChecks, profiles: assignedProfile } as OrderWithItems;
      });

      const previousCount = orders.length;
      const newCount = enrichedOrders.length;

      setOrders(enrichedOrders);
      lastFetchRef.current = Date.now();
      
      // Tocar som se houver novos pedidos
      if (newCount > previousCount && previousCount > 0) {
        audioRef.current?.play().catch(() => {});
      }
      
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, orders.length, supabase]);

  // Configurar polling como fallback
  const setupPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    setConnectionStatus('fallback');
    pollingRef.current = setInterval(() => {
      // Só fazer polling se não houver atividade recente do realtime
      const timeSinceLastFetch = Date.now() - lastFetchRef.current;
      if (timeSinceLastFetch > pollingInterval / 2) {
        loadOrders();
      }
    }, pollingInterval);
  }, [loadOrders, pollingInterval]);

  // Configurar realtime
  const setupRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Garantir conexão do cliente realtime e tentar reconectar proativamente
    try {
      const realtimeClient: any = (supabase as any).realtime;
      if (realtimeClient && typeof realtimeClient.connect === 'function') {
        realtimeClient.connect();
      }
    } catch {}

    channelRef.current = supabase
      .channel('orders_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Realtime event:', payload.eventType);
          loadOrders();
          
          // Tocar som para novos pedidos
          if (payload.eventType === 'INSERT') {
            audioRef.current?.play().catch(() => {});
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => loadOrders()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'high_alert_checks' },
        () => loadOrders()
      )
      .subscribe((status) => {
        console.log('Realtime status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          // Parar polling se realtime estiver funcionando
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
          // Iniciar fallback se habilitado
          if (enableFallback) {
            setupPolling();
          }
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
          if (enableFallback) {
            setupPolling();
          }
          // tentar re-assinar o canal após breve intervalo
          setTimeout(() => {
            if (!channelRef.current) return;
            setupRealtime();
          }, 1500);
        }
      });
  }, [loadOrders, enableFallback, supabase, setupPolling]);

  // Forçar refresh manual
  const refresh = useCallback(() => {
    loadOrders();
  }, [loadOrders]);

  // Reconectar realtime
  const reconnect = useCallback(() => {
    setupRealtime();
  }, [setupRealtime]);

  // Desbloquear áudio após primeira interação do usuário
  const primeAudio = useCallback(async () => {
    try {
      if (!audioRef.current) return;
      audioRef.current.muted = true;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.muted = false;
    } catch {}
  }, []);

  // Inicialização
  useEffect(() => {
    // Criar elemento de áudio
    audioRef.current = new Audio('/notify.wav');
    audioRef.current.preload = 'auto';
    
    // Carregar dados iniciais
    loadOrders();
    
    // Configurar realtime
    setupRealtime();

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadOrders, setupRealtime, supabase]);

  // Atualizar quando filtros mudarem
  useEffect(() => {
    loadOrders();
  }, [statusFilter, loadOrders]);

  return {
    orders,
    loading,
    error,
    connectionStatus,
    refresh,
    reconnect,
    primeAudio,
    // Estatísticas úteis
    stats: {
      total: orders.length,
      byStatus: statusFilter.reduce((acc, status) => {
        acc[status] = orders.filter(o => o.status === status).length;
        return acc;
      }, {} as Record<OrderStatus, number>),
      withMAV: orders.filter(o => 
        o.order_items?.some(item => item.high_alert)
      ).length,
      assigned: orders.filter(o => o.assigned_to).length
    }
  };
}