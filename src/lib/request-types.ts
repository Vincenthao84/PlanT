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
    })
    .select()
    .single();

  if (error) throw error;
  return rowToRequest(data as Row);
}

export async function fetchRequest(id: string): Promise<StoredRequest | null> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRequest(data as Row) : null;
}

export async function fetchAllRequests(): Promise<StoredRequest[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => rowToRequest(r as Row));
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

export async function deleteRequest(id: string): Promise<void> {
  const { error } = await supabase.from("requests").delete().eq("id", id);
  if (error) throw error;
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
