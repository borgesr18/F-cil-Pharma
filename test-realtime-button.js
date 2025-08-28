// Script para testar o botão de realtime da farmácia
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ahephebsevhbprhblmyb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZXBoZWJzZXZoYnByaGJsbXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjcxNTYsImV4cCI6MjA3MTgwMzE1Nn0.mFkbHJ_uxzgi9C-4m9Rj-xWtUa63c_qhuC90rEymb60';

async function testRealtimeButton() {
  console.log('🧪 [TEST] Iniciando teste de criação de pedido...');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Primeiro fazer login com o usuário de teste
  console.log('🔐 [TEST] Fazendo login...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'teste@farmacia.com',
    password: 'teste123'
  });
  
  if (authError) {
    console.error('❌ [TEST] Erro no login:', authError);
    return;
  }
  
  console.log('✅ [TEST] Login realizado com sucesso');
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        room_id: 5, // Sala 1 (válida)
        status: 'submitted',
        priority: 'normal',
        kit_key: 'DIALISE_FAV', // Kit válido
        notes: `Teste de realtime - ${new Date().toLocaleTimeString()}`
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ [TEST] Erro ao criar pedido:', error);
    } else {
      console.log('✅ [TEST] Pedido criado com sucesso:', data);
      console.log('📋 [TEST] ID do pedido:', data.id);
      
      // Criar um item para o pedido
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: data.id,
          med_id: 10, // Medicamento de teste
          qty: 1,
          unit: 'un'
        });
      
      if (itemError) {
        console.error('❌ [TEST] Erro ao criar item do pedido:', itemError);
      } else {
        console.log('✅ [TEST] Item do pedido criado com sucesso');
      }
    }
  } catch (err) {
    console.error('❌ [TEST] Erro inesperado:', err);
  }
}

testRealtimeButton();