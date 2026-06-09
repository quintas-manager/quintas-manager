import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import AppLoader from "@/components/AppLoader";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Quintas Manager",
  description: "Gestión de reservas y gastos",
  formatDetection: { telephone: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quintas Manager",
  },
  icons: {
    apple: [
      { url: "/icons/icon-152x152.png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn(geistSans.variable, geistMono.variable)}>
      <body className="antialiased">
        <SessionProvider>
          <AppLoader />
          {children}
        </SessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
