import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features — Soma",
  description:
    "Explore everything Soma can do: cycle tracking, symptom logging, predictions, partner sync, and more.",
};

const sections = [
  {
    emoji: "🌊",
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
    emoji: "🌿",
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
    emoji: "🔮",
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
    emoji: "💜",
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
    emoji: "🔒",
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
    emoji: "📱",
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
    <div className="min-h-screen bg-cream pt-28 pb-24 px-6">
      {/* Aurora blobs */}
      <div
        className="aurora-blob bg-peach w-[300px] h-[300px] top-0 left-0"
        aria-hidden
      />
      <div
        className="aurora-blob bg-rose w-[250px] h-[250px] top-40 right-0"
        aria-hidden
      />

      <div className="mx-auto max-w-4xl relative z-10">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-serif font-medium text-charcoal">
            Features
          </h1>
          <div className="w-20 h-1 bg-rose/40 mx-auto rounded-full mb-6" />
          <p className="text-lg text-charcoal/60 font-light max-w-xl mx-auto">
            Everything you need to understand your cycle — built with privacy at
            its core.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((s) => (
            <div key={s.title} className="glass-card rounded-[2rem] p-8">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-peach/20 flex items-center justify-center text-2xl">
                  {s.emoji}
                </div>
                <h2 className="text-xl font-serif font-medium text-charcoal">
                  {s.title}
                </h2>
              </div>
              <ul className="space-y-2.5">
                {s.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 text-rose flex-shrink-0">✓</span>
                    <span className="text-sm text-charcoal/70">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/download"
            className="inline-block bg-rose text-white px-10 py-4 rounded-full font-medium shadow-xl hover:bg-mauve transition-all hover:-translate-y-1"
            style={{ boxShadow: "0 20px 40px -12px rgba(221,167,165,0.4)" }}
          >
            Download Soma Free
          </Link>
        </div>
      </div>
    </div>
  );
}
