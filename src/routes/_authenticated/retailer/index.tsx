import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pill, ShoppingCart, ClipboardList, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/retailer/")({
  component: RetailerDashboard,
});

function RetailerDashboard() {
  const { user } = useAuth();

  const { data: retailer } = useQuery({
    queryKey: ["retailer-me", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("retailers").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["recent-orders", retailer?.id],
    enabled: !!retailer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("retailer_id", retailer!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const stats = [
    { label: "Catalog", value: "Browse", icon: Pill, to: "/retailer/catalog" },
    { label: "Cart", value: "Checkout", icon: ShoppingCart, to: "/retailer/cart" },
    { label: "Orders", value: "History", icon: ClipboardList, to: "/retailer/orders" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {retailer?.pharmacy_name ?? "Pharmacy"}</h1>
        <p className="text-sm text-muted-foreground">Place orders, track shipments and manage your account.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="block">
            <Card className="hover:border-primary transition-colors">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-md bg-primary/10 text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                  <div className="font-semibold">{s.value}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Drug license" v={retailer?.drug_license_number} />
            <Row k="GST number" v={retailer?.gst_number} />
            <Row k="City" v={`${retailer?.city ?? ""}, ${retailer?.state ?? ""}`} />
            <Row k="Credit limit" v={<><IndianRupee className="h-3 w-3 inline" />{Number(retailer?.credit_limit ?? 0).toFixed(2)}</>} />
            <Row k="Outstanding" v={<><IndianRupee className="h-3 w-3 inline" />{Number(retailer?.outstanding_balance ?? 0).toFixed(2)}</>} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet. Browse the catalog to place your first order.</p>
            ) : recentOrders.map((o: any) => (
              <Link key={o.id} to="/retailer/orders/$id" params={{ id: o.id }} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent">
                <div>
                  <div className="font-medium text-sm">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">₹{Number(o.total_amount).toFixed(2)}</div>
                  <Badge variant="outline" className="text-xs">{o.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between border-b last:border-0 py-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v || "—"}</span>
    </div>
  );
}
