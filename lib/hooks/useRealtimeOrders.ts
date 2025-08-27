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
  pollingInterval?: number; // em ms, padrão 8s (fallback)
  enableFallback?: boolean;
}

export function useRealtimeOrders(options: UseRealtimeOrdersOptions = {}) {
  const {
    statusFilter = ['submitted', 'picking', 'checking', 'ready', 'delivered'],
    pollingInterval = 8000,
    enableFallback = true
  } = options;

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'fallback'>('disconnected');
  
  // Manter uma instância estável do cliente Supabase durante todo o ciclo de vida do hook
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<any>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousCountRef = useRef<number>(0);

  // Helper: ordenar pedidos por data de criação ascendente
  const sortOrdersByCreatedAt = useCallback((list: OrderWithItems[]) => {
    return [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, []);

  // Helper: buscar e enriquecer um único pedido por ID
  const fetchAndEnrichOrderById = useCallback(async (orderId: number): Promise<OrderWithItems | null> => {
    try {
      const { data: rawOrder, error: fetchError } = await supabaseRef.current
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
        .eq('id', orderId)
        .single();

      if (fetchError || !rawOrder) return null;

      const userIds = new Set<string>();
      if (rawOrder.assigned_to) userIds.add(rawOrder.assigned_to);
      (rawOrder.high_alert_checks || []).forEach((check: any) => {
        if (check.checker_id) userIds.add(check.checker_id);
      });

      let profileMap = new Map<string, string | null>();
      if (userIds.size > 0) {
        const { data: profilesData } = await supabaseRef.current
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', Array.from(userIds));
        (profilesData || []).forEach((p: any) => {
          profileMap.set(p.user_id, p.display_name);
        });
      }

      const enrichedChecks = (rawOrder.high_alert_checks || []).map((check: any) => ({
        ...check,
        profiles: { display_name: profileMap.get(check.checker_id) ?? null }
      }));
      const assignedProfile = rawOrder.assigned_to
        ? { display_name: profileMap.get(rawOrder.assigned_to) ?? null }
        : undefined;

      return { ...rawOrder, high_alert_checks: enrichedChecks, profiles: assignedProfile } as OrderWithItems;
    } catch {
      return null;
    }
  }, []);

  // Helper: inserir/atualizar pedido localmente
  const upsertOrderLocally = useCallback((incoming: OrderWithItems) => {
    setOrders(prev => {
      const exists = prev.some(o => o.id === incoming.id);
      const next = exists ? prev.map(o => (o.id === incoming.id ? { ...o, ...incoming } : o)) : [...prev, incoming];
      return sortOrdersByCreatedAt(next);
    });
  }, [sortOrdersByCreatedAt]);

  // Helper: remover pedido localmente
  const removeOrderLocally = useCallback((orderId: number) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  // Função para carregar pedidos
  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const { data: rawOrders, error: fetchError } = await supabaseRef.current
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
        const { data: profilesData, error: profilesError } = await supabaseRef.current
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

      const previousCount = previousCountRef.current;
      const newCount = enrichedOrders.length;

      setOrders(sortOrdersByCreatedAt(enrichedOrders));
      lastFetchRef.current = Date.now();
      previousCountRef.current = newCount;
      
      // Tocar som se houver novos pedidos (inclui o primeiro)
      if (newCount > previousCount) {
        audioRef.current?.play().catch(() => {});
      }
      
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortOrdersByCreatedAt]);

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
      supabaseRef.current.removeChannel(channelRef.current);
    }

    // Garantir conexão do cliente realtime e tentar reconectar proativamente
    try {
      const realtimeClient: any = (supabaseRef.current as any).realtime;
      if (realtimeClient && typeof realtimeClient.connect === 'function') {
        realtimeClient.connect();
      }
    } catch {}

    channelRef.current = supabaseRef.current
      .channel('orders_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        async (payload: any) => {
          try {
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            const newRow = payload.new as { id: number; status: OrderStatus; created_at: string } | null;
            const oldRow = payload.old as { id: number; status: OrderStatus } | null;

            if (eventType === 'INSERT' && newRow) {
              if (statusFilter.includes(newRow.status)) {
                const enriched = await fetchAndEnrichOrderById(newRow.id);
                if (enriched) {
                  upsertOrderLocally(enriched);
                  audioRef.current?.play().catch(() => {});
                } else {
                  loadOrders();
                }
              }
              return;
            }

            if (eventType === 'UPDATE' && newRow) {
              const wasVisible = oldRow ? statusFilter.includes((oldRow as any).status) : false;
              const isVisible = statusFilter.includes(newRow.status);
              if (!wasVisible && isVisible) {
                const enriched = await fetchAndEnrichOrderById(newRow.id);
                if (enriched) upsertOrderLocally(enriched); else loadOrders();
              } else if (wasVisible && !isVisible) {
                removeOrderLocally(newRow.id);
              } else if (isVisible) {
                const enriched = await fetchAndEnrichOrderById(newRow.id);
                if (enriched) upsertOrderLocally(enriched); else loadOrders();
              }
              return;
            }

            if (eventType === 'DELETE' && oldRow) {
              removeOrderLocally(oldRow.id);
              return;
            }
          } catch {
            loadOrders();
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        async (payload: any) => {
          const row = payload.new || payload.old;
          const orderId = row?.order_id as number | undefined;
          if (!orderId) return;
          const enriched = await fetchAndEnrichOrderById(orderId);
          if (enriched) upsertOrderLocally(enriched); else loadOrders();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'high_alert_checks' },
        async (payload: any) => {
          const row = payload.new || payload.old;
          const orderId = row?.order_id as number | undefined;
          if (!orderId) return;
          const enriched = await fetchAndEnrichOrderById(orderId);
          if (enriched) upsertOrderLocally(enriched); else loadOrders();
        }
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
  }, [loadOrders, enableFallback, setupPolling]);

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
        supabaseRef.current.removeChannel(channelRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadOrders, setupRealtime]);

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