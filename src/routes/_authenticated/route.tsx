import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isStudentBlocked, getRegisteredStudents } from "@/lib/user-registry";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      // Unauthenticated: send admin routes to admin-login, students to /auth
      if (location.pathname.startsWith("/admin")) {
        throw redirect({ to: "/admin-login" });
      }
      throw redirect({ to: "/auth" });
    }

    const email = data.user.email?.toLowerCase() ?? "";

    // If visiting student routes, verify profile exists (auto-create if missing) and check block status
    if (!location.pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_blocked")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile) {
        // Auto-create profile for authenticated user
        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            email: email,
            full_name: data.user.user_metadata?.full_name ?? email.split("@")[0],
            whatsapp: data.user.user_metadata?.whatsapp ?? "",
            is_blocked: false,
          },
          { onConflict: "id" }
        );
      } else if (profile.is_blocked || isStudentBlocked(email) || isStudentBlocked(data.user.id)) {
        await supabase.auth.signOut();
        throw redirect({ to: "/auth", search: { blocked: "1" } });
      }
    }

    // If visiting admin routes, verify admin role explicitly
    if (location.pathname.startsWith("/admin")) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin");
      const isAdmin =
        email === "admin@protocolo4d.com" || (roles && roles.length > 0);
      if (!isAdmin) {
        throw redirect({ to: "/admin-login" });
      }
    }

    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // If visiting admin routes, do NOT render student AppShell layout!
  if (pathname.startsWith("/admin")) {
    return <Outlet />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
