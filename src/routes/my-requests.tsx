import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TaskThread } from "@/components/TaskThread";
import { fetchMyRequests, type StoredRequest, getRequestType } from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, MessageSquare, Clock, ArrowRight, Gift } from "lucide-react";

interface ExtendedStoredRequest extends StoredRequest {
  createdAt?: string;
  created_at?: string;
  reward?: number;
  takerCompletedAt?: string | null;
  taker_completed_at?: string | null;
  completedAt?: string | null;
  completed_at?: string | null;
  feeSettledAt?: string | null;
  fee_settled_at?: string | null;
  feeReceivedAt?: string | null;
  fee_received_at?: string | null;
  hasMyReview?: boolean;
  accepted_bid_id?: string | null;
}

export const Route = createFileRoute("/my-requests")({
  component: MyRequestsPage,
});

function MyRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<ExtendedStoredRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    async function loadData() {
      try {
        // 1. Fetch base requests where you are the creator
        const baseData = await fetchMyRequests(user.id);
        
        if (!baseData || baseData.length === 0) {
          setRequests([]);
          return;
        }

        // Handle both camelCase and snake_case object formats safely
        const requestIds = baseData
          .map((r: any) => r.id || r.request_id)
          .filter(Boolean);

        if (requestIds.length === 0) {
          setRequests(baseData as ExtendedStoredRequest[]);
          return;
        }

        // 2. Query request_ratings matching your target IDs where you are the author
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("request_ratings")
          .select("request_id")
          .in("request_id", requestIds)
          .eq("requester_id", user.id);

        if (ratingsError) {
          console.error("Supabase ratings fetch error:", ratingsError);
        }

        const reviewedRequestIds = new Set(ratingsData?.map(r => r.request_id) || []);

        // 3. Enrich payload mapping arrays accurately
        const enrichedRequests: ExtendedStoredRequest[] = baseData.map((r: any) => {
          const currentId = r.id || r.request_id;
          return {
            ...r,
            id: currentId,
            hasMyReview: reviewedRequestIds.has(currentId),
            // Explicitly preserve or map snake_case accepted_bid_id field data safely
            accepted_bid_id: r.accepted_bid_id || r.acceptedBidId || null
          };
        });

        setRequests(enrichedRequests);
      } catch (err) {
        console.error("Failed to load user records:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Loading your posted records…
      </div>
    );
  }

  // Sort requests: Finalized items fall cleanly to the bottom
  const sortedRequests = [...requests].sort((a, b) => {
    const aHasFee = !!(a.feeReceivedAt || a.fee_received_at);
    const bHasFee = !!(b.feeReceivedAt || b.fee_received_at);
    if (aHasFee && !bHasFee) return 1;
    if (!aHasFee && bHasFee) return -1;
    
    const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
    const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
    return bTime - aTime;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">My Requests</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your posts, accept helper offers, monitor payouts, and track mutual status milestones.
          </p>
        </div>

        {sortedRequests.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/30">
            <p className="text-sm text-muted-foreground">You haven't posted any assistance requests yet.</p>
            <Button asChild size="sm" className="mt-4 rounded-xl">
              <Link to="/post-request">Post a Request</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRequests.map((r) => {
              const isChatOpen = activeChatId === r.id;
              const typeConfig = getRequestType(r.type);
              
              const takenBy = r.takenBy || r.taken_by;
              const takerCompleted = !!(r.takerCompletedAt || r.taker_completed_at);
              const completed = !!(r.completedAt || r.completed_at);
              const feeSettled = !!(r.feeSettledAt || r.fee_settled_at);
              const feeReceived = !!(r.feeReceivedAt || r.fee_received_at);

              let statusLabel = "Open";
              let statusColor = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
              
              if (feeReceived) {
                statusLabel = "Archived & Closed";
                statusColor = "bg-muted text-muted-foreground border-transparent";
              } else if (completed) {
                statusLabel = "Awaiting Payout Transfer";
                statusColor = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
              } else if (feeSettled) {
                statusLabel = "Processing Payout Approval";
                statusColor = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
              } else if (takerCompleted) {
                statusLabel = "Pending Your Verification";
                statusColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse";
              } else if (takenBy) {
                statusLabel = "Assigned & In Progress";
                statusColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
              }

              return (
                <Card key={r.id} className={`p-5 sm:p-6 rounded-2xl transition-all shadow-sm ${feeReceived ? 'opacity-70 bg-muted/20 hover:opacity-90' : 'hover:shadow-md bg-card border-border/60'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`rounded-lg font-medium text-[10px] ${typeConfig.color} bg-background/50 border-current/20`}>
                          {typeConfig.label}
                        </Badge>
                        <Badge variant="outline" className={`rounded-lg text-[10px] font-medium ${statusColor}`}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground truncate pr-4">
                        {r.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {r.description}
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Allocated Reward</div>
                      <div className="text-sm font-bold text-primary flex items-center sm:justify-end gap-1 mt-0.5">
                        <Gift className="h-3.5 w-3.5" />
                        <span>${r.reward ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-4 border-t border-border/40 text-[11px] sm:text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">{r.locationLabel || r.location_label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">
                        Created {r.createdAt || r.created_at ? new Date(r.createdAt || r.created_at || "").toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-1">
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      {takerCompleted && !completed && "⚠️ Helper flagged task done. Check details to verify."}
                      {completed && !feeSettled && "👉 Verified! Complete payout processing steps via details."}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                      {takenBy && (
                        <Button
                          variant={isChatOpen ? "secondary" : "outline"}
                          size="sm"
                          className="rounded-xl h-9"
                          onClick={() => setActiveChatId(isChatOpen ? null : r.id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1.5" />
                          Chat
                        </Button>
                      )}
                      <Button asChild size="sm" className="rounded-xl h-9" variant="ghost">
                        <Link to="/request/$id" params={{ id: r.id }}>
                          Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {isChatOpen && (
                    <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 slide-in-from-top-2 duration-150">
                      <TaskThread
                        requestId={r.id}
                        currentUserId={user!.id}
                        requestOwnerId={r.userId || r.user_id}
                        bidId={r.accepted_bid_id} // Fixed to sync seamlessly with Single Request Page chats
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
