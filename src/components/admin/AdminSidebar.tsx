import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  FileText,
  Receipt,
  Briefcase,
  UsersRound,
  Settings,
  LogOut,
  FolderKanban,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { can, ROLE_LABELS, type Capability } from "@/lib/permissions";

type Item = { title: string; url: string; icon: any; end?: boolean; cap: Capability };

const mainItems: Item[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true, cap: "view:dashboard" },
  { title: "Centro de trabajo", url: "/admin/tasks", icon: KanbanSquare, end: true, cap: "view:tasks" },
  { title: "Workspaces", url: "/admin/tasks/workspaces", icon: FolderKanban, cap: "view:workspaces" },
  { title: "Clientes", url: "/admin/clients", icon: Users, cap: "view:clients" },
  { title: "Documentos", url: "/admin/documents", icon: FileText, cap: "view:documents" },
  { title: "Facturas", url: "/admin/invoices", icon: Receipt, cap: "view:finance" },
];

const opsItems: Item[] = [
  { title: "Servicios", url: "/admin/services", icon: Briefcase, cap: "view:services" },
  { title: "Equipo", url: "/admin/team", icon: UsersRound, cap: "view:team" },
  { title: "Configuración", url: "/admin/settings", icon: Settings, cap: "view:settings" },
];

export const AdminSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, role, roles } = useAuth();
  const location = useLocation();

  const isActive = (path: string, end?: boolean) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  const renderItems = (items: Item[]) => {
    const visible = items.filter((i) => can(roles, i.cap));
    if (visible.length === 0) return null;
    return (
      <SidebarMenu>
        {visible.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild isActive={isActive(item.url, item.end)}>
              <NavLink to={item.url} end={item.end}>
                <item.icon className="h-4 w-4" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  };

  const mainContent = renderItems(mainItems);
  const opsContent = renderItems(opsItems);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <BrandLogo variant="dark" className="h-8" />
        </div>
        {!collapsed && role && (
          <p className="mt-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
            {ROLE_LABELS[role]}
          </p>
        )}
      </SidebarHeader>

      <SidebarContent>
        {mainContent && (
          <SidebarGroup>
            <SidebarGroupLabel>Operación</SidebarGroupLabel>
            <SidebarGroupContent>{mainContent}</SidebarGroupContent>
          </SidebarGroup>
        )}

        {opsContent && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>{opsContent}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Cerrar sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
