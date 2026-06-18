import React, { useState, useEffect } from "react";
import { 
  X, 
  Loader2, 
  Camera, 
  Send, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clock, 
  User, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  FileText, 
  Info,
  ArrowLeft,
  Share2,
  Bookmark,
  ThumbsUp,
  MoreVertical,
  Flag
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// ==========================================
// MOCK COMPONENTS & STUBS FOR COMPILATION
// ==========================================
// Replace these local definitions with your actual imports if preferred
const PaymentQRUpload = ({ requestId, takerId, currentUserId }: any) => (
  <div className="p-4 border border-dashed rounded-xl bg-muted/30 space-y-3">
    <p className="text-xs text-muted-foreground">Upload your verification receipt or scan code here:</p>
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" className="text-xs rounded-lg gap-1.5">
        <Camera className="h-3.5 w-3.5" /> Select Image
      </Button>
      <span className="text-[11px] text-muted-foreground">No file chosen (ID: {requestId})</span>
    </div>
  </div>
);

const SiteFooter = () => (
  <footer className="border-t border-muted bg-card py-6 text-center text-xs text-muted-foreground mt-auto">
    <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p>© 2026 Procurement & Contract Notice Platform. All rights reserved.</p>
      <div className="flex gap-4">
        <a href="#terms" className="hover:underline">Terms of Service</a>
        <a href="#privacy" className="hover:underline">Privacy Policy</a>
      </div>
    </div>
  </footer>
);

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface UserProfile {
  id: string;
  name: string;
  role: "client" | "provider" | "admin";
  avatarUrl?: string;
  rating?: number;
}

interface BidProposal {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  amount: number;
  note: string;
  mediaUrls: string[];
  createdAt: string;
  status: "pending" | "accepted" | "declined";
}

interface PrivateThreadMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

interface NoticeRequest {
  id: string;
  title: string;
  description: string;
  extendedDetails?: string;
  budget?: number | string;
  location?: string;
  deadline?: string;
  category?: string;
  createdAt: string;
  status: "open" | "assigned" | "completed" | "expired";
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  takenBy?: string | null;
  takerCompletedAt?: string | null;
  completedAt?: string | null;
  referenceImages?: string[];
}

interface RequestNoticeDetailProps {
  initialRequest?: NoticeRequest;
  currentUser?: UserProfile | null;
  onBidSubmit?: (amount: number, note: string, attachments: string[]) => Promise<boolean>;
  onAcceptBid?: (bidId: string, providerId: string) => Promise<void>;
  onSendMessage?: (threadId: string, text: string) => Promise<void>;
}

// ==========================================
// MAIN COMPONENT (Unified Part 1 & Part 2)
// ==========================================
export default function RequestNoticeDetail({
  initialRequest,
  currentUser,
  onBidSubmit,
  onAcceptBid,
  onSendMessage
}: RequestNoticeDetailProps) {
  
  // ----------------------------------------
  // STATE MANAGEMENT
  // ----------------------------------------
  // Core Business entities
  const [request, setRequest] = useState<NoticeRequest>(initialRequest || {
    id: "req-83910-x",
    title: "Enterprise Network Infrastructure Optimization & Fiber Layout Strategy",
    description: "We require an experienced network architect or certified systems engineering vendor to audit our existing server room topology, map optical fiber deployment paths across three corporate floors, and provide full configuration schemas. The chosen provider must submit structured timeline projections alongside performance load guarantees.",
    extendedDetails: "Additional context: The current backbone network relies on legacy Cat5e runs that bottleneck traffic at peak operational hours. The target architecture mandates upgrading the core layers to 10GbE using Single-Mode Fiber (SMF) assemblies. All hardware provisions must adhere strictly to compliance frameworks outlined in ISO/IEC 27001.",
    budget: "$4,500 - $6,000 USD",
    location: "Building C, Tech District - Hybrid / On-Site",
    deadline: "Within 21 Business Days",
    category: "Network Architecture",
    createdAt: "2026-06-10",
    status: "open",
    ownerId: "user-client-101",
    ownerName: "Alex Mercer (Operations Core)",
    ownerAvatar: "",
    takenBy: null,
    takerCompletedAt: null,
    completedAt: null,
    referenceImages: [
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&q=80",
      "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=300&q=80"
    ]
  });

  const [user, setUser] = useState<UserProfile | null>(currentUser !== undefined ? currentUser : {
    id: "user-provider-707",
    name: "Sarah Jenkins (Apex Solutions)",
    role: "provider",
    avatarUrl: ""
  });

  // Active Bids submitted on this specific item
  const [existingBids, setExistingBids] = useState<BidProposal[]>([
    {
      id: "bid-1",
      userId: "user-provider-999",
      userName: "David K. (Matrix Integrations)",
      amount: 5200,
      note: "We have finalized identical 10GbE fiber installations for two industrial logistics clients. Can deploy certified optical equipment immediately upon selection.",
      mediaUrls: ["https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=100&q=80"],
      createdAt: "2026-06-12 14:30",
      status: "pending"
    }
  ]);

  // Form State Elements
  const [bidAmount, setBidAmount] = useState<string>("");
  const [bidNote, setBidNote] = useState<string>("");
  const [uploadedBidUrls, setUploadedBidUrls] = useState<string[]>([]);
  const [uploadingBidPhotos, setUploadingBidPhotos] = useState<boolean>(false);
  const [submittingBid, setSubmittingBid] = useState<boolean>(false);
  
  // UI Interactive States
  const [activeTab, setActiveTab] = useState<"details" | "proposals" | "messages">("details");
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [expandedBidId, setExpandedBidId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");

  // Private Threads Mock System (Accordion Context)
  const [privateThreads, setPrivateThreads] = useState<{[key: string]: PrivateThreadMessage[]}>({
    "bid-1": [
      { id: "m1", senderId: "user-provider-999", senderName: "David K.", text: "Hello Alex, are the structural cable trays easily accessible between floor 2 and 3?", timestamp: "2026-06-12 15:00" },
      { id: "m2", senderId: "user-client-101", senderName: "Alex Mercer", text: "Yes, they are housed behind the main access utility panels right next to the elevators.", timestamp: "2026-06-13 09:12" }
    ]
  });

  // Structural Evaluators
  const isOwner = user ? user.id === request.ownerId : false;
  const hasAlreadyBid = existingBids.some(b => b.userId === (user?.id || ""));

  // ----------------------------------------
  // LOGIC HANDLERS
  // ----------------------------------------
  const handleBidPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploadingBidPhotos(true);
    
    // Simulate multi-file cloud upload pipeline delay
    setTimeout(() => {
      const filesArray = Array.from(e.target.files || []);
      const simulatedUrls = filesArray.map((_, i) => 
        `https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=150&q=80&sig=${Math.floor(Math.random() * 1000)}`
      );
      
      setUploadedBidUrls(prev => {
        const combined = [...prev, ...simulatedUrls];
        return combined.slice(0, 5); // Hard absolute safety clamp at 5 items
      });
      setUploadingBidPhotos(false);
    }, 1200);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!bidAmount || isNaN(Number(bidAmount))) {
      alert("Please provide a valid numeric bidding amount.");
      return;
    }

    setSubmittingBid(true);

    // Simulate database network operations delay
    setTimeout(() => {
      if (onBidSubmit) {
        onBidSubmit(Number(bidAmount), bidNote, uploadedBidUrls);
      }

      const newBid: BidProposal = {
        id: `bid-gen-${Date.now()}`,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatarUrl,
        amount: Number(bidAmount),
        note: bidNote,
        mediaUrls: [...uploadedBidUrls],
        createdAt: "Just now",
        status: "pending"
      };

      setExistingBids(prev => [newBid, ...prev]);
      setSubmittingBid(false);
      
      // Clear values out smoothly
      setBidAmount("");
      setBidNote("");
      setUploadedBidUrls([]);
      setActiveTab("proposals"); // Toggle panel focus to show outcome
    }, 1500);
  };

  const handleAcceptProposal = async (bidId: string, providerId: string) => {
    if (!window.confirm("Are you sure you want to accept this proposal bid and lock the contract statement?")) return;
    
    if (onAcceptBid) {
      await onAcceptBid(bidId, providerId);
    }

    setExistingBids(prev => prev.map(b => b.id === bidId ? { ...b, status: "accepted" } : { ...b, status: "declined" }));
    setRequest(prev => ({
      ...prev,
      status: "assigned",
      takenBy: providerId
    }));
  };

  const handleSendThreadMessage = (bidId: string) => {
    if (!replyText.trim() || !user) return;

    const newMessage: PrivateThreadMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      text: replyText.trim(),
      timestamp: "Just now"
    };

    setPrivateThreads(prev => ({
      ...prev,
      [bidId]: [...(prev[bidId] || []), newMessage]
    }));
    setReplyText("");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-muted/20 antialiased font-sans">
      
      {/* GLOBAL HEADER TOPOGRAPHY BAR */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-1.5 hover:bg-muted rounded-xl transition-colors">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="h-5 w-[1px] bg-muted" />
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Notice Hub ID / {request.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setIsBookmarked(!isBookmarked)}>
              <Bookmark className={`h-3.5 w-3.5 transition-all ${isBookmarked ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE SECTION */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 space-y-6">
        
        {/* CONDITIONAL STATUS OVERLAY BANNER */}
        {request.status === "assigned" && (
          <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-2xl text-xs font-medium">
            <Shield className="h-4 w-4 shrink-0 animate-pulse text-amber-500" />
            <span>This Notice Proposal has been locked and assigned to a contracted vendor partner. Bidding is now finalized.</span>
          </div>
        )}

        <Card className="overflow-hidden border shadow-sm rounded-2xl bg-background">
          {/* NOTICE HERO DECORATOR */}
          <div className="h-2 w-full bg-gradient-to-r from-accent via-indigo-500 to-emerald-500" />
          
          <div className="p-6 space-y-6">
            
            {/* PART 1: DESCRIPTION HEADER AND METADATA */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                  {request.category || "General Procurement"}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Posted on {request.createdAt}</span>
                </div>
              </div>

              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
                {request.title}
              </h1>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-muted/50 w-fit">
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center font-semibold text-accent text-xs">
                  {request.ownerName.charAt(0)}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Notice Issuer</p>
                  <p className="text-xs font-bold text-foreground">{request.ownerName}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Core Scope & Intent</h3>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {request.description}
                </p>
                {request.extendedDetails && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-muted/30">
                    {request.extendedDetails}
                  </p>
                )}
              </div>

              {/* REFERENCE GRAPHICS ATTACHMENTS */}
              {request.referenceImages && request.referenceImages.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reference Schematic Attachments</h4>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {request.referenceImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setExpandedImage(img)}
                        className="relative w-24 h-16 rounded-xl overflow-hidden border bg-muted shrink-0 cursor-pointer hover:opacity-90 transition-opacity group shadow-2-xs"
                      >
                        <img src={img} alt="Notice Layout Reference" className="object-cover w-full h-full" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ExternalLink className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TARGET FIELD META BADGES GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-y py-4 border-dashed border-muted/80">
                {request.budget && (
                  <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-muted/20">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Budget Target</p>
                      <p className="text-xs font-bold text-foreground">{request.budget}</p>
                    </div>
                  </div>
                )}
                {request.location && (
                  <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-muted/20">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Location Scope</p>
                      <p className="text-xs font-bold text-foreground truncate max-w-[160px]">{request.location}</p>
                    </div>
                  </div>
                )}
                {request.deadline && (
                  <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-muted/20">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Target Timeline</p>
                      <p className="text-xs font-bold text-foreground">{request.deadline}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEGMENTED CONTROL TABS */}
            <div className="flex border-b border-muted/60 text-xs font-medium">
              <button 
                onClick={() => setActiveTab("details")}
                className={`px-4 py-2 border-b-2 transition-colors ${activeTab === "details" ? "border-accent text-accent font-bold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Submission Portal
              </button>
              <button 
                onClick={() => setActiveTab("proposals")}
                className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "proposals" ? "border-accent text-accent font-bold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Active Proposals ({existingBids.length})
              </button>
            </div>

            {/* TAB CONTENT: DETAILS & BIDDING FORM SUBMISSIONS */}
            {activeTab === "details" && (
              <div className="space-y-6 animate-fade-in">
                
                {/* PART 2: PROPOSAL BIDDING FORM CONTEXT CONTAINER */}
                {user && !isOwner && !request.takenBy && !hasAlreadyBid && (
                  <div className="space-y-4 pt-2 bg-muted/10 p-4 rounded-2xl border border-muted/30">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-accent" />
                        Submit Secure Configuration Bid
                      </h3>
                      <p className="text-xs text-muted-foreground">Provide targeted pricing and contractual execution details for review.</p>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Bid Amount ($)
                          </label>
                          <div className="relative max-w-[200px]">
                            <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">$</span>
                            <input 
                              type="number"
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)} 
                              className="rounded-xl h-10 w-full pl-7 pr-3 bg-background border border-input text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" 
                              placeholder="0.00"
                              required 
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Introduction or Service Note
                          </label>
                          <Textarea 
                            placeholder="Explain your line deployment strategy, hardware choices, or certified timeline parameters..." 
                            value={bidNote} 
                            onChange={(e) => setBidNote(e.target.value)} 
                            className="rounded-xl min-h-[90px] resize-none text-xs bg-background" 
                            maxLength={300} 
                          />
                        </div>

                        {/* DOCUMENT MEDIA HANDLER BAR */}
                        <div className="space-y-2 pt-1">
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Bid Document/Reference Photos ({uploadedBidUrls.length}/5)
                          </label>
                          
                          {uploadedBidUrls.length > 0 && (
                            <div className="flex gap-2 pb-1 flex-wrap">
                              {uploadedBidUrls.map((url, idx) => (
                                <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border bg-card shadow-xs group">
                                  <img src={url} alt="Bidding Thumb File" className="object-cover w-full h-full" />
                                  <button 
                                    type="button" 
                                    onClick={() => setUploadedBidUrls(p => p.filter((_, i) => i !== idx))} 
                                    className="absolute top-0.5 right-0.5 bg-black/80 hover:bg-black text-white rounded-full p-0.5 transition-colors shadow-sm"
                                  >
                                    <X className="h-2 w-2" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {uploadedBidUrls.length < 5 && (
                            <label className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-medium bg-background hover:bg-muted/60 transition-colors shadow-xs cursor-pointer">
                              <input 
                                type="file" 
                                accept="image/*" 
                                multiple 
                                className="hidden" 
                                onChange={handleBidPhotoUpload} 
                                disabled={uploadingBidPhotos} 
                              />
                              {uploadingBidPhotos ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              ) : (
                                <Camera className="h-3.5 w-3.5 text-accent" />
                              )}
                              {uploadingBidPhotos ? "Uploading Media..." : "Attach Reference Document"}
                            </label>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-end pt-1">
                        <Button 
                          type="submit" 
                          className="rounded-full px-6 gap-2 text-xs" 
                          disabled={submittingBid || uploadingBidPhotos}
                        >
                          {submittingBid ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Submitting Offer...
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              Submit Proposal Bid
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* LOGGED IN BUT PREVENTED BID STATUS OVERLAYS */}
                {user && hasAlreadyBid && (
                  <div className="p-4 border rounded-xl bg-emerald-500/5 text-emerald-700 text-xs border-emerald-500/20 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Your configuration proposal has been securely logged. Wait for the notice issuer to review your timeline metrics.</span>
                  </div>
                )}

                {user && isOwner && (
                  <div className="p-4 border border-dashed rounded-xl bg-accent/5 text-accent text-xs flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>You own this notice card listings. Select the <strong>"Active Proposals"</strong> tab above to analyze incoming vendor offers and secure binding assignments.</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: ACTIVE PROPOSALS LIST & ACCORDION THREADS */}
            {activeTab === "proposals" && (
              <div className="space-y-4 animate-fade-in">
                {existingBids.length === 0 ? (
                  <div className="text-center py-8 border border-dashed rounded-2xl bg-muted/20">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
                    <p className="text-xs text-muted-foreground">No proposals have been registered against this network file yet.</p>
                  </div>
                ) : (
                  existingBids.map((bid) => (
                    <div 
                      key={bid.id} 
                      className={`border rounded-xl overflow-hidden transition-all bg-card ${bid.status === "accepted" ? "ring-2 ring-emerald-500 border-emerald-500" : "hover:border-muted-foreground/30"}`}
                    >
                      {/* BID BODY MATRICES */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                              {bid.userName.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-foreground">{bid.userName}</h4>
                              <p className="text-[10px] text-muted-foreground">{bid.createdAt}</p>
                            </div>
                            {bid.status === "accepted" && (
                              <span className="ml-2 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 bg-emerald-500 text-white rounded-md flex items-center gap-1">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Assigned Partner
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-foreground/90 whitespace-pre-line">{bid.note}</p>
                          
                          {/* Attached Bid Graphics */}
                          {bid.mediaUrls && bid.mediaUrls.length > 0 && (
                            <div className="flex gap-2 pt-1">
                              {bid.mediaUrls.map((url, i) => (
                                <img 
                                  key={i} 
                                  src={url} 
                                  alt="Proposal Document" 
                                  className="w-10 h-10 object-cover rounded border bg-muted cursor-pointer" 
                                  onClick={() => setExpandedImage(url)}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* BID ACTIONS & TARGET ASSIGNMENTS */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                          <div>
                            <p className="text-[10px] text-muted-foreground text-right">Proposed Value</p>
                            <p className="text-sm font-black text-emerald-600">${bid.amount.toLocaleString()}</p>
                          </div>
                          
                          {isOwner && request.status === "open" && (
                            <Button 
                              size="sm" 
                              variant="default"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 rounded-lg px-3"
                              onClick={() => handleAcceptProposal(bid.id, bid.userId)}
                            >
                              Accept Proposal
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* PRIVATE MESSAGES COLLAPSIBLE WORKSPACE (ACCORDION) */}
                      <div className="border-t bg-muted/20">
                        <button 
                          onClick={() => setExpandedBidId(expandedBidId === bid.id ? null : bid.id)}
                          className="w-full px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground hover:bg-muted/40 transition-colors font-medium"
                        >
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3" />
                            Private Discussion Thread ({privateThreads[bid.id]?.length || 0})
                          </span>
                          {expandedBidId === bid.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {expandedBidId === bid.id && (
                          <div className="p-3 bg-background border-t space-y-3 animate-slide-down">
                            <div className="max-h-[160px] overflow-y-auto space-y-2 p-1 bg-muted/10 rounded-lg">
                              {(privateThreads[bid.id] || []).map((msg) => (
                                <div key={msg.id} className="text-xs p-2 rounded-xl bg-card border shadow-2-xs">
                                  <div className="flex items-center justify-between opacity-80 mb-0.5">
                                    <span className="font-bold text-[10px] text-accent">{msg.senderName}</span>
                                    <span className="text-[9px] text-muted-foreground">{msg.timestamp}</span>
                                  </div>
                                  <p className="text-foreground/90 text-[11px]">{msg.text}</p>
                                </div>
                              ))}
                              {(!privateThreads[bid.id] || privateThreads[bid.id].length === 0) && (
                                <p className="text-center text-[10px] text-muted-foreground py-2">No private queries initiated yet.</p>
                              )}
                            </div>

                            {/* FEEDBACK SEND INPUT */}
                            {user && (user.id === bid.userId || isOwner) && (
                              <div className="flex gap-2 pt-1">
                                <input 
                                  type="text" 
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Type private clarification note..."
                                  className="flex-1 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                                  onKeyDown={(e) => e.key === "Enter" && handleSendThreadMessage(bid.id)}
                                />
                                <Button 
                                  size="sm" 
                                  className="h-7 text-[10px] px-2.5 rounded-lg"
                                  onClick={() => handleSendThreadMessage(bid.id)}
                                >
                                  Reply
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PART 3: SETTLEMENT & VERIFICATION CONDITIONS */}
            {user && request.takenBy && (isOwner || user.id === request.takenBy) && (!!request.takerCompletedAt || !!request.completedAt || request.status === "assigned") && (
              <div className="mt-4 pt-4 border-t border-dashed border-muted">
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5 text-foreground uppercase tracking-wider">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  Settlement & Verification Controls
                </h4>
                <PaymentQRUpload requestId={request.id} takerId={request.takenBy} currentUserId={user.id} />
              </div>
            )}

            {/* PART 4: UNAUTHENTICATED NOTICE STATUS */}
            {!user && (
              <div className="pt-4 text-center border-t border-muted/40">
                <div className="max-w-xs mx-auto p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1">
                  <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Please log in to submit a configuration bid or communicate with this notice card.
                  </p>
                </div>
              </div>
            )}

          </div>
        </Card>
      </main>

      {/* FOOTER WRAPPER */}
      <SiteFooter />

      {/* FULL EXPANDED PORTAL MODAL DIALOG LIGHTBOX */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-xl overflow-hidden bg-background border shadow-2xl">
            <img src={expandedImage} alt="Expanded schematic documentation" className="object-contain max-w-full max-h-[85vh]" />
            <button 
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black transition-colors"
              onClick={() => setExpandedImage(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
