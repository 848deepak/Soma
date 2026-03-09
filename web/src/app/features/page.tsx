import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features — Soma",
  description:
    "Explore everything Soma can do: cycle tracking, symptom logging, predictions, partner sync, and more.",
};

const sections = [
  {
    badge: "CY",
    title: "Cycle Tracking",
    items: [
      "Log period start and end with a single tap",
      "Automatic cycle length calculation from your history",
      "Predicted next period and fertile window",
      "Visual calendar with colour-coded cycle phases",
      "Month-to-month navigation with historical data",
    ],
  },
  {
    badge: "SM",
    title: "Symptom & Mood Logging",
    items: [
      "20+ built-in symptoms: cramps, bloating, headaches, skin, sleep, energy",
      "Custom mood tags and free-text notes",
      "Quick daily check-in from the home screen",
      "Symptom frequency analysis across multiple cycles",
      "PMS risk indicator based on your patterns",
    ],
  },
  {
    badge: "CI",
    title: "Cycle Intelligence",
    items: [
      "Fertile window prediction using your real cycle history",
      "Ovulation estimation with confidence indicators",
      "Trend insights: is your cycle getting shorter or longer?",
      "Basal body temperature correlation (manual entry)",
      "Cycle phase awareness: follicular, ovulatory, luteal, menstrual",
    ],
  },
  {
    badge: "PS",
    title: "Partner Sync",
    items: [
      "Share a subset of your data with a trusted partner",
      "Secure, code-based pairing — no personal details shared",
      "Partners see only what you choose to share",
      "Revoke access instantly at any time",
      "Real-time sync so your partner always has current info",
    ],
  },
  {
    badge: "PR",
    title: "Privacy & Security",
    items: [
      "All data stored locally on your device (SQLite)",
      "Optional cloud sync with AES-256-GCM encryption",
      "Anon-first: no account required to use the app",
      "One-tap data deletion — permanent and irreversible",
      "No ads, no tracking, no data selling — ever",
    ],
  },
  {
    badge: "UX",
    title: "Native Experience",
    items: [
      "Haptic feedback on symptom selection",
      "Configurable daily reminder notifications",
      "Dark mode support",
      "Offline-first with automatic background sync",
      "Fast, smooth animations with React Native Reanimated",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="page-shell">
      {/* Aurora blobs */}
      <div
        className="aurora-blob bg-peach w-[280px] h-[280px] -top-10 -left-10"
        aria-hidden
      />
      <div
        className="aurora-blob bg-rose w-[240px] h-[240px] top-40 -right-10"
        aria-hidden
      />

      <div className="page-container max-w-5xl">
        <div className="mb-10 text-center md:mb-14">
          <h1 className="mb-3 text-4xl font-serif font-medium text-charcoal md:mb-4 md:text-5xl">
            Features
          </h1>
          <div className="mx-auto mb-5 h-1 w-16 rounded-full bg-rose/40 md:mb-6 md:w-20" />
          <p className="mx-auto max-w-2xl text-base font-light text-charcoal/65 md:text-lg">
            Everything you need to understand your cycle — built with privacy at
            its core.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {sections.map((s) => (
            <div
              key={s.title}
              className="glass-panel rounded-[1.5rem] p-5 sm:p-6 md:rounded-[1.8rem] md:p-7"
            >
              <div className="mb-4 flex items-center gap-3 md:mb-5 md:gap-4">
                <div className="feature-badge">{s.badge}</div>
                <h2 className="text-lg font-serif font-medium text-charcoal md:text-xl">
                  {s.title}
                </h2>
              </div>
              <ul className="space-y-2.5 md:space-y-3">
                {s.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-rose/80 flex-shrink-0" />
                    <span className="text-sm leading-relaxed text-charcoal/72">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center md:mt-14">
          <Link
            href="/download"
            className="rose-shadow inline-block rounded-full bg-rose px-8 py-3.5 text-sm font-medium text-white shadow-xl transition-all hover:-translate-y-1 hover:bg-mauve md:px-10 md:py-4 md:text-base"
          >
            Download Soma Free
          </Link>
        </div>
      </div>
    </div>
  );
}
