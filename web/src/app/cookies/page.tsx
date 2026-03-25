import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Notice — Soma",
  description:
    "Cookie and tracking disclosure for the Soma website and related services.",
};

const sections = [
  {
    title: "Why this notice exists",
    content:
      "This notice explains how Soma uses cookies and similar storage technologies on the website. The mobile app mainly relies on secure device storage instead of browser cookies.",
  },
  {
    title: "Essential technologies",
    content:
      "We may use strictly necessary cookies or local storage for core website functionality, including page rendering preferences, security controls, and session continuity.",
  },
  {
    title: "Analytics technologies",
    content:
      "When enabled, Soma may use privacy-conscious analytics identifiers to measure reliability and product quality. These analytics are optional and are not used for advertising profiles.",
  },
  {
    title: "What we do not use",
    content:
      "Soma does not use third-party ad-network cookies for targeted advertising and does not sell cookie-derived personal data.",
  },
  {
    title: "Your choices",
    content:
      "You can control cookies in your browser settings and clear local storage at any time. Disabling essential cookies may impact core website features.",
  },
  {
    title: "Related policies",
    content:
      "Please also review our Privacy Policy and Terms of Use for full details on data handling, legal rights, and service conditions.",
  },
  {
    title: "Contact",
    content: "Questions about this notice can be sent to privacy@soma-app.com.",
  },
];

export default function CookieNoticePage() {
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
            Cookie Notice
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
              <p className="text-sm leading-relaxed text-charcoal/65 md:text-[0.95rem]">
                {s.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}