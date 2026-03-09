import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-cream border-t border-charcoal/5 py-16">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <div className="text-3xl font-serif font-bold text-charcoal mb-2">
            Soma.
          </div>
          <div className="text-sm text-charcoal/40">
            &copy; {new Date().getFullYear()} Soma Wellness Inc. All rights
            reserved.
          </div>
        </div>

        <div className="flex flex-wrap gap-8 text-sm font-medium text-charcoal/60 justify-center">
          <Link href="/features" className="hover:text-rose transition">
            Features
          </Link>
          <Link href="/download" className="hover:text-rose transition">
            Download
          </Link>
          <Link href="/privacy" className="hover:text-rose transition">
            Privacy
          </Link>
          <Link href="/support" className="hover:text-rose transition">
            Support
          </Link>
        </div>
      </div>
    </footer>
  );
}
