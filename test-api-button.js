const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ahephebsevhbprhblmyb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoZXBoZWJzZXZoYnByaGJsbXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjcxNTYsImV4cCI6MjA3MTgwMzE1Nn0.mFkbHJ_uxzgi9C-4m9Rj-xWtUa63c_qhuC90rEymb60';

async function testApiButton() {
  try {
    console.log('🧪 [TEST] Testando API /api/test-order...');
    
    // Fazer login para obter session
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'teste@farmacia.com',
      password: 'teste123'
    });
    
    if (authError) {
      console.error('❌ [TEST] Erro no login:', authError);
      return;
    }
    
    console.log('✅ [TEST] Login realizado com sucesso');
    
    // Obter o token de acesso
    const accessToken = authData.session.access_token;
    
    // Fazer requisição para a API
    const response = await fetch('http://localhost:3000/api/test-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Cookie': `sb-ahephebsevhbprhblmyb-auth-token=${JSON.stringify(authData.session)}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ [TEST] API funcionou corretamente:', result);
    } else {
      console.error('❌ [TEST] Erro na API:', response.status, result);
    }
    
  } catch (error) {
    console.error('❌ [TEST] Erro inesperado:', error);
  }
}

testApiButton();