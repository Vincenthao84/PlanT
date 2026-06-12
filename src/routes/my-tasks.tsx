import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Gift, Clock, Inbox, CheckCircle2, ClipboardList, Check, RotateCcw, BadgeCheck, MessageSquare } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TaskThread } from "@/components/TaskThread";
import { PaymentQRUpload } from "@/components/PaymentQRUpload";
import {
  getRequestType,
  fetchMyTasks,
  takerCompleteRequest,
  takerReopenRequest,
  type StoredRequest,
} from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/my-tasks")({
  head: () => ({
    meta: [
      { title: "My tasks — PLAN T" },
      { name: "description", content: "Requests you've taken on as tasks." },
    ],
  }),
  component: MyTasksPage,
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

function MyTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<StoredRequest[] | null>(null);
  const [activeChatTaskId, setActiveChatTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchMyTasks(user.id)
      .then((rs) => {
        if (!cancelled) setTasks(rs);
      })
      .catch((err) => {
        console.error("Error fetching tasks for view:", err);
        if (!cancelled) setTasks([]);
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

  const handleToggleComplete = async (r: StoredRequest) => {
    try {
      const updated = r.takerCompletedAt
        ? await takerReopenRequest(r.id)
        : await takerCompleteRequest(r.id);
      setTasks((prev) =>
        prev ? prev.map((x) => (x.id === r.id ? updated : x)) : prev,
      );
      toast.success(
        updated.takerCompletedAt
          ? "Marked complete — waiting for requester to confirm"
          : "Reopened",
      );
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
            <Badge variant="secondary" className="rounded-full mb-3">My tasks</Badge>
            <h1 className="text-4xl font-bold tracking-tight">Requests you've taken</h1>
            <p className="text-muted-foreground mt-2">
              Tasks you've claimed from the notice board.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/notice-board">Browse notice board</Link>
          </Button>
        </div>

        {tasks === null ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : tasks.length === 0 ? (
          <Card className="p-12 text-center" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <Inbox className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">No tasks yet</h2>
            <p className="text-muted-foreground mt-2 mb-6">
              You haven't taken any requests. Browse the notice board to find one.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/notice-board">Go to notice board</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((r) => {
              const t = getRequestType(r.type);
              const Icon = t?.icon ?? MapPin;
              const { takerCompletedAt, completedAt, feeSettledAt, takenAt, id, title, description, locationLabel, reward, userId, takenBy } = r;
              
              const takerDone = !!takerCompletedAt;
              const fullySettled = !!completedAt && takerDone;
              const isChatOpen = activeChatTaskId === id;

              return (
                <Card key={id} className="p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
                  <div className="flex gap-4">
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary" className="rounded-full text-xs">
                          {t?.label ?? "Request"}
                        </Badge>
                        <Badge className="rounded-full text-xs gap-1">
                          <ClipboardList className="h-3 w-3" /> Taken
                        </Badge>
                        {takerDone && !fullySettled && (
                          <Badge variant="outline" className="rounded-full text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Awaiting requester
                          </Badge>
                        )}
                        {fullySettled && (
                          <Badge variant="outline" className="rounded-full text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </Badge>
                        )}
                        {feeSettledAt && (
                          <Badge className="rounded-full text-xs gap-1">
                            <BadgeCheck className="h-3 w-3" /> Fee Settlement Done
                          </Badge>
                        )}
                        {takenAt && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> Taken {timeAgo(takenAt)}
                          </span>
                        )}
                      </div>
                      <Link
                        to="/request/$id"
                        params={{ id }}
                        className={`font-semibold leading-tight hover:underline block truncate ${fullySettled ? "line-through text-muted-foreground" : ""}`}
                      >
                        {title}
                      </Link>
                      {description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-accent" />
                          {locationLabel}
                        </span>
                        {reward && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <Gift className="h-3 w-3 text-accent" />
                            {reward}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col gap-2">
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <Link to="/request/$id" params={{ id }}>View</Link>
                      </Button>

                      <Button
                        size="sm"
                        variant={isChatOpen ? "secondary" : "outline"}
                        className="rounded-full gap-1"
                        onClick={() => setActiveChatTaskId(isChatOpen ? null : id)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {isChatOpen ? "Close Chat" : "Chat"}
                      </Button>

                      {!fullySettled && (
                        <Button
                          size="sm"
                          variant={takerDone ? "outline" : "default"}
                          className="rounded-full"
                          onClick={() => handleToggleComplete(r)}
                        >
                          {takerDone ? (
                            <>
                              <RotateCcw className="h-4 w-4" /> Reopen
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4" /> Complete Order
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isChatOpen && (
                    <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                      <TaskThread 
                        requestId={id} 
                        currentUserId={user.id} 
                        requestOwnerId={userId} 
                      />
                    </div>
                  )}

                  {(takerDone || fullySettled) && takenBy && (
                    <PaymentQRUpload
                      requestId={id}
                      takerId={takenBy}
                      currentUserId={user.id}
                    />
                  )}
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
