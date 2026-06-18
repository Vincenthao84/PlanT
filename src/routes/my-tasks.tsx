import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Gift, Clock, Inbox, CheckCircle2, ClipboardList, Check, RotateCcw, BadgeCheck, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TaskThread } from "@/components/TaskThread";
import { PaymentQRUpload } from "@/components/PaymentQRUpload";
import {
  getRequestType,
  takerCompleteRequest,
  takerReopenRequest,
  type StoredRequest,
} from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
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

function TimeAgoText({ dateString }: { dateString: string | undefined }) {
  const [text, setText] = useState<string>("Recently");

  useEffect(() => {
    if (!dateString) return;
    
    const calculateTime = () => {
      try {
        const ts = new Date(dateString).getTime();
        if (isNaN(ts)) return "Recently";
        const s = Math.floor((Date.now() - ts) / 1000);
        if (s < 60) return "just now";
        
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m ago`;
        
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        
        return `${Math.floor(h / 24)}d ago`;
      } catch {
        return "Recently";
      }
    };

    setText(calculateTime());
  }, [dateString]);

  return <span>{text}</span>;
}

export function MyTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<StoredRequest[] | null>(null);
  const [activeChatTaskId, setActiveChatTaskId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getAssignedTasks = useCallback(async (userId: string) => {
    try {
      // 1. Fetch tasks where you are explicitly marked as the taker
      const { data: directData, error: directError } = await supabase
        .from("requests")
        .select("*")
        .eq("taken_by", userId);

      if (directError) throw directError;

      // 2. Fallback: Fetch tasks via request_bids table where bid is accepted
      const { data: bidData, error: bidError } = await supabase
        .from("request_bids")
        .select("request_id, requests(*)")
        .eq("helper_id", userId)
        .eq("status", "accepted"); // Matches request_bids status field safely

      if (bidError) throw bidError;

      // Unify entries into a single map keyed by request ID to prevent duplicate listings
      const combinedMap = new Map<string, any>();

      if (directData) {
        directData.forEach((item) => combinedMap.set(item.id, item));
      }

      if (bidData) {
        bidData.forEach((bid: any) => {
          if (bid.requests && !combinedMap.has(bid.requests.id)) {
            combinedMap.set(bid.requests.id, bid.requests);
          }
        });
      }

      const unifiedData = Array.from(combinedMap.values());

      const mapped: StoredRequest[] = unifiedData.map((item: any) => ({
        id: item.id,
        type: item.type || "general",
        title: item.title || "Untitled Task",
        description: item.description || "",
        locationLabel: item.location_label || item.locationLabel || "Pinned location",
        lat: item.lat,
        lng: item.lng,
        reward: item.reward,
        isSecret: item.is_secret || item.isSecret || false,
        userId: item.user_id || item.userId,
        takenBy: item.taken_by || userId, // Fallback placeholder if column isn't written back yet
        takenAt: item.taken_at || item.created_at,
        takerCompletedAt: item.taker_completed_at || item.takerCompletedAt,
        completedAt: item.completed_at || item.completedAt,
        feeSettledAt: item.fee_settled_at || item.feeSettledAt,
        photoUrls: item.photo_urls || item.photoUrls || [],
        paymentQrUrl: item.payment_qr_url || item.paymentQrUrl,
      }));

      setTasks(mapped);
    } catch (err) {
      console.error("Direct fetch exception on task view list:", err);
      toast.error("Failed to load your tasks");
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void getAssignedTasks(user.id);
  }, [user?.id, getAssignedTasks]);

  const handleManualRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await getAssignedTasks(user.id);
    setRefreshing(false);
    toast.success("Tasks refreshed");
  };

  if (authLoading || !isMounted) {
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
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <Badge variant="secondary" className="rounded-full mb-2">My tasks</Badge>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Requests you've taken</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Tasks you've claimed from the notice board.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={handleManualRefresh} 
              variant="outline" 
              size="icon" 
              className="rounded-full shrink-0"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button asChild variant="outline" className="rounded-full flex-1 sm:flex-none text-xs sm:text-sm">
              <Link to="/notice-board">Browse notice board</Link>
            </Button>
          </div>
        </div>

        {tasks === null ? (
          <p className="text-muted-foreground text-sm">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <Inbox className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold">No tasks yet</h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1 mb-6 max-w-sm mx-auto">
              You haven't taken any requests. Browse the notice board to find one or try refreshing if you accepted a bid.
            </p>
            <Button asChild className="rounded-full text-xs">
              <Link to="/notice-board">Go to notice board</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {tasks.map((r) => {
              if (!r) return null;

              const typeString = r.type || "general";
              const t = getRequestType(typeString);
              const Icon = t && t.icon ? t.icon : MapPin;
              const typeLabel = t && t.label ? t.label : "Request";
              
              const { takerCompletedAt, completedAt, feeSettledAt, takenAt, id, title, description, locationLabel, reward, userId, takenBy } = r;
              
              const takerDone = !!takerCompletedAt;
              const fullySettled = !!completedAt && takerDone;
              const isChatOpen = activeChatTaskId === id;

              return (
                <Card key={id} className="p-4 sm:p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="inline-flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent self-start">
                      <Icon className="h-5 w-5" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary" className="rounded-full text-[10px] sm:text-xs px-2 py-0">
                          {typeLabel}
                        </Badge>
                        <Badge className="rounded-full text-[10px] sm:text-xs px-2 py-0">
                          <ClipboardList className="h-2.5 w-2.5 mr-1" /> Taken
                        </Badge>
                        {takerDone && !fullySettled && (
                          <Badge variant="outline" className="rounded-full text-[10px] sm:text-xs px-2 py-0 bg-amber-500/5 text-amber-600 border-amber-500/20 dark:text-amber-400">
                            <Clock className="h-2.5 w-2.5 mr-1" /> Awaiting requester
                          </Badge>
                        )}
                        {fullySettled && (
                          <Badge variant="outline" className="rounded-full text-[10px] sm:text-xs px-2 py-0 bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:text-emerald-400">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Done
                          </Badge>
                        )}
                        {feeSettledAt && (
                          <Badge className="rounded-full text-[10px] sm:text-xs px-2 py-0 bg-primary text-primary-foreground">
                            <BadgeCheck className="h-2.5 w-2.5 mr-1" /> Fee Settlement Done
                          </Badge>
                        )}
                        {takenAt && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground ml-auto sm:ml-0">
                            <Clock className="h-2.5 w-2.5" /> <TimeAgoText dateString={takenAt} />
                          </span>
                        )}
                      </div>
                      
                      <Link
                        to="/request/$id"
                        params={{ id }}
                        className={`font-semibold text-base sm:text-lg leading-tight hover:underline block truncate ${fullySettled ? "line-through text-muted-foreground" : ""}`}
                      >
                        {title || "Untitled Task"}
                      </Link>
                      
                      {description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                          {description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] sm:text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-accent" />
                          {locationLabel || "Pinned location"}
                        </span>
                        {reward && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <Gift className="h-3 w-3 text-accent" />
                            {reward}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto shrink-0 justify-stretch sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      <Button asChild size="sm" variant="outline" className="rounded-full flex-1 sm:flex-none text-xs h-8 sm:h-9">
                        <Link to="/request/$id" params={{ id }}>View</Link>
                      </Button>

                      <Button
                        size="sm"
                        variant={isChatOpen ? "secondary" : "outline"}
                        className="rounded-full gap-1 flex-1 sm:flex-none text-xs h-8 sm:h-9"
                        onClick={() => setActiveChatTaskId(isChatOpen ? null : id)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {isChatOpen ? "Close" : "Chat"}
                      </Button>

                      {!fullySettled && (
                        <Button
                          size="sm"
                          variant={takerDone ? "outline" : "default"}
                          className="rounded-full gap-1 flex-1 sm:flex-none text-xs h-8 sm:h-9"
                          onClick={() => void handleToggleComplete(r)}
                        >
                          {takerDone ? (
                            <>
                              <RotateCcw className="h-3.5 w-3.5" /> Reopen
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" /> Complete
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Realtime Chat Thread Container */}
                  {isChatOpen && (
                    <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                      <TaskThread 
                        requestId={id} 
                        currentUserId={user.id} 
                        requestOwnerId={userId} 
                      />
                    </div>
                  )}

                  {/* Payment Settlement Container */}
                  {(takerDone || fullySettled) && takenBy && (
                    <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                      <p className="text-[11px] sm:text-xs text-muted-foreground mb-3 flex items-start gap-1.5 bg-muted/50 p-2.5 rounded-lg">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>Upload your receipt or payment payout QR code here to finalize settlement details with the requester.</span>
                      </p>
                      <PaymentQRUpload
                        requestId={id}
                        takerId={takenBy}
                        currentUserId={user.id}
                      />
                    </div>
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
