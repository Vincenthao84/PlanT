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
        { 
          event: "INSERT", 
          schema: "public", 
          table: "request_messages" 
        },
        (payload) => {
          const msg = payload.new as Message;
          
          if (msg.request_id !== requestId) return;
          if (bidId && msg.bid_id !== bidId) return;
          if (!bidId && msg.bid_id) return;
          
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [requestId, bidId]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const textToSend = newMessage.trim();
    setNewMessage(""); 

    try {
      const payload: Record<string, any> = {
        request_id: requestId,
        author_id: currentUserId, 
        body: textToSend,          
      };

      if (bidId) {
        payload.bid_id = bidId;
      }

      const { error } = await supabase
        .from("request_messages") 
        .insert(payload);

      if (error) throw error;
    } catch (err: any) {
      console.error("Message send failure context:", err);
      toast.error("Failed to send message.");
      setNewMessage(textToSend); 
    } finally {
      setSending(false);
    }
  }

  // Safe time formatting helper function to protect against invalid date string parameters
  const formatMessageTime = (dateString: string | undefined | null) => {
    if (!dateString) return "Just now";
    try {
      const parsedDate = new Date(dateString);
      if (isNaN(parsedDate.getTime())) return "Just now";
      return parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "Just now";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading chat thread...
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/60">
      <div className="h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
            No messages yet. Send a note to start the conversation!
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
          className="rounded-xl h-9 text-xs"
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
