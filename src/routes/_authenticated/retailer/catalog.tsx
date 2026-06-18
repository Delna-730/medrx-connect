import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Plus, Pill as PillIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/retailer/catalog")({
  component: CatalogPage,
});

function CatalogPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const { add } = useCart();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: medicines = [], isLoading } = useQuery({
    queryKey: ["catalog", search, categoryId],
    queryFn: async () => {
      let q = supabase
        .from("medicines")
        .select("*")
        .eq("is_active", true)
        .gt("current_stock", 0)
        .order("name");
      if (categoryId !== "all") q = q.eq("category_id", categoryId);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`name.ilike.${s},generic_name.ilike.${s},manufacturer.ilike.${s}`);
      }
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data;
    },
  });

  function handleAdd(m: any) {
    add({
      medicine_id: m.id,
      name: m.name,
      manufacturer: m.manufacturer,
      wholesale_price: Number(m.wholesale_price),
      gst_percent: Number(m.gst_percent ?? 0),
      pack_size: m.pack_size,
      current_stock: m.current_stock,
    });
    toast.success(`${m.name} added to cart`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Medicine catalog</h1>
        <p className="text-sm text-muted-foreground">Browse and add medicines to your cart.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, generic, manufacturer…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : medicines.length === 0 ? (
        <p className="text-muted-foreground text-sm">No medicines found.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {medicines.map((m: any) => (
            <Card key={m.id} className="overflow-hidden flex flex-col">
              <div className="aspect-video bg-muted grid place-items-center">
                {m.image_url ? (
                  <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <PillIcon className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <CardContent className="p-4 flex-1 flex flex-col gap-2">
                <div>
                  <div className="font-medium leading-tight">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.generic_name}</div>
                </div>
                <div className="text-xs text-muted-foreground">{m.manufacturer}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{m.pack_size ?? "Pack"}</Badge>
                  <Badge variant="outline">GST {Number(m.gst_percent ?? 0)}%</Badge>
                </div>
                <div className="mt-auto flex items-end justify-between pt-2">
                  <div>
                    <div className="text-xs text-muted-foreground line-through">MRP ₹{Number(m.mrp).toFixed(2)}</div>
                    <div className="text-lg font-semibold">₹{Number(m.wholesale_price).toFixed(2)}</div>
                  </div>
                  <Button size="sm" onClick={() => handleAdd(m)}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">Stock: {m.current_stock}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
