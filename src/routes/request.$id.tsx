import { useState, useEffect } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MapPin, Calendar, DollarSign, User } from "lucide-react";
import { TaskThread } from "@/components/TaskThread";
import { toast } from "sonner";

// TypeScript Interfaces based on your Database Schemas
interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

interface RequestData {
  id: string;
  user_id: string;
  title: string;
  description: string;
  reward: string;
  location: string;
  status: string;
  created_at: string;
  helper_id?: string | null;
}

interface BidData {
  id: string;
  request_id: string;
  helper_id: string;
  amount: string;
  note: string | null;
  status: string;
  photo_urls: string[] | null;
  profiles?: Profile | null; // Populated via clean Supabase join lookup
}

export default function RequestDetailRoute() {
  const { id: requestId } = useParams({ from: "/request/$id" });
  
  // State Management 
  const [request, setRequest] = useState<RequestData | null>(null);
  const [bids, setBids] = useState<BidData[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    let active = true;

    async function initPageData() {
      try {
        // 1. Fetch current authenticated session user profile context
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user && active) {
          setCurrentUserId(sessionData.session.user.id);
        }

        // 2. Fetch primary job request configuration parameters
        const { data: reqData, error: reqErr } = await supabase
          .from("requests")
          .select("id, user_id, title, description, reward, location, status, created_at, helper_id")
          .eq("id", requestId)
          .single();

        if (reqErr) throw reqErr;
        if (active) setRequest(reqData);

        // 3. Fetch active competitive bids linked to this job posting
        const { data: bidsData, error: bidsErr } = await supabase
          .from("request_bids")
          .select(`
            id, 
            request_id, 
            helper_id, 
            amount, 
            note, 
            status, 
            photo_urls,
            profiles (display_name, avatar_url)
          `) // ✅ Clean relational table lookup mapping targeting snake_case schemas
          .eq("request_id", requestId)
          .order("created_at", { ascending: false });

        if (bidsErr) throw bidsErr;
        
        // Safely map data back into typed components array matching Profile interface
        if (active) {
          const formattedBids = (bidsData || []).map((b: any) => ({
            ...b,
            profiles: Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
          }));
          setBids(formattedBids);
        }
      } catch (err: any) {
        console.error("Critical dashboard state hydration failure:", err);
        toast.error("Could not fetch request details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void initPageData();
    return () => { active = false; };
  }, [requestId]);

  // Handler to permanently allocate jobs to top candidates
  async function handleAcceptBid(bid: BidData) {
    if (assigning) return;
    setAssigning(true);

    try {
      // Step A: Update target proposal parameter column status
      const { error: bidUpdateErr } = await supabase
        .from("request_bids")
        .update({ status: "accepted" })
        .eq("id", bid.id);

      if (bidUpdateErr) throw bidUpdateErr;

      // Step B: Set parent task status parameters to 'assigned' and link the helper's ID
      const { error: reqUpdateErr } = await supabase
        .from("requests")
        .update({ 
          status: "assigned", 
          helper_id: bid.helper_id 
        })
        .eq("id", requestId);

      if (reqUpdateErr) throw reqUpdateErr;

      toast.success(`Task successfully assigned to helper!`);
      
      // Force reload UI configuration states seamlessly
      window.location.reload();
    } catch (err: any) {
      console.error("Order processing state resolution error context:", err);
      toast.error("Failed to complete assignment sequence.");
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading task overview...</span>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <p className="text-sm text-muted-foreground">The request you are trying to view could not be found.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Listings</Link>
        </Button>
      </div>
    );
  }

  const isOwner = request.user_id === currentUserId;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Back Navigation Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to listings</Link>
        </Button>
      </div>

      {/* Main Split Interface Viewport Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Request Specifications Overview Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-background border rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {request.status}
                </span>
                <h1 className="text-xl font-bold tracking-tight text-foreground">{request.title}</h1>
              </div>
              <div className="flex items-center gap-0.5 bg-primary/5 border border-primary/10 text-primary px-3 py-1.5 rounded-xl font-bold text-sm shrink-0">
                <DollarSign className="h-4 w-4 -mr-0.5" />
                {request.reward}
              </div>
            </div>

            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {request.description}
            </p>

            <div className="border-t pt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="truncate">{request.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>Posted {new Date(request.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Private Proposing Workspace Accordion List Layer */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Proposals ({bids.length})
            </h3>
          </div>

          {bids.length === 0 ? (
            <div className="border border-dashed rounded-2xl p-8 text-center text-xs text-muted-foreground italic bg-muted/10">
              No offers submitted yet.
            </div>
          ) : (
            <div className="space-y-2">
              {bids.map((bid) => {
                const isSelected = selectedBidId === bid.id;
                
                return (
                  <div 
                    key={bid.id} 
                    className={`border rounded-xl overflow-hidden transition-all duration-200 bg-background shadow-sm ${
                      isSelected ? "ring-1 ring-primary/30 border-primary/40" : "hover:border-border/80"
                    }`}
                  >
                    {/* Accordion Toggle Summary Box Header */}
                    <div 
                      onClick={() => setSelectedBidId(isSelected ? null : bid.id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? "bg-muted/40" : "hover:bg-muted/20"
                      }`}
                    >
                      <div className="space-y-0.5 pr-2 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-semibold text-foreground truncate">
                            {bid.profiles?.display_name || "Anonymous Helper"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 pl-5">
                          {bid.note || "No custom statement provided."}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-primary block">
                          ${bid.amount.replace(/[^0-9.]/g, "")}
                        </span>
                        <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-tight">
                          {isSelected ? "Close" : "Chat & Review"}
                        </span>
                      </div>
                    </div>

                    {/* Extended Hidden Content Workspace */}
                    {isSelected && (
                      <div className="p-3 border-t bg-muted/5 space-y-4">
                        
                        {/* 🌟 CONDITIONAL ACTION BAR: ACCEPT OFFER BUTTON */}
                        {isOwner && request.status === "pending" && bid.status === "pending" && (
                          <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                            <div className="text-[11px]">
                              <p className="font-bold text-foreground">Accept this offer?</p>
                              <p className="text-muted-foreground leading-tight">
                                Assigns the task to {bid.profiles?.display_name || "this helper"}.
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full text-xs h-8 rounded-lg"
                              disabled={assigning}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleAcceptBid(bid);
                              }}
                            >
                              {assigning ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Accept & Assign Winner"
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Status Readouts For Active Selection States */}
                        {bid.status === "accepted" && (
                          <div className="p-2 text-center text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-200">
                            ✓ This proposal was selected as the winner
                          </div>
                        )}

                        {/* 🌟 SEPARATED CHAT STREAM INTERFACE VIEW */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Private Negotiation Channel
                          </p>
                          <TaskThread 
                            requestId={requestId}
                            currentUserId={currentUserId || ""}
                            requestOwnerId={request.user_id}
                            bidId={bid.id} // ✅ Scopes data pipeline natively inside bid sandbox rows!
                          />
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
