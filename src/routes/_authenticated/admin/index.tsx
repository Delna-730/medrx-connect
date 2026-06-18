import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pill, Users, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const in90 = new Date(); in90.setDate(in90.getDate() + 90);

      const [meds, lowStock, expiring, pendingRetailers, approvedRetailers] = await Promise.all([
        supabase.from("medicines").select("*", { count: "exact", head: true }),
        supabase.from("medicines").select("id", { count: "exact", head: true })
          .lt("current_stock", 10),
        supabase.from("medicines").select("id", { count: "exact", head: true })
          .lte("expiry_date", in90.toISOString().slice(0, 10))
          .gte("expiry_date", today.toISOString().slice(0, 10)),
        supabase.from("retailers").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("retailers").select("id", { count: "exact", head: true }).eq("status", "approved"),
      ]);
      return {
        medicines: meds.count ?? 0,
        lowStock: lowStock.count ?? 0,
        expiring: expiring.count ?? 0,
        pendingRetailers: pendingRetailers.count ?? 0,
        approvedRetailers: approvedRetailers.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total Medicines", value: stats.data?.medicines ?? "—", icon: Pill, tint: "text-primary" },
    { label: "Low Stock Items", value: stats.data?.lowStock ?? "—", icon: AlertTriangle, tint: "text-warning-foreground" },
    { label: "Expiring (90d)", value: stats.data?.expiring ?? "—", icon: Clock, tint: "text-destructive" },
    { label: "Approved Retailers", value: stats.data?.approvedRetailers ?? "—", icon: Users, tint: "text-success" },
    { label: "Pending Approvals", value: stats.data?.pendingRetailers ?? "—", icon: Users, tint: "text-warning-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Operational overview of your wholesale business.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {c.label}
              </CardTitle>
              <c.icon className={`h-4 w-4 ${c.tint}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Order analytics</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground py-12 text-center">
          Sales charts will appear here once orders start flowing in (Phase 2).
        </CardContent>
      </Card>
    </div>
  );
}
