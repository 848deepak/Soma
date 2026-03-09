import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download Soma",
  description: "Download Soma for Android or get notified for the iOS launch.",
};

const steps = [
  {
    n: 1,
    text: (
      <>
        Tap <strong>Download APK</strong> above. The file saves to your
        Downloads folder.
      </>
    ),
  },
  {
    n: 2,
    text: (
      <>
        Open{" "}
        <strong>
          Settings → Apps → Special app access → Install unknown apps
        </strong>{" "}
        and allow installs from your browser or file manager.
      </>
    ),
  },
  {
    n: 3,
    text: (
      <>
        Open the downloaded <strong>soma.apk</strong> file and tap{" "}
        <strong>Install</strong>.
      </>
    ),
  },
  {
    n: 4,
    text: (
      <>
        Open Soma and follow the on-screen setup. No account required to start
        tracking.
      </>
    ),
  },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-cream pt-28 pb-24 px-6">
      <div
        className="aurora-blob bg-rose w-[350px] h-[350px] top-0 left-0"
        aria-hidden
      />
      <div
        className="aurora-blob bg-peach w-[250px] h-[250px] bottom-0 right-0"
        aria-hidden
      />

      <div className="mx-auto max-w-3xl relative z-10">
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-serif font-medium text-charcoal mb-4">
            Download Soma
          </h1>
          <p className="text-lg text-charcoal/60 font-light">
            Free, private, and offline-first. No subscription required.
          </p>
        </div>

        {/* Platform cards */}
        <div className="grid gap-6 sm:grid-cols-2 mb-10">
          {/* Android */}
          <div className="glass-card rounded-[2rem] p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sage/20 flex items-center justify-center text-3xl mx-auto mb-6">
              🤖
            </div>
            <h2 className="text-2xl font-serif font-medium text-charcoal mb-3">
              Android
            </h2>
            <p className="text-sm text-charcoal/60 mb-8 leading-relaxed">
              Download the APK directly onto any Android device (Android 10+).
              No Google Play account required.
            </p>
            <a
              href="https://github.com/848deepak/Soma-/releases/latest/download/soma.apk"
              download
              className="block w-full bg-rose text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-mauve transition-all hover:-translate-y-0.5"
              style={{ boxShadow: "0 8px 24px -8px rgba(221,167,165,0.5)" }}
            >
              Download APK
            </a>
            <p className="mt-3 text-xs text-charcoal/40">
              You may need to enable &quot;Install from unknown sources&quot;
            </p>
          </div>

          {/* iOS */}
          <div className="glass-card rounded-[2rem] p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose/20 flex items-center justify-center text-3xl mx-auto mb-6">
              🍎
            </div>
            <h2 className="text-2xl font-serif font-medium text-charcoal mb-3">
              iOS
            </h2>
            <p className="text-sm text-charcoal/60 mb-8 leading-relaxed">
              Soma for iPhone and iPad is coming to the Apple App Store. Join
              the waitlist to be notified on launch day.
            </p>
            <button
              disabled
              className="w-full bg-charcoal/10 text-charcoal/40 px-6 py-3 rounded-full text-sm font-medium cursor-not-allowed"
            >
              App Store — Coming Soon
            </button>
            <p className="mt-3 text-xs text-charcoal/40">
              Leave your email on our{" "}
              <Link href="/support" className="text-rose hover:underline">
                support page
              </Link>{" "}
              to join the waitlist.
            </p>
          </div>
        </div>

        {/* Install steps */}
        <div className="glass-card rounded-[2rem] p-8">
          <h2 className="text-xl font-serif font-medium text-charcoal mb-6">
            How to install the Android APK
          </h2>
          <ol className="space-y-4">
            {steps.map((step) => (
              <li key={step.n} className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose/20 flex items-center justify-center text-xs font-bold text-rose">
                  {step.n}
                </span>
                <span className="text-sm text-charcoal/70 leading-relaxed">
                  {step.text}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-8 text-center text-sm text-charcoal/40">
          Having trouble?{" "}
          <Link
            href="/support"
            className="font-medium text-rose hover:underline underline-offset-2"
          >
            Visit our support page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
