// Script de teste para verificar conectividade Supabase e Realtime
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ahephebsevhbprhblmyb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZXBoZWJzZXZoYnByaGJsbXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjcxNTYsImV4cCI6MjA3MTgwMzE1Nn0.mFkbHJ_uxzgi9C-4m9Rj-xWtUa63c_qhuC90rEymb60';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testando conectividade com Supabase...');
  
  try {
    // Teste básico de conectividade
    const { data, error } = await supabase
      .from('orders')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro na conectividade:', error);
      return false;
    }
    
    console.log('✅ Conectividade OK');
    return true;
  } catch (err) {
    console.error('❌ Erro de conexão:', err);
    return false;
  }
}

function testRealtime() {
  console.log('📡 Testando Realtime...');
  
  const channel = supabase
    .channel('test_orders_realtime')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        console.log('📨 Evento Realtime recebido:', payload);
      }
    )
    .subscribe((status) => {
      console.log('🔌 Status da conexão Realtime:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime conectado com sucesso!');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Erro no Realtime:', status);
      }
    });
  
  // Cleanup após 30 segundos
  setTimeout(() => {
    console.log('🔌 Desconectando teste de Realtime...');
    supabase.removeChannel(channel);
    process.exit(0);
  }, 30000);
}

async function runTests() {
  const isConnected = await testConnection();
  
  if (isConnected) {
    testRealtime();
  } else {
    console.log('❌ Não foi possível conectar ao Supabase. Verifique as configurações.');
    process.exit(1);
  }
}

runTests();