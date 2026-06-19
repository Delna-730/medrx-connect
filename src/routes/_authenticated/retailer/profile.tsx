import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/retailer/profile")({
  component: ProfilePage,
});

const FIELDS = [
  ["pharmacy_name", "Pharmacy name"],
  ["owner_name", "Owner name"],
  ["contact_phone", "Phone"],
  ["contact_email", "Email"],
  ["gst_number", "GST number"],
  ["drug_license_number", "Drug license number"],
  ["city", "City"],
  ["state", "State"],
  ["pincode", "Pincode"],
] as const;

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: retailer } = useQuery({
    queryKey: ["my-retailer", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("retailers").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (retailer) {
      const f: Record<string, string> = {};
      FIELDS.forEach(([k]) => { f[k] = (retailer as any)[k] ?? ""; });
      f.address = retailer.address ?? "";
      setForm(f);
    }
  }, [retailer]);

  async function save() {
    if (!retailer) return;
    setSaving(true);
    const { error } = await supabase.from("retailers").update(form as any).eq("id", retailer.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["my-retailer", user?.id] });
  }

  if (!retailer) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
        <p className="text-sm text-muted-foreground">Keep your pharmacy details up to date for invoicing and delivery.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Pharmacy details</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          {FIELDS.map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <Input
                value={form[key] ?? ""}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
          <div className="sm:col-span-2 space-y-1">
            <Label>Address</Label>
            <Textarea rows={3} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}
