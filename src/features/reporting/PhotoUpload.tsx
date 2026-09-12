"use client";
import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import type { ApiEnvelope, Attachment } from "@/contracts";
import { errorMessage, request } from "@/components/api";
import { ErrorNotice } from "@/components/ui";
type Upload = {
  id: string;
  file: File;
  description: string;
  preview: string;
  attachment?: Attachment;
  error?: string;
  pending?: boolean;
};
export function PhotoUpload({
  onChange,
  disabled = false,
  initialAttachments = [],
}: {
  onChange: (attachments: Attachment[], blocked: boolean) => void;
  disabled?: boolean;
  initialAttachments?: Attachment[];
}) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const latest = useRef<Upload[]>([]);
  const [retained, setRetained] = useState(initialAttachments);
  const retainedRef = useRef(initialAttachments);
  const [error, setError] = useState<string | null>(null);
  function update(next: Upload[]) {
    latest.current = next;
    setUploads(next);
    onChange(
      [
        ...retainedRef.current,
        ...next.flatMap((u) => (u.attachment ? [u.attachment] : [])),
      ],
      next.some((u) => !u.attachment),
    );
  }
  async function upload(item: Upload) {
    update(
      latest.current.map((u) =>
        u.id === item.id ? { ...u, pending: true, error: undefined } : u,
      ),
    );
    try {
      const body = new FormData();
      body.append("file", item.file);
      body.append("description", item.description || "Photo evidence");
      const result = await request<ApiEnvelope<Attachment>>("/attachments", {
        method: "POST",
        body,
      });
      update(
        latest.current.map((u) =>
          u.id === item.id
            ? { ...u, pending: false, attachment: result.data }
            : u,
        ),
      );
    } catch (e) {
      update(
        latest.current.map((u) =>
          u.id === item.id
            ? { ...u, pending: false, error: errorMessage(e) }
            : u,
        ),
      );
    }
  }
  function choose(files: FileList | null) {
    if (!files) return;
    if (retainedRef.current.length + latest.current.length + files.length > 3) {
      setError(
        "Choose up to three photos. Remove a photo before adding another.",
      );
      return;
    }
    const invalid = [...files].find(
      (f) =>
        !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
        f.size > 10 * 1024 * 1024,
    );
    if (invalid) {
      setError(
        `${invalid.name}: use JPEG, PNG or WebP, up to 10 MB. HEIC is not supported.`,
      );
      return;
    }
    setError(null);
    const added = [...files].map((file) => ({
      id: crypto.randomUUID(),
      file,
      description: "",
      preview: URL.createObjectURL(file),
    }));
    update([...latest.current, ...added]);
  }
  return (
    <div className="photo-upload">
      <span className="field-label">
        Photos <span className="muted">(optional)</span>
      </span>
      <p className="meta">
        Up to 3 photos · JPEG, PNG or WebP · 10 MB each. Location metadata is
        removed.
      </p>
      <p className="meta">
        Uploaded report photos are retained with your draft in this tab. Upload
        each selected photo before leaving this page; unuploaded files cannot be
        restored.
      </p>
      {retained.map((attachment) => (
        <div className="upload-row" key={attachment.id}>
          <img
            src={attachment.url}
            alt={attachment.description || "Retained photo evidence"}
          />
          <div>
            <strong>{attachment.description || "Photo evidence"}</strong>
            <span className="success-text">
              Uploaded · restored from your draft
            </span>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove ${attachment.description || "retained photo"}`}
            onClick={() => {
              const next = retainedRef.current.filter(
                (a) => a.id !== attachment.id,
              );
              retainedRef.current = next;
              setRetained(next);
              update(latest.current);
            }}
          >
            <X size={20} />
          </button>
        </div>
      ))}
      <label
        className={`secondary upload-control ${disabled ? "disabled" : ""}`}
      >
        <Camera size={20} />
        Choose photos
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || uploads.length + retained.length >= 3}
          onChange={(e) => {
            choose(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <ErrorNotice message={error} />
      {uploads.map((u) => (
        <div className="upload-row" key={u.id}>
          <img
            src={u.preview}
            alt={u.description || "Selected photo preview"}
          />
          <div>
            <label>
              Photo description
              <input
                value={u.description}
                disabled={u.pending || !!u.attachment}
                onChange={(e) =>
                  update(
                    latest.current.map((item) =>
                      item.id === u.id
                        ? { ...item, description: e.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="What does this photo show?"
                maxLength={200}
              />
            </label>
            {u.attachment ? (
              <span className="success-text">Uploaded</span>
            ) : (
              <button
                type="button"
                className="text-button"
                disabled={u.pending || disabled}
                onClick={() => upload(u)}
              >
                {u.pending
                  ? "Uploading…"
                  : u.error
                    ? "Retry upload"
                    : "Upload photo"}
              </button>
            )}
            <ErrorNotice message={u.error || null} />
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove ${u.file.name}`}
            disabled={u.pending}
            onClick={() => {
              URL.revokeObjectURL(u.preview);
              update(latest.current.filter((item) => item.id !== u.id));
            }}
          >
            <X size={20} />
          </button>
        </div>
      ))}
    </div>
  );
}
