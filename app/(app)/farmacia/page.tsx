'use client';
import { useState, useEffect } from 'react';
import { useOrderOperations } from '@/lib/hooks/useOrderOperations';
import { useOrderSLA } from '@/lib/hooks/useSLA';
import { useRealtimeOrders } from '@/lib/hooks/useRealtimeOrders';
import type { OrderStatus } from '@/lib/supabase/types';
import { AlertTriangle, Clock, User, CheckCircle2, Wifi, WifiOff, RotateCcw, Volume2 } from 'lucide-react';

const ORDERED: OrderStatus[] = ['submitted','picking','checking','ready','delivered'];

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    draft: 'Rascunho',
    submitted: 'Enviados',
    picking: 'Separando',
    checking: 'Em Análise',
    ready: 'Prontos',
    delivered: 'Entregues',
    received: 'Recebidos',
    cancelled: 'Cancelados'
  };
  return labels[status] || status;
}

export default function FarmaciaPage() {
  const [mavCheckNotes, setMavCheckNotes] = useState<Record<number, string>>({});
  const [showMAVModal, setShowMAVModal] = useState<number | null>(null);
  const { setOrderStatus, claimOrder, addMAVCheck, loading, error } = useOrderOperations();
  
  // Função para testar o som manualmente
  const testSound = () => {
    console.log('🔊 [DEBUG] Teste manual de som iniciado...');
    const audio = new Audio('/notify.wav');
    audio.play().catch((error) => {
      console.error('❌ [DEBUG] Erro no teste manual de som:', error);
      alert('Erro ao reproduzir som: ' + error.message);
    });
  };
  const { 
    orders, 
    loading: ordersLoading, 
    error: ordersError, 
    connectionStatus, 
    refresh, 
    reconnect,
    primeAudio,
    stats 
  } = useRealtimeOrders({ statusFilter: ORDERED });

  async function advance(id: number, current: OrderStatus) {
    const flow: Record<OrderStatus, OrderStatus> = {
      draft: 'submitted',
      submitted: 'picking',
      picking: 'checking', 
      checking: 'ready',
      ready: 'delivered',
      delivered: 'received',
      received: 'received',
      cancelled: 'cancelled'
    };
    const next = flow[current] ?? current;
    
    // Se ainda estiver em 'submitted' e não tiver responsável, primeiro tentar assumir
    if (current === 'submitted') {
      const order = orders.find(o => o.id === id);
      if (!order?.assigned_to) {
        const claim = await claimOrder(id);
        if (!claim.success) {
          alert(claim.error || 'Erro ao assumir pedido');
          return;
        }
        // Atualizar a lista após assumir para evitar transições inválidas
        await refresh();
        return;
      }
    }

    const result = await setOrderStatus(id, next, `Avanço automático: ${current} → ${next}`);
    
    if (!result.success) {
      if (result.error?.includes('Dupla checagem MAV pendente')) {
        setShowMAVModal(id);
      } else {
        alert(result.error || 'Erro ao avançar pedido');
      }
    } else {
      // Atualiza imediatamente a lista após avanço bem-sucedido
      await refresh();
    }
  }

  async function handleClaim(id: number) {
    const result = await claimOrder(id);
    if (!result.success) {
      alert(result.error || 'Erro ao assumir pedido');
    } else {
      await refresh();
    }
  }

  async function handleMAVCheck(orderId: number) {
    const notes = mavCheckNotes[orderId] || '';
    const result = await addMAVCheck(orderId, notes);
    
    if (result.success) {
      setMavCheckNotes(prev => ({ ...prev, [orderId]: '' }));
      setShowMAVModal(null);
      
      if (result.can_advance) {
        // Tentar avançar automaticamente após dupla checagem
        await setOrderStatus(orderId, 'ready', 'Avanço após dupla checagem MAV completa');
        // Garantir atualização imediata após avanço automático
        await refresh();
      }
    } else {
      alert(result.error || 'Erro ao registrar checagem MAV');
    }
  }

  function hasMAVItems(order: any): boolean {
    return order.order_items?.some((item: any) => item.high_alert) || false;
  }

  function getMAVCheckCount(order: any): number {
    return order.high_alert_checks?.length || 0;
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="text-green-600" size={16} />;
      case 'fallback': return <WifiOff className="text-yellow-600" size={16} />;
      default: return <WifiOff className="text-red-600" size={16} />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Tempo real';
      case 'fallback': return 'Modo offline';
      default: return 'Desconectado';
    }
  };

  // Estado para debug de eventos realtime
  const [realtimeEvents, setRealtimeEvents] = useState<Array<{timestamp: string, event: string, data: any}>>([]);
  
  // Adicionar listener para eventos de debug do realtime
  useEffect(() => {
    const handleRealtimeEvent = (event: CustomEvent) => {
      setRealtimeEvents(prev => [
        ...prev.slice(-9), // Manter apenas os últimos 10 eventos
        {
          timestamp: new Date().toLocaleTimeString(),
          event: event.detail.type,
          data: event.detail.data
        }
      ]);
    };
    
    window.addEventListener('realtime-debug', handleRealtimeEvent as EventListener);
    return () => window.removeEventListener('realtime-debug', handleRealtimeEvent as EventListener);
  }, []);

  // Desbloquear áudio na primeira interação do usuário na página
  useEffect(() => {
    const handler = () => {
      primeAudio();
      window.removeEventListener('click', handler);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [primeAudio]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header com estatísticas e controles */}
      <div className="card animate-fade-in mb-6">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Farmácia</h1>
              <p className="text-gray-600 mt-1">Fila de Pedidos em Tempo Real</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'fallback' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="font-medium text-gray-700">
                  {getConnectionText()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={testSound}
                  className="btn-secondary text-sm px-3 py-2 flex items-center gap-2"
                  title="Testar som de notificação"
                >
                  <Volume2 size={16} />
                  Testar Som
                </button>
                {connectionStatus === 'disconnected' && (
                  <button
                    onClick={reconnect}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    Reconectar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm font-medium text-blue-700 mt-1">Total</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.withMAV}</div>
            <div className="text-sm font-medium text-yellow-700 mt-1">MAV</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.assigned}</div>
            <div className="text-sm font-medium text-green-700 mt-1">Atribuídos</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-gray-600">{orders.length}</div>
            <div className="text-sm font-medium text-gray-700 mt-1">Ativos</div>
          </div>
        </div>

        {/* Debug de Eventos Realtime */}
        {realtimeEvents.length > 0 && (
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 mb-6 font-mono text-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-semibold">Debug Realtime Events</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {realtimeEvents.map((event, index) => (
                <div key={index} className="text-xs">
                  <span className="text-gray-400">[{event.timestamp}]</span>
                  <span className="text-yellow-400 ml-2">{event.event}</span>
                  <span className="text-green-400 ml-2">{JSON.stringify(event.data)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {ordersLoading ? 'Carregando...' : `${orders.length} pedidos ativos`}
            </span>
            {(error || ordersError) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded-lg text-sm">
                {error || ordersError}
              </div>
            )}
          </div>
          
          <button
            onClick={refresh}
            disabled={ordersLoading}
            className="btn-secondary p-3 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
            title="Atualizar"
          >
            <RotateCcw size={18} className={ordersLoading ? 'animate-spin' : ''} />
          </button>
          {/* Botão invisível para primar áudio via primeira interação, fallback se necessário */}
          <button
            onClick={primeAudio}
            aria-hidden="true"
            tabIndex={-1}
            className="hidden"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {ORDERED.map(st => (
          <div key={st} className="card animate-slide-up">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 uppercase tracking-wide text-sm">
                {getStatusLabel(st)}
              </h3>
            </div>
            <div className="space-y-4">
              {orders.filter(o => o.status === st).map(o => (
                <OrderCard 
                  key={o.id} 
                  order={o} 
                  onAdvance={() => advance(o.id, o.status)}
                  onClaim={() => handleClaim(o.id)}
                  loading={loading}
                  hasMAV={hasMAVItems(o)}
                  mavCheckCount={getMAVCheckCount(o)}
                />
              ))}
              {orders.filter(o => o.status === st).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-sm">Nenhum pedido</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Dupla Checagem MAV */}
      {showMAVModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
            <div className="text-center mb-6">
              <div className="bg-yellow-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="text-yellow-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Dupla Checagem MAV
              </h3>
              <p className="text-gray-600">
                Este pedido contém medicamentos de alta vigilância (MAV) e requer dupla checagem antes de prosseguir.
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Observações (opcional):</label>
              <textarea
                value={mavCheckNotes[showMAVModal] || ''}
                onChange={(e) => setMavCheckNotes(prev => ({ ...prev, [showMAVModal]: e.target.value }))}
                className="input-field"
                rows={3}
                placeholder="Adicione observações sobre a checagem..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowMAVModal(null)}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleMAVCheck(showMAVModal)}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Registrando...' : 'Confirmar Checagem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente para cada card de pedido
function OrderCard({ 
  order, 
  onAdvance, 
  onClaim, 
  loading, 
  hasMAV, 
  mavCheckCount 
}: {
  order: any;
  onAdvance: () => void;
  onClaim: () => void;
  loading: boolean;
  hasMAV: boolean;
  mavCheckCount: number;
}) {
  const sla = useOrderSLA(order.priority, order.created_at);
  
  const canAdvance = () => {
    if (order.status === 'submitted') return Boolean(order.assigned_to);
    if (order.status === 'checking' && hasMAV && mavCheckCount < 2) return false;
    return true;
  };

  const advanceDisabledReason = () => {
    if (order.status === 'submitted' && !order.assigned_to) return 'Assuma o pedido para avançar';
    if (order.status === 'checking' && hasMAV && mavCheckCount < 2) return 'Dupla checagem MAV necessária';
    return '';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 hover:shadow-md transition-all duration-200 animate-fade-in">
      {/* Header com ID, sala e SLA */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-gray-900">#{order.id}</span>
          <span className="text-gray-500 text-sm">Sala {order.room_id}</span>
        </div>
        <div className="text-right space-y-1">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
            order.priority === 'urgente' 
              ? 'bg-red-100 text-red-800' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {order.priority.toUpperCase()}
          </div>
          <div className={`text-xs flex items-center gap-1 ${sla.color}`}>
            <Clock size={12} />
            <span className="font-medium">{sla.formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Barra de progresso SLA */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            sla.status === 'critical' ? 'bg-red-500' :
            sla.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${sla.progressPercentage}%` }}
        />
      </div>

      {/* Responsável */}
      {order.assigned_to && (
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
          <User size={14} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {order.profiles?.display_name || 'Usuário'}
          </span>
        </div>
      )}

      {/* Indicadores MAV */}
      {hasMAV && (
        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-600" />
            <span className="text-sm font-semibold text-yellow-800">MAV</span>
          </div>
          {order.status === 'checking' && (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className={mavCheckCount >= 2 ? 'text-green-600' : 'text-gray-400'} />
              <span className={`text-sm font-medium ${
                mavCheckCount >= 2 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {mavCheckCount}/2 checks
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notas */}
      {order.notes && (
        <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
          <p className="text-sm text-gray-700 leading-relaxed">{order.notes}</p>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3 pt-2">
        {order.status === 'submitted' && !order.assigned_to && (
          <button
            onClick={onClaim}
            disabled={loading}
            className="btn-primary flex-1 text-sm py-2"
          >
            Assumir Pedido
          </button>
        )}
        
        <button
          onClick={onAdvance}
          disabled={loading || !canAdvance()}
          className={`flex-1 text-sm py-2 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 ${
            canAdvance() 
              ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
          title={!canAdvance() ? advanceDisabledReason() : ''}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processando...
            </div>
          ) : (
            'Avançar'
          )}
        </button>
      </div>
    </div>
  );
}
