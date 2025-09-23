import { useState } from "react";
import { Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { ClientesView } from "@/components/ClientesView";
import { TerrenosView } from "@/components/TerrenosView";
import { VentasView } from "@/components/VentasView";
import { DashboardHome } from "@/components/DashboardHome";
import { HistorialView } from "@/components/HistorialView";

export type DashboardView = 'home' | 'clientes' | 'terrenos' | 'ventas' | 'historial';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView>('home');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <DashboardHome />;
      case 'clientes':
        return <ClientesView />;
      case 'terrenos':
        return <TerrenosView />;
      case 'ventas':
        return <VentasView />;
      case 'historial':
        return <HistorialView />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b flex items-center px-6">
            <SidebarTrigger />
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-primary">Monte Sagrado</h1>
              <p className="text-sm text-muted-foreground">Sistema de Gestión del Cementerio</p>
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {renderView()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;