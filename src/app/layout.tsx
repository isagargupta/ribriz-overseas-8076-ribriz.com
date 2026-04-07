import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RIBRIZ — AI-Powered Study Abroad Platform",
    template: "%s | RIBRIZ",
  },
  description:
    "AI-powered study abroad platform. Match with universities, predict admission chances, generate SOPs, and track applications — all without an agent.",
  metadataBase: new URL("https://ribriz.com"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "RIBRIZ",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@ribriz",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  other: {
    "theme-color": "#3525cd",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ribriz-theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-surface text-on-surface transition-colors duration-300">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </body>
    </html>
  );
}
