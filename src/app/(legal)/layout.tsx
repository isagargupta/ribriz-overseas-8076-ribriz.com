import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#191c1e]">
      {/* Header */}
      <header className="border-b border-black/[0.06] bg-white/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center px-5 md:px-8 py-3.5">
          <Link href="/" className="text-xl font-extrabold tracking-tighter font-headline text-[#191c1e]">
            RIBRIZ
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-[#464555] hover:text-[#3525cd] transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-5 md:px-8 py-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] mt-24">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-xs text-[#777587]">
            © {new Date().getFullYear()} RIBRIZ OVERSEAS VENTURES PRIVATE LIMITED. All rights reserved.
          </p>
          <nav className="flex flex-wrap gap-6 text-xs font-medium text-[#464555]">
            <Link href="/privacy" className="hover:text-[#3525cd] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#3525cd] transition-colors">Terms of Service</Link>
            <Link href="/refund" className="hover:text-[#3525cd] transition-colors">Refund Policy</Link>
            <Link href="/cookies" className="hover:text-[#3525cd] transition-colors">Cookie Policy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
