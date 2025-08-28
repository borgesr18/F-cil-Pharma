import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [API] Iniciando criação de pedido de teste...');
    
    const cookieStore = cookies();
    const supabase = createServerSupabase();
    
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [API] Usuário não autenticado:', authError);
      return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 });
    }
    
    console.log('👤 [API] Usuário autenticado:', user.id);
    
    // Buscar o perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !profile) {
      console.error('❌ [API] Erro ao buscar perfil:', profileError);
      return NextResponse.json({ success: false, error: 'Perfil não encontrado' }, { status: 404 });
    }
    
    console.log('👤 [API] Perfil encontrado:', { id: profile.id, role: profile.role, room_id: profile.room_id });
    
    // Buscar um medicamento para o teste
    const { data: meds, error: medsError } = await supabase
      .from('meds')
      .select('*')
      .limit(1);
      
    if (medsError || !meds || meds.length === 0) {
      console.error('❌ [API] Erro ao buscar medicamentos:', medsError);
      return NextResponse.json({ success: false, error: 'Nenhum medicamento encontrado' }, { status: 404 });
    }
    
    const testMed = meds[0];
    console.log('💊 [API] Medicamento para teste:', { id: testMed.id, name: testMed.name });
    
    // Criar o pedido de teste
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        room_id: profile.room_id,
        created_by: user.id,
        status: 'submitted',
        priority: 'normal',
        notes: `Pedido de teste criado em ${new Date().toLocaleString('pt-BR')}`
      })
      .select()
      .single();
      
    if (orderError || !order) {
      console.error('❌ [API] Erro ao criar pedido:', orderError);
      return NextResponse.json({ success: false, error: 'Erro ao criar pedido: ' + orderError?.message }, { status: 500 });
    }
    
    console.log('📋 [API] Pedido criado:', { id: order.id, status: order.status });
    
    // Criar item do pedido
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        med_id: testMed.id,
        qty: 1
      })
      .select()
      .single();
      
    if (itemError) {
      console.error('❌ [API] Erro ao criar item do pedido:', itemError);
      // Tentar deletar o pedido criado
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ success: false, error: 'Erro ao criar item do pedido: ' + itemError.message }, { status: 500 });
    }
    
    console.log('📦 [API] Item do pedido criado:', { id: orderItem.id, med_id: orderItem.med_id, qty: orderItem.qty });
    
    // Registrar evento de criação
    const { error: eventError } = await supabase
      .from('order_events')
      .insert({
        order_id: order.id,
        event_type: 'status_change',
        old_status: null,
        new_status: 'submitted',
        notes: 'Pedido de teste criado via API',
        created_by: user.id
      });
      
    if (eventError) {
      console.warn('⚠️ [API] Erro ao registrar evento (não crítico):', eventError);
    }
    
    console.log('✅ [API] Pedido de teste criado com sucesso!');
    
    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      message: 'Pedido de teste criado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ [API] Erro inesperado:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    }, { status: 500 });
  }
}