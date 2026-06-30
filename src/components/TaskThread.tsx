import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TaskThreadProps {
  requestId: string;
  currentUserId: string;
  requestOwnerId: string;
  bidId?: string;
}

interface Message {
  id: string;
  request_id: string;
  author_id: string; 
  body: string;      
  created_at: string;
  bid_id?: string | null;
}

export function TaskThread({ requestId, currentUserId, requestOwnerId, bidId }: TaskThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function fetchMessages() {
      try {
        let query = supabase
          .from("request_messages") 
          .select("*")
          .eq("request_id", requestId)
          .order("created_at", { ascending: true });

        if (bidId) {
          query = query.eq("bid_id", bidId);
        } else {
          query = query.is("bid_id", null);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setMessages(data || []);
      } catch (err) {
        console.error("Error loading chat stream:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchMessages();

    const channel = supabase
      .channel(`task-chat-${requestId}-${bidId || 'global'}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.request_id !== requestId) return;
          if (bidId && msg.bid_id !== bidId) return;
          if (!bidId && msg.bid_id) return;

          if (!cancelled) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [requestId, bidId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from("request_messages").insert({
        request_id: requestId,
        bid_id: bidId || null,
        author_id: currentUserId,
        body: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch message.");
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-[320px] bg-background border rounded-2xl overflow-hidden p-3 gap-3">
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0 custom-scrollbar">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Synchronizing message history...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-muted-foreground italic">No chat activity found yet.</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Send a message below to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.author_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div
                  className={`p-2.5 rounded-2xl text-xs whitespace-pre-wrap break-words ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted border text-foreground rounded-tl-none"
                  }`}
                >
                  {msg.body} 
                </div>
                <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                  {formatMessageTime(msg.created_at)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <Input
          placeholder="Type your message here..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="rounded-xl h-9 text-xs" // 👈 Clean fixed line without backslashes
          disabled={sending}
          maxLength={1000}
        />
        <Button type="submit" size="sm" className="rounded-xl h-9 w-9 shrink-0" disabled={sending}>
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </form>
    </div>
  );
}
