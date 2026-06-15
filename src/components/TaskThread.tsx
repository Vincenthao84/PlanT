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
  bidId?: string; // Optional field enabling private bid negotiation channels
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
      // Build base query on the messages table
      let query = supabase
        .from("request_messages")
        .select("*")
        .eq("request_id", requestId);
      
      // Isolate the room context depending on whether a bid context exists
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
