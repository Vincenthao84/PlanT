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
  reward?: number;
  takerCompletedAt?: string | null;
  completedAt?: string | null;
  feeSettledAt?: string | null;
  feeReceivedAt?: string | null;
  hasOwnerReview?: boolean; // Tracking if the owner gave their rating
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
        // 1. Fetch base requests created by this user
        const baseData = await fetchMyRequests(user.id);
        
        if (baseData.length === 0) {
          setRequests([]);
          return;
        }

        const requestIds = baseData.map(r => r.id);

        // 2. Direct Query to look up existing ratings left by this Request owner
        const { data: ratingsData } = await supabase
          .from("request_ratings")
          .select("request_id, requester_id")
          .in("request_id", requestIds)
          .eq("requester_id", user.id);

        // Map request IDs that have been reviewed by the owner
        const reviewedRequestIds = new Set(ratingsData?.map(r => r.request_id) || []);

        // 3. Merge rating flag context into state records directly
        const enrichedRequests: ExtendedStoredRequest[] = baseData.map(r => ({
          ...r,
          hasOwnerReview: reviewedRequestIds.has(r.id)
        }));

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

  // Sort requests so that finalized items (Fee receipt cleared + Owner reviewed) drop to the bottom
  const sortedRequests = [...requests].sort((a, b) => {
    const aFinalized = !!(a.feeReceivedAt && a.hasOwnerReview);
    const bFinalized = !!(b.feeReceivedAt && b.hasOwnerReview);
    
    if (aFinalized && !bFinalized) return 1;
    if (!aFinalized && bFinalized) return -1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Requests</h1>
        <p className="text-muted-foreground text-sm mb-8">Track status updates and review chat matrices for issues you posted.</p>

        {sortedRequests.length === 0 ? (
          <Card className="p-8 text-center space-y-4 border-dashed">
            <p className="text-muted-foreground text-sm">You haven't posted any help requests yet.</p>
            <Button asChild rounded-full>
              <Link to="/">Create Your First Request</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedRequests.map((r) => {
              const typeMeta = getRequestType(r.type);
              const Icon = typeMeta?.icon || MapPin;
              const isChatOpen = activeChatId === r.id;
              
              // Item is fully complete when money is received and owner review is tracked
              const isFinalized = !!(r.feeReceivedAt && r.hasOwnerReview);

              // Compute the status badge label dynamically
              let statusBadge = (
                <Badge variant="outline" className="rounded-full text-[11px] text-muted-foreground">
                  Open Board
                </Badge>
              );

              if (r.takenBy) {
                if (r.feeReceivedAt) {
                  statusBadge = (
                    <Badge className="bg-teal-500/10 text-teal-600 border-none rounded-full text-[11px] font-medium">
                      Fee Settlement Done
                    </Badge>
                  );
                } else if (r.feeSettledAt) {
                  statusBadge = (
                    <Badge className="bg-blue-500/10 text-blue-600 border-none rounded-full text-[11px]">
                      Paid
                    </Badge>
                  );
                } else if (r.completedAt) {
                  statusBadge = (
                    <Badge className="bg-green-500/10 text-green-600 border-none rounded-full text-[11px]">
                      Verified Complete
                    </Badge>
                  );
                } else if (r.takerCompletedAt) {
                  statusBadge = (
                    <Badge className="bg-amber-500/10 text-amber-600 border-none rounded-full text-[11px]">
                      Helper Completed
                    </Badge>
                  );
                } else {
                  statusBadge = (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-full text-[11px]">
                      Assigned
                    </Badge>
                  );
                }
              }

              return (
                <Card key={r.id} className={`p-5 transition-all ${isFinalized ? "opacity-60 bg-muted/20 border-muted" : ""}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[11px] rounded-full">
                            {typeMeta?.label || "Request"}
                          </Badge>
                          {statusBadge}
                          {r.reward !== undefined && (
                            <Badge variant="secondary" className="bg-accent/10 text-accent rounded-full text-[11px] font-medium gap-1">
                              <Gift className="h-3 w-3" /> ${r.reward}
                            </Badge>
                          )}
                        </div>
                        <h3 className={`font-semibold text-base mt-1 tracking-tight transition-all ${isFinalized ? "line-through text-muted-foreground/50" : ""}`}>
                          {r.title}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-accent shrink-0" /> {r.locationLabel}
                          </p>
                          {r.createdAt && (
                            <p className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground shrink-0" /> 
                              {new Date(r.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                      {r.takenBy && (
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
                      <Button asChild size="sm" variant="ghost" className="rounded-xl h-9">
                        <Link to="/request/$id" params={{ id: r.id }}>
                          Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Chat interface dropdown layer block */}
                  {isChatOpen && (
                    <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 slide-in-from-top-2 duration-150">
                      <TaskThread
                        requestId={r.id}
                        currentUserId={user!.id}
                        requestOwnerId={r.userId}
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
