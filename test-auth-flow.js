require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthFlow() {
  console.log('🔐 Teste de Fluxo de Autenticação');
  console.log('==================================================\n');

  try {
    // Passo 1: Verificar se existe usuário de teste
    console.log('📋 Passo 1: Verificar usuários existentes');
    console.log('==================================================');
    
    // Usar service role para listar usuários
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.log('❌ Service role key não encontrada');
      return;
    }
    
    const supabaseService = createClient(supabaseUrl, serviceRoleKey);
    
    // Verificar se existe usuário admin
    const { data: profiles, error: profilesError } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Erro ao buscar perfis:', profilesError.message);
      return;
    }
    
    if (profiles && profiles.length > 0) {
      console.log('✅ Usuário admin encontrado:', profiles[0].email);
      
      // Passo 2: Tentar fazer login com o usuário admin
      console.log('\n📋 Passo 2: Teste de Login');
      console.log('==================================================');
      
      // Simular login (não podemos fazer login real via script)
      console.log('⚠️  Não é possível fazer login real via script');
      console.log('   Vamos simular uma sessão autenticada...');
      
      // Passo 3: Testar operações CRUD com usuário simulado
      console.log('\n📋 Passo 3: Teste de CRUD com Usuário Simulado');
      console.log('==================================================');
      
      // Criar um cliente com RLS bypass para simular usuário autenticado
      await testCrudWithAuth(supabaseService, profiles[0]);
      
    } else {
      console.log('⚠️  Nenhum usuário admin encontrado');
      console.log('   Criando usuário admin de teste...');
      
      // Criar usuário admin de teste
      const testEmail = 'admin@test.com';
      const testPassword = 'admin123456';
      
      const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      });
      
      if (authError) {
        console.log('❌ Erro ao criar usuário:', authError.message);
        return;
      }
      
      // Criar perfil admin
      const { error: profileError } = await supabaseService
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: testEmail,
          full_name: 'Admin Teste',
          role: 'admin'
        });
      
      if (profileError) {
        console.log('❌ Erro ao criar perfil:', profileError.message);
      } else {
        console.log('✅ Usuário admin criado:', testEmail);
        console.log('   Senha:', testPassword);
      }
    }
    
    // Passo 4: Verificar políticas RLS
    console.log('\n📋 Passo 4: Verificar Políticas RLS');
    console.log('==================================================');
    
    await checkRLSPolicies(supabaseService);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

async function testCrudWithAuth(client, userProfile) {
  console.log(`\n🔧 Testando CRUD como usuário: ${userProfile.email}`);
  console.log('--------------------------------------------------');
  
  try {
    // Teste 1: Criar sala
    console.log('➕ Testando criação de sala...');
    const { data: newRoom, error: createError } = await client
      .from('rooms')
      .insert([{ name: 'Sala Auth Test', active: true }])
      .select('*')
      .single();
    
    if (createError) {
      console.log('❌ Erro ao criar sala:', createError.message);
    } else {
      console.log('✅ Sala criada com sucesso:', newRoom.name);
      
      // Teste 2: Listar salas
      console.log('📖 Testando listagem de salas...');
      const { data: rooms, error: readError } = await client
        .from('rooms')
        .select('*')
        .limit(5);
      
      if (readError) {
        console.log('❌ Erro ao listar salas:', readError.message);
      } else {
        console.log(`✅ ${rooms.length} salas encontradas`);
      }
      
      // Teste 3: Atualizar sala
      console.log('✏️  Testando atualização de sala...');
      const { error: updateError } = await client
        .from('rooms')
        .update({ name: 'Sala Auth Test - Atualizada' })
        .eq('id', newRoom.id);
      
      if (updateError) {
        console.log('❌ Erro ao atualizar sala:', updateError.message);
      } else {
        console.log('✅ Sala atualizada com sucesso');
      }
      
      // Teste 4: Excluir sala
      console.log('🗑️  Testando exclusão de sala...');
      const { error: deleteError } = await client
        .from('rooms')
        .delete()
        .eq('id', newRoom.id);
      
      if (deleteError) {
        console.log('❌ Erro ao excluir sala:', deleteError.message);
      } else {
        console.log('✅ Sala excluída com sucesso');
      }
    }
  } catch (error) {
    console.log('❌ Erro no teste CRUD:', error.message);
  }
}

async function checkRLSPolicies(client) {
  console.log('🔒 Verificando políticas RLS...');
  console.log('--------------------------------------------------');
  
  try {
    // Verificar se RLS está habilitado nas tabelas
    const tables = ['rooms', 'meds', 'kits'];
    
    for (const table of tables) {
      const { data, error } = await client
        .rpc('check_table_rls', { table_name: table })
        .single();
      
      if (error) {
        console.log(`⚠️  Não foi possível verificar RLS para ${table}:`, error.message);
      } else {
        console.log(`📋 Tabela ${table}: RLS ${data ? 'habilitado' : 'desabilitado'}`);
      }
    }
    
    // Verificar permissões das roles
    console.log('\n🔑 Verificando permissões das roles...');
    const { data: permissions, error: permError } = await client
      .from('information_schema.role_table_grants')
      .select('grantee, table_name, privilege_type')
      .in('grantee', ['anon', 'authenticated'])
      .in('table_name', ['rooms', 'meds', 'kits'])
      .eq('table_schema', 'public');
    
    if (permError) {
      console.log('❌ Erro ao verificar permissões:', permError.message);
    } else {
      console.log('✅ Permissões encontradas:');
      permissions.forEach(perm => {
        console.log(`   ${perm.grantee}: ${perm.privilege_type} em ${perm.table_name}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar políticas:', error.message);
  }
}

testAuthFlow();