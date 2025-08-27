import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

// Cliente com anon key (como usado no frontend)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
// Cliente com service role (para verificar usuários)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔐 Teste de CRUD com Usuário Autenticado');
console.log('==================================================');

async function testAuthenticatedCRUD() {
  try {
    console.log('\n📋 Passo 1: Buscar usuário existente');
    console.log('==================================================');
    
    // Buscar um usuário existente
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Erro ao buscar usuários:', usersError.message);
      return;
    }
    
    if (users.users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado. Criando usuário de teste...');
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'admin@test.com',
        password: 'test123456',
        email_confirm: true
      });
      
      if (createError) {
        console.log('❌ Erro ao criar usuário:', createError.message);
        return;
      }
      
      console.log('✅ Usuário de teste criado:', newUser.user.email);
    }
    
    const testUser = users.users[0] || newUser.user;
    console.log('✅ Usando usuário:', testUser.email);

    console.log('\n📋 Passo 2: Simular login');
    console.log('==================================================');
    
    // Tentar fazer login com o usuário
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: testUser.email,
      password: 'test123456'
    });
    
    if (authError) {
      console.log('❌ Erro no login:', authError.message);
      console.log('   Vamos simular uma sessão autenticada...');
      
      // Simular sessão autenticada usando service role
      console.log('\n📋 Passo 3: Testar CRUD com Service Role (simulando usuário autenticado)');
      console.log('==================================================');
      
      await testCRUDOperations(supabaseAdmin, 'Service Role (simulando autenticado)');
    } else {
      console.log('✅ Login realizado com sucesso!');
      console.log('   Usuário:', authData.user.email);
      
      console.log('\n📋 Passo 3: Testar CRUD com usuário autenticado');
      console.log('==================================================');
      
      await testCRUDOperations(supabaseAnon, 'Usuário Autenticado');
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error);
  }
}

async function testCRUDOperations(client, clientType) {
  console.log(`\n🔧 Testando operações com: ${clientType}`);
  console.log('--------------------------------------------------');
  
  const tables = [
    { name: 'rooms', data: { name: `Test Room ${Date.now()}` } },
    { name: 'meds', data: { name: `Test Med ${Date.now()}`, unit: 'un' } },
    { name: 'kits', data: { key: `test_${Date.now()}`, name: `Test Kit ${Date.now()}` } }
  ];
  
  for (const table of tables) {
    console.log(`\n🔒 Testando ${table.name}...`);
    
    // Teste de leitura
    const { data: readData, error: readError } = await client
      .from(table.name)
      .select('*')
      .limit(1);
    
    if (readError) {
      console.log(`❌ ${table.name} - Erro na leitura:`, readError.message);
      continue;
    } else {
      console.log(`✅ ${table.name} - Leitura OK (${readData.length} registros)`);
    }
    
    // Teste de inserção
    const { data: insertData, error: insertError } = await client
      .from(table.name)
      .insert(table.data)
      .select()
      .single();
    
    if (insertError) {
      console.log(`❌ ${table.name} - Erro na inserção:`, insertError.message);
      console.log(`   Código: ${insertError.code}`);
      continue;
    } else {
      console.log(`✅ ${table.name} - Inserção OK`);
    }
    
    // Teste de atualização
    const updateData = table.name === 'rooms' ? { name: `Updated ${table.data.name}` } :
                      table.name === 'meds' ? { name: `Updated ${table.data.name}` } :
                      { name: `Updated ${table.data.name}` };
    
    const { error: updateError } = await client
      .from(table.name)
      .update(updateData)
      .eq('id', insertData.id);
    
    if (updateError) {
      console.log(`❌ ${table.name} - Erro na atualização:`, updateError.message);
    } else {
      console.log(`✅ ${table.name} - Atualização OK`);
    }
    
    // Teste de exclusão
    const { error: deleteError } = await client
      .from(table.name)
      .delete()
      .eq('id', insertData.id);
    
    if (deleteError) {
      console.log(`❌ ${table.name} - Erro na exclusão:`, deleteError.message);
    } else {
      console.log(`✅ ${table.name} - Exclusão OK`);
    }
  }
}

testAuthenticatedCRUD();