import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Pedidos & Farmácia</h1>
        <p className="text-gray-600">Sistema de Gestão Hospitalar</p>
        
        <div className="space-y-4">
          <Link 
            href="/signin" 
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Entrar no Sistema
          </Link>
          
          <Link 
            href="/dashboard" 
            className="block w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}