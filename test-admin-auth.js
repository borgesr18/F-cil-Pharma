import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

// Criar clientes
const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

async function testAuthAndPermissions() {
  console.log('🔐 Testando autenticação e permissões para página Admin\n');

  // Teste 1: Cliente anônimo (como na interface web sem login)
  console.log('📋 Teste 1: Cliente Anônimo (sem autenticação)');
  console.log('=' .repeat(50));
  
  try {
    // Verificar status de autenticação
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    console.log('👤 Status de autenticação:', user ? 'Autenticado' : 'Não autenticado');
    if (authError) console.log('⚠️ Erro de auth:', authError.message);
    
    // Testar SELECT em cada tabela
    const tables = ['rooms', 'meds', 'kits'];
    
    for (const table of tables) {
      console.log(`\n🔍 Testando SELECT em ${table}:`);
      const { data, error } = await anonClient
        .from(table)
        .select('*')
        .limit(3);
      
      if (error) {
        console.log(`  ❌ Erro: ${error.message}`);
        console.log(`  📝 Código: ${error.code}`);
        console.log(`  📄 Detalhes: ${error.details}`);
      } else {
        console.log(`  ✅ Sucesso: ${data.length} registros encontrados`);
        if (data.length > 0) {
          console.log(`  📄 Primeiro registro:`, JSON.stringify(data[0], null, 2));
        }
      }
    }
    
    // Testar INSERT (deve falhar para usuário não autenticado)
    console.log('\n➕ Testando INSERT em rooms (deve falhar):');
    const { data: insertData, error: insertError } = await anonClient
      .from('rooms')
      .insert([{ name: 'Teste Auth', active: true }]);
    
    if (insertError) {
      console.log(`  ❌ Erro esperado: ${insertError.message}`);
    } else {
      console.log(`  ⚠️ INSERT funcionou (inesperado):`, insertData);
    }
    
  } catch (err) {
    console.error('❌ Erro no teste anônimo:', err.message);
  }

  // Teste 2: Cliente com service role (simulando usuário admin)
  if (serviceClient) {
    console.log('\n\n📋 Teste 2: Cliente Service Role (admin)');
    console.log('=' .repeat(50));
    
    try {
      // Testar operações CRUD completas
      const tables = ['rooms', 'meds', 'kits'];
      
      for (const table of tables) {
        console.log(`\n🔧 Testando CRUD completo em ${table}:`);
        
        // SELECT
        const { data: selectData, error: selectError } = await serviceClient
          .from(table)
          .select('*')
          .limit(3);
        
        if (selectError) {
          console.log(`  ❌ SELECT falhou: ${selectError.message}`);
          continue;
        }
        
        console.log(`  ✅ SELECT: ${selectData.length} registros`);
        
        // INSERT
        let testData;
        switch (table) {
          case 'rooms':
            testData = { name: 'Teste Auth Room', active: true };
            break;
          case 'meds':
            testData = { name: 'Teste Auth Med', unit: 'mg', high_alert: false, active: true };
            break;
          case 'kits':
            testData = { key: 'TEST_AUTH_KIT', name: 'Teste Auth Kit', active: true };
            break;
        }
        
        const { data: insertData, error: insertError } = await serviceClient
          .from(table)
          .insert([testData])
          .select();
        
        if (insertError) {
          console.log(`  ❌ INSERT falhou: ${insertError.message}`);
          continue;
        }
        
        console.log(`  ✅ INSERT: Registro criado com ID ${insertData[0].id}`);
        
        // UPDATE
        const updateData = { ...testData, name: testData.name + ' - Atualizado' };
        const { error: updateError } = await serviceClient
          .from(table)
          .update(updateData)
          .eq('id', insertData[0].id);
        
        if (updateError) {
          console.log(`  ❌ UPDATE falhou: ${updateError.message}`);
        } else {
          console.log(`  ✅ UPDATE: Registro atualizado`);
        }
        
        // DELETE
        const { error: deleteError } = await serviceClient
          .from(table)
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.log(`  ❌ DELETE falhou: ${deleteError.message}`);
        } else {
          console.log(`  ✅ DELETE: Registro removido`);
        }
      }
      
    } catch (err) {
      console.error('❌ Erro no teste service role:', err.message);
    }
  }

  console.log('\n🎯 Resumo dos Testes:');
  console.log('=' .repeat(50));
  console.log('1. Se o cliente anônimo conseguir fazer SELECT mas não INSERT/UPDATE/DELETE,');
  console.log('   isso indica que as políticas RLS estão funcionando corretamente.');
  console.log('2. Se o service role conseguir fazer todas as operações,');
  console.log('   isso confirma que o banco está funcionando.');
  console.log('3. O problema na interface pode ser de autenticação do usuário.');
  console.log('\n💡 Próximos passos:');
  console.log('- Verificar se o usuário está logado na interface');
  console.log('- Verificar se o usuário tem as permissões corretas (admin/pharmacy)');
  console.log('- Verificar se as políticas RLS estão permitindo operações para usuários autenticados');
}

// Executar testes
testAuthAndPermissions().catch(console.error);