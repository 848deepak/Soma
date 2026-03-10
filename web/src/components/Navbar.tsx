"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { label: "Features", href: "/features" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Support", href: "/support" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed w-full z-50 transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-rose/50 to-transparent" />
      <div className="glass-nav border-b border-white/60 shadow-[0_10px_35px_-25px_rgba(45,35,39,0.45)]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="text-3xl font-serif font-semibold text-charcoal tracking-tight hover:opacity-85 transition"
          >
            Soma.
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-2 rounded-full border border-white/70 bg-white/45 px-2.5 py-2 text-sm font-medium text-charcoal/70 backdrop-blur-md">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-4 py-2 rounded-full hover:text-rose hover:bg-white/65 transition"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/848deepak/Soma-/releases/latest/download/soma.apk"
              download
              className="hidden md:inline-block bg-charcoal text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-rose hover:shadow-lg transition-all duration-300"
            >
              Download
            </a>

            {/* Hamburger – mobile only */}
            <button
              className="md:hidden flex flex-col items-center justify-center h-10 w-10 gap-1.5 rounded-full border border-white/70 bg-white/55 backdrop-blur-sm"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span
                className={`block h-0.5 w-5 rounded-full bg-charcoal transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-charcoal transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-charcoal transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="mx-4 mt-3 rounded-3xl border border-white/65 bg-white/75 px-5 pb-5 pt-3 shadow-[0_20px_45px_-30px_rgba(45,35,39,0.5)] backdrop-blur-xl md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-sm font-medium text-charcoal/75 hover:text-rose hover:bg-white/70 transition"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="https://github.com/848deepak/Soma-/releases/latest/download/soma.apk"
            download
            onClick={() => setOpen(false)}
            className="mt-3 block w-full text-center bg-charcoal text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-rose transition-all duration-300"
          >
            Download
          </a>
        </nav>
      )}
    </header>
  );
}
