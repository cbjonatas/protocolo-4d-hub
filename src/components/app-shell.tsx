import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Shield, LayoutDashboard, BookOpen, TrendingUp, User, LogOut, Menu, X, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";

async function fetchProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
  return {
    user: u.user,
    profile,
    isAdmin: (roles ?? []).some((r) => r.role === "admin"),
  };
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: fetchProfile });
}

const navItems = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/curso/protocolo-4d", label: "Protocolo 4D", icon: Sparkles },
  { to: "/progresso", label: "Meu Progresso", icon: TrendingUp },
  { to: "/perfil", label: "Perfil", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const firstName = data?.profile?.full_name?.split(" ")[0] ?? "Aluno";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="hidden font-display text-sm font-bold sm:block">
                Informática <span className="text-gold">com Jhon</span>
              </div>
            </Link>
            <nav className="hidden gap-1 md:flex">
              {navItems.map((item) => {
                const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    }`}
                  >
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Link>
                );
              })}
              {data?.isAdmin && (
                <Link
                  to="/admin"
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin") ? "bg-gold text-gold-foreground" : "text-gold hover:bg-gold/10"
                  }`}
                >
                  <BookOpen className="h-4 w-4" /> Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="text-xs text-muted-foreground">Olá,</div>
              <div className="text-sm font-medium">{firstName}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden md:inline-flex" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((o) => !o)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border bg-background md:hidden">
            <nav className="container mx-auto flex flex-col gap-1 px-4 py-3">
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent">
                  <item.icon className="h-4 w-4" /> {item.label}
                </Link>
              ))}
              {data?.isAdmin && (
                <Link to="/admin" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gold hover:bg-gold/10">
                  <BookOpen className="h-4 w-4" /> Admin
                </Link>
              )}
              <button onClick={handleSignOut} className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </nav>
          </div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
