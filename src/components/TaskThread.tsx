import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Message = {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  photo_urls: string[];
  created_at: string;
};

const MAX_PHOTOS = 5;

function timeAgo(iso: string): string {
  const ts = new Date(iso).getTime();
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function TaskThread({
  requestId,
  currentUserId,
  requestOwnerId, // Added requestOwnerId prop to check if current user is requestor
}: {
  requestId: string;
  currentUserId: string;
  requestOwnerId?: string; 
}) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for automatic scrolling

  // Automatically scrolls the frame to show new incoming chat messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    
    // Initial data fetch
    supabase
      .from("request_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMessages([]);
          return;
        }
        setMessages((data ?? []) as Message[]);
      });

    // Realtime channel setup
    const channel = supabase
      .channel(`messages-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          setMessages((prev) => {
            if (!prev) return [newMessage];
            // Prevent duplicate message inclusions if local thread updates fast
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [requestId]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const next = [...files, ...picked].slice(0, MAX_PHOTOS);
    if (files.length + picked.length > MAX_PHOTOS) {
      toast.error(`Max ${MAX_PHOTOS} photos per message`);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    const text = body.trim();
    if (!text && files.length === 0) {
      toast.error("Type a message or attach a photo");
      return;
    }
    setSending(true);
    try {
      const photoUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${currentUserId}/${requestId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("task-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("task-photos").getPublicUrl(path);
        photoUrls.push(pub.publicUrl);
      }

      const { error: insErr } = await supabase.from("request_messages").insert({
        request_id: requestId,
        author_id: currentUserId,
        body: text,
        photo_urls: photoUrls,
      });
      if (insErr) throw insErr;

      setBody("");
      setFiles([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  // Determine user identity role to customize context strings
  const isRequestor = requestOwnerId ? currentUserId === requestOwnerId : false;
  const inputPlaceholder = isRequestor ? "Reply to the helper…" : "Reply to the requester…";

  return (
    <div className="mt-4 pt-4 border-t border-border/60">
      <h3 className="text-sm font-semibold mb-3">Conversation</h3>

      {/* Main message track */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {messages === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No messages yet. Send the first update.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.author_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                  }`}
                >
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.photo_urls && m.photo_urls.length > 0 && (
                    <div
                      className={`mt-2 grid gap-1 ${
                        m.photo_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"
                      }`}
                    >
                      {m.photo_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={url}
                            alt="attachment"
                            loading="lazy"
                            className="rounded-lg w-full h-32 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  <p
                    className={`mt-1 text-[10px] text-right ${
                      mine ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {timeAgo(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {/* Scroll anchor target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Upload Previews */}
      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="relative h-16 w-16 rounded-lg overflow-hidden border border-border"
            >
              <img
                src={URL.createObjectURL(f)}
                alt={f.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-0.5 right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow hover:bg-background"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chat input action bar */}
      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={inputPlaceholder}
          rows={2}
          className="resize-none rounded-xl"
          disabled={sending}
          onKeyDown={(e) => {
            // CMD/CTRL + Enter allows quick keyboard message submission
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || files.length >= MAX_PHOTOS}
            aria-label="Attach photo"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="rounded-full shrink-0"
            onClick={send}
            disabled={sending}
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
