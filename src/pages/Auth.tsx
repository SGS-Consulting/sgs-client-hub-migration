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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const emailSchema = z.string().trim().email("Correo inválido").max(255);
const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(72);
const nameSchema = z.string().trim().min(2, "Nombre demasiado corto").max(120);

const Auth = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupCompany, setSignupCompany] = useState("");

  // If already logged in, redirect
  useEffect(() => {
    if (!authLoading && user && role) {
      navigate(role === "admin" ? "/admin" : "/portal", { replace: true });
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(signupName);
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      nameSchema.parse(signupCompany);
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? "Datos inválidos");
      return;
    }
    setLoading(true);
    const redirectUrl = `${window.location.origin}/portal`;
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: signupName,
        },
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Create client record linked to this user
    if (data.user) {
      const { error: clientError } = await supabase.from("clients").insert({
        user_id: data.user.id,
        company_name: signupCompany,
        contact_name: signupName,
        email: signupEmail,
        status: "prospect",
      });
      if (clientError) {
        // not critical for auth; admin can fix later
        console.error("Could not create client row:", clientError);
      }
    }

    setLoading(false);
    toast.success("Cuenta creada. ¡Bienvenido!");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-brand text-brand-foreground p-12">
        <BrandLogo variant="dark" className="h-12" />
        <div className="space-y-4 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Plataforma de gestión integral
          </h1>
          <p className="text-brand-foreground/80 text-lg">
            Gestiona tu información, documentos, facturas y servicios con SGS Consulting Group desde un solo lugar.
          </p>
        </div>
        <p className="text-sm text-brand-foreground/60">
          © {new Date().getFullYear()} SGS Consulting Group. All rights reserved.
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandLogo />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Bienvenido de vuelta</CardTitle>
                  <CardDescription>Accede a tu portal de cliente o panel administrativo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Correo</Label>
                      <Input id="login-email" type="email" required value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <Input id="login-password" type="password" required value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)} autoComplete="current-password" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Entrar
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Crea tu cuenta de cliente</CardTitle>
                  <CardDescription>Comienza a gestionar tu relación con SGS Consulting Group.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nombre completo</Label>
                      <Input id="signup-name" required value={signupName}
                        onChange={(e) => setSignupName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-company">Empresa</Label>
                      <Input id="signup-company" required value={signupCompany}
                        onChange={(e) => setSignupCompany(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Correo</Label>
                      <Input id="signup-email" type="email" required value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Contraseña</Label>
                      <Input id="signup-password" type="password" required value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)} autoComplete="new-password" />
                      <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Crear cuenta
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
