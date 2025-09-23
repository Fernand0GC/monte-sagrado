import { Home, Users, MapPin, ShoppingCart, History, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { DashboardView } from "./Dashboard";

const menuItems = [
  { id: 'home' as DashboardView, title: "Dashboard", icon: Home },
  { id: 'clientes' as DashboardView, title: "Clientes", icon: Users },
  { id: 'terrenos' as DashboardView, title: "Terrenos", icon: MapPin },
  { id: 'ventas' as DashboardView, title: "Ventas", icon: ShoppingCart },
  { id: 'historial' as DashboardView, title: "Historial", icon: History },
];

interface AppSidebarProps {
  currentView: DashboardView;
  setCurrentView: (view: DashboardView) => void;
}

export function AppSidebar({ currentView, setCurrentView }: AppSidebarProps) {
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const collapsed = state === "collapsed";

  const handleSignOut = () => {
    signOut();
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setCurrentView(item.id)}
                    isActive={currentView === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          {!collapsed && (
            <div className="mb-4 text-sm text-muted-foreground">
              <p>Conectado como:</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          )}
          <SidebarMenuButton onClick={handleSignOut} className="w-full">
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Cerrar Sesión</span>}
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}