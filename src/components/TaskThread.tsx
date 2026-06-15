import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type AssignedTask = {
  id: string;
  requestId: string;
  senderId: string;
  messageText: string;
  mediaUrl: string | null;
  createdAt: string;
};

interface TaskThreadProps {
  requestId: string;
  currentUserId: string;
  requestOwnerId: string;
  bidId?: string;
}

export function TaskThread({ requestId, currentUserId, requestOwnerId, bidId }: TaskThreadProps) {
  const [messages, setMessages] = useState<AssignedTask[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchChatLogs() {
      let query = supabase
        .from("request_messages")
        .select("*")
        .eq("request_id", requestId);
      
      if (bidId) {
        query = query.eq("bid_id", bidId);
      } else {
        query = query.is("bid_id", null);
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading chat context:", error);
      } else if (data) {
        setMessages(
          data.map((m: any) => ({
            id: m.id,
            requestId: m.request_id,
            senderId: m.sender_id,
            messageText: m.message_text,
            mediaUrl: m.media_url,
            createdAt: m.created_at,
          }))
        );
      }
    }

    void fetchChatLogs();

    const channel = supabase
      .channel(`chat-room-${requestId}-${bidId || 'global'}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_messages" },
        (payload) => {
          const nm = payload.new as any;
          if (nm.request_id === requestId && ((bidId && nm.bid_id === bidId) || (!bidId && !nm.bid_id))) {
            setMessages((prev) => [
              ...prev,
              {
                id: nm.id,
                requestId: nm.request_id,
                senderId: nm.sender_id,
                messageText: nm.message_text,
                mediaUrl: nm.media_url,
                createdAt: nm.created_at,
              },
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [requestId, bidId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachedFile) return;

    setSending(true);
    let uploadedMediaUrl: string | null = null;

    try {
      if (attachedFile) {
        setUploading(true);
        const fileExt = attachedFile.name.split(".").pop();
        const path = `${requestId}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage.from("request-attachments").upload(path, attachedFile);
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from("request-attachments").getPublicUrl(path);
        uploadedMediaUrl = publicUrl;
      }

      const { error: insertErr } = await supabase.from("request_messages").insert({
        request_id: requestId,
        sender_id: currentUserId,
        message_text: newMessage.trim(),
        media_url: uploadedMediaUrl,
        bid_id: bidId || null,
      });

      if (insertErr) throw insertErr;
      setNewMessage("");
      clearAttachment();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="h-64 overflow-y-auto border rounded-xl p-4 space-y-3 bg-muted/20">
        {messages.map((m) => {
          const isMe = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.messageText && <p>{m.messageText}</p>}
                {m.mediaUrl && <img src={m.mediaUrl} className="mt-2 max-h-40 rounded-lg" alt="attachment" />}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." />
        <Button type="submit" disabled={sending || uploading}>
          {sending ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
