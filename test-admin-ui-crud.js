require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

// Usar o cliente anônimo (como a interface faria)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAdminUICrud() {
  console.log('🔄 Teste de CRUD da Interface Admin');
  console.log('==================================================\n');

  try {
    // Simular autenticação (necessária para RLS)
    console.log('📋 Passo 1: Verificar Autenticação');
    console.log('==================================================');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Erro ao verificar sessão:', sessionError.message);
    } else if (!session) {
      console.log('⚠️  Nenhuma sessão ativa encontrada');
      console.log('   A interface Admin requer autenticação para funcionar');
      console.log('   Testando com cliente service role...');
      
      // Usar service role para simular usuário autenticado
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        console.log('❌ Service role key não encontrada');
        return;
      }
      
      const supabaseService = createClient(supabaseUrl, serviceRoleKey);
      await testCrudOperations(supabaseService, 'Service Role');
      return;
    } else {
      console.log('✅ Sessão ativa encontrada:', session.user.email);
      await testCrudOperations(supabase, 'Cliente Autenticado');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

async function testCrudOperations(client, clientType) {
  console.log(`\n📋 Testando CRUD com ${clientType}`);
  console.log('==================================================');
  
  // Teste 1: CRUD de Salas
  console.log('\n🏥 Teste 1: CRUD de Salas');
  console.log('--------------------------------------------------');
  
  try {
    // CREATE - Adicionar nova sala
    console.log('➕ Criando nova sala...');
    const { data: newRoom, error: createRoomError } = await client
      .from('rooms')
      .insert([{ name: 'Sala Teste CRUD', active: true }])
      .select('*')
      .single();
    
    if (createRoomError) {
      console.log('❌ Erro ao criar sala:', createRoomError.message);
    } else {
      console.log('✅ Sala criada:', newRoom.name, '(ID:', newRoom.id, ')');
      
      // READ - Listar salas
      console.log('📖 Listando salas...');
      const { data: rooms, error: readRoomsError } = await client
        .from('rooms')
        .select('*')
        .eq('id', newRoom.id);
      
      if (readRoomsError) {
        console.log('❌ Erro ao listar salas:', readRoomsError.message);
      } else {
        console.log('✅ Sala encontrada na listagem');
      }
      
      // UPDATE - Editar sala
      console.log('✏️  Editando sala...');
      const { data: updatedRoom, error: updateRoomError } = await client
        .from('rooms')
        .update({ name: 'Sala Teste CRUD - Editada' })
        .eq('id', newRoom.id)
        .select('*')
        .single();
      
      if (updateRoomError) {
        console.log('❌ Erro ao editar sala:', updateRoomError.message);
      } else {
        console.log('✅ Sala editada:', updatedRoom.name);
      }
      
      // DELETE - Excluir sala
      console.log('🗑️  Excluindo sala...');
      const { error: deleteRoomError } = await client
        .from('rooms')
        .delete()
        .eq('id', newRoom.id);
      
      if (deleteRoomError) {
        console.log('❌ Erro ao excluir sala:', deleteRoomError.message);
      } else {
        console.log('✅ Sala excluída com sucesso');
      }
    }
  } catch (error) {
    console.log('❌ Erro no teste de salas:', error.message);
  }
  
  // Teste 2: CRUD de Medicamentos
  console.log('\n💊 Teste 2: CRUD de Medicamentos');
  console.log('--------------------------------------------------');
  
  try {
    // CREATE - Adicionar novo medicamento
    console.log('➕ Criando novo medicamento...');
    const { data: newMed, error: createMedError } = await client
      .from('meds')
      .insert([{ 
        name: 'Medicamento Teste CRUD', 
        unit: 'mg', 
        high_alert: false, 
        active: true 
      }])
      .select('*')
      .single();
    
    if (createMedError) {
      console.log('❌ Erro ao criar medicamento:', createMedError.message);
    } else {
      console.log('✅ Medicamento criado:', newMed.name, '(ID:', newMed.id, ')');
      
      // READ - Listar medicamentos
      console.log('📖 Listando medicamentos...');
      const { data: meds, error: readMedsError } = await client
        .from('meds')
        .select('*')
        .eq('id', newMed.id);
      
      if (readMedsError) {
        console.log('❌ Erro ao listar medicamentos:', readMedsError.message);
      } else {
        console.log('✅ Medicamento encontrado na listagem');
      }
      
      // UPDATE - Editar medicamento
      console.log('✏️  Editando medicamento...');
      const { data: updatedMed, error: updateMedError } = await client
        .from('meds')
        .update({ name: 'Medicamento Teste CRUD - Editado', high_alert: true })
        .eq('id', newMed.id)
        .select('*')
        .single();
      
      if (updateMedError) {
        console.log('❌ Erro ao editar medicamento:', updateMedError.message);
      } else {
        console.log('✅ Medicamento editado:', updatedMed.name, '- MAV:', updatedMed.high_alert);
      }
      
      // DELETE - Excluir medicamento
      console.log('🗑️  Excluindo medicamento...');
      const { error: deleteMedError } = await client
        .from('meds')
        .delete()
        .eq('id', newMed.id);
      
      if (deleteMedError) {
        console.log('❌ Erro ao excluir medicamento:', deleteMedError.message);
      } else {
        console.log('✅ Medicamento excluído com sucesso');
      }
    }
  } catch (error) {
    console.log('❌ Erro no teste de medicamentos:', error.message);
  }
  
  // Teste 3: CRUD de Kits
  console.log('\n📦 Teste 3: CRUD de Kits');
  console.log('--------------------------------------------------');
  
  try {
    // CREATE - Adicionar novo kit
    console.log('➕ Criando novo kit...');
    const { data: newKit, error: createKitError } = await client
      .from('kits')
      .insert([{ 
        key: 'KIT_TESTE_CRUD', 
        name: 'Kit Teste CRUD', 
        active: true 
      }])
      .select('*')
      .single();
    
    if (createKitError) {
      console.log('❌ Erro ao criar kit:', createKitError.message);
    } else {
      console.log('✅ Kit criado:', newKit.name, '(Chave:', newKit.key, ')');
      
      // READ - Listar kits
      console.log('📖 Listando kits...');
      const { data: kits, error: readKitsError } = await client
        .from('kits')
        .select('*')
        .eq('key', newKit.key);
      
      if (readKitsError) {
        console.log('❌ Erro ao listar kits:', readKitsError.message);
      } else {
        console.log('✅ Kit encontrado na listagem');
      }
      
      // UPDATE - Editar kit
      console.log('✏️  Editando kit...');
      const { data: updatedKit, error: updateKitError } = await client
        .from('kits')
        .update({ name: 'Kit Teste CRUD - Editado' })
        .eq('key', newKit.key)
        .select('*')
        .single();
      
      if (updateKitError) {
        console.log('❌ Erro ao editar kit:', updateKitError.message);
      } else {
        console.log('✅ Kit editado:', updatedKit.name);
      }
      
      // DELETE - Excluir kit
      console.log('🗑️  Excluindo kit...');
      const { error: deleteKitError } = await client
        .from('kits')
        .delete()
        .eq('key', newKit.key);
      
      if (deleteKitError) {
        console.log('❌ Erro ao excluir kit:', deleteKitError.message);
      } else {
        console.log('✅ Kit excluído com sucesso');
      }
    }
  } catch (error) {
    console.log('❌ Erro no teste de kits:', error.message);
  }
  
  // Resumo
  console.log('\n🎯 Resumo dos Testes CRUD');
  console.log('==================================================');
  console.log(`Cliente utilizado: ${clientType}`);
  console.log('✅ Teste de Salas: Verificar logs acima');
  console.log('✅ Teste de Medicamentos: Verificar logs acima');
  console.log('✅ Teste de Kits: Verificar logs acima');
  
  if (clientType === 'Cliente Autenticado') {
    console.log('\n💡 Dica: Se houver erros, verifique as políticas RLS');
    console.log('   As operações CRUD requerem autenticação adequada.');
  }
}

testAdminUICrud();