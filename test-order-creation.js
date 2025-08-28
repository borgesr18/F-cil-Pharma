const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testWithAuth() {
  console.log('🔐 [AUTH] Fazendo login...');
  
  // Fazer login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'teste@farmacia.com',
    password: 'teste123'
  });
  
  if (authError) {
    console.error('❌ [AUTH] Erro no login:', authError);
    return;
  }
  
  console.log('✅ [AUTH] Login realizado com sucesso:', {
    user_id: authData.user.id,
    email: authData.user.email
  });
  
  // Verificar se o usuário tem perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();
    
  if (profileError) {
    console.log('⚠️ [PROFILE] Usuário sem perfil, criando...');
    
    // Criar perfil usando a função RPC
    const { data: profileResult, error: createProfileError } = await supabase
      .rpc('create_or_update_user_profile', {
        p_room_id: 6, // Sala de teste
        p_display_name: 'Usuário Teste',
        p_role: 'nurse'
      });
      
    if (createProfileError) {
      console.error('❌ [PROFILE] Erro ao criar perfil:', createProfileError);
      return;
    }
    
    console.log('✅ [PROFILE] Perfil criado:', profileResult);
  } else {
    console.log('✅ [PROFILE] Perfil encontrado:', {
      user_id: profile.user_id,
      room_id: profile.room_id,
      role: profile.role
    });
  }
  
  console.log('\n🧪 [TEST] Criando pedido de teste com usuário autenticado...');
  
  try {
    // Criar pedido (igual à página da sala)
    const { data: order, error } = await supabase
      .from('orders')
      .insert({ 
        room_id: 6, 
        priority: 'urgente', 
        kit_key: 'DIALISE_FAV', 
        notes: `Teste de pedido autenticado - ${new Date().toLocaleString('pt-BR')}` 
      })
      .select('*')
      .single();
      
    if (error) {
      console.error('❌ [TEST] Erro ao criar pedido:', error);
      return;
    }
    
    console.log('✅ [TEST] Pedido criado com sucesso:', {
      id: order.id,
      room_id: order.room_id,
      priority: order.priority,
      status: order.status,
      created_by: order.created_by
    });
    
    // Adicionar um item ao pedido
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        med_id: 10, // Heparina
        qty: 1,
        unit: 'unidade'
      })
      .select()
      .single();
      
    if (itemError) {
      console.error('❌ [TEST] Erro ao criar item:', itemError);
    } else {
      console.log('✅ [TEST] Item criado:', {
        id: orderItem.id,
        med_id: orderItem.med_id,
        qty: orderItem.qty
      });
    }
    
    console.log('\n🎯 [SUCCESS] Pedido criado com sucesso!');
    console.log('📱 Agora abra a página da farmácia para verificar se o pedido apareceu em tempo real!');
    console.log('🔗 URL: http://localhost:3000/farmacia');
    
  } catch (error) {
    console.error('💥 [TEST] Erro geral:', error);
  }
}

testWithAuth();