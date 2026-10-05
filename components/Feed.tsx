"use client";

import { useState } from "react";
import { avatarUrl } from "@/lib/avatar";
import type { MockPost } from "@/lib/networks";

/**
 * One feed, reused at every level of the hierarchy — the public network, a
 * network, a group, or a club. Posting is prototype-only: it appends to
 * in-memory state held by MapView, so posts survive moving between panels
 * for as long as the app is open, and go away on reload.
 */
export default function Feed({
  posts,
  entityName,
  canPost,
  onPost,
}: {
  posts: MockPost[];
  entityName: string;
  /** You post to a wall you've joined; otherwise the composer explains why it's not available. */
  canPost: boolean;
  onPost: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const body = draft.trim();
    if (!body) return;
    onPost(body);
    setDraft("");
  }

  return (
    <div>
      {canPost ? (
        <div className="flex flex-col gap-1.5">
          <textarea
            className="input text-[12.5px]"
            rows={2}
            placeholder={`Post to ${entityName}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 400))}
          />
          <button onClick={submit} disabled={!draft.trim()} className="btn btn-primary btn-sm w-fit self-end">
            Post
          </button>
        </div>
      ) : (
        <p className="text-[12.5px] text-[var(--ink-soft)]">Join {entityName} to post here.</p>
      )}

      {posts.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--ink-soft)]">Nothing posted here yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {posts.map((p) => (
            <div key={p.id} className="card flex gap-2.5 p-3">
              <span className="avatar h-8 w-8 flex-none text-[11px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl(p.author)} alt="" />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] leading-5 text-[var(--ink)]">
                  <span className="font-semibold">{p.author}</span> {p.body}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{p.dateLabel}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
