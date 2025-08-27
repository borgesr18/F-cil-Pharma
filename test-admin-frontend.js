import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

// Cliente com anon key (como usado no frontend)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔧 Teste de Operações CRUD - Frontend Admin');
console.log('==================================================');

async function testFrontendCRUD() {
  try {
    console.log('\n📋 Passo 1: Verificar sessão atual');
    console.log('==================================================');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Erro ao verificar sessão:', sessionError.message);
    } else if (!session) {
      console.log('⚠️  Nenhuma sessão ativa encontrada');
      console.log('   Isso explica por que as operações CRUD falham na interface!');
    } else {
      console.log('✅ Sessão ativa encontrada:', session.user.email);
    }

    console.log('\n📋 Passo 2: Testar operações sem autenticação (anon)');
    console.log('==================================================');
    
    // Teste de leitura
    console.log('📖 Testando leitura de salas...');
    const { data: rooms, error: readError } = await supabase
      .from('rooms')
      .select('*');
    
    if (readError) {
      console.log('❌ Erro na leitura:', readError.message);
    } else {
      console.log(`✅ ${rooms.length} salas lidas com sucesso`);
    }

    // Teste de criação
    console.log('\n➕ Testando criação de sala...');
    const { data: newRoom, error: createError } = await supabase
      .from('rooms')
      .insert({ name: 'Sala Frontend Test' })
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Erro na criação:', createError.message);
      console.log('   Código do erro:', createError.code);
      console.log('   Detalhes:', createError.details);
    } else {
      console.log('✅ Sala criada:', newRoom.name);
      
      // Teste de atualização
      console.log('\n✏️  Testando atualização de sala...');
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ name: 'Sala Frontend Test Updated' })
        .eq('id', newRoom.id);
      
      if (updateError) {
        console.log('❌ Erro na atualização:', updateError.message);
      } else {
        console.log('✅ Sala atualizada com sucesso');
      }
      
      // Teste de exclusão
      console.log('\n🗑️  Testando exclusão de sala...');
      const { error: deleteError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', newRoom.id);
      
      if (deleteError) {
        console.log('❌ Erro na exclusão:', deleteError.message);
      } else {
        console.log('✅ Sala excluída com sucesso');
      }
    }

    console.log('\n📋 Passo 3: Verificar políticas RLS');
    console.log('==================================================');
    
    // Verificar se RLS está bloqueando operações
    const tables = ['rooms', 'meds', 'kits'];
    
    for (const table of tables) {
      console.log(`\n🔒 Testando ${table}...`);
      
      // Teste de leitura
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table} - Erro na leitura:`, error.message);
      } else {
        console.log(`✅ ${table} - Leitura permitida (${data.length} registros)`);
      }
      
      // Teste de inserção
      const testData = {
        rooms: { name: `Test Room ${Date.now()}` },
        meds: { name: `Test Med ${Date.now()}`, unit: 'un' },
        kits: { key: `test_${Date.now()}`, name: `Test Kit ${Date.now()}` }
      };
      
      const { error: insertError } = await supabase
        .from(table)
        .insert(testData[table]);
      
      if (insertError) {
        console.log(`❌ ${table} - Erro na inserção:`, insertError.message);
        if (insertError.code) {
          console.log(`   Código: ${insertError.code}`);
        }
      } else {
        console.log(`✅ ${table} - Inserção permitida`);
      }
    }

    console.log('\n📋 Resumo do Teste');
    console.log('==================================================');
    console.log('Se as operações falharam com "permission denied" ou "RLS",');
    console.log('o problema está nas políticas RLS que não permitem acesso');
    console.log('para usuários não autenticados (anon role).');
    console.log('\nSolução: Criar políticas RLS adequadas ou garantir que');
    console.log('os usuários estejam autenticados antes de acessar a página Admin.');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

testFrontendCRUD();