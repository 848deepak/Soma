import type { Metadata } from "next";
import Link from "next/link";

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
    title: "Data processing",
    content:
      "Soma processes cycle data, daily logs, profile settings, and partner-sharing preferences to provide tracking, predictions, and partner features.",
  },
  {
    title: "Health data categories",
    content:
      "Depending on your usage, this can include period dates, cycle length patterns, symptoms, mood, energy, notes, hydration and sleep entries, and reminder preferences.",
  },
  {
    title: "Legal basis and consent",
    content:
      "Core processing is required to provide Soma. Optional analytics and optional partner-sharing settings are consent-based and can be managed in-app from Data Consent Center.",
  },
  {
    title: "Storage and transport",
    content:
      "Data is transmitted over secure network connections and stored for app functionality such as insights, history, and partner sharing. Sensitive actions are controlled with authentication and row-level access rules.",
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
      "Soma may use PostHog for product analytics and Sentry for crash/error monitoring when enabled. We do not sell your data, and we avoid sending personal health note content in telemetry payloads.",
  },
  {
    title: "Retention and deletion",
    content:
      "Account data is retained until deletion by you. Operational logs and telemetry are retained only as needed for security, reliability, and legal obligations, then removed or anonymized.",
  },
  {
    title: "Your privacy rights",
    content:
      "You may request access, export, correction, or deletion of your data. If you are in the EEA/UK, GDPR rights may include portability, objection, and complaint rights with your local authority.",
  },
  {
    title: "Cookies and similar technologies",
    content:
      "Our website may use essential storage mechanisms and, when enabled, analytics identifiers to keep the experience functional and improve performance. See our Cookie Notice for details.",
  },
  {
    title: "Data deletion",
    content:
      "You can delete your account data at any time from Settings → Account → Delete Account. This action is irreversible.",
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

        <div className="mt-6 text-center md:text-left">
          <Link
            href="/terms"
            className="text-sm font-semibold text-rose hover:underline underline-offset-2"
          >
            Read our Terms of Use →
          </Link>
          <div className="mt-3">
            <Link
              href="/cookies"
              className="text-sm font-semibold text-rose hover:underline underline-offset-2"
            >
              Read our Cookie Notice →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
