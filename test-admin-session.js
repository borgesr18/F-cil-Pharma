// Teste para verificar sessão do usuário na página Admin
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente ausentes');
  process.exit(1);
}

async function testAdminSession() {
  console.log('🔍 Teste de Sessão - Página Admin');
  console.log('==================================================\n');

  // Cliente anônimo (como usado na página admin)
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('📋 Teste 1: Cliente Anônimo (como na página admin)');
  console.log('==================================================');
  
  // Verificar se há usuário logado
  const { data: { user }, error: userError } = await anonClient.auth.getUser();
  
  if (userError) {
    console.log('❌ Erro ao obter usuário:', userError.message);
  } else if (user) {
    console.log('✅ Usuário encontrado:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
  } else {
    console.log('❌ Nenhum usuário logado');
  }
  
  // Testar operação que requer autenticação
  console.log('\n🔧 Testando INSERT em rooms (requer auth):');
  const { data: insertData, error: insertError } = await anonClient
    .from('rooms')
    .insert({ name: 'Teste Session', active: true })
    .select()
    .single();
    
  if (insertError) {
    console.log('❌ Erro esperado:', insertError.message);
  } else {
    console.log('✅ Sucesso inesperado:', insertData);
    // Limpar teste
    await anonClient.from('rooms').delete().eq('id', insertData.id);
  }
  
  console.log('\n📋 Teste 2: Cliente Service Role (para comparação)');
  console.log('==================================================');
  
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: serviceInsert, error: serviceError } = await serviceClient
    .from('rooms')
    .insert({ name: 'Teste Service', active: true })
    .select()
    .single();
    
  if (serviceError) {
    console.log('❌ Erro inesperado:', serviceError.message);
  } else {
    console.log('✅ Sucesso esperado:', serviceInsert);
    // Limpar teste
    await serviceClient.from('rooms').delete().eq('id', serviceInsert.id);
  }
  
  console.log('\n🎯 Diagnóstico:');
  console.log('==================================================');
  console.log('1. Se o cliente anônimo não tem usuário logado, isso explica');
  console.log('   por que as operações CRUD falham na página admin.');
  console.log('2. A página admin precisa de um mecanismo para manter a sessão');
  console.log('   do usuário autenticado.');
  console.log('3. Possíveis soluções:');
  console.log('   - Usar useEffect para verificar/restaurar sessão');
  console.log('   - Implementar context de autenticação');
  console.log('   - Verificar se cookies de sessão estão sendo mantidos');
}

// Executar teste
testAdminSession().catch(console.error);