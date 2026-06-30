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
    is_secret?: boolean;
    isSecret?: boolean;
  };
  requestorProfile?: {
    display_name: string | null;
    average_rating: number | null;
  } | null;
}

// Restored to your original category definitions
function getCategoryIcon(typeSlug?: string) {
  switch (typeSlug?.toLowerCase()) {
    case "snap":
      return Camera;
    case "knowledge":
      return Brain;
    case "action":
      return Hand;
    case "object":
      return Package;
    case "rental":
      return Key;
    case "anything":
      return MoreHorizontal;
    default:
      return HelpCircle; 
  }
}

function MyBidsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bids, setBids] = useState<BidWithRequestContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function loadBids() {
      try {
        const { data, error } = await supabase
          .from("request_bids")
          .select(`
            id,
            amount,
            note,
            status,
            created_at,
            requests (
              id,
              title,
              location_label,
              user_id,
              type,
              is_secret
            )
          `)
          .eq("helper_id", user.id)
          .neq("status", "accepted") 
          .order("created_at", { ascending: false });

        if (error) throw error;

        const rawBids = (data || []) as any[];

        const creatorIds = Array.from(
          new Set(rawBids.map((b) => b.requests?.user_id).filter(Boolean))
        ) as string[];

        let profilesMap = new Map<string, any>();
        if (creatorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, display_name, average_rating")
            .in("id", creatorIds);

          if (profilesData) {
            profilesData.forEach((p) => profilesMap.set(p.id, p));
          }
        }

        const enriched: BidWithRequestContext[] = rawBids.map((b) => ({
          id: b.id,
          amount: b.amount,
          note: b.note,
          status: b.status,
          created_at: b.created_at,
          requests: b.requests ? {
            ...b.requests,
            isSecret: b.requests.is_secret
          } : null,
          requestorProfile: b.requests?.user_id ? profilesMap.get(b.requests.user_id) : null,
        }));

        setBids(enriched);
      } catch (err) {
        console.error("Error loading bids:", err);
        toast.error("Failed to load your offers/bids");
      } finally {
        setLoading(false);
      }
    }

    void loadBids();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Loading bids and offers…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Offers &amp; Bids</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Review or manage your ongoing bids sent out to notice board requests.
        </p>

        {bids.length === 0 ? (
          <Card className="p-8 text-center space-y-4 border-dashed">
            <p className="text-muted-foreground text-sm">You haven't placed any offers on requests yet.</p>
            <Button asChild className="rounded-full">
              <Link to="/notice-board">Browse Notice Board</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {bids.map((b) => {
              const req = b.requests;
              if (!req) return null;

              const isChatOpen = activeChatId === b.id;
              const IconComponent = getCategoryIcon(req.type);
              const isSecretRequest = !!(req.is_secret || req.isSecret);

              let statusColor = "bg-amber-500/10 text-amber-600 border-none";
              if (b.status === "rejected") statusColor = "bg-destructive/10 text-destructive border-none";
              if (b.status === "withdrawn") statusColor = "bg-muted text-muted-foreground border-none";

              return (
                <Card key={b.id} className="p-5 transition-all">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center shrink-0">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <Badge variant="secondary" className="text-[11px] rounded-full uppercase tracking-wider">
                            Bid: ${b.amount}
                          </Badge>
                          <Badge className={`rounded-full text-[11px] capitalize ${statusColor}`}>
                            {b.status}
                          </Badge>
                        </div>

                        <h3 className="font-semibold text-base tracking-tight truncate text-foreground">
                          {req.title}
                        </h3>

                        {b.requestorProfile && (
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground bg-muted/40 py-0.5 px-2 rounded w-fit">
                            <span>
                              Requestor:{" "}
                              <strong className="text-foreground">
                                {isSecretRequest ? "Secret Request" : (b.requestorProfile.display_name || "Anonymous")}
                              </strong>
                            </span>
                            {!isSecretRequest && b.requestorProfile.average_rating !== null && b.requestorProfile.average_rating !== undefined && (
                              <span className="inline-flex items-center gap-0.5 text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.2 rounded text-[10px]">
                                <Star className="h-2.5 w-2.5 fill-amber-500 stroke-amber-500" />
                                {Number(b.requestorProfile.average_rating).toFixed(1)}
                              </span>
                            )}
                          </div>
                        )}

                        {b.note && (
                          <p className="text-xs text-muted-foreground mt-2 bg-muted/20 p-2 rounded-lg italic line-clamp-2">
                            "{b.note}"
                          </p>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 text-[11px] text-muted-foreground">
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-accent shrink-0" /> {req.location_label || "Pinned Location"}
                          </p>
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                            Offered {new Date(b.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
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
