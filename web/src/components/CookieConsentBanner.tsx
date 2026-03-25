"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "soma_cookie_consent_v1";

type ConsentChoice = "accepted" | "rejected";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(CONSENT_KEY);
      setIsVisible(value !== "accepted" && value !== "rejected");
    } catch {
      setIsVisible(true);
    }
  }, []);

  const saveChoice = (choice: ConsentChoice) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // Ignore storage write failures and still dismiss banner.
    }
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 md:inset-x-8 md:bottom-6">
      <div className="glass-panel rounded-2xl border border-charcoal/10 p-4 shadow-xl md:p-5">
        <p className="text-sm leading-relaxed text-charcoal/80">
          We use essential storage for core site functions and optional analytics
          identifiers for product reliability. You can review details in our{" "}
          <Link href="/cookies" className="font-semibold text-rose hover:underline">
            Cookie Notice
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => saveChoice("accepted")}
            className="rounded-full bg-rose px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => saveChoice("rejected")}
            className="rounded-full border border-charcoal/20 px-4 py-2 text-sm font-semibold text-charcoal transition hover:bg-charcoal/5"
          >
            Decline Optional
          </button>
        </div>
      </div>
    </div>
  );
}
