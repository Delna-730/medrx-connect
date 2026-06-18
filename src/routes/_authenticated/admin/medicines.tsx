import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MedicineDialog } from "@/components/medicine-dialog";
import type { Tables } from "@/integrations/supabase/types";

type Medicine = Tables<"medicines">;

export const Route = createFileRoute("/_authenticated/admin/medicines")({
  component: MedicinesPage,
});

function MedicinesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [open, setOpen] = useState(false);

  const { data: medicines = [], isLoading } = useQuery({
    queryKey: ["medicines", search],
    queryFn: async () => {
      let q = supabase.from("medicines").select("*").order("created_at", { ascending: false });
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`name.ilike.${s},generic_name.ilike.${s},manufacturer.ilike.${s},batch_number.ilike.${s}`);
      }
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data as Medicine[];
    },
  });

  async function onDelete(m: Medicine) {
    if (!confirm(`Delete ${m.name}?`)) return;
    const { error } = await supabase.from("medicines").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Medicine deleted");
    qc.invalidateQueries({ queryKey: ["medicines"] });
  }

  function stockBadge(m: Medicine) {
    if (m.current_stock === 0) return <Badge variant="destructive">Out of stock</Badge>;
    if (m.current_stock < m.minimum_stock_alert) return <Badge className="bg-warning text-warning-foreground hover:bg-warning">Low</Badge>;
    return <Badge className="bg-success text-success-foreground hover:bg-success">In stock</Badge>;
  }

  function expiryWarn(m: Medicine) {
    if (!m.expiry_date) return null;
    const d = new Date(m.expiry_date);
    const days = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <Badge variant="destructive" className="ml-2">Expired</Badge>;
    if (days <= 90) return <Badge variant="outline" className="ml-2 border-warning text-warning-foreground"><AlertTriangle className="h-3 w-3 mr-1" />{days}d</Badge>;
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Medicines</h1>
          <p className="text-sm text-muted-foreground">Manage your wholesale catalog.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add medicine
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name, generic, manufacturer, batch…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Batch / Expiry</TableHead>
              <TableHead className="text-right">MRP</TableHead>
              <TableHead className="text-right">Wholesale</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : medicines.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No medicines yet. Add your first one.</TableCell></TableRow>
            ) : medicines.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.generic_name}</div>
                </TableCell>
                <TableCell>{m.manufacturer}</TableCell>
                <TableCell className="text-sm">
                  <div>{m.batch_number ?? "—"}</div>
                  <div className="text-xs text-muted-foreground flex items-center">
                    {m.expiry_date ?? "—"}{expiryWarn(m)}
                  </div>
                </TableCell>
                <TableCell className="text-right">₹{Number(m.mrp).toFixed(2)}</TableCell>
                <TableCell className="text-right">₹{Number(m.wholesale_price).toFixed(2)}</TableCell>
                <TableCell className="text-right">{m.current_stock}</TableCell>
                <TableCell>{stockBadge(m)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(m)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MedicineDialog open={open} onOpenChange={setOpen} medicine={editing} onSaved={() => qc.invalidateQueries({ queryKey: ["medicines"] })} />
    </div>
  );
}
