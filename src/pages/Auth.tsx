import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import authIllustration from "@/assets/auth-illustration.jpg";

const emailSchema = z.string().trim().email("Correo inválido").max(255);
const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(72);

const Auth = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    if (!authLoading && user && role) {
      navigate(role !== "client" ? "/admin" : "/portal", { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "Datos inválidos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "Correo o contraseña incorrectos"
        : error.message);
      return;
    }
    toast.success("Bienvenido");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Panel izquierdo: marca */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-brand text-brand-foreground p-12 relative overflow-hidden">
        <BrandLogo variant="dark" className="h-12 relative z-10" />
        <div className="relative z-10 flex justify-center">
          <img
            src={authIllustration}
            alt=""
            width={520}
            height={520}
            className="w-full max-w-md h-auto object-contain drop-shadow-2xl"
          />
        </div>
        <div className="space-y-3 max-w-md relative z-10">
          <h1 className="text-3xl font-bold leading-tight">
            Plataforma de gestión integral
          </h1>
          <p className="text-brand-foreground/70">
            Gestiona tu información, documentos, facturas y servicios con SGS Consulting Group desde un solo lugar.
          </p>
          <p className="text-xs text-brand-foreground/50 pt-4">
            © {new Date().getFullYear()} SGS Consulting Group. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandLogo />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Iniciar sesión</CardTitle>
              <CardDescription>
                Accede con las credenciales que te proporcionó el administrador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-6 text-center">
                Sistema de acceso restringido. Si necesitas una cuenta, contacta al administrador.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
