
import React from 'react';
import { useAuthRole } from '../hooks/useAuthRole';
import { Login } from './Login';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children }) => {
  const { role, loading, userId } = useAuthRole();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 size={40} className="animate-spin mb-4 text-blue-600" />
        <p className="text-sm font-medium tracking-wide uppercase">Verificando Credenciales de Seguridad...</p>
      </div>
    );
  }

  // If not authenticated, show Login (Login will handle Supabase or Mock auth via Context)
  if (!userId) {
    return <Login />;
  }

  // If authenticated but no role found
  if (!role) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md text-center border-t-4 border-red-600">
          <ShieldAlert size={64} className="mx-auto text-red-600 mb-6" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acceso Denegado</h1>
          <p className="text-slate-500 mb-6">
            Su cuenta no tiene un rol asignado en el sistema. Contacte al administrador.
          </p>
          <div className="text-xs text-slate-400 font-mono bg-slate-50 p-2 rounded">
            Error: NO_ROLE_ASSIGNED_RBAC
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
       {role === 'client' && (
         <div className="bg-blue-600 text-white text-[10px] uppercase font-bold text-center py-1 tracking-widest relative z-50">
           Modo Invitado - Visualización Restringida
         </div>
       )}
       {children}
    </div>
  );
};
