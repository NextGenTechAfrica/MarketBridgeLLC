import type { Metadata, Viewport } from "next";
import { Outfit, Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { GlobalWidgets } from "@/components/GlobalWidgets";
import { NetworkStatus } from "@/components/NetworkStatus";
import { LocationChecker } from "@/components/location-checker";
import BetaLabel from "@/components/BetaLabel";
import { LocationProvider } from "@/contexts/LocationContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { SystemProvider } from "@/contexts/SystemContext";

import { DemoBanner } from "@/components/DemoBanner";
import { FloatingFeedbackWidget } from "@/components/FloatingFeedbackWidget";




const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'https://marketbridge.com.ng';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MarketBridge – #1 Campus Marketplace for Nigerian Universities",
  description: "Buy, sell & trade safely with verified student sellers at Baze, Nile, and Veritas. Textbooks, laptops, wigs, food delivery & more with Zero-Fraud Escrow Protection.",
  keywords: ["MarketBridge", "Nigerian university marketplace", "Baze University market", "Nile University marketplace", "Veritas student market", "Abuja campus market", "student escrow", "campus delivery", "student to student selling", "buy laptops Baze"],
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // verification: Add Google Search Console and Bing Webmaster codes when available
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MarketBridge",
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },

  openGraph: {
    title: "MarketBridge – Campus Marketplace for Abuja Universities",
    description: "Buy, sell & trade safely with verified student sellers. Textbooks, laptops, wigs, food delivery & more.",
    url: siteUrl,
    siteName: "MarketBridge",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MarketBridge – Campus Marketplace",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MarketBridge – Campus Marketplace for Abuja Universities",
    description: "Buy, sell & trade safely with verified student sellers. Textbooks, laptops, wigs, food delivery & more.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6200",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${outfit.variable} antialiased pb-20 md:pb-0`}
      >
        <AppErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
          >
            <SystemProvider>
              <AuthProvider>
                <LocationProvider>
                  <CartProvider>
                    <ToastProvider>
                      <DemoBanner />
                      <LocationChecker>
                        {children}
                      </LocationChecker>
                      <NetworkStatus />
                    </ToastProvider>
                    <GlobalWidgets />

                  </CartProvider>
                </LocationProvider>
              </AuthProvider>
            </SystemProvider>
          </ThemeProvider>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
