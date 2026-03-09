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
    <div className="page-shell">
      <div
        className="aurora-blob bg-peach w-[320px] h-[320px] -top-10 -right-12"
        aria-hidden
      />
      <div
        className="aurora-blob bg-rose w-[220px] h-[220px] bottom-10 -left-8"
        aria-hidden
      />

      <div className="page-container max-w-4xl">
        <div className="mb-8 text-center md:mb-12 md:text-left">
          <h1 className="mb-2 text-4xl font-serif font-medium text-charcoal md:mb-3 md:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-xs tracking-wide text-charcoal/45 md:text-sm">
            Last updated: March 2026
          </p>
        </div>

        <div className="space-y-4 md:space-y-5">
          {sections.map((s) => (
            <div
              key={s.title}
              className="glass-panel rounded-[1.4rem] p-5 sm:p-6 md:rounded-[1.75rem] md:p-8"
            >
              <h2 className="mb-2.5 text-base font-serif font-medium text-charcoal md:mb-3 md:text-lg">
                {s.title}
              </h2>
              {s.content && (
                <p className="text-sm leading-relaxed text-charcoal/65 md:text-[0.95rem]">
                  {s.content}
                </p>
              )}
              {s.email && (
                <p className="text-sm leading-relaxed text-charcoal/65 md:text-[0.95rem]">
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
