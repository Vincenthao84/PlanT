import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Gift, Clock, Inbox, Trash2, Check, RotateCcw, CheckCircle2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import {
  getRequestType,
  fetchMyRequests,
  deleteRequest,
  markRequestDone,
  reopenRequest,
  type StoredRequest,
} from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/my-requests")({
  head: () => ({
    meta: [
      { title: "My requests — PLAN T" },
      { name: "description", content: "View and manage the help requests you've posted." },
    ],
  }),
  component: MyRequestsPage,
});

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MyRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<StoredRequest[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyRequests(user.id)
      .then((rs) => {
        if (!cancelled) setRequests(rs);
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this request?")) return;
    try {
      await deleteRequest(id);
      setRequests((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
      toast.success("Request deleted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete";
      toast.error(msg);
    }
  };

  const handleToggleDone = async (r: StoredRequest) => {
    try {
      const updated = r.completedAt
        ? await reopenRequest(r.id)
        : await markRequestDone(r.id);
      setRequests((prev) =>
        prev ? prev.map((x) => (x.id === r.id ? updated : x)) : prev,
      );
      toast.success(updated.completedAt ? "Marked as done" : "Reopened");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not update";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <Badge variant="secondary" className="rounded-full mb-3">My requests</Badge>
            <h1 className="text-4xl font-bold tracking-tight">Requests you've posted</h1>
            <p className="text-muted-foreground mt-2">
              All the help requests posted from your account.
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/">Post a new request</Link>
          </Button>
        </div>

        {requests === null ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : requests.length === 0 ? (
          <Card className="p-12 text-center" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <Inbox className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">No requests yet</h2>
            <p className="text-muted-foreground mt-2 mb-6">
              You haven't posted anything. Pick a request type to get started.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/">Make a request</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const t = getRequestType(r.type);
              const Icon = t?.icon ?? MapPin;
              const isDone = !!r.completedAt;
              return (
                <Card
                  key={r.id}
                  className="p-5"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <div className="flex gap-4">
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="rounded-full text-xs">
                          {t?.label ?? "Request"}
                        </Badge>
                        {isDone && (
                          <Badge className="rounded-full text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </Badge>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {timeAgo(r.createdAt)}
                        </span>
                        {isDone && r.completedAt && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3" /> Completed {timeAgo(r.completedAt)}
                          </span>
                        )}
                      </div>
                      <Link
                        to="/request/$id"
                        params={{ id: r.id }}
                        className={`font-semibold leading-tight hover:underline block truncate ${isDone ? "line-through text-muted-foreground" : ""}`}
                      >
                        {r.title}
                      </Link>
                      {r.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {r.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-accent" />
                          {r.locationLabel}
                        </span>
                        {r.reward && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <Gift className="h-3 w-3 text-accent" />
                            {r.reward}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col gap-2">
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <Link to="/request/$id" params={{ id: r.id }}>View</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant={isDone ? "outline" : "default"}
                        className="rounded-full"
                        onClick={() => handleToggleDone(r)}
                      >
                        {isDone ? (
                          <>
                            <RotateCcw className="h-4 w-4" /> Reopen
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" /> Done
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-destructive hover:text-destructive"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}