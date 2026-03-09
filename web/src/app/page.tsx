import Link from "next/link";

const featureCards = [
  {
    emoji: "🌊",
    title: "Cycle Syncing",
    desc: "Don't fight your fatigue. Soma reveals workouts, nutrition, and energy patterns tailored to your hormonal phase — follicular, ovulatory, luteal, menstrual.",
  },
  {
    emoji: "🔒",
    title: "Partner View",
    desc: "Generate a secure, encrypted link for your partner. They see your mood and fertility status; your detailed private logs stay yours, always.",
  },
  {
    emoji: "✨",
    title: "Fluid Logging",
    desc: "Forget clinical checkboxes. Log your flow, mood, and symptoms using our beautiful tag interface — takes under 30 seconds.",
  },
];

const privacyItems = [
  {
    title: "End-to-End Encrypted",
    sub: "AES-256 standard. Keys generated on your device.",
  },
  {
    title: "Local-First Storage",
    sub: "Data lives on your phone, not our servers.",
  },
  {
    title: "Anonymous Usage",
    sub: "No email required to start tracking.",
  },
];

const dataRows = [
  { label: "Cycle Data", status: "Encrypted", dotColor: "bg-rose" },
  { label: "Symptom Logs", status: "Encrypted", dotColor: "bg-rose" },
  { label: "Personal Notes", status: "Encrypted", dotColor: "bg-rose" },
  {
    label: "Advertising ID",
    status: "Not Collected",
    dotColor: "bg-white/20",
    muted: true,
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden min-h-screen flex items-center">
        {/* Aurora blobs */}
        <div
          className="aurora-blob bg-peach w-[350px] h-[350px] top-[-50px] left-[-50px] animate-blob"
          aria-hidden
        />
        <div
          className="aurora-blob bg-rose w-[300px] h-[300px] bottom-0 right-[-50px] animate-blob"
          style={{ animationDelay: "2s" }}
          aria-hidden
        />

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 lg:gap-24 items-center w-full">
          {/* Left copy */}
          <div className="space-y-8 relative z-10 text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center space-x-2 bg-white/60 border border-charcoal/5 rounded-full px-4 py-1.5 backdrop-blur-sm shadow-sm">
              <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-charcoal/60 uppercase">
                Beta Access Open
              </span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-serif font-medium leading-[1.1] text-charcoal tracking-tight">
              Tune into your
              <br />
              <span
                className="italic pr-2"
                style={{
                  background: "linear-gradient(to right, #DDA7A5, #9B7E8C)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                inner rhythm.
              </span>
            </h1>

            <p className="text-lg text-charcoal/70 max-w-md mx-auto lg:mx-0 leading-relaxed font-light">
              Soma is the privacy-first cycle tracker that syncs your life to
              your hormones. No ads. No data selling. Just biology.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
              <a
                href="https://github.com/848deepak/Soma-/releases/latest/download/soma.apk"
                download
                className="bg-rose text-white px-8 py-4 rounded-full font-medium shadow-xl hover:bg-mauve transition-all hover:-translate-y-1 text-center"
                style={{ boxShadow: "0 20px 40px -12px rgba(221,167,165,0.4)" }}
              >
                Download the App
              </a>
              <Link
                href="/features"
                className="bg-white text-charcoal border border-charcoal/10 px-8 py-4 rounded-full font-medium hover:bg-cream hover:border-charcoal/30 transition-all text-center"
              >
                See Features
              </Link>
            </div>

            <p className="text-xs text-charcoal/40 pt-4 flex items-center justify-center lg:justify-start gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              AES-256 Encrypted on Device
            </p>
          </div>

          {/* Right — phone mockup */}
          <div className="relative flex justify-center lg:justify-end order-1 lg:order-2">
            <div className="relative w-[300px] h-[620px] bg-cream rounded-[46px] border-[7px] border-white ring-1 ring-charcoal/5 shadow-2xl z-10 animate-float overflow-hidden">
              <div className="w-full h-full bg-gradient-to-b from-white to-cream flex flex-col px-6 pt-12 pb-8 relative">
                {/* Inner glow blobs */}
                <div className="absolute top-16 left-8 w-36 h-36 bg-peach/30 rounded-full blur-2xl" />
                <div className="absolute bottom-16 right-8 w-36 h-36 bg-rose/20 rounded-full blur-2xl" />

                {/* Top bar */}
                <div className="flex justify-between items-center w-full mb-8 relative z-10">
                  <span className="font-serif text-charcoal text-lg font-bold">
                    Good Morning
                  </span>
                  <div className="w-8 h-8 bg-peach/40 rounded-full" />
                </div>

                {/* Cycle ring */}
                <div className="flex-1 flex items-center justify-center w-full relative z-10">
                  <div className="relative w-56 h-56 flex items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full blur-2xl animate-pulse-slow"
                      style={{
                        background:
                          "linear-gradient(to top right, rgba(255,218,185,0.5), rgba(221,167,165,0.4))",
                      }}
                    />
                    <div className="relative z-10 w-48 h-48 bg-white/40 backdrop-blur-xl rounded-full border border-white/60 flex flex-col items-center justify-center shadow-sm">
                      <span className="text-6xl font-serif text-charcoal font-light">
                        14
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-charcoal/50 mt-2 font-semibold">
                        Ovulation
                      </span>
                    </div>
                  </div>
                </div>

                {/* Insight card */}
                <div className="w-full glass-card p-4 rounded-3xl border-l-4 border-l-rose relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-rose text-base">✦</span>
                    <p className="text-[10px] font-bold text-charcoal uppercase tracking-wider">
                      Daily Insight
                    </p>
                  </div>
                  <p className="text-xs text-charcoal/80 leading-relaxed font-medium">
                    Energy is peaking. Great time for high-intensity workouts.
                  </p>
                </div>
              </div>
            </div>

            {/* Glow behind phone */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] rounded-full blur-3xl -z-10"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(221,167,165,0.2), transparent)",
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section
        id="features"
        className="py-32 relative"
        style={{ background: "rgba(255,255,255,0.4)" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-serif mb-6 text-charcoal">
              Designed for your reality
            </h2>
            <div className="w-24 h-1.5 bg-rose/30 mx-auto rounded-full" />
            <p className="mt-6 text-charcoal/60 max-w-2xl mx-auto text-lg">
              We stripped away the clutter. Soma is a precision tool for
              understanding your biology — not another app full of flowers and
              sparkles.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featureCards.map((f) => (
              <div
                key={f.title}
                className="glass-card p-10 rounded-[2rem] group cursor-default"
              >
                <div className="w-16 h-16 rounded-2xl bg-peach/20 flex items-center justify-center mb-8 text-3xl group-hover:scale-110 transition duration-300">
                  {f.emoji}
                </div>
                <h3 className="text-2xl font-serif mb-4 text-charcoal font-medium">
                  {f.title}
                </h3>
                <p className="text-charcoal/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy ───────────────────────────────────────────────────────── */}
      <section
        id="privacy"
        className="py-32 bg-charcoal text-cream relative overflow-hidden"
      >
        {/* Background glow */}
        <div
          className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "rgba(221,167,165,0.1)" }}
        />

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-block px-4 py-1.5 border border-white/20 rounded-full text-xs font-medium tracking-wide uppercase mb-8 text-rose">
              Zero-Knowledge Architecture
            </div>
            <h2 className="text-4xl lg:text-6xl font-serif mb-8 leading-tight">
              Your body data
              <br />
              <span className="text-gradient-warm">belongs to you.</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg">
              Most health apps sell your data to advertisers. We built Soma
              differently. Your health logs are encrypted{" "}
              <strong className="text-white/80">on your device</strong> before
              they ever touch the cloud.
            </p>

            <ul className="space-y-6">
              {privacyItems.map((item) => (
                <li key={item.title} className="flex items-start gap-4">
                  <div className="mt-1 w-6 h-6 rounded-full bg-rose/20 flex items-center justify-center text-rose text-sm flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <span className="block text-white font-medium">
                      {item.title}
                    </span>
                    <span className="text-sm text-white/40">{item.sub}</span>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/privacy"
              className="inline-block mt-10 text-sm font-semibold text-rose hover:underline underline-offset-2 transition"
            >
              Read our Privacy Policy →
            </Link>
          </div>

          {/* Right — data transparency card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 lg:p-10 rounded-[2.5rem] shadow-2xl">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
              <span className="font-serif text-2xl">Data Transparency</span>
              <span className="text-xs bg-rose text-charcoal px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                Secure
              </span>
            </div>
            <div className="space-y-5 font-mono text-sm">
              {dataRows.map((row) => (
                <div
                  key={row.label}
                  className={`flex justify-between items-center group ${row.muted ? "border-t border-white/5 pt-5" : ""}`}
                >
                  <span className="text-white/40 group-hover:text-white transition">
                    {row.label}
                  </span>
                  <div
                    className={`flex items-center gap-2 ${row.muted ? "text-white/60" : "text-rose"}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${row.dotColor}`}
                    />
                    {row.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Download CTA ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6 text-center bg-cream">
        <div className="mx-auto max-w-xl">
          <h2 className="text-4xl font-serif font-medium text-charcoal mb-4">
            Ready to get started?
          </h2>
          <p className="text-charcoal/60 mb-10 text-lg font-light">
            Free forever. No sign-up required. Available for Android now, iOS
            coming soon.
          </p>
          <Link
            href="/download"
            className="inline-block bg-rose text-white px-10 py-4 rounded-full font-medium shadow-xl hover:bg-mauve transition-all hover:-translate-y-1"
            style={{ boxShadow: "0 20px 40px -12px rgba(221,167,165,0.4)" }}
          >
            Download Soma
          </Link>
        </div>
      </section>
    </>
  );
}
