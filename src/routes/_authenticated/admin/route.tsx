import { createFileRoute, Outlet, Link, useRouterState, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
    if (!roles || roles.length === 0) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

const adminNav = [
  { to: "/admin", label: "Painel", icon: LayoutDashboard, exact: true },
  { to: "/admin/alunos", label: "Alunos", icon: Users },
  { to: "/admin/cursos", label: "Cursos", icon: BookOpen },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="rounded-md bg-gradient-gold px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold-foreground">Admin</div>
        <h1 className="font-display text-2xl font-bold">Painel Administrativo</h1>
      </div>
      <nav className="mb-8 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1 shadow-elegant">
        {adminNav.map((n) => {
          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active ? "bg-gradient-primary text-primary-foreground" : "hover:bg-accent"}`}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
