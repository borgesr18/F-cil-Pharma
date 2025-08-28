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
    console.log('📥 [DEBUG] Carregando pedidos com filtro:', statusFilter);
    
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
        
      console.log('📊 [DEBUG] Resultado da busca:', { rawOrders: rawOrders?.length || 0, fetchError });

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

      console.log('📈 [DEBUG] Contagem de pedidos:', { previousCount, newCount, enrichedOrders: enrichedOrders.length });

      setOrders(sortOrdersByCreatedAt(enrichedOrders));
      lastFetchRef.current = Date.now();
      previousCountRef.current = newCount;
      
      // Tocar som se houver novos pedidos (inclui o primeiro)
      if (newCount > previousCount) {
        console.log('🔊 [DEBUG] Novos pedidos detectados, reproduzindo áudio...');
        if (audioRef.current) {
          audioRef.current.play().catch((error) => {
            console.error('❌ [DEBUG] Erro ao reproduzir áudio no loadOrders:', error);
          });
        } else {
          console.warn('⚠️ [DEBUG] Elemento de áudio não encontrado no loadOrders!');
        }
      } else {
        console.log('📊 [DEBUG] Nenhum novo pedido detectado');
      }
      
    } catch (err) {
      console.error('❌ [DEBUG] Erro ao carregar pedidos:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      console.log('✅ [DEBUG] Carregamento de pedidos finalizado');
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
    console.log('🔄 [DEBUG] Configurando realtime...');
    
    if (channelRef.current) {
      console.log('🗑️ [DEBUG] Removendo canal anterior');
      supabaseRef.current.removeChannel(channelRef.current);
    }

    // Garantir conexão do cliente realtime e tentar reconectar proativamente
    try {
      const realtimeClient: any = (supabaseRef.current as any).realtime;
      if (realtimeClient && typeof realtimeClient.connect === 'function') {
        console.log('🔌 [DEBUG] Conectando cliente realtime...');
        realtimeClient.connect();
      } else {
        console.warn('⚠️ [DEBUG] Cliente realtime não disponível');
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao conectar realtime:', error);
    }

    console.log('📡 [DEBUG] Criando canal realtime: orders_realtime');
    
    channelRef.current = supabaseRef.current
      .channel('orders_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        async (payload: any) => {
          console.log('📨 [DEBUG] Evento recebido na tabela orders:', payload);
          
          try {
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            const newRow = payload.new as { id: number; status: OrderStatus; created_at: string } | null;
            const oldRow = payload.old as { id: number; status: OrderStatus } | null;

            console.log(`🔍 [DEBUG] Processando evento ${eventType}:`, { newRow, oldRow, statusFilter });
            
            // Emitir evento de debug personalizado
            window.dispatchEvent(new CustomEvent('realtime-debug', {
              detail: {
                type: `postgres_${eventType.toLowerCase()}`,
                data: { table: 'orders', newRow, oldRow, statusFilter }
              }
            }));

            if (eventType === 'INSERT' && newRow) {
              console.log(`➕ [DEBUG] Novo pedido inserido - ID: ${newRow.id}, Status: ${newRow.status}`);
              
              // Emitir evento específico de novo pedido
              window.dispatchEvent(new CustomEvent('realtime-debug', {
                detail: {
                  type: 'new_order_detected',
                  data: { orderId: newRow.id, status: newRow.status, inFilter: statusFilter.includes(newRow.status) }
                }
              }));
              
              if (statusFilter.includes(newRow.status)) {
                console.log('✅ [DEBUG] Status do pedido está no filtro, buscando dados completos...');
                
                const enriched = await fetchAndEnrichOrderById(newRow.id);
                if (enriched) {
                  console.log('📦 [DEBUG] Pedido enriquecido com sucesso:', enriched);
                  upsertOrderLocally(enriched);
                  
                  // Emitir evento de pedido adicionado
                  window.dispatchEvent(new CustomEvent('realtime-debug', {
                    detail: {
                      type: 'order_added_to_list',
                      data: { orderId: enriched.id, status: enriched.status }
                    }
                  }));
                  
                  console.log('🔊 [DEBUG] Tentando reproduzir áudio...');
                  if (audioRef.current) {
                    console.log('🎵 [DEBUG] Elemento de áudio encontrado, reproduzindo...');
                    console.log('🔊 [DEBUG] Estado do áudio:', {
                      readyState: audioRef.current.readyState,
                      paused: audioRef.current.paused,
                      src: audioRef.current.src,
                      volume: audioRef.current.volume
                    });
                    
                    // Emitir evento de tentativa de áudio
                    window.dispatchEvent(new CustomEvent('realtime-debug', {
                      detail: {
                        type: 'audio_play_attempt',
                        data: { orderId: enriched.id }
                      }
                    }));
                    
                    audioRef.current.currentTime = 0;
                    audioRef.current.play().then(() => {
                      console.log('✅ [DEBUG] Som reproduzido com sucesso!');
                      // Emitir evento de sucesso do áudio
                      window.dispatchEvent(new CustomEvent('realtime-debug', {
                        detail: {
                          type: 'audio_play_success',
                          data: { orderId: enriched.id }
                        }
                      }));
                    }).catch((error) => {
                      console.error('❌ [DEBUG] Erro ao reproduzir áudio:', {
                        error: error.message,
                        name: error.name,
                        audioState: {
                          readyState: audioRef.current?.readyState,
                          networkState: audioRef.current?.networkState,
                          error: audioRef.current?.error
                        }
                      });
                      // Emitir evento de erro do áudio
                      window.dispatchEvent(new CustomEvent('realtime-debug', {
                        detail: {
                          type: 'audio_play_error',
                          data: { orderId: enriched.id, error: error.message }
                        }
                      }));
                    });
                  } else {
                    console.error('❌ [DEBUG] audioRef.current é null!');
                    // Emitir evento de áudio não encontrado
                    window.dispatchEvent(new CustomEvent('realtime-debug', {
                      detail: {
                        type: 'audio_element_missing',
                        data: { orderId: enriched.id }
                      }
                    }));
                  }
                } else {
                  console.warn('⚠️ [DEBUG] Falha ao enriquecer pedido, recarregando lista completa...');
                  // Emitir evento de falha no enriquecimento
                  window.dispatchEvent(new CustomEvent('realtime-debug', {
                    detail: {
                      type: 'order_enrich_failed',
                      data: { orderId: newRow.id }
                    }
                  }));
                  loadOrders();
                }
              } else {
                console.log(`🚫 [DEBUG] Status '${newRow.status}' não está no filtro:`, statusFilter);
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
        console.log('🔗 [DEBUG] Status da conexão realtime:', {
          status,
          timestamp: new Date().toISOString(),
          channelName: 'orders_realtime'
        });
        
        // Emitir evento de debug para status da conexão
        window.dispatchEvent(new CustomEvent('realtime-debug', {
          detail: {
            type: 'connection_status_change',
            data: { status, timestamp: new Date().toISOString() }
          }
        }));
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [DEBUG] Realtime conectado com sucesso!');
          setConnectionStatus('connected');
          
          // Emitir evento de conexão bem-sucedida
          window.dispatchEvent(new CustomEvent('realtime-debug', {
            detail: {
              type: 'realtime_connected',
              data: { timestamp: new Date().toISOString() }
            }
          }));
          
          // Parar polling se realtime estiver funcionando
          if (pollingRef.current) {
            console.log('⏹️ [DEBUG] Parando polling (realtime ativo)');
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ [DEBUG] Erro na conexão realtime:', status);
          setConnectionStatus('disconnected');
          
          // Emitir evento de erro de conexão
          window.dispatchEvent(new CustomEvent('realtime-debug', {
            detail: {
              type: 'realtime_connection_error',
              data: { status, timestamp: new Date().toISOString() }
            }
          }));
          
          // Iniciar fallback se habilitado
          if (enableFallback) {
            console.log('🔄 [DEBUG] Iniciando polling como fallback...');
            setupPolling();
          }
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [DEBUG] Conexão realtime fechada');
          setConnectionStatus('disconnected');
          
          // Emitir evento de conexão fechada
          window.dispatchEvent(new CustomEvent('realtime-debug', {
            detail: {
              type: 'realtime_connection_closed',
              data: { timestamp: new Date().toISOString() }
            }
          }));
          
          if (enableFallback) {
            console.log('🔄 [DEBUG] Iniciando polling como fallback...');
            setupPolling();
          }
          // tentar re-assinar o canal após breve intervalo
          setTimeout(() => {
            if (!channelRef.current) return;
            console.log('🔄 [DEBUG] Tentando reconectar realtime...');
            setupRealtime();
          }, 1500);
        }
      });  }, [loadOrders, enableFallback, setupPolling, fetchAndEnrichOrderById, removeOrderLocally, statusFilter, upsertOrderLocally]);

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
    console.log('🚀 [DEBUG] Inicializando useRealtimeOrders...');
    
    // Criar elemento de áudio para notify.wav
    console.log('🔊 [DEBUG] Criando elemento de áudio...');
    const audio = new Audio('/notify.wav');
    audio.preload = 'auto';
    audio.volume = 0.7;
    
    // Adicionar listeners para debug
    audio.addEventListener('loadstart', () => {
      console.log('🔊 [DEBUG] Áudio: loadstart');
    });
    audio.addEventListener('loadeddata', () => {
      console.log('🔊 [DEBUG] Áudio: loadeddata');
    });
    audio.addEventListener('canplay', () => {
      console.log('🔊 [DEBUG] Áudio: canplay');
    });
    audio.addEventListener('error', (e) => {
      console.error('🔊 [DEBUG] Áudio: erro ao carregar', e);
    });
    
    audioRef.current = audio;
    console.log('🔊 [DEBUG] Elemento de áudio criado:', {
      src: audio.src,
      volume: audio.volume,
      preload: audio.preload
    });
    
    // Carregar dados iniciais
    console.log('📊 [DEBUG] Carregando dados iniciais...');
    loadOrders();
    
    // Configurar realtime
    console.log('📡 [DEBUG] Configurando realtime...');
    setupRealtime();

    // Capturar referência do supabase para cleanup
    const supabase = supabaseRef.current;

    // Cleanup
    return () => {
      console.log('🧹 [DEBUG] Limpando useRealtimeOrders...');
      if (channelRef.current) {
        console.log('📡 [DEBUG] Desconectando canal realtime...');
        supabase.removeChannel(channelRef.current);
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