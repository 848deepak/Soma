"use client";
import { useEffect, useState } from "react";
import { getLatestApkUrl } from "../../utils/getLatestApkUrl";

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

import Link from "next/link";

function DownloadPage() {
  const [apkUrl, setApkUrl] = useState<string | null>(null);

  useEffect(() => {
    getLatestApkUrl().then(setApkUrl);
  }, []);

  return (
    <div className="page-shell">
      <div
        className="aurora-blob bg-rose w-[320px] h-[320px] -top-10 -left-10"
        aria-hidden
      />
      <div
        className="aurora-blob bg-peach w-[240px] h-[240px] bottom-0 -right-8"
        aria-hidden
      />

      <div className="page-container max-w-4xl">
        <div className="mb-10 text-center md:mb-14">
          <h1 className="mb-3 text-4xl font-serif font-medium text-charcoal md:mb-4 md:text-5xl">
            Download Soma
          </h1>
          <p className="text-base font-light text-charcoal/62 md:text-lg">
            Free, private, and offline-first. No subscription required.
          </p>
        </div>

        {/* Platform cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 md:mb-10 md:gap-6">
          {/* Android */}
          <div className="glass-panel rounded-[1.5rem] p-5 text-center sm:p-6 md:rounded-[2rem] md:p-8">
            <div className="feature-badge mx-auto mb-4 md:mb-6">APK</div>
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-sage/45 md:mb-4" />
            <h2 className="mb-3 text-xl font-serif font-medium text-charcoal md:text-2xl">
              Android
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-charcoal/62 md:mb-8">
              Download the APK directly onto any Android device (Android 10+).
              No Google Play account required.
            </p>
            {apkUrl ? (
              <a
                href={apkUrl}
                download
                className="rose-shadow-soft block w-full rounded-full bg-rose px-6 py-3 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-mauve"
              >
                Download APK
              </a>
            ) : (
              <button
                className="rose-shadow-soft block w-full rounded-full bg-gray-400 px-6 py-3 text-sm font-medium text-white cursor-not-allowed"
                disabled
              >
                Loading APK link…
              </button>
            )}
            <p className="mt-3 text-xs text-charcoal/40">
              You may need to enable &quot;Install from unknown sources&quot;
            </p>
          </div>

          {/* iOS */}
          <div className="glass-panel rounded-[1.5rem] p-5 text-center sm:p-6 md:rounded-[2rem] md:p-8">
            <div className="feature-badge mx-auto mb-4 md:mb-6">iOS</div>
            <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-rose/45 md:mb-4" />
            <h2 className="mb-3 text-xl font-serif font-medium text-charcoal md:text-2xl">
              iOS
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-charcoal/62 md:mb-8">
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
        <div className="glass-panel rounded-[1.5rem] p-5 sm:p-6 md:rounded-[2rem] md:p-8">
          <h2 className="mb-5 text-lg font-serif font-medium text-charcoal md:mb-6 md:text-xl">
            How to install the Android APK
          </h2>
          <ol className="space-y-4">
            {steps.map((step) => (
              <li key={step.n} className="flex gap-4 items-start">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-rose/20 text-xs font-bold text-rose">
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

export default DownloadPage;
