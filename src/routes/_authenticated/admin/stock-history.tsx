import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/stock-history")({
  component: StockHistory,
});

function StockHistory() {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, medicines(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lowStock = [] } = useQuery({
    queryKey: ["low-stock-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicines")
        .select("id, name, current_stock, minimum_stock_alert")
        .lt("current_stock", 20)
        .order("current_stock", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stock history</h1>
        <p className="text-sm text-muted-foreground">All inventory movements and low-stock alerts.</p>
      </div>

      <Card className={lowStock.length ? "border-warning" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-warning-foreground" />
            Low-stock items ({lowStock.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted-foreground">All medicines are above the safety threshold.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {lowStock.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <span className="truncate">{m.name}</span>
                  <Badge variant={m.current_stock === 0 ? "destructive" : "outline"}>
                    {m.current_stock} left
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent movements</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
            movements.length === 0 ? <p className="text-sm text-muted-foreground">No movements yet.</p> :
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{m.medicines?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{m.reason}</Badge></TableCell>
                    <TableCell className={`text-right font-mono ${m.change_amount < 0 ? "text-destructive" : "text-success"}`}>
                      {m.change_amount > 0 ? "+" : ""}{m.change_amount}
                    </TableCell>
                    <TableCell className="text-right font-mono">{m.new_stock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>
    </div>
  );
}
