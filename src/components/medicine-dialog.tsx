import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Medicine = Tables<"medicines">;
type MedicineInsert = TablesInsert<"medicines">;

const blank: Partial<MedicineInsert> = {
  name: "", generic_name: "", manufacturer: "", hsn_code: "", gst_percent: 12,
  batch_number: "", manufacturing_date: null, expiry_date: null, pack_size: "",
  strip_size: 10, mrp: 0, wholesale_price: 0, current_stock: 0,
  minimum_stock_alert: 10, image_url: "", description: "", is_active: true,
};

export function MedicineDialog({
  open, onOpenChange, medicine, onSaved,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  medicine: Medicine | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<MedicineInsert>>(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (medicine) setForm({ ...medicine });
    else setForm(blank);
  }, [medicine, open]);

  function set<K extends keyof MedicineInsert>(k: K, v: MedicineInsert[K] | null) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function uploadImage(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("medicine-images").upload(path, file);
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: signed } = await supabase.storage.from("medicine-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    set("image_url", signed?.signedUrl ?? null);
    setUploading(false);
    toast.success("Image uploaded");
  }

  async function save() {
    if (!form.name || !form.manufacturer) return toast.error("Name and manufacturer are required");
    setSaving(true);
    const payload = {
      ...form,
      name: form.name!,
      manufacturer: form.manufacturer!,
      mrp: Number(form.mrp) || 0,
      wholesale_price: Number(form.wholesale_price) || 0,
      current_stock: Number(form.current_stock) || 0,
      minimum_stock_alert: Number(form.minimum_stock_alert) || 0,
      strip_size: form.strip_size ? Number(form.strip_size) : null,
      gst_percent: Number(form.gst_percent) || 0,
    } as MedicineInsert;
    const { error } = medicine
      ? await supabase.from("medicines").update(payload).eq("id", medicine.id)
      : await supabase.from("medicines").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(medicine ? "Medicine updated" : "Medicine added");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{medicine ? "Edit medicine" : "Add medicine"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name *"><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Generic name"><Input value={form.generic_name ?? ""} onChange={(e) => set("generic_name", e.target.value)} /></Field>
          <Field label="Manufacturer *"><Input value={form.manufacturer ?? ""} onChange={(e) => set("manufacturer", e.target.value)} /></Field>
          <Field label="Category">
            <Select value={form.category_id ?? "none"} onValueChange={(v) => set("category_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="HSN code"><Input value={form.hsn_code ?? ""} onChange={(e) => set("hsn_code", e.target.value)} /></Field>
          <Field label="GST %"><Input type="number" step="0.01" value={form.gst_percent ?? 0} onChange={(e) => set("gst_percent", Number(e.target.value))} /></Field>
          <Field label="Batch number"><Input value={form.batch_number ?? ""} onChange={(e) => set("batch_number", e.target.value)} /></Field>
          <Field label="Pack size"><Input value={form.pack_size ?? ""} onChange={(e) => set("pack_size", e.target.value)} /></Field>
          <Field label="Strip size"><Input type="number" value={form.strip_size ?? ""} onChange={(e) => set("strip_size", Number(e.target.value))} /></Field>
          <Field label="Mfg date"><Input type="date" value={form.manufacturing_date ?? ""} onChange={(e) => set("manufacturing_date", e.target.value || null)} /></Field>
          <Field label="Expiry date"><Input type="date" value={form.expiry_date ?? ""} onChange={(e) => set("expiry_date", e.target.value || null)} /></Field>
          <Field label="MRP (₹)"><Input type="number" step="0.01" value={form.mrp ?? 0} onChange={(e) => set("mrp", Number(e.target.value))} /></Field>
          <Field label="Wholesale price (₹)"><Input type="number" step="0.01" value={form.wholesale_price ?? 0} onChange={(e) => set("wholesale_price", Number(e.target.value))} /></Field>
          <Field label="Current stock"><Input type="number" value={form.current_stock ?? 0} onChange={(e) => set("current_stock", Number(e.target.value))} /></Field>
          <Field label="Min stock alert"><Input type="number" value={form.minimum_stock_alert ?? 0} onChange={(e) => set("minimum_stock_alert", Number(e.target.value))} /></Field>
        </div>
        <Field label="Description">
          <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Image">
          <div className="flex items-center gap-3">
            {form.image_url && <img src={form.image_url} alt="" className="h-16 w-16 rounded-md object-cover border" />}
            <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            </label>
          </div>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save medicine"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
