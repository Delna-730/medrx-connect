import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tables } from "@/integrations/supabase/types";

type Retailer = Tables<"retailers">;

export const Route = createFileRoute("/_authenticated/admin/retailers")({
  component: RetailersPage,
});

function RetailersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: retailers = [], isLoading } = useQuery({
    queryKey: ["retailers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("retailers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Retailer[];
    },
  });

  async function setStatus(r: Retailer, status: "approved" | "rejected", reason?: string) {
    const { error } = await supabase.from("retailers").update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      approved_by: status === "approved" ? user?.id ?? null : null,
      rejection_reason: status === "rejected" ? (reason ?? "Not specified") : null,
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["retailers"] });
    toast.success(`Retailer ${status}`);
  }

  function table(list: Retailer[]) {
    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
    if (list.length === 0) return <div className="p-8 text-center text-muted-foreground">No retailers in this list.</div>;
    return (
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pharmacy</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.pharmacy_name}</TableCell>
                <TableCell>{r.owner_name}</TableCell>
                <TableCell>
                  <div className="text-sm">{r.contact_email}</div>
                  <div className="text-xs text-muted-foreground">{r.contact_phone}</div>
                </TableCell>
                <TableCell className="text-sm">{r.drug_license_number}</TableCell>
                <TableCell className="text-sm">{r.city}, {r.state}</TableCell>
                <TableCell>
                  {r.status === "approved" && <Badge className="bg-success text-success-foreground hover:bg-success">Approved</Badge>}
                  {r.status === "pending" && <Badge className="bg-warning text-warning-foreground hover:bg-warning">Pending</Badge>}
                  {r.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  {r.status !== "approved" && (
                    <Button size="sm" variant="outline" className="mr-2" onClick={() => setStatus(r, "approved")}>
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => {
                      const reason = prompt("Rejection reason (optional)") ?? undefined;
                      setStatus(r, "rejected", reason);
                    }}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  const pending = retailers.filter((r) => r.status === "pending");
  const approved = retailers.filter((r) => r.status === "approved");
  const rejected = retailers.filter((r) => r.status === "rejected");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Retailers</h1>
        <p className="text-sm text-muted-foreground">Approve or reject pharmacy registrations.</p>
      </div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">{table(pending)}</TabsContent>
        <TabsContent value="approved">{table(approved)}</TabsContent>
        <TabsContent value="rejected">{table(rejected)}</TabsContent>
      </Tabs>
    </div>
  );
}
