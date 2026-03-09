"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { label: "Features", href: "/features" },
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="glass-nav fixed w-full z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link
          href="/"
          className="text-3xl font-serif font-semibold text-charcoal tracking-tight hover:opacity-80 transition"
        >
          Soma.
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex space-x-10 text-sm font-medium text-charcoal/70">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-rose transition"
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
            className="md:hidden flex flex-col items-center justify-center h-9 w-9 gap-1.5"
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

      {/* Mobile dropdown */}
      {open && (
        <nav className="border-t border-charcoal/5 bg-cream/95 px-6 pb-5 pt-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-medium text-charcoal/70 hover:text-rose transition"
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
