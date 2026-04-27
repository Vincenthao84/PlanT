import { Camera, Package, Brain, Hand, Key, MoreHorizontal, type LucideIcon } from "lucide-react";

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
}

const STORAGE_KEY = "plant.requests";

export function saveRequest(req: StoredRequest) {
  if (typeof window === "undefined") return;
  const all = loadAllRequests();
  all[req.id] = req;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadRequest(id: string): StoredRequest | undefined {
  if (typeof window === "undefined") return undefined;
  return loadAllRequests()[id];
}

function loadAllRequests(): Record<string, StoredRequest> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
