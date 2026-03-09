import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Soma",
  description: "Soma's privacy policy. We believe your health data is yours.",
};

const sections = [
  {
    title: "Our commitment",
    content:
      "Soma is built on a simple principle: your health data belongs to you. We will never sell, share, or monetise your personal information. This policy explains what data the app collects, why, and how it is protected.",
  },
  {
    title: "Data stored on your device",
    content:
      "By default, Soma stores all data locally on your device using SQLite — cycle dates, symptom logs, personal notes, and notification preferences. None of this data leaves your device unless you explicitly enable cloud sync.",
  },
  {
    title: "Optional cloud sync",
    content:
      "If you create an account and enable sync, your data is transmitted using TLS in transit and AES-256-GCM encryption at rest. Encryption keys are generated on your device and stored in the secure enclave — we have no access to your plaintext data.",
  },
  {
    title: "Partner Sync",
    content:
      "Partner Sync lets you share a subset of your cycle data with one trusted person. You control exactly what is shared and can revoke access at any time. Partners never see your raw data — only a curated, read-only view you authorise.",
  },
  {
    title: "Anonymous usage",
    content:
      "You can use Soma without creating an account. The app assigns an anonymous session identifier to enable optional features. This identifier is not linked to any personal information and is deleted when you log out or delete the app.",
  },
  {
    title: "Analytics and crash reporting",
    content:
      "Soma does not include third-party analytics SDKs (Firebase, Mixpanel, Amplitude, etc.). Any crash reporting is limited to anonymised stack traces — no personal or health data is ever attached.",
  },
  {
    title: "Data deletion",
    content:
      "You can delete all your data at any time from Settings → Account → Delete All Data. This action is immediate and irreversible. If cloud sync is enabled, your data is purged from our servers within 24 hours.",
  },
  {
    title: "Children",
    content:
      "Soma is not directed at children under 13. We do not knowingly collect data from anyone under 13.",
  },
  {
    title: "Contact",
    content: null,
    email: "privacy@soma-app.com",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream pt-28 pb-24 px-6">
      <div
        className="aurora-blob bg-peach w-[350px] h-[350px] top-0 right-0"
        aria-hidden
      />

      <div className="mx-auto max-w-3xl relative z-10">
        <div className="mb-12">
          <h1 className="text-5xl font-serif font-medium text-charcoal mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-charcoal/40">Last updated: March 2026</p>
        </div>

        <div className="space-y-6">
          {sections.map((s) => (
            <div key={s.title} className="glass-card rounded-[1.75rem] p-8">
              <h2 className="text-lg font-serif font-medium text-charcoal mb-3">
                {s.title}
              </h2>
              {s.content && (
                <p className="text-charcoal/60 text-sm leading-relaxed">
                  {s.content}
                </p>
              )}
              {s.email && (
                <p className="text-charcoal/60 text-sm leading-relaxed">
                  Questions about this policy? Email us at{" "}
                  <a
                    href={`mailto:${s.email}`}
                    className="text-rose hover:underline underline-offset-2"
                  >
                    {s.email}
                  </a>
                  .
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
