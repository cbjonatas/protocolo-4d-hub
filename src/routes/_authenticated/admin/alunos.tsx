import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/alunos")({
  head: () => ({ meta: [{ title: "Admin — Alunos" }, { name: "robots", content: "noindex" }] }),
  component: AdminStudents,
});

function AdminStudents() {
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="rounded-2xl border border-border bg-card shadow-elegant">
      <div className="border-b border-border p-5">
        <h2 className="font-display text-lg font-semibold">Alunos cadastrados</h2>
        <p className="text-sm text-muted-foreground">Total: {students.length}</p>
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">E-mail</th>
                <th className="px-5 py-3">WhatsApp</th>
                <th className="px-5 py-3">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{s.full_name || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-5 py-3 text-muted-foreground">{s.whatsapp || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
