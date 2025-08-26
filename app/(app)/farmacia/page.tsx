'use client';
import { useState } from 'react';
import { useOrderOperations } from '@/lib/hooks/useOrderOperations';
import { useOrderSLA } from '@/lib/hooks/useSLA';
import { useRealtimeOrders } from '@/lib/hooks/useRealtimeOrders';
import type { OrderStatus } from '@/lib/supabase/types';
import { AlertTriangle, Clock, User, CheckCircle2, Wifi, WifiOff, RotateCcw } from 'lucide-react';

const ORDERED: OrderStatus[] = ['submitted','picking','checking','ready','delivered'];

export default function FarmaciaPage() {
  const [mavCheckNotes, setMavCheckNotes] = useState<Record<number, string>>({});
  const [showMAVModal, setShowMAVModal] = useState<number | null>(null);
  const { setOrderStatus, claimOrder, addMAVCheck, loading, error } = useOrderOperations();
  const { 
    orders, 
    loading: ordersLoading, 
    error: ordersError, 
    connectionStatus, 
    refresh, 
    reconnect,
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
    
    const result = await setOrderStatus(id, next, `Avanço automático: ${current} → ${next}`);
    
    if (!result.success) {
      if (result.error?.includes('Dupla checagem MAV pendente')) {
        setShowMAVModal(id);
      } else {
        alert(result.error || 'Erro ao avançar pedido');
      }
    }
  }

  async function handleClaim(id: number) {
    const result = await claimOrder(id);
    if (!result.success) {
      alert(result.error || 'Erro ao assumir pedido');
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Fila da Farmácia</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {getConnectionIcon()}
            <span>{getConnectionText()}</span>
            {connectionStatus !== 'connected' && (
              <button
                onClick={reconnect}
                className="p-1 hover:bg-gray-100 rounded"
                title="Reconectar"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Estatísticas */}
          <div className="text-sm text-gray-600">
            Total: {stats.total} | MAV: {stats.withMAV} | Atribuídos: {stats.assigned}
          </div>
          
          {/* Botão de refresh manual */}
          <button
            onClick={refresh}
            disabled={ordersLoading}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Atualizar"
          >
            <RotateCcw size={16} className={ordersLoading ? 'animate-spin' : ''} />
          </button>
          
          {/* Indicadores de erro */}
          {(error || ordersError) && (
            <div className="text-red-600 text-sm bg-red-50 px-3 py-1 rounded">
              {error || ordersError}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {ORDERED.map(st => (
          <div key={st} className="border rounded p-2">
            <div className="font-medium mb-2 uppercase text-xs">{st}</div>
            <div className="space-y-2">
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
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Dupla Checagem MAV */}
      {showMAVModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="text-yellow-600" size={20} />
              Dupla Checagem MAV Necessária
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Este pedido contém medicamentos de alta vigilância (MAV) e requer dupla checagem antes de prosseguir.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Observações (opcional):</label>
              <textarea
                value={mavCheckNotes[showMAVModal] || ''}
                onChange={(e) => setMavCheckNotes(prev => ({ ...prev, [showMAVModal]: e.target.value }))}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={3}
                placeholder="Adicione observações sobre a checagem..."
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowMAVModal(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleMAVCheck(showMAVModal)}
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
    if (order.status === 'submitted') return true;
    if (order.status === 'checking' && hasMAV && mavCheckCount < 2) return false;
    return true;
  };

  return (
    <div className="border rounded p-3 space-y-2">
      {/* Header com ID, sala e SLA */}
      <div className="flex justify-between items-start text-sm">
        <div>
          <span className="font-medium">#{order.id}</span>
          <span className="text-gray-500 ml-1">· Sala {order.room_id}</span>
        </div>
        <div className="text-right">
          <div className={`text-xs font-medium ${order.priority === 'urgente' ? 'text-red-600' : 'text-gray-600'}`}>
            {order.priority.toUpperCase()}
          </div>
          <div className={`text-xs flex items-center gap-1 ${sla.color}`}>
            <Clock size={12} />
            {sla.formattedTime}
          </div>
        </div>
      </div>

      {/* Barra de progresso SLA */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all ${
            sla.status === 'critical' ? 'bg-red-500' :
            sla.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${sla.progressPercentage}%` }}
        />
      </div>

      {/* Responsável */}
      {order.assigned_to && (
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <User size={12} />
          {order.profiles?.display_name || 'Usuário'}
        </div>
      )}

      {/* Indicadores MAV */}
      {hasMAV && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-yellow-600">
            <AlertTriangle size={12} />
            MAV
          </div>
          {order.status === 'checking' && (
            <div className="flex items-center gap-1">
              <CheckCircle2 size={12} className={mavCheckCount >= 2 ? 'text-green-600' : 'text-gray-400'} />
              <span className={mavCheckCount >= 2 ? 'text-green-600' : 'text-gray-600'}>
                {mavCheckCount}/2 checks
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notas */}
      {order.notes && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          {order.notes}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2">
        {order.status === 'submitted' && !order.assigned_to && (
          <button
            onClick={onClaim}
            disabled={loading}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Assumir
          </button>
        )}
        
        <button
          onClick={onAdvance}
          disabled={loading || !canAdvance()}
          className={`text-xs px-3 py-1 rounded disabled:opacity-50 ${
            canAdvance() 
              ? 'bg-black text-white hover:bg-gray-800' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!canAdvance() ? 'Dupla checagem MAV necessária' : ''}
        >
          {loading ? 'Processando...' : 'Avançar'}
        </button>
      </div>
    </div>
  );
}
