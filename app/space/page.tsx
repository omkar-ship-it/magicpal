import SpaceBoard from "@/components/SpaceBoard";

/**
 * One co-working floor, as a member sees it — the demo for operators.
 *
 * Simulated on a single location with the full membership populated,
 * because density is the whole argument: every community tool these
 * operators have been shown runs on a dozen fake users, and a dozen people
 * is a dinner party. At two hundred the question changes from "who is
 * here" to "who here is worth getting up for", which is the only question
 * this product answers.
 */
export default function SpacePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-5">
        <p className="label">Prototype · a single co-working floor</p>
        <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em]">
          Two hundred people share this floor. You know four of them.
        </h1>
        <p className="mt-1.5 max-w-[64ch] text-[13px] leading-[1.6] text-[var(--ink-soft)]">
          A simulation of one location, fully populated, so the experience can be judged at the density it
          actually has to work at. Every person, company, ask and event below is invented demo data — an
          illustration of the product, not affiliated with or endorsed by the operator named.
        </p>
      </header>

      <SpaceBoard />

      <p className="mt-6 max-w-[64ch] text-[12px] leading-[1.6] text-[var(--ink-soft)]">
        What an operator gets out of it: a reason members renew that isn&rsquo;t the desk. Introductions that
        happened, asks that got answered, and events people actually turned up to — all of it measurable, none of
        it dependent on a community manager remembering who does what.
      </p>
    </main>
  );
}
