'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { 
  OrderStatus, 
  SetOrderStatusResponse, 
  ClaimOrderResponse, 
  MAVCheckResponse 
} from '@/lib/supabase/types';

export function useOrderOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const setOrderStatus = async (
    orderId: number,
    toStatus: OrderStatus,
    reason?: string,
    metadata?: any
  ): Promise<SetOrderStatusResponse> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('set_order_status', {
        p_order_id: orderId,
        p_to: toStatus,
        p_reason: reason,
        p_metadata: metadata
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data.success) {
        setError(data.error || 'Erro desconhecido');
        return data;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar status';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const claimOrder = async (orderId: number): Promise<ClaimOrderResponse> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('claim_order', {
        p_order_id: orderId
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data.success) {
        setError(data.error || 'Erro desconhecido');
        return data;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao assumir pedido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const addMAVCheck = async (
    orderId: number, 
    notes?: string
  ): Promise<MAVCheckResponse> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('add_mav_check', {
        p_order_id: orderId,
        p_notes: notes
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data.success) {
        setError(data.error || 'Erro desconhecido');
        return data;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registrar checagem MAV';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    loading,
    error,
    setOrderStatus,
    claimOrder,
    addMAVCheck,
    clearError
  };
}