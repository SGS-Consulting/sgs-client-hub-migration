import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Receipt, Briefcase, User, LifeBuoy, LogOut, Menu, MessageCircle, Users, Scale, TrendingUp, Shield, Palette } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Inicio", url: "/portal", icon: LayoutDashboard, end: true },
  { title: "Mi información", url: "/portal/profile", icon: User },
  { title: "Documentos", url: "/portal/documents", icon: FileText },
  { title: "Facturas", url: "/portal/invoices", icon: Receipt },
  { title: "Servicios", url: "/portal/services", icon: Briefcase },
  { title: "Mi equipo", url: "/portal/workers", icon: Users },
  { title: "Preguntas", url: "/portal/queries", icon: MessageCircle },
  { title: "Consulta legal", url: "/portal/legal", icon: Scale },
  { title: "Asesoría", url: "/portal/advisory", icon: TrendingUp },
  { title: "Seguros", url: "/portal/insurance", icon: Shield },
  { title: "Branding", url: "/portal/branding", icon: Palette },
  { title: "Soporte", url: "/portal/support", icon: LifeBuoy },
];

export const ClientLayout = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const Nav = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
          end={item.end}
          onClick={onClick}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.title}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 border-b bg-card sticky top-0 z-10 flex items-center px-4 gap-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-4 w-64">
            <div className="mb-6"><BrandLogo /></div>
            <Nav onClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <BrandLogo />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Salir</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="hidden md:block w-60 border-r bg-card p-4">
          <Nav />
        </aside>
        <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
