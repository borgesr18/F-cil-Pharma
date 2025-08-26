import Link from 'next/link';
import { Stethoscope, Shield, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8 max-w-md mx-auto p-6">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-4 rounded-full">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Fácil Pharma</h1>
          <p className="text-lg text-gray-600">Sistema de Gestão Hospitalar</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <Shield className="h-6 w-6 text-blue-600 mx-auto" />
            <p className="text-sm text-gray-600">Seguro</p>
          </div>
          <div className="space-y-2">
            <Clock className="h-6 w-6 text-blue-600 mx-auto" />
            <p className="text-sm text-gray-600">Rápido</p>
          </div>
          <div className="space-y-2">
            <Stethoscope className="h-6 w-6 text-blue-600 mx-auto" />
            <p className="text-sm text-gray-600">Confiável</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/signin" 
            className="block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Entrar no Sistema
          </Link>
          
          <Link 
            href="/signup" 
            className="block border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-200"
          >
            Criar Conta
          </Link>
        </div>
      </div>
    </div>
  );
}