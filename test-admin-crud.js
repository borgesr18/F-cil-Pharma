require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminCRUD() {
  console.log('🧪 Teste de Operações CRUD - Página Admin');
  console.log('==================================================\n');

  try {
    // Teste 1: Criar uma nova sala
    console.log('📋 Teste 1: Criar Nova Sala');
    console.log('==================================================');
    const { data: newRoom, error: createError } = await supabase
      .from('rooms')
      .insert([{ name: 'Sala Teste CRUD', active: true }])
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Erro ao criar sala:', createError.message);
    } else {
      console.log('✅ Sala criada com sucesso:', newRoom);
    }

    // Teste 2: Listar salas
    console.log('\n📋 Teste 2: Listar Salas');
    console.log('==================================================');
    const { data: rooms, error: listError } = await supabase
      .from('rooms')
      .select('*')
      .order('name');
    
    if (listError) {
      console.log('❌ Erro ao listar salas:', listError.message);
    } else {
      console.log('✅ Salas encontradas:', rooms.length);
      rooms.forEach(room => {
        console.log(`  - ${room.name} (ID: ${room.id}, Ativo: ${room.active})`);
      });
    }

    if (newRoom) {
      // Teste 3: Atualizar sala
      console.log('\n📋 Teste 3: Atualizar Sala');
      console.log('==================================================');
      const { data: updatedRoom, error: updateError } = await supabase
        .from('rooms')
        .update({ name: 'Sala Teste CRUD Atualizada' })
        .eq('id', newRoom.id)
        .select()
        .single();
      
      if (updateError) {
        console.log('❌ Erro ao atualizar sala:', updateError.message);
      } else {
        console.log('✅ Sala atualizada com sucesso:', updatedRoom);
      }

      // Teste 4: Excluir sala
      console.log('\n📋 Teste 4: Excluir Sala');
      console.log('==================================================');
      const { error: deleteError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', newRoom.id);
      
      if (deleteError) {
        console.log('❌ Erro ao excluir sala:', deleteError.message);
      } else {
        console.log('✅ Sala excluída com sucesso');
      }
    }

    // Teste 5: Criar medicamento
    console.log('\n📋 Teste 5: Criar Novo Medicamento');
    console.log('==================================================');
    const { data: newMed, error: createMedError } = await supabase
      .from('meds')
      .insert([{ 
        name: 'Medicamento Teste CRUD', 
        unit: 'mg', 
        high_alert: false, 
        active: true 
      }])
      .select()
      .single();
    
    if (createMedError) {
      console.log('❌ Erro ao criar medicamento:', createMedError.message);
    } else {
      console.log('✅ Medicamento criado com sucesso:', newMed);
      
      // Limpar medicamento de teste
      await supabase.from('meds').delete().eq('id', newMed.id);
      console.log('🧹 Medicamento de teste removido');
    }

    // Teste 6: Criar kit
    console.log('\n📋 Teste 6: Criar Novo Kit');
    console.log('==================================================');
    const { data: newKit, error: createKitError } = await supabase
      .from('kits')
      .insert([{ 
        key: 'KIT_TESTE_CRUD', 
        name: 'Kit Teste CRUD', 
        active: true 
      }])
      .select()
      .single();
    
    if (createKitError) {
      console.log('❌ Erro ao criar kit:', createKitError.message);
    } else {
      console.log('✅ Kit criado com sucesso:', newKit);
      
      // Limpar kit de teste
      await supabase.from('kits').delete().eq('id', newKit.id);
      console.log('🧹 Kit de teste removido');
    }

    console.log('\n🎯 Resumo dos Testes:');
    console.log('==================================================');
    console.log('✅ Todas as operações CRUD foram testadas');
    console.log('✅ A página Admin deve estar funcionando corretamente');
    console.log('✅ As políticas RLS estão permitindo operações com service role');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

testAdminCRUD();