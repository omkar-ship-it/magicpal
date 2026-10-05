"use client";

import { useState } from "react";
import Link from "next/link";
import { InstitutionIcon } from "@/components/MapPrimitives";
import type { InstitutionKind } from "@/lib/prototypeData";

type Step = "intro" | "create" | "brand" | "invite" | "done";

const KIND_LABEL: Record<InstitutionKind, string> = {
  university: "University",
  employer_alumni: "Employer alumni network",
  professional_body: "Professional body",
};

/** Which already-seeded demo community the walkthrough deep-links into at the end — this whole page is a clickthrough prototype, not a real onboarding backend, so there's nothing to actually create. */
const DEMO_GROUP_FOR_KIND: Record<InstitutionKind, string> = {
  university: "grp-iitb",
  employer_alumni: "grp-exgoogle",
  professional_body: "grp-design-leaders",
};

const SWATCHES = ["#2a5db0", "#7c5cff", "#0ea5b8", "#c2410c", "#1f8a5f"];

function slugify(s: string): string {
  const base = s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "network";
}

const STEPS: Step[] = ["intro", "create", "brand", "invite", "done"];

function StepDots({ step }: { step: Step }) {
  const i = STEPS.indexOf(step);
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((s, idx) => (
        <span
          key={s}
          className="h-1.5 rounded-full transition-all"
          style={{
            width: idx === i ? 20 : 7,
            background: idx <= i ? "var(--brand)" : "var(--line)",
          }}
        />
      ))}
    </div>
  );
}

export default function InstitutionsPage() {
  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<InstitutionKind>("university");
  const [mission, setMission] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [copied, setCopied] = useState(false);

  const slug = slugify(name);
  const joinLink = `magicpal.app/join/${slug}-x7k2`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`https://${joinLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied — the link is still right there to select manually.
    }
  }

  return (
    <div className="mx-auto max-w-xl pb-16">
      {step !== "intro" && (
        <div className="mb-6">
          <StepDots step={step} />
        </div>
      )}

      {step === "intro" && (
        <>
          <h1 className="text-2xl font-bold">Bring your community onto MagicPal</h1>
          <p className="mt-2 text-[13.5px] leading-6 text-[var(--ink-soft)]">
            Your alumni, employees, or members already live on the public map — this is how you give them a verified home inside it:
            a community hub with its own members, events, and updates, plus an &ldquo;Institutions&rdquo; pin so people can find their way in.
          </p>
          <div className="card mt-6 flex flex-col gap-3 p-6">
            <div className="flex items-start gap-3">
              <span className="text-[20px]">🌍</span>
              <p className="text-[13px] leading-5 text-[var(--ink)]">
                Members stay in control — visibility on the public map and which affiliations show are both member-side settings, never
                something an institution can force on.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[20px]">🏛</span>
              <p className="text-[13px] leading-5 text-[var(--ink)]">
                A real pin on the map, plus a hub your members can open from any badge — a mission, pinned updates, upcoming events,
                and a member directory.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[20px]">✦</span>
              <p className="text-[13px] leading-5 text-[var(--ink)]">
                This walkthrough is a preview of the onboarding experience — nothing you enter here is saved.
              </p>
            </div>
          </div>
          <button onClick={() => setStep("create")} className="btn btn-primary mt-6">
            Get started
          </button>
        </>
      )}

      {step === "create" && (
        <>
          <h1 className="text-2xl font-bold">Create your network</h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--ink-soft)]">What should members search for to find you?</p>
          <div className="card mt-6 flex flex-col gap-5 p-6">
            <div>
              <label className="label">Network name</label>
              <input
                className="input"
                placeholder="IIT Bombay Alumni"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value as InstitutionKind)}>
                {(Object.keys(KIND_LABEL) as InstitutionKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">One-line mission (optional)</label>
              <input
                className="input"
                placeholder="Connecting graduates building and leading across the world."
                value={mission}
                onChange={(e) => setMission(e.target.value.slice(0, 140))}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={() => setStep("intro")} className="btn btn-ghost">
              Back
            </button>
            <button onClick={() => setStep("brand")} disabled={!name.trim()} className="btn btn-primary">
              Next
            </button>
          </div>
        </>
      )}

      {step === "brand" && (
        <>
          <h1 className="text-2xl font-bold">Brand your pin</h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--ink-soft)]">This is exactly how members will see you on the map and in the hub.</p>

          <div className="card mt-6 flex flex-col gap-4 p-6">
            <div className="flex gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Use color ${c}`}
                  className="h-8 w-8 rounded-full border-2 transition-transform"
                  style={{ background: c, borderColor: c === color ? "var(--ink)" : "transparent", transform: c === color ? "scale(1.1)" : undefined }}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: "var(--sunk)" }}>
              <div className="layer-pin" style={{ background: color }}>
                <InstitutionIcon />
              </div>
              <div className="text-[12.5px] text-[var(--ink-soft)]">Your pin on the map</div>
            </div>

            <div className="rounded-2xl border border-[var(--line)] p-4">
              <span className="text-[22px] leading-none">{kind === "university" ? "🎓" : "👥"}</span>
              <h2 className="mt-1.5 text-[16px] font-bold leading-tight">{name || "Your network"}</h2>
              <span className="pill mt-1.5" style={{ background: "var(--sunk)", color: "var(--ink-soft)" }}>
                Member count grows as people join
              </span>
              <p className="mt-2.5 text-[12.5px] leading-5 text-[var(--ink)]">
                {mission || "Add a one-line mission to tell members what this network is for."}
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button onClick={() => setStep("create")} className="btn btn-ghost">
              Back
            </button>
            <button onClick={() => setStep("invite")} className="btn btn-primary">
              Next
            </button>
          </div>
        </>
      )}

      {step === "invite" && (
        <>
          <h1 className="text-2xl font-bold">Invite your members</h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--ink-soft)]">
            Share one link — anyone who joins through it is added to {name || "your network"} automatically.
          </p>
          <div className="card mt-6 flex flex-col gap-3 p-6">
            <label className="label">Your join link</label>
            <div className="flex items-center gap-2">
              <input className="input mono" readOnly value={joinLink} />
              <button type="button" onClick={copyLink} className="btn btn-ghost btn-sm flex-none">
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <p className="text-[12px] text-[var(--ink-soft)]">
              In a real rollout this would also support a bulk email invite or a verified @domain auto-join — this preview only shows
              the link.
            </p>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={() => setStep("brand")} className="btn btn-ghost">
              Back
            </button>
            <button onClick={() => setStep("done")} className="btn btn-primary">
              Looks good
            </button>
          </div>
        </>
      )}

      {step === "done" && (
        <>
          <h1 className="text-2xl font-bold">Your community hub is ready</h1>
          <p className="mt-2 text-[13.5px] leading-6 text-[var(--ink-soft)]">
            This preview uses one of MagicPal&apos;s existing demo communities so you can see the real hub, members and all — your
            actual network would start empty and fill in as people join through your link.
          </p>
          <div className="card mt-6 flex items-center gap-3 p-6">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-full text-[18px] text-white" style={{ background: color }}>
              ✓
            </span>
            <div>
              <p className="text-[14px] font-semibold">{name || "Your network"}</p>
              <p className="text-[12px] text-[var(--ink-soft)]">{KIND_LABEL[kind]}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/?previewGroup=${DEMO_GROUP_FOR_KIND[kind]}`} className="btn btn-primary">
              View it on the map →
            </Link>
            <button
              onClick={() => {
                setStep("intro");
                setName("");
                setMission("");
              }}
              className="btn btn-ghost"
            >
              Start another
            </button>
          </div>
        </>
      )}
    </div>
  );
}
