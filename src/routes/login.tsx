import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";




export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — PLAN T" },
      { name: "description", content: "Sign in or create your PLAN T account to post requests and offer help." },
    ],
  }),
  component: LoginPage,
});

type Mode = "signin" | "signup";

function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: "/" });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !acceptedTerms) {
      toast.error("You must accept the Terms and Conditions to create an account.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created — you're signed in.");
        } else {
          toast.success(
            "Account created — check your inbox to verify your email before signing in.",
            { duration: 8000 },
          );
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (mode === "signup" && !acceptedTerms) {
      toast.error("You must accept the Terms and Conditions to create an account.");
      return;
    }
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google");
                                                      
                                                      //,
     // redirect_uri: window.location.origin,
    
    if (result.error) {
      toast.error("Google sign-in failed");
      setSubmitting(false);
      return;
    }
    if (result.redirected) return;
    // Tokens received — auth listener will pick it up
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center justify-center gap-3 mb-8 font-bold text-xl tracking-tight">
          <img src="/plant-logo.png" alt="PlanT Logo" className="h-20 w-20 rounded-2xl shadow-md object-cover" />
          PLAN T
        </Link>

        <Card className="p-8 shadow-xl border-border/60">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to post and respond to requests."
                : "Join PLAN T to start asking and offering help."}
            </p>
          </div>

          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-foreground/80">
            The Platform is now <span className="font-semibold">free to try for 1 month</span>. The owner of this Platform reserves all rights to charge a <span className="font-semibold">Subscription Fee of US$3</span> for usage of 3 months onwards. Each free user can post up to <span className="font-semibold">20 requests</span> and take <span className="font-semibold">15 orders</span> per month only.
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full"
            onClick={handleGoogle}
            disabled={submitting}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === "signup" && (
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="accept-terms"
                  checked={acceptedTerms}
                  onCheckedChange={(v) => setAcceptedTerms(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="accept-terms" className="text-sm font-normal leading-snug">
                  I have read and agree to the{" "}
                  <Link to="/terms" target="_blank" className="font-semibold text-primary hover:underline">
                    Terms and Conditions
                  </Link>
                  .
                </Label>
              </div>
            )}

            <Button type="submit" className="w-full rounded-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to PLAN T?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}
