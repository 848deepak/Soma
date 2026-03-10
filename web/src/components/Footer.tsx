import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative bg-cream py-16 md:py-20">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-rose/45 to-transparent" />
      <div className="max-w-7xl mx-auto px-6">
        <div className="glass-panel rounded-[2rem] px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="text-3xl font-serif font-bold text-charcoal mb-2">
              Soma.
            </div>
            <div className="text-sm text-charcoal/40">
              &copy; {new Date().getFullYear()} Soma Wellness Inc. All rights
              reserved.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-charcoal/65 justify-center rounded-full border border-white/70 bg-white/55 px-3 py-2">
            <Link
              href="/features"
              className="px-4 py-2 rounded-full hover:text-rose hover:bg-white/75 transition"
            >
              Features
            </Link>
            <Link
              href="/download"
              className="px-4 py-2 rounded-full hover:text-rose hover:bg-white/75 transition"
            >
              Download
            </Link>
            <Link
              href="/privacy"
              className="px-4 py-2 rounded-full hover:text-rose hover:bg-white/75 transition"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="px-4 py-2 rounded-full hover:text-rose hover:bg-white/75 transition"
            >
              Terms
            </Link>
            <Link
              href="/support"
              className="px-4 py-2 rounded-full hover:text-rose hover:bg-white/75 transition"
            >
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
