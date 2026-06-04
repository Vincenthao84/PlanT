import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type RequestRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: string;
  location_label: string;
  created_at: string;
  completed_at: string | null;
  taken_by: string | null;
};

type MessageRow = {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  photo_urls: string[];
  created_at: string;
};

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"requests" | "messages">("requests");

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [reqRes, msgRes] = await Promise.all([
      supabase
        .from("requests")
        .select("id,user_id,title,description,type,location_label,created_at,completed_at,taken_by")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("request_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (reqRes.error) toast.error(reqRes.error.message);
    else setRequests((reqRes.data ?? []) as RequestRow[]);
    if (msgRes.error) toast.error(msgRes.error.message);
    else setMessages((msgRes.data ?? []) as MessageRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const deleteRequest = async (id: string) => {
    if (!confirm("Delete this request and all its messages/bids? This cannot be undone.")) return;
    // Delete child rows first (no admin cascade defined)
    await supabase.from("request_messages").delete().eq("request_id", id);
    await supabase.from("request_bids").delete().eq("request_id", id);
    const { error } = await supabase.from("requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Request deleted");
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setMessages((prev) => prev.filter((m) => m.request_id !== id));
  };

  const editRequest = async (r: RequestRow) => {
    const newTitle = prompt("Edit title", r.title);
    if (newTitle === null) return;
    const newDesc = prompt("Edit description", r.description);
    if (newDesc === null) return;
    const { error } = await supabase
      .from("requests")
      .update({ title: newTitle, description: newDesc })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    setRequests((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, title: newTitle, description: newDesc } : x)),
    );
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("request_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Message deleted");
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="mb-4">You must sign in to access moderation.</p>
        <Button asChild><Link to="/login">Sign in</Link></Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-xl font-semibold mb-2">Administrators only</h1>
        <p className="text-sm text-muted-foreground">
          Your account does not have admin permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Moderation</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Review and remove improper requests or chat messages.
      </p>

      <div className="flex gap-2 mb-4">
        <Button
          variant={tab === "requests" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("requests")}
        >
          Requests ({requests.length})
        </Button>
        <Button
          variant={tab === "messages" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("messages")}
        >
          Messages ({messages.length})
        </Button>
        <Button variant="ghost" size="sm" onClick={loadData} className="ml-auto">
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : tab === "requests" ? (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {r.type} · {r.location_label} · {new Date(r.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">{r.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    by {r.user_id} {r.completed_at ? "· completed" : r.taken_by ? "· taken" : "· open"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => editRequest(r)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteRequest(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {requests.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No requests.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(m.created_at).toLocaleString()} · author {m.author_id}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  {m.photo_urls?.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {m.photo_urls.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer">
                          <img src={u} alt="" className="h-16 w-16 object-cover rounded" />
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    request{" "}
                    <Link to="/request/$id" params={{ id: m.request_id }} className="underline">
                      {m.request_id.slice(0, 8)}
                    </Link>
                  </p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => deleteMessage(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No messages.</p>
          )}
        </div>
      )}
    </div>
  );
}