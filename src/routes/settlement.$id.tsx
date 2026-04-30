import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Gift, MapPin, Sparkles, ArrowLeft, CreditCard } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { fetchRequest, getRequestType, type StoredRequest } from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/settlement/$id")({
  head: () => ({
    meta: [
      { title: "Payment settlement — PLAN T" },
      { name: "description", content: "Settle payment for a completed request." },
    ],
  }),
  component: SettlementPage,
});

function SettlementPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<StoredRequest | null | undefined>(undefined);
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRequest(id)
      .then((r) => !cancelled && setRequest(r))
      .catch(() => !cancelled && setRequest(null));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (authLoading || request === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (!request) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <section className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl font-bold">Request not found</h1>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/my-requests">Back to My Requests</Link>
          </Button>
        </section>
        <SiteFooter />
      </div>
    );
  }

  const isRequester = request.userId === user.id;
  const isTaker = request.takenBy === user.id;
  if (!isRequester && !isTaker) return <Navigate to="/" />;

  const bothConfirmed = !!request.completedAt && !!request.takerCompletedAt;
  const t = getRequestType(request.type);
  const Icon = t?.icon ?? MapPin;

  const handlePay = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 900));
    setPaying(false);
    setPaid(true);
    toast.success("Payment settled successfully");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="max-w-2xl mx-auto px-6 py-12">
        <Button asChild variant="ghost" size="sm" className="rounded-full mb-6 -ml-2">
          <Link to={isRequester ? "/my-requests" : "/my-tasks"}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>

        <Badge variant="secondary" className="rounded-full mb-3">
          <Sparkles className="h-3 w-3 mr-1" /> Payment settlement
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">
          {paid ? "Payment complete" : "Settle this request"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {bothConfirmed
            ? "Both parties have confirmed completion. Time to settle the reward."
            : "Both the requester and the task taker must confirm completion before settlement."}
        </p>

        <Card className="mt-8 p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex gap-4">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Badge variant="secondary" className="rounded-full text-xs mb-1">
                {t?.label ?? "Request"}
              </Badge>
              <h2 className="font-semibold leading-tight">{request.title}</h2>
              {request.description && (
                <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-accent" /> {request.locationLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Taker confirmed</p>
              <p className="mt-1 text-sm inline-flex items-center gap-1">
                {request.takerCompletedAt ? (
                  <><CheckCircle2 className="h-4 w-4 text-accent" /> Yes</>
                ) : (
                  <span className="text-muted-foreground">Pending</span>
                )}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Requester confirmed</p>
              <p className="mt-1 text-sm inline-flex items-center gap-1">
                {request.completedAt ? (
                  <><CheckCircle2 className="h-4 w-4 text-accent" /> Yes</>
                ) : (
                  <span className="text-muted-foreground">Pending</span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-muted/40 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reward to settle</p>
              <p className="mt-1 text-2xl font-bold inline-flex items-center gap-2">
                <Gift className="h-5 w-5 text-accent" />
                {request.reward || "—"}
              </p>
            </div>
            {paid ? (
              <Badge className="rounded-full gap-1">
                <CheckCircle2 className="h-3 w-3" /> Settled
              </Badge>
            ) : (
              <Button
                size="lg"
                className="rounded-full"
                disabled={!bothConfirmed || paying || !isRequester}
                onClick={handlePay}
              >
                <CreditCard className="h-4 w-4" />
                {paying ? "Processing…" : isRequester ? "Pay now" : "Awaiting requester"}
              </Button>
            )}
          </div>

          {paid && (
            <div className="mt-6 flex gap-3">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/my-requests">My Requests</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/my-tasks">My Tasks</Link>
              </Button>
            </div>
          )}
        </Card>

        {!isRequester && (
          <p className="text-xs text-muted-foreground mt-4">
            Only the requester can release the payment. You'll be notified once it's settled.
          </p>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
