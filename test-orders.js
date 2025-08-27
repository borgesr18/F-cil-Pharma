import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas')
  process.exit(1)
}

console.log('🔍 Testando acesso aos pedidos...')
console.log('URL:', supabaseUrl)
console.log('Anon Key:', supabaseAnonKey?.substring(0, 20) + '...')

// Cliente com chave anônima
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)

// Cliente com service role (se disponível)
const supabaseService = supabaseServiceKey ? 
  createClient(supabaseUrl, supabaseServiceKey) : null

async function testOrderAccess() {
  try {
    console.log('\n1. Testando com cliente anônimo:')
    const { data: anonOrders, error: anonError } = await supabaseAnon
      .from('orders')
      .select('*')
    
    if (anonError) {
      console.log('❌ Erro com cliente anônimo:', anonError)
    } else {
      console.log('✅ Cliente anônimo - Encontrados', anonOrders?.length || 0, 'pedidos')
      if (anonOrders?.length > 0) {
        console.log('Primeiro pedido:', anonOrders[0])
      }
    }

    if (supabaseService) {
      console.log('\n2. Testando com service role:')
      const { data: serviceOrders, error: serviceError } = await supabaseService
        .from('orders')
        .select('*')
      
      if (serviceError) {
        console.log('❌ Erro com service role:', serviceError)
      } else {
        console.log('✅ Service role - Encontrados', serviceOrders?.length || 0, 'pedidos')
        if (serviceOrders?.length > 0) {
          console.log('Primeiro pedido:', serviceOrders[0])
        }
      }
    } else {
      console.log('\n2. Service role key não disponível')
    }

    console.log('\n3. Testando políticas RLS:')
    const { data: policies, error: policiesError } = await supabaseAnon
      .rpc('get_policies', { table_name: 'orders' })
      .single()
    
    if (policiesError) {
      console.log('❌ Erro ao buscar políticas:', policiesError)
    } else {
      console.log('✅ Políticas encontradas:', policies)
    }

    console.log('\n4. Testando autenticação:')
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser()
    
    if (authError) {
      console.log('❌ Erro de autenticação:', authError)
    } else {
      console.log('👤 Usuário atual:', user ? user.id : 'Não autenticado')
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

testOrderAccess()