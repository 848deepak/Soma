import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — Soma",
  description: "Terms of use for Soma cycle tracking services.",
};

const sections = [
  {
    title: "Acceptance of terms",
    content:
      "By accessing or using Soma, you agree to these Terms of Use. If you do not agree, do not use the service.",
  },
  {
    title: "Medical disclaimer",
    content:
      "Soma is an informational wellness tool and is not medical advice, diagnosis, or treatment. Always consult a qualified clinician for medical concerns.",
  },
  {
    title: "Eligibility",
    content:
      "You must be at least 13 years old to use Soma. If you are under the age of majority in your jurisdiction, use Soma only with guardian permission.",
  },
  {
    title: "Your account and data",
    content:
      "You are responsible for activity on your account and for keeping device access secure. You may delete your cycle data from Settings at any time.",
  },
  {
    title: "Acceptable use",
    content:
      "You agree not to misuse Soma, interfere with service operation, attempt unauthorized access, or use the platform for unlawful purposes.",
  },
  {
    title: "Partner sharing",
    content:
      "Partner Sync is optional. You control permissions and may revoke access at any time. Shared partner views are read-only and limited by your settings.",
  },
  {
    title: "Service changes",
    content:
      "We may update, suspend, or discontinue features at any time. We may also update these terms; continued use means you accept the updated terms.",
  },
  {
    title: "Contact",
    content: null,
    email: "support@soma-app.com",
  },
];

export default function TermsPage() {
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
            Terms of Use
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
                  Questions about these terms? Email us at{" "}
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
            href="/privacy"
            className="text-sm font-semibold text-rose hover:underline underline-offset-2"
          >
            Read our Privacy Policy →
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
