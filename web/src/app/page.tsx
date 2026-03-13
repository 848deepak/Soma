import Link from "next/link";

const featureCards = [
  {
    icon: "cycle",
    title: "Cycle Syncing",
    desc: "Don't fight your fatigue. Soma reveals workouts, nutrition, and energy patterns tailored to your hormonal phase — follicular, ovulatory, luteal, menstrual.",
  },
  {
    icon: "lock",
    title: "Partner View",
    desc: "Generate a secure, encrypted link for your partner. They see your mood and fertility status; your detailed private logs stay yours, always.",
  },
  {
    icon: "spark",
    title: "Fluid Logging",
    desc: "Forget clinical checkboxes. Log your flow, mood, and symptoms using our beautiful tag interface — takes under 30 seconds.",
  },
] as const;

function FeatureIcon({ icon }: { icon: "cycle" | "lock" | "spark" }) {
  if (icon === "cycle") {
    return (
      <svg
        className="w-8 h-8 text-mauve"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a9 9 0 11-2.64-6.36M21 4v6h-6"
        />
      </svg>
    );
  }

  if (icon === "lock") {
    return (
      <svg
        className="w-8 h-8 text-mauve"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <rect x="4" y="11" width="16" height="9" rx="2" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 11V8a4 4 0 118 0v3"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-8 h-8 text-mauve"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z"
      />
    </svg>
  );
}

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
            <div className="relative w-[340px] h-[700px] sm:w-[370px] sm:h-[760px] bg-cream rounded-[50px] border-[8px] border-white ring-1 ring-charcoal/5 shadow-2xl z-10 animate-float overflow-hidden">
              <div className="w-full h-full bg-gradient-to-b from-white to-cream flex flex-col px-7 pt-14 pb-6 relative">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[110px] opacity-30 bg-[radial-gradient(circle,#FFDAB9_0%,transparent_70%)]" />
                <div className="absolute bottom-1/3 left-0 w-56 h-56 rounded-full blur-[95px] opacity-25 bg-[radial-gradient(circle,#DDA7A5_0%,transparent_70%)]" />

                <div className="relative z-10 flex items-start justify-between mb-7">
                  <h3 className="font-serif text-charcoal text-[2.45rem] leading-[1.04] font-semibold tracking-tight">
                    Good Morning,
                    <br />
                    Parisha
                  </h3>
                  <div className="w-12 h-12 rounded-full border border-white/60 flex items-center justify-center text-mauve bg-gradient-to-br from-peach/40 to-rose/20 shadow-[0_4px_16px_rgba(221,167,165,0.2)]">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.857 17.082A23.848 23.848 0 0018 15.75a8.967 8.967 0 01-3-6.75V9a6 6 0 10-12 0v.75a8.967 8.967 0 01-3 6.75c1.02.542 2.073.983 3.143 1.332m11.714-.001A24.255 24.255 0 0112 18.75c-1.012 0-2.004-.06-2.97-.168m5.827 0a3 3 0 11-5.654 0"
                      />
                    </svg>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col items-center mt-5 mb-7">
                  <div className="relative w-[280px] h-[280px] flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full blur-[40px] opacity-60 bg-[linear-gradient(135deg,#FFDAB9_0%,#DDA7A5_50%,#9B7E8C_100%)]" />
                    <div className="relative w-56 h-56 rounded-full flex items-center justify-center bg-[linear-gradient(135deg,#FFDAB9_0%,#DDA7A5_100%)] shadow-[0_20px_60px_rgba(221,167,165,0.4),inset_0_1px_0_rgba(255,255,255,0.5)]">
                      <div className="absolute inset-0 rounded-full opacity-30 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.6)_0%,transparent_60%)]" />
                      <div className="relative z-10 flex flex-col items-center text-white">
                        <span className="text-[4.5rem] leading-none font-serif">
                          14
                        </span>
                        <span className="text-[0.8rem] tracking-[0.15em] font-medium uppercase mt-1 mb-2.5">
                          Day
                        </span>
                        <span className="text-[1.05rem] font-medium">
                          Ovulation Phase
                        </span>
                      </div>
                    </div>
                    <div className="absolute top-8 right-12 w-16 h-16 rounded-full blur-sm opacity-40 bg-[linear-gradient(135deg,#9B7E8C,#DDA7A5)]" />
                    <div className="absolute bottom-12 left-8 w-14 h-14 rounded-full blur-sm opacity-40 bg-[linear-gradient(135deg,#FFDAB9,#DDA7A5)]" />
                  </div>
                </div>

                <div className="relative z-10 rounded-[28px] border border-white/60 p-5 backdrop-blur-sm bg-[linear-gradient(135deg,rgba(255,218,185,0.25)_0%,rgba(221,167,165,0.2)_100%)] shadow-[0_8px_32px_rgba(221,167,165,0.16)]">
                  <div className="absolute inset-0 opacity-40 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.6)_0%,transparent_60%)]" />
                  <div className="flex gap-4 items-start">
                    <div className="relative z-10 w-12 h-12 rounded-full border border-white/55 flex items-center justify-center text-mauve bg-gradient-to-br from-peach/40 to-rose/35">
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 3v2.25M12 18.75V21M4.95 4.95l1.591 1.591M17.459 17.459l1.591 1.591M3 12h2.25M18.75 12H21M4.95 19.05l1.591-1.591M17.459 6.541l1.591-1.591M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <p className="relative z-10 text-[0.95rem] leading-relaxed text-charcoal/95">
                      Your estrogen is peaking today. You might notice a natural
                      glow and higher energy levels.
                    </p>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-center gap-2 py-5 opacity-70">
                  <span className="w-2 h-2 rounded-full bg-peach" />
                  <span className="w-2 h-2 rounded-full bg-rose" />
                  <span className="w-2 h-2 rounded-full bg-mauve" />
                </div>

                <div className="relative z-10 rounded-[24px] border border-white/60 p-4 backdrop-blur-sm bg-[linear-gradient(135deg,rgba(255,218,185,0.15)_0%,rgba(221,167,165,0.1)_100%)] shadow-[0_4px_20px_rgba(221,167,165,0.1)] mb-4">
                  <div className="flex justify-between items-center">
                    {[
                      { day: "Mon", date: 12 },
                      { day: "Tue", date: 13 },
                      { day: "Wed", date: 14, isCurrent: true },
                      { day: "Thu", date: 15 },
                      { day: "Fri", date: 16, hasPeriod: true },
                      { day: "Sat", date: 17, hasPeriod: true },
                      { day: "Sun", date: 18, hasPeriod: true },
                    ].map((item) => (
                      <div
                        key={item.date}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <span className="text-[0.62rem] text-mauve/85">
                          {item.day}
                        </span>
                        <div className="relative">
                          {item.isCurrent ? (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-peach to-rose text-white text-xs font-semibold shadow-[0_4px_16px_rgba(255,218,185,0.5)]">
                              {item.date}
                            </div>
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center text-xs text-charcoal">
                              {item.date}
                            </div>
                          )}
                          {item.hasPeriod && !item.isCurrent && (
                            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rose" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 mt-auto border-t border-charcoal/5 bg-white/45 backdrop-blur-md -mx-7 px-7 pt-4 pb-6">
                  <div className="relative flex justify-between items-end text-[0.95rem] text-charcoal/45">
                    <span className="text-charcoal/72">Home</span>
                    <span>Calendar</span>
                    <span>Insights</span>
                    <span>Profile</span>
                    <button
                      type="button"
                      className="absolute -top-12 right-0 w-16 h-16 rounded-full bg-gradient-to-br from-rose to-[#C89896] text-white text-4xl leading-none pb-1 shadow-[0_8px_24px_rgba(221,167,165,0.5)]"
                      aria-label="Add log"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1.5 rounded-full bg-charcoal/25" />

                <div className="hidden sm:block absolute top-1/2 -left-10 -translate-y-1/2 w-2.5 h-40 rounded-full bg-white/55" />
                <div className="hidden sm:block absolute top-1/2 -right-10 -translate-y-1/2 w-2.5 h-40 rounded-full bg-white/55" />
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
                <div className="w-16 h-16 rounded-2xl bg-peach/20 flex items-center justify-center mb-8 group-hover:scale-110 transition duration-300">
                  <FeatureIcon icon={f.icon} />
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
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.25"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
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
            <Link
              href="/terms"
              className="inline-block mt-3 text-sm font-semibold text-rose hover:underline underline-offset-2 transition"
            >
              Read our Terms of Use →
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
