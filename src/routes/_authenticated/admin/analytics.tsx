import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Download } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: Analytics,
});

function Analytics() {
  const [days, setDays] = useState(30);
  const sinceISO = useMemo(() => startOfDay(subDays(new Date(), days)).toISOString(), [days]);

  const { data: orders = [] } = useQuery({
    queryKey: ["analytics-orders", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at, retailer_id, retailers(pharmacy_name)")
        .gte("created_at", sinceISO)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["analytics-items", days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("medicine_name, quantity, line_total, created_at")
        .gte("created_at", sinceISO);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalRevenue = orders.reduce((s: number, o: any) => s + Number(o.total_amount), 0);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;

  // daily series
  const daily = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM dd");
      map.set(d, { date: d, revenue: 0, orders: 0 });
    }
    orders.forEach((o: any) => {
      const d = format(new Date(o.created_at), "MMM dd");
      const e = map.get(d);
      if (e) { e.revenue += Number(o.total_amount); e.orders += 1; }
    });
    return [...map.values()];
  }, [orders, days]);

  // top medicines
  const topMeds = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    items.forEach((i: any) => {
      const e = map.get(i.medicine_name) ?? { name: i.medicine_name, qty: 0, revenue: 0 };
      e.qty += i.quantity;
      e.revenue += Number(i.line_total);
      map.set(i.medicine_name, e);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [items]);

  // top retailers
  const topRetailers = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; orders: number }>();
    orders.forEach((o: any) => {
      const name = o.retailers?.pharmacy_name ?? "Unknown";
      const e = map.get(name) ?? { name, revenue: 0, orders: 0 };
      e.revenue += Number(o.total_amount);
      e.orders += 1;
      map.set(name, e);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [orders]);

  function exportCSV() {
    const rows = [
      ["Order #", "Date", "Retailer", "Status", "Total"],
      ...orders.map((o: any) => [
        o.order_number,
        new Date(o.created_at).toLocaleString(),
        o.retailers?.pharmacy_name ?? "",
        o.status,
        Number(o.total_amount).toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Sales performance over the last {days} days.</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Revenue" value={`₹${totalRevenue.toFixed(0)}`} />
        <StatCard label="Orders" value={String(orders.length)} />
        <StatCard label="Avg order value" value={`₹${avgOrder.toFixed(0)}`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Top medicines</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMeds} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top retailers</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRetailers} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground tracking-wide">{label}</CardTitle></CardHeader>
      <CardContent><div className="text-3xl font-semibold">{value}</div></CardContent>
    </Card>
  );
}
