import React from 'react';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import FarmaciaPage from '@/app/(app)/farmacia/page';
// Evitar erro de Supabase client em ambiente de teste
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ data: [], error: null }) }),
    rpc: () => ({ data: { success: true }, error: null }),
    removeChannel: jest.fn(),
    channel: () => ({ on: () => ({ on: () => ({ on: () => ({ subscribe: () => 'ok' }) }) }), subscribe: () => 'ok' }),
    realtime: { connect: jest.fn() },
  })
}));

// Mocks dos hooks usados pela página
jest.mock('@/lib/hooks/useRealtimeOrders', () => ({
  useRealtimeOrders: () => ({
    orders: [],
    loading: false,
    error: null,
    connectionStatus: 'connected',
    refresh: jest.fn(),
    reconnect: jest.fn(),
    stats: { total: 0, withMAV: 0, assigned: 0 }
  })
}));

jest.mock('@/lib/hooks/useOrderOperations', () => ({
  useOrderOperations: () => ({
    setOrderStatus: jest.fn(async () => ({ success: true })),
    claimOrder: jest.fn(async () => ({ success: true })),
    addMAVCheck: jest.fn(async () => ({ success: true, can_advance: true })),
    loading: false,
    error: null,
  })
}));

describe('FarmaciaPage - UI básica', () => {
  test('renderiza header, status de conexão e estatísticas', () => {
    render(<FarmaciaPage />);
    expect(screen.getByRole('heading', { name: /Farmácia/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Tempo real|Modo offline|Desconectado/i).length).toBeGreaterThan(0);

    // Estatísticas (relaxando para evitar conflito com "ativos" do contador)
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('MAV')).toBeInTheDocument();
    expect(screen.getByText('Atribuídos')).toBeInTheDocument();
    expect(screen.getAllByText('Ativos').length).toBeGreaterThan(0);
  });

  test('renderiza colunas por status e estado vazio', () => {
    render(<FarmaciaPage />);
    const columnTitles = ['Enviados','Separando','Em Análise','Prontos','Entregues'];
    columnTitles.forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
    // Estado vazio
    expect(screen.getAllByText(/Nenhum pedido/i).length).toBeGreaterThan(0);
  });
});

