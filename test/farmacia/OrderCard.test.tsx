import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock supabase client to avoid env errors (aplica para quaisquer imports reais)
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ data: [], error: null }) }),
    rpc: () => ({ data: { success: true }, error: null }),
    removeChannel: jest.fn(),
    channel: () => ({ on: () => ({ on: () => ({ on: () => ({ subscribe: () => 'ok' }) }) }), subscribe: () => 'ok' }),
    realtime: { connect: jest.fn() },
  })
}));

// Variáveis mutáveis para controlar os retornos dos hooks por teste
let realtimeReturn: any = {
  orders: [],
  loading: false,
  error: null,
  connectionStatus: 'connected',
  refresh: jest.fn(),
  reconnect: jest.fn(),
  stats: { total: 0, withMAV: 0, assigned: 0 },
};
let operationsReturn: any = {
  setOrderStatus: jest.fn(async () => ({ success: true })),
  claimOrder: jest.fn(async () => ({ success: true })),
  addMAVCheck: jest.fn(async () => ({ success: true })),
  loading: false,
  error: null,
};

jest.mock('@/lib/hooks/useRealtimeOrders', () => ({
  useRealtimeOrders: () => realtimeReturn,
}));
jest.mock('@/lib/hooks/useOrderOperations', () => ({
  useOrderOperations: () => operationsReturn,
}));

import FarmaciaPage from '@/app/(app)/farmacia/page';

const baseOrder = {
  id: 1,
  status: 'submitted',
  priority: 'normal',
  room_id: 101,
  created_at: new Date().toISOString(),
  assigned_to: null,
  assigned_at: null,
  notes: 'Teste',
  order_items: [{ id: 1, med_id: 10, qty: 1, unit: 'un', high_alert: false }],
  high_alert_checks: [],
};

describe('OrderCard interactions', () => {
  test('Assumir Pedido aparece para submitted sem responsável e dispara claim', async () => {
    const claimOrder = jest.fn(async () => ({ success: true }));
    realtimeReturn = {
      ...realtimeReturn,
      orders: [baseOrder],
      stats: { total: 1, withMAV: 0, assigned: 0 },
    };
    operationsReturn = {
      ...operationsReturn,
      claimOrder,
    };

    render(<FarmaciaPage />);

    const btn = await screen.findByRole('button', { name: /Assumir Pedido/i });
    fireEvent.click(btn);

    expect(claimOrder).toHaveBeenCalledWith(1);
  });

  test('Botão Avançar desabilita quando MAV e checks insuficientes', async () => {
    const order = {
      ...baseOrder,
      status: 'checking',
      order_items: [{ id: 1, med_id: 10, qty: 1, unit: 'un', high_alert: true }],
      high_alert_checks: [{ id: 1, checker_id: 'u1', checked_at: new Date().toISOString(), notes: null }],
    };

    realtimeReturn = {
      ...realtimeReturn,
      orders: [order],
      stats: { total: 1, withMAV: 1, assigned: 0 },
    };
    operationsReturn = {
      ...operationsReturn,
    };

    render(<FarmaciaPage />);

    const advance = await screen.findByRole('button', { name: /Avançar/i });
    expect(advance).toBeDisabled();
    expect(advance).toHaveAttribute('title', expect.stringMatching(/Dupla checagem/i));
  });
});

