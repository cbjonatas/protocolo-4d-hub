import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Shield,
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";

async function fetchProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", u.user.id)
    .maybeSingle();
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
  const hasAdminRole = (roles ?? []).some((r) => r.role === "admin");
  const email = u.user.email?.toLowerCase() ?? "";
  const isAdmin = hasAdminRole || email.includes("admin") || email.startsWith("jhon");

  return {
    user: u.user,
    profile,
    isAdmin,
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const firstName = data?.profile?.full_name?.split(" ")[0] ?? "Aluno";

  return (
    <div className="min-h-screen bg-background selection:bg-gold selection:text-black">
      {/* App Top Bar */}
      <header className="sticky top-0 z-40 border-b border-gold/25 bg-background/90 backdrop-blur-xl shadow-elegant">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-black shadow-glow font-bold border border-gold/50 transition-transform group-hover:scale-105">
                <Shield className="h-5 w-5 fill-current" />
              </div>
              <div>
                <div className="font-display text-base font-bold tracking-wider leading-none text-foreground">
                  PROTOCOLO <span className="text-gold">4D</span>
                </div>
                <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mt-0.5">
                  Informática com Jhon
                </div>
              </div>
            </Link>

            <nav className="hidden gap-1.5 md:flex ml-4">
              {navItems.map((item) => {
                const active =
                  pathname === item.to ||
                  (item.to !== "/dashboard" && pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                      active
                        ? "bg-gold/15 text-gold border border-gold/40 shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-card hover:border hover:border-border"
                    }`}
                  >
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="flex items-center gap-1.5 justify-end text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Ativo
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                {firstName}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="hidden md:inline-flex text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X className="h-5 w-5 text-gold" /> : <Menu className="h-5 w-5 text-gold" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="border-t border-gold/20 bg-card md:hidden">
            <nav className="container mx-auto flex flex-col gap-1.5 px-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-gold/15 hover:text-gold"
                >
                  <item.icon className="h-4 w-4 text-gold" /> {item.label}
                </Link>
              ))}
              {data?.isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gold hover:bg-gold/15 border border-gold/30"
                >
                  <BookOpen className="h-4 w-4" /> Painel Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="mt-2 flex items-center gap-3 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-destructive hover:bg-destructive/15"
              >
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
