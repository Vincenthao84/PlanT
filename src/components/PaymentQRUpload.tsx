import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QrCode, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export function PaymentQRUpload({
  requestId,
  takerId,
  currentUserId,
}: {
  requestId: string;
  takerId: string;
  currentUserId: string;
}) {
  const isTaker = currentUserId === takerId;
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("requests")
      .select("taker_payment_qr_url, taker_payment_note")
      .eq("id", requestId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setQrUrl(data?.taker_payment_qr_url ?? null);
        setNote(data?.taker_payment_note ?? "");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const save = async () => {
    setSaving(true);
    try {
      let url = qrUrl;
      if (file) {
        const ext = file.name.split(".").pop() || "png";
        const path = `${currentUserId}/${requestId}/qr-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("task-photos")
          .upload(path, file, { contentType: file.type, upsert: true });
        if (upErr) throw upErr;
        url = supabase.storage.from("task-photos").getPublicUrl(path).data.publicUrl;
      }
      if (!url && !note.trim()) {
        toast.error("Add a QR image or a note");
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("requests")
        .update({ taker_payment_qr_url: url, taker_payment_note: note })
        .eq("id", requestId);
      if (error) throw error;
      setQrUrl(url);
      setFile(null);
      setEditing(false);
      toast.success("Payment QR saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  // Viewer (requester) — show only if taker has uploaded something
  if (!isTaker) {
    if (!qrUrl && !note) return null;
    return (
      <div className="mt-4 pt-4 border-t border-border/60">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <QrCode className="h-4 w-4" /> Payment QR from taker
        </h3>
        {qrUrl && (
          <a href={qrUrl} target="_blank" rel="noreferrer" className="inline-block">
            <img
              src={qrUrl}
              alt="Payment QR"
              className="rounded-lg border border-border max-h-56 object-contain"
            />
          </a>
        )}
        {note && (
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{note}</p>
        )}
      </div>
    );
  }

  // Taker view
  return (
    <div className="mt-4 pt-4 border-t border-border/60">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <QrCode className="h-4 w-4" /> Payment QR
      </h3>

      {!editing ? (
        <div>
          {qrUrl ? (
            <div className="space-y-2">
              <img
                src={qrUrl}
                alt="Payment QR"
                className="rounded-lg border border-border max-h-56 object-contain"
              />
              {note && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setEditing(true)}
              >
                Replace
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => setEditing(true)}
            >
              <Upload className="h-4 w-4" /> Upload Payment QR Code
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              <Upload className="h-4 w-4" />
              {file ? "Change image" : qrUrl ? "Pick new image" : "Choose QR image"}
            </Button>
            {file && (
              <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-border">
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="absolute top-0.5 right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add payment instructions (e.g. PayNow, bank, amount)…"
            rows={3}
            disabled={saving}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="rounded-full"
              onClick={save}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setEditing(false);
                setFile(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}