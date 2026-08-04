import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, BookOpen, LogOut, Shield, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    // Parent /_authenticated already verified admin role.
    // Upsert admin role to ensure Supabase RLS grants full data access.
    const { data: u } = await supabase.auth.getUser();
    if (u?.user) {
      const email = u.user.email?.toLowerCase() ?? "";
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin");
      const hasAdminRole = roles && roles.length > 0;
      if (!hasAdminRole && email === "admin@protocolo4d.com") {
        await supabase
          .from("user_roles")
          .upsert({ user_id: u.user.id, role: "admin" }, { onConflict: "user_id,role" });
      }
    }
  },
  component: AdminLayout,
});

const adminNav = [
  { to: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/alunos", label: "Gestão de Alunos", icon: Users },
  { to: "/admin/cursos", label: "Aulas & Conteúdos", icon: BookOpen },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  async function handleAdminSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin-login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-gold selection:text-black">
      {/* Dedicated Admin Shell Header */}
      <header className="sticky top-0 z-40 border-b border-gold/30 bg-background/95 backdrop-blur-xl shadow-elegant">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold text-black shadow-glow font-bold border border-gold/50">
              <KeyRound className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-wider leading-none text-foreground">
                PAINEL <span className="text-gold">ADMINISTRATIVO</span>
              </div>
              <div className="text-[10px] font-semibold tracking-widest text-gold uppercase mt-0.5">
                PROTOCOLO 4D • SISTEMA INDEPENDENTE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdminSignOut}
              className="border-destructive/40 text-destructive hover:bg-destructive/15 text-xs font-bold uppercase tracking-wider"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sair do Admin
            </Button>
          </div>
        </div>
      </header>

      {/* Admin Content Area */}
      <main className="container mx-auto px-4 py-8">
        <nav className="mb-8 flex flex-wrap gap-2 rounded-2xl tactical-card p-1.5 shadow-elegant">
          {adminNav.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  active
                    ? "bg-gradient-gold text-black shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                }`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <Outlet />
      </main>
    </div>
  );
}
