import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Gift, Clock, Inbox, CheckCircle2, ClipboardList, Check, RotateCcw, BadgeCheck, MessageSquare, AlertCircle, RefreshCw, Star } from "lucide-react";
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
  const [tasks, setTasks] = useState<(StoredRequest & { bidId?: string })[] | null>(null);
  const [activeChatTaskId, setActiveChatTaskId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getAssignedTasks = useCallback(async (userId: string) => {
    try {
      const { data: directData, error: directError } = await supabase
        .from("requests")
        .select(`
          *,
          request_bids(id, helper_id)
        `)
        .eq("taken_by", userId);

      if (directError) throw directError;

      const { data: bidData, error: bidError } = await supabase
        .from("request_bids")
        .select(`
          id,
          request_id, 
          requests (
            *,
            request_bids(id, helper_id)
          )
        `)
        .eq("helper_id", userId)
        .eq("status", "accepted");

      if (bidError) throw bidError;

      const combinedMap = new Map<string, any>();

      if (directData) {
        directData.forEach((item) => combinedMap.set(item.id, item));
      }

      if (bidData) {
        bidData.forEach((bid: any) => {
          if (bid.requests && !combinedMap.has(bid.requests.id)) {
            combinedMap.set(bid.requests.id, {
              ...bid.requests,
              _forcedBidId: bid.id
            });
          }
        });
      }

      const unifiedData = Array.from(combinedMap.values());
      const requestorUserIds = Array.from(new Set(unifiedData.map((item) => item.user_id).filter(Boolean)));
      
      let profilesMap = new Map<string, any>();
      if (requestorUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, average_rating")
          .in("id", requestorUserIds);

        if (!profilesError && profilesData) {
          profilesData.forEach((p) => profilesMap.set(p.id, p));
        }
      }

      const mapped: (StoredRequest & { bidId?: string })[] = unifiedData.map((item: any) => {
        const matchedBid = item.request_bids?.find((b: any) => b.helper_id === userId);
        const resolvedBidId = item._forcedBidId || matchedBid?.id;

        return {
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
          takenBy: item.taken_by || userId, 
          takenAt: item.taken_at || item.created_at,
          takerCompletedAt: item.taker_completed_at || item.takerCompletedAt,
          completedAt: item.completed_at || item.completedAt,
          feeSettledAt: item.fee_settled_at || item.feeSettledAt,
          photoUrls: item.photo_urls || item.photoUrls || [], 
          paymentQrUrl: item.payment_qr_url || item.paymentQrUrl,
          requestorProfile: profilesMap.get(item.user_id) || null,
          bidId: resolvedBidId
        };
      });

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
    toast.success("Task list synchronized.");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Verifying credential scopes...
      </div>
    );
  }

  if (isMounted && !user) {
    return <Navigate to="/" replace />;
  }

  const activeTasks = tasks?.filter(t => !t.completedAt) || [];
  const completedTasks = tasks?.filter(t => !!t.completedAt) || [];

  const handleCompleteClick = async (requestId: string) => {
    try {
      const success = await takerCompleteRequest(requestId);
      if (success) {
        toast.success("Marked task as completed! Awaiting requester verification.");
        if (user?.id) void getAssignedTasks(user.id);
      }
    } catch {
      toast.error("Could not update task state.");
    }
  };

  const handleReopenClick = async (requestId: string) => {
    try {
      const success = await takerReopenRequest(requestId);
      if (success) {
        toast.success("Task marked back as in-progress.");
        if (user?.id) void getAssignedTasks(user.id);
      }
    } catch {
      toast.error("Could not reopen task.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/10">
      <SiteHeader />
      
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              My Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track real-time updates on tasks you are completing for other members.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualRefresh} 
            disabled={refreshing}
            className="rounded-xl h-9 text-xs w-full sm:w-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${refreshing ? "animate-spin text-primary" : ""}`} />
            Refresh Feeds
          </Button>
        </div>

        {tasks === null ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 w-full bg-muted/40 animate-pulse rounded-2xl border" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed rounded-2xl bg-muted/20 px-4">
            <div className="p-3 bg-muted rounded-2xl mb-4 text-muted-foreground">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold">No assigned tasks</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Browse the Notice Board to find active listings and place bids to help others.
            </p>
            <Button asChild size="sm" className="mt-4 rounded-xl">
              <Link to="/notice-board">Go to Notice Board</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {activeTasks.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  In Progress ({activeTasks.length})
                </h2>
                <div className="space-y-4">
                  {activeTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      user={user!} 
                      activeChatTaskId={activeChatTaskId}
                      setActiveChatTaskId={setActiveChatTaskId}
                      onComplete={handleCompleteClick}
                      onReopen={handleReopenClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Completed ({completedTasks.length})
                </h2>
                <div className="space-y-4">
                  {completedTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      user={user!} 
                      activeChatTaskId={activeChatTaskId}
                      setActiveChatTaskId={setActiveChatTaskId}
                      onComplete={handleCompleteClick}
                      onReopen={handleReopenClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

interface TaskCardProps {
  task: StoredRequest & { bidId?: string };
  user: any;
  activeChatTaskId: string | null;
  setActiveChatTaskId: (id: string | null) => void;
  onComplete: (id: string) => void;
  onReopen: (id: string) => void;
}

function TaskCard({ task, user, activeChatTaskId, setActiveChatTaskId, onComplete, onReopen }: TaskCardProps) {
  const { id, title, description, reward, locationLabel, type, takerCompletedAt, completedAt, userId, takenBy, feeSettledAt, requestorProfile, bidId } = task;
  const isChatOpen = activeChatTaskId === id;
  const reqType = getRequestType(type);

  const takerDone = !!takerCompletedAt;
  const fullySettled = !!completedAt;

  return (
    <Card className="p-5 sm:p-6 rounded-2xl border border-border/50 hover:border-border/90 transition-all shadow-sm hover:shadow-md bg-card flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Orange-themed customized Request Type badge structure */}
            <Badge variant="outline" className="rounded-lg font-bold text-xs bg-[#FFF3EB] text-[#FF6B00] border-[#FFE0CC] px-2.5 py-0.5">
              {reqType.label}
            </Badge>
            
            {fullySettled ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 rounded-lg text-xs font-medium flex items-center gap-1 px-2 py-0.5">
                <BadgeCheck className="h-3.5 w-3.5" /> Settled & Closed
              </Badge>
            ) : takerDone ? (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20 rounded-lg text-xs font-medium flex items-center gap-1 px-2 py-0.5">
                <Check className="h-3.5 w-3.5" /> Verification Pending
              </Badge>
            ) : (
              <Badge variant="secondary" className="rounded-lg text-xs font-medium bg-muted/60 text-muted-foreground border border-border/40 px-2 py-0.5">
                In Progress
              </Badge>
            )}
          </div>
          
          {/* Scaled-up text settings matching legacy interface */}
          <h3 className="text-base font-bold text-foreground pr-2 leading-snug">
            {title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {description || <span className="italic opacity-50">No structural details specified.</span>}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Reward</div>
          <div className="text-base font-black text-[#FF6B00] flex items-center justify-end gap-1 mt-0.5">
            <Gift className="h-4 w-4" />
            <span>${reward}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40 text-sm text-muted-foreground">
        {/* Customized Orange Location Pin Container layout */}
        <div className="flex items-center gap-2 min-w-0 bg-[#FFF3EB]/30 p-2.5 rounded-xl border border-[#FFE0CC]/40">
          <MapPin className="h-4 w-4 text-[#FF6B00] shrink-0" />
          <span className="truncate text-foreground font-medium">{locationLabel}</span>
        </div>
        
        <div className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/20">
          <Clock className="h-4 w-4 text-muted-foreground/70 shrink-0" />
          <div className="truncate">
            {fullySettled ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Finished task</span>
            ) : takerDone ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                Finished <TimeAgoText dateString={takerCompletedAt ?? undefined} />
              </span>
            ) : (
              <span>Accepted task <TimeAgoText dateString={task.takenAt ?? undefined} /></span>
            )}
          </div>
        </div>
      </div>

      {requestorProfile && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/30 text-sm">
          <div className="w-5.5 h-5.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {requestorProfile.display_name?.slice(0,1).toUpperCase() || "R"}
          </div>
          <span className="text-muted-foreground font-medium">Requester:</span>
          <span className="text-foreground font-semibold">{requestorProfile.display_name || "Anonymous Member"}</span>
          {requestorProfile.average_rating > 0 && (
            <div className="flex items-center gap-0.5 ml-auto text-amber-500 font-medium text-xs">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{Number(requestorProfile.average_rating).toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1 pt-1">
        <div className="text-xs text-muted-foreground italic">
          {feeSettledAt && !fullySettled && "⚠️ Requester paid transaction fees. Task closing shortly."}
        </div>
        
        <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
          <Button
            variant={isChatOpen ? "secondary" : "outline"}
            size="sm"
            className="rounded-xl h-9 text-xs"
            onClick={() => setActiveChatTaskId(isChatOpen ? null : id)}
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Chat
          </Button>
          
          <Button asChild variant="ghost" size="sm" className="rounded-xl h-9 text-xs">
            <Link to="/request/$id" params={{ id }}>
              View Details
            </Link>
          </Button>

          {!fullySettled && (
            <>
              {takerDone ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-9 text-xs border-amber-500/30 hover:bg-amber-500/5 text-amber-600 dark:text-amber-400"
                  onClick={() => onReopen(id)}
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Reopen Task
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="rounded-xl h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
                  onClick={() => onComplete(id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Mark Completed
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {isChatOpen && (
        <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 slide-in-from-top-1 duration-200">
          <TaskThread 
            requestId={id} 
            currentUserId={user.id} 
            requestOwnerId={userId} 
            bidId={bidId} 
          />
        </div>
      )}

      {(takerDone || fullySettled) && takenBy && (
        <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 slide-in-from-top-1 duration-200">
          <p className="text-sm text-muted-foreground mb-3 flex items-start gap-1.5 bg-muted/50 p-2.5 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
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
}
