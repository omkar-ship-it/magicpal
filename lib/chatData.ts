/**
 * Mocked 1:1 chat — prototype only. MagicPal does have a real messages
 * table and a /messages route, but this floating-window experience runs on
 * seeded threads so it works for any viewer with no setup and no data
 * writes, consistent with the rest of the prototype.
 */

export type MockMessage = {
  id: string;
  /** true = sent by you. */
  mine: boolean;
  body: string;
  timeLabel: string;
};

/**
 * The handful of people whose connection requests are already accepted, so
 * there's someone to actually talk to. Keyed by name, which is the stable
 * handle across the seeded demo population.
 */
export const MOCK_ACCEPTED_NAMES = ["Dev Chandran", "Priya Raman", "Sarah Chen", "Aiko Tanaka", "Meera Pillai", "Arjun Bose"];

export const MOCK_THREADS: Record<string, MockMessage[]> = {
  "Dev Chandran": [
    { id: "m1", mine: false, body: "Hey — we're both in IIT Bombay Bengaluru Chapter!", timeLabel: "Mon 10:12" },
    { id: "m2", mine: true, body: "Ha, saw that. You're doing devrel at Clearline?", timeLabel: "Mon 10:20" },
    { id: "m3", mine: false, body: "Yeah, two years in. Mostly developer education and community right now.", timeLabel: "Mon 10:21" },
    { id: "m4", mine: false, body: "You're around Indiranagar? Would be good to grab a coffee.", timeLabel: "Mon 10:22" },
  ],
  "Priya Raman": [
    { id: "m1", mine: false, body: "ISB PGP '19 too? Small world.", timeLabel: "Tue 16:40" },
    { id: "m2", mine: true, body: "Same class! Were you in the product track?", timeLabel: "Tue 16:52" },
    { id: "m3", mine: false, body: "Design, then product. I'm putting together that panel for the reunion — want in?", timeLabel: "Tue 16:55" },
  ],
  "Sarah Chen": [
    { id: "m1", mine: true, body: "Saw you're in Bengaluru next week — free for 30 minutes?", timeLabel: "Wed 09:05" },
    { id: "m2", mine: false, body: "Yes! Tuesday or Wednesday works. I'm staying near MG Road.", timeLabel: "Wed 09:31" },
  ],
  "Aiko Tanaka": [
    { id: "m1", mine: false, body: "Stanford Engineering group pointed me here. You're working on maps?", timeLabel: "Fri 07:15" },
    { id: "m2", mine: true, body: "Sort of — a map-first professional network. Would love your read on the marketplace side.", timeLabel: "Fri 08:02" },
    { id: "m3", mine: false, body: "Happy to. Trust & safety is where most of these get hard, in my experience.", timeLabel: "Fri 08:09" },
  ],
  "Meera Pillai": [
    { id: "m1", mine: false, body: "Toit mixer on the 6th — you coming?", timeLabel: "Thu 19:44" },
  ],
  "Arjun Bose": [
    { id: "m1", mine: false, body: "We're hiring two infra engineers — alumni referrals jump the queue if you know anyone.", timeLabel: "Yesterday 11:30" },
    { id: "m2", mine: true, body: "I might. Is it Bengaluru-based or remote?", timeLabel: "Yesterday 12:10" },
    { id: "m3", mine: false, body: "Bengaluru, hybrid — three days in office near Domlur.", timeLabel: "Yesterday 12:14" },
  ],
};

export type BookingSlot = { id: string; day: string; date: string; times: string[] };

/** Mock availability for the "book a time" flow — nothing talks to a real calendar. */
export const BOOKING_SLOTS: BookingSlot[] = [
  { id: "d1", day: "Tue", date: "Nov 11", times: ["09:00", "11:30", "16:00"] },
  { id: "d2", day: "Wed", date: "Nov 12", times: ["10:00", "15:30"] },
  { id: "d3", day: "Thu", date: "Nov 13", times: ["09:30", "13:00", "16:30", "18:00"] },
  { id: "d4", day: "Fri", date: "Nov 14", times: ["11:00", "14:00"] },
];

export const MEETING_KINDS = ["Coffee", "Video call", "Phone call"] as const;
export type MeetingKind = (typeof MEETING_KINDS)[number];
