import { Camera, Package, Brain, Hand, Key, MoreHorizontal, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type RequestTypeSlug = "snap" | "knowledge" | "action" | "object" | "rental" | "anything";

export interface RequestType {
  slug: RequestTypeSlug;
  label: string;
  desc: string;
  icon: LucideIcon;
}

export const requestTypes: RequestType[] = [
  { slug: "snap",      label: "Snap",      icon: Camera,           desc: "Instant photo or video of a place — check a queue, see a menu, confirm hours." },
  { slug: "knowledge", label: "Knowledge", icon: Brain,            desc: "Local intel before you buy a home, switch jobs, or move abroad." },
  { slug: "action",    label: "Action",    icon: Hand,             desc: "Save a table, take a queue ticket, drop off a message." },
  { slug: "object",    label: "Object",    icon: Package,          desc: "Trade, deliver or pick up something nearby." },
  { slug: "rental",    label: "Rental",    icon: Key,              desc: "Rent out an idle storage corner, a parking spot or a tool." },
  { slug: "anything",  label: "Anything",  icon: MoreHorizontal,   desc: "If someone can help with it, you can post it on PLAN T." },
];

export function getRequestType(slug: string): RequestType | undefined {
  return requestTypes.find((r) => r.slug === slug);
}

export interface StoredRequest {
  id: string;
  type: RequestTypeSlug;
  title: string;
  description: string;
  locationLabel: string;
  lat: number;
  lng: number;
  reward: string;
  createdAt: number;
  userId: string;
  completedAt: number | null;
  takenBy: string | null;
  takenAt: number | null;
  takerCompletedAt: number | null;
  feeSettledAt: number | null;
  isSecret: boolean;
}

type Row = {
  id: string;
  user_id: string;
  type: RequestTypeSlug;
  title: string;
  description: string;
  location_label: string;
  lat: number;
  lng: number;
  reward: string;
  created_at: string;
  completed_at: string | null;
  taken_by: string | null;
  taken_at: string | null;
  taker_completed_at: string | null;
  fee_settled_at: string | null;
  is_secret: boolean;
};

function rowToRequest(row: Row): StoredRequest {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    description: row.description,
    locationLabel: row.location_label,
    lat: row.lat,
    lng: row.lng,
    reward: row.reward,
    createdAt: new Date(row.created_at).getTime(),
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
    takenBy: row.taken_by,
    takenAt: row.taken_at ? new Date(row.taken_at).getTime() : null,
    takerCompletedAt: row.taker_completed_at ? new Date(row.taker_completed_at).getTime() : null,
    feeSettledAt: row.fee_settled_at ? new Date(row.fee_settled_at).getTime() : null,
    isSecret: row.is_secret ?? false,
  };
}

export type NewRequestInput = {
  type: RequestTypeSlug;
  title: string;
  description: string;
  locationLabel: string;
  lat: number;
  lng: number;
  reward: string;
  isSecret?: boolean;
};

export async function createRequest(input: NewRequestInput): Promise<StoredRequest> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) throw new Error("You must be signed in to post a request.");

  const { data, error } = await supabase
    .from("requests")
    .insert({
      user_id: user.id,
      type: input.type,
      title: input.title,
      description: input.description,
      location_label: input.locationLabel,
      lat: input.lat,
      lng: input.lng,
      reward: input.reward,
      is_secret: input.isSecret ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToRequest(data as Row);
}

export async function fetchRequest(id: string): Promise<StoredRequest | null> {
  const { data, error } = await supabase
    .from("requests_public")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRequest(data as Row) : null;
}

export async function fetchAllRequests(): Promise<StoredRequest[]> {
  const { data, error } = await supabase
    .from("requests_public")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToRequest(r as Row));
}

export async function fetchProfilesByIds(
  ids: string[],
): Promise<Record<string, { displayName: string | null; avatarUrl: string | null }>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", unique);
  if (error) throw error;
  const map: Record<string, { displayName: string | null; avatarUrl: string | null }> = {};
  (data ?? []).forEach((p) => {
    map[(p as { id: string }).id] = {
      displayName: (p as { display_name: string | null }).display_name,
      avatarUrl: (p as { avatar_url: string | null }).avatar_url,
    };
  });
  return map;
}

export type BidStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface RequestBid {
  id: string;
  requestId: string;
  helperId: string;
  amount: string;
  note: string;
  status: BidStatus;
  createdAt: number;
  helperDisplayName: string | null;
  helperAvatarUrl: string | null;
}

export async function listRequestBids(requestId: string): Promise<RequestBid[]> {
  const { data, error } = await supabase.rpc("list_request_bids", {
    _request_id: requestId,
  });
  if (error) throw error;
  type Row = {
    id: string;
    request_id: string;
    helper_id: string;
    amount: string;
    note: string;
    status: BidStatus;
    created_at: string;
    helper_display_name: string | null;
    helper_avatar_url: string | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    requestId: r.request_id,
    helperId: r.helper_id,
    amount: r.amount,
    note: r.note,
    status: r.status,
    createdAt: new Date(r.created_at).getTime(),
    helperDisplayName: r.helper_display_name,
    helperAvatarUrl: r.helper_avatar_url,
  }));
}

export async function placeBid(
  requestId: string,
  amount: string,
  note: string,
): Promise<void> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) throw new Error("You must be signed in to place a bid.");
  const { error } = await supabase.from("request_bids").insert({
    request_id: requestId,
    helper_id: user.id,
    amount,
    note,
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already placed a bid on this request.");
    }
    throw error;
  }
}

export async function withdrawBid(bidId: string): Promise<void> {
  const { error } = await supabase.from("request_bids").delete().eq("id", bidId);
  if (error) throw error;
}

export async function acceptBid(bidId: string): Promise<any> {
  const { data, error } = await supabase.rpc("accept_request_bid", { 
    _bid_id: bidId 
  });
  if (error) throw error;
  return data;
}

export async function fetchMyRequests(userId: string): Promise<StoredRequest[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToRequest(r as Row));
}

export async function fetchMyTasks(userId: string): Promise<StoredRequest[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("taken_by", userId)
    .order("taken_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToRequest(r as Row));
}

export async function deleteRequest(id: string): Promise<void> {
  const { error } = await supabase.from("requests").delete().eq("id", id);
  if (error) throw error;
}

export type UpdateRequestInput = {
  title: string;
  description: string;
  locationLabel: string;
  reward: string;
};

export async function updateRequest(
  id: string,
  input: UpdateRequestInput,
): Promise<StoredRequest> {
  const { data, error } = await supabase
    .from("requests")
    .update({
      title: input.title,
      description: input.description,
      location_label: input.locationLabel,
      reward: input.reward,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRequest(data as Row);
}

export async function markRequestDone(id: string): Promise<StoredRequest> {
  const { data, error } = await supabase
    .from("requests")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRequest(data as Row);
}

export async function reopenRequest(id: string): Promise<StoredRequest> {
  const { data, error } = await supabase
    .from("requests")
    .update({ completed_at: null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRequest(data as Row);
}

export async function takeRequest(id: string): Promise<StoredRequest> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const user = userData.user;
  if (!user) throw new Error("You must be signed in to take a request.");

  const { data, error } = await supabase
    .from("requests")
    .update({ taken_by: user.id, taken_at: new Date().toISOString() })
    .eq("id", id)
    .is("taken_by", null)
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error("This request has already been taken.");
  return rowToRequest(data as Row);
}

export async function takerCompleteRequest(id: string): Promise<StoredRequest> {
  const { data, error } = await supabase
    .from("requests")
    .update({ taker_completed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRequest(data as Row);
}

export async function takerReopenRequest(id: string): Promise<StoredRequest> {
  const { data, error } = await supabase
    .from("requests")
    .update({ taker_completed_at: null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRequest(data as Row);
}

export async function markFeeSettled(id: string): Promise<StoredRequest> {
  const { data, error } = await supabase
    .from("requests")
    .update({ fee_settled_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToRequest(data as Row);
}

export interface MonthlyUsage {
  posted: number;
  taken: number;
  postLimit: number;
  takeLimit: number;
  isPaid: boolean;
}

export async function getMyMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  const [postedRes, takenRes, subRes] = await Promise.all([
    supabase.rpc("requests_posted_this_month", { _user_id: userId }),
    supabase.rpc("orders_taken_this_month", { _user_id: userId }),
    supabase.rpc("is_paid_user", { _user_id: userId }),
  ]);
  return {
    posted: (postedRes.data as number | null) ?? 0,
    taken: (takenRes.data as number | null) ?? 0,
    isPaid: Boolean(subRes.data),
    postLimit: 20,
    takeLimit: 15,
  };
}
