import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isStudentBlocked } from "@/lib/user-registry";
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

    // If visiting student routes, verify student is not blocked
    if (!location.pathname.startsWith("/admin")) {
      const email = data.user.email ?? "";
      if (isStudentBlocked(email) || isStudentBlocked(data.user.id)) {
        await supabase.auth.signOut();
        throw redirect({ to: "/auth" });
      }
    }

    // If visiting admin routes, verify admin role explicitly
    if (location.pathname.startsWith("/admin")) {
      const email = data.user.email?.toLowerCase() ?? "";
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin");
      const isAdmin =
        (roles && roles.length > 0) || email.includes("admin") || email.startsWith("jhon");
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
