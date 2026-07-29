import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/curso/$slug")({
  component: CourseLayout,
});

function CourseLayout() {
  return <Outlet />;
}
