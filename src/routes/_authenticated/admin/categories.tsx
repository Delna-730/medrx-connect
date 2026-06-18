import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  async function add() {
    if (!name.trim()) return toast.error("Name required");
    const { error } = await supabase.from("categories").insert({ name: name.trim(), description: desc.trim() || null });
    if (error) return toast.error(error.message);
    setName(""); setDesc("");
    qc.invalidateQueries({ queryKey: ["categories"] });
    toast.success("Category added");
  }

  async function remove(id: string) {
    if (!confirm("Delete category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">Organize medicines by therapeutic class.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Add category</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Button onClick={add}><Plus className="h-4 w-4" /></Button>
        </CardContent>
      </Card>
      <div className="rounded-lg border bg-card divide-y">
        {isLoading && <div className="p-4 text-muted-foreground">Loading…</div>}
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-medium">{c.name}</div>
              {c.description && <div className="text-sm text-muted-foreground">{c.description}</div>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
