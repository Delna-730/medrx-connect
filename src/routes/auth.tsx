import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Pill } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const searchSchema = z.object({ tab: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background grid place-items-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Pill className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">MedWholesale</span>
        </Link>
        <Tabs defaultValue={tab ?? "login"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Register pharmacy</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm onSuccess={() => navigate({ to: "/" })} />
          </TabsContent>
          <TabsContent value="register">
            <RegisterForm onSuccess={() => navigate({ to: "/pending" })} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    onSuccess();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your pharmacy account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  pharmacy_name: z.string().trim().min(2).max(120),
  owner_name: z.string().trim().min(2).max(120),
  contact_phone: z.string().trim().min(7).max(20),
  drug_license_number: z.string().trim().min(3).max(60),
  gst_number: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().min(4).max(12),
});

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    email: "", password: "", pharmacy_name: "", owner_name: "", contact_phone: "",
    drug_license_number: "", gst_number: "", address: "", city: "", state: "", pincode: "",
  });
  const [loading, setLoading] = useState(false);
  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: form.owner_name },
      },
    });
    if (error || !data.user) {
      setLoading(false);
      return toast.error(error?.message ?? "Signup failed");
    }
    // Insert retailer record + assign retailer role
    const userId = data.user.id;
    const [{ error: rErr }, { error: roleErr }] = await Promise.all([
      supabase.from("retailers").insert({
        user_id: userId,
        pharmacy_name: form.pharmacy_name,
        owner_name: form.owner_name,
        contact_email: form.email,
        contact_phone: form.contact_phone,
        drug_license_number: form.drug_license_number,
        gst_number: form.gst_number || null,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      }),
      supabase.from("user_roles").insert({ user_id: userId, role: "retailer" }),
    ]);
    setLoading(false);
    if (rErr || roleErr) {
      return toast.error(rErr?.message || roleErr?.message || "Could not save pharmacy info");
    }
    toast.success("Registration submitted — pending admin approval");
    onSuccess();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register your pharmacy</CardTitle>
        <CardDescription>An admin will review and approve your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" type="email" value={form.email} onChange={update("email")} required />
            <Field label="Password" type="password" value={form.password} onChange={update("password")} required />
            <Field label="Pharmacy name" value={form.pharmacy_name} onChange={update("pharmacy_name")} required />
            <Field label="Owner name" value={form.owner_name} onChange={update("owner_name")} required />
            <Field label="Phone" value={form.contact_phone} onChange={update("contact_phone")} required />
            <Field label="Drug license #" value={form.drug_license_number} onChange={update("drug_license_number")} required />
            <Field label="GST number (optional)" value={form.gst_number} onChange={update("gst_number")} />
            <Field label="Pincode" value={form.pincode} onChange={update("pincode")} required />
            <Field label="City" value={form.city} onChange={update("city")} required />
            <Field label="State" value={form.state} onChange={update("state")} required />
          </div>
          <Field label="Address" value={form.address} onChange={update("address")} required />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting…" : "Register pharmacy"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input {...rest} />
    </div>
  );
}
