"use client";

import { useState } from "react";
import type { PriceTier } from "@/lib/prototypeData";

export type CheckoutResult = { tier: PriceTier; reference: string };

/**
 * A mocked checkout, shared by paid community membership and event tickets.
 * Nothing is charged and no card details leave the component — the fields
 * exist so the flow reads like a real one. Three steps: pick a tier, "pay",
 * see a receipt.
 */
export default function Checkout({
  title,
  subtitle,
  tiers,
  ctaLabel,
  onDone,
  onCancel,
}: {
  title: string;
  subtitle: string;
  tiers: PriceTier[];
  ctaLabel: string;
  onDone: (result: CheckoutResult) => void;
  onCancel: () => void;
}) {
  const [tierId, setTierId] = useState(tiers.find((t) => t.featured)?.id ?? tiers[0]?.id ?? "");
  const [step, setStep] = useState<"tier" | "pay" | "done">("tier");
  const [card, setCard] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference] = useState(() => `MP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);

  const tier = tiers.find((t) => t.id === tierId);
  const free = tier?.priceLabel.toLowerCase() === "free";

  function pay() {
    if (!tier) return;
    setBusy(true);
    // A beat of latency so the flow feels like a real payment rather than an instant toggle.
    setTimeout(() => {
      setBusy(false);
      setStep("done");
    }, 700);
  }

  if (step === "done" && tier) {
    return (
      <div className="card p-4">
        <p className="text-[22px] leading-none">✅</p>
        <p className="mt-2 text-[15px] font-semibold">{free ? "You're in" : "Payment complete"}</p>
        <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">
          {tier.name} · {tier.priceLabel}
          {tier.period ? ` ${tier.period}` : ""}
        </p>
        <div className="mt-3 rounded-xl p-3 text-[12px]" style={{ background: "var(--sunk)" }}>
          <div className="flex justify-between">
            <span className="text-[var(--ink-soft)]">Reference</span>
            <span className="mono font-semibold">{reference}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-[var(--ink-soft)]">Method</span>
            <span>{free ? "No payment required" : `Card ending ${card.slice(-4) || "4242"}`}</span>
          </div>
          <p className="mt-2 text-[11px] text-[var(--ink-soft)]">Prototype — nothing was charged.</p>
        </div>
        <button onClick={() => onDone({ tier, reference })} className="btn btn-primary btn-sm mt-3 w-full">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mt-0.5 text-[12.5px] text-[var(--ink-soft)]">{subtitle}</p>

      {step === "tier" && (
        <>
          <div className="mt-3 flex flex-col gap-2">
            {tiers.map((t) => (
              <button
                key={t.id}
                onClick={() => setTierId(t.id)}
                className="rounded-xl border p-3 text-left transition-colors"
                style={{
                  borderColor: t.id === tierId ? "var(--brand)" : "var(--line)",
                  background: t.id === tierId ? "color-mix(in srgb, var(--brand) 7%, var(--card))" : "var(--card)",
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13.5px] font-semibold">{t.name}</span>
                  <span className="text-[13.5px] font-semibold">
                    {t.priceLabel}
                    {t.period && <span className="text-[11px] font-normal text-[var(--ink-soft)]"> {t.period}</span>}
                  </span>
                </div>
                <ul className="mt-1.5 flex flex-col gap-0.5">
                  {t.perks.map((perk) => (
                    <li key={perk} className="text-[12px] text-[var(--ink-soft)]">
                      · {perk}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={onCancel} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button onClick={() => (free ? pay() : setStep("pay"))} disabled={!tier} className="btn btn-primary btn-sm flex-1">
              {free ? ctaLabel : `${ctaLabel} — ${tier?.priceLabel}`}
            </button>
          </div>
        </>
      )}

      {step === "pay" && tier && (
        <>
          <div className="mt-3 rounded-xl p-3" style={{ background: "var(--sunk)" }}>
            <div className="flex justify-between text-[13px]">
              <span className="font-semibold">{tier.name}</span>
              <span className="font-semibold">
                {tier.priceLabel}
                {tier.period ? ` ${tier.period}` : ""}
              </span>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <div>
              <label className="label">Name on card</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="A. Name" />
            </div>
            <div>
              <label className="label">Card number</label>
              <input
                className="input mono"
                value={card}
                onChange={(e) => setCard(e.target.value.replace(/[^\d]/g, "").slice(0, 16))}
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
              />
            </div>
            <p className="text-[11px] text-[var(--ink-soft)]">Prototype checkout — no card is stored, sent, or charged.</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setStep("tier")} className="btn btn-ghost btn-sm">
              Back
            </button>
            <button onClick={pay} disabled={busy} className="btn btn-primary btn-sm flex-1">
              {busy ? "Processing…" : `Pay ${tier.priceLabel}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
