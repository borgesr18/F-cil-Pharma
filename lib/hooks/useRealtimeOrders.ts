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
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id, med_id, qty, unit, high_alert,
            meds(name)
          ),
          high_alert_checks(
            id, checker_id, checked_at, notes,
            profiles(display_name)
          ),
          profiles(display_name)
        `)
        .in('status', statusFilter)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      
      const previousCount = orders.length;
      const newCount = data?.length || 0;
      
      setOrders(data || []);
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

  // Configurar realtime
  const setupRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

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
        }
      });
  }, [loadOrders, enableFallback, supabase]);

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

  // Forçar refresh manual
  const refresh = useCallback(() => {
    loadOrders();
  }, [loadOrders]);

  // Reconectar realtime
  const reconnect = useCallback(() => {
    setupRealtime();
  }, [setupRealtime]);

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
  }, []);

  // Atualizar quando filtros mudarem
  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  return {
    orders,
    loading,
    error,
    connectionStatus,
    refresh,
    reconnect,
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