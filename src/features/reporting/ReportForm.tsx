"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Send } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type ApiEnvelope,
  type Attachment,
  type Category,
  type IssueDetail,
  type IssueSummary,
  type ListEnvelope,
  type Organization,
  type Preparation,
} from "@/contracts";
import { useDraft, usePoll, mutate, errorMessage } from "@/components/api";
import { useSession } from "@/components/shell";
import { ErrorNotice, Notice, Time } from "@/components/ui";
import { MapView } from "@/features/map/MapView";
import { PhotoUpload } from "./PhotoUpload";
import { emptyDraft, preparationLocation } from "./draft";
export function ReportForm() {
  const { session } = useSession();
  const [draft, setDraft, clearDraft] = useDraft(
    "openhfx-report-draft",
    emptyDraft,
  );
  const attachments = draft.attachments || [];
  function setAttachments(files: Attachment[]) {
    setDraft((d) => ({ ...d, attachments: files }));
  }
  const [photoBlocked, setPhotoBlocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<IssueDetail | null>(null);
  const [slow, setSlow] = useState(false);
  const preparation = usePoll<ApiEnvelope<Preparation>>(
    draft.preparationId ? `/report-preparations/${draft.preparationId}` : null,
  );
  const directory = usePoll<ListEnvelope<Organization>>("/organizations");
  const nearby = usePoll<ListEnvelope<IssueSummary>>(
    draft.step === 3 ? "/issues" : null,
  );
  const result = preparation.data?.data;
  const suggestion = result?.suggestion;
  function change<T extends keyof typeof draft>(
    key: T,
    value: (typeof draft)[T],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  useEffect(() => {
    if (!draft.draftId)
      setDraft((d) => (d.draftId ? d : { ...d, draftId: crypto.randomUUID() }));
  }, [draft.draftId, setDraft]);
  useEffect(() => {
    if (
      suggestion &&
      result?.id === draft.preparationId &&
      result.draftId === draft.draftId &&
      result.id !== draft.appliedPreparationId &&
      !draft.reviewEdited
    ) {
      setDraft((d) =>
        result.id !== d.preparationId ||
        result.draftId !== d.draftId ||
        d.reviewEdited
          ? d
          : {
              ...d,
              title: suggestion.title,
              summary: suggestion.summary,
              category: suggestion.category,
              appliedPreparationId: result!.id,
            },
      );
    }
  }, [
    suggestion,
    result,
    setDraft,
    draft.appliedPreparationId,
    draft.reviewEdited,
    draft.preparationId,
    draft.draftId,
  ]);
  useEffect(() => {
    if (!draft.preparationId) return;
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [draft.preparationId]);
  async function prepare() {
    setError(null);
    setPending(true);
    const originalDescription = `${draft.description}${draft.accessibility ? `\nAccessibility impact: ${draft.accessibility}` : ""}`;
    setDraft((d) => ({
      ...d,
      step: 3,
      reviewEdited: false,
      title: d.title || d.description.slice(0, 100),
      summary: d.summary || originalDescription.slice(0, 500),
    }));
    if (!session?.user) {
      setPending(false);
      return;
    }
    try {
      const result = await mutate<Preparation>("/report-preparations", {
        draftId: draft.draftId,
        originalDescription,
        attachmentIds: attachments.map(photo => photo.id),
        publicLocation: preparationLocation(
          {
            latitude: draft.latitude,
            longitude: draft.longitude,
          },
          draft.sensitive,
        ),
      });
      change("preparationId", result.id);
    } catch (e) {
      setError(
        `Suggestions unavailable. Your report can still be sent. ${errorMessage(e)}`,
      );
    } finally {
      setPending(false);
    }
  }
  async function send() {
    setError(null);
    setPending(true);
    try {
      const issue = await mutate<IssueDetail>(
        "/issues",
        {
          draftId: draft.draftId,
          originalDescription: `${draft.description}${draft.accessibility ? `\nAccessibility impact: ${draft.accessibility}` : ""}`,
          title: draft.title,
          summary: draft.summary,
          category: draft.category,
          exactLocation: {
            latitude: draft.latitude,
            longitude: draft.longitude,
          },
          publicLocationLabel: draft.locationLabel,
          sensitiveLocation: draft.sensitive,
          attachmentIds: attachments.map((a) => a.id),
          ...(draft.preparationId
            ? { preparationId: draft.preparationId }
            : {}),
          ...(draft.relatedIssueId
            ? { relatedIssueId: draft.relatedIssueId }
            : {}),
        },
        "POST",
        draft.draftId,
      );
      setSaved(issue);
      clearDraft();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  if (saved)
    return (
      <div className="page narrow">
        <div className="confirmation-mark">
          <Check size={32} />
        </div>
        <h1>Your report is saved</h1>
        <p>
          {saved.reference} · {saved.title}
        </p>
        <Notice>
          Awaiting authority review. Suggested organizations have not accepted
          responsibility yet.
        </Notice>
        <p>
          You are following this issue. Published updates will appear in
          Following.
        </p>
        <Link className="button full" href={`/public/issues/${saved.id}`}>
          View your issue
        </Link>
      </div>
    );
  return (
    <div className="page narrow">
      <Link className="back-link" href="/public">
        <ArrowLeft size={18} />
        Nearby issues
      </Link>
      {session?.engineMode === 'provider' && <Notice>Preparing suggestions sends your report text, public location, and uploaded photos with their descriptions to Anthropic. Avoid contact details, faces, licence plates, and other private information. AI suggestions need your review.</Notice>}
      <div className="row-between">
        <h1>Report a problem</h1>
        <button
          className="text-button"
          onClick={() => {
            clearDraft();
            setAttachments([]);
            setPhotoBlocked(false);
            setError(null);
          }}
        >
          Discard draft
        </button>
      </div>
      <ol className="step-rail" aria-label="Report steps">
        {["Describe", "Locate", "Review"].map((label, index) => (
          <li
            key={label}
            className={
              draft.step === index + 1
                ? "current"
                : draft.step > index + 1
                  ? "done"
                  : ""
            }
            aria-current={draft.step === index + 1 ? "step" : undefined}
          >
            <span>
              {draft.step > index + 1 ? <Check size={15} /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <ErrorNotice message={error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.step === 1) {
            change("step", 2);
          } else if (draft.step === 2) {
            void prepare();
          } else {
            void send();
          }
        }}
      >
        {draft.step === 1 && (
          <>
            <h2>What is happening?</h2>
            <p className="muted">
              Describe the problem and how it affects the people using this
              place.
            </p>
            <label>
              Description
              <textarea
                required
                minLength={20}
                maxLength={1800}
                rows={6}
                value={draft.description}
                onChange={(e) => change("description", e.target.value)}
                placeholder="For example, a fallen branch is blocking the walkway near…"
              />
            </label>
            <span className="field-hint">
              At least 20 characters. Your original words are preserved.
            </span>
            <label>
              Accessibility impact <span className="muted">(optional)</span>
              <textarea
                maxLength={160}
                rows={2}
                value={draft.accessibility}
                onChange={(e) => change("accessibility", e.target.value)}
                placeholder="Is a step-free route or entrance affected?"
              />
            </label>
            {!session?.user && (
              <Notice>
                Sign in before uploading photos. Your text draft stays here.
                <br />
                <Link href="/demo/sign-in?next=%2Fpublic%2Freport">
                  Choose a demo account
                </Link>
              </Notice>
            )}
          </>
        )}
        <div hidden={draft.step !== 1}>
          <PhotoUpload
            initialAttachments={attachments}
            key={draft.draftId}
            disabled={!session?.user}
            onChange={(files, blocked) => {
              setAttachments(files);
              setPhotoBlocked(blocked);
            }}
          />
        </div>
        {draft.step === 1 && (
          <button className="button full" type="submit" disabled={photoBlocked}>
            Continue to location
          </button>
        )}
        {draft.step === 2 && (
          <>
            <h2>Where is it?</h2>
            <p className="meta">
              The local prototype supports the Halifax demo area only. Locations
              outside this area cannot be submitted.
            </p>
            <p className="muted">
              Confirm the location and add a place people will recognize.
            </p>
            <MapView
              issues={[]}
              location={{
                latitude: draft.latitude,
                longitude: draft.longitude,
              }}
              onLocationChange={(location) =>
                setDraft((d) => ({
                  ...d,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  locationConfirmed: false,
                }))
              }
            />
            <label>
              Place description
              <input
                required
                maxLength={160}
                value={draft.locationLabel}
                onChange={(e) => change("locationLabel", e.target.value)}
                placeholder="Path beside the north entrance"
              />
            </label>
            <label className="check-label">
              <input
                required
                type="checkbox"
                checked={draft.locationConfirmed}
                onChange={(e) => change("locationConfirmed", e.target.checked)}
              />
              I confirm these coordinates describe the issue location.
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={draft.sensitive}
                onChange={(e) => change("sensitive", e.target.checked)}
              />
              This is a private or sensitive location. Show an approximate
              public location.
            </label>
            {draft.sensitive && (
              <p className="meta">
                Keep addresses and identifying details out of the public
                description and photos.
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => change("step", 1)}
              >
                Back
              </button>
              <button className="button" type="submit" disabled={pending}>
                Review report
              </button>
            </div>
          </>
        )}
        {draft.step === 3 && (
          <>
            <h2>Review your report</h2>
            <p className="meta">
              {attachments.length} uploaded{" "}
              {attachments.length === 1 ? "photo" : "photos"} attached.{" "}
              <button
                type="button"
                className="inline-button"
                onClick={() => change("step", 1)}
              >
                Review photos
              </button>
            </p>
            <p className="muted">
              You decide what is sent. Suggestions do not confirm responsibility
              or priority.
            </p>
            {result?.mode === "demo" && (
              <Notice>
                Demo suggestions · generated by the local demonstration engine.
                No LLM provider is connected.
              </Notice>
            )}
            {result?.mode === 'provider' && result.status === 'succeeded' && <Notice>AI suggestions · {result.provider} / {result.model}. Review for accuracy before sending.</Notice>}
            {result?.mode === "unconfigured" || result?.status === "failed" ? (
              <Notice>
                Suggestions unavailable. Your report can still be sent.
              </Notice>
            ) : pending ||
              result?.status === "queued" ||
              result?.status === "running" ? (
              <Notice>
                {slow
                  ? "You can send the report while suggestions finish."
                  : "Preparing your report…"}
              </Notice>
            ) : null}
            {!session?.user && (
              <Notice>
                Sign in to send. Your review and original text are saved in this
                tab.
                <br />
                <Link
                  className="text-button"
                  href="/demo/sign-in?next=%2Fpublic%2Freport"
                >
                  Choose a demo account
                </Link>
              </Notice>
            )}
            <label>
              Title
              <input
                required
                minLength={8}
                maxLength={100}
                value={draft.title}
                onChange={(e) => {
                  change("reviewEdited", true);
                  change("title", e.target.value);
                }}
              />
            </label>
            <label>
              Summary
              <textarea
                required
                minLength={20}
                maxLength={500}
                rows={4}
                value={draft.summary}
                onChange={(e) => {
                  change("reviewEdited", true);
                  change("summary", e.target.value);
                }}
              />
            </label>
            <label>
              Category
              <select
                value={draft.category}
                onChange={(e) => {
                  change("reviewEdited", true);
                  change("category", e.target.value as Category);
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <div className="review-location">
              <strong>{draft.locationLabel}</strong>
              <p className="meta">
                {draft.sensitive
                  ? "Approximate public location"
                  : "Confirmed issue location"}{" "}
                ·{" "}
                <button
                  type="button"
                  className="inline-button"
                  onClick={() => change("step", 2)}
                >
                  Edit location
                </button>
              </p>
            </div>
            {suggestion && (
              <section className="suggestion-panel">
                <h3>Suggested response</h3>
                <p>
                  {suggestion.suggestedOrganizationIds
                    .map(
                      (id) =>
                        directory.data?.items.find((o) => o.id === id)?.name,
                    )
                    .filter(Boolean)
                    .join(", ") || "Awaiting assignment"}
                </p>
                <ul>
                  {suggestion.suggestedNextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                {suggestion.clarificationQuestions.map((q) => (
                  <p className="meta" key={q}>
                    {q}
                  </p>
                ))}
                <p className="meta">
                  These suggestions are for review. Organizations decide the
                  next steps after submission.
                </p>
              </section>
            )}
            {suggestion?.possibleRelatedIssueIds.length ? (
              <section className="section">
                <h3>Could this be the same issue?</h3>
                {nearby.data?.items
                  .filter((i) =>
                    suggestion.possibleRelatedIssueIds.includes(i.id),
                  )
                  .slice(0, 3)
                  .map((i) => (
                    <div className="related-issue" key={i.id}>
                      <strong>{i.title}</strong>
                      <p className="meta">{i.publicLocationLabel}</p>
                      <Time date={i.updatedAt} />
                      <Link
                        className="text-button"
                        href={`/public/issues/${i.id}?evidence=true`}
                      >
                        Add to this issue
                      </Link>
                      <label className="check-label">
                        <input
                          type="radio"
                          name="relation"
                          checked={draft.relatedIssueId === i.id}
                          onChange={() => change("relatedIssueId", i.id)}
                        />
                        Keep my new report and link this issue
                      </label>
                    </div>
                  ))}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => change("relatedIssueId", "")}
                >
                  Keep my new report without a link
                </button>
              </section>
            ) : null}
            <details>
              <summary>Your original description</summary>
              <p className="preserve-lines">{draft.description}</p>
            </details>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => change("step", 1)}
              >
                Edit report
              </button>
              <button
                type="button"
                className="secondary"
                disabled={pending || !session?.user}
                onClick={prepare}
              >
                Refresh suggestions
              </button>
            </div>
            <button
              className="button full"
              type="submit"
              disabled={pending || !session?.user || photoBlocked}
            >
              <Send size={18} />
              {pending ? "Saving…" : "Send report"}
            </button>
            <p className="meta">
              This is a local prototype. Reports do not contact authorities or
              emergency services.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
