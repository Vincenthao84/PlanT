import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TaskThread } from "@/components/TaskThread";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  MapPin, 
  MessageSquare, 
  Clock, 
  ExternalLink,
  Camera,
  Brain,
  Hand,
  Package,
  Key,
  MoreHorizontal,
  HelpCircle,
  Star
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/my-bids")({
  component: MyBidsPage,
});

interface BidWithRequestContext {
  id: string;
  amount: string;
  note: string;
  status: "pending" | "rejected" | "withdrawn";
  created_at: string;
  requests: {
    id: string;
    title: string;
    location_label: string;
    user_id: string;
    type?: string; 
  };
  requestorProfile?: {
    display_name: string | null;
    average_rating: number | null;
  } | null;
}

function getCategoryIcon(typeSlug?: string) {
  switch (typeSlug?.toLowerCase()) {
    case "snap":
      return <Camera className="h-5 w-5" />;
    case "knowledge":
      return <Brain className="h-5 w-5" />;
    case "action":
      return <Hand className="h-5 w-5" />;
    case "object":
      return <Package className="h-5 w-5" />;
    case "rental":
      return <Key className="h-5 w-5" />;
    case "anything":
      return <MoreHorizontal className="h-5 w-5" />;
    default:
      return <HelpCircle className="h-5 w-5" />; 
  }
}

function MyBidsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bids, setBids] = useState<BidWithRequestContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchMyPendingBids() {
      try {
        // 1. Get raw bids data joining requests info
        const { data, error } = await supabase
          .from("request_bids")
          .select(`
            id, amount, note, status, created_at,
            requests:request_id (
              id, title, location_label, user_id, type
            )
          `) 
          .eq("helper_id", user.id)
          .neq("status", "accepted") 
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        const rawBids = (data as any) || [];

        // 2. Perform safe batch look-up of profile objects matching distinct request user_ids
        const requestorUserIds = Array.from(
          new Set(rawBids.map((b: any) => b.requests?.user_id).filter(Boolean))
        ) as string[];

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

        // 3. Map values together safely
        const completeBids: BidWithRequestContext[] = rawBids.map((b: any) => ({
          ...b,
          requestorProfile: b.requests?.user_id ? profilesMap.get(b.requests.user_id) : null
        }));

        setBids(completeBids);
      } catch (err) {
        console.error("Error loading pending bid rows:", err);
        toast.error("Could not load bid negotiation records.");
      } finally {
        setLoading(false);
      }
    }

    void fetchMyPendingBids();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Assembling bid applications…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Placed Bids</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Review negotiations, proposals, and chat with Requestors before acceptance.
        </p>

        {bids.length === 0 ? (
          <Card className="p-8 text-center space-y-4 border-dashed">
            <p className="text-muted-foreground text-sm">No active or pending bids found.</p>
            <Button asChild className="rounded-full">
              <Link to="/notice-board">Explore Requests Notice Board</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {bids.map((b) => {
              const req = b.requests;
              const isChatOpen = activeChatId === b.id;
              
              if (!req) return null;

              const requestorProfile = b.requestorProfile;

              return (
                <Card key={b.id} className="p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                        {getCategoryIcon(req.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant={b.status === "pending" ? "secondary" : "destructive"} 
                            className="text-[10px] rounded-full uppercase tracking-wider px-2 py-0.5"
                          >
                            {b.status}
                          </Badge>
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                            Offer: ${b.amount}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-base mt-1.5 tracking-tight">{req.title}</h3>
                        
                        {requestorProfile && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground bg-muted/40 py-0.5 px-2 rounded w-fit">
                            <span>Requestor: <span className="font-semibold text-foreground">{requestorProfile.display_name || "User"}</span></span>
                            {requestorProfile.average_rating !== null && requestorProfile.average_rating !== undefined && (
                              <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium ml-1">
                                <Star className="h-3 w-3 fill-amber-500 stroke-amber-500" />
                                {Number(requestorProfile.average_rating).toFixed(1)}
                              </span>
                            )}
                          </div>
                        )}

                        {b.note && (
                          <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg my-1.5 italic">
                            "{b.note}"
                          </p>
                        )}
                        
                        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-accent" /> {req.location_label}
                          <span className="mx-1">•</span>
                          <Clock className="h-3 w-3" /> Sent {new Date(b.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      <Button
                        variant={isChatOpen ? "secondary" : "outline"}
                        size="sm"
                        className="rounded-xl h-9"
                        onClick={() => setActiveChatId(isChatOpen ? null : b.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1.5" />
                        {isChatOpen ? "Close Chat" : "Chat Requestor"}
                      </Button>
                      
                      <Button asChild size="sm" variant="ghost" className="rounded-xl h-9">
                        <Link to="/request/$id" params={{ id: req.id }}>
                          View Post <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {isChatOpen && (
                    <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in-50 slide-in-from-top-2 duration-150">
                      <TaskThread
                        requestId={req.id}
                        currentUserId={user!.id}
                        requestOwnerId={req.user_id}
                        bidId={b.id}
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
