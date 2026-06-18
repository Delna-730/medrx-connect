import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LogOut, Pill } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/retailer/")({
  component: RetailerDashboard,
});

function RetailerDashboard() {
  const { user, loading, role, retailerStatus, signOut } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (!user) return <Navigate to="/auth" />;
  if (role === "admin") return <Navigate to="/admin" />;
  if (retailerStatus !== "approved") return <Navigate to="/pending" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Pill className="h-5 w-5" />
            </div>
            <span className="font-semibold">MedWholesale — Retailer</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to your pharmacy portal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Your account is <span className="font-medium text-success">approved</span>. The medicine catalog, cart, and order placement will be available in the next phase of this build.</p>
            <p>For now, you can sign in and out — Phase 1 focuses on getting the admin side fully operational.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
