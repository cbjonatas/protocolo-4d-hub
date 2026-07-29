import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function PdfViewer({ filePath, title, allowDownload = true }: { filePath: string; title?: string; allowDownload?: boolean }) {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.storage.from("course-materials").createSignedUrl(filePath, 3600);
      if (!cancel) {
        setUrl(data?.signedUrl ?? "");
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [filePath]);

  if (loading) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-border bg-card md:aspect-video">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!url) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Não foi possível carregar o PDF.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
        <iframe src={url} title={title ?? "PDF"} className="h-[70vh] w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" /> Abrir em nova aba</a>
        </Button>
        {allowDownload && (
          <Button asChild size="sm" className="bg-gradient-primary shadow-glow">
            <a href={url} download><Download className="mr-1 h-4 w-4" /> Baixar</a>
          </Button>
        )}
      </div>
    </div>
  );
}
