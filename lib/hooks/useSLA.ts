'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Priority } from '@/lib/supabase/types';

type SLAConfig = {
  priority: Priority;
  sla_minutes: number;
  warning_threshold_percent: number;
};

type SLAStatus = 'ok' | 'warning' | 'critical';

type SLAInfo = {
  status: SLAStatus;
  remainingMinutes: number;
  totalMinutes: number;
  percentageUsed: number;
  isExpired: boolean;
  color: string;
};

export function useSLA() {
  const [slaConfigs, setSlaConfigs] = useState<SLAConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Carregar configurações de SLA
  useEffect(() => {
    const loadSLAConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from('sla_config')
          .select('*');

        if (error) throw error;
        setSlaConfigs(data || []);
      } catch (error) {
        console.error('Erro ao carregar configurações de SLA:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSLAConfigs();
  }, [supabase]);

  // Calcular SLA para um pedido específico
  const calculateSLA = useMemo(() => {
    return (priority: Priority, createdAt: string): SLAInfo => {
      const config = slaConfigs.find(c => c.priority === priority);
      
      if (!config) {
        return {
          status: 'ok',
          remainingMinutes: 0,
          totalMinutes: 0,
          percentageUsed: 0,
          isExpired: false,
          color: 'text-gray-500'
        };
      }

      const createdTime = new Date(createdAt).getTime();
      const currentTime = Date.now();
      const elapsedMinutes = (currentTime - createdTime) / (1000 * 60);
      const remainingMinutes = Math.max(0, config.sla_minutes - elapsedMinutes);
      const percentageUsed = (elapsedMinutes / config.sla_minutes) * 100;
      const warningThreshold = config.warning_threshold_percent || 80;
      const isExpired = elapsedMinutes >= config.sla_minutes;

      let status: SLAStatus = 'ok';
      let color = 'text-green-600';

      if (isExpired) {
        status = 'critical';
        color = 'text-red-600';
      } else if (percentageUsed >= warningThreshold) {
        status = 'warning';
        color = 'text-yellow-600';
      }

      return {
        status,
        remainingMinutes,
        totalMinutes: config.sla_minutes,
        percentageUsed: Math.min(100, percentageUsed),
        isExpired,
        color
      };
    };
  }, [slaConfigs]);

  // Hook para cronômetro em tempo real
  const useSLATimer = (priority: Priority, createdAt: string) => {
    const [slaInfo, setSlaInfo] = useState<SLAInfo>(() => 
      calculateSLA(priority, createdAt)
    );

    useEffect(() => {
      const updateSLA = () => {
        setSlaInfo(calculateSLA(priority, createdAt));
      };

      // Atualizar imediatamente
      updateSLA();

      // Atualizar a cada 30 segundos
      const interval = setInterval(updateSLA, 30000);

      return () => clearInterval(interval);
    }, [priority, createdAt, calculateSLA]);

    return slaInfo;
  };

  // Formatar tempo restante
  const formatTimeRemaining = (minutes: number): string => {
    if (minutes <= 0) return '00:00';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    }
    
    return `${mins.toString().padStart(2, '0')}m`;
  };

  // Obter configuração de SLA por prioridade
  const getSLAConfig = (priority: Priority): SLAConfig | null => {
    return slaConfigs.find(c => c.priority === priority) || null;
  };

  return {
    slaConfigs,
    loading,
    calculateSLA,
    useSLATimer,
    formatTimeRemaining,
    getSLAConfig
  };
}

// Hook simplificado para usar em componentes
export function useOrderSLA(priority: Priority, createdAt: string) {
  const { useSLATimer, formatTimeRemaining } = useSLA();
  const slaInfo = useSLATimer(priority, createdAt);

  return {
    ...slaInfo,
    formattedTime: formatTimeRemaining(slaInfo.remainingMinutes),
    progressPercentage: Math.min(100, slaInfo.percentageUsed)
  };
}