const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRealtimeFlow() {
  console.log('🧪 [TEST] Iniciando teste de realtime...');
  
  try {
    // 1. Verificar conexão com o banco
    console.log('🔗 [TEST] Verificando conexão com o banco...');
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .limit(1);
      
    if (roomsError) {
      console.error('❌ [TEST] Erro ao conectar com o banco:', roomsError);
      return;
    }
    
    console.log('✅ [TEST] Conexão com banco OK');
    
    // 2. Buscar um usuário para criar o pedido
    console.log('👤 [TEST] Buscando usuário...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'nurse')
      .limit(1);
      
    if (profilesError || !profiles || profiles.length === 0) {
      console.error('❌ [TEST] Erro ao buscar perfil:', profilesError);
      return;
    }
    
    const profile = profiles[0];
    console.log('✅ [TEST] Perfil encontrado:', { user_id: profile.user_id, role: profile.role, room_id: profile.room_id });
    
    // Verificar se o perfil tem um user_id válido
    if (!profile.user_id) {
      console.error('❌ [TEST] Perfil não tem user_id válido:', profile);
      return;
    }
    
    // 3. Buscar um medicamento
    console.log('💊 [TEST] Buscando medicamento...');
    const { data: meds, error: medsError } = await supabase
      .from('meds')
      .select('*')
      .limit(1);
      
    if (medsError || !meds || meds.length === 0) {
      console.error('❌ [TEST] Erro ao buscar medicamentos:', medsError);
      return;
    }
    
    const med = meds[0];
    console.log('✅ [TEST] Medicamento encontrado:', { id: med.id, name: med.name });
    
    // 4. Criar pedido de teste
    console.log('📋 [TEST] Criando pedido de teste...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        room_id: profile.room_id,
        created_by: profile.user_id,
        status: 'submitted',
        priority: 'normal',
        notes: `Pedido de teste realtime - ${new Date().toLocaleString('pt-BR')}`
      })
      .select()
      .single();
      
    if (orderError) {
      console.error('❌ [TEST] Erro ao criar pedido:', orderError);
      return;
    }
    
    console.log('✅ [TEST] Pedido criado:', { id: order.id, status: order.status, room_id: order.room_id });
    
    // 5. Criar item do pedido
    console.log('📦 [TEST] Criando item do pedido...');
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        med_id: med.id,
        qty: 1,
        unit: 'unidade'
      })
      .select()
      .single();
      
    if (itemError) {
      console.error('❌ [TEST] Erro ao criar item:', itemError);
      return;
    }
    
    console.log('✅ [TEST] Item criado:', { id: orderItem.id, med_id: orderItem.med_id, qty: orderItem.qty });
    
    // 6. Configurar listener de realtime para verificar se o evento é disparado
    console.log('👂 [TEST] Configurando listener de realtime...');
    
    const channel = supabase
      .channel('test-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🔥 [REALTIME] Evento recebido:', {
            eventType: payload.eventType,
            table: payload.table,
            orderId: payload.new?.id || payload.old?.id,
            status: payload.new?.status || payload.old?.status
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 [REALTIME] Status da conexão:', status);
      });
    
    // 7. Aguardar um pouco e criar outro pedido para testar o realtime
    console.log('⏳ [TEST] Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📋 [TEST] Criando segundo pedido para testar realtime...');
    const { data: order2, error: order2Error } = await supabase
      .from('orders')
      .insert({
        room_id: profile.room_id,
        created_by: profile.user_id,
        status: 'submitted',
        priority: 'urgente',
        notes: `Segundo pedido de teste realtime - ${new Date().toLocaleString('pt-BR')}`
      })
      .select()
      .single();
      
    if (order2Error) {
      console.error('❌ [TEST] Erro ao criar segundo pedido:', order2Error);
    } else {
      console.log('✅ [TEST] Segundo pedido criado:', { id: order2.id, status: order2.status });
    }
    
    // 8. Aguardar mais um pouco para ver se o evento de realtime é recebido
    console.log('⏳ [TEST] Aguardando eventos de realtime...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 9. Limpar
    console.log('🧹 [TEST] Limpando recursos...');
    await supabase.removeChannel(channel);
    
    console.log('✅ [TEST] Teste concluído!');
    
  } catch (error) {
    console.error('❌ [TEST] Erro inesperado:', error);
  }
}

testRealtimeFlow().then(() => {
  console.log('🏁 [TEST] Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 [TEST] Erro fatal:', error);
  process.exit(1);
});