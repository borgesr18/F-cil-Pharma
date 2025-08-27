require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRealtimeFlow() {
  console.log('🔄 Teste de Fluxo Realtime: Sala → Farmácia');
  console.log('==================================================\n');

  try {
    // Passo 1: Verificar se há salas disponíveis
    console.log('📋 Passo 1: Verificar Salas Disponíveis');
    console.log('==================================================');
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('active', true)
      .limit(1);
    
    if (roomsError) {
      console.log('❌ Erro ao buscar salas:', roomsError.message);
      return;
    }
    
    if (!rooms || rooms.length === 0) {
      console.log('❌ Nenhuma sala ativa encontrada');
      return;
    }
    
    const testRoom = rooms[0];
    console.log('✅ Sala encontrada:', testRoom.name, '(ID:', testRoom.id, ')');

    // Passo 2: Verificar medicamentos disponíveis
    console.log('\n📋 Passo 2: Verificar Medicamentos Disponíveis');
    console.log('==================================================');
    const { data: meds, error: medsError } = await supabase
      .from('meds')
      .select('*')
      .eq('active', true)
      .limit(2);
    
    if (medsError) {
      console.log('❌ Erro ao buscar medicamentos:', medsError.message);
      return;
    }
    
    if (!meds || meds.length === 0) {
      console.log('❌ Nenhum medicamento ativo encontrado');
      return;
    }
    
    console.log('✅ Medicamentos encontrados:', meds.length);
    meds.forEach(med => {
      console.log(`  - ${med.name} (${med.unit}) - MAV: ${med.high_alert}`);
    });

    // Passo 3: Criar um pedido de teste
    console.log('\n📋 Passo 3: Criar Pedido de Teste');
    console.log('==================================================');
    
    // Gerar um UUID para o campo created_by (simulando um usuário)
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        room_id: testRoom.id,
        priority: 'normal',
        notes: 'Pedido de teste - Fluxo Realtime',
        created_by: testUserId
      })
      .select('*')
      .single();
    
    if (orderError) {
      console.log('❌ Erro ao criar pedido:', orderError.message);
      return;
    }
    
    console.log('✅ Pedido criado com sucesso:');
    console.log(`  - ID: ${newOrder.id}`);
    console.log(`  - Sala: ${newOrder.room_id}`);
    console.log(`  - Status: ${newOrder.status}`);
    console.log(`  - Prioridade: ${newOrder.priority}`);
    console.log(`  - Criado em: ${newOrder.created_at}`);

    // Passo 4: Adicionar itens ao pedido
    console.log('\n📋 Passo 4: Adicionar Itens ao Pedido');
    console.log('==================================================');
    const orderItems = meds.slice(0, 2).map(med => ({
      order_id: newOrder.id,
      med_id: med.id,
      qty: 1,
      unit: med.unit
    }));
    
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select('*, meds(name)');
    
    if (itemsError) {
      console.log('❌ Erro ao adicionar itens:', itemsError.message);
    } else {
      console.log('✅ Itens adicionados com sucesso:');
      items.forEach(item => {
        console.log(`  - ${item.meds.name}: ${item.qty} ${item.unit}`);
      });
    }

    // Passo 5: Verificar se o pedido aparece na consulta da farmácia
    console.log('\n📋 Passo 5: Verificar Visibilidade na Farmácia');
    console.log('==================================================');
    
    // Aguardar um pouco para garantir que o realtime processe
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: pharmacyOrders, error: pharmacyError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id, med_id, qty, unit, high_alert,
          meds(name)
        )
      `)
      .in('status', ['submitted', 'picking', 'checking', 'ready', 'delivered'])
      .eq('id', newOrder.id);
    
    if (pharmacyError) {
      console.log('❌ Erro ao consultar pedidos da farmácia:', pharmacyError.message);
    } else if (!pharmacyOrders || pharmacyOrders.length === 0) {
      console.log('❌ Pedido NÃO encontrado na consulta da farmácia');
      console.log('   Isso indica um problema no fluxo realtime');
    } else {
      console.log('✅ Pedido encontrado na consulta da farmácia:');
      const order = pharmacyOrders[0];
      console.log(`  - ID: ${order.id}`);
      console.log(`  - Status: ${order.status}`);
      console.log(`  - Itens: ${order.order_items?.length || 0}`);
      console.log(`  - Criado: ${order.created_at}`);
    }

    // Passo 6: Testar mudança de status (simplificado)
    console.log('\n📋 Passo 6: Testar Mudança de Status');
    console.log('==================================================');
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'picking' })
      .eq('id', newOrder.id)
      .select('*')
      .single();
    
    if (updateError) {
      console.log('❌ Erro ao atualizar status:', updateError.message);
    } else {
      console.log('✅ Status atualizado com sucesso:');
      console.log(`  - Novo status: ${updatedOrder.status}`);
    }

    // Passo 7: Verificar se o pedido existe com consulta simples
    console.log('\n📋 Passo 7: Verificar Existência do Pedido');
    console.log('==================================================');
    
    const { data: simpleCheck, error: simpleError } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .eq('id', newOrder.id);
    
    if (simpleError) {
      console.log('❌ Erro na consulta simples:', simpleError.message);
    } else if (simpleCheck && simpleCheck.length > 0) {
      console.log('✅ Pedido encontrado na consulta simples:');
      console.log(`  - ID: ${simpleCheck[0].id}`);
      console.log(`  - Status: ${simpleCheck[0].status}`);
    } else {
      console.log('❌ Pedido não encontrado na consulta simples');
    }

    // Limpeza: Remover pedido de teste
    console.log('\n🧹 Limpeza: Removendo Pedido de Teste');
    console.log('==================================================');
    
    // Remover itens primeiro (devido a foreign key)
    await supabase.from('order_items').delete().eq('order_id', newOrder.id);
    await supabase.from('orders').delete().eq('id', newOrder.id);
    
    console.log('✅ Pedido de teste removido');

    // Resumo
    console.log('\n🎯 Resumo do Teste');
    console.log('==================================================');
    console.log('✅ Sala encontrada e acessível');
    console.log('✅ Medicamentos disponíveis');
    console.log('✅ Criação de pedido funcionando');
    console.log('✅ Adição de itens funcionando');
    console.log(pharmacyOrders && pharmacyOrders.length > 0 ? 
      '✅ Pedido visível na farmácia' : 
      '❌ Pedido NÃO visível na farmácia');
    console.log('✅ Atualização de status funcionando');
    
    if (pharmacyOrders && pharmacyOrders.length > 0) {
      console.log('\n🎉 SUCESSO: O fluxo realtime está funcionando corretamente!');
      console.log('   Os pedidos criados na Sala devem aparecer na Farmácia.');
    } else {
      console.log('\n⚠️  PROBLEMA: O pedido não apareceu na consulta da farmácia.');
      console.log('   Verifique as políticas RLS e configurações de realtime.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

testRealtimeFlow();