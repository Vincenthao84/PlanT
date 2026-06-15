import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button"; // Points to button ui component
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client"; // Fixed: named import style

// Define structural representation for requests taken by the user
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
}

export function TaskThread({ requestId, currentUserId, requestOwnerId }: TaskThreadProps) {
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
      const { data, error } = await supabase
        .from("request_messages")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

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
      .channel(`chat-room-${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          const nm = payload.new as any;
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
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [requestId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, previewUrl]);

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

        const { error: uploadErr } = await supabase.storage
          .from("request-attachments")
          .upload(path, attachedFile);

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from("request-attachments")
          .getPublicUrl(path);

        uploadedMediaUrl = publicUrl;
      }

      const { error: insertErr } = await supabase.from("request_messages").insert({
        request_id: requestId,
        sender_id: currentUserId,
        message_text: newMessage.trim(),
        media_url: uploadedMediaUrl,
      });

      if (insertErr) throw insertErr;

      setNewMessage("");
      clearAttachment();
    } catch (err) {
      console.error(err);
      toast.error("Failed to route message pipeline asset.");
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold border-b pb-2 tracking-tight">Task Communications Hub</h3>
      
      <div className="h-64 overflow-y-auto border rounded-xl p-4 space-y-3 bg-muted/20 custom-scrollbar">
        {messages.map((m) => {
          const isMe = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"
              }`}>
                {m.messageText && <p className="break-words whitespace-pre-wrap">{m.messageText}</p>}
                {m.mediaUrl && (
                  <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="block mt-2 rounded-lg overflow-hidden border bg-background">
                    <img src={m.mediaUrl} alt="Chat payload reference" className="max-h-40 object-contain w-full" />
                  </a>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="space-y-2">
        {previewUrl && (
          <div className="relative inline-block border rounded-xl overflow-hidden bg-muted p-1 group animate-in fade-in duration-100">
            <img src={previewUrl} alt="Upload container queue preview" className="h-16 w-16 object-cover rounded-lg" />
            <button
              type="button"
              onClick={clearAttachment}
              className="absolute top-1 right-1 bg-black/70 hover:bg-black/90 text-white rounded-full p-0.5 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 w-10 p-0 rounded-xl shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message or append status reports..."
            className="h-10 rounded-xl"
            disabled={sending}
          />
          
          <Button type="submit" className="h-10 px-4 rounded-xl shrink-0" disabled={sending || uploading}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
