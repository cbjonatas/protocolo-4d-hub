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

    // If visiting student routes, verify student is REGISTERED in admin management and NOT blocked
    if (!location.pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_blocked")
        .or(`id.eq.${data.user.id},email.eq.${email}`)
        .maybeSingle();

      const localStudent = getRegisteredStudents().find(
        (s: any) => s.id === data.user.id || s.email?.toLowerCase() === email
      );

      // Rule: NO USER CAN ACCESS UNLESS REGISTERED IN ADMIN MANAGEMENT
      if (!profile && !localStudent) {
        await supabase.auth.signOut();
        throw redirect({ to: "/auth", search: { unapproved: "1" } });
      }

      // Rule: NO BLOCKED USER CAN ACCESS
      const isBlockedInDb = profile?.is_blocked === true;
      const isBlockedInLocal = localStudent?.is_blocked === true || isStudentBlocked(email) || isStudentBlocked(data.user.id);

      if (isBlockedInDb || isBlockedInLocal) {
        await supabase.auth.signOut();
        throw redirect({ to: "/auth", search: { blocked: "1" } });
      }
    }

    // If visiting admin routes, verify admin role explicitly
    if (location.pathname.startsWith("/admin")) {
      if (email === "professorjonatasg@gmail.com") {
        throw redirect({ to: "/admin-login" });
      }

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
