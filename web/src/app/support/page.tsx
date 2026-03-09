import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Soma",
  description:
    "Get help with Soma, find answers to common questions, or contact us.",
};

const faqs = [
  {
    q: "Is Soma really free?",
    a: "Yes. Soma is completely free with no in-app purchases, subscriptions, or ads. We believe health tools should be accessible to everyone.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. You can use all core features without any account. An optional account unlocks encrypted cloud backup and Partner Sync.",
  },
  {
    q: "Where is my data stored?",
    a: "By default, everything is stored locally on your device using SQLite. Cloud sync is strictly opt-in and your data is encrypted end-to-end.",
  },
  {
    q: "Can Soma predict my ovulation date?",
    a: "Yes. After you've logged a few cycles, Soma uses your history to predict your fertile window and estimated ovulation day. The more cycles you log, the more accurate the prediction.",
  },
  {
    q: "How do I set up Partner Sync?",
    a: "Go to Settings → Partner Sync. Generate a code and share it with your partner. They enter it in their Soma app and you'll be connected. You can manage — or revoke — access at any time.",
  },
  {
    q: "How do I delete all my data?",
    a: "Go to Settings → Account → Delete All Data. This is immediate and permanent. If cloud sync is enabled, your server-side data is also purged within 24 hours.",
  },
  {
    q: "Will Soma come to iPhone (iOS)?",
    a: "We're actively working on an iOS release. Leave your email in the contact form below and we'll notify you the moment it's available.",
  },
  {
    q: "The APK won't install on my Android device.",
    a: "Enable 'Install from unknown sources' in your Android settings — usually Settings → Apps → Special app access → Install unknown apps.",
  },
];

export default function SupportPage() {
  return (
    <div className="page-shell">
      <div
        className="aurora-blob bg-peach w-[320px] h-[320px] -top-8 -right-8"
        aria-hidden
      />
      <div
        className="aurora-blob bg-rose w-[240px] h-[240px] bottom-16 -left-8"
        aria-hidden
      />

      <div className="page-container max-w-4xl">
        <div className="mb-10 text-center md:mb-14">
          <h1 className="mb-3 text-4xl font-serif font-medium text-charcoal md:mb-4 md:text-5xl">
            Support
          </h1>
          <div className="mx-auto mb-5 h-1 w-16 rounded-full bg-rose/40 md:mb-6" />
          <p className="text-base font-light text-charcoal/62 md:text-lg">
            We&apos;re here to help. Find answers below or send us a message.
          </p>
        </div>

        {/* FAQ */}
        <section className="mb-8 md:mb-12">
          <h2 className="mb-4 text-xl font-serif font-medium text-charcoal md:mb-6 md:text-2xl">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="glass-panel rounded-[1.2rem] p-5 md:rounded-[1.5rem] md:p-6"
              >
                <h3 className="text-sm font-semibold text-charcoal mb-2">
                  {faq.q}
                </h3>
                <p className="text-sm text-charcoal/60 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="glass-panel rounded-[1.5rem] p-5 sm:p-6 lg:rounded-[2rem] lg:p-10">
          <h2 className="mb-2 text-xl font-serif font-medium text-charcoal md:text-2xl">
            Contact Us
          </h2>
          <p className="mb-6 text-sm text-charcoal/52 md:mb-8">
            Not finding what you need? We usually respond within one business
            day.
          </p>
          <form
            action="mailto:support@soma-app.com"
            method="get"
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-charcoal/50"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Your name"
                className="w-full rounded-xl border border-charcoal/10 bg-white/75 px-4 py-3 text-sm text-charcoal placeholder-charcoal/30 transition focus:outline-none focus:ring-2 focus:ring-rose/30"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-charcoal/50"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                className="w-full rounded-xl border border-charcoal/10 bg-white/75 px-4 py-3 text-sm text-charcoal placeholder-charcoal/30 transition focus:outline-none focus:ring-2 focus:ring-rose/30"
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-charcoal/50"
              >
                Message
              </label>
              <textarea
                id="message"
                name="body"
                rows={5}
                placeholder="Describe your question or issue..."
                className="w-full rounded-xl border border-charcoal/10 bg-white/75 px-4 py-3 text-sm text-charcoal placeholder-charcoal/30 transition focus:outline-none focus:ring-2 focus:ring-rose/30"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-charcoal py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-rose"
            >
              Send Message
            </button>
          </form>
          <p className="mt-5 text-center text-xs text-charcoal/40">
            Or email us directly at{" "}
            <a
              href="mailto:support@soma-app.com"
              className="font-medium text-rose hover:underline underline-offset-2"
            >
              support@soma-app.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
