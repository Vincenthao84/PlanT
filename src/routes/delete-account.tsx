import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export const Route = createFileRoute("/delete-account")({
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (confirmText.trim().toLowerCase() !== "delete my account") {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Call Supabase RPC function to delete user data and auth user
      const { error } = await supabase.rpc("delete_user_account");

      if (error) throw error;

      // 2. Sign out the user
      await supabase.auth.signOut();
      toast.success("Your account has been permanently deleted.");
      void navigate({ to: "/" });
    } catch (err) {
      console.error("Account deletion failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteHeader />
        <main className="flex-1 max-w-md mx-auto px-6 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Sign In Required</h1>
          <p className="text-sm text-muted-foreground">
            You must be signed in to your account to request account deletion.
          </p>
          <Button asChild className="rounded-full">
            <Link to="/login">Go to Login</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-lg mx-auto px-6 py-12 w-full">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <Card className="p-6 sm:p-8 border-destructive/30 shadow-lg">
          <div className="flex items-center gap-3 mb-4 text-destructive">
            <div className="p-2 bg-destructive/10 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Delete Account</h1>
          </div>

          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            This action is permanent and cannot be undone. Deleting your account will immediately remove your profile, posted requests, chat messages, and ratings.
          </p>

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmText" className="text-xs font-medium">
                To confirm, type <span className="font-bold text-foreground">DELETE MY ACCOUNT</span> below:
              </Label>
              <Input
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => void navigate({ to: "/" })}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="flex-1 rounded-full"
                disabled={submitting || confirmText.trim().toLowerCase() !== "delete my account"}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Permanently Delete
              </Button>
            </div>
          </form>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
