
import React, { useState } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { BudgetEditor } from './components/BudgetEditor';
import { BudgetGrid } from './components/BudgetGrid';
import { Planning } from './components/Planning';
import { DataAdmin } from './components/DataAdmin';
import { ToolsManager } from './components/ToolsManager';
import { ProjectSettings } from './components/ProjectSettings';
import { MaterialReception } from './components/MaterialReception';
import { ManagementPanel } from './components/ManagementPanel';
import { Subcontractors } from './components/Subcontractors';
import { DocumentManager } from './components/DocumentManager';
import { MeasurementSheetComponent } from './components/MeasurementSheet';
import { QualityControl } from './components/QualityControl';
import { ProjectHub } from './components/ProjectHub';
import { APUBuilder } from './components/APUBuilder';
import { ProtectedLayout } from './components/ProtectedLayout';
import { Role } from './types';

// Route Protection Component (Middleware Simulation)
const RouteGuard: React.FC<{ 
  allowedRoles: Role[], 
  children: React.ReactNode 
}> = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <div className="text-4xl mb-4">🚫</div>
        <h2 className="text-xl font-bold text-slate-700">Acceso Restringido</h2>
        <p>No tienes permisos para ver este módulo.</p>
      </div>
    );
  }
  return <>{children}</>;
};

const AppContent = () => {
  const { user } = useAuth();
  const { activeProjectId } = useERP();
  const [activeTab, setActiveTab] = useState('dashboard');

  // STATE 1: Unauthenticated
  if (!user) {
    return <Login />;
  }

  // STATE 2: Authenticated but No Project Selected -> HUB
  if (!activeProjectId) {
      return (
        <ProtectedLayout>
          <ProjectHub />
        </ProtectedLayout>
      );
  }

  // STATE 3: Active Project (Main Layout)
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': 
        return <RouteGuard allowedRoles={['admin', 'engineering', 'foreman', 'client']}><Dashboard /></RouteGuard>;
      case 'management': 
        return <RouteGuard allowedRoles={['admin', 'engineering', 'client']}><ManagementPanel /></RouteGuard>;
      case 'subcontractors': 
        return <RouteGuard allowedRoles={['admin', 'engineering']}><Subcontractors /></RouteGuard>;
      case 'budget': 
        return <RouteGuard allowedRoles={['admin', 'engineering']}><BudgetEditor /></RouteGuard>;
      case 'apu':
        return <RouteGuard allowedRoles={['admin', 'engineering']}><APUBuilder /></RouteGuard>;
      case 'grid': 
        return <RouteGuard allowedRoles={['admin', 'engineering']}><BudgetGrid /></RouteGuard>;
      case 'planning': 
        return <RouteGuard allowedRoles={['admin', 'engineering', 'foreman']}><Planning /></RouteGuard>;
      case 'reception': 
        return <RouteGuard allowedRoles={['admin', 'foreman']}><MaterialReception /></RouteGuard>;
      case 'tools': 
        return <RouteGuard allowedRoles={['admin', 'engineering']}><ToolsManager /></RouteGuard>;
      case 'admin': 
        return <RouteGuard allowedRoles={['admin', 'engineering']}><DataAdmin /></RouteGuard>;
      case 'settings': 
        return <RouteGuard allowedRoles={['admin']}><ProjectSettings /></RouteGuard>;
      case 'documents':
        return <RouteGuard allowedRoles={['admin', 'engineering', 'foreman', 'client']}><DocumentManager /></RouteGuard>;
      case 'measurements':
        return <RouteGuard allowedRoles={['admin', 'engineering']}><MeasurementSheetComponent /></RouteGuard>;
      case 'quality':
        return <RouteGuard allowedRoles={['admin', 'engineering', 'foreman']}><QualityControl /></RouteGuard>;
      default: return <Dashboard />;
    }
  };

  return (
    <ProtectedLayout>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
      </Layout>
    </ProtectedLayout>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ERPProvider>
        <AppContent />
      </ERPProvider>
    </AuthProvider>
  );
};

export default App;
