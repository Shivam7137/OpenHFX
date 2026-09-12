"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { Attachment } from "@/contracts";
import { useSession } from "@/components/shell";
import { errorMessage, mutate, useDraft } from "@/components/api";
import { ErrorNotice, Sheet } from "@/components/ui";
import { PhotoUpload } from "./PhotoUpload";
export function EvidenceComposer({
  issueId,
  open,
  onOpenChange,
  onSaved,
  reopen = false,
}: {
  issueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  reopen?: boolean;
}) {
  const { session } = useSession();
  const [body, setBody, clear] = useDraft(`openhfx-evidence-${issueId}`, "");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef("");
  async function save() {
    setPending(true);
    setError(null);
    if (!key.current) key.current = crypto.randomUUID();
    try {
      await mutate(
        `/issues/${issueId}/${reopen ? "reopen-requests" : "contributions"}`,
        {
          [reopen ? "reason" : "body"]: body,
          attachmentIds: attachments.map((a) => a.id),
        },
        "POST",
        key.current,
      );
      clear();
      setAttachments([]);
      key.current = "";
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <Sheet
      title={reopen ? "Request reopening" : "Add evidence"}
      description={
        reopen
          ? "Explain what still needs attention. The lead organization reviews reopening requests."
          : "Add a useful detail or photo to this shared issue. Evidence does not change its status."
      }
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
    >
      <ErrorNotice message={error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label>
          {reopen ? "Reason for reopening" : "What would you like to add?"}
          <textarea
            required={reopen || attachments.length === 0}
            maxLength={2000}
            rows={5}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              key.current = "";
            }}
          />
        </label>
        {session?.user ? (
          <>
            <PhotoUpload
              onChange={(a, b) => {
                setAttachments(a);
                setBlocked(b);
                key.current = "";
              }}
            />
            <button
              className="button full"
              disabled={
                pending || blocked || (!body.trim() && !attachments.length)
              }
            >
              {pending
                ? "Saving…"
                : reopen
                  ? "Send reopening request"
                  : "Add evidence"}
            </button>
          </>
        ) : (
          <Link
            className="button full"
            href={`/demo/sign-in?next=${encodeURIComponent(`/public/issues/${issueId}?evidence=true`)}`}
          >
            Sign in to add evidence
          </Link>
        )}
      </form>
    </Sheet>
  );
}
