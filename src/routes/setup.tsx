import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

// One-time admin claim: if no admin exists yet, the signed-in user can claim the admin role.
function SetupPage() {
  const { user, loading, role, refresh } = useAuth();
  const navigate = useNavigate();
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    supabase.from("user_roles").select("id").eq("role", "admin").limit(1).then(({ data }) => {
      setAdminExists((data?.length ?? 0) > 0);
    });
  }, []);

  if (loading || adminExists === null) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (!user) return <Navigate to="/auth" />;
  if (role === "admin") return <Navigate to="/admin" />;
  if (adminExists) return <Navigate to="/" />;

  async function claim() {
    setClaiming(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: user!.id, role: "admin" });
    setClaiming(false);
    if (error) return toast.error(error.message);
    toast.success("You are now the admin");
    await refresh();
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <CardTitle className="mt-4">Claim admin access</CardTitle>
          <CardDescription>
            No admin exists yet. Claim the admin role for this account to set up the distribution platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={claim} disabled={claiming}>
            {claiming ? "Claiming…" : "Make me admin"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
